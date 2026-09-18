import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import type { MainDrizzleClient } from "../../../infra/database/index.js";
import {
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../features/memory/memoryJobConstants.js";
import { upsertMemoryBuildJob } from "../../features/memory/memoryBuildJobEnqueue.js";

type DerivedJobWriteStore = Pick<MainDrizzleClient, "all" | "run">;

const upsertSearchDirtyJob = (
  store: DerivedJobWriteStore,
  input: {
    projectId: string;
    chapterId: string;
    reason: string;
    now: string;
  },
): void => {
  const pendingRows = store.all<{ id: string; status: string }>(
    sql`SELECT "id", "status" FROM "SearchDirtyQueue"
        WHERE "projectId" = ${input.projectId}
          AND "sourceType" = ${MEMORY_TARGET_TYPES.CHAPTER}
          AND "sourceId" = ${input.chapterId}
          AND "status" IN ('pending', 'running')
        ORDER BY CASE "status" WHEN 'pending' THEN 0 ELSE 1 END, "updatedAt" DESC
        LIMIT 1;`,
  );
  if (pendingRows[0]?.status === "pending") {
    store.run(
      sql`UPDATE "SearchDirtyQueue"
          SET "reason" = ${input.reason},
              "updatedAt" = ${input.now}
          WHERE "id" = ${pendingRows[0].id};`,
    );
    return;
  }

  store.run(
    sql`INSERT INTO "SearchDirtyQueue" ("id","projectId","sourceType","sourceId","reason","status","attempts","createdAt","updatedAt")
        VALUES (${crypto.randomUUID()}, ${input.projectId}, 'chapter', ${input.chapterId}, ${input.reason}, 'pending', 0, ${input.now}, ${input.now});`,
  );
};

export const enqueueChapterDerivedJobs = (input: {
  projectId: string;
  chapterId: string;
  reason: string;
  tx?: DerivedJobWriteStore;
}): void => {
  const now = new Date().toISOString();
  const store = input.tx ?? db.getClient();
  upsertSearchDirtyJob(store, { ...input, now });
  upsertMemoryBuildJob({
    client: store,
    ...input,
    targetType: MEMORY_TARGET_TYPES.CHAPTER,
    targetId: input.chapterId,
    jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    priority: MEMORY_JOB_PRIORITY.CHUNKS,
    now,
  });
  upsertMemoryBuildJob({
    client: store,
    ...input,
    targetType: MEMORY_TARGET_TYPES.CHAPTER,
    targetId: input.chapterId,
    jobType: MEMORY_JOB_TYPES.REBUILD_SUMMARY,
    priority: MEMORY_JOB_PRIORITY.SUMMARY,
    now,
  });
  upsertMemoryBuildJob({
    client: store,
    ...input,
    targetType: MEMORY_TARGET_TYPES.CHAPTER,
    targetId: input.chapterId,
    jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    priority: MEMORY_JOB_PRIORITY.EMBEDDING,
    now,
  });
};

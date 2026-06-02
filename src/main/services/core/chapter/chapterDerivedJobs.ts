import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import {
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../features/memory/memoryJobConstants.js";

const upsertSearchDirtyJob = async (
  store: ReturnType<typeof db.getClient>,
  input: {
    projectId: string;
    chapterId: string;
    reason: string;
    now: string;
  },
): Promise<void> => {
  const pendingRows = await store.all<{ id: string }>(
    sql`SELECT "id" FROM "SearchDirtyQueue"
        WHERE "projectId" = ${input.projectId}
          AND "sourceType" = ${MEMORY_TARGET_TYPES.CHAPTER}
          AND "sourceId" = ${input.chapterId}
          AND "status" IN ('pending', 'running')
        ORDER BY "updatedAt" DESC
        LIMIT 1;`,
  );
  if (pendingRows.length > 0) {
    await store.run(
      sql`UPDATE "SearchDirtyQueue"
          SET "reason" = ${input.reason},
              "updatedAt" = ${input.now}
          WHERE "id" = ${pendingRows[0].id};`,
    );
    return;
  }

  await store.run(
    sql`INSERT INTO "SearchDirtyQueue" ("id","projectId","sourceType","sourceId","reason","status","attempts","createdAt","updatedAt")
        VALUES (${crypto.randomUUID()}, ${input.projectId}, 'chapter', ${input.chapterId}, ${input.reason}, 'pending', 0, ${input.now}, ${input.now});`,
  );
};

const upsertMemoryJob = async (
  store: ReturnType<typeof db.getClient>,
  input: {
    projectId: string;
    chapterId: string;
    jobType: string;
    priority: number;
    now: string;
  },
): Promise<void> => {
  const pendingRows = await store.all<{ id: string }>(
    sql`SELECT "id" FROM "MemoryBuildJob"
        WHERE "projectId" = ${input.projectId}
          AND "targetType" = ${MEMORY_TARGET_TYPES.CHAPTER}
          AND "targetId" = ${input.chapterId}
          AND "jobType" = ${input.jobType}
          AND "status" IN ('pending', 'running')
        ORDER BY "updatedAt" DESC
        LIMIT 1;`,
  );
  if (pendingRows.length > 0) {
    await store.run(
      sql`UPDATE "MemoryBuildJob"
          SET "priority" = ${input.priority},
              "updatedAt" = ${input.now}
          WHERE "id" = ${pendingRows[0].id};`,
    );
    return;
  }

  await store.run(
    sql`INSERT INTO "MemoryBuildJob" ("id","projectId","targetType","targetId","jobType","status","priority","attempts","createdAt","updatedAt")
        VALUES (${crypto.randomUUID()}, ${input.projectId}, ${MEMORY_TARGET_TYPES.CHAPTER}, ${input.chapterId}, ${input.jobType}, 'pending', ${input.priority}, 0, ${input.now}, ${input.now});`,
  );
};

export const enqueueChapterDerivedJobs = async (input: {
  projectId: string;
  chapterId: string;
  reason: string;
  tx?: ReturnType<typeof db.getClient>;
}): Promise<void> => {
  const now = new Date().toISOString();
  const store = input.tx ?? db.getClient();
  await upsertSearchDirtyJob(store, { ...input, now });
  await upsertMemoryJob(store, {
    ...input,
    jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    priority: MEMORY_JOB_PRIORITY.CHUNKS,
    now,
  });
  await upsertMemoryJob(store, {
    ...input,
    jobType: MEMORY_JOB_TYPES.REBUILD_SUMMARY,
    priority: MEMORY_JOB_PRIORITY.SUMMARY,
    now,
  });
  await upsertMemoryJob(store, {
    ...input,
    jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    priority: MEMORY_JOB_PRIORITY.EMBEDDING,
    now,
  });
};

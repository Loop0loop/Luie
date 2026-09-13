import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import type { MainDrizzleClient } from "../../../infra/database/index.js";
import { MEMORY_BUILD_JOB_DEDUPE_STATUSES } from "./memoryJobConstants.js";
import { requestDerivedJobWakeup } from "../derivedJobs/derivedJobWakeup.js";

const MEMORY_BUILD_JOB_DEDUPE_SQL = `'${MEMORY_BUILD_JOB_DEDUPE_STATUSES.join("','")}'`;

type MemoryBuildJobWriteStore = Pick<MainDrizzleClient, "all" | "run">;

export function upsertMemoryBuildJob(input: {
  client: MemoryBuildJobWriteStore;
  projectId: string;
  targetType: string;
  targetId: string;
  jobType: string;
  priority: number;
  now: string;
}): void {
  const existing = input.client.all<{ id: string; status: string }>(
    sql`SELECT "id", "status" FROM "MemoryBuildJob"
        WHERE "projectId" = ${input.projectId}
          AND "targetType" = ${input.targetType}
          AND "targetId" = ${input.targetId}
          AND "jobType" = ${input.jobType}
          AND "status" IN (${sql.raw(MEMORY_BUILD_JOB_DEDUPE_SQL)})
        ORDER BY CASE "status"
          WHEN 'pending' THEN 0
          WHEN 'paused' THEN 1
          WHEN 'running' THEN 2
          ELSE 3
        END, "updatedAt" DESC
        LIMIT 1;`,
  );
  const current = existing[0];
  if (current?.status === "paused") {
    input.client.run(
      sql`UPDATE "MemoryBuildJob"
          SET "priority" = ${input.priority},
              "updatedAt" = ${input.now}
          WHERE "id" = ${current.id};`,
    );
    return;
  }
  if (current && current.status !== "running") {
    input.client.run(
      sql`UPDATE "MemoryBuildJob"
          SET "status" = 'pending',
              "priority" = ${input.priority},
              "attempts" = 0,
              "error" = NULL,
              "updatedAt" = ${input.now}
          WHERE "id" = ${current.id};`,
    );
    requestDerivedJobWakeup();
    return;
  }

  input.client.run(
    sql`INSERT INTO "MemoryBuildJob" ("id","projectId","targetType","targetId","jobType","status","priority","attempts","createdAt","updatedAt")
        VALUES (${crypto.randomUUID()}, ${input.projectId}, ${input.targetType}, ${input.targetId}, ${input.jobType}, 'pending', ${input.priority}, 0, ${input.now}, ${input.now});`,
  );
  requestDerivedJobWakeup();
}

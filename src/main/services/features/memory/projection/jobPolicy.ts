import { and, eq, lte, or, sql } from "drizzle-orm";
import { memoryBuildJob } from "../../../../infra/database/index.js";

export const MAX_JOB_ATTEMPTS = 5;
export const BASE_RETRY_BACKOFF_MS = 2_000;

export function retryableMemoryBuildJobCondition(nowMs = Date.now()) {
  return or(
    eq(memoryBuildJob.status, "pending"),
    and(
      eq(memoryBuildJob.status, "failed"),
      or(
        ...Array.from({ length: MAX_JOB_ATTEMPTS }, (_, attempts) =>
          and(
            eq(memoryBuildJob.attempts, attempts),
            or(
              lte(
                memoryBuildJob.updatedAt,
                new Date(
                  nowMs - getMemoryBuildJobRetryBackoffMs(attempts),
                ).toISOString(),
              ),
              sql`julianday(${memoryBuildJob.updatedAt}) IS NULL`,
            ),
          ),
        ),
      ),
    ),
  );
}

export function getMemoryBuildJobRetryBackoffMs(attempts: number): number {
  return BASE_RETRY_BACKOFF_MS * Math.max(1, attempts);
}

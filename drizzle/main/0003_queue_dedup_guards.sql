-- Enforce single pending derived job per logical target to avoid queue explosion.
-- Keep history rows (completed/failed) by scoping uniqueness to status='pending'.

-- 1) Clean duplicate pending SearchDirtyQueue rows (keep newest per key)
DELETE FROM "SearchDirtyQueue"
WHERE "id" IN (
  SELECT q1."id"
  FROM "SearchDirtyQueue" q1
  JOIN "SearchDirtyQueue" q2
    ON q1."projectId" = q2."projectId"
   AND q1."sourceType" = q2."sourceType"
   AND q1."sourceId" = q2."sourceId"
   AND q1."status" = 'pending'
   AND q2."status" = 'pending'
   AND (
     q1."updatedAt" < q2."updatedAt"
     OR (q1."updatedAt" = q2."updatedAt" AND q1."id" < q2."id")
   )
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "SearchDirtyQueue_pending_unique"
ON "SearchDirtyQueue" ("projectId", "sourceType", "sourceId")
WHERE "status" = 'pending';
--> statement-breakpoint

-- 2) Clean duplicate pending MemoryBuildJob rows (keep newest per key)
DELETE FROM "MemoryBuildJob"
WHERE "id" IN (
  SELECT m1."id"
  FROM "MemoryBuildJob" m1
  JOIN "MemoryBuildJob" m2
    ON m1."projectId" = m2."projectId"
   AND m1."targetType" = m2."targetType"
   AND m1."targetId" = m2."targetId"
   AND m1."jobType" = m2."jobType"
   AND m1."status" = 'pending'
   AND m2."status" = 'pending'
   AND (
     m1."updatedAt" < m2."updatedAt"
     OR (m1."updatedAt" = m2."updatedAt" AND m1."id" < m2."id")
   )
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "MemoryBuildJob_pending_unique"
ON "MemoryBuildJob" ("projectId", "targetType", "targetId", "jobType")
WHERE "status" = 'pending';

import crypto from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { MainDrizzleClient } from "../../database/databaseTypes.js";
import {
  character,
  chapter,
  event,
  faction,
  memoryBuildJob,
  note,
  plot,
  scene,
  scrapMemo,
  synopsis,
} from "../../database/schema.js";
import {
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "./memory/memoryJobConstants.js";

async function upsertPendingMemoryBuildJob(input: {
  client: MainDrizzleClient;
  projectId: string;
  targetType: string;
  targetId: string;
  priority: number;
  now: string;
}): Promise<void> {
  const existing = await input.client.all<{ id: string }>(
    sql`SELECT "id" FROM "MemoryBuildJob"
        WHERE "projectId" = ${input.projectId}
          AND "targetType" = ${input.targetType}
          AND "targetId" = ${input.targetId}
          AND "jobType" = ${MEMORY_JOB_TYPES.REBUILD_CHUNKS}
          AND "status" = 'pending'
        ORDER BY "updatedAt" DESC
        LIMIT 1;`,
  );
  if (existing.length > 0) {
    await input.client.run(
      sql`UPDATE "MemoryBuildJob"
          SET "priority" = ${input.priority},
              "updatedAt" = ${input.now}
          WHERE "id" = ${existing[0].id};`,
    );
    return;
  }
  await input.client.run(
    sql`INSERT INTO "MemoryBuildJob" ("id","projectId","targetType","targetId","jobType","status","priority","attempts","createdAt","updatedAt")
        VALUES (${crypto.randomUUID()}, ${input.projectId}, ${input.targetType}, ${input.targetId}, ${MEMORY_JOB_TYPES.REBUILD_CHUNKS}, 'pending', ${input.priority}, 0, ${input.now}, ${input.now});`,
  );
}

export async function rebuildMemoryChunks(input: {
  client: MainDrizzleClient;
  projectId: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<{ queued: number; processed: number }> {
  const now = new Date().toISOString();
  if (input.sourceType && input.sourceId) {
    await upsertPendingMemoryBuildJob({
      client: input.client,
      projectId: input.projectId,
      targetType: input.sourceType,
      targetId: input.sourceId,
      priority: MEMORY_JOB_PRIORITY.CHUNKS,
      now,
    });
    return { queued: 1, processed: 0 };
  }

  const chapters = await input.client
    .select({ id: chapter.id })
    .from(chapter)
    .where(eq(chapter.projectId, input.projectId))
    .orderBy(asc(chapter.order));
  const scenes = await input.client
    .select({ id: scene.id })
    .from(scene)
    .where(and(eq(scene.projectId, input.projectId), isNull(scene.deletedAt)))
    .orderBy(asc(scene.order));
  const notes = await input.client
    .select({ id: note.id })
    .from(note)
    .where(and(eq(note.projectId, input.projectId), isNull(note.deletedAt)))
    .orderBy(asc(note.updatedAt));
  const synopses = await input.client
    .select({ id: synopsis.id })
    .from(synopsis)
    .where(and(eq(synopsis.projectId, input.projectId), isNull(synopsis.deletedAt)))
    .orderBy(asc(synopsis.updatedAt));
  const plots = await input.client
    .select({ id: plot.id })
    .from(plot)
    .where(and(eq(plot.projectId, input.projectId), isNull(plot.deletedAt)))
    .orderBy(asc(plot.updatedAt));
  const events = await input.client
    .select({ id: event.id })
    .from(event)
    .where(and(eq(event.projectId, input.projectId), isNull(event.deletedAt)))
    .orderBy(asc(event.updatedAt));
  const factions = await input.client
    .select({ id: faction.id })
    .from(faction)
    .where(and(eq(faction.projectId, input.projectId), isNull(faction.deletedAt)))
    .orderBy(asc(faction.updatedAt));
  const scraps = await input.client
    .select({ id: scrapMemo.id })
    .from(scrapMemo)
    .where(and(eq(scrapMemo.projectId, input.projectId), isNull(scrapMemo.deletedAt)))
    .orderBy(asc(scrapMemo.updatedAt));
  const characters = await input.client
    .select({ id: character.id })
    .from(character)
    .where(and(eq(character.projectId, input.projectId), isNull(character.deletedAt)))
    .orderBy(asc(character.updatedAt));

  const targets: Array<{ targetType: string; targetId: string }> = [
    ...chapters.map((row) => ({ targetType: MEMORY_TARGET_TYPES.CHAPTER, targetId: row.id })),
    ...scenes.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SCENE, targetId: row.id })),
    ...notes.map((row) => ({ targetType: MEMORY_TARGET_TYPES.NOTE, targetId: row.id })),
    ...synopses.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SYNOPSIS, targetId: row.id })),
    ...plots.map((row) => ({ targetType: MEMORY_TARGET_TYPES.PLOT, targetId: row.id })),
    ...events.map((row) => ({ targetType: MEMORY_TARGET_TYPES.EVENT, targetId: row.id })),
    ...factions.map((row) => ({ targetType: MEMORY_TARGET_TYPES.FACTION, targetId: row.id })),
    ...characters.map((row) => ({ targetType: MEMORY_TARGET_TYPES.CHARACTER, targetId: row.id })),
    ...scraps.map((row) => ({ targetType: MEMORY_TARGET_TYPES.SCRAP_MEMO, targetId: row.id })),
  ];

  const existingPending = await input.client
    .select({
      targetType: memoryBuildJob.targetType,
      targetId: memoryBuildJob.targetId,
    })
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
        eq(memoryBuildJob.status, "pending"),
      ),
    );

  const existingKeys = new Set(
    existingPending.map((row) => `${row.targetType}:${row.targetId}`),
  );
  const toInsert = targets.filter(
    (target) => !existingKeys.has(`${target.targetType}:${target.targetId}`),
  );

  if (toInsert.length > 0) {
    await input.client.insert(memoryBuildJob).values(
      toInsert.map((target) => ({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        targetType: target.targetType,
        targetId: target.targetId,
        jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
        status: "pending",
        priority: MEMORY_JOB_PRIORITY.CHUNKS,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  return { queued: targets.length, processed: 0 };
}

import crypto from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { MainDrizzleClient } from "../../../infra/database/index.js";
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
} from "../../../infra/database/index.js";
import {
  MEMORY_BUILD_JOB_DEDUPE_STATUSES,
  MEMORY_JOB_PRIORITY,
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../memory/memoryJobConstants.js";
import { upsertMemoryBuildJob } from "../memory/memoryBuildJobEnqueue.js";

const MEMORY_REBUILD_JOB_TYPES = [
  {
    jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
    priority: MEMORY_JOB_PRIORITY.CHUNKS,
  },
  {
    jobType: MEMORY_JOB_TYPES.REBUILD_EMBEDDING,
    priority: MEMORY_JOB_PRIORITY.EMBEDDING,
  },
] as const;

export async function rebuildMemoryChunks(input: {
  client: MainDrizzleClient;
  projectId: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<{ queued: number; processed: number }> {
  const now = new Date().toISOString();
  if (input.sourceType && input.sourceId) {
    for (const job of MEMORY_REBUILD_JOB_TYPES) {
      upsertMemoryBuildJob({
        client: input.client,
        projectId: input.projectId,
        targetType: input.sourceType,
        targetId: input.sourceId,
        jobType: job.jobType,
        priority: job.priority,
        now,
      });
    }
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
    .where(
      and(eq(synopsis.projectId, input.projectId), isNull(synopsis.deletedAt)),
    )
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
    .where(
      and(eq(faction.projectId, input.projectId), isNull(faction.deletedAt)),
    )
    .orderBy(asc(faction.updatedAt));
  const scraps = await input.client
    .select({ id: scrapMemo.id })
    .from(scrapMemo)
    .where(
      and(
        eq(scrapMemo.projectId, input.projectId),
        isNull(scrapMemo.deletedAt),
      ),
    )
    .orderBy(asc(scrapMemo.updatedAt));
  const characters = await input.client
    .select({ id: character.id })
    .from(character)
    .where(
      and(
        eq(character.projectId, input.projectId),
        isNull(character.deletedAt),
      ),
    )
    .orderBy(asc(character.updatedAt));

  const targets: Array<{ targetType: string; targetId: string }> = [
    ...chapters.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: row.id,
    })),
    ...scenes.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.SCENE,
      targetId: row.id,
    })),
    ...notes.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.NOTE,
      targetId: row.id,
    })),
    ...synopses.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.SYNOPSIS,
      targetId: row.id,
    })),
    ...plots.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.PLOT,
      targetId: row.id,
    })),
    ...events.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.EVENT,
      targetId: row.id,
    })),
    ...factions.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.FACTION,
      targetId: row.id,
    })),
    ...characters.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.CHARACTER,
      targetId: row.id,
    })),
    ...scraps.map((row) => ({
      targetType: MEMORY_TARGET_TYPES.SCRAP_MEMO,
      targetId: row.id,
    })),
  ];

  const existingPending = await input.client
    .select({
      targetType: memoryBuildJob.targetType,
      targetId: memoryBuildJob.targetId,
      jobType: memoryBuildJob.jobType,
      status: memoryBuildJob.status,
    })
    .from(memoryBuildJob)
    .where(
      and(
        eq(memoryBuildJob.projectId, input.projectId),
        inArray(
          memoryBuildJob.jobType,
          MEMORY_REBUILD_JOB_TYPES.map((job) => job.jobType),
        ),
        inArray(memoryBuildJob.status, [...MEMORY_BUILD_JOB_DEDUPE_STATUSES]),
      ),
    );

  const statusesByKey = new Map<string, Set<string>>();
  for (const row of existingPending) {
    const key = `${row.targetType}:${row.targetId}:${row.jobType}`;
    const statuses = statusesByKey.get(key) ?? new Set<string>();
    statuses.add(row.status);
    statusesByKey.set(key, statuses);
  }
  const toInsert = targets.flatMap((target) =>
    MEMORY_REBUILD_JOB_TYPES.filter((job) => {
      const statuses = statusesByKey.get(
        `${target.targetType}:${target.targetId}:${job.jobType}`,
      );
      if (!statuses) return true;
      if (statuses.has("pending") || statuses.has("paused")) return false;
      return statuses.has("running");
    }).map((job) => ({ ...target, ...job })),
  );

  if (toInsert.length > 0) {
    await input.client.insert(memoryBuildJob).values(
      toInsert.map((target) => ({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        targetType: target.targetType,
        targetId: target.targetId,
        jobType: target.jobType,
        status: "pending",
        priority: target.priority,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  return { queued: targets.length, processed: 0 };
}

import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import { chapter, chapterBody, searchDirtyQueue } from "../../database/schema.js";
import { chapterSearchCacheService } from "./chapterSearchCacheService.js";
import { memoryProjectionService } from "./memory/memoryProjectionService.js";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

class DbMaintenanceService {
  async markChapterSearchDirty(input: {
    projectId: string;
    chapterId: string;
    reason: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db.getClient().insert(searchDirtyQueue).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      sourceType: "chapter",
      sourceId: input.chapterId,
      reason: input.reason,
      status: "pending",
      attempts: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async rebuildSearchIndex(projectId: string): Promise<{ success: boolean }> {
    await chapterSearchCacheService.rebuildProjectIndex(projectId);
    await db
      .getClient()
      .update(searchDirtyQueue)
      .set({ status: "completed", updatedAt: new Date().toISOString(), error: null })
      .where(and(eq(searchDirtyQueue.projectId, projectId), eq(searchDirtyQueue.status, "pending")));
    return { success: true };
  }

  async getSearchIndexStatus(projectId: string) {
    return await chapterSearchCacheService.getIndexStatus(projectId);
  }

  async rebuildMemoryChunks(input: {
    projectId: string;
    sourceType?: string;
    sourceId?: string;
  }): Promise<{ queued: number; processed: number }> {
    return await memoryProjectionService.processPendingChunkJobs(input);
  }

  async runIntegrityCheck(): Promise<{ ok: boolean; rows: string[] }> {
    const rows = db.getClient().all<{ integrity_check: string }>(
      sql`PRAGMA integrity_check;`,
    );
    const values = rows.map((row) => row.integrity_check);
    const ok = values.every((value) => String(value).trim().toLowerCase() === "ok");
    return { ok, rows: values };
  }

  async getMigrationHealth(): Promise<{
    chapterCount: number;
    chapterBodyCount: number;
    missingBodyCount: number;
    hashMismatchCount: number;
  }> {
    const client = db.getClient();
    const chapters = await client.select({ id: chapter.id, content: chapter.content }).from(chapter);
    const bodies = await client.select().from(chapterBody);
    const bodyMap = new Map(bodies.map((item) => [item.chapterId, item]));

    let missingBodyCount = 0;
    let hashMismatchCount = 0;

    for (const row of chapters) {
      const body = bodyMap.get(row.id);
      if (!body) {
        missingBodyCount += 1;
        continue;
      }
      const canonical = String(body.content ?? row.content ?? "");
      const canonicalHash = hash(canonical);
      if (body.contentHash !== canonicalHash) {
        hashMismatchCount += 1;
      }
    }

    return {
      chapterCount: chapters.length,
      chapterBodyCount: bodies.length,
      missingBodyCount,
      hashMismatchCount,
    };
  }
}

export const dbMaintenanceService = new DbMaintenanceService();

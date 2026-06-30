import { eq } from "drizzle-orm";
import { cacheDb } from "../../../../infra/database/cache.js";
import {
  characterAppearance,
  termAppearance,
} from "../../../../infra/database/cache.js";

const getCacheClient = () => cacheDb.getClient();

export type CachedCharacterAppearance = {
  id: string;
  projectId: string;
  characterId: string;
  chapterId: string;
  position: number;
  context: string | null;
  createdAt: Date;
};

export type CachedTermAppearance = {
  id: string;
  projectId: string;
  termId: string;
  chapterId: string;
  position: number;
  context: string | null;
  createdAt: Date;
};

function mapCharacterAppearanceRow(
  row: typeof characterAppearance.$inferSelect,
): CachedCharacterAppearance {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
  };
}

function mapTermAppearanceRow(
  row: typeof termAppearance.$inferSelect,
): CachedTermAppearance {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
  };
}

class AppearanceCacheService {
  async recordCharacterAppearance(input: {
    projectId: string;
    characterId: string;
    chapterId: string;
    position: number;
    context?: string;
  }): Promise<CachedCharacterAppearance> {
    const db = getCacheClient();
    const [row] = await db
      .insert(characterAppearance)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        characterId: input.characterId,
        chapterId: input.chapterId,
        position: input.position,
        context: input.context ?? null,
      })
      .returning();
    return mapCharacterAppearanceRow(row);
  }

  async recordTermAppearance(input: {
    projectId: string;
    termId: string;
    chapterId: string;
    position: number;
    context?: string;
  }): Promise<CachedTermAppearance> {
    const db = getCacheClient();
    const [row] = await db
      .insert(termAppearance)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        termId: input.termId,
        chapterId: input.chapterId,
        position: input.position,
        context: input.context ?? null,
      })
      .returning();
    return mapTermAppearanceRow(row);
  }

  async getCharacterAppearancesByChapter(
    chapterId: string,
  ): Promise<CachedCharacterAppearance[]> {
    const db = getCacheClient();
    const rows = await db
      .select()
      .from(characterAppearance)
      .where(eq(characterAppearance.chapterId, chapterId))
      .orderBy(characterAppearance.position);
    return rows.map(mapCharacterAppearanceRow);
  }

  async getTermAppearancesByChapter(
    chapterId: string,
  ): Promise<CachedTermAppearance[]> {
    const db = getCacheClient();
    const rows = await db
      .select()
      .from(termAppearance)
      .where(eq(termAppearance.chapterId, chapterId))
      .orderBy(termAppearance.position);
    return rows.map(mapTermAppearanceRow);
  }

  async getCharacterAppearancesByEntity(
    characterId: string,
    limit?: number,
  ): Promise<CachedCharacterAppearance[]> {
    const db = getCacheClient();
    const rows = await db
      .select()
      .from(characterAppearance)
      .where(eq(characterAppearance.characterId, characterId))
      .orderBy(characterAppearance.createdAt)
      .limit(limit ?? 100_000);
    return rows.map(mapCharacterAppearanceRow);
  }

  async getTermAppearancesByEntity(
    termId: string,
    limit?: number,
  ): Promise<CachedTermAppearance[]> {
    const db = getCacheClient();
    const rows = await db
      .select()
      .from(termAppearance)
      .where(eq(termAppearance.termId, termId))
      .orderBy(termAppearance.createdAt)
      .limit(limit ?? 100_000);
    return rows.map(mapTermAppearanceRow);
  }

  async clearChapter(chapterId: string): Promise<void> {
    const db = getCacheClient();
    await Promise.all([
      db
        .delete(characterAppearance)
        .where(eq(characterAppearance.chapterId, chapterId)),
      db.delete(termAppearance).where(eq(termAppearance.chapterId, chapterId)),
    ]);
  }

  async clearCharacterChapter(chapterId: string): Promise<void> {
    const db = getCacheClient();
    await db
      .delete(characterAppearance)
      .where(eq(characterAppearance.chapterId, chapterId));
  }

  async clearTermChapter(chapterId: string): Promise<void> {
    const db = getCacheClient();
    await db
      .delete(termAppearance)
      .where(eq(termAppearance.chapterId, chapterId));
  }

  async clearProject(projectId: string): Promise<void> {
    const db = getCacheClient();
    await Promise.all([
      db
        .delete(characterAppearance)
        .where(eq(characterAppearance.projectId, projectId)),
      db.delete(termAppearance).where(eq(termAppearance.projectId, projectId)),
    ]);
  }

  async clearCharacterProject(projectId: string): Promise<void> {
    const db = getCacheClient();
    await db
      .delete(characterAppearance)
      .where(eq(characterAppearance.projectId, projectId));
  }

  async clearTermProject(projectId: string): Promise<void> {
    const db = getCacheClient();
    await db
      .delete(termAppearance)
      .where(eq(termAppearance.projectId, projectId));
  }

  async clearCharacterEntity(characterId: string): Promise<void> {
    const db = getCacheClient();
    await db
      .delete(characterAppearance)
      .where(eq(characterAppearance.characterId, characterId));
  }

  async clearTermEntity(termId: string): Promise<void> {
    const db = getCacheClient();
    await db.delete(termAppearance).where(eq(termAppearance.termId, termId));
  }
}

export const appearanceCacheService = new AppearanceCacheService();

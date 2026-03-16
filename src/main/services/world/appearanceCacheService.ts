const loadCacheDb = async () =>
  (await import("../../database/cacheDb.js")).cacheDb;

const getCacheClient = async () => {
  const cacheDb = await loadCacheDb();
  return cacheDb.getClient();
};

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

class AppearanceCacheService {
  async recordCharacterAppearance(input: {
    projectId: string;
    characterId: string;
    chapterId: string;
    position: number;
    context?: string;
  }): Promise<CachedCharacterAppearance> {
    const client = await getCacheClient();
    return await client.characterAppearance.create({
      data: {
        projectId: input.projectId,
        characterId: input.characterId,
        chapterId: input.chapterId,
        position: input.position,
        context: input.context,
      },
    });
  }

  async recordTermAppearance(input: {
    projectId: string;
    termId: string;
    chapterId: string;
    position: number;
    context?: string;
  }): Promise<CachedTermAppearance> {
    const client = await getCacheClient();
    return await client.termAppearance.create({
      data: {
        projectId: input.projectId,
        termId: input.termId,
        chapterId: input.chapterId,
        position: input.position,
        context: input.context,
      },
    });
  }

  async getCharacterAppearancesByChapter(
    chapterId: string,
  ): Promise<CachedCharacterAppearance[]> {
    const client = await getCacheClient();
    return await client.characterAppearance.findMany({
      where: { chapterId },
      orderBy: { position: "asc" },
    });
  }

  async getTermAppearancesByChapter(
    chapterId: string,
  ): Promise<CachedTermAppearance[]> {
    const client = await getCacheClient();
    return await client.termAppearance.findMany({
      where: { chapterId },
      orderBy: { position: "asc" },
    });
  }

  async getCharacterAppearancesByEntity(
    characterId: string,
    limit?: number,
  ): Promise<CachedCharacterAppearance[]> {
    const client = await getCacheClient();
    return await client.characterAppearance.findMany({
      where: { characterId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async getTermAppearancesByEntity(
    termId: string,
    limit?: number,
  ): Promise<CachedTermAppearance[]> {
    const client = await getCacheClient();
    return await client.termAppearance.findMany({
      where: { termId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async clearChapter(chapterId: string): Promise<void> {
    const client = await getCacheClient();
    await Promise.all([
      client.characterAppearance.deleteMany({
        where: { chapterId },
      }),
      client.termAppearance.deleteMany({
        where: { chapterId },
      }),
    ]);
  }

  async clearCharacterChapter(chapterId: string): Promise<void> {
    const client = await getCacheClient();
    await client.characterAppearance.deleteMany({
      where: { chapterId },
    });
  }

  async clearTermChapter(chapterId: string): Promise<void> {
    const client = await getCacheClient();
    await client.termAppearance.deleteMany({
      where: { chapterId },
    });
  }

  async clearProject(projectId: string): Promise<void> {
    const client = await getCacheClient();
    await Promise.all([
      client.characterAppearance.deleteMany({
        where: { projectId },
      }),
      client.termAppearance.deleteMany({
        where: { projectId },
      }),
    ]);
  }

  async clearCharacterProject(projectId: string): Promise<void> {
    const client = await getCacheClient();
    await client.characterAppearance.deleteMany({
      where: { projectId },
    });
  }

  async clearTermProject(projectId: string): Promise<void> {
    const client = await getCacheClient();
    await client.termAppearance.deleteMany({
      where: { projectId },
    });
  }

  async clearCharacterEntity(characterId: string): Promise<void> {
    const client = await getCacheClient();
    await client.characterAppearance.deleteMany({
      where: { characterId },
    });
  }

  async clearTermEntity(termId: string): Promise<void> {
    const client = await getCacheClient();
    await client.termAppearance.deleteMany({
      where: { termId },
    });
  }
}

export const appearanceCacheService = new AppearanceCacheService();

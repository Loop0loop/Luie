/* eslint-disable no-await-in-loop -- sync apply mock preserves production ordering */
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

type SyncServiceApplyDependencies = {
  prisma: {
    $transaction: (handler: () => Promise<void>) => Promise<unknown>;
    project: { findUnique: (input: unknown) => Promise<unknown> };
    worldDocument: { upsert: (input: unknown) => Promise<unknown> };
    scrapMemo: {
      deleteMany: (input: unknown) => Promise<unknown>;
      createMany: (input: unknown) => Promise<unknown>;
    };
  };
  writeLuieContainer: (input: unknown) => Promise<unknown>;
  openLuieProject: (projectPath: string) => Promise<unknown>;
};

type ApplyInput = {
  bundle: SyncBundle;
  buildProjectPackagePayload: (args: {
    bundle: SyncBundle;
    projectId: string;
    projectPath: string;
    localSnapshots: Array<{
      id: string;
      chapterId: string | null;
      content: string;
      description: string | null;
      createdAt: Date;
    }>;
  }) => Promise<unknown>;
};

export const createApplyMergedBundleToLocalFirstLuie = (
  dependencies: SyncServiceApplyDependencies,
) =>
  async function applyMergedBundleToLocalFirstLuie(input: ApplyInput) {
    const persistedPackages: Array<{
      projectId: string;
      projectPath: string;
    }> = [];
    const failedProjectIds: string[] = [];

    for (const project of input.bundle.projects) {
      const localProject = (await dependencies.prisma.project.findUnique({
        where: { id: project.id },
      })) as { projectPath?: string | null } | null;
      const projectPath = localProject?.projectPath;
      if (
        typeof projectPath !== "string" ||
        !projectPath.toLowerCase().endsWith(".luie") ||
        !projectPath.startsWith("/")
      ) {
        continue;
      }

      try {
        const payload = await input.buildProjectPackagePayload({
          bundle: input.bundle,
          projectId: project.id,
          projectPath,
          localSnapshots: [],
        });
        await dependencies.writeLuieContainer({
          targetPath: projectPath,
          payload,
        });
        persistedPackages.push({ projectId: project.id, projectPath });
      } catch {
        failedProjectIds.push(project.id);
      }
    }

    if (failedProjectIds.length > 0) {
      throw new Error(`SYNC_LUIE_PERSIST_FAILED:${failedProjectIds.join(",")}`);
    }

    for (const worldDocument of input.bundle.worldDocuments) {
      if (worldDocument.docType === "scrap") continue;
      const payload =
        worldDocument.payload && typeof worldDocument.payload === "object"
          ? { ...worldDocument.payload, updatedAt: worldDocument.updatedAt }
          : { updatedAt: worldDocument.updatedAt };
      await dependencies.prisma.worldDocument.upsert({
        where: {
          projectId_docType: {
            projectId: worldDocument.projectId,
            docType: worldDocument.docType,
          },
        },
        update: { payload: JSON.stringify(payload) },
        create: {
          projectId: worldDocument.projectId,
          docType: worldDocument.docType,
          payload: JSON.stringify(payload),
        },
      });
    }

    const memoProjectIds = new Set(
      input.bundle.memos.map((memo) => memo.projectId),
    );
    for (const projectId of memoProjectIds) {
      const projectMemos = input.bundle.memos.filter(
        (memo) => memo.projectId === projectId,
      );
      await dependencies.prisma.scrapMemo.deleteMany({ where: { projectId } });
      if (projectMemos.length > 0) {
        await dependencies.prisma.scrapMemo.createMany({
          data: projectMemos.map((memo, index) => ({
            id: memo.id,
            projectId: memo.projectId,
            title: memo.title,
            content: memo.content,
            tags: JSON.stringify(memo.tags),
            sortOrder: index,
          })),
        });
      }
    }

    try {
      await dependencies.prisma.$transaction(async () => undefined);
    } catch (error) {
      for (const persistedPackage of persistedPackages) {
        await dependencies.openLuieProject(persistedPackage.projectPath);
      }
      throw new Error(
        `SYNC_DB_CACHE_APPLY_FAILED:${persistedPackages.map((item) => item.projectId).join(",") || "none"}`,
        { cause: error },
      );
    }
    return { status: "applied" as const };
  };

import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "../../../shared/constants/persistence.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  ReplicaWorldDocumentType,
  WorldReplicaDocumentResult,
  WorldReplicaScrapMemosResult,
  WorldScrapMemosData,
} from "../../../shared/types/index.js";
import { db } from "../../database/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";

const logger = createLogger("WorldReplicaService");

const toJsonString = (value: unknown): string => JSON.stringify(value ?? null);

const parseJsonSafely = (value: string, context: Record<string, unknown>): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    logger.warn("Failed to parse replica JSON payload", {
      ...context,
      error,
    });
    return null;
  }
};

const toIsoString = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const parseDateInput = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export class WorldReplicaService {
  private async ensureDbReady(): Promise<void> {
    await db.initialize();
  }

  async getDocument(input: {
    projectId: string;
    docType: ReplicaWorldDocumentType;
  }): Promise<WorldReplicaDocumentResult> {
    try {
      await this.ensureDbReady();
      const row = await db.getClient().worldDocument.findUnique({
        where: {
          projectId_docType: {
            projectId: input.projectId,
            docType: input.docType,
          },
        },
      });

      if (!row) {
        return { found: false, payload: null };
      }

      const payload = parseJsonSafely(row.payload, input);
      if (payload === null && row.payload.trim().length > 0) {
        return {
          found: false,
          payload: null,
          updatedAt: row.updatedAt.toISOString(),
        };
      }

      return {
        found: true,
        payload,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error("Failed to get replica world document", {
        ...input,
        error,
      });
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get replica world document",
        input,
        error,
      );
    }
  }

  async setDocument(input: {
    projectId: string;
    docType: ReplicaWorldDocumentType;
    payload: unknown;
  }): Promise<void> {
    try {
      await this.ensureDbReady();
      await db.getClient().worldDocument.upsert({
        where: {
          projectId_docType: {
            projectId: input.projectId,
            docType: input.docType,
          },
        },
        update: {
          payload: toJsonString(input.payload),
        },
        create: {
          projectId: input.projectId,
          docType: input.docType,
          payload: toJsonString(input.payload),
        },
      });

      if (input.docType === "graph") {
        try {
          await projectService.ensureImmediatePackageExport(
            input.projectId,
            "world-document:graph",
          );
        } catch (error) {
          logger.warn("Failed to export .luie after graph document save", {
            projectId: input.projectId,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to save replica world document", {
        ...input,
        error,
      });
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to save replica world document",
        { projectId: input.projectId, docType: input.docType },
        error,
      );
    }
  }

  async getScrapMemos(projectId: string): Promise<WorldReplicaScrapMemosResult> {
    try {
      await this.ensureDbReady();
      const [documentRow, memoRows] = await Promise.all([
        db.getClient().worldDocument.findUnique({
          where: {
            projectId_docType: {
              projectId,
              docType: "scrap",
            },
          },
        }),
        db.getClient().scrapMemo.findMany({
          where: { projectId },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        }),
      ]);

      if (documentRow) {
        const payload = parseJsonSafely(documentRow.payload, {
          projectId,
          docType: "scrap",
        });
        if (payload && typeof payload === "object") {
          return {
            found: true,
            data: payload as WorldScrapMemosData,
          };
        }
      }

      if (memoRows.length === 0) {
        return documentRow
          ? {
              found: true,
              data: {
                schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
                memos: [],
                updatedAt: documentRow.updatedAt.toISOString(),
              },
            }
          : { found: false, data: null };
      }

      return {
        found: true,
        data: {
          schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
          memos: memoRows.map((row) => {
            const parsedTags = parseJsonSafely(row.tags, {
              projectId,
              memoId: row.id,
            });
            return {
              id: row.id,
              title: row.title,
              content: row.content,
              tags: Array.isArray(parsedTags) ? parsedTags as string[] : [],
              updatedAt: row.updatedAt.toISOString(),
            };
          }),
          updatedAt:
            toIsoString(documentRow?.updatedAt) ??
            toIsoString(memoRows[0]?.updatedAt),
        },
      };
    } catch (error) {
      logger.error("Failed to get replica scrap memos", {
        projectId,
        error,
      });
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get replica scrap memos",
        { projectId },
        error,
      );
    }
  }

  async setScrapMemos(input: {
    projectId: string;
    data: WorldScrapMemosData;
  }): Promise<void> {
    try {
      await this.ensureDbReady();
      const payload: WorldScrapMemosData = {
        schemaVersion:
          input.data.schemaVersion ?? WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
        memos: input.data.memos.map((memo) => ({
          id: memo.id,
          title: memo.title,
          content: memo.content,
          tags: [...memo.tags],
          updatedAt: memo.updatedAt,
        })),
        updatedAt: input.data.updatedAt,
      };

      await db.getClient().$transaction(async (prisma) => {
        await prisma.worldDocument.upsert({
          where: {
            projectId_docType: {
              projectId: input.projectId,
              docType: "scrap",
            },
          },
          update: {
            payload: toJsonString(payload),
          },
          create: {
            projectId: input.projectId,
            docType: "scrap",
            payload: toJsonString(payload),
          },
        });

        await prisma.scrapMemo.deleteMany({
          where: { projectId: input.projectId },
        });

        if (payload.memos.length > 0) {
          const fallbackNow = new Date();
          await prisma.scrapMemo.createMany({
            data: payload.memos.map((memo, index) => ({
              id: memo.id,
              projectId: input.projectId,
              title: memo.title,
              content: memo.content,
              tags: JSON.stringify(memo.tags),
              sortOrder: index,
              createdAt: fallbackNow,
              updatedAt: parseDateInput(memo.updatedAt, fallbackNow),
            })),
          });
        }
      });
    } catch (error) {
      logger.error("Failed to save replica scrap memos", {
        projectId: input.projectId,
        error,
      });
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to save replica scrap memos",
        { projectId: input.projectId },
        error,
      );
    }
  }
}

export const worldReplicaService = new WorldReplicaService();

import { eq, and, asc, desc } from "drizzle-orm";
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
import { project, scrapMemo, worldDocument } from "../../database/schema.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";

const logger = createLogger("WorldReplicaService");

const toJsonString = (value: unknown): string => JSON.stringify(value ?? null);

type WorldReplicaDocumentSetResult = {
  packageExportError?: string;
};

const parseJsonSafely = (
  value: string,
  context: Record<string, unknown>,
): unknown | null => {
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

const toIsoString = (
  value: Date | string | null | undefined,
): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
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
      const results = await db.getClient().select().from(worldDocument).where(and(eq(worldDocument.projectId, input.projectId), eq(worldDocument.docType, input.docType))).limit(1);
      const row = results[0];

      if (!row) {
        return { found: false, payload: null };
      }

      const payload = parseJsonSafely(row.payload, input);
      if (payload === null && row.payload.trim().length > 0) {
        return {
          found: false,
          payload: null,
          updatedAt: toIsoString(row.updatedAt),
        };
      }

      return {
        found: true,
        payload,
        updatedAt: toIsoString(row.updatedAt),
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
  }): Promise<WorldReplicaDocumentSetResult> {
    try {
      await this.ensureDbReady();
      await db.getClient().transaction(async (tx) => {
        const existing = await tx.select().from(worldDocument).where(and(eq(worldDocument.projectId, input.projectId), eq(worldDocument.docType, input.docType))).limit(1);
        if (existing.length > 0) {
          await tx.update(worldDocument).set({ payload: toJsonString(input.payload), updatedAt: new Date().toISOString() }).where(and(eq(worldDocument.projectId, input.projectId), eq(worldDocument.docType, input.docType)));
        } else {
          await tx.insert(worldDocument).values({
            id: crypto.randomUUID(),
            projectId: input.projectId,
            docType: input.docType,
            payload: toJsonString(input.payload),
            updatedAt: new Date().toISOString(),
          });
        }
        await tx.update(project).set({ updatedAt: new Date().toISOString() }).where(eq(project.id, input.projectId));
      });

      if (input.docType === "graph") {
        const exportResult = await projectService.attemptImmediatePackageExport(
          input.projectId,
          "world-document:graph",
        );
        if (exportResult.error || (!exportResult.exported && !exportResult.skipped)) {
          const message =
            exportResult.error instanceof Error
              ? exportResult.error.message
              : String(exportResult.error);
          logger.warn("Graph replica saved but immediate .luie export failed", {
            projectId: input.projectId,
            error: exportResult.error,
          });
          return {
            packageExportError: message,
          };
        }
      }

      return {};
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

  async getScrapMemos(
    projectId: string,
  ): Promise<WorldReplicaScrapMemosResult> {
    try {
      await this.ensureDbReady();
      const [documentRowResults, memoRows] = await Promise.all([
        db.getClient().select().from(worldDocument).where(and(eq(worldDocument.projectId, projectId), eq(worldDocument.docType, "scrap"))).limit(1),
        db.getClient().select().from(scrapMemo).where(eq(scrapMemo.projectId, projectId)).orderBy(asc(scrapMemo.sortOrder), desc(scrapMemo.updatedAt)),
      ]);
      const documentRow = documentRowResults[0];

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
                updatedAt: toIsoString(documentRow.updatedAt),
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
              tags: Array.isArray(parsedTags) ? (parsedTags as string[]) : [],
              updatedAt: row.updatedAt,
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

      await db.getClient().transaction(async (tx) => {
        const existing = await tx.select().from(worldDocument).where(and(eq(worldDocument.projectId, input.projectId), eq(worldDocument.docType, "scrap"))).limit(1);
        if (existing.length > 0) {
          await tx.update(worldDocument).set({ payload: toJsonString(payload), updatedAt: new Date().toISOString() }).where(and(eq(worldDocument.projectId, input.projectId), eq(worldDocument.docType, "scrap")));
        } else {
          await tx.insert(worldDocument).values({
            id: crypto.randomUUID(),
            projectId: input.projectId,
            docType: "scrap",
            payload: toJsonString(payload),
            updatedAt: new Date().toISOString(),
          });
        }

        await tx.delete(scrapMemo).where(eq(scrapMemo.projectId, input.projectId));

        if (payload.memos.length > 0) {
          const fallbackNow = new Date();
          await tx.insert(scrapMemo).values(payload.memos.map((memo, index) => ({
            id: memo.id,
            projectId: input.projectId,
            title: memo.title,
            content: memo.content,
            tags: JSON.stringify(memo.tags),
            sortOrder: index,
            createdAt: fallbackNow.toISOString(),
            updatedAt: memo.updatedAt ?? fallbackNow.toISOString(),
          })));
        }
        await tx.update(project).set({ updatedAt: new Date().toISOString() }).where(eq(project.id, input.projectId));
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

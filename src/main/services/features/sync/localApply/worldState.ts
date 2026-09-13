import { and, eq } from "drizzle-orm";
import { createLogger } from "../../../../../shared/logger/index.js";
import type { DbLike } from "../../../../infra/database/index.js";
import {
  project,
  scrapMemo,
  worldDocument,
} from "../../../../infra/database/index.js";
import { parseWorldJsonSafely } from "../../../../../shared/world/worldDocumentCodec.js";
import type { SyncBundle } from "../syncMapper.js";
import {
  normalizeDrawingPayload,
  normalizeGraphPayload,
  normalizeMindmapPayload,
  normalizePlotPayload,
  normalizeScrapPayload,
  normalizeSynopsisPayload,
} from "../syncWorldDocNormalizer.js";

const logger = createLogger("SyncLocalApply");

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(rows: T[]): T[] =>
  [...rows].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );

const buildWorldDocumentMap = (
  worldDocuments: SyncBundle["worldDocuments"],
  projectId: string,
) => {
  const active = new Map<
    SyncBundle["worldDocuments"][number]["docType"],
    SyncBundle["worldDocuments"][number]
  >();
  const deleted = new Set<SyncBundle["worldDocuments"][number]["docType"]>();

  for (const doc of sortByUpdatedAtDesc(worldDocuments)) {
    if (doc.projectId !== projectId) continue;
    if (active.has(doc.docType) || deleted.has(doc.docType)) continue;
    if (doc.deletedAt) {
      deleted.add(doc.docType);
      continue;
    }
    active.set(doc.docType, doc);
  }

  return { active, deleted };
};

const normalizeWorldDocumentPayload = (
  projectId: string,
  docType: SyncBundle["worldDocuments"][number]["docType"],
  payload: unknown,
  updatedAt: string,
  memos: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: string;
  }>,
) => {
  switch (docType) {
    case "synopsis":
      return {
        ...normalizeSynopsisPayload(projectId, payload, logger),
        updatedAt,
      };
    case "plot":
      return {
        ...normalizePlotPayload(projectId, payload, logger),
        updatedAt,
      };
    case "drawing":
      return {
        ...normalizeDrawingPayload(projectId, payload, logger),
        updatedAt,
      };
    case "mindmap":
      return {
        ...normalizeMindmapPayload(projectId, payload, logger),
        updatedAt,
      };
    case "graph":
      return {
        ...normalizeGraphPayload(projectId, payload, logger),
        updatedAt,
      };
    case "scrap":
      return normalizeScrapPayload(
        projectId,
        payload,
        memos,
        updatedAt,
        logger,
      );
    default:
      return payload;
  }
};

const hasInvalidJsonPayloadString = (payload: unknown): boolean =>
  typeof payload === "string" && parseWorldJsonSafely(payload) === null;

export const applyReplicaWorldState = (
  tx: DbLike,
  bundle: SyncBundle,
  deletedProjectIds: Set<string>,
): void => {
  const activeProjects = bundle.projects.filter(
    (proj) => !proj.deletedAt && !deletedProjectIds.has(proj.id),
  );

  for (const proj of activeProjects) {
    const { active: worldDocMap, deleted: deletedDocTypes } =
      buildWorldDocumentMap(bundle.worldDocuments, proj.id);
    const memos = bundle.memos
      .filter((memo) => memo.projectId === proj.id && !memo.deletedAt)
      .map((memo) => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        tags: memo.tags,
        updatedAt: memo.updatedAt,
      }));

    for (const docType of deletedDocTypes) {
      tx.delete(worldDocument)
        .where(
          and(
            eq(worldDocument.projectId, proj.id),
            eq(worldDocument.docType, docType),
          ),
        )
        .run();
    }

    for (const [docType, doc] of worldDocMap.entries()) {
      if (docType === "scrap") {
        continue;
      }
      if (hasInvalidJsonPayloadString(doc.payload)) {
        logger.warn("Skipping invalid sync world document payload", {
          projectId: proj.id,
          docType,
        });
        continue;
      }
      const normalizedPayload = normalizeWorldDocumentPayload(
        proj.id,
        docType,
        doc.payload,
        doc.updatedAt,
        memos,
      );
      tx.insert(worldDocument)
        .values({
          id: `${proj.id}:${docType}`,
          projectId: proj.id,
          docType,
          payload: JSON.stringify(normalizedPayload),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [worldDocument.projectId, worldDocument.docType],
          set: {
            payload: JSON.stringify(normalizedPayload),
            updatedAt: new Date().toISOString(),
          },
        })
        .run();
    }

    const normalizedScrapPayload = normalizeScrapPayload(
      proj.id,
      worldDocMap.get("scrap")?.payload,
      memos,
      proj.updatedAt,
      logger,
    );

    if (worldDocMap.has("scrap") || memos.length > 0) {
      tx.insert(worldDocument)
        .values({
          id: `${proj.id}:scrap`,
          projectId: proj.id,
          docType: "scrap",
          payload: JSON.stringify(normalizedScrapPayload),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [worldDocument.projectId, worldDocument.docType],
          set: {
            payload: JSON.stringify(normalizedScrapPayload),
            updatedAt: new Date().toISOString(),
          },
        })
        .run();
    } else if (deletedDocTypes.has("scrap")) {
      tx.delete(worldDocument)
        .where(
          and(
            eq(worldDocument.projectId, proj.id),
            eq(worldDocument.docType, "scrap"),
          ),
        )
        .run();
    }

    const shouldRewriteScrapMemos =
      worldDocMap.has("scrap") ||
      memos.length > 0 ||
      deletedDocTypes.has("scrap");
    if (shouldRewriteScrapMemos) {
      tx.delete(scrapMemo).where(eq(scrapMemo.projectId, proj.id)).run();

      const scrapMemoRows = normalizedScrapPayload.memos.map((memo, index) => ({
        id: memo.id,
        projectId: proj.id,
        title: memo.title,
        content: memo.content,
        tags: JSON.stringify(memo.tags),
        sortOrder: index,
        createdAt: new Date(memo.updatedAt).toISOString(),
        updatedAt: new Date(memo.updatedAt).toISOString(),
      }));
      if (scrapMemoRows.length > 0) {
        tx.insert(scrapMemo).values(scrapMemoRows).run();
      }
    }

    if (deletedDocTypes.size > 0 || worldDocMap.size > 0 || memos.length > 0) {
      tx.update(project)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(project.id, proj.id))
        .run();
    }
  }
};

export const applyReplicaWorldDelta = (
  tx: DbLike,
  delta: SyncBundle,
  merged: SyncBundle,
  deletedProjectIds: Set<string>,
): void => {
  const affectedProjectIds = new Set([
    ...delta.worldDocuments.map((row) => row.projectId),
    ...delta.memos.map((row) => row.projectId),
  ]);

  for (const projectId of affectedProjectIds) {
    if (deletedProjectIds.has(projectId)) continue;
    const mergedProject = merged.projects.find((row) => row.id === projectId);
    if (!mergedProject || mergedProject.deletedAt) continue;

    const { active, deleted } = buildWorldDocumentMap(
      delta.worldDocuments,
      projectId,
    );
    const { active: mergedDocuments } = buildWorldDocumentMap(
      merged.worldDocuments,
      projectId,
    );
    const mergedMemos = merged.memos.filter(
      (memo) => memo.projectId === projectId && !memo.deletedAt,
    );

    for (const docType of deleted) {
      if (docType === "scrap") continue;
      tx.delete(worldDocument)
        .where(
          and(
            eq(worldDocument.projectId, projectId),
            eq(worldDocument.docType, docType),
          ),
        )
        .run();
    }

    for (const [docType, doc] of active) {
      if (docType === "scrap") continue;
      if (hasInvalidJsonPayloadString(doc.payload)) {
        logger.warn("Skipping invalid sync world document payload", {
          projectId,
          docType,
        });
        continue;
      }
      const normalizedPayload = normalizeWorldDocumentPayload(
        projectId,
        docType,
        doc.payload,
        doc.updatedAt,
        mergedMemos,
      );
      tx.insert(worldDocument)
        .values({
          id: `${projectId}:${docType}`,
          projectId,
          docType,
          payload: JSON.stringify(normalizedPayload),
          createdAt: doc.updatedAt,
          updatedAt: doc.updatedAt,
        })
        .onConflictDoUpdate({
          target: [worldDocument.projectId, worldDocument.docType],
          set: {
            payload: JSON.stringify(normalizedPayload),
            updatedAt: doc.updatedAt,
          },
        })
        .run();
    }

    const deltaMemos = delta.memos.filter(
      (memo) => memo.projectId === projectId,
    );
    const shouldRewriteScrap =
      active.has("scrap") || deleted.has("scrap") || deltaMemos.length > 0;
    if (shouldRewriteScrap) {
      const mergedScrap = mergedDocuments.get("scrap");
      if (mergedScrap || mergedMemos.length > 0) {
        const updatedAt =
          mergedScrap?.updatedAt ??
          mergedMemos[0]?.updatedAt ??
          mergedProject.updatedAt;
        const payload = normalizeScrapPayload(
          projectId,
          mergedScrap?.payload,
          mergedMemos,
          updatedAt,
          logger,
        );
        tx.insert(worldDocument)
          .values({
            id: `${projectId}:scrap`,
            projectId,
            docType: "scrap",
            payload: JSON.stringify(payload),
            createdAt: updatedAt,
            updatedAt,
          })
          .onConflictDoUpdate({
            target: [worldDocument.projectId, worldDocument.docType],
            set: { payload: JSON.stringify(payload), updatedAt },
          })
          .run();
      } else {
        tx.delete(worldDocument)
          .where(
            and(
              eq(worldDocument.projectId, projectId),
              eq(worldDocument.docType, "scrap"),
            ),
          )
          .run();
      }
    }

    const orderByMemoId = new Map(
      mergedMemos.map((memo, index) => [memo.id, index]),
    );
    for (const memo of deltaMemos) {
      if (memo.deletedAt) {
        tx.delete(scrapMemo)
          .where(
            and(eq(scrapMemo.id, memo.id), eq(scrapMemo.projectId, projectId)),
          )
          .run();
        continue;
      }
      const values = {
        id: memo.id,
        projectId,
        title: memo.title,
        content: memo.content,
        tags: JSON.stringify(memo.tags),
        sortOrder: orderByMemoId.get(memo.id) ?? 0,
        createdAt: memo.updatedAt,
        updatedAt: memo.updatedAt,
        deletedAt: null,
      };
      tx.insert(scrapMemo)
        .values(values)
        .onConflictDoUpdate({
          target: [scrapMemo.id],
          set: {
            title: values.title,
            content: values.content,
            tags: values.tags,
            sortOrder: values.sortOrder,
            updatedAt: values.updatedAt,
            deletedAt: null,
          },
        })
        .run();
    }
  }
};

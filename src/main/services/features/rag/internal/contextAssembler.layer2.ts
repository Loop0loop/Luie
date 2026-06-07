import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  character,
  entityRelation,
  event,
  faction,
  scrapMemo,
  term,
  worldDocument,
  worldEntity,
} from "../../../../database/schema/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import {
  LAYER2_CHAR_LIMIT,
  trimByChars,
} from "./contextAssembler.constants.js";

type Layer2CharacterRow = {
  name: string | null;
  description: string | null;
};
type Layer2FactionRow = {
  name: string | null;
  description: string | null;
};
type Layer2EventRow = {
  name: string | null;
  description: string | null;
};
type Layer2TermRow = {
  term: string | null;
  definition: string | null;
  category: string | null;
};
type Layer2WorldEntityRow = {
  type: string | null;
  name: string | null;
  description: string | null;
};
type Layer2RelationRow = {
  sourceType: string | null;
  sourceId: string;
  relation: string | null;
  targetType: string | null;
  targetId: string;
};
type Layer2ScrapMemoRow = {
  title: string | null;
  content: string | null;
};
type Layer2WorldDocumentRow = {
  docType: string | null;
  payload: string | null;
};

const logger = createLogger("RagContextAssembler");

export async function buildLayer2WorldContext(projectId: string): Promise<string> {
  const [
    charactersResult,
    factionsResult,
    eventsResult,
    termsResult,
    worldEntitiesResult,
    relationsResult,
    scrapMemosResult,
    worldDocumentsResult,
  ] = await Promise.allSettled([
    db
      .getClient()
      .select({ name: character.name, description: character.description })
      .from(character)
      .where(and(eq(character.projectId, projectId), isNull(character.deletedAt)))
      .orderBy(asc(character.updatedAt))
      .limit(80),
    db
      .getClient()
      .select({ name: faction.name, description: faction.description })
      .from(faction)
      .where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt)))
      .orderBy(asc(faction.updatedAt))
      .limit(80),
    db
      .getClient()
      .select({ name: event.name, description: event.description })
      .from(event)
      .where(and(eq(event.projectId, projectId), isNull(event.deletedAt)))
      .orderBy(asc(event.updatedAt))
      .limit(80),
    db
      .getClient()
      .select({
        term: term.term,
        definition: term.definition,
        category: term.category,
      })
      .from(term)
      .where(and(eq(term.projectId, projectId), isNull(term.deletedAt)))
      .orderBy(asc(term.order), asc(term.updatedAt))
      .limit(120),
    db
      .getClient()
      .select({
        type: worldEntity.type,
        name: worldEntity.name,
        description: worldEntity.description,
      })
      .from(worldEntity)
      .where(and(eq(worldEntity.projectId, projectId), isNull(worldEntity.deletedAt)))
      .orderBy(asc(worldEntity.type), asc(worldEntity.updatedAt))
      .limit(120),
    db
      .getClient()
      .select({
        sourceType: entityRelation.sourceType,
        sourceId: entityRelation.sourceId,
        relation: entityRelation.relation,
        targetType: entityRelation.targetType,
        targetId: entityRelation.targetId,
      })
      .from(entityRelation)
      .where(eq(entityRelation.projectId, projectId))
      .orderBy(asc(entityRelation.updatedAt))
      .limit(160),
    db
      .getClient()
      .select({ title: scrapMemo.title, content: scrapMemo.content })
      .from(scrapMemo)
      .where(and(eq(scrapMemo.projectId, projectId), isNull(scrapMemo.deletedAt)))
      .orderBy(asc(scrapMemo.sortOrder), asc(scrapMemo.updatedAt))
      .limit(80),
    db
      .getClient()
      .select({ docType: worldDocument.docType, payload: worldDocument.payload })
      .from(worldDocument)
      .where(eq(worldDocument.projectId, projectId))
      .orderBy(asc(worldDocument.updatedAt))
      .limit(40),
  ]);

  if (charactersResult.status === "rejected") {
    logger.warn("Layer2 character query failed", {
      projectId,
      error: charactersResult.reason,
    });
  }
  if (factionsResult.status === "rejected") {
    logger.warn("Layer2 faction query failed", { projectId, error: factionsResult.reason });
  }
  if (eventsResult.status === "rejected") {
    logger.warn("Layer2 event query failed", {
      projectId,
      error: eventsResult.reason,
    });
  }
  if (termsResult.status === "rejected") {
    logger.warn("Layer2 term query failed", {
      projectId,
      error: termsResult.reason,
    });
  }
  if (worldEntitiesResult.status === "rejected") {
    logger.warn("Layer2 world entity query failed", {
      projectId,
      error: worldEntitiesResult.reason,
    });
  }
  if (relationsResult.status === "rejected") {
    logger.warn("Layer2 relation query failed", {
      projectId,
      error: relationsResult.reason,
    });
  }
  if (scrapMemosResult.status === "rejected") {
    logger.warn("Layer2 scrap memo query failed", {
      projectId,
      error: scrapMemosResult.reason,
    });
  }
  if (worldDocumentsResult.status === "rejected") {
    logger.warn("Layer2 world document query failed", {
      projectId,
      error: worldDocumentsResult.reason,
    });
  }

  const characters =
    charactersResult.status === "fulfilled"
      ? (charactersResult.value as Layer2CharacterRow[])
      : [];
  const factions =
    factionsResult.status === "fulfilled"
      ? (factionsResult.value as Layer2FactionRow[])
      : [];
  const events = eventsResult.status === "fulfilled"
    ? (eventsResult.value as Layer2EventRow[])
    : [];
  const terms = termsResult.status === "fulfilled"
    ? (termsResult.value as Layer2TermRow[])
    : [];
  const worldEntities =
    worldEntitiesResult.status === "fulfilled"
      ? (worldEntitiesResult.value as Layer2WorldEntityRow[])
      : [];
  const relations =
    relationsResult.status === "fulfilled"
      ? (relationsResult.value as Layer2RelationRow[])
      : [];
  const scrapMemos =
    scrapMemosResult.status === "fulfilled"
      ? (scrapMemosResult.value as Layer2ScrapMemoRow[])
      : [];
  const worldDocuments =
    worldDocumentsResult.status === "fulfilled"
      ? (worldDocumentsResult.value as Layer2WorldDocumentRow[])
      : [];

  const content = [
    "[CHARACTERS]",
    ...characters.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[FACTIONS]",
    ...factions.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[EVENTS]",
    ...events.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[TERMS]",
    ...terms.map(
      (row) =>
        `- ${row.term}${row.category ? ` (${row.category})` : ""}: ${row.definition ?? ""}`,
    ),
    "[WORLD ENTITIES]",
    ...worldEntities.map((row) =>
      `- ${row.type}/${row.name}: ${row.description ?? ""}`,
    ),
    "[RELATIONS]",
    ...relations.map(
      (row) =>
        `- ${row.sourceType}:${row.sourceId} -${row.relation}-> ${row.targetType}:${row.targetId}`,
    ),
    "[SCRAP MEMOS]",
    ...scrapMemos.map((row) => `- ${row.title}: ${row.content}`),
    "[WORLD DOCUMENTS]",
    ...worldDocuments.map(
      (row) => `- ${row.docType}: ${trimByChars(row.payload ?? "", 600)}`,
    ),
  ].join("\n");

  return trimByChars(content, LAYER2_CHAR_LIMIT);
}

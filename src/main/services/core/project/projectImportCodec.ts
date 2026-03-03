import { randomUUID } from "node:crypto";
import { ErrorCode, LUIE_MANUSCRIPT_DIR, MARKDOWN_EXTENSION } from "../../../../shared/constants/index.js";
import type {
  RelationKind,
  WorldEntitySourceType,
  WorldEntityType,
} from "../../../../shared/types/index.js";
import { ServiceError } from "../../../utils/serviceError.js";

export type ChapterCreateRow = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount: number;
};

export type CharacterCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};

export type TermCreateRow = {
  id: string;
  projectId: string;
  term: string;
  definition: string | null;
  category: string | null;
  firstAppearance: string | null;
};

export type SnapshotCreateRow = {
  id: string;
  projectId: string;
  chapterId: string | null;
  content: string;
  contentLength: number;
  description: string | null;
  createdAt: Date;
};

export type FactionCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};

export type EventCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};

export type WorldEntityCreateRow = {
  id: string;
  projectId: string;
  type: WorldEntityType;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
  positionX: number;
  positionY: number;
};

export type EntityRelationCreateRow = {
  id: string;
  projectId: string;
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
  relation: RelationKind;
  attributes: string | null;
  sourceWorldEntityId: string | null;
  targetWorldEntityId: string | null;
};

type LuieChapterMetaInput = {
  id?: string;
  title?: string;
  order?: number;
  file?: string;
  content?: string;
};

type WarnLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

export const buildChapterCreateRows = async (input: {
  packagePath: string;
  resolvedProjectId: string;
  chaptersMeta: LuieChapterMetaInput[];
  readChapterEntry: (entryPath: string) => Promise<string | null>;
}): Promise<ChapterCreateRow[]> => {
  const chaptersForCreate: ChapterCreateRow[] = [];
  for (let index = 0; index < input.chaptersMeta.length; index += 1) {
    const chapter = input.chaptersMeta[index];
    const chapterId = chapter.id ?? randomUUID();
    const entryPath =
      chapter.file ?? `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`;
    const contentRaw =
      typeof chapter.content === "string"
        ? chapter.content
        : await input.readChapterEntry(entryPath);
    if (contentRaw === null) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Missing chapter content entry in .luie package",
        {
          packagePath: input.packagePath,
          entryPath,
          chapterId,
        },
      );
    }
    const content = contentRaw ?? "";

    chaptersForCreate.push({
      id: chapterId,
      projectId: input.resolvedProjectId,
      title: chapter.title ?? `Chapter ${index + 1}`,
      content,
      synopsis: null,
      order: typeof chapter.order === "number" ? chapter.order : index,
      wordCount: content.length,
    });
  }
  return chaptersForCreate;
};

export const buildCharacterCreateRows = (
  resolvedProjectId: string,
  characters: Array<Record<string, unknown>>,
): CharacterCreateRow[] => {
  return characters.map((character, index) => {
    const name =
      typeof character.name === "string" && character.name.trim().length > 0
        ? character.name
        : `Character ${index + 1}`;
    const attributes =
      typeof character.attributes === "string"
        ? character.attributes
        : character.attributes
          ? JSON.stringify(character.attributes)
          : null;
    return {
      id: typeof character.id === "string" ? character.id : randomUUID(),
      projectId: resolvedProjectId,
      name,
      description:
        typeof character.description === "string" ? character.description : null,
      firstAppearance:
        typeof character.firstAppearance === "string" ? character.firstAppearance : null,
      attributes,
    };
  });
};

export const buildTermCreateRows = (
  resolvedProjectId: string,
  terms: Array<Record<string, unknown>>,
): TermCreateRow[] => {
  return terms.map((term, index) => {
    const termLabel =
      typeof term.term === "string" && term.term.trim().length > 0
        ? term.term
        : `Term ${index + 1}`;
    return {
      id: typeof term.id === "string" ? term.id : randomUUID(),
      projectId: resolvedProjectId,
      term: termLabel,
      definition: typeof term.definition === "string" ? term.definition : null,
      category: typeof term.category === "string" ? term.category : null,
      firstAppearance:
        typeof term.firstAppearance === "string" ? term.firstAppearance : null,
    };
  });
};

export const buildSnapshotCreateRows = (input: {
  resolvedProjectId: string;
  snapshots: Array<{ id?: string; chapterId?: string | null; content?: string; description?: string | null; createdAt?: string }>;
  validChapterIds: Set<string>;
  logger: WarnLogger;
}): SnapshotCreateRow[] => {
  const deduped = new Set<string>();
  const rows: SnapshotCreateRow[] = [];

  for (const snapshot of input.snapshots) {
    if (typeof snapshot.id !== "string" || snapshot.id.trim().length === 0) {
      continue;
    }
    if (deduped.has(snapshot.id)) {
      continue;
    }
    deduped.add(snapshot.id);

    const content = typeof snapshot.content === "string" ? snapshot.content : "";
    const rawChapterId =
      typeof snapshot.chapterId === "string" ? snapshot.chapterId.trim() : "";
    const hasValidChapter = rawChapterId.length > 0 && input.validChapterIds.has(rawChapterId);
    if (rawChapterId.length > 0 && !hasValidChapter) {
      input.logger.warn("Snapshot chapter reference missing during .luie import; detaching snapshot", {
        snapshotId: snapshot.id,
        chapterId: rawChapterId,
        projectId: input.resolvedProjectId,
      });
    }

    const createdAt =
      typeof snapshot.createdAt === "string" && snapshot.createdAt.trim().length > 0
        ? new Date(snapshot.createdAt)
        : new Date();
    const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;

    rows.push({
      id: snapshot.id,
      projectId: input.resolvedProjectId,
      chapterId: hasValidChapter ? rawChapterId : null,
      content,
      contentLength: content.length,
      description: typeof snapshot.description === "string" ? snapshot.description : null,
      createdAt: safeCreatedAt,
    });
  }

  return rows;
};

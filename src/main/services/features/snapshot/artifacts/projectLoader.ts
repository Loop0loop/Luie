import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import {
  chapter as chapterTable,
  character as characterTable,
  project as projectTable,
  projectSettings as projectSettingsTable,
  term as termTable,
} from "../../../../infra/database/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { getProjectAttachmentPath } from "../../../core/project/projectAttachmentStore.js";
import type { ProjectSnapshotRecord } from "./types.js";

export async function loadProjectSnapshotRecord(projectId: string): Promise<{
  project: ProjectSnapshotRecord;
  projectPath: string | null;
}> {
  const store = db.getClient();

  const [
    projRows,
    settingsRows,
    chaptersRows,
    charactersRows,
    termsRows,
    projectPath,
  ] = await Promise.all([
    store
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .limit(1),
    store
      .select()
      .from(projectSettingsTable)
      .where(eq(projectSettingsTable.projectId, projectId))
      .limit(1),
    store
      .select()
      .from(chapterTable)
      .where(
        and(
          eq(chapterTable.projectId, projectId),
          isNull(chapterTable.deletedAt),
        ),
      )
      .orderBy(asc(chapterTable.order)),
    store
      .select()
      .from(characterTable)
      .where(
        and(
          eq(characterTable.projectId, projectId),
          isNull(characterTable.deletedAt),
        ),
      ),
    store
      .select()
      .from(termTable)
      .where(
        and(eq(termTable.projectId, projectId), isNull(termTable.deletedAt)),
      ),
    getProjectAttachmentPath(projectId),
  ]);

  const projectRow = projRows[0] ?? null;
  const settingsRow = settingsRows[0] ?? null;

  if (!projectRow) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId,
    });
  }

  return {
    project: {
      id: projectRow.id,
      title: projectRow.title,
      description: projectRow.description,
      projectPath: projectRow.projectPath,
      createdAt: new Date(projectRow.createdAt),
      updatedAt: new Date(projectRow.updatedAt),
      settings: settingsRow ?? undefined,
      chapters: chaptersRows.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        synopsis: chapter.synopsis,
        order: chapter.order,
        wordCount: chapter.wordCount,
        createdAt: new Date(chapter.createdAt),
        updatedAt: new Date(chapter.updatedAt),
      })),
      characters: charactersRows.map((character) => ({
        id: character.id,
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes: character.attributes
          ? JSON.parse(character.attributes)
          : undefined,
        createdAt: new Date(character.createdAt),
        updatedAt: new Date(character.updatedAt),
      })),
      terms: termsRows.map((term) => ({
        id: term.id,
        term: term.term,
        definition: term.definition,
        category: term.category,
        firstAppearance: term.firstAppearance,
        createdAt: new Date(term.createdAt),
        updatedAt: new Date(term.updatedAt),
      })),
    },
    projectPath,
  };
}

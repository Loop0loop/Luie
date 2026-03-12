import { promises as fsPromises } from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { app } from "electron";
import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";
import {
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
} from "../../../../shared/constants/index.js";
import { sanitizeName } from "../../../../shared/utils/sanitize.js";
import { writeLuieContainer } from "../../io/luieContainer.js";
import { readFullSnapshotArtifact } from "./snapshotArtifacts.js";

type LoggerLike = {
  info: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

type SnapshotArtifact = Awaited<ReturnType<typeof readFullSnapshotArtifact>>;

type ImportedProject = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ImportTransactionResult = {
  created: ImportedProject;
  chapterIdMap: Map<string, string>;
  characterIdMap: Map<string, string>;
  termIdMap: Map<string, string>;
};

const resolveImportProjectPath = async (title: string): Promise<string> => {
  const safeTitle = sanitizeName(title || "Recovered Snapshot", "Recovered Snapshot");
  const documentsDir = app.getPath("documents");
  let projectPath = path.join(
    documentsDir,
    `${safeTitle || "Recovered Snapshot"}${LUIE_PACKAGE_EXTENSION}`,
  );

  try {
    await fsPromises.access(projectPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    projectPath = path.join(
      documentsDir,
      `${safeTitle || "Recovered Snapshot"}-${timestamp}${LUIE_PACKAGE_EXTENSION}`,
    );
  } catch {
    // keep first candidate when it does not exist
  }

  return projectPath;
};

const resolveAutoSaveSettings = (settings: SnapshotArtifact["data"]["settings"]) => {
  const typed = settings as { autoSave?: boolean; autoSaveInterval?: number } | undefined;
  return {
    autoSave: typeof typed?.autoSave === "boolean" ? typed.autoSave : true,
    autoSaveInterval:
      typeof typed?.autoSaveInterval === "number"
        ? typed.autoSaveInterval
        : DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  };
};

const createImportedProject = async (
  snapshot: SnapshotArtifact,
  projectPath: string,
): Promise<ImportTransactionResult> => {
  const { autoSave, autoSaveInterval } = resolveAutoSaveSettings(snapshot.data.settings);
  const projectData = snapshot.data.project;

  const result = await db.getClient().$transaction(
    async (tx: Prisma.TransactionClient) => {
      const created = await tx.project.create({
        data: {
          title: projectData.title || "Recovered Snapshot",
          description: projectData.description ?? undefined,
          projectPath,
          settings: {
            create: {
              autoSave,
              autoSaveInterval,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      const projectId = created.id;
      const chapterIdMap = new Map<string, string>();
      const characterIdMap = new Map<string, string>();
      const termIdMap = new Map<string, string>();

      const chaptersForCreate = snapshot.data.chapters.map((chapter, index) => {
        const nextId = randomUUID();
        chapterIdMap.set(chapter.id, nextId);
        return {
          id: nextId,
          projectId,
          title: chapter.title,
          content: chapter.content ?? "",
          synopsis: chapter.synopsis ?? null,
          order: typeof chapter.order === "number" ? chapter.order : index,
          wordCount: chapter.wordCount ?? 0,
        };
      });

      const charactersForCreate = snapshot.data.characters.map((character) => {
        const nextId = randomUUID();
        characterIdMap.set(character.id, nextId);
        return {
          id: nextId,
          projectId,
          name: character.name,
          description: character.description ?? null,
          firstAppearance: character.firstAppearance ?? null,
          attributes:
            typeof character.attributes === "string"
              ? character.attributes
              : character.attributes
                ? JSON.stringify(character.attributes)
                : null,
        };
      });

      const termsForCreate = snapshot.data.terms.map((term) => {
        const nextId = randomUUID();
        termIdMap.set(term.id, nextId);
        return {
          id: nextId,
          projectId,
          term: term.term,
          definition: term.definition ?? null,
          category: term.category ?? null,
          firstAppearance: term.firstAppearance ?? null,
        };
      });

      if (chaptersForCreate.length > 0) {
        await tx.chapter.createMany({
          data: chaptersForCreate,
        });
      }

      if (charactersForCreate.length > 0) {
        await tx.character.createMany({
          data: charactersForCreate,
        });
      }

      if (termsForCreate.length > 0) {
        await tx.term.createMany({
          data: termsForCreate,
        });
      }

      return {
        created: {
          id: created.id,
          title: created.title,
          description: created.description,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        chapterIdMap,
        characterIdMap,
        termIdMap,
      };
    },
  );

  return result as ImportTransactionResult;
};

const buildPackageMeta = (created: ImportedProject) => ({
  format: LUIE_PACKAGE_FORMAT,
  container: LUIE_PACKAGE_CONTAINER_DIR,
  version: LUIE_PACKAGE_VERSION,
  projectId: created.id,
  title: created.title,
  description: created.description ?? undefined,
  createdAt: created.createdAt?.toISOString?.() ?? String(created.createdAt),
  updatedAt: created.updatedAt?.toISOString?.() ?? String(created.updatedAt),
});

const rollbackImportedProject = async (
  projectId: string,
  filePath: string,
  logger: LoggerLike,
): Promise<void> => {
  try {
    await db.getClient().project.delete({ where: { id: projectId } });
  } catch (rollbackError) {
    logger.error("Failed to rollback project after snapshot .luie import failure", {
      projectId,
      filePath,
      error: rollbackError,
    });
  }
};

export const importSnapshotFromFile = async (
  filePath: string,
  logger: LoggerLike,
): Promise<ImportedProject> => {
  const snapshot = await readFullSnapshotArtifact(filePath);
  const projectPath = await resolveImportProjectPath(snapshot.data.project.title);
  const imported = await createImportedProject(snapshot, projectPath);
  const { created, chapterIdMap, characterIdMap, termIdMap } = imported;
  const meta = buildPackageMeta(created);

  try {
    await writeLuieContainer({
      targetPath: projectPath,
      payload: {
        meta,
        chapters: snapshot.data.chapters.map((chapter) => ({
          id: chapterIdMap.get(chapter.id) ?? chapter.id,
          content: chapter.content ?? "",
        })),
        characters: snapshot.data.characters.map((character) => ({
          id: characterIdMap.get(character.id) ?? character.id,
          name: character.name,
          description: character.description ?? null,
          firstAppearance: character.firstAppearance ?? null,
          attributes:
            typeof character.attributes === "string"
              ? character.attributes
              : character.attributes
                ? JSON.stringify(character.attributes)
                : null,
          createdAt: new Date(character.createdAt),
          updatedAt: new Date(character.updatedAt),
        })),
        terms: snapshot.data.terms.map((term) => ({
          id: termIdMap.get(term.id) ?? term.id,
          term: term.term,
          definition: term.definition ?? null,
          category: term.category ?? null,
          firstAppearance: term.firstAppearance ?? null,
          createdAt: new Date(term.createdAt),
          updatedAt: new Date(term.updatedAt),
        })),
        snapshots: [],
      },
      logger,
    });
  } catch (error) {
    await rollbackImportedProject(created.id, filePath, logger);
    throw error;
  }

  return created;
};

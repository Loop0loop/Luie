import { promises as fsPromises } from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { app } from "electron";
import { eq } from "drizzle-orm";
import { db } from "../../../database/index.js";
import * as schema from "../../../database/schema.js";
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

const { project, projectSettings, chapter, character, term } = schema;

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
  const now = new Date().toISOString();

  const store = db.getDrizzleClient();
  const result = await store.transaction(async (tx) => {
    const [proj] = await tx.insert(project).values({
      id: randomUUID(),
      title: projectData.title || "Recovered Snapshot",
      description: projectData.description ?? undefined,
      projectPath,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const projectId = proj.id;

    await tx.insert(projectSettings).values({
      id: projectId,
      projectId,
      autoSave,
      autoSaveInterval,
    });

    const chapterIdMap = new Map<string, string>();
    const characterIdMap = new Map<string, string>();
    const termIdMap = new Map<string, string>();

    const chaptersForCreate = snapshot.data.chapters.map((chapterItem, index) => {
      const nextId = randomUUID();
      chapterIdMap.set(chapterItem.id, nextId);
      return {
        id: nextId,
        projectId,
        title: chapterItem.title,
        content: chapterItem.content ?? "",
        synopsis: chapterItem.synopsis ?? null,
        order: typeof chapterItem.order === "number" ? chapterItem.order : index,
        wordCount: chapterItem.wordCount ?? 0,
        createdAt: now,
        updatedAt: now,
      };
    });

    const charactersForCreate = snapshot.data.characters.map((characterItem) => {
      const nextId = randomUUID();
      characterIdMap.set(characterItem.id, nextId);
      return {
        id: nextId,
        projectId,
        name: characterItem.name,
        description: characterItem.description ?? null,
        firstAppearance: characterItem.firstAppearance ?? null,
        attributes:
          typeof characterItem.attributes === "string"
            ? characterItem.attributes
            : characterItem.attributes
              ? JSON.stringify(characterItem.attributes)
              : null,
        createdAt: now,
        updatedAt: now,
      };
    });

    const termsForCreate = snapshot.data.terms.map((termItem) => {
      const nextId = randomUUID();
      termIdMap.set(termItem.id, nextId);
      return {
        id: nextId,
        projectId,
        term: termItem.term,
        definition: termItem.definition ?? null,
        category: termItem.category ?? null,
        firstAppearance: termItem.firstAppearance ?? null,
        order: 0,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (chaptersForCreate.length > 0) {
      await tx.insert(chapter).values(chaptersForCreate);
    }

    if (charactersForCreate.length > 0) {
      await tx.insert(character).values(charactersForCreate);
    }

    if (termsForCreate.length > 0) {
      await tx.insert(term).values(termsForCreate);
    }

    const created: ImportedProject = {
      id: proj.id,
      title: proj.title,
      description: proj.description,
      createdAt: new Date(proj.createdAt),
      updatedAt: new Date(proj.updatedAt),
    };

    return {
      created,
      chapterIdMap,
      characterIdMap,
      termIdMap,
    };
  });

  return result;
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
    await db.getDrizzleClient().delete(project).where(eq(project.id, projectId));
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
        chapters: snapshot.data.chapters.map((chapterItem) => ({
          id: chapterIdMap.get(chapterItem.id) ?? chapterItem.id,
          content: chapterItem.content ?? "",
        })),
        characters: snapshot.data.characters.map((characterItem) => ({
          id: characterIdMap.get(characterItem.id) ?? characterItem.id,
          name: characterItem.name,
          description: characterItem.description ?? null,
          firstAppearance: characterItem.firstAppearance ?? null,
          attributes:
            typeof characterItem.attributes === "string"
              ? characterItem.attributes
              : characterItem.attributes
                ? JSON.stringify(characterItem.attributes)
                : null,
          createdAt: new Date(characterItem.createdAt),
          updatedAt: new Date(characterItem.updatedAt),
        })),
        terms: snapshot.data.terms.map((termItem) => ({
          id: termIdMap.get(termItem.id) ?? termItem.id,
          term: termItem.term,
          definition: termItem.definition ?? null,
          category: termItem.category ?? null,
          firstAppearance: termItem.firstAppearance ?? null,
          createdAt: new Date(termItem.createdAt),
          updatedAt: new Date(termItem.updatedAt),
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

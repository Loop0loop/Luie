import { asc, desc, inArray } from "drizzle-orm";
import type { SyncPendingProjectDelete } from "../../../../shared/types/index.js";
import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import { db } from "../../../database/index.js";
import * as schema from "../../../database/schema.js";
import type { ProjectRow, ChapterRow } from "../../../database/schema.js";
import {
  buildLocalSyncBundle,
  hydrateMissingWorldDocsFromPackage,
} from "./syncBundleCollector.js";
import { buildSyncProjectPackagePayload } from "./syncBundleApplier.js";
import type { SyncBundle } from "./syncMapper.js";
import { hydrateProjectsWithAttachmentPaths } from "../../core/project/projectAttachmentStore.js";

const { project, chapter, character, event, faction, scrapMemo, term, worldDocument } = schema;

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};

type ProjectWithRelations = ProjectRow & {
  chapters: ChapterRow[];
  characters: typeof character.$inferSelect[];
  events: typeof event.$inferSelect[];
  factions: typeof faction.$inferSelect[];
  scrapMemos: typeof scrapMemo.$inferSelect[];
  terms: typeof term.$inferSelect[];
  worldDocuments: typeof worldDocument.$inferSelect[];
};

export const buildLocalBundleFromDatabase = async (input: {
  logger: LoggerLike;
  pendingProjectDeletes: SyncPendingProjectDelete[];
  userId: string;
}): Promise<SyncBundle> => {
  const store = db.getClient();

  const projects = await store.select().from(project);
  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return await buildLocalSyncBundle({
      userId: input.userId,
      pendingProjectDeletes: input.pendingProjectDeletes,
      projectRows: [],
      logger: input.logger,
    });
  }

  const [chapters, characters, events, factions, scrapMemos, terms, worldDocuments] =
    await Promise.all([
      store.select().from(chapter).where(inArray(chapter.projectId, projectIds)),
      store.select().from(character).where(inArray(character.projectId, projectIds)),
      store.select().from(event).where(inArray(event.projectId, projectIds)),
      store.select().from(faction).where(inArray(faction.projectId, projectIds)),
      store
        .select()
        .from(scrapMemo)
        .where(inArray(scrapMemo.projectId, projectIds))
        .orderBy(asc(scrapMemo.sortOrder), desc(scrapMemo.updatedAt)),
      store.select().from(term).where(inArray(term.projectId, projectIds)),
      store
        .select()
        .from(worldDocument)
        .where(inArray(worldDocument.projectId, projectIds))
        .orderBy(desc(worldDocument.updatedAt)),
    ]);

  const chaptersByProject = new Map<string, ChapterRow[]>();
  for (const ch of chapters) {
    const list = chaptersByProject.get(ch.projectId) ?? [];
    list.push(ch);
    chaptersByProject.set(ch.projectId, list);
  }

  const charactersByProject = new Map<string, typeof character.$inferSelect[]>();
  for (const c of characters) {
    const list = charactersByProject.get(c.projectId) ?? [];
    list.push(c);
    charactersByProject.set(c.projectId, list);
  }

  const eventsByProject = new Map<string, typeof event.$inferSelect[]>();
  for (const e of events) {
    const list = eventsByProject.get(e.projectId) ?? [];
    list.push(e);
    eventsByProject.set(e.projectId, list);
  }

  const factionsByProject = new Map<string, typeof faction.$inferSelect[]>();
  for (const f of factions) {
    const list = factionsByProject.get(f.projectId) ?? [];
    list.push(f);
    factionsByProject.set(f.projectId, list);
  }

  const scrapMemosByProject = new Map<string, typeof scrapMemo.$inferSelect[]>();
  for (const s of scrapMemos) {
    const list = scrapMemosByProject.get(s.projectId) ?? [];
    list.push(s);
    scrapMemosByProject.set(s.projectId, list);
  }

  const termsByProject = new Map<string, typeof term.$inferSelect[]>();
  for (const t of terms) {
    const list = termsByProject.get(t.projectId) ?? [];
    list.push(t);
    termsByProject.set(t.projectId, list);
  }

  const worldDocsByProject = new Map<string, typeof worldDocument.$inferSelect[]>();
  for (const w of worldDocuments) {
    const list = worldDocsByProject.get(w.projectId) ?? [];
    list.push(w);
    worldDocsByProject.set(w.projectId, list);
  }

  const projectsWithRelations: ProjectWithRelations[] = projects.map((p) => ({
    ...p,
    chapters: chaptersByProject.get(p.id) ?? [],
    characters: charactersByProject.get(p.id) ?? [],
    events: eventsByProject.get(p.id) ?? [],
    factions: factionsByProject.get(p.id) ?? [],
    scrapMemos: scrapMemosByProject.get(p.id) ?? [],
    terms: termsByProject.get(p.id) ?? [],
    worldDocuments: worldDocsByProject.get(p.id) ?? [],
  }));

  const hydratedProjectRows = await hydrateProjectsWithAttachmentPaths(projectsWithRelations);

  return await buildLocalSyncBundle({
    userId: input.userId,
    pendingProjectDeletes: input.pendingProjectDeletes,
    projectRows: hydratedProjectRows as Array<Record<string, unknown>>,
    logger: input.logger,
  });
};

export const buildProjectPackagePayloadForSync = async (input: {
  bundle: SyncBundle;
  localSnapshots: Array<{
    id: string;
    chapterId: string | null;
    content: string;
    description: string | null;
    createdAt: Date;
  }>;
  logger: LoggerLike;
  projectId: string;
  projectPath: string;
}): Promise<LuiePackageExportData | null> => {
  return await buildSyncProjectPackagePayload({
    bundle: input.bundle,
    projectId: input.projectId,
    projectPath: input.projectPath,
    localSnapshots: input.localSnapshots,
    hydrateMissingWorldDocsFromPackage: async (worldDocs, targetProjectPath, skippedDocTypes) =>
      await hydrateMissingWorldDocsFromPackage(
        worldDocs,
        targetProjectPath,
        input.logger,
        skippedDocTypes,
      ),
    logger: input.logger,
  });
};

export const countBundleRows = (bundle: SyncBundle): number =>
  bundle.projects.length +
  bundle.chapters.length +
  bundle.characters.length +
  bundle.events.length +
  bundle.factions.length +
  bundle.terms.length +
  bundle.worldDocuments.length +
  bundle.memos.length +
  bundle.snapshots.length +
  bundle.tombstones.length;

import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  MARKDOWN_EXTENSION,
} from "../../../shared/constants/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { createLogger } from "../../../shared/logger/index.js";
import type { SyncRunResult, SyncSettings, SyncStatus } from "../../../shared/types/index.js";
import type { LuiePackageExportData } from "../../handler/system/ipcFsHandlers.js";
import { writeLuiePackage } from "../../handler/system/ipcFsHandlers.js";
import { db } from "../../database/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { readLuieEntry } from "../../utils/luiePackage.js";
import { syncAuthService } from "./syncAuthService.js";
import {
  createEmptySyncBundle,
  mergeSyncBundles,
  type SyncBundle,
  type SyncChapterRecord,
} from "./syncMapper.js";
import { syncRepository } from "./syncRepository.js";

const logger = createLogger("SyncService");

const AUTO_SYNC_DEBOUNCE_MS = 1500;

const INITIAL_STATUS: SyncStatus = {
  connected: false,
  autoSync: true,
  mode: "idle",
  inFlight: false,
  queued: false,
  conflicts: {
    chapters: 0,
    memos: 0,
    total: 0,
  },
};

const toIsoString = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const parseJson = (raw: string | null): unknown | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(rows: T[]): T[] =>
  [...rows].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

const toSyncErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith("SUPABASE_SCHEMA_MISSING:")) {
    const table = raw.split(":")[1] ?? "unknown";
    return `SYNC_REMOTE_SCHEMA_MISSING:${table}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project`;
  }
  return raw;
};

const AUTH_FATAL_ERROR_PATTERNS = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE",
];

const isAuthFatalMessage = (message: string): boolean =>
  AUTH_FATAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));

const toSyncStatusFromSettings = (
  syncSettings: SyncSettings,
  baseStatus: SyncStatus,
): SyncStatus => ({
  ...baseStatus,
  connected: syncSettings.connected,
  provider: syncSettings.provider,
  email: syncSettings.email,
  userId: syncSettings.userId,
  expiresAt: syncSettings.expiresAt,
  autoSync: syncSettings.autoSync,
  lastSyncedAt: syncSettings.lastSyncedAt,
  lastError: syncSettings.lastError,
});

export class SyncService {
  private status: SyncStatus = INITIAL_STATUS;
  private inFlightPromise: Promise<SyncRunResult> | null = null;
  private queuedRun = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private applyAuthFailureState(message: string): void {
    const cleared = settingsManager.clearSyncSettings();
    const next = settingsManager.setSyncSettings({
      ...cleared,
      lastError: message,
    });
    this.updateStatus({
      ...toSyncStatusFromSettings(next, INITIAL_STATUS),
      mode: "error",
      inFlight: false,
      queued: false,
      conflicts: INITIAL_STATUS.conflicts,
    });
  }

  initialize(): void {
    const syncSettings = settingsManager.getSyncSettings();
    this.status = toSyncStatusFromSettings(syncSettings, this.status);

    if (!syncSettings.connected && syncAuthService.hasPendingAuthFlow()) {
      this.status = {
        ...this.status,
        mode: "connecting",
      };
    }

    if (syncSettings.connected) {
      const accessTokenResult = syncAuthService.getAccessToken(syncSettings);
      if (accessTokenResult.migratedCipher) {
        settingsManager.setSyncSettings({ accessTokenCipher: accessTokenResult.migratedCipher });
      }
      const refreshTokenResult = syncAuthService.getRefreshToken(syncSettings);
      if (refreshTokenResult.migratedCipher) {
        settingsManager.setSyncSettings({ refreshTokenCipher: refreshTokenResult.migratedCipher });
      }

      const hasRecoverableTokenPath =
        Boolean(accessTokenResult.token) || Boolean(refreshTokenResult.token);
      if (!hasRecoverableTokenPath) {
        this.applyAuthFailureState("SYNC_ACCESS_TOKEN_UNAVAILABLE");
      }
    }

    this.broadcastStatus();

    if (this.status.connected && this.status.autoSync) {
      void this.runNow("startup");
    }
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async connectGoogle(): Promise<SyncStatus> {
    if (this.status.mode === "connecting") {
      return this.status;
    }

    if (!syncAuthService.isConfigured()) {
      const message =
        "Supabase env is not configured (SUPABASE_URL/SUPABASE_ANON_KEY or SUPADATABASE_PRJ_ID/SUPADATABASE_API)";
      this.updateStatus({
        mode: "error",
        lastError: message,
      });
      return this.status;
    }

    this.updateStatus({
      mode: "connecting",
      lastError: undefined,
    });

    try {
      await syncAuthService.startGoogleAuth();
      return this.status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("SYNC_AUTH_FLOW_IN_PROGRESS")) {
        this.updateStatus({
          mode: "connecting",
          lastError: undefined,
        });
        return this.status;
      }
      this.updateStatus({
        mode: "error",
        lastError: message,
      });
      return this.status;
    }
  }

  async handleOAuthCallback(callbackUrl: string): Promise<void> {
    try {
      const session = await syncAuthService.completeOAuthCallback(callbackUrl);
      const current = settingsManager.getSyncSettings();
      const next = settingsManager.setSyncSettings({
        ...current,
        connected: true,
        provider: session.provider,
        userId: session.userId,
        email: session.email,
        expiresAt: session.expiresAt,
        accessTokenCipher: session.accessTokenCipher,
        refreshTokenCipher: session.refreshTokenCipher,
        lastError: undefined,
      });

      this.updateStatus({
        ...toSyncStatusFromSettings(next, this.status),
        mode: "idle",
      });
      void this.runNow("oauth-callback");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus({
        mode: "error",
        lastError: message,
      });
      throw error;
    }
  }

  async disconnect(): Promise<SyncStatus> {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    this.queuedRun = false;
    const cleared = settingsManager.clearSyncSettings();
    this.updateStatus({
      ...toSyncStatusFromSettings(cleared, INITIAL_STATUS),
      mode: "idle",
      queued: false,
      inFlight: false,
      conflicts: {
        chapters: 0,
        memos: 0,
        total: 0,
      },
    });
    return this.status;
  }

  async setAutoSync(enabled: boolean): Promise<SyncStatus> {
    const next = settingsManager.setSyncSettings({ autoSync: enabled });
    this.updateStatus(toSyncStatusFromSettings(next, this.status));
    return this.status;
  }

  onLocalMutation(_reason?: string): void {
    if (!this.status.connected || !this.status.autoSync) {
      return;
    }
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null;
      void this.runNow("auto");
    }, AUTO_SYNC_DEBOUNCE_MS);
  }

  async runNow(reason = "manual"): Promise<SyncRunResult> {
    if (!this.status.connected) {
      return {
        success: false,
        message: "SYNC_NOT_CONNECTED",
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts,
      };
    }

    if (this.inFlightPromise) {
      this.queuedRun = true;
      this.updateStatus({ queued: true });
      return this.inFlightPromise;
    }

    const runPromise = this.executeRun(reason)
      .finally(() => {
        this.inFlightPromise = null;
      });

    this.inFlightPromise = runPromise;
    return runPromise;
  }

  private async executeRun(reason: string): Promise<SyncRunResult> {
    this.updateStatus({
      mode: "syncing",
      inFlight: true,
      queued: false,
      lastError: undefined,
    });

    try {
      const syncSettings = settingsManager.getSyncSettings();
      const userId = syncSettings.userId;
      if (!userId) {
        throw new Error("SYNC_USER_ID_MISSING");
      }

      const accessToken = await this.ensureAccessToken(syncSettings);
      const [remoteBundle, localBundle] = await Promise.all([
        syncRepository.fetchBundle(accessToken, userId),
        this.buildLocalBundle(userId),
      ]);

      const { merged, conflicts } = mergeSyncBundles(localBundle, remoteBundle);
      await this.applyMergedBundleToLocal(merged);
      await syncRepository.upsertBundle(accessToken, merged);

      const syncedAt = new Date().toISOString();
      const nextSettings = settingsManager.setSyncSettings({
        lastSyncedAt: syncedAt,
        lastError: undefined,
      });

      const result: SyncRunResult = {
        success: true,
        message: `SYNC_OK:${reason}`,
        pulled: this.countBundleRows(remoteBundle),
        pushed: this.countBundleRows(merged),
        conflicts,
        syncedAt,
      };

      this.updateStatus({
        ...toSyncStatusFromSettings(nextSettings, this.status),
        mode: "idle",
        inFlight: false,
        conflicts,
      });

      if (this.queuedRun) {
        this.queuedRun = false;
        void this.runNow("queued");
      }

      return result;
    } catch (error) {
      const message = toSyncErrorMessage(error);
      if (isAuthFatalMessage(message)) {
        this.applyAuthFailureState(message);
      } else {
        const nextSettings = settingsManager.setSyncSettings({
          lastError: message,
        });
        this.updateStatus({
          ...toSyncStatusFromSettings(nextSettings, this.status),
          mode: "error",
          inFlight: false,
          queued: false,
        });
      }
      this.queuedRun = false;

      logger.error("Sync run failed", { error, reason });
      return {
        success: false,
        message,
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts,
      };
    }
  }

  private async ensureAccessToken(syncSettings: SyncSettings): Promise<string> {
    const maybePersistMigratedToken = (migratedCipher?: string) => {
      if (!migratedCipher) return;
      settingsManager.setSyncSettings({
        accessTokenCipher: migratedCipher,
      });
    };

    const expiresSoon = syncSettings.expiresAt
      ? Date.parse(syncSettings.expiresAt) <= Date.now() + 60_000
      : true;
    const accessTokenResult = syncAuthService.getAccessToken(syncSettings);
    maybePersistMigratedToken(accessTokenResult.migratedCipher);
    let token = accessTokenResult.token;

    if (expiresSoon || !token) {
      const refreshTokenResult = syncAuthService.getRefreshToken(syncSettings);
      if (refreshTokenResult.migratedCipher) {
        settingsManager.setSyncSettings({
          refreshTokenCipher: refreshTokenResult.migratedCipher,
        });
      }
      if (!refreshTokenResult.token) {
        throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
      }

      const refreshed = await syncAuthService.refreshSession(syncSettings);
      const nextSettings = settingsManager.setSyncSettings({
        provider: refreshed.provider,
        userId: refreshed.userId,
        email: refreshed.email,
        expiresAt: refreshed.expiresAt,
        accessTokenCipher: refreshed.accessTokenCipher,
        refreshTokenCipher: refreshed.refreshTokenCipher,
      });
      const refreshedToken = syncAuthService.getAccessToken(nextSettings);
      maybePersistMigratedToken(refreshedToken.migratedCipher);
      token = refreshedToken.token;
    }

    if (!token) {
      throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
    }
    return token;
  }

  private async buildLocalBundle(userId: string): Promise<SyncBundle> {
    const bundle = createEmptySyncBundle();
    const prisma = db.getClient();
    const projectRows = (await prisma.project.findMany({
      include: {
        chapters: true,
        characters: true,
        terms: true,
      },
    })) as Array<Record<string, unknown>>;

    for (const projectRow of projectRows) {
      const projectId = toNullableString(projectRow.id);
      if (!projectId) continue;
      const projectPath = toNullableString(projectRow.projectPath);
      const projectUpdatedAt = toIsoString(projectRow.updatedAt);

      bundle.projects.push({
        id: projectId,
        userId,
        title: toNullableString(projectRow.title) ?? "Untitled",
        description: toNullableString(projectRow.description),
        createdAt: toIsoString(projectRow.createdAt),
        updatedAt: projectUpdatedAt,
      });

      const chapters = Array.isArray(projectRow.chapters)
        ? (projectRow.chapters as Array<Record<string, unknown>>)
        : [];
      for (const row of chapters) {
        const chapterId = toNullableString(row.id);
        if (!chapterId) continue;
        const chapterDeletedAt = toNullableString(row.deletedAt);
        bundle.chapters.push({
          id: chapterId,
          userId,
          projectId,
          title: toNullableString(row.title) ?? "Untitled",
          content: toNullableString(row.content) ?? "",
          synopsis: toNullableString(row.synopsis),
          order: toNumber(row.order),
          wordCount: toNumber(row.wordCount),
          createdAt: toIsoString(row.createdAt),
          updatedAt: toIsoString(row.updatedAt),
          deletedAt: chapterDeletedAt,
        });

        if (chapterDeletedAt) {
          bundle.tombstones.push({
            id: `${projectId}:chapter:${chapterId}`,
            userId,
            projectId,
            entityType: "chapter",
            entityId: chapterId,
            deletedAt: chapterDeletedAt,
            updatedAt: chapterDeletedAt,
          });
        }
      }

      const characters = Array.isArray(projectRow.characters)
        ? (projectRow.characters as Array<Record<string, unknown>>)
        : [];
      for (const row of characters) {
        const characterId = toNullableString(row.id);
        if (!characterId) continue;
        bundle.characters.push({
          id: characterId,
          userId,
          projectId,
          name: toNullableString(row.name) ?? "Character",
          description: toNullableString(row.description),
          firstAppearance: toNullableString(row.firstAppearance),
          attributes: toNullableString(row.attributes),
          createdAt: toIsoString(row.createdAt),
          updatedAt: toIsoString(row.updatedAt),
        });
      }

      const terms = Array.isArray(projectRow.terms)
        ? (projectRow.terms as Array<Record<string, unknown>>)
        : [];
      for (const row of terms) {
        const termId = toNullableString(row.id);
        if (!termId) continue;
        bundle.terms.push({
          id: termId,
          userId,
          projectId,
          term: toNullableString(row.term) ?? "Term",
          definition: toNullableString(row.definition),
          category: toNullableString(row.category),
          order: toNumber(row.order),
          firstAppearance: toNullableString(row.firstAppearance),
          createdAt: toIsoString(row.createdAt),
          updatedAt: toIsoString(row.updatedAt),
        });
      }

      if (projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        await this.collectWorldDocuments(bundle, userId, projectId, projectPath, projectUpdatedAt);
      }
    }

    return bundle;
  }

  private async collectWorldDocuments(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    projectPath: string,
    updatedAtFallback: string,
  ): Promise<void> {
    const addWorldDocument = (docType: SyncBundle["worldDocuments"][number]["docType"], payload: unknown, updatedAt?: string) => {
      bundle.worldDocuments.push({
        id: `${projectId}:${docType}`,
        userId,
        projectId,
        docType,
        payload,
        updatedAt: updatedAt ?? updatedAtFallback,
      });
    };

    const synopsisRaw = await readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`, logger);
    const synopsis = parseJson(synopsisRaw);
    if (synopsis) {
      addWorldDocument("synopsis", synopsis, isRecord(synopsis) ? toNullableString(synopsis.updatedAt) ?? undefined : undefined);
    }

    const plotRaw = await readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`, logger);
    const plot = parseJson(plotRaw);
    if (plot) {
      addWorldDocument("plot", plot, isRecord(plot) ? toNullableString(plot.updatedAt) ?? undefined : undefined);
    }

    const drawingRaw = await readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`, logger);
    const drawing = parseJson(drawingRaw);
    if (drawing) {
      addWorldDocument("drawing", drawing, isRecord(drawing) ? toNullableString(drawing.updatedAt) ?? undefined : undefined);
    }

    const mindmapRaw = await readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`, logger);
    const mindmap = parseJson(mindmapRaw);
    if (mindmap) {
      addWorldDocument("mindmap", mindmap, isRecord(mindmap) ? toNullableString(mindmap.updatedAt) ?? undefined : undefined);
    }

    const memosRaw = await readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`, logger);
    const memosPayload = parseJson(memosRaw);
    if (!isRecord(memosPayload)) {
      return;
    }

    addWorldDocument(
      "scrap",
      memosPayload,
      toNullableString(memosPayload.updatedAt) ?? undefined,
    );

    const memos = Array.isArray(memosPayload.memos)
      ? (memosPayload.memos as Array<Record<string, unknown>>)
      : [];
    for (const memo of memos) {
      const id = toNullableString(memo.id) ?? randomUUID();
      bundle.memos.push({
        id,
        userId,
        projectId,
        title: toNullableString(memo.title) ?? "Memo",
        content: toNullableString(memo.content) ?? "",
        tags: Array.isArray(memo.tags)
          ? memo.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        updatedAt: toIsoString(memo.updatedAt, updatedAtFallback),
      });
    }
  }

  private async applyMergedBundleToLocal(bundle: SyncBundle): Promise<void> {
    const prisma = db.getClient();

    for (const project of bundle.projects) {
      const existing = await prisma.project.findUnique({
        where: { id: project.id },
        select: { id: true },
      }) as { id?: string } | null;

      if (existing?.id) {
        await prisma.project.update({
          where: { id: project.id },
          data: {
            title: project.title,
            description: project.description,
            updatedAt: new Date(project.updatedAt),
          },
        });
      } else {
        await prisma.project.create({
          data: {
            id: project.id,
            title: project.title,
            description: project.description,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
            settings: {
              create: {
                autoSave: true,
                autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
              },
            },
          },
        });
      }
    }

    for (const chapter of bundle.chapters) {
      await this.upsertChapter(prisma, chapter);
    }

    for (const character of bundle.characters) {
      const existing = await prisma.character.findUnique({
        where: { id: character.id },
        select: { id: true },
      }) as { id?: string } | null;

      if (character.deletedAt) {
        if (existing?.id) {
          await prisma.character.delete({ where: { id: character.id } });
        }
        continue;
      }

      const data = {
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes: typeof character.attributes === "string"
          ? character.attributes
          : JSON.stringify(character.attributes ?? null),
        updatedAt: new Date(character.updatedAt),
        project: {
          connect: { id: character.projectId },
        },
      };

      if (existing?.id) {
        await prisma.character.update({
          where: { id: character.id },
          data,
        });
      } else {
        await prisma.character.create({
          data: {
            id: character.id,
            ...data,
            createdAt: new Date(character.createdAt),
          },
        });
      }
    }

    for (const term of bundle.terms) {
      const existing = await prisma.term.findUnique({
        where: { id: term.id },
        select: { id: true },
      }) as { id?: string } | null;

      if (term.deletedAt) {
        if (existing?.id) {
          await prisma.term.delete({ where: { id: term.id } });
        }
        continue;
      }

      const data = {
        term: term.term,
        definition: term.definition,
        category: term.category,
        order: term.order,
        firstAppearance: term.firstAppearance,
        updatedAt: new Date(term.updatedAt),
        project: {
          connect: { id: term.projectId },
        },
      };

      if (existing?.id) {
        await prisma.term.update({
          where: { id: term.id },
          data,
        });
      } else {
        await prisma.term.create({
          data: {
            id: term.id,
            ...data,
            createdAt: new Date(term.createdAt),
          },
        });
      }
    }

    for (const tombstone of bundle.tombstones) {
      if (tombstone.entityType !== "chapter") continue;
      const existing = await prisma.chapter.findUnique({
        where: { id: tombstone.entityId },
        select: { id: true, projectId: true },
      }) as { id?: string; projectId?: string } | null;
      if (!existing?.id || existing.projectId !== tombstone.projectId) continue;
      await prisma.chapter.update({
        where: { id: tombstone.entityId },
        data: {
          deletedAt: new Date(tombstone.deletedAt),
          updatedAt: new Date(tombstone.updatedAt),
        },
      });
    }

    await this.persistBundleToLuiePackages(bundle);
  }

  private buildProjectPackagePayload(
    bundle: SyncBundle,
    projectId: string,
    localSnapshots: Array<{
      id: string;
      chapterId: string | null;
      content: string;
      description: string | null;
      createdAt: Date;
    }>,
  ): LuiePackageExportData | null {
    const project = bundle.projects.find((item) => item.id === projectId);
    if (!project) return null;

    const chapters = bundle.chapters
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .sort((left, right) => left.order - right.order);
    const characters = bundle.characters
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? undefined,
        firstAppearance: item.firstAppearance ?? undefined,
        attributes: item.attributes ?? undefined,
      }));
    const terms = bundle.terms
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .sort((left, right) => left.order - right.order)
      .map((item) => ({
        id: item.id,
        term: item.term,
        definition: item.definition ?? undefined,
        category: item.category ?? undefined,
        firstAppearance: item.firstAppearance ?? undefined,
      }));

    const worldDocs = new Map<string, unknown>();
    for (const doc of sortByUpdatedAtDesc(bundle.worldDocuments)) {
      if (doc.projectId !== projectId || doc.deletedAt) continue;
      if (worldDocs.has(doc.docType)) continue;
      worldDocs.set(doc.docType, doc.payload);
    }

    const memos = bundle.memos
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: item.tags,
        updatedAt: item.updatedAt,
      }));

    const snapshotList = localSnapshots.map((snapshot) => ({
      id: snapshot.id,
      chapterId: snapshot.chapterId ?? undefined,
      content: snapshot.content,
      description: snapshot.description ?? undefined,
      createdAt: snapshot.createdAt.toISOString(),
    }));

    const scrapPayload = worldDocs.get("scrap");
    const normalizedScrapPayload =
      isRecord(scrapPayload) && Array.isArray(scrapPayload.memos)
        ? scrapPayload
        : {
            memos,
            updatedAt: project.updatedAt,
          };

    const metaChapters = chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
      updatedAt: chapter.updatedAt,
    }));

    return {
      meta: {
        format: LUIE_PACKAGE_FORMAT,
        container: LUIE_PACKAGE_CONTAINER_DIR,
        version: LUIE_PACKAGE_VERSION,
        projectId: project.id,
        title: project.title,
        description: project.description ?? undefined,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        chapters: metaChapters,
      },
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        content: chapter.content,
      })),
      characters,
      terms,
      synopsis: worldDocs.get("synopsis") ?? { synopsis: "", status: "draft" },
      plot: worldDocs.get("plot") ?? { columns: [] },
      drawing: worldDocs.get("drawing") ?? { paths: [] },
      mindmap: worldDocs.get("mindmap") ?? { nodes: [], edges: [] },
      memos: normalizedScrapPayload,
      snapshots: snapshotList,
    };
  }

  private async persistBundleToLuiePackages(bundle: SyncBundle): Promise<void> {
    for (const project of bundle.projects) {
      const localProject = await db.getClient().project.findUnique({
        where: { id: project.id },
        select: {
          projectPath: true,
          snapshots: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              chapterId: true,
              content: true,
              description: true,
              createdAt: true,
            },
          },
        },
      }) as {
        projectPath?: string | null;
        snapshots?: Array<{
          id: string;
          chapterId: string | null;
          content: string;
          description: string | null;
          createdAt: Date;
        }>;
      } | null;

      const projectPath = toNullableString(localProject?.projectPath);
      if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        continue;
      }
      const payload = this.buildProjectPackagePayload(
        bundle,
        project.id,
        localProject?.snapshots ?? [],
      );
      if (!payload) continue;

      try {
        await writeLuiePackage(projectPath, payload, logger);
      } catch (error) {
        logger.warn("Failed to persist merged bundle into .luie package", {
          projectId: project.id,
          projectPath,
          error,
        });
      }
    }
  }

  private async upsertChapter(
    prisma: ReturnType<(typeof db)["getClient"]>,
    chapter: SyncChapterRecord,
  ): Promise<void> {
    const existing = await prisma.chapter.findUnique({
      where: { id: chapter.id },
      select: { id: true },
    }) as { id?: string } | null;

    const data = {
      title: chapter.title,
      content: chapter.content,
      synopsis: chapter.synopsis,
      order: chapter.order,
      wordCount: chapter.wordCount,
      updatedAt: new Date(chapter.updatedAt),
      deletedAt: chapter.deletedAt ? new Date(chapter.deletedAt) : null,
      project: {
        connect: { id: chapter.projectId },
      },
    };

    if (existing?.id) {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data,
      });
    } else {
      await prisma.chapter.create({
        data: {
          id: chapter.id,
          ...data,
          createdAt: new Date(chapter.createdAt),
        },
      });
    }
  }

  private countBundleRows(bundle: SyncBundle): number {
    return (
      bundle.projects.length +
      bundle.chapters.length +
      bundle.characters.length +
      bundle.terms.length +
      bundle.worldDocuments.length +
      bundle.memos.length +
      bundle.snapshots.length +
      bundle.tombstones.length
    );
  }

  private updateStatus(next: Partial<SyncStatus>): void {
    this.status = {
      ...this.status,
      ...next,
    };
    this.broadcastStatus();
  }

  private broadcastStatus(): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      try {
        win.webContents.send(IPC_CHANNELS.SYNC_STATUS_CHANGED, this.status);
      } catch (error) {
        logger.warn("Failed to broadcast sync status", { error });
      }
    }
  }
}

export const syncService = new SyncService();

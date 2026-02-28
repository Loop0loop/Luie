import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncSettings } from "../../../src/shared/types/index.js";
import type { SyncBundle } from "../../../src/main/services/features/syncMapper.js";

const mocked = vi.hoisted(() => {
  const syncSettings: SyncSettings = {
    connected: false,
    autoSync: true,
  };

  const getAccessToken = vi.fn();
  const getRefreshToken = vi.fn();
  const refreshSession = vi.fn();
  const startGoogleAuth = vi.fn();
  const hasPendingAuthFlow = vi.fn(() => false);
  const fetchBundle = vi.fn();
  const upsertBundle = vi.fn();
  const writeLuiePackage = vi.fn();
  const readLuieEntry = vi.fn();
  const openLuieProject = vi.fn();

  const prisma = {
    $transaction: vi.fn(async (handler: unknown) => {
      if (typeof handler === "function") {
        return await (handler as (client: unknown) => Promise<unknown>)(prisma);
      }
      return handler;
    }),
    project: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    chapter: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    term: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    snapshot: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    event: {
      deleteMany: vi.fn(),
    },
    faction: {
      deleteMany: vi.fn(),
    },
    characterAppearance: {
      deleteMany: vi.fn(),
    },
    termAppearance: {
      deleteMany: vi.fn(),
    },
    worldEntity: {
      deleteMany: vi.fn(),
    },
    entityRelation: {
      deleteMany: vi.fn(),
    },
  };

  return {
    syncSettings,
    getAccessToken,
    getRefreshToken,
    refreshSession,
    startGoogleAuth,
    hasPendingAuthFlow,
    fetchBundle,
    upsertBundle,
    writeLuiePackage,
    readLuieEntry,
    openLuieProject,
    prisma,
  };
});

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock("../../../src/main/handler/system/ipcFsHandlers.js", () => ({
  writeLuiePackage: (...args: unknown[]) => mocked.writeLuiePackage(...args),
}));

vi.mock("../../../src/main/utils/luiePackage.js", () => ({
  readLuieEntry: (...args: unknown[]) => mocked.readLuieEntry(...args),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getClient: () => mocked.prisma,
  },
}));

vi.mock("../../../src/main/services/features/syncAuthService.js", () => ({
  syncAuthService: {
    isConfigured: () => true,
    hasPendingAuthFlow: (...args: unknown[]) => mocked.hasPendingAuthFlow(...args),
    startGoogleAuth: (...args: unknown[]) => mocked.startGoogleAuth(...args),
    completeOAuthCallback: vi.fn(),
    getAccessToken: (...args: unknown[]) => mocked.getAccessToken(...args),
    getRefreshToken: (...args: unknown[]) => mocked.getRefreshToken(...args),
    refreshSession: (...args: unknown[]) => mocked.refreshSession(...args),
  },
}));

vi.mock("../../../src/main/services/features/syncRepository.js", () => ({
  syncRepository: {
    fetchBundle: (...args: unknown[]) => mocked.fetchBundle(...args),
    upsertBundle: (...args: unknown[]) => mocked.upsertBundle(...args),
  },
}));

vi.mock("../../../src/main/services/core/projectService.js", () => ({
  projectService: {
    openLuieProject: (...args: unknown[]) => mocked.openLuieProject(...args),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getSyncSettings: () => ({ ...mocked.syncSettings }),
    setSyncSettings: (patch: Partial<SyncSettings>) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (mocked.syncSettings as Record<string, unknown>)[key];
        } else {
          (mocked.syncSettings as Record<string, unknown>)[key] = value;
        }
      }
      return { ...mocked.syncSettings };
    },
    clearSyncSettings: () => {
      const pendingDeletes = Array.isArray(mocked.syncSettings.pendingProjectDeletes)
        ? [...mocked.syncSettings.pendingProjectDeletes]
        : undefined;
      for (const key of Object.keys(mocked.syncSettings)) {
        delete (mocked.syncSettings as Record<string, unknown>)[key];
      }
      mocked.syncSettings.connected = false;
      mocked.syncSettings.autoSync = true;
      if (pendingDeletes && pendingDeletes.length > 0) {
        mocked.syncSettings.pendingProjectDeletes = pendingDeletes;
      }
      return { ...mocked.syncSettings };
    },
    removePendingProjectDeletes: (projectIds: string[]) => {
      const pending = Array.isArray(mocked.syncSettings.pendingProjectDeletes)
        ? mocked.syncSettings.pendingProjectDeletes
        : [];
      const idSet = new Set(projectIds);
      const filtered = pending.filter((entry) => !idSet.has(entry.projectId));
      if (filtered.length === 0) {
        delete (mocked.syncSettings as Record<string, unknown>).pendingProjectDeletes;
      } else {
        mocked.syncSettings.pendingProjectDeletes = filtered;
      }
      return { ...mocked.syncSettings };
    },
  },
}));

describe("SyncService auth hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mocked.getAccessToken.mockReset();
    mocked.getRefreshToken.mockReset();
    mocked.refreshSession.mockReset();
    mocked.startGoogleAuth.mockReset();
    mocked.hasPendingAuthFlow.mockReset();
    mocked.hasPendingAuthFlow.mockReturnValue(false);
    mocked.getRefreshToken.mockReturnValue({ token: null });
    mocked.fetchBundle.mockReset();
    mocked.upsertBundle.mockReset();
    mocked.writeLuiePackage.mockReset();
    mocked.readLuieEntry.mockReset();
    mocked.openLuieProject.mockReset();
    mocked.writeLuiePackage.mockResolvedValue(undefined);
    mocked.readLuieEntry.mockResolvedValue(null);
    mocked.openLuieProject.mockResolvedValue({ project: { id: "project-1" } });
    mocked.prisma.$transaction.mockClear();
    mocked.prisma.project.update.mockClear();
    mocked.prisma.project.create.mockClear();
    mocked.prisma.project.delete.mockClear();
    mocked.prisma.chapter.update.mockClear();
    mocked.prisma.chapter.create.mockClear();
    mocked.prisma.character.update.mockClear();
    mocked.prisma.character.create.mockClear();
    mocked.prisma.character.delete.mockClear();
    mocked.prisma.term.update.mockClear();
    mocked.prisma.term.create.mockClear();
    mocked.prisma.term.delete.mockClear();
    mocked.prisma.project.findMany.mockResolvedValue([]);
    mocked.prisma.project.findUnique.mockResolvedValue(null);

    for (const key of Object.keys(mocked.syncSettings)) {
      delete (mocked.syncSettings as Record<string, unknown>)[key];
    }
    mocked.syncSettings.connected = false;
    mocked.syncSettings.autoSync = true;
    delete (mocked.syncSettings as Record<string, unknown>).pendingProjectDeletes;
  });

  it("downgrades connected state on startup when no usable token path exists", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.getAccessToken.mockReturnValue({ token: null });
    mocked.getRefreshToken.mockReturnValue({ token: null });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    const status = service.getStatus();
    expect(status.connected).toBe(false);
    expect(status.lastError).toContain("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  });

  it("disconnects on startup when refresh token is unreadable", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.refreshTokenCipher = "broken-refresh";
    mocked.getAccessToken.mockReturnValue({ token: null });
    mocked.getRefreshToken.mockReturnValue({
      token: null,
      errorCode: "SYNC_TOKEN_DECRYPT_FAILED:broken-refresh",
    });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    expect(service.getStatus().lastError).toContain("SYNC_TOKEN_DECRYPT_FAILED");
    expect(service.getStatus().connected).toBe(false);
    expect(mocked.fetchBundle).not.toHaveBeenCalled();
    expect(mocked.refreshSession).not.toHaveBeenCalled();
  });

  it("keeps connected state for non-auth transient errors", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.fetchBundle.mockRejectedValue(new Error("NETWORK_TIMEOUT"));

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(false);
    expect(result.message).toContain("NETWORK_TIMEOUT");
    expect(service.getStatus().connected).toBe(true);
  });

  it("does not launch OAuth again while already connecting", async () => {
    mocked.startGoogleAuth.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    await service.connectGoogle();
    await service.connectGoogle();

    expect(mocked.startGoogleAuth).toHaveBeenCalledTimes(1);
    expect(service.getStatus().mode).toBe("connecting");
  });

  it("syncs queued project deletions as tombstones and clears queue after success", async () => {
    const deletedAt = new Date().toISOString();
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.syncSettings.pendingProjectDeletes = [
      {
        projectId: "project-1",
        deletedAt,
      },
    ];
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(true);
    const upsertPayload = mocked.upsertBundle.mock.calls[0]?.[1] as {
      tombstones: Array<{ entityType: string; entityId: string; deletedAt: string }>;
    };
    expect(upsertPayload.tombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "project",
          entityId: "project-1",
          deletedAt,
        }),
      ]),
    );
    expect(mocked.syncSettings.pendingProjectDeletes).toBeUndefined();
  });

  it("updates per-project sync timestamps on successful sync", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: null,
        chapters: [],
        characters: [],
        terms: [],
      },
    ]);
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(true);
    expect(
      mocked.syncSettings.projectLastSyncedAtByProjectId?.["project-1"],
    ).toBeTruthy();
  });

  it("surfaces unresolved conflicts and applies manual resolution on retry", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.syncSettings.entityBaselinesByProjectId = {
      "project-1": {
        chapter: {
          "chapter-1": "2026-02-22T00:10:00.000Z",
        },
        memo: {},
        capturedAt: "2026-02-22T00:10:00.000Z",
      },
    };
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: null,
        chapters: [
          {
            id: "chapter-1",
            title: "Local Chapter",
            content: "local content",
            synopsis: null,
            order: 0,
            wordCount: 10,
            createdAt: new Date("2026-02-22T00:00:00.000Z"),
            updatedAt: new Date("2026-02-22T00:15:00.000Z"),
            deletedAt: null,
          },
        ],
        characters: [],
        terms: [],
      },
    ]);
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [
        {
          id: "chapter-1",
          userId: syncedUserId,
          projectId: "project-1",
          title: "Remote Chapter",
          content: "remote content",
          synopsis: null,
          order: 0,
          wordCount: 11,
          createdAt: "2026-02-22T00:00:00.000Z",
          updatedAt: "2026-02-22T00:16:00.000Z",
        },
      ],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    const firstRun = await service.runNow("manual");
    expect(firstRun.success).toBe(false);
    expect(firstRun.message).toBe("SYNC_CONFLICT_DETECTED");
    expect(firstRun.conflicts.total).toBe(1);
    expect(firstRun.conflicts.items?.[0]).toMatchObject({
      type: "chapter",
      id: "chapter-1",
      projectId: "project-1",
    });
    expect(mocked.upsertBundle).not.toHaveBeenCalled();
    expect(mocked.prisma.$transaction).not.toHaveBeenCalled();

    await service.resolveConflict({
      type: "chapter",
      id: "chapter-1",
      resolution: "local",
    });

    expect(mocked.syncSettings.pendingConflictResolutions).toBeUndefined();
    expect(mocked.upsertBundle).toHaveBeenCalledTimes(1);
    expect(mocked.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(service.getStatus().conflicts.total).toBe(0);
  });

  it("fails sync when .luie package persistence fails", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: "/tmp/project-1.luie",
        chapters: [],
        characters: [],
        terms: [],
      },
    ]);
    mocked.prisma.project.findUnique.mockResolvedValue({
      id: "project-1",
      projectPath: "/tmp/project-1.luie",
      snapshots: [],
    });
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);
    mocked.writeLuiePackage.mockRejectedValue(new Error("disk full"));

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(false);
    expect(result.message).toContain("SYNC_LUIE_PERSIST_FAILED");
    expect(mocked.upsertBundle).not.toHaveBeenCalled();
    expect(mocked.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocked.prisma.project.update).not.toHaveBeenCalled();
  });

  it("skips .luie persistence when projectPath is invalid and continues sync", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: "relative/unsafe.luie",
        chapters: [],
        characters: [],
        terms: [],
      },
    ]);
    mocked.prisma.project.findUnique.mockResolvedValue({
      id: "project-1",
      projectPath: "relative/unsafe.luie",
      snapshots: [],
    });
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(true);
    expect(mocked.writeLuiePackage).not.toHaveBeenCalled();
    expect(mocked.readLuieEntry).not.toHaveBeenCalled();
    expect(mocked.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocked.upsertBundle).toHaveBeenCalledTimes(1);
  });

  it("attempts DB cache recovery from persisted .luie when DB apply fails", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: "/tmp/project-1.luie",
        chapters: [],
        characters: [],
        terms: [],
      },
    ]);
    mocked.prisma.project.findUnique.mockResolvedValue({
      id: "project-1",
      projectPath: "/tmp/project-1.luie",
      snapshots: [],
    });
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);
    mocked.prisma.$transaction.mockRejectedValueOnce(new Error("SQLITE_BUSY"));

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(false);
    expect(result.message).toContain("SYNC_DB_CACHE_APPLY_FAILED");
    expect(mocked.writeLuiePackage).toHaveBeenCalledTimes(1);
    expect(mocked.openLuieProject).toHaveBeenCalledWith("/tmp/project-1.luie");
    expect(mocked.upsertBundle).not.toHaveBeenCalled();
  });

  it("hydrates missing world docs from existing .luie payload during package build", async () => {
    mocked.readLuieEntry.mockImplementation(async (_projectPath: string, entryPath: string) => {
      if (entryPath === "world/synopsis.json") {
        return JSON.stringify({ synopsis: "kept synopsis", status: "working" });
      }
      return null;
    });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    const bundle: SyncBundle = {
      projects: [
        {
          id: "project-1",
          userId: "user-1",
          title: "Project 1",
          description: null,
          createdAt: "2026-02-22T00:00:00.000Z",
          updatedAt: "2026-02-22T00:00:00.000Z",
        },
      ],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    };

    const payloadBuilder = (
      service as unknown as {
        buildProjectPackagePayload: (
          value: SyncBundle,
          projectId: string,
          projectPath: string,
          localSnapshots: Array<{
            id: string;
            chapterId: string | null;
            content: string;
            description: string | null;
            createdAt: Date;
          }>,
        ) => Promise<unknown>;
      }
    ).buildProjectPackagePayload.bind(service);

    const payload = (await payloadBuilder(bundle, "project-1", "/tmp/project-1.luie", [])) as {
      synopsis?: unknown;
    } | null;

    expect(payload).not.toBeNull();
    expect(payload?.synopsis).toMatchObject({
      synopsis: "kept synopsis",
      status: "working",
    });
  });

  it("normalizes malformed world document payloads before .luie package write", async () => {
    mocked.readLuieEntry.mockResolvedValue(null);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    const bundle: SyncBundle = {
      projects: [
        {
          id: "project-1",
          userId: "user-1",
          title: "Project 1",
          description: null,
          createdAt: "2026-02-22T00:00:00.000Z",
          updatedAt: "2026-02-22T00:00:00.000Z",
        },
      ],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [
        {
          id: "project-1:synopsis",
          userId: "user-1",
          projectId: "project-1",
          docType: "synopsis",
          payload: "not-json",
          updatedAt: "2026-02-22T00:00:00.000Z",
        },
        {
          id: "project-1:graph",
          userId: "user-1",
          projectId: "project-1",
          docType: "graph",
          payload: "still-not-json",
          updatedAt: "2026-02-22T00:00:00.000Z",
        },
      ],
      memos: [],
      snapshots: [],
      tombstones: [],
    };

    const payloadBuilder = (
      service as unknown as {
        buildProjectPackagePayload: (
          value: SyncBundle,
          projectId: string,
          projectPath: string,
          localSnapshots: Array<{
            id: string;
            chapterId: string | null;
            content: string;
            description: string | null;
            createdAt: Date;
          }>,
        ) => Promise<unknown>;
      }
    ).buildProjectPackagePayload.bind(service);

    const payload = (await payloadBuilder(bundle, "project-1", "/tmp/project-1.luie", [])) as {
      synopsis?: unknown;
      graph?: unknown;
    } | null;

    expect(payload).not.toBeNull();
    expect(payload?.synopsis).toMatchObject({
      synopsis: "",
      status: "draft",
    });
    expect(payload?.graph).toMatchObject({
      nodes: [],
      edges: [],
    });
  });
});

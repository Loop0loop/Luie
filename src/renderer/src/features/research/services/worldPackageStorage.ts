import {
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "@shared/constants";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "@shared/constants/storage/persistence";
import type {
  ReplicaWorldDocumentType,
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
} from "@shared/types";
import { api } from "@shared/api";
import { worldScrapMemosDataSchema } from "@shared/schemas";

import {
  DEFAULT_WORLD_DRAWING,
  DEFAULT_WORLD_MINDMAP,
  DEFAULT_WORLD_PLOT,
  DEFAULT_WORLD_SCRAP_MEMOS,
  DEFAULT_WORLD_SYNOPSIS,
  WORLD_REPLICA_LOCAL_KEY_BY_DOC_TYPE,
  ensureLuieWorldDocumentSaved,
  ensureReplicaDocumentSaved,
  ensureReplicaScrapMemosSaved,
  isLuieProjectPath,
  loadLocalStorageJson,
  loadReplicaDocument,
  loadReplicaScrapMemos,
  logScrapMemosRecovery,
  logScrapMemosValidationFailure,
  normalizeDrawing,
  normalizeMindmap,
  normalizePlot,
  normalizeSynopsis,
  parseScrapMemosPayload,
  readLuieJson,
  removeLocalStorageJson,
  saveReplicaDocument,
  saveReplicaScrapMemos,
  writeLuieJson,
} from "./worldPackageStorageHelpers";

export {
  DEFAULT_WORLD_DRAWING,
  DEFAULT_WORLD_MINDMAP,
  DEFAULT_WORLD_PLOT,
  DEFAULT_WORLD_SCRAP_MEMOS,
  DEFAULT_WORLD_SYNOPSIS,
};

const migrateLegacyLocalDocument = async (
  projectId: string,
  docType: Exclude<ReplicaWorldDocumentType, "graph" | "scrap">,
  projectPath: string | null | undefined,
  payload: unknown,
  fileName: string,
) => {
  const localKey = WORLD_REPLICA_LOCAL_KEY_BY_DOC_TYPE[docType];
  const persisted = await saveReplicaDocument(projectId, docType, payload);
  if (persisted) {
    removeLocalStorageJson(projectId, localKey);
  }

  if (isLuieProjectPath(projectPath)) {
    try {
      await writeLuieJson(projectPath, fileName, payload);
    } catch (error) {
      await api.logger.warn("Failed to migrate world document to .luie package", {
        projectId,
        docType,
        projectPath,
        error,
      });
    }
  }
};

export const worldPackageStorage = {
  async loadSynopsis(
    projectId: string,
    projectPath?: string | null,
    synopsisFallback = "",
  ): Promise<WorldSynopsisData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_SYNOPSIS, synopsis: synopsisFallback };
    }

    const replica = await loadReplicaDocument(projectId, "synopsis");
    if (replica !== null) {
      return normalizeSynopsis(replica, synopsisFallback);
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_SYNOPSIS_FILE);
      if (data !== null) {
        const normalized = normalizeSynopsis(data, synopsisFallback);
        await saveReplicaDocument(projectId, "synopsis", normalized);
        removeLocalStorageJson(projectId, "synopsis");
        return normalized;
      }
    }

    const local = loadLocalStorageJson<unknown>(projectId, "synopsis");
    if (local !== null) {
      const normalized = normalizeSynopsis(local, synopsisFallback);
      await migrateLegacyLocalDocument(
        projectId,
        "synopsis",
        projectPath,
        normalized,
        LUIE_WORLD_SYNOPSIS_FILE,
      );
      return normalized;
    }

    return normalizeSynopsis(null, synopsisFallback);
  },

  async saveSynopsis(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldSynopsisData,
  ): Promise<void> {
    if (!projectId) return;
    const payload = { ...data, updatedAt: new Date().toISOString() };
    await ensureReplicaDocumentSaved(projectId, "synopsis", payload);
    removeLocalStorageJson(projectId, "synopsis");

    if (isLuieProjectPath(projectPath)) {
      await ensureLuieWorldDocumentSaved(
        projectId,
        projectPath,
        "synopsis",
        LUIE_WORLD_SYNOPSIS_FILE,
        payload,
      );
    }
  },

  async loadPlot(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldPlotData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_PLOT };
    }

    const replica = await loadReplicaDocument(projectId, "plot");
    if (replica !== null) {
      return normalizePlot(replica);
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_PLOT_FILE);
      if (data !== null) {
        const normalized = normalizePlot(data);
        await saveReplicaDocument(projectId, "plot", normalized);
        removeLocalStorageJson(projectId, "plot");
        return normalized;
      }
    }

    const local = loadLocalStorageJson<unknown>(projectId, "plot");
    if (local !== null) {
      const normalized = normalizePlot(local);
      await migrateLegacyLocalDocument(
        projectId,
        "plot",
        projectPath,
        normalized,
        LUIE_WORLD_PLOT_FILE,
      );
      return normalized;
    }

    return normalizePlot(null);
  },

  async savePlot(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldPlotData,
  ): Promise<void> {
    if (!projectId) return;
    const payload: WorldPlotData = {
      columns: data.columns,
      updatedAt: new Date().toISOString(),
    };
    await ensureReplicaDocumentSaved(projectId, "plot", payload);
    removeLocalStorageJson(projectId, "plot");

    if (isLuieProjectPath(projectPath)) {
      await ensureLuieWorldDocumentSaved(
        projectId,
        projectPath,
        "plot",
        LUIE_WORLD_PLOT_FILE,
        payload,
      );
    }
  },

  async loadDrawing(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldDrawingData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_DRAWING };
    }

    const replica = await loadReplicaDocument(projectId, "drawing");
    if (replica !== null) {
      return normalizeDrawing(replica);
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_DRAWING_FILE);
      if (data !== null) {
        const normalized = normalizeDrawing(data);
        await saveReplicaDocument(projectId, "drawing", normalized);
        removeLocalStorageJson(projectId, "drawing");
        return normalized;
      }
    }

    const local = loadLocalStorageJson<unknown>(projectId, "drawing");
    if (local !== null) {
      const normalized = normalizeDrawing(local);
      await migrateLegacyLocalDocument(
        projectId,
        "drawing",
        projectPath,
        normalized,
        LUIE_WORLD_DRAWING_FILE,
      );
      return normalized;
    }

    return normalizeDrawing(null);
  },

  async saveDrawing(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldDrawingData,
  ): Promise<void> {
    if (!projectId) return;
    const payload: WorldDrawingData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await ensureReplicaDocumentSaved(projectId, "drawing", payload);
    removeLocalStorageJson(projectId, "drawing");

    if (isLuieProjectPath(projectPath)) {
      await ensureLuieWorldDocumentSaved(
        projectId,
        projectPath,
        "drawing",
        LUIE_WORLD_DRAWING_FILE,
        payload,
      );
    }
  },

  async loadMindmap(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldMindmapData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_MINDMAP };
    }

    const replica = await loadReplicaDocument(projectId, "mindmap");
    if (replica !== null) {
      return normalizeMindmap(replica);
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_MINDMAP_FILE);
      if (data !== null) {
        const normalized = normalizeMindmap(data);
        await saveReplicaDocument(projectId, "mindmap", normalized);
        removeLocalStorageJson(projectId, "mindmap");
        return normalized;
      }
    }

    const local = loadLocalStorageJson<unknown>(projectId, "mindmap");
    if (local !== null) {
      const normalized = normalizeMindmap(local);
      await migrateLegacyLocalDocument(
        projectId,
        "mindmap",
        projectPath,
        normalized,
        LUIE_WORLD_MINDMAP_FILE,
      );
      return normalized;
    }

    return normalizeMindmap(null);
  },

  async saveMindmap(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldMindmapData,
  ): Promise<void> {
    if (!projectId) return;

    const payload: WorldMindmapData = {
      nodes: data.nodes,
      edges: data.edges,
      updatedAt: new Date().toISOString(),
    };
    await ensureReplicaDocumentSaved(projectId, "mindmap", payload);
    removeLocalStorageJson(projectId, "mindmap");

    if (isLuieProjectPath(projectPath)) {
      await ensureLuieWorldDocumentSaved(
        projectId,
        projectPath,
        "mindmap",
        LUIE_WORLD_MINDMAP_FILE,
        payload,
      );
    }
  },

  async loadScrapMemos(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldScrapMemosData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_SCRAP_MEMOS };
    }

    const replica = await loadReplicaScrapMemos(projectId);
    if (replica) {
      return replica;
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_SCRAP_MEMOS_FILE);
      const parsed = await parseScrapMemosPayload(data, {
        source: "luie-package",
        projectId,
        projectPath,
      });
      if (parsed) {
        const persisted = await saveReplicaScrapMemos(projectId, parsed);
        if (persisted) {
          removeLocalStorageJson(projectId, "scrap-memos");
        }
        return parsed;
      }
    }

    const local = loadLocalStorageJson<unknown>(projectId, "scrap-memos");
    const parsed = await parseScrapMemosPayload(local, {
      source: "localStorage",
      projectId,
    });
    if (!parsed) {
      if (local !== null) {
        removeLocalStorageJson(projectId, "scrap-memos");
        logScrapMemosRecovery({
          event: "persist.reset",
          action: "drop_invalid_local_payload",
          source: "localStorage",
          projectId,
          reason: "schema_validation_failed",
        });
      }
      return { ...DEFAULT_WORLD_SCRAP_MEMOS };
    }
    const persisted = await saveReplicaScrapMemos(projectId, parsed);
    if (persisted) {
      removeLocalStorageJson(projectId, "scrap-memos");
    }
    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_SCRAP_MEMOS_FILE, parsed);
      } catch (error) {
        await api.logger.warn("Failed to migrate scrap memos to .luie package", {
          projectId,
          projectPath,
          error,
        });
      }
    }
    return parsed;
  },

  async saveScrapMemos(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldScrapMemosData,
  ): Promise<void> {
    if (!projectId) return;

    const payload: WorldScrapMemosData = {
      schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      memos: data.memos,
      updatedAt: new Date().toISOString(),
    };
    const parsed = worldScrapMemosDataSchema.safeParse(payload);
    if (!parsed.success) {
      logScrapMemosValidationFailure(
        "Refused to persist invalid scrap memos payload",
        parsed.error,
        {
          source: "localStorage",
          projectId,
          projectPath,
        },
      );
      throw new Error("Refused to persist invalid scrap memos payload.");
    }

    await ensureReplicaScrapMemosSaved(projectId, parsed.data);
    removeLocalStorageJson(projectId, "scrap-memos");

    if (isLuieProjectPath(projectPath)) {
      await ensureLuieWorldDocumentSaved(
        projectId,
        projectPath,
        "scrap",
        LUIE_WORLD_SCRAP_MEMOS_FILE,
        parsed.data,
      );
    }
  },
};

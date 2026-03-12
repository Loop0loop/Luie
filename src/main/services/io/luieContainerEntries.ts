import path from "node:path";
import {
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_TERMS_FILE,
  MARKDOWN_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../shared/constants/index.js";
import {
  normalizeLuieMetaForWrite,
} from "./luiePackageIntegrity.js";
import type {
  LuiePackageExportData,
} from "./luiePackageTypes.js";

export type LuieContainerMetadata = {
  containerLabel: string;
  containerVersion: number;
};

export type LuieContainerTextEntry = {
  name: string;
  content: string;
};

export const buildLuieContainerTextEntries = (
  payload: LuiePackageExportData,
  targetPath: string,
  metadata: LuieContainerMetadata,
): LuieContainerTextEntry[] => {
  const nowIso = new Date().toISOString();
  const normalizedMeta = normalizeLuieMetaForWrite(payload.meta, {
    titleFallback: path.basename(targetPath, LUIE_PACKAGE_EXTENSION),
    nowIso,
    createdAtFallback: nowIso,
    containerLabel: metadata.containerLabel,
    containerVersion: metadata.containerVersion,
  });

  const entries: LuieContainerTextEntry[] = [
    {
      name: LUIE_PACKAGE_META_FILENAME,
      content: JSON.stringify(normalizedMeta, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
      content: JSON.stringify({ characters: payload.characters ?? [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
      content: JSON.stringify({ terms: payload.terms ?? [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`,
      content: JSON.stringify(payload.synopsis ?? { synopsis: "", status: "draft" }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`,
      content: JSON.stringify(payload.plot ?? { columns: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`,
      content: JSON.stringify(payload.drawing ?? { paths: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`,
      content: JSON.stringify(payload.mindmap ?? { nodes: [], edges: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`,
      content: JSON.stringify(payload.memos ?? { memos: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`,
      content: JSON.stringify(payload.graph ?? { nodes: [], edges: [] }, null, 2),
    },
    {
      name: `${LUIE_SNAPSHOTS_DIR}/index.json`,
      content: JSON.stringify({ snapshots: payload.snapshots ?? [] }, null, 2),
    },
  ];

  for (const chapter of payload.chapters ?? []) {
    if (!chapter.id) continue;
    entries.push({
      name: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
      content: chapter.content ?? "",
    });
  }

  if (payload.snapshots && payload.snapshots.length > 0) {
    for (const snapshot of payload.snapshots) {
      if (!snapshot.id) continue;
      entries.push({
        name: `${LUIE_SNAPSHOTS_DIR}/${snapshot.id}.snap`,
        content: JSON.stringify(snapshot, null, 2),
      });
    }
  }

  return entries;
};

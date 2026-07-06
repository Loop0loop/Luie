import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WorldGraphCanvasFile } from "@shared/types";
import type { FileNode } from "../../../types/canvas.types";
import { CATEGORY_FOLDERS, buildCanvasFileNodes } from "./explorerTree";

interface UseExplorerDataParams {
  characters: Array<{ id: string; name: string }>;
  events: Array<{ id: string; name: string }>;
  factions: Array<{ id: string; name: string }>;
  notes: Array<{ id: string; title: string }>;
  canvasFiles: readonly WorldGraphCanvasFile[];
}

export function useExplorerData({
  characters,
  events,
  factions,
  notes,
  canvasFiles,
}: UseExplorerDataParams): FileNode[] {
  const { t } = useTranslation();

  return useMemo<FileNode[]>(() => {
    const canvasFileNodes = buildCanvasFileNodes(canvasFiles, null);

    return [
      {
        id: CATEGORY_FOLDERS.characters,
        name: t("research.title.characters", "Characters"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        children: characters.map((character) => ({
          id: character.id,
          name: character.name,
          type: "file",
          readOnly: true,
          mainView: { type: "character", id: character.id },
          focusIds: [character.id],
        })),
      },
      {
        id: CATEGORY_FOLDERS.events,
        name: t("research.title.events", "Events"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        children: events.map((event) => ({
          id: event.id,
          name: event.name,
          type: "file",
          readOnly: true,
          mainView: { type: "event", id: event.id },
          focusIds: [event.id],
        })),
      },
      {
        id: CATEGORY_FOLDERS.scraps,
        name: t("research.title.scrap", "Scrap"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        children: notes.map((note) => ({
          id: note.id,
          name: note.title,
          type: "file",
          readOnly: true,
          mainView: { type: "memo", id: note.id },
          focusIds: [note.id],
        })),
      },
      {
        id: CATEGORY_FOLDERS.factions,
        name: t("research.title.factions", "Factions"),
        type: "folder",
        readOnly: true,
        mainView: { type: "canvas" },
        children: factions.map((faction) => ({
          id: faction.id,
          name: faction.name,
          type: "file",
          readOnly: true,
          mainView: { type: "faction", id: faction.id },
          focusIds: [faction.id],
        })),
      },
      ...canvasFileNodes,
    ];
  }, [characters, events, factions, notes, canvasFiles, t]);
}

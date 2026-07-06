import type { FileNode } from "../../../types/canvas.types";
import type { WorldGraphCanvasFile } from "@shared/types";

export const getAllFolderIds = (nodes: FileNode[]): string[] => {
  const ids: string[] = [];
  const traverse = (list: FileNode[]) => {
    for (const node of list) {
      if (node.type === "folder") {
        ids.push(node.id);
        if (node.children) {
          traverse(node.children);
        }
      }
    }
  };
  traverse(nodes);
  return ids;
};

export const createExplorerId = (type: FileNode["type"]) => `${type}-${crypto.randomUUID()}`;

export const CATEGORY_FOLDERS = {
  characters: "canvas-folder-characters",
  events: "canvas-folder-events",
  scraps: "canvas-folder-scraps",
  factions: "canvas-folder-factions",
} as const;

export const findNode = (nodes: readonly FileNode[], id: string | null): FileNode | null => {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children ?? [], id);
    if (child) return child;
  }
  return null;
};

export const sortNodes = (nodes: FileNode[]): FileNode[] =>
  [...nodes]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));

export const buildCanvasFileNodes = (
  files: readonly WorldGraphCanvasFile[],
  parentId: string | null,
  visited = new Set<string>(),
): FileNode[] =>
  sortNodes(
    files
      .filter((file) => (file.parentId ?? null) === parentId)
      .filter((file) => !visited.has(file.id))
      .map((file) => ({
        id: file.id,
        name: file.name,
        type: file.kind === "folder" ? "folder" : "canvas",
        canvasFileId: file.id,
        mainView: { type: "canvas" },
        children:
          file.kind === "folder"
            ? buildCanvasFileNodes(files, file.id, new Set([...visited, file.id]))
            : undefined,
      })),
  );

import type { FileNode } from "../../../types/canvas.types";

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

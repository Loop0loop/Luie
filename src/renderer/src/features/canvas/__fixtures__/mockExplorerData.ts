import type { FileNode } from "../types/canvas.types";

export const mockExplorerData: FileNode[] = [
  { id: "folder-interview", name: "면접", type: "folder" },
  { id: "folder-untitled", name: "무제", type: "folder" },
  { id: "folder-idea", name: "아이디어?", type: "folder" },
  { id: "folder-cs", name: "CS", type: "folder" },
  { id: "folder-dev", name: "Dev", type: "folder" },
  {
    id: "folder-luie",
    name: "Luie",
    type: "folder",
    children: [
      {
        id: "folder-feature",
        name: "feature",
        type: "folder",
        children: [
          { id: "canvas-vis", name: "시각화", type: "canvas" },
          { id: "file-anything", name: "아무거나 적자", type: "file" },
          { id: "file-err", name: "Err", type: "file" },
          { id: "canvas-luie", name: "Luie Canvas", type: "canvas" },
          { id: "canvas-flow", name: "Luie flow", type: "canvas" },
          { id: "file-rag", name: "RAG", type: "file" },
          { id: "file-todo", name: "TODO", type: "file" },
        ],
      },
      { id: "folder-luie-todo", name: "Luie TODO", type: "folder" },
      { id: "folder-memory", name: "Memory Engine", type: "folder" },
      { id: "folder-prd", name: "PRD", type: "folder" },
      { id: "folder-ui", name: "UI", type: "folder" },
    ],
  },
  { id: "file-24todo", name: "24 TODO", type: "file" },
  { id: "file-intro", name: "30초 자기소개", type: "file" },
  { id: "canvas-main", name: "캔버스", type: "canvas" },
];

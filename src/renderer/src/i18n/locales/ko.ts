import { koBase } from "./ko/base";
import { koWorkspace } from "./ko/workspace";
import { koExport } from "./ko/export";
import { koSnapshot } from "./ko/snapshot";
import { koScrivener } from "./ko/scrivener";
import { koTrash } from "./ko/trash";
import { koMisc } from "./ko/misc";
import { koWorldGraph } from "./ko/modules/worldGraph";

const koWorkspaceWithWorldGraph = {
  ...koWorkspace,
  world: {
    ...koWorkspace.world,
    graph: {
      ...koWorkspace.world.graph,
      ...koWorldGraph,
    },
  },
} as const;

export const ko = {
  common: {
    ...koBase,
    ...koWorkspaceWithWorldGraph,
    ...koExport,
    ...koSnapshot,
    ...koScrivener,
    ...koTrash,
    ...koMisc,
  },
} as const;

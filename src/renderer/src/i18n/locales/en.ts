import { enBase } from "./en/base";
import { enWorkspace } from "./en/workspace";
import { enExport } from "./en/export";
import { enSnapshot } from "./en/snapshot";
import { enScrivener } from "./en/scrivener";
import { enTrash } from "./en/trash";
import { enMisc } from "./en/misc";
import { enWorldGraph } from "./en/modules/worldGraph";

const enWorkspaceWithWorldGraph = {
  ...enWorkspace,
  world: {
    ...enWorkspace.world,
    graph: {
      ...enWorkspace.world.graph,
      ...enWorldGraph,
    },
  },
} as const;

export const en = {
  common: {
    ...enBase,
    ...enWorkspaceWithWorldGraph,
    ...enExport,
    ...enSnapshot,
    ...enScrivener,
    ...enTrash,
    ...enMisc,
  },
} as const;

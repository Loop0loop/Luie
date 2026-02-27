import { jaBase } from "./ja/base";
import { jaWorkspace } from "./ja/workspace";
import { jaExport } from "./ja/export";
import { jaSnapshot } from "./ja/snapshot";
import { jaScrivener } from "./ja/scrivener";
import { jaTrash } from "./ja/trash";
import { jaMisc } from "./ja/misc";
import { jaWorldGraph } from "./ja/modules/worldGraph";

const jaWorkspaceWithWorldGraph = {
  ...jaWorkspace,
  world: {
    ...jaWorkspace.world,
    graph: {
      ...jaWorkspace.world.graph,
      ...jaWorldGraph,
    },
  },
} as const;

export const ja = {
  common: {
    ...jaBase,
    ...jaWorkspaceWithWorldGraph,
    ...jaExport,
    ...jaSnapshot,
    ...jaScrivener,
    ...jaTrash,
    ...jaMisc,
  },
} as const;

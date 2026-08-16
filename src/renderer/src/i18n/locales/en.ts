import { enBase } from "./en/base";
import { enWorkspace } from "./en/workspace";
import { enExport } from "./en/export";
import { enSnapshot } from "./en/snapshot";
import { enScrivener } from "./en/scrivener";
import { enTrash } from "./en/trash";
import { enMisc } from "./en/misc";
import { enWorldGraph } from "./en/modules/worldGraph";
import { enCanvas } from "./en/modules/canvas";
import { enMissing } from "./en/missing";
import { deepMerge } from "./deepMerge";

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
  common: deepMerge(
    {
      ...enBase,
      ...enWorkspaceWithWorldGraph,
      ...enExport,
      ...enSnapshot,
      ...enScrivener,
      ...enTrash,
      ...enMisc,
      canvas: enCanvas,
    },
    enMissing,
  ),
} as const;

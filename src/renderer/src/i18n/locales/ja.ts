import { jaBase } from "./ja/base";
import { jaWorkspace } from "./ja/workspace";
import { jaExport } from "./ja/export";
import { jaSnapshot } from "./ja/snapshot";
import { jaScrivener } from "./ja/scrivener";
import { jaTrash } from "./ja/trash";
import { jaMisc } from "./ja/misc";

export const ja = {
  common: {
    ...jaBase,
    ...jaWorkspace,
    ...jaExport,
    ...jaSnapshot,
    ...jaScrivener,
    ...jaTrash,
    ...jaMisc,
  },
} as const;

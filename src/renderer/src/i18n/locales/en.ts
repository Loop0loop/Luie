import { enBase } from "./en/base";
import { enWorkspace } from "./en/workspace";
import { enExport } from "./en/export";
import { enSnapshot } from "./en/snapshot";
import { enScrivener } from "./en/scrivener";
import { enTrash } from "./en/trash";
import { enMisc } from "./en/misc";

export const en = {
  common: {
    ...enBase,
    ...enWorkspace,
    ...enExport,
    ...enSnapshot,
    ...enScrivener,
    ...enTrash,
    ...enMisc,
  },
} as const;

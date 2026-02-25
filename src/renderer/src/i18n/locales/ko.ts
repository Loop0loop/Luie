import { koBase } from "./ko/base";
import { koWorkspace } from "./ko/workspace";
import { koExport } from "./ko/export";
import { koSnapshot } from "./ko/snapshot";
import { koScrivener } from "./ko/scrivener";
import { koTrash } from "./ko/trash";
import { koMisc } from "./ko/misc";

export const ko = {
  common: {
    ...koBase,
    ...koWorkspace,
    ...koExport,
    ...koSnapshot,
    ...koScrivener,
    ...koTrash,
    ...koMisc,
  },
} as const;

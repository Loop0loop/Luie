export * from "./schema/index.js";

import type { project } from "./schema/foundation.js";
import type { chapter } from "./schema/manuscript.js";

export type ProjectRow = typeof project.$inferSelect;
export type NewProjectRow = typeof project.$inferInsert;
export type ChapterRow = typeof chapter.$inferSelect;
export type NewChapterRow = typeof chapter.$inferInsert;

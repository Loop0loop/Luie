// TODO: Remove in Phase 7 — replaced by Drizzle migrations in drizzle/main/
import { ENTITY_RELATION_POINTER_TRIGGER_SQL } from "./entityRelationPointerSql.js";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_PROJECT_SQL,
} from "./packagedSchema/projectSchema.sql.js";
import { PACKAGED_SCHEMA_BOOTSTRAP_MEMORY_SQL } from "./packagedSchema/memorySchema.sql.js";
import { PACKAGED_SCHEMA_BOOTSTRAP_WORLD_SQL } from "./packagedSchema/worldAndIndexesSchema.sql.js";

// Packaged SQLite bootstrap schema mirrors the current local runtime surface.
// It includes canonical project tables, replica tables for detached/offline
// editing, and app-local attachment metadata. `Project.projectPath` remains as
// a legacy fallback column while attachment metadata moves to ProjectAttachment.
export {
  PACKAGED_SCHEMA_COLUMN_PATCHES,
  PACKAGED_SCHEMA_INDEX_PATCHES,
  PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../packagedSchema/index.js";

export const PACKAGED_SCHEMA_BOOTSTRAP_SQL =
  `${PACKAGED_SCHEMA_BOOTSTRAP_PROJECT_SQL}
${PACKAGED_SCHEMA_BOOTSTRAP_MEMORY_SQL}
${PACKAGED_SCHEMA_BOOTSTRAP_WORLD_SQL}
${ENTITY_RELATION_POINTER_TRIGGER_SQL}`;

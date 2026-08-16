// TODO: Phase 7에서 drizzle/main migration 전환이 끝나면 제거한다.
import { ENTITY_RELATION_POINTER_TRIGGER_SQL } from "./entityRelationPointerSql.js";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_PROJECT_SQL,
} from "./packagedSchema/projectSchema.sql.js";
import { PACKAGED_SCHEMA_BOOTSTRAP_MEMORY_SQL } from "./packagedSchema/memorySchema.sql.js";
import { PACKAGED_SCHEMA_BOOTSTRAP_WORLD_SQL } from "./packagedSchema/worldAndIndexesSchema.sql.js";

// NOTE: packaged bootstrap은 offline replica를 포함한 현재 runtime schema와 같아야 한다.
// NOTE: Project.projectPath는 ProjectAttachment 전환 중 legacy fallback으로 유지한다.
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

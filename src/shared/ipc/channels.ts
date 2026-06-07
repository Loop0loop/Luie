/**
 * IPC Channel definitions
 * Main과 Renderer 간 통신에 사용되는 채널 정의
 */

export const IPC_CHANNELS = {
  // Project Channels
  PROJECT_CREATE: "project:create",
  PROJECT_GET: "project:get",
  PROJECT_GET_ALL: "project:get-all",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  PROJECT_REMOVE_LOCAL: "project:remove-local",
  PROJECT_OPEN_LUIE: "project:open-luie",
  PROJECT_MARK_OPENED: "project:mark-opened",
  PROJECT_ATTACH_LUIE: "project:attach-luie",
  PROJECT_MATERIALIZE_LUIE: "project:materialize-luie",

  // Chapter Channels
  CHAPTER_CREATE: "chapter:create",
  CHAPTER_GET: "chapter:get",
  CHAPTER_GET_ALL: "chapter:get-all",
  CHAPTER_GET_DELETED: "chapter:get-deleted",
  CHAPTER_UPDATE: "chapter:update",
  CHAPTER_DELETE: "chapter:delete",
  CHAPTER_RESTORE: "chapter:restore",
  CHAPTER_PURGE: "chapter:purge",
  CHAPTER_REORDER: "chapter:reorder",

  // Scene Channels
  SCENE_CREATE: "scene:create",
  SCENE_GET: "scene:get",
  SCENE_GET_ALL: "scene:get-all",
  SCENE_UPDATE: "scene:update",
  SCENE_DELETE: "scene:delete",

  // Note Channels
  NOTE_CREATE: "note:create",
  NOTE_GET: "note:get",
  NOTE_GET_ALL: "note:get-all",
  NOTE_UPDATE: "note:update",
  NOTE_DELETE: "note:delete",

  // Synopsis Channels
  SYNOPSIS_CREATE: "synopsis:create",
  SYNOPSIS_GET: "synopsis:get",
  SYNOPSIS_GET_ALL: "synopsis:get-all",
  SYNOPSIS_UPDATE: "synopsis:update",
  SYNOPSIS_DELETE: "synopsis:delete",

  // Plot Channels
  PLOT_CREATE: "plot:create",
  PLOT_GET: "plot:get",
  PLOT_GET_ALL: "plot:get-all",
  PLOT_UPDATE: "plot:update",
  PLOT_DELETE: "plot:delete",

  // Scrap memo channels
  SCRAP_MEMO_CREATE: "scrap-memo:create",
  SCRAP_MEMO_GET_ALL: "scrap-memo:get-all",
  SCRAP_MEMO_UPDATE: "scrap-memo:update",
  SCRAP_MEMO_DELETE: "scrap-memo:delete",

  // Character Channels
  CHARACTER_CREATE: "character:create",
  CHARACTER_GET: "character:get",
  CHARACTER_GET_ALL: "character:get-all",
  CHARACTER_UPDATE: "character:update",
  CHARACTER_DELETE: "character:delete",
  CHARACTER_GENERATE_IMAGE: "character:generate-image",
  CHARACTER_GENERATE_QUOTE: "character:generate-quote",
  CHARACTER_GENERATE_STATS: "character:generate-stats",

  // Event Channels
  EVENT_CREATE: "event:create",
  EVENT_GET: "event:get",
  EVENT_GET_ALL: "event:get-all",
  EVENT_UPDATE: "event:update",
  EVENT_DELETE: "event:delete",

  // Faction Channels
  FACTION_CREATE: "faction:create",
  FACTION_GET: "faction:get",
  FACTION_GET_ALL: "faction:get-all",
  FACTION_UPDATE: "faction:update",
  FACTION_DELETE: "faction:delete",

  // Term Channels
  TERM_CREATE: "term:create",
  TERM_GET: "term:get",
  TERM_GET_ALL: "term:get-all",
  TERM_UPDATE: "term:update",
  TERM_DELETE: "term:delete",

  // Snapshot Channels
  SNAPSHOT_CREATE: "snapshot:create",
  SNAPSHOT_GET_ALL: "snapshot:get-all",
  SNAPSHOT_GET_BY_PROJECT: "snapshot:get-by-project",
  SNAPSHOT_GET_BY_CHAPTER: "snapshot:get-by-chapter",
  SNAPSHOT_LIST_RESTORE_CANDIDATES: "snapshot:list-restore-candidates",
  SNAPSHOT_RESTORE: "snapshot:restore",
  SNAPSHOT_DELETE: "snapshot:delete",
  SNAPSHOT_IMPORT_FILE: "snapshot:import-file",

  // Auto Save
  AUTO_SAVE: "auto-save",
  MANUAL_SAVE: "manual-save",

  // Search
  SEARCH: "search",
  SEARCH_INDEX_STATUS: "search:index-status",
  SEARCH_REBUILD_INDEX: "search:rebuild-index",
  MEMORY_REBUILD_CHUNKS: "memory:rebuild-chunks",
  MEMORY_JOB_STATUS: "memory:job-status",
  MEMORY_SEARCH_CHUNKS: "memory:search-chunks",
  MEMORY_QUERY_NARRATIVE: "memory:query-narrative",
  MEMORY_GET_CONFLICT_QUEUE: "memory:get-conflict-queue",
  MEMORY_GET_CHUNK_BACKLINK: "memory:get-chunk-backlink",
  MEMORY_GET_CHAPTER_SUMMARY: "memory:get-chapter-summary",
  MEMORY_GET_SUMMARY_STATUS: "memory:get-summary-status",
  MEMORY_GET_EMBEDDING_STATUS: "memory:get-embedding-status",
  DB_RUN_INTEGRITY_CHECK: "db:run-integrity-check",
  DB_GET_MIGRATION_HEALTH: "db:get-migration-health",

  // Analysis (원고 분석)
  ANALYSIS_START: "analysis:start",
  ANALYSIS_STREAM: "analysis:stream",
  ANALYSIS_ERROR: "analysis:error",
  ANALYSIS_STOP: "analysis:stop",
  ANALYSIS_CLEAR: "analysis:clear",
  RAG_QA_ASK: "rag-qa:ask",
  RAG_QA_STOP: "rag-qa:stop",
  RAG_QA_STREAM: "rag-qa:stream",
  RAG_QA_ERROR: "rag-qa:error",

  // File System
  FS_SELECT_DIRECTORY: "fs:select-directory",
  FS_SELECT_SAVE_LOCATION: "fs:select-save-location",
  FS_SELECT_FILE: "fs:select-file",
  FS_SELECT_SNAPSHOT_BACKUP: "fs:select-snapshot-backup",
  FS_SAVE_PROJECT: "fs:save-project",
  FS_READ_FILE: "fs:read-file",
  FS_WRITE_FILE: "fs:write-file",

  FS_READ_LUIE_ENTRY: "fs:read-luie-entry",

  // Luie package directory (.luie)
  FS_CREATE_LUIE_PACKAGE: "fs:create-luie-package",
  FS_WRITE_PROJECT_FILE: "fs:write-project-file",
  FS_APPROVE_PROJECT_PATH: "fs:approve-project-path",

  // Settings
  SETTINGS_GET_ALL: "settings:get-all",
  SETTINGS_GET_EDITOR: "settings:get-editor",
  SETTINGS_SET_EDITOR: "settings:set-editor",
  SETTINGS_GET_AUTO_SAVE: "settings:get-auto-save",
  SETTINGS_SET_AUTO_SAVE: "settings:set-auto-save",
  SETTINGS_GET_LANGUAGE: "settings:get-language",
  SETTINGS_SET_LANGUAGE: "settings:set-language",
  SETTINGS_GET_MENU_BAR_MODE: "settings:get-menu-bar-mode",
  SETTINGS_SET_MENU_BAR_MODE: "settings:set-menu-bar-mode",
  SETTINGS_GET_SHORTCUTS: "settings:get-shortcuts",
  SETTINGS_SET_SHORTCUTS: "settings:set-shortcuts",
  SETTINGS_SET_WINDOW_BOUNDS: "settings:set-window-bounds",
  SETTINGS_GET_WINDOW_BOUNDS: "settings:get-window-bounds",
  SETTINGS_SET_OLLAMA_CONFIG: "settings:set-ollama-config",
  SETTINGS_SET_LLM_PREFERENCE: "settings:set-llm-preference",
  SETTINGS_GET_LLM_RUNTIME: "settings:get-llm-runtime",
  SETTINGS_LIST_OLLAMA_MODELS: "settings:list-ollama-models",
  SETTINGS_TEST_OLLAMA_CONNECTION: "settings:test-ollama-connection",
  SETTINGS_SET_LOCAL_LLM: "settings:set-local-llm",
  SETTINGS_GET_LOCAL_LLM: "settings:get-local-llm",
  SETTINGS_SET_LLM_KEYS: "settings:set-llm-keys",
  SIDECAR_STOP: "sidecar:stop",
  SIDECAR_STATUS: "sidecar:status",
  SIDECAR_STATUS_CHANGED: "sidecar:status-changed",
  MODEL_DOWNLOAD_START: "model:download-start",
  MODEL_DOWNLOAD_CANCEL: "model:download-cancel",
  MODEL_DOWNLOAD_PROGRESS: "model:download-progress",
  MODEL_SEARCH_HF: "model:search-hf",
  MODEL_GET_HF_FILES: "model:get-hf-files",
  LLMFIT_GET_RECOMMENDATIONS: "llmfit:get-recommendations",
  LLMFIT_INSTALL: "llmfit:install",
  LLMFIT_STATUS: "llmfit:status",
  EMBEDDING_MODEL_STATUS: "embedding-model:status",
  EMBEDDING_MODEL_DOWNLOAD: "embedding-model:download",
  EMBEDDING_MODEL_DOWNLOAD_PROGRESS: "embedding-model:download-progress",
  SETTINGS_RESET: "settings:reset",

  // Recovery
  RECOVERY_DB_STATUS: "recovery:db-status",
  RECOVERY_DB_RUN: "recovery:db-run",

  // Window
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_UNMAXIMIZE: "window:unmaximize",
  WINDOW_CLOSE: "window:close",
  WINDOW_TOGGLE_DEV_TOOLS: "window:toggle-dev-tools",
  WINDOW_TOGGLE_FULLSCREEN: "window:toggle-fullscreen",
  WINDOW_SET_FULLSCREEN: "window:set-fullscreen",
  WINDOW_OPEN_EXPORT: "window:open-export",
  WINDOW_OPEN_WORLD_GRAPH: "window:open-world-graph",

  // App
  APP_GET_VERSION: "app:get-version",
  APP_CHECK_UPDATE: "app:check-update",
  APP_GET_UPDATE_STATE: "app:get-update-state",
  APP_DOWNLOAD_UPDATE: "app:download-update",
  APP_APPLY_UPDATE: "app:apply-update",
  APP_ROLLBACK_UPDATE: "app:rollback-update",
  APP_GET_BOOTSTRAP_STATUS: "app:get-bootstrap-status",
  APP_BOOTSTRAP_STATUS_CHANGED: "app:bootstrap-status-changed",
  APP_UPDATE_STATE_CHANGED: "app:update-state-changed",
  APP_QUIT: "app:quit",

  // Export
  EXPORT_CREATE: "export:create",

  // Logger
  LOGGER_LOG: "logger:log",
  LOGGER_LOG_BATCH: "logger:log-batch",

  // App lifecycle (main ↔ renderer quit coordination)
  APP_BEFORE_QUIT: "app:before-quit",
  APP_FLUSH_COMPLETE: "app:flush-complete",
  APP_QUIT_PHASE: "app:quit-phase",

  // Sync
  SYNC_GET_STATUS: "sync:get-status",
  SYNC_CONNECT_GOOGLE: "sync:connect-google",
  SYNC_DISCONNECT: "sync:disconnect",
  SYNC_RUN_NOW: "sync:run-now",
  SYNC_SET_AUTO: "sync:set-auto",
  SYNC_RESOLVE_CONFLICT: "sync:resolveConflict",
  SYNC_GET_RUNTIME_CONFIG: "sync:get-runtime-config",
  SYNC_SET_RUNTIME_CONFIG: "sync:set-runtime-config",
  SYNC_VALIDATE_RUNTIME_CONFIG: "sync:validate-runtime-config",
  SYNC_STATUS_CHANGED: "sync:status-changed",
  SYNC_AUTH_RESULT: "sync:auth-result",

  // Startup Wizard
  STARTUP_GET_READINESS: "startup:get-readiness",
  STARTUP_COMPLETE_WIZARD: "startup:complete-wizard",

  // World Entity Channels
  WORLD_ENTITY_CREATE: "world-entity:create",
  WORLD_ENTITY_GET: "world-entity:get",
  WORLD_ENTITY_GET_ALL: "world-entity:get-all",
  WORLD_ENTITY_UPDATE: "world-entity:update",
  WORLD_ENTITY_UPDATE_POSITION: "world-entity:update-position",
  WORLD_ENTITY_DELETE: "world-entity:delete",

  // Entity Relation Channels
  ENTITY_RELATION_CREATE: "world:createRelation",
  ENTITY_RELATION_GET_ALL: "world:getRelations",
  ENTITY_RELATION_UPDATE: "world:updateRelation",
  ENTITY_RELATION_DELETE: "world:deleteRelation",

  // World Graph
  WORLD_GRAPH_GET: "world:getGraph",
  WORLD_GRAPH_GET_MENTIONS: "world:getMentions",

  // World replica storage
  WORLD_STORAGE_GET_DOCUMENT: "world-storage:get-document",
  WORLD_STORAGE_SET_DOCUMENT: "world-storage:set-document",
  WORLD_STORAGE_GET_SCRAP_MEMOS: "world-storage:get-scrap-memos",
  WORLD_STORAGE_SET_SCRAP_MEMOS: "world-storage:set-scrap-memos",

  // Graph plugins
  PLUGIN_LIST_CATALOG: "plugin:list-catalog",
  PLUGIN_LIST_INSTALLED: "plugin:list-installed",
  PLUGIN_INSTALL: "plugin:install",
  PLUGIN_UNINSTALL: "plugin:uninstall",
  PLUGIN_GET_TEMPLATES: "plugin:get-templates",
  PLUGIN_APPLY_TEMPLATE: "plugin:apply-template",
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

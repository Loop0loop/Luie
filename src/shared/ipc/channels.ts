/**
 * IPC Channel definitions
 * Main과 Renderer 간 통신에 사용되는 채널 정의
 */

export const IPC_CHANNELS = {
  // Project Channels
  PROJECT_CREATE: 'project:create',
  PROJECT_GET: 'project:get',
  PROJECT_GET_ALL: 'project:get-all',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  // Chapter Channels
  CHAPTER_CREATE: 'chapter:create',
  CHAPTER_GET: 'chapter:get',
  CHAPTER_GET_ALL: 'chapter:get-all',
  CHAPTER_UPDATE: 'chapter:update',
  CHAPTER_DELETE: 'chapter:delete',
  CHAPTER_REORDER: 'chapter:reorder',

  // Character Channels
  CHARACTER_CREATE: 'character:create',
  CHARACTER_GET: 'character:get',
  CHARACTER_GET_ALL: 'character:get-all',
  CHARACTER_UPDATE: 'character:update',
  CHARACTER_DELETE: 'character:delete',

  // Term Channels
  TERM_CREATE: 'term:create',
  TERM_GET: 'term:get',
  TERM_GET_ALL: 'term:get-all',
  TERM_UPDATE: 'term:update',
  TERM_DELETE: 'term:delete',

  // Snapshot Channels
  SNAPSHOT_CREATE: 'snapshot:create',
  SNAPSHOT_GET_ALL: 'snapshot:get-all',
  SNAPSHOT_RESTORE: 'snapshot:restore',
  SNAPSHOT_DELETE: 'snapshot:delete',

  // Auto Save
  AUTO_SAVE: 'auto-save',

  // Search
  SEARCH: 'search',
} as const

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

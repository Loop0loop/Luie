/**
 * Application constants
 */

export const APP_NAME = 'Luie'
export const APP_VERSION = '0.1.0'

export const DB_NAME = 'luie.db'
export const AUTO_SAVE_INTERVAL = 30000 // 30 seconds
export const DEFAULT_AUTO_SAVE_INTERVAL_MS = AUTO_SAVE_INTERVAL
export const DEFAULT_AUTO_SAVE_DEBOUNCE_MS = 1000
export const AUTO_SAVE_FLUSH_MS = 300
export const DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS = 30
export const DEFAULT_AUTO_SAVE_ENABLED = true
export const AUTO_SAVE_STALE_THRESHOLD_MS = 5 * 60 * 1000
export const AUTO_SAVE_CLEANUP_INTERVAL_MS = 60 * 1000
export const AUTO_SAVE_STATUS_RESET_MS = 2000

export const LOG_BATCH_SIZE = 20
/**
 * Application constants (barrel export)
 */

export * from './configs'
export * from './paths'
export * from './uiTokens'
export * from './messages'
export const SNAPSHOT_FILE_KEEP_COUNT = 30

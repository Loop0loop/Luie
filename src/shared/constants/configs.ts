/**
 * Application config constants
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
export const LOG_FLUSH_MS = 500

export const MIN_CHAPTER_TITLE_LENGTH = 1
export const MAX_CHAPTER_TITLE_LENGTH = 200

export const SNAPSHOT_MAX_COUNT = 50 // Maximum number of snapshots per project
export const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000
export const SNAPSHOT_KEEP_COUNT = 50
export const SNAPSHOT_FILE_KEEP_COUNT = 30
export const DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT = 20
export const SNAPSHOT_MIN_CONTENT_LENGTH = 500
export const SNAPSHOT_MIN_CHANGE_RATIO = 0.2
export const SNAPSHOT_MIN_CHANGE_ABSOLUTE = 2000
export const SEARCH_CONTEXT_RADIUS = 50
export const AUTO_EXTRACT_DEBOUNCE_MS = 1500
export const PACKAGE_EXPORT_DEBOUNCE_MS = 5000
export const EDITOR_STYLE_APPLY_DEBOUNCE_MS = 300
export const EDITOR_AUTOSAVE_DEBOUNCE_MS = 4000
export const DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS = 500
export const RESIZABLE_PANE_MIN_RIGHT_WIDTH = 300
export const RESIZABLE_PANE_MAX_RIGHT_WIDTH = 800
export const RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH = 400

export const WINDOW_DEFAULT_WIDTH = 1400
export const WINDOW_DEFAULT_HEIGHT = 900
export const WINDOW_MIN_WIDTH = 1000
export const WINDOW_MIN_HEIGHT = 600
export const WINDOW_TRAFFIC_LIGHT_X = 16
export const WINDOW_TRAFFIC_LIGHT_Y = 16

export const DEV_SERVER_URL = 'http://localhost:5173'

export const DEFAULT_UI_VIEW = 'template'
export const DEFAULT_UI_CONTEXT_TAB = 'synopsis'
export const DEFAULT_UI_RESEARCH_TAB = 'character'
export const DEFAULT_UI_RIGHT_PANEL_TYPE = 'research'
export const DEFAULT_UI_SPLIT_RATIO = 0.62
export const DEFAULT_UI_SPLIT_VIEW_ENABLED = false

export const SUGGESTION_MAX_ITEMS = 10
export const SUGGESTION_POPUP_Z_INDEX = 1000

export const DEFAULT_EDITOR_FONT_FAMILY = 'serif'
export const DEFAULT_EDITOR_FONT_PRESET = 'default'
export const DEFAULT_EDITOR_FONT_SIZE = 18
export const DEFAULT_EDITOR_LINE_HEIGHT = 1.8
export const DEFAULT_EDITOR_MAX_WIDTH = 800
export const DEFAULT_EDITOR_THEME = 'light'

export const EDITOR_TOOLBAR_FONT_STEP = 1
export const EDITOR_TOOLBAR_FONT_MIN = 10

export const EDITOR_FONT_FAMILIES = ['serif', 'sans', 'mono'] as const
export const EDITOR_FONT_PRESETS = [
	'default',
	'lora',
	'bitter',
	'source-serif',
	'montserrat',
	'nunito-sans',
	'victor-mono',
] as const
export const EDITOR_THEMES = ['light', 'dark', 'sepia'] as const

// Character Group Colors (Obsiwiki style)
export const CHARACTER_GROUP_COLORS: Record<string, string> = {
  Main: "#F59E0B", // Gold
  Support: "#8B5CF6", // Purple
  Villain: "#EF4444", // Red
  Extra: "#6B7280", // Gray
  Uncategorized: "#10B981", // Green
}

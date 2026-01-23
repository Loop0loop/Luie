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
export const LOG_FLUSH_MS = 500

export const MIN_CHAPTER_TITLE_LENGTH = 1
export const MAX_CHAPTER_TITLE_LENGTH = 200

export const SNAPSHOT_MAX_COUNT = 50 // Maximum number of snapshots per project
export const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000
export const SNAPSHOT_KEEP_COUNT = 50
export const SNAPSHOT_FILE_KEEP_COUNT = 30
export const DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT = 20
export const SEARCH_CONTEXT_RADIUS = 50
export const AUTO_EXTRACT_DEBOUNCE_MS = 1500
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

export const STORAGE_KEY_MEMOS_PREFIX = 'luie:memos:'
export const STORAGE_KEY_MEMOS_NONE = 'luie:memos:none'
export const STORAGE_KEY_FONTS_INSTALLED = 'luie:fonts:installed'
export const STORAGE_KEY_UI = 'luie-ui'

export const DEV_SERVER_URL = 'http://localhost:5173'
export const LOG_DIR_NAME = 'logs'
export const LOG_FILE_NAME = 'luie.log'
export const SNAPSHOT_MIRROR_DIR = 'snapshot-mirror'
export const SETTINGS_STORE_NAME = 'settings'
export const SETTINGS_FILE_NAME = 'settings.json'
export const APP_DIR_NAME = 'luie'

export const LUIE_PACKAGE_EXTENSION = '.luie'
export const LUIE_PACKAGE_EXTENSION_NO_DOT = 'luie'
export const LUIE_PACKAGE_FORMAT = 'luie'
export const LUIE_PACKAGE_FILTER_NAME = 'Luie Project'
export const DEFAULT_PROJECT_DIR_NAME = 'New Project'
export const DEFAULT_PROJECT_FILE_BASENAME = 'project'
export const DEFAULT_PROJECT_FILENAME = `New Project${LUIE_PACKAGE_EXTENSION}`
export const LUIE_PACKAGE_CONTAINER_DIR = 'directory'
export const LUIE_PACKAGE_VERSION = 1
export const LUIE_PACKAGE_META_FILENAME = 'meta.json'
export const LUIE_MANUSCRIPT_DIR = 'manuscript'
export const LUIE_MANUSCRIPT_README = `${LUIE_MANUSCRIPT_DIR}/README.md`
export const LUIE_WORLD_DIR = 'world'
export const LUIE_SNAPSHOTS_DIR = 'snapshots'
export const LUIE_ASSETS_DIR = 'assets'
export const LUIE_WORLD_CHARACTERS_FILE = 'characters.json'
export const LUIE_WORLD_TERMS_FILE = 'terms.json'
export const MARKDOWN_EXTENSION = '.md'
export const MARKDOWN_EXTENSION_NO_DOT = 'md'
export const TEXT_EXTENSION = '.txt'
export const TEXT_EXTENSION_NO_DOT = 'txt'

export const DEFAULT_UI_VIEW = 'template'
export const DEFAULT_UI_CONTEXT_TAB = 'synopsis'
export const DEFAULT_UI_RESEARCH_TAB = 'character'
export const DEFAULT_UI_RIGHT_PANEL_TYPE = 'research'
export const DEFAULT_UI_SPLIT_RATIO = 0.62
export const DEFAULT_UI_SPLIT_VIEW_ENABLED = false

export const SUGGESTION_MAX_ITEMS = 10
export const SUGGESTION_POPUP_Z_INDEX = 1000

export const DEFAULT_PROJECT_TITLE = 'Untitled Project'
export const DEFAULT_NEW_PROJECT_TITLE = 'New Project'
export const DEFAULT_CHAPTER_TITLE = 'Chapter 1'
export const DEFAULT_UNTITLED_LABEL = 'Untitled'
export const DEFAULT_NOTE_TITLE = '새로운 메모'

export const WORLD_OVERVIEW_MIN_HEIGHT = 400
export const WORLD_OVERVIEW_LINE_HEIGHT = 1.6
export const WORLD_OVERVIEW_FONT_SIZE = 14
export const WORLD_MINDMAP_ROOT_X = 300
export const WORLD_MINDMAP_ROOT_Y = 300
export const WORLD_MINDMAP_ROOT_LABEL = '중심 사건/인물'
export const WORLD_STATUS_FONT_SIZE = 11
export const WORLD_HINT_FONT_SIZE = 12
export const WORLD_PROJECT_SYNOPSIS_TITLE = 'Project Synopsis'
export const WORLD_ADD_TERM_ICON_SIZE = 24

export const TEMPLATE_SIDEBAR_TITLE = 'Start New Project'
export const TEMPLATE_CARD_BADGE_FONT_SIZE = 12
export const TEMPLATE_CARD_BADGE_FONT_WEIGHT = 500
export const TEMPLATE_COVER_ICON_FONT_SIZE = 32
export const TEMPLATE_COVER_FOOTER_FONT_SIZE = 10
export const TEMPLATE_DOC_TITLE_FONT_SIZE = 24
export const TEMPLATE_NEW_PROJECT_LABEL = 'NEW PROJECT'

export const MEMO_SEARCH_ICON_SIZE = 12
export const MEMO_SEARCH_FONT_SIZE = 12
export const MEMO_TAG_FONT_SIZE = 9
export const MEMO_DATE_FONT_SIZE = 10
export const MEMO_DATE_ICON_SIZE = 8
export const MEMO_TAG_ICON_SIZE = 14
export const MEMO_TAG_INPUT_FONT_SIZE = 12
export const MEMO_TITLE_FONT_WEIGHT = 500
export const FONT_WEIGHT_SEMIBOLD = 600

export const ICON_SIZE_XS = 12
export const ICON_SIZE_SM = 14
export const ICON_SIZE_MD = 16
export const ICON_SIZE_LG = 18
export const ICON_SIZE_XL = 20
export const ICON_SIZE_XXL = 24
export const ICON_SIZE_XXXL = 32

export const PLACEHOLDER_CONTEXT_SEARCH = '통합 검색...'
export const PLACEHOLDER_CONTEXT_SYNOPSIS = '여기에 시놉시스를 작성하세요...'
export const PLACEHOLDER_TEXT_EDITOR = '글을 쓰세요...'
export const PLACEHOLDER_EDITOR_TITLE = '제목 없음'
export const PLACEHOLDER_MEMO_SEARCH = 'Search...'
export const PLACEHOLDER_MEMO_TAGS = 'Add tags (comma separated)...'
export const PLACEHOLDER_MEMO_TITLE = 'Title'
export const PLACEHOLDER_MEMO_BODY = 'Start typing your memo...'
export const PLACEHOLDER_WORLD_SYNOPSIS = '이야기의 핵심 로그라인, 기획의도, 줄거리를 자유롭게 작성하세요.'

export const LABEL_MEMO_EMPTY = 'Select a note to view'
export const LABEL_RESEARCH_CHARACTERS = 'Characters'
export const LABEL_RESEARCH_WORLD = 'World'
export const LABEL_RESEARCH_SCRAP = 'Scrap'
export const LABEL_RESEARCH_DEFAULT = 'Research'

export const DIALOG_TITLE_RENAME_PROJECT = '프로젝트 이름 수정'
export const DIALOG_TITLE_DELETE_PROJECT = '프로젝트 삭제'

export const SIDEBAR_MENU_OPEN_BELOW = '아래에 열기'
export const SIDEBAR_MENU_OPEN_RIGHT = '오른쪽에 열기'
export const SIDEBAR_MENU_RENAME = '이름 수정하기'
export const SIDEBAR_MENU_DUPLICATE = '복제하기'
export const SIDEBAR_MENU_DELETE = '삭제하기'
export const SIDEBAR_DEFAULT_PROJECT_TITLE = '프로젝트'
export const SIDEBAR_BINDER_TITLE = 'PROJECT BINDER'
export const SIDEBAR_SECTION_MANUSCRIPT = '원고 (Manuscript)'
export const SIDEBAR_ADD_CHAPTER = '새 회차 추가...'
export const SIDEBAR_SECTION_RESEARCH = '연구 (Research)'
export const SIDEBAR_ITEM_CHARACTERS = '등장인물 (Characters)'
export const SIDEBAR_ITEM_WORLD = '세계관 (World)'
export const SIDEBAR_ITEM_SCRAP = '자료 스크랩'
export const SIDEBAR_SECTION_TRASH = '휴지통 (Trash)'
export const SIDEBAR_TRASH_EMPTY = '비어 있음'
export const SIDEBAR_SETTINGS_LABEL = '설정 (Settings)'

export const TEXT_EDITOR_SAVE_SAVING = '저장 중...'
export const TEXT_EDITOR_SAVE_DONE = '저장 완료'
export const TEXT_EDITOR_SAVE_BUTTON = '저장'
export const TEXT_EDITOR_CHAR_SUFFIX = '자'
export const TEXT_EDITOR_WORD_SUFFIX = '단어'

export const LABEL_VIEW_MOBILE = 'Mobile'
export const LABEL_VIEW_PC = 'PC'

export const TOOLTIP_CLOSE_PANEL = 'Close Panel'
export const TOOLTIP_UNDO = 'Undo'
export const TOOLTIP_REDO = 'Redo'
export const TOOLTIP_BOLD = 'Bold'
export const TOOLTIP_ITALIC = 'Italic'
export const TOOLTIP_UNDERLINE = 'Underline'
export const TOOLTIP_STRIKETHROUGH = 'Strikethrough'
export const TOOLTIP_TEXT_COLOR = 'Text Color'
export const TOOLTIP_HIGHLIGHT = 'Highlight'
export const TOOLTIP_ALIGN_LEFT = 'Align Left'
export const TOOLTIP_ALIGN_CENTER = 'Align Center'
export const TOOLTIP_ALIGN_RIGHT = 'Align Right'
export const TOOLTIP_TOGGLE_MOBILE_VIEW = '모바일 뷰 전환'

export const TEXT_EDITOR_MIN_HEIGHT = 400
export const WORLD_DRAW_TOOL_PEN_TITLE = '펜'
export const WORLD_DRAW_TOOL_TEXT_TITLE = '지명 (텍스트)'
export const WORLD_DRAW_CLEAR_LABEL = 'Clear All'
export const WORLD_DRAW_TEXT_FONT_SIZE = 14
export const WORLD_DRAW_TEXT_FONT_WEIGHT = 'bold'
export const WORLD_PLOT_ADD_BEAT_LABEL = 'Add Beat'
export const WORLD_PLOT_NEW_BEAT_LABEL = 'New Beat'

export const CONTEXT_PANEL_SECTION_PADDING = 16
export const CONTEXT_PANEL_HEADER_FONT_SIZE = 12
export const CONTEXT_PANEL_BODY_FONT_SIZE = 13
export const CONTEXT_PANEL_TAG_FONT_SIZE = 10
export const CONTEXT_PANEL_SECTION_MARGIN_BOTTOM = 8

export const DEFAULT_CHARACTER_NAME = 'New Character'
export const DEFAULT_CHARACTER_FALLBACK_NAME = 'Character'
export const DEFAULT_CHARACTER_DESCRIPTION_LABEL = 'No description'
export const DEFAULT_CHARACTER_ADD_LABEL = 'Add Character'
export const DEFAULT_TERM_ADD_LABEL = 'Add Term'
export const CHARACTER_COLOR_FALLBACK = '#ccc'
export const CHARACTER_ICON_BACK_SIZE = 16
export const CHARACTER_AVATAR_ICON_SIZE = 32
export const CHARACTER_ADD_ICON_SIZE = 24
export const CHARACTER_BACKSTORY_MIN_HEIGHT = 100
export const CHARACTER_RELATION_MIN_HEIGHT = 200
export const CHARACTER_RELATION_FONT_SIZE = 12
export const CHARACTER_RELATION_MARGIN_BOTTOM = 8

export const EDITOR_TOOLBAR_ICON_SIZE = 16
export const EDITOR_TOOLBAR_DROPDOWN_ICON_SIZE = 12
export const EDITOR_TOOLBAR_FONT_STEP = 1
export const EDITOR_TOOLBAR_FONT_MIN = 10
export const EDITOR_TOOLBAR_PLUS_MINUS_FONT_SIZE = 14
export const EDITOR_TOOLBAR_DEFAULT_FONT_LABEL = '나눔고딕'
export const EDITOR_TOOLBAR_MOBILE_ICON_SIZE = 14

export const DEFAULT_EDITOR_FONT_FAMILY = 'serif'
export const DEFAULT_EDITOR_FONT_PRESET = 'default'
export const DEFAULT_EDITOR_FONT_SIZE = 18
export const DEFAULT_EDITOR_LINE_HEIGHT = 1.8
export const DEFAULT_EDITOR_MAX_WIDTH = 800
export const DEFAULT_EDITOR_THEME = 'light'

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

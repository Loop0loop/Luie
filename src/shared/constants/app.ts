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
export const PLACEHOLDER_EDITOR_BODY = "내용을 입력하세요... ('/'를 입력하여 명령어 확인)"
export const PLACEHOLDER_CHARACTER_ROLE = '주인공, 조력자, 빌런...'
export const PLACEHOLDER_CHARACTER_ONE_LINER = '이 캐릭터를 한 문장으로 정의한다면?'
export const PLACEHOLDER_CHARACTER_APPEARANCE = '눈동자 색, 머리카락, 체격, 흉터, 옷차림 등...'
export const PLACEHOLDER_CHARACTER_RELATION = 'A와는 적대 관계, B와는 과거의 연인...'

export const LABEL_MEMO_EMPTY = 'Select a note to view'
export const LABEL_MEMO_SECTION_TITLE = 'MEMOS'
export const LABEL_RESEARCH_CHARACTERS = 'Characters'
export const LABEL_RESEARCH_WORLD = 'World'
export const LABEL_RESEARCH_SCRAP = 'Scrap'
export const LABEL_RESEARCH_DEFAULT = 'Research'
export const LABEL_CONTEXT_TAB_SYNOPSIS = '시놉시스'
export const LABEL_CONTEXT_TAB_CHARACTERS = '캐릭터'
export const LABEL_CONTEXT_TAB_TERMS = '고유명사'
export const LABEL_CONTEXT_SYNOPSIS_HEADER = '작품 개요 (Synopsis)'
export const LABEL_CONTEXT_DETAIL_DESCRIPTION = 'Description'
export const LABEL_CONTEXT_DETAIL_CATEGORY = 'Category'

export const LABEL_CHARACTER_SECTION_PROFILE = '기본 프로필 (Basic Profile)'
export const LABEL_CHARACTER_SECTION_APPEARANCE = '외모 묘사 (Appearance)'
export const LABEL_CHARACTER_SECTION_RELATION = '주요 인물과의 관계'
export const LABEL_CHARACTER_TAB_BASIC = '기본 정보'
export const LABEL_CHARACTER_TAB_APPEARANCE = '외모'
export const LABEL_CHARACTER_TAB_PERSONALITY = '성격/내면'
export const LABEL_CHARACTER_TAB_RELATION = '관계'
export const LABEL_CHARACTER_NAME = '이름'
export const LABEL_CHARACTER_ROLE = '역할'
export const LABEL_CHARACTER_GENDER = '성별'
export const LABEL_CHARACTER_AGE = '나이'
export const LABEL_CHARACTER_JOB = '직업/신분'
export const LABEL_CHARACTER_ONE_LINER = '한 줄 요약'
export const LABEL_CHARACTER_MBti = 'MBTI/성향'
export const LABEL_CHARACTER_STRENGTH = '장점'
export const LABEL_CHARACTER_WEAKNESS = '단점/결핍'
export const LABEL_CHARACTER_BACKSTORY = '서사/과거'
export const LABEL_CHARACTER_RELATION_HINT =
	'* 마인드맵 탭에서 시각적으로 편집할 수 있습니다. 여기서는 텍스트로 정리하세요.'

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
export const SIDEBAR_PROMPT_RENAME_TITLE = '새 제목'

export const TEXT_EDITOR_SAVE_SAVING = '저장 중...'
export const TEXT_EDITOR_SAVE_DONE = '저장 완료'
export const TEXT_EDITOR_SAVE_BUTTON = '저장'
export const TEXT_EDITOR_STATUS_CHAR_LABEL = '글자'
export const TEXT_EDITOR_STATUS_WORD_LABEL = '단어'
export const TEXT_EDITOR_STATUS_SEPARATOR = ' · '
export const TEXT_EDITOR_CHAR_SUFFIX = '자'
export const TEXT_EDITOR_WORD_SUFFIX = '단어'

export const LABEL_VIEW_MOBILE = 'Mobile'
export const LABEL_VIEW_PC = 'PC'

export const TOOLTIP_SIDEBAR_COLLAPSE = '사이드바 접기'
export const TOOLTIP_SIDEBAR_EXPAND = '사이드바 펼치기'
export const TOOLTIP_CONTEXT_PANEL_COLLAPSE = '패널 접기'
export const TOOLTIP_CONTEXT_PANEL_EXPAND = '패널 펼치기'

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

export const MODAL_CONFIRM_LABEL = '확인'
export const MODAL_CANCEL_LABEL = '취소'

export const SETTINGS_TITLE_DISPLAY = '화면 설정'
export const SETTINGS_SECTION_FONT = '글꼴 (Font)'
export const SETTINGS_FONT_SERIF_LABEL = '명조체'
export const SETTINGS_FONT_SANS_LABEL = '고딕체 (Inter + Noto Sans KR/JP)'
export const SETTINGS_FONT_MONO_LABEL = '모노'
export const SETTINGS_FONT_HELPER_PRIMARY =
	'기본 내장: Inter Variable + Noto Sans KR/JP (다국어 기본 폴백)'
export const SETTINGS_FONT_HELPER_SECONDARY =
	'추가 폰트는 설정에서 선택 시 설치하도록 설계할 예정입니다.'
export const SETTINGS_SECTION_OPTIONAL_FONTS = '옵션 폰트 (선택 설치)'
export const SETTINGS_OPTIONAL_FONT_LABEL_LORA = 'Lora (Serif)'
export const SETTINGS_OPTIONAL_FONT_LABEL_BITTER = 'Bitter (Serif)'
export const SETTINGS_OPTIONAL_FONT_LABEL_SOURCE_SERIF = 'Source Serif 4'
export const SETTINGS_OPTIONAL_FONT_LABEL_MONTSERRAT = 'Montserrat (Sans)'
export const SETTINGS_OPTIONAL_FONT_LABEL_NUNITO_SANS = 'Nunito Sans'
export const SETTINGS_OPTIONAL_FONT_LABEL_VICTOR_MONO = 'Victor Mono'
export const SETTINGS_ACTION_INSTALLING = '설치 중'
export const SETTINGS_ACTION_INSTALL = '설치'
export const SETTINGS_BADGE_ACTIVE = '사용 중'
export const SETTINGS_ACTION_APPLY = '적용'
export const SETTINGS_OPTIONAL_HELPER =
	'설치된 폰트만 적용됩니다. 설치하지 않으면 기본 폰트로 자동 폴백됩니다.'
export const SETTINGS_SECTION_FONT_SIZE = '글자 크기'
export const SETTINGS_SECTION_LINE_HEIGHT = '줄 간격'
export const SETTINGS_SECTION_THEME = '테마 (Theme)'
export const SETTINGS_THEME_LIGHT = 'Light'
export const SETTINGS_THEME_SEPIA = 'Sepia'
export const SETTINGS_THEME_DARK = 'Dark'
export const SETTINGS_SAMPLE_TEXT = 'Ag'

export const PROJECT_TEMPLATE_CATEGORY_ALL = 'All Templates'
export const PROJECT_TEMPLATE_CATEGORY_NOVEL = 'Novel (소설)'
export const PROJECT_TEMPLATE_CATEGORY_SCRIPT = 'Script (대본)'
export const PROJECT_TEMPLATE_CATEGORY_GENERAL = 'General'
export const PROJECT_TEMPLATE_TITLE_BLANK = '빈 프로젝트 (Blank)'
export const PROJECT_TEMPLATE_TITLE_WEB_NOVEL = '웹소설 표준 (Web Novel)'
export const PROJECT_TEMPLATE_TITLE_SCREENPLAY = '드라마 대본 (Screenplay)'
export const PROJECT_TEMPLATE_TITLE_ESSAY = '에세이/수필 (Essay)'
export const PROJECT_TEMPLATE_DIALOG_SELECT_PATH = '프로젝트 저장 위치 선택'
export const PROJECT_TEMPLATE_FILTER_MARKDOWN = 'Markdown'
export const PROJECT_TEMPLATE_FILTER_TEXT = 'Text'
export const PROJECT_TEMPLATE_CONTEXT_OPEN = '열기'
export const PROJECT_TEMPLATE_CONTEXT_RENAME = '이름 수정'
export const PROJECT_TEMPLATE_CONTEXT_DELETE = '삭제'
export const PROJECT_TEMPLATE_DELETE_CONFIRM =
	'정말로 "{title}" 프로젝트를 삭제할까요? 이 작업은 되돌릴 수 없습니다.'
export const PROJECT_TEMPLATE_DELETE_CONFIRM_LABEL = '삭제'
export const PROJECT_TEMPLATE_RECENT_TITLE = 'Recent Projects'
export const PROJECT_TEMPLATE_EMPTY_PATH = '(No path)'
export const PROJECT_TEMPLATE_COVER_STANDARD = 'THE STANDARD'
export const PROJECT_TEMPLATE_COVER_NOVEL = 'NOVEL'
export const PROJECT_TEMPLATE_COVER_SCREEN = 'SCREEN'
export const PROJECT_TEMPLATE_COVER_PLAY = 'PLAY'
export const PROJECT_TEMPLATE_COVER_INTRO = 'INT. COFFEE SHOP - DAY'
export const PROJECT_TEMPLATE_COVER_ESSAY = 'Essay'

export const WORLD_TAB_TERMS = 'Terms (용어)'
export const WORLD_TAB_SYNOPSIS = 'Synopsis'
export const WORLD_TAB_MINDMAP = 'Mindmap'
export const WORLD_TAB_DRAWING = 'Map Drawing'
export const WORLD_TAB_PLOT = 'Plot Board'
export const WORLD_MINDMAP_NEW_TOPIC = 'New Topic'
export const WORLD_TERM_DEFAULT_NAME = 'New Term'
export const WORLD_TERM_DEFAULT_CATEGORY = 'general'
export const WORLD_TERM_NOT_FOUND = 'Term not found'
export const WORLD_TERM_LABEL = '용어'
export const WORLD_TERM_DEFINITION_LABEL = '정의'
export const WORLD_TERM_CATEGORY_LABEL = '카테고리'
export const WORLD_SYNOPSIS_HINT =
	"* 시놉시스는 언제든 변할 수 있습니다. 'Locked' 상태로 설정하면 수정을 방지합니다."
export const WORLD_DRAW_PLACE_PROMPT = '지명 입력:'
export const WORLD_PLOT_ACT1_TITLE = '1막: 발단 (Setup)'
export const WORLD_PLOT_ACT2_TITLE = '2막: 전개 (Confrontation)'
export const WORLD_PLOT_ACT3_TITLE = '3막: 결말 (Resolution)'
export const WORLD_PLOT_CARD_ACT1_1 = '주인공의 일상'
export const WORLD_PLOT_CARD_ACT1_2 = '사건의 시작'
export const WORLD_PLOT_CARD_ACT2_1 = '첫 번째 시련'
export const WORLD_PLOT_CARD_ACT3_1 = '최후의 대결'

export const TEXT_EDITOR_MIN_HEIGHT = 400
export const WORLD_DRAW_TOOL_PEN_TITLE = '펜'
export const WORLD_DRAW_TOOL_TEXT_TITLE = '지명 (텍스트)'
export const WORLD_DRAW_CLEAR_LABEL = 'Clear All'
export const WORLD_DRAW_TEXT_FONT_SIZE = 14
export const WORLD_DRAW_TEXT_FONT_WEIGHT = 'bold'
export const WORLD_PLOT_ADD_BEAT_LABEL = 'Add Beat'
export const WORLD_PLOT_NEW_BEAT_LABEL = 'New Beat'

export const SLASH_MENU_HEADER_BASIC = '기본 블록'
export const SLASH_MENU_DESC_H1 = '장(章) 또는 큰 섹션'
export const SLASH_MENU_DESC_H2 = '중간 섹션'
export const SLASH_MENU_DESC_H3 = '세부 섹션'
export const SLASH_MENU_DESC_BULLET = '단순 목록 만들기'
export const SLASH_MENU_DESC_NUMBER = '순서가 있는 목록'
export const SLASH_MENU_DESC_CHECK = '체크박스로 진행 관리'
export const SLASH_MENU_DESC_TOGGLE = '접고 펼칠 수 있는 섹션'
export const SLASH_MENU_DESC_QUOTE = '대사/인용문 강조'
export const SLASH_MENU_DESC_CALLOUT = '주석/메모 박스'
export const SLASH_MENU_DESC_DIVIDER = '장면 전환 구분'
export const SLASH_MENU_LABEL_H1 = '제목 1'
export const SLASH_MENU_LABEL_H2 = '제목 2'
export const SLASH_MENU_LABEL_H3 = '제목 3'
export const SLASH_MENU_LABEL_BULLET = '글머리 기호 목록'
export const SLASH_MENU_LABEL_NUMBER = '번호 매기기 목록'
export const SLASH_MENU_LABEL_CHECK = '할 일 목록'
export const SLASH_MENU_LABEL_TOGGLE = '토글 섹션'
export const SLASH_MENU_LABEL_QUOTE = '인용'
export const SLASH_MENU_LABEL_CALLOUT = '메모(콜아웃)'
export const SLASH_MENU_LABEL_DIVIDER = '장면 구분선'
export const SLASH_MENU_TOGGLE_TITLE = '토글 제목'
export const SLASH_MENU_CALLOUT_CONTENT = '메모 내용'

export const MEMO_DEFAULT_NOTES = [
	{
		id: '1',
		title: '참고자료: 중세 복식',
		content: '링크: https://wiki...\n\n중세 귀족들의 의상은 생각보다 화려했다...',
		tags: ['자료', '의상'],
	},
	{
		id: '2',
		title: '아이디어 파편',
		content: '- 주인공이 사실은 악역이었다면?\n- 회귀 전의 기억이 왜곡된 것이라면?',
		tags: ['아이디어', '플롯'],
	},
] as const

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

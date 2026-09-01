export const SUGGESTION_MAX_ITEMS = 10;
export const SUGGESTION_POPUP_Z_INDEX = 50;

/* NOTE: Slash 메뉴가 열려 있는 동안 포커스는 편집 영역(ProseMirror contenteditable)에
   남는다. `aria-activedescendant`는 **포커스된 요소**에 붙어야 보조기술이 읽으므로,
   편집 영역이 이 id들을 참조한다(`suggestion.tsx`가 붙이고 떼어낸다).
   컴포넌트 파일이 아니라 상수 모듈에 두는 이유는 fast refresh다 —
   `react-refresh/only-export-components`가 컴포넌트 파일의 값 export를 경고한다. */
export const SLASH_MENU_LISTBOX_ID = "luie-slash-menu";
export const slashMenuOptionId = (index: number): string =>
  `${SLASH_MENU_LISTBOX_ID}-option-${index}`;

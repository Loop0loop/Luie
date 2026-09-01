export const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32] as const;

/* NOTE: 팔레트 항목은 `token`(문서에 저장되고 실제로 칠해지는 값)과 `anchor`(그 색의 원형
   hex)를 함께 갖는다. 이유가 둘이다.

   1) **저장값은 토큰 참조여야 한다.** 이전에는 고정 hex를 저장해서 theme을 바꾸면 그대로
      남았고, dark에서 형광펜을 칠하면 글자 대비가 1.01~1.50으로 **글자가 사라졌다**.
      글자색도 "검정"이 dark에서 1.04, "흰색"이 light에서 1.36이었다. 값 산출 근거는
      `global.tokens.css`의 `--editor-mark-*` / `--editor-ink-*` NOTE에 있다.
   2) **커스텀 픽커는 hex가 필요하다.** `ColorPickerMenu`가 값을 `hexToHsv()`로 파싱하므로
      토큰 참조를 넣을 수 없다. 팔레트 색이 선택된 상태에서 픽커를 열면 anchor를 초기값으로
      보여준다. 스와치에 보이는 색과 저장되는 색은 둘 다 `token`이다. */
export interface EditorPaletteEntry {
  readonly label: string;
  readonly token: string;
  readonly anchor: string;
}

/* NOTE: "검정"·"흰색" 두 항목을 뺐다. theme 무관 고정값이라 각각 절반의 theme에서
   보이지 않았고, 애초에 그 둘이 원하는 결과는 "theme의 본문색"이다. 그 역할은 팔레트가
   아니라 `clearLabel`("기본 글자색")이 담당한다 — 색을 해제하면 `--text-primary`가 된다. */
export const TEXT_COLORS: readonly EditorPaletteEntry[] = [
  { label: "빨강", token: "var(--editor-ink-red)", anchor: "#dc2626" },
  { label: "주황", token: "var(--editor-ink-orange)", anchor: "#ea580c" },
  { label: "노랑", token: "var(--editor-ink-yellow)", anchor: "#ca8a04" },
  { label: "초록", token: "var(--editor-ink-green)", anchor: "#16a34a" },
  { label: "청록", token: "var(--editor-ink-teal)", anchor: "#0d9488" },
  { label: "파랑", token: "var(--editor-ink-blue)", anchor: "#2563eb" },
  { label: "보라", token: "var(--editor-ink-purple)", anchor: "#9333ea" },
  { label: "분홍", token: "var(--editor-ink-pink)", anchor: "#db2777" },
] as const;

export const HIGHLIGHT_COLORS: readonly EditorPaletteEntry[] = [
  { label: "노랑", token: "var(--editor-mark-yellow)", anchor: "#b49004" },
  { label: "초록", token: "var(--editor-mark-green)", anchor: "#22c55e" },
  { label: "하늘", token: "var(--editor-mark-sky)", anchor: "#0ea5e9" },
  { label: "분홍", token: "var(--editor-mark-pink)", anchor: "#ec4899" },
  { label: "주황", token: "var(--editor-mark-orange)", anchor: "#f97316" },
  { label: "보라", token: "var(--editor-mark-purple)", anchor: "#a855f7" },
  { label: "빨강", token: "var(--editor-mark-red)", anchor: "#ef4444" },
  { label: "민트", token: "var(--editor-mark-mint)", anchor: "#14b8a6" },
] as const;

/* NOTE: "색 없음" 상태에서 툴바 버튼 밑줄이 보여주는 색이다. 이전에는 어느 스와치와도
   맞지 않는 매직 hex가 EditorToolbar·EditorBubbleMenu에 각각 박혀 있었다.

   글자색은 팔레트 첫 항목이 아니라 **본문색**이다 — 색을 해제하면 실제로 그렇게 그려진다.
   (이전 팔레트는 첫 항목이 "검정"이라 우연히 맞았으나, 검정을 뺀 지금은 첫 항목이 빨강이라
   그대로 두면 색을 안 칠했는데 빨간 밑줄이 뜬다.)
   형광펜은 첫 항목(노랑)이 맞다 — `--highlight-default`가 그 값을 alias한다. */
export const DEFAULT_TEXT_COLOR = "var(--text-primary)";
export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].token;

export const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32] as const;

export const TEXT_COLORS = [
  { label: "검정", hex: "#18181B" },
  { label: "흰색", hex: "#D7D7DA" },
  { label: "빨강", hex: "#EF4444" },
  { label: "주황", hex: "#F97316" },
  { label: "노랑", hex: "#CA8A04" },
  { label: "파랑", hex: "#2563EB" },
  { label: "보라", hex: "#9333EA" },
  { label: "청록", hex: "#0D9488" },
  { label: "초록", hex: "#16A34A" },
] as const;

export const HIGHLIGHT_COLORS = [
  { label: "노랑", hex: "#FEF08A" },
  { label: "초록", hex: "#BBF7D0" },
  { label: "하늘", hex: "#BAE6FD" },
  { label: "분홍", hex: "#FBCFE8" },
  { label: "주황", hex: "#FED7AA" },
  { label: "보라", hex: "#E9D5FF" },
  { label: "빨강", hex: "#FCA5A5" },
  { label: "민트", hex: "#A7F3D0" },
] as const;

/* NOTE: ColorPickerMenu는 값을 `hexToHsv()`로 파싱하므로 CSS variable을 넣을 수 없다.
   그래서 theme 토큰이 아니라 팔레트 상수를 단일 출처로 참조한다. 이전에는 어느 스와치와도
   맞지 않는 hex가 EditorToolbar·EditorBubbleMenu에 각각 하드코딩돼 있어서 "색 없음" 상태의
   표시색이 실제 팔레트와 어긋났다. */
export const DEFAULT_TEXT_COLOR = TEXT_COLORS[0].hex;
export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].hex;

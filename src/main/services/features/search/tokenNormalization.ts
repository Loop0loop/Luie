const KOREAN_SUFFIXES = [
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "에서",
  "에게",
  "한테",
  "께",
  "와",
  "과",
  "으로",
  "로",
  "도",
  "만",
  "까지",
  "부터",
  "처럼",
  "보다",
  "의",
  "랑",
  "이랑",
  "이라",
  "라",
  "야",
  "요",
  "다",
] as const;

export const normalizeSearchTokens = (query: string): string[] => {
  const seeds = query.trim().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();
  for (const token of seeds) {
    expanded.add(token);
    for (const suffix of KOREAN_SUFFIXES) {
      if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
        expanded.add(token.slice(0, token.length - suffix.length));
      }
    }
  }
  return [...expanded].filter((token) => token.length > 0);
};

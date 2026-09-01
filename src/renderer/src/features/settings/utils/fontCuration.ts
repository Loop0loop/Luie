import type { SystemFont } from "@renderer/features/editor/hooks/useSystemFonts";

export type FontLanguageFilter = "all" | "ko" | "en" | "ja";

// 한글 폰트 식별 패턴 (이름에 한글이 있거나 대표 한국어 폰트 패밀리명)
const KOREAN_FONT_REGEX =
  /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]|pretendard|kopub|nanum|noto sans kr|noto serif kr|d2coding|malgun|apple sd|산돌|sandoll|ridi|chosun|gmarket|spoqa|baemin|woowa|jeju|gothic|batang|myeongjo|바탕|명조|고딕|돋움|궁서|나눔|마루/i;

// 일본어 폰트 식별 패턴
const JAPANESE_FONT_REGEX =
  /[\u3040-\u309F\u30A0-\u30FF]|hiragino|yu gothic|yu mincho|meiryo|ms gothic|ms mincho|noto sans jp|noto serif jp|biz udp|ipa|morisawa|ヒラギノ|メイリオ|游ゴシック|游明朝/i;

// 작가들이 가장 애용하는 대표 추천/인기 폰트 키워드 (우선순위 순)
const POPULAR_FONT_KEYWORDS: Record<FontLanguageFilter, string[]> = {
  ko: [
    "pretendard",
    "kopub",
    "nanum",
    "noto sans kr",
    "noto serif kr",
    "d2coding",
    "apple sd",
    "malgun gothic",
    "ridi",
    "chosun",
    "maruburi",
  ],
  en: [
    "inter",
    "sf pro",
    "helvetica",
    "georgia",
    "garamond",
    "merriweather",
    "cascadia",
    "fira code",
    "jetbrains mono",
    "menlo",
    "roboto",
    "times new roman",
  ],
  ja: [
    "hiragino",
    "yu gothic",
    "yu mincho",
    "meiryo",
    "noto sans jp",
    "noto serif jp",
    "biz udp",
  ],
  all: [
    "pretendard",
    "kopub",
    "nanum",
    "noto sans kr",
    "noto serif kr",
    "d2coding",
    "inter",
    "sf pro",
    "helvetica",
    "georgia",
    "fira code",
    "jetbrains mono",
  ],
};

export function detectFontLanguage(fontFamily: string): "ko" | "ja" | "en" {
  if (KOREAN_FONT_REGEX.test(fontFamily)) return "ko";
  if (JAPANESE_FONT_REGEX.test(fontFamily)) return "ja";
  return "en";
}

export function isPopularFont(fontFamily: string, lang: FontLanguageFilter = "all"): boolean {
  const lower = fontFamily.toLowerCase();
  const keywords = POPULAR_FONT_KEYWORDS[lang] || POPULAR_FONT_KEYWORDS.all;
  return keywords.some((kw) => lower.includes(kw));
}

export function curateSystemFonts(
  fonts: SystemFont[],
  langFilter: FontLanguageFilter,
  searchQuery: string = "",
) {
  const query = searchQuery.trim().toLowerCase();
  const hasQuery = query.length > 0;
  const isFilterAll = langFilter === "all";

  const popular: SystemFont[] = [];
  const others: SystemFont[] = [];

  for (let i = 0; i < fonts.length; i++) {
    const font = fonts[i];

    // 1. 검색어 필터링 (가장 저렴한 조건)
    if (
      hasQuery &&
      !font.family.toLowerCase().includes(query) &&
      !font.fullName.toLowerCase().includes(query)
    ) {
      continue;
    }

    // 2. 언어 필터링
    if (!isFilterAll && detectFontLanguage(font.family) !== langFilter) {
      continue;
    }

    // 3. 인기 폰트 / 기타 폰트 분기
    if (isPopularFont(font.family, langFilter)) {
      popular.push(font);
    } else {
      others.push(font);
    }
  }

  return {
    popular,
    others,
    totalCount: popular.length + others.length,
  };
}

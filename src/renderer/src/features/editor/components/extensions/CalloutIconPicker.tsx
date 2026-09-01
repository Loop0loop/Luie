import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@shared/types/utils";

export const EMOJI_CATEGORIES = [
  {
    name: "자주 쓰는 이모지",
    emojis: [
      { char: "💡", name: "전구", keywords: ["아이디어", "생각", "idea", "light"] },
      { char: "📌", name: "핀", keywords: ["고정", "중요", "pin"] },
      { char: "⚠️", name: "경고", keywords: ["주의", "warning", "alert"] },
      { char: "ℹ️", name: "정보", keywords: ["안내", "info"] },
      { char: "📝", name: "메모", keywords: ["노트", "작성", "memo", "note"] },
      { char: "🔥", name: "불", keywords: ["핫", "인기", "fire", "hot"] },
      { char: "🚀", name: "로켓", keywords: ["발사", "성장", "rocket"] },
      { char: "💬", name: "말풍선", keywords: ["대화", "댓글", "chat"] },
      { char: "🎯", name: "타겟", keywords: ["목표", "명중", "target"] },
      { char: "❓", name: "물음표", keywords: ["질문", "궁금", "question"] },
      { char: "⭐", name: "별", keywords: ["스타", "즐겨찾기", "star"] },
      { char: "⚡", name: "번개", keywords: ["빠름", "전기", "lightning"] },
      { char: "🔖", name: "북마크", keywords: ["저장", "북마크", "bookmark"] },
      { char: "🔑", name: "열쇠", keywords: ["비밀", "복선", "key"] },
    ],
  },
  {
    name: "표정 & 감정",
    emojis: [
      { char: "😀", name: "웃음", keywords: ["smile", "기쁨", "행복"] },
      { char: "🙂", name: "미소", keywords: ["미소", "smile"] },
      { char: "🤔", name: "생각", keywords: ["thinking", "고민", "의문"] },
      { char: "🧐", name: "탐구", keywords: ["investigate", "분석", "안경"] },
      { char: "😎", name: "멋짐", keywords: ["cool", "선글라스"] },
      { char: "🥺", name: "부탁", keywords: ["pleading", "애원"] },
      { char: "😱", name: "경악", keywords: ["shock", "놀람"] },
      { char: "😴", name: "수면", keywords: ["sleep", "휴식"] },
      { char: "🥳", name: "축하", keywords: ["party", "파티"] },
      { char: "😭", name: "눈물", keywords: ["슬픔", "울음", "cry"] },
      { char: "😡", name: "분노", keywords: ["화남", "angry"] },
      { char: "🤫", name: "쉿", keywords: ["비밀", "조용", "quiet"] },
      { char: "👀", name: "눈", keywords: ["주시", "확인", "look"] },
      { char: "👏", name: "박수", keywords: ["칭찬", "clap"] },
    ],
  },
  {
    name: "사물 & 글쓰기",
    emojis: [
      { char: "📖", name: "책", keywords: ["book", "독서", "원고"] },
      { char: "📜", name: "두루마리", keywords: ["scroll", "설정집", "고문서"] },
      { char: "🖋️", name: "만년필", keywords: ["pen", "집필", "글"] },
      { char: "✏️", name: "연필", keywords: ["pencil", "스케치", "메모"] },
      { char: "📚", name: "책장", keywords: ["books", "자료실", "도서관"] },
      { char: "📂", name: "폴더", keywords: ["folder", "자료", "정리"] },
      { char: "🔍", name: "돋보기", keywords: ["search", "조사", "찾기"] },
      { char: "🗝️", name: "열쇠", keywords: ["key", "복선", "해결"] },
      { char: "🧭", name: "나침반", keywords: ["compass", "세계관", "방향"] },
      { char: "🗺️", name: "지도", keywords: ["map", "지도", "배경"] },
      { char: "⏳", name: "모래시계", keywords: ["time", "시간", "기한"] },
      { char: "🏷️", name: "태그", keywords: ["tag", "분류", "라벨"] },
      { char: "🎨", name: "팔레트", keywords: ["art", "디자인", "색상"] },
      { char: "☕", name: "커피", keywords: ["coffee", "휴식", "카페"] },
    ],
  },
  {
    name: "기호 & 표식",
    emojis: [
      { char: "✅", name: "체크", keywords: ["check", "완료", "확인"] },
      { char: "❌", name: "엑스", keywords: ["cross", "취소", "오류"] },
      { char: "❗", name: "느낌표", keywords: ["exclamation", "강조", "중요"] },
      { char: "🚨", name: "사이렌", keywords: ["siren", "비상", "긴급"] },
      { char: "💯", name: "백점", keywords: ["100", "완벽", "만점"] },
      { char: "💎", name: "보석", keywords: ["gem", "다이아", "가치"] },
      { char: "⚔️", name: "검", keywords: ["sword", "전투", "대립"] },
      { char: "🛡️", name: "방패", keywords: ["shield", "방어", "보호"] },
      { char: "🏰", name: "성", keywords: ["castle", "왕국", "무대"] },
      { char: "👑", name: "왕관", keywords: ["crown", "주인공", "권력"] },
      { char: "🌱", name: "새싹", keywords: ["plant", "시작", "성장"] },
      { char: "🌙", name: "달", keywords: ["moon", "밤", "감성"] },
      { char: "☀️", name: "해", keywords: ["sun", "낮", "희망"] },
      { char: "🌈", name: "무지개", keywords: ["rainbow", "꿈", "다채로움"] },
    ],
  },
];

const RECENTS_KEY = "luie_callout_emoji_recents";

interface CalloutIconPickerProps {
  currentIcon?: string | null;
  onSelect: (icon: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function CalloutIconPicker({
  currentIcon,
  onSelect,
  onRemove,
  onClose,
}: CalloutIconPickerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENTS_KEY);
      return saved ? JSON.parse(saved) : ["💡", "📌", "⚠️", "ℹ️", "📝", "🔥", "🚀", "⭐"];
    } catch {
      return ["💡", "📌", "⚠️", "ℹ️", "📝", "🔥", "🚀", "⭐"];
    }
  });

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSelect = (icon: string) => {
    onSelect(icon);
    setRecents((prev) => {
      const next = [icon, ...prev.filter((i) => i !== icon)].slice(0, 8);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return EMOJI_CATEGORIES;

    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(
        (e) =>
          e.char.includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q)),
      ),
    })).filter((cat) => cat.emojis.length > 0);
  }, [query]);

  return (
    <div
      className="absolute left-0 top-8 z-dropdown w-72 sm:w-76 rounded-panel border border-border bg-panel/95 p-2.5 shadow-modal backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100 font-sans select-none flex flex-col gap-2"
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Top Bar: Search & Remove */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이모지 검색..."
            className="w-full h-8 pl-8 pr-2.5 text-xs bg-bg-secondary rounded-control border border-border focus:outline-none focus:ring-1 focus:ring-ring text-fg placeholder:text-muted"
          />
        </div>
        {currentIcon && (
          <button
            type="button"
            onClick={onRemove}
            className="h-8 px-2 flex items-center gap-1 rounded-control border border-danger/30 text-danger hover:bg-danger/10 text-xs shrink-0 transition-colors cursor-pointer"
            title="아이콘 제거"
          >
            <X className="h-3 w-3" />
            <span>제거</span>
          </button>
        )}
      </div>

      {/* Recents */}
      {recents.length > 0 && !query && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-muted tracking-wider uppercase px-1">
            최근 사용
          </span>
          <div className="grid grid-cols-8 gap-1 px-0.5">
            {recents.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "flex h-7.5 w-7.5 items-center justify-center rounded-md text-base transition-transform hover:scale-110 hover:bg-surface-hover active:scale-95 cursor-pointer",
                  currentIcon === item && "bg-element ring-1 ring-border-strong",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Emoji Grid View - with smooth scroll */}
      <div
        className="max-h-56 overflow-y-auto pr-0.5 flex flex-col gap-2.5"
        onWheel={(e) => e.stopPropagation()}
      >
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <div key={category.name} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted tracking-wider uppercase px-1">
                {category.name}
              </span>
              <div className="grid grid-cols-7 gap-1">
                {category.emojis.map((e) => (
                  <button
                    key={e.char}
                    type="button"
                    onClick={() => handleSelect(e.char)}
                    title={e.name}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-lg transition-transform hover:scale-110 hover:bg-surface-hover active:scale-95 cursor-pointer",
                      currentIcon === e.char && "bg-element ring-1 ring-border-strong",
                    )}
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-muted">
            일치하는 이모지가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

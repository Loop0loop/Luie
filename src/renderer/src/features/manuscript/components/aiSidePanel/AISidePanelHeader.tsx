import React from "react";
import { BookOpen, Users, BrainCircuit, ChevronDown, ChevronUp } from "lucide-react";
import { CharacterPillBadge } from "./CharacterPillBadge";
import { ForeshadowingTag } from "./ForeshadowingTag";

interface AISidePanelHeaderProps {
  episodeTitle?: string;
  synopsis?: string;
  characters?: Array<{ id: string; name: string; role?: string }>;
  foreshadowingList?: Array<{ label: string; isResolved?: boolean }>;
  onCharacterClick?: (id: string) => void;
}

export function AISidePanelHeader({
  episodeTitle = "현재 회차",
  synopsis = "작성 중인 회차의 시놉시스 내용이 여기에 바인딩됩니다.",
  characters = [
    { id: "1", name: "주인공", role: "주연" },
    { id: "2", name: "라이벌", role: "조연" },
  ],
  foreshadowingList = [
    { label: "비밀 접선", isResolved: false },
    { label: "배신의 증거", isResolved: false },
  ],
  onCharacterClick,
}: AISidePanelHeaderProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="shrink-0 border-b border-border/80 bg-sidebar/50 p-3.5 transition-colors">
      {/* Header Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="icon-sm text-accent shrink-0" aria-hidden="true" />
          <h2 className="truncate text-xs font-semibold text-fg">
            {episodeTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex size-6 items-center justify-center rounded-control text-subtle hover:bg-surface-hover hover:text-fg transition-colors"
          aria-label={isExpanded ? "Collapse Context Header" : "Expand Context Header"}
        >
          {isExpanded ? (
            <ChevronUp className="icon-xs" />
          ) : (
            <ChevronDown className="icon-xs" />
          )}
        </button>
      </div>

      {/* Expanded Context Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Synopsis Box */}
          <div className="rounded-panel border border-border/60 bg-surface/80 p-2.5 shadow-xs">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">
              시놉시스
            </span>
            <p className="text-xs text-fg/90 line-clamp-3 leading-relaxed">
              {synopsis}
            </p>
          </div>

          {/* Characters Section */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">
              <Users className="icon-xs text-muted" />
              <span>등장인물 ({characters.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {characters.map((char) => (
                <CharacterPillBadge
                  key={char.id}
                  id={char.id}
                  name={char.name}
                  role={char.role}
                  onClick={onCharacterClick}
                />
              ))}
            </div>
          </div>

          {/* Foreshadowing Tags Section */}
          {foreshadowingList.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">
                <BrainCircuit className="icon-xs text-muted" />
                <span>복선 / 떡밥 추적</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {foreshadowingList.map((tag, idx) => (
                  <ForeshadowingTag
                    key={idx}
                    label={tag.label}
                    isResolved={tag.isResolved}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

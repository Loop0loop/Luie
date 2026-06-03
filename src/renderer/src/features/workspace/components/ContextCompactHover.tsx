import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FocusHoverSidebar } from "@renderer/domains/manuscript";
import { useProjectStore } from "@renderer/domains/project";
import { useCharacterStore, useTermStore } from "@renderer/domains/world";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { SIDEBAR_WIDTH_CONFIG } from "@shared/constants/sidebarSizing";

type ContextTab = "synopsis" | "characters" | "terms";

export type ContextCompactHoverProps = {
  onExpandWithTab: (tab: ContextTab) => void;
};

const COMPACT_WIDTH_PX = Math.round(
  SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx * 0.73,
);
const MAX_ITEMS_SHOWN = 5;

function CompactContent({ onExpandWithTab }: ContextCompactHoverProps) {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((s) => s.currentProject?.id);
  const allCharacters = useCharacterStore((s) => s.characters);
  const characters = useMemo(
    () => allCharacters.filter((c) => c.projectId === currentProjectId),
    [allCharacters, currentProjectId],
  );
  const allTerms = useTermStore((s) => s.terms);
  const terms = useMemo(
    () => allTerms.filter((t) => t.projectId === currentProjectId),
    [allTerms, currentProjectId],
  );

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4 text-[11px]">
      {/* 줄거리 */}
      <button
        type="button"
        className="w-full text-left font-semibold uppercase tracking-wider text-fg/80 transition-colors hover:text-fg"
        onClick={() => onExpandWithTab("synopsis")}
      >
        * {t("context.tab.synopsis")}
      </button>

      {/* 등장인물 */}
      <section>
        <button
          type="button"
          className="mb-1.5 w-full text-left font-semibold uppercase tracking-wider text-fg/80 transition-colors hover:text-fg"
          onClick={() => onExpandWithTab("characters")}
        >
          * {t("context.tab.characters")}
          {characters.length > 0 && (
            <span className="ml-1 font-normal text-fg/50">
              ({characters.length})
            </span>
          )}
        </button>
        {characters.slice(0, MAX_ITEMS_SHOWN).map((c) => (
          <button
            key={c.id}
            type="button"
            className="block w-full truncate py-0.5 pl-3 text-left text-fg/65 transition-colors hover:text-fg"
            onClick={() => onExpandWithTab("characters")}
          >
            {c.name}
          </button>
        ))}
        {characters.length > MAX_ITEMS_SHOWN && (
          <span className="pl-3 text-fg/40">…</span>
        )}
      </section>

      {/* 용어 */}
      <section>
        <button
          type="button"
          className="mb-1.5 w-full text-left font-semibold uppercase tracking-wider text-fg/80 transition-colors hover:text-fg"
          onClick={() => onExpandWithTab("terms")}
        >
          * {t("context.tab.terms")}
          {terms.length > 0 && (
            <span className="ml-1 font-normal text-fg/50">
              ({terms.length})
            </span>
          )}
        </button>
        {terms.slice(0, MAX_ITEMS_SHOWN).map((term) => (
          <button
            key={term.id}
            type="button"
            className="block w-full truncate py-0.5 pl-3 text-left text-fg/65 transition-colors hover:text-fg"
            onClick={() => onExpandWithTab("terms")}
          >
            {term.term}
          </button>
        ))}
        {terms.length > MAX_ITEMS_SHOWN && (
          <span className="pl-3 text-fg/40">…</span>
        )}
      </section>
    </div>
  );
}

export function ContextCompactHover(props: ContextCompactHoverProps) {
  return (
    <FocusHoverSidebar
      side="right"
      topOffset={EDITOR_WINDOW_BAR_HEIGHT_PX}
      activationWidthPx={COMPACT_WIDTH_PX}
      className="bg-transparent shadow-none"
    >
      <div
        className="h-full border-l border-border/40 bg-panel/75 shadow-lg backdrop-blur-sm"
        style={{ width: COMPACT_WIDTH_PX }}
      >
        <CompactContent {...props} />
      </div>
    </FocusHoverSidebar>
  );
}

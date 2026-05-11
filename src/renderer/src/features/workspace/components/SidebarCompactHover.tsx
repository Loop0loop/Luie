import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { SIDEBAR_WIDTH_CONFIG } from "@shared/constants/sidebarSizing";

type ResearchItemType =
  | "character"
  | "event"
  | "faction"
  | "world"
  | "scrap"
  | "analysis";

export type SidebarCompactHoverProps = {
  onSelectChapter: (id: string) => void;
  onSelectResearchItem: (type: ResearchItemType) => void;
};

const COMPACT_WIDTH_PX = Math.round(
  SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx * 0.82,
);
const MAX_CHAPTERS_SHOWN = 8;

function CompactContent({
  onSelectChapter,
  onSelectResearchItem,
}: SidebarCompactHoverProps) {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((s) => s.currentProject?.id);
  const allChapters = useChapterStore((s) => s.chapters);
  const chapters = useMemo(
    () =>
      allChapters
        .filter((c) => c.projectId === currentProjectId)
        .sort((a, b) => a.order - b.order),
    [allChapters, currentProjectId],
  );

  const researchItems: { id: ResearchItemType; label: string }[] = useMemo(
    () => [
      { id: "character", label: t("sidebar.item.characters") },
      { id: "event", label: t("research.title.events", "Events") },
      { id: "faction", label: t("research.title.factions", "Factions") },
      { id: "world", label: t("sidebar.item.world") },
      { id: "scrap", label: t("sidebar.item.scrap") },
      { id: "analysis", label: t("research.title.analysis") },
    ],
    [t],
  );

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4 text-[11px]">
      {/* 원고 */}
      <section>
        <p className="mb-1.5 font-semibold uppercase tracking-wider text-fg/80">
          * {t("sidebar.section.manuscript")}
        </p>
        {chapters.slice(0, MAX_CHAPTERS_SHOWN).map((ch, i) => (
          <button
            key={ch.id}
            type="button"
            className="block w-full truncate py-0.5 pl-3 text-left text-fg/65 transition-colors hover:text-fg"
            onClick={() => onSelectChapter(ch.id)}
          >
            {i + 1}. {ch.title}
          </button>
        ))}
        {chapters.length > MAX_CHAPTERS_SHOWN && (
          <span className="pl-3 text-fg/40">…</span>
        )}
        {chapters.length === 0 && (
          <span className="pl-3 italic text-fg/40">
            {t("sidebar.addChapter")}
          </span>
        )}
      </section>

      {/* 자료 */}
      <section>
        <p className="mb-1.5 font-semibold uppercase tracking-wider text-fg/80">
          * {t("sidebar.section.research")}
        </p>
        {researchItems.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="block w-full truncate py-0.5 pl-3 text-left text-fg/65 transition-colors hover:text-fg"
            onClick={() => onSelectResearchItem(id)}
          >
            {label}
          </button>
        ))}
      </section>

      {/* 버전 기록 */}
      <p className="font-semibold uppercase tracking-wider text-fg/80">
        * {t("sidebar.section.snapshot")}
      </p>

      {/* 휴지통 */}
      <p className="font-semibold uppercase tracking-wider text-fg/80">
        * {t("sidebar.section.trash")}
      </p>
    </div>
  );
}

export function SidebarCompactHover(props: SidebarCompactHoverProps) {
  return (
    <FocusHoverSidebar
      side="left"
      topOffset={EDITOR_WINDOW_BAR_HEIGHT_PX}
      activationWidthPx={COMPACT_WIDTH_PX}
      className="bg-transparent shadow-none"
    >
      <div
        className="h-full border-r border-border/40 bg-sidebar/75 shadow-lg backdrop-blur-sm"
        style={{ width: COMPACT_WIDTH_PX }}
      >
        <CompactContent {...props} />
      </div>
    </FocusHoverSidebar>
  );
}

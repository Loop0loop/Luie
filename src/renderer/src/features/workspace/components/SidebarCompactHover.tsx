import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronsRight,
  ArrowRight,
  FileText,
  FolderOpen,
  Clock,
  Trash2,
} from "lucide-react";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
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
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
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
    <div className="flex h-full flex-col text-[13px]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">

        {/* 원고 */}
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50">
            <FileText size={11} />
            {t("sidebar.section.manuscript")}
          </p>
          {chapters.slice(0, MAX_CHAPTERS_SHOWN).map((ch, i) => (
            <button
              key={ch.id}
              type="button"
              className="block w-full truncate py-1 pl-3 pr-2 text-left text-fg/70 rounded transition-colors hover:bg-surface-hover hover:text-fg"
              onClick={() => onSelectChapter(ch.id)}
            >
              {i + 1}. {ch.title || t("project.defaults.untitled")}
            </button>
          ))}
          {chapters.length > MAX_CHAPTERS_SHOWN && (
            <span className="pl-3 text-[11px] text-fg/35">
              +{chapters.length - MAX_CHAPTERS_SHOWN}개 더
            </span>
          )}
          {chapters.length === 0 && (
            <span className="pl-3 italic text-fg/35 text-[12px]">
              {t("sidebar.addChapter")}
            </span>
          )}
        </section>

        {/* 자료 */}
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50">
            <FolderOpen size={11} />
            {t("sidebar.section.research")}
          </p>
          {researchItems.map(({ id, label }) => (
            <div key={id} className="group flex items-center rounded hover:bg-surface-hover">
              <button
                type="button"
                className="flex-1 truncate py-1 pl-3 text-left text-fg/70 transition-colors hover:text-fg"
                onClick={() => onSelectResearchItem(id)}
              >
                {label}
              </button>
              <button
                type="button"
                className="shrink-0 px-2 py-1 text-fg/30 opacity-0 transition-all group-hover:opacity-100 hover:text-accent"
                onClick={() => onSelectResearchItem(id)}
                title={label}
              >
                <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </section>

        {/* 버전 기록 */}
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50">
          <Clock size={11} />
          {t("sidebar.section.snapshot")}
        </p>

        {/* 휴지통 */}
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50">
          <Trash2 size={11} />
          {t("sidebar.section.trash")}
        </p>
      </div>

      {/* 하단 펼치기 토글 */}
      <button
        type="button"
        onClick={toggleLeftSidebar}
        className="shrink-0 flex items-center justify-center gap-1.5 h-9 border-t border-border/40 text-[12px] text-muted hover:text-fg hover:bg-surface-hover transition-colors"
      >
        <ChevronsRight size={13} />
        <span>{t("sidebar.expand")}</span>
      </button>
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

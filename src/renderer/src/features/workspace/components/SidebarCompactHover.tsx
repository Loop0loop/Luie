import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronsRight,
  RotateCcw,
  ArrowRight,
  FileText,
  FolderOpen,
  Clock,
  Trash2,
  ChevronRight,
  Loader2,
  GitBranch,
} from "lucide-react";
import { FocusHoverSidebar, useChapterStore } from "@renderer/domains/manuscript";
import { useProjectStore } from "@renderer/domains/project";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import type { Chapter, Snapshot } from "@shared/types";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { SIDEBAR_WIDTH_CONFIG } from "@shared/constants/sidebarSizing";
import { useDialog } from "@shared/ui/useDialog";

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
  activeChapterId?: string;
};

const COMPACT_WIDTH_PX = Math.round(
  SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx * 0.82,
);
const MAX_CHAPTERS_SHOWN = 8;

function CompactContent({
  onSelectChapter,
  onSelectResearchItem,
  activeChapterId,
}: SidebarCompactHoverProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const addPanel = useUIStore((s) => s.addPanel);
  const setRegionOpen = useUIStore((s) => s.setRegionOpen);
  const currentProjectId = useProjectStore((s) => s.currentProject?.id);
  const allChapters = useChapterStore((s) => s.chapters);
  const reloadChapters = useChapterStore((s) => s.loadAll);

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

  // Accordion state
  const [openSection, setOpenSection] = useState<"snapshot" | "trash" | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [trashItems, setTrashItems] = useState<Chapter[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const toggleSection = useCallback(
    (section: "snapshot" | "trash") => {
      const willOpen = openSection !== section;
      setOpenSection(willOpen ? section : null);
      if (!willOpen) return;

      if (section === "snapshot") {
        if (!activeChapterId) {
          setSnapshots([]);
          return;
        }
        setSnapshotLoading(true);
        setSnapshots([]);
        void api.snapshot.getByChapter(activeChapterId).then((res) => {
          if (res.success && res.data) setSnapshots(res.data);
          setSnapshotLoading(false);
        });
        return;
      }

      if (!currentProjectId) {
        setTrashItems([]);
        return;
      }
      setTrashLoading(true);
      setTrashItems([]);
      void api.chapter.getDeleted(currentProjectId).then((res) => {
        if (res.success && res.data) setTrashItems(res.data);
        setTrashLoading(false);
      });
    },
    [activeChapterId, currentProjectId, openSection],
  );

  const openSnapshotPanel = useCallback(
    (snapshot: Snapshot) => {
      addPanel({ type: "snapshot", snapshot });
    },
    [addPanel],
  );

  const restoreTrashItem = useCallback(
    async (chapterId: string) => {
      const confirmed = await dialog.confirm({
        title: t("trash.restore"),
        message: t("trash.confirmRestore"),
        isDestructive: true,
      });
      if (!confirmed || !currentProjectId) return;

      try {
        const response = await api.chapter.restore(chapterId);
        if (!response.success) {
          dialog.toast(t("trash.restoreFailed"), "error");
          return;
        }

        await reloadChapters(currentProjectId);
        const refreshed = await api.chapter.getDeleted(currentProjectId);
        if (refreshed.success && refreshed.data) {
          setTrashItems(refreshed.data);
        } else {
          setTrashItems([]);
        }
        dialog.toast(t("trash.restoreSuccess"), "success");
      } catch (error) {
        api.logger.error("Failed to restore chapter from compact hover", error);
        dialog.toast(t("trash.restoreFailed"), "error");
      }
    },
    [currentProjectId, dialog, reloadChapters, t],
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
              className={[
                "block w-full truncate py-1 pl-3 pr-2 text-left rounded transition-colors",
                ch.id === activeChapterId
                  ? "text-accent font-medium"
                  : "text-fg/70 hover:bg-surface-hover hover:text-fg",
              ].join(" ")}
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
        <section>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleSection("snapshot")}
              className="flex flex-1 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50 hover:text-fg transition-colors"
            >
              <Clock size={11} />
              <span className="flex-1 text-left">{t("sidebar.section.snapshot")}</span>
              <ArrowRight size={10} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("snapshot")}
              className="p-1 text-fg/40 hover:text-fg transition-colors"
              aria-label={t("sidebar.section.snapshot")}
            >
              <ChevronRight
                size={10}
                className={`transition-transform ${openSection === "snapshot" ? "rotate-90" : ""}`}
              />
            </button>
          </div>
          {openSection === "snapshot" && (
            <div className="mt-2 pl-2 flex flex-col gap-0.5">
              {!activeChapterId ? (
                <span className="text-[11px] text-fg/40 italic pl-1">
                  {t("sidebar.snapshotEmpty")}
                </span>
              ) : snapshotLoading ? (
                <Loader2 size={12} className="animate-spin text-muted ml-1" />
              ) : snapshots.length === 0 ? (
                <span className="text-[11px] text-fg/40 italic pl-1">
                  {t("sidebar.snapshotEmpty")}
                </span>
              ) : (
                <>
                  {snapshots.slice(0, 8).map((snap) => (
                    <button
                      key={snap.id}
                      type="button"
                      onClick={() => openSnapshotPanel(snap)}
                      className="flex items-start gap-1 py-0.5 text-[11px] text-fg/60 pl-1 rounded hover:bg-surface-hover hover:text-fg transition-colors text-left w-full"
                    >
                      <GitBranch size={9} className="shrink-0 text-fg/30 mt-px" />
                      <span className="truncate leading-snug">
                        {snap.description || new Date(snap.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))}
                  {snapshots.length > 8 && (
                    <span className="pl-1 text-[10px] text-fg/35">
                      +{snapshots.length - 8}개 더
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* 휴지통 */}
        <section>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleSection("trash")}
              className="flex flex-1 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg/50 hover:text-fg transition-colors"
            >
              <Trash2 size={11} />
              <span className="flex-1 text-left">{t("sidebar.section.trash")}</span>
              <ArrowRight size={10} />
            </button>
            <button
              type="button"
              onClick={() => toggleSection("trash")}
              className="p-1 text-fg/40 hover:text-fg transition-colors"
              aria-label={t("sidebar.section.trash")}
            >
              <ChevronRight
                size={10}
                className={`transition-transform ${openSection === "trash" ? "rotate-90" : ""}`}
              />
            </button>
          </div>
          {openSection === "trash" && (
            <div className="mt-2 pl-2 flex flex-col gap-0.5">
              {trashLoading ? (
                <Loader2 size={12} className="animate-spin text-muted ml-1" />
              ) : trashItems.length === 0 ? (
                <span className="text-[11px] text-fg/40 italic pl-1">{t("sidebar.trashEmpty")}</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {trashItems.map((ch) => (
                    <div
                      key={ch.id}
                      className="group flex items-center gap-1 py-0.5 text-fg/60 text-[11px] pl-1 rounded hover:bg-surface-hover"
                    >
                      <Trash2 size={9} className="shrink-0 text-fg/30" />
                      <span className="truncate flex-1">
                        {ch.title || t("project.defaults.untitled")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void restoreTrashItem(ch.id);
                        }}
                        className="shrink-0 p-1 text-fg/40 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                        title={t("trash.restore")}
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* 하단 펼치기 토글 */}
      <button
        type="button"
        onClick={() => setRegionOpen("leftSidebar", true)}
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

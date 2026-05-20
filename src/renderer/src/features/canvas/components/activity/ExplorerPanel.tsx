/**
 * ExplorerPanel — canvas activity panel that lists chapters for the current
 * project. Clicking a chapter sets the canvas scope to that chapter.
 *
 * Data: chapterStore.items + projectStore.currentItem (existing stores, no new IPC).
 * Drag & drop reorder: reuses DraggableItem from @shared/ui (same as Sidebar.tsx).
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelItem,
  PanelEmpty,
} from "./shared";

// 최종 수정일 상대 시간 포맷 헬퍼 함수
function getRelativeTimeString(dateInput: string | Date | undefined): string {
  if (!dateInput) return "수정일 없음";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function ExplorerPanel() {
  const { t } = useTranslation();

  const currentProject = useProjectStore((state) => state.currentItem);

  const items = useChapterStore((state) => state.items);
  const currentChapter = useChapterStore((state) => state.currentItem);
  const setCurrent = useChapterStore((state) => state.setCurrent);

  const chapters = useMemo(
    () => items.filter((c) => c.projectId === currentProject?.id),
    [items, currentProject?.id],
  );

  const scope = useCanvasViewStore((state) => state.scope);
  const setScope = useCanvasViewStore((state) => state.setScope);

  const activeScopeChapterId =
    scope?.kind === "single-chapter" ? scope.chapterId : null;

  const handleSelectChapter = (chapterId: string) => {
    // chapter를 먼저 찾고 없으면 early return — 부분적으로 깨진 상태 방지 (M12 수정)
    const chapter = items.find((c) => c.id === chapterId);
    if (!chapter) return;

    setScope({ kind: "single-chapter", chapterId });
    setCurrent(chapter);
  };

  return (
    <PanelRoot>
      <PanelHeader
        title={t("canvas.activity.explorer")}
        subtitle={currentProject?.title ?? undefined}
      />
      <PanelBody>
        <PanelSection
          title={t("sidebar.section.manuscript")}
          actions={
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-control text-muted transition-colors hover:bg-active hover:text-fg"
              title={t("sidebar.addChapter")}
              // Chapter creation is handled by the main editor flow; this is
              // intentionally a no-op placeholder until P7 wires IPC.
              onClick={() => undefined}
            >
              <Plus className="icon-xs" />
            </button>
          }
        >
          {chapters.length === 0 ? (
            <PanelEmpty message={t("sidebar.trashEmpty")} />
          ) : (
            chapters.map((chapter) => {
              const isActive =
                activeScopeChapterId === chapter.id ||
                currentChapter?.id === chapter.id;
              return (
                <DraggableItem
                  key={chapter.id}
                  id={`canvas-explorer-chapter-${chapter.id}`}
                  data={{
                    type: "chapter",
                    id: chapter.id,
                    title: chapter.title ?? "",
                  }}
                >
                  <PanelItem
                    label={
                      <div className="flex flex-col gap-0.5 py-0.5 select-none text-left">
                        <div className="font-medium text-fg truncate">
                          {chapter.order}. {chapter.title ?? t("project.defaults.untitled")}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal">
                          <span>{chapter.wordCount ? `${chapter.wordCount.toLocaleString()}자` : "0자"}</span>
                          <span className="w-[2px] h-[2px] rounded-full bg-border" />
                          <span>{getRelativeTimeString(chapter.updatedAt)}</span>
                        </div>
                      </div>
                    }
                    icon={
                      <FileText
                        className={
                          isActive ? "text-accent icon-sm self-start mt-[5px]" : "text-muted icon-sm self-start mt-[5px]"
                        }
                      />
                    }
                    active={isActive}
                    onClick={() => handleSelectChapter(chapter.id)}
                  />
                </DraggableItem>
              );
            })
          )}
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

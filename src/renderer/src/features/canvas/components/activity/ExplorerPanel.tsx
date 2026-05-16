/**
 * ExplorerPanel — canvas activity panel that lists chapters for the current
 * project. Clicking a chapter sets the canvas scope to that chapter.
 *
 * Data: chapterStore.items + projectStore.currentItem (existing stores, no new IPC).
 * Drag & drop reorder: reuses DraggableItem from @shared/ui (same as Sidebar.tsx).
 */
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelItem,
  PanelEmpty,
} from "./shared";

export default function ExplorerPanel() {
  const { t } = useTranslation();

  const currentProject = useProjectStore((state) => state.currentItem);

  const { chapters, currentChapter } = useChapterStore(
    useShallow((state) => ({
      chapters: state.items.filter(
        (c) => c.projectId === currentProject?.id,
      ),
      currentChapter: state.currentItem,
    })),
  );

  const { scope, setScope } = useCanvasViewStore(
    useShallow((state) => ({
      scope: state.scope,
      setScope: state.setScope,
    })),
  );

  const setMainView = useUIStore((state) => state.setMainView);
  const setUiMode = useEditorStore((state) => state.setUiMode);

  const activeScopeChapterId =
    scope?.kind === "single-chapter" ? scope.chapterId : null;

  const handleSelectChapter = (chapterId: string) => {
    setScope({ kind: "single-chapter", chapterId });
    setMainView({ type: "canvas", id: chapterId });
    // Canvas runs inside EditorLayout — ensure we're in editor mode.
    void setUiMode("editor");
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
              className="p-0.5 rounded hover:bg-active text-muted hover:text-fg"
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
                    label={`${chapter.order}. ${chapter.title ?? t("project.defaults.untitled")}`}
                    icon={
                      <FileText
                        className={
                          isActive ? "text-fg icon-sm" : "text-muted icon-sm"
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

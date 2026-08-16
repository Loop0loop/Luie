import { BookOpen, ChevronLeft, Pin, PinOff, X } from "lucide-react";
import React, { Suspense } from "react";
import type { BinderTab } from "./binderSidebar.shared";
import type { Snapshot } from "@shared/types";
import { WebNovelAICoPilot } from "./aiSidePanel/WebNovelAICoPilot";

const ResearchPanel = React.lazy(
  () => import("@renderer/features/research/components/ResearchPanel"),
);
const WorldPanel = React.lazy(
  () => import("@renderer/features/research/components/WorldPanel"),
);
const CanvasBinderPanel = React.lazy(
  () => import("@renderer/features/canvas/components/binder/CanvasBinderPanel"),
);
const SnapshotList = React.lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then((m) => ({
    default: m.SnapshotList,
  })),
);
const TrashList = React.lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((m) => ({
    default: m.TrashList,
  })),
);

export function BinderSidebarPanelBody(props: {
  activeChapterId?: string;
  activeTab: BinderTab;
  currentProjectId?: string;
  onBackToSnapshotList: () => void;
  onClose: () => void;
  onOpenSnapshot?: (snapshot: Snapshot) => void;
  isPinned: boolean;
  pinLocked?: boolean;
  onTogglePinned: () => void;
  onResearchTabChange?: (tab: "character" | "event" | "faction") => void;
  showHeader?: boolean;
  t: (key: string) => string;
}) {
  const isResearchEntityTab =
    props.activeTab === "character" ||
    props.activeTab === "event" ||
    props.activeTab === "faction";

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      {props.showHeader !== false ? (
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-sidebar px-4">
          {isResearchEntityTab ? (
            <>
              <BookOpen className="icon-sm shrink-0 text-muted" aria-hidden="true" />
              <h1 className="ml-2 text-sm font-semibold text-fg">
                {props.t("sidebar.section.research")}
              </h1>
            </>
          ) : (
            <span className="text-xs font-medium text-fg">{props.activeTab}</span>
          )}
          <div className="ml-auto flex items-center gap-1 border-l border-border pl-2">
            <button
              type="button"
              onClick={props.onTogglePinned}
              disabled={props.pinLocked}
              className="flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title={props.isPinned ? "Unpin" : "Pin"}
              aria-label={props.isPinned ? "Unpin" : "Pin"}
            >
              {props.isPinned ? <Pin className="icon-sm" /> : <PinOff className="icon-sm" />}
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title={props.t("sidebar.toggle.close")}
              aria-label={props.t("sidebar.toggle.close")}
            >
              <X className="icon-sm" />
            </button>
          </div>
        </header>
      ) : null}

      {props.activeTab === "snapshot" && (
        <button
          onClick={props.onBackToSnapshotList}
          className="absolute left-3 top-14 z-50 flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title={props.t("back")}
          aria-label={props.t("back")}
        >
          <ChevronLeft className="icon-sm" />
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="p-4 text-sm text-muted">{props.t("loading")}</div>
          }
        >
          {isResearchEntityTab && (
            <ResearchPanel
              activeTab={props.activeTab}
              onClose={props.onClose}
              onTabChange={(tab) => {
                if (
                  tab === "character" ||
                  tab === "event" ||
                  tab === "faction"
                ) {
                  props.onResearchTabChange?.(tab);
                }
              }}
            />
          )}
          {props.activeTab === "world" && (
            <WorldPanel onClose={props.onClose} />
          )}
          {props.activeTab === "scrap" && (
            <ResearchPanel activeTab="scrap" onClose={props.onClose} />
          )}
          {props.activeTab === "analysis" && (
            <WebNovelAICoPilot onClose={props.onClose} />
          )}
          {props.activeTab === "snapshot" &&
            (props.activeChapterId ? (
              <SnapshotList chapterId={props.activeChapterId} onOpenSnapshot={props.onOpenSnapshot} />
            ) : (
              <div className="p-4 text-xs text-muted italic text-center">
                {props.t("snapshot.list.selectChapter")}
              </div>
            ))}
          {props.activeTab === "trash" &&
            (props.currentProjectId ? (
              <TrashList projectId={props.currentProjectId} refreshKey={0} />
            ) : (
              <div className="p-4 text-xs text-muted italic text-center">
                {props.t("sidebar.trashEmpty")}
              </div>
            ))}
          {props.activeTab === "canvas" && <CanvasBinderPanel />}
        </Suspense>
      </div>
    </div>
  );
}

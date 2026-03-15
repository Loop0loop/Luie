import { ChevronLeft, X } from "lucide-react";
import React, { Suspense } from "react";
import type { BinderTab } from "./binderSidebar.shared";

const ResearchPanel = React.lazy(
  () => import("@renderer/features/research/components/ResearchPanel"),
);
const WorldPanel = React.lazy(
  () => import("@renderer/features/research/components/WorldPanel"),
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
  t: (key: string) => string;
}) {
  return (
    <div className="flex-1 h-full overflow-hidden relative min-w-0">
      <button
        onClick={props.onClose}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-surface/90 border border-border/50 text-muted hover:text-fg hover:bg-surface z-50 shadow-sm transition-colors duration-150"
        title={props.t("sidebar.toggle.close")}
      >
        <X className="w-4 h-4" />
      </button>

      {props.activeTab === "snapshot" && (
        <button
          onClick={props.onBackToSnapshotList}
          className="absolute top-2 left-3 p-1.5 rounded-full bg-surface/90 border border-border/50 text-muted hover:text-fg hover:bg-surface z-50 shadow-sm transition-colors duration-150"
          title={props.t("back")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div className="flex-1 overflow-hidden pt-4 h-full">
        <Suspense
          fallback={
            <div className="p-4 text-sm text-muted">{props.t("loading")}</div>
          }
        >
          {props.activeTab === "character" && (
            <ResearchPanel activeTab="character" onClose={props.onClose} />
          )}
          {props.activeTab === "event" && (
            <ResearchPanel activeTab="event" onClose={props.onClose} />
          )}
          {props.activeTab === "faction" && (
            <ResearchPanel activeTab="faction" onClose={props.onClose} />
          )}
          {props.activeTab === "world" && (
            <WorldPanel onClose={props.onClose} />
          )}
          {props.activeTab === "scrap" && (
            <ResearchPanel activeTab="scrap" onClose={props.onClose} />
          )}
          {props.activeTab === "analysis" && (
            <ResearchPanel activeTab="analysis" onClose={props.onClose} />
          )}
          {props.activeTab === "snapshot" &&
            (props.activeChapterId ? (
              <SnapshotList chapterId={props.activeChapterId} />
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
        </Suspense>
      </div>
    </div>
  );
}

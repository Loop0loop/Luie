import React, { Fragment, Suspense } from "react";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import Editor from "@renderer/features/editor/components/Editor";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import type { Chapter } from "@shared/types";

// Lazy Loaded Panels
const ResearchPanel = React.lazy(
    () => import("@renderer/features/research/components/ResearchPanel"),
);
const SnapshotViewer = React.lazy(
    () => import("@renderer/features/snapshot/components/SnapshotViewer"),
);
const ExportPreviewPanel = React.lazy(
    () => import("@renderer/features/export/components/ExportPreviewPanel"),
);

interface WorkspacePanelsProps {
    panels: ResizablePanelData[];
    removePanel: (id: string) => void;
    chapters: Chapter[];
    currentProjectId?: string;
    activeChapterId?: string;
    activeChapterTitle: string;
    onSave: (title: string, content: string, chapterId?: string) => Promise<void>;
}

export function WorkspacePanels({
    panels,
    removePanel,
    chapters,
    currentProjectId,
    activeChapterId,
    activeChapterTitle,
    onSave,
}: WorkspacePanelsProps) {
    const { t } = useTranslation();

    return (
        <>
            {panels.map((panel) => (
                <Fragment key={panel.id}>
                    <PanelResizeHandle className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-50 relative" />
                    <Panel defaultSize={panel.size} minSize={200} className="min-w-0 bg-panel relative flex flex-col">
                        <div className="flex justify-between items-center p-2 border-b border-border bg-surface text-xs font-semibold text-muted">
                            <span className="uppercase">{panel.content.type}</span>
                            <button onClick={() => removePanel(panel.id)} className="hover:bg-surface-hover rounded p-1">✕</button>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <Suspense fallback={<div style={{ padding: 20 }}>{t("common.loading")}</div>}>
                                {panel.content.type === "research" ? (
                                    <ResearchPanel
                                        activeTab={panel.content.tab || "character"}
                                        onClose={() => removePanel(panel.id)}
                                    />
                                ) : panel.content.type === "snapshot" && panel.content.snapshot ? (
                                    <SnapshotViewer
                                        snapshot={panel.content.snapshot}
                                        currentContent={
                                            chapters.find(
                                                (c) =>
                                                    c.projectId === currentProjectId &&
                                                    c.id === panel.content.snapshot?.chapterId,
                                            )?.content ?? ""
                                        }
                                        onApplySnapshotText={async (nextContent: string) => {
                                            const snapshotChapter = chapters.find(
                                                (c) =>
                                                    c.projectId === currentProjectId &&
                                                    c.id === panel.content.snapshot?.chapterId,
                                            );
                                            const targetChapterId = snapshotChapter?.id ?? activeChapterId;
                                            const targetTitle = snapshotChapter?.title ?? activeChapterTitle;
                                            if (!targetChapterId) return;
                                            await onSave(targetTitle, nextContent, targetChapterId);
                                        }}
                                    />
                                ) : panel.content.type === "export" ? (
                                    <ExportPreviewPanel title={activeChapterTitle} />
                                ) : (
                                    <div
                                        style={{
                                            height: "100%",
                                            overflow: "hidden",
                                            background: "var(--bg-primary)",
                                        }}
                                    >
                                        <Editor
                                            initialTitle={
                                                chapters.find((c) => c.id === panel.content.id)?.title
                                            }
                                            initialContent=""
                                            readOnly={true}
                                        />
                                    </div>
                                )}
                            </Suspense>
                        </div>
                    </Panel>
                </Fragment>
            ))}
        </>
    );
}

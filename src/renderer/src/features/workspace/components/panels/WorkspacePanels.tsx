import React, {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { Editor, useEditorStore } from "@renderer/domains/editor";
import { useChapterStore } from "@renderer/domains/manuscript";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { Chapter } from "@shared/types";
import { toPercentSize, toPxSize } from "@renderer/shared/constants/sidebarSizing";
import { EDITOR_DND_MIN_PANEL_WIDTH_PX } from "@renderer/shared/constants/editorLayout";
import { SPLIT_PANEL_MIN_SIZE_PERCENT } from "@renderer/shared/constants/layoutSizing";
import { WORKSPACE_PANEL_CLOSE_ANIMATION_MS } from "@renderer/features/workspace/constants/uiDefaults";
import {
  isProgrammaticLayoutChange,
  suppressLayoutPersistenceFor,
} from "@renderer/features/workspace/hooks/useLayoutPersist";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { RESEARCH_PANEL_MIN_WIDTH_PX } from "@renderer/features/workspace/stores/projectLayout/constants";

const ResearchPanel = React.lazy(() =>
  import("@renderer/domains/world").then((module) => ({
    default: module.ResearchPanel,
  })),
);
const SnapshotViewer = React.lazy(
  () => import("@renderer/features/snapshot/components/SnapshotViewer"),
);
const ExportPreviewPanel = React.lazy(() =>
  import("@renderer/domains/export").then((module) => ({
    default: module.ExportPreviewPanel,
  })),
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
  const setFocusedClosableTarget = useUIStore(
    (state) => state.setFocusedClosableTarget,
  );
  // NOTE: 스냅샷 복원 시 같은 챕터의 본문이 바뀌므로 리비전을 key에 넣어 Editor를 리마운트한다.
  const contentRevision = useChapterStore(
    (state) => state.contentRevision,
  );
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const uiMode = useEditorStore((state) => state.uiMode);
  // NOTE: close 애니메이션은 default 레이아웃의 분할 패널 전용. docs 등 다른 레이아웃의
  // 패널 동작을 바꾸지 않도록 게이트한다.
  const enableCloseAnimation = enableAnimations && uiMode === "default";
  const closingPanelRef = useRef<PanelImperativeHandle | null>(null);
  const [closingPanelId, setClosingPanelId] = useState<string | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NOTE: removePanel은 즉시 unmount시키므로, 애니메이션이 켜져 있으면 축소 transition을
  // 보여준 뒤 실제 제거한다. 0% 커밋이 researchPanelSizes에 저장되지 않게 지속화도 억제한다.
  const removePanelWithAnimation = useCallback(
    (panelId: string) => {
      if (!enableCloseAnimation) {
        removePanel(panelId);
        return;
      }
      setClosingPanelId(panelId);
      suppressLayoutPersistenceFor(WORKSPACE_PANEL_CLOSE_ANIMATION_MS + 160);
      if (closingTimerRef.current !== null) {
        clearTimeout(closingTimerRef.current);
      }
      closingTimerRef.current = setTimeout(() => {
        closingTimerRef.current = null;
        setClosingPanelId(null);
        removePanel(panelId);
      }, WORKSPACE_PANEL_CLOSE_ANIMATION_MS);
    },
    [enableCloseAnimation, removePanel],
  );

  // NOTE: data-panel-animated와 minSize 완화가 DOM에 커밋된 뒤에 resize해야 flex-grow
  // 변경이 transition과 만난다. 클릭 핸들러에서 동기로 resize하면 속성 적용 전이라
  // transition 없이 스냅된다.
  useLayoutEffect(() => {
    if (!closingPanelId) return undefined;
    const frameId = requestAnimationFrame(() => {
      closingPanelRef.current?.resize("0%");
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [closingPanelId]);

  // NOTE: cmd+W(closeFocusedSurface)로 닫는 분할 패널도 X 닫기와 동일한 close 애니메이션
  // 경로를 탄다. uiStore는 패널 애니메이션을 모르므로 이벤트로 위임받는다.
  // panels를 ref로 읽어 패널 목록이 바뀌어도 리스너를 재등록하지 않는다.
  const panelsRef = useRef(panels);
  useEffect(() => {
    panelsRef.current = panels;
  }, [panels]);
  useEffect(() => {
    const handleCloseWorkspacePanel = (event: Event) => {
      const panelId = (event as CustomEvent<{ panelId?: string }>).detail
        ?.panelId;
      if (!panelId || !panelsRef.current.some((panel) => panel.id === panelId)) {
        return;
      }
      removePanelWithAnimation(panelId);
    };
    window.addEventListener("luie:close-workspace-panel", handleCloseWorkspacePanel);
    return () => {
      window.removeEventListener(
        "luie:close-workspace-panel",
        handleCloseWorkspacePanel,
      );
    };
  }, [removePanelWithAnimation]);

  useEffect(
    () => () => {
      if (closingTimerRef.current !== null) {
        clearTimeout(closingTimerRef.current);
      }
    },
    [],
  );

  const currentProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  // NOTE: `hasHydrated`와 `upsertProjectLayout`은 커밋 콜백에서만 쓴다. 구독하면 hydration이
  // 끝나는 순간 이 subtree(research 패널 전체)가 리렌더되고, 콜백 identity가 바뀌어 아래
  // window listener까지 재등록된다. 호출 시점에 읽는다.
  const researchPanelWidthPx = useProjectLayoutStore((state) =>
    currentProjectId
      ? state.byProject[currentProjectId]?.workspace.byLayout.default
          .researchPanelWidthPx
      : undefined,
  );

  // NOTE: research 패널 폭은 px로 저장한다. minSize가 px 제약인데 %로 저장하면 내부 group 폭이
  // 바뀔 때 저장값이 px 바닥보다 작아지고, PanelGroup이 min으로 클램프한 값이 다시 저장되어
  // min에 고착된다. 실제 drag만 커밋하도록 idle 후 flush하고 프로그램적 resize는 건너뛴다.
  const pendingWidthPxRef = useRef<number | null>(null);
  const widthFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitResearchWidthPx = useCallback(() => {
    const widthPx = pendingWidthPxRef.current;
    pendingWidthPxRef.current = null;
    const projectId = currentProjectIdRef.current;
    if (widthPx === null || !projectId) return;
    const { hasHydrated, upsertProjectLayout } =
      useProjectLayoutStore.getState();
    if (!hasHydrated) return;
    upsertProjectLayout(projectId, {
      workspace: { byLayout: { default: { researchPanelWidthPx: widthPx } } },
    });
  }, []);

  // NOTE: Panel.onResize는 mount와 프로그램적 resize에서도 호출된다. 그 값을 저장하면 패널이
  // min으로 뜬 순간의 폭이 기록되어 min에 고착된다. `useSidebarResizeCommit`과 동일하게 실제
  // 포인터/키보드 조작 중에만 기록하고, 조작이 끝날 때 커밋한다.
  const isResizingResearchRef = useRef(false);

  const beginResearchResize = useCallback(() => {
    isResizingResearchRef.current = true;
  }, []);

  const endResearchResize = useCallback(() => {
    if (!isResizingResearchRef.current) return;
    isResizingResearchRef.current = false;
    if (widthFlushTimerRef.current !== null) {
      clearTimeout(widthFlushTimerRef.current);
      widthFlushTimerRef.current = null;
    }
    commitResearchWidthPx();
  }, [commitResearchWidthPx]);

  /** group이 마지막으로 보고한 실제 폭. 복원 적용이 필요한지 판단하는 기준이다. */
  const liveWidthPxRef = useRef<number | null>(null);
  const researchPanelRef = useRef<PanelImperativeHandle | null>(null);

  const handleResearchPanelResize = useCallback((panelSize: PanelSize) => {
    const widthPx = panelSize.inPixels;
    if (typeof widthPx !== "number" || !Number.isFinite(widthPx)) return;
    liveWidthPxRef.current = widthPx;
    if (!isResizingResearchRef.current) return;
    if (isProgrammaticLayoutChange()) return;
    if (widthPx < RESEARCH_PANEL_MIN_WIDTH_PX) return;
    pendingWidthPxRef.current = Math.round(widthPx);
  }, []);

  // NOTE: PanelGroup은 layout을 panel id 조합별로 캐싱하고(`mutableState.layouts[ids]`) 그 캐시가
  // `defaultSize`보다 우선한다. 또 `defaultSize`는 mount 시점에만 읽힌다. 그래서 저장 폭을
  // panel handle로 직접 적용해야 재오픈/재시작 후에도 그 폭으로 서빙된다.
  // 사용자 drag가 만든 폭은 이미 반영돼 있으므로 실제 폭과 다를 때만 적용한다.
  const hasResearchPanel = panels.some(
    (panel) => panel.content.type === "research",
  );
  useEffect(() => {
    if (!hasResearchPanel || researchPanelWidthPx === undefined) return;
    if (isResizingResearchRef.current) return;

    const liveWidthPx = liveWidthPxRef.current;
    if (liveWidthPx !== null && Math.abs(liveWidthPx - researchPanelWidthPx) < 2) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const panel = researchPanelRef.current;
      if (!panel) return;
      try {
        panel.resize(toPxSize(researchPanelWidthPx));
      } catch {
        // Panel이 group layout에 아직 등록되지 않으면 throw한다. 다음 layout 변화에서 재시도된다.
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [hasResearchPanel, researchPanelWidthPx]);

  // NOTE: handler를 ref로 넘겨 listener를 mount당 한 번만 등록한다. deps에 콜백을 넣으면
  // 콜백 identity가 바뀔 때마다 전역 listener가 해제/재등록된다.
  const endResearchResizeRef = useRef(endResearchResize);
  useEffect(() => {
    endResearchResizeRef.current = endResearchResize;
  }, [endResearchResize]);

  useEffect(() => {
    const handlePointerEnd = () => {
      endResearchResizeRef.current();
    };
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      if (widthFlushTimerRef.current !== null) {
        clearTimeout(widthFlushTimerRef.current);
        widthFlushTimerRef.current = null;
      }
      endResearchResizeRef.current();
    };
  }, []);

  return (
    <>
      {panels.map((panel) => {
        const isResearchPanel = panel.content.type === "research";
        const isEditorPanel = panel.content.type === "editor";
        const snapshot =
          panel.content.type === "snapshot"
            ? panel.content.snapshot
            : undefined;
        const snapshotChapter = snapshot
          ? chapters.find(
              (chapter) =>
                chapter.projectId === currentProjectId &&
                chapter.id === snapshot.chapterId,
            )
          : undefined;
        const editorChapter =
          panel.content.type === "editor"
            ? chapters.find((chapter) => chapter.id === panel.content.id)
            : undefined;

        return (
          <Fragment key={panel.id}>
            <PanelResizeHandle
              className="relative z-50 w-0 cursor-col-resize"
              onPointerDown={isResearchPanel ? beginResearchResize : undefined}
              onPointerUp={isResearchPanel ? endResearchResize : undefined}
              onPointerCancel={isResearchPanel ? endResearchResize : undefined}
              onBlur={isResearchPanel ? endResearchResize : undefined}
              onKeyDown={isResearchPanel ? beginResearchResize : undefined}
              onKeyUp={isResearchPanel ? endResearchResize : undefined}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>
            <Panel
              id={panel.id}
              panelRef={
                closingPanelId === panel.id
                  ? closingPanelRef
                  : isResearchPanel
                    ? researchPanelRef
                    : undefined
              }
              data-panel-animated={
                closingPanelId === panel.id ? "true" : undefined
              }
              groupResizeBehavior="preserve-pixel-size"
              defaultSize={
                isResearchPanel && researchPanelWidthPx !== undefined
                  ? toPxSize(researchPanelWidthPx)
                  : toPercentSize(panel.size)
              }
              onResize={isResearchPanel ? handleResearchPanelResize : undefined}
              minSize={
                closingPanelId === panel.id
                  ? "0%"
                  : isResearchPanel
                    ? "470px"
                    : isEditorPanel
                      ? `${EDITOR_DND_MIN_PANEL_WIDTH_PX}px`
                      : SPLIT_PANEL_MIN_SIZE_PERCENT
              }
              onMouseDownCapture={() => {
                setFocusedClosableTarget({ kind: "panel", id: panel.id });
              }}
              className={`min-w-0 relative flex flex-col ${
                isResearchPanel || panel.content.type === "snapshot" || isEditorPanel
                  ? "bg-research border-0 outline-none"
                  : "bg-panel"
              }`}
            >
              <div
                className={`flex h-12 shrink-0 items-center px-4 pr-12 ${
                  isResearchPanel || panel.content.type === "snapshot" || isEditorPanel
                    ? "bg-research border-0 outline-none"
                    : "border-b border-border bg-sidebar"
                }`}
              >
                {isResearchPanel ? (
                  <>
                    <BookOpen
                      className="icon-sm shrink-0 text-muted"
                      aria-hidden="true"
                    />
                    <h1 className="ml-2 text-sm font-semibold text-fg">
                      {t("sidebar.section.research", "자료")}
                    </h1>
                  </>
                ) : (
                  <span className="text-xs font-medium text-muted">
                    {panel.content.type}
                  </span>
                )}
                {!isResearchPanel && !isEditorPanel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedClosableTarget({ kind: "panel", id: panel.id });
                      removePanelWithAnimation(panel.id);
                    }}
                    className="ml-auto flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={t("sidebar.toggle.close")}
                    title={t("sidebar.toggle.close")}
                  >
                    <X className="icon-sm" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-hidden relative">
                <Suspense
                  fallback={<div style={{ padding: 20 }}>{t("loading")}</div>}
                >
                  {isResearchPanel ? (
                    <ResearchPanel
                      activeTab={panel.content.tab || "character"}
                      onClose={() => removePanelWithAnimation(panel.id)}
                    />
                  ) : snapshot ? (
                    <SnapshotViewer
                      snapshot={snapshot}
                      currentContent={snapshotChapter?.content ?? ""}
                      onApplySnapshotText={async (nextContent: string) => {
                        const targetChapterId =
                          snapshotChapter?.id ?? activeChapterId;
                        const targetTitle =
                          snapshotChapter?.title ?? activeChapterTitle;
                        if (!targetChapterId) return;
                        await onSave(targetTitle, nextContent, targetChapterId);
                      }}
                    />
                  ) : panel.content.type === "export" ? (
                    <ExportPreviewPanel title={activeChapterTitle} />
                  ) : (
                    <div
                      className="research-surface h-full overflow-hidden border-0 outline-none"
                    >
                      <Editor
                        key={`dnd-editor-${editorChapter?.id ?? panel.id}-${contentRevision}`}
                        initialTitle={editorChapter?.title ?? ""}
                        initialContent={editorChapter?.content ?? ""}
                        chapterId={editorChapter?.id}
                        readOnly={false}
                        hideToolbar={true}
                        hideFooter={true}
                        onSave={
                          editorChapter
                            ? (title, content) =>
                                onSave(title, content, editorChapter.id)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </Suspense>
              </div>
            </Panel>
          </Fragment>
        );
      })}
    </>
  );
}

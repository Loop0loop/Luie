// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalysisSection from "../../src/renderer/src/features/research/components/AnalysisSection.js";
import { useChapterStore } from "../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useAnalysisStore } from "../../src/renderer/src/features/research/stores/analysisStore.js";

// 커스텀 훅 모킹
vi.mock("../../src/renderer/src/features/research/components/analysisSection/runtime/useAnalysisRuntime.js", () => ({
  useAnalysisRuntime: () => ({
    runtimeInfo: {
      status: "running",
      version: "1.0.0",
      memoryUsage: 1024,
    },
    sidecarStatus: "running",
    runtimePreference: "auto",
    applyRuntimePreference: vi.fn(),
    searchOptimizationMode: "standard",
    applySearchOptimizationMode: vi.fn(),
  }),
}));

vi.mock("../../src/renderer/src/features/research/components/analysisSection/useMemoryEvalPanel.js", () => ({
  useMemoryEvalPanel: () => ({
    showMemoryEvalReport: false,
    memoryEvalLoading: false,
    memoryEvalError: null,
    memoryEvalReport: null,
    intentCalibrationReport: null,
    episodeCalibrationReport: null,
    setShowMemoryEvalReport: vi.fn(),
    handleRunMemoryEval: vi.fn(),
    handleRunIntentCalibration: vi.fn(),
    handleRunEpisodeCalibration: vi.fn(),
  }),
}));

vi.mock("../../src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewPanels.js", () => ({
  useMemoryReviewPanels: () => ({
    showConflictQueue: false,
    conflictLoading: false,
    conflictError: null,
    conflictItems: [],
    resolvingConflictId: null,
    setShowConflictQueue: vi.fn(),
    handleResolveConflict: vi.fn(),

    showEpisodeReview: false,
    episodeReviewLoading: false,
    episodeReviewError: null,
    episodeReviewItems: [],
    rejectingEpisodeId: null,
    setShowEpisodeReview: vi.fn(),
    handleRejectEpisode: vi.fn(),

    showFactReview: false,
    factReviewLoading: false,
    factReviewError: null,
    factReviewItems: [],
    mutatingFactId: null,
    setShowFactReview: vi.fn(),
    handleConfirmFact: vi.fn(),
    handleRejectFact: vi.fn(),

    showEntityReview: false,
    entityReviewLoading: false,
    entityReviewError: null,
    entityReviewItems: [],
    mutatingEntityId: null,
    setShowEntityReview: vi.fn(),
    handleConfirmEntity: vi.fn(),
    handleRejectEntity: vi.fn(),

    showEntityAliasReview: false,
    entityAliasReviewLoading: false,
    entityAliasReviewError: null,
    entityAliasReviewItems: [],
    mutatingAliasId: null,
    setShowEntityAliasReview: vi.fn(),
    handleConfirmEntityAlias: vi.fn(),
    handleRejectEntityAlias: vi.fn(),
    handleMergeEntityAlias: vi.fn(),
    handleSplitEntityAlias: vi.fn(),

    showNarrativeSummaryStatus: true,
    narrativeSummaryStatusLoading: false,
    narrativeSummaryStatusError: null,
    narrativeSummaryStatus: {
      totalCount: 5,
      staleCount: 1,
      byType: { character: 3, plot: 2 },
      summaries: [
        {
          id: "summary-1",
          title: "주인공의 결심",
          scopeType: "chapter",
          scopeId: "chapter-1",
          summaryType: "character",
          isStale: false,
          sourceCount: 2,
          confidence: 90,
          status: "confirmed",
          summary: "주인공은 모험을 떠나기로 결심한다.",
        },
      ],
    },
    setShowNarrativeSummaryStatus: vi.fn(),
  }),
}));

vi.mock("../../src/renderer/src/features/research/components/analysisSection/chat/useRagChat.js", () => ({
  useRagChat: () => ({
    messages: [],
    input: "",
    setInput: vi.fn(),
    isStreaming: false,
    handleSend: vi.fn(),
    handleStop: vi.fn(),
    handleKeyDown: vi.fn(),
    handleJumpEvidence: vi.fn(),
    bottomRef: { current: null },
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

const clickElement = async (element: Element | null): Promise<void> => {
  if (!element) {
    throw new Error("Element not found");
  }
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const readRenderedText = (container: HTMLElement): string =>
  `${container.textContent ?? ""} ${document.body.textContent ?? ""}`;

const textContainsAny = (text: string, values: string[]): boolean =>
  values.some((value) => text.includes(value));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

describe("AnalysisViewMode", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    resetStore(useAnalysisStore as unknown as ResettableStore);
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";

    resetStore(useChapterStore as unknown as ResettableStore);
    resetStore(useProjectStore as unknown as ResettableStore);

    useChapterStore.setState({
      currentItem: {
        id: "chapter-1",
        title: "테스트 챕터",
      },
    });

    useProjectStore.setState({
      currentItem: {
        id: "project-1",
        title: "테스트 프로젝트",
      },
    });
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("removes 6 panels (ConflictQueuePanel, EpisodeReviewPanel, etc.) and keeps NarrativeSummaryStatusPanel", () => {
    const view = mountView(<AnalysisSection />);
    mountedViews.push(view);

    // 6개 패널의 타이틀 텍스트
    const removedPanelTitles = [
      "충돌 큐",
      "검토할 별칭",
      "검토할 엔티티",
      "검토할 에피소드",
      "검토할 사실",
      "메모리 평가",
    ];

    removedPanelTitles.forEach((title) => {
      const hasText = view.container.textContent?.includes(title) || 
                      document.body.textContent?.includes(title);
      expect(hasText).toBeFalsy();
    });

    // NarrativeSummaryStatusPanel의 타이틀 "서사 요약"은 유지되어야 함
    const renderedText = readRenderedText(view.container);
    const hasNarrativeSummary = textContainsAny(renderedText, [
      "서사 요약",
      "analysis.review.summary.title",
    ]);
    expect(hasNarrativeSummary).toBeTruthy();
  });

  it("renders viewMode (fixView/floatingView) toggle button in AnalysisSection", () => {
    const view = mountView(<AnalysisSection />);
    mountedViews.push(view);

    // 전환 토글 버튼 검증 (data-testid="view-mode-toggle")
    const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                         document.body.querySelector('[data-testid="view-mode-toggle"]');
    expect(toggleButton).toBeTruthy();
  });

  it("shows RAG search mode choices with low-end trade-off copy in the composer menu", async () => {
    const view = mountView(<AnalysisSection />);
    mountedViews.push(view);

    const optionButton =
      view.container.querySelector('button[title="옵션"]') ||
      view.container.querySelector('button[title="analysis.composer.options"]') ||
      document.body.querySelector('button[title="옵션"]') ||
      document.body.querySelector('button[title="analysis.composer.options"]');
    await clickElement(optionButton);

    const text = readRenderedText(view.container);
    expect(text).toContain("Search Mode");
    expect(text).toContain("Low-end");
    expect(
      (text.includes("빠른 검색") && text.includes("근거 폭 좁음")) ||
        text.includes("analysis.composer.searchModes.lowEnd"),
    ).toBeTruthy();
  });

  it("mounts to document.body via React Portal when in floatingView mode", async () => {
    const view = mountView(<AnalysisSection />);
    mountedViews.push(view);

    // 1. 기본 fixView 모드: 콘텐츠 영역이 원래 컨테이너 내부에 존재함
    const content = view.container.querySelector('[data-testid="analysis-section-content"]') ||
                    document.querySelector('[data-testid="analysis-section-content"]');
    expect(content).toBeTruthy();
    
    // fixView일 때 content는 원래 container의 내부에 위치
    expect(view.container.contains(content)).toBe(true);

    // 2. 토글 버튼 클릭하여 floatingView로 변경
    const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                         document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton);

    // 3. floatingView 모드: Portal을 통해 document.body에 직접 마운트됨
    const floatingContent = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContent).toBeTruthy();
    // body의 직속 자식에 가깝거나, 원래 container 외부(body 하위)에 존재해야 함
    expect(view.container.contains(floatingContent)).toBe(false);
    expect(document.body.contains(floatingContent)).toBe(true);
  });

  it("mocks Pointer Capture API based dragging on the header in floatingView mode", async () => {
    // Element 프로토타입에 setPointerCapture 및 releasePointerCapture mock 주입
    const setPointerCaptureSpy = vi.fn();
    const releasePointerCaptureSpy = vi.fn();

    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = setPointerCaptureSpy;
    Element.prototype.releasePointerCapture = releasePointerCaptureSpy;

    try {
      const view = mountView(<AnalysisSection />);
      mountedViews.push(view);

      // floatingView 모드로 전환
      const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                           document.body.querySelector('[data-testid="view-mode-toggle"]');
      await clickElement(toggleButton);

      // 헤더 영역과 플로팅 컨테이너 탐색
      const header = document.body.querySelector('[data-testid="analysis-header"]');
      const floatingContainer = document.body.querySelector('[data-testid="analysis-floating-container"]') as HTMLElement;

      expect(header).toBeTruthy();
      expect(floatingContainer).toBeTruthy();

      // 1. pointerdown 이벤트 시뮬레이션
      await act(async () => {
        header?.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            pointerId: 1,
            clientX: 100,
            clientY: 100,
          })
        );
      });
      // setPointerCapture가 pointerId와 함께 호출되었는지 확인
      expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);

      // 2. pointermove (drag) 이벤트 시뮬레이션 (deltaX: 50, deltaY: 20)
      await act(async () => {
        header?.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            pointerId: 1,
            clientX: 150,
            clientY: 120,
          })
        );
      });

      // 스타일이 드래그 거리에 맞춰 변경되었는지 확인
      // 컴포넌트 구현에 따라 style.transform(translate(50px, 20px)) 또는 style.top / style.left 등이 적용되어야 함
      const transformStyle = floatingContainer.style.transform;
      const topStyle = floatingContainer.style.top;
      const leftStyle = floatingContainer.style.left;

      const hasTransform = transformStyle.includes("50px") || transformStyle.includes("20px");
      const hasTopLeft = topStyle.includes("px") || leftStyle.includes("px");

      expect(hasTransform || hasTopLeft).toBeTruthy();

      // 3. pointerup 이벤트 시뮬레이션
      await act(async () => {
        header?.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            pointerId: 1,
          })
        );
      });
      // releasePointerCapture가 pointerId와 함께 호출되었는지 확인
      expect(releasePointerCaptureSpy).toHaveBeenCalledWith(1);

    } finally {
      // mock 복구
      Element.prototype.setPointerCapture = originalSetPointerCapture;
      Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    }
  });

  it("unmounts the floating view portal when AnalysisSection is unmounted during tab transition", async () => {
    // 1. AnalysisSection 마운트
    const view = mountView(<AnalysisSection />);
    
    // 2. floatingView 모드로 전환
    const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                         document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton);

    // 3. floatingView가 document.body에 마운트되었는지 검증
    const floatingContentBefore = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentBefore).toBeTruthy();

    // 4. 탭 전환을 모사하여 AnalysisSection을 언마운트 (다른 탭으로 이동)
    unmountView(view);

    // 5. 언마운트 후 document.body에서 floatingView가 사라졌는지(소멸되었는지) 검증
    const floatingContentAfter = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentAfter).toBeNull();
  });

  it("restores the floatingView mode when switching back to the Analysis tab via store state preservation", async () => {
    // 1. AnalysisSection 마운트
    const view1 = mountView(<AnalysisSection />);
    
    // 2. floatingView 모드로 전환
    const toggleButton1 = view1.container.querySelector('[data-testid="view-mode-toggle"]') ||
                          document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton1);

    // store가 'floatingView' 상태인지 확인
    expect(useAnalysisStore.getState().viewMode).toBe("floatingView");

    // 3. 다른 탭으로 이동하는 상황 모사 (언마운트)
    unmountView(view1);
    expect(document.body.querySelector('[data-testid="analysis-section-content"]')).toBeNull();

    // 4. 다시 Analysis 탭으로 복귀하는 상황 모사 (재마운트)
    const view2 = mountView(<AnalysisSection />);
    
    // 5. 복귀했을 때 자동으로 floatingView 모드로 렌더링되어 Portal 마운트가 완료되었는지 검증
    const floatingContentAfterReturn = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentAfterReturn).toBeTruthy();
    expect(view2.container.contains(floatingContentAfterReturn)).toBe(false); // Portal 확인

    // Cleanup
    unmountView(view2);
  });
});

// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalysisSection from "../../src/renderer/src/features/research/components/AnalysisSection.js";
import { useChapterStore } from "../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useAnalysisStore } from "../../src/renderer/src/features/research/stores/analysisStore.js";

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

  it("keeps review tab focused on NarrativeSummaryStatusPanel", async () => {
    useAnalysisStore.setState({
      showNarrativeSummaryStatus: true,
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
    });

    const view = mountView(<AnalysisSection />);
    mountedViews.push(view);

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

    const reviewTabButton = view.container.querySelectorAll('[role="tab"]')[1];
    await clickElement(reviewTabButton);

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

    const content = view.container.querySelector('[data-testid="analysis-section-content"]') ||
                    document.querySelector('[data-testid="analysis-section-content"]');
    expect(content).toBeTruthy();
    
    expect(view.container.contains(content)).toBe(true);

    const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                         document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton);

    const floatingContent = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContent).toBeTruthy();
    expect(view.container.contains(floatingContent)).toBe(false);
    expect(document.body.contains(floatingContent)).toBe(true);
  });

  it("mocks Pointer Capture API based dragging on the header in floatingView mode", async () => {
    const setPointerCaptureSpy = vi.fn();
    const releasePointerCaptureSpy = vi.fn();

    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = setPointerCaptureSpy;
    Element.prototype.releasePointerCapture = releasePointerCaptureSpy;

    try {
      const view = mountView(<AnalysisSection />);
      mountedViews.push(view);

      const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                           document.body.querySelector('[data-testid="view-mode-toggle"]');
      await clickElement(toggleButton);

      const header = document.body.querySelector('[data-testid="analysis-header"]');
      const floatingContainer = document.body.querySelector('[data-testid="analysis-floating-container"]') as HTMLElement;

      expect(header).toBeTruthy();
      expect(floatingContainer).toBeTruthy();

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
      expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);

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

      const transformStyle = floatingContainer.style.transform;
      const topStyle = floatingContainer.style.top;
      const leftStyle = floatingContainer.style.left;

      const hasTransform = transformStyle.includes("50px") || transformStyle.includes("20px");
      const hasTopLeft = topStyle.includes("px") || leftStyle.includes("px");

      expect(hasTransform || hasTopLeft).toBeTruthy();

      await act(async () => {
        header?.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            pointerId: 1,
          })
        );
      });
      expect(releasePointerCaptureSpy).toHaveBeenCalledWith(1);

    } finally {
      Element.prototype.setPointerCapture = originalSetPointerCapture;
      Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    }
  });

  it("unmounts the floating view portal when AnalysisSection is unmounted during tab transition", async () => {
    const view = mountView(<AnalysisSection />);
    
    const toggleButton = view.container.querySelector('[data-testid="view-mode-toggle"]') ||
                         document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton);

    const floatingContentBefore = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentBefore).toBeTruthy();

    unmountView(view);

    const floatingContentAfter = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentAfter).toBeNull();
  });

  it("restores the floatingView mode when switching back to the Analysis tab via store state preservation", async () => {
    const view1 = mountView(<AnalysisSection />);
    
    const toggleButton1 = view1.container.querySelector('[data-testid="view-mode-toggle"]') ||
                          document.body.querySelector('[data-testid="view-mode-toggle"]');
    await clickElement(toggleButton1);

    expect(useAnalysisStore.getState().viewMode).toBe("floatingView");

    unmountView(view1);
    expect(document.body.querySelector('[data-testid="analysis-section-content"]')).toBeNull();

    const view2 = mountView(<AnalysisSection />);
    
    const floatingContentAfterReturn = document.body.querySelector('[data-testid="analysis-section-content"]');
    expect(floatingContentAfterReturn).toBeTruthy();
    expect(view2.container.contains(floatingContentAfterReturn)).toBe(false);

    unmountView(view2);
  });
});

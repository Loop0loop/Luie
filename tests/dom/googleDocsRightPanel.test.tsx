// @vitest-environment jsdom

import { act, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PanelProps = {
  children?: ReactNode;
  defaultSize?: unknown;
  id?: string;
  panelRef?: { current: unknown };
};

const renderedPanelProps: PanelProps[] = [];
const mountCounts = vi.hoisted(() => ({
  panel: 0,
  research: 0,
  world: 0,
}));
const resizeCalls = vi.hoisted(() => [] as unknown[]);

const mockedEditorStore = vi.hoisted(() => ({
  enableAnimations: false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Panel: ({ children, defaultSize, id, panelRef }: PanelProps) => {
    // 렌더가 아니라 "마운트"만 센다 — key 리마운트 검출이 목적이다.
    useEffect(() => {
      mountCounts.panel += 1;
    }, []);
    renderedPanelProps.push({ children, defaultSize, id });
    // 실제 라이브러리처럼 panelRef에 imperative handle을 넣어 resize 호출을 기록한다.
    useEffect(() => {
      if (panelRef) {
        panelRef.current = {
          isCollapsed: () => false,
          resize: (size: unknown) => {
            resizeCalls.push(size);
          },
        };
        return () => {
          panelRef.current = null;
        };
      }
      return undefined;
    }, [panelRef]);
    return <div data-testid={id}>{children}</div>;
  },
  Separator: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: mockedEditorStore.enableAnimations }),
}));

vi.mock("@renderer/features/research/components/ResearchPanel", () => ({
  default: function MockResearchPanel() {
    useEffect(() => {
      mountCounts.research += 1;
    }, []);
    return <div>ResearchPanel</div>;
  },
}));

vi.mock("@renderer/features/research/components/WorldPanel", () => ({
  default: function MockWorldPanel() {
    useEffect(() => {
      mountCounts.world += 1;
    }, []);
    return <div>WorldPanel</div>;
  },
}));

vi.mock("@renderer/features/snapshot/components/SnapshotList", () => ({
  SnapshotList: () => <div>SnapshotList</div>,
}));

vi.mock("@renderer/features/trash/components/TrashList", () => ({
  TrashList: () => <div>TrashList</div>,
}));

vi.mock("@renderer/features/export/components/ExportPreviewPanel", () => ({
  default: () => <div>ExportPreviewPanel</div>,
}));

vi.mock("@renderer/features/editor/components/Editor", () => ({
  default: () => <div>Editor</div>,
}));

import { GoogleDocsRightPanel } from "../../src/renderer/src/features/workspace/components/layout/GoogleDocsRightPanel.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = async (element: ReactNode): Promise<MountedView> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
    await Promise.resolve();
    await Promise.resolve();
  });

  return { container, root };
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// 탭 전환 비율 적용은 이중 rAF 안에서 resize로 일어난다. 프레임을 실제로 소진한다.
const flushFrames = async () => {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
};

const baseProps = {
  activeChapterContent: "chapter content",
  activeChapterId: "chapter-1",
  activeChapterTitle: "Chapter 1",
  activePanelSurface: "docs.panel.world",
  closeRightPanel: vi.fn(),
  currentProjectId: "project-1",
  onFocus: vi.fn(),
  onRefreshTrash: vi.fn(),
  onSaveChapter: vi.fn(),
  rightPanelSize: {
    minSize: "22.222%",
    maxSize: "52.778%",
  },
  trashRefreshKey: 0,
};

describe("GoogleDocsRightPanel", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    renderedPanelProps.length = 0;
    resizeCalls.length = 0;
    mountCounts.panel = 0;
    mountCounts.research = 0;
    mountCounts.world = 0;
    mockedEditorStore.enableAnimations = false;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
    document.body.innerHTML = "";
  });

  it("uses the current tab ratio when switching tabs", async () => {
    const view = await mountView(
      <GoogleDocsRightPanel
        {...baseProps}
        activeRightTab="world"
        rightPanelRatio={26}
      />,
    );
    mountedViews.push(view);

    await flushEffects();

    expect(
      renderedPanelProps[renderedPanelProps.length - 1]?.defaultSize,
    ).toBe("26%");

    await act(async () => {
      view.root.render(
        <GoogleDocsRightPanel
          {...baseProps}
          activePanelSurface="docs.panel.character"
          activeRightTab="character"
          rightPanelRatio={38}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await flushEffects();

    expect(
      renderedPanelProps[renderedPanelProps.length - 1]?.defaultSize,
    ).toBe("38%");
  });

  it("keeps the Panel element mounted when switching tabs and lets the group cache own widths", async () => {
    // ISTQB 근거 설명:
    // 리스크 = 탭 전환마다 <Panel key={renderedTab}>이 react-resizable-panels Panel과
    // 하위 Suspense 트리 전체를 파괴/재생성해 전환 비용이 커지고 폭이 튄다.
    // 증명 = (1) 탭을 3번 바꿔도 Panel 마운트 카운트는 1이고, (2) 폭은 PanelGroup의
    // id 조합 캐시가 소유하므로 imperative resize 호출이 없어야 하며, (3) Panel id는
    // 표면 슬롯을 따른다.
    const view = await mountView(
      <GoogleDocsRightPanel
        {...baseProps}
        activeRightTab="character"
        rightPanelRatio={26}
      />,
    );
    mountedViews.push(view);
    await flushEffects();
    expect(mountCounts.panel).toBe(1);
    expect(mountCounts.research).toBe(1);

    const rerender = async (tab: string, ratio: number, surface: string) => {
      await act(async () => {
        view.root.render(
          <GoogleDocsRightPanel
            {...baseProps}
            activePanelSurface={surface}
            activeRightTab={tab as never}
            rightPanelRatio={ratio}
          />,
        );
        await Promise.resolve();
        await Promise.resolve();
      });
      await flushEffects();
    };

    await rerender("world", 30, "docs.panel.world");
    await rerender("faction", 34, "docs.panel.character");
    await flushFrames();

    // (1) 탭 3번 전환 동안 Panel은 리마운트되지 않는다.
    expect(mountCounts.panel).toBe(1);
    // (2) resize로 폭을 덮어쓰지 않는다 — id 조합 캐시(마지막 폭)가 우선해야
    //     "탭별 폭 기억"이 유지된다(스냅샷 폭 회귀 회귀 방지).
    expect(resizeCalls).toEqual([]);
    // (3) research 계열 탭(character/world/faction)은 모두 같은 표면 슬롯을 쓴다 —
    // 탭 전환과 무관하게 Panel id가 불변이라 라이브러리 레이아웃 캐시도 안정적이다.
    const observedIds = new Set(
      renderedPanelProps.map((props) => props.id ?? ""),
    );
    expect(observedIds.has("right-context-panel-research")).toBe(true);
  });
});

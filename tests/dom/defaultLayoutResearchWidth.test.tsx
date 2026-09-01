// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// handleOpenSnapshot은 전문 없는 스냅샷 참조를 개별 조회로 해소한다 (snapshotListProjection 참조).
vi.mock("@shared/api", () => ({
  api: {
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    snapshot: {
      get: vi.fn(async (id: string) => ({
        success: true,
        data: {
          id,
          projectId: PROJECT_ID,
          chapterId: "chapter-1",
          content: "restored body",
          createdAt: "2026-01-01T00:00:00Z",
        },
      })),
    },
  },
}));

import { useSplitView } from "../../src/renderer/src/features/workspace/hooks/useSplitView.js";
import { useProjectLayoutPersistence } from "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useProjectLayoutStore } from "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";
import { DEFAULT_RESEARCH_PANEL_SIZE } from "../../src/renderer/src/features/workspace/stores/projectLayout/constants.js";

const PROJECT_ID = "project-1";

type SplitView = ReturnType<typeof useSplitView>;

/** useSplitView를 실제로 mount해 action을 노출한다. */
const mountSplitView = async () => {
  let api: SplitView | null = null;

  function Harness() {
    api = useSplitView("chapter-1");
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Harness />);
    await Promise.resolve();
  });

  return {
    call: async (fn: (view: SplitView) => void) => {
      await act(async () => {
        if (api) fn(api);
        await Promise.resolve();
      });
    },
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const researchPanel = () =>
  useUIStore.getState().panels.find((p) => p.content.type === "research");

describe("default layout research panels share one width", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    useEditorStore.setState({ uiMode: "default" });
    useProjectStore.setState({
      currentItem: { id: PROJECT_ID },
    } as never);
    useUIStore.setState({ panels: [] });
    useProjectLayoutStore.setState({ hasHydrated: true, byProject: {} });
  });

  it("opens every research tab at the single saved width", async () => {
    useProjectLayoutStore.getState().upsertProjectLayout(PROJECT_ID, {
      workspace: { byLayout: { default: { researchPanelSize: 42 } } },
    });

    const view = await mountSplitView();
    const tabs = [
      "character",
      "event",
      "faction",
      "world",
      "scrap",
      "plotboard",
      "untitled",
      "analysis",
    ] as const;

    for (const tab of tabs) {
      await act(async () => {
        useUIStore.setState({ panels: [] });
      });
      await view.call((api) => api.handleSelectResearchItem(tab));
      expect(researchPanel()?.size, `tab "${tab}" opened at wrong width`).toBe(
        42,
      );
    }

    view.cleanup();
  });

  it("keeps the width when switching between research tabs", async () => {
    // 예전 탭별 폭이 남아 있어도 따라가지 않아야 한다.
    useProjectLayoutStore.getState().upsertProjectLayout(PROJECT_ID, {
      workspace: {
        byLayout: {
          default: {
            researchPanelSizes: {
              plotboard: 80,
              untitled: 25,
              world: 33,
              analysis: 70,
            },
          },
        },
      },
    });

    const view = await mountSplitView();

    await view.call((api) => api.handleSelectResearchItem("character"));
    const panelId = researchPanel()?.id;
    // 사용자가 폭을 조정한다.
    await act(async () => {
      if (panelId) useUIStore.getState().updatePanelSize(panelId, 61);
    });
    expect(researchPanel()?.size).toBe(61);

    for (const tab of ["plotboard", "untitled", "world", "analysis"] as const) {
      await view.call((api) => api.handleSelectResearchItem(tab));
      expect(researchPanel()?.content.tab, "tab did not switch").toBe(tab);
      expect(researchPanel()?.size, `width jumped on "${tab}"`).toBe(61);
    }

    view.cleanup();
  });

  it("ignores stale legacy per-tab widths once a shared width exists", async () => {
    useProjectLayoutStore.getState().upsertProjectLayout(PROJECT_ID, {
      workspace: {
        byLayout: {
          default: {
            researchPanelSize: 42,
            researchPanelSizes: { plotboard: 80, character: 20 },
          },
        },
      },
    });

    const view = await mountSplitView();
    await view.call((api) => api.handleSelectResearchItem("plotboard"));

    expect(researchPanel()?.size).toBe(42);
    view.cleanup();
  });

  it("opens at a sensible default instead of filling the whole group", async () => {
    const view = await mountSplitView();
    await view.call((api) => api.handleSelectResearchItem("character"));

    // 100/panels.length 균등분할에 맡기면 100%가 되어 원고가 minSize까지 밀린다.
    expect(researchPanel()?.size).toBe(DEFAULT_RESEARCH_PANEL_SIZE);
    view.cleanup();
  });

  it("keeps the width when a sibling panel is closed", async () => {
    const view = await mountSplitView();

    await view.call((api) => api.handleSelectResearchItem("character"));
    const panelId = researchPanel()?.id ?? "";
    await act(async () => {
      useUIStore.getState().updatePanelSize(panelId, 61);
    });
    expect(researchPanel()?.size).toBe(61);

    await view.call((api) =>
      api.handleOpenSnapshot({ id: "snap-1", chapterId: "chapter-1" } as never),
    );
    // 전문 해소 조회(비동기)가 끝난 뒤 패널이 추가된다.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const snapshotId =
      useUIStore.getState().panels.find((p) => p.content.type === "snapshot")
        ?.id ?? "";
    expect(snapshotId).not.toBe("");

    await view.call((api) => api.removePanel(snapshotId));

    // 다른 패널을 닫는다고 research 폭이 재분배되면 안 된다.
    expect(researchPanel()?.size).toBe(61);
    view.cleanup();
  });

  it("close one tab then open another serves the width from the last close", async () => {
    // 이 시나리오는 실제 저장/복원을 거쳐야 하므로 persistence hook도 함께 mount한다.
    let api: SplitView | null = null;
    function Harness() {
      useProjectLayoutPersistence(PROJECT_ID, "default");
      api = useSplitView("chapter-1");
      return null;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
    });

    const settle = async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });
    };
    const run = async (fn: (v: SplitView) => void) => {
      await act(async () => {
        if (api) fn(api);
        await Promise.resolve();
      });
      await settle();
    };
    const widen = async (size: number) => {
      const id = researchPanel()?.id ?? "";
      await act(async () => {
        useUIStore.getState().updatePanelSize(id, size);
      });
      await settle();
    };
    const close = async () =>
      run((v) => v.removePanel(researchPanel()?.id ?? ""));

    await settle();

    await run((v) => v.handleSelectResearchItem("character"));
    await widen(75);
    await close();

    await run((v) => v.handleSelectResearchItem("event"));
    expect(researchPanel()?.size).toBe(75);

    await widen(55);
    await close();

    // 직전에 닫은 폭(55)이어야 한다. 전전값 75가 나오면 탭별로 폭이 남아 있는 것이다.
    await run((v) => v.handleSelectResearchItem("character"));
    expect(researchPanel()?.size).toBe(55);

    act(() => root.unmount());
    container.remove();
  });

  it("keeps the scrap width after rendering every other research tab", async () => {
    // 사용자 제보 시나리오: 자료 스크랩을 min 근처에서 넓힌 뒤 다른 탭을 모두 열고 돌아오면
    // min size로 렌더링되던 문제.
    let api: SplitView | null = null;
    function Harness() {
      useProjectLayoutPersistence(PROJECT_ID, "default");
      api = useSplitView("chapter-1");
      return null;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
    });
    const settle = async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });
    };
    const run = async (fn: (v: SplitView) => void) => {
      await act(async () => {
        if (api) fn(api);
        await Promise.resolve();
      });
      await settle();
    };
    await settle();

    await run((v) => v.handleSelectResearchItem("scrap"));
    await act(async () => {
      useUIStore.getState().updatePanelSize(researchPanel()?.id ?? "", 47);
    });
    await settle();
    expect(researchPanel()?.size).toBe(47);

    // 다른 탭을 전부 렌더링한다
    for (const tab of [
      "character",
      "event",
      "faction",
      "world",
      "plotboard",
      "untitled",
      "analysis",
    ] as const) {
      await run((v) => v.handleSelectResearchItem(tab));
      expect(researchPanel()?.size, `width lost on "${tab}"`).toBe(47);
    }

    // 자료 스크랩으로 돌아온다
    await run((v) => v.handleSelectResearchItem("scrap"));
    expect(researchPanel()?.size).toBe(47);

    act(() => root.unmount());
    container.remove();
  });

  it("keeps the research width when the export panel is opened", async () => {
    const view = await mountSplitView();

    await view.call((api) => api.handleSelectResearchItem("scrap"));
    await act(async () => {
      useUIStore.getState().updatePanelSize(researchPanel()?.id ?? "", 47);
    });
    expect(researchPanel()?.size).toBe(47);

    // export 패널은 initialSize를 주지 않는다 -> 예전에는 100/n 재분배로 폭이 파괴됐다.
    await view.call((api) => api.handleOpenExport());

    expect(researchPanel()?.size).toBe(47);
    view.cleanup();
  });
});

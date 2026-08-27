// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

import { useSplitView } from "../../src/renderer/src/features/workspace/hooks/useSplitView.js";
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
    const snapshotId =
      useUIStore.getState().panels.find((p) => p.content.type === "snapshot")
        ?.id ?? "";
    expect(snapshotId).not.toBe("");

    await view.call((api) => api.removePanel(snapshotId));

    // 다른 패널을 닫는다고 research 폭이 재분배되면 안 된다.
    expect(researchPanel()?.size).toBe(61);
    view.cleanup();
  });
});

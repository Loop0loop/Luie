// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

import { useSplitView } from "../../src/renderer/src/features/workspace/hooks/useSplitView.js";
import { useProjectLayoutPersistence } from "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useProjectLayoutStore } from "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";
import type { ResearchTab } from "../../src/renderer/src/features/workspace/stores/uiStore.js";

const PROJECT_ID = "project-1";
type SplitView = ReturnType<typeof useSplitView>;

const saved = () =>
  useProjectLayoutStore.getState().byProject[PROJECT_ID]?.workspace.byLayout
    .default.researchPanelSize;
const panel = () =>
  useUIStore.getState().panels.find((p) => p.content.type === "research");

describe("REPRO: close panel A then open panel B", () => {
  let api: SplitView | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    useEditorStore.setState({ uiMode: "default" });
    useProjectStore.setState({ currentItem: { id: PROJECT_ID } } as never);
    useUIStore.setState({ hasHydrated: true, panels: [] });
    useProjectLayoutStore.setState({ hasHydrated: true, byProject: {} });
    useProjectLayoutStore.getState().upsertProjectLayout(PROJECT_ID, {
      main: { sidebarOpen: true, contextOpen: true },
    });
  });

  const mount = async () => {
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
    await settle();
    return () => {
      act(() => root.unmount());
      container.remove();
    };
  };

  const settle = async (ms = 200) => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });
  };

  const open = async (tab: ResearchTab) => {
    await act(async () => {
      api?.handleSelectResearchItem(tab);
    });
    await settle();
  };
  const widen = async (size: number) => {
    const id = panel()?.id ?? "";
    await act(async () => {
      useUIStore.getState().updatePanelSize(id, size);
    });
    await settle();
  };
  const close = async () => {
    const id = panel()?.id ?? "";
    await act(async () => {
      api?.removePanel(id);
    });
    await settle();
  };

  it("close A -> open B serves the width A had at close time", async () => {
    const cleanup = await mount();

    await open("character");
    console.log("1. open character:", panel()?.id, panel()?.size, "saved:", saved());

    await widen(75);
    console.log("2. widen to 75  :", panel()?.size, "saved:", saved());

    await close();
    console.log("3. close         : panels =", useUIStore.getState().panels.length, "saved:", saved());

    await open("event");
    console.log("4. open event    :", panel()?.id, panel()?.size, "saved:", saved(), "<-- 75여야 함");

    await widen(55);
    console.log("5. widen to 55   :", panel()?.size, "saved:", saved());

    await close();
    console.log("6. close         : saved:", saved());

    await open("character");
    console.log("7. reopen character:", panel()?.id, panel()?.size, "saved:", saved(), "<-- 55여야 함 (전전값 75면 버그)");

    expect(panel()?.size).toBe(55);
    cleanup();
  });

  it("switch A -> B without closing keeps the width", async () => {
    const cleanup = await mount();
    await open("character");
    await widen(75);
    console.log("[switch] character 75, saved:", saved());
    await open("plotboard");
    console.log("[switch] plotboard:", panel()?.size, "saved:", saved());
    await open("untitled");
    console.log("[switch] untitled :", panel()?.size, "saved:", saved());
    expect(panel()?.size).toBe(75);
    cleanup();
  });
});

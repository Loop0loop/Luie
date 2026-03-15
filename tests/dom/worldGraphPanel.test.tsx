// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorldGraphPanel } from "../../src/renderer/src/features/research/components/world/graph/canvas/WorldGraphPanel.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useWorldBuildingStore } from "../../src/renderer/src/features/research/stores/worldBuildingStore.js";
import { useMemoStore } from "../../src/renderer/src/features/research/stores/memoStore.js";
import { useGraphPluginStore } from "../../src/renderer/src/features/research/stores/graphPluginStore.js";

vi.mock("reactflow", () => ({
  Handle: () => null,
  Position: {
    Top: "top",
    Bottom: "bottom",
  },
  SelectionMode: {
    Partial: "partial",
  },
  BackgroundVariant: {
    Dots: "dots",
  },
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNodesState: (initialNodes: unknown) => [initialNodes, vi.fn(), vi.fn()],
  useEdgesState: (initialEdges: unknown) => [initialEdges, vi.fn(), vi.fn()],
  useReactFlow: () => ({
    fitView: vi.fn(),
  }),
  default: ({ children }: { children?: ReactNode }) => (
    <div data-testid="reactflow">{children}</div>
  ),
}));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

describe("WorldGraphPanel", () => {
  let mountedView: MountedView | null = null;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    resetStore(useProjectStore as unknown as ResettableStore);
    resetStore(useWorldBuildingStore as unknown as ResettableStore);
    resetStore(useMemoStore as unknown as ResettableStore);
    resetStore(useGraphPluginStore as unknown as ResettableStore);

    useProjectStore.setState({
      currentItem: {
        id: "project-1",
        title: "Test Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            name: "Hero",
            description: "Lead character",
            positionX: 120,
            positionY: 140,
          },
          {
            id: "event-1",
            entityType: "Event",
            name: "Inciting Incident",
            description: "Everything starts here",
            positionX: 420,
            positionY: 260,
            attributes: { date: "1장" },
          },
        ],
        edges: [],
      },
      isLoading: false,
      error: null,
      loadGraph: vi.fn(async () => undefined),
      createGraphNode: vi.fn(async () => null),
      updateGraphNode: vi.fn(async () => undefined),
    });

    useMemoStore.setState({
      notes: [
        {
          id: "note-1",
          title: "Plot hook",
          content: "Remember the opening image.",
          tags: ["hook"],
          updatedAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      isSaving: false,
      loadNotes: vi.fn(async () => undefined),
      addNote: vi.fn(() => null),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      flushSave: vi.fn(async () => undefined),
      reset: vi.fn(),
    });

    useGraphPluginStore.setState({
      catalog: [],
      installed: [],
      templates: [],
      error: null,
      hasLoaded: true,
      isLoading: false,
      installingPluginId: null,
      uninstallingPluginId: null,
      applyingTemplateKey: null,
      loadData: vi.fn(async () => undefined),
      installPlugin: vi.fn(async () => ({ success: true })),
      uninstallPlugin: vi.fn(async () => ({ success: true })),
      applyTemplate: vi.fn(async () => ({ success: true })),
    });
  });

  afterEach(() => {
    if (!mountedView) {
      return;
    }

    act(() => {
      mountedView?.root.unmount();
    });
    mountedView.container.remove();
    mountedView = null;
  });

  it("renders the new sidebar shell and switches between tabs", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedView = { container, root };

    act(() => {
      root.render(<WorldGraphPanel />);
    });

    expect(container.textContent).toContain("Test Project");
    expect(container.textContent).toContain("선택된 엔티티");
    expect(container.textContent).toContain("Lead character");

    const noteButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "노트",
    );
    expect(noteButton).toBeTruthy();
    act(() => {
      noteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Plot hook");

    const timelineButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "타임라인",
    );
    expect(timelineButton).toBeTruthy();
    act(() => {
      timelineButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Inciting Incident");

    const libraryButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "라이브러리",
    );
    expect(libraryButton).toBeTruthy();
    act(() => {
      libraryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("설치된 플러그인이 없습니다.");
  });
});

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  warn: vi.fn(),
  loadNotes: vi.fn(),
  flushSave: vi.fn(),
  loadCharacters: vi.fn(),
  loadEvents: vi.fn(),
  loadFactions: vi.fn(),
  loadGraph: vi.fn(),
  memoState: {
    notes: [],
    isLoading: false,
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    loadNotes: vi.fn(),
    flushSave: vi.fn(),
  },
}));

mocked.memoState.loadNotes = mocked.loadNotes;
mocked.memoState.flushSave = mocked.flushSave;

vi.mock("@shared/api", () => ({
  api: { logger: { warn: mocked.warn } },
}));

vi.mock("@renderer/features/research/stores/memoStore", () => {
  const useMemoStore = Object.assign(
    (selector: (state: typeof mocked.memoState) => unknown) =>
      selector(mocked.memoState),
    { getState: () => mocked.memoState },
  );
  return { useMemoStore };
});

vi.mock("@renderer/features/research/stores/characterStore", () => ({
  useCharacterStore: Object.assign(
    (selector: (state: { items: never[] }) => unknown) => selector({ items: [] }),
    { getState: () => ({ loadCharacters: mocked.loadCharacters }) },
  ),
}));
vi.mock("@renderer/features/research/stores/eventStore", () => ({
  useEventStore: Object.assign(
    (selector: (state: { items: never[] }) => unknown) => selector({ items: [] }),
    { getState: () => ({ loadEvents: mocked.loadEvents }) },
  ),
}));
vi.mock("@renderer/features/research/stores/factionStore", () => ({
  useFactionStore: Object.assign(
    (selector: (state: { items: never[] }) => unknown) => selector({ items: [] }),
    { getState: () => ({ loadFactions: mocked.loadFactions }) },
  ),
}));
vi.mock("@renderer/features/project/stores/projectStore", () => ({
  useProjectStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentProject: {
        id: "project-2",
        projectPath: "/tmp/project-2.luie",
      },
    }),
}));
vi.mock("@renderer/features/research/stores/worldBuildingStore", () => ({
  useWorldBuildingStore: (selector: (state: unknown) => unknown) =>
    selector({ graphData: null, loadGraph: mocked.loadGraph }),
}));
vi.mock(
  "../../src/renderer/src/features/canvas/stores/canvasViewStore.js",
  () => ({
    useCanvasViewStore: (selector: (state: unknown) => unknown) =>
      selector({ activePanel: "canvas" }),
  }),
);
vi.mock(
  "../../src/renderer/src/features/canvas/components/shell/canvasActivityShellParts/index.js",
  () => ({
    GraphFilterSidebar: () => null,
    TreeNode: () => null,
    getAllFolderIds: () => [],
    CATEGORY_FOLDERS: {
      characters: "characters",
      events: "events",
      scraps: "scraps",
      factions: "factions",
    },
    useExplorerData: () => [],
    useCanvasFileActions: () => ({
      toggleFolder: vi.fn(),
      handleNodeClick: vi.fn(),
      handleToolbarAction: vi.fn(),
      handleRenameNode: vi.fn(),
      handleDeleteNode: vi.fn(),
    }),
  }),
);
vi.mock("@renderer/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@renderer/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import CanvasActivityShell from "../../src/renderer/src/features/canvas/components/shell/CanvasActivityShell.js";
import { useProjectMemoNotes } from "../../src/renderer/src/features/research/components/memo/useProjectMemoNotes.js";

const roots = new Set<Root>();

function MemoHookProbe() {
  useProjectMemoNotes({ projectId: "project-2", projectPath: "/tmp/project-2.luie" });
  return null;
}

const mount = (element: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.add(root);
  act(() => root.render(element));
  return root;
};

describe("memo background save policy", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocked.warn.mockReset().mockResolvedValue(undefined);
    mocked.loadNotes.mockReset().mockResolvedValue(undefined);
    mocked.flushSave.mockReset().mockResolvedValue(undefined);
    mocked.loadCharacters.mockReset().mockResolvedValue(undefined);
    mocked.loadEvents.mockReset().mockResolvedValue(undefined);
    mocked.loadFactions.mockReset().mockResolvedValue(undefined);
    mocked.loadGraph.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const root of roots) act(() => root.unmount());
    roots.clear();
    document.body.replaceChildren();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("consumes and logs a memo cleanup flush failure", async () => {
    const failure = new Error("cleanup save failed");
    mocked.flushSave.mockRejectedValueOnce(failure);
    const root = mount(<MemoHookProbe />);
    roots.delete(root);
    act(() => root.unmount());
    await act(async () => Promise.resolve());

    expect(mocked.warn).toHaveBeenCalledWith(
      "Failed to flush memo store during cleanup",
      expect.objectContaining({ projectId: "project-2", error: "cleanup save failed" }),
    );
  });

  it("consumes and logs a hook project-scope load failure", async () => {
    mocked.loadNotes.mockRejectedValueOnce(new Error("scope save failed"));
    mount(<MemoHookProbe />);
    await act(async () => Promise.resolve());

    expect(mocked.warn).toHaveBeenCalledWith(
      "Failed to load memo project scope",
      expect.objectContaining({ projectId: "project-2", error: "scope save failed" }),
    );
  });

  it("consumes and logs a Canvas project-scope load failure", async () => {
    mocked.loadNotes.mockRejectedValueOnce(new Error("canvas scope failed"));
    mount(<CanvasActivityShell />);
    await act(async () => Promise.resolve());

    expect(mocked.warn).toHaveBeenCalledWith(
      "Failed to load Canvas memo project scope",
      expect.objectContaining({ projectId: "project-2", error: "canvas scope failed" }),
    );
    expect(mocked.loadGraph).toHaveBeenCalledWith("project-2");
  });
});

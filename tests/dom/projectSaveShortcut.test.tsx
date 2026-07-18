// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: chapter.save persists the editor before the project checkpoint

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  handlers: {} as Record<string, () => void | Promise<void>>,
  calls: [] as string[],
  saveProjectNow: vi.fn(async () => {
    mocked.calls.push("project");
  }),
}));

vi.mock("@renderer/features/workspace/hooks/useShortcuts", () => ({
  useShortcuts: (handlers: Record<string, () => void | Promise<void>>) => {
    mocked.handlers = handlers;
  },
}));

vi.mock("@renderer/features/workspace/services/saveCoordinator", () => ({
  saveProjectNow: mocked.saveProjectNow,
}));

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: (selector: (state: { closeFocusedSurface: () => boolean }) => unknown) =>
    selector({ closeFocusedSurface: () => false }),
}));

vi.mock("@shared/api", () => ({
  api: {
    app: { quit: vi.fn() },
    window: {
      close: vi.fn(),
      toggleFullscreen: vi.fn(),
    },
    logger: { error: vi.fn() },
  },
}));

import { useEditorRootShortcuts } from "../../src/renderer/src/features/workspace/components/useEditorRootShortcuts.js";

describe("project save shortcut", () => {
  it("saves the active chapter before checkpointing the project", async () => {
    const handleSave = vi.fn(async () => {
      mocked.calls.push("chapter");
    });
    const noOp = () => undefined;
    const container = document.createElement("div");
    const root = createRoot(container);
    const Harness = () => {
      useEditorRootShortcuts({
        setIsSettingsOpen: noOp,
        handleAddChapter: noOp,
        handleSave,
        currentProjectId: "project-1",
        handleDeleteActiveChapter: noOp,
        openChapterByIndex: noOp,
        handleRenameProject: async () => undefined,
        handleQuickExport: noOp,
        setSidebarOpen: noOp,
        isSidebarOpen: true,
        layoutModeActions: {
          toggleContextPanel: noOp,
          openContextPanel: noOp,
          closeContextPanel: noOp,
          toggleManuscriptPanel: noOp,
          openSidebarSection: noOp,
          openResearchTab: noOp,
          openEditorInSplit: noOp,
        } as never,
        setWorldTab: noOp,
        setFontSize: noOp,
        fontSize: 16,
        setUiMode: noOp,
        uiMode: "default",
        activeChapterTitle: "Chapter",
        content: "Draft",
      });
      return null;
    };
    await act(async () => {
      root.render(<Harness />);
    });

    await act(async () => {
      await mocked.handlers["chapter.save"]?.();
    });

    expect(mocked.calls).toEqual(["chapter", "project"]);
    expect(mocked.saveProjectNow).toHaveBeenCalledWith("project-1");
    act(() => root.unmount());
  });
});

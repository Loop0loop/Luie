// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: chapter.save persists the editor before the project checkpoint

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  handlers: {} as Record<string, () => void | Promise<void>>,
  saveProjectNow: vi.fn(async () => undefined),
  showToast: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@renderer/features/workspace/hooks/useShortcuts", () => ({
  useShortcuts: (handlers: Record<string, () => void | Promise<void>>) => {
    mocked.handlers = handlers;
  },
}));

vi.mock("@renderer/features/workspace/services/saveCoordinator", () => ({
  saveProjectNow: mocked.saveProjectNow,
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({ showToast: mocked.showToast }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
    logger: { error: mocked.loggerError },
  },
}));

import { useEditorRootShortcuts } from "../../src/renderer/src/features/workspace/components/useEditorRootShortcuts.js";

describe("project save shortcut", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    mocked.saveProjectNow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("delegates saving to the project coordinator", async () => {
    const noOp = () => undefined;
    const container = document.createElement("div");
    const root = createRoot(container);
    const Harness = () => {
      useEditorRootShortcuts({
        setIsSettingsOpen: noOp,
        handleAddChapter: noOp,
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
      });
      return null;
    };
    await act(async () => {
      root.render(<Harness />);
    });

    await act(async () => {
      await mocked.handlers["chapter.save"]?.();
    });

    expect(mocked.saveProjectNow).toHaveBeenCalledOnce();
    expect(mocked.saveProjectNow).toHaveBeenCalledWith("project-1");
    act(() => root.unmount());
  });

  it("shows an error toast when manual saving fails", async () => {
    mocked.saveProjectNow.mockRejectedValueOnce(new Error("disk full"));
    const noOp = () => undefined;
    const container = document.createElement("div");
    const root = createRoot(container);
    const Harness = () => {
      useEditorRootShortcuts({
        setIsSettingsOpen: noOp,
        handleAddChapter: noOp,
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
      });
      return null;
    };
    await act(async () => {
      root.render(<Harness />);
    });

    await act(async () => {
      await mocked.handlers["chapter.save"]?.();
    });

    expect(mocked.showToast).toHaveBeenCalledWith(
      "editor.status.error",
      "error",
    );
    expect(mocked.loggerError).toHaveBeenCalledWith(
      "Manual project save failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
    act(() => root.unmount());
  });
});

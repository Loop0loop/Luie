// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import App from "../../src/renderer/src/app/App.js";
import { FeatureErrorBoundary } from "../../src/shared/ui/FeatureErrorBoundary.js";
import { GlobalErrorBoundary } from "../../src/shared/ui/GlobalErrorBoundary.js";
import type { useUIStore as UseUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import type { useEditorStore as UseEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";

const mocked = vi.hoisted(() => {
  const translations: Record<string, string> = {
    "bootstrap.fetchFailed": "Bootstrap fetch failed",
    "bootstrap.initializing": "Initializing app",
    "bootstrap.retry": "Retry bootstrap",
    "bootstrap.quit": "Quit app",
    "project.toast.missingAttachment": "Open from local data",
    "project.toast.invalidAttachment": "Open from local data (invalid path)",
    "settings.projectTemplate.actions.openLuie": "Open .luie",
    "settings.projectTemplate.toast.restoreCompleted":
      "Opened the restored .luie file.",
    "settings.projectTemplate.toast.restoreFailed": "Restore failed.",
    loading: "Loading",
    "errorBoundary.title": "Unexpected error",
    "errorBoundary.description": "The app hit an unexpected error.",
    "errorBoundary.reload": "Reload app",
  };
  const translate = (key: string) => translations[key] ?? key;
  const uiState = {
    view: "template" as const,
    setView: vi.fn(),
    contextTab: "synopsis" as const,
    worldTab: "terms" as const,
    isSidebarOpen: true,
    isContextOpen: true,
    isManuscriptMenuOpen: false,
    docsRightTab: null,
    isBinderBarOpen: true,
  };

  const projectState = {
    items: [],
    setCurrentProject: vi.fn(),
    updateProject: vi.fn(),
    loadProjects: vi.fn(),
  };

  const projectInitState = {
    currentProject: null as {
      id: string;
      title: string;
      projectPath?: string | null;
      attachmentStatus?:
        | "attached"
        | "detached"
        | "missing-attachment"
        | "invalid-attachment";
      pathMissing?: boolean;
      createdAt: string;
      updatedAt: string;
    } | null,
  };

  const editorState = {
    theme: "light",
    themeTemp: "neutral",
    themeContrast: "soft",
    themeAccent: "blue",
    themeTexture: true,
  };

  const shortcutState = {
    loadShortcuts: vi.fn(),
  };

  const api = {
    app: {
      getBootstrapStatus: vi.fn(),
      onBootstrapStatus: vi.fn(() => () => undefined),
      quit: vi.fn(),
    },
    lifecycle: {
      onQuitPhase: vi.fn(() => () => undefined),
    },
    fs: {
      selectFile: vi.fn(),
      approveProjectPath: vi.fn(),
      selectSnapshotBackup: vi.fn(),
    },
    project: {
      openLuie: vi.fn(),
      markOpened: vi.fn(),
    },
    snapshot: {
      importFromFile: vi.fn(),
    },
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };

  return {
    translate,
    uiState,
    projectState,
    projectInitState,
    editorState,
    shortcutState,
    showToast: vi.fn(),
    setRecoveryState: vi.fn(),
    projectTemplateProps: null as Record<string, unknown> | null,
    api,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mocked.translate,
  }),
}));

vi.mock("@renderer/i18n", () => ({
  i18n: {
    t: mocked.translate,
  },
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({
    showToast: mocked.showToast,
  }),
}));

vi.mock("@shared/api", () => ({
  api: mocked.api,
}));

vi.mock(
  "@renderer/features/workspace/components/ProjectTemplateSelector",
  () => ({
    default: (props: Record<string, unknown>) => {
      mocked.projectTemplateProps = props;
      return (
        <div data-testid="project-template-selector">Template selector</div>
      );
    },
  }),
);

vi.mock("@renderer/features/workspace/components/EditorRoot", () => ({
  default: () => <div data-testid="editor-root">Editor root</div>,
}));

vi.mock("@renderer/features/auth/components/OAuthResultPage", () => ({
  default: () => <div>OAuth result</div>,
}));

vi.mock("@renderer/features/research/components/WorldSection", () => ({
  default: () => <div>World section</div>,
}));

vi.mock("@renderer/features/startup/components/StartupWizard", () => ({
  default: () => <div>Startup wizard</div>,
}));

vi.mock("@renderer/features/export/components/ExportWindow", () => ({
  default: () => <div>Export window</div>,
}));

vi.mock("@renderer/features/project/hooks/useProjectInit", () => ({
  useProjectInit: () => ({
    currentProject: mocked.projectInitState.currentProject,
  }),
}));

vi.mock("@renderer/features/project/hooks/useProjectTemplate", () => ({
  useProjectTemplate: () => ({
    handleSelectProject: vi.fn(),
  }),
}));

vi.mock("@renderer/features/workspace/stores/useDataRecoveryStore", () => ({
  useDataRecoveryStore: {
    getState: () => ({
      setRecoveryState: mocked.setRecoveryState,
    }),
  },
}));

vi.mock("@renderer/features/workspace/services/uiModeIntegrity", () => ({
  captureUiModeIntegritySnapshot: () => ({ uiMode: "default" }),
  getUiModeIntegrityViolations: () => [],
}));

vi.mock("@renderer/features/workspace/stores/uiStore", () => {
  const useUIStore = ((selector: (state: typeof mocked.uiState) => unknown) =>
    selector(mocked.uiState)) as typeof UseUIStore;
  Object.assign(useUIStore, {
    getState: () => mocked.uiState,
  });
  return { useUIStore };
});

vi.mock("@renderer/features/project/stores/projectStore", () => ({
  useProjectStore: (selector: (state: typeof mocked.projectState) => unknown) =>
    selector(mocked.projectState),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => {
  const useEditorStore = ((
    selector: (state: typeof mocked.editorState) => unknown,
  ) => selector(mocked.editorState)) as typeof UseEditorStore;
  Object.assign(useEditorStore, {
    getState: () => mocked.editorState,
  });
  return { useEditorStore };
});

vi.mock("@renderer/features/workspace/stores/shortcutStore", () => ({
  useShortcutStore: (
    selector: (state: typeof mocked.shortcutState) => unknown,
  ) => selector(mocked.shortcutState),
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

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButtonByText = async (
  container: HTMLElement,
  label: string,
): Promise<void> => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  );
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("app operational scenarios", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
    window.location.hash = "";
    mocked.uiState.view = "template";
    mocked.api.app.getBootstrapStatus.mockReset();
    mocked.api.app.onBootstrapStatus.mockReset();
    mocked.api.app.onBootstrapStatus.mockReturnValue(() => undefined);
    mocked.api.app.quit.mockReset();
    mocked.api.lifecycle.onQuitPhase.mockReset();
    mocked.api.lifecycle.onQuitPhase.mockReturnValue(() => undefined);
    mocked.api.logger.error.mockReset();
    mocked.api.logger.warn.mockReset();
    mocked.api.logger.info.mockReset();
    mocked.shortcutState.loadShortcuts.mockReset();
    mocked.projectState.setCurrentProject.mockReset();
    mocked.projectState.updateProject.mockReset();
    mocked.projectState.loadProjects.mockReset();
    mocked.projectTemplateProps = null;
    mocked.api.project.markOpened.mockReset();
    mocked.api.project.markOpened.mockResolvedValue({
      success: true,
      data: {
        projectId: "project-1",
        lastOpenedAt: "2026-03-12T00:00:00.000Z",
      },
    });
    mocked.projectInitState.currentProject = null;
    mocked.uiState.setView.mockReset();
    mocked.showToast.mockReset();
    mocked.api.fs.selectFile.mockReset();
    mocked.api.fs.approveProjectPath.mockReset();
    mocked.api.project.openLuie.mockReset();
    mocked.api.snapshot.importFromFile.mockReset();
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("shows bootstrap fallback and retries into template selector", async () => {
    mocked.api.app.getBootstrapStatus
      .mockResolvedValueOnce({
        success: false,
        error: {
          code: "IPC_TIMEOUT",
          message: "IPC request timed out",
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          isReady: true,
        },
      });

    const view = mountView(<App />);
    mountedViews.push(view);
    await flushAsync();

    expect(view.container.textContent).toContain("Bootstrap fetch failed");
    expect(view.container.textContent).toContain("Retry bootstrap");

    await clickButtonByText(view.container, "Retry bootstrap");
    await flushAsync();

    expect(
      view.container.querySelector('[data-testid="project-template-selector"]'),
    ).not.toBeNull();
    expect(mocked.shortcutState.loadShortcuts).toHaveBeenCalledTimes(1);
  });

  it("lets the user quit from bootstrap fallback", async () => {
    mocked.api.app.getBootstrapStatus.mockResolvedValue({
      success: false,
      error: {
        code: "IPC_TIMEOUT",
        message: "IPC request timed out",
      },
    });

    const view = mountView(<App />);
    mountedViews.push(view);
    await flushAsync();

    await clickButtonByText(view.container, "Quit app");
    expect(mocked.api.app.quit).toHaveBeenCalledTimes(1);
  });

  it("keeps path-missing projects open and shows local-data toast", async () => {
    mocked.api.app.getBootstrapStatus.mockResolvedValue({
      success: true,
      data: {
        isReady: true,
      },
    });
    mocked.uiState.view = "editor";
    mocked.projectInitState.currentProject = {
      id: "project-1",
      title: "Recovered Project",
      projectPath: "/tmp/missing.luie",
      attachmentStatus: "missing-attachment",
      pathMissing: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const view = mountView(<App />);
    mountedViews.push(view);
    await flushAsync();

    expect(
      view.container.querySelector('[data-testid="editor-root"]'),
    ).not.toBeNull();
    expect(mocked.showToast).toHaveBeenCalledWith(
      "Open from local data",
      "info",
    );
    expect(mocked.projectState.setCurrentProject).not.toHaveBeenCalled();
    expect(mocked.uiState.setView).not.toHaveBeenCalledWith("template");
  });

  it("marks the current project as opened and refreshes project ordering", async () => {
    mocked.api.app.getBootstrapStatus.mockResolvedValue({
      success: true,
      data: {
        isReady: true,
      },
    });
    mocked.projectInitState.currentProject = {
      id: "project-1",
      title: "Opened Project",
      projectPath: null,
      attachmentStatus: "detached",
      pathMissing: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const view = mountView(<App />);
    mountedViews.push(view);
    await flushAsync();

    expect(mocked.api.project.markOpened).toHaveBeenCalledWith("project-1");
    expect(mocked.projectState.loadProjects).toHaveBeenCalled();
  });

  it("restores a backup into a .luie project from the template selector", async () => {
    mocked.api.app.getBootstrapStatus.mockResolvedValue({
      success: true,
      data: {
        isReady: true,
      },
    });
    mocked.api.snapshot.importFromFile.mockResolvedValue({
      success: true,
      data: {
        id: "project-restored",
        title: "Recovered Draft",
        projectPath: "/tmp/recovered.luie",
        attachmentStatus: "detached",
        pathMissing: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    mocked.api.fs.approveProjectPath.mockResolvedValue({
      success: true,
      data: {
        normalizedPath: "/tmp/recovered-normalized.luie",
      },
    });

    const view = mountView(<App />);
    mountedViews.push(view);
    await flushAsync();

    await act(async () => {
      const onRestoreBackup = mocked.projectTemplateProps?.onRestoreBackup as
        | ((filePath: string) => Promise<boolean>)
        | undefined;
      await onRestoreBackup?.("/tmp/recovery-backup.snap");
    });
    await flushAsync();

    expect(mocked.api.snapshot.importFromFile).toHaveBeenCalledWith(
      "/tmp/recovery-backup.snap",
    );
    expect(mocked.projectState.loadProjects).toHaveBeenCalledTimes(1);
    expect(mocked.api.fs.approveProjectPath).toHaveBeenCalledWith(
      "/tmp/recovered.luie",
    );
    expect(mocked.projectState.updateProject).toHaveBeenCalledWith(
      "project-restored",
      undefined,
      undefined,
      "/tmp/recovered-normalized.luie",
    );
    expect(mocked.projectState.setCurrentProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "project-restored",
        projectPath: "/tmp/recovered-normalized.luie",
        attachmentStatus: "attached",
        pathMissing: false,
      }),
    );
    expect(mocked.uiState.setView).toHaveBeenCalledWith("editor");
    expect(mocked.showToast).toHaveBeenCalledWith(
      "Opened the restored .luie file.",
      "success",
    );
  });

  it("keeps outer UI alive when a feature boundary recovers from a crash", async () => {
    let shouldThrow = true;

    const CrashingFeature = () => {
      if (shouldThrow) {
        throw new Error("feature exploded");
      }
      return <div>Feature recovered</div>;
    };

    const view = mountView(
      <div>
        <div>Shell still mounted</div>
        <FeatureErrorBoundary featureName="Research">
          <CrashingFeature />
        </FeatureErrorBoundary>
      </div>,
    );
    mountedViews.push(view);
    await flushAsync();

    expect(view.container.textContent).toContain("Shell still mounted");
    expect(view.container.textContent).toContain(
      "Research 영역에서 오류가 발생했습니다",
    );

    shouldThrow = false;
    await clickButtonByText(view.container, "다시 시도");
    await flushAsync();

    expect(view.container.textContent).toContain("Shell still mounted");
    expect(view.container.textContent).toContain("Feature recovered");
  });

  it("surfaces uncaught crashes through the global boundary with structured logs", async () => {
    const CrashingApp = () => {
      throw new Error("global boom");
    };

    const view = mountView(
      <GlobalErrorBoundary>
        <CrashingApp />
      </GlobalErrorBoundary>,
    );
    mountedViews.push(view);
    await flushAsync();

    expect(view.container.textContent).toContain("Unexpected error");
    expect(view.container.textContent).toContain("Reload app");
    expect(mocked.api.logger.error).toHaveBeenCalledWith(
      "GlobalErrorBoundary caught an error",
      expect.objectContaining({
        scope: "global-error-boundary",
        domain: "runtime",
        event: "runtime.error",
      }),
    );
  });
});

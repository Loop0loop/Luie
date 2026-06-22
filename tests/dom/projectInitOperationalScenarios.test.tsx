// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useProjectInit } from "../../src/renderer/src/features/project/hooks/useProjectInit.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useChapterStore } from "../../src/renderer/src/features/manuscript/stores/chapterStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";
import { useCharacterStore } from "../../src/renderer/src/features/research/stores/characterStore.js";
import { useTermStore } from "../../src/renderer/src/features/research/stores/termStore.js";

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
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

const projectRecord = {
  id: "project-1",
  title: "Novel",
  description: "",
  projectPath: "/tmp/novel.luie",
  createdAt: new Date("2026-03-10T00:00:00.000Z"),
  updatedAt: new Date("2026-03-10T00:00:00.000Z"),
};

describe("project init operational scenarios", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        api: {
          logger: {
            info: vi.fn().mockResolvedValue({ success: true }),
            warn: vi.fn().mockResolvedValue({ success: true }),
            error: vi.fn().mockResolvedValue({ success: true }),
          },
        },
      },
      configurable: true,
      writable: true,
    });
    resetStore(useProjectStore as unknown as ResettableStore);
    resetStore(useChapterStore as unknown as ResettableStore);
    resetStore(useEditorStore as unknown as ResettableStore);
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useTermStore as unknown as ResettableStore);
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    Reflect.deleteProperty(globalThis, "window");
  });

  it("loads startup dependencies only when enabled", async () => {
    const loadProjects = vi.fn().mockResolvedValue(undefined);
    const loadSettings = vi.fn().mockResolvedValue(undefined);

    useProjectStore.setState({ loadProjects });
    useEditorStore.setState({ loadSettings });

    const Probe = ({ enabled }: { enabled: boolean }) => {
      const { currentProject } = useProjectInit(enabled);
      return <div>{currentProject?.id ?? "none"}</div>;
    };

    const view = mountView(<Probe enabled={false} />);
    mountedViews.push(view);
    await flushAsync();

    expect(loadProjects).not.toHaveBeenCalled();
    expect(loadSettings).not.toHaveBeenCalled();

    act(() => {
      view.root.render(<Probe enabled />);
    });
    await flushAsync();

    expect(loadProjects).toHaveBeenCalledTimes(1);
    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(window.api.logger.info).toHaveBeenCalledWith(
      "project-init.startup-loads",
      expect.objectContaining({
        event: "project-init.startup-loads",
        scope: "project-init",
        rejectedCount: 0,
      }),
    );
  });

  it("loads project-scoped data and records a project switch timing event", async () => {
    const loadProjects = vi.fn().mockResolvedValue(undefined);
    const loadSettings = vi.fn().mockResolvedValue(undefined);
    const loadChapters = vi.fn().mockResolvedValue(undefined);
    const loadCharacters = vi.fn().mockResolvedValue(undefined);
    const loadTerms = vi.fn().mockResolvedValue(undefined);

    useProjectStore.setState({
      loadProjects,
      currentItem: null,
      currentProject: null,
    });
    useEditorStore.setState({ loadSettings });
    useChapterStore.setState({ loadAll: loadChapters });
    useCharacterStore.setState({ loadCharacters });
    useTermStore.setState({ loadTerms });

    const Probe = () => {
      const { currentProject } = useProjectInit(true);
      return <div>{currentProject?.id ?? "none"}</div>;
    };

    const view = mountView(<Probe />);
    mountedViews.push(view);
    await flushAsync();

    act(() => {
      useProjectStore.setState({
        currentItem: projectRecord,
        currentProject: projectRecord,
      });
    });
    await flushAsync();

    expect(loadChapters).toHaveBeenCalledWith("project-1");
    expect(loadCharacters).toHaveBeenCalledWith("project-1");
    expect(loadTerms).toHaveBeenCalledWith("project-1");
    expect(window.api.logger.info).toHaveBeenCalledWith(
      "project-init.project-switch-loads",
      expect.objectContaining({
        event: "project-init.project-switch-loads",
        scope: "project-init",
        projectId: "project-1",
        rejectedCount: 0,
      }),
    );
  });
});

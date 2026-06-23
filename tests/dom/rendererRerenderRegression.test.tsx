// @vitest-environment jsdom

import {
  Profiler,
  act,
  type ComponentProps,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import SidebarCharacterList from "../../src/renderer/src/features/manuscript/components/sections/SidebarCharacterList.js";
import SidebarMemoList from "../../src/renderer/src/features/manuscript/components/sections/SidebarMemoList.js";
import MemoMainView from "../../src/renderer/src/features/research/components/memo/MemoMainView.js";
import ContextPanel from "../../src/renderer/src/features/workspace/components/panels/ContextPanel.js";
import { useProjectStore } from "../../src/renderer/src/features/project/stores/projectStore.js";
import { useCharacterStore } from "../../src/renderer/src/features/research/stores/characterStore.js";
import { useTermStore } from "../../src/renderer/src/features/research/stores/termStore.js";
import { useMemoStore } from "../../src/renderer/src/features/research/stores/memoStore.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";

const mockedMemoStorage = vi.hoisted(() => ({
  loadScrapMemos: vi.fn(),
  saveScrapMemos: vi.fn(),
}));

vi.mock(
  "../../src/renderer/src/features/research/services/worldPackageStorage.js",
  () => ({
    worldPackageStorage: mockedMemoStorage,
  }),
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
    i18n: {
      language: "ko",
    },
  }),
}));

vi.mock("@shared/ui/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen?: boolean; children?: ReactNode }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock("@shared/ui/DraggableItem", () => ({
  DraggableItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@shared/ui/TabButton", () => ({
  default: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

vi.mock("@shared/ui/SearchInput", () => ({
  default: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

type MountedView = {
  container: HTMLDivElement;
  root: Root;
  getCommitCount: () => number;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

const mountWithProfiler = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let commitCount = 0;

  const onRender: ProfilerOnRenderCallback = () => {
    commitCount += 1;
  };

  act(() => {
    root.render(
      <Profiler id="renderer-rerender-regression" onRender={onRender}>
        {element}
      </Profiler>,
    );
  });

  return {
    container,
    root,
    getCommitCount: () => commitCount,
  };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

describe("renderer rerender regression", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    mockedMemoStorage.loadScrapMemos.mockReset();
    mockedMemoStorage.saveScrapMemos.mockReset();
    mockedMemoStorage.loadScrapMemos.mockResolvedValue({ memos: [] });
    mockedMemoStorage.saveScrapMemos.mockResolvedValue(undefined);
    localStorage.clear();
    document.body.innerHTML = "";
    resetStore(useProjectStore as unknown as ResettableStore);
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useTermStore as unknown as ResettableStore);
    resetStore(useMemoStore as unknown as ResettableStore);
    resetStore(useUIStore as unknown as ResettableStore);
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("SidebarCharacterList ignores unrelated character store fields", () => {
    act(() => {
      useProjectStore.setState({
        currentItem: null,
        currentProject: null,
      });
      useCharacterStore.setState({
        items: [
          {
            id: "char-1",
            projectId: "project-1",
            name: "Hero",
            description: "Lead",
            firstAppearance: null,
            attributes: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        characters: [
          {
            id: "char-1",
            projectId: "project-1",
            name: "Hero",
            description: "Lead",
            firstAppearance: null,
            attributes: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        error: null,
      });
    });

    const view = mountWithProfiler(<SidebarCharacterList />);
    mountedViews.push(view);
    const initialCommitCount = view.getCommitCount();

    act(() => {
      useCharacterStore.setState({
        error: "ignored-error",
      });
    });

    expect(view.getCommitCount()).toBe(initialCommitCount);

    act(() => {
      const nextCharacter = {
        id: "char-2",
        projectId: "project-1",
        name: "Rival",
        description: "Antagonist",
        firstAppearance: null,
        attributes: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useCharacterStore.setState((state) => ({
        items: [...state.items, nextCharacter],
        characters: [...state.characters, nextCharacter],
      }));
    });

    expect(view.getCommitCount()).toBeGreaterThan(initialCommitCount);
    expect(view.container.textContent).toContain("Rival");
  });

  it("ContextPanel ignores unrelated character store fields", () => {
    act(() => {
      useProjectStore.setState({
        currentItem: null,
        currentProject: null,
      });
      useCharacterStore.setState({
        items: [
          {
            id: "char-1",
            projectId: "project-1",
            name: "Guide",
            description: "Mentor",
            firstAppearance: null,
            attributes: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        characters: [
          {
            id: "char-1",
            projectId: "project-1",
            name: "Guide",
            description: "Mentor",
            firstAppearance: null,
            attributes: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        error: null,
      });
      useTermStore.setState({
        items: [],
        terms: [],
      });
    });

    const props: ComponentProps<typeof ContextPanel> = {
      activeTab: "characters",
      onTabChange: () => undefined,
    };
    const view = mountWithProfiler(<ContextPanel {...props} />);
    mountedViews.push(view);
    const initialCommitCount = view.getCommitCount();

    act(() => {
      useCharacterStore.setState({
        error: "still-ignored",
      });
    });

    expect(view.getCommitCount()).toBe(initialCommitCount);

    act(() => {
      const nextCharacter = {
        id: "char-2",
        projectId: "project-1",
        name: "Scout",
        description: "Explorer",
        firstAppearance: null,
        attributes: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useCharacterStore.setState((state) => ({
        items: [...state.items, nextCharacter],
        characters: [...state.characters, nextCharacter],
      }));
    });

    expect(view.getCommitCount()).toBeGreaterThan(initialCommitCount);
    expect(view.container.textContent).toContain("Scout");
  });

  it("MemoMainView ignores unrelated memo store fields", () => {
    act(() => {
      useMemoStore.setState({
        activeProjectId: "project-1",
        activeProjectPath: "/tmp/project-1.luie",
        notes: [
          {
            id: "memo-1",
            title: "Note A",
            content: "Body",
            tags: ["draft"],
            updatedAt: "2026-03-10T00:00:00.000Z",
          },
        ],
        isLoading: false,
        isSaving: false,
        error: null,
      });
      useUIStore.setState({
        mainView: {
          type: "memo",
          id: "memo-1",
        },
      });
    });

    const view = mountWithProfiler(<MemoMainView />);
    mountedViews.push(view);
    const initialCommitCount = view.getCommitCount();

    act(() => {
      useMemoStore.setState({
        isLoading: true,
      });
    });

    expect(view.getCommitCount()).toBe(initialCommitCount);

    act(() => {
      useMemoStore.setState({
        notes: [
          {
            id: "memo-1",
            title: "Note B",
            content: "Body",
            tags: ["draft"],
            updatedAt: "2026-03-10T00:00:00.000Z",
          },
        ],
      });
    });

    expect(view.getCommitCount()).toBeGreaterThan(initialCommitCount);
    const titleInput = Array.from(
      view.container.querySelectorAll("input"),
    ).find((element) => element.value === "Note B");
    expect(titleInput).toBeDefined();
  });

  it("SidebarMemoList loads memo notes once per project mount", async () => {
    act(() => {
      useProjectStore.setState({
        currentItem: {
          id: "project-1",
          title: "Project One",
          description: "",
          projectPath: "/tmp/project-1.luie",
          attachmentStatus: "attached",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        currentProject: {
          id: "project-1",
          title: "Project One",
          description: "",
          projectPath: "/tmp/project-1.luie",
          attachmentStatus: "attached",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    });

    const view = mountWithProfiler(<SidebarMemoList />);
    mountedViews.push(view);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedMemoStorage.loadScrapMemos).toHaveBeenCalledTimes(1);
    expect(mockedMemoStorage.loadScrapMemos).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
    );
  });
});

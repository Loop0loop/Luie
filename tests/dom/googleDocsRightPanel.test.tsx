// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PanelProps = {
  children?: ReactNode;
  defaultSize?: unknown;
  id?: string;
};

const renderedPanelProps: PanelProps[] = [];

const mockedEditorStore = vi.hoisted(() => ({
  enableAnimations: false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Panel: ({ children, defaultSize, id }: PanelProps) => {
    renderedPanelProps.push({ children, defaultSize, id });
    return <div data-testid={id}>{children}</div>;
  },
  Separator: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: mockedEditorStore.enableAnimations }),
}));

vi.mock("@renderer/features/research/components/ResearchPanel", () => ({
  default: () => <div>ResearchPanel</div>,
}));

vi.mock("@renderer/features/research/components/WorldPanel", () => ({
  default: () => <div>WorldPanel</div>,
}));

vi.mock("@renderer/features/snapshot/components/SnapshotList", () => ({
  SnapshotList: () => <div>SnapshotList</div>,
}));

vi.mock("@renderer/features/trash/components/TrashList", () => ({
  TrashList: () => <div>TrashList</div>,
}));

vi.mock("@renderer/features/export/components/ExportPreviewPanel", () => ({
  default: () => <div>ExportPreviewPanel</div>,
}));

vi.mock("@renderer/features/editor/components/Editor", () => ({
  default: () => <div>Editor</div>,
}));

import { GoogleDocsRightPanel } from "../../src/renderer/src/features/workspace/components/layout/GoogleDocsRightPanel.js";

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = async (element: ReactNode): Promise<MountedView> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
    await Promise.resolve();
    await Promise.resolve();
  });

  return { container, root };
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const baseProps = {
  activeChapterContent: "chapter content",
  activeChapterId: "chapter-1",
  activeChapterTitle: "Chapter 1",
  activePanelSurface: "docs.panel.world",
  closeRightPanel: vi.fn(),
  currentProjectId: "project-1",
  onFocus: vi.fn(),
  onRefreshTrash: vi.fn(),
  onSaveChapter: vi.fn(),
  rightPanelSize: {
    minSize: "22.222%",
    maxSize: "52.778%",
  },
  trashRefreshKey: 0,
};

describe("GoogleDocsRightPanel", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    renderedPanelProps.length = 0;
    mockedEditorStore.enableAnimations = false;
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(({ container, root }) => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });
    document.body.innerHTML = "";
  });

  it("uses the current tab ratio when switching tabs", async () => {
    const view = await mountView(
      <GoogleDocsRightPanel
        {...baseProps}
        activeRightTab="world"
        rightPanelRatio={26}
      />,
    );
    mountedViews.push(view);

    await flushEffects();

    expect(
      renderedPanelProps[renderedPanelProps.length - 1]?.defaultSize,
    ).toBe("26%");

    await act(async () => {
      view.root.render(
        <GoogleDocsRightPanel
          {...baseProps}
          activePanelSurface="docs.panel.character"
          activeRightTab="character"
          rightPanelRatio={38}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await flushEffects();

    expect(
      renderedPanelProps[renderedPanelProps.length - 1]?.defaultSize,
    ).toBe("38%");
  });
});

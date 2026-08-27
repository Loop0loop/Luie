// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "project-1";

type Captured = {
  onResize?: (size: { inPixels: number; asPercentage: number }) => void;
  separator?: Record<string, unknown>;
  resizeCalls: string[];
};
const captured: Captured = { resizeCalls: [] };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({
    children,
    id,
    onResize,
    panelRef,
  }: {
    children?: ReactNode;
    id?: string;
    onResize?: (s: { inPixels: number; asPercentage: number }) => void;
    panelRef?: { current: unknown };
  }) => {
    if (String(id) === "research") {
      captured.onResize = onResize;
      if (panelRef) {
        panelRef.current = {
          resize: (size: unknown) => captured.resizeCalls.push(String(size)),
          collapse: () => {},
          isCollapsed: () => false,
        };
      }
    }
    return <div data-testid={id}>{children}</div>;
  },
  Separator: (props: Record<string, unknown>) => {
    captured.separator = props;
    return <div>{props.children as ReactNode}</div>;
  },
}));

vi.mock("@renderer/domains/world", () => ({
  ResearchPanel: () => <div>ResearchPanel</div>,
}));
vi.mock("@renderer/features/snapshot/components/SnapshotViewer", () => ({
  default: () => <div>snap</div>,
}));
vi.mock("@renderer/domains/export", () => ({
  ExportPreviewPanel: () => <div>export</div>,
}));

import { WorkspacePanels } from "../../src/renderer/src/features/workspace/components/panels/WorkspacePanels.js";
import { useProjectLayoutStore } from "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";

const storedPx = () =>
  useProjectLayoutStore.getState().byProject[PROJECT_ID]?.workspace.byLayout
    .default.researchPanelWidthPx;

describe("research panel pixel width is captured only from real drags", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    captured.onResize = undefined;
    captured.separator = undefined;
    captured.resizeCalls = [];
    document.documentElement.removeAttribute("data-layout-restoring");
    useEditorStore.setState({ uiMode: "default", enableAnimations: false });
    useUIStore.setState({ panels: [] });
    useProjectLayoutStore.setState({ hasHydrated: true, byProject: {} });
    useProjectLayoutStore.getState().upsertProjectLayout(PROJECT_ID, {
      workspace: { byLayout: { default: { researchPanelWidthPx: 570 } } },
    });
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  const mount = async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <WorkspacePanels
          panels={[
            {
              id: "research",
              content: { type: "research", tab: "scrap" },
              size: 31.544,
            },
          ]}
          removePanel={() => {}}
          chapters={[]}
          currentProjectId={PROJECT_ID}
          activeChapterId="chapter-1"
          activeChapterTitle="c1"
          onSave={async () => {}}
        />,
      );
      await Promise.resolve();
    });
  };

  const settle = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
  };

  it("ignores the mount-time onResize that reports the min width", async () => {
    await mount();

    // 패널이 min(470px)으로 마운트되며 onResize가 호출된다. 이 값을 저장하면 min에 고착된다.
    await act(async () => {
      captured.onResize?.({ inPixels: 470, asPercentage: 31.544 });
    });
    await settle();
    expect(storedPx()).toBe(570);

    // unmount 시 pending flush 경로로도 새지 않아야 한다.
    await act(async () => {
      root!.unmount();
    });
    root = null;
    await settle();

    expect(storedPx()).toBe(570);
  });

  it("records the width from an actual pointer drag", async () => {
    await mount();

    await act(async () => {
      (captured.separator?.onPointerDown as (() => void) | undefined)?.();
    });
    await act(async () => {
      captured.onResize?.({ inPixels: 640, asPercentage: 43 });
    });
    await act(async () => {
      (captured.separator?.onPointerUp as (() => void) | undefined)?.();
    });
    await settle();

    expect(storedPx()).toBe(640);
  });

  it("ignores a post-drag snap back to the min width", async () => {
    await mount();

    await act(async () => {
      (captured.separator?.onPointerDown as (() => void) | undefined)?.();
      captured.onResize?.({ inPixels: 640, asPercentage: 43 });
      (captured.separator?.onPointerUp as (() => void) | undefined)?.();
    });
    await settle();
    expect(storedPx()).toBe(640);

    // 조작이 끝난 뒤 프로그램적으로 min으로 되돌아가도 저장을 덮어쓰지 않아야 한다.
    await act(async () => {
      captured.onResize?.({ inPixels: 470, asPercentage: 31.544 });
    });
    await settle();

    expect(storedPx()).toBe(640);
  });

  it("applies the stored width through the panel handle, not just defaultSize", async () => {
    // PanelGroup은 layout을 panel id 조합별로 캐싱하고 그 캐시가 defaultSize보다 우선한다.
    // 그래서 저장 폭을 handle로 직접 적용해야 한다.
    await mount();

    // 패널이 min으로 놓인 상태를 group이 보고한다.
    await act(async () => {
      captured.onResize?.({ inPixels: 470, asPercentage: 31.544 });
    });
    await settle();

    expect(captured.resizeCalls).toContain("570px");
  });

  it("does not re-apply once the live width already matches", async () => {
    await mount();
    await settle();
    // mount 시점에는 실제 폭을 모르므로 한 번 적용하는 것이 맞다.
    const afterMount = captured.resizeCalls.length;
    expect(afterMount).toBeGreaterThan(0);

    await act(async () => {
      captured.onResize?.({ inPixels: 570, asPercentage: 38 });
    });
    await settle();

    expect(captured.resizeCalls.length).toBe(afterMount);
  });
});

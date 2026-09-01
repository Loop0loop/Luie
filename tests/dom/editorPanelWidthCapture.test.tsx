// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: 분할 editor 패널 폭의 캡처/복원 (WorkspacePanels).
 *
 * 테스트 베이시스: 사용자 보고 — DnD로 연 sub editor가 재오픈 시 min 폭으로 뜬다.
 * research 패널에는 "실제 drag만 px 저장 + handle로 직접 복원"이 있었지만 editor 패널에는
 * 없어 매번 defaultSize(40%)와 PanelGroup 캐시(min)로 서빙됐다. research와 같은 계약을
 * editor 패널에서 관측한다.
 *
 * PROVES: mount 시점 onResize(min 폭)를 저장하지 않는다, 실제 drag 폭을 저장한다,
 *         drag 후 min으로 snap back해도 덮어쓰지 않는다, 저장 폭을 handle.resize로 적용한다.
 * DOES_NOT_PROVE: 실제 PanelGroup 레이아웃 계산, TipTap 렌더.
 */

const PROJECT_ID = "project-1";
const EDITOR_PANEL_ID = "editor-chapter-1";

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
    if (String(id) === EDITOR_PANEL_ID) {
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

// Editor는 TipTap 런타임을 끌어오므로 대역으로 대체한다.
vi.mock("@renderer/domains/editor", () => ({
  Editor: () => <div>editor</div>,
  useEditorStore: (selector: (s: unknown) => unknown) =>
    selector({ enableAnimations: false, uiMode: "default" }),
}));
vi.mock("@renderer/features/manuscript/hooks/useChapterContent", () => ({
  useChapterContent: () => ({ content: "<p>body</p>", isLoaded: true }),
  useChapterContentStatus: () => ({ isLoaded: true, error: null }),
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
    .default.editorPanelWidthPx;

describe("editor panel pixel width is captured only from real drags", () => {
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
      workspace: { byLayout: { default: { editorPanelWidthPx: 640 } } },
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
              id: EDITOR_PANEL_ID,
              content: { type: "editor", id: "chapter-1" },
              size: 40,
            },
          ]}
          removePanel={() => {}}
          chapters={[
            {
              id: "chapter-1",
              projectId: PROJECT_ID,
              title: "c1",
              synopsis: null,
              order: 1,
              wordCount: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              deletedAt: null,
            },
          ]}
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

    await act(async () => {
      captured.onResize?.({ inPixels: 320, asPercentage: 20 });
    });
    await settle();
    expect(storedPx()).toBe(640);

    await act(async () => {
      root!.unmount();
    });
    root = null;
    await settle();

    expect(storedPx()).toBe(640);
  });

  it("records the width from an actual pointer drag", async () => {
    await mount();

    await act(async () => {
      (captured.separator?.onPointerDown as (() => void) | undefined)?.();
    });
    await act(async () => {
      captured.onResize?.({ inPixels: 720, asPercentage: 45 });
    });
    await act(async () => {
      (captured.separator?.onPointerUp as (() => void) | undefined)?.();
    });
    await settle();

    expect(storedPx()).toBe(720);
  });

  it("ignores a post-drag snap back to the min width", async () => {
    await mount();

    await act(async () => {
      (captured.separator?.onPointerDown as (() => void) | undefined)?.();
      captured.onResize?.({ inPixels: 720, asPercentage: 45 });
      (captured.separator?.onPointerUp as (() => void) | undefined)?.();
    });
    await settle();
    expect(storedPx()).toBe(720);

    await act(async () => {
      captured.onResize?.({ inPixels: 320, asPercentage: 20 });
    });
    await settle();

    expect(storedPx()).toBe(720);
  });

  it("applies the stored width through the panel handle, not just defaultSize", async () => {
    await mount();

    await act(async () => {
      captured.onResize?.({ inPixels: 320, asPercentage: 20 });
    });
    await settle();

    expect(captured.resizeCalls).toContain("640px");
  });
});

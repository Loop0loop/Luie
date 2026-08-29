// @vitest-environment jsdom

import { act, type ReactNode, type Ref, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";

/**
 * docs 사이드바는 "마지막에 사용자가 만든 px 폭"을 저장하고 항상 그걸 서빙한다.
 *
 * 규칙 하나와 불변식 하나로 검증한다.
 * - 저장: 핸들을 잡고 만든 폭만 저장한다. mount/클램프/복원/애니메이션은 저장하지 않는다.
 * - 불변식: 창에 안 맞아 클램프된 값은 표시만 하고 저장값을 덮어쓰지 않는다.
 *
 * 이전 구현은 폭을 %로 저장했다. min/max가 px 상수(220/420)라서 모니터 폭이 바뀌면 같은
 * 비율이 밴드를 벗어나 cap으로 클램프되고, 그 클램프 결과가 사용자 폭으로 저장돼 고착됐다.
 * (2560 폭에서는 기본값 17%가 435px = maxPx 420 초과 → 항상 max)
 */
const WINDOW_WIDTH_PX = 2560;
const MIN_PX = 220;
const MAX_PX = 420;
const DEFAULT_PX = 280;
const USER_PX = 360;

type PanelRecord = {
  id: string;
  defaultSize?: unknown;
  minSize?: unknown;
  maxSize?: unknown;
  groupResizeBehavior?: unknown;
};

const renderedPanels = new Map<string, PanelRecord>();
const separatorProps = new Map<string, Record<string, unknown>>();
const panelResizeCallbacks = new Map<string, (size: PanelSize) => void>();
const panelSizes = new Map<string, number>();

const parsePx = (value: unknown): number | null => {
  const text = String(value ?? "");
  return text.endsWith("px") ? Number.parseFloat(text) : null;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({
    children,
    elementRef,
    id,
  }: {
    children?: ReactNode;
    elementRef?: Ref<HTMLDivElement | null>;
    id?: string;
  }) => (
    <div ref={elementRef as Ref<HTMLDivElement> | undefined} data-group={id}>
      {children}
    </div>
  ),
  Panel: ({
    children,
    defaultSize,
    id,
    minSize,
    maxSize,
    groupResizeBehavior,
    onResize,
    panelRef,
  }: PanelRecord & {
    children?: ReactNode;
    onResize?: (size: PanelSize) => void;
    panelRef?: RefObject<PanelImperativeHandle | null>;
  }) => {
    const panelId = String(id);
    renderedPanels.set(panelId, {
      id: panelId,
      defaultSize,
      minSize,
      maxSize,
      groupResizeBehavior,
    });
    if (onResize) panelResizeCallbacks.set(panelId, onResize);
    if (panelRef) {
      panelRef.current = {
        collapse: () => {},
        expand: () => {},
        isCollapsed: () => panelSizes.get(panelId) === 0,
        isExpanded: () => true,
        getId: () => panelId,
        getSize: () => ({
          asPercentage: 0,
          inPixels: panelSizes.get(panelId) ?? 0,
        }),
        resize: (size: unknown) => {
          if (panelId !== "left-sidebar") return;
          // 실제 PanelGroup은 min/max로 클램프한 뒤 그 크기를 onResize로 보고한다.
          const record = renderedPanels.get(panelId);
          const requested = parsePx(size) ?? 0;
          const clamped = Math.min(
            parsePx(record?.maxSize) ?? WINDOW_WIDTH_PX,
            Math.max(parsePx(record?.minSize) ?? 0, requested),
          );
          panelSizes.set(panelId, clamped);
          panelResizeCallbacks.get(panelId)?.({
            asPercentage: (clamped / WINDOW_WIDTH_PX) * 100,
            inPixels: clamped,
          });
        },
      } as unknown as PanelImperativeHandle;
    }
    return <div data-testid={panelId}>{children}</div>;
  },
  Separator: ({
    children,
    ...rest
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => {
    separatorProps.set(String(rest["data-separator-feature"]), rest);
    return <div>{children}</div>;
  },
}));

vi.mock(
  "../../src/renderer/src/features/workspace/components/layout/GoogleDocsHeader.js",
  () => ({ GoogleDocsHeader: () => <div>header</div> }),
);
vi.mock(
  "../../src/renderer/src/features/workspace/components/layout/GoogleDocsEditorColumn.js",
  () => ({
    GoogleDocsEditorColumn: ({ children }: { children?: ReactNode }) => (
      <div>{children}</div>
    ),
  }),
);
vi.mock(
  "../../src/renderer/src/features/workspace/components/layout/GoogleDocsRightPanel.js",
  () => ({ GoogleDocsRightPanel: () => <div>right</div> }),
);
vi.mock(
  "../../src/renderer/src/features/workspace/components/layout/GoogleDocsPanelRail.js",
  () => ({ GoogleDocsPanelRail: () => <div>rail</div> }),
);

import { GoogleDocsLayout } from "../../src/renderer/src/features/workspace/components/layout/GoogleDocsLayout.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";

const storedWidthPx = (): number =>
  useUIStore.getState().sidebarWidths.docsBinder;
const setSidebarOpen = (open: boolean) =>
  useUIStore.getState().setRegionOpen("leftSidebar", open);
const sidebarPanel = () => renderedPanels.get("left-sidebar");

describe("docs sidebar serves the last user width in px", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  const originalRect = HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    renderedPanels.clear();
    separatorProps.clear();
    panelResizeCallbacks.clear();
    panelSizes.clear();
    useEditorStore.setState({ uiMode: "docs", enableAnimations: true });
    useUIStore.setState({ hasHydrated: true });
    setSidebarOpen(true);
    useUIStore.getState().setSidebarWidth("docsBinder", DEFAULT_PX);

    HTMLElement.prototype.getBoundingClientRect = function () {
      return DOMRect.fromRect({ width: WINDOW_WIDTH_PX, height: 900 });
    };
  });

  afterEach(async () => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    document.body.innerHTML = "";
    await new Promise((resolve) => setTimeout(resolve, 400));
  });

  const settle = async (ms = 300) => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  };

  const mount = async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <GoogleDocsLayout currentProjectId={null} sidebar={<div>sidebar</div>}>
          <div>editor</div>
        </GoogleDocsLayout>,
      );
      await Promise.resolve();
    });
    await settle(20);
  };

  /** 핸들을 잡고 드래그해 폭을 바꾼 뒤 놓는다. */
  const dragSidebarTo = async (widthPx: number) => {
    const handle = separatorProps.get("docs.sidebar");
    await act(async () => {
      (handle?.onPointerDown as (() => void) | undefined)?.();
      panelResizeCallbacks.get("left-sidebar")?.({
        asPercentage: (widthPx / WINDOW_WIDTH_PX) * 100,
        inPixels: widthPx,
      });
      (handle?.onPointerUp as (() => void) | undefined)?.();
    });
    await settle(200);
  };

  it("passes px constraints straight through to the panel", async () => {
    await mount();

    expect(sidebarPanel()).toMatchObject({
      defaultSize: `${DEFAULT_PX}px`,
      minSize: `${MIN_PX}px`,
      maxSize: `${MAX_PX}px`,
      // 창 폭이 바뀌어도 px을 유지해야 한다.
      groupResizeBehavior: "preserve-pixel-size",
    });
  });

  it("wires the gesture signal onto the resize handle", async () => {
    await mount();

    // 이 신호가 없으면 useSidebarResizeCommit이 모든 resize를 프로그램적 변화로 보고
    // 아무 폭도 저장하지 않는다.
    const handle = separatorProps.get("docs.sidebar");
    expect(typeof handle?.onPointerDown).toBe("function");
    expect(typeof handle?.onPointerUp).toBe("function");
    expect(typeof handle?.onKeyDown).toBe("function");
  });

  it("stores a dragged width and serves it back after reopen", async () => {
    await mount();

    await dragSidebarTo(USER_PX);
    expect(storedWidthPx()).toBe(USER_PX);

    await act(async () => setSidebarOpen(false));
    await settle();
    expect(storedWidthPx()).toBe(USER_PX);

    renderedPanels.delete("left-sidebar");
    await act(async () => setSidebarOpen(true));
    await settle();

    expect(sidebarPanel()?.defaultSize).toBe(`${USER_PX}px`);
  });

  it("keeps the dragged width when animations are disabled", async () => {
    useEditorStore.setState({ enableAnimations: false });
    await mount();

    await dragSidebarTo(USER_PX);
    await act(async () => setSidebarOpen(false));
    await settle();

    // 닫기가 유발하는 min 클램프 emit이 사용자 폭을 덮어쓰면 안 된다.
    expect(storedWidthPx()).toBe(USER_PX);
  });

  it("applies a stored width that arrives after mount", async () => {
    await mount();
    panelSizes.clear();

    // 새로고침/재시작: project layout restore가 mount 뒤에 저장 px을 채운다.
    await act(async () => {
      useUIStore.getState().setSidebarWidth("docsBinder", USER_PX);
    });
    await settle();

    expect(panelSizes.get("left-sidebar")).toBe(USER_PX);
  });

  it("does not let a programmatic clamp overwrite the stored width", async () => {
    await mount();
    await dragSidebarTo(MAX_PX);
    expect(storedWidthPx()).toBe(MAX_PX);

    // 저장값이 밴드를 벗어난 상태를 만든다(더 넓은 모니터에서 저장한 폭을 옮겨온 상황).
    await act(async () => {
      useUIStore.getState().setSidebarWidth("docsBinder", MAX_PX);
    });
    await settle();

    // 표시는 max로 클램프되더라도 저장값은 사용자 값을 유지한다.
    expect(storedWidthPx()).toBe(MAX_PX);
    expect(panelSizes.get("left-sidebar")).toBeLessThanOrEqual(MAX_PX);
  });
});

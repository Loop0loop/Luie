// @vitest-environment jsdom

import { act, type ReactNode, type Ref } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * react-resizable-panels의 실제 layout 계산을 모사한다.
 * - `defaultSize` 합이 100이 아니면 `100/합계*값`으로 정규화한다.
 * - 각 패널을 px 제약(minSize)으로 클램프한다.
 * 사용자 환경(내부 group 1490px, 원고 min 640px, research min 470px)을 그대로 쓴다.
 */
const GROUP_WIDTH_PX = 1490;

type PanelSpec = { id: string; defaultSize: number; minPx: number };
const contentPanels: PanelSpec[] = [];
let contentLayoutHandler:
  | ((layout: Record<string, number>) => void)
  | undefined;

const parsePercent = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.endsWith("%")) {
    return Number.parseFloat(value);
  }
  return 0;
};
const parseMinPx = (value: unknown): number => {
  if (typeof value === "string" && value.endsWith("px")) {
    return Number.parseFloat(value);
  }
  return 0;
};

/** 정규화 + px 클램프. 라이브러리 `U()`와 같은 순서. */
const computeLayout = (specs: PanelSpec[]): Record<string, number> => {
  const total = specs.reduce((sum, p) => sum + p.defaultSize, 0);
  const normalized = specs.map((p) =>
    total === 0 ? 0 : (100 / total) * p.defaultSize,
  );
  const clamped = normalized.map((value, index) => {
    const minPercent = (specs[index].minPx / GROUP_WIDTH_PX) * 100;
    return Math.max(value, minPercent);
  });
  return Object.fromEntries(specs.map((p, i) => [p.id, clamped[i]]));
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("react-resizable-panels", () => ({
  Group: ({
    children,
    elementRef,
    id,
    onLayoutChanged,
  }: {
    children?: ReactNode;
    elementRef?: Ref<HTMLDivElement | null>;
    id?: string;
    onLayoutChanged?: (l: Record<string, number>) => void;
  }) => {
    if (id === "main-layout-content-group") {
      contentPanels.length = 0;
      contentLayoutHandler = onLayoutChanged;
    }
    return (
      <div ref={elementRef as Ref<HTMLDivElement> | undefined}>{children}</div>
    );
  },
  Panel: ({
    children,
    defaultSize,
    id,
    minSize,
  }: {
    children?: ReactNode;
    defaultSize?: unknown;
    id?: string;
    minSize?: unknown;
  }) => {
    if (
      id === "main-primary-content" ||
      String(id).startsWith("research") ||
      String(id) === "main-content-placeholder"
    ) {
      contentPanels.push({
        id: String(id),
        defaultSize: parsePercent(defaultSize),
        minPx: parseMinPx(minSize),
      });
    }
    return <div data-testid={id}>{children}</div>;
  },
  Separator: (p: Record<string, unknown>) => <div>{p.children as ReactNode}</div>,
}));

vi.mock("@renderer/features/ai", () => ({ AIPanel: () => <div>AI</div> }));
vi.mock("@shared/ui/EditorDropZones", () => ({
  EditorDropZones: () => <div>dz</div>,
}));

import MainLayout from "../../src/renderer/src/features/workspace/components/layout/MainLayout.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";
import { suppressLayoutPersistenceFor } from "../../src/renderer/src/features/workspace/hooks/useLayoutPersist.js";

const RESEARCH_ID = "research";

describe("default layout: stored research width is reproduced faithfully", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    contentPanels.length = 0;
    contentLayoutHandler = undefined;
    useEditorStore.setState({ uiMode: "default", enableAnimations: false });
    useUIStore.setState({ hasHydrated: true, panels: [] });
    HTMLElement.prototype.getBoundingClientRect = function () {
      return DOMRect.fromRect({ width: 1710, height: 900 });
    };
    class RO {
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(t: Element) {
        this.cb(
          [
            {
              target: t,
              contentRect: DOMRect.fromRect({ width: 1710, height: 900 }),
              borderBoxSize: [] as unknown as ResizeObserverSize[],
              contentBoxSize: [] as unknown as ResizeObserverSize[],
              devicePixelContentBoxSize: [] as unknown as ResizeObserverSize[],
            },
          ] as ResizeObserverEntry[],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  const mountWithStoredWidth = async (storedSize: number) => {
    useUIStore.setState({
      panels: [
        {
          id: RESEARCH_ID,
          content: { type: "research", tab: "scrap" },
          size: storedSize,
        },
      ],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <MainLayout
          sidebar={<div>Sidebar</div>}
          additionalPanelIds={[RESEARCH_ID]}
          additionalPanels={
            <div data-testid={RESEARCH_ID}>research panel content</div>
          }
        >
          <div>Main</div>
        </MainLayout>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  };

  it("renders the stored width, not a renormalized one", async () => {
    // 사용자가 자료 스크랩을 555px(=37.229%)로 넓혀 저장한 상태.
    await mountWithStoredWidth(37.229);

    // MainLayout이 렌더한 Panel spec으로 실제 layout을 계산한다.
    const specs = [...contentPanels];
    // 테스트 하네스가 research 패널을 직접 렌더하므로 spec을 보강한다.
    if (!specs.some((p) => p.id === RESEARCH_ID)) {
      specs.push({ id: RESEARCH_ID, defaultSize: 37.229, minPx: 470 });
    }
    const layout = computeLayout(specs);

    const researchPx = (layout[RESEARCH_ID] / 100) * GROUP_WIDTH_PX;
    // 저장한 555px가 그대로 나와야 한다. 정규화에 휩쓸리면 값이 달라진다.
    expect(Math.round(researchPx)).toBe(555);
  });

  it("gives the primary content panel the complementary size", async () => {
    await mountWithStoredWidth(37.229);

    const primary = contentPanels.find((p) => p.id === "main-primary-content");
    expect(primary).toBeDefined();
    // 100 - 37.229 이어야 정규화가 무연산이 된다.
    expect(primary?.defaultSize).toBeCloseTo(62.771, 2);
  });

  it("never lets the primary panel size drop below a usable floor", async () => {
    await mountWithStoredWidth(95);

    const primary = contentPanels.find((p) => p.id === "main-primary-content");
    expect(primary?.defaultSize).toBe(10);
  });

  it("does not record the min-clamped size emitted while a panel is closing", async () => {
    await mountWithStoredWidth(37.229);
    expect(useUIStore.getState().panels[0]?.size).toBe(37.229);

    // 닫기 경로가 억제를 걸고 resize("0%")를 호출한다. PanelGroup은 minSize(470px)로
    // 클램프해 min 비율(31.544%)을 emit한다. 그 값이 저장되면 폭이 min으로 고착된다.
    suppressLayoutPersistenceFor(120);
    await act(async () => {
      contentLayoutHandler?.({
        "main-primary-content": 68.456,
        [RESEARCH_ID]: 31.544,
      });
    });

    expect(useUIStore.getState().panels[0]?.size).toBe(37.229);

    // 억제는 모듈 전역이므로 다음 테스트로 새지 않게 해제될 때까지 기다린다.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
  });

  it("still records a genuine user resize", async () => {
    await mountWithStoredWidth(37.229);

    await act(async () => {
      contentLayoutHandler?.({
        "main-primary-content": 55,
        [RESEARCH_ID]: 45,
      });
    });

    expect(useUIStore.getState().panels[0]?.size).toBe(45);
  });
});

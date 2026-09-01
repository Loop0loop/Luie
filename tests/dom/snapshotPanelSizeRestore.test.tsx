// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: snapshot/export 분할 패널의 저장 폭 재적용 (WorkspacePanels).
 *
 * 테스트 베이시스: 사용자 보고 — "한 번 이상 연 스냅샷은 최소 폭으로 서빙된다".
 * 닫힘 애니메이션이 패널을 0%로 줄이면 PanelGroup의 id 조합 캐시가 오염되고, 같은
 * 스냅샷(같은 panel id)을 다시 열면 오염된 캐시가 그대로 서빙됐다. research/editor에는
 * handle로 저장 폭을 재적용하는 복원 경로가 있었지만 snapshot/export에는 없었다.
 *
 * PROVES: snapshot 패널 마운트 시 저장 size로 resize가 1회 호출된다, 패널을 닫았다
 *         같은 id로 다시 열면 다시 적용된다, 닫히는 중인 패널에는 적용하지 않는다.
 * DOES_NOT_PROVE: 실제 PanelGroup의 캐시 계산과 px 변환, 사용자 drag 이후의 폭 추적.
 */

const SNAPSHOT_PANEL_ID = "snapshot-snap-1";

const resizeCallsById = vi.hoisted(() => ({
  map: new Map<string, string[]>(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({
    children,
    id,
    panelRef,
  }: {
    children?: ReactNode;
    id?: string;
    panelRef?: { current: unknown };
  }) => {
    if (String(id ?? "").startsWith("snapshot-")) {
      const calls = resizeCallsById.map.get(String(id)) ?? [];
      resizeCallsById.map.set(String(id), calls);
      if (panelRef) {
        panelRef.current = {
          resize: (size: unknown) => calls.push(String(size)),
          collapse: () => {},
          isCollapsed: () => false,
        };
      }
    }
    return <div data-testid={id}>{children}</div>;
  },
  Separator: (props: Record<string, unknown>) => (
    <div>{props.children as ReactNode}</div>
  ),
}));

vi.mock("@renderer/domains/editor", () => ({
  Editor: () => <div>editor</div>,
  useEditorStore: (selector: (s: unknown) => unknown) =>
    selector({ enableAnimations: false, uiMode: "default" }),
}));
vi.mock("@renderer/features/manuscript/hooks/useChapterContent", () => ({
  useChapterContent: () => ({ content: "<p>body</p>", isLoaded: true }),
  useChapterContentStatus: () => ({ isLoaded: true, error: null }),
}));
vi.mock("@renderer/features/research/components/ResearchPanel", () => ({
  default: () => <div>ResearchPanel</div>,
}));
vi.mock("@renderer/features/snapshot/components/SnapshotViewer", () => ({
  default: () => <div>snap</div>,
}));
vi.mock("@renderer/domains/export", () => ({
  ExportPreviewPanel: () => <div>export</div>,
}));

import { WorkspacePanels } from "../../src/renderer/src/features/workspace/components/panels/WorkspacePanels.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";
import { useEditorStore } from "../../src/renderer/src/features/editor/stores/editorStore.js";
import { useProjectLayoutStore } from "../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";

const snapshotPanel = (id = SNAPSHOT_PANEL_ID, size = 40) => ({
  id,
  content: {
    type: "snapshot" as const,
    snapshot: {
      id: id.replace("snapshot-", ""),
      projectId: "project-1",
      content: "<p>snapshot body</p>",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
  size,
});

describe("snapshot panel stored size re-application", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    resizeCallsById.map.clear();
    document.documentElement.removeAttribute("data-layout-restoring");
    useEditorStore.setState({ uiMode: "default", enableAnimations: false });
    useUIStore.setState({ panels: [], closingPanelIds: [] });
    useProjectLayoutStore.setState({ hasHydrated: true, byProject: {} });
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  const mountPanels = async (
    panels: Array<ReturnType<typeof snapshotPanel>>,
  ) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <WorkspacePanels
          panels={panels}
          removePanel={() => {}}
          chapters={[]}
          currentProjectId="project-1"
          activeChapterId="chapter-1"
          activeChapterTitle="c1"
          onSave={async () => {}}
        />,
      );
      await Promise.resolve();
    });
  };

  // 저장 size 재적용은 (effect → rAF) 체인이라 프레임을 폴링해 기다린다.
  const waitForResize = async (id: string, count: number) => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      if ((resizeCallsById.map.get(id) ?? []).length >= count) return;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  };

  const flushFrame = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      await Promise.resolve();
    });
  };

  it("re-applies the stored size to a freshly mounted snapshot panel", async () => {
    await mountPanels([snapshotPanel(SNAPSHOT_PANEL_ID, 40)]);

    // 근거: PanelGroup 캐시가 0%(닫힘 애니메이션 오염)를 들고 있어도 저장 size로 되돌린다.
    await waitForResize(SNAPSHOT_PANEL_ID, 1);
    expect(resizeCallsById.map.get(SNAPSHOT_PANEL_ID)).toEqual(["40%"]);
  });

  it("re-applies again when the same snapshot id is reopened after close", async () => {
    await mountPanels([snapshotPanel(SNAPSHOT_PANEL_ID, 40)]);
    await waitForResize(SNAPSHOT_PANEL_ID, 1);

    // 닫기: 목록에서 제거 → 같은 id 재오픈(저장 size 55로).
    await mountPanels([snapshotPanel(SNAPSHOT_PANEL_ID, 55)]);
    await waitForResize(SNAPSHOT_PANEL_ID, 2);

    // 근거: 같은 panel id라도 (재)마운트면 저장 size를 다시 적용한다 —
    // 이것이 "한 번 이상 연 스냅샷이 작게 열리는" 버그의 방어선이다.
    expect(resizeCallsById.map.get(SNAPSHOT_PANEL_ID)).toEqual(["40%", "55%"]);
  });

  it("does not fight the close animation while the panel is closing", async () => {
    await mountPanels([snapshotPanel(SNAPSHOT_PANEL_ID, 40)]);
    await waitForResize(SNAPSHOT_PANEL_ID, 1);
    const callsAfterMount =
      resizeCallsById.map.get(SNAPSHOT_PANEL_ID)!.length;

    await act(async () => {
      useUIStore.setState({ closingPanelIds: [SNAPSHOT_PANEL_ID] });
      await flushFrame();
    });

    // 근거: 닫힘 애니메이션(0% 보간) 중에는 저장 size 재적용이 간섭하지 않는다.
    // 0% 자체는 닫힘 애니메이션의 정상 출력이므로 제외하고 센다.
    const storedResizes = (resizeCallsById.map.get(SNAPSHOT_PANEL_ID) ?? []).filter(
      (size) => size !== "0%",
    );
    expect(storedResizes).toHaveLength(callsAfterMount);
  });
});

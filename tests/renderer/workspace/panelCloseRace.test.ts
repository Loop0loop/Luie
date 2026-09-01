// TEST_LEVEL: UNIT
// PROVES: uiStore의 패널 닫힘 스케줄러가 "닫힘 애니메이션 중 같은 패널 재오픈" race를
//         없앤다는 것 — schedulePanelClose/cancelPanelClose 계약과 addPanel의 자동 취소
// DOES_NOT_PROVE: WorkspacePanels의 DOM 애니메이션 시각 상태(data-panel-animated, minSize
//         완화), react-resizable-panels의 폭 복원 거동

import { create } from "zustand";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildStablePanelId,
  createUIStoreState,
} from "../../../src/renderer/src/features/workspace/stores/uiStore.state.js";
import type { UIStore } from "../../../src/renderer/src/features/workspace/stores/uiStore.types.js";

const RESEARCH_CLOSE_ANIMATION_MS = 150;

const makeStore = () => create<UIStore>(createUIStoreState);

const addResearchPanel = (
  store: ReturnType<typeof makeStore>,
  tab = "character",
) => {
  store.getState().addPanel({ type: "research", tab: tab as never });
};

describe("uiStore panel close scheduling (close-then-reopen race)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the panel mounted until the close animation delay elapses, then removes it", () => {
    const store = makeStore();
    addResearchPanel(store);
    expect(store.getState().panels.map((p) => p.id)).toEqual(["research"]);

    store.getState().schedulePanelClose("research", RESEARCH_CLOSE_ANIMATION_MS);

    // 근거 1: 스케줄 직후에는 패널이 남아 있고 닫힘 표식이 켜진다.
    expect(store.getState().panels).toHaveLength(1);
    expect(store.getState().closingPanelIds).toEqual(["research"]);

    vi.advanceTimersByTime(RESEARCH_CLOSE_ANIMATION_MS);

    // 근거 2: 지연 경과 후 실제로 제거되고 닫힘 표식이 해제된다.
    expect(store.getState().panels).toHaveLength(0);
    expect(store.getState().closingPanelIds).toEqual([]);
  });

  it("cancelPanelClose keeps the panel and clears the closing marker", () => {
    const store = makeStore();
    addResearchPanel(store);
    store.getState().schedulePanelClose("research", RESEARCH_CLOSE_ANIMATION_MS);

    store.getState().cancelPanelClose("research");
    vi.advanceTimersByTime(RESEARCH_CLOSE_ANIMATION_MS * 3);

    expect(store.getState().panels).toHaveLength(1);
    expect(store.getState().closingPanelIds).toEqual([]);
  });

  it("re-adding the same panel during its close window resurrects it (regression: the click was a no-op and the pending removal completed)", () => {
    const store = makeStore();
    addResearchPanel(store);
    store.getState().schedulePanelClose("research", RESEARCH_CLOSE_ANIMATION_MS);

    // 사용자가 닫힘 애니메이션(150ms) 안에 사이드바의 같은 research 항목을 다시 클릭.
    addResearchPanel(store, "character");

    vi.advanceTimersByTime(RESEARCH_CLOSE_ANIMATION_MS * 2);

    // 근거: 예약된 removePanel이 실행돼도 취소됐으므로 패널은 살아 있어야 한다.
    expect(store.getState().panels.map((p) => p.id)).toEqual(["research"]);
    expect(store.getState().closingPanelIds).toEqual([]);
  });

  it("tracks independent timers when two different panels close within the animation window", () => {
    const store = makeStore();
    store.getState().addPanel({ type: "export" });
    store.getState().addPanel({
      type: "snapshot",
      snapshot: {
        id: "snap-1",
        projectId: "project-1",
        content: "body",
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    expect(store.getState().panels).toHaveLength(2);

    store.getState().schedulePanelClose("export-preview", RESEARCH_CLOSE_ANIMATION_MS);
    store.getState().schedulePanelClose("snapshot-snap-1", RESEARCH_CLOSE_ANIMATION_MS);

    vi.advanceTimersByTime(RESEARCH_CLOSE_ANIMATION_MS);

    // 근거: 단일 타이머였던 기존 구조와 달리 두 닫힘이 모두 완료된다.
    expect(store.getState().panels).toHaveLength(0);
    expect(store.getState().closingPanelIds).toEqual([]);
  });

  it("clears the closing marker when the panel is removed directly while a close is pending", () => {
    const store = makeStore();
    addResearchPanel(store);
    store.getState().schedulePanelClose("research", RESEARCH_CLOSE_ANIMATION_MS);

    store.getState().removePanel("research");
    vi.advanceTimersByTime(RESEARCH_CLOSE_ANIMATION_MS * 2);

    expect(store.getState().panels).toHaveLength(0);
    expect(store.getState().closingPanelIds).toEqual([]);
  });

  it("resolves the research panel id independent of the active tab", () => {
    // 근거: 재오픈 취소는 buildStablePanelId(content)로 닫힘 타이머를 찾는다.
    // tab이 id에 섞이면 취소가 어긋난다.
    expect(buildStablePanelId({ type: "research", tab: "character" })).toBe(
      "research",
    );
    expect(buildStablePanelId({ type: "research", tab: "faction" })).toBe(
      "research",
    );
  });
});

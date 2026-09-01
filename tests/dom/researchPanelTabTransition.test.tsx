// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: ResearchPanel — primary 탭(등장인물/사건/세력) keep-alive + 탭 전환 애니메이션.
 *
 * 사용자 보고: 캐릭터/사건/세력을 오갈 때 전환이 끊기고("되다 만" 느낌) 가끔 클릭이
 * 유실됐다. 원인은 탭 전환마다 매니저(갤러리 수백 개 DOM 노드)를 해체/재마운트한 것 —
 * 재마운트가 전환 애니메이션 도중 메인 스레드를 점유해 슬라이드가 끊기고, 그 창의
 * 클릭이 증발했다. 지금은 한 번 연 탭을 마운트 유지하고 표시만 전환한다.
 *
 * PROVES: (1) 재방문한 매니저는 리마운트되지 않는다(마운트 카운트 불변). (2) 표시
 *         전환 시 진입 애니메이션(항상 오른쪽, 700ms)이 붙는다. (3) 애니메이션 off면
 *         클래스가 없다. (4) 탭 바 DOM은 불변.
 * DOES_NOT_PROVE: 실제 프레임 시간, EntityGallery 내부 렌더 비용.
 */

const hoisted = vi.hoisted(() => ({
  state: { enableAnimations: true },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: hoisted.state.enableAnimations }),
}));

// 각 매니저는 고정 data-testid를 가진 노드를 렌더한다. DOM 노드 동일성으로
// 리마운트 여부를 직접 관측한다.
vi.mock("@renderer/features/research/components/CharacterManager", () => ({
  default: () => <div data-testid="manager-characters" />,
}));
vi.mock("@renderer/features/research/components/event/EventManager", () => ({
  default: () => <div data-testid="manager-events" />,
}));
vi.mock("@renderer/features/research/components/faction/FactionManager", () => ({
  default: () => <div data-testid="manager-factions" />,
}));
vi.mock("@renderer/features/research/components/ResearchCatalogPanels", () => ({
  ResearchPlotboardPanel: () => <div>plotboard</div>,
  ResearchScrapPanel: () => <div>scrap</div>,
  UntitledResearchPanel: () => <div>untitled</div>,
}));

import ResearchPanel from "../../src/renderer/src/features/research/components/ResearchPanel.js";

type MountedView = { container: HTMLDivElement; root: Root };
const mountedViews: MountedView[] = [];

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

const renderPanel = async (activeTab: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ResearchPanel activeTab={activeTab as never} onTabChange={() => {}} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  mountedViews.push({ container, root });
  return container;
};

const rerenderPanel = async (container: HTMLDivElement, activeTab: string) => {
  const root = mountedViews[mountedViews.length - 1].root;
  await act(async () => {
    root.render(
      <ResearchPanel activeTab={activeTab as never} onTabChange={() => {}} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
};

const contentWrapper = (container: HTMLDivElement, tab: string) =>
  container.querySelector(`[data-testid='research-tab-content-${tab}']`);

describe("ResearchPanel primary 탭 keep-alive 전환", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    hoisted.state.enableAnimations = true;
    document.body.innerHTML = "";
  });

  it("재방문한 매니저는 리마운트되지 않고 표시만 전환된다", async () => {
    const container = await renderPanel("character");
    await rerenderPanel(container, "event");
    const eventNode = container.querySelector(
      "[data-testid='manager-events']",
    );
    expect(eventNode).not.toBeNull();

    // character 재방문 후 event 재방문.
    await rerenderPanel(container, "character");
    await rerenderPanel(container, "event");

    // 근거: 같은 DOM 노드 = event 매니저가 재마운트되지 않았다(keep-alive).
    expect(container.querySelector("[data-testid='manager-events']")).toBe(
      eventNode,
    );
    // 표시 상태는 정반대로 토글된다.
    expect(contentWrapper(container, "event")?.className).toContain("flex");
    expect(contentWrapper(container, "character")?.className).toContain(
      "hidden",
    );
  });

  it("표시로 전환된 탭은 진입 애니메이션(항상 오른쪽, 700ms)이 붙는다", async () => {
    const container = await renderPanel("character");
    await rerenderPanel(container, "event");

    const className = contentWrapper(container, "event")?.className ?? "";
    expect(className).toContain("slide-in-from-right-4");
    expect(className).toContain("[animation-duration:700ms]");
    // 숨겨진 쪽에는 애니메이션 클래스가 없다.
    expect(contentWrapper(container, "character")?.className).not.toContain(
      "animate-in",
    );
  });

  it("애니메이션이 꺼져 있으면 진입 클래스를 붙이지 않는다", async () => {
    hoisted.state.enableAnimations = false;
    const container = await renderPanel("character");
    await rerenderPanel(container, "event");

    expect(contentWrapper(container, "event")?.className).not.toContain(
      "animate-in",
    );
  });

  it("탭 바 DOM 노드는 전환과 무관하게 유지된다", async () => {
    const container = await renderPanel("character");
    const navBefore = container.querySelector(
      "[data-testid='research-tab-nav']",
    );

    await rerenderPanel(container, "event");
    await rerenderPanel(container, "faction");

    expect(
      container.querySelector("[data-testid='research-tab-nav']"),
    ).toBe(navBefore);
  });
});

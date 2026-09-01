// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: ResearchPanel 탭 전환 애니메이션.
 *
 * 사용자 보고: research 탭(캐릭터/사건/세력…)이 아무 전환 피드백 없이 즉시 바뀌어
 * "바뀐 줄 모른다". 전 컨텐츠가 좌우로 스르륵 바뀌는 애니메이션을 요구했다.
 *
 * PROVES: (1) 뒤 탭으로 전환하면 새 컨텐츠가 오른쪽에서 슬라이드 인한다.
 *         (2) 앞 탭으로 돌아가면 왼쪽에서 슬라이드 인한다.
 *         (3) enableAnimations=false면 애니메이션 클래스가 붙지 않는다.
 * DOES_NOT_PROVE: 실제 프레임 렌더링/거리감 — 클래스 부착 계약만 고정한다.
 */

const mocked = vi.hoisted(() => ({
  enableAnimations: true,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: (selector: (state: { enableAnimations: boolean }) => unknown) =>
    selector({ enableAnimations: mocked.enableAnimations }),
}));

const { managerStub } = vi.hoisted(() => ({
  managerStub: (name: string) => () => <div>{name}</div>,
}));

vi.mock("@renderer/features/research/components/CharacterManager", () => ({
  default: managerStub("characters"),
}));
vi.mock("@renderer/features/research/components/event/EventManager", () => ({
  default: managerStub("events"),
}));
vi.mock("@renderer/features/research/components/faction/FactionManager", () => ({
  default: managerStub("factions"),
}));
vi.mock("@renderer/features/research/components/ResearchCatalogPanels", () => ({
  ResearchPlotboardPanel: managerStub("plotboard"),
  ResearchScrapPanel: managerStub("scrap"),
  UntitledResearchPanel: managerStub("untitled"),
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

const contentWrapper = (container: HTMLDivElement) =>
  container.querySelector("[data-testid='research-tab-content']");

describe("ResearchPanel 탭 전환 애니메이션", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocked.enableAnimations = true;
    document.body.innerHTML = "";
  });

  it("앞 순서 탭으로 전환하면 오른쪽에서 슬라이드 인한다", async () => {
    const container = await renderPanel("character");
    expect(contentWrapper(container)?.className).toContain(
      "slide-in-from-right",
    );

    // character(0) → event(1): 뒤 탭 = 오른쪽 진입.
    await rerenderPanel(container, "event");

    expect(
      contentWrapper(container)?.className,
    ).toContain("slide-in-from-right-4");
    expect(contentWrapper(container)?.textContent).toBe("events");
  });

  it("탭 순서와 무관하게 항상 오른쪽에서 슬라이드 인한다", async () => {
    const container = await renderPanel("event");

    // event → character: 순서가 앞으로 가도 진입은 항상 오른쪽이다.
    await rerenderPanel(container, "character");

    expect(
      contentWrapper(container)?.className,
    ).toContain("slide-in-from-right-4");
    expect(
      contentWrapper(container)?.className,
    ).not.toContain("slide-in-from-left");
  });

  it("전환 애니메이션 시간과 감속 이징이 직접 지정된다", async () => {
    // 근거: duration-*는 transition-duration만 바꿔 animate-in(기본 150ms)에 무효였다.
    const container = await renderPanel("character");

    const className = contentWrapper(container)?.className ?? "";
    expect(className).toContain("[animation-duration:700ms]");
    expect(className).toContain(
      "[animation-timing-function:cubic-bezier(0.16,1,0.3,1)]",
    );
  });

  it("애니메이션이 꺼져 있으면 전환 클래스를 붙이지 않는다", async () => {
    mocked.enableAnimations = false;
    const container = await renderPanel("character");
    await rerenderPanel(container, "faction");

    expect(contentWrapper(container)?.className).not.toContain("animate-in");
  });
});

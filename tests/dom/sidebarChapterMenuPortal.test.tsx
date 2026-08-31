// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * editor 레이아웃의 사이드바는 `will-change-transform [contain:layout_paint]` 안에서
 * 렌더된다. 그 안에 `position: fixed` 메뉴를 inline으로 두면 containing block이
 * 사이드바로 바뀌고 paint까지 클리핑돼 메뉴가 사이드바 안에 갇힌다(z-index로는 해결 불가).
 * 그래서 챕터 메뉴는 body로 portal되어야 한다.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/ui/DraggableItem", () => ({
  DraggableItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({ confirm: async () => false }),
}));

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: Object.assign(
    (selector: (state: { setManuscriptMenuOpen: (open: boolean) => void }) => unknown) =>
      selector({ setManuscriptMenuOpen: () => {} }),
    { getState: () => ({ setMainView: () => {} }) },
  ),
}));

vi.mock("@renderer/features/manuscript/hooks/useChapterManagement", () => ({
  useChapterManagement: () => ({
    chapters: [{ id: "chapter-1", title: "1장" }],
    activeChapterId: "chapter-1",
    handleSelectChapter: () => {},
    handleAddChapter: async () => {},
    handleRenameChapter: async () => {},
    handleDuplicateChapter: async () => {},
    handleDeleteChapter: async () => {},
  }),
}));

const { default: SidebarChapterList } = await import(
  "../../src/renderer/src/features/manuscript/components/sections/SidebarChapterList.js"
);

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountedViews: MountedView[] = [];

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  // NOTE: FocusHoverSidebar와 같은 containment 조건을 재현한다.
  container.style.contain = "layout paint";
  container.style.willChange = "transform";
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  const view = { container, root };
  mountedViews.push(view);
  return view;
};

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("SidebarChapterList chapter menu", () => {
  it("renders the menu outside the contained sidebar subtree", () => {
    const { container } = mountView(<SidebarChapterList />);

    const menuButton = container.querySelector("button");
    expect(menuButton).not.toBeNull();
    expect(container.textContent).not.toContain("sidebar.menu.rename");

    act(() => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const menuItem = Array.from(document.body.querySelectorAll("div")).find(
      (element) => element.textContent?.trim() === "sidebar.menu.rename",
    );

    expect(menuItem).toBeDefined();
    expect(container.contains(menuItem ?? null)).toBe(false);
    expect(menuItem?.closest(".z-dropdown")).not.toBeNull();
  });
});

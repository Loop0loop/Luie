import { describe, expect, it } from "vitest";
import {
  getCollapsibleSidebarPanelSize,
  shouldHideCollapsibleSidebarLayout,
} from "../../../src/renderer/src/features/workspace/hooks/useCollapsibleSidebar.js";

describe("useCollapsibleSidebar helpers", () => {
  it("uses a zero pixel initial panel size when the sidebar is collapsed", () => {
    expect(getCollapsibleSidebarPanelSize(true, 280)).toBe("0px");
    expect(getCollapsibleSidebarPanelSize(false, 280)).toBe("280px");
  });

  it("hides until persisted collapse state has hydrated even when animations are enabled", () => {
    expect(
      shouldHideCollapsibleSidebarLayout({
        enableAnimations: true,
        uiHasHydrated: true,
        projectLayoutHasHydrated: true,
        isLayoutReady: true,
        isCollapseHydrated: false,
      }),
    ).toBe(true);
  });

  it("waits for fixed layout readiness only when animations are disabled", () => {
    const base = {
      uiHasHydrated: true,
      projectLayoutHasHydrated: true,
      isLayoutReady: false,
      isCollapseHydrated: true,
    };

    expect(
      shouldHideCollapsibleSidebarLayout({
        ...base,
        enableAnimations: true,
      }),
    ).toBe(false);
    expect(
      shouldHideCollapsibleSidebarLayout({
        ...base,
        enableAnimations: false,
      }),
    ).toBe(true);
  });
});

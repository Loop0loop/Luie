// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  isLayoutPersistenceSuppressed,
  suppressLayoutPersistenceFor,
} from "../../src/renderer/src/features/workspace/hooks/useLayoutPersist.js";
import { isLayoutRestoring } from "../../src/renderer/src/features/workspace/hooks/useSidebarResizeCommit.js";
import { beginLayoutRestoring } from "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";

/**
 * 두 신호는 교환 가능하지 않다. `data-layout-restoring`은 컴포넌트가 고정 layout을 적용하는
 * 중임을 알리는 전역 CSS 신호이고, `useFixedPixelPanelGroupLayout`이 컨테이너 폭 변화마다
 * 재적용하므로 다른 패널을 드래그하는 동안에도 켜진다. 저장 억제에 쓰면 무관한 컴포넌트가
 * 서로의 저장을 막는다. 저장 경로는 counter만 봐야 한다.
 */
describe("layout persistence suppression signals stay separate", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-layout-restoring");
  });

  it("is not suppressed while nothing is in flight", () => {
    expect(isLayoutPersistenceSuppressed()).toBe(false);
  });

  it("suppresses only for the explicit programmatic-resize counter", async () => {
    suppressLayoutPersistenceFor(60);
    expect(isLayoutPersistenceSuppressed()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(isLayoutPersistenceSuppressed()).toBe(false);
  });

  it("does not suppress persistence while a component applies a fixed layout", () => {
    const endRestoring = beginLayoutRestoring();

    // 전역 CSS 신호는 켜지지만 저장은 계속되어야 한다.
    expect(isLayoutRestoring()).toBe(true);
    expect(isLayoutPersistenceSuppressed()).toBe(false);

    endRestoring();
    expect(isLayoutRestoring()).toBe(false);
  });
});

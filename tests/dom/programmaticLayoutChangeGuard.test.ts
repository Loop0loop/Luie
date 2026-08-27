// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  isProgrammaticLayoutChange,
  suppressLayoutPersistenceFor,
} from "../../src/renderer/src/features/workspace/hooks/useLayoutPersist.js";
import { beginLayoutRestoring } from "../../src/renderer/src/features/workspace/hooks/useProjectLayoutPersistence.js";

// 억제 신호가 두 갈래(module counter / DOM 속성)라, 저장 경로가 한쪽만 확인하면 다른 경로로 들어온
// 프로그램적 resize가 사용자 값으로 오인되어 저장된다. 단일 진입점이 둘 다 보는지 고정한다.

describe("isProgrammaticLayoutChange", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-layout-restoring");
  });

  it("is false while nothing is suppressing", () => {
    expect(isProgrammaticLayoutChange()).toBe(false);
  });

  it("detects the suppression counter", async () => {
    suppressLayoutPersistenceFor(60);
    expect(isProgrammaticLayoutChange()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(isProgrammaticLayoutChange()).toBe(false);
  });

  it("detects the layout-restoring DOM attribute", () => {
    const endRestoring = beginLayoutRestoring();
    expect(isProgrammaticLayoutChange()).toBe(true);

    endRestoring();
    expect(isProgrammaticLayoutChange()).toBe(false);
  });
});

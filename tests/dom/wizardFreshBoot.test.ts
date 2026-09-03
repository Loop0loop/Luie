// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 위저드(#startup-wizard) 부팅에서는 이전 세션의 persist UI 상태 키
// (레이아웃·사이드바·테마 시드·위저드 플래그)가 지워지고, 일반 실행에서는
// 그대로 유지된다. 사용자 콘텐츠(luie:world:*)는 어느 쪽에서도 지워지지 않는다.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetPersistedUiStateForWizard } from "../../src/renderer/src/app/wizardFreshBoot.js";

const UI_KEYS = [
  "luie-ui-v2",
  "luie-project-layout-v2",
  "luie:research-sidebar-collapsed",
  "luie:theme-seed",
  "luie:wizard-auto-open-project",
] as const;

const seedStorage = () => {
  for (const key of UI_KEYS) {
    localStorage.setItem(key, "previous-session-state");
  }
  // 사용자 콘텐츠: 리서치 메모 등은 어떤 부팅에서도 유지되어야 한다.
  localStorage.setItem("luie:world:project-1:memo", "작가의 메모");
};

describe("wizard fresh boot", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
  });

  it("일반 실행 해시에서는 저장된 UI 상태를 건드리지 않는다", () => {
    seedStorage();

    resetPersistedUiStateForWizard();

    for (const key of UI_KEYS) {
      expect(localStorage.getItem(key)).toBe("previous-session-state");
    }
    expect(localStorage.getItem("luie:world:project-1:memo")).toBe("작가의 메모");
  });

  it("위저드 해시로 부팅하면 persist UI 상태 키만 지운다", () => {
    seedStorage();
    window.location.hash = "#startup-wizard";

    resetPersistedUiStateForWizard();

    for (const key of UI_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("luie:world:project-1:memo")).toBe("작가의 메모");
  });
});

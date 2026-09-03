// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 위저드(#startup-wizard) 부팅에서는 이전 세션의 persist UI 상태 키
// (레이아웃·사이드바·위저드 플래그)가 지워지고, 일반 실행에서는 그대로 유지된다.
// luie:theme-seed는 첫 페인트용이라 어느 쪽에서도 지우면 안 되고, 사용자
// 콘텐츠(luie:world:*) 역시 보존된다.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetPersistedUiStateForWizard } from "../../src/renderer/src/app/wizardFreshBoot.js";

const WIPED_KEYS = [
  "luie-ui-v2",
  "luie-project-layout-v2",
  "luie:research-sidebar-collapsed",
  "luie:wizard-auto-open-project",
] as const;

// 어느 부팅에서도 지워지면 안 되는 것: 첫 페인트 테마 시드 + 사용자 콘텐츠.
const PRESERVED: ReadonlyArray<readonly [key: string, value: string]> = [
  ["luie:theme-seed", "sepia"],
  ["luie:world:project-1:memo", "작가의 메모"],
];

const seedStorage = () => {
  for (const key of WIPED_KEYS) {
    localStorage.setItem(key, "previous-session-state");
  }
  for (const [key, value] of PRESERVED) {
    localStorage.setItem(key, value);
  }
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

    for (const key of WIPED_KEYS) {
      expect(localStorage.getItem(key)).toBe("previous-session-state");
    }
    for (const [key, value] of PRESERVED) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });

  it("위저드 해시로 부팅하면 persist UI 상태 키만 지운다", () => {
    seedStorage();
    window.location.hash = "#startup-wizard";

    resetPersistedUiStateForWizard();

    for (const key of WIPED_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (const [key, value] of PRESERVED) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });
});

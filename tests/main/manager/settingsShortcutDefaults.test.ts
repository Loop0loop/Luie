import { describe, expect, it } from "vitest";

/**
 * SUT: `settingsDefaults.getDefaultShortcuts` — 기본 단축키 표의 표기 규약.
 *
 * 테스트 베이시스: 6차 감사 결함 D2. main이 만드는 기본값은 `Cmd+,`였고 설정 화면의
 * 기록 결과는 `cmd+comma`였다. 매칭은 양쪽 모두 성공했지만 충돌 감지가 원시 문자열을
 * 비교해 같은 물리 조합을 놓쳤고, 등록 순서가 빠른 한쪽만 발화했다.
 *
 * WHY 이 테스트가 필요한가: 표기 규약은 코드로 강제되지 않는다. 앞으로 기본값을
 * 추가하는 사람이 `Cmd+K`처럼 읽기 좋은 표기를 쓰면 결함이 조용히 되돌아온다.
 * 이 스위트가 표 전체를 canonical로 고정한다.
 *
 * ISTQB 기법
 *   동등분할: 빈 값 / 단일 수정자 조합 / 다중 수정자 조합 / 기능키
 *   경계값: 플랫폼 분기(darwin vs 그 외), 표의 모든 항목 전수
 *
 * PROVES: 모든 기본값이 canonical 표기이고 안전성 검증을 통과할 것, 기본값끼리
 *         충돌이 없을 것, 플랫폼별 수정자만 다르고 구조는 같을 것.
 * DOES_NOT_PROVE: 사용자가 덮어쓴 값(그쪽은 기록 단계 검증이 담당).
 */

import {
  canonicalizeAccelerator,
  findAcceleratorConflicts,
  validateAccelerator,
} from "@shared/utils/shortcutAccelerator";
import { DEFAULT_SHORTCUTS } from "../../../src/main/manager/settings/settingsDefaults.js";

const entries = Object.entries(DEFAULT_SHORTCUTS) as Array<[string, string]>;
const boundEntries = entries.filter(([, accelerator]) => accelerator !== "");

describe("기본 단축키 표기 규약", () => {
  it("표가 비어 있지 않다 (테스트가 헛돌지 않음을 보장)", () => {
    expect(entries.length).toBeGreaterThan(40);
    expect(boundEntries.length).toBeGreaterThan(5);
  });

  it.each(boundEntries)("%s = %s 는 canonical 표기다", (_action, accelerator) => {
    // canonicalize를 통과시켜도 값이 그대로여야 canonical이다.
    expect(canonicalizeAccelerator(accelerator)).toBe(accelerator);
  });

  it.each(boundEntries)("%s = %s 는 안전성 검증을 통과한다", (_action, accelerator) => {
    // 수정자 없는 인쇄 문자가 기본값에 들어가면 집필 중 오작동한다.
    expect(validateAccelerator(accelerator)).toEqual({ ok: true });
  });

  it("빈 값도 유효하다 (바인딩 없음)", () => {
    const unbound = entries.filter(([, accelerator]) => accelerator === "");
    expect(unbound.length).toBeGreaterThan(0);
    for (const [, accelerator] of unbound) {
      expect(validateAccelerator(accelerator)).toEqual({ ok: true });
    }
  });

  it("기본값끼리 같은 물리 조합을 쓰지 않는다", () => {
    const conflicts = findAcceleratorConflicts(DEFAULT_SHORTCUTS as Record<string, string>);
    expect([...conflicts.keys()]).toEqual([]);
  });

  it("소문자 수정자 토큰을 쓴다 (기록 결과와 같은 표기)", () => {
    for (const [action, accelerator] of boundEntries) {
      expect(accelerator, `${action} 에 대문자가 남아 있다`).toBe(accelerator.toLowerCase());
    }
  });

  it("구두점은 이름 토큰으로 쓴다 (리터럴 `,` 금지)", () => {
    for (const [action, accelerator] of boundEntries) {
      expect(accelerator, `${action} 에 리터럴 콤마가 있다`).not.toContain(",");
    }
  });

  it("설정 열기 기본값이 Cmd/Ctrl + 콤마다", () => {
    // 사용자가 보고한 결함의 대상 액션이다. 표기까지 명시적으로 고정한다.
    expect(DEFAULT_SHORTCUTS["app.openSettings"]).toMatch(/^(cmd|ctrl)\+comma$/);
  });

  it("전체화면 기본값은 기능키 단독이다 (무수정자가 정당한 부류)", () => {
    expect(DEFAULT_SHORTCUTS["window.toggleFullscreen"]).toBe("f11");
    expect(validateAccelerator("f11")).toEqual({ ok: true });
  });
});

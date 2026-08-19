// TEST_LEVEL: UNIT
// PROVES: 미러→스냅샷 승격 결정 — 이미 DB에 저장된/스테일한 미러는 승격하지 않고,
//         크래시로 DB 저장이 누락된 미러만 승격한다.
// DOES_NOT_PROVE: 실제 mirror 파일 스캔/flush 루프 (통합은 snapshotResilience 참조)

import { describe, it, expect } from "vitest";
import { shouldPromoteMirrorToSnapshot } from "../../../src/main/manager/autoSave/autoSaveMirrorStore.js";

const decide = (input: {
  mirrorContent: string;
  mirrorAt: number;
  chapterContent: string | null;
  chapterAt: number;
}) =>
  shouldPromoteMirrorToSnapshot({
    mirrorContent: input.mirrorContent,
    mirrorUpdatedAtMs: input.mirrorAt,
    chapterContent: input.chapterContent,
    chapterUpdatedAtMs: input.chapterAt,
  });

describe("shouldPromoteMirrorToSnapshot", () => {
  it("미러 내용이 DB와 동일하면(이미 저장됨) 승격하지 않는다", () => {
    expect(
      decide({
        mirrorContent: "same",
        mirrorAt: 2000,
        chapterContent: "same",
        chapterAt: 1000,
      }),
    ).toBe(false);
  });

  it("DB가 미러보다 새면(저장 완료) 승격하지 않는다", () => {
    expect(
      decide({
        mirrorContent: "old-draft",
        mirrorAt: 1000,
        chapterContent: "restored-newer",
        chapterAt: 2000,
      }),
    ).toBe(false);
  });

  it("미러가 DB보다 새고 내용이 다르면(크래시 유실 저장) 승격한다", () => {
    expect(
      decide({
        mirrorContent: "unsaved-draft",
        mirrorAt: 2000,
        chapterContent: "older-db",
        chapterAt: 1000,
      }),
    ).toBe(true);
  });

  it("타임스탬프를 알 수 없을 때는 내용이 다르면 승격한다(보수적 복구)", () => {
    expect(
      decide({
        mirrorContent: "draft",
        mirrorAt: 0,
        chapterContent: "db",
        chapterAt: 0,
      }),
    ).toBe(true);
  });

  it("챕터 본문이 없어도(null) 미러 내용이 비어 있으면 승격하지 않는다", () => {
    expect(
      decide({
        mirrorContent: "",
        mirrorAt: 2000,
        chapterContent: null,
        chapterAt: 0,
      }),
    ).toBe(false);
  });
});
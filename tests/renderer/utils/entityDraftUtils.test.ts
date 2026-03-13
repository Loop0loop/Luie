import { describe, expect, it } from "vitest";
import { parseEntityDraftText } from "../../../src/renderer/src/features/research/utils/entityDraftUtils.js";

describe("parseEntityDraftText", () => {
  it("splits the title from following description lines", () => {
    expect(
      parseEntityDraftText("유진\n제국 수도 출신\n비밀을 숨기고 있음"),
    ).toEqual({
      name: "유진",
      description: "제국 수도 출신\n비밀을 숨기고 있음",
    });
  });

  it("keeps a single-line block as the block title", () => {
    expect(parseEntityDraftText("황실은 이미 붕괴 직전")).toEqual({
      name: "황실은 이미 붕괴 직전",
      description: undefined,
    });
  });

  it("ignores surrounding blank lines", () => {
    expect(parseEntityDraftText("\n\n붉은 탑의 금기 의식\n\n")).toEqual({
      name: "붉은 탑의 금기 의식",
      description: undefined,
    });
  });
});

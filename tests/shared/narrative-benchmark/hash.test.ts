import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Utf8 } from "../../../src/shared/utils/sha256";

const nodeSha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

describe("narrative benchmark SHA-256", () => {
  it.each([
    "",
    "abc",
    "현대 로맨스 💙 관계 변화",
    "a".repeat(55),
    "a".repeat(56),
    "a".repeat(63),
    "a".repeat(64),
    "a".repeat(65),
    "현대".repeat(100),
  ])(
    "matches Node SHA-256 for UTF-8 input %j",
    (value) => {
      expect(sha256Utf8(value)).toBe(nodeSha256(value));
    },
  );
});

import { describe, expect, it } from "vitest";
import {
  canAttemptLuieImport,
  computeLuieImportRetryDelayMs,
  hasReachedLuieImportRetryLimit,
  registerLuieImportFailure,
} from "../../../src/renderer/src/features/project/hooks/fileImportRetryPolicy";

describe("fileImportRetryPolicy", () => {
  it("allows first attempt when retry state is absent", () => {
    expect(canAttemptLuieImport(undefined, 1_000)).toBe(true);
  });

  it("applies exponential retry delay with max cap", () => {
    expect(computeLuieImportRetryDelayMs(1)).toBe(1_000);
    expect(computeLuieImportRetryDelayMs(2)).toBe(2_000);
    expect(computeLuieImportRetryDelayMs(3)).toBe(4_000);
    expect(computeLuieImportRetryDelayMs(10)).toBe(30_000);
  });

  it("blocks until nextRetryAt and then allows retry", () => {
    const first = registerLuieImportFailure(undefined, 10_000);
    expect(first.attempts).toBe(1);
    expect(first.nextRetryAt).toBe(11_000);
    expect(canAttemptLuieImport(first, 10_999)).toBe(false);
    expect(canAttemptLuieImport(first, 11_000)).toBe(true);

    const second = registerLuieImportFailure(first, 11_000);
    expect(second.attempts).toBe(2);
    expect(second.nextRetryAt).toBe(13_000);
  });

  it("reports retry limit reached at attempt 10", () => {
    let state = undefined;
    for (let i = 0; i < 9; i += 1) {
      state = registerLuieImportFailure(state, 1_000 * (i + 1));
    }
    expect(hasReachedLuieImportRetryLimit(state)).toBe(false);

    state = registerLuieImportFailure(state, 10_000);
    expect(state.attempts).toBe(10);
    expect(hasReachedLuieImportRetryLimit(state)).toBe(true);
  });
});

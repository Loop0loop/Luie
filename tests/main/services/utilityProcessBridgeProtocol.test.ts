import { describe, expect, it } from "vitest";
import {
  REQUEST_TIMEOUT_ASK_MS,
  REQUEST_TIMEOUT_EMBED_MS,
  REQUEST_TIMEOUT_STOP_MS,
  START_TIMEOUT_MS,
  STOP_GRACE_MS,
  STOP_TIMEOUT_MS,
  unwrapMessage,
} from "../../../src/main/services/features/utility/utilityProcessBridge/index.js";

describe("utilityProcessBridge protocol helpers", () => {
  it("unwraps Electron utility process data envelopes", () => {
    const payload = { type: "pong", requestId: "req-1", pid: 123 };

    expect(unwrapMessage({ data: payload })).toEqual(payload);
    expect(unwrapMessage(payload)).toEqual(payload);
    expect(unwrapMessage(null)).toBeNull();
  });

  it("keeps bridge timeout constants stable", () => {
    expect(START_TIMEOUT_MS).toBe(5_000);
    expect(REQUEST_TIMEOUT_ASK_MS).toBe(20_000);
    expect(REQUEST_TIMEOUT_STOP_MS).toBe(2_000);
    expect(REQUEST_TIMEOUT_EMBED_MS).toBe(30_000);
    expect(STOP_TIMEOUT_MS).toBe(5_000);
    expect(STOP_GRACE_MS).toBe(120);
  });
});

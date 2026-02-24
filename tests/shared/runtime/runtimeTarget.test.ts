import { describe, expect, it } from "vitest";
import { resolveRuntimeTarget } from "../../../src/shared/runtime/runtimeTarget.js";

describe("resolveRuntimeTarget", () => {
  it("defaults to electron for missing or unknown values", () => {
    expect(resolveRuntimeTarget()).toBe("electron");
    expect(resolveRuntimeTarget("")).toBe("electron");
    expect(resolveRuntimeTarget("unknown")).toBe("electron");
  });

  it("resolves electrobun case-insensitively", () => {
    expect(resolveRuntimeTarget("electrobun")).toBe("electrobun");
    expect(resolveRuntimeTarget("ELECTROBUN")).toBe("electrobun");
    expect(resolveRuntimeTarget("  electrobun  ")).toBe("electrobun");
  });
});

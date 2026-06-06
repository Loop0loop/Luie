import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UtilitySidecarSupervisor } from "../../../src/main/utility/llm/sidecarSupervisor.js";

describe("UtilitySidecarSupervisor status", () => {
  it("reports stopped status without starting a sidecar", () => {
    const supervisor = new UtilitySidecarSupervisor();

    expect(supervisor.status()).toEqual({ status: "stopped" });
    expect(supervisor.isRunning()).toBe(false);
    expect(supervisor.getBaseUrl()).toBeNull();
  });

  it("keeps stop read-only when no sidecar is running", async () => {
    const supervisor = new UtilitySidecarSupervisor();

    await supervisor.stop();

    expect(supervisor.status()).toEqual({ status: "stopped" });
  });

  it("keeps repeated failures behind escalating cooldown", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/main/utility/llm/sidecarSupervisor.ts"),
      "utf8",
    );

    expect(source).toContain("COOLDOWN_BASE_MS = 5_000");
    expect(source).toContain("COOLDOWN_MAX_MS = 60_000");
    expect(source).toContain("consecutiveFailures += 1");
    expect(source).toContain("2 ** Math.max(0, this.consecutiveFailures - 1)");
    expect(source).toContain("failureCount: this.consecutiveFailures");
  });

  it("redacts paths from bounded status diagnostics", () => {
    const supervisor = new UtilitySidecarSupervisor();
    const internals = supervisor as unknown as {
      appendStderr: (chunk: string) => void;
      state: { status: "stopped"; lastError?: string };
    };
    internals.appendStderr("failed to load /Users/user/Secret Project/models/model.gguf from /tmp/raw.bin");
    internals.state = { status: "stopped", lastError: "failed" };

    expect(supervisor.status()).toEqual({
      status: "stopped",
      lastError: "failed",
      diagnostic: "failed to load <path> from <path>",
    });
  });
});

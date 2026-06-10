import { describe, expect, it } from "vitest";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
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
    internals.appendStderr(
      "failed to load /Users/user/Secret Project/models/model.gguf from /tmp/raw.bin",
    );
    internals.state = { status: "stopped", lastError: "failed" };

    expect(supervisor.status()).toEqual({
      status: "stopped",
      lastError: "failed",
      diagnostic: "failed to load <path> from <path>",
    });
  });

  it("redacts paths from status lastError", () => {
    const supervisor = new UtilitySidecarSupervisor();
    const internals = supervisor as unknown as {
      markCooldown: (modelPath: string | undefined, lastError: string) => void;
    };

    internals.markCooldown(
      "/Users/user/Secret Project/models/model.gguf",
      "SIDECAR_SPAWN_FAILED: spawn /Users/user/Secret Project/bin/llama-server ENOENT",
    );

    expect(supervisor.status()).toMatchObject({
      status: "cooldown",
      modelPath: "/Users/user/Secret Project/models/model.gguf",
      lastError: "SIDECAR_SPAWN_FAILED: spawn <path> ENOENT",
    });
  });

  it("adds bounded cache and slot persistence flags for chat sidecars", () => {
    const userDataPath = join("/tmp", `luie-sidecar-cache-test-${process.pid}`);
    process.env.LUIE_USER_DATA_PATH = userDataPath;
    const supervisor = new UtilitySidecarSupervisor();
    const internals = supervisor as unknown as {
      buildSpawnArgs: (
        modelPath: string,
        port: number,
        options?: {
          gpuLayers?: number;
          contextSize?: number;
          cacheRamMiB?: number;
          cacheReuse?: number;
        },
      ) => string[];
    };

    try {
      const args = internals.buildSpawnArgs("/tmp/model.gguf", 32123, {
        gpuLayers: -1,
        contextSize: 4096,
        cacheRamMiB: 1024,
        cacheReuse: 256,
      });

      expect(args).toEqual(
        expect.arrayContaining([
          "--cache-type-k",
          "q8_0",
          "--cache-type-v",
          "q8_0",
          "--cache-ram",
          "1024",
          "--cache-reuse",
          "256",
          "--slot-save-path",
          join(userDataPath, "llm-cache", "chat"),
        ]),
      );
    } finally {
      delete process.env.LUIE_USER_DATA_PATH;
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });
});

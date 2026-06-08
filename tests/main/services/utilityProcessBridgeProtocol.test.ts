import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  REQUEST_TIMEOUT_ASK_MS,
  REQUEST_TIMEOUT_EMBED_MS,
  REQUEST_TIMEOUT_GENERATE_MS,
  REQUEST_TIMEOUT_SIDECAR_START_MS,
  REQUEST_TIMEOUT_STATUS_MS,
  REQUEST_TIMEOUT_STOP_MS,
  START_TIMEOUT_MS,
  STOP_GRACE_MS,
  STOP_TIMEOUT_MS,
  unwrapMessage,
} from "../../../src/main/services/features/utility/utilityProcessBridge/index.js";

const repoRoot = process.cwd();

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
    expect(REQUEST_TIMEOUT_GENERATE_MS).toBe(180_000);
    expect(REQUEST_TIMEOUT_SIDECAR_START_MS).toBe(45_000);
    expect(REQUEST_TIMEOUT_STATUS_MS).toBe(2_000);
    expect(REQUEST_TIMEOUT_SIDECAR_START_MS).toBeGreaterThan(
      REQUEST_TIMEOUT_EMBED_MS,
    );
    expect(STOP_TIMEOUT_MS).toBe(5_000);
    expect(STOP_GRACE_MS).toBe(120);
  });

  it("keeps sidecar status as a pushed utility event", () => {
    const protocolSource = fs.readFileSync(
      path.join(
        repoRoot,
        "src/main/services/features/utility/utilityProcessBridge/protocol.ts",
      ),
      "utf8",
    );
    const coreSource = fs.readFileSync(
      path.join(
        repoRoot,
        "src/main/services/features/utility/utilityProcessBridge/internal/core.ts",
      ),
      "utf8",
    );
    const eventHandlersSource = fs.readFileSync(
      path.join(
        repoRoot,
        "src/main/services/features/utility/utilityProcessBridge/internal/eventHandlers.ts",
      ),
      "utf8",
    );
    const utilityMainSource = fs.readFileSync(
      path.join(repoRoot, "src/main/utility/process/utilityProcessMain.ts"),
      "utf8",
    );
    const bridgeSource = fs.readFileSync(
      path.join(
        repoRoot,
        "src/main/services/features/utility/utilityProcessBridge.ts",
      ),
      "utf8",
    );

    expect(protocolSource).toContain('event: "sidecar.status"');
    expect(utilityMainSource).toContain(
      "utilitySidecarSupervisor.onStatusChange",
    );
    expect(utilityMainSource).toContain(
      "utilityEmbeddingSidecarSupervisor.onStatusChange",
    );
    expect(bridgeSource).toContain("./utilityProcessBridge/internal/core.js");
    expect(coreSource).toContain("handleSidecarStatusEvent");
    expect(eventHandlersSource).toContain("SIDECAR_STATUS_CHANGED");
  });
});

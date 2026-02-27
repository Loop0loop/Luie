import { describe, expect, it } from "vitest";
import {
  evaluateIpcContract,
  extractChannelDefinitions,
} from "../../scripts/check-ipc-contract-map.mjs";

const createUsageNode = () => ({
  renderer_invoke: [],
  main_handle: [],
  main_emit: [],
  renderer_listen: [],
  renderer_send: [],
  main_listen: [],
});

describe("check-ipc-contract-map", () => {
  it("detects missing main handler for renderer invoke channel", () => {
    const source = `
      export const IPC_CHANNELS = {
        PROJECT_GET: "project:get",
      } as const;
    `;
    const { channelMap, duplicateChannelValues } = extractChannelDefinitions(source);
    const usageByKey = new Map();
    usageByKey.set("PROJECT_GET", {
      ...createUsageNode(),
      renderer_invoke: [{ file: "src/preload/index.ts", line: 10 }],
    });

    const result = evaluateIpcContract({
      channelMap,
      duplicateChannelValues,
      usageByKey,
      allowlistEntries: [],
    });

    expect(result.errors).toContain(
      "missing main handler for invoke channel PROJECT_GET",
    );
  });

  it("detects one-way main emit without renderer listener", () => {
    const source = `
      export const IPC_CHANNELS = {
        APP_BOOTSTRAP_STATUS_CHANGED: "app:bootstrap-status-changed",
      } as const;
    `;
    const { channelMap, duplicateChannelValues } = extractChannelDefinitions(source);
    const usageByKey = new Map();
    usageByKey.set("APP_BOOTSTRAP_STATUS_CHANGED", {
      ...createUsageNode(),
      main_emit: [{ file: "src/main/lifecycle/bootstrap.ts", line: 22 }],
    });

    const result = evaluateIpcContract({
      channelMap,
      duplicateChannelValues,
      usageByKey,
      allowlistEntries: [],
    });

    expect(result.errors).toContain(
      "missing renderer listener for main emit channel APP_BOOTSTRAP_STATUS_CHANGED",
    );
  });

  it("fails when allowlist entry is expired", () => {
    const source = `
      export const IPC_CHANNELS = {
        APP_GET_VERSION: "app:get-version",
      } as const;
    `;
    const { channelMap, duplicateChannelValues } = extractChannelDefinitions(source);

    const result = evaluateIpcContract({
      channelMap,
      duplicateChannelValues,
      usageByKey: new Map(),
      allowlistEntries: [
        {
          channelKey: "APP_GET_VERSION",
          expiresAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.errors.some((message) => message.includes("allowlist entry expired"))).toBe(
      true,
    );
  });

  it("warns when handler exists but renderer invoke is missing", () => {
    const source = `
      export const IPC_CHANNELS = {
        SNAPSHOT_GET_BY_PROJECT: "snapshot:get-by-project",
      } as const;
    `;
    const { channelMap, duplicateChannelValues } = extractChannelDefinitions(source);
    const usageByKey = new Map();
    usageByKey.set("SNAPSHOT_GET_BY_PROJECT", {
      ...createUsageNode(),
      main_handle: [{ file: "src/main/handler/writing/ipcSnapshotHandlers.ts", line: 35 }],
    });

    const result = evaluateIpcContract({
      channelMap,
      duplicateChannelValues,
      usageByKey,
      allowlistEntries: [],
    });

    expect(result.warnings).toContain(
      "handler exists but renderer invoke missing: SNAPSHOT_GET_BY_PROJECT",
    );
  });
});

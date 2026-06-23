import { describe, expect, it } from "vitest";
import { analyzeIpcHandlerSchemasSource } from "../../scripts/check-ipc-handler-schemas.mjs";

describe("check-ipc-handler-schemas", () => {
  it("detects handlers with parameters and no argsSchema", () => {
    const source = `
      import { registerIpcHandlers } from "../core/ipcRegistrar.js";
      export function registerExample(logger) {
        registerIpcHandlers(logger, [
          {
            channel: IPC_CHANNELS.PROJECT_GET,
            failMessage: "x",
            handler: (id) => id,
          },
        ]);
      }
    `;

    const findings = analyzeIpcHandlerSchemasSource(
      source,
      "src/main/handler/example.ts",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe("missing-ipc-args-schema");
  });

  it("allows handlers that declare argsSchema", () => {
    const source = `
      import { registerIpcHandlers } from "../core/ipcRegistrar.js";
      export function registerExample(logger) {
        registerIpcHandlers(logger, [
          {
            channel: IPC_CHANNELS.PROJECT_GET,
            failMessage: "x",
            argsSchema: projectIdSchema,
            handler: (id) => id,
          },
        ]);
      }
    `;

    const findings = analyzeIpcHandlerSchemasSource(
      source,
      "src/main/handler/example.ts",
    );

    expect(findings).toHaveLength(0);
  });
});

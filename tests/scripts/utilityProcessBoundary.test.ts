import { describe, expect, it } from "vitest";
import { analyzeUtilityProcessBoundarySource } from "../../scripts/check-utility-process-boundary.mjs";

describe("check-utility-process-boundary", () => {
  it("rejects utility imports of the main utility bridge", () => {
    const findings = analyzeUtilityProcessBoundarySource(
      'import { utilityProcessBridge } from "../../services/features/utility/utilityProcessBridge.js";',
      "src/main/utility/rag/example.ts",
    );

    expect(findings).toEqual([
      expect.objectContaining({
        type: "main-utility-bridge-import",
        file: "src/main/utility/rag/example.ts",
      }),
    ]);
  });

  it("rejects utility imports of the main sidecar manager", () => {
    const findings = analyzeUtilityProcessBoundarySource(
      'import { sidecarManager } from "../../infra/llm/sidecarManager.js";',
      "src/main/utility/llm/example.ts",
    );

    expect(findings).toEqual([
      expect.objectContaining({
        type: "main-sidecar-manager-import",
        file: "src/main/utility/llm/example.ts",
      }),
    ]);
  });

  it("rejects Electron main-only imports inside utility code", () => {
    const source = 'import { BrowserWindow, app, ipcMain } from "electron";';

    const findings = analyzeUtilityProcessBoundarySource(
      source,
      "src/main/utility/process/example.ts",
    );

    expect(findings.map((finding) => finding.type)).toEqual([
      "electron-main-only-import",
      "electron-main-only-import",
      "electron-main-only-import",
    ]);
  });

  it("allows shared and utility-local imports", () => {
    const source = `
      import { createLogger } from "../../../shared/logger/index.js";
      import { sidecarSupervisor } from "../llm/sidecarSupervisor.js";
    `;

    expect(
      analyzeUtilityProcessBoundarySource(
        source,
        "src/main/utility/rag/example.ts",
      ),
    ).toHaveLength(0);
  });
});

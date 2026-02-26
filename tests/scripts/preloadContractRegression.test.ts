import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzePreloadContract,
  CORE_METHODS,
} from "../../scripts/check-preload-contract-regression.mjs";

const preloadSourcePath = path.resolve(
  process.cwd(),
  "src/preload/index.ts",
);
const preloadSource = readFileSync(preloadSourcePath, "utf8");

describe("preload contract regression analyzer", () => {
  it("passes for current preload source with non-regressive limits", () => {
    const analysis = analyzePreloadContract(preloadSource, {
      maxNeverCount: Number.POSITIVE_INFINITY,
      maxUnknownCount: Number.POSITIVE_INFINITY,
    });

    expect(analysis.missingSafeInvokeCore).toHaveLength(0);
    expect(analysis.neverTypedCoreMethods).toHaveLength(0);
  });

  it("detects core methods not routed through safeInvokeCore", () => {
    const mutatedSource = preloadSource.replace(
      'safeInvokeCore("project.get", IPC_CHANNELS.PROJECT_GET, id)',
      "safeInvoke(IPC_CHANNELS.PROJECT_GET, id)",
    );

    const analysis = analyzePreloadContract(mutatedSource, {
      maxNeverCount: Number.POSITIVE_INFINITY,
      maxUnknownCount: Number.POSITIVE_INFINITY,
    });

    expect(analysis.missingSafeInvokeCore).toContain("project.get");
  });

  it("detects core method typed as IPCResponse<never>", () => {
    const mutatedSource = preloadSource.replace(
      'ReturnType<RendererApi["project"]["get"]>',
      "Promise<IPCResponse<never>>",
    );

    const analysis = analyzePreloadContract(mutatedSource, {
      maxNeverCount: Number.POSITIVE_INFINITY,
      maxUnknownCount: Number.POSITIVE_INFINITY,
    });

    expect(analysis.neverTypedCoreMethods).toContain("project.get");
  });

  it("detects never/unknown count regressions against baseline limits", () => {
    const analysis = analyzePreloadContract(preloadSource, {
      maxNeverCount: 0,
      maxUnknownCount: 0,
    });

    expect(analysis.exceedsNeverCount).toBe(true);
    expect(analysis.exceedsUnknownCount).toBe(true);
    expect(CORE_METHODS.length).toBeGreaterThan(0);
  });
});

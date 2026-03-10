import { describe, expect, it } from "vitest";
import {
  analyzeRendererStoreUsageSource,
  applyRendererStoreUsageExceptions,
} from "../../scripts/check-renderer-store-usage.mjs";

describe("renderer store usage check", () => {
  it("detects selectorless store hooks and forbidden imports", () => {
    const source = `
      import { ipcRenderer } from "electron";
      import path from "node:path";

      export function Sample() {
        const store = useUIStore();
        return store;
      }
    `;

    const findings = analyzeRendererStoreUsageSource(
      source,
      "src/renderer/src/features/sample/Sample.tsx",
    );

    expect(
      findings.some((item) => item.type === "forbidden-renderer-import"),
    ).toBe(true);
    expect(
      findings.some((item) => item.type === "selectorless-store-hook"),
    ).toBe(true);
  });

  it("filters findings via non-expired exceptions and reports expired exceptions", () => {
    const findings = [
      {
        type: "selectorless-store-hook",
        severity: "error",
        message:
          "Renderer store hooks must select a slice instead of subscribing to the whole store.",
        file: "src/renderer/src/features/sample/Sample.tsx",
        line: 6,
        text: "const store = useUIStore();",
      },
    ];

    const result = applyRendererStoreUsageExceptions(
      findings,
      [
        {
          id: "renderer-store-1",
          type: "selectorless-store-hook",
          file: "src/renderer/src/features/sample/Sample.tsx",
          pattern: "useUIStore",
          expiresAt: "2026-12-31T23:59:59.000Z",
        },
        {
          id: "renderer-store-2",
          type: "forbidden-renderer-import",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      ],
      new Date("2026-03-10T00:00:00.000Z"),
    );

    expect(result.findings).toHaveLength(0);
    expect(result.expiredExceptions).toHaveLength(1);
    expect(result.expiredExceptions[0].id).toBe("renderer-store-2");
  });
});

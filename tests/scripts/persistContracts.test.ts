import { describe, expect, it } from "vitest";
import { analyzePersistContractsSource } from "../../scripts/check-persist-contracts.mjs";

describe("persist contracts check", () => {
  it("flags persist stores that omit required recovery options", () => {
    const source = `
      import { persist } from "zustand/middleware";

      export const useSampleStore = persist(
        () => ({ value: 1 }),
        {
          name: "sample-store",
          partialize: (state) => state,
        },
      );
    `;

    const findings = analyzePersistContractsSource(
      source,
      "src/renderer/src/features/sample/sampleStore.ts",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.missing).toEqual([
      "version",
      "migrate",
      "merge",
      "onRehydrateStorage",
    ]);
  });

  it("accepts persist stores with versioned recovery hooks", () => {
    const source = `
      import { persist } from "zustand/middleware";

      export const useSampleStore = persist(
        () => ({ value: 1 }),
        {
          name: "sample-store",
          version: 2,
          migrate: (state) => state,
          merge: (persistedState, currentState) => ({ ...currentState, ...persistedState }),
          onRehydrateStorage: () => () => undefined,
          partialize: (state) => state,
        },
      );
    `;

    const findings = analyzePersistContractsSource(
      source,
      "src/renderer/src/features/sample/sampleStore.ts",
    );

    expect(findings).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { analyzeMainServiceBoundarySource } from "../../scripts/check-main-service-boundaries.mjs";

describe("check-main-service-boundaries", () => {
  it("flags direct legacy service imports outside domain barrels", () => {
    const source = `
      import { projectService } from "../services/core/projectService.js";
      import { characterService } from "../services/world/characterService.js";
    `;

    expect(
      analyzeMainServiceBoundarySource(source, "src/main/handler/example.ts"),
    ).toEqual([
      {
        file: "src/main/handler/example.ts",
        line: 2,
        source:
          'import { projectService } from "../services/core/projectService.js";',
      },
      {
        file: "src/main/handler/example.ts",
        line: 3,
        source:
          'import { characterService } from "../services/world/characterService.js";',
      },
    ]);
  });

  it("allows domain barrels to bridge old paths during migration", () => {
    const source = `
      export { projectService } from "../../services/core/projectService.js";
    `;

    expect(
      analyzeMainServiceBoundarySource(
        source,
        "src/main/domains/project/index.ts",
      ),
    ).toEqual([]);
  });
});

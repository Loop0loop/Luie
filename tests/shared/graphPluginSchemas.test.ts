import { describe, expect, it } from "vitest";
import {
  graphPluginCatalogItemSchema,
  graphPluginManifestSchema,
} from "../../src/shared/schemas/index.js";

describe("graph plugin schemas", () => {
  it("accepts a valid graph plugin manifest", () => {
    const parsed = graphPluginManifestSchema.safeParse({
      id: "foundation-graph",
      name: "Foundation Graph",
      version: "1.0.0",
      apiVersion: "1.0.0",
      kind: "graph-template-bundle",
      description: "Starter graph templates",
      author: "Luie Team",
      templates: [
        {
          id: "kingdom-foundation",
          title: "Kingdom Foundation",
          summary: "Starter map",
          thumbnail: "assets/thumb.svg",
          graphEntry: "templates/kingdom.graph.json",
          tags: ["starter"],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects executable manifest fields", () => {
    const parsed = graphPluginManifestSchema.safeParse({
      id: "foundation-graph",
      name: "Foundation Graph",
      version: "1.0.0",
      apiVersion: "1.0.0",
      kind: "graph-template-bundle",
      description: "Starter graph templates",
      author: "Luie Team",
      main: "index.js",
      templates: [
        {
          id: "kingdom-foundation",
          title: "Kingdom Foundation",
          summary: "Starter map",
          thumbnail: "assets/thumb.svg",
          graphEntry: "templates/kingdom.graph.json",
          tags: ["starter"],
        },
      ],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("Executable manifest field");
  });

  it("rejects catalog entries without integrity metadata", () => {
    const parsed = graphPluginCatalogItemSchema.safeParse({
      pluginId: "foundation-graph",
      version: "1.0.0",
      name: "Foundation Graph",
      summary: "Starter graph templates",
      releaseTag: "foundation-graph-v1.0.0",
      assetUrl: "https://example.com/foundation-graph.zip",
      size: 128,
      minAppVersion: "0.1.16",
      apiVersion: "1.0.0",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === "sha256")).toBe(true);
  });
});

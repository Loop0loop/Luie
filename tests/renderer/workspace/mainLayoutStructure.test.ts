import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMainLayoutSource = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/src/features/workspace/components/layout/MainLayout.tsx",
    ),
    "utf8",
  );

describe("MainLayout panel topology", () => {
  it("keeps sidebar, content, and context in the same root panel group", () => {
    const source = readMainLayoutSource();

    expect(source).toContain('id="main-layout-group"');
    expect(source).toContain('id="main-content-panel"');
    expect(source).toContain('id="context-panel"');
    expect(source).not.toContain('id="main-layout-body-group"');
  });

  it("does not update region state from panel onResize handlers", () => {
    const source = readMainLayoutSource();
    const onResizeHandlers = Array.from(
      source.matchAll(/onResize=\{\(panelSize\) => \{[\s\S]*?\n\s*\}\}/g),
      ([match]) => match,
    ).join("\n");

    expect(onResizeHandlers).not.toContain("setRegionOpen(");
  });
});

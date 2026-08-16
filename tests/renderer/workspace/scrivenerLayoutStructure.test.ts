import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readScrivenerLayoutSource = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/src/features/workspace/components/layout/ScrivenerLayout.tsx",
    ),
    "utf8",
  );

describe("ScrivenerLayout panel topology", () => {
  it("keeps binder and inspector pixel-stable during group resizes", () => {
    const source = readScrivenerLayoutSource();
    const binderPanel = source.match(/<Panel\s+id="sidebar"[\s\S]*?>/)?.[0] ?? "";
    const inspectorPanel = source.match(/<Panel\s+id="inspector"[\s\S]*?>/)?.[0] ?? "";

    expect(binderPanel).toContain('groupResizeBehavior="preserve-pixel-size"');
    expect(inspectorPanel).toContain('groupResizeBehavior="preserve-pixel-size"');
  });
});

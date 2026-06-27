import { describe, expect, it } from "vitest";
import {
  shouldPersistMainLayoutContext,
  type MainLayoutResizeSurface,
} from "../../../src/renderer/src/features/workspace/utils/mainLayoutResize.js";

describe("main layout resize routing", () => {
  it("does not persist context layout while the left sidebar is being resized", () => {
    expect(shouldPersistMainLayoutContext("default.sidebar")).toBe(false);
    expect(shouldPersistMainLayoutContext("canvas.activity")).toBe(false);
  });

  it("persists context layout for context drags and non-user layout changes", () => {
    expect(shouldPersistMainLayoutContext("default.panel")).toBe(true);
    expect(shouldPersistMainLayoutContext("canvas.binder")).toBe(true);
    expect(shouldPersistMainLayoutContext(null)).toBe(true);
    expect(
      shouldPersistMainLayoutContext(
        "scrivener.binder" as MainLayoutResizeSurface,
      ),
    ).toBe(true);
  });
});

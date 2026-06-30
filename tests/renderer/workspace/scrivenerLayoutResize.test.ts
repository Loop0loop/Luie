import { describe, expect, it } from "vitest";
import {
  getScrivenerLayoutPersistTarget,
  type ScrivenerLayoutResizeSurface,
} from "../../../src/renderer/src/features/workspace/utils/scrivenerLayoutResize.js";

describe("scrivener layout resize routing", () => {
  it("persists only the panel next to the active resize handle", () => {
    expect(getScrivenerLayoutPersistTarget("scrivener.binder")).toBe("binder");
    expect(getScrivenerLayoutPersistTarget("scrivener.inspector")).toBe(
      "inspector",
    );
  });

  it("does not persist non-user layout commits without an active resize handle", () => {
    expect(getScrivenerLayoutPersistTarget(null)).toBe("none");
    expect(
      getScrivenerLayoutPersistTarget(
        "default.sidebar" as ScrivenerLayoutResizeSurface,
      ),
    ).toBe("none");
  });
});

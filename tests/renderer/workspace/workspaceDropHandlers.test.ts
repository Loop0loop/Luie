import { describe, expect, it } from "vitest";
import { getChapterDropMainView } from "@renderer/features/workspace/utils/workspaceDropRouting";

describe("workspace drop routing", () => {
  it("switches Scrivener back to the editor when a chapter is dropped", () => {
    expect(getChapterDropMainView("scrivener", "chapter")).toEqual({
      type: "editor",
    });
  });

  it("does not change the main view for chapter drops in other modes", () => {
    expect(getChapterDropMainView("default", "chapter")).toBeNull();
    expect(getChapterDropMainView("docs", "chapter")).toBeNull();
    expect(getChapterDropMainView("scrivener", "character")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  getSidebarDefaultWidth,
  normalizeSidebarWidthsWithMigrations,
} from "../../../src/shared/constants/sidebarSizing.js";

describe("sidebarSizing scoped width migration", () => {
  it("migrates legacy shared right widths into docs/editor scoped keys", () => {
    const normalized = normalizeSidebarWidthsWithMigrations({
      character: 520,
      analysis: 610,
      snapshot: 480,
    });

    expect(normalized.docsCharacter).toBe(520);
    expect(normalized.editorCharacter).toBe(520);
    expect(normalized.docsAnalysis).toBe(610);
    expect(normalized.editorAnalysis).toBe(610);
    expect(normalized.docsSnapshot).toBe(480);
    expect(normalized.editorSnapshot).toBe(480);
  });

  it("keeps scoped keys when they already exist", () => {
    const normalized = normalizeSidebarWidthsWithMigrations({
      character: 700,
      docsCharacter: 430,
      editorCharacter: 390,
    });

    expect(normalized.docsCharacter).toBe(430);
    expect(normalized.editorCharacter).toBe(400);
  });

  it("applies conservative default width for scoped right panels", () => {
    expect(getSidebarDefaultWidth("docsCharacter")).toBe(600);
    expect(getSidebarDefaultWidth("editorCharacter")).toBe(600);
  });
});

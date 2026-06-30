import { describe, expect, it } from "vitest";
import {
  getSynchronizedSidebarWidthFeatures,
  getPersistableSidebarWidths,
  getSidebarDefaultWidth,
  normalizeSidebarWidthsWithMigrations,
} from "../../../src/renderer/src/shared/constants/sidebarSizing.js";

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
    expect(normalized.editorCharacter).toBe(390);
  });

  it("applies conservative default width for scoped right panels", () => {
    expect(getSidebarDefaultWidth("docsCharacter")).toBe(600);
    expect(getSidebarDefaultWidth("editorCharacter")).toBe(600);
  });

  it("does not runtime-sync independent left sidebar widths", () => {
    expect(getSynchronizedSidebarWidthFeatures("mainSidebar")).toEqual([]);
    expect(getSynchronizedSidebarWidthFeatures("docsBinder")).toEqual([]);
    expect(getSynchronizedSidebarWidthFeatures("scrivenerBinder")).toEqual([]);
  });

  it("does not runtime-sync docs and editor right panel widths", () => {
    expect(getSynchronizedSidebarWidthFeatures("docsCharacter")).toEqual([]);
    expect(getSynchronizedSidebarWidthFeatures("editorCharacter")).toEqual([]);
    expect(getSynchronizedSidebarWidthFeatures("character")).toEqual([]);
  });

  it("omits legacy shared keys from persisted sidebar widths", () => {
    const persistable = getPersistableSidebarWidths({
      mainSidebar: 300,
      docsBinder: 310,
      scrivenerBinder: 320,
      docsCharacter: 430,
      editorCharacter: 390,
      characterSidebar: 280,
      character: 700,
      binder: 360,
      context: 650,
      inspector: 640,
    });

    expect(persistable).toMatchObject({
      mainSidebar: 300,
      docsBinder: 310,
      scrivenerBinder: 320,
      docsCharacter: 430,
      editorCharacter: 390,
      characterSidebar: 280,
    });
    expect(persistable.character).toBeUndefined();
    expect(persistable.binder).toBeUndefined();
    expect(persistable.context).toBeUndefined();
    expect(persistable.inspector).toBeUndefined();
  });
});

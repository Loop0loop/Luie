import { describe, expect, it, vi } from "vitest";
import { initializeTemplateProject } from "../../../src/renderer/src/features/project/hooks/projectTemplateInitialization";

const makeProject = () => ({
  id: "project-1",
  title: "Template Project",
  createdAt: "2026-02-28T00:00:00.000Z",
  updatedAt: "2026-02-28T00:00:00.000Z",
});

describe("projectTemplateInitialization", () => {
  it("initializes .luie project and returns first chapter id", async () => {
    const createLuiePackage = vi.fn().mockResolvedValue({ success: true });
    const writeProjectFile = vi.fn().mockResolvedValue({ success: true });
    const writeFile = vi.fn().mockResolvedValue({ success: true });
    const createChapter = vi.fn().mockResolvedValue({ id: "chapter-1" });
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    const result = await initializeTemplateProject(
      {
        project: makeProject(),
        projectPath: "/tmp/template.luie",
        templateId: "novel_basic",
        defaultChapterTitle: "Chapter 1",
      },
      {
        fs: { createLuiePackage, writeProjectFile, writeFile },
        createChapter,
        deleteProject,
        logger,
      },
    );

    expect(result).toEqual({ chapterId: "chapter-1" });
    expect(createLuiePackage).toHaveBeenCalledTimes(1);
    expect(writeProjectFile).toHaveBeenCalledTimes(2);
    expect(writeFile).not.toHaveBeenCalled();
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("rolls back when initial chapter file write fails for .luie", async () => {
    const createLuiePackage = vi.fn().mockResolvedValue({ success: true });
    const writeProjectFile = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        success: false,
        error: { code: "FS_WRITE_FAILED", message: "disk full" },
      });
    const writeFile = vi.fn().mockResolvedValue({ success: true });
    const createChapter = vi.fn().mockResolvedValue({ id: "chapter-1" });
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    const result = await initializeTemplateProject(
      {
        project: makeProject(),
        projectPath: "/tmp/template.luie",
        templateId: "novel_basic",
        defaultChapterTitle: "Chapter 1",
      },
      {
        fs: { createLuiePackage, writeProjectFile, writeFile },
        createChapter,
        deleteProject,
        logger,
      },
    );

    expect(result).toBeNull();
    expect(deleteProject).toHaveBeenCalledWith("project-1");
    expect(logger.error).toHaveBeenCalled();
  });

  it("writes markdown seed content for markdown target", async () => {
    const createLuiePackage = vi.fn().mockResolvedValue({ success: true });
    const writeProjectFile = vi.fn().mockResolvedValue({ success: true });
    const writeFile = vi.fn().mockResolvedValue({ success: true });
    const createChapter = vi.fn().mockResolvedValue({ id: "chapter-1" });
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    const result = await initializeTemplateProject(
      {
        project: makeProject(),
        projectPath: "/tmp/template.md",
        templateId: "essay",
        defaultChapterTitle: "Intro",
      },
      {
        fs: { createLuiePackage, writeProjectFile, writeFile },
        createChapter,
        deleteProject,
        logger,
      },
    );

    expect(result).toEqual({ chapterId: "chapter-1" });
    expect(writeFile).toHaveBeenCalledTimes(1);
    const seedContent = writeFile.mock.calls[0]?.[1];
    expect(seedContent).toContain("## Intro");
    expect(createLuiePackage).not.toHaveBeenCalled();
    expect(writeProjectFile).not.toHaveBeenCalled();
  });

  it("rolls back when chapter creation returns empty id", async () => {
    const createLuiePackage = vi.fn().mockResolvedValue({ success: true });
    const writeProjectFile = vi.fn().mockResolvedValue({ success: true });
    const writeFile = vi.fn().mockResolvedValue({ success: true });
    const createChapter = vi.fn().mockResolvedValue({ id: "" });
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    const logger = { error: vi.fn() };

    const result = await initializeTemplateProject(
      {
        project: makeProject(),
        projectPath: "/tmp/template.luie",
        templateId: "novel_basic",
        defaultChapterTitle: "Chapter 1",
      },
      {
        fs: { createLuiePackage, writeProjectFile, writeFile },
        createChapter,
        deleteProject,
        logger,
      },
    );

    expect(result).toBeNull();
    expect(deleteProject).toHaveBeenCalledWith("project-1");
  });
});

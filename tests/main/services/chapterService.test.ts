import { describe, it, expect, vi, beforeAll } from "vitest";
import { ChapterService } from "../../../src/main/services/chapterService.js";
import { ProjectService } from "../../../src/main/services/projectService.js";
import { autoExtractService } from "../../../src/main/services/autoExtractService.js";
import { projectService } from "../../../src/main/services/projectService.js";
import { generateText } from "../../helpers/generateText";
import { ErrorCode } from "../../../src/shared/constants/errorCode";

type ChapterRecord = {
  content: string;
  wordCount?: number;
};

const chapterService = new ChapterService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
});

describe("ChapterService", () => {
  it("updates 50k content and stores wordCount", async () => {
    const project = await localProjectService.createProject({
      title: "Test Project",
      description: "unit",
      projectPath: "/tmp/test.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Chapter 1",
    });

    const content = generateText(50000);
    await chapterService.updateChapter({ id: chapter.id as string, content });

    const updated = (await chapterService.getChapter(
      chapter.id as string,
    )) as ChapterRecord;
    expect(updated.content).toBe(content);
    expect(updated.wordCount).toBe(content.length);
    expect(updated.content.length).toBe(50000);
  });

  it("rejects empty title", async () => {
    const project = await localProjectService.createProject({
      title: "Validation Project",
      description: "unit",
      projectPath: "/tmp/validation.luie",
    });

    await expect(
      chapterService.createChapter({
        projectId: project.id as string,
        title: "",
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.REQUIRED_FIELD_MISSING,
    });
  });

  it("handles 1,000,000 chars without truncation", async () => {
    const project = await localProjectService.createProject({
      title: "Large Content Project",
      description: "unit",
      projectPath: "/tmp/large.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Chapter Large",
    });

    const content = generateText(1_000_000);
    await chapterService.updateChapter({ id: chapter.id as string, content });

    const updated = (await chapterService.getChapter(
      chapter.id as string,
    )) as ChapterRecord;
    expect(updated.content.length).toBe(1_000_000);
  }, 60000);

  it("creates 100 chapters with 50k content each", async () => {
    const project = await localProjectService.createProject({
      title: "Big Project",
      description: "stress",
      projectPath: "/tmp/big.luie",
    });

    const content = generateText(50000);

    for (let i = 0; i < 100; i += 1) {
      const chapter = await chapterService.createChapter({
        projectId: project.id as string,
        title: `Chapter ${i + 1}`,
      });
      await chapterService.updateChapter({ id: chapter.id as string, content });
    }

    const chapters = await chapterService.getAllChapters(project.id as string);
    expect(chapters).toHaveLength(100);
  }, 60000);
});

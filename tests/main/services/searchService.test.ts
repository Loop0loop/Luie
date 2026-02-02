import { describe, it, expect, vi, beforeAll } from "vitest";
import { SearchService } from "../../../src/main/services/searchService.js";
import { ChapterService } from "../../../src/main/services/chapterService.js";
import { ProjectService } from "../../../src/main/services/projectService.js";
import { autoExtractService } from "../../../src/main/services/autoExtractService.js";
import { projectService } from "../../../src/main/services/projectService.js";

const searchService = new SearchService();
const chapterService = new ChapterService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
});

describe("SearchService", () => {
  it("finds chapter content by sentence", async () => {
    const project = await localProjectService.createProject({
      title: "Search Project",
      description: "unit",
      projectPath: "/tmp/search.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Chapter Search",
    });

    const content = "푸른 달이 떠오르는 밤, 검은 숲이 숨을 죽였다.";
    await chapterService.updateChapter({ id: chapter.id as string, content });

    const results = await searchService.search({
      projectId: project.id as string,
      query: "푸른 달",
      type: "all",
    });

    expect(results.some((r) => r.type === "chapter" && r.id === chapter.id)).toBe(true);
  });
});

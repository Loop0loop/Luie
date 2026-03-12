import { describe, it, expect, vi, beforeAll } from "vitest";
import { SearchService } from "../../../src/main/services/features/searchService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { cacheDb } from "../../../src/main/database/cacheDb.js";
import { chapterSearchCacheService } from "../../../src/main/services/features/chapterSearchCacheService.js";

const searchService = new SearchService();
const chapterService = new ChapterService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
    exported: false,
  });
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

  it("rebuilds chapter search cache after cache wipe", async () => {
    const project = await localProjectService.createProject({
      title: "Search Cache Recovery",
      description: "unit",
      projectPath: "/tmp/search-cache-recovery.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Cache Recovery Chapter",
    });

    await chapterService.updateChapter({
      id: chapter.id as string,
      content: "유리 돔 아래의 정원은 아직 따뜻했다.",
    });

    await cacheDb.getClient().chapterSearchDocument.deleteMany({
      where: { projectId: project.id as string },
    });

    const results = await searchService.search({
      projectId: project.id as string,
      query: "유리 돔",
      type: "all",
    });

    const restoredCount = await cacheDb.getClient().chapterSearchDocument.count({
      where: { projectId: project.id as string },
    });

    expect(results.some((r) => r.type === "chapter" && r.id === chapter.id)).toBe(true);
    expect(restoredCount).toBe(1);
  });

  it("builds chapter FTS rows for cache-backed search", async () => {
    const project = await localProjectService.createProject({
      title: "Search FTS Project",
      description: "unit",
      projectPath: "/tmp/search-fts.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "빛의 복도",
    });

    await chapterService.updateChapter({
      id: chapter.id as string,
      content: "하린은 빛의 복도 끝에서 오래된 문장을 발견했다.",
    });

    const ftsCount = await chapterSearchCacheService.getProjectFtsRowCount(
      project.id as string,
    );
    const results = await searchService.search({
      projectId: project.id as string,
      query: "빛의 복도",
      type: "all",
    });

    expect(ftsCount).toBe(1);
    expect(results.some((r) => r.type === "chapter" && r.id === chapter.id)).toBe(true);
  });
});

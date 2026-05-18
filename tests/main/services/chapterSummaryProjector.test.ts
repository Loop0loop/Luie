import { beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { chapterSummaryProjector } from "../../../src/main/services/features/memory/chapterSummaryProjector.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";

describe("chapterSummaryProjector", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
      exported: false,
    });
    vi
      .spyOn(projectService, "persistPackageAfterMutation")
      .mockResolvedValue(undefined);
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
  });

  it("creates fallback chapter summary and returns it", async () => {
    const project = await localProjectService.createProject({
      title: "Chapter Summary Fallback",
      description: "unit",
      projectPath: "/tmp/chapter-summary-fallback.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "요약 테스트",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "유란은 흑월상단과의 협상에서 갈등을 겪고, 결국 단서를 얻어 다음 행동을 결심한다.",
    });

    const processed = await chapterSummaryProjector.processPendingSummaryJobs({
      projectId: String(project.id),
      limit: 5,
    });

    expect(processed.queued).toBeGreaterThan(0);
    expect(processed.processed).toBeGreaterThan(0);

    const summary = await chapterSummaryProjector.getChapterSummary(String(chapter.id));
    expect(summary).not.toBeNull();
    expect(summary?.chapterId).toBe(String(chapter.id));
    expect(summary?.summary.length ?? 0).toBeGreaterThan(0);
    expect(summary?.isFallback).toBe(true);

    const status = await chapterSummaryProjector.getSummaryStatus(String(project.id));
    expect(status.failedCount).toBe(0);
    expect(status.completedCount).toBeGreaterThan(0);
  });
});

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { chapterSummaryProjector } from "../../../src/main/services/features/memory/chapterSummaryProjector.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { utilityProcessBridge } from "../../../src/main/services/features/utility/utilityProcessBridge.js";
import {
  db,
  memoryBuildJob,
} from "../../../src/main/infra/database/index.js";
import { cancelMemoryBuildJobs } from "../../../src/main/services/features/memory/jobControl.js";
import {
  MEMORY_JOB_TYPES,
  MEMORY_TARGET_TYPES,
} from "../../../src/main/services/features/memory/memoryJobConstants.js";

describe("chapterSummaryProjector", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
    vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue(
      {
        exported: false,
      },
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue(
      {
        exported: false,
      },
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
    vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
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
      content:
        "유란은 흑월상단과의 협상에서 갈등을 겪고, 결국 단서를 얻어 다음 행동을 결심한다.",
    });

    const processed = await chapterSummaryProjector.processPendingSummaryJobs({
      projectId: String(project.id),
      limit: 5,
    });

    expect(processed.queued).toBeGreaterThan(0);
    expect(processed.processed).toBeGreaterThan(0);

    const summary = await chapterSummaryProjector.getChapterSummary(
      String(chapter.id),
    );
    expect(summary).not.toBeNull();
    expect(summary?.chapterId).toBe(String(chapter.id));
    expect(summary?.summary.length ?? 0).toBeGreaterThan(0);
    expect(summary?.isFallback).toBe(true);

    const status = await chapterSummaryProjector.getSummaryStatus(
      String(project.id),
    );
    expect(status.failedCount).toBe(0);
    expect(status.completedCount).toBeGreaterThan(0);
  });

  it("falls back when utility LLM summary generation fails", async () => {
    vi.stubEnv("LUIE_ENABLE_LLM_DERIVED_SUMMARY", "1");
    vi.spyOn(utilityProcessBridge, "generateText").mockRejectedValue(
      new Error("sidecar unavailable"),
    );

    const project = await localProjectService.createProject({
      title: "Chapter Summary Utility Failure",
      description: "unit",
      projectPath: "/tmp/chapter-summary-utility-failure.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "요약 실패 테스트",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content:
        "세아는 무너진 관문 앞에서 동료를 잃은 이유를 되짚고, 다시 성 안으로 들어가기로 결정한다.",
    });

    const processed = await chapterSummaryProjector.processPendingSummaryJobs({
      projectId: String(project.id),
      limit: 5,
    });

    expect(processed.processed).toBeGreaterThan(0);

    const summary = await chapterSummaryProjector.getChapterSummary(
      String(chapter.id),
    );
    expect(summary).not.toBeNull();
    expect(summary?.isFallback).toBe(true);

    const status = await chapterSummaryProjector.getSummaryStatus(
      String(project.id),
    );
    expect(status.failedCount).toBe(0);
    expect(status.completedCount).toBeGreaterThan(0);
  });

  it("finalizes a running summary job as canceled when cancellation is requested during LLM generation", async () => {
    vi.stubEnv("LUIE_ENABLE_LLM_DERIVED_SUMMARY", "1");

    const project = await localProjectService.createProject({
      title: "Chapter Summary Cancellation",
      description: "unit",
      projectPath: "/tmp/chapter-summary-cancellation.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "요약 취소 테스트",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content:
        "리아는 동부 전선에서 돌아온 뒤 오래된 맹약이 아직 유효한지 확인하려 한다.",
    });

    vi.spyOn(utilityProcessBridge, "generateText").mockImplementation(
      async () => {
        await cancelMemoryBuildJobs({ projectId: String(project.id) });
        return {
          text: "취소 요청 이후 생성된 요약",
          providerName: "test-provider",
        };
      },
    );

    const processed = await chapterSummaryProjector.processPendingSummaryJobs({
      projectId: String(project.id),
      limit: 5,
    });

    expect(processed.processed).toBe(0);

    const [job] = await db
      .getClient()
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, String(project.id)),
          eq(memoryBuildJob.targetType, MEMORY_TARGET_TYPES.CHAPTER),
          eq(memoryBuildJob.targetId, String(chapter.id)),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_SUMMARY),
        ),
      );
    expect(job).toMatchObject({
      status: "canceled",
      error: "CANCELED_BY_USER",
    });

    const summary = await chapterSummaryProjector.getChapterSummary(
      String(chapter.id),
    );
    expect(summary).toBeNull();
  });
});

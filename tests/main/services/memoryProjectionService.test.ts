import { beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import {
  chunkText,
  memoryProjectionService,
} from "../../../src/main/services/features/memory/memoryProjectionService.js";
import { searchService } from "../../../src/main/services/features/searchService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";

describe("memoryProjectionService", () => {
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

  it("chunks text with paragraph boundaries and overlap", () => {
    const content = [
      "첫 문단은 짧습니다.",
      "두 번째 문단은 조금 더 길게 작성해서 청킹 경계를 확인합니다.",
      "세 번째 문단은 키워드 검은 패를 포함합니다.",
    ].join("\n\n");
    const chunks = chunkText(content, 40, 5, 80);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startOffset).toBe(0);
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
      expect(content.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.content);
      if (i > 0) {
        expect(chunk.startOffset).toBeLessThanOrEqual(chunks[i - 1].endOffset);
      }
    }
  });

  it("rebuilds memory chunks and supports chunk search/backlink", async () => {
    const project = await localProjectService.createProject({
      title: "Memory Chunk Search",
      description: "unit",
      projectPath: "/tmp/memory-chunk-search.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "keyword chapter",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: [
        "이 장면은 서막입니다.",
        "핵심 키워드는 검은 패 입니다.",
        "백링크 검증을 위한 문단입니다.",
      ].join("\n\n"),
    });

    const processed = await memoryProjectionService.processPendingChunkJobs({
      projectId: String(project.id),
      sourceType: "chapter",
      sourceId: String(chapter.id),
      limit: 20,
    });
    expect(processed.processed).toBeGreaterThanOrEqual(1);

    const chunks = await searchService.searchChunks({
      projectId: String(project.id),
      query: "검은 패",
      limit: 10,
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chapterId).toBe(String(chapter.id));

    const backlink = await searchService.getChunkBacklink(chunks[0].chunkId);
    expect(backlink.chunkId).toBe(chunks[0].chunkId);
    expect(backlink.chapterId).toBe(String(chapter.id));
    expect(backlink.offset).toBeGreaterThanOrEqual(0);
  });
});

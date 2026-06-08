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
import type { ServiceError } from "../../../src/main/utils/serviceError.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import { db, memoryChunk, memoryEpisodeExtractionJob } from "../../../src/main/infra/database/index.js";
import { eq } from "drizzle-orm";
import {
  buildMemoryChunkIndexText,
  buildMemoryContextLabel,
} from "../../../src/main/services/features/memory/projection/index.js";

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

  it("records paragraph range metadata for each chunk", () => {
    const content = [
      "첫 문단은 짧습니다.",
      "두 번째 문단은 조금 더 길게 작성해서 청킹 경계를 확인합니다.",
      "세 번째 문단은 키워드 검은 패를 포함합니다.",
    ].join("\n\n");
    const chunks = chunkText(content, 40, 5, 80);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      paragraphStartIndex: 0,
      paragraphEndIndex: expect.any(Number),
    });
    expect(chunks.at(-1)).toMatchObject({
      paragraphEndIndex: 2,
    });
    for (const chunk of chunks) {
      expect(chunk.paragraphStartIndex).toBeLessThanOrEqual(chunk.paragraphEndIndex);
    }
  });

  it("records paragraph range metadata for html paragraph content", () => {
    const content = [
      "<p>첫 HTML 문단입니다.</p>",
      "<p>두 번째 HTML 문단은 조금 더 길게 작성해서 청킹 경계를 확인합니다.</p>",
      "<p>세 번째 HTML 문단은 키워드 검은 패를 포함합니다.</p>",
    ].join("");
    const chunks = chunkText(content, 55, 5, 100);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      paragraphStartIndex: 0,
      paragraphEndIndex: expect.any(Number),
    });
    expect(chunks.at(-1)).toMatchObject({
      paragraphEndIndex: 2,
    });
  });

  it("does not emit whitespace-only chunks", () => {
    const content = "   \n\n\t\t\n\n";
    const chunks = chunkText(content, 40, 5, 80);
    expect(chunks).toHaveLength(0);
  });

  it("builds index text from context label without changing raw content", () => {
    const rawContent = "사절단은 조용히 문서를 접고 창밖의 비를 바라보았다.";
    const contextLabel = buildMemoryContextLabel({
      sourceType: "chapter",
      title: "은하궁 회담",
    });
    const indexText = buildMemoryChunkIndexText({
      contextLabel,
      content: rawContent,
    });

    expect(contextLabel).toBe("chapter: 은하궁 회담");
    expect(indexText).toContain("은하궁 회담");
    expect(indexText).toContain(rawContent);
    expect(rawContent).not.toContain("은하궁 회담");
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

  it("expands a search hit to its parent source window without changing the raw hit", async () => {
    const project = await localProjectService.createProject({
      title: "Memory Chunk Window",
      description: "unit",
      projectPath: "/tmp/memory-chunk-window.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "window chapter",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: [
        "앞장면단서 ".repeat(90),
        "중앙 은밀한징표 ".repeat(90),
        "뒤장면결말 ".repeat(90),
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
      query: "은밀한징표",
      limit: 10,
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain("은밀한징표");

    const window = await searchService.getChunkWindow({
      projectId: String(project.id),
      chunkId: chunks[0].chunkId,
      before: 1,
      after: 1,
    });

    expect(window.anchorChunkId).toBe(chunks[0].chunkId);
    expect(window.sourceType).toBe("chapter");
    expect(window.sourceId).toBe(String(chapter.id));
    expect(window.chapterId).toBe(String(chapter.id));
    expect(window.chunks.length).toBeGreaterThan(1);
    expect(window.content).toContain(chunks[0].content);
    expect(window.content).toMatch(/앞장면단서|뒤장면결말/);
    expect(window.startOffset ?? 0).toBeLessThanOrEqual(chunks[0].startOffset ?? 0);
    expect(window.endOffset ?? 0).toBeGreaterThanOrEqual(chunks[0].endOffset ?? 0);
  });

  it("expands a hit by neighboring paragraph ranges", async () => {
    const project = await localProjectService.createProject({
      title: "Memory Paragraph Window",
      description: "unit",
      projectPath: "/tmp/memory-paragraph-window.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "paragraph window chapter",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: [
        "첫문단 배경 ".repeat(130),
        "둘째문단 목표키워드 ".repeat(130),
        "셋째문단 후속근거 ".repeat(130),
        "넷째문단 제외범위 ".repeat(130),
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
      query: "목표키워드",
      limit: 10,
    });
    expect(chunks.length).toBeGreaterThan(0);

    const window = await searchService.getChunkWindow({
      projectId: String(project.id),
      chunkId: chunks[0].chunkId,
      unit: "paragraph",
      before: 1,
      after: 1,
    } as Parameters<typeof searchService.getChunkWindow>[0]);

    expect(window.paragraphStartIndex).toBe(0);
    expect(window.paragraphEndIndex).toBe(2);
    expect(window.content).toContain("첫문단 배경");
    expect(window.content).toContain("둘째문단 목표키워드");
    expect(window.content).toContain("셋째문단 후속근거");
    expect(window.content).not.toContain("넷째문단 제외범위");
    expect(window.chunks.every((chunk) =>
      chunk.paragraphStartIndex !== null && chunk.paragraphEndIndex !== null,
    )).toBe(true);
  });

  it("indexes contextual labels without contaminating returned raw chunk content", async () => {
    const project = await localProjectService.createProject({
      title: "Memory Context Label",
      description: "unit",
      projectPath: "/tmp/memory-context-label.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "은하궁 회담",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "사절단은 조용히 문서를 접고 창밖의 비를 바라보았다.",
    });

    await memoryProjectionService.processPendingChunkJobs({
      projectId: String(project.id),
      sourceType: "chapter",
      sourceId: String(chapter.id),
      limit: 20,
    });

    const chunks = await searchService.searchChunks({
      projectId: String(project.id),
      query: "은하궁",
      limit: 10,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toBe("사절단은 조용히 문서를 접고 창밖의 비를 바라보았다.");
    expect(chunks[0].content).not.toContain("은하궁 회담");

    const rows = await db.getClient()
      .select({
        content: memoryChunk.content,
        indexText: memoryChunk.indexText,
        contextLabel: memoryChunk.contextLabel,
      })
      .from(memoryChunk)
      .where(eq(memoryChunk.id, chunks[0].chunkId))
      .limit(1);

    expect(rows[0]?.contextLabel).toBe("chapter: 은하궁 회담");
    expect(rows[0]?.indexText).toContain("은하궁 회담");
    expect(rows[0]?.content).not.toContain("은하궁 회담");
  });

  it("queues episode extraction after rebuilding source chunks", async () => {
    const project = await localProjectService.createProject({
      title: "Memory Episode Queue",
      description: "unit",
      projectPath: "/tmp/memory-episode-queue.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "비밀의 편지",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
    });

    await memoryProjectionService.processPendingChunkJobs({
      projectId: String(project.id),
      sourceType: "chapter",
      sourceId: String(chapter.id),
      limit: 20,
    });

    const jobs = await db
      .getClient()
      .select()
      .from(memoryEpisodeExtractionJob)
      .where(eq(memoryEpisodeExtractionJob.projectId, String(project.id)));

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceType: "chapter",
      sourceId: String(chapter.id),
      sourceContentHash: expect.any(String),
      extractorVersion: "episode-v1",
      status: "pending",
    });
  });

  it("returns MEMORY_CHUNK_NOT_FOUND for unknown chunk backlink", async () => {
    await expect(
      searchService.getChunkBacklink("00000000-0000-4000-8000-000000000000"),
    ).rejects.toMatchObject({
      code: ErrorCode.MEMORY_CHUNK_NOT_FOUND,
    } satisfies Partial<ServiceError>);
  });
});

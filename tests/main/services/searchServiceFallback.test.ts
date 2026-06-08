import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  embed: vi.fn(),
}));

vi.mock(
  "../../../src/main/services/features/utility/utilityProcessBridge.js",
  () => ({
    utilityProcessBridge: {
      embed: mocked.embed,
    },
  }),
);

import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { memoryProjectionService } from "../../../src/main/services/features/memory/memoryProjectionService.js";
import { searchService } from "../../../src/main/services/features/search/index.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { db } from "../../../src/main/database/index.js";

/**
 * Property 2 (폴백 가용성): 임베딩이 미가용(embed null/예외)이어도 searchChunks 는
 * 항상 FTS(+LIKE) 결과를 반환하고 throw 하지 않는다.
 * Validates Requirements 1.2, 2.3.
 */
describe("SearchService — embedding fallback invariant (P2)", () => {
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
    vi.restoreAllMocks();
    mocked.embed.mockReset();
    delete process.env.LUIE_IS_UTILITY_PROCESS;
  });

  async function seedChunks(): Promise<string> {
    const project = await localProjectService.createProject({
      title: "Fallback Search",
      description: "unit",
      projectPath: "/tmp/fallback-search.luie",
    });
    const chapter = await chapterService.createChapter({
      projectId: String(project.id),
      title: "fallback chapter",
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
    return String(project.id);
  }

  /** 벡터 검색 경로를 강제로 활성화한다(임베딩 호출이 실제로 일어나도록). */
  function forceVectorSearchPath(): void {
    process.env.LUIE_IS_UTILITY_PROCESS = "1";
    vi.spyOn(db, "isVectorSearchEnabled").mockReturnValue(true);
  }

  it("returns FTS results without throwing when embed() throws", async () => {
    const projectId = await seedChunks();
    forceVectorSearchPath();
    mocked.embed.mockRejectedValue(new Error("embedding sidecar down"));

    const chunks = await searchService.searchChunks({
      projectId,
      query: "검은 패",
      limit: 10,
    });

    expect(chunks.length).toBeGreaterThan(0);
  });

  it("returns FTS results without throwing when embed() returns null", async () => {
    const projectId = await seedChunks();
    forceVectorSearchPath();
    mocked.embed.mockResolvedValue(null);

    const chunks = await searchService.searchChunks({
      projectId,
      query: "검은 패",
      limit: 10,
    });

    expect(chunks.length).toBeGreaterThan(0);
  });
});

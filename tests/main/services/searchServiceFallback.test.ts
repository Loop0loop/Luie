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

import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { memoryProjectionService } from "../../../src/main/services/features/memory/memoryProjectionService.js";
import { searchService } from "../../../src/main/services/features/search/searchService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { db } from "../../../src/main/database/index.js";

describe("SearchService — embedding fallback invariant (P2)", () => {
  const localProjectService = new ProjectService();
  const chapterService = new ChapterService();

  beforeAll(() => {
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

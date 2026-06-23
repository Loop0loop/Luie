import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  chapter,
  db,
  memoryChunk,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { buildMemoryLongformBenchmarkSeed } from "../../../../../src/main/services/features/memory/benchmark/memoryLongformBenchmarkSeed.js";
import { materializeMemoryLongformBenchmark } from "../../../../../src/main/services/features/memory/benchmark/memoryLongformBenchmarkMaterialize.js";

describe("memoryLongformBenchmarkMaterialize", () => {
  it("materializes benchmark project chapters and chunks idempotently", async () => {
    const manifest = buildMemoryLongformBenchmarkSeed({
      profileName: "ci-1000",
      seed: 42,
    });

    const first = await materializeMemoryLongformBenchmark({
      manifest,
      projectId: "benchmark-ci-1000-test",
      nowIso: "2026-06-11T00:00:00.000Z",
    });
    const second = await materializeMemoryLongformBenchmark({
      manifest,
      projectId: "benchmark-ci-1000-test",
      nowIso: "2026-06-11T00:00:00.000Z",
    });

    expect(first).toEqual({
      projectId: "benchmark-ci-1000-test",
      profileName: "ci-1000",
      chapters: 100,
      chunks: 1000,
      inserted: true,
    });
    expect(second).toMatchObject({
      projectId: "benchmark-ci-1000-test",
      profileName: "ci-1000",
      chapters: 100,
      chunks: 1000,
      inserted: false,
    });

    const projectRows = await db
      .getClient()
      .select()
      .from(project)
      .where(eq(project.id, "benchmark-ci-1000-test"));
    const chapterRows = await db
      .getClient()
      .select()
      .from(chapter)
      .where(eq(chapter.projectId, "benchmark-ci-1000-test"));
    const chunkRows = await db
      .getClient()
      .select()
      .from(memoryChunk)
      .where(eq(memoryChunk.projectId, "benchmark-ci-1000-test"));

    expect(projectRows).toHaveLength(1);
    expect(chapterRows).toHaveLength(100);
    expect(chunkRows).toHaveLength(1000);
    expect(chunkRows[0]).toMatchObject({
      sourceType: "benchmark",
      sourceId: "benchmark-ci-1000-test:chapter-0001",
      chunkIndex: 0,
      sourceContentHash: "benchmark-ci-1000-test:chapter-0001",
    });
  });

  it("materializes multiple benchmark projects without source chunk collisions", async () => {
    const manifest = buildMemoryLongformBenchmarkSeed({
      profileName: "ci-1000",
      seed: 42,
    });

    const first = await materializeMemoryLongformBenchmark({
      manifest,
      projectId: "benchmark-source-collision-a",
      nowIso: "2026-06-11T00:00:00.000Z",
    });
    const second = await materializeMemoryLongformBenchmark({
      manifest,
      projectId: "benchmark-source-collision-b",
      nowIso: "2026-06-11T00:00:00.000Z",
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(true);
  });

  it("materializes the 10k chunk manual profile without a stack overflow", async () => {
    const manifest = buildMemoryLongformBenchmarkSeed({
      profileName: "manual-10000",
      seed: 42,
    });

    const result = await materializeMemoryLongformBenchmark({
      manifest,
      projectId: "benchmark-manual-10000-test",
      nowIso: "2026-06-11T00:00:00.000Z",
    });

    const chunkRows = await db
      .getClient()
      .select({ id: memoryChunk.id })
      .from(memoryChunk)
      .where(eq(memoryChunk.projectId, "benchmark-manual-10000-test"));

    expect(result).toMatchObject({
      projectId: "benchmark-manual-10000-test",
      profileName: "manual-10000",
      chapters: 500,
      chunks: 10000,
      inserted: true,
    });
    expect(chunkRows).toHaveLength(10000);
  });
});

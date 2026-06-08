import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  chapterSummary,
  db,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  evaluateProjectNarrativeSummaryDrift,
  refreshStaleProjectNarrativeSummaries,
} from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryDrift.js";
import { generateProjectNarrativeSummaryHierarchy } from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js";

describe("memoryNarrativeSummaryDrift", () => {
  it("marks project narrative summaries stale when linked chapter summary hashes change", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const chapterSummaryTwoId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Drift Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(chapter)
      .values([
        {
          id: chapterOneId,
          projectId,
          title: "1화",
          content: "",
          order: 1,
          updatedAt: nowIso,
        },
        {
          id: chapterTwoId,
          projectId,
          title: "2화",
          content: "",
          order: 2,
          updatedAt: nowIso,
        },
      ]);
    await db
      .getClient()
      .insert(chapterSummary)
      .values([
        {
          id: chapterSummaryOneId,
          projectId,
          chapterId: chapterOneId,
          chapterNumber: 1,
          summary: "첫 장면 요약",
          contentHash: "drift-hash-1",
          isFallback: false,
          model: "test-model",
          generatedAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: chapterSummaryTwoId,
          projectId,
          chapterId: chapterTwoId,
          chapterNumber: 2,
          summary: "두 번째 장면 요약",
          contentHash: "drift-hash-2",
          isFallback: false,
          model: "test-model",
          generatedAt: nowIso,
          updatedAt: nowIso,
        },
      ]);

    const generated = await generateProjectNarrativeSummaryHierarchy({
      projectId,
      nowIso,
      summarizer: async () => ({
        title: "Drift Runner 전체 흐름",
        summary: "첫 장면 요약 / 두 번째 장면 요약",
        confidence: 80,
      }),
    });

    const fresh = await evaluateProjectNarrativeSummaryDrift({ projectId });
    expect(fresh).toEqual([
      expect.objectContaining({
        summaryId: generated.summaryId,
        isStale: false,
        storedSourceCount: 2,
        currentSourceCount: 2,
      }),
    ]);

    await db
      .getClient()
      .update(chapterSummary)
      .set({
        summary: "두 번째 장면 요약이 수정됨",
        contentHash: "drift-hash-2-updated",
        updatedAt: "2026-06-08T00:01:00.000Z",
      })
      .where(eq(chapterSummary.id, chapterSummaryTwoId));

    const stale = await evaluateProjectNarrativeSummaryDrift({ projectId });
    expect(stale).toEqual([
      expect.objectContaining({
        summaryId: generated.summaryId,
        isStale: true,
        storedSourceCount: 2,
        currentSourceCount: 2,
      }),
    ]);
    expect(stale[0]?.storedSourceContentHash).not.toBe(
      stale[0]?.currentSourceContentHash,
    );
  });

  it("refreshes stale project narrative summaries from current chapter summary sources", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const chapterSummaryTwoId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Refresh Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(chapter)
      .values([
        {
          id: chapterOneId,
          projectId,
          title: "1화",
          content: "",
          order: 1,
          updatedAt: nowIso,
        },
        {
          id: chapterTwoId,
          projectId,
          title: "2화",
          content: "",
          order: 2,
          updatedAt: nowIso,
        },
      ]);
    await db
      .getClient()
      .insert(chapterSummary)
      .values([
        {
          id: chapterSummaryOneId,
          projectId,
          chapterId: chapterOneId,
          chapterNumber: 1,
          summary: "초기 1화 요약",
          contentHash: "refresh-hash-1",
          isFallback: false,
          model: "test-model",
          generatedAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: chapterSummaryTwoId,
          projectId,
          chapterId: chapterTwoId,
          chapterNumber: 2,
          summary: "초기 2화 요약",
          contentHash: "refresh-hash-2",
          isFallback: false,
          model: "test-model",
          generatedAt: nowIso,
          updatedAt: nowIso,
        },
      ]);

    const generated = await generateProjectNarrativeSummaryHierarchy({
      projectId,
      nowIso,
      summarizer: async () => ({
        title: "Refresh Runner 초기 흐름",
        summary: "초기 1화 요약 / 초기 2화 요약",
        confidence: 70,
      }),
    });
    const [before] = await db
      .getClient()
      .select({ sourceContentHash: memoryNarrativeSummary.sourceContentHash })
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, generated.summaryId));

    await db
      .getClient()
      .update(chapterSummary)
      .set({
        summary: "갱신된 2화 요약",
        contentHash: "refresh-hash-2-updated",
        updatedAt: "2026-06-08T00:01:00.000Z",
      })
      .where(eq(chapterSummary.id, chapterSummaryTwoId));

    const refreshed = await refreshStaleProjectNarrativeSummaries({
      projectId,
      nowIso: "2026-06-08T00:02:00.000Z",
      summarizer: async (input) => ({
        title: "Refresh Runner 갱신 흐름",
        summary: input.chapterSummaries.map((item) => item.summary).join(" / "),
        confidence: 88,
      }),
    });

    const [after] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, generated.summaryId));
    const sourceRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummarySource)
      .where(eq(memoryNarrativeSummarySource.summaryId, generated.summaryId));

    expect(refreshed).toEqual({
      inspected: 1,
      refreshed: 1,
      summaryIds: [generated.summaryId],
    });
    expect(after).toMatchObject({
      id: generated.summaryId,
      title: "Refresh Runner 갱신 흐름",
      confidence: 88,
      status: "confirmed",
    });
    expect(after?.sourceContentHash).not.toBe(before?.sourceContentHash);
    expect(sourceRows).toEqual([
      expect.objectContaining({
        chapterSummaryId: chapterSummaryOneId,
        contentHash: "refresh-hash-1",
      }),
      expect.objectContaining({
        chapterSummaryId: chapterSummaryTwoId,
        contentHash: "refresh-hash-2-updated",
      }),
    ]);
  });
});

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  chapterSummary,
  db,
  memoryNarrativeSummary,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { getNarrativeSummaryStatus } from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryStatus.js";
import { generateProjectNarrativeSummaryHierarchy } from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js";

describe("memoryNarrativeSummaryStatus", () => {
  it("returns hierarchy summaries with source counts and drift state", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Narrative Status",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterOneId,
      projectId,
      title: "1화",
      content: "",
      order: 1,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapterSummary).values({
      id: chapterSummaryOneId,
      projectId,
      chapterId: chapterOneId,
      chapterNumber: 1,
      summary: "1화 요약",
      contentHash: "narrative-status-hash-1",
      isFallback: false,
      model: "test-model",
      generatedAt: nowIso,
      updatedAt: nowIso,
    });
    const generated = await generateProjectNarrativeSummaryHierarchy({
      projectId,
      nowIso,
      summarizer: async () => ({
        title: "프로젝트 전체 흐름",
        summary: "1화 요약",
        confidence: 80,
      }),
    });

    await db
      .getClient()
      .update(chapterSummary)
      .set({
        summary: "1화 요약 수정",
        contentHash: "narrative-status-hash-1-updated",
        updatedAt: "2026-06-08T00:01:00.000Z",
      })
      .where(eq(chapterSummary.id, chapterSummaryOneId));

    const status = await getNarrativeSummaryStatus({ projectId });

    expect(status.projectId).toBe(projectId);
    expect(status.totalCount).toBe(1);
    expect(status.staleCount).toBe(1);
    expect(status.byType).toEqual({
      project_overview: 1,
    });
    expect(status.summaries).toEqual([
      expect.objectContaining({
        id: generated.summaryId,
        title: "프로젝트 전체 흐름",
        summary: "1화 요약",
        summaryType: "project_overview",
        scopeType: "project",
        scopeId: projectId,
        status: "confirmed",
        confidence: 80,
        sourceCount: 1,
        isStale: true,
      }),
    ]);

    const [summaryRow] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, generated.summaryId));
    expect(status.summaries[0]?.sourceContentHash).toBe(
      summaryRow?.sourceContentHash,
    );
  });
});

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  chapterBody,
  chapterSummary,
  db,
  memoryNarrativeSummary,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { materializeChapterSummariesForNarrativeMemory } from "../../../../../src/main/services/features/memory/summary/memoryChapterSummaryMaterialization.js";
import { generateProjectNarrativeSummaryHierarchy } from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js";

describe("materializeChapterSummariesForNarrativeMemory", () => {
  it("creates non-fallback chapter summaries that can feed project narrative summaries", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Materialized Summary",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      order: 1,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapterBody).values({
      chapterId,
      content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      contentHash: "source-hash",
      updatedAt: nowIso,
    });

    const result = await materializeChapterSummariesForNarrativeMemory({
      projectId,
      nowIso,
      limit: 5,
      summarizer: async ({ content }) => ({
        summary: `요약: ${content}`,
        model: "test-summary-model",
      }),
    });

    expect(result).toEqual({ inspected: 1, generated: 1, skipped: 0 });

    const [chapterSummaryRow] = await db
      .getClient()
      .select()
      .from(chapterSummary)
      .where(eq(chapterSummary.chapterId, chapterId));
    expect(chapterSummaryRow).toMatchObject({
      projectId,
      chapterNumber: 1,
      summary: "요약: 아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      isFallback: false,
      model: "test-summary-model",
    });

    const narrativeResult = await generateProjectNarrativeSummaryHierarchy({
      projectId,
      nowIso,
    });
    expect(narrativeResult.generated).toBe(1);

    const [narrativeSummary] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, narrativeResult.summaryId));
    expect(narrativeSummary).toMatchObject({
      projectId,
      summaryType: "project_overview",
      scopeType: "project",
      status: "confirmed",
    });
  });
});

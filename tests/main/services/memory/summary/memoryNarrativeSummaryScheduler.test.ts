import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  chapter,
  chapterSummary,
  db,
  memoryEntity,
  memoryFact,
  memoryNarrativeSummary,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  scheduleProjectNarrativeCommunities,
  scheduleProjectNarrativeHierarchyScopes,
} from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryScheduler.js";

describe("memoryNarrativeSummaryScheduler", () => {
  it("generates arc and volume summaries from chapter-number ranges", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Scheduler Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });

    const chapterRows = Array.from({ length: 4 }, (_, index) => ({
      id: crypto.randomUUID(),
      projectId,
      title: `${index + 1}화`,
      content: "",
      order: index + 1,
      updatedAt: nowIso,
    }));
    await db.getClient().insert(chapter).values(chapterRows);
    await db.getClient().insert(chapterSummary).values(
      chapterRows.map((chapterRow, index) => ({
        id: crypto.randomUUID(),
        projectId,
        chapterId: chapterRow.id,
        chapterNumber: index + 1,
        summary: `${index + 1}화 요약`,
        contentHash: `scheduler-hash-${index + 1}`,
        isFallback: false,
        model: "test-model",
        generatedAt: nowIso,
        updatedAt: nowIso,
      })),
    );

    const result = await scheduleProjectNarrativeHierarchyScopes({
      projectId,
      nowIso,
      arcSize: 2,
      volumeSize: 4,
      summarizer: async (input) => ({
        title: `${input.scopeId} 요약`,
        summary: input.chapterSummaries.map((item) => item.summary).join(" / "),
        confidence: input.scopeType === "volume" ? 86 : 82,
      }),
    });

    expect(result).toEqual({
      inspectedScopes: 3,
      generated: 3,
      summaryIds: expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]),
    });

    const arcRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(
        and(
          eq(memoryNarrativeSummary.projectId, projectId),
          eq(memoryNarrativeSummary.summaryType, "arc_overview"),
        ),
      );
    const volumeRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(
        and(
          eq(memoryNarrativeSummary.projectId, projectId),
          eq(memoryNarrativeSummary.summaryType, "volume_overview"),
        ),
      );

    expect(arcRows.map((row) => row.scopeId).sort()).toEqual([
      "arc:1-2",
      "arc:3-4",
    ]);
    expect(volumeRows).toEqual([
      expect.objectContaining({
        scopeType: "volume",
        scopeId: "volume:1-4",
        title: "volume:1-4 요약",
        confidence: 86,
      }),
    ]);
  });

  it("discovers relation-fact communities and schedules community summaries", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const arinId = crypto.randomUUID();
    const baekyaId = crypto.randomUUID();
    const isolatedId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Community Scheduler",
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
    await db.getClient().insert(memoryEntity).values([
      {
        id: arinId,
        projectId,
        entityType: "character",
        canonicalName: "아린",
        status: "confirmed",
        confidence: 90,
        createdBy: "test",
        updatedAt: nowIso,
      },
      {
        id: baekyaId,
        projectId,
        entityType: "organization",
        canonicalName: "백야회",
        status: "confirmed",
        confidence: 88,
        createdBy: "test",
        updatedAt: nowIso,
      },
      {
        id: isolatedId,
        projectId,
        entityType: "character",
        canonicalName: "고립 인물",
        status: "confirmed",
        confidence: 70,
        createdBy: "test",
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryFact).values({
      id: factId,
      projectId,
      subjectEntityId: arinId,
      predicate: "investigates",
      objectEntityId: baekyaId,
      objectValue: null,
      valueType: "relation",
      validFromChapterId: chapterOneId,
      validFromChapterOrder: 1,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: chapterOneId,
      observedAtChapterOrder: 1,
      confidence: 82,
      status: "confirmed",
      extractorVersion: "test",
      sourceContentHash: "community-scheduler-fact-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });

    const result = await scheduleProjectNarrativeCommunities({
      projectId,
      nowIso,
      summarizer: async (input) => ({
        title: `${input.communityId} 요약`,
        summary: input.facts.map((fact) => fact.predicate).join(", "),
        confidence: 83,
      }),
    });

    expect(result).toEqual({
      inspectedCommunities: 1,
      generated: 1,
      summaryIds: [expect.any(String)],
    });

    const communityRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(
        and(
          eq(memoryNarrativeSummary.projectId, projectId),
          eq(memoryNarrativeSummary.summaryType, "community_overview"),
        ),
      );

    expect(communityRows).toEqual([
      expect.objectContaining({
        scopeType: "community",
        scopeId: `community:${[arinId, baekyaId].sort().join("+")}`,
        title: `community:${[arinId, baekyaId].sort().join("+")} 요약`,
        confidence: 83,
      }),
    ]);
  });
});

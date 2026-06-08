import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  chapter,
  chapterSummary,
  db,
  memoryEntity,
  memoryFact,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  generateCommunityNarrativeSummaryHierarchy,
  generateProjectNarrativeSummaryHierarchy,
  generateScopedNarrativeSummaryHierarchy,
} from "../../../../../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js";

describe("memoryNarrativeSummaryRunner", () => {
  it("generates a project-level narrative summary from chapter summaries with source links", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const chapterSummaryTwoId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Hierarchy Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values([
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
    await db.getClient().insert(chapterSummary).values([
      {
        id: chapterSummaryOneId,
        projectId,
        chapterId: chapterOneId,
        chapterNumber: 1,
        summary: "아린은 북부에서 검은 기사라는 별칭으로 등장한다.",
        contentHash: "chapter-summary-hash-1",
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
        summary: "아린은 백야회의 흔적을 추적하며 동맹 관계를 의심한다.",
        contentHash: "chapter-summary-hash-2",
        isFallback: false,
        model: "test-model",
        generatedAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    const result = await generateProjectNarrativeSummaryHierarchy({
      projectId,
      nowIso,
      summarizer: async (input) => ({
        title: "Hierarchy Runner 전체 흐름",
        summary: input.chapterSummaries.map((item) => item.summary).join(" / "),
        confidence: 82,
      }),
    });

    expect(result.generated).toBe(1);
    expect(result.summaryId).toBeTruthy();

    const [summaryRow] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, result.summaryId));
    const sourceRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummarySource)
      .where(eq(memoryNarrativeSummarySource.summaryId, result.summaryId));

    expect(summaryRow).toMatchObject({
      projectId,
      summaryType: "project_overview",
      scopeType: "project",
      scopeId: projectId,
      title: "Hierarchy Runner 전체 흐름",
      status: "confirmed",
      confidence: 82,
      extractorVersion: "hierarchy-v1",
    });
    expect(sourceRows).toEqual([
      expect.objectContaining({
        projectId,
        sourceType: "chapter_summary",
        chapterSummaryId: chapterSummaryOneId,
        contentHash: "chapter-summary-hash-1",
      }),
      expect.objectContaining({
        projectId,
        sourceType: "chapter_summary",
        chapterSummaryId: chapterSummaryTwoId,
        contentHash: "chapter-summary-hash-2",
      }),
    ]);
  });

  it("generates an arc-level narrative summary from a bounded chapter range", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();
    const chapterThreeId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const chapterSummaryTwoId = crypto.randomUUID();
    const chapterSummaryThreeId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Arc Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values([
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
      {
        id: chapterThreeId,
        projectId,
        title: "3화",
        content: "",
        order: 3,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(chapterSummary).values([
      {
        id: chapterSummaryOneId,
        projectId,
        chapterId: chapterOneId,
        chapterNumber: 1,
        summary: "범위 밖 도입부",
        contentHash: "arc-hash-1",
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
        summary: "아린은 백야회의 이름을 처음 듣는다.",
        contentHash: "arc-hash-2",
        isFallback: false,
        model: "test-model",
        generatedAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: chapterSummaryThreeId,
        projectId,
        chapterId: chapterThreeId,
        chapterNumber: 3,
        summary: "아린은 백야회의 추적자를 따돌린다.",
        contentHash: "arc-hash-3",
        isFallback: false,
        model: "test-model",
        generatedAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    const result = await generateScopedNarrativeSummaryHierarchy({
      projectId,
      scopeType: "arc",
      scopeId: "arc-white-night",
      summaryType: "arc_overview",
      fromChapterNumber: 2,
      toChapterNumber: 3,
      nowIso,
      summarizer: async (input) => ({
        title: "백야회 추적 arc",
        summary: input.chapterSummaries.map((item) => item.summary).join(" / "),
        confidence: 84,
      }),
    });

    expect(result.generated).toBe(1);
    expect(result.summaryId).toBeTruthy();

    const [summaryRow] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, result.summaryId));
    const sourceRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummarySource)
      .where(eq(memoryNarrativeSummarySource.summaryId, result.summaryId));

    expect(summaryRow).toMatchObject({
      projectId,
      summaryType: "arc_overview",
      scopeType: "arc",
      scopeId: "arc-white-night",
      title: "백야회 추적 arc",
      status: "confirmed",
      confidence: 84,
      extractorVersion: "hierarchy-v1",
    });
    expect(sourceRows).toEqual([
      expect.objectContaining({
        projectId,
        sourceType: "chapter_summary",
        chapterSummaryId: chapterSummaryTwoId,
        contentHash: "arc-hash-2",
      }),
      expect.objectContaining({
        projectId,
        sourceType: "chapter_summary",
        chapterSummaryId: chapterSummaryThreeId,
        contentHash: "arc-hash-3",
      }),
    ]);
  });

  it("generates a volume-level narrative summary with its own scope identity", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();
    const chapterSummaryOneId = crypto.randomUUID();
    const chapterSummaryTwoId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Volume Runner",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values([
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
    await db.getClient().insert(chapterSummary).values([
      {
        id: chapterSummaryOneId,
        projectId,
        chapterId: chapterOneId,
        chapterNumber: 1,
        summary: "1권의 첫 갈등이 시작된다.",
        contentHash: "volume-hash-1",
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
        summary: "1권의 동맹 구도가 드러난다.",
        contentHash: "volume-hash-2",
        isFallback: false,
        model: "test-model",
        generatedAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    const result = await generateScopedNarrativeSummaryHierarchy({
      projectId,
      scopeType: "volume",
      scopeId: "volume-1",
      summaryType: "volume_overview",
      fromChapterNumber: 1,
      toChapterNumber: 2,
      nowIso,
      summarizer: async (input) => ({
        title: "1권 전체 흐름",
        summary: input.chapterSummaries.map((item) => item.summary).join(" / "),
        confidence: 86,
      }),
    });

    expect(result.generated).toBe(1);

    const [summaryRow] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, result.summaryId));

    expect(summaryRow).toMatchObject({
      projectId,
      summaryType: "volume_overview",
      scopeType: "volume",
      scopeId: "volume-1",
      title: "1권 전체 흐름",
      confidence: 86,
    });
  });

  it("generates a community-level narrative summary from confirmed temporal facts", async () => {
    const projectId = crypto.randomUUID();
    const chapterOneId = crypto.randomUUID();
    const arinId = crypto.randomUUID();
    const baekyaId = crypto.randomUUID();
    const factOneId = crypto.randomUUID();
    const factTwoId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Community Runner",
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
    ]);
    await db.getClient().insert(memoryFact).values([
      {
        id: factOneId,
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
        sourceContentHash: "community-fact-hash-1",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
      {
        id: factTwoId,
        projectId,
        subjectEntityId: baekyaId,
        predicate: "hides_from",
        objectEntityId: arinId,
        objectValue: null,
        valueType: "relation",
        validFromChapterId: chapterOneId,
        validFromChapterOrder: 1,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapterOneId,
        observedAtChapterOrder: 1,
        confidence: 79,
        status: "confirmed",
        extractorVersion: "test",
        sourceContentHash: "community-fact-hash-2",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
    ]);

    const result = await generateCommunityNarrativeSummaryHierarchy({
      projectId,
      communityId: "community-arin-baekya",
      entityIds: [arinId, baekyaId],
      nowIso,
      summarizer: async (input) => ({
        title: "아린-백야회 커뮤니티",
        summary: input.facts
          .map((fact) => `${fact.subjectName}:${fact.predicate}:${fact.objectName}`)
          .join(" / "),
        confidence: 87,
      }),
    });

    expect(result.generated).toBe(1);
    expect(result.summaryId).toBeTruthy();

    const [summaryRow] = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummary)
      .where(eq(memoryNarrativeSummary.id, result.summaryId));
    const sourceRows = await db
      .getClient()
      .select()
      .from(memoryNarrativeSummarySource)
      .where(eq(memoryNarrativeSummarySource.summaryId, result.summaryId));

    expect(summaryRow).toMatchObject({
      projectId,
      summaryType: "community_overview",
      scopeType: "community",
      scopeId: "community-arin-baekya",
      title: "아린-백야회 커뮤니티",
      status: "confirmed",
      confidence: 87,
      extractorVersion: "hierarchy-v1",
    });
    expect(sourceRows).toEqual([
      expect.objectContaining({
        projectId,
        sourceType: "fact",
        factId: factOneId,
        contentHash: "community-fact-hash-1",
      }),
      expect.objectContaining({
        projectId,
        sourceType: "fact",
        factId: factTwoId,
        contentHash: "community-fact-hash-2",
      }),
    ]);
  });
});

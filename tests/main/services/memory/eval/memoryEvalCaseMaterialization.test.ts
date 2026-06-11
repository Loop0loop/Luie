import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryChunk,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
  chapter,
} from "../../../../../src/main/infra/database/index.js";
import {
  materializeMemoryEvalCasesFromEpisodeEvidence,
  materializeTemporalChapterEvalCasesFromChunks,
  materializeWriterPainPointEvalCasesFromChunks,
  repairLegacyEpisodeEvalCases,
  repairWriterPainPointTaxonomyEvalCases,
} from "../../../../../src/main/services/features/memory/eval/memoryEvalCaseMaterialization.js";
import {
  MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY,
  WRITER_PAIN_POINT_TAXONOMY,
} from "../../../../../src/shared/constants/memoryEvalPainPoints.js";

describe("materializeMemoryEvalCasesFromEpisodeEvidence", () => {
  it("creates evidence-recall eval cases from episode evidence", async () => {
    const projectId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Eval Materialization",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "character_learns_secret",
      title: "아린의 깨달음",
      summary: "아린은 백야회의 목적을 알게 된다.",
      status: "suggested",
      confidence: 90,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: evidenceId,
      projectId,
      episodeId,
      chapterId: null,
      chunkId: "chunk-1",
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 10,
      endOffset: 30,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      updatedAt: nowIso,
    });

    const result = await materializeMemoryEvalCasesFromEpisodeEvidence({
      projectId,
      nowIso,
      limit: 10,
    });

    expect(result).toEqual({ inspected: 1, created: 1, skipped: 0 });

    const [evalCase] = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId));
    expect(evalCase).toMatchObject({
      projectId,
      name: "episode evidence: 아린의 깨달음",
      caseType: "qa",
      question:
        "아린의 깨달음의 원문 근거를 찾아라: 아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      expectedAnswer: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      severity: "p1",
    });

    const [evalEvidence] = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.caseId, evalCase.id));
    expect(evalEvidence).toMatchObject({
      projectId,
      expectedChunkId: "chunk-1",
      startOffset: 10,
      endOffset: 30,
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
    });
  });

  it("repairs legacy episode eval cases to quote-backed questions", async () => {
    const projectId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Legacy Eval Repair",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: caseId,
      projectId,
      name: "episode evidence: 아내의 비밀",
      question: "아내의 비밀의 근거를 찾아라.",
      caseType: "qa",
      expectedAnswer: "주인공은 아스피린 대신 아달린을 먹었다고 의심한다.",
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      severity: "p1",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: crypto.randomUUID(),
      caseId,
      projectId,
      chapterId: null,
      expectedChunkId: "chunk-wife-secret",
      startOffset: 10,
      endOffset: 40,
      quote: "나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      updatedAt: nowIso,
    });

    const result = await repairLegacyEpisodeEvalCases({
      projectId,
      nowIso: "2026-06-09T00:00:00.000Z",
    });

    expect(result).toEqual({ inspected: 1, repaired: 1 });
    const [evalCase] = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.id, caseId));
    expect(evalCase).toMatchObject({
      question:
        "아내의 비밀의 원문 근거를 찾아라: 나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      expectedAnswer: "나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      updatedAt: "2026-06-09T00:00:00.000Z",
    });
  });

  it("creates writer pain point eval cases from chunk evidence", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Writer Pain Eval",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryChunk)
      .values(
        Array.from({ length: 10 }, (_, index) => ({
          id: `chunk-${index}`,
          projectId,
          sourceType: "chapter",
          sourceId: `chapter-${index}`,
          chapterId: null,
          sceneId: null,
          chunkIndex: index,
          content: `아린은 ${index + 1}번째 장면에서 백야회의 비밀과 레온의 선택을 확인했다.`,
          contentHash: `content-hash-${index}`,
          indexText: `아린 백야회 레온 ${index}`,
          indexTextHash: `index-hash-${index}`,
          contextLabel: `${index + 1}화`,
          sourceContentHash: `source-hash-${index}`,
          startOffset: index * 100,
          endOffset: index * 100 + 40,
          paragraphStartIndex: index,
          paragraphEndIndex: index,
          tokenCount: 40,
          updatedAt: nowIso,
        })),
      );

    const result = await materializeWriterPainPointEvalCasesFromChunks({
      projectId,
      nowIso,
      limit:
        WRITER_PAIN_POINT_TAXONOMY.length *
        MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY,
    });

    expect(result).toEqual({ inspected: 10, created: 90, skipped: 0 });

    const cases = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId));
    expect(cases).toHaveLength(90);
    expect(new Set(cases.map((item) => item.caseType))).toEqual(
      new Set(["qa", "entity", "relation", "temporal_state"]),
    );
    expect(new Set(cases.map((item) => item.severity))).toContain("p0");
    for (const item of WRITER_PAIN_POINT_TAXONOMY) {
      expect(cases.filter((evalCase) => evalCase.name.includes(item.key))).toHaveLength(
        MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY,
      );
    }

    const evidence = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.projectId, projectId));
    expect(evidence).toHaveLength(90);
    expect(evidence.every((item) => item.expectedChunkId?.startsWith("chunk-"))).toBe(
      true,
    );
  });

  it("removes deprecated writer pain taxonomy cases and their evidence", async () => {
    const projectId = crypto.randomUUID();
    const deprecatedCaseId = crypto.randomUUID();
    const currentCaseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Writer Pain Taxonomy Repair",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEvalCase)
      .values([
        {
          id: deprecatedCaseId,
          projectId,
          name: "writer-pain:timeline-leak:chunk-1",
          question: "이전 taxonomy 질문",
          caseType: "temporal_state",
          expectedAnswer: "이전 답변",
          temporalScopeStartChapterId: null,
          temporalScopeEndChapterId: null,
          severity: "p0",
          updatedAt: nowIso,
        },
        {
          id: currentCaseId,
          projectId,
          name: "writer-pain:future-leakage:chunk-1",
          question: "현재 taxonomy 질문",
          caseType: "temporal_state",
          expectedAnswer: "현재 답변",
          temporalScopeStartChapterId: null,
          temporalScopeEndChapterId: null,
          severity: "p0",
          updatedAt: nowIso,
        },
      ]);
    await db
      .getClient()
      .insert(memoryEvalEvidence)
      .values([
        {
          id: crypto.randomUUID(),
          caseId: deprecatedCaseId,
          projectId,
          chapterId: null,
          expectedChunkId: "chunk-1",
          startOffset: 0,
          endOffset: 10,
          quote: "deprecated",
          updatedAt: nowIso,
        },
        {
          id: crypto.randomUUID(),
          caseId: currentCaseId,
          projectId,
          chapterId: null,
          expectedChunkId: "chunk-1",
          startOffset: 0,
          endOffset: 10,
          quote: "current",
          updatedAt: nowIso,
        },
      ]);

    const result = await repairWriterPainPointTaxonomyEvalCases({ projectId });

    expect(result).toEqual({
      inspected: 2,
      deprecatedRemoved: 1,
      currentKept: 1,
    });
    const cases = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId));
    expect(cases.map((item) => item.name)).toEqual([
      "writer-pain:future-leakage:chunk-1",
    ]);
    const evidence = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.projectId, projectId));
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.caseId).toBe(currentCaseId);
  });

  it("creates chapter-scoped temporal eval cases from chunk evidence", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-11T00:00:00.000Z";
    const chapterOneId = crypto.randomUUID();
    const chapterTwoId = crypto.randomUUID();

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Temporal Eval",
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
          content: "아린은 봉인된 편지를 아직 읽지 않았다.",
          synopsis: null,
          order: 1,
          wordCount: 20,
          updatedAt: nowIso,
        },
        {
          id: chapterTwoId,
          projectId,
          title: "2화",
          content: "아린은 봉인된 편지를 읽고 백야회의 목적을 알게 된다.",
          synopsis: null,
          order: 2,
          wordCount: 30,
          updatedAt: nowIso,
        },
      ]);
    await db
      .getClient()
      .insert(memoryChunk)
      .values([
        {
          id: "temporal-chunk-1",
          projectId,
          sourceType: "chapter",
          sourceId: chapterOneId,
          chapterId: chapterOneId,
          sceneId: null,
          chunkIndex: 0,
          content: "아린은 봉인된 편지를 아직 읽지 않았다.",
          contentHash: "temporal-content-hash-1",
          indexText: "아린 봉인 편지 아직 읽지 않았다",
          indexTextHash: "temporal-index-hash-1",
          contextLabel: "1화",
          sourceContentHash: "temporal-source-hash-1",
          startOffset: 0,
          endOffset: 22,
          paragraphStartIndex: 0,
          paragraphEndIndex: 0,
          tokenCount: 20,
          updatedAt: nowIso,
        },
        {
          id: "temporal-chunk-2",
          projectId,
          sourceType: "chapter",
          sourceId: chapterTwoId,
          chapterId: chapterTwoId,
          sceneId: null,
          chunkIndex: 1,
          content: "아린은 봉인된 편지를 읽고 백야회의 목적을 알게 된다.",
          contentHash: "temporal-content-hash-2",
          indexText: "아린 봉인 편지 백야회 목적 알게 된다",
          indexTextHash: "temporal-index-hash-2",
          contextLabel: "2화",
          sourceContentHash: "temporal-source-hash-2",
          startOffset: 0,
          endOffset: 31,
          paragraphStartIndex: 0,
          paragraphEndIndex: 0,
          tokenCount: 30,
          updatedAt: nowIso,
        },
      ]);

    const result = await materializeTemporalChapterEvalCasesFromChunks({
      projectId,
      nowIso,
      limit: 2,
    });

    expect(result).toEqual({ inspected: 2, created: 2, skipped: 0 });

    const cases = await db
      .getClient()
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId));
    expect(cases.map((item) => item.name).sort()).toEqual([
      "temporal-chapter:1:temporal-chunk-1",
      "temporal-chapter:2:temporal-chunk-2",
    ]);
    expect(cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question:
            "1화 기준으로, 이 사실을 이후 회차 정보 없이 확정해도 되는지 원문 근거로 확인해줘: 아린은 봉인된 편지를 아직 읽지 않았다.",
          caseType: "temporal_state",
          temporalScopeStartChapterId: chapterOneId,
          temporalScopeEndChapterId: chapterOneId,
          severity: "p0",
        }),
        expect.objectContaining({
          question:
            "2화 기준으로, 이 사실을 이후 회차 정보 없이 확정해도 되는지 원문 근거로 확인해줘: 아린은 봉인된 편지를 읽고 백야회의 목적을 알게 된다.",
          caseType: "temporal_state",
          temporalScopeStartChapterId: chapterTwoId,
          temporalScopeEndChapterId: chapterTwoId,
          severity: "p0",
        }),
      ]),
    );

    const evidence = await db
      .getClient()
      .select()
      .from(memoryEvalEvidence)
      .where(eq(memoryEvalEvidence.projectId, projectId));
    expect(evidence).toHaveLength(2);
    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chapterId: chapterOneId,
          expectedChunkId: "temporal-chunk-1",
        }),
        expect.objectContaining({
          chapterId: chapterTwoId,
          expectedChunkId: "temporal-chunk-2",
        }),
      ]),
    );
  });
});

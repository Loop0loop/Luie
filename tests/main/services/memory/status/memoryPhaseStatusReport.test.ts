import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterSummary,
  db,
  memoryChunk,
  memoryEntity,
  memoryEntityMention,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryFact,
  memoryNarrativeSummary,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { getMemoryRoadmapPhaseStatuses } from "../../../../../src/main/services/features/memory/status/index.js";

const mocked = vi.hoisted(() => ({
  verifyMemoryCanonicalPackageSync: vi.fn(),
}));

vi.mock(
  "../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js",
  () => ({
    verifyMemoryCanonicalPackageSync: mocked.verifyMemoryCanonicalPackageSync,
  }),
);

describe("getMemoryPhaseStatusReport", () => {
  it("reports phase readiness and review remaining counts from live DB rows", async () => {
    const { getMemoryPhaseStatusReport } = await import(
      "../../../../../src/main/services/features/memory/status/memoryPhaseStatusReport.js"
    );
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const chunkId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const episodeEvidenceId = crypto.randomUUID();
    const factId = crypto.randomUUID();
    const evalCaseId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    mocked.verifyMemoryCanonicalPackageSync.mockResolvedValueOnce({
      projectPath: "/tmp/status.luie",
      packageEntryPresent: true,
      inSync: true,
      totalDbRows: 2,
      totalPackageRows: 2,
      tables: {},
    });

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Phase Status",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "아린은 백야회에 들어간다.",
      order: 1,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: chunkId,
      projectId,
      sourceType: "chapter",
      sourceId: chapterId,
      chapterId,
      sceneId: null,
      chunkIndex: 0,
      content: "아린은 백야회에 들어간다.",
      contentHash: "chunk-hash",
      indexText: "아린 백야회",
      indexTextHash: "index-hash",
      contextLabel: "1화",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 14,
      paragraphStartIndex: 0,
      paragraphEndIndex: 0,
      tokenCount: 4,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "아린",
      status: "suggested",
      confidence: 90,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEntityMention).values({
      id: crypto.randomUUID(),
      projectId,
      entityId,
      aliasId: null,
      chapterId,
      chunkId,
      contentHash: "mention-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 2,
      quote: "아린",
      extractorVersion: "entity-v1",
      confidence: 80,
      status: "suggested",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: chapterId,
      chapterId,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "event",
      title: "가입",
      summary: "아린이 백야회에 들어간다.",
      status: "suggested",
      confidence: 80,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: episodeEvidenceId,
      projectId,
      episodeId,
      chapterId,
      chunkId,
      contentHash: "evidence-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 14,
      quote: "아린은 백야회에 들어간다.",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFact).values({
      id: factId,
      projectId,
      subjectEntityId: entityId,
      predicate: "belongs_to",
      objectEntityId: null,
      objectValue: "백야회",
      valueType: "string",
      validFromChapterId: chapterId,
      validFromChapterOrder: 1,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: chapterId,
      observedAtChapterOrder: 1,
      confidence: 88,
      status: "suggested",
      extractorVersion: "fact-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapterSummary).values({
      id: crypto.randomUUID(),
      projectId,
      chapterId,
      chapterNumber: 1,
      summary: "아린이 백야회에 들어간다.",
      contentHash: "chapter-summary-hash",
      isFallback: false,
      model: "test",
      generatedAt: nowIso,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryNarrativeSummary).values({
      id: crypto.randomUUID(),
      projectId,
      summaryType: "project",
      scopeType: "project",
      scopeId: projectId,
      title: "전체 요약",
      summary: "아린과 백야회의 시작.",
      status: "suggested",
      confidence: 80,
      extractorVersion: "summary-v1",
      sourceContentHash: "summary-hash",
      generatedAt: nowIso,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalCase).values({
      id: evalCaseId,
      projectId,
      name: "가입 질문",
      question: "아린은 어디에 들어갔나?",
      caseType: "qa",
      expectedAnswer: "백야회",
      severity: "p1",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEvalEvidence).values({
      id: crypto.randomUUID(),
      caseId: evalCaseId,
      projectId,
      chapterId,
      expectedChunkId: chunkId,
      startOffset: 0,
      endOffset: 14,
      quote: "아린은 백야회에 들어간다.",
      updatedAt: nowIso,
    });

    const report = await getMemoryPhaseStatusReport({ projectId });

    expect(report.projectId).toBe(projectId);
    expect(report.overall.percent).toBe(56);
    expect(report.remaining.review.suggestedEntities).toBe(1);
    expect(report.remaining.review.suggestedFacts).toBe(1);
    expect(report.phases.map((phase) => [phase.phase, phase.status])).toEqual([
      ["phase1-eval", "ready"],
      ["phase2-evidence", "ready"],
      ["phase3-identity", "needs-review"],
      ["phase4-episodes", "ready"],
      ["phase5-temporal", "needs-review"],
      ["phase6-query", "needs-review"],
      ["phase7-ui", "needs-review"],
      ["phase8-summary", "ready"],
      ["phase9-package-sync", "ready"],
    ]);
    expect(report.roadmapPhases.map((phase) => phase.phase)).toEqual([
      "phase6-package-durability",
      "phase7-beta-validation",
    ]);
  });

  it("exposes the current Phase 6 and Phase 7 roadmap status separately from DB readiness", () => {
    const phases = getMemoryRoadmapPhaseStatuses();

    expect(phases.map((phase) => phase.phase)).toEqual([
      "phase6-package-durability",
      "phase7-beta-validation",
    ]);
    expect(phases[0]).toMatchObject({
      status: "verified-with-known-gaps",
      architectureAlignment: {
        status: "aligned",
      },
    });
    expect(phases[0]?.completed).toEqual(
      expect.arrayContaining([
        "canonical sync source id mismatch reporting",
        "canonical source id mismatch repair option",
        "actual .luie memory canonical write/read roundtrip",
        "schema version fixture matrix and legacy v1 normalization",
        "unknown row field import warning and renderer notice",
        "crash-safe package write cleanup and recovery coverage",
        "corrupt .luie open recovery notice verification",
        "renderer UI package durability E2E for corrupt package recovery",
        "forced app shutdown crash-safe export E2E",
      ]),
    );
    expect(phases[0]?.remaining).toEqual([]);
    expect(phases[0]?.remaining).not.toContain(
      "source id mismatch auto repair",
    );
    expect(phases[0]?.remaining).not.toContain(
      "schema version fixture matrix beyond v1 and missing-version",
    );
    expect(phases[0]?.remaining).not.toContain(
      "unknown row field import UI notice",
    );

    expect(phases[1]).toMatchObject({
      status: "verified-with-known-gaps",
      architectureAlignment: {
        status: "aligned",
      },
    });
    expect(phases[1]?.completed).toEqual(
      expect.arrayContaining([
        "writer task benchmark taxonomy and metric summary",
        "persisted writer benchmark threshold assessment CLI",
        "writer feedback DB, IPC/preload API, UI buttons, and rejected-answer guard",
      ]),
    );
    expect(phases[1]?.remaining).toContain(
      "real writer beta data threshold calibration",
    );
  });
});

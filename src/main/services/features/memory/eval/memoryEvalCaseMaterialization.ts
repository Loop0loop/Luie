import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  chapter,
  memoryChunk,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEvalCase,
  memoryEvalEvidence,
} from "../../../../infra/database/index.js";
import type { DbLike } from "../../../../infra/database/index.js";
import {
  WRITER_PAIN_POINT_TAXONOMY,
  type WriterPainPointTaxonomyKey,
} from "../../../../../shared/constants/memoryEvalPainPoints.js";
import type {
  MemoryEvalCaseType,
  MemoryEvalSeverity,
} from "../../../../../shared/types/memoryEval.js";

type EpisodeEvidenceEvalSeedRow = {
  evidenceId: string;
  projectId: string;
  episodeTitle: string;
  chapterId: string | null;
  chunkId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  quote: string;
};

type ChunkEvalSeedRow = {
  chunkId: string;
  projectId: string;
  chapterId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  contextLabel: string | null;
  content: string;
};

type TemporalChunkEvalSeedRow = ChunkEvalSeedRow & {
  chapterOrder: number;
  chapterTitle: string;
};

type WriterPainPointTemplate = {
  key: WriterPainPointTaxonomyKey;
  caseType: MemoryEvalCaseType;
  severity: MemoryEvalSeverity;
  question: (input: { contextLabel: string; excerpt: string }) => string;
};

const QUESTION_BUILDERS: Record<
  WriterPainPointTaxonomyKey,
  (input: { contextLabel: string; excerpt: string }) => string
> = {
  "alias-confusion": ({ contextLabel, excerpt }) =>
    `${contextLabel} 기준으로, 이 대목의 인물/별칭/호칭이 같은 대상을 가리키는지 원문 근거로 확인해줘: ${excerpt}`,
  "knowledge-state": ({ contextLabel, excerpt }) =>
    `${contextLabel} 기준으로, 특정 캐릭터가 이 사실을 알고 있다고 써도 되는지 원문 근거로 판단해줘: ${excerpt}`,
  "future-leakage": ({ contextLabel, excerpt }) =>
    `${contextLabel} 시점까지만 보고, 이후 회차 정보를 섞지 않아도 이 설정을 확정해도 되는지 확인해줘: ${excerpt}`,
  "draft-contamination": ({ contextLabel, excerpt }) =>
    `초안/폐기 설정을 정사로 섞지 말고, ${contextLabel} 원문에 실제 근거가 있는지 확인해줘: ${excerpt}`,
  "relation-direction": ({ contextLabel, excerpt }) =>
    `${contextLabel}에서 관계 방향을 뒤집지 않게, 누가 누구에게 행동/감정을 갖는지 원문 근거로 확인해줘: ${excerpt}`,
  "unresolved-thread": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 이 대목이 아직 미회수 떡밥인지, 이미 회수된 사실인지 근거 문장으로 확인해줘: ${excerpt}`,
  "continuity-state": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 생존/부상/위치/소속/능력/소유물 상태가 이전 기억과 충돌할 수 있는지 근거부터 확인해줘: ${excerpt}`,
  "motivation-drift": ({ contextLabel, excerpt }) =>
    `${contextLabel}에서 이 감정선이나 행동 동기가 앞선 원문 근거로 뒷받침되는지 확인해줘: ${excerpt}`,
  "world-rule-conflict": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 세계관 규칙, 능력 조건, 조직 규칙이 이전 원문 설정과 충돌하지 않는지 확인해줘: ${excerpt}`,
};

const WRITER_PAIN_POINT_TEMPLATES: readonly WriterPainPointTemplate[] =
  WRITER_PAIN_POINT_TAXONOMY.map((item) => ({
    key: item.key,
    caseType: item.caseType,
    severity: item.severity,
    question: QUESTION_BUILDERS[item.key],
  }));

function excerptFromContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 90)}...`;
}

function buildEvidenceRecallQuestion(input: {
  title: string;
  quote: string;
}): string {
  return `${input.title}의 원문 근거를 찾아라: ${excerptFromContent(input.quote)}`;
}

function buildWriterPainPointCaseName(input: {
  templateKey: string;
  chunkId: string;
}): string {
  return `writer-pain:${input.templateKey}:${input.chunkId}`;
}

function buildTemporalChapterCaseName(input: {
  chapterOrder: number;
  chunkId: string;
}): string {
  return `temporal-chapter:${input.chapterOrder}:${input.chunkId}`;
}

export async function materializeMemoryEvalCasesFromEpisodeEvidence(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ inspected: number; created: number; skipped: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const limit = Math.max(1, input.limit ?? 20);
  const client = db.getClient();
  const rows = await client
    .select({
      evidenceId: memoryEpisodeEvidence.id,
      projectId: memoryEpisodeEvidence.projectId,
      episodeTitle: memoryEpisode.title,
      chapterId: memoryEpisodeEvidence.chapterId,
      chunkId: memoryEpisodeEvidence.chunkId,
      startOffset: memoryEpisodeEvidence.startOffset,
      endOffset: memoryEpisodeEvidence.endOffset,
      quote: memoryEpisodeEvidence.quote,
    })
    .from(memoryEpisodeEvidence)
    .innerJoin(
      memoryEpisode,
      eq(memoryEpisode.id, memoryEpisodeEvidence.episodeId),
    )
    .where(eq(memoryEpisodeEvidence.projectId, input.projectId))
    .limit(limit);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = `episode evidence: ${row.episodeTitle}`;
    // eslint-disable-next-line no-await-in-loop -- duplicate checks are scoped per generated fixture name.
    const existing = await client
      .select({ id: memoryEvalCase.id })
      .from(memoryEvalCase)
      .where(
        and(
          eq(memoryEvalCase.projectId, input.projectId),
          eq(memoryEvalCase.name, name),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop -- each eval fixture is inserted atomically with its evidence row.
    await insertEvalCaseFromEpisodeEvidence(row, name, nowIso);
    created += 1;
  }

  return { inspected: rows.length, created, skipped };
}

export async function materializeWriterPainPointEvalCasesFromChunks(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ inspected: number; created: number; skipped: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const limit = Math.max(1, input.limit ?? 50);
  const client = db.getClient();
  const chunkLimit = Math.max(1, Math.ceil(limit / WRITER_PAIN_POINT_TEMPLATES.length));
  const rows = await client
    .select({
      chunkId: memoryChunk.id,
      projectId: memoryChunk.projectId,
      chapterId: memoryChunk.chapterId,
      startOffset: memoryChunk.startOffset,
      endOffset: memoryChunk.endOffset,
      contextLabel: memoryChunk.contextLabel,
      content: memoryChunk.content,
    })
    .from(memoryChunk)
    .where(eq(memoryChunk.projectId, input.projectId))
    .limit(chunkLimit);

  const candidates = rows.flatMap((row) =>
    WRITER_PAIN_POINT_TEMPLATES.map((template) => ({
      row,
      template,
      name: buildWriterPainPointCaseName({
        templateKey: template.key,
        chunkId: row.chunkId,
      }),
    })),
  );
  const selected = candidates.slice(0, limit);
  const existingNames = new Set(
    (
      await client
        .select({ name: memoryEvalCase.name })
        .from(memoryEvalCase)
        .where(eq(memoryEvalCase.projectId, input.projectId))
    ).map((row) => row.name),
  );

  let created = 0;
  let skipped = 0;

  db.getClient().transaction((tx) => {
    for (const candidate of selected) {
      if (existingNames.has(candidate.name)) {
        skipped += 1;
        continue;
      }
      insertWriterPainPointEvalCase({
        tx,
        row: candidate.row,
        template: candidate.template,
        name: candidate.name,
        nowIso,
      });
      created += 1;
    }
  });

  return { inspected: rows.length, created, skipped };
}

export async function materializeTemporalChapterEvalCasesFromChunks(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ inspected: number; created: number; skipped: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const limit = Math.max(1, input.limit ?? 50);
  const client = db.getClient();
  const rows = await client
    .select({
      chunkId: memoryChunk.id,
      projectId: memoryChunk.projectId,
      chapterId: memoryChunk.chapterId,
      startOffset: memoryChunk.startOffset,
      endOffset: memoryChunk.endOffset,
      contextLabel: memoryChunk.contextLabel,
      content: memoryChunk.content,
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
    })
    .from(memoryChunk)
    .innerJoin(chapter, eq(chapter.id, memoryChunk.chapterId))
    .where(eq(memoryChunk.projectId, input.projectId))
    .limit(limit);

  const candidates = rows.map((row) => ({
    row,
    name: buildTemporalChapterCaseName({
      chapterOrder: row.chapterOrder,
      chunkId: row.chunkId,
    }),
  }));
  const existingNames = new Set(
    (
      await client
        .select({ name: memoryEvalCase.name })
        .from(memoryEvalCase)
        .where(eq(memoryEvalCase.projectId, input.projectId))
    ).map((row) => row.name),
  );

  let created = 0;
  let skipped = 0;

  db.getClient().transaction((tx) => {
    for (const candidate of candidates) {
      if (existingNames.has(candidate.name)) {
        skipped += 1;
        continue;
      }
      insertTemporalChapterEvalCase({
        tx,
        row: candidate.row,
        name: candidate.name,
        nowIso,
      });
      created += 1;
    }
  });

  return { inspected: rows.length, created, skipped };
}

export async function repairLegacyEpisodeEvalCases(input: {
  projectId: string;
  nowIso?: string;
}): Promise<{ inspected: number; repaired: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const rows = await db.getClient().all<{
    caseId: string;
    caseName: string;
    question: string;
    expectedAnswer: string | null;
    quote: string;
  }>(sql`
    SELECT evalCase.id AS caseId,
           evalCase.name AS caseName,
           evalCase.question AS question,
           evalCase.expectedAnswer AS expectedAnswer,
           evidence.quote AS quote
    FROM "MemoryEvalCase" evalCase
    INNER JOIN "MemoryEvalEvidence" evidence
      ON evidence."caseId" = evalCase.id
    WHERE evalCase."projectId" = ${input.projectId}
      AND evalCase.name LIKE 'episode evidence:%';
  `);

  let repaired = 0;
  db.getClient().transaction((tx) => {
    for (const row of rows) {
      const title = row.caseName.replace(/^episode evidence:\s*/, "").trim();
      const question = buildEvidenceRecallQuestion({
        title: title || row.caseName,
        quote: row.quote,
      });
      const expectedAnswer = excerptFromContent(row.quote);
      if (
        row.question === question &&
        (row.expectedAnswer ?? "") === expectedAnswer
      ) {
        continue;
      }
      tx.update(memoryEvalCase)
        .set({
          question,
          expectedAnswer,
          updatedAt: nowIso,
        })
        .where(eq(memoryEvalCase.id, row.caseId))
        .run();
      repaired += 1;
    }
  });

  return { inspected: rows.length, repaired };
}

export async function repairWriterPainPointTaxonomyEvalCases(input: {
  projectId: string;
}): Promise<{
  inspected: number;
  deprecatedRemoved: number;
  currentKept: number;
}> {
  const currentKeys = new Set(WRITER_PAIN_POINT_TAXONOMY.map((item) => item.key));
  const rows = await db.getClient().all<{ id: string; name: string }>(sql`
    SELECT "id", "name"
    FROM "MemoryEvalCase"
    WHERE "projectId" = ${input.projectId}
      AND "name" LIKE 'writer-pain:%';
  `);
  const deprecatedRows = rows.filter((row) => {
    const key = row.name.split(":")[1];
    return !currentKeys.has(key as WriterPainPointTaxonomyKey);
  });

  db.getClient().transaction((tx) => {
    for (const row of deprecatedRows) {
      tx.delete(memoryEvalEvidence)
        .where(eq(memoryEvalEvidence.caseId, row.id))
        .run();
      tx.delete(memoryEvalCase).where(eq(memoryEvalCase.id, row.id)).run();
    }
  });

  return {
    inspected: rows.length,
    deprecatedRemoved: deprecatedRows.length,
    currentKept: rows.length - deprecatedRows.length,
  };
}

async function insertEvalCaseFromEpisodeEvidence(
  row: EpisodeEvidenceEvalSeedRow,
  name: string,
  nowIso: string,
): Promise<void> {
  const caseId = crypto.randomUUID();
  db.getClient().transaction((tx) => {
    tx.insert(memoryEvalCase)
      .values({
        id: caseId,
        projectId: row.projectId,
        name,
        question: buildEvidenceRecallQuestion({
          title: row.episodeTitle,
          quote: row.quote,
        }),
        caseType: "qa",
        expectedAnswer: excerptFromContent(row.quote),
        temporalScopeStartChapterId: row.chapterId,
        temporalScopeEndChapterId: row.chapterId,
        severity: "p1",
        updatedAt: nowIso,
      })
      .run();
    tx.insert(memoryEvalEvidence)
      .values({
        id: crypto.randomUUID(),
        caseId,
        projectId: row.projectId,
        chapterId: row.chapterId,
        expectedChunkId: row.chunkId,
        startOffset: row.startOffset,
        endOffset: row.endOffset,
        quote: row.quote,
        updatedAt: nowIso,
      })
      .run();
  });
}

function insertWriterPainPointEvalCase(input: {
  tx: DbLike;
  row: ChunkEvalSeedRow;
  template: WriterPainPointTemplate;
  name: string;
  nowIso: string;
}): void {
  const caseId = crypto.randomUUID();
  const contextLabel = input.row.contextLabel?.trim() || "현재 원문";
  const excerpt = excerptFromContent(input.row.content);
  input.tx
    .insert(memoryEvalCase)
    .values({
      id: caseId,
      projectId: input.row.projectId,
      name: input.name,
      question: input.template.question({ contextLabel, excerpt }),
      caseType: input.template.caseType,
      expectedAnswer: excerpt,
      temporalScopeStartChapterId: input.row.chapterId,
      temporalScopeEndChapterId: input.row.chapterId,
      severity: input.template.severity,
      updatedAt: input.nowIso,
    })
    .run();
  input.tx
    .insert(memoryEvalEvidence)
    .values({
      id: crypto.randomUUID(),
      caseId,
      projectId: input.row.projectId,
      chapterId: input.row.chapterId,
      expectedChunkId: input.row.chunkId,
      startOffset: input.row.startOffset,
      endOffset: input.row.endOffset,
      quote: input.row.content,
      updatedAt: input.nowIso,
    })
    .run();
}

function insertTemporalChapterEvalCase(input: {
  tx: DbLike;
  row: TemporalChunkEvalSeedRow;
  name: string;
  nowIso: string;
}): void {
  const caseId = crypto.randomUUID();
  const contextLabel =
    input.row.contextLabel?.trim() ||
    input.row.chapterTitle.trim() ||
    `${input.row.chapterOrder}화`;
  const excerpt = excerptFromContent(input.row.content);
  input.tx
    .insert(memoryEvalCase)
    .values({
      id: caseId,
      projectId: input.row.projectId,
      name: input.name,
      question: `${contextLabel} 기준으로, 이 사실을 이후 회차 정보 없이 확정해도 되는지 원문 근거로 확인해줘: ${excerpt}`,
      caseType: "temporal_state",
      expectedAnswer: excerpt,
      temporalScopeStartChapterId: input.row.chapterId,
      temporalScopeEndChapterId: input.row.chapterId,
      queryChapterOrder: input.row.chapterOrder,
      severity: "p0",
      updatedAt: input.nowIso,
    })
    .run();
  input.tx
    .insert(memoryEvalEvidence)
    .values({
      id: crypto.randomUUID(),
      caseId,
      projectId: input.row.projectId,
      chapterId: input.row.chapterId,
      expectedChunkId: input.row.chunkId,
      startOffset: input.row.startOffset,
      endOffset: input.row.endOffset,
      quote: input.row.content,
      updatedAt: input.nowIso,
    })
    .run();
}

export async function countMemoryEvalCases(input: {
  projectId: string;
}): Promise<{ evalCaseCount: number; evalEvidenceCount: number }> {
  const [caseRows, evidenceRows] = await Promise.all([
    db.getClient().all<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM "MemoryEvalCase"
      WHERE "projectId" = ${input.projectId};
    `),
    db.getClient().all<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM "MemoryEvalEvidence"
      WHERE "projectId" = ${input.projectId};
    `),
  ]);
  return {
    evalCaseCount: Number(caseRows[0]?.count ?? 0),
    evalEvidenceCount: Number(evidenceRows[0]?.count ?? 0),
  };
}

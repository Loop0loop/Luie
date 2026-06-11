import { eq, sql } from "drizzle-orm";
import {
  db,
  memoryEvalCase,
} from "../../../../infra/database/index.js";

type EvalQualityRow = {
  caseId: string;
  question: string;
  expectedAnswer: string | null;
  evidenceQuote: string;
  chunkContent: string | null;
};

export type MemoryEvalQualityAuditResult = {
  evalCasesScanned: number;
  evalEvidenceScanned: number;
  evidenceQuoteMissingInExpectedChunk: number;
  expectedAnswerUnsupported: number;
  repairedExpectedAnswers: number;
};

export async function auditMemoryEvalCaseQuality(input: {
  projectId: string;
  repairExpectedAnswers?: boolean;
  nowIso?: string;
}): Promise<MemoryEvalQualityAuditResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const rows = await db.getClient().all<EvalQualityRow>(sql`
    SELECT
      evalCase."id" AS "caseId",
      evalCase."question" AS "question",
      evalCase."expectedAnswer" AS "expectedAnswer",
      evidence."quote" AS "evidenceQuote",
      chunk."content" AS "chunkContent"
    FROM "MemoryEvalCase" evalCase
    INNER JOIN "MemoryEvalEvidence" evidence
      ON evidence."caseId" = evalCase."id"
    LEFT JOIN "MemoryChunk" chunk
      ON chunk."id" = evidence."expectedChunkId"
    WHERE evalCase."projectId" = ${input.projectId};
  `);
  const caseIds = new Set(rows.map((row) => row.caseId));
  let evidenceQuoteMissingInExpectedChunk = 0;
  let expectedAnswerUnsupported = 0;
  let repairedExpectedAnswers = 0;
  const repairedCaseIds = new Set<string>();

  for (const row of rows) {
    if (
      row.chunkContent !== null &&
      !textSupportsClaim(row.evidenceQuote, row.chunkContent, 0.5)
    ) {
      evidenceQuoteMissingInExpectedChunk += 1;
    }

    const expectedAnswer = row.expectedAnswer?.trim() ?? "";
    if (
      expectedAnswer.length > 0 &&
      !textSupportsClaim(expectedAnswer, row.evidenceQuote, 0.7)
    ) {
      expectedAnswerUnsupported += 1;
      if (input.repairExpectedAnswers && !repairedCaseIds.has(row.caseId)) {
        // eslint-disable-next-line no-await-in-loop -- quality repair updates are counted per eval case for traceable reports.
        await db
          .getClient()
          .update(memoryEvalCase)
          .set({
            expectedAnswer: cleanEvidenceText(row.evidenceQuote),
            updatedAt: nowIso,
          })
          .where(eq(memoryEvalCase.id, row.caseId));
        repairedExpectedAnswers += 1;
        repairedCaseIds.add(row.caseId);
      }
    }
  }

  return {
    evalCasesScanned: caseIds.size,
    evalEvidenceScanned: rows.length,
    evidenceQuoteMissingInExpectedChunk,
    expectedAnswerUnsupported,
    repairedExpectedAnswers,
  };
}

function textSupportsClaim(
  claim: string,
  supportText: string,
  ratio: number,
): boolean {
  const tokens = extractQualityTokens(claim);
  if (tokens.length === 0) return true;
  const normalizedSupport = cleanEvidenceText(supportText).toLowerCase();
  const hits = tokens.filter((token) => normalizedSupport.includes(token)).length;
  return hits >= Math.min(tokens.length, Math.ceil(tokens.length * ratio));
}

function cleanEvidenceText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQualityTokens(value: string): string[] {
  return Array.from(
    new Set(
      cleanEvidenceText(value)
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) =>
          token
            .trim()
            .toLowerCase()
            .replace(
              /(으로만|에게만|에서는|으로는|에게는|으로|에게|에서|부터|까지|처럼|보다|과는|와는|에는|의|은|는|이|가|을|를|와|과|도|만|로)$/u,
              "",
            ),
        )
        .filter((token) => token.length >= 2),
    ),
  );
}

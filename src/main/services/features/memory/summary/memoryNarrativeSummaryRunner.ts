import crypto from "node:crypto";
import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import {
  chapterSummary,
  db,
  memoryEntity,
  memoryFact,
  memoryNarrativeSummary,
  memoryNarrativeSummarySource,
  project,
} from "../../../../infra/database/index.js";

export type NarrativeHierarchyChapterSummary = {
  id: string;
  chapterId: string;
  chapterNumber: number;
  summary: string;
  contentHash: string;
};

type HierarchySummaryDraft = {
  title: string;
  summary: string;
  confidence: number;
};

type HierarchySummarizerInput = {
  projectTitle: string;
  chapterSummaries: NarrativeHierarchyChapterSummary[];
  scopeType: string;
  scopeId: string;
  summaryType: string;
};

export type NarrativeHierarchySummarizer = (
  input: HierarchySummarizerInput,
) => Promise<HierarchySummaryDraft>;

export type NarrativeHierarchyCommunityFact = {
  id: string;
  subjectEntityId: string;
  subjectName: string;
  predicate: string;
  objectEntityId: string | null;
  objectName: string | null;
  objectValue: string | null;
  valueType: string;
  observedAtChapterOrder: number;
  sourceContentHash: string;
};

type CommunitySummarizerInput = {
  projectTitle: string;
  communityId: string;
  entityIds: string[];
  facts: NarrativeHierarchyCommunityFact[];
};

export type NarrativeCommunitySummarizer = (
  input: CommunitySummarizerInput,
) => Promise<HierarchySummaryDraft>;

const HIERARCHY_EXTRACTOR_VERSION = "hierarchy-v1";

function isLlmNarrativeSummaryHierarchyEnabled(): boolean {
  return process.env.LUIE_ENABLE_LLM_NARRATIVE_SUMMARY_HIERARCHY === "1";
}

function computeSourceContentHash(summaries: NarrativeHierarchyChapterSummary[]): string {
  const payload = summaries
    .map((summary) => `${summary.id}:${summary.contentHash}`)
    .join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function computeFactSourceContentHash(facts: NarrativeHierarchyCommunityFact[]): string {
  const payload = facts
    .map((fact) => `${fact.id}:${fact.sourceContentHash}`)
    .join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function trimSummaryText(text: string, limit: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit)}...`;
}

async function fallbackSummarizer(
  input: HierarchySummarizerInput,
): Promise<HierarchySummaryDraft> {
  return {
    title: `${input.projectTitle} 전체 흐름`,
    summary: trimSummaryText(
      input.chapterSummaries
        .map((summary) => `${summary.chapterNumber}화: ${summary.summary}`)
        .join(" "),
      1200,
    ),
    confidence: 40,
  };
}

async function fallbackCommunitySummarizer(
  input: CommunitySummarizerInput,
): Promise<HierarchySummaryDraft> {
  return {
    title: `${input.projectTitle} 커뮤니티 흐름`,
    summary: trimSummaryText(
      input.facts
        .map((fact) => {
          const object = fact.objectName ?? fact.objectValue ?? "값 없음";
          return `${fact.subjectName} ${fact.predicate} ${object}`;
        })
        .join(" "),
      1200,
    ),
    confidence: 45,
  };
}

function buildHierarchyPrompt(input: HierarchySummarizerInput): string {
  return [
    "다음 장별 요약들을 바탕으로 작품 전체 흐름을 요약하라.",
    "응답은 JSON 객체 하나만 출력한다.",
    `작품: ${input.projectTitle}`,
    "",
    "장별 요약:",
    ...input.chapterSummaries.map(
      (summary) => `${summary.chapterNumber}화: ${summary.summary}`,
    ),
    "",
    `{"title":"string","summary":"string","confidence":0-100}`,
  ].join("\n");
}

async function llmSummarizer(
  projectId: string,
  input: HierarchySummarizerInput,
): Promise<HierarchySummaryDraft> {
  const { utilityProcessBridge } = await import("../../utility/utilityProcessBridge.js");
  const generated = await utilityProcessBridge.generateText(
    projectId,
    buildHierarchyPrompt(input),
    { maxTokens: 1000, temperature: 0.2 },
  );
  const parsed = JSON.parse(generated.text.trim()) as {
    title?: unknown;
    summary?: unknown;
    confidence?: unknown;
  };
  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : `${input.projectTitle} 전체 흐름`,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : trimSummaryText(generated.text, 1200),
    confidence:
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        : 60,
  };
}

export async function generateProjectNarrativeSummaryHierarchy(input: {
  projectId: string;
  nowIso?: string;
  summarizer?: NarrativeHierarchySummarizer;
}): Promise<{ generated: number; summaryId: string | null }> {
  return generateScopedNarrativeSummaryHierarchy({
    projectId: input.projectId,
    scopeType: "project",
    scopeId: input.projectId,
    summaryType: "project_overview",
    nowIso: input.nowIso,
    summarizer: input.summarizer,
  });
}

export async function generateScopedNarrativeSummaryHierarchy(input: {
  projectId: string;
  scopeType: "arc" | "volume" | "project" | "community" | string;
  scopeId: string;
  summaryType:
    | "arc_overview"
    | "volume_overview"
    | "project_overview"
    | "community_overview"
    | string;
  fromChapterNumber?: number;
  toChapterNumber?: number;
  nowIso?: string;
  summarizer?: NarrativeHierarchySummarizer;
}): Promise<{ generated: number; summaryId: string | null }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const client = db.getClient();
  const [projectRow] = await client
    .select({ title: project.title })
    .from(project)
    .where(eq(project.id, input.projectId))
    .limit(1);
  if (!projectRow) return { generated: 0, summaryId: null };

  const chapterPredicates = [
    eq(chapterSummary.projectId, input.projectId),
    eq(chapterSummary.isFallback, false),
  ];
  if (input.fromChapterNumber !== undefined) {
    chapterPredicates.push(
      gte(chapterSummary.chapterNumber, input.fromChapterNumber),
    );
  }
  if (input.toChapterNumber !== undefined) {
    chapterPredicates.push(
      lte(chapterSummary.chapterNumber, input.toChapterNumber),
    );
  }

  const chapterSummaries = await client
    .select({
      id: chapterSummary.id,
      chapterId: chapterSummary.chapterId,
      chapterNumber: chapterSummary.chapterNumber,
      summary: chapterSummary.summary,
      contentHash: chapterSummary.contentHash,
    })
    .from(chapterSummary)
    .where(and(...chapterPredicates))
    .orderBy(asc(chapterSummary.chapterNumber))
    .limit(80);
  if (chapterSummaries.length === 0) return { generated: 0, summaryId: null };

  const sourceContentHash = computeSourceContentHash(chapterSummaries);
  const existingRows = await client
    .select({
      id: memoryNarrativeSummary.id,
      sourceContentHash: memoryNarrativeSummary.sourceContentHash,
    })
    .from(memoryNarrativeSummary)
    .where(
      and(
        eq(memoryNarrativeSummary.projectId, input.projectId),
        eq(memoryNarrativeSummary.summaryType, input.summaryType),
        eq(memoryNarrativeSummary.scopeType, input.scopeType),
        eq(memoryNarrativeSummary.scopeId, input.scopeId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (existing?.sourceContentHash === sourceContentHash) {
    return { generated: 0, summaryId: existing.id };
  }

  const summarizer =
    input.summarizer ??
    (isLlmNarrativeSummaryHierarchyEnabled()
      ? (summaryInput: HierarchySummarizerInput) =>
          llmSummarizer(input.projectId, summaryInput)
      : fallbackSummarizer);
  const draft = await summarizer({
    projectTitle: projectRow.title,
    chapterSummaries,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    summaryType: input.summaryType,
  });
  const summaryId = existing?.id ?? crypto.randomUUID();

  await client.transaction((tx) => {
    if (existing) {
      tx.delete(memoryNarrativeSummarySource)
        .where(eq(memoryNarrativeSummarySource.summaryId, summaryId))
        .run();
      tx.update(memoryNarrativeSummary)
        .set({
          title: draft.title,
          summary: draft.summary,
          status: "confirmed",
          confidence: draft.confidence,
          extractorVersion: HIERARCHY_EXTRACTOR_VERSION,
          sourceContentHash,
          generatedAt: nowIso,
          updatedAt: nowIso,
          rejectedAt: null,
          rejectionReason: null,
        })
        .where(eq(memoryNarrativeSummary.id, summaryId))
        .run();
    } else {
      tx.insert(memoryNarrativeSummary)
        .values({
          id: summaryId,
          projectId: input.projectId,
          summaryType: input.summaryType,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          title: draft.title,
          summary: draft.summary,
          status: "confirmed",
          confidence: draft.confidence,
          extractorVersion: HIERARCHY_EXTRACTOR_VERSION,
          sourceContentHash,
          generatedAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
    }

    tx.insert(memoryNarrativeSummarySource)
      .values(
        chapterSummaries.map((summary) => ({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          summaryId,
          sourceType: "chapter_summary",
          episodeId: null,
          factId: null,
          chunkId: null,
          chapterSummaryId: summary.id,
          quote: summary.summary,
          contentHash: summary.contentHash,
          updatedAt: nowIso,
        })),
      )
      .run();
  });

  return { generated: 1, summaryId };
}

export async function generateCommunityNarrativeSummaryHierarchy(input: {
  projectId: string;
  communityId: string;
  entityIds: string[];
  nowIso?: string;
  summarizer?: NarrativeCommunitySummarizer;
}): Promise<{ generated: number; summaryId: string | null }> {
  const entityIds = Array.from(
    new Set(input.entityIds.filter((id) => id.trim())),
  );
  if (entityIds.length === 0) return { generated: 0, summaryId: null };

  const nowIso = input.nowIso ?? new Date().toISOString();
  const client = db.getClient();
  const [projectRow] = await client
    .select({ title: project.title })
    .from(project)
    .where(eq(project.id, input.projectId))
    .limit(1);
  if (!projectRow) return { generated: 0, summaryId: null };

  const entityRows = await client
    .select({
      id: memoryEntity.id,
      canonicalName: memoryEntity.canonicalName,
    })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        inArray(memoryEntity.id, entityIds),
      ),
    );
  const entityNameById = new Map(
    entityRows.map((entity) => [entity.id, entity.canonicalName]),
  );

  const factRows = await client
    .select({
      id: memoryFact.id,
      subjectEntityId: memoryFact.subjectEntityId,
      predicate: memoryFact.predicate,
      objectEntityId: memoryFact.objectEntityId,
      objectValue: memoryFact.objectValue,
      valueType: memoryFact.valueType,
      observedAtChapterOrder: memoryFact.observedAtChapterOrder,
      sourceContentHash: memoryFact.sourceContentHash,
    })
    .from(memoryFact)
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.status, "confirmed"),
        isNull(memoryFact.invalidatedByFactId),
        or(
          inArray(memoryFact.subjectEntityId, entityIds),
          inArray(memoryFact.objectEntityId, entityIds),
        ),
      ),
    )
    .orderBy(asc(memoryFact.observedAtChapterOrder));

  const facts: NarrativeHierarchyCommunityFact[] = factRows.map((fact) => ({
    ...fact,
    subjectName:
      entityNameById.get(fact.subjectEntityId) ?? fact.subjectEntityId,
    objectName: fact.objectEntityId
      ? (entityNameById.get(fact.objectEntityId) ?? fact.objectEntityId)
      : null,
  }));
  if (facts.length === 0) return { generated: 0, summaryId: null };

  const sourceContentHash = computeFactSourceContentHash(facts);
  const existingRows = await client
    .select({
      id: memoryNarrativeSummary.id,
      sourceContentHash: memoryNarrativeSummary.sourceContentHash,
    })
    .from(memoryNarrativeSummary)
    .where(
      and(
        eq(memoryNarrativeSummary.projectId, input.projectId),
        eq(memoryNarrativeSummary.summaryType, "community_overview"),
        eq(memoryNarrativeSummary.scopeType, "community"),
        eq(memoryNarrativeSummary.scopeId, input.communityId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (existing?.sourceContentHash === sourceContentHash) {
    return { generated: 0, summaryId: existing.id };
  }

  const summarizer = input.summarizer ?? fallbackCommunitySummarizer;
  const draft = await summarizer({
    projectTitle: projectRow.title,
    communityId: input.communityId,
    entityIds,
    facts,
  });
  const summaryId = existing?.id ?? crypto.randomUUID();

  await client.transaction((tx) => {
    if (existing) {
      tx.delete(memoryNarrativeSummarySource)
        .where(eq(memoryNarrativeSummarySource.summaryId, summaryId))
        .run();
      tx.update(memoryNarrativeSummary)
        .set({
          title: draft.title,
          summary: draft.summary,
          status: "confirmed",
          confidence: draft.confidence,
          extractorVersion: HIERARCHY_EXTRACTOR_VERSION,
          sourceContentHash,
          generatedAt: nowIso,
          updatedAt: nowIso,
          rejectedAt: null,
          rejectionReason: null,
        })
        .where(eq(memoryNarrativeSummary.id, summaryId))
        .run();
    } else {
      tx.insert(memoryNarrativeSummary)
        .values({
          id: summaryId,
          projectId: input.projectId,
          summaryType: "community_overview",
          scopeType: "community",
          scopeId: input.communityId,
          title: draft.title,
          summary: draft.summary,
          status: "confirmed",
          confidence: draft.confidence,
          extractorVersion: HIERARCHY_EXTRACTOR_VERSION,
          sourceContentHash,
          generatedAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
    }

    tx.insert(memoryNarrativeSummarySource)
      .values(
        facts.map((fact) => ({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          summaryId,
          sourceType: "fact",
          episodeId: null,
          factId: fact.id,
          chunkId: null,
          chapterSummaryId: null,
          quote: `${fact.subjectName} ${fact.predicate} ${
            fact.objectName ?? fact.objectValue ?? ""
          }`.trim(),
          contentHash: fact.sourceContentHash,
          updatedAt: nowIso,
        })),
      )
      .run();
  });

  return { generated: 1, summaryId };
}

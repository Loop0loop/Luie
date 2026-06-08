import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  chapterSummary,
  db,
  memoryFact,
} from "../../../../infra/database/index.js";
import {
  generateCommunityNarrativeSummaryHierarchy,
  generateScopedNarrativeSummaryHierarchy,
  type NarrativeCommunitySummarizer,
  type NarrativeHierarchySummarizer,
} from "./memoryNarrativeSummaryRunner.js";

type HierarchyScope = {
  scopeType: "arc" | "volume";
  summaryType: "arc_overview" | "volume_overview";
  scopeId: string;
  fromChapterNumber: number;
  toChapterNumber: number;
};

function buildRanges(input: {
  minChapterNumber: number;
  maxChapterNumber: number;
  size: number;
  scopeType: "arc" | "volume";
}): HierarchyScope[] {
  const ranges: HierarchyScope[] = [];
  for (
    let start = input.minChapterNumber;
    start <= input.maxChapterNumber;
    start += input.size
  ) {
    const end = Math.min(start + input.size - 1, input.maxChapterNumber);
    ranges.push({
      scopeType: input.scopeType,
      summaryType:
        input.scopeType === "arc" ? "arc_overview" : "volume_overview",
      scopeId: `${input.scopeType}:${start}-${end}`,
      fromChapterNumber: start,
      toChapterNumber: end,
    });
  }
  return ranges;
}

export async function scheduleProjectNarrativeHierarchyScopes(input: {
  projectId: string;
  nowIso?: string;
  arcSize?: number;
  volumeSize?: number;
  summarizer?: NarrativeHierarchySummarizer;
}): Promise<{ inspectedScopes: number; generated: number; summaryIds: string[] }> {
  const arcSize = Math.max(1, Math.floor(input.arcSize ?? 20));
  const volumeSize = Math.max(1, Math.floor(input.volumeSize ?? 100));
  const rows = await db
    .getClient()
    .select({
      chapterNumber: chapterSummary.chapterNumber,
    })
    .from(chapterSummary)
    .where(
      and(
        eq(chapterSummary.projectId, input.projectId),
        eq(chapterSummary.isFallback, false),
      ),
    )
    .orderBy(asc(chapterSummary.chapterNumber));
  if (rows.length === 0) {
    return { inspectedScopes: 0, generated: 0, summaryIds: [] };
  }

  const chapterNumbers = rows.map((row) => row.chapterNumber);
  const minChapterNumber = Math.min(...chapterNumbers);
  const maxChapterNumber = Math.max(...chapterNumbers);
  const scopes = [
    ...buildRanges({
      minChapterNumber,
      maxChapterNumber,
      size: arcSize,
      scopeType: "arc",
    }),
    ...buildRanges({
      minChapterNumber,
      maxChapterNumber,
      size: volumeSize,
      scopeType: "volume",
    }),
  ];

  let generated = 0;
  const summaryIds: string[] = [];
  for (const scope of scopes) {
    const result = await generateScopedNarrativeSummaryHierarchy({
      projectId: input.projectId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      summaryType: scope.summaryType,
      fromChapterNumber: scope.fromChapterNumber,
      toChapterNumber: scope.toChapterNumber,
      nowIso: input.nowIso,
      summarizer: input.summarizer,
    });
    if (result.generated > 0 && result.summaryId) {
      generated += result.generated;
      summaryIds.push(result.summaryId);
    }
  }

  return {
    inspectedScopes: scopes.length,
    generated,
    summaryIds,
  };
}

function findConnectedComponents(edges: Array<[string, string]>): string[][] {
  const adjacency = new Map<string, Set<string>>();
  for (const [left, right] of edges) {
    if (!adjacency.has(left)) adjacency.set(left, new Set());
    if (!adjacency.has(right)) adjacency.set(right, new Set());
    adjacency.get(left)?.add(right);
    adjacency.get(right)?.add(left);
  }

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const node of Array.from(adjacency.keys()).sort()) {
    if (visited.has(node)) continue;
    const stack = [node];
    const component: string[] = [];
    visited.add(node);
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }
    components.push(component.sort());
  }
  return components;
}

export async function scheduleProjectNarrativeCommunities(input: {
  projectId: string;
  nowIso?: string;
  summarizer?: NarrativeCommunitySummarizer;
}): Promise<{ inspectedCommunities: number; generated: number; summaryIds: string[] }> {
  const factRows = await db
    .getClient()
    .select({
      subjectEntityId: memoryFact.subjectEntityId,
      objectEntityId: memoryFact.objectEntityId,
    })
    .from(memoryFact)
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.status, "confirmed"),
        eq(memoryFact.valueType, "relation"),
        isNull(memoryFact.invalidatedByFactId),
        isNotNull(memoryFact.objectEntityId),
      ),
    );
  const components = findConnectedComponents(
    factRows
      .filter((row): row is { subjectEntityId: string; objectEntityId: string } =>
        Boolean(row.objectEntityId),
      )
      .map((row) => [row.subjectEntityId, row.objectEntityId]),
  );

  let generated = 0;
  const summaryIds: string[] = [];
  for (const entityIds of components) {
    if (entityIds.length < 2) continue;
    const communityId = `community:${entityIds.join("+")}`;
    const result = await generateCommunityNarrativeSummaryHierarchy({
      projectId: input.projectId,
      communityId,
      entityIds,
      nowIso: input.nowIso,
      summarizer: input.summarizer,
    });
    if (result.generated > 0 && result.summaryId) {
      generated += result.generated;
      summaryIds.push(result.summaryId);
    }
  }

  return {
    inspectedCommunities: components.filter((component) => component.length >= 2)
      .length,
    generated,
    summaryIds,
  };
}

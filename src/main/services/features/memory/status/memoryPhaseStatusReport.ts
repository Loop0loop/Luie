import { count, eq } from "drizzle-orm";
import {
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
  memoryFactEvidence,
  memoryNarrativeSummary,
} from "../../../../infra/database/index.js";
import { verifyMemoryCanonicalPackageSync } from "../persistence/memoryCanonicalPackageSyncVerifier.js";

type PhaseStatus = "ready" | "needs-review" | "missing" | "out-of-sync";

export type MemoryPhaseStatusReport = {
  projectId: string;
  overall: {
    readyPhases: number;
    totalPhases: number;
    percent: number;
  };
  phases: Array<{
    phase: string;
    label: string;
    status: PhaseStatus;
    evidence: Record<string, number | boolean | string | null>;
  }>;
  counts: {
    chunks: number;
    entities: Record<string, number>;
    entityMentions: number;
    episodes: Record<string, number>;
    episodeEvidence: number;
    facts: Record<string, number>;
    factEvidence: number;
    chapterSummaries: number;
    narrativeSummaries: Record<string, number>;
    evalCases: number;
    evalEvidence: number;
  };
  remaining: {
    review: {
      suggestedEntities: number;
      suggestedFacts: number;
    };
  };
  packageSync: {
    projectPath: string | null;
    packageEntryPresent: boolean;
    inSync: boolean;
    totalDbRows: number;
    totalPackageRows: number;
  };
};

type StatusCountTable =
  | typeof memoryEntity
  | typeof memoryEpisode
  | typeof memoryFact
  | typeof memoryNarrativeSummary;

const countRows = async (
  table:
    | typeof memoryChunk
    | typeof memoryEntityMention
    | typeof memoryEpisodeEvidence
    | typeof memoryFactEvidence
    | typeof chapterSummary
    | typeof memoryEvalCase
    | typeof memoryEvalEvidence,
  projectId: string,
): Promise<number> => {
  const rows = await db
    .getClient()
    .select({ value: count() })
    .from(table)
    .where(eq(table.projectId, projectId));
  return rows[0]?.value ?? 0;
};

const countByStatus = async (
  table: StatusCountTable,
  projectId: string,
): Promise<Record<string, number>> => {
  const rows = await db
    .getClient()
    .select({ status: table.status, value: count() })
    .from(table)
    .where(eq(table.projectId, projectId))
    .groupBy(table.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.value]));
};

const sumStatusCounts = (countsByStatus: Record<string, number>): number =>
  Object.values(countsByStatus).reduce((total, value) => total + value, 0);

const getStatusCount = (
  countsByStatus: Record<string, number>,
  status: string,
): number => countsByStatus[status] ?? 0;

export async function getMemoryPhaseStatusReport(input: {
  projectId: string;
}): Promise<MemoryPhaseStatusReport> {
  const [
    chunks,
    entityMentions,
    episodeEvidence,
    factEvidence,
    chapterSummaries,
    evalCases,
    evalEvidence,
    entities,
    episodes,
    facts,
    narrativeSummaries,
    packageSync,
  ] = await Promise.all([
    countRows(memoryChunk, input.projectId),
    countRows(memoryEntityMention, input.projectId),
    countRows(memoryEpisodeEvidence, input.projectId),
    countRows(memoryFactEvidence, input.projectId),
    countRows(chapterSummary, input.projectId),
    countRows(memoryEvalCase, input.projectId),
    countRows(memoryEvalEvidence, input.projectId),
    countByStatus(memoryEntity, input.projectId),
    countByStatus(memoryEpisode, input.projectId),
    countByStatus(memoryFact, input.projectId),
    countByStatus(memoryNarrativeSummary, input.projectId),
    verifyMemoryCanonicalPackageSync({ projectId: input.projectId }),
  ]);

  const suggestedEntities = getStatusCount(entities, "suggested");
  const suggestedFacts = getStatusCount(facts, "suggested");
  const entityRows = sumStatusCounts(entities);
  const episodeRows = sumStatusCounts(episodes);
  const factRows = sumStatusCounts(facts);
  const narrativeSummaryRows = sumStatusCounts(narrativeSummaries);

  const phases: MemoryPhaseStatusReport["phases"] = [
    {
      phase: "phase1-eval",
      label: "Evaluation fixtures",
      status: evalCases > 0 && evalEvidence > 0 ? "ready" : "missing",
      evidence: { evalCases, evalEvidence },
    },
    {
      phase: "phase2-evidence",
      label: "Chunk evidence index",
      status: chunks > 0 ? "ready" : "missing",
      evidence: { chunks },
    },
    {
      phase: "phase3-identity",
      label: "Entity identity memory",
      status:
        entityRows === 0
          ? "missing"
          : suggestedEntities > 0
            ? "needs-review"
            : "ready",
      evidence: { entities: entityRows, entityMentions, suggestedEntities },
    },
    {
      phase: "phase4-episodes",
      label: "Episode memory",
      status: episodeRows > 0 && episodeEvidence > 0 ? "ready" : "missing",
      evidence: { episodes: episodeRows, episodeEvidence },
    },
    {
      phase: "phase5-temporal",
      label: "Temporal fact memory",
      status:
        factRows === 0
          ? "missing"
          : suggestedFacts > 0
            ? "needs-review"
            : "ready",
      evidence: { facts: factRows, factEvidence, suggestedFacts },
    },
    {
      phase: "phase6-query",
      label: "Narrative memory query",
      status:
        chunks === 0 && narrativeSummaryRows === 0 && factRows === 0
          ? "missing"
          : suggestedEntities > 0 || suggestedFacts > 0
            ? "needs-review"
            : "ready",
      evidence: {
        chunks,
        entities: entityRows,
        facts: factRows,
        narrativeSummaries: narrativeSummaryRows,
        suggestedEntities,
        suggestedFacts,
      },
    },
    {
      phase: "phase7-ui",
      label: "Evidence-backed UI integration",
      status:
        entityRows === 0 && factRows === 0
          ? "missing"
          : suggestedEntities > 0 || suggestedFacts > 0
            ? "needs-review"
            : "ready",
      evidence: {
        entities: entityRows,
        facts: factRows,
        suggestedEntities,
        suggestedFacts,
      },
    },
    {
      phase: "phase8-summary",
      label: "Narrative summaries",
      status:
        chapterSummaries > 0 && narrativeSummaryRows > 0 ? "ready" : "missing",
      evidence: { chapterSummaries, narrativeSummaries: narrativeSummaryRows },
    },
    {
      phase: "phase9-package-sync",
      label: ".luie canonical package sync",
      status:
        packageSync.packageEntryPresent && packageSync.inSync
          ? "ready"
          : packageSync.packageEntryPresent
            ? "out-of-sync"
            : "missing",
      evidence: {
        packageEntryPresent: packageSync.packageEntryPresent,
        inSync: packageSync.inSync,
        totalDbRows: packageSync.totalDbRows,
        totalPackageRows: packageSync.totalPackageRows,
      },
    },
  ];
  const readyPhases = phases.filter((phase) => phase.status === "ready").length;

  return {
    projectId: input.projectId,
    overall: {
      readyPhases,
      totalPhases: phases.length,
      percent: Math.round((readyPhases / phases.length) * 100),
    },
    phases,
    counts: {
      chunks,
      entities,
      entityMentions,
      episodes,
      episodeEvidence,
      facts,
      factEvidence,
      chapterSummaries,
      narrativeSummaries,
      evalCases,
      evalEvidence,
    },
    remaining: {
      review: {
        suggestedEntities,
        suggestedFacts,
      },
    },
    packageSync: {
      projectPath: packageSync.projectPath,
      packageEntryPresent: packageSync.packageEntryPresent,
      inSync: packageSync.inSync,
      totalDbRows: packageSync.totalDbRows,
      totalPackageRows: packageSync.totalPackageRows,
    },
  };
}

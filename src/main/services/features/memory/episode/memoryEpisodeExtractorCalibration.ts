import type {
  MemoryEpisodeExtractor,
  MemoryEpisodeExtractorCandidate,
} from "./memoryEpisodeExtractionProcessor.js";

export type MemoryEpisodeCalibrationCase = {
  id: string;
  name: string;
  input: Parameters<MemoryEpisodeExtractor>[0];
  expected: {
    episodeType: string;
    titleIncludes?: string;
    evidenceChunkIds: string[];
  };
};

export type MemoryEpisodeCalibrationFailure = {
  caseId: string;
  reason:
    | "EXPECTED_EPISODE_NOT_FOUND"
    | "EXPECTED_EVIDENCE_CHUNK_NOT_FOUND"
    | "EXTRACTOR_ERROR";
  detail?: string;
};

export type MemoryEpisodeCalibrationResult = {
  caseCount: number;
  passCount: number;
  failures: MemoryEpisodeCalibrationFailure[];
};

type RunMemoryEpisodeExtractorCalibrationInput = {
  extractor: MemoryEpisodeExtractor;
  cases: MemoryEpisodeCalibrationCase[];
};

export function createDefaultMemoryEpisodeCalibrationCases(
  projectId: string,
): MemoryEpisodeCalibrationCase[] {
  return [
    {
      id: "secret-letter",
      name: "secret letter extraction",
      input: {
        projectId,
        sourceType: "chapter",
        sourceId: "episode-calibration-chapter-1",
        sourceContentHash: "episode-calibration-source-hash-1",
        extractorVersion: "episode-v1",
        chunks: [
          {
            chunkId: "episode-calibration-chunk-1",
            chapterId: "episode-calibration-chapter-1",
            sceneId: null,
            content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
            contentHash: "episode-calibration-chunk-hash-1",
            sourceContentHash: "episode-calibration-source-hash-1",
            startOffset: 0,
            endOffset: 29,
          },
        ],
      },
      expected: {
        episodeType: "character_learns_secret",
        titleIncludes: "아린",
        evidenceChunkIds: ["episode-calibration-chunk-1"],
      },
    },
    {
      id: "relation-break",
      name: "relation change extraction",
      input: {
        projectId,
        sourceType: "chapter",
        sourceId: "episode-calibration-chapter-2",
        sourceContentHash: "episode-calibration-source-hash-2",
        extractorVersion: "episode-v1",
        chunks: [
          {
            chunkId: "episode-calibration-chunk-2",
            chapterId: "episode-calibration-chapter-2",
            sceneId: null,
            content: "진우는 성문 앞에서 아린과의 동맹을 끊겠다고 선언했다.",
            contentHash: "episode-calibration-chunk-hash-2",
            sourceContentHash: "episode-calibration-source-hash-2",
            startOffset: 0,
            endOffset: 32,
          },
        ],
      },
      expected: {
        episodeType: "relation_changes",
        titleIncludes: "동맹",
        evidenceChunkIds: ["episode-calibration-chunk-2"],
      },
    },
  ];
}

function candidateMatchesExpected(
  candidate: MemoryEpisodeExtractorCandidate,
  expected: MemoryEpisodeCalibrationCase["expected"],
): boolean {
  if (candidate.episodeType !== expected.episodeType) {
    return false;
  }
  if (
    expected.titleIncludes &&
    !candidate.title.includes(expected.titleIncludes)
  ) {
    return false;
  }
  return true;
}

function missingEvidenceChunkIds(
  candidate: MemoryEpisodeExtractorCandidate,
  expectedChunkIds: string[],
): string[] {
  const actualChunkIds = new Set(
    candidate.evidence.map((evidence) => evidence.chunkId),
  );
  return expectedChunkIds.filter((chunkId) => !actualChunkIds.has(chunkId));
}

export async function runMemoryEpisodeExtractorCalibration(
  input: RunMemoryEpisodeExtractorCalibrationInput,
): Promise<MemoryEpisodeCalibrationResult> {
  const failures: MemoryEpisodeCalibrationFailure[] = [];

  for (const calibrationCase of input.cases) {
    try {
      const candidates = await input.extractor(calibrationCase.input);
      const matchingCandidate = candidates.find((candidate) =>
        candidateMatchesExpected(candidate, calibrationCase.expected),
      );
      if (!matchingCandidate) {
        failures.push({
          caseId: calibrationCase.id,
          reason: "EXPECTED_EPISODE_NOT_FOUND",
          detail:
            candidates.length === 0
              ? "none"
              : candidates
                  .map(
                    (candidate) =>
                      `${candidate.episodeType}:${candidate.title}`,
                  )
                  .join(","),
        });
        continue;
      }

      const missingChunkIds = missingEvidenceChunkIds(
        matchingCandidate,
        calibrationCase.expected.evidenceChunkIds,
      );
      if (missingChunkIds.length > 0) {
        failures.push({
          caseId: calibrationCase.id,
          reason: "EXPECTED_EVIDENCE_CHUNK_NOT_FOUND",
          detail: missingChunkIds.join(","),
        });
      }
    } catch (error) {
      failures.push({
        caseId: calibrationCase.id,
        reason: "EXTRACTOR_ERROR",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    caseCount: input.cases.length,
    passCount: input.cases.length - failures.length,
    failures,
  };
}

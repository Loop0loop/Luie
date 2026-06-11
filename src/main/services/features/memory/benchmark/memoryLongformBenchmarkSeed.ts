export type MemoryBenchmarkHardwareMode = "low-end" | "standard" | "high-end";

export type MemoryLongformBenchmarkProfileName =
  | "ci-1000"
  | "manual-300ch"
  | "manual-500ch"
  | "manual-10000";

export type MemoryLongformBenchmarkProfile = {
  name: MemoryLongformBenchmarkProfileName;
  hardwareMode: MemoryBenchmarkHardwareMode;
  chapterCount: number;
  chunkCount: number;
  targetCharacterCount: number;
  description: string;
};

export type MemoryLongformBenchmarkManifest = {
  schemaVersion: 1;
  seed: number;
  profile: MemoryLongformBenchmarkProfile;
  summary: {
    chapterCount: number;
    chunkCount: number;
    totalCharacters: number;
    averageChunkCharacters: number;
  };
  bottlenecks: string[];
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    arc: string;
    targetChunkCount: number;
    focusCharacters: string[];
  }>;
  chunks: Array<{
    id: string;
    chapterId: string;
    chunkIndex: number;
    characterCount: number;
    aliases: string[];
    containsRewriteMarker: boolean;
    containsStateChange: boolean;
  }>;
  scenarios: {
    aliasRotations: Array<{
      chapterOrder: number;
      canonicalName: string;
      alias: string;
    }>;
    relationshipChanges: Array<{
      chapterOrder: number;
      source: string;
      target: string;
      state: string;
    }>;
    chapterReorder: {
      fromOrder: number;
      toOrder: number;
      affectedChapterOrders: number[];
    };
    editAfterIndex: {
      chapterOrders: number[];
      staleChunkIds: string[];
    };
    importExport: {
      packageRowEstimate: number;
      expectedTables: string[];
    };
    reviewBacklog: {
      staleEvidenceCount: number;
      suggestedMemoryCount: number;
    };
    rendererList: {
      visibleRows: number;
      totalRows: number;
    };
  };
};

export const MEMORY_LONGFORM_BENCHMARK_PROFILES: Record<
  MemoryLongformBenchmarkProfileName,
  MemoryLongformBenchmarkProfile
> = {
  "ci-1000": {
    name: "ci-1000",
    hardwareMode: "low-end",
    chapterCount: 100,
    chunkCount: 1000,
    targetCharacterCount: 1_000_000,
    description: "CI-safe 100 chapter / 1k chunk low-end profile",
  },
  "manual-300ch": {
    name: "manual-300ch",
    hardwareMode: "standard",
    chapterCount: 300,
    chunkCount: 6000,
    targetCharacterCount: 1_800_000,
    description: "Manual 300 chapter longform writer profile",
  },
  "manual-500ch": {
    name: "manual-500ch",
    hardwareMode: "high-end",
    chapterCount: 500,
    chunkCount: 10000,
    targetCharacterCount: 3_000_000,
    description: "Manual 500 chapter high-volume writer profile",
  },
  "manual-10000": {
    name: "manual-10000",
    hardwareMode: "high-end",
    chapterCount: 500,
    chunkCount: 10000,
    targetCharacterCount: 3_000_000,
    description: "Manual 10k chunk package/import/export profile",
  },
};

const CHARACTER_NAMES = [
  "아린",
  "도윤",
  "백야",
  "서하",
  "유건",
  "라온",
  "미르",
  "하린",
] as const;

const ALIASES = [
  "검은 기사",
  "백야회의 그림자",
  "북부의 아이",
  "새벽의 검",
  "잊힌 왕녀",
  "붉은 약속",
] as const;

function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function distribute(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

export function buildMemoryLongformBenchmarkSeed(input: {
  profileName: MemoryLongformBenchmarkProfileName;
  seed?: number;
}): MemoryLongformBenchmarkManifest {
  const profile = MEMORY_LONGFORM_BENCHMARK_PROFILES[input.profileName];
  const seed = input.seed ?? 20260611;
  const random = createPrng(seed);
  const chunkDistribution = distribute(profile.chunkCount, profile.chapterCount);
  const averageChunkCharacters = Math.floor(
    profile.targetCharacterCount / profile.chunkCount,
  );

  const chapters = chunkDistribution.map((targetChunkCount, index) => {
    const order = index + 1;
    return {
      id: `chapter-${String(order).padStart(4, "0")}`,
      order,
      title: `${order}화 - ${order % 25 === 0 ? "전환점" : "장편 시드"}`,
      arc: `arc-${Math.floor(index / 25) + 1}`,
      targetChunkCount,
      focusCharacters: [
        CHARACTER_NAMES[index % CHARACTER_NAMES.length],
        CHARACTER_NAMES[(index + 3) % CHARACTER_NAMES.length],
      ],
    };
  });

  const chunks: MemoryLongformBenchmarkManifest["chunks"] = [];
  for (const chapter of chapters) {
    for (let localIndex = 0; localIndex < chapter.targetChunkCount; localIndex += 1) {
      const globalIndex = chunks.length;
      chunks.push({
        id: `chunk-${String(globalIndex + 1).padStart(5, "0")}`,
        chapterId: chapter.id,
        chunkIndex: globalIndex,
        characterCount: averageChunkCharacters,
        aliases: [pick(ALIASES, random)],
        containsRewriteMarker: chapter.order % 37 === 0 && localIndex === 0,
        containsStateChange: chapter.order % 11 === 0 && localIndex === 1,
      });
    }
  }

  const aliasRotations = chapters
    .filter((chapter) => chapter.order % 10 === 0)
    .map((chapter, index) => ({
      chapterOrder: chapter.order,
      canonicalName: CHARACTER_NAMES[index % CHARACTER_NAMES.length],
      alias: ALIASES[index % ALIASES.length],
    }));

  const editChapterOrders = chapters
    .filter((chapter) => chapter.order % 37 === 0)
    .map((chapter) => chapter.order);

  const staleChunkIds = chunks
    .filter((chunk) => chunk.containsRewriteMarker)
    .map((chunk) => chunk.id);

  return {
    schemaVersion: 1,
    seed,
    profile,
    summary: {
      chapterCount: profile.chapterCount,
      chunkCount: profile.chunkCount,
      totalCharacters: profile.targetCharacterCount,
      averageChunkCharacters,
    },
    bottlenecks: [
      "alias-repeat",
      "chapter-reorder",
      "mid-series-rewrite",
      "stale-embedding",
      "summary-refresh",
      "review-backlog",
      "renderer-list",
    ],
    chapters,
    chunks,
    scenarios: {
      aliasRotations,
      relationshipChanges: chapters
        .filter((chapter) => chapter.order % 11 === 0)
        .map((chapter, index) => ({
          chapterOrder: chapter.order,
          source: CHARACTER_NAMES[index % CHARACTER_NAMES.length],
          target: CHARACTER_NAMES[(index + 1) % CHARACTER_NAMES.length],
          state: index % 2 === 0 ? "동맹" : "불신",
        })),
      chapterReorder: {
        fromOrder: Math.max(2, Math.floor(profile.chapterCount * 0.7)),
        toOrder: Math.max(1, Math.floor(profile.chapterCount * 0.35)),
        affectedChapterOrders: chapters
          .filter((chapter) => chapter.order % 50 === 0)
          .map((chapter) => chapter.order),
      },
      editAfterIndex: {
        chapterOrders: editChapterOrders,
        staleChunkIds,
      },
      importExport: {
        packageRowEstimate:
          profile.chunkCount +
          profile.chapterCount +
          aliasRotations.length +
          staleChunkIds.length,
        expectedTables: [
          "MemoryChunk",
          "MemoryEntity",
          "MemoryEntityAlias",
          "MemoryEpisode",
          "MemoryFact",
          "MemoryEvalCase",
        ],
      },
      reviewBacklog: {
        staleEvidenceCount: staleChunkIds.length,
        suggestedMemoryCount: aliasRotations.length,
      },
      rendererList: {
        visibleRows: 80,
        totalRows: profile.chunkCount + aliasRotations.length,
      },
    },
  };
}

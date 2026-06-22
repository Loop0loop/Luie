import { describe, expect, it } from "vitest";
import {
  getMemoryTablePersistenceClass,
  isMemoryRowExportable,
  isMemoryCanonicalExportableStatus,
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  MEMORY_PERSISTENCE_CLASSES,
  MEMORY_REGENERABLE_PROJECTION_TABLES,
} from "../../src/main/services/features/memory/persistence/memoryPersistencePolicy.js";

const KNOWN_MEMORY_TABLES = [
  "MemoryChunk",
  "MemoryBuildJob",
  "MemoryEmbedding",
  "ChapterSummary",
  "MemoryEvalCase",
  "MemoryEvalEvidence",
  "MemoryEvalEntity",
  "MemoryEvalRelation",
  "MemoryEvalRun",
  "MemoryEvalResult",
  "MemoryEntity",
  "MemoryEntityAlias",
  "MemoryEntityMention",
  "MemoryEpisodeExtractionJob",
  "MemoryEpisode",
  "MemoryEpisodeParticipant",
  "MemoryEpisodeEvidence",
  "MemoryStateChangeCandidate",
  "MemoryFact",
  "MemoryFactEvidence",
  "MemoryFactInvalidation",
  "MemoryRelationState",
  "MemoryCharacterState",
  "MemoryKnowledgeState",
  "MemoryNarrativeSummary",
  "MemoryNarrativeSummarySource",
  "SearchDirtyQueue",
] as const;

describe("memory persistence policy", () => {
  it("classifies user-reviewable memory as canonical exportable", () => {
    expect(getMemoryTablePersistenceClass("MemoryEntity")).toBe(
      MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE,
    );
    expect(getMemoryTablePersistenceClass("MemoryFact")).toBe(
      MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE,
    );
    expect(getMemoryTablePersistenceClass("MemoryFactEvidence")).toBe(
      MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE,
    );
    expect(getMemoryTablePersistenceClass("MemoryEvalCase")).toBe(
      MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE,
    );
  });

  it("classifies generated projections as regenerable", () => {
    expect(getMemoryTablePersistenceClass("MemoryChunk")).toBe(
      MEMORY_PERSISTENCE_CLASSES.REGENERABLE_PROJECTION,
    );
    expect(getMemoryTablePersistenceClass("MemoryEmbedding")).toBe(
      MEMORY_PERSISTENCE_CLASSES.REGENERABLE_PROJECTION,
    );
    expect(getMemoryTablePersistenceClass("MemoryNarrativeSummary")).toBe(
      MEMORY_PERSISTENCE_CLASSES.REGENERABLE_PROJECTION,
    );
  });

  it("only exports reviewed canonical statuses by default", () => {
    expect(isMemoryCanonicalExportableStatus("confirmed")).toBe(true);
    expect(isMemoryCanonicalExportableStatus("rejected")).toBe(true);
    expect(isMemoryCanonicalExportableStatus("deprecated")).toBe(true);
    expect(isMemoryCanonicalExportableStatus("conflicting")).toBe(false);
    expect(isMemoryCanonicalExportableStatus("suggested")).toBe(false);
  });

  it("combines table class and row status for export eligibility", () => {
    expect(isMemoryRowExportable({ tableName: "MemoryFact", status: "confirmed" })).toBe(true);
    expect(isMemoryRowExportable({ tableName: "MemoryFact", status: "suggested" })).toBe(false);
    expect(isMemoryRowExportable({ tableName: "MemoryFact", status: "conflicting" })).toBe(false);
    expect(isMemoryRowExportable({ tableName: "MemoryFact" })).toBe(false);
    expect(isMemoryRowExportable({ tableName: "MemoryEntityAlias" })).toBe(false);
    expect(isMemoryRowExportable({ tableName: "MemoryFactEvidence" })).toBe(true);
    expect(isMemoryRowExportable({ tableName: "MemoryEpisodeEvidence" })).toBe(true);
    expect(isMemoryRowExportable({ tableName: "MemoryFactInvalidation" })).toBe(true);
    expect(isMemoryRowExportable({ tableName: "MemoryEpisode", status: "suggested" })).toBe(true);
    expect(isMemoryRowExportable({ tableName: "MemoryChunk", status: "confirmed" })).toBe(false);
  });

  it("classifies every known memory table exactly once", () => {
    const canonical = new Set(MEMORY_CANONICAL_EXPORTABLE_TABLES);
    const regenerable = new Set(MEMORY_REGENERABLE_PROJECTION_TABLES);

    for (const tableName of KNOWN_MEMORY_TABLES) {
      expect(
        getMemoryTablePersistenceClass(tableName),
        `${tableName} must have a memory persistence class`,
      ).not.toBeNull();
      expect(
        canonical.has(tableName) && regenerable.has(tableName),
        `${tableName} must not be both canonical and regenerable`,
      ).toBe(false);
    }
  });
});

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  chapter,
  db,
  memoryEntity,
  memoryFact,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { fetchTemporalFacts } from "../../../../../src/main/services/features/memory/query/internal/temporal.js";

describe("narrative memory temporal scope", () => {
  it("excludes future facts when answering from a selected basis chapter", async () => {
    const projectId = crypto.randomUUID();
    const chapter12Id = crypto.randomUUID();
    const chapter18Id = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const currentFactId = crypto.randomUUID();
    const futureFactId = crypto.randomUUID();
    const nowIso = "2026-06-11T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Temporal Scope",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values([
      {
        id: chapter12Id,
        projectId,
        title: "12화",
        content: "",
        order: 12,
        updatedAt: nowIso,
      },
      {
        id: chapter18Id,
        projectId,
        title: "18화",
        content: "",
        order: 18,
        updatedAt: nowIso,
      },
    ]);
    await db.getClient().insert(memoryEntity).values({
      id: entityId,
      projectId,
      entityType: "character",
      canonicalName: "유란",
      status: "confirmed",
      confidence: 100,
      createdBy: "system",
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryFact).values([
      {
        id: currentFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "knows_secret",
        objectEntityId: null,
        objectValue: "모른다",
        valueType: "text",
        validFromChapterId: chapter12Id,
        validFromChapterOrder: 12,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapter12Id,
        observedAtChapterOrder: 12,
        confidence: 90,
        status: "confirmed",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "chapter-12-hash",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
      {
        id: futureFactId,
        projectId,
        subjectEntityId: entityId,
        predicate: "knows_secret",
        objectEntityId: null,
        objectValue: "안다",
        valueType: "text",
        validFromChapterId: chapter18Id,
        validFromChapterOrder: 18,
        validToChapterId: null,
        validToChapterOrder: null,
        observedAtChapterId: chapter18Id,
        observedAtChapterOrder: 18,
        confidence: 95,
        status: "confirmed",
        provenanceKind: "canon",
        canonStatus: "canon",
        extractorVersion: "fact-v1",
        sourceContentHash: "chapter-18-hash",
        invalidatedByFactId: null,
        updatedAt: nowIso,
      },
    ]);

    const facts = await fetchTemporalFacts({
      projectId,
      intent: "entity-state-at-chapter",
      sources: ["memory_fact"],
      chapterOrder: 12,
      includePriorMemory: true,
      resolvedEntityIds: [entityId],
    });

    expect(facts.map((fact) => fact.id)).toEqual([currentFactId]);
    expect(facts.map((fact) => fact.id)).not.toContain(futureFactId);
  });
});

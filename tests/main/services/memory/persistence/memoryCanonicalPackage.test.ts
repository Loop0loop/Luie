import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  chapter,
  db,
  memoryEntity,
  memoryEntityAlias,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { LuieMemoryCanonicalSchema } from "../../../../../src/main/services/core/project/projectLuieSchemas.js";
import {
  applyMemoryCanonicalPackagePayload,
  buildMemoryCanonicalPackagePayload,
} from "../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackage.js";
import { compareMemoryCanonicalPackagePayloads } from "../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js";

const createTx = () => {
  const inserted: unknown[] = [];
  return {
    inserted,
    tx: {
      insert: vi.fn(() => ({
        values: vi.fn((rows: unknown) => {
          inserted.push(rows);
          return {
            run: vi.fn(() => undefined),
          };
        }),
      })),
    },
  };
};

describe("LuieMemoryCanonicalSchema compatibility", () => {
  it("accepts legacy canonical memory payloads without schemaVersion", () => {
    const parsed = LuieMemoryCanonicalSchema.parse({
      exportedAt: "2026-06-11T00:00:00.000Z",
      tables: {},
    });

    expect(parsed.schemaVersion).toBeUndefined();
    expect(parsed.tables).toEqual({});
  });

  it("rejects unsupported future canonical memory schema versions", () => {
    const result = LuieMemoryCanonicalSchema.safeParse({
      schemaVersion: 999,
      exportedAt: "2026-06-11T00:00:00.000Z",
      tables: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("applyMemoryCanonicalPackagePayload", () => {
  it("exports confirmed entity and fact rows with evidence anchors while excluding suggested candidates", async () => {
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const confirmedEntityId = crypto.randomUUID();
    const suggestedEntityId = crypto.randomUUID();
    const aliasId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const confirmedFactId = crypto.randomUUID();
    const suggestedFactId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Canonical Export",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "1화",
      content: "아린은 백야회에 들어갔다.",
      order: 1,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEntity)
      .values([
        {
          id: confirmedEntityId,
          projectId,
          entityType: "character",
          canonicalName: "아린",
          status: "confirmed",
          confidence: 90,
          createdBy: "user",
          updatedAt: nowIso,
        },
        {
          id: suggestedEntityId,
          projectId,
          entityType: "character",
          canonicalName: "검은 기사",
          status: "suggested",
          confidence: 70,
          createdBy: "system",
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryEntityAlias).values({
      id: aliasId,
      projectId,
      entityId: confirmedEntityId,
      entityType: "character",
      alias: "주인공",
      normalizedAlias: "주인공",
      status: "confirmed",
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
      title: "아린의 가입",
      summary: "아린이 백야회에 들어간다.",
      status: "suggested",
      confidence: 80,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: evidenceId,
      projectId,
      episodeId,
      chapterId,
      chunkId: null,
      contentHash: "content-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 12,
      quote: "아린은 백야회에 들어갔다.",
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryFact)
      .values([
        {
          id: confirmedFactId,
          projectId,
          subjectEntityId: confirmedEntityId,
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
          confidence: 90,
          status: "confirmed",
          extractorVersion: "fact-v1",
          sourceContentHash: "source-hash",
          invalidatedByFactId: null,
          updatedAt: nowIso,
        },
        {
          id: suggestedFactId,
          projectId,
          subjectEntityId: confirmedEntityId,
          predicate: "rank",
          objectEntityId: null,
          objectValue: "간부",
          valueType: "string",
          validFromChapterId: chapterId,
          validFromChapterOrder: 1,
          validToChapterId: null,
          validToChapterOrder: null,
          observedAtChapterId: chapterId,
          observedAtChapterOrder: 1,
          confidence: 60,
          status: "suggested",
          extractorVersion: "fact-v1",
          sourceContentHash: "source-hash",
          invalidatedByFactId: null,
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryFactEvidence).values({
      id: crypto.randomUUID(),
      projectId,
      factId: confirmedFactId,
      evidenceId,
      updatedAt: nowIso,
    });

    const payload = await buildMemoryCanonicalPackagePayload(projectId);

    expect(payload.tables.MemoryEntity).toEqual([
      expect.objectContaining({
        id: confirmedEntityId,
        status: "confirmed",
      }),
    ]);
    expect(payload.tables.MemoryEntityAlias).toEqual([
      expect.objectContaining({
        id: aliasId,
        status: "confirmed",
      }),
    ]);
    expect(payload.tables.MemoryEpisode).toEqual([
      expect.objectContaining({ id: episodeId }),
    ]);
    expect(payload.tables.MemoryEpisodeEvidence).toEqual([
      expect.objectContaining({ id: evidenceId, episodeId }),
    ]);
    expect(payload.tables.MemoryFact).toEqual([
      expect.objectContaining({
        id: confirmedFactId,
        status: "confirmed",
      }),
    ]);
    expect(payload.tables.MemoryFactEvidence).toHaveLength(1);
    expect(payload.tables.MemoryFact?.map((row) => row.id)).not.toContain(
      suggestedFactId,
    );
    expect(payload.tables.MemoryEntity?.map((row) => row.id)).not.toContain(
      suggestedEntityId,
    );
  });

  it("re-scopes imported canonical memory rows to the resolved project", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "resolved-project",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "package-project",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [
        expect.objectContaining({
          id: "resolved-project:MemoryEntity:entity-1",
          projectId: "resolved-project",
          status: "confirmed",
        }),
      ],
    ]);
  });

  it("drops fact rows that point outside imported entity or chapter scope", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-valid",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-bad-entity",
              projectId: "project-1",
              subjectEntityId: "missing-entity",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-bad-chapter",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-2",
              validFromChapterOrder: 2,
              observedAtChapterId: "chapter-2",
              observedAtChapterOrder: 2,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-valid",
          subjectEntityId: "project-1:MemoryEntity:entity-1",
        }),
      ],
    ]);
  });

  it("nulls invalidatedByFactId when the invalidating fact is not imported", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              invalidatedByFactId: "missing-fact",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-1",
          invalidatedByFactId: null,
        }),
      ],
    ]);
  });

  it("nulls invalidatedByFactId when the invalidating fact is filtered out", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-kept",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              invalidatedByFactId: "fact-filtered",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-filtered",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "dead",
              valueType: "string",
              validFromChapterId: "chapter-2",
              validFromChapterOrder: 2,
              observedAtChapterId: "chapter-2",
              observedAtChapterOrder: 2,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T02:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-kept",
          invalidatedByFactId: null,
        }),
      ],
    ]);
  });

  it("imports fact evidence only when both fact and episode evidence are kept", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryEpisode: [
            {
              id: "episode-1",
              projectId: "project-1",
              sourceType: "analysis",
              sourceId: "source-episode-1",
              sourceContentHash: "source-content-hash",
              extractorVersion: "rule",
              episodeType: "event",
              title: "Alice enters",
              summary: "Alice starts chapter 1.",
              status: "suggested",
              confidence: 0.8,
              createdAt: "2026-03-10T09:00:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryEpisodeEvidence: [
            {
              id: "evidence-1",
              projectId: "project-1",
              episodeId: "episode-1",
              contentHash: "content-hash",
              sourceContentHash: "source-content-hash",
              quote: "Alice entered the hall.",
              chunkId: "chunk-1",
              chapterId: "chapter-1",
              createdAt: "2026-03-10T09:10:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "presence",
              objectValue: "hall",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "source-content-hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFactEvidence: [
            {
              id: "fact-evidence-1",
              projectId: "project-1",
              factId: "fact-1",
              evidenceId: "evidence-1",
              createdAt: "2026-03-11T01:00:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    const episodeId = "project-1:MemoryEpisode:episode-1";
    const evidenceId = "project-1:MemoryEpisodeEvidence:evidence-1";

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [expect.objectContaining({ id: episodeId, status: "suggested" })],
      [expect.objectContaining({ id: evidenceId, episodeId })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-1",
          subjectEntityId: "project-1:MemoryEntity:entity-1",
        }),
      ],
      [
        expect.objectContaining({
          id: "project-1:MemoryFactEvidence:fact-evidence-1",
          factId: "project-1:MemoryFact:fact-1",
          evidenceId,
        }),
      ],
    ]);
  });

  it("drops fact evidence when the linked episode evidence is filtered out", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryEpisode: [
            {
              id: "episode-1",
              projectId: "project-1",
              sourceType: "analysis",
              sourceId: "source-episode-1",
              sourceContentHash: "source-content-hash",
              extractorVersion: "rule",
              episodeType: "event",
              title: "Alice enters",
              summary: "Alice starts chapter 1.",
              status: "suggested",
              confidence: 0.8,
              chapterId: "chapter-1",
              createdAt: "2026-03-10T09:00:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryEpisodeEvidence: [
            {
              id: "evidence-1",
              projectId: "project-1",
              episodeId: "episode-1",
              contentHash: "content-hash",
              sourceContentHash: "source-content-hash",
              quote: "Alice entered the hall.",
              chunkId: "chunk-1",
              chapterId: "chapter-2",
              createdAt: "2026-03-10T09:10:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "presence",
              objectValue: "hall",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "source-content-hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFactEvidence: [
            {
              id: "fact-evidence-1",
              projectId: "project-1",
              factId: "fact-1",
              evidenceId: "evidence-1",
              createdAt: "2026-03-11T01:00:00.000Z",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryEpisode:episode-1",
          status: "suggested",
          projectId: "project-1",
        }),
      ],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-1",
          subjectEntityId: "project-1:MemoryEntity:entity-1",
        }),
      ],
    ]);
  });

  it("keeps canonical source ids aligned after import and rebuild", async () => {
    const targetProjectId = crypto.randomUUID();
    const nowIso = "2026-06-12T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: targetProjectId,
      title: "Canonical Roundtrip Target",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: "chapter-1",
      projectId: targetProjectId,
      title: "1화",
      content: "Alice entered the hall.",
      order: 1,
      updatedAt: nowIso,
    });

    const packagePayload = {
      schemaVersion: 1 as const,
      exportedAt: "2026-06-11T00:00:00.000Z",
      tables: {
        MemoryEntity: [
          {
            id: "entity-1",
            projectId: "source-project",
            entityType: "character",
            canonicalName: "Alice",
            status: "confirmed",
            updatedAt: "2026-06-11T01:00:00.000Z",
          },
        ],
        MemoryEpisode: [
          {
            id: "episode-1",
            projectId: "source-project",
            sourceType: "analysis",
            sourceId: "source-episode-1",
            sourceContentHash: "source-content-hash",
            extractorVersion: "rule",
            episodeType: "event",
            title: "Alice enters",
            summary: "Alice starts chapter 1.",
            status: "suggested",
            confidence: 0.8,
            chapterId: "chapter-1",
            updatedAt: "2026-06-11T01:00:00.000Z",
          },
        ],
        MemoryEpisodeEvidence: [
          {
            id: "evidence-1",
            projectId: "source-project",
            episodeId: "episode-1",
            chapterId: "chapter-1",
            contentHash: "content-hash",
            sourceContentHash: "source-content-hash",
            quote: "Alice entered the hall.",
            updatedAt: "2026-06-11T01:00:00.000Z",
          },
        ],
        MemoryFact: [
          {
            id: "fact-1",
            projectId: "source-project",
            subjectEntityId: "entity-1",
            predicate: "presence",
            objectValue: "hall",
            valueType: "string",
            validFromChapterId: "chapter-1",
            validFromChapterOrder: 1,
            observedAtChapterId: "chapter-1",
            observedAtChapterOrder: 1,
            status: "confirmed",
            extractorVersion: "manual",
            sourceContentHash: "source-content-hash",
            updatedAt: "2026-06-11T01:00:00.000Z",
          },
        ],
        MemoryFactEvidence: [
          {
            id: "fact-evidence-1",
            projectId: "source-project",
            factId: "fact-1",
            evidenceId: "evidence-1",
            updatedAt: "2026-06-11T01:00:00.000Z",
          },
        ],
      },
    };

    db.getClient().transaction((tx) => {
      applyMemoryCanonicalPackagePayload(tx, {
        projectId: targetProjectId,
        importedAt: new Date(nowIso),
        validChapterIds: new Set(["chapter-1"]),
        payload: packagePayload,
      });
    });

    const rebuiltPayload =
      await buildMemoryCanonicalPackagePayload(targetProjectId);
    const comparison = compareMemoryCanonicalPackagePayloads({
      projectId: targetProjectId,
      dbPayload: rebuiltPayload,
      packagePayload,
    });

    expect(comparison.inSync).toBe(true);
    expect(comparison.tables.MemoryFact.sourceIdMismatches).toEqual([]);
    expect(comparison.tables.MemoryFactEvidence.sourceIdMismatches).toEqual([]);
  });
});

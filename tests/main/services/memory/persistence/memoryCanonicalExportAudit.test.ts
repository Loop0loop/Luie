import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  chapter,
  db,
  memoryEntity,
  memoryFact,
  project,
  projectAttachment,
} from "../../../../../src/main/infra/database/index.js";
import { getMemoryCanonicalExportAudit } from "../../../../../src/main/services/features/memory/persistence/memoryCanonicalExportAudit.js";

describe("getMemoryCanonicalExportAudit", () => {
  it("separates runtime suggested memory from canonical .luie exportable memory", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";
    const entityId = crypto.randomUUID();

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Export Audit",
      description: null,
      projectPath: "/tmp/legacy-export-audit.luie",
      updatedAt: nowIso,
    });
    await db.getClient().insert(projectAttachment).values({
      projectId,
      projectPath: "/tmp/export-audit.luie",
      updatedAt: nowIso,
    });
    await db.getClient().insert(chapter).values({
      id: "chapter-1",
      projectId,
      title: "1화",
      content: "비밀",
      order: 1,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryEntity)
      .values([
        {
          id: entityId,
          projectId,
          entityType: "character",
          canonicalName: "아린",
          status: "suggested",
          confidence: 90,
          createdBy: "system",
          updatedAt: nowIso,
        },
        {
          id: crypto.randomUUID(),
          projectId,
          entityType: "character",
          canonicalName: "백야회",
          status: "confirmed",
          confidence: 80,
          createdBy: "user",
          updatedAt: nowIso,
        },
      ]);
    await db.getClient().insert(memoryFact).values({
      id: crypto.randomUUID(),
      projectId,
      subjectEntityId: entityId,
      predicate: "knows_secret",
      objectEntityId: null,
      objectValue: "비밀",
      valueType: "string",
      validFromChapterId: "chapter-1",
      validFromChapterOrder: 1,
      validToChapterId: null,
      validToChapterOrder: null,
      observedAtChapterId: "chapter-1",
      observedAtChapterOrder: 1,
      confidence: 100,
      status: "suggested",
      extractorVersion: "temporal-v1",
      sourceContentHash: "source-hash",
      invalidatedByFactId: null,
      updatedAt: nowIso,
    });

    const audit = await getMemoryCanonicalExportAudit({ projectId });

    expect(audit.projectPath).toBe("/tmp/export-audit.luie");
    expect(audit.totalRuntimeRows).toBe(3);
    expect(audit.totalExportableRows).toBe(1);
    expect(audit.totalNonExportableRows).toBe(2);
    expect(audit.totalPayloadRows).toBe(1);
    expect(audit.tables.MemoryEntity).toMatchObject({
      runtimeRows: 2,
      exportableRows: 1,
      nonExportableRows: 1,
      byStatus: { suggested: 1, confirmed: 1 },
      payloadRows: 1,
    });
    expect(audit.tables.MemoryFact).toMatchObject({
      runtimeRows: 1,
      exportableRows: 0,
      nonExportableRows: 1,
      byStatus: { suggested: 1 },
      payloadRows: 0,
    });
  });
});

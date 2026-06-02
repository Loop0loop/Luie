import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import type { MainDrizzleClient } from "../../database/databaseTypes.js";
import { chapterBody } from "../../database/schema.js";
import { ENTITY_RELATION_WORLD_TYPES } from "../../database/entityRelationPointerSql.js";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function getMigrationHealth(input: {
  client: MainDrizzleClient;
  vectorSearchEnabled: boolean;
}): Promise<{
  chapterCount: number;
  chapterBodyCount: number;
  missingBodyCount: number;
  hashMismatchCount: number;
  hashMismatchSampled: boolean;
  vectorSearchEnabled: boolean;
  invalidEmbeddingCount: number;
  relationPointerMismatchCount: number;
}> {
  const chapterCountRows = await input.client.all<{ count: number }>(
    sql`SELECT COUNT(*) as count FROM "Chapter";`,
  );
  const chapterBodyCountRows = await input.client.all<{ count: number }>(
    sql`SELECT COUNT(*) as count FROM "ChapterBody";`,
  );
  const missingBodyCountRows = await input.client.all<{ count: number }>(sql`
    SELECT COUNT(*) as count
    FROM "Chapter" c
    LEFT JOIN "ChapterBody" b ON b."chapterId" = c."id"
    WHERE b."chapterId" IS NULL;
  `);
  const HASH_SAMPLE_SIZE = 50;
  const sample = await input.client
    .select({
      chapterId: chapterBody.chapterId,
      content: chapterBody.content,
      contentHash: chapterBody.contentHash,
    })
    .from(chapterBody)
    .orderBy(sql`RANDOM()`)
    .limit(HASH_SAMPLE_SIZE);

  let hashMismatchCount = 0;
  for (const row of sample) {
    const canonicalHash = hash(String(row.content ?? ""));
    if (row.contentHash !== canonicalHash) {
      hashMismatchCount += 1;
    }
  }

  const chapterBodyTotal = Number(chapterBodyCountRows[0]?.count ?? 0);
  const hashMismatchSampled = chapterBodyTotal > HASH_SAMPLE_SIZE;
  const invalidEmbeddingRows = await input.client.all<{ count: number }>(sql`
    SELECT COUNT(*) as count
    FROM "MemoryEmbedding"
    WHERE "dimension" <= 0
       OR length("vec") <= 0
       OR ("dimension" > 0 AND length("vec") % "dimension" != 0);
  `);
  const relationPointerMismatchRows = await input.client.all<{ count: number }>(sql`
    SELECT COUNT(*) as count
    FROM "EntityRelation" r
    WHERE (
      (r."sourceType" IN (${sql.join(ENTITY_RELATION_WORLD_TYPES.map((type) => sql`${type}`), sql`,`)})
        AND COALESCE(r."sourceWorldEntityId", '') != r."sourceId")
      OR
      (r."sourceType" NOT IN (${sql.join(ENTITY_RELATION_WORLD_TYPES.map((type) => sql`${type}`), sql`,`)})
        AND r."sourceWorldEntityId" IS NOT NULL)
      OR
      (r."targetType" IN (${sql.join(ENTITY_RELATION_WORLD_TYPES.map((type) => sql`${type}`), sql`,`)})
        AND COALESCE(r."targetWorldEntityId", '') != r."targetId")
      OR
      (r."targetType" NOT IN (${sql.join(ENTITY_RELATION_WORLD_TYPES.map((type) => sql`${type}`), sql`,`)})
        AND r."targetWorldEntityId" IS NOT NULL)
    );
  `);

  return {
    chapterCount: Number(chapterCountRows[0]?.count ?? 0),
    chapterBodyCount: chapterBodyTotal,
    missingBodyCount: Number(missingBodyCountRows[0]?.count ?? 0),
    hashMismatchCount,
    hashMismatchSampled,
    vectorSearchEnabled: input.vectorSearchEnabled,
    invalidEmbeddingCount: Number(invalidEmbeddingRows[0]?.count ?? 0),
    relationPointerMismatchCount: Number(
      relationPointerMismatchRows[0]?.count ?? 0,
    ),
  };
}

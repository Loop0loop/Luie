import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("vector search stale embedding guard", () => {
  it("joins current chunks and skips embeddings whose content hash is stale", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/main/services/features/search/chunkSearch.ts",
      ),
      "utf8",
    );

    expect(source).toContain('FROM "MemoryEmbedding" embedding');
    expect(source).toContain('JOIN "MemoryChunk" chunk');
    expect(source).toContain('embedding."chunkId" = chunk."id"');
    expect(source).toContain('embedding."contentHash" = COALESCE(NULLIF(chunk."indexTextHash", \'\'), chunk."contentHash")');
  });
});

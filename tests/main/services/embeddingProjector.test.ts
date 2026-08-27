import { describe, expect, it, vi } from "vitest";
import { MEMORY_TARGET_TYPES } from "../../../src/main/services/features/memory/memoryJobConstants.js";

const embedMock = vi.hoisted(() => vi.fn());
const resolveRuntimeModelConfigMock = vi.hoisted(() => vi.fn());
const dbState = vi.hoisted(() => ({
  updateCalls: 0,
  selectCalls: 0,
  insertedValues: [] as Array<Record<string, unknown>>,
  updateValues: [] as Array<Record<string, unknown>>,
  completedStatus: null as string | null,
  noChunks: false,
}));

vi.mock(
  "../../../src/main/services/features/utility/utilityProcessBridge.js",
  () => ({
    utilityProcessBridge: {
      embed: embedMock,
    },
  }),
);

vi.mock("../../../src/main/services/features/llm/modelRuntimeFactory.js", () => ({
  resolveRuntimeModelConfig: resolveRuntimeModelConfigMock,
}));

vi.mock("../../../src/main/services/features/memory/jobControl.js", () => ({
  claimMemoryBuildJob: async () => ({ claimed: true }),
  finalizeMemoryBuildJobCancellation: async () => ({ canceled: true }),
  isMemoryBuildJobCancellationRequested: async () => false,
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      update: () => {
        dbState.updateCalls += 1;
        return {
          set: (values: { status?: string; error?: string }) => {
            dbState.updateValues.push(values);
            if (values.status === "completed") {
              dbState.completedStatus = values.status;
            }
            return {
              where: () => {
                return Promise.resolve([]);
              },
            };
          },
        };
      },
      select: () => {
        dbState.selectCalls += 1;
        const selectCall = dbState.selectCalls;
        return {
          from: () => ({
            where: () => {
              if (selectCall === 1) {
                return {
                  orderBy: () => ({
                    limit: async () => [
                      {
                        id: "job-character",
                        projectId: "project-1",
                        targetType: MEMORY_TARGET_TYPES.CHARACTER,
                        targetId: "character-1",
                        jobType: "rebuild_embedding",
                        status: "pending",
                        priority: 100,
                        attempts: 0,
                        error: null,
                        createdAt: "2026-05-26T00:00:00.000Z",
                        updatedAt: "2026-05-26T00:00:00.000Z",
                      },
                    ],
                  }),
                };
              }
              if (selectCall === 2) {
                return {
                  orderBy: async () =>
                    dbState.noChunks
                      ? []
                      : [
                          {
                            chunkId: "chunk-character",
                            projectId: "project-1",
                            chapterId: null,
                            content: "세린은 고대 도서관의 봉인을 기억하는 인물이다.",
                            contentHash: "hash-character-1",
                          },
                        ],
                };
              }
              if (selectCall === 4 || selectCall === 5) {
                return { limit: async () => [] };
              }
              return Promise.resolve([]);
            },
          }),
        };
      },
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          dbState.insertedValues.push(values);
          return {
            onConflictDoUpdate: async () => undefined,
          };
        },
      }),
    }),
  },
}));

describe("EmbeddingProjector", () => {
  it("processes embedding jobs for non-chapter memory chunks", async () => {
    embedMock.mockReset();
    resolveRuntimeModelConfigMock.mockReset();
    dbState.updateCalls = 0;
    dbState.selectCalls = 0;
    dbState.insertedValues = [];
    dbState.updateValues = [];
    dbState.completedStatus = null;
    dbState.noChunks = false;
    embedMock.mockResolvedValue([[0.1, 0.2, 0.3]]);
    resolveRuntimeModelConfigMock.mockResolvedValue({
      providerHint: "externalapi",
      embeddingModel: "nomic-embed-text",
    });

    const { embeddingProjector } =
      await import("../../../src/main/services/features/memory/embeddingProjector.js");

    const result = await embeddingProjector.processPendingEmbeddingJobs({
      projectId: "project-1",
      limit: 1,
    });

    expect(result).toEqual({ queued: 1, processed: 1 });
    expect(embedMock).toHaveBeenCalledWith("project-1", [
      "세린은 고대 도서관의 봉인을 기억하는 인물이다.",
    ]);
    expect(dbState.insertedValues).toHaveLength(1);
    expect(dbState.insertedValues[0]).toMatchObject({
      chunkId: "chunk-character",
      projectId: "project-1",
      contentHash: "hash-character-1",
      dimension: 3,
      model: "externalapi:nomic-embed-text",
    });
    expect(dbState.completedStatus).toBe("completed");
  });

  it("skips an embedding job with no chunks so the worker does not retry it", async () => {
    embedMock.mockReset();
    resolveRuntimeModelConfigMock.mockReset();
    dbState.updateCalls = 0;
    dbState.selectCalls = 0;
    dbState.insertedValues = [];
    dbState.updateValues = [];
    dbState.completedStatus = null;
    dbState.noChunks = true;
    resolveRuntimeModelConfigMock.mockResolvedValue({
      providerHint: "externalapi",
      embeddingModel: "nomic-embed-text",
    });

    const { embeddingProjector } =
      await import("../../../src/main/services/features/memory/embeddingProjector.js");

    const result = await embeddingProjector.processPendingEmbeddingJobs({
      projectId: "project-1",
      limit: 1,
    });

    expect(result).toEqual({ queued: 1, processed: 0 });
    expect(embedMock).not.toHaveBeenCalled();
    expect(dbState.updateValues).toContainEqual(
      expect.objectContaining({
        status: "skipped",
        error: "NO_MEMORY_CHUNKS",
      }),
    );
  });
});

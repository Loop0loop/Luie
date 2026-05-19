import { describe, expect, it, vi, beforeEach } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  return {
    assembleRagContext: vi.fn(),
    resolveModelRuntimeClient: vi.fn(),
  };
});

vi.mock("../../../src/main/services/features/rag/contextAssembler.js", () => ({
  assembleRagContext: mocked.assembleRagContext,
}));

vi.mock("../../../src/main/services/llm/modelRuntimeFactory.js", () => ({
  resolveModelRuntimeClient: mocked.resolveModelRuntimeClient,
}));

import { ragQaService } from "../../../src/main/services/features/rag/ragQaService.js";

function createWindowMock() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
  } as unknown as Parameters<typeof ragQaService.ask>[1];
}

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("ragQaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("스트림 델타와 완료 결과를 전송한다", async () => {
    mocked.assembleRagContext.mockResolvedValue({
      assembledPrompt: "prompt",
      evidence: [{ chunkId: "c1", chapterId: "ch1", offset: 12, quote: "근거" }],
    });

    mocked.resolveModelRuntimeClient.mockResolvedValue({
      generateStream: async function* () {
        yield "답";
        yield "변";
      },
    });

    const windowMock = createWindowMock();
    const handle = await ragQaService.ask(
      { projectId: "p1", question: "질문" },
      windowMock,
    );

    await waitFor(() => {
      const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
      return send.mock.calls.some(
        (call) => call[0] === IPC_CHANNELS.RAG_QA_STREAM && call[1]?.done === true,
      );
    });

    const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
    const streamCalls = send.mock.calls.filter((call) => call[0] === IPC_CHANNELS.RAG_QA_STREAM);
    expect(streamCalls.length).toBeGreaterThanOrEqual(3);
    expect(streamCalls[0][1]).toMatchObject({ runId: handle.runId, delta: "답", done: false });
    expect(streamCalls[1][1]).toMatchObject({ runId: handle.runId, delta: "변", done: false });
    expect(streamCalls.at(-1)?.[1]).toMatchObject({
      runId: handle.runId,
      done: true,
      result: {
        projectId: "p1",
        question: "질문",
        answer: "답변",
      },
    });
  });

  it("실패 시 에러 이벤트를 전송한다", async () => {
    mocked.assembleRagContext.mockResolvedValue({
      assembledPrompt: "prompt",
      evidence: [],
    });
    mocked.resolveModelRuntimeClient.mockRejectedValue(new Error("runtime failed"));

    const windowMock = createWindowMock();
    await ragQaService.ask({ projectId: "p1", question: "질문" }, windowMock);

    await waitFor(() => {
      const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
      return send.mock.calls.some((call) => call[0] === IPC_CHANNELS.RAG_QA_ERROR);
    });

    const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
    const errorCall = send.mock.calls.find((call) => call[0] === IPC_CHANNELS.RAG_QA_ERROR);
    expect(errorCall?.[1]).toMatchObject({
      code: expect.any(String),
      message: "runtime failed",
    });
  });

  it("stop 호출 시 진행 중 스트림을 중단한다", async () => {
    mocked.assembleRagContext.mockResolvedValue({
      assembledPrompt: "prompt",
      evidence: [],
    });

    mocked.resolveModelRuntimeClient.mockResolvedValue({
      generateStream: async function* () {
        yield "첫";
        await new Promise((resolve) => setTimeout(resolve, 30));
        yield "째";
      },
    });

    const windowMock = createWindowMock();
    const handle = await ragQaService.ask(
      { projectId: "p1", question: "중단 테스트" },
      windowMock,
    );

    await waitFor(() => {
      const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
      return send.mock.calls.some(
        (call) =>
          call[0] === IPC_CHANNELS.RAG_QA_STREAM &&
          call[1]?.runId === handle.runId &&
          call[1]?.delta === "첫",
      );
    });

    const stopped = ragQaService.stop(handle.runId);
    expect(stopped).toEqual({ stopped: true });

    await new Promise((resolve) => setTimeout(resolve, 80));

    const send = (windowMock as any).webContents.send as ReturnType<typeof vi.fn>;
    const doneCall = send.mock.calls.find(
      (call) => call[0] === IPC_CHANNELS.RAG_QA_STREAM && call[1]?.runId === handle.runId && call[1]?.done === true,
    );
    expect(doneCall).toBeUndefined();
  });
});

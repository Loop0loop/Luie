import { describe, expect, it, vi } from "vitest";
import type { RagQaStreamPayload } from "../../../src/shared/types/index.js";

const mocked = vi.hoisted(() => ({
  send: vi.fn(),
  applyRejectedAnswerGuardToRagResult: vi.fn(),
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    fromId: vi.fn(() => ({
      isDestroyed: () => false,
      webContents: {
        send: mocked.send,
      },
    })),
    getAllWindows: vi.fn(() => []),
  },
}));

vi.mock("../../../src/main/services/features/rag/rejectedAnswerGuard.js", () => ({
  applyRejectedAnswerGuardToRagResult:
    mocked.applyRejectedAnswerGuardToRagResult,
}));

describe("utilityProcessBridge rejected answer guard", () => {
  it("guards completed RAG stream results before forwarding them to the renderer", async () => {
    const { forwardRagStream } = await import(
      "../../../src/main/services/features/utility/utilityProcessBridge/internal/eventHandlers.js"
    );
    const payload: RagQaStreamPayload = {
      runId: "run-1",
      done: true,
      result: {
        runId: "run-1",
        projectId: "project-1",
        question: "같은 질문",
        answer: "같은 답변",
        evidence: [],
        grounding: {
          status: "insufficient_evidence",
          note: "근거 없음",
        },
        safety: {
          label: "insufficient_evidence",
          message: "근거가 없어 확정 답변으로 표시하지 않습니다.",
          blocksConfirmedAnswer: true,
          reasons: ["insufficient_evidence"],
        },
        createdAt: "2026-06-13T00:00:00.000Z",
      },
    };
    mocked.applyRejectedAnswerGuardToRagResult.mockResolvedValue({
      ...payload.result,
      safety: {
        label: "blocked_p0",
        message: "이전에 틀렸다고 표시된 동일 답변입니다.",
        blocksConfirmedAnswer: true,
        reasons: ["insufficient_evidence", "repeated_rejected_answer"],
      },
    });
    const bridge = {
      ragRunToWindowId: new Map([["run-1", 7]]),
      enqueuePendingRagEvent: vi.fn(),
      setRagRunWatchdog: vi.fn(),
      clearRagRunWatchdog: vi.fn(),
    };

    await forwardRagStream(bridge, payload);

    expect(mocked.applyRejectedAnswerGuardToRagResult).toHaveBeenCalledWith(
      payload.result,
    );
    expect(mocked.send).toHaveBeenCalledWith(
      "rag-qa:stream",
      expect.objectContaining({
        done: true,
        result: expect.objectContaining({
          safety: expect.objectContaining({
            reasons: ["insufficient_evidence", "repeated_rejected_answer"],
          }),
        }),
      }),
    );
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errors/index.js";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";
import {
  mocked,
  registerSearchInputHandlers,
  resetInputValidationMocks,
} from "./ipcInputValidation.shared";

describe("IPC input validation: narrative memory", () => {
  beforeEach(() => {
    resetInputValidationMocks();
  });

  it("routes valid MEMORY_RUN_EVAL_SUITE payloads to the memory eval runner", async () => {
    mocked.narrativeMemoryQueryService.runEvalSuite.mockResolvedValue({
      runId: "run-1",
      caseCount: 0,
      averageContextRecallAtK: 0,
      totalP0FailureCount: 0,
      results: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_RUN_EVAL_SUITE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      label: "manual-eval",
      topK: 5,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.runEvalSuite).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_RECORD_EVAL_FEEDBACK payloads to the memory feedback recorder", async () => {
    mocked.narrativeMemoryQueryService.recordEvalFeedback.mockResolvedValue({
      id: "feedback-1",
      evalCaseId: "case-1",
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_RECORD_EVAL_FEEDBACK,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      feedbackKind: "answer_wrong",
      question: "3화 기준으로 아린이 이 사실을 알아도 되나?",
      answer: "알고 있다.",
      evidence: [
        {
          chunkId: "chunk-8",
          chapterId: "550e8400-e29b-41d4-a716-446655440001",
          offset: 12,
          quote: "8화에서 아린은 사실을 알게 된다.",
        },
      ],
      note: "3화 기준으로는 아직 모른다.",
      createEvalCaseCandidate: true,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.recordEvalFeedback,
    ).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_RUN_INTENT_CALIBRATION payloads to the memory calibration runner", async () => {
    mocked.narrativeMemoryQueryService.runIntentCalibration.mockResolvedValue({
      caseCount: 8,
      passCount: 8,
      failures: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_RUN_INTENT_CALIBRATION,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      useLlm: true,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.runIntentCalibration,
    ).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_RUN_EPISODE_CALIBRATION payloads to the episode calibration runner", async () => {
    mocked.narrativeMemoryQueryService.runEpisodeCalibration.mockResolvedValue({
      caseCount: 1,
      passCount: 1,
      failures: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_RUN_EPISODE_CALIBRATION,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.runEpisodeCalibration,
    ).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_QUERY_NARRATIVE payloads to the memory query service", async () => {
    mocked.narrativeMemoryQueryService.query.mockResolvedValue({
      intent: "relationship-at-chapter",
      status: "insufficient_evidence",
      trace: [],
      facts: [],
      evidence: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_QUERY_NARRATIVE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      question: "관계 알려줘",
      entityName: "청룡문",
      entityType: "faction",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.query).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_GET_NARRATIVE_SUMMARY_STATUS payloads to the summary status service", async () => {
    mocked.narrativeSummaryStatusService.getStatus.mockResolvedValue({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      totalCount: 0,
      staleCount: 0,
      byType: {},
      summaries: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_GET_NARRATIVE_SUMMARY_STATUS,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeSummaryStatusService.getStatus).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_PAUSE_BUILD_JOBS payloads to memory job control", async () => {
    mocked.memoryJobControl.pauseMemoryBuildJobs.mockResolvedValue({
      paused: 2,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_PAUSE_BUILD_JOBS);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.memoryJobControl.pauseMemoryBuildJobs).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_RESUME_BUILD_JOBS payloads to memory job control", async () => {
    mocked.memoryJobControl.resumeMemoryBuildJobs.mockResolvedValue({
      resumed: 2,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_RESUME_BUILD_JOBS);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.memoryJobControl.resumeMemoryBuildJobs).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_CANCEL_BUILD_JOBS payloads to memory job control", async () => {
    mocked.memoryJobControl.cancelMemoryBuildJobs.mockResolvedValue({
      canceled: 2,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_CANCEL_BUILD_JOBS);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.memoryJobControl.cancelMemoryBuildJobs).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_GET_BUILD_JOB_PROGRESS payloads to memory job control", async () => {
    mocked.memoryJobControl.getMemoryBuildJobProgress.mockResolvedValue({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      total: 3,
      activeCount: 2,
      doneCount: 1,
      byStatus: {
        pending: 1,
        completed: 1,
        paused: 1,
      },
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_GET_BUILD_JOB_PROGRESS,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.memoryJobControl.getMemoryBuildJobProgress,
    ).toHaveBeenCalledWith(input);
  });

  it("returns INVALID_INPUT for blank MEMORY_QUERY_NARRATIVE question", async () => {
    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_QUERY_NARRATIVE);
    expect(handler).toBeDefined();

    const response = (await handler?.(
      {},
      {
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        question: "   ",
      },
    )) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.narrativeMemoryQueryService.query).not.toHaveBeenCalled();
  });

  it("returns INVALID_INPUT for blank MEMORY_PAUSE_BUILD_JOBS projectId", async () => {
    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_PAUSE_BUILD_JOBS);
    expect(handler).toBeDefined();

    const response = (await handler?.({}, { projectId: "   " })) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.memoryJobControl.pauseMemoryBuildJobs).not.toHaveBeenCalled();
  });
});

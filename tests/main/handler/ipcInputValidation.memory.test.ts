import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
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

  it("routes valid MEMORY_GET_CONFLICT_QUEUE payloads to the memory query service", async () => {
    mocked.narrativeMemoryQueryService.getConflictQueue.mockResolvedValue({
      items: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_GET_CONFLICT_QUEUE,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      chapterId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      includePriorMemory: true,
      limit: 10,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.getConflictQueue).toHaveBeenCalledWith(
      input,
    );
  });

  it("returns INVALID_INPUT for malformed MEMORY_GET_CONFLICT_QUEUE payload", async () => {
    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_GET_CONFLICT_QUEUE);
    expect(handler).toBeDefined();

    const response = (await handler?.(
      {},
      {
        projectId: "not-a-uuid",
        limit: 10,
      },
    )) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(
      mocked.narrativeMemoryQueryService.getConflictQueue,
    ).not.toHaveBeenCalled();
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
});

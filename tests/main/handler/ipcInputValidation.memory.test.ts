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
      reviewFilter: "deferred",
      limit: 10,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.getConflictQueue).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_REVIEW_BACKLOG payloads to the memory query service", async () => {
    mocked.narrativeMemoryQueryService.getReviewBacklog.mockResolvedValue({
      staleEvidence: [],
      counts: { staleEvidence: 0 },
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_REVIEW_BACKLOG);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      limit: 20,
      evidenceLimit: 2,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.getReviewBacklog).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_REPAIR_EVIDENCE_LINKS payloads and persists repaired memory", async () => {
    mocked.narrativeMemoryQueryService.repairEvidenceLinks.mockResolvedValue({
      episodeEvidenceScanned: 2,
      episodeEvidenceRepaired: 1,
      episodeEvidenceUnresolved: 1,
      entityMentionScanned: 1,
      entityMentionRepaired: 1,
      entityMentionUnresolved: 0,
      evalEvidenceScanned: 0,
      evalEvidenceRepaired: 0,
      evalEvidenceUnresolved: 0,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_REPAIR_EVIDENCE_LINKS,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.repairEvidenceLinks,
    ).toHaveBeenCalledWith(input);
    expect(mocked.packagePersistence.persistPackageAfterMutation).toHaveBeenCalledWith(
      input.projectId,
      "memory:repair-evidence-links",
    );
  });

  it("routes valid MEMORY_EPISODE_REVIEW_QUEUE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.listSuggestedEpisodes.mockResolvedValue({
      items: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_EPISODE_REVIEW_QUEUE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      limit: 20,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.listSuggestedEpisodes).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_EPISODE_REJECT payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.rejectEpisode.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_EPISODE_REJECT);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      episodeId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      reason: "근거 부족",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.rejectEpisode).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_FACT_REVIEW_QUEUE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.listSuggestedFacts.mockResolvedValue({
      items: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_FACT_REVIEW_QUEUE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      limit: 20,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.listSuggestedFacts).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_FACT_CONFIRM payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.confirmFact.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_FACT_CONFIRM);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      factId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.confirmFact).toHaveBeenCalledWith(input);
    expect(mocked.packagePersistence.persistPackageAfterMutation).toHaveBeenCalledWith(
      input.projectId,
      "memory:fact-confirm",
    );
  });

  it("routes valid MEMORY_FACT_REJECT payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.rejectFact.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_FACT_REJECT);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      factId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      reason: "근거 부족",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.rejectFact).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_CONFLICT_RESOLVE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.resolveFactConflict.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_CONFLICT_RESOLVE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      conflictId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      winnerFactId: "a47ac10b-58cc-4372-a567-0e02b2c3d479",
      reason: "검토 후 확정",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.resolveFactConflict).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_CONFLICT_REVIEW_ACTION payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.reviewFactConflict.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_CONFLICT_REVIEW_ACTION,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      conflictId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      action: "defer",
      reviewerNote: "나중에 검토",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.reviewFactConflict).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_ENTITY_ALIAS_REVIEW_QUEUE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.listSuggestedEntityAliases.mockResolvedValue({
      items: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REVIEW_QUEUE,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      limit: 20,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.listSuggestedEntityAliases,
    ).toHaveBeenCalledWith(input);
  });

  it("routes valid MEMORY_ENTITY_REVIEW_QUEUE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.listSuggestedEntities.mockResolvedValue({
      items: [],
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_REVIEW_QUEUE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      limit: 20,
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.listSuggestedEntities).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_ENTITY_CONFIRM payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.confirmEntity.mockResolvedValue({
      updated: true,
      status: "confirmed",
      canonicalExportable: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_CONFIRM);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      entityId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.confirmEntity).toHaveBeenCalledWith(
      input,
    );
    expect(mocked.packagePersistence.persistPackageAfterMutation).toHaveBeenCalledWith(
      input.projectId,
      "memory:entity-confirm",
    );
  });

  it("does not persist .luie when entity confirmation did not update a row", async () => {
    mocked.narrativeMemoryQueryService.confirmEntity.mockResolvedValue({
      updated: false,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_CONFIRM);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      entityId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.packagePersistence.persistPackageAfterMutation).not.toHaveBeenCalled();
  });

  it("routes valid MEMORY_ENTITY_REJECT payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.rejectEntity.mockResolvedValue({
      updated: true,
      status: "rejected",
      canonicalExportable: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_REJECT);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      entityId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      reason: "중복 후보가 아님",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.rejectEntity).toHaveBeenCalledWith(
      input,
    );
    expect(mocked.packagePersistence.persistPackageAfterMutation).toHaveBeenCalledWith(
      input.projectId,
      "memory:entity-reject",
    );
  });

  it("routes valid MEMORY_ENTITY_ALIAS_CONFIRM payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.confirmEntityAlias.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_CONFIRM);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      aliasId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.confirmEntityAlias).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_ENTITY_ALIAS_REJECT payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.rejectEntityAlias.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REJECT);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      aliasId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      reason: "별칭 근거 부족",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.rejectEntityAlias).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_ENTITY_MERGE payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.mergeEntity.mockResolvedValue({
      updated: true,
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_MERGE);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      targetEntityId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      sourceEntityId: "a47ac10b-58cc-4372-a567-0e02b2c3d479",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.mergeEntity).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_ENTITY_ALIAS_SPLIT payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.splitEntityAlias.mockResolvedValue({
      updated: true,
      entityId: "b47ac10b-58cc-4372-a567-0e02b2c3d479",
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_SPLIT);
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      aliasId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      canonicalName: "검은 기사",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mocked.narrativeMemoryQueryService.splitEntityAlias).toHaveBeenCalledWith(
      input,
    );
  });

  it("routes valid MEMORY_STALE_EVIDENCE_REVIEW_ACTION payloads to the memory review service", async () => {
    mocked.narrativeMemoryQueryService.reviewStaleEvidence.mockResolvedValue({
      updated: true,
      status: "deferred",
    });

    await registerSearchInputHandlers(mocked.narrativeMemoryQueryService);

    const handler = mocked.handlerMap.get(
      IPC_CHANNELS.MEMORY_STALE_EVIDENCE_REVIEW_ACTION,
    );
    expect(handler).toBeDefined();

    const input = {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "episode_evidence",
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      action: "defer",
      reviewerNote: "원고 수정 후 다시 확인",
    };
    const response = (await handler?.({}, input)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(
      mocked.narrativeMemoryQueryService.reviewStaleEvidence,
    ).toHaveBeenCalledWith(input);
    expect(mocked.packagePersistence.persistPackageAfterMutation).toHaveBeenCalledWith(
      input.projectId,
      "memory:stale-evidence-review-action",
    );
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

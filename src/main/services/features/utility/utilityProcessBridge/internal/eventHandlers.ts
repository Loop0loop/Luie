import electron from "electron";
import { IPC_CHANNELS } from "../../../../../../shared/ipc/channels.js";
import { ErrorCode } from "../../../../../../shared/constants/errors/index.js";
import { createLogger } from "../../../../../../shared/logger/index.js";
import {
  type RagQaErrorPayload,
  type RagQaStreamPayload,
  type UtilitySidecarPurpose,
  type UtilitySidecarStatusEvent,
  type UtilitySidecarStatus,
} from "../../../../../../shared/types/index.js";
import { applyRejectedAnswerGuardToRagResult } from "../../../rag/rejectedAnswerGuard.js";
import {
  RAG_RUN_WATCHDOG_MS,
  type PendingRagEvent,
  type PendingRequest,
  type UtilityOutboundMessage,
} from "../protocol.js";

const logger = createLogger("UtilityProcessBridgeEventHandler");
const { BrowserWindow } = electron;

export interface UtilityProcessBridgeEventHost {
  pendingRequests: Map<string, PendingRequest>;
  ragRunToWindowId: Map<string, number>;
  ragRunWatchdogs: Map<string, ReturnType<typeof setTimeout>>;
  pendingRagEvents: Map<string, PendingRagEvent[]>;
  pendingRagEventTimers: Map<string, ReturnType<typeof setTimeout>>;
  lastSidecarStatuses: Map<UtilitySidecarPurpose, UtilitySidecarStatus>;
  setRagRunWatchdog: (runId: string) => void;
  clearRagRunWatchdog: (runId: string) => void;
  flushPendingRagEvents: (runId: string) => Promise<void>;
  enqueuePendingRagEvent: (runId: string, event: PendingRagEvent) => void;
  clearPendingRagEvents: () => void;
  emitCrashErrorsToActiveRuns: (message: string) => void;
  stopRagQaAsync: (runId: string) => void;
}

export const handleUtilityOutboundMessage = async (
  bridge: UtilityProcessBridgeEventHost,
  message: UtilityOutboundMessage,
): Promise<void> => {
  if (message.type === "response") {
    const pending = bridge.pendingRequests.get(message.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    bridge.pendingRequests.delete(message.requestId);
    if (message.ok) {
      pending.resolve(message.result);
    } else {
      logger.error("Utility request failed", {
        requestId: message.requestId,
        error: message.error,
      });
      pending.reject(new Error(message.error));
    }
    return;
  }

  if (message.type === "event" && message.event === "ragQa.stream") {
    await forwardRagStream(bridge, message.payload);
    return;
  }
  if (message.type === "event" && message.event === "ragQa.error") {
    forwardRagError(bridge, message.payload);
    return;
  }
  if (message.type === "event" && message.event === "sidecar.status") {
    handleSidecarStatusEvent(bridge, message.payload);
  }
};

export const handleSidecarStatusEvent = (
  bridge: UtilityProcessBridgeEventHost,
  payload: UtilitySidecarStatusEvent,
): void => {
  bridge.lastSidecarStatuses.set(payload.purpose, payload.status);
  broadcastSidecarStatus(payload);
  if (
    payload.status.status === "crashed" ||
    payload.status.status === "cooldown"
  ) {
    logger.warn("Utility sidecar status changed to unavailable", {
      purpose: payload.purpose,
      status: payload.status.status,
      error: payload.status.lastError,
    });
    if (payload.purpose === "chat") {
      bridge.emitCrashErrorsToActiveRuns(payload.status.lastError);
    }
    return;
  }
  logger.info("Utility sidecar status changed", {
    purpose: payload.purpose,
    status: payload.status.status,
  });
};

const broadcastSidecarStatus = (payload: UtilitySidecarStatusEvent): void => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue;
    window.webContents.send(IPC_CHANNELS.SIDECAR_STATUS_CHANGED, payload);
  }
};

export const forwardRagStream = async (
  bridge: UtilityProcessBridgeEventHost,
  payload: RagQaStreamPayload,
): Promise<void> => {
  const targetId = bridge.ragRunToWindowId.get(payload.runId);
  if (!targetId) {
    bridge.enqueuePendingRagEvent(payload.runId, { kind: "stream", payload });
    return;
  }
  const targetWindow = BrowserWindow.fromId(targetId);
  if (!targetWindow || targetWindow.isDestroyed()) {
    bridge.ragRunToWindowId.delete(payload.runId);
    return;
  }
  bridge.setRagRunWatchdog(payload.runId);
  targetWindow.webContents.send(
    IPC_CHANNELS.RAG_QA_STREAM,
    await guardCompletedRagStreamPayload(payload),
  );
  if (payload.done) {
    bridge.clearRagRunWatchdog(payload.runId);
    bridge.ragRunToWindowId.delete(payload.runId);
  }
};

export const forwardRagError = (
  bridge: UtilityProcessBridgeEventHost,
  payload: RagQaErrorPayload,
): void => {
  if (!payload.runId) return;
  const targetId = bridge.ragRunToWindowId.get(payload.runId);
  if (!targetId) {
    bridge.enqueuePendingRagEvent(payload.runId, { kind: "error", payload });
    return;
  }
  const targetWindow = BrowserWindow.fromId(targetId);
  if (!targetWindow || targetWindow.isDestroyed()) {
    bridge.ragRunToWindowId.delete(payload.runId);
    return;
  }
  targetWindow.webContents.send(IPC_CHANNELS.RAG_QA_ERROR, payload);
  bridge.clearRagRunWatchdog(payload.runId);
  bridge.ragRunToWindowId.delete(payload.runId);
};

export const clearPendingRequestsInternal = (
  bridge: UtilityProcessBridgeEventHost,
  message: string,
): void => {
  for (const pending of bridge.pendingRequests.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error(message));
  }
  bridge.pendingRequests.clear();
};

export const emitCrashErrorsToActiveRunsInternal = (
  bridge: UtilityProcessBridgeEventHost,
  message: string,
): void => {
  for (const [runId, windowId] of bridge.ragRunToWindowId.entries()) {
    const targetWindow = BrowserWindow.fromId(windowId);
    if (!targetWindow || targetWindow.isDestroyed()) continue;
    targetWindow.webContents.send(IPC_CHANNELS.RAG_QA_ERROR, {
      runId,
      code: ErrorCode.RAG_QA_UTILITY_EXITED,
      message,
    } satisfies RagQaErrorPayload);
  }
};

export const enqueuePendingRagEventInternal = (
  bridge: UtilityProcessBridgeEventHost,
  runId: string,
  event: PendingRagEvent,
): void => {
  const events = bridge.pendingRagEvents.get(runId) ?? [];
  events.push(event);
  bridge.pendingRagEvents.set(runId, events);
  if (!bridge.pendingRagEventTimers.has(runId)) {
    const timer = setTimeout(() => {
      bridge.pendingRagEventTimers.delete(runId);
      bridge.pendingRagEvents.delete(runId);
    }, 500);
    bridge.pendingRagEventTimers.set(runId, timer);
  }
};

export const flushPendingRagEventsInternal = async (
  bridge: UtilityProcessBridgeEventHost,
  runId: string,
): Promise<void> => {
  const timer = bridge.pendingRagEventTimers.get(runId);
  if (timer) {
    clearTimeout(timer);
    bridge.pendingRagEventTimers.delete(runId);
  }
  const events = bridge.pendingRagEvents.get(runId);
  if (!events || events.length === 0) return;
  bridge.pendingRagEvents.delete(runId);
  await events.reduce<Promise<void>>(async (previous, event) => {
    await previous;
    if (event.kind === "stream") {
      await forwardRagStream(bridge, event.payload);
    } else {
      forwardRagError(bridge, event.payload);
    }
  }, Promise.resolve());
};

async function guardCompletedRagStreamPayload(
  payload: RagQaStreamPayload,
): Promise<RagQaStreamPayload> {
  if (!payload.done || !payload.result) {
    return payload;
  }
  try {
    return {
      ...payload,
      result: await applyRejectedAnswerGuardToRagResult(payload.result),
    };
  } catch (error) {
    logger.warn("Failed to apply rejected answer guard to RAG result", {
      runId: payload.runId,
      error,
    });
    return payload;
  }
}

export const clearPendingRagEventsInternal = (
  bridge: UtilityProcessBridgeEventHost,
): void => {
  for (const timer of bridge.pendingRagEventTimers.values()) {
    clearTimeout(timer);
  }
  bridge.pendingRagEventTimers.clear();
  bridge.pendingRagEvents.clear();
};

export const setRagRunWatchdogInternal = (
  bridge: UtilityProcessBridgeEventHost,
  runId: string,
  stopRagQaAsync: (runId: string) => void,
): void => {
  bridge.clearRagRunWatchdog(runId);
  const timer = setTimeout(() => {
    const windowId = bridge.ragRunToWindowId.get(runId);
    if (!windowId) return;
    const targetWindow = BrowserWindow.fromId(windowId);
    if (!targetWindow || targetWindow.isDestroyed()) {
      bridge.ragRunToWindowId.delete(runId);
      bridge.clearRagRunWatchdog(runId);
      return;
    }
    targetWindow.webContents.send(IPC_CHANNELS.RAG_QA_ERROR, {
      runId,
      code: ErrorCode.RAG_QA_FAILED,
      message: "RAG generation timeout",
    } satisfies RagQaErrorPayload);
    bridge.ragRunToWindowId.delete(runId);
    bridge.clearRagRunWatchdog(runId);
    stopRagQaAsync(runId);
  }, RAG_RUN_WATCHDOG_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  bridge.ragRunWatchdogs.set(runId, timer);
};

export const clearRagRunWatchdogInternal = (
  bridge: UtilityProcessBridgeEventHost,
  runId: string,
): void => {
  const timer = bridge.ragRunWatchdogs.get(runId);
  if (!timer) return;
  clearTimeout(timer);
  bridge.ragRunWatchdogs.delete(runId);
};

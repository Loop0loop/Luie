import { contextBridge, ipcRenderer } from "electron";
import type { RendererApi } from "../shared/api/index.js";
import { createErrorResponse, type IPCResponse } from "../shared/ipc/index.js";
import { IPC_CHANNELS } from "../shared/ipc/channels.js";
import {
  AUTO_SAVE_FLUSH_MS,
  ErrorCode,
  IPC_DEFAULT_TIMEOUT_MS,
  IPC_LONG_TIMEOUT_MS,
  LOG_BATCH_SIZE,
  LOG_FLUSH_MS,
  OBSERVABILITY_EVENT_SCHEMA_VERSION,
} from "../shared/constants/index.js";
import { createRendererApi } from "./api/index.js";
import type { CoreMethod, CoreResponse, SafeInvokeCore } from "./api/types.js";

function sanitizeForIpc(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForIpc(entry, seen));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
      const sanitized = sanitizeForIpc(entry, seen);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return String(value);
}

const LONG_TIMEOUT_CHANNELS = new Set<string>([
  IPC_CHANNELS.CHAPTER_CREATE,
  IPC_CHANNELS.MANUAL_SAVE,
  IPC_CHANNELS.SNAPSHOT_IMPORT_FILE,
  IPC_CHANNELS.EXPORT_CREATE,
  IPC_CHANNELS.PROJECT_OPEN_LUIE,
  IPC_CHANNELS.SYNC_RUN_NOW,
  IPC_CHANNELS.ANALYSIS_START,
  IPC_CHANNELS.CHARACTER_GENERATE_IMAGE,
  IPC_CHANNELS.CHARACTER_GENERATE_QUOTE,
  IPC_CHANNELS.CHARACTER_GENERATE_STATS,
]);

const LOGGER_CHANNELS = new Set<string>([
  IPC_CHANNELS.LOGGER_LOG,
  IPC_CHANNELS.LOGGER_LOG_BATCH,
]);

const RETRYABLE_CHANNELS = new Set<string>([
  IPC_CHANNELS.PROJECT_GET,
  IPC_CHANNELS.PROJECT_GET_ALL,
  IPC_CHANNELS.CHAPTER_GET,
  IPC_CHANNELS.CHAPTER_GET_ALL,
  IPC_CHANNELS.CHAPTER_GET_DELETED,
  IPC_CHANNELS.SCENE_GET,
  IPC_CHANNELS.SCENE_GET_ALL,
  IPC_CHANNELS.NOTE_GET,
  IPC_CHANNELS.NOTE_GET_ALL,
  IPC_CHANNELS.SYNOPSIS_GET,
  IPC_CHANNELS.SYNOPSIS_GET_ALL,
  IPC_CHANNELS.PLOT_GET,
  IPC_CHANNELS.PLOT_GET_ALL,
  IPC_CHANNELS.SCRAP_MEMO_GET_ALL,
  IPC_CHANNELS.CHARACTER_GET,
  IPC_CHANNELS.CHARACTER_GET_ALL,
  IPC_CHANNELS.EVENT_GET,
  IPC_CHANNELS.EVENT_GET_ALL,
  IPC_CHANNELS.FACTION_GET,
  IPC_CHANNELS.FACTION_GET_ALL,
  IPC_CHANNELS.TERM_GET,
  IPC_CHANNELS.TERM_GET_ALL,
  IPC_CHANNELS.SNAPSHOT_GET_ALL,
  IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER,
  IPC_CHANNELS.SNAPSHOT_LIST_RESTORE_CANDIDATES,
  IPC_CHANNELS.SEARCH,
  IPC_CHANNELS.SETTINGS_GET_ALL,
  IPC_CHANNELS.SETTINGS_GET_EDITOR,
  IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE,
  IPC_CHANNELS.SETTINGS_GET_LANGUAGE,
  IPC_CHANNELS.SETTINGS_GET_MENU_BAR_MODE,
  IPC_CHANNELS.SETTINGS_GET_SHORTCUTS,
  IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS,
  IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS,
  IPC_CHANNELS.RECOVERY_DB_STATUS,
  IPC_CHANNELS.SYNC_GET_STATUS,
  IPC_CHANNELS.SYNC_GET_RUNTIME_CONFIG,
  IPC_CHANNELS.STARTUP_GET_READINESS,
  IPC_CHANNELS.PLUGIN_LIST_CATALOG,
  IPC_CHANNELS.PLUGIN_LIST_INSTALLED,
  IPC_CHANNELS.PLUGIN_GET_TEMPLATES,
]);

const randomByteArray = (size: number) => {
  const bytes = new Uint8Array(size);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let index = 0; index < size; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const getRequestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const bytes = randomByteArray(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

type LogPayload = {
  level: "debug" | "info" | "warn" | "error" | string;
  message: string;
  data?: unknown;
};

const logQueue: LogPayload[] = [];
let logFlushTimer: number | null = null;

const scheduleLogFlush = () => {
  if (logFlushTimer !== null) return;
  logFlushTimer = window.setTimeout(() => {
    logFlushTimer = null;
    void flushLogs();
  }, LOG_FLUSH_MS);
};

const enqueueDiagnosticLog = (
  level: "warn" | "error",
  message: string,
  channel: string,
  data: Record<string, unknown>,
) => {
  if (LOGGER_CHANNELS.has(channel)) return;
  logQueue.push({
    level,
    message,
    data: sanitizeForIpc({
      schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
      domain: "ipc",
      event: "preload.ipc-diagnostic",
      scope: "preload",
      channel,
      ...data,
    }),
  });
  if (level === "error" || logQueue.length >= LOG_BATCH_SIZE) {
    void flushLogs();
  } else {
    scheduleLogFlush();
  }
};

const getTimeoutMs = (channel: string) =>
  LONG_TIMEOUT_CHANNELS.has(channel) ? IPC_LONG_TIMEOUT_MS : IPC_DEFAULT_TIMEOUT_MS;

async function invokeWithTimeout<T>(
  channel: string,
  args: unknown[],
  timeoutMs: number,
): Promise<IPCResponse<T>> {
  const requestId = getRequestId();
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<IPCResponse<T>>((resolve) => {
    timeoutId = window.setTimeout(() => {
      enqueueDiagnosticLog("warn", "Preload IPC request timed out", channel, {
        kind: "timeout",
        requestId,
        timeoutMs,
      });
      resolve(
        createErrorResponse(
          ErrorCode.IPC_TIMEOUT,
          "IPC request timed out",
          { channel, timeoutMs },
          { timestamp: new Date().toISOString(), duration: timeoutMs, requestId, channel },
        ) as IPCResponse<T>,
      );
    }, timeoutMs);
  });

  const invokePromise = ipcRenderer
    .invoke(channel, ...args)
    .then((response) => response as IPCResponse<T>)
    .catch((error) => {
      enqueueDiagnosticLog("error", "Preload IPC invoke failed", channel, {
        kind: "invoke_failed",
        requestId,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      });
      return createErrorResponse(
        ErrorCode.IPC_INVOKE_FAILED,
        error instanceof Error ? error.message : String(error),
        { channel },
        { timestamp: new Date().toISOString(), requestId, channel },
      ) as IPCResponse<T>;
    });

  const result = await Promise.race([invokePromise, timeoutPromise]);
  if (timeoutId !== null) clearTimeout(timeoutId);
  return result;
}

async function safeInvoke<T = never>(
  channel: string,
  ...args: unknown[]
): Promise<IPCResponse<T>> {
  const timeoutMs = getTimeoutMs(channel);
  const maxRetries = RETRYABLE_CHANNELS.has(channel) ? 1 : 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt += 1;
    const response = await invokeWithTimeout<T>(channel, args, timeoutMs);
    if (response.success) return response;
    const code = response.error?.code;
    const shouldRetry =
      RETRYABLE_CHANNELS.has(channel) &&
      (code === ErrorCode.IPC_TIMEOUT || code === ErrorCode.IPC_INVOKE_FAILED) &&
      attempt <= maxRetries;
    if (!shouldRetry) {
      if (RETRYABLE_CHANNELS.has(channel) && attempt > maxRetries) {
        return createErrorResponse(
          ErrorCode.IPC_RETRY_EXHAUSTED,
          "IPC retry limit reached",
          { channel },
          response.meta,
        ) as IPCResponse<T>;
      }
      return response;
    }
  }

  return createErrorResponse(
    ErrorCode.IPC_RETRY_EXHAUSTED,
    "IPC retry limit reached",
    { channel },
    { timestamp: new Date().toISOString(), channel },
  ) as IPCResponse<T>;
}

const safeInvokeCore: SafeInvokeCore = <K extends CoreMethod>(
  _method: K,
  channel: string,
  ...args: unknown[]
) => safeInvoke(channel, ...args) as Promise<CoreResponse<K>>;

async function flushLogs() {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, LOG_BATCH_SIZE);
  const response = await safeInvoke(IPC_CHANNELS.LOGGER_LOG_BATCH, batch);
  if (!response.success) {
    await Promise.all(
      batch.map((entry) =>
        safeInvoke(IPC_CHANNELS.LOGGER_LOG, {
          level: entry.level,
          message: entry.message,
          data: entry.data,
        }),
      ),
    );
  }
  if (logQueue.length > 0) scheduleLogFlush();
}

const enqueueLoggerMessage = (
  level: "debug" | "info" | "warn" | "error",
  message: string,
  data: unknown,
) => {
  logQueue.push({ level, message, data: sanitizeForIpc(data) });
  if (level === "error" || logQueue.length >= LOG_BATCH_SIZE) {
    void flushLogs();
  } else {
    scheduleLogFlush();
  }
  return Promise.resolve({ success: true } as IPCResponse<never>);
};

const createLoggerApi = (): RendererApi["logger"] => ({
  debug: (message, data) => enqueueLoggerMessage("debug", message, data),
  info: (message, data) => enqueueLoggerMessage("info", message, data),
  warn: (message, data) => enqueueLoggerMessage("warn", message, data),
  error: (message, data) => enqueueLoggerMessage("error", message, data),
});

type AutoSavePayload = { chapterId: string; content: string; projectId: string };
type AutoSavePending = {
  payload: AutoSavePayload;
  sequence: number;
  resolvers: Array<(value: IPCResponse<never>) => void>;
  rejectors: Array<(reason: Error) => void>;
};

const autoSaveQueue = new Map<string, AutoSavePending>();
const latestAutoSaveSequence = new Map<string, number>();
let autoSaveSequence = 0;
let autoSaveFlushTimer: number | null = null;
let autoSaveFlushTail: Promise<void> = Promise.resolve();
let rendererDirty = false;

const scheduleAutoSaveFlush = () => {
  if (autoSaveFlushTimer !== null) return;
  autoSaveFlushTimer = window.setTimeout(() => {
    autoSaveFlushTimer = null;
    void flushAutoSaves().catch(reportAutoSaveFlushFailure);
  }, AUTO_SAVE_FLUSH_MS);
};

const toAutoSaveError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error !== null && "error" in error) {
    const responseError = (error as IPCResponse<never>).error;
    if (responseError?.message) return new Error(responseError.message);
  }
  return new Error("Auto-save failed");
};

const reportAutoSaveFlushFailure = (error: unknown) => {
  enqueueDiagnosticLog("error", "Preload auto-save flush failed", IPC_CHANNELS.AUTO_SAVE, {
    kind: "flush_failed",
    error: sanitizeForIpc(error),
  });
};

const clearAutoSaveFlushTimer = () => {
  if (autoSaveFlushTimer === null) return;
  window.clearTimeout(autoSaveFlushTimer);
  autoSaveFlushTimer = null;
};

async function drainAutoSaves(): Promise<void> {
  while (autoSaveQueue.size > 0) {
    clearAutoSaveFlushTimer();
    const entries = Array.from(autoSaveQueue.entries());
    autoSaveQueue.clear();
    const errors = await Promise.all(
      entries.map(async ([key, pending]) => {
        try {
          const response = await safeInvoke(
            IPC_CHANNELS.AUTO_SAVE,
            pending.payload.chapterId,
            pending.payload.content,
            pending.payload.projectId,
          );
          if (!response.success) throw response;
          if (latestAutoSaveSequence.get(key) === pending.sequence) {
            latestAutoSaveSequence.delete(key);
          }
          pending.resolvers.forEach((resolve) => resolve(response));
          return null;
        } catch (error) {
          const saveError = toAutoSaveError(error);
          if (
            !autoSaveQueue.has(key) &&
            latestAutoSaveSequence.get(key) === pending.sequence
          ) {
            autoSaveQueue.set(key, {
              payload: pending.payload,
              sequence: pending.sequence,
              resolvers: [],
              rejectors: [],
            });
          }
          pending.rejectors.forEach((reject) => reject(saveError));
          return saveError;
        }
      }),
    );
    const error = errors.find((entry): entry is Error => entry !== null);
    if (error) throw error;
  }
}

function flushAutoSaves(): Promise<void> {
  clearAutoSaveFlushTimer();
  const flush = autoSaveFlushTail.then(drainAutoSaves);
  autoSaveFlushTail = flush.catch(() => undefined);
  return flush;
}

const autoSave = (
  chapterId: string,
  content: string,
  projectId: string,
): Promise<IPCResponse<never>> =>
  new Promise((resolve, reject) => {
    const key = `${projectId}:${chapterId}`;
    const payload = { chapterId, content, projectId };
    const sequence = ++autoSaveSequence;
    latestAutoSaveSequence.set(key, sequence);
    const existing = autoSaveQueue.get(key);
    if (existing) {
      existing.payload = payload;
      existing.sequence = sequence;
      existing.resolvers.push(resolve);
      existing.rejectors.push(reject);
    } else {
      autoSaveQueue.set(key, {
        payload,
        sequence,
        resolvers: [resolve],
        rejectors: [reject],
      });
    }
    scheduleAutoSaveFlush();
  });

const loggerApi = createLoggerApi();
const completeAppFlush = async (requestId: string): Promise<void> => {
  const hadQueuedAutoSaves = autoSaveQueue.size > 0;
  await flushAutoSaves();
  await flushLogs();
  ipcRenderer.send(IPC_CHANNELS.APP_FLUSH_COMPLETE, {
    requestId,
    hadQueuedAutoSaves,
    rendererDirty,
  });
};
const rendererApi = createRendererApi({
  autoSave: {
    autoSave,
    flushAutoSaves,
    getRendererDirty: () => rendererDirty,
    setRendererDirty: (dirty) => {
      rendererDirty = dirty;
    },
  },
  ipcRenderer,
  safeInvoke,
  safeInvokeCore,
  sanitizeForIpc,
  loggerApi,
  completeAppFlush,
});

contextBridge.exposeInMainWorld("api", rendererApi);

window.addEventListener("beforeunload", () => {
  void flushAutoSaves().catch(reportAutoSaveFlushFailure);
  void flushLogs();
});

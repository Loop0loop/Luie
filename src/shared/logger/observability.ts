import { z } from "zod";
import { OBSERVABILITY_EVENT_SCHEMA_VERSION } from "../constants/persistence";

export type LogSink = Partial<{
  debug: (message: string, data?: unknown) => unknown;
  info: (message: string, data?: unknown) => unknown;
  warn: (message: string, data?: unknown) => unknown;
  error: (message: string, data?: unknown) => unknown;
}>;

export type OperationalDomain =
  | "ipc"
  | "persist"
  | "validation"
  | "migration"
  | "recovery"
  | "performance"
  | "runtime";

type LogLevel = "debug" | "info" | "warn" | "error";

type BaseEnvelope = {
  schemaVersion: number;
  domain: OperationalDomain;
  event: string;
  scope: string;
};

type ZodIssueSummary = {
  code: string;
  path: string;
  message: string;
};

const isPromiseLike = (
  value: unknown,
): value is PromiseLike<unknown> =>
  Boolean(value) &&
  typeof value === "object" &&
  typeof (value as PromiseLike<unknown>).then === "function";

const now = (): number => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

export const emitOperationalLog = (
  logger: LogSink | null | undefined,
  level: LogLevel,
  message: string,
  data: Record<string, unknown>,
): void => {
  const target = logger?.[level];
  if (!target) return;

  try {
    const result = target(message, data);
    if (isPromiseLike(result)) {
      void result.then(() => undefined, () => undefined);
    }
  } catch {
    // Logging must not change app control flow.
  }
};

export const summarizeZodError = (
  error: z.ZodError,
): {
  flattened: ReturnType<typeof z.flattenError>;
  pretty: string;
  issues: ZodIssueSummary[];
} => ({
  flattened: z.flattenError(error),
  pretty: z.prettifyError(error),
  issues: error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.map(String).join("."),
    message: issue.message,
  })),
});

export const buildValidationFailureData = (input: {
  scope: string;
  domain?: Extract<OperationalDomain, "ipc" | "persist" | "validation">;
  source: string;
  error: z.ZodError;
  storageKey?: string;
  channel?: string;
  requestId?: string;
  fallback?: string;
  persistedVersion?: number;
  targetVersion?: number;
  meta?: Record<string, unknown>;
}): BaseEnvelope & Record<string, unknown> => ({
  schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
  domain: input.domain ?? "validation",
  event: "validation.failed",
  scope: input.scope,
  source: input.source,
  ...(input.storageKey ? { storageKey: input.storageKey } : {}),
  ...(input.channel ? { channel: input.channel } : {}),
  ...(input.requestId ? { requestId: input.requestId } : {}),
  ...(typeof input.persistedVersion === "number"
    ? { persistedVersion: input.persistedVersion }
    : {}),
  ...(typeof input.targetVersion === "number"
    ? { targetVersion: input.targetVersion }
    : {}),
  ...(input.fallback ? { fallback: input.fallback } : {}),
  zod: summarizeZodError(input.error),
  ...(input.meta ?? {}),
});

export const buildRecoveryEventData = (input: {
  scope: string;
  event: string;
  storageKey?: string;
  source?: string;
  persistedVersion?: number;
  targetVersion?: number;
  action: string;
  reason?: string;
  meta?: Record<string, unknown>;
}): BaseEnvelope & Record<string, unknown> => ({
  schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
  domain: "recovery",
  event: input.event,
  scope: input.scope,
  action: input.action,
  ...(input.storageKey ? { storageKey: input.storageKey } : {}),
  ...(input.source ? { source: input.source } : {}),
  ...(typeof input.persistedVersion === "number"
    ? { persistedVersion: input.persistedVersion }
    : {}),
  ...(typeof input.targetVersion === "number"
    ? { targetVersion: input.targetVersion }
    : {}),
  ...(input.reason ? { reason: input.reason } : {}),
  ...(input.meta ?? {}),
});

export const buildMigrationEventData = (input: {
  scope: string;
  storageKey?: string;
  source: string;
  fromVersion: number;
  toVersion: number;
  status: "migrated" | "reset" | "skipped";
  meta?: Record<string, unknown>;
}): BaseEnvelope & Record<string, unknown> => ({
  schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
  domain: "migration",
  event: "persist.migrated",
  scope: input.scope,
  source: input.source,
  status: input.status,
  fromVersion: input.fromVersion,
  toVersion: input.toVersion,
  ...(input.storageKey ? { storageKey: input.storageKey } : {}),
  ...(input.meta ?? {}),
});

export const buildRuntimeErrorData = (input: {
  scope: string;
  kind: string;
  error: unknown;
  meta?: Record<string, unknown>;
}): BaseEnvelope & Record<string, unknown> => ({
  schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
  domain: "runtime",
  event: "runtime.error",
  scope: input.scope,
  kind: input.kind,
  error:
    input.error instanceof Error
      ? {
          name: input.error.name,
          message: input.error.message,
          stack: input.error.stack,
        }
      : input.error,
  ...(input.meta ?? {}),
});

export const createPerformanceTimer = (input: {
  scope: string;
  event: string;
  meta?: Record<string, unknown>;
}) => {
  const startedAt = now();
  return {
    complete(
      logger: LogSink | null | undefined,
      meta?: Record<string, unknown>,
    ): number {
      const durationMs = Number((now() - startedAt).toFixed(1));
      emitOperationalLog(logger, "info", input.event, {
        schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
        domain: "performance",
        event: input.event,
        scope: input.scope,
        durationMs,
        status: "ok",
        ...(input.meta ?? {}),
        ...(meta ?? {}),
      });
      return durationMs;
    },
    fail(
      logger: LogSink | null | undefined,
      error: unknown,
      meta?: Record<string, unknown>,
    ): number {
      const durationMs = Number((now() - startedAt).toFixed(1));
      emitOperationalLog(logger, "warn", input.event, {
        schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
        domain: "performance",
        event: input.event,
        scope: input.scope,
        durationMs,
        status: "failed",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : error,
        ...(input.meta ?? {}),
        ...(meta ?? {}),
      });
      return durationMs;
    },
  };
};

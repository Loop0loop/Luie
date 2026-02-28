import { app } from "electron";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { createLogger } from "../../shared/logger/index.js";

type Logger = ReturnType<typeof createLogger>;

const CRASH_REPORT_DIR = "crash-reports";
const MAX_REPORT_FILES = 100;

let isRegistered = false;

const redactSecrets = (value: string): string => {
  return value
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]")
    .replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]")
    .replace(
      /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
      "[REDACTED_SECRET]",
    );
};

const sanitizeUnknown = (input: unknown, depth = 0): unknown => {
  if (input === null || input === undefined) return input;
  if (depth >= 4) return "[TRUNCATED_DEPTH]";

  if (
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return typeof input === "string" ? redactSecrets(input) : input;
  }

  if (typeof input === "bigint") return input.toString();
  if (typeof input === "symbol") return input.toString();
  if (typeof input === "function") return "[Function]";

  if (input instanceof Error) {
    return {
      name: input.name,
      message: redactSecrets(input.message),
      stack: input.stack ? redactSecrets(input.stack) : undefined,
    };
  }

  if (Array.isArray(input)) {
    return input.slice(0, 50).map((entry) => sanitizeUnknown(entry, depth + 1));
  }

  if (typeof input === "object") {
    const source = input as Record<string, unknown>;
    const entries = Object.entries(source).slice(0, 100);
    const out: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      out[key] = sanitizeUnknown(value, depth + 1);
    }
    return out;
  }

  return String(input);
};

const reportPath = (): string => path.join(app.getPath("userData"), CRASH_REPORT_DIR);

const pruneOldReports = async (dir: string, logger: Logger): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );
  if (files.length <= MAX_REPORT_FILES) return;
  files.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const stale = files.slice(MAX_REPORT_FILES);
  await Promise.all(
    stale.map(async (entry) => {
      try {
        await fs.rm(entry.fullPath, { force: true });
      } catch (error) {
        logger.warn("Failed to remove stale crash report", { error, path: entry.fullPath });
      }
    }),
  );
};

const writeCrashReport = async (
  logger: Logger,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  const dir = reportPath();
  await fs.mkdir(dir, { recursive: true });

  const timestamp = new Date().toISOString();
  const id = randomUUID();
  const fileName = `${timestamp.replace(/[:.]/g, "-")}-${kind}-${id}.json`;
  const target = path.join(dir, fileName);
  const temp = `${target}.tmp`;

  const report = {
    id,
    timestamp,
    type: kind,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    processType: process.type,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    payload: sanitizeUnknown(payload),
  };

  await fs.writeFile(temp, JSON.stringify(report, null, 2), "utf-8");
  await fs.rename(temp, target);
  await pruneOldReports(dir, logger);
};

const extractRenderGoneDetails = (
  webContents: unknown,
  details: unknown,
): Record<string, unknown> => {
  const source = (details ?? {}) as Record<string, unknown>;
  const wc = (webContents ?? {}) as Record<string, unknown>;
  return {
    webContentsId: typeof wc.id === "number" ? wc.id : undefined,
    reason: source.reason,
    exitCode: source.exitCode,
  };
};

const extractChildGoneDetails = (details: unknown): Record<string, unknown> => {
  const source = (details ?? {}) as Record<string, unknown>;
  return {
    type: source.type,
    reason: source.reason,
    exitCode: source.exitCode,
    serviceName: source.serviceName,
    name: source.name,
  };
};

export const registerCrashReporting = (logger: Logger): void => {
  if (isRegistered) return;
  isRegistered = true;

  const persist = (kind: string, payload: Record<string, unknown>) => {
    void writeCrashReport(logger, kind, payload).catch((error) => {
      logger.warn("Failed to persist crash report", { error, kind });
    });
  };

  process.on("uncaughtExceptionMonitor", (error, origin) => {
    persist("uncaught-exception", {
      origin,
      error,
    });
  });

  process.on("unhandledRejection", (reason) => {
    persist("unhandled-rejection", {
      reason,
    });
  });

  app.on("render-process-gone", (_event, webContents, details) => {
    persist("render-process-gone", extractRenderGoneDetails(webContents, details));
  });

  app.on("child-process-gone", (_event, details) => {
    persist("child-process-gone", extractChildGoneDetails(details));
  });
};


import { createLogger } from "../../../../shared/logger/index.js";
import { isTestEnv } from "../../../utils/env/index.js";

export const chapterLogger = createLogger("ChapterService");

export const ENABLE_STRESS_TRACE =
  process.env.LUIE_STRESS_TRACE === "1" ||
  process.env.LUIE_STRESS_TRACE === "true";

export const SKIP_NONCRITICAL_DERIVED_ON_STRESS =
  process.env.LUIE_E2E_STRESS_MODE === "1" ||
  isTestEnv();

export const SUPPRESS_HOT_PATH_INFO_LOGS =
  process.env.LUIE_E2E_STRESS_MODE === "1";

export const SKIP_DERIVED_ENQUEUE_ON_STRESS =
  process.env.LUIE_E2E_STRESS_MODE === "1";

export const fireAndForget = (
  promise: Promise<unknown>,
  context: string,
) => {
  void promise.catch((error) => {
    chapterLogger.warn(`Deferred task failed: ${context}`, { error });
  });
};

export const perfNow = () => Date.now();

export const logTrace = (
  op: string,
  chapterId: string,
  checkpoints: Record<string, number>,
) => {
  if (!ENABLE_STRESS_TRACE) return;
  chapterLogger.info(`[stress-trace] ${op}`, {
    chapterId,
    ...checkpoints,
  });
};

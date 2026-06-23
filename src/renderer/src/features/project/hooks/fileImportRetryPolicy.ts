export type LuieImportRetryState = {
  attempts: number;
  nextRetryAt: number;
};

const LUIE_IMPORT_RETRY_BASE_DELAY_MS = 1_000;
const LUIE_IMPORT_RETRY_MAX_DELAY_MS = 30_000;
const LUIE_IMPORT_RETRY_MAX_ATTEMPTS = 10;

export const canAttemptLuieImport = (
  state: LuieImportRetryState | undefined,
  nowMs = Date.now(),
): boolean => {
  if (!state) return true;
  return nowMs >= state.nextRetryAt;
};

export const computeLuieImportRetryDelayMs = (attempt: number): number => {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  const exponentialDelay = LUIE_IMPORT_RETRY_BASE_DELAY_MS * (2 ** (normalizedAttempt - 1));
  return Math.min(LUIE_IMPORT_RETRY_MAX_DELAY_MS, exponentialDelay);
};

export const hasReachedLuieImportRetryLimit = (
  state: LuieImportRetryState | undefined,
): boolean => {
  if (!state) return false;
  return state.attempts >= LUIE_IMPORT_RETRY_MAX_ATTEMPTS;
};

export const registerLuieImportFailure = (
  previousState: LuieImportRetryState | undefined,
  nowMs = Date.now(),
): LuieImportRetryState => {
  const attempts = (previousState?.attempts ?? 0) + 1;
  const delayMs = computeLuieImportRetryDelayMs(attempts);
  return {
    attempts,
    nextRetryAt: nowMs + delayMs,
  };
};

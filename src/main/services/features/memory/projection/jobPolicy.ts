const MAX_JOB_ATTEMPTS = 5;
const BASE_RETRY_BACKOFF_MS = 2_000;

export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

export function canRetryMemoryBuildJob(job: {
  status: string;
  attempts: number;
  updatedAt: string;
}): boolean {
  if (job.status === "pending") return true;
  if (job.status !== "failed") return false;
  if (job.attempts >= MAX_JOB_ATTEMPTS) return false;
  const updatedAtMs = Date.parse(job.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return true;
  const backoffMs = BASE_RETRY_BACKOFF_MS * Math.max(1, job.attempts);
  return Date.now() - updatedAtMs >= backoffMs;
}

export { MAX_JOB_ATTEMPTS };

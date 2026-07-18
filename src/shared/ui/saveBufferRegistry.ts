export type SaveBufferFlush = () => void | Promise<void>;

const flushers = new Set<SaveBufferFlush>();

export function registerSaveBufferFlush(flush: SaveBufferFlush): () => void {
  flushers.add(flush);
  return () => flushers.delete(flush);
}

export async function flushSaveBuffers(): Promise<void> {
  const results = await Promise.allSettled(
    [...flushers].map((flush) => Promise.resolve().then(flush)),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) throw failure.reason;
}

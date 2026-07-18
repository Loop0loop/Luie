export type LatestMutationQueue<P, R> = {
  enqueue: (patch: P) => Promise<R | null>;
  flush: () => Promise<void>;
  pendingCount: () => number;
};

type TrackedMutationQueue = Pick<
  LatestMutationQueue<unknown, unknown>,
  "flush" | "pendingCount"
>;

const activeQueues = new Set<TrackedMutationQueue>();

export function createLatestMutationQueue<P, R>(options: {
  merge: (left: P | null, right: P) => P;
  execute: (patch: P) => Promise<R | null>;
  onIdle?: () => void;
}): LatestMutationQueue<P, R> {
  type Waiter = {
    resolve: (result: R | null) => void;
    reject: (error: unknown) => void;
  };
  type Batch = { patch: P; waiters: Waiter[] };

  let pending: Batch | null = null;
  let inFlight: Promise<void> | null = null;
  let unsettledCount = 0;
  let retainedWork = false;

  const syncActiveState = (): void => {
    if (pending || inFlight || unsettledCount > 0) {
      activeQueues.add(queue);
      return;
    }
    activeQueues.delete(queue);
    options.onIdle?.();
  };

  const retainFailedBatch = (batch: Batch): void => {
    const newer = pending;
    pending = newer
      ? {
          patch: options.merge(batch.patch, newer.patch),
          waiters: newer.waiters,
        }
      : { patch: batch.patch, waiters: [] };
  };

  const drain = (): Promise<void> => {
    if (inFlight) return inFlight;

    const run = async (): Promise<void> => {
      const batch = pending;
      if (!batch) return;
      pending = null;
      try {
        const result = await options.execute(batch.patch);
        if (result === null) {
          throw new Error("World entity mutation returned no acknowledgement.");
        }
        retainedWork = false;
        batch.waiters.forEach((waiter) => waiter.resolve(result));
      } catch (error) {
        retainedWork = true;
        retainFailedBatch(batch);
        batch.waiters.forEach((waiter) => waiter.reject(error));
        throw error;
      }
      await run();
    };

    inFlight = run().finally(() => {
      inFlight = null;
      syncActiveState();
    });
    return inFlight;
  };

  const queue: LatestMutationQueue<P, R> = {
    enqueue: (patch) =>
      new Promise<R | null>((resolve, reject) => {
        unsettledCount += 1;
        const waiter: Waiter = {
          resolve: (result) => {
            unsettledCount -= 1;
            syncActiveState();
            resolve(result);
          },
          reject: (error) => {
            unsettledCount -= 1;
            syncActiveState();
            reject(error);
          },
        };
        if (pending) {
          pending.patch = options.merge(pending.patch, patch);
          pending.waiters.push(waiter);
        } else {
          pending = { patch: options.merge(null, patch), waiters: [waiter] };
        }
        syncActiveState();
        void drain().catch(() => undefined);
      }),
    flush: async () => {
      if (inFlight) await inFlight;
      if (pending) await drain();
    },
    pendingCount: () => Math.max(unsettledCount, retainedWork ? 1 : 0),
  };

  return queue;
}

export async function flushWorldEntityMutations(): Promise<void> {
  if (activeQueues.size === 0) return;
  await Promise.all(Array.from(activeQueues, (queue) => queue.flush()));
  await flushWorldEntityMutations();
}

export function getPendingWorldEntityMutationCount(): number {
  return Array.from(activeQueues).reduce(
    (total, queue) => total + queue.pendingCount(),
    0,
  );
}

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
}): LatestMutationQueue<P, R> {
  type Waiter = {
    resolve: (result: R | null) => void;
    reject: (error: unknown) => void;
  };
  type Batch = { patch: P; waiters: Waiter[] };

  let pending: Batch | null = null;
  let inFlight: Promise<void> | null = null;
  let unsettledCount = 0;

  const drain = (): Promise<void> => {
    if (inFlight) return inFlight;

    const run = async (): Promise<void> => {
      const batch = pending;
      if (!batch) return;
      pending = null;
      try {
        const result = await options.execute(batch.patch);
        batch.waiters.forEach((waiter) => waiter.resolve(result));
      } catch (error) {
        batch.waiters.forEach((waiter) => waiter.reject(error));
        throw error;
      }
      await run();
    };

    inFlight = run().finally(() => {
      inFlight = null;
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
            if (unsettledCount === 0) activeQueues.delete(queue);
            resolve(result);
          },
          reject: (error) => {
            unsettledCount -= 1;
            if (unsettledCount === 0) activeQueues.delete(queue);
            reject(error);
          },
        };
        if (pending) {
          pending.patch = options.merge(pending.patch, patch);
          pending.waiters.push(waiter);
        } else {
          pending = { patch: options.merge(null, patch), waiters: [waiter] };
        }
        activeQueues.add(queue);
        void drain().catch(() => undefined);
      }),
    flush: async () => {
      if (inFlight) await inFlight;
      if (pending) await drain();
    },
    pendingCount: () => unsettledCount,
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

export type SaveLatencySummary = {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

export type BootstrapPercentileOptions = {
  percentile: number;
  iterations: number;
  seed: number;
  blockSize?: number;
};

export type ConfidenceInterval = {
  lowerMs: number;
  upperMs: number;
};

const INVALID_SAMPLES_MESSAGE =
  "Save latency samples must be a non-empty list of finite, non-negative numbers.";

function validateSamples(samplesMs: readonly number[]): void {
  if (
    samplesMs.length === 0 ||
    samplesMs.some((sample) => !Number.isFinite(sample) || sample < 0)
  ) {
    throw new RangeError(INVALID_SAMPLES_MESSAGE);
  }
}

function nearestRank(sortedValues: readonly number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  const value = sortedValues[index];
  if (value === undefined) throw new RangeError(INVALID_SAMPLES_MESSAGE);
  return value;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function summarizeSaveLatencies(
  samplesMs: readonly number[],
): SaveLatencySummary {
  validateSamples(samplesMs);
  const sorted = [...samplesMs].sort((left, right) => left - right);
  return {
    p50Ms: nearestRank(sorted, 50),
    p95Ms: nearestRank(sorted, 95),
    p99Ms: nearestRank(sorted, 99),
    maxMs: nearestRank(sorted, 100),
  };
}

export function bootstrapPercentile95ConfidenceInterval(
  samplesMs: readonly number[],
  options: BootstrapPercentileOptions,
): ConfidenceInterval {
  validateSamples(samplesMs);
  if (
    !Number.isFinite(options.percentile) ||
    options.percentile <= 0 ||
    options.percentile > 100
  ) {
    throw new RangeError("Percentile must be greater than 0 and at most 100.");
  }
  if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
    throw new RangeError("Bootstrap iterations must be a positive integer.");
  }
  if (
    !Number.isInteger(options.seed) ||
    options.seed < 0 ||
    options.seed > 0xffff_ffff
  ) {
    throw new RangeError("Bootstrap seed must be an unsigned 32-bit integer.");
  }
  const blockSize = options.blockSize ?? 1;
  if (!Number.isInteger(blockSize) || blockSize <= 0) {
    throw new RangeError("Bootstrap block size must be a positive integer.");
  }

  const random = createSeededRandom(options.seed);
  const statistics: number[] = [];
  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    const resample: number[] = [];
    while (resample.length < samplesMs.length) {
      const start = Math.floor(random() * samplesMs.length);
      for (
        let offset = 0;
        offset < blockSize && resample.length < samplesMs.length;
        offset += 1
      ) {
        const index = (start + offset) % samplesMs.length;
        resample.push(samplesMs[index] as number);
      }
    }
    resample.sort((left, right) => left - right);
    statistics.push(nearestRank(resample, options.percentile));
  }
  statistics.sort((left, right) => left - right);

  return {
    lowerMs: nearestRank(statistics, 2.5),
    upperMs: nearestRank(statistics, 97.5),
  };
}

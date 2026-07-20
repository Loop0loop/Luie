import { describe, expect, it } from "vitest";
import {
  bootstrapPercentile95ConfidenceInterval,
  summarizeSaveLatencies,
} from "../../../src/shared/performance/saveLatencyStatistics.js";

describe("saveLatencyStatistics", () => {
  it("summarizes P50, P95, P99, and max with nearest-rank percentiles", () => {
    const samplesMs = Array.from({ length: 100 }, (_, index) => 100 - index);
    const originalSamples = [...samplesMs];

    expect(summarizeSaveLatencies(samplesMs)).toEqual({
      p50Ms: 50,
      p95Ms: 95,
      p99Ms: 99,
      maxMs: 100,
    });
    expect(samplesMs).toEqual(originalSamples);
  });

  it("returns a deterministic bootstrap percentile interval for the same seed", () => {
    const samplesMs = [10, 13, 15, 18, 21, 24, 28, 31, 35, 40];
    const originalSamples = [...samplesMs];
    const options = {
      percentile: 95,
      iterations: 500,
      seed: 12_345,
      blockSize: 3,
    };

    const first = bootstrapPercentile95ConfidenceInterval(samplesMs, options);
    const second = bootstrapPercentile95ConfidenceInterval(samplesMs, options);

    expect(second).toEqual(first);
    expect(first.lowerMs).toBeLessThanOrEqual(first.upperMs);
    expect(first.lowerMs).toBeGreaterThanOrEqual(10);
    expect(first.upperMs).toBeLessThanOrEqual(40);
    expect(samplesMs).toEqual(originalSamples);
  });

  it("returns an exact bootstrap interval for a constant sample", () => {
    expect(
      bootstrapPercentile95ConfidenceInterval([12.5, 12.5, 12.5], {
        percentile: 95,
        iterations: 100,
        seed: 7,
        blockSize: 2,
      }),
    ).toEqual({ lowerMs: 12.5, upperMs: 12.5 });
  });

  it("preserves correlated runs when block resampling is enabled", () => {
    const correlatedSamples = [
      ...Array.from({ length: 80 }, () => 1),
      ...Array.from({ length: 20 }, () => 10),
    ];
    const baseOptions = { percentile: 95, iterations: 2_000, seed: 123 };

    expect(
      bootstrapPercentile95ConfidenceInterval(correlatedSamples, {
        ...baseOptions,
        blockSize: 1,
      }),
    ).toEqual({ lowerMs: 10, upperMs: 10 });
    expect(
      bootstrapPercentile95ConfidenceInterval(correlatedSamples, {
        ...baseOptions,
        blockSize: 10,
      }),
    ).toEqual({ lowerMs: 1, upperMs: 10 });
  });

  it.each([
    { label: "empty", samplesMs: [] },
    { label: "negative", samplesMs: [1, -1] },
    { label: "NaN", samplesMs: [1, Number.NaN] },
    { label: "infinite", samplesMs: [1, Number.POSITIVE_INFINITY] },
  ])("rejects $label latency samples", ({ samplesMs }) => {
    expect(() => summarizeSaveLatencies(samplesMs)).toThrowError(
      "Save latency samples must be a non-empty list of finite, non-negative numbers.",
    );
  });

  it.each([
    {
      label: "zero percentile",
      options: { percentile: 0, iterations: 100, seed: 1 },
      message: "Percentile must be greater than 0 and at most 100.",
    },
    {
      label: "fractional iterations",
      options: { percentile: 95, iterations: 10.5, seed: 1 },
      message: "Bootstrap iterations must be a positive integer.",
    },
    {
      label: "negative seed",
      options: { percentile: 95, iterations: 100, seed: -1 },
      message: "Bootstrap seed must be an unsigned 32-bit integer.",
    },
    {
      label: "zero block size",
      options: { percentile: 95, iterations: 100, seed: 1, blockSize: 0 },
      message: "Bootstrap block size must be a positive integer.",
    },
  ])("rejects $label", ({ options, message }) => {
    expect(() =>
      bootstrapPercentile95ConfidenceInterval([1, 2, 3], options),
    ).toThrowError(message);
  });
});

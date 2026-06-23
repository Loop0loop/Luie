import { describe, expect, it } from "vitest";
import {
  buildResilienceReport,
  summarizeFullprodReports,
  summarizeQueueDrainReport,
  summarizeWritingLoopSummary,
} from "../../scripts/luie-resilience-report.mjs";

describe("luie resilience report helpers", () => {
  it("summarizes writing-loop repeat pass and latency ranges", () => {
    const summary = summarizeWritingLoopSummary({
      generatedAt: "2026-06-04T06:35:19.584Z",
      config: { runs: 2, chapters: 1000, burstOps: 1000 },
      results: [
        {
          profile: "repeat-1",
          exitCode: 0,
          pass: true,
          metrics: { p95: 3.5, p99: 6.2, max: 1000, above1000msCount: 1 },
        },
        {
          profile: "repeat-2",
          exitCode: 0,
          pass: true,
          metrics: { p95: 4.5, p99: 7.2, max: 900, above1000msCount: 0 },
        },
      ],
    });

    expect(summary).toMatchObject({
      available: true,
      allPassed: true,
      passCount: 2,
      totalRuns: 2,
      latency: {
        p95MinMs: 3.5,
        p95MaxMs: 4.5,
        p99MinMs: 6.2,
        p99MaxMs: 7.2,
        maxMs: 1000,
        above1000msTotal: 1,
      },
    });
  });

  it("summarizes fullprod derived failure and pending queue metrics", () => {
    const summary = summarizeFullprodReports(
      {
        generatedAt: "2026-06-04T06:53:10.825Z",
        config: { runs: 2, chapters: 300, burstOps: 600 },
        results: [
          {
            profile: "fullprod-repeat-1",
            exitCode: 0,
            pass: true,
            metrics: { p95: 9, p99: 18, max: 445, queueDrainMs: 120000 },
          },
          {
            profile: "fullprod-repeat-2",
            exitCode: 0,
            pass: true,
            metrics: { p95: 11, p99: 23, max: 551, queueDrainMs: 120500 },
          },
        ],
      },
      [
        {
          derivedStatus: {
            search: { failedCount: 0, pendingCount: 150 },
            memory: { failedCount: 0, pendingCount: 747 },
          },
        },
        {
          derivedStatus: {
            search: { failedCount: 0, pendingCount: 140 },
            memory: { failedCount: 0, pendingCount: 746 },
          },
        },
      ],
    );

    expect(summary).toMatchObject({
      available: true,
      allPassed: true,
      derivedFailures: {
        searchFailedMax: 0,
        memoryFailedMax: 0,
        failureFree: true,
      },
      pendingQueues: {
        searchPendingMax: 150,
        memoryPendingMax: 747,
      },
      latency: {
        p95MaxMs: 11,
        p99MaxMs: 23,
        maxMs: 551,
        queueDrainMaxMs: 120500,
      },
    });
  });

  it("marks queue drain as observed_pending when fullprod leaves pending work", () => {
    const report = buildResilienceReport({
      generatedAt: "2026-06-04T07:00:00.000Z",
      commandResults: [],
      repeatSummary: {
        available: true,
        allPassed: true,
      },
      fullprodSummary: {
        available: true,
        allPassed: true,
        derivedFailures: {
          failureFree: true,
        },
        pendingQueues: {
          searchPendingMax: 150,
          memoryPendingMax: 747,
        },
      },
    });

    expect(report.assessments).toContainEqual({
      id: "background_queue_drain",
      status: "observed_pending",
      metric: {
        searchPendingMax: 150,
        memoryPendingMax: 747,
      },
    });
  });

  it("summarizes bounded fullprod queue drain when search and memory reach zero", () => {
    const summary = summarizeQueueDrainReport({
      dataset: { chapters: 20, burstOps: 20 },
      saveLatencyMs: { p95: 7.6, p99: 29, count: 40 },
      derivedStatus: {
        queueDrainMs: 69403,
        search: { pendingCount: 0, runningCount: 0, failedCount: 0 },
        memory: { pendingCount: 0, runningCount: 0, failedCount: 0 },
        summary: { pendingCount: 0, runningCount: 0, failedCount: 0, completedCount: 20 },
        embedding: {
          pendingCount: 0,
          runningCount: 0,
          failedCount: 0,
          completedCount: 0,
          skippedCount: 20,
        },
      },
    });

    expect(summary).toMatchObject({
      available: true,
      drained: true,
      failureFree: true,
      queueDrainMs: 69403,
      search: { pendingCount: 0, runningCount: 0, failedCount: 0 },
      memory: { pendingCount: 0, runningCount: 0, failedCount: 0 },
      summary: { pendingCount: 0, runningCount: 0, failedCount: 0, completedCount: 20 },
      embedding: {
        pendingCount: 0,
        runningCount: 0,
        failedCount: 0,
        completedCount: 0,
        skippedCount: 20,
      },
    });
  });

  it("marks bounded fullprod queue drain as passed when the small profile drains", () => {
    const report = buildResilienceReport({
      generatedAt: "2026-06-04T07:00:00.000Z",
      commandResults: [],
      repeatSummary: {
        available: true,
        allPassed: true,
      },
      fullprodSummary: {
        available: true,
        allPassed: true,
        derivedFailures: {
          failureFree: true,
        },
        pendingQueues: {
          searchPendingMax: 150,
          memoryPendingMax: 747,
        },
      },
      queueDrainSmallSummary: {
        available: true,
        drained: true,
        failureFree: true,
        queueDrainMs: 69403,
      },
    });

    expect(report.assessments).toContainEqual({
      id: "background_queue_drain_small_fullprod",
      status: "passed",
      metric: {
        available: true,
        drained: true,
        failureFree: true,
        queueDrainMs: 69403,
      },
    });
  });

  it("marks large fullprod queue drain as passed when all derived queues drain", () => {
    const queueDrainLargeSummary = {
      available: true,
      drained: true,
      failureFree: true,
      queueDrainMs: 68717,
      dataset: { chapters: 300, burstOps: 600 },
      summary: { pendingCount: 0, runningCount: 0, failedCount: 0, completedCount: 300 },
      embedding: {
        pendingCount: 0,
        runningCount: 0,
        failedCount: 0,
        completedCount: 0,
        skippedCount: 300,
      },
    };
    const report = buildResilienceReport({
      generatedAt: "2026-06-04T07:00:00.000Z",
      commandResults: [],
      repeatSummary: {
        available: true,
        allPassed: true,
      },
      fullprodSummary: {
        available: true,
        allPassed: true,
        derivedFailures: {
          failureFree: true,
        },
        pendingQueues: {
          searchPendingMax: 150,
          memoryPendingMax: 747,
        },
      },
      queueDrainLargeSummary,
    });

    expect(report.assessments).toContainEqual({
      id: "background_queue_drain_large_fullprod",
      status: "passed",
      metric: queueDrainLargeSummary,
    });
  });

  it("records direct corruption coverage separately from recovery suites", () => {
    const report = buildResilienceReport({
      generatedAt: "2026-06-04T07:00:00.000Z",
      commandResults: [
        { id: "resilience-vitest-direct", exitCode: 0 },
        { id: "resilience-vitest-db-recovery", exitCode: 0 },
        { id: "resilience-vitest-project-service", exitCode: 0 },
        { id: "resilience-vitest-snapshot", exitCode: 0 },
      ],
      repeatSummary: {
        available: true,
        allPassed: true,
      },
      fullprodSummary: {
        available: true,
        allPassed: true,
        derivedFailures: {
          failureFree: true,
        },
        pendingQueues: {
          searchPendingMax: 0,
          memoryPendingMax: 0,
        },
      },
    });

    expect(report.assessments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "corruption_and_rollback_coverage",
          status: "passed",
          metric: expect.objectContaining({
            suites: expect.arrayContaining([
              "tests/main/services/luieContainer.test.ts",
              "tests/main/services/luiePackageWriter.rollback.test.ts",
            ]),
          }),
        }),
        expect.objectContaining({
          id: "snapshot_and_recovery_regression_coverage",
          status: "passed",
          metric: expect.objectContaining({
            suites: expect.arrayContaining([
              "tests/main/services/dbRecoveryService.test.ts",
              "tests/main/services/projectService.test.ts",
              "tests/main/services/snapshotResilience.test.ts",
            ]),
          }),
        }),
      ]),
    );
  });
});

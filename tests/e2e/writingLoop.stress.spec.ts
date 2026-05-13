import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";

test("measures write-loop stability on 1000x5000 dataset @stress", async () => {
  test.setTimeout(10 * 60 * 1000);
  const { app, page, testDbDir } = await launchApp();

  const summary = await page.evaluate(async () => {
    const api = (window as Window & { api?: Window["api"] }).api;
    if (!api) {
      return {
        ok: false,
        stage: "bootstrap",
        error: { message: "window.api missing" },
      };
    }

    const getEnvNumber = (key: string, fallback: number) => {
      const raw = (window as Window & { process?: { env?: Record<string, string> } })
        .process?.env?.[key];
      if (!raw) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    const chapters = getEnvNumber("LUIE_STRESS_CHAPTERS", 500);
    const contentSize = 5000;
    const content = "가".repeat(contentSize);
    const suffix = Math.floor(Date.now() / 1000);
    const projectPath = `/tmp/writing-loop-${suffix}.luie`;
    const projectRes = (await api.project.create({
      title: `Writing Loop ${suffix}`,
      description: "stress",
      projectPath,
    })) as { success?: boolean; data?: { id: string }; error?: unknown };

    if (!projectRes.success || !projectRes.data?.id) {
      return {
        ok: false,
        stage: "project.create",
        error: projectRes.error ?? { message: "project create failed" },
      };
    }

    const projectId = projectRes.data.id;
    const chapterIds: string[] = [];
    const createStartedAt = performance.now();
    for (let i = 0; i < chapters; i += 1) {
      const res = (await api.chapter.create({
        projectId,
        title: `Chapter ${i + 1}`,
      })) as { success?: boolean; data?: { id?: string }; error?: unknown };
      if (!res.success || !res.data?.id) {
        return {
          ok: false,
          stage: "chapter.create",
          error: res.error ?? { message: `chapter.create failed at ${i + 1}` },
        };
      }
      chapterIds.push(res.data.id);
    }
    const createDurationMs = performance.now() - createStartedAt;

    const saveLatencies: number[] = [];
    const saveStartedAt = performance.now();
    for (let i = 0; i < chapterIds.length; i += 1) {
      const started = performance.now();
      const res = (await api.chapter.update({
        id: chapterIds[i],
        content: `${content}${String(i).padStart(6, "0")}`,
      })) as { success?: boolean; error?: unknown };
      const elapsed = performance.now() - started;
      saveLatencies.push(elapsed);
      if (!res.success) {
        return {
          ok: false,
          stage: "chapter.update.seed",
          error: res.error ?? { message: `chapter.update failed at ${i + 1}` },
        };
      }
    }

    // Autosave-like burst updates while derived jobs are processed in background.
    const burstOps = getEnvNumber("LUIE_STRESS_BURST_OPS", 1000);
    for (let i = 0; i < burstOps; i += 1) {
      const targetChapterId = chapterIds[i % chapterIds.length];
      const started = performance.now();
      const res = (await api.chapter.update({
        id: targetChapterId,
        content: `${content}${String(i).padStart(8, "0")}`,
      })) as { success?: boolean; error?: unknown };
      const elapsed = performance.now() - started;
      saveLatencies.push(elapsed);
      if (!res.success) {
        return {
          ok: false,
          stage: "chapter.update.burst",
          error: res.error ?? { message: `burst update failed at ${i + 1}` },
        };
      }
    }
    const saveDurationMs = performance.now() - saveStartedAt;

    const quantile = (arr: number[], q: number) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * q) - 1),
      );
      return sorted[idx];
    };

    const maxWaitMs = getEnvNumber("LUIE_STRESS_MAX_WAIT_MS", 180_000);
    const waitStart = performance.now();
    let lastSearchStatus: {
      pendingCount?: number;
      runningCount?: number;
      failedCount?: number;
    } | null = null;
    let lastMemoryStatus: {
      pendingCount?: number;
      runningCount?: number;
      failedCount?: number;
    } | null = null;

    while (performance.now() - waitStart < maxWaitMs) {
      const [searchStatusRes, memoryStatusRes] = await Promise.all([
        api.searchAdmin.getIndexStatus(projectId),
        api.memoryAdmin.getJobStatus(projectId),
      ]);

      if (!searchStatusRes.success || !memoryStatusRes.success) {
        return {
          ok: false,
          stage: "status.poll",
          error: {
            searchError: searchStatusRes.success ? null : searchStatusRes.error,
            memoryError: memoryStatusRes.success ? null : memoryStatusRes.error,
          },
        };
      }

      lastSearchStatus = searchStatusRes.data;
      lastMemoryStatus = memoryStatusRes.data;

      const searchDone =
        (searchStatusRes.data.pendingCount ?? 0) === 0 &&
        (searchStatusRes.data.runningCount ?? 0) === 0;
      const memoryDone =
        (memoryStatusRes.data.pendingCount ?? 0) === 0 &&
        (memoryStatusRes.data.runningCount ?? 0) === 0;

      if (searchDone && memoryDone) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const queueDrainMs = performance.now() - waitStart;

    return {
      ok: true,
      dataset: {
        chapters,
        contentSize,
        burstOps,
      },
      createDurationMs,
      saveDurationMs,
      saveLatencyMs: {
        p50: quantile(saveLatencies, 0.5),
        p95: quantile(saveLatencies, 0.95),
        p99: quantile(saveLatencies, 0.99),
        max: Math.max(...saveLatencies),
        avg:
          saveLatencies.reduce((acc, value) => acc + value, 0) /
          saveLatencies.length,
        count: saveLatencies.length,
      },
      derivedStatus: {
        search: lastSearchStatus,
        memory: lastMemoryStatus,
        queueDrainMs,
      },
      projectId,
      projectPath,
    };
  });

  if (!summary.ok) {
    throw new Error(`Writing-loop stress failed at ${summary.stage}: ${JSON.stringify(summary.error)}`);
  }

  const outPath = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    "e2e-writing-loop-bench.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

  test.info().annotations.push({
    type: "writing-loop",
    description: `p95=${summary.saveLatencyMs.p95.toFixed(2)}ms, p99=${summary.saveLatencyMs.p99.toFixed(2)}ms, queueDrain=${summary.derivedStatus.queueDrainMs.toFixed(0)}ms`,
  });

  expect(summary.saveLatencyMs.p95).toBeLessThan(200);
  expect(summary.saveLatencyMs.p99).toBeLessThan(400);
  expect(summary.derivedStatus.search?.failedCount ?? 0).toBe(0);
  expect(summary.derivedStatus.memory?.failedCount ?? 0).toBe(0);
  expect(summary.derivedStatus.search?.pendingCount ?? 0).toBe(0);
  expect(summary.derivedStatus.search?.runningCount ?? 0).toBe(0);
  expect(summary.derivedStatus.memory?.pendingCount ?? 0).toBe(0);
  expect(summary.derivedStatus.memory?.runningCount ?? 0).toBe(0);
  expect(summary.derivedStatus.queueDrainMs).toBeLessThan(180_000);

  await closeApp(app, testDbDir);
});

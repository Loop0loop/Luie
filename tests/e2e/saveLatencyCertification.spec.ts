import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";
import {
  bootstrapPercentile95ConfidenceInterval,
  summarizeSaveLatencies,
} from "../../src/shared/performance/saveLatencyStatistics.js";

const SAVE_MEASURE_NAME = "luie:project-save";
const SAVE_FAILURE_MEASURE_NAME = "luie:project-save:error";
const SAVE_START_MEASURE_NAME = "luie:project-save:start";
const WARMUP_COUNT = 30;
const SAMPLE_COUNT = 200;
const BOOTSTRAP_ITERATIONS = 10_000;
const BOOTSTRAP_SEED = 0x5a_17_19;
const BOOTSTRAP_BLOCK_SIZE = 10;

type AutoSaveResponse = Awaited<ReturnType<Window["api"]["autoSave"]>>;
type SaveLatencyWindow = Window & {
  __luieSaveLatencyPending?: Promise<AutoSaveResponse>;
};
type RawSample = {
  index: number;
  durationMs: number;
  success: boolean;
};

async function runSaveIteration(
  page: Page,
  input: {
    chapterId: string;
    projectId: string;
    content: string;
    shortcut: "Meta+S" | "Control+S";
  },
): Promise<{
  durationMs: number;
  saveSucceeded: boolean;
  autoSaveSucceeded: boolean;
}> {
  await page.evaluate(
    ({ successName, failureName, startName }) => {
      performance.clearMeasures(successName);
      performance.clearMeasures(failureName);
      performance.clearMeasures(startName);
    },
    {
      successName: SAVE_MEASURE_NAME,
      failureName: SAVE_FAILURE_MEASURE_NAME,
      startName: SAVE_START_MEASURE_NAME,
    },
  );
  await page.evaluate(
    ({ chapterId, projectId, content }) => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) throw new Error("window.api missing");
      (window as SaveLatencyWindow).__luieSaveLatencyPending = api.autoSave(
        chapterId,
        content,
        projectId,
      );
    },
    input,
  );

  await page.keyboard.press(input.shortcut);
  const measureHandle = await page.waitForFunction(
    ({ successName, failureName, startName }) => {
      const successEntries = performance.getEntriesByName(successName, "measure");
      const failureEntries = performance.getEntriesByName(failureName, "measure");
      const terminalCount = successEntries.length + failureEntries.length;
      if (terminalCount === 0) return null;
      const entry = successEntries[0] ?? failureEntries[0];
      if (!entry) return null;
      return {
        durationMs: entry.duration,
        succeeded: successEntries.length === 1,
        startCount: performance.getEntriesByName(startName, "measure").length,
        terminalCount,
      };
    },
    {
      successName: SAVE_MEASURE_NAME,
      failureName: SAVE_FAILURE_MEASURE_NAME,
      startName: SAVE_START_MEASURE_NAME,
    },
    { timeout: 30_000, polling: 5 },
  );
  const saveMeasure = await measureHandle.jsonValue();
  await measureHandle.dispose();
  if (saveMeasure.startCount !== 1 || saveMeasure.terminalCount !== 1) {
    throw new Error("Shortcut must produce exactly one project save");
  }

  const autoSaveSucceeded = await page.evaluate(async () => {
    const latencyWindow = window as SaveLatencyWindow;
    const pending = latencyWindow.__luieSaveLatencyPending;
    if (!pending) throw new Error("Pending autosave promise missing");
    try {
      const response = await pending;
      return response.success;
    } catch {
      return false;
    } finally {
      delete latencyWindow.__luieSaveLatencyPending;
    }
  });

  return {
    durationMs: saveMeasure.durationMs,
    saveSucceeded: saveMeasure.succeeded,
    autoSaveSucceeded,
  };
}

test("certifies real Cmd/Ctrl+S save latency through renderer and IPC @e2e", async () => {
  test.setTimeout(20 * 60_000);
  const { app, page, testDbDir } = await launchApp({
    waitForRender: true,
  });
  const suffix = `${process.pid}-${Date.now()}`;
  const projectTitle = `Save Latency ${suffix}`;
  const chapterTitle = "Latency Chapter";
  const projectPath = path.join(testDbDir, `save-latency-${suffix}.luie`);
  const shortcut = process.platform === "darwin" ? "Meta+S" : "Control+S";

  try {
    const created = await page.evaluate(
      async ({ title, chapterTitle: targetChapterTitle, packagePath }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) throw new Error("window.api missing");
        const project = await api.project.create({
          title,
          description: "real save latency certification",
        });
        if (!project.success) return { project, chapter: null, materialized: null };
        const chapter = await api.chapter.create({
          projectId: project.data.id,
          title: targetChapterTitle,
          content: "latency-initial",
          order: 1,
        });
        if (!chapter.success) return { project, chapter, materialized: null };
        const approval = await api.fs.approveProjectPath(packagePath);
        if (!approval.success) {
          return { project, chapter, materialized: approval };
        }
        const materialized = await api.project.materializeLuie(
          project.data.id,
          packagePath,
        );
        return { project, chapter, materialized };
      },
      { title: projectTitle, chapterTitle, packagePath: projectPath },
    );
    if (!created.project.success) {
      throw new Error(`Project fixture failed: ${JSON.stringify(created.project.error)}`);
    }
    if (!created.chapter?.success) {
      throw new Error(`Chapter fixture failed: ${JSON.stringify(created.chapter?.error)}`);
    }
    if (!created.materialized?.success) {
      throw new Error(
        `Package fixture failed: ${JSON.stringify(created.materialized?.error)}`,
      );
    }
    const projectId = created.project.data.id;
    const chapterId = created.chapter.data.id;
    expect(fs.existsSync(projectPath)).toBe(true);

    await page.reload();
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.children.length > 0;
    });
    await page.getByText(projectTitle, { exact: true }).first().click();
    await expect(page.getByTestId("editor-title")).toHaveValue(chapterTitle);
    await page.evaluate((measureName) => performance.clearMeasures(measureName), SAVE_MEASURE_NAME);
    await page.evaluate(
      (measureName) => performance.clearMeasures(measureName),
      SAVE_FAILURE_MEASURE_NAME,
    );

    let warmupFailureCount = 0;
    for (let index = 0; index < WARMUP_COUNT; index += 1) {
      // eslint-disable-next-line no-await-in-loop -- shortcut sample이 겹치면 latency를 분리할 수 없다.
      const result = await runSaveIteration(page, {
        chapterId,
        projectId,
        content: `latency-warmup-${index}-${suffix}`,
        shortcut,
      });
      if (!result.saveSucceeded || !result.autoSaveSucceeded) {
        warmupFailureCount += 1;
      }
    }

    const rawSamples: RawSample[] = [];
    let finalContent = "";
    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      finalContent = `latency-sample-${index}-${suffix}`;
      // eslint-disable-next-line no-await-in-loop -- shortcut sample이 겹치면 latency를 분리할 수 없다.
      const result = await runSaveIteration(page, {
        chapterId,
        projectId,
        content: finalContent,
        shortcut,
      });
      rawSamples.push({
        index,
        durationMs: result.durationMs,
        success: result.saveSucceeded && result.autoSaveSucceeded,
      });
    }

    const successfulDurations = rawSamples
      .filter((sample) => sample.success)
      .map((sample) => sample.durationMs);
    const failureCount = rawSamples.length - successfulDurations.length;
    const statistics = summarizeSaveLatencies(successfulDurations);
    const p95ConfidenceInterval95 = bootstrapPercentile95ConfidenceInterval(
      successfulDurations,
      {
        percentile: 95,
        iterations: BOOTSTRAP_ITERATIONS,
        seed: BOOTSTRAP_SEED,
        blockSize: BOOTSTRAP_BLOCK_SIZE,
      },
    );
    const persistedChapter = await page.evaluate(async (id) => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) throw new Error("window.api missing");
      return await api.chapter.get(id);
    }, chapterId);
    const packagedContent = await page.evaluate(
      async ({ packagePath, chapterId }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) throw new Error("window.api missing");
        return await api.fs.readLuieEntry(
          packagePath,
          `manuscript/${chapterId}.md`,
        );
      },
      { packagePath: projectPath, chapterId },
    );

    expect(warmupFailureCount).toBe(0);
    expect(failureCount).toBe(0);
    expect(rawSamples).toHaveLength(SAMPLE_COUNT);
    expect(
      rawSamples.every(
        (sample) => Number.isFinite(sample.durationMs) && sample.durationMs >= 0,
      ),
    ).toBe(true);
    expect(persistedChapter.success).toBe(true);
    expect(persistedChapter.data?.content).toBe(finalContent);
    expect(packagedContent.success).toBe(true);
    expect(packagedContent.data).toBe(finalContent);
    expect(fs.existsSync(projectPath)).toBe(true);

    const reportPath = process.env.LUIE_SAVE_LATENCY_E2E_REPORT_PATH;
    if (reportPath) {
      const resolvedReportPath = path.resolve(reportPath);
      fs.mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
      const electronRuntime = await app.evaluate(() => ({
        electron: process.versions.electron,
        node: process.versions.node,
        modulesAbi: process.versions.modules,
        napi: process.versions.napi,
      }));
      fs.writeFileSync(
        resolvedReportPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            environment: {
              platform: process.platform,
              arch: process.arch,
              ...electronRuntime,
            },
            source: {
              gitHead: process.env.LUIE_SAVE_LATENCY_GIT_HEAD ?? "unknown",
              harnessSha256:
                process.env.LUIE_SAVE_LATENCY_SOURCE_HASH ?? "unknown",
            },
            scenario: {
              name: "cmd-ctrl-s-full-save",
              warmupCount: WARMUP_COUNT,
              sampleCount: SAMPLE_COUNT,
              bootstrapIterations: BOOTSTRAP_ITERATIONS,
              bootstrapSeed: BOOTSTRAP_SEED,
              bootstrapBlockSize: BOOTSTRAP_BLOCK_SIZE,
            },
            warmupFailureCount,
            failureCount,
            failureRate: failureCount / SAMPLE_COUNT,
            rawSamples,
            statistics,
            p95ConfidenceInterval95,
            integrity: {
              projectId,
              chapterId,
              expectedContent: finalContent,
              persistedChapterContent: persistedChapter.data?.content ?? null,
              packagedContent: packagedContent.data ?? null,
              packageExists: fs.existsSync(projectPath),
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }
  } finally {
    await closeApp(app, testDbDir);
  }
});

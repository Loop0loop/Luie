// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: production world queues and explicit save barriers ACK real SQLite/package writes

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { expect, test, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { autoSaveManager } from "../../../src/main/manager/autoSave/autoSaveManager.js";
import { getProjectRevisionState } from "../../../src/main/services/core/project/projectRevisionStore.js";
import { characterService } from "../../../src/main/services/features/world/entities/characterService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { useCharacterStore } from "../../../src/renderer/src/features/research/stores/characterStore.js";
import { useProjectStore } from "../../../src/renderer/src/features/project/stores/projectStore.js";
import { saveProjectNow } from "../../../src/renderer/src/features/workspace/services/saveCoordinator.js";
import {
  flushWorldEntityMutations,
  getPendingWorldEntityMutationCount,
} from "../../../src/renderer/src/shared/store/worldEntityMutationQueue.js";
import {
  bootstrapPercentile95ConfidenceInterval,
  summarizeSaveLatencies,
} from "../../../src/shared/performance/saveLatencyStatistics.js";
import { registerSaveBufferFlush } from "../../../src/shared/ui/saveBufferRegistry.js";
import type {
  Character,
  CharacterUpdateInput,
  Project,
} from "../../../src/shared/types/index.js";

const adapters = vi.hoisted(() => ({
  characterUpdate: vi.fn(),
  manualSave: vi.fn(),
}));

vi.mock("electron", () => {
  const app = {
    isPackaged: false,
    getPath: () => process.env.LUIE_USER_DATA_PATH ?? process.cwd(),
    getAppPath: () => process.cwd(),
  };
  const electron = {
    app,
    BrowserWindow: undefined,
    nativeTheme: { shouldUseDarkColors: false },
    utilityProcess: {},
  };
  return { ...electron, default: electron };
});

vi.mock("@shared/api", () => {
  const emptyApi = () => ({
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  return {
    api: {
      character: { ...emptyApi(), update: adapters.characterUpdate },
      project: emptyApi(),
      app: { manualSave: adapters.manualSave },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    },
  };
});

vi.mock("@renderer/features/research/utils/worldGraphRefresh", () => ({
  refreshWorldGraph: vi.fn(async () => undefined),
}));

type RawSample = {
  index: number;
  elapsedMs: number;
  success: boolean;
  error?: string;
};

type ScenarioReport = {
  name: string;
  boundary: string;
  operationCountPerSample: number;
  warmupCount: number;
  sampleCount: number;
  failureCount: number;
  failureRate: number;
  rawSamples: RawSample[];
  latencyMs: ReturnType<typeof summarizeSaveLatencies> & {
    p95ConfidenceInterval: ReturnType<
      typeof bootstrapPercentile95ConfidenceInterval
    >;
  };
};

const WARMUP_COUNT = 30;
const SAMPLE_COUNT = 200;
const BOOTSTRAP_ITERATIONS = 10_000;
const BOOTSTRAP_SEED = 20_260_720;
const BOOTSTRAP_BLOCK_SIZE = 10;
const PROJECT_ID = "save-latency-project";
const CHARACTER_ID = "save-latency-character";
const CHAPTER_ID = "save-latency-chapter";

const roundMs = (value: number): number => Math.round(value * 1_000) / 1_000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

async function measureScenario(input: {
  name: string;
  boundary: string;
  operationCountPerSample: number;
  run: (index: number) => Promise<void>;
  verify?: (index: number) => Promise<void>;
}): Promise<ScenarioReport> {
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    // eslint-disable-next-line no-await-in-loop -- benchmark samples must not overlap.
    await input.run(index - WARMUP_COUNT);
    // eslint-disable-next-line no-await-in-loop -- verification belongs to the completed sample.
    await input.verify?.(index - WARMUP_COUNT);
  }

  const rawSamples: RawSample[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    try {
      // eslint-disable-next-line no-await-in-loop -- each latency sample is independent.
      await input.run(index);
      const elapsedMs = roundMs(performance.now() - startedAt);
      // eslint-disable-next-line no-await-in-loop -- verification is excluded from measured latency.
      await input.verify?.(index);
      rawSamples.push({
        index,
        elapsedMs,
        success: true,
      });
    } catch (error) {
      rawSamples.push({
        index,
        elapsedMs: roundMs(performance.now() - startedAt),
        success: false,
        error: errorMessage(error),
      });
    }
  }

  const successfulSamples = rawSamples
    .filter((sample) => sample.success)
    .map((sample) => sample.elapsedMs);
  const failureCount = rawSamples.length - successfulSamples.length;
  if (successfulSamples.length === 0) {
    throw new Error(`${input.name} produced no successful latency samples.`);
  }

  return {
    name: input.name,
    boundary: input.boundary,
    operationCountPerSample: input.operationCountPerSample,
    warmupCount: WARMUP_COUNT,
    sampleCount: SAMPLE_COUNT,
    failureCount,
    failureRate: failureCount / SAMPLE_COUNT,
    rawSamples,
    latencyMs: {
      ...summarizeSaveLatencies(successfulSamples),
      p95ConfidenceInterval: bootstrapPercentile95ConfidenceInterval(
        successfulSamples,
        {
          percentile: 95,
          iterations: BOOTSTRAP_ITERATIONS,
          seed: BOOTSTRAP_SEED,
          blockSize: BOOTSTRAP_BLOCK_SIZE,
        },
      ),
    },
  };
}

test("certifies save latency with real SQLite and package ACKs", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-save-latency-"));
  const projectPath = path.join(tempRoot, "latency.luie");
  const reportPath = path.resolve(
    process.env.LUIE_SAVE_LATENCY_REPORT_PATH ??
      "tests/.tmp/save-latency-certification.json",
  );
  const now = new Date().toISOString();
  const scheduleSpy = vi
    .spyOn(projectService, "schedulePackageExport")
    .mockImplementation(() => undefined);
  let unregisterBuffer = () => undefined;

  const readPersistedCharacter = async (): Promise<string | null> =>
    (
      await db
        .getClient()
        .select({ description: schema.character.description })
        .from(schema.character)
        .where(sql`${schema.character.id} = ${CHARACTER_ID}`)
        .get()
    )?.description ?? null;

  const readPersistedChapter = async (): Promise<string | null> =>
    (
      await db
        .getClient()
        .select({ content: schema.chapterBody.content })
        .from(schema.chapterBody)
        .where(sql`${schema.chapterBody.chapterId} = ${CHAPTER_ID}`)
        .get()
    )?.content ?? null;

  try {
    await db.getClient().insert(schema.project).values({
      id: PROJECT_ID,
      title: "Save Latency Certification",
      revision: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.projectAttachment).values({
      projectId: PROJECT_ID,
      projectPath,
      exportedRevision: 0,
      createdAt: now,
      updatedAt: now,
    });
    const insertedCharacter = await db
      .getClient()
      .insert(schema.character)
      .values({
        id: CHARACTER_ID,
        projectId: PROJECT_ID,
        name: "Latency Character",
        description: "initial",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    await db.getClient().insert(schema.chapter).values({
      id: CHAPTER_ID,
      projectId: PROJECT_ID,
      title: "Latency Chapter",
      content: "",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.chapterBody).values({
      chapterId: CHAPTER_ID,
      content: "initial",
      contentHash: "initial",
      updatedAt: now,
    });

    adapters.characterUpdate.mockImplementation(
      async (input: CharacterUpdateInput) => {
        try {
          return {
            success: true,
            data: await characterService.updateCharacter(input),
          };
        } catch (error) {
          return { success: false, error: { message: errorMessage(error) } };
        }
      },
    );
    adapters.manualSave.mockImplementation(async (projectId: string) => {
      try {
        await autoSaveManager.flushAll();
        await autoSaveManager.flushAll();
        const exported = await projectService.exportProjectPackageNow(
          projectId,
          "manual-save",
        );
        return exported
          ? { success: true, data: { success: true, exported: true } }
          : {
              success: false,
              error: { message: "Failed to export project package" },
            };
      } catch (error) {
        return { success: false, error: { message: errorMessage(error) } };
      }
    });

    const project: Project = {
      id: PROJECT_ID,
      title: "Save Latency Certification",
      description: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    const character = {
      ...insertedCharacter,
      createdAt: new Date(insertedCharacter.createdAt),
      updatedAt: new Date(insertedCharacter.updatedAt),
    } as Character;
    useProjectStore.setState({
      items: [project],
      projects: [project],
      currentItem: project,
      currentProject: project,
    });
    useCharacterStore.setState({
      items: [character],
      characters: [character],
      currentItem: character,
      currentCharacter: character,
    });

    const single = await measureScenario({
      name: "world-single-commit-ack",
      boundary: "characterStore.update -> characterService transaction commit ACK",
      operationCountPerSample: 1,
      run: async (index) => {
        await useCharacterStore.getState().updateCharacter({
          id: CHARACTER_ID,
          description: `single-${index}`,
        });
      },
      verify: async (index) => {
        if ((await readPersistedCharacter()) !== `single-${index}`) {
          throw new Error("Single world mutation ACK did not match SQLite.");
        }
      },
    });

    const burst = await measureScenario({
      name: "world-100-burst-latest-merge",
      boundary: "100 same-entity enqueues -> global queue-empty -> SQLite latest value",
      operationCountPerSample: 100,
      run: async (sampleIndex) => {
        const writes = Array.from({ length: 100 }, (_, patchIndex) =>
          useCharacterStore.getState().updateCharacter({
            id: CHARACTER_ID,
            description: `burst-${sampleIndex}-${patchIndex}`,
          }),
        );
        await flushWorldEntityMutations();
        await Promise.all(writes);
      },
      verify: async (sampleIndex) => {
        if (
          (await readPersistedCharacter()) !== `burst-${sampleIndex}-99` ||
          getPendingWorldEntityMutationCount() !== 0
        ) {
          throw new Error("Burst queue did not persist its latest value.");
        }
      },
    });

    let bufferedRevision = 0;
    unregisterBuffer = registerSaveBufferFlush(async () => {
      bufferedRevision += 1;
      await Promise.all([
        autoSaveManager.triggerSave(
          CHAPTER_ID,
          `chapter-${bufferedRevision}`,
          PROJECT_ID,
        ),
        useCharacterStore.getState().updateCharacter({
          id: CHARACTER_ID,
          description: `barrier-${bufferedRevision}`,
        }),
      ]);
    });
    const coreBarrier = await measureScenario({
      name: "coordinator-main-core-dirty-barrier",
      boundary:
        "saveProjectNow buffer flush -> world queue-empty -> in-process main flush -> .luie export ACK",
      operationCountPerSample: 1,
      run: async () => await saveProjectNow(PROJECT_ID),
      verify: async () => {
        const revision = await getProjectRevisionState(PROJECT_ID);
        const packageExists = await fsp
          .stat(projectPath)
          .then((stat) => stat.isFile())
          .catch(() => false);
        if (
          (await readPersistedCharacter()) !== `barrier-${bufferedRevision}` ||
          (await readPersistedChapter()) !== `chapter-${bufferedRevision}` ||
          revision.revision !== revision.exportedRevision ||
          !packageExists
        ) {
          throw new Error("Explicit save barrier did not converge.");
        }
      },
    });
    unregisterBuffer();
    unregisterBuffer = () => undefined;

    const revisionState = await getProjectRevisionState(PROJECT_ID);
    const sqliteVersion = await db
      .getClient()
      .get<{ version: string }>(sql`SELECT sqlite_version() AS version`);
    const require = createRequire(import.meta.url);
    const betterSqlitePackage = require("better-sqlite3/package.json") as {
      version: string;
    };
    const scenarios = [single, burst, coreBarrier];
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: {
        gitHead: process.env.LUIE_SAVE_LATENCY_GIT_HEAD ?? "unknown",
        harnessSha256:
          process.env.LUIE_SAVE_LATENCY_SOURCE_HASH ?? "direct-test-run",
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model ?? "unknown",
        logicalCpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        electron: process.versions.electron ?? null,
        node: process.versions.node,
        modulesAbi: process.versions.modules,
        napi: process.versions.napi,
        betterSqlite3: betterSqlitePackage.version,
        sqlite: sqliteVersion?.version ?? "unknown",
        pragmas: db.getConnectionPragmas(),
      },
      fixture: {
        projects: 1,
        chapters: 1,
        characters: 1,
        packagePath: path.basename(projectPath),
        warmupCountPerScenario: WARMUP_COUNT,
        sampleCountPerScenario: SAMPLE_COUNT,
        bootstrapIterations: BOOTSTRAP_ITERATIONS,
        bootstrapSeed: BOOTSTRAP_SEED,
        bootstrapBlockSize: BOOTSTRAP_BLOCK_SIZE,
      },
      limitations: [
        "Preload autosave batching and renderer-to-main IPC are replaced by an in-process adapter; this core barrier is not the Cmd/Ctrl+S end-to-end latency artifact.",
        "Production renderer queues, pending main manuscript autosave, main services, SQLite, and package export are real.",
        "Scheduled background package export is disabled during sampling so only explicit barrier export is measured.",
        "Latency is an observational certification artifact, not a cross-machine hard gate.",
      ],
      scenarios,
      integrity: {
        persistedDescription: await readPersistedCharacter(),
        expectedDescription: `barrier-${bufferedRevision}`,
        persistedChapterContent: await readPersistedChapter(),
        expectedChapterContent: `chapter-${bufferedRevision}`,
        revisionState,
        packageExists: await fsp
          .stat(projectPath)
          .then((stat) => stat.isFile())
          .catch(() => false),
      },
    };

    await fsp.mkdir(path.dirname(reportPath), { recursive: true });
    await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    expect(scenarios.every((scenario) => scenario.failureRate === 0)).toBe(true);
    expect(report.integrity.persistedDescription).toBe(
      report.integrity.expectedDescription,
    );
    expect(report.integrity.persistedChapterContent).toBe(
      report.integrity.expectedChapterContent,
    );
    expect(report.integrity.revisionState.exportedRevision).toBe(
      report.integrity.revisionState.revision,
    );
    expect(report.integrity.packageExists).toBe(true);
  } finally {
    unregisterBuffer();
    autoSaveManager.clearProject(PROJECT_ID);
    scheduleSpy.mockRestore();
    await flushWorldEntityMutations().catch(() => undefined);
    await projectService.flushPendingExports();
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}, 180_000);

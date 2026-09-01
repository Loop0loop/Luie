import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";
import {
  buildExtremeChapterBody,
  buildExtremeEntities,
} from "./_helpers/extremeManuscript";

/**
 * 극한 부하: 실제 원고를 닮은 본문에서 타이핑 응답성을 측정한다.
 *
 * WHY 기존 `writingLoop.stress.spec.ts`로 부족한가: 그쪽은 본문을 `"가".repeat(5000)`으로
 * 만들고 **API 저장 지연**만 잰다. 마크가 없고 스마트링크가 걸릴 이름도 없고 블록 구조도
 * 없어서, 집필 중 실제로 비싼 것들(데코레이션 재계산, 중첩 mark 파싱, 노드 수)이 측정에
 * 잡히지 않는다. 그리고 저장 지연은 타이핑 체감과 다른 지표다.
 *
 * 이 스펙이 재는 것
 *   1. 실제 원고형 본문(형광펜·글자색·마크다운 블록·스마트링크 대상 포함) 50회차 시딩 비용
 *   2. 그 상태에서 **에디터에 실제로 타이핑할 때의 키 입력 지연**
 *   3. 파생 큐(검색·메모리) 배수 시간
 *
 * WHY 타이핑을 재는가: 6차 감사에서 확정한 두 핫패스가 여기서만 드러난다 —
 * 전역 keydown 리스너(N16)와 스마트링크 데코레이션 재계산(N20). 둘 다 단위 테스트로
 * 구조는 고정했지만 실제 지연은 미측정으로 남아 있었다(SSOT §5-10, §5-11).
 *
 * 실행: pnpm bench:writing-loop:extreme
 */

type ApiResponse<T> = { success?: boolean; data?: T; error?: unknown };

const toNumber = (raw: string | undefined, fallback: number) => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * q) - 1),
  );
  return sorted[index];
};

test("measures typing latency on mark-heavy 50-chapter manuscript @stress", async () => {
  const chapters = toNumber(process.env.LUIE_EXTREME_CHAPTERS, 50);
  const paragraphs = toNumber(process.env.LUIE_EXTREME_PARAGRAPHS, 40);
  const characterCount = toNumber(process.env.LUIE_EXTREME_CHARACTERS, 6);
  const eventCount = toNumber(process.env.LUIE_EXTREME_EVENTS, 4);
  const keystrokes = toNumber(process.env.LUIE_EXTREME_KEYSTROKES, 200);
  const seed = toNumber(process.env.LUIE_EXTREME_SEED, 20260901);
  const maxWaitMs = toNumber(process.env.LUIE_EXTREME_MAX_WAIT_MS, 120_000);

  // NOTE: 시딩(회차 생성+본문 저장)과 자료 생성, 타이핑, 큐 배수를 합쳐 timeout을 잡는다.
  const estimatedOps = chapters * 2 + characterCount + eventCount + keystrokes;
  const defaultTimeoutMs = estimatedOps * 400 + maxWaitMs + 60_000;
  test.setTimeout(toNumber(process.env.LUIE_EXTREME_TEST_TIMEOUT_MS, defaultTimeoutMs));

  /**
   * 실제 원문으로 재고 싶을 때 쓴다. 파일 한 줄이 한 문장이다.
   * 없으면 생성기의 기본 문장 재료를 쓴다.
   */
  const corpusPath = process.env.LUIE_EXTREME_CORPUS_PATH;
  const corpus = corpusPath
    ? fs
        .readFileSync(corpusPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : undefined;

  const { app, page, testDbDir } = await launchApp({
    envOverrides: {
      LUIE_E2E_STRESS_MODE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_DISABLE_STARTUP_MAINTENANCE: "1",
      LUIE_DISABLE_PACKAGE_EXPORT: "1",
    },
  });

  const call = async <T>(fn: () => Promise<ApiResponse<T>>, label: string) => {
    const started = performance.now();
    const response = await fn();
    const elapsed = performance.now() - started;
    if (!response.success) {
      throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
    }
    return { response, elapsed };
  };

  const suffix = `${Date.now()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  const projectPath = `/tmp/extreme-loop-${suffix}.luie`;

  const project = await call(
    async () =>
      await page.evaluate(async (input) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.project.create(input)) as ApiResponse<{ id: string }>;
      }, {
        title: `Extreme Loop ${suffix}`,
        description: "extreme stress",
        projectPath,
      }),
    "project.create",
  );
  const projectId = project.response.data?.id;
  if (!projectId) throw new Error("project.create returned no project id");

  // 1) 자료 시딩 — 스마트링크가 걸릴 대상을 먼저 만든다.
  const characters = buildExtremeEntities(characterCount, "character");
  const events = buildExtremeEntities(eventCount, "event");

  for (const entity of characters) {
    await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.character.create(input)) as ApiResponse<{ id?: string }>;
        }, { projectId, name: entity.name }),
      `character.create[${entity.name}]`,
    );
  }
  for (const entity of events) {
    await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.event.create(input)) as ApiResponse<{ id?: string }>;
        }, { projectId, name: entity.name }),
      `event.create[${entity.name}]`,
    );
  }

  // 2) 회차 시딩 — 마크·블록·스마트링크가 섞인 본문을 저장한다.
  const seedLatencies: number[] = [];
  const bodySizes: number[] = [];
  const chapterIds: string[] = [];
  const seedStartedAt = performance.now();

  for (let i = 0; i < chapters; i += 1) {
    const created = await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.create(input)) as ApiResponse<{ id?: string }>;
        }, { projectId, title: `${i + 1}회 날개` }),
      `chapter.create[${i}]`,
    );
    const chapterId = created.response.data?.id;
    if (!chapterId) throw new Error(`chapter.create[${i}] returned no id`);
    chapterIds.push(chapterId);

    const body = buildExtremeChapterBody({
      chapterNumber: i + 1,
      seed,
      paragraphs,
      characters,
      events,
      corpus,
    });
    bodySizes.push(body.length);

    const saved = await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.update(input)) as ApiResponse<unknown>;
        }, { id: chapterId, projectId, content: body }),
      `chapter.update[${i}]`,
    );
    seedLatencies.push(saved.elapsed);
  }
  const seedDurationMs = performance.now() - seedStartedAt;

  // 3) 타이핑 지연 측정 — 에디터를 실제로 열고 키를 넣는다.
  await page.evaluate(async (input) => {
    const api = (window as Window & { api?: Window["api"] }).api;
    if (!api) return;
    // 자료 store가 채워져야 스마트링크 데코레이션이 활성화된다.
    await Promise.all([
      api.character.getAll(input.projectId),
      api.event.getAll(input.projectId),
    ]);
  }, { projectId });

  const editorSelector = ".tiptap .ProseMirror";
  const editorReady = await page
    .locator(editorSelector)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  /**
   * WHY 측정 실패를 던지지 않고 기록하는가: 에디터 진입 경로는 레이아웃 모드에 따라
   * 달라진다. 시딩·저장 지표는 이미 유효하므로, 타이핑 구간만 건너뛰고 결과에
   * 명시하는 편이 전체 측정을 버리는 것보다 낫다.
   */
  const typingLatencies: number[] = [];
  if (editorReady) {
    const editor = page.locator(editorSelector).first();
    await editor.click();

    for (let i = 0; i < keystrokes; i += 1) {
      const started = performance.now();
      await editor.press("가");
      // 입력이 화면에 반영될 때까지 한 프레임 기다린다. 이게 체감 지연에 가깝다.
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
      typingLatencies.push(performance.now() - started);
    }
  }

  // 4) 파생 큐 배수 대기
  const waitStart = performance.now();
  let lastSearchStatus: Record<string, unknown> | null = null;
  let lastMemoryStatus: Record<string, unknown> | null = null;
  while (performance.now() - waitStart < maxWaitMs) {
    const status = await call(
      async () =>
        await page.evaluate(async (inputProjectId) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          const [search, memory] = await Promise.all([
            api.searchAdmin.getIndexStatus(inputProjectId),
            api.memoryAdmin.getJobStatus(inputProjectId),
          ]);
          if (!search.success || !memory.success) {
            return { success: false, error: { search: search.error, memory: memory.error } };
          }
          return { success: true, data: { search: search.data, memory: memory.data } };
        }, projectId),
      "status.poll",
    );

    const data = status.response.data as {
      search: { pendingCount?: number; runningCount?: number; failedCount?: number };
      memory: { pendingCount?: number; runningCount?: number; failedCount?: number };
    };
    lastSearchStatus = data.search;
    lastMemoryStatus = data.memory;

    const searchDone =
      (data.search.pendingCount ?? 0) === 0 && (data.search.runningCount ?? 0) === 0;
    const memoryDone =
      (data.memory.pendingCount ?? 0) === 0 && (data.memory.runningCount ?? 0) === 0;
    if (searchDone && memoryDone) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const queueDrainMs = performance.now() - waitStart;

  const summary = {
    dataset: {
      chapters,
      paragraphs,
      characterCount,
      eventCount,
      keystrokes,
      seed,
      corpusPath: corpusPath ?? null,
      bodyBytes: {
        min: Math.min(...bodySizes),
        max: Math.max(...bodySizes),
        avg: bodySizes.reduce((sum, value) => sum + value, 0) / bodySizes.length,
        total: bodySizes.reduce((sum, value) => sum + value, 0),
      },
    },
    seedDurationMs,
    seedLatencyMs: {
      p50: quantile(seedLatencies, 0.5),
      p95: quantile(seedLatencies, 0.95),
      p99: quantile(seedLatencies, 0.99),
      max: Math.max(...seedLatencies),
      count: seedLatencies.length,
    },
    typing: editorReady
      ? {
          measured: true,
          latencyMs: {
            p50: quantile(typingLatencies, 0.5),
            p95: quantile(typingLatencies, 0.95),
            p99: quantile(typingLatencies, 0.99),
            max: Math.max(...typingLatencies),
            avg:
              typingLatencies.reduce((sum, value) => sum + value, 0) /
              typingLatencies.length,
            count: typingLatencies.length,
          },
        }
      : { measured: false, reason: "editor surface not visible" },
    derivedStatus: {
      search: lastSearchStatus,
      memory: lastMemoryStatus,
      queueDrainMs,
    },
    projectId,
    projectPath,
  };

  const outPath = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    "e2e-extreme-loop-bench.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

  const typingNote = summary.typing.measured
    ? `typing p95=${summary.typing.latencyMs.p95.toFixed(2)}ms`
    : "typing skipped";
  test.info().annotations.push({
    type: "extreme-loop",
    description: `seed p95=${summary.seedLatencyMs.p95.toFixed(2)}ms, ${typingNote}, queueDrain=${queueDrainMs.toFixed(0)}ms`,
  });

  // 시딩 저장 지연은 기존 stress spec과 같은 기준을 쓴다.
  expect(summary.seedLatencyMs.p95).toBeLessThan(500);
  expect(summary.seedLatencyMs.p99).toBeLessThan(1000);
  expect((lastSearchStatus as { failedCount?: number } | null)?.failedCount ?? 0).toBe(0);
  expect((lastMemoryStatus as { failedCount?: number } | null)?.failedCount ?? 0).toBe(0);

  await closeApp(app, testDbDir);
});

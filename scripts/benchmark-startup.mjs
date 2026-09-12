import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function parseOptions(args) {
  const options = {
    runs: 3,
    profile: "fresh",
    timeoutMs: 30_000,
    scenario: "intro",
  };
  for (let i = 0; i < args.length; i += 2) {
    const [key, value] = [args[i], args[i + 1]];
    if (key === "--profile" && ["fresh", "repeat"].includes(value))
      options.profile = value;
    else if (key === "--scenario" && ["intro", "resize"].includes(value))
      options.scenario = value;
    else if (
      key === "--runs" &&
      /^\d+$/.test(value ?? "") &&
      +value >= 1 &&
      +value <= 100
    )
      options.runs = +value;
    else if (
      key === "--timeout-ms" &&
      /^\d+$/.test(value ?? "") &&
      +value >= 1000 &&
      +value <= 120000
    )
      options.timeoutMs = +value;
    else throw new Error(`Invalid option: ${key} ${value ?? ""}`);
  }
  return options;
}

export function summarize(runs) {
  const successful = runs.filter((run) => run.status === "passed");
  const values = successful
    .map((run) => run.introObservedMs)
    .sort((a, b) => a - b);
  if (values.some((value) => !Number.isFinite(value) || value < 0))
    throw new Error("Invalid measurement");
  const n = values.length;
  return {
    attempted: runs.length,
    passed: n,
    failed: runs.length - n,
    // 실패는 별도 계수하며 성공 표본 통계를 전체 실행의 통과로 해석하지 않는다.
    successfulIntroMedianMs: n
      ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2
      : null,
    successfulIntroP95Ms: n >= 20 ? values[Math.ceil(n * 0.95) - 1] : null,
  };
}

async function deadline(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timeout after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForOpaqueHeading(page, heading) {
  const element = await heading.elementHandle();
  try {
    await page.waitForFunction((target) => {
      let opacity = 1;
      for (let current = target; current; current = current.parentElement) {
        opacity *= Number(getComputedStyle(current).opacity);
      }
      return target.isConnected && opacity >= 0.99;
    }, element);
  } finally {
    await element.dispose();
  }
}

export async function main() {
  const options = parseOptions(process.argv.slice(2));
  const repo = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const artifacts = {};
  for (const name of [
    "out/main/index.js",
    "out/preload/index.cjs",
    "out/renderer/index.html",
    "pnpm-lock.yaml",
    "scripts/benchmark-startup.mjs",
    "scripts/startup-probe.cjs",
  ]) {
    artifacts[name] = createHash("sha256")
      .update(await readFile(path.join(repo, name)))
      .digest("hex");
  }
  const { _electron: electron } = await import("@playwright/test");
  const output = await mkdtemp(path.join(os.tmpdir(), "luie-p0-"));
  console.log(`P0 evidence: ${output}`);
  const report = {
    schemaVersion: 2,
    startedAt: new Date().toISOString(),
    kind: "instrumented-unpackaged-controlled",
    options,
    artifacts,
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim(),
    dirty: !!execFileSync("git", ["status", "--porcelain"], {
      cwd: repo,
      encoding: "utf8",
    }).trim(),
    host: {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    controls: [
      "isolated-userData-and-DB",
      "protocol-registration-stubbed-false",
      "sync-disabled",
      "llmfit-release-503",
      "Playwright-inspector",
      "empty-profile-app-exit-no-shutdown-certification",
    ],
    runs: [],
  };
  // launch 실패도 기록하되 Node의 기본 실패 종료는 억제하지 않는다.
  process.once("uncaughtExceptionMonitor", (error) => {
    report.fatalError = String(error);
    const currentRun = report.runs.at(-1);
    if (currentRun) currentRun.status = "failed";
    report.summary = summarize(report.runs);
    writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify(report, null, 2),
    );
  });
  const token = randomUUID();
  for (let index = 0; index < options.runs; index++) {
    const profile = path.join(
      output,
      options.profile === "fresh" ? `profile-${index + 1}` : "profile-repeat",
    );
    await mkdir(profile, { recursive: true });
    await writeFile(path.join(profile, ".luie-p0-owner"), token);
    const run = {
      index: index + 1,
      status: "failed",
      phase: "launch",
      profile,
    };
    report.runs.push(run);
    await writeFile(
      path.join(output, "report.json"),
      JSON.stringify(report, null, 2),
    );
    let application;
    const started = performance.now();
    try {
      // 기존 shell의 인증/테스트/DB 플래그를 이어받지 않는다. OS 실행 필수 환경은 유지한다.
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) =>
            !/^(LUIE_|E2E_|DATABASE_URL$|CACHE_DATABASE_URL$|ELECTRON_|NODE_OPTIONS$|VITE_)/.test(
              key,
            ),
        ),
      );
      application = await electron.launch({
        cwd: repo,
        args: [path.join(repo, "scripts/startup-probe.cjs")],
        env: {
          ...env,
          LUIE_P0_CONFIG: JSON.stringify({ repo, profile, token }),
        },
        timeout: options.timeoutMs,
      });
      run.automationConnectedMs = performance.now() - started;
      await deadline(
        (async () => {
          run.phase = "intro";
          const page = await application.firstWindow({
            timeout: options.timeoutMs,
          });
          page.setDefaultTimeout(options.timeoutMs);
          const introHeading = page.getByRole("heading", {
            name: /^(Luie에 오신 것을 환영합니다|Welcome to Luie|Luieへようこそ)$/,
          });
          await introHeading.waitFor();
          run.introObservedMs = performance.now() - started;
          await waitForOpaqueHeading(page, introHeading);
          run.introOpaqueObservedMs = performance.now() - started;
          run.renderer = await page.evaluate(() => ({
            timeOrigin: performance.timeOrigin,
            observedAtMs: performance.now(),
            navigation: performance
              .getEntriesByType("navigation")
              .map((entry) => entry.toJSON()),
            paint: performance
              .getEntriesByType("paint")
              .map((entry) => entry.toJSON()),
            width: innerWidth,
            height: innerHeight,
            devicePixelRatio,
          }));
          run.phase = "start-button";
          const clicked = performance.now();
          await page
            .getByRole("button", { name: /^(시작하기|Get Started|はじめる)$/ })
            .click();
          const modelHeading = page.getByRole("heading", {
            name: /^(Luie가 이야기를 기억할 수 있게 준비할게요|Let's get Luie ready to remember your story|Luieが物語を覚えられるように準備します)$/,
          });
          await modelHeading.waitFor();
          run.modelObservedAfterClickRequestMs = performance.now() - clicked;
          await waitForOpaqueHeading(page, modelHeading);
          run.modelOpaqueObservedAfterClickRequestMs =
            performance.now() - clicked;
          if (options.scenario === "resize") {
            run.phase = "resize-preview";
            run.resize = {
              before: await application.evaluate(
                ({ BrowserWindow, systemPreferences }) => {
                  const win = BrowserWindow.getAllWindows()[0];
                  win.once("resized", () => {
                    globalThis.__luieStartupProbe.resizeCompletedAt =
                      Date.now();
                  });
                  return {
                    bounds: win.getBounds(),
                    animationSettings: systemPreferences.getAnimationSettings(),
                  };
                },
              ),
            };
            await page.evaluate(() => {
              const states = [];
              const capture = () => {
                const state = {
                  busy: !!document.querySelector('[aria-busy="true"]'),
                  editor: !!document.querySelector(".ProseMirror"),
                };
                const last = states.at(-1);
                if (
                  states.length < 16 &&
                  (!last ||
                    state.busy !== last.busy ||
                    state.editor !== last.editor)
                ) {
                  states.push({ ...state, at: Date.now() });
                }
              };
              const observer = new MutationObserver(capture);
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["aria-busy"],
              });
              capture();
              globalThis.__luieResizeSmoke = { states, observer };
            });
            await page
              .getByRole("button", { name: /^(건너뛰기|Skip|スキップ)$/ })
              .click();
            await page
              .locator(".ProseMirror")
              .first()
              .waitFor({ state: "visible" });
            run.resize.states = await page.evaluate(() => {
              const { states, observer } = globalThis.__luieResizeSmoke;
              observer.disconnect();
              return states;
            });
            run.resize.after = await application.evaluate(
              ({ BrowserWindow }) => ({
                bounds: BrowserWindow.getAllWindows()[0].getBounds(),
                resizedAt:
                  globalThis.__luieStartupProbe.resizeCompletedAt ?? null,
              }),
            );
            if (
              !run.resize.states.some((state) => state.busy && !state.editor) ||
              run.resize.states.some((state) => state.busy && state.editor) ||
              !run.resize.states.at(-1)?.editor
            ) {
              throw new Error(
                "Background-only resize / preview transition not observed",
              );
            }
          }
          run.phase = "snapshot";
          run.main = await application.evaluate(({ app, BrowserWindow }) => ({
            versions: process.versions,
            arch: process.arch,
            userData: app.getPath("userData"),
            probe: globalThis.__luieStartupProbe,
            gpuFeatures: globalThis.__luieStartupProbe.gpuStatusReady
              ? app.getGPUFeatureStatus()
              : null,
            // 1회 CPU 값은 구간 비교에 부적합하므로 메모리만 남긴다. GPU utilization이 아니다.
            processes: app
              .getAppMetrics()
              .map(({ pid, type, creationTime, memory }) => ({
                pid,
                type,
                creationTime,
                memory,
              })),
            windows: BrowserWindow.getAllWindows().map((window) => ({
              id: window.id,
              visible: window.isVisible(),
              focused: window.isFocused(),
              bounds: window.getBounds(),
            })),
          }));
          if (path.resolve(run.main.userData) !== profile)
            throw new Error("userData isolation mismatch");
          await page.screenshot({
            path: path.join(output, `run-${index + 1}.png`),
          });
        })(),
        options.timeoutMs,
      );
      // race는 내부 I/O를 취소하지 않는다. 늦은 완료가 timeout 실패를 덮지 않게 한다.
      run.status = "passed";
      run.phase = "complete";
    } catch (error) {
      run.error = String(error);
    } finally {
      if (application) {
        try {
          // 빈 테스트 프로필만 종료한다. 실제 저장/flush/종료 검증을 대체하지 않는다.
          run.cleanupMode = "empty-profile-app-exit";
          const closed = application.waitForEvent("close", { timeout: 10000 });
          await Promise.all([
            application.evaluate(({ app }) => {
              setTimeout(() => app.exit(0), 50);
            }),
            closed,
          ]);
        } catch (error) {
          run.status = "failed";
          run.cleanupError = String(error);
          application.process().kill("SIGKILL");
        }
      }
      report.summary = summarize(report.runs);
      await writeFile(
        path.join(output, "report.json"),
        JSON.stringify(report, null, 2),
      );
    }
    console.log(JSON.stringify(run));
    if (run.cleanupError) break;
  }
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed || report.runs.length !== options.runs)
    process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const runs = Number.parseInt(process.env.LUIE_FULLPROD_RUNS ?? "3", 10);
const chapters = Number.parseInt(process.env.LUIE_FULLPROD_CHAPTERS ?? "300", 10);
const burstOps = Number.parseInt(process.env.LUIE_FULLPROD_BURST_OPS ?? "600", 10);
const maxWaitMs = Number.parseInt(process.env.LUIE_FULLPROD_MAX_WAIT_MS ?? "120000", 10);
const p95Limit = Number.parseFloat(process.env.LUIE_FULLPROD_ASSERT_P95_MS ?? "800");
const p99Limit = Number.parseFloat(process.env.LUIE_FULLPROD_ASSERT_P99_MS ?? "2000");

const summary = {
  generatedAt: new Date().toISOString(),
  config: { runs, chapters, burstOps, maxWaitMs, p95Limit, p99Limit },
  results: [],
};

for (let i = 1; i <= runs; i += 1) {
  const profile = `fullprod-repeat-${i}`;
  console.log(`[writing-loop-fullprod-repeat] run=${i}/${runs} profile=${profile}`);
  const env = {
    ...process.env,
    LUIE_FULLPROD_PROFILE: profile,
    LUIE_FULLPROD_CHAPTERS: String(chapters),
    LUIE_FULLPROD_BURST_OPS: String(burstOps),
    LUIE_FULLPROD_MAX_WAIT_MS: String(maxWaitMs),
  };

  const run = spawnSync(
    "bunx",
    ["playwright", "test", "--project=stress", "tests/e2e/writingLoop.fullprod.spec.ts"],
    { env, stdio: "inherit", shell: false },
  );

  const reportPath = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    `e2e-writing-loop-fullprod-${profile}.json`,
  );

  const result = {
    run: i,
    profile,
    exitCode: run.status ?? null,
    signal: run.signal ?? null,
    reportPath,
    metrics: null,
    pass: false,
  };

  if (fs.existsSync(reportPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const p95 = parsed?.saveLatencyMs?.p95 ?? null;
      const p99 = parsed?.saveLatencyMs?.p99 ?? null;
      const max = parsed?.saveLatencyMs?.max ?? null;
      const queueDrainMs = parsed?.derivedStatus?.queueDrainMs ?? null;
      result.metrics = { p95, p99, max, queueDrainMs };
      result.pass =
        typeof p95 === "number" &&
        typeof p99 === "number" &&
        p95 < p95Limit &&
        p99 < p99Limit &&
        run.status === 0;
    } catch {
      // no-op
    }
  }

  summary.results.push(result);
  if (run.status !== 0) break;
}

const outPath = path.join(
  process.cwd(),
  "tests",
  ".tmp",
  "e2e-writing-loop-fullprod-repeat-summary.json",
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

const total = summary.results.length;
const passed = summary.results.filter((item) => item.pass).length;
console.log(`[writing-loop-fullprod-repeat] passed ${passed}/${total}`);
console.log(`[writing-loop-fullprod-repeat] summary written: ${outPath}`);

if (passed !== runs) {
  process.exit(1);
}

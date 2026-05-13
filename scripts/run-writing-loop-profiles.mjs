import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const profiles = [
  { name: "p50", chapters: 50, burstOps: 100, maxWaitMs: 60_000 },
  { name: "p200", chapters: 200, burstOps: 400, maxWaitMs: 90_000 },
  { name: "p500", chapters: 500, burstOps: 1000, maxWaitMs: 120_000 },
];

const args = process.argv.slice(2);
const include500 = args.includes("--include-500");
const selected = include500 ? profiles : profiles.slice(0, 2);

const summary = {
  generatedAt: new Date().toISOString(),
  selectedProfiles: selected.map((profile) => profile.name),
  results: [],
};

for (const profile of selected) {
  console.log(`[writing-loop] running profile=${profile.name} chapters=${profile.chapters} burstOps=${profile.burstOps}`);
  const env = {
    ...process.env,
    LUIE_STRESS_PROFILE: profile.name,
    LUIE_STRESS_CHAPTERS: String(profile.chapters),
    LUIE_STRESS_BURST_OPS: String(profile.burstOps),
    LUIE_STRESS_MAX_WAIT_MS: String(profile.maxWaitMs),
  };

  const run = spawnSync(
    "bunx",
    [
      "playwright",
      "test",
      "--project=stress",
      "tests/e2e/writingLoop.stress.spec.ts",
    ],
    {
      env,
      stdio: "inherit",
      shell: false,
    },
  );

  const reportPath = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    `e2e-writing-loop-bench-${profile.name}.json`,
  );

  const result = {
    profile: profile.name,
    exitCode: run.status ?? null,
    signal: run.signal ?? null,
    reportPath,
    metrics: null,
  };

  if (fs.existsSync(reportPath)) {
    try {
      const raw = fs.readFileSync(reportPath, "utf8");
      const parsed = JSON.parse(raw);
      result.metrics = {
        saveP95Ms: parsed?.saveLatencyMs?.p95 ?? null,
        saveP99Ms: parsed?.saveLatencyMs?.p99 ?? null,
        queueDrainMs: parsed?.derivedStatus?.queueDrainMs ?? null,
      };
    } catch {
      // no-op
    }
  }

  summary.results.push(result);
  if (run.status !== 0) {
    console.error(`[writing-loop] profile failed: ${profile.name}`);
    break;
  }
}

const outPath = path.join(
  process.cwd(),
  "tests",
  ".tmp",
  "e2e-writing-loop-summary.json",
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
console.log(`[writing-loop] summary written: ${outPath}`);

const hasFailure = summary.results.some((item) => item.exitCode !== 0);
if (hasFailure) {
  process.exit(1);
}

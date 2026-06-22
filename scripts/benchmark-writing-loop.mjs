import { DatabaseSync } from "node:sqlite";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outDir = "/tmp/luie-bench";
fs.mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  if (idx < 0) return fallback;
  return args[idx + 1] ?? fallback;
};
const hasFlag = (name) => args.includes(name);

const chapters = Number(getArg("--chapters", "1000"));
const chars = Number(getArg("--chars", "5000"));
const saveOps = Number(getArg("--save-ops", "5000"));
const workerBatch = Number(getArg("--worker-batch", "20"));
const workerTickEvery = Number(getArg("--worker-tick-every", "10"));
const jsonOutPath = getArg("--json-out", null);
const assertMode = hasFlag("--assert");

const thresholds = {
  saveP95Ms: Number(getArg("--max-save-p95-ms", "40")),
  saveP99Ms: Number(getArg("--max-save-p99-ms", "70")),
  queueDrainMs: Number(getArg("--max-queue-drain-ms", "3000")),
};

const nowIso = () => new Date().toISOString();
const lorem = (size) => "가".repeat(size);
const hrMs = (start) => Number(process.hrtime.bigint() - start) / 1_000_000;
const hashContent = (value) =>
  createHash("sha256").update(value).digest("hex");

const quantile = (values, q) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[idx];
};

const dbPath = path.join(outDir, `write-loop-${chapters}x${chars}.sqlite`);
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = FULL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE Project (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
  CREATE TABLE Chapter (id TEXT PRIMARY KEY NOT NULL, projectId TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', synopsis TEXT, "order" INTEGER NOT NULL, wordCount INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT);
  CREATE TABLE ChapterBody (chapterId TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL DEFAULT '', contentHash TEXT NOT NULL DEFAULT '', updatedAt TEXT NOT NULL);
  CREATE TABLE SearchDirtyQueue (id TEXT PRIMARY KEY NOT NULL, projectId TEXT NOT NULL, sourceType TEXT NOT NULL, sourceId TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, error TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
  CREATE TABLE MemoryBuildJob (id TEXT PRIMARY KEY NOT NULL, projectId TEXT NOT NULL, targetType TEXT NOT NULL, targetId TEXT NOT NULL, jobType TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', priority INTEGER NOT NULL DEFAULT 50, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
  CREATE INDEX Chapter_projectId_order_idx ON Chapter(projectId, "order");
  CREATE INDEX SearchDirtyQueue_projectId_status_idx ON SearchDirtyQueue(projectId, status);
  CREATE INDEX MemoryBuildJob_projectId_status_priority_idx ON MemoryBuildJob(projectId, status, priority);
`);

const projectId = randomUUID();
const bootTs = nowIso();
db.prepare("INSERT INTO Project (id,title,createdAt,updatedAt) VALUES (?,?,?,?)").run(
  projectId,
  "write-loop",
  bootTs,
  bootTs,
);

const insertChapter = db.prepare(
  "INSERT INTO Chapter (id,projectId,title,content,synopsis,\"order\",wordCount,createdAt,updatedAt,deletedAt) VALUES (?,?,?,?,?,?,?,?,?,NULL)",
);
const insertBody = db.prepare(
  "INSERT INTO ChapterBody (chapterId,content,contentHash,updatedAt) VALUES (?,?,?,?)",
);

const seedStart = process.hrtime.bigint();
const chapterIds = [];
db.exec("BEGIN TRANSACTION;");
try {
  for (let i = 0; i < chapters; i += 1) {
    const id = randomUUID();
    const content = lorem(chars);
    const ts = nowIso();
    chapterIds.push(id);
    insertChapter.run(
      id,
      projectId,
      `Chapter ${i + 1}`,
      "",
      null,
      i + 1,
      content.length,
      ts,
      ts,
    );
    insertBody.run(id, content, hashContent(content), ts);
  }
  db.exec("COMMIT;");
} catch (error) {
  db.exec("ROLLBACK;");
  throw error;
}
const seedMs = Number(hrMs(seedStart).toFixed(2));

const updateChapterMeta = db.prepare(
  "UPDATE Chapter SET wordCount=?, updatedAt=? WHERE id=?",
);
const updateBody = db.prepare(
  "UPDATE ChapterBody SET content=?, contentHash=?, updatedAt=? WHERE chapterId=?",
);
const insertSearchDirty = db.prepare(
  "INSERT INTO SearchDirtyQueue (id,projectId,sourceType,sourceId,reason,status,attempts,createdAt,updatedAt) VALUES (?,?,?,?,?,'pending',0,?,?)",
);
const insertMemoryJob = db.prepare(
  "INSERT INTO MemoryBuildJob (id,projectId,targetType,targetId,jobType,status,priority,attempts,createdAt,updatedAt) VALUES (?,?,?,?,?,'pending',100,0,?,?)",
);

const drainSearchPick = db.prepare(
  "SELECT id FROM SearchDirtyQueue WHERE status='pending' ORDER BY createdAt LIMIT ?",
);
const drainMemoryPick = db.prepare(
  "SELECT id FROM MemoryBuildJob WHERE status='pending' ORDER BY priority DESC, createdAt LIMIT ?",
);
const markSearchDone = db.prepare(
  "UPDATE SearchDirtyQueue SET status='completed', updatedAt=? WHERE id=?",
);
const markMemoryDone = db.prepare(
  "UPDATE MemoryBuildJob SET status='completed', updatedAt=? WHERE id=?",
);

const processWorkerTick = (batchSize) => {
  const ts = nowIso();
  const searchRows = drainSearchPick.all(batchSize);
  const memoryRows = drainMemoryPick.all(batchSize);
  db.exec("BEGIN TRANSACTION;");
  try {
    for (const row of searchRows) {
      markSearchDone.run(ts, row.id);
    }
    for (const row of memoryRows) {
      markMemoryDone.run(ts, row.id);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return {
    searchDone: searchRows.length,
    memoryDone: memoryRows.length,
  };
};

const saveLatencies = [];
let workerProcessedSearch = 0;
let workerProcessedMemory = 0;

for (let i = 0; i < saveOps; i += 1) {
  const chapterId = chapterIds[i % chapterIds.length];
  const content = `${lorem(chars - 24)}${String(i).padStart(24, "0")}`;
  const contentHash = hashContent(content);
  const started = process.hrtime.bigint();
  const ts = nowIso();

  db.exec("BEGIN TRANSACTION;");
  try {
    updateChapterMeta.run(content.length, ts, chapterId);
    updateBody.run(content, contentHash, ts, chapterId);
    insertSearchDirty.run(
      randomUUID(),
      projectId,
      "chapter",
      chapterId,
      "autosave",
      ts,
      ts,
    );
    insertMemoryJob.run(
      randomUUID(),
      projectId,
      "chapter",
      chapterId,
      "rebuild_chunks",
      ts,
      ts,
    );
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  saveLatencies.push(hrMs(started));

  if ((i + 1) % workerTickEvery === 0) {
    const result = processWorkerTick(workerBatch);
    workerProcessedSearch += result.searchDone;
    workerProcessedMemory += result.memoryDone;
  }
}

const drainStart = process.hrtime.bigint();
while (true) {
  const pending = db
    .prepare(
      "SELECT (SELECT count(*) FROM SearchDirtyQueue WHERE status='pending') as searchPending, (SELECT count(*) FROM MemoryBuildJob WHERE status='pending') as memoryPending",
    )
    .get();
  if (pending.searchPending === 0 && pending.memoryPending === 0) break;
  const result = processWorkerTick(workerBatch);
  workerProcessedSearch += result.searchDone;
  workerProcessedMemory += result.memoryDone;
}
const queueDrainMs = Number(hrMs(drainStart).toFixed(2));

const finalPending = db
  .prepare(
    "SELECT (SELECT count(*) FROM SearchDirtyQueue WHERE status='pending') as searchPending, (SELECT count(*) FROM MemoryBuildJob WHERE status='pending') as memoryPending",
  )
  .get();

const summary = {
  dataset: { chapters, chars, saveOps },
  worker: { workerBatch, workerTickEvery },
  seedMs,
  saveLatencyMs: {
    p50: Number(quantile(saveLatencies, 0.5).toFixed(3)),
    p95: Number(quantile(saveLatencies, 0.95).toFixed(3)),
    p99: Number(quantile(saveLatencies, 0.99).toFixed(3)),
    max: Number(Math.max(...saveLatencies).toFixed(3)),
    avg: Number(
      (saveLatencies.reduce((sum, value) => sum + value, 0) / saveLatencies.length).toFixed(3),
    ),
  },
  queue: {
    processedSearch: workerProcessedSearch,
    processedMemory: workerProcessedMemory,
    drainMs: queueDrainMs,
    finalPending,
  },
  dbPath,
  generatedAt: new Date().toISOString(),
};

console.log(JSON.stringify(summary, null, 2));

if (jsonOutPath) {
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`[bench] wrote report: ${jsonOutPath}`);
}

if (assertMode) {
  const violations = [];
  if (summary.saveLatencyMs.p95 > thresholds.saveP95Ms) {
    violations.push(`save p95 ${summary.saveLatencyMs.p95} > ${thresholds.saveP95Ms}`);
  }
  if (summary.saveLatencyMs.p99 > thresholds.saveP99Ms) {
    violations.push(`save p99 ${summary.saveLatencyMs.p99} > ${thresholds.saveP99Ms}`);
  }
  if (summary.queue.drainMs > thresholds.queueDrainMs) {
    violations.push(`queue drain ${summary.queue.drainMs} > ${thresholds.queueDrainMs}`);
  }
  if (
    summary.queue.finalPending.searchPending !== 0 ||
    summary.queue.finalPending.memoryPending !== 0
  ) {
    violations.push("final pending queues are not zero");
  }

  if (violations.length > 0) {
    console.error("[bench] threshold violations detected:");
    for (const line of violations) {
      console.error(`- ${line}`);
    }
    process.exit(1);
  }
  console.log("[bench] thresholds passed");
}

db.close();

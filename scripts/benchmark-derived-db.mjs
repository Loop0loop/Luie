import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const datasets = [
  { chapters: 1000, chars: 5000 },
  { chapters: 3000, chars: 5000 },
  { chapters: 1000, chars: 15000 },
];

const defaultThresholds = {
  list50Ms: 50,
  openOneMs: 30,
  enqueue500Ms: 40,
};

const outDir = "/tmp/luie-bench";
fs.mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  if (idx < 0) return null;
  return args[idx + 1] ?? null;
};
const hasFlag = (name) => args.includes(name);

const jsonOutPath = getArg("--json-out");
const enforce = hasFlag("--assert");
const thresholds = {
  list50Ms: Number(getArg("--max-list50-ms") ?? defaultThresholds.list50Ms),
  openOneMs: Number(getArg("--max-open-one-ms") ?? defaultThresholds.openOneMs),
  enqueue500Ms: Number(getArg("--max-enqueue500-ms") ?? defaultThresholds.enqueue500Ms),
};

const nowIso = () => new Date().toISOString();
const lorem = (size) => "가".repeat(size);
const ms = (start) => Number(process.hrtime.bigint() - start) / 1_000_000;

const measure = (fn) => {
  const t = process.hrtime.bigint();
  const value = fn();
  return { value, elapsedMs: ms(t) };
};

const reports = [];
for (const ds of datasets) {
  const dbPath = path.join(outDir, `bench-${ds.chapters}x${ds.chars}.sqlite`);
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
  const now = nowIso();
  db.prepare("INSERT INTO Project (id,title,createdAt,updatedAt) VALUES (?,?,?,?)").run(projectId, "bench", now, now);

  const insertChapter = db.prepare("INSERT INTO Chapter (id,projectId,title,content,synopsis,\"order\",wordCount,createdAt,updatedAt,deletedAt) VALUES (?,?,?,?,?,?,?,?,?,NULL)");
  const insertBody = db.prepare("INSERT INTO ChapterBody (chapterId,content,contentHash,updatedAt) VALUES (?,?,?,?)");

  const seed = measure(() => {
    db.exec("BEGIN TRANSACTION;");
    try {
      for (let i = 0; i < ds.chapters; i++) {
        const id = randomUUID();
        const content = lorem(ds.chars);
        const ts = nowIso();
        insertChapter.run(id, projectId, `Chapter ${i + 1}`, "", null, i + 1, content.length, ts, ts);
        insertBody.run(id, content, "hash", ts);
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  });

  const list = measure(() => db.prepare('SELECT id,title,\"order\" FROM Chapter WHERE projectId=? ORDER BY \"order\" LIMIT 50').all(projectId));
  const openOne = measure(() => db.prepare("SELECT c.id,c.title,b.content FROM Chapter c LEFT JOIN ChapterBody b ON b.chapterId=c.id WHERE c.projectId=? ORDER BY c.\"order\" LIMIT 1").get(projectId));

  const enqueue = measure(() => {
    const chapterIds = db.prepare("SELECT id FROM Chapter WHERE projectId=? LIMIT 500").all(projectId);
    const insSearch = db.prepare("INSERT INTO SearchDirtyQueue (id,projectId,sourceType,sourceId,reason,status,attempts,createdAt,updatedAt) VALUES (?,?,?,?,?,'pending',0,?,?)");
    const insMemory = db.prepare("INSERT INTO MemoryBuildJob (id,projectId,targetType,targetId,jobType,status,priority,attempts,createdAt,updatedAt) VALUES (?,?,?,?,?,'pending',100,0,?,?)");
    db.exec("BEGIN TRANSACTION;");
    try {
      for (const row of chapterIds) {
        const ts = nowIso();
        insSearch.run(randomUUID(), projectId, "chapter", row.id, "bench", ts, ts);
        insMemory.run(randomUUID(), projectId, "chapter", row.id, "rebuild_chunks", ts, ts);
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  });

  const pendingCounts = db
    .prepare("SELECT (SELECT count(*) FROM SearchDirtyQueue WHERE status='pending') as searchPending, (SELECT count(*) FROM MemoryBuildJob WHERE status='pending') as memoryPending")
    .get();

  const report = {
    dataset: ds,
    seedMs: Number(seed.elapsedMs.toFixed(2)),
    list50Ms: Number(list.elapsedMs.toFixed(2)),
    openOneMs: Number(openOne.elapsedMs.toFixed(2)),
    enqueue500Ms: Number(enqueue.elapsedMs.toFixed(2)),
    pendingCounts,
    dbPath,
  };
  reports.push(report);
  console.log(JSON.stringify(report));
  db.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  thresholds,
  reports,
};

if (jsonOutPath) {
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`[bench] wrote report: ${jsonOutPath}`);
}

if (enforce) {
  const violations = [];
  for (const report of reports) {
    if (report.list50Ms > thresholds.list50Ms) {
      violations.push(`${report.dataset.chapters}x${report.dataset.chars}: list50Ms ${report.list50Ms} > ${thresholds.list50Ms}`);
    }
    if (report.openOneMs > thresholds.openOneMs) {
      violations.push(`${report.dataset.chapters}x${report.dataset.chars}: openOneMs ${report.openOneMs} > ${thresholds.openOneMs}`);
    }
    if (report.enqueue500Ms > thresholds.enqueue500Ms) {
      violations.push(`${report.dataset.chapters}x${report.dataset.chars}: enqueue500Ms ${report.enqueue500Ms} > ${thresholds.enqueue500Ms}`);
    }
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

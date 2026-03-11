import { app as T, nativeTheme as Ea, shell as ma, safeStorage as tt, BrowserWindow as Rt, Menu as De, session as _r, dialog as He, ipcMain as Aa } from "electron";
import * as ot from "node:path";
import k from "node:path";
import { z as u } from "zod";
import { EventEmitter as ya } from "events";
import * as Sa from "fs";
import { promises as R, existsSync as Ta } from "fs";
import * as H from "fs/promises";
import * as rt from "path";
import C, { join as ht } from "path";
import * as Gt from "node:fs/promises";
import { access as yn, mkdir as Ir, writeFile as Pr, unlink as Cr } from "node:fs/promises";
import { spawn as wa } from "node:child_process";
import { constants as Ye, promises as Ct } from "node:fs";
import { createRequire as _a } from "node:module";
import { PrismaClient as Ia } from "@prisma/client";
import Pa from "better-sqlite3";
import "./config-B9Gu_Tvs.js";
import Rr from "electron-store";
import Ca from "yauzl";
import Ra from "yazl";
import { randomUUID as Y, randomBytes as Da, createHash as Na } from "node:crypto";
import { Type as dt } from "@google/genai";
import { promisify as Er } from "node:util";
import { gzip as Sn, gunzip as La } from "node:zlib";
import Oa from "electron-window-state";
import { EventEmitter as ja } from "node:events";
import ba from "node:module";
const Jl = import.meta.filename, Ne = import.meta.dirname, Ql = ba.createRequire(import.meta.url), Zl = 2, tp = 2, ep = 2, ze = 1, Fa = (r) => !!r && typeof r == "object" && typeof r.then == "function", Le = () => typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now(), Xe = (r, t, e, n) => {
  const a = r?.[t];
  if (a)
    try {
      const o = a(e, n);
      Fa(o) && o.then(() => {
      }, () => {
      });
    } catch {
    }
}, Tn = (r) => ({
  flattened: u.flattenError(r),
  pretty: u.prettifyError(r),
  issues: r.issues.map((t) => ({
    code: t.code,
    path: t.path.map(String).join("."),
    message: t.message
  }))
}), va = (r) => ({
  schemaVersion: ze,
  domain: r.domain ?? "validation",
  event: "validation.failed",
  scope: r.scope,
  source: r.source,
  ...r.storageKey ? { storageKey: r.storageKey } : {},
  ...r.channel ? { channel: r.channel } : {},
  ...r.requestId ? { requestId: r.requestId } : {},
  ...typeof r.persistedVersion == "number" ? { persistedVersion: r.persistedVersion } : {},
  ...typeof r.targetVersion == "number" ? { targetVersion: r.targetVersion } : {},
  ...r.fallback ? { fallback: r.fallback } : {},
  zod: Tn(r.error),
  ...r.meta ?? {}
}), wn = (r) => {
  const t = Le();
  return {
    complete(e, n) {
      const a = Number((Le() - t).toFixed(1));
      return Xe(e, "info", r.event, {
        schemaVersion: ze,
        domain: "performance",
        event: r.event,
        scope: r.scope,
        durationMs: a,
        status: "ok",
        ...r.meta ?? {},
        ...n ?? {}
      }), a;
    },
    fail(e, n, a) {
      const o = Number((Le() - t).toFixed(1));
      return Xe(e, "warn", r.event, {
        schemaVersion: ze,
        domain: "performance",
        event: r.event,
        scope: r.scope,
        durationMs: o,
        status: "failed",
        error: n instanceof Error ? {
          name: n.name,
          message: n.message
        } : n,
        ...r.meta ?? {},
        ...a ?? {}
      }), o;
    }
  };
};
var mr = /* @__PURE__ */ ((r) => (r.DEBUG = "DEBUG", r.INFO = "INFO", r.WARN = "WARN", r.ERROR = "ERROR", r))(mr || {});
const fe = /* @__PURE__ */ Symbol.for("luie.logger.context"), Ke = "[REDACTED]", Ua = "[REDACTED_PATH]", _n = "[REDACTED_TEXT]", In = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, Pn = /(content|synopsis|manuscript|chapterText|prompt)/i, Cn = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, Ma = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, ka = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, Wa = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function Dr(r, t) {
  if (In.test(t ?? ""))
    return Ke;
  if (Pn.test(t ?? ""))
    return _n;
  if (Cn.test(t ?? "") && Ma.test(r))
    return Ua;
  let e = r.replace(ka, "Bearer [REDACTED]");
  return Wa.test(e) && (e = Ke), e;
}
function _t(r, t, e = /* @__PURE__ */ new WeakSet()) {
  if (typeof r == "string")
    return Dr(r, t);
  if (typeof r == "number" || typeof r == "boolean" || r === null)
    return r;
  if (typeof r == "bigint")
    return r.toString();
  if (!(typeof r > "u")) {
    if (typeof r == "function" || typeof r == "symbol")
      return String(r);
    if (r instanceof Date)
      return r.toISOString();
    if (Array.isArray(r))
      return r.map((n) => _t(n, t, e));
    if (typeof r == "object") {
      const n = r;
      if (e.has(n))
        return "[Circular]";
      e.add(n);
      const a = {};
      for (const [o, s] of Object.entries(n)) {
        if (In.test(o)) {
          a[o] = Ke;
          continue;
        }
        if (Pn.test(o) && typeof s == "string") {
          a[o] = _n;
          continue;
        }
        if (Cn.test(o) && typeof s == "string") {
          a[o] = Dr(s, o);
          continue;
        }
        a[o] = _t(s, o, e);
      }
      return a;
    }
    return String(r);
  }
}
function Ba(r) {
  if (!r || typeof r != "object") return _t(r);
  const t = r[fe];
  return !t || typeof t != "object" ? _t(r) : Array.isArray(r) ? _t({ items: r, _ctx: t }) : _t({ ...r, _ctx: t });
}
function $a(r, t) {
  return r && typeof r == "object" ? { ...r, [fe]: t } : { value: r, [fe]: t };
}
class xa {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, e, n) {
    if (!Ga(t)) return;
    const a = Ba(n), o = {
      level: t,
      message: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: this.context,
      ...a !== void 0 ? { data: a } : {}
    }, s = `[${o.timestamp}] [${o.level}] [${o.context}] ${o.message}`;
    switch (t) {
      case "DEBUG":
        console.debug(s, a ?? "");
        break;
      case "INFO":
        console.info(s, a ?? "");
        break;
      case "WARN":
        console.warn(s, a ?? "");
        break;
      case "ERROR":
        console.error(s, a ?? "");
        break;
    }
    nt.logToFile && nt.logFilePath && za(o);
  }
  debug(t, e) {
    this.log("DEBUG", t, e);
  }
  info(t, e) {
    this.log("INFO", t, e);
  }
  warn(t, e) {
    this.log("WARN", t, e);
  }
  error(t, e) {
    this.log("ERROR", t, e);
  }
}
const Rn = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, Nr = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let nt = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, Oe = null;
const Ve = async (r) => import(
  /* @vite-ignore */
  r
);
function Ga(r) {
  return Nr[r] >= Nr[nt.minLevel];
}
async function Ha() {
  !Rn || !nt.logFilePath || (Oe || (Oe = (async () => {
    const r = await Ve("node:path");
    await (await Ve("node:fs/promises")).mkdir(r.dirname(nt.logFilePath), {
      recursive: !0
    });
  })()), await Oe);
}
function Ya(r) {
  try {
    return JSON.stringify(r);
  } catch {
    return '"[unserializable]"';
  }
}
async function za(r) {
  if (!(!Rn || !nt.logFilePath))
    try {
      await Ha();
      const t = await Ve("node:fs/promises"), e = Ya(r);
      await t.appendFile(nt.logFilePath, `${e}
`, "utf8");
    } catch {
    }
}
function Dn(r) {
  nt = {
    ...nt,
    ...r
  };
}
function D(r) {
  return new xa(r);
}
const rp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: fe,
  LogLevel: mr,
  buildValidationFailureData: va,
  configureLogger: Dn,
  createLogger: D,
  createPerformanceTimer: wn,
  emitOperationalLog: Xe,
  summarizeZodError: Tn,
  withLogContext: $a
}, Symbol.toStringTag, { value: "Module" })), Xa = "Luie", Ka = "0.1.0", Nn = (r, t) => typeof r == "string" && r.trim().length > 0 ? r : t, Lr = Nn(
  "luie",
  Xa
), Va = Nn(
  "0.1.16",
  Ka
), Ln = "luie.db", qa = 3e4, On = qa, Ja = 1e3, ye = 30, Qa = !0, Za = 300 * 1e3, to = 60 * 1e3, eo = 200, ro = 5e3, no = 3e3, ao = 1e4, oo = 8e3, so = 2e4, je = 60 * 1e3, io = 2e3, ge = 50, jn = 2e3, co = 1, lo = 0, po = 30, Or = 50, uo = 2e3, ho = 5e3, fo = 1400, go = 900, Eo = 1e3, mo = 600, Ao = 16, yo = 16, So = "sans", To = "inter", wo = 16, _o = 1.6, Io = 800, Po = "blue", Co = !0, Ro = "logs", Do = "luie.log", qe = "snapshot-mirror", Ar = "Backups", No = "settings", Lo = "settings.json", bn = "luie", X = ".luie", np = "luie", Dt = "luie", ap = "Luie Project", op = "New Project", sp = "project", Nt = "zip", Lt = 1, Se = "meta.json", Ft = "manuscript", ip = `${Ft}/README.md`, x = "world", Ot = "snapshots", Oo = "assets", Fn = "characters.json", vn = "terms.json", Jt = "synopsis.json", Te = "plot-board.json", we = "map-drawing.json", _e = "mindmap.json", yr = "scrap-memos.json", Ie = "graph.json", Pe = ".md", E = {
  // Database Errors (1xxx)
  DB_CONNECTION_FAILED: "DB_1001",
  DB_QUERY_FAILED: "DB_1002",
  DB_MIGRATION_FAILED: "DB_1003",
  DB_TRANSACTION_FAILED: "DB_1004",
  // File System Errors (2xxx)
  FS_READ_FAILED: "FS_2001",
  FS_WRITE_FAILED: "FS_2002",
  FS_DELETE_FAILED: "FS_2003",
  FS_PERMISSION_DENIED: "FS_2004",
  // Validation Errors (3xxx)
  VALIDATION_FAILED: "VAL_3001",
  INVALID_INPUT: "VAL_3002",
  REQUIRED_FIELD_MISSING: "VAL_3003",
  // IPC Errors (4xxx)
  IPC_CHANNEL_NOT_FOUND: "IPC_4001",
  IPC_HANDLER_ERROR: "IPC_4002",
  IPC_TIMEOUT: "IPC_4003",
  IPC_INVOKE_FAILED: "IPC_4004",
  IPC_RETRY_EXHAUSTED: "IPC_4005",
  IPC_INVALID_RESPONSE: "IPC_4006",
  // Project Errors (5xxx)
  PROJECT_NOT_FOUND: "PRJ_5001",
  PROJECT_CREATE_FAILED: "PRJ_5002",
  PROJECT_DELETE_FAILED: "PRJ_5003",
  PROJECT_UPDATE_FAILED: "PRJ_5004",
  // Chapter Errors (6xxx)
  CHAPTER_NOT_FOUND: "CHP_6001",
  CHAPTER_CREATE_FAILED: "CHP_6002",
  CHAPTER_DELETE_FAILED: "CHP_6003",
  CHAPTER_UPDATE_FAILED: "CHP_6004",
  // Character Errors (7xxx)
  CHARACTER_NOT_FOUND: "CHR_7001",
  CHARACTER_CREATE_FAILED: "CHR_7002",
  CHARACTER_DELETE_FAILED: "CHR_7003",
  CHARACTER_UPDATE_FAILED: "CHR_7004",
  // Term/Dictionary Errors (8xxx)
  TERM_NOT_FOUND: "TRM_8001",
  TERM_CREATE_FAILED: "TRM_8002",
  TERM_DELETE_FAILED: "TRM_8003",
  TERM_UPDATE_FAILED: "TRM_8004",
  // Snapshot Errors (9xxx)
  SNAPSHOT_CREATE_FAILED: "SNP_9001",
  SNAPSHOT_RESTORE_FAILED: "SNP_9002",
  SNAPSHOT_DELETE_FAILED: "SNP_9003",
  // Settings Errors (91xx)
  SETTINGS_LOAD_FAILED: "SET_9101",
  SETTINGS_SAVE_FAILED: "SET_9102",
  SETTINGS_RESET_FAILED: "SET_9103",
  // Window Errors (92xx)
  WINDOW_CREATE_FAILED: "WIN_9201",
  WINDOW_CLOSE_FAILED: "WIN_9202",
  WINDOW_STATE_FAILED: "WIN_9203",
  // Search Errors (93xx)
  SEARCH_INDEX_FAILED: "SRC_9301",
  SEARCH_QUERY_FAILED: "SRC_9302",
  // Auto Extract Errors (94xx)
  AUTO_EXTRACT_FAILED: "AUT_9401",
  // Analysis Errors (95xx)
  ANALYSIS_API_KEY_MISSING: "API_KEY_MISSING",
  ANALYSIS_NETWORK_ERROR: "NETWORK_ERROR",
  ANALYSIS_QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  ANALYSIS_INVALID_REQUEST: "INVALID_REQUEST",
  SYNC_AUTH_REQUIRED_FOR_EDGE: "SYNC_AUTH_REQUIRED_FOR_EDGE",
  // Unknown/General Errors
  UNKNOWN_ERROR: "ERR_0000",
  NOT_IMPLEMENTED: "ERR_0001",
  // World Entity Errors (96xx)
  WORLD_ENTITY_NOT_FOUND: "WLD_9601",
  WORLD_ENTITY_CREATE_FAILED: "WLD_9602",
  WORLD_ENTITY_DELETE_FAILED: "WLD_9603",
  WORLD_ENTITY_UPDATE_FAILED: "WLD_9604",
  // Entity Relation Errors (97xx)
  ENTITY_RELATION_NOT_FOUND: "REL_9701",
  ENTITY_RELATION_CREATE_FAILED: "REL_9702",
  ENTITY_RELATION_DELETE_FAILED: "REL_9703",
  ENTITY_RELATION_UPDATE_FAILED: "REL_9704"
}, jo = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), jr = (r) => jo.has(r), cp = (r, t, e) => !0, bo = "neutral", Fo = "soft", Xt = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", vo = () => !T.isPackaged && !Xt(), Uo = () => T.isPackaged, Mo = () => k.join(process.cwd(), "prisma", "dev.db"), ko = () => k.join(process.cwd(), "prisma", ".tmp", "test.db"), Wo = () => k.join(T.getPath("userData"), Ln);
function Bo() {
  if (process.env.DATABASE_URL) return;
  const r = Xt() ? ko() : T.isPackaged ? Wo() : Mo();
  process.env.DATABASE_URL = `file:${r}`;
}
class f extends Error {
  code;
  details;
  constructor(t, e, n, a) {
    super(e), this.code = t, this.details = n, a && (this.cause = a);
  }
}
function $o(r) {
  return typeof r == "object" && r !== null && "code" in r && "message" in r;
}
const br = 4096, xo = process.platform === "win32" ? [k.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], Fr = (r) => process.platform === "win32" ? r.toLowerCase() : r, Go = (r, t) => {
  const e = Fr(k.resolve(r)), n = Fr(k.resolve(t));
  return e === n || e.startsWith(`${n}${k.sep}`);
};
function Ho(r, t) {
  if (typeof r != "string")
    throw new f(
      E.INVALID_INPUT,
      `${t} must be a string`,
      { fieldName: t, receivedType: typeof r }
    );
  const e = r.trim();
  if (!e)
    throw new f(
      E.REQUIRED_FIELD_MISSING,
      `${t} is required`,
      { fieldName: t }
    );
  if (e.length > br)
    throw new f(
      E.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: e.length, maxLength: br }
    );
  if (e.includes("\0"))
    throw new f(
      E.INVALID_INPUT,
      `${t} contains invalid null bytes`,
      { fieldName: t }
    );
  return e;
}
function K(r, t = "path") {
  const e = Ho(r, t);
  if (!k.isAbsolute(e))
    throw new f(
      E.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: e }
    );
  const n = k.resolve(e);
  for (const a of xo)
    if (Go(n, a))
      throw new f(
        E.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: n, restrictedRoot: k.resolve(a) }
      );
  return n;
}
const vr = D("DatabaseSeed");
async function Yo(r) {
  const t = await r.project.count();
  return t > 0 ? (vr.info("Seed skipped (projects exist)", { count: t }), !1) : (await r.project.create({
    data: {
      title: "새 프로젝트",
      description: "",
      settings: {
        create: {
          autoSave: !0,
          autoSaveInterval: 30
        }
      },
      chapters: {
        create: [
          {
            title: "1장",
            content: "",
            order: 1,
            wordCount: 0
          }
        ]
      }
    }
  }), vr.info("Seed completed (default project created)"), !0);
}
const zo = _a(import.meta.url), Ur = Ia;
async function Mt(r) {
  try {
    return await Gt.access(r, Ye.F_OK), !0;
  } catch {
    return !1;
  }
}
function Xo(r) {
  const t = r.trim();
  if (!t)
    throw new Error("DATABASE_URL is empty");
  const n = (t.startsWith("file:") ? t : `file:${t}`).slice(5), a = n.indexOf("?"), o = a === -1 ? n : n.slice(0, a), s = a === -1 ? "" : n.slice(a), c = decodeURIComponent(o), d = ot.isAbsolute(c) ? c : ot.resolve(process.cwd(), c);
  return {
    dbPath: d,
    datasourceUrl: `file:${d}${s}`
  };
}
function Ko() {
  return process.env.LUIE_PACKAGED_SCHEMA_MODE === "prisma" ? "prisma" : "bootstrap";
}
function Vo(r) {
  return ot.join(r, "node_modules", "prisma", "build", "index.js");
}
function qo() {
  const r = zo("@prisma/adapter-better-sqlite3"), t = r.PrismaBetterSQLite3 ?? r.PrismaBetterSqlite3 ?? r.default;
  if (typeof t != "function")
    throw new Error("Prisma better-sqlite3 adapter is unavailable");
  return t;
}
function be(r, t, e) {
  const n = r.endsWith(".js"), a = n ? process.execPath : r, o = n ? [r, ...t] : t;
  return new Promise((s, c) => {
    const d = wa(a, o, {
      cwd: process.cwd(),
      env: e,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let l = "", i = "";
    d.stdout.on("data", (p) => {
      l += p.toString();
    }), d.stderr.on("data", (p) => {
      i += p.toString();
    }), d.on("error", (p) => {
      const m = p;
      m.stdout = l, m.stderr = i, c(m);
    }), d.on("close", (p) => {
      if (p === 0) {
        s();
        return;
      }
      const m = new Error(
        `Prisma command failed with exit code ${p ?? "unknown"}`
      );
      m.status = p, m.stdout = l, m.stderr = i, c(m);
    });
  });
}
const Jo = [
  "Project",
  "ProjectSettings",
  "Chapter",
  "Character",
  "Event",
  "Faction",
  "CharacterAppearance",
  "Term",
  "TermAppearance",
  "Snapshot",
  "WorldEntity",
  "EntityRelation"
], Qo = [
  {
    table: "Term",
    column: "order",
    sql: 'ALTER TABLE "Term" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;'
  },
  {
    table: "Snapshot",
    column: "contentLength",
    sql: 'ALTER TABLE "Snapshot" ADD COLUMN "contentLength" INTEGER NOT NULL DEFAULT 0;'
  },
  {
    table: "Snapshot",
    column: "description",
    sql: 'ALTER TABLE "Snapshot" ADD COLUMN "description" TEXT;'
  },
  {
    table: "Project",
    column: "projectPath",
    sql: 'ALTER TABLE "Project" ADD COLUMN "projectPath" TEXT;'
  },
  {
    table: "Chapter",
    column: "synopsis",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "synopsis" TEXT;'
  },
  {
    table: "Chapter",
    column: "wordCount",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;'
  },
  {
    table: "Chapter",
    column: "deletedAt",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "deletedAt" DATETIME;'
  },
  {
    table: "Character",
    column: "firstAppearance",
    sql: 'ALTER TABLE "Character" ADD COLUMN "firstAppearance" TEXT;'
  },
  {
    table: "Character",
    column: "attributes",
    sql: 'ALTER TABLE "Character" ADD COLUMN "attributes" TEXT;'
  }
], Zo = {
  Project: ["id", "title", "projectPath"],
  ProjectSettings: ["id", "projectId", "autoSave", "autoSaveInterval"],
  Chapter: ["id", "projectId", "order", "wordCount", "deletedAt"],
  Character: ["id", "projectId", "firstAppearance", "attributes"],
  Event: ["id", "projectId", "name"],
  Faction: ["id", "projectId", "name"],
  CharacterAppearance: ["id", "characterId", "chapterId", "position"],
  Term: ["id", "projectId", "term", "order"],
  TermAppearance: ["id", "termId", "chapterId", "position"],
  Snapshot: ["id", "projectId", "content", "contentLength", "type"],
  WorldEntity: ["id", "projectId", "type", "name", "positionX", "positionY"],
  EntityRelation: ["id", "projectId", "sourceId", "targetId", "relation"]
}, ts = `
CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "ProjectSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "autoSave" BOOLEAN NOT NULL DEFAULT true,
    "autoSaveInterval" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "ProjectSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "synopsis" TEXT,
    "order" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Faction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Faction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "CharacterAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterAppearance_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "firstAppearance" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Term_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "TermAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermAppearance_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "content" TEXT NOT NULL,
    "contentLength" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'AUTO',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Snapshot_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorldEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "EntityRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "attributes" TEXT,
    "sourceWorldEntityId" TEXT,
    "targetWorldEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EntityRelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntityRelation_sourceWorldEntityId_fkey" FOREIGN KEY ("sourceWorldEntityId") REFERENCES "WorldEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntityRelation_targetWorldEntityId_fkey" FOREIGN KEY ("targetWorldEntityId") REFERENCES "WorldEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSettings_projectId_key" ON "ProjectSettings"("projectId");
CREATE INDEX IF NOT EXISTS "Chapter_projectId_order_idx" ON "Chapter"("projectId", "order");
CREATE INDEX IF NOT EXISTS "Character_projectId_name_idx" ON "Character"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Event_projectId_name_idx" ON "Event"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Faction_projectId_name_idx" ON "Faction"("projectId", "name");
CREATE INDEX IF NOT EXISTS "CharacterAppearance_characterId_chapterId_idx" ON "CharacterAppearance"("characterId", "chapterId");
CREATE INDEX IF NOT EXISTS "Term_projectId_term_idx" ON "Term"("projectId", "term");
CREATE INDEX IF NOT EXISTS "TermAppearance_termId_chapterId_idx" ON "TermAppearance"("termId", "chapterId");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_createdAt_idx" ON "Snapshot"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_chapterId_createdAt_idx" ON "Snapshot"("projectId", "chapterId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_type_createdAt_idx" ON "Snapshot"("projectId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_type_idx" ON "WorldEntity"("projectId", "type");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_name_idx" ON "WorldEntity"("projectId", "name");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_sourceId_idx" ON "EntityRelation"("projectId", "sourceId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_targetId_idx" ON "EntityRelation"("projectId", "targetId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_relation_idx" ON "EntityRelation"("projectId", "relation");
`;
function es(r) {
  return r.replaceAll('"', '""');
}
function Mr(r, t) {
  return !!r.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;"
  ).get(t);
}
function kr(r, t, e) {
  const n = es(t);
  return r.prepare(`PRAGMA table_info("${n}")`).all().some((o) => o.name === e);
}
function Fe(r, t) {
  const e = new Pa(r);
  try {
    e.pragma("journal_mode = WAL"), e.exec(ts);
    let n = 0;
    for (const s of Qo)
      Mr(e, s.table) && (kr(e, s.table, s.column) || (e.exec(s.sql), n += 1));
    const a = Jo.filter(
      (s) => !Mr(e, s)
    ), o = Object.entries(Zo).flatMap(
      ([s, c]) => c.filter((d) => !kr(e, s, d)).map((d) => `${s}.${d}`)
    );
    if (a.length > 0 || o.length > 0) {
      t.warn("Packaged SQLite bootstrap completed with schema gaps", {
        dbPath: r,
        missingTables: a,
        missingColumns: o,
        patchedColumns: n
      });
      return;
    }
    t.info("Packaged SQLite bootstrap schema ensured", {
      dbPath: r,
      patchedColumns: n
    });
  } finally {
    e.close();
  }
}
const L = D("DatabaseService");
class It {
  static instance;
  prisma = null;
  dbPath = null;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    return It.instance || (It.instance = new It()), It.instance;
  }
  async initialize() {
    this.prisma || (this.initPromise || (this.initPromise = this.initializeInternal().finally(() => {
      this.initPromise = null;
    })), await this.initPromise);
  }
  async initializeInternal() {
    const t = await this.prepareDatabaseContext();
    if (this.dbPath = t.dbPath, L.info("Initializing database", {
      isPackaged: t.isPackaged,
      isTest: t.isTest,
      hasEnvDb: !!process.env.DATABASE_URL,
      userDataPath: T.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await Yo(this.prisma);
      } catch (e) {
        L.error("Failed to seed packaged database", { error: e });
      }
    if (this.prisma.$executeRawUnsafe)
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"), await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"), L.info("SQLite WAL mode enabled");
      } catch (e) {
        L.warn("Failed to enable WAL mode", { error: e });
      }
    L.info("Database service initialized");
  }
  createPrismaClient(t) {
    try {
      const e = qo(), n = new e({
        url: t.datasourceUrl
      });
      return new Ur({
        adapter: n,
        log: ["error", "warn"]
      });
    } catch (e) {
      if (t.isPackaged)
        throw e;
      return L.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: e,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new Ur({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = Uo(), e = T.getPath("userData"), n = Xt(), a = process.env.DATABASE_URL, o = !!a;
    let s, c;
    if (o) {
      const d = Xo(a ?? "");
      s = d.dbPath, c = d.datasourceUrl;
    } else t ? (s = K(ot.join(e, Ln), "dbPath"), c = `file:${s}`) : (s = K(ot.join(process.cwd(), "prisma", "dev.db"), "dbPath"), c = `file:${s}`);
    return process.env.DATABASE_URL = c, await Gt.mkdir(e, { recursive: !0 }), await Gt.mkdir(ot.dirname(s), { recursive: !0 }), await Mt(s) || await Gt.writeFile(s, ""), {
      dbPath: s,
      datasourceUrl: c,
      isPackaged: t,
      isTest: n
    };
  }
  async applySchema(t) {
    const e = await Mt(t.dbPath), n = t.isPackaged ? process.resourcesPath : process.cwd(), a = ot.join(n, "prisma", "schema.prisma"), o = Vo(n), s = ot.join(n, "prisma", "migrations"), c = await Mt(s) && await Gt.readdir(s, { withFileTypes: !0 }).then((l) => l.some((i) => i.isDirectory())), d = { ...process.env, DATABASE_URL: t.datasourceUrl };
    if (t.isPackaged) {
      await this.applyPackagedSchema(t, {
        dbExists: e,
        schemaPath: a,
        prismaPath: o,
        hasMigrations: c,
        commandEnv: d
      });
      return;
    }
    if (t.isTest) {
      L.info("Running test database push", {
        dbPath: t.dbPath,
        dbExists: e,
        command: "db push"
      });
      try {
        await be(
          o,
          ["db", "push", "--accept-data-loss", `--schema=${a}`],
          d
        ), L.info("Test database push completed successfully");
      } catch (l) {
        const i = l;
        L.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: l,
          stdout: i.stdout,
          stderr: i.stderr,
          dbPath: t.dbPath
        }), Fe(t.dbPath, L);
      }
      return;
    }
    L.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: e,
      hasMigrations: c,
      command: "db push"
    });
    try {
      await be(
        o,
        ["db", "push", "--accept-data-loss", `--schema=${a}`],
        d
      ), L.info("Development database ready");
    } catch (l) {
      const i = l;
      throw L.error("Failed to prepare development database", {
        error: l,
        stdout: i.stdout,
        stderr: i.stderr
      }), l;
    }
  }
  async applyPackagedSchema(t, e) {
    const n = Ko();
    if (n === "bootstrap") {
      L.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: n
      }), Fe(t.dbPath, L);
      return;
    }
    const { dbExists: a, schemaPath: o, prismaPath: s, hasMigrations: c, commandEnv: d } = e, l = await Mt(o), i = await Mt(s);
    if (c && l && i) {
      L.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: a,
        command: "migrate deploy"
      });
      try {
        await be(s, ["migrate", "deploy", `--schema=${o}`], d), L.info("Production migrations applied successfully");
      } catch (p) {
        const m = p;
        L.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: p,
          stdout: m.stdout,
          stderr: m.stderr,
          schemaMode: n
        });
      }
    } else
      L.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: t.dbPath,
        hasMigrations: c,
        hasSchemaFile: l,
        hasPrismaBinary: i,
        resourcesPath: process.resourcesPath,
        schemaMode: n
      });
    Fe(t.dbPath, L);
  }
  getClient() {
    if (!this.prisma)
      throw new Error("Database is not initialized. Call db.initialize() first.");
    return this.prisma;
  }
  getDatabasePath() {
    if (!this.dbPath)
      throw new Error("Database path not initialized");
    return this.dbPath;
  }
  async disconnect() {
    this.initPromise && !this.prisma && await this.initPromise.catch((t) => {
      L.error("Database initialization failed before disconnect", { error: t });
    }), this.prisma && (await this.prisma.$disconnect(), this.prisma = null, L.info("Database disconnected"));
  }
}
const h = It.getInstance(), Wr = D("KeywordExtractor");
class rs {
  koreanRegex = /[가-힣]{2,}/g;
  commonWords = /* @__PURE__ */ new Set([
    "그",
    "저",
    "너",
    "우리",
    "이",
    "가",
    "을",
    "를",
    "의",
    "에",
    "와",
    "과",
    "은",
    "는",
    "도",
    "만",
    "까지",
    "부터",
    "에서",
    "으로",
    "로",
    "하고",
    "이다",
    "있다",
    "없다",
    "하다",
    "되다",
    "않다",
    "같다",
    "아니다",
    "이다"
  ]);
  characterNames = /* @__PURE__ */ new Set();
  termNames = /* @__PURE__ */ new Set();
  setKnownCharacters(t) {
    this.characterNames = new Set(t);
  }
  setKnownTerms(t) {
    this.termNames = new Set(t);
  }
  extractFromText(t) {
    const e = [], n = /* @__PURE__ */ new Set(), a = Array.from(t.matchAll(this.koreanRegex));
    for (const o of a) {
      const s = o[0], c = o.index ?? 0;
      this.shouldSkip(s) || n.has(s) || (this.characterNames.has(s) ? (e.push({
        text: s,
        position: c,
        type: "character"
      }), n.add(s)) : this.termNames.has(s) && (e.push({
        text: s,
        position: c,
        type: "term"
      }), n.add(s)));
    }
    return Wr.debug("Keywords extracted", {
      keywordCount: e.length,
      textLength: t.length
    }), e;
  }
  extractNewKeywords(t) {
    const e = [], n = /* @__PURE__ */ new Set(), a = Array.from(t.matchAll(this.koreanRegex));
    for (const o of a) {
      const s = o[0];
      this.shouldSkip(s) || n.has(s) || !this.characterNames.has(s) && !this.termNames.has(s) && (e.push(s), n.add(s));
    }
    return Wr.debug("New keywords extracted", {
      keywordCount: e.length
    }), e;
  }
  shouldSkip(t) {
    return !!(t.length < 2 || this.commonWords.has(t) || /^\d+$/.test(t));
  }
  extractNouns(t) {
    const e = [], n = /* @__PURE__ */ new Set(), a = Array.from(t.matchAll(this.koreanRegex));
    for (const o of a) {
      const s = o[0];
      this.shouldSkip(s) || n.has(s) || (e.push(s), n.add(s));
    }
    return e;
  }
  filterByFrequency(t, e = 2) {
    const n = /* @__PURE__ */ new Map();
    for (const a of t)
      n.set(a, (n.get(a) ?? 0) + 1);
    return t.filter((a) => (n.get(a) ?? 0) >= e);
  }
  reset() {
    this.characterNames.clear(), this.termNames.clear();
  }
}
const ft = new rs(), ns = bn, as = Lo, ve = No, os = (r) => {
  if (r)
    return {
      connected: r.connected ?? !1,
      provider: r.provider,
      email: r.email,
      userId: r.userId,
      expiresAt: r.expiresAt,
      autoSync: r.autoSync ?? !0,
      lastSyncedAt: r.lastSyncedAt,
      lastError: r.lastError,
      projectLastSyncedAtByProjectId: r.projectLastSyncedAtByProjectId
    };
}, ss = (r) => {
  const t = r === "darwin" ? "Cmd" : "Ctrl";
  return {
    "app.openSettings": `${t}+,`,
    "app.closeWindow": `${t}+W`,
    "app.quit": `${t}+Q`,
    "chapter.new": `${t}+N`,
    "chapter.save": `${t}+S`,
    "chapter.delete": `${t}+Backspace`,
    "chapter.open.1": `${t}+1`,
    "chapter.open.2": `${t}+2`,
    "chapter.open.3": `${t}+3`,
    "chapter.open.4": `${t}+4`,
    "chapter.open.5": `${t}+5`,
    "chapter.open.6": `${t}+6`,
    "chapter.open.7": `${t}+7`,
    "chapter.open.8": `${t}+8`,
    "chapter.open.9": `${t}+9`,
    "chapter.open.0": `${t}+0`,
    "view.toggleSidebar": `${t}+B`,
    "view.sidebar.open": "",
    "view.sidebar.close": "",
    "view.toggleContextPanel": `${t}+Shift+B`,
    "view.context.open": "",
    "view.context.close": "",
    "sidebar.section.manuscript.toggle": "",
    "sidebar.section.snapshot.open": "",
    "sidebar.section.trash.open": "",
    "project.rename": "",
    "research.open.character": `${t}+T`,
    "research.open.world": "",
    "research.open.scrap": "",
    "research.open.analysis": "",
    "research.open.character.left": "",
    "research.open.world.left": "",
    "research.open.scrap.left": "",
    "research.open.analysis.left": "",
    "character.openTemplate": "",
    "world.tab.synopsis": "",
    "world.tab.terms": "",
    "world.tab.mindmap": "",
    "world.tab.drawing": "",
    "world.tab.plot": "",
    "world.tab.graph": `${t}+Shift+G`,
    "world.addTerm": "",
    "scrap.addMemo": "",
    "export.openPreview": "",
    "export.openWindow": "",
    "editor.openRight": "",
    "editor.openLeft": "",
    "split.swapSides": "",
    "editor.fontSize.increase": "",
    "editor.fontSize.decrease": "",
    "window.toggleFullscreen": "F11",
    "view.toggleFocusMode": "Shift+F11"
  };
}, le = ss(process.platform), Je = process.platform === "darwin" ? "visible" : "hidden", Qe = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = typeof r.url == "string" ? r.url.trim() : "", e = typeof r.anonKey == "string" ? r.anonKey.trim() : "";
  if (!(t.length === 0 || e.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: e
    };
}, Br = () => ({
  editor: {
    fontFamily: So,
    fontPreset: To,
    fontSize: wo,
    lineHeight: _o,
    maxWidth: Io,
    theme: Ea.shouldUseDarkColors ? "dark" : "light",
    themeTemp: bo,
    themeContrast: Fo,
    themeAccent: Po,
    themeTexture: Co,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: le,
  lastProjectPath: void 0,
  autoSaveEnabled: Qa,
  autoSaveInterval: On,
  snapshotExportLimit: ge,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: Je,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
}), yt = (r) => typeof r == "string" && r.length > 0, is = (r) => {
  if (!Array.isArray(r)) return;
  const t = r.filter(
    (e) => !!(e && typeof e == "object" && yt(e.projectId) && yt(e.deletedAt))
  ).map((e) => ({
    projectId: e.projectId,
    deletedAt: e.deletedAt
  }));
  return t.length > 0 ? t : void 0;
}, Ze = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(
      (e) => yt(e[0]) && yt(e[1])
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, cs = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const t = r;
  return {
    chapter: Ze(t.chapter) ?? {},
    memo: Ze(t.memo) ?? {},
    capturedAt: yt(t.capturedAt) ? t.capturedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}, ds = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(([e]) => yt(e)).map(([e, n]) => [e, cs(n)]).filter((e) => !!e[1])
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, ls = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(
      (e) => yt(e[0]) && (e[1] === "local" || e[1] === "remote")
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, $r = (r) => {
  const t = r ?? {};
  return {
    connected: t.connected ?? !1,
    provider: t.provider,
    email: t.email,
    userId: t.userId,
    expiresAt: t.expiresAt,
    autoSync: t.autoSync ?? !0,
    lastSyncedAt: t.lastSyncedAt,
    lastError: t.lastError,
    accessTokenCipher: t.accessTokenCipher,
    refreshTokenCipher: t.refreshTokenCipher,
    pendingAuthState: t.pendingAuthState,
    pendingAuthVerifierCipher: t.pendingAuthVerifierCipher,
    pendingAuthCreatedAt: t.pendingAuthCreatedAt,
    pendingAuthRedirectUri: t.pendingAuthRedirectUri,
    pendingProjectDeletes: is(t.pendingProjectDeletes),
    projectLastSyncedAtByProjectId: Ze(t.projectLastSyncedAtByProjectId),
    entityBaselinesByProjectId: ds(t.entityBaselinesByProjectId),
    pendingConflictResolutions: ls(
      t.pendingConflictResolutions
    ),
    runtimeSupabaseConfig: Qe(t.runtimeSupabaseConfig)
  };
}, Tt = D("SettingsManager");
class gt {
  static instance;
  store;
  constructor() {
    const t = T.getPath("userData"), e = `${t}/${ns}/${ve}`, n = `${e}/${as}`;
    this.store = new Rr({
      name: ve,
      defaults: Br(),
      // 저장 위치: userData/settings.json
      cwd: t,
      encryptionKey: void 0,
      // 필요하다면 암호화 키 추가
      fileExtension: "json"
    }), this.migrateLegacySettingsIfNeeded(e, n), this.migrateLegacyWindowSettings(), Tt.info("Settings manager initialized", {
      path: this.store.path
    });
  }
  async migrateLegacySettingsIfNeeded(t, e) {
    const n = await this.pathExists(e), a = await this.pathExists(this.store.path);
    if (!(!n || a))
      try {
        const o = new Rr({
          name: ve,
          defaults: Br(),
          cwd: t,
          fileExtension: "json"
        });
        this.store.set(o.store), Tt.info("Settings migrated from legacy path", {
          from: o.path,
          to: this.store.path
        });
      } catch (o) {
        Tt.error("Failed to migrate legacy settings", o);
      }
  }
  async pathExists(t) {
    try {
      return await yn(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", Je), "titleBarMode" in t) {
      const { titleBarMode: e, ...n } = t;
      this.store.set(n);
    }
  }
  static getInstance() {
    return gt.instance || (gt.instance = new gt()), gt.instance;
  }
  // 전체 설정 가져오기
  getAll() {
    return this.store.store;
  }
  // 렌더러 노출용 설정 (민감 Sync 시크릿 제거)
  getAllForRenderer() {
    const t = this.getAll();
    return {
      ...t,
      sync: os(t.sync)
    };
  }
  // 전체 설정 저장
  setAll(t) {
    const e = this.store.store, n = {
      editor: { ...e.editor, ...t.editor || {} },
      language: t.language ?? e.language,
      shortcuts: t.shortcuts ?? e.shortcuts,
      lastProjectPath: t.lastProjectPath ?? e.lastProjectPath,
      autoSaveEnabled: t.autoSaveEnabled ?? e.autoSaveEnabled,
      autoSaveInterval: t.autoSaveInterval ?? e.autoSaveInterval,
      snapshotExportLimit: t.snapshotExportLimit ?? e.snapshotExportLimit,
      windowBounds: t.windowBounds ?? e.windowBounds,
      lastWindowState: t.lastWindowState ?? e.lastWindowState,
      menuBarMode: t.menuBarMode ?? e.menuBarMode,
      sync: t.sync ?? e.sync,
      startup: t.startup ?? e.startup
    };
    this.store.set(n), Tt.info("Settings updated", { settings: n });
  }
  // 에디터 설정
  getEditorSettings() {
    return this.store.get("editor");
  }
  setEditorSettings(t) {
    this.store.set("editor", { ...this.getEditorSettings(), ...t }), Tt.info("Editor settings updated", { settings: t });
  }
  // 개별 에디터 설정 편의 메서드
  setEditorTheme(t) {
    this.setEditorSettings({ theme: t });
  }
  setEditorFontSize(t) {
    this.setEditorSettings({ fontSize: t });
  }
  setEditorLineHeight(t) {
    this.setEditorSettings({ lineHeight: t });
  }
  setEditorFontFamily(t) {
    this.setEditorSettings({ fontFamily: t });
  }
  // 언어 설정
  getLanguage() {
    return this.store.get("language");
  }
  setLanguage(t) {
    this.store.set("language", t);
  }
  // 단축키 설정
  getShortcuts() {
    const t = this.store.get("shortcuts") ?? {};
    return { shortcuts: { ...le, ...t }, defaults: le };
  }
  setShortcuts(t) {
    const e = { ...le, ...t };
    return this.store.set("shortcuts", e), e;
  }
  // 프로젝트 경로
  getLastProjectPath() {
    return this.store.get("lastProjectPath");
  }
  setLastProjectPath(t) {
    this.store.set("lastProjectPath", t);
  }
  // 자동 저장 설정
  getAutoSaveEnabled() {
    return this.store.get("autoSaveEnabled");
  }
  setAutoSaveEnabled(t) {
    this.store.set("autoSaveEnabled", t);
  }
  getAutoSaveInterval() {
    return this.store.get("autoSaveInterval");
  }
  setAutoSaveInterval(t) {
    this.store.set("autoSaveInterval", t);
  }
  // 윈도우 상태
  getWindowBounds() {
    return this.store.get("windowBounds");
  }
  setWindowBounds(t) {
    this.store.set("windowBounds", t);
  }
  getLastWindowState() {
    return this.store.get("lastWindowState");
  }
  setLastWindowState(t) {
    this.store.set("lastWindowState", t);
  }
  getMenuBarMode() {
    return this.store.get("menuBarMode") ?? Je;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    return $r(this.store.get("sync"));
  }
  setSyncSettings(t) {
    const e = $r({
      ...this.getSyncSettings(),
      ...t
    });
    return this.store.set("sync", e), e;
  }
  setPendingSyncAuth(t) {
    return this.setSyncSettings({
      pendingAuthState: t.state,
      pendingAuthVerifierCipher: t.verifierCipher,
      pendingAuthCreatedAt: t.createdAt,
      pendingAuthRedirectUri: t.redirectUri
    });
  }
  clearPendingSyncAuth() {
    return this.setSyncSettings({
      pendingAuthState: void 0,
      pendingAuthVerifierCipher: void 0,
      pendingAuthCreatedAt: void 0,
      pendingAuthRedirectUri: void 0
    });
  }
  addPendingProjectDelete(t) {
    const e = this.getSyncSettings(), a = (Array.isArray(e.pendingProjectDeletes) ? e.pendingProjectDeletes : []).filter((o) => o.projectId !== t.projectId);
    return this.setSyncSettings({
      pendingProjectDeletes: [
        ...a,
        {
          projectId: t.projectId,
          deletedAt: t.deletedAt
        }
      ]
    });
  }
  removePendingProjectDeletes(t) {
    if (t.length === 0)
      return this.getSyncSettings();
    const e = new Set(t), n = this.getSyncSettings(), o = (Array.isArray(n.pendingProjectDeletes) ? n.pendingProjectDeletes : []).filter((s) => !e.has(s.projectId));
    return this.setSyncSettings({
      pendingProjectDeletes: o.length > 0 ? o : void 0
    });
  }
  clearSyncSettings() {
    const t = this.getSyncSettings(), e = {
      connected: !1,
      autoSync: !0,
      pendingProjectDeletes: t.pendingProjectDeletes,
      entityBaselinesByProjectId: t.entityBaselinesByProjectId,
      runtimeSupabaseConfig: t.runtimeSupabaseConfig
    };
    return this.store.set("sync", e), e;
  }
  getRuntimeSupabaseConfig() {
    const t = this.getSyncSettings();
    return Qe(t.runtimeSupabaseConfig);
  }
  getRuntimeSupabaseConfigView(t) {
    const e = this.getRuntimeSupabaseConfig();
    return {
      url: e?.url ?? null,
      hasAnonKey: !!e?.anonKey,
      source: t?.source
    };
  }
  setRuntimeSupabaseConfig(t) {
    const e = Qe(t);
    return this.setSyncSettings({
      runtimeSupabaseConfig: e
    }), e;
  }
  clearRuntimeSupabaseConfig() {
    this.setSyncSettings({
      runtimeSupabaseConfig: void 0
    });
  }
  getStartupSettings() {
    const t = this.store.get("startup");
    return !t || typeof t != "object" || Array.isArray(t) ? {} : { completedAt: typeof t.completedAt == "string" && t.completedAt.length > 0 ? t.completedAt : void 0 };
  }
  setStartupSettings(t) {
    const e = this.getStartupSettings(), a = Object.prototype.hasOwnProperty.call(t, "completedAt") ? t.completedAt : e.completedAt, o = a ? { completedAt: a } : {};
    return this.store.set("startup", o), o;
  }
  setStartupCompletedAt(t) {
    return this.setStartupSettings({ completedAt: t });
  }
  clearStartupCompletedAt() {
    return this.setStartupSettings({ completedAt: void 0 });
  }
  // 설정 초기화
  resetToDefaults() {
    this.store.clear(), Tt.info("Settings reset to defaults");
  }
  // 저장 경로 가져오기 (디버깅용)
  getSettingsPath() {
    return this.store.path;
  }
}
const _ = gt.getInstance(), dp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: gt,
  settingsManager: _
}, Symbol.toStringTag, { value: "Module" })), ps = () => ({
  timer: null,
  inFlight: null,
  dirty: !1
});
class us {
  constructor(t, e, n) {
    this.debounceMs = t, this.runExport = e, this.logger = n;
  }
  states = /* @__PURE__ */ new Map();
  getOrCreate(t) {
    const e = this.states.get(t);
    if (e) return e;
    const n = ps();
    return this.states.set(t, n), n;
  }
  cleanupIfIdle(t) {
    const e = this.states.get(t);
    e && (e.timer || e.inFlight || e.dirty || this.states.delete(t));
  }
  clearTimer(t) {
    t.timer && (clearTimeout(t.timer), t.timer = null);
  }
  schedule(t, e) {
    const n = this.getOrCreate(t);
    n.dirty = !0, this.clearTimer(n), n.timer = setTimeout(() => {
      n.timer = null, this.runLoop(t, e).catch((a) => {
        this.logger.error("Failed to export project package", { projectId: t, reason: e, error: a });
      });
    }, this.debounceMs);
  }
  async runLoop(t, e) {
    const n = this.getOrCreate(t);
    if (n.inFlight)
      return n.dirty = !0, n.inFlight;
    const o = (async () => {
      for (; n.dirty; )
        n.dirty = !1, await this.runExport(t);
    })().catch((s) => {
      throw this.logger.error("Failed to run package export", { projectId: t, reason: e, error: s }), s;
    }).finally(() => {
      n.inFlight = null, this.cleanupIfIdle(t);
    });
    return n.inFlight = o, o;
  }
  async flush(t = 8e3) {
    const e = Array.from(this.states.entries()).filter(([, d]) => !!(d.timer || d.inFlight || d.dirty)).map(([d]) => d);
    if (e.length === 0)
      return { total: 0, flushed: 0, failed: 0, timedOut: !1 };
    for (const d of e) {
      const l = this.getOrCreate(d);
      l.dirty = !0, this.clearTimer(l);
    }
    let n = 0, a = 0;
    const o = e.map(async (d) => {
      try {
        await this.runLoop(d, "flush"), n += 1;
      } catch (l) {
        a += 1, this.logger.error("Failed to flush pending package export", { projectId: d, error: l });
      }
    }), s = Promise.all(o).then(() => !0), c = await new Promise((d) => {
      const l = setTimeout(() => d(!0), t);
      s.then(() => {
        clearTimeout(l), d(!1);
      });
    });
    return {
      total: e.length,
      flushed: n,
      failed: a,
      timedOut: c
    };
  }
}
const hs = (r) => typeof r == "string" ? { id: r, deleteFile: !1 } : { id: r.id, deleteFile: !!r.deleteFile }, fs = async (r) => {
  if (!r.deleteFile || !r.projectPath || !r.projectPath.toLowerCase().endsWith(X)) return;
  const t = K(r.projectPath, "projectPath");
  await R.rm(t, { force: !0, recursive: !0 });
}, gs = async (r) => await Promise.all(
  r.map(async (t) => {
    const e = typeof t.projectPath == "string" ? t.projectPath : null;
    if (!!!(e && e.toLowerCase().endsWith(X)) || !e)
      return {
        ...t,
        pathMissing: !1
      };
    try {
      const a = K(e, "projectPath");
      return await R.access(a), {
        ...t,
        pathMissing: !1
      };
    } catch {
      return {
        ...t,
        pathMissing: !0
      };
    }
  })
), jt = (r, t = "") => {
  const e = r.trim();
  return e ? e.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, Ee = 5 * 1024 * 1024, Kt = (r) => rt.posix.normalize(r.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), me = (r) => {
  const t = Kt(r);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !rt.isAbsolute(t);
}, Qt = (r) => r.toLowerCase().endsWith(X) ? r : `${r}${X}`, xr = (r) => process.platform === "win32" ? r.toLowerCase() : r, Es = (r, t) => {
  const e = xr(rt.resolve(r)), n = xr(rt.resolve(t));
  return e === n || e.startsWith(`${n}${rt.sep}`);
}, Un = async (r, t, e) => {
  const n = Kt(t);
  if (!n || !me(n))
    throw new Error("INVALID_RELATIVE_PATH");
  let a = !1, o = null;
  return await new Promise((s, c) => {
    Ca.open(r, { lazyEntries: !0 }, (d, l) => {
      if (d || !l) {
        c(d ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      l.on("entry", (i) => {
        const p = Kt(i.fileName);
        if (!p || !me(p)) {
          e?.error("Unsafe zip entry skipped", { entry: i.fileName, zipPath: r }), l.readEntry();
          return;
        }
        if (p !== n) {
          l.readEntry();
          return;
        }
        if (i.fileName.endsWith("/")) {
          a = !0, o = null, l.close(), s();
          return;
        }
        l.openReadStream(i, (m, w) => {
          if (m || !w) {
            c(m ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          a = !0;
          const g = [], A = w;
          let S = 0;
          A.on("data", (I) => {
            if (S += I.length, S > Ee) {
              A.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${p}:${Ee}`
                )
              );
              return;
            }
            g.push(I);
          }), A.on("end", () => {
            o = Buffer.concat(g).toString("utf-8"), l.close(), s();
          }), A.on("error", c);
        });
      }), l.on("end", () => {
        a || s();
      }), l.on("error", c), l.readEntry();
    });
  }), o;
}, Z = async (r, t, e) => {
  const n = Qt(r), a = Kt(t);
  if (!a || !me(a))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const o = await H.stat(n);
    if (o.isDirectory()) {
      const s = await H.realpath(n), c = rt.resolve(n, a);
      try {
        const d = await H.realpath(c);
        if (!Es(d, s))
          throw new Error("INVALID_RELATIVE_PATH");
        const l = await H.stat(d);
        if (l.isDirectory())
          return null;
        if (l.size > Ee)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${a}:${Ee}`
          );
        return await H.readFile(d, "utf-8");
      } catch (d) {
        if (d?.code === "ENOENT") return null;
        throw d;
      }
    }
    if (o.isFile())
      return await Un(n, a, e);
  } catch (o) {
    if (o?.code === "ENOENT") return null;
    throw o;
  }
  return null;
}, Gr = (r) => {
  const t = C.resolve(r);
  return process.platform === "win32" ? t.toLowerCase() : t;
}, Hr = (r) => {
  if (typeof r != "string") return;
  const t = r.trim();
  return t.length > 0 ? K(t, "projectPath") : void 0;
}, Mn = (r, t) => {
  const e = K(r, t);
  return Qt(e);
}, Yr = async (r, t) => {
  const e = Gr(r), n = await h.getClient().project.findMany({
    select: {
      id: !0,
      title: !0,
      projectPath: !0
    }
  });
  for (const a of n)
    if (!(t && String(a.id) === t) && !(typeof a.projectPath != "string" || a.projectPath.trim().length === 0))
      try {
        const o = K(a.projectPath, "projectPath");
        if (Gr(o) === e)
          return {
            id: String(a.id),
            title: typeof a.title == "string" ? a.title : "",
            projectPath: o
          };
      } catch {
      }
  return null;
}, ms = async (r) => {
  const { projectId: t, projectPath: e, previousTitle: n, nextTitle: a, logger: o } = r;
  if (!(!e || n === a))
    try {
      const s = K(e, "projectPath"), d = `${C.dirname(s)}${C.sep}.luie${C.sep}${Ot}`, l = jt(n, ""), i = jt(a, "");
      if (!l || !i || l === i) return;
      const p = `${d}${C.sep}${l}`, m = `${d}${C.sep}${i}`;
      try {
        if (!(await R.stat(p)).isDirectory()) return;
      } catch {
        return;
      }
      await R.mkdir(C.dirname(m), { recursive: !0 }), await R.rename(p, m);
    } catch (s) {
      o.warn("Failed to rename snapshot directory after project title update", {
        projectId: t,
        previousTitle: n,
        nextTitle: a,
        error: s
      });
    }
}, As = (r) => {
  const t = C.resolve(r);
  return process.platform === "win32" ? t.toLowerCase() : t;
}, ys = (r) => {
  const t = /* @__PURE__ */ new Map();
  for (const e of r)
    if (!(typeof e.projectPath != "string" || e.projectPath.length === 0))
      try {
        const n = K(e.projectPath, "projectPath"), a = As(n), o = t.get(a) ?? [];
        o.push({
          id: String(e.id),
          projectPath: n,
          updatedAt: e.updatedAt instanceof Date ? e.updatedAt : new Date(String(e.updatedAt))
        }), t.set(a, o);
      } catch {
        continue;
      }
  return Array.from(t.values()).filter((e) => e.length > 1);
}, kn = (r) => {
  if (typeof r == "number") return r === Lt;
  if (typeof r == "string" && r.trim().length > 0) {
    const t = Number(r);
    return Number.isFinite(t) && t === Lt;
  }
  return !1;
}, Ss = (r) => {
  try {
    const t = JSON.parse(r);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, Ts = (r) => r && typeof r == "object" && !Array.isArray(r) ? r : {}, ws = (r, t) => {
  if (r.format !== Dt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: r.format }
    );
  if (r.container !== Nt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: r.container }
    );
  if (!kn(r.version))
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: r.version }
    );
}, _s = (r, t) => {
  const e = Ts(r), n = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), a = t.createdAtFallback ?? n;
  if (Object.prototype.hasOwnProperty.call(e, "format") && e.format !== Dt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: e.format }
    );
  if (Object.prototype.hasOwnProperty.call(e, "container") && e.container !== Nt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: e.container }
    );
  if (Object.prototype.hasOwnProperty.call(e, "version") && !kn(e.version))
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: e.version }
    );
  const o = typeof e.title == "string" && e.title.trim().length > 0 ? e.title : t.titleFallback, s = typeof e.createdAt == "string" && e.createdAt.length > 0 ? e.createdAt : a, c = typeof e.updatedAt == "string" && e.updatedAt.length > 0 ? e.updatedAt : n;
  return {
    ...e,
    format: Dt,
    container: Nt,
    version: Lt,
    title: o,
    createdAt: s,
    updatedAt: c
  };
}, Is = async (r, t) => {
  const e = await Un(r, Se, t);
  if (!e)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: r }
    );
  const n = Ss(e);
  if (!n)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: r }
    );
  ws(n, { source: r });
}, Ps = ".tmp", re = /* @__PURE__ */ new Map(), Cs = async (r) => {
  const t = rt.dirname(r);
  await H.mkdir(t, { recursive: !0 });
}, lp = async (r) => {
  try {
    return await H.access(r), !0;
  } catch {
    return !1;
  }
}, Rs = async (r, t) => {
  const e = rt.resolve(Qt(r)), a = (re.get(e) ?? Promise.resolve()).catch(() => {
  }).then(t), o = a.then(
    () => {
    },
    () => {
    }
  );
  re.set(e, o);
  try {
    return await a;
  } finally {
    re.get(e) === o && re.delete(e);
  }
}, Ds = async (r, t) => {
  const e = new Ra.ZipFile(), n = Sa.createWriteStream(r), a = new Promise((o, s) => {
    n.on("close", () => o()), n.on("error", s), e.outputStream.on("error", s);
  });
  e.outputStream.pipe(n), await t(e), e.end(), await a;
}, Ns = async (r, t, e) => {
  const n = `${t}.bak-${Date.now()}`;
  let a = !1;
  try {
    await H.rename(r, t);
    return;
  } catch (o) {
    const s = o;
    if (s?.code !== "EEXIST" && s?.code !== "ENOTEMPTY" && s?.code !== "EPERM" && s?.code !== "EISDIR")
      throw o;
  }
  try {
    await H.rename(t, n), a = !0, await H.rename(r, t), await H.rm(n, { force: !0, recursive: !0 });
  } catch (o) {
    if (e.error("Atomic replace failed", { error: o, targetPath: t }), a)
      try {
        await H.rename(n, t);
      } catch (s) {
        e.error("Failed to restore backup", { restoreError: s, targetPath: t, backupPath: n });
      }
    throw o;
  }
}, Ls = () => [
  { name: `${Ft}/`, isDirectory: !0 },
  { name: `${x}/`, isDirectory: !0 },
  { name: `${Ot}/`, isDirectory: !0 },
  { name: `${Oo}/`, isDirectory: !0 }
], pp = (r) => ({
  name: Se,
  content: JSON.stringify(r ?? {}, null, 2)
}), Os = async (r, t) => {
  for (const e of t) {
    const n = Kt(e.name);
    if (!n || !me(n))
      throw new Error("INVALID_ZIP_ENTRY_PATH");
    if (e.isDirectory) {
      r.addEmptyDirectory(n.endsWith("/") ? n : `${n}/`);
      continue;
    }
    if (e.fromFilePath) {
      r.addFile(e.fromFilePath, n);
      continue;
    }
    const a = Buffer.from(e.content ?? "", "utf-8");
    r.addBuffer(a, n);
  }
}, Sr = async (r, t, e) => {
  const n = Qt(r);
  return await Rs(n, async () => {
    await Cs(n);
    const a = (/* @__PURE__ */ new Date()).toISOString(), o = _s(t.meta, {
      titleFallback: rt.basename(n, X),
      nowIso: a,
      createdAtFallback: a
    }), s = `${n}${Ps}-${Date.now()}`, c = [
      ...Ls(),
      {
        name: Se,
        content: JSON.stringify(o, null, 2)
      },
      {
        name: `${x}/${Fn}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${x}/${vn}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${x}/${Jt}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${x}/${Te}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${x}/${we}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${x}/${_e}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${x}/${yr}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${x}/${Ie}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${Ot}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const d of t.chapters ?? [])
      d.id && c.push({
        name: `${Ft}/${d.id}${Pe}`,
        content: d.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const d of t.snapshots)
        d.id && c.push({
          name: `${Ot}/${d.id}.snap`,
          content: JSON.stringify(d, null, 2)
        });
    await Ds(s, (d) => Os(d, c)), await Is(s, e), await Ns(s, n, e);
  });
}, Wn = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), js = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), v = (r) => !!(r && typeof r == "object" && !Array.isArray(r)), Bn = (r) => {
  if (!r) return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, bs = (r) => {
  if (v(r))
    return typeof r.updatedAt == "string" ? r.updatedAt : void 0;
}, Fs = (r, t = "pen") => typeof r == "string" && js.has(r) ? r : t, vs = (r, t = "mountain") => typeof r == "string" && Wn.has(r) ? r : t, $n = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!v(n)) continue;
    const a = n.type;
    if (a !== "path" && a !== "text" && a !== "icon") continue;
    const o = {
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `path-${e}`,
      type: a,
      color: typeof n.color == "string" ? n.color : "#000000"
    };
    typeof n.d == "string" && (o.d = n.d), typeof n.width == "number" && (o.width = n.width), typeof n.x == "number" && (o.x = n.x), typeof n.y == "number" && (o.y = n.y), typeof n.text == "string" && (o.text = n.text), typeof n.icon == "string" && Wn.has(n.icon) && (o.icon = n.icon), t.push(o);
  }
  return t;
}, xn = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!v(n)) continue;
    const a = n.position;
    if (!v(a)) continue;
    const o = v(n.data) ? n.data : void 0;
    t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `node-${e}`,
      type: typeof n.type == "string" ? n.type : void 0,
      position: {
        x: typeof a.x == "number" ? a.x : 0,
        y: typeof a.y == "number" ? a.y : 0
      },
      data: {
        label: typeof o?.label == "string" ? o.label : "",
        image: typeof o?.image == "string" ? o.image : void 0
      }
    });
  }
  return t;
}, Gn = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!v(n)) continue;
    const a = typeof n.source == "string" ? n.source : "", o = typeof n.target == "string" ? n.target : "";
    !a || !o || t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `edge-${e}`,
      source: a,
      target: o,
      type: typeof n.type == "string" ? n.type : void 0
    });
  }
  return t;
}, Us = (r, t, e) => v(r) ? {
  id: typeof r.id == "string" && r.id.length > 0 ? r.id : `memo-${t}`,
  title: typeof r.title == "string" ? r.title : "",
  content: typeof r.content == "string" ? r.content : "",
  tags: Array.isArray(r.tags) ? r.tags.filter((n) => typeof n == "string") : [],
  updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : e()
} : null, Hn = (r, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(r) ? r.map((e, n) => Us(e, n, t)).filter((e) => e !== null) : [], Yn = (r, t = () => (/* @__PURE__ */ new Date()).toISOString()) => v(r) ? {
  memos: Hn(r.memos, t),
  updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
} : { memos: [] }, kt = (r) => {
  if (!r) return null;
  try {
    const t = JSON.parse(r);
    return t && typeof t == "object" && !Array.isArray(t) ? t : null;
  } catch {
    return null;
  }
}, Ms = (r) => {
  const t = r.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    updatedAt: n.updatedAt,
    content: n.content,
    file: `${Ft}/${n.id}${Pe}`
  })), e = t.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    file: n.file
  }));
  return { exportChapters: t, chapterMeta: e };
}, ks = (r) => r.map((t) => {
  let e;
  if (t.attributes)
    try {
      e = JSON.parse(t.attributes);
    } catch {
      e = t.attributes;
    }
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    firstAppearance: t.firstAppearance,
    attributes: e,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}), Ws = (r) => r.map((t) => ({
  id: t.id,
  term: t.term,
  definition: t.definition,
  category: t.category,
  firstAppearance: t.firstAppearance,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
})), Bs = (r, t) => {
  const e = r.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    chapterId: n.chapterId,
    content: n.content,
    description: n.description,
    createdAt: n.createdAt?.toISOString?.() ?? String(n.createdAt)
  }));
  return t > 0 ? e.slice(0, t) : e;
}, $s = (r, t) => {
  const e = t.success ? t.data : void 0;
  return {
    synopsis: r.description ?? (typeof e?.synopsis == "string" ? e.synopsis : ""),
    status: e?.status ?? "draft",
    genre: typeof e?.genre == "string" ? e.genre : void 0,
    targetAudience: typeof e?.targetAudience == "string" ? e.targetAudience : void 0,
    logline: typeof e?.logline == "string" ? e.logline : void 0,
    updatedAt: typeof e?.updatedAt == "string" ? e.updatedAt : void 0
  };
}, xs = (r) => !r.success || !Array.isArray(r.data.columns) ? { columns: [] } : {
  columns: r.data.columns,
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
}, Gs = (r) => !r.success || !Array.isArray(r.data.paths) ? { paths: [] } : {
  paths: $n(r.data.paths),
  tool: r.data.tool,
  iconType: r.data.iconType,
  color: typeof r.data.color == "string" ? r.data.color : void 0,
  lineWidth: typeof r.data.lineWidth == "number" ? r.data.lineWidth : void 0,
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
}, Hs = (r) => r.success ? {
  nodes: xn(r.data.nodes),
  edges: Gn(r.data.edges),
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
} : { nodes: [], edges: [] }, Ys = (r) => r.success ? {
  memos: Hn(r.data.memos),
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
} : { memos: [] }, zs = (r) => {
  const t = [
    ...r.characters.map((n) => ({
      id: n.id,
      entityType: "Character",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: kt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...r.factions.map((n) => ({
      id: n.id,
      entityType: "Faction",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: kt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...r.events.map((n) => ({
      id: n.id,
      entityType: "Event",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: kt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...r.terms.map((n) => ({
      id: n.id,
      entityType: "Term",
      name: n.term,
      description: n.definition ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: n.category ? { tags: [n.category] } : null,
      positionX: 0,
      positionY: 0
    })),
    ...r.worldEntities.map((n) => ({
      id: n.id,
      entityType: n.type,
      subType: n.type,
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: typeof n.attributes == "string" ? kt(n.attributes) : n.attributes ?? null,
      positionX: n.positionX,
      positionY: n.positionY
    }))
  ], e = r.entityRelations.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    sourceId: n.sourceId,
    sourceType: n.sourceType,
    targetId: n.targetId,
    targetType: n.targetType,
    relation: n.relation,
    attributes: typeof n.attributes == "string" ? kt(n.attributes) : n.attributes ?? null,
    sourceWorldEntityId: n.sourceWorldEntityId ?? null,
    targetWorldEntityId: n.targetWorldEntityId ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  }));
  return {
    nodes: t,
    edges: e
  };
}, Xs = (r, t) => ({
  format: Dt,
  container: Nt,
  version: Lt,
  projectId: r.id,
  title: r.title,
  description: r.description,
  createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
  chapters: t
}), Ks = u.object({
  format: u.string().optional(),
  version: u.number().optional(),
  projectId: u.string().optional(),
  title: u.string().optional(),
  description: u.string().optional().nullable(),
  createdAt: u.string().optional(),
  updatedAt: u.string().optional(),
  chapters: u.array(
    u.object({
      id: u.string().optional(),
      title: u.string().optional(),
      order: u.number().optional(),
      file: u.string().optional(),
      content: u.string().optional(),
      updatedAt: u.string().optional()
    })
  ).optional()
}).passthrough(), Vs = u.object({
  characters: u.array(u.record(u.string(), u.unknown())).optional()
}).passthrough(), qs = u.object({
  terms: u.array(u.record(u.string(), u.unknown())).optional()
}).passthrough(), tr = u.object({
  synopsis: u.string().optional(),
  status: u.enum(["draft", "working", "locked"]).optional(),
  genre: u.string().optional(),
  targetAudience: u.string().optional(),
  logline: u.string().optional(),
  updatedAt: u.string().optional()
}).passthrough(), zr = u.object({
  columns: u.array(
    u.object({
      id: u.string(),
      title: u.string(),
      cards: u.array(
        u.object({
          id: u.string(),
          content: u.string()
        })
      )
    })
  ).optional(),
  updatedAt: u.string().optional()
}).passthrough(), Xr = u.object({
  paths: u.array(u.record(u.string(), u.unknown())).optional(),
  tool: u.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: u.enum(["mountain", "castle", "village"]).optional(),
  color: u.string().optional(),
  lineWidth: u.number().optional(),
  updatedAt: u.string().optional()
}).passthrough(), Kr = u.object({
  nodes: u.array(u.record(u.string(), u.unknown())).optional(),
  edges: u.array(u.record(u.string(), u.unknown())).optional(),
  updatedAt: u.string().optional()
}).passthrough(), Vr = u.object({
  memos: u.array(u.record(u.string(), u.unknown())).optional(),
  updatedAt: u.string().optional()
}).passthrough(), Js = u.object({
  id: u.string(),
  entityType: u.string(),
  subType: u.string().optional(),
  name: u.string(),
  description: u.string().optional().nullable(),
  firstAppearance: u.string().optional().nullable(),
  attributes: u.record(u.string(), u.unknown()).optional().nullable(),
  positionX: u.number().optional(),
  positionY: u.number().optional()
}).passthrough(), Qs = u.object({
  id: u.string(),
  sourceId: u.string(),
  sourceType: u.string(),
  targetId: u.string(),
  targetType: u.string(),
  relation: u.string(),
  attributes: u.record(u.string(), u.unknown()).optional().nullable(),
  createdAt: u.string().optional(),
  updatedAt: u.string().optional()
}).passthrough(), Zs = u.object({
  nodes: u.array(Js).optional(),
  edges: u.array(Qs).optional(),
  updatedAt: u.string().optional()
}).passthrough(), ti = u.object({
  id: u.string(),
  projectId: u.string().optional(),
  chapterId: u.string().optional().nullable(),
  content: u.string().optional(),
  description: u.string().optional().nullable(),
  createdAt: u.string().optional()
}).passthrough(), ei = u.object({
  snapshots: u.array(ti).optional()
}).passthrough(), ri = (r, t, e, n) => {
  if (typeof r != "string" || r.trim().length === 0)
    return t.safeParse(null);
  let a;
  try {
    a = JSON.parse(r);
  } catch (s) {
    return n.warn("Invalid .luie world JSON; using default during export", {
      packagePath: e.packagePath,
      entryPath: e.entryPath,
      label: e.label,
      error: s
    }), t.safeParse(null);
  }
  const o = t.safeParse(a);
  return o.success || n.warn("Invalid .luie world format; using default during export", {
    packagePath: e.packagePath,
    entryPath: e.entryPath,
    label: e.label,
    issues: o.error.issues
  }), o;
}, ni = async (r) => await h.getClient().project.findUnique({
  where: { id: r },
  include: {
    chapters: { where: { deletedAt: null }, orderBy: { order: "asc" } },
    characters: !0,
    terms: !0,
    factions: !0,
    events: !0,
    worldEntities: !0,
    entityRelations: !0,
    snapshots: { orderBy: { createdAt: "desc" } }
  }
}), ai = (r, t, e) => {
  if (!t)
    return e.info("Skipping package export (missing projectPath)", { projectId: r }), null;
  if (!t.toLowerCase().endsWith(X))
    return e.info("Skipping package export (not .luie)", {
      projectId: r,
      projectPath: t
    }), null;
  try {
    return K(t, "projectPath");
  } catch (n) {
    return e.warn("Skipping package export (invalid projectPath)", {
      projectId: r,
      projectPath: t,
      error: n
    }), null;
  }
}, oi = async (r, t) => {
  if (!r || !r.toLowerCase().endsWith(X))
    return {
      synopsis: tr.safeParse(null),
      plot: zr.safeParse(null),
      drawing: Xr.safeParse(null),
      mindmap: Kr.safeParse(null),
      memos: Vr.safeParse(null)
    };
  const e = async (d, l, i) => {
    const p = `${x}/${d}`;
    try {
      const m = await Z(r, p, t);
      return ri(
        m,
        l,
        {
          packagePath: r,
          entryPath: p,
          label: i
        },
        t
      );
    } catch (m) {
      return t.warn("Failed to read .luie world document; using default during export", {
        projectPath: r,
        entryPath: p,
        label: i,
        error: m
      }), l.safeParse(null);
    }
  }, [n, a, o, s, c] = await Promise.all([
    e(
      Jt,
      tr,
      "synopsis"
    ),
    e(Te, zr, "plot"),
    e(we, Xr, "drawing"),
    e(_e, Kr, "mindmap"),
    e(
      yr,
      Vr,
      "scrap-memos"
    )
  ]);
  return {
    synopsis: n,
    plot: a,
    drawing: o,
    mindmap: s,
    memos: c
  };
}, si = async (r) => {
  const t = await ni(r.projectId);
  if (!t) return !1;
  const e = r.options?.targetPath ? Mn(r.options.targetPath, "targetPath") : ai(r.projectId, t.projectPath, r.logger);
  if (!e) return !1;
  const n = r.options?.worldSourcePath === void 0 ? e : r.options.worldSourcePath, { exportChapters: a, chapterMeta: o } = Ms(t.chapters), s = ks(t.characters), c = Ws(t.terms), d = _.getAll().snapshotExportLimit ?? ge, l = Bs(t.snapshots, d), i = await oi(n, r.logger), p = $s(t, i.synopsis), m = xs(i.plot), w = Gs(i.drawing), g = Hs(i.mindmap), A = Ys(i.memos), S = zs(t), I = Xs(t, o);
  return r.logger.info("Exporting .luie package", {
    projectId: r.projectId,
    projectPath: e,
    chapterCount: a.length,
    characterCount: s.length,
    termCount: c.length,
    worldNodeCount: S.nodes.length,
    relationCount: S.edges.length,
    snapshotCount: l.length
  }), await Sr(
    e,
    {
      meta: I,
      chapters: a,
      characters: s,
      terms: c,
      synopsis: p,
      plot: m,
      drawing: w,
      mindmap: g,
      memos: A,
      graph: S,
      snapshots: l
    },
    r.logger
  ), !0;
}, ii = async (r) => {
  const t = [];
  for (let e = 0; e < r.chaptersMeta.length; e += 1) {
    const n = r.chaptersMeta[e], a = n.id ?? Y(), o = n.file ?? `${Ft}/${a}${Pe}`, s = typeof n.content == "string" ? n.content : await r.readChapterEntry(o);
    if (s === null)
      throw new f(
        E.VALIDATION_FAILED,
        "Missing chapter content entry in .luie package",
        {
          packagePath: r.packagePath,
          entryPath: o,
          chapterId: a
        }
      );
    const c = s ?? "";
    t.push({
      id: a,
      projectId: r.resolvedProjectId,
      title: n.title ?? `Chapter ${e + 1}`,
      content: c,
      synopsis: null,
      order: typeof n.order == "number" ? n.order : e,
      wordCount: c.length
    });
  }
  return t;
}, ci = (r, t) => t.map((e, n) => {
  const a = typeof e.name == "string" && e.name.trim().length > 0 ? e.name : `Character ${n + 1}`, o = typeof e.attributes == "string" ? e.attributes : e.attributes ? JSON.stringify(e.attributes) : null;
  return {
    id: typeof e.id == "string" ? e.id : Y(),
    projectId: r,
    name: a,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: o
  };
}), di = (r, t) => t.map((e, n) => {
  const a = typeof e.term == "string" && e.term.trim().length > 0 ? e.term : `Term ${n + 1}`;
  return {
    id: typeof e.id == "string" ? e.id : Y(),
    projectId: r,
    term: a,
    definition: typeof e.definition == "string" ? e.definition : null,
    category: typeof e.category == "string" ? e.category : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null
  };
}), li = (r) => {
  const t = /* @__PURE__ */ new Set(), e = [];
  for (const n of r.snapshots) {
    if (typeof n.id != "string" || n.id.trim().length === 0 || t.has(n.id))
      continue;
    t.add(n.id);
    const a = typeof n.content == "string" ? n.content : "", o = typeof n.chapterId == "string" ? n.chapterId.trim() : "", s = o.length > 0 && r.validChapterIds.has(o);
    o.length > 0 && !s && r.logger.warn("Snapshot chapter reference missing during .luie import; detaching snapshot", {
      snapshotId: n.id,
      chapterId: o,
      projectId: r.resolvedProjectId
    });
    const c = typeof n.createdAt == "string" && n.createdAt.trim().length > 0 ? new Date(n.createdAt) : /* @__PURE__ */ new Date(), d = Number.isNaN(c.getTime()) ? /* @__PURE__ */ new Date() : c;
    e.push({
      id: n.id,
      projectId: r.resolvedProjectId,
      chapterId: s ? o : null,
      content: a,
      contentLength: a.length,
      description: typeof n.description == "string" ? n.description : null,
      createdAt: d
    });
  }
  return e;
}, pi = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], ui = ["Place", "Concept", "Rule", "Item"], hi = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], er = (r) => typeof r == "string" && pi.includes(r), rr = (r) => typeof r == "string" && ui.includes(r), fi = (r) => typeof r == "string" && hi.includes(r), Zt = (r) => {
  if (r == null)
    return null;
  if (typeof r == "string")
    return r;
  try {
    return JSON.stringify(r);
  } catch {
    return null;
  }
}, gi = (r, t) => rr(r) ? r : r === "WorldEntity" && rr(t) ? t : null, Ei = (r, t) => ({
  charactersForCreate: [...r],
  termsForCreate: [...t],
  factionsForCreate: [],
  eventsForCreate: [],
  worldEntitiesForCreate: [],
  relationsForCreate: [],
  characterIds: new Set(r.map((e) => e.id)),
  termIds: new Set(t.map((e) => e.id)),
  factionIds: /* @__PURE__ */ new Set(),
  eventIds: /* @__PURE__ */ new Set(),
  worldEntityIds: /* @__PURE__ */ new Set()
}), mi = (r) => er(r.entityType) ? r.entityType : rr(r.subType) ? r.subType : null, Ai = (r, t, e) => {
  !e.id || !e.name || r.characterIds.has(e.id) || (r.characterIds.add(e.id), r.charactersForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: Zt(e.attributes)
  }));
}, yi = (r, t, e) => {
  if (!e.id || !e.name || r.termIds.has(e.id)) return;
  r.termIds.add(e.id);
  const n = Array.isArray(e.attributes?.tags) ? e.attributes.tags.find((a) => typeof a == "string") : null;
  r.termsForCreate.push({
    id: e.id,
    projectId: t,
    term: e.name,
    definition: typeof e.description == "string" ? e.description : null,
    category: n ?? null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null
  });
}, Si = (r, t, e) => {
  !e.id || !e.name || r.factionIds.has(e.id) || (r.factionIds.add(e.id), r.factionsForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: Zt(e.attributes)
  }));
}, Ti = (r, t, e) => {
  !e.id || !e.name || r.eventIds.has(e.id) || (r.eventIds.add(e.id), r.eventsForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: Zt(e.attributes)
  }));
}, wi = (r, t, e, n) => {
  if (!n.id || !n.name) return;
  const a = gi(e, n.subType);
  !a || r.worldEntityIds.has(n.id) || (r.worldEntityIds.add(n.id), r.worldEntitiesForCreate.push({
    id: n.id,
    projectId: t,
    type: a,
    name: n.name,
    description: typeof n.description == "string" ? n.description : null,
    firstAppearance: typeof n.firstAppearance == "string" ? n.firstAppearance : null,
    attributes: Zt(n.attributes),
    positionX: typeof n.positionX == "number" ? n.positionX : 0,
    positionY: typeof n.positionY == "number" ? n.positionY : 0
  }));
}, qr = (r, t, e) => {
  switch (t) {
    case "Character":
      return r.characterIds.has(e);
    case "Term":
      return r.termIds.has(e);
    case "Faction":
      return r.factionIds.has(e);
    case "Event":
      return r.eventIds.has(e);
    case "Place":
    case "Concept":
    case "Rule":
    case "Item":
    case "WorldEntity":
      return r.worldEntityIds.has(e);
    default:
      return !1;
  }
}, _i = (r, t, e) => {
  if (!e.id || !e.name)
    return;
  const n = mi(e);
  if (n) {
    if (n === "Character") {
      Ai(r, t, e);
      return;
    }
    if (n === "Term") {
      yi(r, t, e);
      return;
    }
    if (n === "Faction") {
      Si(r, t, e);
      return;
    }
    if (n === "Event") {
      Ti(r, t, e);
      return;
    }
    wi(r, t, n, e);
  }
}, Ii = (r, t, e) => {
  !e.sourceId || !e.targetId || !er(e.sourceType) || !er(e.targetType) || fi(e.relation) && (!qr(r, e.sourceType, e.sourceId) || !qr(r, e.targetType, e.targetId) || r.relationsForCreate.push({
    id: e.id || Y(),
    projectId: t,
    sourceId: e.sourceId,
    sourceType: e.sourceType,
    targetId: e.targetId,
    targetType: e.targetType,
    relation: e.relation,
    attributes: Zt(e.attributes),
    sourceWorldEntityId: jr(e.sourceType) && r.worldEntityIds.has(e.sourceId) ? e.sourceId : null,
    targetWorldEntityId: jr(e.targetType) && r.worldEntityIds.has(e.targetId) ? e.targetId : null
  }));
}, Pi = (r) => {
  const t = Ei(r.baseCharacters, r.baseTerms);
  if (!r.graph)
    return t;
  for (const e of r.graph.nodes ?? [])
    _i(t, r.projectId, e);
  for (const e of r.graph.edges ?? [])
    Ii(t, r.projectId, e);
  return t;
}, Ci = async (r) => {
  const {
    resolvedProjectId: t,
    legacyProjectId: e,
    existing: n,
    meta: a,
    worldSynopsis: o,
    resolvedPath: s,
    chaptersForCreate: c,
    charactersForCreate: d,
    termsForCreate: l,
    factionsForCreate: i,
    eventsForCreate: p,
    worldEntitiesForCreate: m,
    relationsForCreate: w,
    snapshotsForCreate: g
  } = r;
  return await h.getClient().$transaction(async (A) => {
    e && await A.project.delete({ where: { id: e } }), n && await A.project.delete({ where: { id: t } });
    const S = await A.project.create({
      data: {
        id: t,
        title: a.title ?? "Recovered Project",
        description: (typeof a.description == "string" ? a.description : void 0) ?? o ?? void 0,
        projectPath: s,
        createdAt: a.createdAt ? new Date(a.createdAt) : void 0,
        updatedAt: a.updatedAt ? new Date(a.updatedAt) : void 0,
        settings: {
          create: {
            autoSave: !0,
            autoSaveInterval: ye
          }
        }
      },
      include: { settings: !0 }
    });
    return c.length > 0 && await A.chapter.createMany({ data: c }), d.length > 0 && await A.character.createMany({ data: d }), l.length > 0 && await A.term.createMany({ data: l }), i.length > 0 && await A.faction.createMany({ data: i }), p.length > 0 && await A.event.createMany({ data: p }), m.length > 0 && await A.worldEntity.createMany({ data: m }), w.length > 0 && await A.entityRelation.createMany({ data: w }), g.length > 0 && await A.snapshot.createMany({ data: g }), S;
  });
}, Wt = (r, t, e) => {
  if (typeof r != "string" || r.trim().length === 0)
    return null;
  let n;
  try {
    n = JSON.parse(r);
  } catch (o) {
    throw new f(
      E.VALIDATION_FAILED,
      `Invalid ${e.label} JSON in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath
      },
      o
    );
  }
  const a = t.safeParse(n);
  if (!a.success)
    throw new f(
      E.VALIDATION_FAILED,
      `Invalid ${e.label} format in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath,
        issues: a.error.issues
      }
    );
  return a.data;
}, Ri = async (r) => await h.getClient().project.findFirst({
  where: { projectPath: r },
  select: { id: !0, updatedAt: !0 }
}), Di = async (r, t) => {
  try {
    await R.access(r);
  } catch {
    return {
      meta: null,
      luieCorrupted: !0,
      recoveryReason: "missing"
    };
  }
  try {
    const e = await Z(r, Se, t);
    if (!e)
      throw new Error("MISSING_META");
    const n = Ks.safeParse(JSON.parse(e));
    if (!n.success)
      throw new Error("INVALID_META");
    return { meta: n.data, luieCorrupted: !1 };
  } catch (e) {
    return t.warn("Failed to read .luie meta; treating as corrupted", {
      packagePath: r,
      error: e
    }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
  }
}, Ni = (r, t) => {
  const n = (typeof r.projectId == "string" ? r.projectId : void 0) ?? t?.id ?? Y(), a = t && t.id !== n ? t.id : null;
  return { resolvedProjectId: n, legacyProjectId: a };
}, Li = (r = /* @__PURE__ */ new Date()) => {
  const t = (e) => String(e).padStart(2, "0");
  return `${r.getFullYear()}${t(r.getMonth() + 1)}${t(r.getDate())}-${t(r.getHours())}${t(r.getMinutes())}${t(r.getSeconds())}`;
}, Oi = async (r) => {
  const t = Qt(r), e = X, a = t.toLowerCase().endsWith(e) ? t.slice(0, t.length - e.length) : t, o = Li();
  let s = `${a}.recovered-${o}${e}`, c = 1;
  for (; ; )
    try {
      await R.access(s), s = `${a}.recovered-${o}-${c}${e}`, c += 1;
    } catch {
      return s;
    }
}, ji = async (r, t) => {
  const e = `${x}/${Fn}`, n = `${x}/${vn}`, a = `${Ot}/index.json`, o = `${x}/${Jt}`, s = `${x}/${Ie}`, [c, d, l, i, p] = await Promise.all([
    Z(r, e, t),
    Z(r, n, t),
    Z(r, a, t),
    Z(r, o, t),
    Z(r, s, t)
  ]), m = Wt(c, Vs, {
    packagePath: r,
    entryPath: e,
    label: "world characters"
  }), w = Wt(d, qs, {
    packagePath: r,
    entryPath: n,
    label: "world terms"
  }), g = Wt(l, ei, {
    packagePath: r,
    entryPath: a,
    label: "snapshot index"
  }), A = Wt(
    i,
    tr,
    {
      packagePath: r,
      entryPath: o,
      label: "world synopsis"
    }
  ), S = Wt(p, Zs, {
    packagePath: r,
    entryPath: s,
    label: "world graph"
  });
  return {
    characters: m?.characters ?? [],
    terms: w?.terms ?? [],
    snapshots: g?.snapshots ?? [],
    worldSynopsis: A && typeof A.synopsis == "string" ? A.synopsis : void 0,
    graph: S ? {
      nodes: S.nodes ?? [],
      edges: S.edges ?? [],
      updatedAt: S.updatedAt
    } : void 0
  };
}, bi = async (r) => {
  const t = Mn(r.packagePath, "packagePath"), { meta: e, luieCorrupted: n, recoveryReason: a } = await Di(
    t,
    r.logger
  ), o = await Ri(t);
  if (n) {
    if (!o)
      throw new f(
        E.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: t }
      );
    const I = await Oi(t);
    if (!await r.exportRecoveredPackage(o.id, I))
      throw new f(
        E.FS_WRITE_FAILED,
        "Failed to write recovered .luie package",
        { packagePath: t, recoveryPath: I }
      );
    return await h.getClient().project.update({
      where: { id: o.id },
      data: { projectPath: I }
    }), {
      project: await r.getProjectById(o.id),
      recovery: !0,
      recoveryPath: I,
      recoveryReason: a ?? "corrupt"
    };
  }
  if (!e)
    throw new f(
      E.VALIDATION_FAILED,
      "Invalid .luie meta format",
      { packagePath: t }
    );
  const { resolvedProjectId: s, legacyProjectId: c } = Ni(e, o), d = await h.getClient().project.findUnique({
    where: { id: s },
    select: { id: !0, updatedAt: !0 }
  }), l = e.chapters ?? [], i = await ji(t, r.logger), p = await ii({
    packagePath: t,
    resolvedProjectId: s,
    chaptersMeta: l,
    readChapterEntry: async (I) => await Z(t, I, r.logger)
  }), m = ci(
    s,
    i.characters
  ), w = di(s, i.terms), g = Pi({
    projectId: s,
    graph: i.graph,
    baseCharacters: m,
    baseTerms: w
  }), A = li({
    resolvedProjectId: s,
    snapshots: i.snapshots,
    validChapterIds: new Set(p.map((I) => I.id)),
    logger: r.logger
  }), S = await Ci({
    resolvedProjectId: s,
    legacyProjectId: c,
    existing: d,
    meta: e,
    worldSynopsis: i.worldSynopsis,
    resolvedPath: t,
    chaptersForCreate: p,
    charactersForCreate: g.charactersForCreate,
    termsForCreate: g.termsForCreate,
    factionsForCreate: g.factionsForCreate,
    eventsForCreate: g.eventsForCreate,
    worldEntitiesForCreate: g.worldEntitiesForCreate,
    relationsForCreate: g.relationsForCreate,
    snapshotsForCreate: A
  });
  return r.logger.info(".luie package hydrated", {
    projectId: S.id,
    chapterCount: p.length,
    characterCount: g.charactersForCreate.length,
    termCount: g.termsForCreate.length,
    factionCount: g.factionsForCreate.length,
    eventCount: g.eventsForCreate.length,
    worldEntityCount: g.worldEntitiesForCreate.length,
    relationCount: g.relationsForCreate.length,
    snapshotCount: A.length
  }), { project: S, conflict: "luie-newer" };
}, U = D("ProjectService");
class Fi {
  exportQueue = new us(
    ho,
    async (t) => {
      await this.exportProjectPackage(t);
    },
    U
  );
  async reconcileProjectPathDuplicates() {
    const t = await h.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: {
        id: !0,
        projectPath: !0,
        updatedAt: !0
      }
    }), e = ys(
      t.map((s) => ({
        id: String(s.id),
        projectPath: typeof s.projectPath == "string" ? s.projectPath : null,
        updatedAt: s.updatedAt
      }))
    ), n = await Promise.all(
      e.map(async (s) => {
        const c = [...s].sort(
          (i, p) => p.updatedAt.getTime() - i.updatedAt.getTime()
        ), d = c[0], l = c.slice(1);
        return await Promise.all(
          l.map(async (i) => {
            await h.getClient().project.update({
              where: { id: i.id },
              data: { projectPath: null }
            }), U.warn("Cleared duplicate projectPath from stale record", {
              keepProjectId: d.id,
              staleProjectId: i.id,
              projectPath: i.projectPath
            });
          })
        ), l.length;
      })
    ), a = e.length, o = n.reduce(
      (s, c) => s + c,
      0
    );
    return a > 0 && U.info("Project path duplicate reconciliation completed", {
      duplicateGroups: a,
      clearedRecords: o
    }), { duplicateGroups: a, clearedRecords: o };
  }
  async createProject(t) {
    try {
      U.info("Creating project", t);
      const e = Hr(t.projectPath);
      if (e) {
        const o = await Yr(e);
        if (o)
          throw new f(
            E.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath: e, conflictProjectId: o.id }
          );
      }
      const n = await h.getClient().project.create({
        data: {
          title: t.title,
          description: t.description,
          projectPath: e,
          settings: {
            create: {
              autoSave: !0,
              autoSaveInterval: ye
            }
          }
        },
        include: {
          settings: !0
        }
      }), a = String(n.id);
      return U.info("Project created successfully", { projectId: a }), this.schedulePackageExport(a, "project:create"), n;
    } catch (e) {
      throw U.error("Failed to create project", e), new f(
        E.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        e
      );
    }
  }
  async openLuieProject(t) {
    try {
      return await bi({
        packagePath: t,
        logger: U,
        exportRecoveredPackage: async (e, n) => await this.exportProjectPackageWithOptions(e, {
          targetPath: n,
          worldSourcePath: null
        }),
        getProjectById: async (e) => await this.getProject(e)
      });
    } catch (e) {
      throw U.error("Failed to open .luie package", { packagePath: t, error: e }), e instanceof f ? e : new f(
        E.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath: t },
        e
      );
    }
  }
  async getProject(t) {
    try {
      const e = await h.getClient().project.findUnique({
        where: { id: t },
        include: {
          settings: !0,
          chapters: {
            where: { deletedAt: null },
            orderBy: { order: "asc" }
          },
          characters: !0,
          terms: !0
        }
      });
      if (!e)
        throw new f(
          E.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw U.error("Failed to get project", e), e;
    }
  }
  async getAllProjects() {
    try {
      const t = await h.getClient().project.findMany({
        select: {
          id: !0,
          title: !0,
          description: !0,
          projectPath: !0,
          createdAt: !0,
          updatedAt: !0
        },
        orderBy: { updatedAt: "desc" }
      });
      return await gs(
        t.map((e) => ({
          ...e,
          id: String(e.id),
          description: typeof e.description == "string" ? e.description : null,
          projectPath: typeof e.projectPath == "string" ? e.projectPath : null
        }))
      );
    } catch (t) {
      throw U.error("Failed to get all projects", t), new f(
        E.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async updateProject(t) {
    try {
      const e = t.projectPath === void 0 ? void 0 : Hr(t.projectPath) ?? null;
      if (e) {
        const l = await Yr(
          e,
          t.id
        );
        if (l)
          throw new f(
            E.VALIDATION_FAILED,
            "Project path is already registered",
            {
              projectPath: e,
              conflictProjectId: l.id,
              projectId: t.id
            }
          );
      }
      const n = await h.getClient().project.findUnique({
        where: { id: t.id },
        select: { title: !0, projectPath: !0 }
      }), a = await h.getClient().project.update({
        where: { id: t.id },
        data: {
          title: t.title,
          description: t.description,
          projectPath: e
        }
      }), o = typeof n?.title == "string" ? n.title : "", s = typeof a.title == "string" ? a.title : "", c = typeof a.projectPath == "string" ? a.projectPath : null;
      await ms({
        projectId: String(a.id),
        projectPath: c,
        previousTitle: o,
        nextTitle: s,
        logger: U
      });
      const d = String(a.id);
      return U.info("Project updated successfully", { projectId: d }), this.schedulePackageExport(d, "project:update"), a;
    } catch (e) {
      throw U.error("Failed to update project", e), new f(
        E.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input: t },
        e
      );
    }
  }
  clearSyncBaselineForProject(t) {
    const n = _.getSyncSettings().entityBaselinesByProjectId;
    if (!n || !(t in n)) return;
    const a = { ...n };
    delete a[t], _.setSyncSettings({
      entityBaselinesByProjectId: Object.keys(a).length > 0 ? a : void 0
    });
  }
  async deleteProject(t) {
    const e = hs(t);
    let n = !1;
    try {
      const a = await h.getClient().project.findUnique({
        where: { id: e.id },
        select: { id: !0, projectPath: !0 }
      });
      if (!a?.id)
        throw new f(
          E.PROJECT_NOT_FOUND,
          "Project not found",
          { id: e.id }
        );
      return await fs({
        deleteFile: e.deleteFile,
        projectPath: typeof a.projectPath == "string" ? a.projectPath : null
      }), _.addPendingProjectDelete({
        projectId: e.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), n = !0, await h.getClient().project.delete({
        where: { id: e.id }
      }), this.clearSyncBaselineForProject(e.id), U.info("Project deleted successfully", {
        projectId: e.id,
        deleteFile: e.deleteFile
      }), { success: !0 };
    } catch (a) {
      throw n && _.removePendingProjectDeletes([e.id]), U.error("Failed to delete project", a), a instanceof f ? a : new f(
        E.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id: e.id, deleteFile: e.deleteFile },
        a
      );
    }
  }
  async removeProjectFromList(t) {
    try {
      if (!(await h.getClient().project.findUnique({
        where: { id: t },
        select: { id: !0 }
      }))?.id)
        throw new f(
          E.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return await h.getClient().project.delete({
        where: { id: t }
      }), this.clearSyncBaselineForProject(t), U.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (e) {
      throw U.error("Failed to remove project from list", e), e instanceof f ? e : new f(
        E.PROJECT_DELETE_FAILED,
        "Failed to remove project from list",
        { id: t },
        e
      );
    }
  }
  schedulePackageExport(t, e) {
    this.exportQueue.schedule(t, e);
  }
  async flushPendingExports(t = 8e3) {
    return await this.exportQueue.flush(t);
  }
  async exportProjectPackageWithOptions(t, e) {
    return await si({
      projectId: t,
      options: e,
      logger: U
    });
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const b = new Fi(), $ = D("CharacterService"), up = () => h.getClient();
function vi(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class Ui {
  async createCharacter(t) {
    try {
      $.info("Creating character", t);
      const e = await h.getClient().character.create({
        data: {
          projectId: t.projectId,
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: t.attributes ? JSON.stringify(t.attributes) : null
        }
      });
      return $.info("Character created successfully", {
        characterId: e.id
      }), b.schedulePackageExport(t.projectId, "character:create"), e;
    } catch (e) {
      throw $.error("Failed to create character", e), new f(
        E.CHARACTER_CREATE_FAILED,
        "Failed to create character",
        { input: t },
        e
      );
    }
  }
  async getCharacter(t) {
    try {
      const e = await h.getClient().character.findUnique({
        where: { id: t },
        include: {
          appearances: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
      if (!e)
        throw new f(
          E.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw $.error("Failed to get character", e), e;
    }
  }
  async getAllCharacters(t) {
    try {
      return await h.getClient().character.findMany({
        where: { projectId: t },
        orderBy: { createdAt: "asc" }
      });
    } catch (e) {
      throw $.error("Failed to get all characters", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get all characters",
        { projectId: t },
        e
      );
    }
  }
  async updateCharacter(t) {
    try {
      const e = {};
      t.name !== void 0 && (e.name = t.name), t.description !== void 0 && (e.description = t.description), t.firstAppearance !== void 0 && (e.firstAppearance = t.firstAppearance), t.attributes !== void 0 && (e.attributes = JSON.stringify(t.attributes));
      const n = await h.getClient().character.update({
        where: { id: t.id },
        data: e
      });
      return $.info("Character updated successfully", {
        characterId: n.id
      }), b.schedulePackageExport(String(n.projectId), "character:update"), n;
    } catch (e) {
      throw $.error("Failed to update character", e), vi(e) ? new f(
        E.CHARACTER_NOT_FOUND,
        "Character not found",
        { id: t.id },
        e
      ) : new f(
        E.CHARACTER_UPDATE_FAILED,
        "Failed to update character",
        { input: t },
        e
      );
    }
  }
  async deleteCharacter(t) {
    try {
      const e = await h.getClient().character.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      }), n = e?.projectId ? String(e.projectId) : null;
      return await h.getClient().$transaction(async (a) => {
        n && await a.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: t }, { targetId: t }]
          }
        }), await a.character.deleteMany({ where: { id: t } });
      }), $.info("Character deleted successfully", { characterId: t }), n && b.schedulePackageExport(
        n,
        "character:delete"
      ), { success: !0 };
    } catch (e) {
      throw $.error("Failed to delete character", e), new f(
        E.CHARACTER_DELETE_FAILED,
        "Failed to delete character",
        { id: t },
        e
      );
    }
  }
  async recordAppearance(t) {
    try {
      const e = await h.getClient().characterAppearance.create({
        data: {
          characterId: t.characterId,
          chapterId: t.chapterId,
          position: t.position,
          context: t.context
        }
      });
      return $.info("Character appearance recorded", {
        characterId: t.characterId,
        chapterId: t.chapterId
      }), e;
    } catch (e) {
      throw $.error("Failed to record character appearance", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to record character appearance",
        { input: t },
        e
      );
    }
  }
  async getAppearancesByChapter(t) {
    try {
      return await h.getClient().characterAppearance.findMany({
        where: { chapterId: t },
        include: {
          character: !0
        },
        orderBy: { position: "asc" }
      });
    } catch (e) {
      throw $.error("Failed to get appearances by chapter", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get character appearances",
        { chapterId: t },
        e
      );
    }
  }
  async updateFirstAppearance(t, e) {
    try {
      const n = await h.getClient().character.findUnique({
        where: { id: t }
      });
      if (!n)
        throw new f(
          E.CHARACTER_NOT_FOUND,
          "Character not found",
          { characterId: t }
        );
      n.firstAppearance || (await h.getClient().character.update({
        where: { id: t },
        data: { firstAppearance: e }
      }), $.info("First appearance updated", { characterId: t, chapterId: e }));
    } catch (n) {
      throw $.error("Failed to update first appearance", n), new f(
        E.CHARACTER_UPDATE_FAILED,
        "Failed to update first appearance",
        { characterId: t, chapterId: e },
        n
      );
    }
  }
  async searchCharacters(t, e) {
    try {
      return await h.getClient().character.findMany({
        where: {
          projectId: t,
          OR: [{ name: { contains: e } }, { description: { contains: e } }]
        },
        orderBy: { name: "asc" }
      });
    } catch (n) {
      throw $.error("Failed to search characters", n), new f(
        E.SEARCH_QUERY_FAILED,
        "Failed to search characters",
        { projectId: t, query: e },
        n
      );
    }
  }
}
const nr = new Ui(), W = D("TermService");
function Mi(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class ki {
  async createTerm(t) {
    try {
      W.info("Creating term", t);
      const e = await h.getClient().term.create({
        data: {
          projectId: t.projectId,
          term: t.term,
          definition: t.definition,
          category: t.category,
          order: t.order,
          firstAppearance: t.firstAppearance
        }
      });
      return W.info("Term created successfully", { termId: e.id }), b.schedulePackageExport(t.projectId, "term:create"), e;
    } catch (e) {
      throw W.error("Failed to create term", e), new f(
        E.TERM_CREATE_FAILED,
        "Failed to create term",
        { input: t },
        e
      );
    }
  }
  async getTerm(t) {
    try {
      const e = await h.getClient().term.findUnique({
        where: { id: t },
        include: {
          appearances: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
      if (!e)
        throw new f(E.TERM_NOT_FOUND, "Term not found", { id: t });
      return e;
    } catch (e) {
      throw W.error("Failed to get term", e), e;
    }
  }
  async getAllTerms(t) {
    try {
      return await h.getClient().term.findMany({
        where: { projectId: t },
        orderBy: { term: "asc" }
      });
    } catch (e) {
      throw W.error("Failed to get all terms", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get all terms",
        { projectId: t },
        e
      );
    }
  }
  async updateTerm(t) {
    try {
      const e = {};
      t.term !== void 0 && (e.term = t.term), t.definition !== void 0 && (e.definition = t.definition), t.category !== void 0 && (e.category = t.category), t.order !== void 0 && (e.order = t.order), t.firstAppearance !== void 0 && (e.firstAppearance = t.firstAppearance);
      const n = await h.getClient().term.update({
        where: { id: t.id },
        data: e
      });
      return W.info("Term updated successfully", { termId: n.id }), b.schedulePackageExport(String(n.projectId), "term:update"), n;
    } catch (e) {
      throw W.error("Failed to update term", e), Mi(e) ? new f(
        E.TERM_NOT_FOUND,
        "Term not found",
        { id: t.id },
        e
      ) : new f(
        E.TERM_UPDATE_FAILED,
        "Failed to update term",
        { input: t },
        e
      );
    }
  }
  async deleteTerm(t) {
    try {
      const e = await h.getClient().term.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      }), n = e?.projectId ? String(e.projectId) : null;
      return await h.getClient().$transaction(async (a) => {
        n && await a.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: t }, { targetId: t }]
          }
        }), await a.term.deleteMany({ where: { id: t } });
      }), W.info("Term deleted successfully", { termId: t }), n && b.schedulePackageExport(n, "term:delete"), { success: !0 };
    } catch (e) {
      throw W.error("Failed to delete term", e), new f(
        E.TERM_DELETE_FAILED,
        "Failed to delete term",
        { id: t },
        e
      );
    }
  }
  async recordAppearance(t) {
    try {
      const e = await h.getClient().termAppearance.create({
        data: {
          termId: t.termId,
          chapterId: t.chapterId,
          position: t.position,
          context: t.context
        }
      });
      return W.info("Term appearance recorded", {
        termId: t.termId,
        chapterId: t.chapterId
      }), e;
    } catch (e) {
      throw W.error("Failed to record term appearance", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to record term appearance",
        { input: t },
        e
      );
    }
  }
  async getAppearancesByChapter(t) {
    try {
      return await h.getClient().termAppearance.findMany({
        where: { chapterId: t },
        include: {
          term: !0
        },
        orderBy: { position: "asc" }
      });
    } catch (e) {
      throw W.error("Failed to get appearances by chapter", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get term appearances",
        { chapterId: t },
        e
      );
    }
  }
  async updateFirstAppearance(t, e) {
    try {
      const n = await h.getClient().term.findUnique({
        where: { id: t }
      });
      if (!n)
        throw new f(E.TERM_NOT_FOUND, "Term not found", { termId: t });
      n.firstAppearance || (await h.getClient().term.update({
        where: { id: t },
        data: { firstAppearance: e }
      }), W.info("First appearance updated", { termId: t, chapterId: e }));
    } catch (n) {
      throw W.error("Failed to update first appearance", n), new f(
        E.TERM_UPDATE_FAILED,
        "Failed to update first appearance",
        { termId: t, chapterId: e },
        n
      );
    }
  }
  async searchTerms(t, e) {
    try {
      return await h.getClient().term.findMany({
        where: {
          projectId: t,
          OR: [{ term: { contains: e } }, { definition: { contains: e } }]
        },
        orderBy: { term: "asc" }
      });
    } catch (n) {
      throw W.error("Failed to search terms", n), new f(
        E.SEARCH_QUERY_FAILED,
        "Failed to search terms",
        { projectId: t, query: e },
        n
      );
    }
  }
  async getTermsByCategory(t, e) {
    try {
      return await h.getClient().term.findMany({
        where: {
          projectId: t,
          category: e
        },
        orderBy: { term: "asc" }
      });
    } catch (n) {
      throw W.error("Failed to get terms by category", n), new f(
        E.DB_QUERY_FAILED,
        "Failed to get terms by category",
        { projectId: t, category: e },
        n
      );
    }
  }
}
const ar = new ki(), Vt = (r) => {
  if (typeof r != "string") return null;
  const t = r.trim();
  if (!t) return null;
  const n = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return n.length > 0 ? n : null;
}, zn = (r) => {
  const t = r.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, or = (r) => /^https?:\/\//i.test(r), Xn = (r) => {
  try {
    const t = new URL(r);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : zn(t.toString());
  } catch {
    return null;
  }
}, Wi = (r) => {
  let t = r.trim();
  if (!t) return null;
  if (or(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, Ce = (r) => {
  if (!r) return null;
  const t = Vt(r.url), e = Vt(r.anonKey);
  if (!t || !e) return null;
  const n = Xn(t);
  return n ? {
    url: n,
    anonKey: e
  } : null;
}, Kn = (r) => {
  const t = [], e = Vt(r?.url), n = Vt(r?.anonKey);
  e || t.push("SUPABASE_URL_REQUIRED"), n || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let a = null;
  return e && (a = Xn(e), a || t.push("SUPABASE_URL_INVALID")), n && n.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !a || !n ? {
    valid: !1,
    issues: t
  } : {
    valid: !0,
    issues: t,
    normalized: {
      url: a,
      anonKey: n
    }
  };
}, ut = (r) => Vt(process.env[r]), Bi = "https://qzgyjlbpnxxpspoyibpt.supabase.co", $i = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", xi = () => {
  const r = Ce({
    url: Bi,
    anonKey: $i
  });
  return r ? {
    ...r,
    source: "legacy"
  } : null;
}, Gi = () => {
  const r = Ce({
    url: ut("SUPABASE_URL") ?? ut("SUPADB_URL") ?? void 0,
    anonKey: ut("SUPABASE_ANON_KEY") ?? ut("SUPABASE_PUBLISHABLE_KEY") ?? ut("SUPADATABASE_API") ?? void 0
  });
  return r ? {
    ...r,
    source: "env"
  } : null;
}, Vn = () => {
  const r = _.getRuntimeSupabaseConfig(), t = Ce(r);
  return t ? {
    ...t,
    source: "runtime"
  } : null;
}, Hi = () => {
  const r = ut("SUPADATABASE_API"), t = ut("SUPADATABASE_PRJ_ID");
  let e = null, n = null;
  if (r && or(r))
    e = zn(r);
  else if (t) {
    const a = Wi(t);
    a && (e = `https://${a}.supabase.co`);
  }
  return r && !or(r) && (n = r), !e || !n ? null : {
    url: e,
    anonKey: n,
    source: "legacy"
  };
}, Tr = () => Gi() ?? Vn() ?? Hi() ?? xi(), it = () => {
  const r = Tr();
  return r ? {
    url: r.url,
    anonKey: r.anonKey
  } : null;
}, zt = () => {
  const r = it();
  if (!r)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return r;
}, qn = () => Tr()?.source ?? null, Yi = () => Ce(Vn()) ?? null, zi = (r) => {
  const t = Kn(r);
  return !t.valid || !t.normalized || _.setRuntimeSupabaseConfig(t.normalized), t;
}, Xi = (r) => Kn(r), hp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: Tr,
  getRuntimeSupabaseConfig: Yi,
  getSupabaseConfig: it,
  getSupabaseConfigOrThrow: zt,
  getSupabaseConfigSource: qn,
  setRuntimeSupabaseConfig: zi,
  validateRuntimeSupabaseConfig: Xi
}, Symbol.toStringTag, { value: "Module" })), bt = {
  // Project Channels
  PROJECT_CREATE: "project:create",
  PROJECT_GET: "project:get",
  PROJECT_GET_ALL: "project:get-all",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  PROJECT_REMOVE_LOCAL: "project:remove-local",
  PROJECT_OPEN_LUIE: "project:open-luie",
  // Chapter Channels
  CHAPTER_CREATE: "chapter:create",
  CHAPTER_GET: "chapter:get",
  CHAPTER_GET_ALL: "chapter:get-all",
  CHAPTER_GET_DELETED: "chapter:get-deleted",
  CHAPTER_UPDATE: "chapter:update",
  CHAPTER_DELETE: "chapter:delete",
  CHAPTER_RESTORE: "chapter:restore",
  CHAPTER_PURGE: "chapter:purge",
  CHAPTER_REORDER: "chapter:reorder",
  // Character Channels
  CHARACTER_CREATE: "character:create",
  CHARACTER_GET: "character:get",
  CHARACTER_GET_ALL: "character:get-all",
  CHARACTER_UPDATE: "character:update",
  CHARACTER_DELETE: "character:delete",
  // Event Channels
  EVENT_CREATE: "event:create",
  EVENT_GET: "event:get",
  EVENT_GET_ALL: "event:get-all",
  EVENT_UPDATE: "event:update",
  EVENT_DELETE: "event:delete",
  // Faction Channels
  FACTION_CREATE: "faction:create",
  FACTION_GET: "faction:get",
  FACTION_GET_ALL: "faction:get-all",
  FACTION_UPDATE: "faction:update",
  FACTION_DELETE: "faction:delete",
  // Term Channels
  TERM_CREATE: "term:create",
  TERM_GET: "term:get",
  TERM_GET_ALL: "term:get-all",
  TERM_UPDATE: "term:update",
  TERM_DELETE: "term:delete",
  // Snapshot Channels
  SNAPSHOT_CREATE: "snapshot:create",
  SNAPSHOT_GET_ALL: "snapshot:get-all",
  SNAPSHOT_GET_BY_PROJECT: "snapshot:get-by-project",
  SNAPSHOT_GET_BY_CHAPTER: "snapshot:get-by-chapter",
  SNAPSHOT_RESTORE: "snapshot:restore",
  SNAPSHOT_DELETE: "snapshot:delete",
  SNAPSHOT_IMPORT_FILE: "snapshot:import-file",
  // Auto Save
  AUTO_SAVE: "auto-save",
  // Search
  SEARCH: "search",
  // Analysis (원고 분석)
  ANALYSIS_START: "analysis:start",
  ANALYSIS_STREAM: "analysis:stream",
  ANALYSIS_ERROR: "analysis:error",
  ANALYSIS_STOP: "analysis:stop",
  ANALYSIS_CLEAR: "analysis:clear",
  // File System
  FS_SELECT_DIRECTORY: "fs:select-directory",
  FS_SELECT_SAVE_LOCATION: "fs:select-save-location",
  FS_SELECT_FILE: "fs:select-file",
  FS_SELECT_SNAPSHOT_BACKUP: "fs:select-snapshot-backup",
  FS_SAVE_PROJECT: "fs:save-project",
  FS_READ_FILE: "fs:read-file",
  FS_WRITE_FILE: "fs:write-file",
  FS_READ_LUIE_ENTRY: "fs:read-luie-entry",
  // Luie package directory (.luie)
  FS_CREATE_LUIE_PACKAGE: "fs:create-luie-package",
  FS_WRITE_PROJECT_FILE: "fs:write-project-file",
  FS_APPROVE_PROJECT_PATH: "fs:approve-project-path",
  // Settings
  SETTINGS_GET_ALL: "settings:get-all",
  SETTINGS_GET_EDITOR: "settings:get-editor",
  SETTINGS_SET_EDITOR: "settings:set-editor",
  SETTINGS_GET_AUTO_SAVE: "settings:get-auto-save",
  SETTINGS_SET_AUTO_SAVE: "settings:set-auto-save",
  SETTINGS_GET_LANGUAGE: "settings:get-language",
  SETTINGS_SET_LANGUAGE: "settings:set-language",
  SETTINGS_GET_MENU_BAR_MODE: "settings:get-menu-bar-mode",
  SETTINGS_SET_MENU_BAR_MODE: "settings:set-menu-bar-mode",
  SETTINGS_GET_SHORTCUTS: "settings:get-shortcuts",
  SETTINGS_SET_SHORTCUTS: "settings:set-shortcuts",
  SETTINGS_SET_WINDOW_BOUNDS: "settings:set-window-bounds",
  SETTINGS_GET_WINDOW_BOUNDS: "settings:get-window-bounds",
  SETTINGS_RESET: "settings:reset",
  // Recovery
  RECOVERY_DB_RUN: "recovery:db-run",
  // Window
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_UNMAXIMIZE: "window:unmaximize",
  WINDOW_CLOSE: "window:close",
  WINDOW_TOGGLE_DEV_TOOLS: "window:toggle-dev-tools",
  WINDOW_TOGGLE_FULLSCREEN: "window:toggle-fullscreen",
  WINDOW_SET_FULLSCREEN: "window:set-fullscreen",
  WINDOW_OPEN_EXPORT: "window:open-export",
  WINDOW_OPEN_WORLD_GRAPH: "window:open-world-graph",
  // App
  APP_GET_VERSION: "app:get-version",
  APP_CHECK_UPDATE: "app:check-update",
  APP_GET_UPDATE_STATE: "app:get-update-state",
  APP_DOWNLOAD_UPDATE: "app:download-update",
  APP_APPLY_UPDATE: "app:apply-update",
  APP_ROLLBACK_UPDATE: "app:rollback-update",
  APP_GET_BOOTSTRAP_STATUS: "app:get-bootstrap-status",
  APP_BOOTSTRAP_STATUS_CHANGED: "app:bootstrap-status-changed",
  APP_UPDATE_STATE_CHANGED: "app:update-state-changed",
  APP_QUIT: "app:quit",
  // Export
  EXPORT_CREATE: "export:create",
  // Logger
  LOGGER_LOG: "logger:log",
  LOGGER_LOG_BATCH: "logger:log-batch",
  // App lifecycle (main ↔ renderer quit coordination)
  APP_BEFORE_QUIT: "app:before-quit",
  APP_FLUSH_COMPLETE: "app:flush-complete",
  APP_QUIT_PHASE: "app:quit-phase",
  // Sync
  SYNC_GET_STATUS: "sync:get-status",
  SYNC_CONNECT_GOOGLE: "sync:connect-google",
  SYNC_DISCONNECT: "sync:disconnect",
  SYNC_RUN_NOW: "sync:run-now",
  SYNC_SET_AUTO: "sync:set-auto",
  SYNC_RESOLVE_CONFLICT: "sync:resolveConflict",
  SYNC_GET_RUNTIME_CONFIG: "sync:get-runtime-config",
  SYNC_SET_RUNTIME_CONFIG: "sync:set-runtime-config",
  SYNC_VALIDATE_RUNTIME_CONFIG: "sync:validate-runtime-config",
  SYNC_STATUS_CHANGED: "sync:status-changed",
  SYNC_AUTH_RESULT: "sync:auth-result",
  // Startup Wizard
  STARTUP_GET_READINESS: "startup:get-readiness",
  STARTUP_COMPLETE_WIZARD: "startup:complete-wizard",
  // World Entity Channels
  WORLD_ENTITY_CREATE: "world-entity:create",
  WORLD_ENTITY_GET: "world-entity:get",
  WORLD_ENTITY_GET_ALL: "world-entity:get-all",
  WORLD_ENTITY_UPDATE: "world-entity:update",
  WORLD_ENTITY_UPDATE_POSITION: "world-entity:update-position",
  WORLD_ENTITY_DELETE: "world-entity:delete",
  // Entity Relation Channels
  ENTITY_RELATION_CREATE: "world:createRelation",
  ENTITY_RELATION_GET_ALL: "world:getRelations",
  ENTITY_RELATION_UPDATE: "world:updateRelation",
  ENTITY_RELATION_DELETE: "world:deleteRelation",
  // World Graph
  WORLD_GRAPH_GET: "world:getGraph",
  WORLD_GRAPH_GET_MENTIONS: "world:getMentions"
}, Bt = D("SyncAuthService"), Ki = "luie://auth/callback", sr = "v2:safe:", ir = "v2:plain:", Ae = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", Jn = (r) => r.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), Vi = () => Jn(Da(48)), qi = (r) => Jn(Na("sha256").update(r).digest()), ne = () => {
  const r = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return r && r.length > 0 ? r : Ki;
}, At = (r, t = "token") => {
  if (tt.isEncryptionAvailable()) {
    const n = tt.encryptString(r).toString("base64");
    return `${sr}${n}`;
  }
  if (t === "token")
    throw new Error(Ae);
  const e = Buffer.from(r, "utf-8").toString("base64");
  return `${ir}${e}`;
}, Ji = (r, t = "token") => {
  const e = Buffer.from(r, "base64");
  if (tt.isEncryptionAvailable())
    try {
      const a = tt.decryptString(e);
      return {
        plain: a,
        migratedCipher: At(a, t)
      };
    } catch {
      const a = e.toString("utf-8");
      return {
        plain: a,
        migratedCipher: At(a, t)
      };
    }
  if (t === "token")
    throw new Error(Ae);
  const n = e.toString("utf-8");
  return {
    plain: n,
    migratedCipher: At(n, t)
  };
}, ae = (r, t = "token") => {
  if (r.startsWith(sr)) {
    if (!tt.isEncryptionAvailable())
      throw new Error(Ae);
    const e = r.slice(sr.length), n = Buffer.from(e, "base64");
    try {
      return {
        plain: tt.decryptString(n)
      };
    } catch (a) {
      throw new Error(
        `SYNC_TOKEN_DECRYPT_FAILED:${a instanceof Error ? a.message : String(a)}`,
        {
          cause: a
        }
      );
    }
  }
  if (r.startsWith(ir)) {
    if (t === "token" && !tt.isEncryptionAvailable())
      throw new Error(Ae);
    const e = r.slice(ir.length), a = Buffer.from(e, "base64").toString("utf-8"), o = tt.isEncryptionAvailable() ? At(a, t) : void 0;
    return {
      plain: a,
      migratedCipher: o
    };
  }
  return Ji(r, t);
};
class Qi {
  pendingPkce = null;
  pendingTtlMs = 600 * 1e3;
  clearPendingPkce() {
    this.pendingPkce = null, _.clearPendingSyncAuth();
  }
  storePendingPkce(t) {
    this.pendingPkce = t, _.setPendingSyncAuth({
      state: t.state,
      verifierCipher: At(t.verifier, "pending"),
      createdAt: new Date(t.createdAt).toISOString(),
      redirectUri: t.redirectUri
    });
  }
  getPendingPkceFromSettings() {
    const t = _.getSyncSettings();
    if (!t.pendingAuthVerifierCipher || !t.pendingAuthCreatedAt)
      return null;
    const e = Date.parse(t.pendingAuthCreatedAt);
    if (!Number.isFinite(e))
      return this.clearPendingPkce(), null;
    try {
      const n = ae(t.pendingAuthVerifierCipher, "pending");
      return n.migratedCipher && _.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: n.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: n.plain,
        createdAt: e,
        redirectUri: t.pendingAuthRedirectUri || ne()
      };
    } catch (n) {
      return Bt.warn("Failed to decode pending OAuth verifier", { error: n }), this.clearPendingPkce(), null;
    }
  }
  getPendingPkce() {
    if (this.pendingPkce) {
      if (!this.pendingPkce.state) {
        const e = _.getSyncSettings().pendingAuthState;
        e && (this.pendingPkce.state = e);
      }
      if (!this.pendingPkce.redirectUri) {
        const e = _.getSyncSettings().pendingAuthRedirectUri;
        this.pendingPkce.redirectUri = e || ne();
      }
      return this.pendingPkce;
    }
    const t = this.getPendingPkceFromSettings();
    return t ? (this.pendingPkce = t, t) : null;
  }
  getActivePendingPkce() {
    const t = this.getPendingPkce();
    return t ? Date.now() - t.createdAt > this.pendingTtlMs ? (this.clearPendingPkce(), null) : t : null;
  }
  hasPendingAuthFlow() {
    return this.getActivePendingPkce() !== null;
  }
  isConfigured() {
    return it() !== null;
  }
  async startGoogleAuth() {
    const t = this.getActivePendingPkce();
    if (t) {
      const c = Date.now() - t.createdAt;
      throw Bt.info("OAuth flow already in progress", { ageMs: c }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: e } = zt(), n = Vi(), a = qi(n), o = ne();
    this.storePendingPkce({
      verifier: n,
      createdAt: Date.now(),
      redirectUri: o
    });
    const s = new URL("/auth/v1/authorize", e);
    s.searchParams.set("provider", "google"), s.searchParams.set("redirect_to", o), s.searchParams.set("code_challenge", a), s.searchParams.set("code_challenge_method", "s256"), Bt.info("Opening OAuth authorize URL", {
      authorizeBase: `${s.origin}${s.pathname}`,
      redirectUri: o,
      authorizeUrl: s.toString()
    }), await ma.openExternal(s.toString());
  }
  async completeOAuthCallback(t) {
    const e = this.getPendingPkce();
    if (!e)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - e.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const n = new URL(t), a = n.searchParams, o = n.hash.startsWith("#") ? n.hash.slice(1) : n.hash, s = new URLSearchParams(o), c = (g) => a.get(g) ?? s.get(g), d = c("state"), l = c("code"), i = c("error"), p = c("error_code"), m = c("error_description");
    if (i) {
      this.clearPendingPkce();
      const g = p ?? i, A = m ?? i;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${g}:${A}`
      );
    }
    if (!l)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_CODE_MISSING");
    if (e.state && (!d || d !== e.state))
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_STATE_MISMATCH");
    const w = await this.exchangeCodeForSession(
      l,
      e.verifier,
      e.redirectUri || ne()
    );
    return this.clearPendingPkce(), w;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const e = ae(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(e);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const e = ae(t.accessTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return Bt.warn("Failed to decrypt sync access token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  getRefreshToken(t) {
    if (!t.refreshTokenCipher)
      return { token: null };
    try {
      const e = ae(t.refreshTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return Bt.warn("Failed to decrypt sync refresh token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  async exchangeCodeForSession(t, e, n) {
    const { url: a, anonKey: o } = zt(), s = new URL("/auth/v1/token", a);
    s.searchParams.set("grant_type", "pkce");
    const c = await fetch(s, {
      method: "POST",
      headers: {
        apikey: o,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_code: t,
        code_verifier: e,
        redirect_uri: n
      })
    });
    if (!c.ok) {
      const l = await c.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${c.status}:${l}`);
    }
    const d = await c.json();
    return this.toSyncSession(d);
  }
  async exchangeRefreshToken(t) {
    const { url: e, anonKey: n } = zt(), a = new URL("/auth/v1/token", e);
    a.searchParams.set("grant_type", "refresh_token");
    const o = await fetch(a, {
      method: "POST",
      headers: {
        apikey: n,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh_token: t
      })
    });
    if (!o.ok) {
      const c = await o.text();
      throw new Error(`SYNC_AUTH_REFRESH_FAILED:${o.status}:${c}`);
    }
    const s = await o.json();
    return this.toSyncSession(s);
  }
  toSyncSession(t) {
    const e = t.access_token, n = t.refresh_token, a = t.user?.id;
    if (!e || !n || !a)
      throw new Error("SYNC_AUTH_INVALID_SESSION");
    return {
      provider: "google",
      userId: a,
      email: t.user?.email,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1e3).toISOString() : void 0,
      accessTokenCipher: At(e),
      refreshTokenCipher: At(n)
    };
  }
}
const V = new Qi(), Qn = () => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: []
}), et = (r) => {
  if (!r) return 0;
  const t = Date.parse(r);
  return Number.isFinite(t) ? t : 0;
}, Jr = (r, t, e, n) => {
  const a = r?.[t];
  if (!a) return 0;
  const o = e === "chapter" ? a.chapter : a.memo;
  return et(o[n]);
}, Re = (r, t) => et(r.updatedAt) >= et(t.updatedAt) ? [r, t] : [t, r], $t = (r, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const n of r)
    e.set(n.id, n);
  for (const n of t) {
    const a = e.get(n.id);
    if (!a) {
      e.set(n.id, n);
      continue;
    }
    const [o] = Re(a, n);
    e.set(n.id, o);
  }
  return Array.from(e.values());
}, Zi = (r, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const n of r)
    e.set(`${n.projectId}:${n.docType}`, n);
  for (const n of t) {
    const a = `${n.projectId}:${n.docType}`, o = e.get(a);
    if (!o) {
      e.set(a, n);
      continue;
    }
    const [s] = Re(o, n);
    e.set(a, s);
  }
  return Array.from(e.values());
}, Qr = (r, t, e, n, a, o) => {
  const s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
  let d = 0;
  const l = [];
  for (const i of t)
    c.set(i.id, i);
  for (const i of r)
    s.set(i.id, i);
  for (const i of t) {
    const p = s.get(i.id);
    if (!p) {
      s.set(i.id, i);
      continue;
    }
    const [m, w] = Re(
      p,
      i
    );
    let g = m;
    if (p.content !== i.content && (a ? a(p, i) : !0)) {
      const S = `${e}:${p.id}`, I = o?.[S];
      if (I === "local")
        g = p;
      else if (I === "remote")
        g = i;
      else {
        d += 1, l.push({
          type: e,
          id: p.id,
          projectId: p.projectId,
          title: p.title,
          localUpdatedAt: p.updatedAt,
          remoteUpdatedAt: i.updatedAt,
          localPreview: p.content.slice(0, 400),
          remotePreview: i.content.slice(0, 400)
        });
        const j = n(w);
        s.set(j.id, j);
      }
    }
    s.set(i.id, g);
  }
  for (const [i, p] of c.entries())
    s.has(i) || s.set(i, p);
  return {
    merged: Array.from(s.values()),
    conflicts: d,
    conflictItems: l
  };
}, tc = (r, t, e) => {
  const n = r + t;
  return {
    chapters: r,
    memos: t,
    total: n,
    items: e.length > 0 ? e : void 0
  };
}, ec = (r) => {
  const t = /* @__PURE__ */ new Map();
  for (const s of r.tombstones) {
    const c = `${s.entityType}:${s.entityId}`, d = t.get(c);
    if (!d) {
      t.set(c, s);
      continue;
    }
    const [l] = Re(d, s);
    t.set(c, l);
  }
  const e = /* @__PURE__ */ new Set();
  for (const s of r.projects)
    s.deletedAt && e.add(s.id);
  for (const s of t.values())
    s.entityType === "project" && (e.add(s.entityId), e.add(s.projectId));
  const n = (s) => e.has(s), a = (s) => {
    const c = t.get(`chapter:${s.id}`);
    if (!c) return s;
    const d = c.deletedAt, l = et(c.updatedAt) > et(s.updatedAt) ? c.updatedAt : s.updatedAt;
    return {
      ...s,
      deletedAt: d,
      updatedAt: l
    };
  }, o = (s, c) => c.filter(
    (d) => !t.has(`${s}:${d.id}`)
  );
  return {
    ...r,
    projects: o(
      "project",
      r.projects.filter((s) => !n(s.id))
    ),
    chapters: r.chapters.filter((s) => !n(s.projectId)).map(a),
    characters: o(
      "character",
      r.characters.filter(
        (s) => !n(s.projectId)
      )
    ),
    terms: o(
      "term",
      r.terms.filter((s) => !n(s.projectId))
    ),
    worldDocuments: r.worldDocuments.filter(
      (s) => !n(s.projectId)
    ),
    memos: o(
      "memo",
      r.memos.filter((s) => !n(s.projectId))
    ),
    snapshots: o(
      "snapshot",
      r.snapshots.filter(
        (s) => !n(s.projectId)
      )
    )
  };
}, rc = (r, t, e) => {
  const n = new Set(
    [...r.tombstones, ...t.tombstones].map(
      (l) => `${l.entityType}:${l.entityId}`
    )
  ), a = e?.baselinesByProjectId, o = Qr(
    r.chapters,
    t.chapters,
    "chapter",
    (l) => ({
      ...l,
      id: Y(),
      title: `${l.title} (Conflict Copy)`,
      order: l.order + 1e4,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`chapter:${l.id}`) && !n.has(`chapter:${i.id}`) && (() => {
      const p = Jr(
        a,
        l.projectId,
        "chapter",
        l.id
      );
      return p <= 0 ? !1 : et(l.updatedAt) > p && et(i.updatedAt) > p;
    })(),
    e?.conflictResolutions
  ), s = Qr(
    r.memos,
    t.memos,
    "memo",
    (l) => ({
      ...l,
      id: Y(),
      title: `${l.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`memo:${l.id}`) && !n.has(`memo:${i.id}`) && (() => {
      const p = Jr(
        a,
        l.projectId,
        "memo",
        l.id
      );
      return p <= 0 ? !1 : et(l.updatedAt) > p && et(i.updatedAt) > p;
    })(),
    e?.conflictResolutions
  ), c = [
    ...o.conflictItems,
    ...s.conflictItems
  ], d = {
    projects: $t(r.projects, t.projects),
    chapters: o.merged,
    characters: $t(r.characters, t.characters),
    terms: $t(r.terms, t.terms),
    worldDocuments: Zi(r.worldDocuments, t.worldDocuments),
    memos: s.merged,
    snapshots: $t(r.snapshots, t.snapshots),
    tombstones: $t(r.tombstones, t.tombstones)
  };
  return {
    merged: ec(d),
    conflicts: tc(
      o.conflicts,
      s.conflicts,
      c
    )
  };
}, nc = [
  { docType: "synopsis", fileName: Jt },
  { docType: "plot", fileName: Te },
  { docType: "drawing", fileName: we },
  { docType: "mindmap", fileName: _e },
  { docType: "graph", fileName: Ie }
], ac = {
  synopsis: Jt,
  plot: Te,
  drawing: we,
  mindmap: _e,
  graph: Ie,
  scrap: yr
}, oc = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], ct = (r, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof r == "string" && r.length > 0 ? r : r instanceof Date ? r.toISOString() : t, F = (r) => typeof r == "string" ? r : null, cr = (r, t = 0) => typeof r == "number" && Number.isFinite(r) ? r : t, sc = (r, t, e) => {
  const n = F(e.id);
  if (!n) return null;
  const a = ct(e.updatedAt);
  return r.projects.push({
    id: n,
    userId: t,
    title: F(e.title) ?? "Untitled",
    description: F(e.description),
    createdAt: ct(e.createdAt),
    updatedAt: a
  }), {
    projectId: n,
    projectPath: F(e.projectPath),
    projectUpdatedAt: a
  };
}, ic = (r, t, e, n) => {
  for (const a of n) {
    const o = F(a.id);
    if (!o) continue;
    const s = F(a.deletedAt);
    r.chapters.push({
      id: o,
      userId: t,
      projectId: e,
      title: F(a.title) ?? "Untitled",
      content: F(a.content) ?? "",
      synopsis: F(a.synopsis),
      order: cr(a.order),
      wordCount: cr(a.wordCount),
      createdAt: ct(a.createdAt),
      updatedAt: ct(a.updatedAt),
      deletedAt: s
    }), s && r.tombstones.push({
      id: `${e}:chapter:${o}`,
      userId: t,
      projectId: e,
      entityType: "chapter",
      entityId: o,
      deletedAt: s,
      updatedAt: s
    });
  }
}, cc = (r, t, e, n) => {
  for (const a of n) {
    const o = F(a.id);
    o && r.characters.push({
      id: o,
      userId: t,
      projectId: e,
      name: F(a.name) ?? "Character",
      description: F(a.description),
      firstAppearance: F(a.firstAppearance),
      attributes: F(a.attributes),
      createdAt: ct(a.createdAt),
      updatedAt: ct(a.updatedAt)
    });
  }
}, dc = (r, t, e, n) => {
  for (const a of n) {
    const o = F(a.id);
    o && r.terms.push({
      id: o,
      userId: t,
      projectId: e,
      term: F(a.term) ?? "Term",
      definition: F(a.definition),
      category: F(a.category),
      order: cr(a.order),
      firstAppearance: F(a.firstAppearance),
      createdAt: ct(a.createdAt),
      updatedAt: ct(a.updatedAt)
    });
  }
}, lc = (r, t, e) => {
  for (const n of e)
    r.tombstones.push({
      id: `${n.projectId}:project:${n.projectId}`,
      userId: t,
      projectId: n.projectId,
      entityType: "project",
      entityId: n.projectId,
      deletedAt: n.deletedAt,
      updatedAt: n.deletedAt
    });
}, Zr = (r, t, e, n, a, o) => {
  r.worldDocuments.push({
    id: `${e}:${n}`,
    userId: t,
    projectId: e,
    docType: n,
    payload: a,
    updatedAt: bs(a) ?? o
  });
}, dr = async (r, t, e) => {
  const n = ac[t], a = `${x}/${n}`;
  let o;
  try {
    o = await Z(r, a, e);
  } catch (c) {
    return e.warn("Failed to read .luie world document for sync; skipping doc", {
      projectPath: r,
      entryPath: a,
      docType: t,
      error: c
    }), null;
  }
  if (o === null)
    return null;
  const s = Bn(o);
  return s === null ? (e.warn("Failed to parse .luie world document for sync; skipping doc", {
    projectPath: r,
    entryPath: a,
    docType: t
  }), null) : s;
}, pc = (r, t, e, n, a) => {
  const o = Yn(n);
  for (const s of o.memos)
    r.memos.push({
      id: s.id || Y(),
      userId: t,
      projectId: e,
      title: s.title || "Memo",
      content: s.content,
      tags: s.tags,
      updatedAt: s.updatedAt || a
    });
}, uc = async (r) => {
  for (const e of nc) {
    const n = await dr(
      r.projectPath,
      e.docType,
      r.logger
    );
    n && Zr(
      r.bundle,
      r.userId,
      r.projectId,
      e.docType,
      n,
      r.updatedAtFallback
    );
  }
  const t = await dr(
    r.projectPath,
    "scrap",
    r.logger
  );
  v(t) && (Zr(
    r.bundle,
    r.userId,
    r.projectId,
    "scrap",
    t,
    r.updatedAtFallback
  ), pc(
    r.bundle,
    r.userId,
    r.projectId,
    t,
    r.updatedAtFallback
  ));
}, hc = async (r, t, e, n) => {
  const a = sc(r, t, e);
  if (!a) return;
  const { projectId: o, projectPath: s, projectUpdatedAt: c } = a;
  if (ic(
    r,
    t,
    o,
    Array.isArray(e.chapters) ? e.chapters : []
  ), cc(
    r,
    t,
    o,
    Array.isArray(e.characters) ? e.characters : []
  ), dc(
    r,
    t,
    o,
    Array.isArray(e.terms) ? e.terms : []
  ), s && s.toLowerCase().endsWith(X))
    try {
      const d = K(
        s,
        "projectPath"
      );
      await uc({
        bundle: r,
        userId: t,
        projectId: o,
        projectPath: d,
        updatedAtFallback: c,
        logger: n
      });
    } catch (d) {
      n.warn("Skipping sync world document read for invalid projectPath", {
        projectId: o,
        projectPath: s,
        error: d
      });
    }
}, fc = async (r) => {
  const t = Qn();
  for (const e of r.projectRows)
    await hc(
      t,
      r.userId,
      e,
      r.logger
    );
  return lc(
    t,
    r.userId,
    r.pendingProjectDeletes
  ), t;
}, Zn = async (r, t, e) => {
  const n = oc.filter(
    (a) => !r.has(a)
  );
  n.length !== 0 && await Promise.all(
    n.map(async (a) => {
      const o = await dr(
        t,
        a,
        e
      );
      o !== null && r.set(a, o);
    })
  );
}, tn = (r) => {
  if (!r) return;
  const t = Object.entries(r);
  if (t.length !== 0)
    return Object.fromEntries(
      t.map(([e, n]) => [
        e,
        {
          state: "synced",
          lastSyncedAt: n
        }
      ])
    );
}, gc = (r, t) => {
  const e = { ...r ?? {} };
  for (const n of t.items ?? [])
    e[n.projectId] = {
      state: "pending",
      lastSyncedAt: e[n.projectId]?.lastSyncedAt,
      reason: "SYNC_CONFLICT_DETECTED"
    };
  return Object.keys(e).length > 0 ? e : void 0;
}, ta = (r, t) => {
  if (!r) return r;
  const e = Object.fromEntries(
    Object.entries(r).map(([n, a]) => [
      n,
      {
        state: "error",
        lastSyncedAt: a.lastSyncedAt,
        reason: t
      }
    ])
  );
  return Object.keys(e).length > 0 ? e : void 0;
}, Ec = (r, t, e, n) => {
  const a = {
    ...r.projectLastSyncedAtByProjectId ?? {}
  };
  for (const o of n)
    delete a[o];
  for (const o of t.projects) {
    if (o.deletedAt) {
      delete a[o.id];
      continue;
    }
    a[o.id] = e;
  }
  for (const o of t.tombstones)
    o.entityType === "project" && (delete a[o.entityId], delete a[o.projectId]);
  return Object.keys(a).length > 0 ? a : void 0;
}, mc = (r) => {
  const t = /* @__PURE__ */ new Set();
  for (const e of r.projects)
    e.deletedAt && t.add(e.id);
  for (const e of r.tombstones)
    e.entityType === "project" && (t.add(e.entityId), t.add(e.projectId));
  return t;
}, en = (r, t) => {
  for (const e of t)
    delete r[e];
}, Ac = (r, t, e, n) => {
  const a = /* @__PURE__ */ new Set();
  for (const o of t.projects)
    o.deletedAt || e.has(o.id) || (a.add(o.id), r[o.id] = {
      chapter: {},
      memo: {},
      capturedAt: n
    });
  return a;
}, yc = (r, t, e, n, a) => {
  for (const o of t.chapters) {
    if (o.deletedAt || e.has(o.projectId) || !n.has(o.projectId)) continue;
    const s = r[o.projectId];
    s && (s.chapter[o.id] = o.updatedAt, s.capturedAt = a);
  }
}, Sc = (r, t, e, n, a) => {
  for (const o of t.memos) {
    if (o.deletedAt || e.has(o.projectId) || !n.has(o.projectId)) continue;
    const s = r[o.projectId];
    s && (s.memo[o.id] = o.updatedAt, s.capturedAt = a);
  }
}, Tc = (r, t, e, n) => {
  const a = {
    ...r.entityBaselinesByProjectId ?? {}
  };
  en(a, n);
  const o = mc(t);
  en(a, Array.from(o));
  const s = Ac(
    a,
    t,
    o,
    e
  );
  return yc(a, t, o, s, e), Sc(a, t, o, s, e), Object.keys(a).length > 0 ? a : void 0;
}, wc = async (r) => {
  const t = (o) => {
    o && _.setSyncSettings({
      accessTokenCipher: o
    });
  }, e = r.syncSettings.expiresAt ? Date.parse(r.syncSettings.expiresAt) <= Date.now() + 6e4 : !0, n = V.getAccessToken(r.syncSettings);
  if (n.errorCode && r.isAuthFatalMessage(n.errorCode))
    throw new Error(n.errorCode);
  t(n.migratedCipher);
  let a = n.token;
  if (e || !a) {
    const o = V.getRefreshToken(r.syncSettings);
    if (o.errorCode && r.isAuthFatalMessage(o.errorCode))
      throw new Error(o.errorCode);
    if (o.migratedCipher && _.setSyncSettings({
      refreshTokenCipher: o.migratedCipher
    }), !o.token)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const s = await V.refreshSession(r.syncSettings), c = _.setSyncSettings({
      provider: s.provider,
      userId: s.userId,
      email: s.email,
      expiresAt: s.expiresAt,
      accessTokenCipher: s.accessTokenCipher,
      refreshTokenCipher: s.refreshTokenCipher
    }), d = V.getAccessToken(c);
    if (d.errorCode && r.isAuthFatalMessage(d.errorCode))
      throw new Error(d.errorCode);
    t(d.migratedCipher), a = d.token;
  }
  if (!a)
    throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  return a;
}, _c = (r) => {
  const t = /* @__PURE__ */ new Set();
  for (const e of r.projects)
    e.deletedAt && t.add(e.id);
  for (const e of r.tombstones)
    e.entityType === "project" && (t.add(e.entityId), t.add(e.projectId));
  return t;
}, Ic = async (r, t) => {
  for (const e of t)
    (await r.project.findUnique({
      where: { id: e },
      select: { id: !0 }
    }))?.id && await r.project.delete({ where: { id: e } });
}, Pc = async (r, t, e) => {
  for (const n of t) {
    if (n.deletedAt || e.has(n.id)) continue;
    if ((await r.project.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    }))?.id) {
      await r.project.update({
        where: { id: n.id },
        data: {
          title: n.title,
          description: n.description,
          updatedAt: new Date(n.updatedAt)
        }
      });
      continue;
    }
    await r.project.create({
      data: {
        id: n.id,
        title: n.title,
        description: n.description,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        settings: {
          create: {
            autoSave: !0,
            autoSaveInterval: ye
          }
        }
      }
    });
  }
}, Cc = async (r, t) => {
  const e = await r.chapter.findUnique({
    where: { id: t.id },
    select: { id: !0 }
  }), n = {
    title: t.title,
    content: t.content,
    synopsis: t.synopsis,
    order: t.order,
    wordCount: t.wordCount,
    updatedAt: new Date(t.updatedAt),
    deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
    project: {
      connect: { id: t.projectId }
    }
  };
  e?.id ? await r.chapter.update({
    where: { id: t.id },
    data: n
  }) : await r.chapter.create({
    data: {
      id: t.id,
      ...n,
      createdAt: new Date(t.createdAt)
    }
  });
}, Rc = async (r, t, e) => {
  for (const n of t) {
    if (e.has(n.projectId)) continue;
    const a = await r.character.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    });
    if (n.deletedAt) {
      a?.id && await r.character.delete({ where: { id: n.id } });
      continue;
    }
    const o = {
      name: n.name,
      description: n.description,
      firstAppearance: n.firstAppearance,
      attributes: typeof n.attributes == "string" ? n.attributes : JSON.stringify(n.attributes ?? null),
      updatedAt: new Date(n.updatedAt),
      project: {
        connect: { id: n.projectId }
      }
    };
    a?.id ? await r.character.update({ where: { id: n.id }, data: o }) : await r.character.create({
      data: {
        id: n.id,
        ...o,
        createdAt: new Date(n.createdAt)
      }
    });
  }
}, Dc = async (r, t, e) => {
  for (const n of t) {
    if (e.has(n.projectId)) continue;
    const a = await r.term.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    });
    if (n.deletedAt) {
      a?.id && await r.term.delete({ where: { id: n.id } });
      continue;
    }
    const o = {
      term: n.term,
      definition: n.definition,
      category: n.category,
      order: n.order,
      firstAppearance: n.firstAppearance,
      updatedAt: new Date(n.updatedAt),
      project: {
        connect: { id: n.projectId }
      }
    };
    a?.id ? await r.term.update({ where: { id: n.id }, data: o }) : await r.term.create({
      data: {
        id: n.id,
        ...o,
        createdAt: new Date(n.createdAt)
      }
    });
  }
}, Nc = async (r, t, e) => {
  for (const n of t) {
    if (n.entityType !== "chapter" || e.has(n.projectId)) continue;
    const a = await r.chapter.findUnique({
      where: { id: n.entityId },
      select: { id: !0, projectId: !0 }
    });
    !a?.id || a.projectId !== n.projectId || await r.chapter.update({
      where: { id: n.entityId },
      data: {
        deletedAt: new Date(n.deletedAt),
        updatedAt: new Date(n.updatedAt)
      }
    });
  }
}, Lc = /* @__PURE__ */ new Set(["draft", "working", "locked"]), vt = (r, t, e, n) => {
  if (typeof e != "string")
    return e;
  const a = Bn(e);
  return a !== null ? a : (n.warn("Invalid sync world document payload string; using default payload", {
    projectId: r,
    docType: t
  }), null);
}, Oc = (r, t, e) => {
  const n = vt(r, "synopsis", t, e);
  if (!v(n))
    return { synopsis: "", status: "draft" };
  const a = n.status, o = typeof a == "string" && Lc.has(a) ? a : "draft", s = {
    synopsis: typeof n.synopsis == "string" ? n.synopsis : "",
    status: o
  };
  return typeof n.genre == "string" && (s.genre = n.genre), typeof n.targetAudience == "string" && (s.targetAudience = n.targetAudience), typeof n.logline == "string" && (s.logline = n.logline), typeof n.updatedAt == "string" && (s.updatedAt = n.updatedAt), s;
}, jc = (r, t, e) => {
  const n = vt(r, "plot", t, e);
  return v(n) ? {
    columns: (Array.isArray(n.columns) ? n.columns : []).filter((s) => v(s)).map((s, c) => {
      const l = (Array.isArray(s.cards) ? s.cards : []).filter((i) => v(i)).map((i, p) => ({
        id: typeof i.id == "string" && i.id.length > 0 ? i.id : `card-${c}-${p}`,
        content: typeof i.content == "string" ? i.content : ""
      }));
      return {
        id: typeof s.id == "string" && s.id.length > 0 ? s.id : `col-${c}`,
        title: typeof s.title == "string" ? s.title : "",
        cards: l
      };
    }),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { columns: [] };
}, bc = (r, t, e) => {
  const n = vt(r, "drawing", t, e);
  return v(n) ? {
    paths: $n(n.paths),
    tool: Fs(n.tool),
    iconType: vs(n.iconType),
    color: typeof n.color == "string" ? n.color : void 0,
    lineWidth: typeof n.lineWidth == "number" ? n.lineWidth : void 0,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { paths: [] };
}, Fc = (r, t, e) => {
  const n = vt(r, "mindmap", t, e);
  return v(n) ? {
    nodes: xn(n.nodes),
    edges: Gn(n.edges),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { nodes: [], edges: [] };
}, vc = (r, t, e) => {
  const n = vt(r, "graph", t, e);
  if (!v(n))
    return { nodes: [], edges: [] };
  const a = Array.isArray(n.nodes) ? n.nodes.filter((s) => v(s)) : [], o = Array.isArray(n.edges) ? n.edges.filter((s) => v(s)) : [];
  return {
    nodes: a,
    edges: o,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  };
}, Uc = (r, t, e, n, a) => {
  const o = vt(r, "scrap", t, a);
  if (!v(o))
    return {
      memos: e.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        tags: c.tags,
        updatedAt: c.updatedAt
      })),
      updatedAt: n
    };
  const s = Yn(o);
  return {
    memos: s.memos,
    updatedAt: typeof s.updatedAt == "string" ? s.updatedAt : n
  };
}, Mc = (r) => typeof r == "string" ? r : null, kc = (r) => [...r].sort((t, e) => Date.parse(e.updatedAt) - Date.parse(t.updatedAt)), ea = async (r) => {
  const {
    bundle: t,
    projectId: e,
    projectPath: n,
    localSnapshots: a,
    hydrateMissingWorldDocsFromPackage: o,
    logger: s
  } = r, c = t.projects.find((y) => y.id === e);
  if (!c || c.deletedAt) return null;
  const d = t.chapters.filter((y) => y.projectId === e && !y.deletedAt).sort((y, ee) => y.order - ee.order), l = t.characters.filter((y) => y.projectId === e && !y.deletedAt).map((y) => ({
    id: y.id,
    name: y.name,
    description: y.description ?? void 0,
    firstAppearance: y.firstAppearance ?? void 0,
    attributes: y.attributes ?? void 0
  })), i = t.terms.filter((y) => y.projectId === e && !y.deletedAt).sort((y, ee) => y.order - ee.order).map((y) => ({
    id: y.id,
    term: y.term,
    definition: y.definition ?? void 0,
    category: y.category ?? void 0,
    firstAppearance: y.firstAppearance ?? void 0
  })), p = /* @__PURE__ */ new Map();
  for (const y of kc(t.worldDocuments))
    y.projectId !== e || y.deletedAt || p.has(y.docType) || p.set(y.docType, y.payload);
  await o(p, n);
  const m = t.memos.filter((y) => y.projectId === e && !y.deletedAt).map((y) => ({
    id: y.id,
    title: y.title,
    content: y.content,
    tags: y.tags,
    updatedAt: y.updatedAt
  })), w = a.map((y) => ({
    id: y.id,
    chapterId: y.chapterId ?? void 0,
    content: y.content,
    description: y.description ?? void 0,
    createdAt: y.createdAt.toISOString()
  })), g = Oc(
    e,
    p.get("synopsis"),
    s
  ), A = jc(
    e,
    p.get("plot"),
    s
  ), S = bc(
    e,
    p.get("drawing"),
    s
  ), I = Fc(
    e,
    p.get("mindmap"),
    s
  ), j = vc(
    e,
    p.get("graph"),
    s
  ), St = Uc(
    e,
    p.get("scrap"),
    m,
    c.updatedAt,
    s
  ), Ut = d.map((y) => ({
    id: y.id,
    title: y.title,
    order: y.order,
    file: `${Ft}/${y.id}${Pe}`,
    updatedAt: y.updatedAt
  }));
  return {
    meta: {
      format: Dt,
      container: Nt,
      version: Lt,
      projectId: c.id,
      title: c.title,
      description: c.description ?? void 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      chapters: Ut
    },
    chapters: d.map((y) => ({
      id: y.id,
      content: y.content
    })),
    characters: l,
    terms: i,
    synopsis: g,
    plot: A,
    drawing: S,
    mindmap: I,
    graph: j,
    memos: St,
    snapshots: w
  };
}, Wc = async (r) => {
  const { bundle: t, hydrateMissingWorldDocsFromPackage: e, logger: n } = r, a = r.buildProjectPackagePayload ?? ea, o = [], s = [];
  for (const c of t.projects) {
    const d = await h.getClient().project.findUnique({
      where: { id: c.id },
      select: {
        projectPath: !0,
        snapshots: {
          orderBy: { createdAt: "desc" },
          select: {
            id: !0,
            chapterId: !0,
            content: !0,
            description: !0,
            createdAt: !0
          }
        }
      }
    }), l = Mc(d?.projectPath);
    if (!l || !l.toLowerCase().endsWith(X))
      continue;
    let i;
    try {
      i = K(l, "projectPath");
    } catch (m) {
      n.warn("Skipping .luie persistence for invalid projectPath", {
        projectId: c.id,
        projectPath: l,
        error: m
      });
      continue;
    }
    const p = await a({
      bundle: t,
      projectId: c.id,
      projectPath: i,
      localSnapshots: d?.snapshots ?? [],
      hydrateMissingWorldDocsFromPackage: e,
      logger: n
    });
    if (p)
      try {
        await Sr(i, p, n), s.push({
          projectId: c.id,
          projectPath: i
        });
      } catch (m) {
        o.push(c.id), n.error("Failed to persist merged bundle into .luie package", {
          projectId: c.id,
          projectPath: i,
          error: m
        });
      }
  }
  if (o.length > 0)
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${o.join(",")}`);
  return s;
}, Bc = async (r, t) => {
  if (r.length === 0) return [];
  const e = [];
  for (const n of r)
    try {
      await b.openLuieProject(n.projectPath);
    } catch (a) {
      e.push(n.projectId), t.error("Failed to recover DB cache from persisted .luie package", {
        projectId: n.projectId,
        projectPath: n.projectPath,
        error: a
      });
    }
  return e;
}, $c = async (r) => ea({
  bundle: r.bundle,
  projectId: r.projectId,
  projectPath: r.projectPath,
  localSnapshots: r.localSnapshots,
  hydrateMissingWorldDocsFromPackage: r.hydrateMissingWorldDocsFromPackage,
  logger: r.logger
}), xc = async (r) => {
  const t = await Wc({
    bundle: r.bundle,
    hydrateMissingWorldDocsFromPackage: r.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: r.buildProjectPackagePayload,
    logger: r.logger
  }), e = h.getClient(), n = _c(r.bundle);
  try {
    await e.$transaction(async (a) => {
      await Ic(a, n), await Pc(
        a,
        r.bundle.projects,
        n
      );
      for (const o of r.bundle.chapters)
        n.has(o.projectId) || await Cc(a, o);
      await Rc(
        a,
        r.bundle.characters,
        n
      ), await Dc(a, r.bundle.terms, n), await Nc(
        a,
        r.bundle.tombstones,
        n
      );
    });
  } catch (a) {
    const o = t.map((c) => c.projectId);
    r.logger.error(
      "Failed to apply merged bundle to DB cache after .luie persistence",
      {
        error: a,
        persistedProjectIds: o
      }
    );
    const s = await Bc(
      t,
      r.logger
    );
    throw s.length > 0 ? new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${o.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${s.join(",")}`,
      { cause: a }
    ) : new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${o.join(",") || "none"}`,
      { cause: a }
    );
  }
}, ra = D("SyncRepository"), P = (r) => typeof r == "string" ? r : null, te = (r, t) => typeof r == "string" && r.length > 0 ? r : t, q = (r, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof r == "string" && r.length > 0 ? r : r instanceof Date ? r.toISOString() : t, lr = (r, t = 0) => typeof r == "number" && Number.isFinite(r) ? r : t, Gc = (r) => Array.isArray(r) ? r.filter((t) => typeof t == "string") : [], rn = (r) => !!(r && typeof r == "object" && !Array.isArray(r)), Hc = (r) => {
  try {
    return JSON.parse(r);
  } catch {
    return r;
  }
}, wr = (r) => typeof r == "string" ? Hc(r) : r ?? null, lt = (r) => {
  const t = {};
  for (const [e, n] of Object.entries(r))
    n !== void 0 && (t[e] = n);
  return t;
}, nn = async (r, t, e) => {
  const n = await e.text();
  return e.status === 404 && n.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${r}_FAILED:${t}:${e.status}:${n}`);
}, Yc = (r) => {
  const t = P(r.id), e = P(r.user_id);
  return !t || !e ? null : {
    id: t,
    userId: e,
    title: te(r.title, "Untitled"),
    description: P(r.description),
    createdAt: q(r.created_at),
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, zc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    title: te(r.title, "Untitled"),
    content: P(r.content) ?? "",
    synopsis: P(r.synopsis),
    order: lr(r.order),
    wordCount: lr(r.word_count),
    createdAt: q(r.created_at),
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Xc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    name: te(r.name, "Character"),
    description: P(r.description),
    firstAppearance: P(r.first_appearance),
    attributes: wr(r.attributes),
    createdAt: q(r.created_at),
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Kc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    term: te(r.term, "Term"),
    definition: P(r.definition),
    category: P(r.category),
    order: lr(r.order),
    firstAppearance: P(r.first_appearance),
    createdAt: q(r.created_at),
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Vc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id), a = P(r.doc_type);
  if (!t || !e || !n || !a || a !== "synopsis" && a !== "plot" && a !== "drawing" && a !== "mindmap" && a !== "scrap" && a !== "graph")
    return null;
  const o = wr(r.payload), s = rn(o) ? o : {};
  return rn(o) || ra.warn("Invalid world document payload from sync source; using empty payload", {
    docType: a,
    payloadType: o === null ? "null" : typeof o
  }), {
    id: t,
    userId: e,
    projectId: n,
    docType: a,
    payload: s,
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, qc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    title: te(r.title, "Memo"),
    content: P(r.content) ?? "",
    tags: Gc(r.tags),
    updatedAt: q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Jc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id), a = P(r.entity_type), o = P(r.entity_id);
  return !t || !e || !n || !a || !o ? null : {
    id: t,
    userId: e,
    projectId: n,
    entityType: a,
    entityId: o,
    deletedAt: q(r.deleted_at),
    updatedAt: q(r.updated_at)
  };
};
class Qc {
  isConfigured() {
    return it() !== null;
  }
  async fetchBundle(t, e) {
    const n = Qn(), [
      a,
      o,
      s,
      c,
      d,
      l,
      i
    ] = await Promise.all([
      this.fetchTableRaw("projects", t, e),
      this.fetchTableRaw("chapters", t, e),
      this.fetchTableRaw("characters", t, e),
      this.fetchTableRaw("terms", t, e),
      this.fetchTableRaw("world_documents", t, e),
      this.fetchTableRaw("memos", t, e),
      this.fetchTableRaw("tombstones", t, e)
    ]);
    return n.projects = a.map(Yc).filter((p) => p !== null), n.chapters = o.map(zc).filter((p) => p !== null), n.characters = s.map(Xc).filter((p) => p !== null), n.terms = c.map(Kc).filter((p) => p !== null), n.worldDocuments = d.map(Vc).filter((p) => p !== null), n.memos = l.map(qc).filter((p) => p !== null), n.tombstones = i.map(Jc).filter((p) => p !== null), n;
  }
  async upsertBundle(t, e) {
    const n = e.projects.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        title: i.title,
        description: i.description ?? null,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), a = e.chapters.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        title: i.title,
        content: i.content,
        synopsis: i.synopsis ?? null,
        order: i.order,
        word_count: i.wordCount,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), o = e.characters.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        name: i.name,
        description: i.description ?? null,
        first_appearance: i.firstAppearance ?? null,
        attributes: wr(i.attributes),
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), s = e.terms.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        term: i.term,
        definition: i.definition ?? null,
        category: i.category ?? null,
        order: i.order,
        first_appearance: i.firstAppearance ?? null,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), c = e.worldDocuments.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        doc_type: i.docType,
        payload: i.payload ?? {},
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), d = e.memos.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        title: i.title,
        content: i.content,
        tags: i.tags,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), l = e.tombstones.map(
      (i) => lt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        entity_type: i.entityType,
        entity_id: i.entityId,
        deleted_at: i.deletedAt,
        updated_at: i.updatedAt
      })
    );
    await this.upsertTable("projects", t, n, "id,user_id"), await this.upsertTable("chapters", t, a, "id,user_id"), await this.upsertTable("characters", t, o, "id,user_id"), await this.upsertTable("terms", t, s, "id,user_id"), await this.upsertTable("world_documents", t, c, "id,user_id"), await this.upsertTable("memos", t, d, "id,user_id"), await this.upsertTable("tombstones", t, l, "id,user_id");
  }
  async fetchTableRaw(t, e, n) {
    const a = it();
    if (!a)
      throw new Error(
        "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed"
      );
    const o = new URLSearchParams();
    o.set("select", "*"), o.set("user_id", `eq.${n}`);
    const s = await fetch(`${a.url}/rest/v1/${t}?${o.toString()}`, {
      method: "GET",
      headers: {
        apikey: a.anonKey,
        Authorization: `Bearer ${e}`
      }
    });
    if (!s.ok) {
      const d = await nn("FETCH", t, s);
      throw ra.warn("Failed to fetch sync table", {
        table: t,
        status: s.status,
        error: d.message
      }), d;
    }
    const c = await s.json();
    return Array.isArray(c) ? c : [];
  }
  async upsertTable(t, e, n, a) {
    if (n.length === 0) return;
    const o = zt(), s = await fetch(
      `${o.url}/rest/v1/${t}?on_conflict=${encodeURIComponent(a)}`,
      {
        method: "POST",
        headers: {
          apikey: o.anonKey,
          Authorization: `Bearer ${e}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(n)
      }
    );
    if (!s.ok)
      throw await nn("UPSERT", t, s);
  }
}
const an = new Qc(), Zc = async (r) => {
  r.updateStatus({
    mode: "syncing",
    inFlight: !0,
    queued: !1,
    lastError: void 0
  });
  try {
    const t = _.getSyncSettings(), e = t.userId;
    if (!e)
      throw new Error("SYNC_USER_ID_MISSING");
    const n = r.normalizePendingProjectDeletes(t.pendingProjectDeletes).map((g) => g.projectId), a = await r.ensureAccessToken(t), [o, s] = await Promise.all([
      an.fetchBundle(a, e),
      r.buildLocalBundle(e)
    ]), { merged: c, conflicts: d } = rc(s, o, {
      baselinesByProjectId: t.entityBaselinesByProjectId,
      conflictResolutions: t.pendingConflictResolutions
    });
    if (d.total > 0) {
      const g = new Set(
        (d.items ?? []).map((j) => `${j.type}:${j.id}`)
      ), A = Object.fromEntries(
        Object.entries(t.pendingConflictResolutions ?? {}).filter(
          (j) => g.has(j[0])
        )
      );
      _.setSyncSettings({
        pendingConflictResolutions: Object.keys(A).length > 0 ? A : void 0,
        lastError: void 0
      });
      const I = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        pulled: r.countBundleRows(o),
        pushed: 0,
        conflicts: d.total,
        success: !1,
        message: "SYNC_CONFLICT_DETECTED"
      };
      return r.updateStatus({
        ...r.toSyncStatusFromSettings(_.getSyncSettings(), r.getStatus()),
        mode: "idle",
        health: "connected",
        degradedReason: void 0,
        inFlight: !1,
        queued: !1,
        conflicts: d,
        projectStateById: gc(
          tn(t.projectLastSyncedAtByProjectId),
          d
        ),
        lastRun: I
      }), {
        success: !1,
        message: "SYNC_CONFLICT_DETECTED",
        pulled: I.pulled,
        pushed: 0,
        conflicts: d
      };
    }
    await r.applyMergedBundleToLocal(c), await an.upsertBundle(a, c);
    const l = (/* @__PURE__ */ new Date()).toISOString(), i = Ec(
      t,
      c,
      l,
      n
    ), p = Tc(
      t,
      c,
      l,
      n
    ), m = _.setSyncSettings({
      lastSyncedAt: l,
      lastError: void 0,
      projectLastSyncedAtByProjectId: i,
      entityBaselinesByProjectId: p,
      pendingConflictResolutions: void 0
    });
    n.length > 0 && _.removePendingProjectDeletes(n);
    const w = {
      success: !0,
      message: `SYNC_OK:${r.reason}`,
      pulled: r.countBundleRows(o),
      pushed: r.countBundleRows(c),
      conflicts: d,
      syncedAt: l
    };
    return r.updateStatus({
      ...r.toSyncStatusFromSettings(m, r.getStatus()),
      mode: "idle",
      health: "connected",
      degradedReason: void 0,
      inFlight: !1,
      conflicts: d,
      projectStateById: tn(i),
      lastRun: {
        at: l,
        pulled: w.pulled,
        pushed: w.pushed,
        conflicts: w.conflicts.total,
        success: !0,
        message: w.message
      }
    }), r.getQueuedRun() && (r.setQueuedRun(!1), r.runQueuedSync()), w;
  } catch (t) {
    const e = r.toSyncErrorMessage(t), a = {
      at: (/* @__PURE__ */ new Date()).toISOString(),
      pulled: 0,
      pushed: 0,
      conflicts: r.getStatus().conflicts.total,
      success: !1,
      message: e
    };
    if (r.isAuthFatalMessage(e))
      r.applyAuthFailureState(e, a);
    else {
      const o = _.setSyncSettings({
        lastError: e
      });
      r.updateStatus({
        ...r.toSyncStatusFromSettings(o, r.getStatus()),
        mode: "error",
        health: r.getStatus().connected ? "connected" : "disconnected",
        degradedReason: void 0,
        inFlight: !1,
        queued: !1,
        projectStateById: ta(r.getStatus().projectStateById, e),
        lastRun: a
      });
    }
    return r.setQueuedRun(!1), r.logRunFailed(t, r.reason), {
      success: !1,
      message: e,
      pulled: 0,
      pushed: 0,
      conflicts: r.getStatus().conflicts
    };
  }
}, on = (r, t) => {
  t && _.setSyncSettings(
    r === "access" ? { accessTokenCipher: t } : { refreshTokenCipher: t }
  );
}, td = (r, t) => {
  const e = V.getAccessToken(r);
  if (e.errorCode && t(e.errorCode))
    return e.errorCode;
  on("access", e.migratedCipher);
  const n = V.getRefreshToken(r);
  return n.errorCode && t(n.errorCode) ? n.errorCode : (on("refresh", n.migratedCipher), !!e.token || !!n.token ? null : e.errorCode ?? n.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
}, ed = async (r) => {
  const e = await h.getClient().project.findMany({
    include: {
      chapters: !0,
      characters: !0,
      terms: !0
    }
  });
  return await fc({
    userId: r.userId,
    pendingProjectDeletes: r.pendingProjectDeletes,
    projectRows: e,
    logger: r.logger
  });
}, rd = async (r) => await $c({
  bundle: r.bundle,
  projectId: r.projectId,
  projectPath: r.projectPath,
  localSnapshots: r.localSnapshots,
  hydrateMissingWorldDocsFromPackage: async (t, e) => await Zn(
    t,
    e,
    r.logger
  ),
  logger: r.logger
}), nd = (r) => r.projects.length + r.chapters.length + r.characters.length + r.terms.length + r.worldDocuments.length + r.memos.length + r.snapshots.length + r.tombstones.length, ad = 1500, sn = {
  connected: !1,
  autoSync: !0,
  mode: "idle",
  health: "disconnected",
  inFlight: !1,
  queued: !1,
  conflicts: {
    chapters: 0,
    memos: 0,
    total: 0,
    items: []
  }
}, od = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], sd = (r) => {
  const t = r instanceof Error ? r.message : String(r);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, Ue = (r) => od.some((t) => r.includes(t)), wt = (r, t) => ({
  ...t,
  connected: r.connected,
  provider: r.provider,
  email: r.email,
  userId: r.userId,
  expiresAt: r.expiresAt,
  autoSync: r.autoSync,
  lastSyncedAt: r.lastSyncedAt,
  lastError: r.lastError,
  projectLastSyncedAtByProjectId: r.projectLastSyncedAtByProjectId,
  health: r.connected ? t.health === "degraded" ? "degraded" : "connected" : "disconnected",
  degradedReason: r.connected && t.health === "degraded" ? t.degradedReason ?? r.lastError : void 0
}), cn = (r) => Array.isArray(r) ? r.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [], pt = D("SyncService");
class na {
  status = sn;
  inFlightPromise = null;
  queuedRun = !1;
  autoSyncTimer = null;
  applyAuthFailureState(t, e) {
    const n = _.setSyncSettings({
      lastError: t
    });
    this.updateStatus({
      ...wt(n, this.status),
      mode: "error",
      health: "degraded",
      degradedReason: t,
      inFlight: !1,
      queued: !1,
      projectStateById: ta(this.status.projectStateById, t),
      lastRun: e ?? this.status.lastRun
    });
  }
  initialize() {
    const t = _.getSyncSettings();
    if (this.status = wt(t, this.status), !t.connected && V.hasPendingAuthFlow() && (this.status = {
      ...this.status,
      mode: "connecting"
    }), t.connected) {
      const e = td(
        t,
        Ue
      );
      e && this.applyAuthFailureState(e);
    }
    this.broadcastStatus(), this.status.connected && this.status.autoSync && this.runNow("startup");
  }
  getStatus() {
    return this.status;
  }
  async connectGoogle() {
    if (this.status.mode === "connecting")
      return this.status;
    if (!V.isConfigured())
      return this.updateStatus({
        mode: "error",
        health: "disconnected",
        degradedReason: void 0,
        lastError: "Supabase runtime configuration is not completed. Open Startup Wizard or sync settings and set Supabase URL/Anon Key."
      }), this.status;
    this.updateStatus({
      mode: "connecting",
      health: "disconnected",
      degradedReason: void 0,
      lastError: void 0
    });
    try {
      return await V.startGoogleAuth(), this.status;
    } catch (t) {
      const e = t instanceof Error ? t.message : String(t);
      return e.includes("SYNC_AUTH_FLOW_IN_PROGRESS") ? (this.updateStatus({
        mode: "connecting",
        health: "disconnected",
        degradedReason: void 0,
        lastError: void 0
      }), this.status) : (this.updateStatus({
        mode: "error",
        health: "disconnected",
        degradedReason: void 0,
        lastError: e
      }), this.status);
    }
  }
  async getEdgeAccessToken() {
    const t = _.getSyncSettings();
    if (!t.connected || !t.userId)
      throw new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    return this.ensureAccessToken(t);
  }
  async handleOAuthCallback(t) {
    try {
      const e = await V.completeOAuthCallback(t), n = _.getSyncSettings(), a = _.setSyncSettings({
        ...n,
        connected: !0,
        provider: e.provider,
        userId: e.userId,
        email: e.email,
        expiresAt: e.expiresAt,
        accessTokenCipher: e.accessTokenCipher,
        refreshTokenCipher: e.refreshTokenCipher,
        lastError: void 0
      });
      this.updateStatus({
        ...wt(a, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: void 0
      }), this.runNow("oauth-callback");
    } catch (e) {
      const n = e instanceof Error ? e.message : String(e);
      throw this.updateStatus({
        mode: "error",
        lastError: n
      }), e;
    }
  }
  async disconnect() {
    this.autoSyncTimer && (clearTimeout(this.autoSyncTimer), this.autoSyncTimer = null), this.queuedRun = !1;
    const t = _.clearSyncSettings();
    return this.updateStatus({
      ...wt(t, sn),
      mode: "idle",
      health: "disconnected",
      degradedReason: void 0,
      queued: !1,
      inFlight: !1,
      conflicts: {
        chapters: 0,
        memos: 0,
        total: 0,
        items: []
      },
      projectStateById: void 0
    }), this.status;
  }
  async setAutoSync(t) {
    const e = _.setSyncSettings({ autoSync: t });
    return this.updateStatus(wt(e, this.status)), this.status;
  }
  async resolveConflict(t) {
    if (pt.info("Sync conflict resolution requested", {
      type: t.type,
      id: t.id,
      resolution: t.resolution
    }), !(this.status.conflicts.items ?? []).some(
      (c) => c.type === t.type && c.id === t.id
    ))
      throw new Error("SYNC_CONFLICT_NOT_FOUND");
    const o = {
      ..._.getSyncSettings().pendingConflictResolutions ?? {},
      [`${t.type}:${t.id}`]: t.resolution
    };
    _.setSyncSettings({
      pendingConflictResolutions: o,
      lastError: void 0
    });
    const s = await this.runNow(
      `resolve-conflict:${t.type}:${t.id}:${t.resolution}`
    );
    if (!s.success && s.message !== "SYNC_CONFLICT_DETECTED")
      throw new Error(s.message || "SYNC_RESOLVE_CONFLICT_FAILED");
  }
  onLocalMutation(t) {
    !this.status.connected || !this.status.autoSync || (this.autoSyncTimer && clearTimeout(this.autoSyncTimer), this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null, this.runNow("auto");
    }, ad));
  }
  async runNow(t = "manual") {
    if (!this.status.connected)
      return {
        success: !1,
        message: "SYNC_NOT_CONNECTED",
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts
      };
    if (this.inFlightPromise)
      return this.queuedRun = !0, this.updateStatus({ queued: !0 }), this.inFlightPromise;
    const e = this.executeRun(t).finally(() => {
      this.inFlightPromise = null;
    });
    return this.inFlightPromise = e, e;
  }
  async executeRun(t) {
    return await Zc({
      reason: t,
      getStatus: () => this.status,
      getQueuedRun: () => this.queuedRun,
      setQueuedRun: (e) => {
        this.queuedRun = e;
      },
      runQueuedSync: () => {
        this.runNow("queued");
      },
      normalizePendingProjectDeletes: cn,
      toSyncStatusFromSettings: wt,
      ensureAccessToken: async (e) => await this.ensureAccessToken(e),
      buildLocalBundle: async (e) => await this.buildLocalBundle(e),
      applyMergedBundleToLocal: async (e) => await this.applyMergedBundleToLocal(e),
      countBundleRows: (e) => this.countBundleRows(e),
      updateStatus: (e) => this.updateStatus(e),
      applyAuthFailureState: (e, n) => this.applyAuthFailureState(e, n),
      isAuthFatalMessage: Ue,
      toSyncErrorMessage: sd,
      logRunFailed: (e, n) => {
        pt.error("Sync run failed", { error: e, reason: n });
      }
    });
  }
  async ensureAccessToken(t) {
    return await wc({
      syncSettings: t,
      isAuthFatalMessage: Ue
    });
  }
  async buildLocalBundle(t) {
    return await ed({
      logger: pt,
      pendingProjectDeletes: cn(
        _.getSyncSettings().pendingProjectDeletes
      ),
      userId: t
    });
  }
  async buildProjectPackagePayload(t, e, n, a) {
    return await rd({
      bundle: t,
      localSnapshots: a,
      logger: pt,
      projectId: e,
      projectPath: n
    });
  }
  async applyMergedBundleToLocal(t) {
    await xc({
      bundle: t,
      hydrateMissingWorldDocsFromPackage: async (e, n) => await Zn(e, n, pt),
      buildProjectPackagePayload: async (e) => await this.buildProjectPackagePayload(
        e.bundle,
        e.projectId,
        e.projectPath,
        e.localSnapshots
      ),
      logger: pt
    });
  }
  countBundleRows(t) {
    return nd(t);
  }
  updateStatus(t) {
    this.status = {
      ...this.status,
      ...t
    }, this.broadcastStatus();
  }
  broadcastStatus() {
    const t = Rt.getAllWindows();
    for (const e of t)
      if (!e.isDestroyed())
        try {
          e.webContents.send(bt.SYNC_STATUS_CHANGED, this.status);
        } catch (n) {
          pt.warn("Failed to broadcast sync status", { error: n });
        }
  }
}
const qt = new na(), fp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: na,
  syncService: qt
}, Symbol.toStringTag, { value: "Module" })), pr = D("GeminiProxyClient"), aa = (r, t) => {
  const e = new Error(t);
  return e.status = r, e;
}, id = (r) => {
  const t = process.env.LUIE_GEMINI_PROXY_URL?.trim();
  return t && t.length > 0 ? t : `${r.url}/functions/v1/gemini-proxy`;
}, oa = (r) => {
  if (typeof r == "string") {
    const t = r.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}, sa = (r) => {
  if (!Array.isArray(r))
    return null;
  const t = r[0];
  if (!t || typeof t != "object") return null;
  const e = t.content;
  if (!e || typeof e != "object") return null;
  const n = e.parts;
  if (!Array.isArray(n)) return null;
  const a = n.map(
    (o) => o && typeof o == "object" ? oa(o.text) : null
  ).filter((o) => !!o);
  return a.length === 0 ? null : a.join(`
`).trim();
}, cd = () => {
  const r = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GCP_API,
    process.env.GOOGLE_API_KEY
  ];
  for (const t of r) {
    if (typeof t != "string") continue;
    const e = t.trim();
    if (e.length > 0) return e;
  }
  return null;
}, dd = async (r, t) => {
  const e = await qt.getEdgeAccessToken(), n = id(t), a = await fetch(n, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: t.anonKey,
      Authorization: `Bearer ${e}`
    },
    body: JSON.stringify(r)
  });
  if (!a.ok) {
    const c = await a.text();
    throw pr.warn("gemini-proxy request failed", {
      endpoint: n,
      status: a.status,
      body: c
    }), aa(
      a.status,
      `GEMINI_PROXY_FAILED:${a.status}:${c}`
    );
  }
  const o = await a.json(), s = oa(o.text) ?? sa(o.candidates);
  if (!s)
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  return s;
}, ld = async (r, t) => {
  const e = {};
  r.responseMimeType && (e.responseMimeType = r.responseMimeType), r.responseSchema && (e.responseSchema = r.responseSchema), typeof r.temperature == "number" && (e.temperature = r.temperature), typeof r.topP == "number" && (e.topP = r.topP), typeof r.topK == "number" && (e.topK = r.topK), typeof r.maxOutputTokens == "number" && (e.maxOutputTokens = r.maxOutputTokens);
  const n = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      r.model
    )}:generateContent?key=${encodeURIComponent(t)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: r.prompt }] }],
        generationConfig: e
      })
    }
  ), a = await n.text();
  let o;
  try {
    o = JSON.parse(a);
  } catch {
    o = null;
  }
  if (!n.ok)
    throw aa(
      n.status,
      `GEMINI_LOCAL_FAILED:${n.status}:${a}`
    );
  const s = sa(
    o && typeof o == "object" ? o.candidates : null
  );
  if (!s)
    throw new Error("GEMINI_LOCAL_EMPTY_RESPONSE");
  return s;
}, pd = async (r) => {
  const t = it(), e = cd(), n = [];
  if (t)
    try {
      return await dd(r, t);
    } catch (a) {
      const o = a instanceof Error ? a.message : String(a);
      n.push(`edge:${o}`), pr.warn("Edge Gemini path failed; falling back to local path", {
        message: o
      });
    }
  else
    n.push("edge:SUPABASE_NOT_CONFIGURED");
  if (e)
    try {
      return await ld(r, e);
    } catch (a) {
      const o = a instanceof Error ? a.message : String(a);
      n.push(`local:${o}`), pr.warn("Local Gemini path failed", { message: o });
    }
  else
    n.push("local:GEMINI_LOCAL_API_KEY_MISSING");
  throw new Error(`GEMINI_ALL_PATHS_FAILED:${n.join("|")}`);
}, ia = (r) => r.replace(/\s+/g, " ").trim(), ud = (r, t = "본문 발췌") => {
  const e = ia(r);
  return e ? e.slice(0, Math.min(120, e.length)) : t;
}, hd = (r, t) => {
  const e = ia(r);
  if (!e) return t;
  const n = Math.min(e.length - 1, t.length + 1);
  if (n <= 0 || n >= e.length) return t;
  const a = e.slice(n, Math.min(e.length, n + 120)).trim();
  return a.length > 0 ? a : t;
}, gp = (r) => {
  const t = r.manuscript.content, e = ud(t), n = hd(t, e);
  return [
    {
      type: "intro",
      content: "지금은 AI 연결이 불안정하여 로컬 분석 모드로 요약했습니다. 핵심 흐름과 독자 체감 기준으로 빠르게 점검해드릴게요."
    },
    {
      type: "reaction",
      content: "이 구간은 장면 전환의 템포가 빠르게 이어져 몰입감이 유지됩니다. 특히 인용 구간이 분위기를 선명하게 잡아줍니다.",
      quote: e,
      contextId: "local-fallback-reaction"
    },
    {
      type: "suggestion",
      content: "핵심 정보가 연속으로 배치되어 독자가 한 번에 받아들이기 어려울 수 있습니다. 문단 경계나 연결 문장을 짧게 보강해 보세요.",
      quote: e,
      contextId: "local-fallback-suggestion-1"
    },
    {
      type: "suggestion",
      content: "다음 장면으로 넘어가기 전에 인물의 의도나 감정 변화를 한 줄 더 명시하면 흐름의 개연성이 더 또렷해집니다.",
      quote: n,
      contextId: "local-fallback-suggestion-2"
    },
    {
      type: "outro",
      content: "로컬 분석 기준으로는 전체 흐름이 안정적입니다. 위 두 지점을 다듬으면 독자 체감 완성도가 더 올라갈 수 있습니다."
    }
  ];
}, fd = (r, t) => {
  const e = `${r} ${t.join(" ")}`;
  return /(길드|협회|조직|단체|학교|대학|회사|연맹)/.test(e) ? "organization" : /(성|탑|궁|마을|도시|숲|산|강|거리|던전)/.test(e) ? "location" : /(검|창|방패|반지|목걸이|무기|유물|artifact|아이템)/i.test(e) ? "item" : /(님|씨|군|양|왕|황제|공주|기사|마법사|선생|대장)/.test(e) ? "character" : "concept";
}, dn = (r, t) => {
  const e = fd(r, t), n = t.length >= 3 ? "main" : t.length >= 2 ? "supporting" : "minor";
  return {
    name: r,
    entityType: e,
    importance: n,
    summary: `${r}와(과) 관련된 ${e} 요소로 추정됩니다. 문맥 기반 로컬 분류 결과입니다.`,
    confidence: t.length >= 2 ? 0.58 : 0.42,
    reasoning: "Edge/원격 모델 호출 실패로 로컬 규칙 기반 추정치를 사용했습니다."
  };
}, gd = u.object({
  name: u.string(),
  entityType: u.enum(["character", "location", "organization", "item", "concept"]),
  importance: u.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: u.string(),
  confidence: u.number().min(0).max(1).default(0.5),
  reasoning: u.string().optional()
}), Ed = `
예시 1:
입력: "이준혁은 서울대학교 의과대학을 졸업한 뒤 강남세브란스병원에서 근무하고 있다."
출력: {
  "name": "이준혁",
  "entityType": "character",
  "importance": "main",
  "summary": "서울대 의대 출신으로 강남세브란스병원에 근무하는 의사",
  "confidence": 0.95,
  "reasoning": "인물의 학력과 직장이 구체적으로 서술됨"
}

예시 2:
입력: "그녀는 엘프의 숲 깊은 곳에 위치한 실버문 탑으로 향했다."
출력: {
  "name": "실버문 탑",
  "entityType": "location",
  "importance": "supporting",
  "summary": "엘프의 숲 깊은 곳에 위치한 장소",
  "confidence": 0.85,
  "reasoning": "구체적인 위치 정보가 제공됨"
}

예시 3:
입력: "검은달 조직은 음지에서 세계를 조종하는 비밀결사다."
출력: {
  "name": "검은달",
  "entityType": "organization",
  "importance": "main",
  "summary": "세계를 음지에서 조종하는 비밀결사 조직",
  "confidence": 0.9,
  "reasoning": "조직의 목적과 성격이 명확히 드러남"
}
`.trim(), md = {
  type: dt.OBJECT,
  properties: {
    name: { type: dt.STRING },
    entityType: {
      type: dt.STRING,
      enum: ["character", "location", "organization", "item", "concept"]
    },
    importance: {
      type: dt.STRING,
      enum: ["main", "supporting", "minor", "unknown"]
    },
    summary: { type: dt.STRING },
    confidence: { type: dt.NUMBER },
    reasoning: { type: dt.STRING }
  },
  required: ["name", "entityType", "importance", "summary", "confidence"],
  propertyOrdering: [
    "name",
    "entityType",
    "importance",
    "summary",
    "confidence",
    "reasoning"
  ]
}, oe = D("AutoExtractService"), Ad = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
class yd {
  timers = /* @__PURE__ */ new Map();
  paragraphCache = /* @__PURE__ */ new Map();
  scheduleAnalysis(t, e, n) {
    const a = `${e}:${t}`, o = this.timers.get(a);
    o && clearTimeout(o);
    const s = setTimeout(() => {
      this.analyzeChapter(t, e, n).catch((c) => {
        oe.error("Auto extraction failed", { chapterId: t, projectId: e, error: c });
      });
    }, uo);
    this.timers.set(a, s);
  }
  splitParagraphs(t) {
    return t.split(/\n{2,}/g).map((e) => e.trim()).filter(Boolean);
  }
  getDirtyParagraphs(t, e) {
    const n = this.splitParagraphs(e), a = this.paragraphCache.get(t) ?? [];
    if (this.paragraphCache.set(t, n), a.length === 0)
      return n;
    const o = [], s = Math.max(a.length, n.length);
    for (let c = 0; c < s; c += 1)
      a[c] !== n[c] && n[c] && o.push(n[c]);
    return o;
  }
  async analyzeChapter(t, e, n) {
    const a = this.getDirtyParagraphs(t, n);
    if (a.length === 0)
      return;
    const [o, s] = await Promise.all([
      h.getClient().character.findMany({
        where: { projectId: e },
        select: { id: !0, name: !0, description: !0 }
      }),
      h.getClient().term.findMany({
        where: { projectId: e },
        select: { id: !0, term: !0, definition: !0, category: !0 }
      })
    ]);
    ft.setKnownCharacters(o.map((i) => i.name)), ft.setKnownTerms(s.map((i) => i.term));
    const c = a.flatMap((i) => ft.extractNouns(i)), d = ft.filterByFrequency(c, 2).filter((i) => !o.some((p) => p.name === i)).filter((i) => !s.some((p) => p.term === i)), l = Array.from(new Set(d)).slice(0, 10);
    if (l.length !== 0) {
      for (const i of l) {
        const p = a.filter((w) => w.includes(i)).slice(0, 3), m = await this.classifyWithGemini(i, p);
        m && (m.entityType === "character" ? await nr.createCharacter({
          projectId: e,
          name: m.name,
          description: m.summary,
          attributes: {
            importance: m.importance,
            confidence: m.confidence,
            source: "auto-extract"
          }
        }) : await ar.createTerm({
          projectId: e,
          term: m.name,
          definition: m.summary,
          category: m.entityType
        }));
      }
      oe.info("Auto extraction completed", {
        projectId: e,
        chapterId: t,
        candidateCount: l.length
      });
    }
  }
  async classifyWithGemini(t, e) {
    const n = e.map((o, s) => `문맥 ${s + 1}: ${o}`).join(`
`), a = `당신은 웹소설/판타지 소설 전문 편집자입니다. 주어진 문맥에서 고유명사의 유형을 정확히 분류하고 요약하세요.

## 분류 기준
- character: 사람, 생명체, 의인화된 존재
- location: 지명, 건물, 장소
- organization: 조직, 단체, 길드, 학교
- item: 무기, 아이템, 마법 도구
- concept: 개념, 기술, 마법, 시스템

## 중요도 기준
- main: 스토리의 핵심 요소 (주인공, 주요 무대)
- supporting: 반복적으로 등장하거나 영향력이 있는 요소
- minor: 일시적으로 언급되는 요소
- unknown: 판단하기 어려운 경우

${Ed}

---

이제 아래 문맥에서 "${t}"를 분석하세요.

${n}

[고유명사]: ${t}

JSON 형식으로만 답하세요:`;
    try {
      const o = await pd({
        model: Ad,
        prompt: a,
        responseMimeType: "application/json",
        responseSchema: md
      }), s = gd.safeParse(JSON.parse(o));
      return s.success ? s.data : (oe.warn("Gemini response parse failed", s.error), dn(t, e));
    } catch (o) {
      return oe.warn("Gemini classification failed; using local deterministic fallback", {
        error: o
      }), dn(t, e);
    }
  }
}
const Sd = new yd(), ln = D("ChapterKeywords");
async function Td(r, t, e) {
  try {
    const n = await h.getClient().character.findMany({
      where: { projectId: e },
      select: { id: !0, name: !0 }
    }), a = await h.getClient().term.findMany({
      where: { projectId: e },
      select: { id: !0, term: !0 }
    }), o = n.map((d) => d.name), s = a.map((d) => d.term);
    ft.setKnownCharacters(o), ft.setKnownTerms(s);
    const c = ft.extractFromText(t);
    for (const d of c.filter((l) => l.type === "character")) {
      const l = n.find((i) => i.name === d.text);
      l && (await nr.recordAppearance({
        characterId: String(l.id),
        chapterId: r,
        position: d.position,
        context: pn(t, d.position, Or)
      }), await nr.updateFirstAppearance(String(l.id), r));
    }
    for (const d of c.filter((l) => l.type === "term")) {
      const l = a.find((i) => i.term === d.text);
      l && (await ar.recordAppearance({
        termId: String(l.id),
        chapterId: r,
        position: d.position,
        context: pn(t, d.position, Or)
      }), await ar.updateFirstAppearance(String(l.id), r));
    }
    ln.info("Keyword tracking completed", {
      chapterId: r,
      characterCount: c.filter((d) => d.type === "character").length,
      termCount: c.filter((d) => d.type === "term").length
    });
  } catch (n) {
    ln.error("Failed to track keyword appearances", n);
  }
}
function pn(r, t, e) {
  const n = Math.max(0, t - e), a = Math.min(r.length, t + e);
  return r.substring(n, a);
}
const M = D("ChapterService");
function un(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class wd {
  async resolveProjectTitle(t) {
    if (!t) return "Unknown";
    const e = await h.getClient().project.findUnique({
      where: { id: t },
      select: { title: !0 }
    });
    return typeof e?.title == "string" ? String(e.title) : "Unknown";
  }
  async writeSuspiciousContentDump(t) {
    if (Xt()) return;
    const e = await this.resolveProjectTitle(t.projectId), n = jt(e, "Unknown"), a = C.join(
      T.getPath("userData"),
      Ar,
      n || "Unknown",
      "_suspicious"
    );
    await H.mkdir(a, { recursive: !0 });
    const o = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), s = C.join(a, `${t.filePrefix}-${t.chapterId}-${o}.txt`);
    return await H.writeFile(s, t.content, "utf8"), s;
  }
  async applyContentUpdate(t, e, n) {
    if (t.content === void 0) return;
    const a = typeof e?.content == "string" ? e.content : "", o = a.length, s = t.content.length, c = typeof e?.projectId == "string" ? e.projectId : void 0;
    if (o > 0 && s === 0) {
      const d = await this.writeSuspiciousContentDump({
        projectId: c,
        chapterId: t.id,
        filePrefix: "dump-empty",
        content: a
      });
      throw M.warn("Empty content save blocked.", { chapterId: t.id, oldLen: o, dumpPath: d }), new f(
        E.VALIDATION_FAILED,
        "Empty content save blocked",
        { chapterId: t.id, oldLen: o }
      );
    }
    if (!Xt() && o > 1e3 && s < o * 0.1) {
      const d = await this.writeSuspiciousContentDump({
        projectId: c,
        chapterId: t.id,
        filePrefix: "dump",
        content: t.content
      });
      throw M.warn("Suspicious large deletion detected. Save blocked.", {
        chapterId: t.id,
        oldLen: o,
        newLen: s,
        dumpPath: d
      }), new f(
        E.VALIDATION_FAILED,
        "Suspicious large deletion detected; save blocked",
        { chapterId: t.id, oldLen: o, newLen: s }
      );
    }
    n.content = t.content, n.wordCount = t.content.length, c && (await Td(t.id, t.content, c), Sd.scheduleAnalysis(t.id, c, t.content));
  }
  async createChapter(t) {
    try {
      if (!t.title || t.title.trim().length === 0)
        throw new f(
          E.REQUIRED_FIELD_MISSING,
          "Chapter title is required",
          { input: t }
        );
      M.info("Creating chapter", t);
      const e = await h.getClient().chapter.findFirst({
        where: { projectId: t.projectId, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: !0 }
      }), n = typeof e?.order == "number" ? e.order : 0, a = t.order ?? n + 1, o = await h.getClient().chapter.create({
        data: {
          projectId: t.projectId,
          title: t.title,
          synopsis: t.synopsis,
          order: a,
          content: ""
        }
      });
      return M.info("Chapter created successfully", { chapterId: o.id }), b.schedulePackageExport(t.projectId, "chapter:create"), o;
    } catch (e) {
      throw M.error("Failed to create chapter", e), e instanceof f ? e : new f(
        E.CHAPTER_CREATE_FAILED,
        "Failed to create chapter",
        { input: t },
        e
      );
    }
  }
  async getChapter(t) {
    try {
      const e = await h.getClient().chapter.findFirst({
        where: { id: t, deletedAt: null }
      });
      if (!e)
        throw new f(
          E.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw M.error("Failed to get chapter", e), e;
    }
  }
  async getAllChapters(t) {
    try {
      return await h.getClient().chapter.findMany({
        where: { projectId: t, deletedAt: null },
        orderBy: { order: "asc" }
      });
    } catch (e) {
      throw M.error("Failed to get all chapters", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get all chapters",
        { projectId: t },
        e
      );
    }
  }
  async updateChapter(t) {
    try {
      const e = await h.getClient().chapter.findUnique({
        where: { id: t.id },
        select: { projectId: !0, content: !0, deletedAt: !0 }
      });
      if (e?.deletedAt)
        throw new f(
          E.VALIDATION_FAILED,
          "Cannot update a deleted chapter",
          { id: t.id }
        );
      const n = {};
      t.title !== void 0 && (n.title = t.title), await this.applyContentUpdate(
        t,
        e,
        n
      ), t.synopsis !== void 0 && (n.synopsis = t.synopsis);
      const a = await h.getClient().chapter.update({
        where: { id: t.id },
        data: n
      });
      return M.info("Chapter updated successfully", {
        chapterId: a.id
      }), b.schedulePackageExport(
        String(a.projectId),
        "chapter:update"
      ), a;
    } catch (e) {
      throw M.error("Failed to update chapter", e), e instanceof f ? e : un(e) ? new f(
        E.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: t.id },
        e
      ) : new f(
        E.CHAPTER_UPDATE_FAILED,
        "Failed to update chapter",
        { input: t },
        e
      );
    }
  }
  async deleteChapter(t) {
    try {
      const e = await h.getClient().chapter.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      }), n = await h.getClient().chapter.update({
        where: { id: t },
        data: { deletedAt: /* @__PURE__ */ new Date() }
      });
      return e?.projectId && await Q.forgetChapter(
        String(e.projectId),
        t
      ), M.info("Chapter soft-deleted successfully", { chapterId: t }), e?.projectId && b.schedulePackageExport(
        String(e.projectId),
        "chapter:delete"
      ), n;
    } catch (e) {
      throw M.error("Failed to delete chapter", e), new f(
        E.CHAPTER_DELETE_FAILED,
        "Failed to delete chapter",
        { id: t },
        e
      );
    }
  }
  async getDeletedChapters(t) {
    try {
      return await h.getClient().chapter.findMany({
        where: { projectId: t, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    } catch (e) {
      throw M.error("Failed to get deleted chapters", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get deleted chapters",
        { projectId: t },
        e
      );
    }
  }
  async restoreChapter(t) {
    try {
      const e = await h.getClient().chapter.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      });
      if (!e?.projectId)
        throw new f(
          E.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: t }
        );
      const n = await h.getClient().chapter.update({
        where: { id: t },
        data: {
          deletedAt: null
        }
      });
      return M.info("Chapter restored successfully", { chapterId: t }), b.schedulePackageExport(String(e.projectId), "chapter:restore"), n;
    } catch (e) {
      throw M.error("Failed to restore chapter", e), un(e) ? new f(
        E.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: t },
        e
      ) : new f(
        E.CHAPTER_UPDATE_FAILED,
        "Failed to restore chapter",
        { id: t },
        e
      );
    }
  }
  async purgeChapter(t) {
    try {
      const e = await h.getClient().chapter.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      });
      return await h.getClient().chapter.delete({ where: { id: t } }), e?.projectId && await Q.forgetChapter(
        String(e.projectId),
        t
      ), M.info("Chapter purged successfully", { chapterId: t }), e?.projectId && b.schedulePackageExport(
        String(e.projectId),
        "chapter:purge"
      ), { success: !0 };
    } catch (e) {
      throw M.error("Failed to purge chapter", e), new f(
        E.CHAPTER_DELETE_FAILED,
        "Failed to purge chapter",
        { id: t },
        e
      );
    }
  }
  async reorderChapters(t, e) {
    try {
      return await h.getClient().$transaction(
        e.map(
          (n, a) => h.getClient().chapter.update({
            where: { id: n },
            data: { order: a + 1 }
          })
        )
      ), M.info("Chapters reordered successfully", { projectId: t }), b.schedulePackageExport(t, "chapter:reorder"), { success: !0 };
    } catch (n) {
      throw M.error("Failed to reorder chapters", n), new f(
        E.DB_TRANSACTION_FAILED,
        "Failed to reorder chapters",
        { projectId: t },
        n
      );
    }
  }
}
const ca = new wd(), _d = D("AtomicWrite"), Id = Er(Sn), Pd = Er(La);
async function pe(r, t) {
  const e = C.dirname(r), n = C.join(e, `${C.basename(r)}.tmp-${Date.now()}`);
  await R.writeFile(n, t);
  const a = await R.open(n, "r+");
  try {
    await a.sync();
  } finally {
    await a.close();
  }
  await R.rename(n, r);
  try {
    const o = await R.open(e, "r");
    try {
      await o.sync();
    } finally {
      await o.close();
    }
  } catch (o) {
    _d.warn("Failed to fsync directory", { dir: e, error: o });
  }
}
async function hn(r, t) {
  const e = await Id(Buffer.from(t, "utf8"));
  await pe(r, e);
}
async function da(r) {
  const t = await R.readFile(r);
  return (t.length >= 2 && t[0] === 31 && t[1] === 139 ? await Pd(t) : t).toString("utf8");
}
const Et = D("SnapshotArtifacts"), Cd = Er(Sn), Rd = /-([0-9a-fA-F-]{36})\.snap$/;
async function Dd(r) {
  const t = await da(r);
  return JSON.parse(t);
}
function la(r) {
  const t = K(r, "projectPath"), e = t.toLowerCase(), n = X.toLowerCase();
  return e.endsWith(n) ? C.dirname(t) : t;
}
function pa(r, t) {
  return C.join(r, ".luie", Ot, t);
}
const Nd = (r) => C.basename(r).match(Rd)?.[1] ?? null, ua = async (r, t) => {
  let e;
  try {
    e = await R.readdir(r, { withFileTypes: !0 });
  } catch (n) {
    if (n?.code === "ENOENT") return;
    Et.warn("Failed to read snapshot artifact directory", { rootDir: r, error: n });
    return;
  }
  for (const n of e) {
    const a = C.join(r, n.name);
    if (n.isDirectory()) {
      await ua(a, t);
      continue;
    }
    !n.isFile() || !n.name.endsWith(".snap") || t.push(a);
  }
}, Ld = async () => {
  const r = /* @__PURE__ */ new Set([C.join(T.getPath("userData"), Ar)]), t = await h.getClient().project.findMany({
    select: { id: !0, title: !0, projectPath: !0 }
  });
  for (const e of t) {
    if (!e.projectPath) continue;
    const n = jt(e.title ?? "", String(e.id));
    try {
      const a = la(e.projectPath);
      r.add(pa(a, n)), r.add(C.join(a, `backup${n}`));
    } catch (a) {
      Et.warn("Skipping snapshot artifact roots for invalid projectPath", {
        projectId: e.id,
        projectPath: e.projectPath,
        error: a
      });
    }
  }
  return Array.from(r);
};
async function fn(r) {
  const t = r?.snapshotIds && r.snapshotIds.length > 0 ? new Set(r.snapshotIds) : null, e = typeof r?.minAgeMs == "number" && r.minAgeMs > 0 ? r.minAgeMs : 0, n = Date.now(), a = t ? await h.getClient().snapshot.findMany({
    where: { id: { in: Array.from(t) } },
    select: { id: !0 }
  }) : await h.getClient().snapshot.findMany({
    select: { id: !0 }
  }), o = new Set(
    a.map((i) => i.id)
  ), s = await Ld(), c = [];
  for (const i of s)
    await ua(i, c);
  let d = 0, l = 0;
  for (const i of c) {
    const p = Nd(i);
    if (p && !(t && !t.has(p)) && (d += 1, !o.has(p))) {
      if (e > 0)
        try {
          const m = await R.stat(i);
          if (n - m.mtimeMs < e)
            continue;
        } catch {
          continue;
        }
      try {
        await R.unlink(i), l += 1;
      } catch (m) {
        Et.warn("Failed to delete orphan snapshot artifact", {
          artifactPath: i,
          snapshotId: p,
          error: m
        });
      }
    }
  }
  return { scanned: d, deleted: l };
}
async function Od(r, t) {
  Et.info("Preparing snapshot artifact", {
    snapshotId: r,
    projectId: t.projectId,
    chapterId: t.chapterId
  });
  const e = await h.getClient().project.findUnique({
    where: { id: t.projectId },
    include: {
      settings: !0,
      chapters: { orderBy: { order: "asc" } },
      characters: !0,
      terms: !0
    }
  });
  if (!e)
    throw new f(E.PROJECT_NOT_FOUND, "Project not found", {
      projectId: t.projectId
    });
  e.projectPath || Et.warn("Project path missing for snapshot; skipping local package snapshot", {
    snapshotId: r,
    projectId: t.projectId
  });
  const n = {
    meta: {
      version: Va,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      snapshotId: r,
      projectId: String(e.id)
    },
    data: {
      project: {
        id: String(e.id),
        title: e.title,
        description: e.description,
        projectPath: e.projectPath,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
      },
      settings: e.settings ?? void 0,
      chapters: e.chapters.map((g) => ({
        id: g.id,
        title: g.title,
        content: g.content,
        synopsis: g.synopsis,
        order: g.order,
        wordCount: g.wordCount,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString()
      })),
      characters: e.characters.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        firstAppearance: g.firstAppearance,
        attributes: g.attributes,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString()
      })),
      terms: e.terms.map((g) => ({
        id: g.id,
        term: g.term,
        definition: g.definition,
        category: g.category,
        firstAppearance: g.firstAppearance,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString()
      })),
      focus: {
        chapterId: t.chapterId ?? null,
        content: t.content ?? null
      }
    }
  }, a = JSON.stringify(n), o = await Cd(Buffer.from(a, "utf8")), c = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${r}.snap`;
  let d, l;
  const i = jt(e.title ?? "", String(e.id));
  let p = null;
  if (e.projectPath)
    try {
      p = la(e.projectPath);
      const g = pa(p, i);
      await R.mkdir(g, { recursive: !0 }), d = C.join(g, c), await pe(d, o);
    } catch (g) {
      Et.warn("Skipping project-local snapshot artifact write for invalid projectPath", {
        snapshotId: r,
        projectId: e.id,
        projectPath: e.projectPath,
        error: g
      });
    }
  const m = C.join(T.getPath("userData"), Ar, i);
  await R.mkdir(m, { recursive: !0 });
  const w = C.join(m, c);
  if (await pe(w, o), p) {
    const g = C.join(p, `backup${i}`);
    await R.mkdir(g, { recursive: !0 }), l = C.join(g, c), await pe(l, o);
  }
  Et.info("Full snapshot saved", {
    snapshotId: r,
    projectId: e.id,
    projectPath: e.projectPath,
    localPath: d,
    backupPath: w,
    projectBackupPath: l
  });
}
const jd = async (r, t, e) => {
  try {
    const n = C.join(
      T.getPath("userData"),
      qe,
      "_emergency"
    );
    await R.mkdir(n, { recursive: !0 });
    const a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), o = C.join(
      n,
      `emergency-${r.projectId}-${r.chapterId ?? "project"}-${a}.json`
    ), s = JSON.stringify(
      {
        projectId: r.projectId,
        chapterId: r.chapterId ?? null,
        content: r.content,
        description: r.description ?? null,
        type: r.type ?? "AUTO",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: e instanceof Error ? { message: e.message, name: e.name } : void 0
      },
      null,
      2
    ), c = `${o}.tmp`;
    await R.writeFile(c, s, "utf8");
    const d = await R.open(c, "r+");
    try {
      await d.sync();
    } finally {
      await d.close();
    }
    await R.rename(c, o);
    try {
      const l = await R.open(n, "r");
      try {
        await l.sync();
      } finally {
        await l.close();
      }
    } catch (l) {
      t.warn("Failed to fsync emergency snapshot directory", l);
    }
    t.warn("Emergency snapshot file written", { filePath: o });
  } catch (n) {
    t.error("Failed to write emergency snapshot file", n);
  }
}, bd = async (r) => {
  const t = jt(r || "Recovered Snapshot", "Recovered Snapshot"), e = T.getPath("documents");
  let n = C.join(
    e,
    `${t || "Recovered Snapshot"}${X}`
  );
  try {
    await R.access(n);
    const a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    n = C.join(
      e,
      `${t || "Recovered Snapshot"}-${a}${X}`
    );
  } catch {
  }
  return n;
}, Fd = (r) => {
  const t = r;
  return {
    autoSave: typeof t?.autoSave == "boolean" ? t.autoSave : !0,
    autoSaveInterval: typeof t?.autoSaveInterval == "number" ? t.autoSaveInterval : ye
  };
}, vd = async (r, t) => {
  const { autoSave: e, autoSaveInterval: n } = Fd(r.data.settings), a = r.data.project;
  return await h.getClient().$transaction(
    async (s) => {
      const c = await s.project.create({
        data: {
          title: a.title || "Recovered Snapshot",
          description: a.description ?? void 0,
          projectPath: t,
          settings: {
            create: {
              autoSave: e,
              autoSaveInterval: n
            }
          }
        },
        include: {
          settings: !0
        }
      }), d = c.id, l = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = r.data.chapters.map((A, S) => {
        const I = Y();
        return l.set(A.id, I), {
          id: I,
          projectId: d,
          title: A.title,
          content: A.content ?? "",
          synopsis: A.synopsis ?? null,
          order: typeof A.order == "number" ? A.order : S,
          wordCount: A.wordCount ?? 0
        };
      }), w = r.data.characters.map((A) => {
        const S = Y();
        return i.set(A.id, S), {
          id: S,
          projectId: d,
          name: A.name,
          description: A.description ?? null,
          firstAppearance: A.firstAppearance ?? null,
          attributes: typeof A.attributes == "string" ? A.attributes : A.attributes ? JSON.stringify(A.attributes) : null
        };
      }), g = r.data.terms.map((A) => {
        const S = Y();
        return p.set(A.id, S), {
          id: S,
          projectId: d,
          term: A.term,
          definition: A.definition ?? null,
          category: A.category ?? null,
          firstAppearance: A.firstAppearance ?? null
        };
      });
      return m.length > 0 && await s.chapter.createMany({
        data: m
      }), w.length > 0 && await s.character.createMany({
        data: w
      }), g.length > 0 && await s.term.createMany({
        data: g
      }), {
        created: {
          id: c.id,
          title: c.title,
          description: c.description,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        },
        chapterIdMap: l,
        characterIdMap: i,
        termIdMap: p
      };
    }
  );
}, Ud = (r) => ({
  format: Dt,
  container: Nt,
  version: Lt,
  projectId: r.id,
  title: r.title,
  description: r.description ?? void 0,
  createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt)
}), Md = async (r, t, e) => {
  try {
    await h.getClient().project.delete({ where: { id: r } });
  } catch (n) {
    e.error("Failed to rollback project after snapshot .luie import failure", {
      projectId: r,
      filePath: t,
      error: n
    });
  }
}, kd = async (r, t) => {
  const e = await Dd(r), n = await bd(e.data.project.title), a = await vd(e, n), { created: o, chapterIdMap: s, characterIdMap: c, termIdMap: d } = a, l = Ud(o);
  try {
    await Sr(
      n,
      {
        meta: l,
        chapters: e.data.chapters.map((i) => ({
          id: s.get(i.id) ?? i.id,
          content: i.content ?? ""
        })),
        characters: e.data.characters.map((i) => ({
          id: c.get(i.id) ?? i.id,
          name: i.name,
          description: i.description ?? null,
          firstAppearance: i.firstAppearance ?? null,
          attributes: typeof i.attributes == "string" ? i.attributes : i.attributes ? JSON.stringify(i.attributes) : null,
          createdAt: new Date(i.createdAt),
          updatedAt: new Date(i.updatedAt)
        })),
        terms: e.data.terms.map((i) => ({
          id: d.get(i.id) ?? i.id,
          term: i.term,
          definition: i.definition ?? null,
          category: i.category ?? null,
          firstAppearance: i.firstAppearance ?? null,
          createdAt: new Date(i.createdAt),
          updatedAt: new Date(i.updatedAt)
        })),
        snapshots: []
      },
      t
    );
  } catch (i) {
    throw await Md(o.id, r, t), i;
  }
  return o;
}, N = D("SnapshotService"), Wd = 3e4, Bd = 1e4;
class $d {
  orphanArtifactIds = /* @__PURE__ */ new Set();
  orphanCleanupTimer = null;
  scheduleOrphanArtifactCleanup() {
    this.orphanCleanupTimer || (this.orphanCleanupTimer = setTimeout(() => {
      this.orphanCleanupTimer = null, this.cleanupOrphanArtifacts("idle").catch((t) => {
        N.warn("Idle orphan artifact cleanup failed", { error: t });
      });
    }, Wd), typeof this.orphanCleanupTimer.unref == "function" && this.orphanCleanupTimer.unref());
  }
  queueOrphanArtifactCleanup(t) {
    this.orphanArtifactIds.add(t), this.scheduleOrphanArtifactCleanup();
  }
  async cleanupOrphanArtifacts(t = "idle") {
    if (t === "startup") {
      const n = await fn();
      return N.info("Startup orphan artifact cleanup completed", n), n;
    }
    const e = Array.from(this.orphanArtifactIds);
    if (e.length === 0)
      return { scanned: 0, deleted: 0 };
    for (const n of e)
      this.orphanArtifactIds.delete(n);
    try {
      const n = await fn({
        snapshotIds: e,
        minAgeMs: Bd
      });
      return N.info("Queued orphan artifact cleanup completed", {
        queued: e.length,
        ...n
      }), n;
    } catch (n) {
      for (const a of e)
        this.orphanArtifactIds.add(a);
      throw n;
    }
  }
  async createSnapshot(t) {
    const e = Y();
    try {
      const n = t.type ?? "AUTO", a = t.content.length;
      N.info("Creating snapshot", {
        snapshotId: e,
        projectId: t.projectId,
        chapterId: t.chapterId,
        hasContent: !!t.content,
        descriptionLength: t.description?.length ?? 0,
        type: n
      }), await Od(e, t);
      const o = await h.getClient().snapshot.create({
        data: {
          id: e,
          projectId: t.projectId,
          chapterId: t.chapterId,
          content: t.content,
          contentLength: a,
          type: n,
          description: t.description
        }
      });
      return N.info("Snapshot created successfully", { snapshotId: o.id }), b.schedulePackageExport(t.projectId, "snapshot:create"), this.scheduleOrphanArtifactCleanup(), o;
    } catch (n) {
      throw this.queueOrphanArtifactCleanup(e), await jd(t, N, n), N.error("Failed to create snapshot", {
        error: n,
        snapshotId: e,
        projectId: t.projectId,
        chapterId: t.chapterId
      }), new f(
        E.SNAPSHOT_CREATE_FAILED,
        "Failed to create snapshot",
        { input: t },
        n
      );
    }
  }
  async getSnapshot(t) {
    try {
      const e = await h.getClient().snapshot.findUnique({
        where: { id: t }
      });
      if (!e)
        throw new f(
          E.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw N.error("Failed to get snapshot", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get snapshot",
        { id: t },
        e
      );
    }
  }
  async getSnapshotsByProject(t) {
    try {
      return await h.getClient().snapshot.findMany({
        where: { projectId: t },
        orderBy: { createdAt: "desc" }
      });
    } catch (e) {
      throw N.error("Failed to get snapshots by project", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get snapshots by project",
        { projectId: t },
        e
      );
    }
  }
  async getSnapshotsByChapter(t) {
    try {
      return await h.getClient().snapshot.findMany({
        where: { chapterId: t },
        orderBy: { createdAt: "desc" }
      });
    } catch (e) {
      throw N.error("Failed to get snapshots by chapter", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get snapshots by chapter",
        { chapterId: t },
        e
      );
    }
  }
  async deleteSnapshot(t) {
    try {
      const e = await h.getClient().snapshot.findUnique({
        where: { id: t },
        select: { projectId: !0 }
      });
      return await h.getClient().snapshot.delete({
        where: { id: t }
      }), this.queueOrphanArtifactCleanup(t), N.info("Snapshot deleted successfully", { snapshotId: t }), e?.projectId && b.schedulePackageExport(
        String(e.projectId),
        "snapshot:delete"
      ), { success: !0 };
    } catch (e) {
      throw N.error("Failed to delete snapshot", e), new f(
        E.SNAPSHOT_DELETE_FAILED,
        "Failed to delete snapshot",
        { id: t },
        e
      );
    }
  }
  async restoreSnapshot(t) {
    try {
      const e = await h.getClient().snapshot.findUnique({
        where: { id: t }
      });
      if (!e)
        throw new f(
          E.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { snapshotId: t }
        );
      if (!e.chapterId)
        throw new f(
          E.SNAPSHOT_RESTORE_FAILED,
          "Cannot restore project-level snapshot",
          { snapshotId: t }
        );
      const n = typeof e.content == "string" ? e.content : "";
      return await h.getClient().chapter.update({
        where: { id: e.chapterId },
        data: {
          content: n,
          wordCount: n.length
        }
      }), N.info("Snapshot restored successfully", {
        snapshotId: t,
        chapterId: e.chapterId
      }), b.schedulePackageExport(String(e.projectId), "snapshot:restore"), {
        success: !0,
        chapterId: e.chapterId
      };
    } catch (e) {
      throw N.error("Failed to restore snapshot", e), e instanceof f ? e : new f(
        E.SNAPSHOT_RESTORE_FAILED,
        "Failed to restore snapshot",
        { snapshotId: t },
        e
      );
    }
  }
  async importSnapshotFile(t) {
    try {
      N.info("Importing snapshot file", { filePath: t });
      const e = await kd(t, N);
      return N.info("Snapshot imported successfully", {
        projectId: e.id,
        filePath: t
      }), e;
    } catch (e) {
      throw N.error("Failed to import snapshot file", e), new f(
        E.SNAPSHOT_RESTORE_FAILED,
        "Failed to import snapshot file",
        { filePath: t },
        e
      );
    }
  }
  async deleteOldSnapshots(t, e = jn) {
    try {
      const n = await h.getClient().snapshot.findMany({
        where: { projectId: t },
        orderBy: { createdAt: "desc" }
      });
      if (n.length <= e)
        return { success: !0, deletedCount: 0 };
      const a = n.slice(e), o = a.map(
        (s) => h.getClient().snapshot.delete({
          where: { id: s.id }
        })
      );
      await Promise.all(o);
      for (const s of a)
        this.queueOrphanArtifactCleanup(s.id);
      return N.info("Old snapshots deleted successfully", {
        projectId: t,
        deletedCount: a.length
      }), { success: !0, deletedCount: a.length };
    } catch (n) {
      throw N.error("Failed to delete old snapshots", n), new f(
        E.DB_QUERY_FAILED,
        "Failed to delete old snapshots",
        { projectId: t, keepCount: e },
        n
      );
    }
  }
  async pruneSnapshots(t) {
    const e = Date.now(), a = 24 * (3600 * 1e3), o = 7 * a;
    try {
      const s = await h.getClient().snapshot.findMany({
        where: { projectId: t, type: "AUTO" },
        orderBy: { createdAt: "desc" },
        select: { id: !0, createdAt: !0 }
      });
      if (s.length === 0)
        return { success: !0, deletedCount: 0 };
      const c = [], d = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set();
      for (const i of s) {
        const p = i.createdAt instanceof Date ? i.createdAt : new Date(String(i.createdAt)), m = e - p.getTime();
        if (m < a)
          continue;
        if (m < o) {
          const g = p.toISOString().slice(0, 13);
          d.has(g) ? c.push(i.id) : d.add(g);
          continue;
        }
        const w = p.toISOString().slice(0, 10);
        l.has(w) ? c.push(i.id) : l.add(w);
      }
      if (c.length === 0)
        return { success: !0, deletedCount: 0 };
      await h.getClient().snapshot.deleteMany({
        where: { id: { in: c } }
      });
      for (const i of c)
        this.queueOrphanArtifactCleanup(i);
      return N.info("Snapshots pruned", {
        projectId: t,
        deletedCount: c.length
      }), { success: !0, deletedCount: c.length };
    } catch (s) {
      throw N.error("Failed to prune snapshots", s), new f(
        E.DB_QUERY_FAILED,
        "Failed to prune snapshots",
        { projectId: t },
        s
      );
    }
  }
  async pruneSnapshotsAllProjects() {
    const t = await h.getClient().project.findMany({
      select: { id: !0 }
    });
    return { success: !0, deletedCount: (await Promise.all(
      t.map((a) => this.pruneSnapshots(String(a.id)))
    )).reduce(
      (a, o) => a + (o.deletedCount ?? 0),
      0
    ) };
  }
  async getLatestSnapshot(t) {
    try {
      return await h.getClient().snapshot.findFirst({
        where: { chapterId: t },
        orderBy: { createdAt: "desc" }
      });
    } catch (e) {
      throw N.error("Failed to get latest snapshot", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get latest snapshot",
        { chapterId: t },
        e
      );
    }
  }
}
const z = new $d();
class xd {
  constructor(t) {
    this.logger = t;
  }
  getMirrorBaseDir(t, e) {
    return C.join(
      T.getPath("userData"),
      qe,
      t,
      e
    );
  }
  async writeLatestMirror(t, e, n) {
    try {
      const a = this.getMirrorBaseDir(t, e);
      await R.mkdir(a, { recursive: !0 });
      const o = C.join(a, "latest.snap"), s = JSON.stringify(
        { projectId: t, chapterId: e, content: n, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await hn(o, s);
    } catch (a) {
      this.logger.error("Failed to write latest mirror", a);
    }
  }
  async writeTimestampedMirror(t, e, n) {
    try {
      const a = this.getMirrorBaseDir(t, e);
      await R.mkdir(a, { recursive: !0 });
      const o = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), s = C.join(a, `${o}.snap`), c = JSON.stringify(
        { projectId: t, chapterId: e, content: n, createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await hn(s, c);
      const d = (await R.readdir(a)).filter(
        (l) => l.endsWith(".snap") && l !== "latest.snap"
      );
      if (d.length > ge) {
        const i = d.sort().slice(0, d.length - ge);
        await Promise.all(
          i.map((p) => R.unlink(C.join(a, p)).catch(() => {
          }))
        );
      }
    } catch (a) {
      this.logger.error("Failed to write timestamped mirror", a);
    }
  }
  async flushMirrorsToSnapshots(t) {
    const e = await this.listLatestMirrorFiles();
    let n = 0, a = 0;
    for (const o of e)
      try {
        const s = await this.readMirrorPayload(o);
        if (!s) continue;
        const c = await h.getClient().chapter.findUnique({
          where: { id: s.chapterId },
          select: { id: !0, projectId: !0, deletedAt: !0 }
        });
        if (!c) {
          this.logger.warn("Mirror snapshot skipped (missing chapter), cleaning up stale mirror", {
            chapterId: s.chapterId,
            filePath: o
          }), await this.cleanStaleMirrorDir(o), a += 1;
          continue;
        }
        const d = c.deletedAt;
        if (d != null) {
          this.logger.info("Mirror snapshot skipped (chapter deleted), cleaning up", {
            chapterId: s.chapterId,
            filePath: o
          }), await this.cleanStaleMirrorDir(o), a += 1;
          continue;
        }
        if (String(c.projectId) !== s.projectId) {
          this.logger.warn("Mirror snapshot skipped (project mismatch), cleaning up", {
            chapterId: s.chapterId,
            projectId: s.projectId,
            filePath: o
          }), await this.cleanStaleMirrorDir(o), a += 1;
          continue;
        }
        const l = await z.getLatestSnapshot(s.chapterId), i = l?.createdAt ? new Date(String(l.createdAt)).getTime() : 0, p = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
        if (p && p <= i)
          continue;
        await z.createSnapshot({
          projectId: s.projectId,
          chapterId: s.chapterId,
          content: s.content,
          description: `미러 복구 스냅샷 (${t}) ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
          type: "AUTO"
        }), n += 1;
      } catch (s) {
        this.logger.warn("Failed to flush mirror snapshot", { error: s, filePath: o });
      }
    return this.logger.info("Mirror snapshot flush completed", { created: n, cleaned: a, reason: t }), { created: n, cleaned: a };
  }
  async listLatestMirrorFiles() {
    const t = C.join(T.getPath("userData"), qe), e = [];
    try {
      const n = await R.readdir(t, { withFileTypes: !0 });
      for (const a of n) {
        if (!a.isDirectory() || a.name === "_emergency") continue;
        const o = C.join(t, a.name), s = await R.readdir(o, { withFileTypes: !0 });
        for (const c of s) {
          if (!c.isDirectory()) continue;
          const d = C.join(o, c.name, "latest.snap");
          try {
            await R.stat(d), e.push(d);
          } catch {
          }
        }
      }
    } catch (n) {
      if (n?.code === "ENOENT")
        return e;
      this.logger.warn("Failed to list mirror files", n);
    }
    return e;
  }
  async readMirrorPayload(t) {
    try {
      const e = await da(t), n = JSON.parse(e);
      return typeof n.projectId != "string" || typeof n.chapterId != "string" ? null : {
        projectId: n.projectId,
        chapterId: n.chapterId,
        content: typeof n.content == "string" ? n.content : "",
        updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : null
      };
    } catch (e) {
      return this.logger.warn("Failed to read mirror payload", { filePath: t, error: e }), null;
    }
  }
  async cleanStaleMirrorDir(t) {
    try {
      const e = C.dirname(t), n = await R.readdir(e);
      await Promise.all(
        n.map((a) => R.unlink(C.join(e, a)).catch(() => {
        }))
      ), await R.rmdir(e).catch(() => {
      });
    } catch (e) {
      this.logger.warn("Failed to clean stale mirror directory", { mirrorFilePath: t, error: e });
    }
  }
}
const Gd = async (r, t, e) => {
  try {
    if (e) {
      const a = await ca.getChapter(e);
      await z.createSnapshot({
        projectId: r,
        chapterId: String(a.id ?? e),
        content: String(a.content ?? ""),
        description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      });
    } else
      await z.createSnapshot({
        projectId: r,
        content: JSON.stringify({ timestamp: Date.now() }),
        description: `프로젝트 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      });
    await z.deleteOldSnapshots(r, jn), t.info("Snapshot created", { projectId: r, chapterId: e });
  } catch (n) {
    t.error("Failed to create snapshot", n);
  }
}, Hd = async (r, t, e) => {
  const n = Array.from(
    new Set(Array.from(r.values()).map((a) => a.projectId))
  );
  for (const a of n)
    await t(a, async () => {
      const o = Array.from(r.entries()).filter(
        ([, s]) => s.projectId === a
      );
      for (const [s] of o)
        await e(s);
    });
}, Yd = async (r, t, e) => {
  if (r.length === 0)
    return { mirrored: 0, snapshots: 0 };
  let n = 0, a = 0;
  for (const o of r)
    try {
      await t(o.projectId, o.chapterId, o.content), n += 1;
    } catch (s) {
      e.error("Emergency mirror write failed", s);
    }
  for (const o of r)
    try {
      await z.createSnapshot({
        projectId: o.projectId,
        chapterId: o.chapterId,
        content: o.content,
        description: `긴급 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      }), a += 1;
    } catch (s) {
      e.error("Emergency snapshot failed", s);
    }
  return e.info("Emergency flush completed", { mirrored: n, snapshots: a }), { mirrored: n, snapshots: a };
}, zd = async (r) => {
  const {
    projectId: t,
    chapterId: e,
    content: n,
    maxLength: a,
    minIntervalMs: o,
    lastSnapshotAtByChapterKey: s,
    writeTimestampedMirror: c,
    logger: d
  } = r;
  if (n.length > a) return;
  const l = `${t}:${e}`, i = Date.now(), p = s.get(l) ?? 0;
  if (!(i - p < o)) {
    s.set(l, i);
    try {
      await z.createSnapshot({
        projectId: t,
        chapterId: e,
        content: n,
        description: `긴급 마이크로 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      }), await c(t, e, n);
    } catch (m) {
      d.warn("Failed to create emergency micro snapshot", { error: m, chapterId: e });
    }
  }
}, Xd = async (r) => {
  const { jobs: t, writeTimestampedMirror: e, logger: n } = r;
  for (; t.length > 0; ) {
    const a = t.shift();
    if (a)
      try {
        await z.createSnapshot({
          projectId: a.projectId,
          chapterId: a.chapterId,
          content: a.content,
          description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        }), await z.deleteOldSnapshots(a.projectId, io), await e(a.projectId, a.chapterId, a.content);
      } catch (o) {
        n.error("Failed to create snapshot", o);
      }
  }
}, B = D("AutoSaveManager");
class Pt extends ya {
  static instance;
  // Save state
  saveTimers = /* @__PURE__ */ new Map();
  intervalTimers = /* @__PURE__ */ new Map();
  configs = /* @__PURE__ */ new Map();
  pendingSaves = /* @__PURE__ */ new Map();
  lastSaveAt = /* @__PURE__ */ new Map();
  // Snapshot state
  snapshotTimers = /* @__PURE__ */ new Map();
  lastSnapshotAt = /* @__PURE__ */ new Map();
  lastSnapshotHash = /* @__PURE__ */ new Map();
  lastSnapshotLength = /* @__PURE__ */ new Map();
  lastEmergencySnapshotAt = /* @__PURE__ */ new Map();
  snapshotQueue = [];
  snapshotProcessing = !1;
  projectTaskQueue = /* @__PURE__ */ new Map();
  criticalFlushPromise = null;
  mirrorStore = new xd(B);
  constructor() {
    super(), this.on("error", (t) => {
      B.warn("Auto-save error event", t);
    }), this.startCleanupInterval();
  }
  static getInstance() {
    return Pt.instance || (Pt.instance = new Pt()), Pt.instance;
  }
  // ─── Public API ──────────────────────────────────────────────────────────
  /** Check if there are unsaved changes pending IPC or DB write. */
  hasPendingSaves() {
    return this.pendingSaves.size > 0;
  }
  /** Get count of pending saves - used for quit dialog. */
  getPendingSaveCount() {
    return this.pendingSaves.size;
  }
  /** Get list of pending chapter IDs for diagnostics. */
  getPendingChapterIds() {
    return Array.from(this.pendingSaves.keys());
  }
  async forgetChapter(t, e) {
    const n = this.saveTimers.get(e);
    n && (clearTimeout(n), this.saveTimers.delete(e)), this.pendingSaves.delete(e), this.lastSaveAt.delete(e);
    const a = `${t}:${e}`;
    this.lastSnapshotAt.delete(a), this.lastSnapshotHash.delete(a), this.lastSnapshotLength.delete(a), this.lastEmergencySnapshotAt.delete(a), this.snapshotQueue = this.snapshotQueue.filter(
      (o) => !(o.projectId === t && o.chapterId === e)
    );
    try {
      const o = this.mirrorStore.getMirrorBaseDir(t, e);
      await R.rm(o, { recursive: !0, force: !0 });
    } catch (o) {
      B.warn("Failed to purge chapter mirrors", { projectId: t, chapterId: e, error: o });
    }
  }
  setConfig(t, e) {
    this.configs.set(t, e), e.enabled ? (this.startAutoSave(t), this.startSnapshotSchedule(t)) : this.stopAutoSave(t);
  }
  getConfig(t) {
    return this.configs.get(t) || {
      enabled: !0,
      interval: On,
      debounceMs: Ja
    };
  }
  // ─── Trigger Save (entry point from IPC) ─────────────────────────────────
  async triggerSave(t, e, n) {
    const a = this.getConfig(n);
    if (!a.enabled)
      return;
    const o = await h.getClient().chapter.findUnique({
      where: { id: t },
      select: { projectId: !0, deletedAt: !0 }
    });
    if (!o || String(o.projectId) !== n || o.deletedAt) {
      B.info("Skipping auto-save for missing/deleted chapter", {
        chapterId: t,
        projectId: n
      });
      return;
    }
    this.pendingSaves.set(t, { chapterId: t, content: e, projectId: n }), this.lastSaveAt.set(t, Date.now()), await this.mirrorStore.writeLatestMirror(n, t, e), zd({
      projectId: n,
      chapterId: t,
      content: e,
      maxLength: eo,
      minIntervalMs: ro,
      lastSnapshotAtByChapterKey: this.lastEmergencySnapshotAt,
      writeTimestampedMirror: (d, l, i) => this.mirrorStore.writeTimestampedMirror(
        d,
        l,
        i
      ),
      logger: B
    });
    const s = this.saveTimers.get(t);
    s && clearTimeout(s);
    const c = setTimeout(async () => {
      await this.performSave(t);
    }, a.debounceMs);
    typeof c.unref == "function" && c.unref(), this.saveTimers.set(t, c);
  }
  // ─── Core Save Logic ─────────────────────────────────────────────────────
  async performSave(t) {
    const e = this.pendingSaves.get(t);
    if (e)
      try {
        await ca.updateChapter({
          id: e.chapterId,
          content: e.content
        }), this.pendingSaves.delete(t), this.saveTimers.delete(t), this.lastSaveAt.delete(t), this.emit("saved", { chapterId: t }), await this.mirrorStore.writeLatestMirror(e.projectId, e.chapterId, e.content), this.maybeEnqueueSnapshot(e.projectId, e.chapterId, e.content), B.info("Auto-save completed", { chapterId: t });
      } catch (n) {
        if ($o(n) && n.code === E.VALIDATION_FAILED) {
          B.warn("Auto-save blocked by validation; writing safety snapshot", {
            chapterId: t,
            error: n
          });
          try {
            await this.mirrorStore.writeLatestMirror(
              e.projectId,
              e.chapterId,
              e.content
            ), await this.mirrorStore.writeTimestampedMirror(
              e.projectId,
              e.chapterId,
              e.content
            ), await z.createSnapshot({
              projectId: e.projectId,
              chapterId: e.chapterId,
              content: e.content,
              description: `Safety snapshot (블로킹된 저장) ${(/* @__PURE__ */ new Date()).toLocaleString()}`
            });
          } catch (a) {
            B.error("Failed to write safety snapshot after validation block", a);
          }
          this.pendingSaves.delete(t), this.saveTimers.delete(t), this.lastSaveAt.delete(t), this.emit("save-blocked", { chapterId: t, error: n });
          return;
        }
        B.error("Auto-save failed", n), this.listenerCount("error") > 0 && this.emit("error", { chapterId: t, error: n });
      }
  }
  // ─── Snapshot Scheduling (Time Machine style) ────────────────────────────
  maybeEnqueueSnapshot(t, e, n) {
    const a = `${t}:${e}`, o = Date.now(), s = this.lastSnapshotAt.get(a) ?? 0;
    if (o - s < je || n.length < co) return;
    const c = this.hashContent(n);
    if (this.lastSnapshotHash.get(a) === c) return;
    const l = this.lastSnapshotLength.get(a) ?? 0;
    if (l > 0) {
      const i = Math.abs(n.length - l);
      if (i / l < lo && i < po) return;
    }
    this.lastSnapshotAt.set(a, o), this.lastSnapshotHash.set(a, c), this.lastSnapshotLength.set(a, n.length), this.snapshotQueue.push({ projectId: t, chapterId: e, content: n }), this.snapshotProcessing || (this.snapshotProcessing = !0, setImmediate(async () => {
      try {
        await Xd({
          jobs: this.snapshotQueue,
          writeTimestampedMirror: (i, p, m) => this.mirrorStore.writeTimestampedMirror(
            i,
            p,
            m
          ),
          logger: B
        });
      } finally {
        this.snapshotProcessing = !1;
      }
    }));
  }
  enqueueProjectTask(t, e) {
    const o = (this.projectTaskQueue.get(t) ?? Promise.resolve()).catch(() => {
    }).then(e).finally(() => {
      this.projectTaskQueue.get(t) === o && this.projectTaskQueue.delete(t);
    });
    return this.projectTaskQueue.set(t, o), o;
  }
  // ─── Mirror Recovery (startup / shutdown) ─────────────────────────────────
  async flushMirrorsToSnapshots(t) {
    return this.mirrorStore.flushMirrorsToSnapshots(t);
  }
  // ─── Auto Save Scheduling ────────────────────────────────────────────────
  startAutoSave(t) {
    const e = this.getConfig(t);
    if (!e.enabled) return;
    const n = this.intervalTimers.get(t);
    n && clearInterval(n);
    const a = setInterval(() => {
      this.enqueueProjectTask(t, async () => {
        await Array.from(this.pendingSaves.entries()).filter(
          ([, s]) => s.projectId === t
        ).reduce(
          (s, [c]) => s.then(async () => {
            await this.performSave(c);
          }),
          Promise.resolve()
        );
      });
    }, e.interval);
    typeof a.unref == "function" && a.unref(), this.intervalTimers.set(t, a), B.info("Auto-save started", { projectId: t, interval: e.interval });
  }
  stopAutoSave(t) {
    const e = this.intervalTimers.get(t);
    e && (clearInterval(e), this.intervalTimers.delete(t), B.info("Auto-save stopped", { projectId: t }));
    const n = this.snapshotTimers.get(t);
    n && (clearInterval(n), this.snapshotTimers.delete(t), B.info("Snapshot schedule stopped", { projectId: t }));
  }
  startSnapshotSchedule(t) {
    const e = this.snapshotTimers.get(t);
    e && clearInterval(e), this.enqueueProjectTask(t, async () => {
      await this.createSnapshot(t);
    });
    const n = setInterval(() => {
      this.enqueueProjectTask(t, async () => {
        await this.createSnapshot(t);
      });
    }, je);
    typeof n.unref == "function" && n.unref(), this.snapshotTimers.set(t, n), B.info("Snapshot schedule started", {
      projectId: t,
      interval: je
    });
  }
  async createSnapshot(t, e) {
    await Gd(t, B, e);
  }
  // ─── Flush (quit / critical) ──────────────────────────────────────────────
  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    await Hd(
      this.pendingSaves,
      (t, e) => this.enqueueProjectTask(t, e),
      (t) => this.performSave(t)
    );
  }
  /**
   * Emergency flush: write mirrors + snapshots for all pending content.
   * Called when time is critical (app crashing, OS killing process).
   * Returns counts for diagnostics.
   */
  async flushCritical() {
    if (this.criticalFlushPromise)
      return this.criticalFlushPromise;
    this.criticalFlushPromise = Yd(
      Array.from(this.pendingSaves.values()),
      (t, e, n) => this.mirrorStore.writeLatestMirror(t, e, n),
      B
    );
    try {
      return await this.criticalFlushPromise;
    } finally {
      this.criticalFlushPromise = null;
    }
  }
  // ─── Utilities ────────────────────────────────────────────────────────────
  hashContent(t) {
    let e = 0;
    for (let n = 0; n < t.length; n += 1)
      e = e * 31 + t.charCodeAt(n) >>> 0;
    return e;
  }
  startCleanupInterval() {
    const t = setInterval(() => {
      this.cleanupOldEntries();
    }, to);
    typeof t.unref == "function" && t.unref();
  }
  cleanupOldEntries() {
    const t = Date.now();
    for (const [e, n] of Array.from(this.lastSaveAt.entries()))
      if (t - n > Za) {
        const a = this.saveTimers.get(e);
        a && clearTimeout(a), this.saveTimers.delete(e), this.pendingSaves.delete(e), this.lastSaveAt.delete(e);
      }
  }
  clearProject(t) {
    this.stopAutoSave(t), this.configs.delete(t);
  }
}
const Q = Pt.getInstance(), Me = "#f4f4f5", se = () => {
  const r = [
    ht(process.resourcesPath, "icon.png"),
    ht(process.resourcesPath, "build", "icons", "icon.png")
  ], t = [
    ht(T.getAppPath(), "build", "icons", "icon.png"),
    ht(T.getAppPath(), "assets", "public", "luie.png")
  ], e = T.isPackaged ? r : t;
  for (const n of e)
    if (Ta(n))
      return n;
}, ie = () => process.platform !== "darwin" ? {} : {
  titleBarStyle: "hiddenInset",
  trafficLightPosition: { x: Ao, y: yo }
}, ue = (r) => process.platform !== "darwin" ? !1 : r === "visible", Kd = (r, t) => {
  const e = ue(t);
  if (process.platform === "darwin") {
    if (e) {
      r.isSimpleFullScreen() && r.setSimpleFullScreen(!1), r.isFullScreen() && r.setFullScreen(!1), r.setMenuBarVisibility(!0);
      return;
    }
    r.setMenuBarVisibility(!1), r.isSimpleFullScreen() || r.setSimpleFullScreen(!0);
    return;
  }
  r.setAutoHideMenuBar(!0), r.setMenuBarVisibility(!1);
}, Vd = (r) => ({
  preload: r,
  contextIsolation: !0,
  nodeIntegration: !1,
  sandbox: !0
}), ce = (r) => r ? { icon: r } : {}, ha = () => {
  const r = T.isPackaged, t = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", e = !r && process.env.NODE_ENV !== "production";
  return {
    isPackaged: r,
    devServerUrl: t,
    useDevServer: e
  };
}, qd = (r, t) => {
  const e = new URL(r.endsWith("/") ? r : `${r}/`);
  return t.search && (e.search = t.search.startsWith("?") ? t.search.slice(1) : t.search), t.hash && (e.hash = t.hash.startsWith("#") ? t.hash : `#${t.hash}`), e.toString();
}, Jd = async (r) => {
  const t = ha(), e = r.route ?? {};
  if (t.useDevServer) {
    const a = qd(t.devServerUrl, e);
    return r.logger.info(`Loading ${r.label} (dev)`, { url: a }), await r.window.loadURL(a), t;
  }
  const n = ht(r.baseDir, "../renderer/index.html");
  return r.logger.info(`Loading ${r.label} (prod)`, { path: n }), await r.window.loadFile(n, {
    hash: e.hash?.startsWith("#") ? e.hash.slice(1) : e.hash,
    search: e.search
  }), t;
}, J = D("WindowManager");
class Qd {
  mainWindow = null;
  startupWizardWindow = null;
  exportWindow = null;
  worldGraphWindow = null;
  getMenuBarMode() {
    return _.getMenuBarMode();
  }
  applyMenuBarMode(t) {
    Kd(t, this.getMenuBarMode());
  }
  createBrowserWindow(t) {
    return new Rt({
      ...t,
      webPreferences: t.webPreferences ?? Vd(ht(Ne, "../preload/index.cjs"))
    });
  }
  attachWindowClosedLogger(t, e, n) {
    t.on("closed", () => {
      e(), J.info(`${n} closed`);
    });
  }
  async loadSecondaryWindowRoute(t) {
    const e = await Jd({
      baseDir: Ne,
      label: t.label,
      logger: J,
      route: t.route,
      window: t.window
    });
    t.openDevToolsInDev && e.useDevServer && t.window.webContents.openDevTools({ mode: "detach" });
  }
  createMainWindow(t = {}) {
    const e = t.deferShow === !0;
    if (this.mainWindow)
      return this.mainWindow;
    const n = Oa({
      defaultWidth: fo,
      defaultHeight: go
    }), a = ha(), o = se();
    if (this.mainWindow = this.createBrowserWindow({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      minWidth: Eo,
      minHeight: mo,
      title: Lr,
      show: !1,
      backgroundColor: Me,
      ...ce(o),
      ...ie(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !ue(this.getMenuBarMode()) } : {}
    }), this.applyMenuBarMode(this.mainWindow), n.manage(this.mainWindow), a.useDevServer)
      J.info("Loading development server", {
        url: a.devServerUrl,
        isPackaged: a.isPackaged
      }), this.mainWindow.loadURL(a.devServerUrl).catch((s) => {
        J.error("Failed to load development renderer URL", {
          url: a.devServerUrl,
          error: s
        });
      }), this.mainWindow.webContents.openDevTools({ mode: "detach" });
    else {
      const s = ht(Ne, "../renderer/index.html");
      J.info("Loading production renderer", {
        path: s,
        isPackaged: a.isPackaged
      }), this.mainWindow.loadFile(s).catch((c) => {
        J.error("Failed to load production renderer file", {
          path: s,
          error: c
        });
      });
    }
    return this.mainWindow.once("ready-to-show", () => {
      this.mainWindow && !this.mainWindow.isDestroyed() && (J.info("Main window ready to show", { deferShow: e }), e || this.showMainWindow());
    }), this.attachWindowClosedLogger(
      this.mainWindow,
      () => {
        this.mainWindow = null;
      },
      "Main window"
    ), J.info("Main window created", {
      isPackaged: a.isPackaged,
      useDevServer: a.useDevServer
    }), this.mainWindow;
  }
  createStartupWizardWindow() {
    return this.startupWizardWindow && !this.startupWizardWindow.isDestroyed() ? (this.startupWizardWindow.focus(), this.startupWizardWindow) : (this.startupWizardWindow = this.createBrowserWindow({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: !0,
      title: `${Lr} Setup`,
      backgroundColor: "#0b1020",
      ...ce(se()),
      ...ie(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !0 } : {}
    }), this.applyMenuBarMode(this.startupWizardWindow), this.loadSecondaryWindowRoute({
      label: "startup wizard",
      route: { hash: "startup-wizard" },
      window: this.startupWizardWindow
    }).catch((t) => {
      J.error("Failed to load startup wizard", { error: t });
    }), this.attachWindowClosedLogger(
      this.startupWizardWindow,
      () => {
        this.startupWizardWindow = null;
      },
      "Startup wizard window"
    ), this.startupWizardWindow);
  }
  getMainWindow() {
    return this.mainWindow;
  }
  isMainWindowWebContentsId(t) {
    return !this.mainWindow || this.mainWindow.isDestroyed() ? !1 : this.mainWindow.webContents.id === t;
  }
  getStartupWizardWindow() {
    return this.startupWizardWindow;
  }
  closeStartupWizardWindow() {
    this.startupWizardWindow && !this.startupWizardWindow.isDestroyed() && this.startupWizardWindow.close(), this.startupWizardWindow = null;
  }
  closeMainWindow() {
    this.mainWindow && this.mainWindow.close();
  }
  showMainWindow() {
    !this.mainWindow || this.mainWindow.isDestroyed() || (this.mainWindow.isVisible() || this.mainWindow.show(), this.mainWindow.focus());
  }
  createExportWindow(t) {
    if (this.exportWindow)
      return this.exportWindow.focus(), this.exportWindow;
    this.exportWindow = this.createBrowserWindow({
      width: 1200,
      height: 900,
      minWidth: 1e3,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: Me,
      ...ce(se()),
      ...ie(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !ue(this.getMenuBarMode()) } : {}
    }), this.applyMenuBarMode(this.exportWindow);
    const e = { hash: "export", search: `?chapterId=${t}` };
    return this.loadSecondaryWindowRoute({
      label: "export window",
      openDevToolsInDev: !0,
      route: e,
      window: this.exportWindow
    }).catch((n) => {
      J.error("Failed to load export window", { route: e, error: n });
    }), this.attachWindowClosedLogger(
      this.exportWindow,
      () => {
        this.exportWindow = null;
      },
      "Export window"
    ), this.exportWindow;
  }
  createWorldGraphWindow() {
    return this.worldGraphWindow ? (this.worldGraphWindow.focus(), this.worldGraphWindow) : (this.worldGraphWindow = this.createBrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1e3,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: Me,
      ...ce(se()),
      ...ie(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !ue(this.getMenuBarMode()) } : {}
    }), this.applyMenuBarMode(this.worldGraphWindow), this.loadSecondaryWindowRoute({
      label: "world graph window",
      openDevToolsInDev: !0,
      route: { hash: "world-graph" },
      window: this.worldGraphWindow
    }).catch((t) => {
      J.error("Failed to load world graph window", { error: t });
    }), this.attachWindowClosedLogger(
      this.worldGraphWindow,
      () => {
        this.worldGraphWindow = null;
      },
      "World graph window"
    ), this.worldGraphWindow);
  }
  applyMenuBarModeToAllWindows() {
    const t = Rt.getAllWindows();
    for (const e of t)
      e.isDestroyed() || this.applyMenuBarMode(e);
  }
}
const G = new Qd(), Ep = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: G
}, Symbol.toStringTag, { value: "Module" })), Zd = () => {
  const r = {
    label: "File",
    submenu: process.platform === "darwin" ? [{ role: "close" }] : [{ role: "close" }, { role: "quit" }]
  };
  return process.platform === "darwin" ? [
    { role: "appMenu" },
    r,
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ] : [r, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }, { role: "help" }];
}, tl = (r) => {
  if (process.platform !== "darwin" || r === "hidden") {
    De.setApplicationMenu(null);
    return;
  }
  De.setApplicationMenu(De.buildFromTemplate(Zd()));
}, Ht = D("BootstrapLifecycle");
let mt = { isReady: !1 }, xt = null;
const el = (r) => r instanceof Error && r.message ? r.message : "Failed to initialize database", rl = () => {
  for (const r of Rt.getAllWindows())
    if (!r.isDestroyed())
      try {
        r.webContents.send(bt.APP_BOOTSTRAP_STATUS_CHANGED, mt);
      } catch (t) {
        Ht.warn("Failed to broadcast bootstrap status", t);
      }
}, ke = (r) => {
  mt = r, rl();
}, mp = () => mt, fa = async () => {
  if (mt.isReady)
    return mt;
  if (xt)
    return xt;
  ke({ isReady: !1 });
  const r = wn({
    scope: "bootstrap",
    event: "bootstrap.ensure-ready"
  });
  return xt = h.initialize().then(() => (ke({ isReady: !0 }), r.complete(Ht, {
    isReady: !0
  }), Ht.info("Bootstrap completed"), mt)).catch((t) => {
    const e = el(t);
    return ke({ isReady: !1, error: e }), r.fail(Ht, t, {
      isReady: !1
    }), Ht.error("Bootstrap failed", t), mt;
  }).finally(() => {
    xt = null;
  }), xt;
}, nl = D("StartupReadinessService"), We = "startup:wizard-completed", ga = () => (/* @__PURE__ */ new Date()).toISOString(), O = (r, t, e, n = !0) => ({
  key: r,
  ok: t,
  blocking: n,
  detail: e,
  checkedAt: ga()
});
class al {
  events = new ja();
  async getReadiness() {
    const t = await this.runChecks(), e = t.filter((o) => o.blocking && !o.ok).map((o) => o.key), n = _.getStartupSettings().completedAt;
    return {
      mustRunWizard: !n || e.length > 0,
      checks: t,
      reasons: e,
      completedAt: n
    };
  }
  async completeWizard() {
    const t = await this.getReadiness();
    if (t.reasons.length > 0)
      return t;
    _.setStartupCompletedAt(ga());
    const e = await this.getReadiness();
    return this.events.emit(We, e), e;
  }
  onWizardCompleted(t) {
    return this.events.on(We, t), () => {
      this.events.off(We, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = tt.isEncryptionAvailable();
      return O(
        "osPermission",
        t,
        t ? "safeStorage available" : "safeStorage encryption is unavailable on this OS session"
      );
    } catch (t) {
      return O("osPermission", !1, this.toErrorMessage(t));
    }
  }
  async checkDataDirRW() {
    const t = T.getPath("userData"), e = k.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await Ir(t, { recursive: !0 }), await Pr(e, "ok", { encoding: "utf8" }), O("dataDirRW", !0, t);
    } catch (n) {
      return O(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(n)}`
      );
    } finally {
      await Cr(e).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = T.getPath("documents"), e = k.join(t, bn), n = k.join(e, ".startup-probe");
    try {
      return await Ir(e, { recursive: !0 }), await yn(e, Ye.R_OK | Ye.W_OK), await Pr(n, "ok", { encoding: "utf8" }), O("defaultLuiePath", !0, e);
    } catch (a) {
      return O(
        "defaultLuiePath",
        !1,
        `${e}: ${this.toErrorMessage(a)}`
      );
    } finally {
      await Cr(n).catch(() => {
      });
    }
  }
  async checkSqliteConnect() {
    try {
      return await h.initialize(), h.getClient(), O("sqliteConnect", !0, "SQLite connection ready");
    } catch (t) {
      return O("sqliteConnect", !1, this.toErrorMessage(t));
    }
  }
  async checkSqliteWal() {
    try {
      return await h.initialize(), O("sqliteWal", !0, "WAL mode enforced during DB initialization");
    } catch (t) {
      return O("sqliteWal", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseRuntimeConfig() {
    try {
      const t = it(), e = qn();
      return t ? O(
        "supabaseRuntimeConfig",
        !0,
        e ? `resolved from ${e}` : "resolved"
      ) : O(
        "supabaseRuntimeConfig",
        !1,
        "Runtime Supabase configuration is not completed"
      );
    } catch (t) {
      return O("supabaseRuntimeConfig", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseSession() {
    try {
      const t = _.getSyncSettings();
      if (!t.connected || !t.userId)
        return O(
          "supabaseSession",
          !1,
          "Sync login is not connected yet (non-blocking)",
          !1
        );
      const e = V.getAccessToken(t), n = V.getRefreshToken(t);
      if (!(!!e.token || !!n.token))
        return O(
          "supabaseSession",
          !1,
          e.errorCode ?? n.errorCode ?? "No usable JWT token",
          !1
        );
      if (!e.token)
        return O(
          "supabaseSession",
          !1,
          "Access token is unavailable. Reconnect sync login.",
          !1
        );
      const o = it();
      if (!o)
        return O(
          "supabaseSession",
          !1,
          "Runtime Supabase configuration is not completed",
          !1
        );
      const s = await fetch(`${o.url}/functions/v1/luieEnv`, {
        method: "GET",
        headers: {
          apikey: o.anonKey,
          Authorization: `Bearer ${e.token}`
        }
      });
      if (!s.ok)
        return O(
          "supabaseSession",
          !1,
          `Edge auth health check failed (${s.status})`,
          !1
        );
      let c = null;
      try {
        c = await s.json();
      } catch {
        c = null;
      }
      return c?.ok ? O(
        "supabaseSession",
        !0,
        c.userId ?? t.email ?? t.userId,
        !1
      ) : O(
        "supabaseSession",
        !1,
        "Edge auth health response is invalid",
        !1
      );
    } catch (t) {
      return nl.warn("Startup session check failed", { error: t }), O("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const Be = new al(), gn = 1500, ol = 8e3, sl = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), il = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), cl = (r) => r ? process.env.LUIE_DEV_CSP === "1" ? il() : null : sl(), dl = (r) => r.startsWith("file://"), ll = async (r, t, e) => {
  r.error("Renderer process crashed", {
    killed: e,
    webContentsId: t.id
  });
  try {
    await Q.flushCritical(), r.info("Emergency save completed after crash");
  } catch (a) {
    r.error("Failed to save during crash recovery", a);
  }
  const n = G.getMainWindow();
  n && !n.isDestroyed() && ((await He.showMessageBox(n, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (G.closeMainWindow(), setTimeout(() => {
    G.createMainWindow();
  }, 500)) : T.quit());
}, pl = async (r) => {
  const t = Date.now(), e = await fa();
  if (!e.isReady) {
    r.error("App bootstrap did not complete", e);
    return;
  }
  try {
    await Q.flushMirrorsToSnapshots("startup-recovery"), z.pruneSnapshotsAllProjects(), z.cleanupOrphanArtifacts("startup");
  } catch (n) {
    r.warn("Snapshot recovery/pruning skipped", n);
  }
  try {
    await b.reconcileProjectPathDuplicates();
  } catch (n) {
    r.warn("Project path duplicate reconciliation skipped", n);
  }
  try {
    const { entityRelationService: n } = await import("./entityRelationService-zpRBRM_S.js");
    await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !0 }), await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !1 });
  } catch (n) {
    r.warn("Entity relation orphan cleanup skipped", n);
  }
  r.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - t
  });
}, ul = (r, t = {}) => {
  const e = t.startupStartedAtMs ?? Date.now();
  T.whenReady().then(async () => {
    r.info("App is ready", {
      startupElapsedMs: Date.now() - e
    });
    const n = vo(), a = cl(n);
    let o = !1, s = !1, c = !1, d = null;
    const l = (A) => {
      if (!o && (o = !0, G.showMainWindow(), r.info("Startup checkpoint: renderer ready", {
        reason: A,
        startupElapsedMs: Date.now() - e
      }), r.info("Startup checkpoint: main window shown", {
        reason: A,
        startupElapsedMs: Date.now() - e
      }), !!t.onFirstRendererReady))
        try {
          t.onFirstRendererReady();
        } catch (S) {
          r.warn("Startup hook failed: onFirstRendererReady", S);
        }
    }, i = (A) => {
      s || (s = !0, r.info("Deferred startup maintenance scheduled", {
        reason: A,
        delayMs: gn
      }), setTimeout(() => {
        pl(r);
      }, gn));
    }, p = (A) => {
      if (c) return;
      c = !0, r.info("Starting main window flow", {
        reason: A,
        startupElapsedMs: Date.now() - e
      }), G.createMainWindow({ deferShow: !0 }), r.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - e
      });
      const S = Date.now();
      fa().then((I) => {
        r.info("Startup checkpoint: bootstrap ready", {
          isReady: I.isReady,
          bootstrapElapsedMs: Date.now() - S,
          startupElapsedMs: Date.now() - e
        }), I.isReady || r.error("App bootstrap did not complete", I);
      }).catch((I) => {
        r.error("App bootstrap did not complete", I);
      }), d && clearTimeout(d), d = setTimeout(() => {
        o || l("fallback-timeout"), i("fallback-timeout");
      }, ol);
    };
    n && _r.defaultSession.webRequest.onBeforeSendHeaders((A, S) => {
      S({
        requestHeaders: {
          ...A.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), _r.defaultSession.webRequest.onHeadersReceived((A, S) => {
      const I = {
        ...A.responseHeaders
      };
      n && (I["Access-Control-Allow-Origin"] = ["*"], I["Access-Control-Allow-Headers"] = ["*"], I["Access-Control-Allow-Methods"] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]), a && !dl(A.url) && (I["Content-Security-Policy"] = [a]), S({ responseHeaders: I });
    }), T.on("web-contents-created", (A, S) => {
      S.on(
        "did-fail-load",
        (I, j, St, Ut, y) => {
          r.error("Renderer failed to load", {
            errorCode: j,
            errorDescription: St,
            validatedURL: Ut,
            isMainFrame: y,
            startupElapsedMs: Date.now() - e
          });
        }
      ), S.on("did-finish-load", () => {
        const I = Date.now() - e;
        r.info("Renderer finished load", {
          url: S.getURL(),
          startupElapsedMs: I
        }), S.getType() === "window" && G.isMainWindowWebContentsId(S.id) && (l("did-finish-load"), i("did-finish-load"));
      }), S.on("console-message", (I) => {
        const { level: j, message: St, lineNumber: Ut, sourceId: y } = I;
        (j === "error" ? 3 : j === "warning" ? 2 : j === "info" ? 1 : 0) < 2 || r.warn("Renderer console message", {
          level: j,
          message: St,
          line: Ut,
          sourceId: y
        });
      }), S.on("render-process-gone", (I, j) => {
        ll(r, S, j.reason === "killed");
      });
    });
    const m = Date.now(), { registerIPCHandlers: w } = await import("./index-6tHHrYSS.js");
    w(), r.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - m,
      startupElapsedMs: Date.now() - e
    }), tl(_.getMenuBarMode());
    const g = await Be.getReadiness();
    r.info("Startup readiness evaluated", {
      mustRunWizard: g.mustRunWizard,
      reasons: g.reasons,
      completedAt: g.completedAt
    }), g.mustRunWizard ? (G.createStartupWizardWindow(), r.info("Startup wizard requested before main window", {
      reasons: g.reasons
    })) : p("readiness-pass"), Be.onWizardCompleted((A) => {
      r.info("Startup wizard completion received", {
        mustRunWizard: A.mustRunWizard,
        reasons: A.reasons
      }), !A.mustRunWizard && (G.closeStartupWizardWindow(), p("wizard-complete"));
    }), T.on("activate", () => {
      Rt.getAllWindows().length === 0 && Be.getReadiness().then((A) => {
        if (A.mustRunWizard) {
          G.createStartupWizardWindow();
          return;
        }
        p("activate");
      });
    });
  });
}, hl = "crash-reports", En = 100;
let mn = !1;
const $e = (r) => r.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), ur = (r, t = 0) => {
  if (r == null) return r;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof r == "string" || typeof r == "number" || typeof r == "boolean")
    return typeof r == "string" ? $e(r) : r;
  if (typeof r == "bigint" || typeof r == "symbol") return r.toString();
  if (typeof r == "function") return "[Function]";
  if (r instanceof Error)
    return {
      name: r.name,
      message: $e(r.message),
      stack: r.stack ? $e(r.stack) : void 0
    };
  if (Array.isArray(r))
    return r.slice(0, 50).map((e) => ur(e, t + 1));
  if (typeof r == "object") {
    const n = Object.entries(r).slice(0, 100), a = {};
    for (const [o, s] of n)
      a[o] = ur(s, t + 1);
    return a;
  }
  return String(r);
}, fl = () => k.join(T.getPath("userData"), hl), gl = async (r, t) => {
  const e = await Ct.readdir(r, { withFileTypes: !0 }), n = await Promise.all(
    e.filter((o) => o.isFile() && o.name.endsWith(".json")).map(async (o) => {
      const s = k.join(r, o.name), c = await Ct.stat(s);
      return { fullPath: s, mtimeMs: c.mtimeMs };
    })
  );
  if (n.length <= En) return;
  n.sort((o, s) => s.mtimeMs - o.mtimeMs);
  const a = n.slice(En);
  await Promise.all(
    a.map(async (o) => {
      try {
        await Ct.rm(o.fullPath, { force: !0 });
      } catch (s) {
        t.warn("Failed to remove stale crash report", { error: s, path: o.fullPath });
      }
    })
  );
}, El = async (r, t, e) => {
  const n = fl();
  await Ct.mkdir(n, { recursive: !0 });
  const a = (/* @__PURE__ */ new Date()).toISOString(), o = Y(), s = `${a.replace(/[:.]/g, "-")}-${t}-${o}.json`, c = k.join(n, s), d = `${c}.tmp`, l = {
    id: o,
    timestamp: a,
    type: t,
    appVersion: T.getVersion(),
    isPackaged: T.isPackaged,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    processType: process.type,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    payload: ur(e)
  };
  await Ct.writeFile(d, JSON.stringify(l, null, 2), "utf-8"), await Ct.rename(d, c), await gl(n, r);
}, ml = (r, t) => {
  const e = t ?? {}, n = r ?? {};
  return {
    webContentsId: typeof n.id == "number" ? n.id : void 0,
    reason: e.reason,
    exitCode: e.exitCode
  };
}, Al = (r) => {
  const t = r ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, yl = (r) => {
  if (mn) return;
  mn = !0;
  const t = (e, n) => {
    El(r, e, n).catch((a) => {
      r.warn("Failed to persist crash report", { error: a, kind: e });
    });
  };
  process.on("uncaughtExceptionMonitor", (e, n) => {
    t("uncaught-exception", {
      origin: n,
      error: e
    });
  }), process.on("unhandledRejection", (e) => {
    t("unhandled-rejection", {
      reason: e
    });
  }), T.on("render-process-gone", (e, n, a) => {
    t("render-process-gone", ml(n, a));
  }), T.on("child-process-gone", (e, n) => {
    t("child-process-gone", Al(n));
  });
}, Yt = D("DeepLink"), Sl = "luie://auth/callback", Tl = "luie://auth/return", wl = "luie://auth/", de = () => {
  const r = G.getMainWindow();
  if (r) {
    r.isMinimized() && r.restore(), r.focus();
    return;
  }
  const t = G.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, xe = (r) => {
  const t = Rt.getAllWindows();
  for (const e of t)
    if (!e.isDestroyed())
      try {
        e.webContents.send(bt.SYNC_AUTH_RESULT, r);
      } catch (n) {
        Yt.warn("Failed to broadcast OAuth result", { error: n });
      }
}, _l = (r) => {
  const t = r instanceof Error ? r.message : String(r);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, Il = (r) => r === "NO_PENDING" || r === "EXPIRED" || r === "STATE_MISMATCH", An = (r) => r === "NO_PENDING" ? "NO_PENDING" : r === "EXPIRED" ? "EXPIRED" : r === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", hr = (r) => {
  for (const t of r)
    if (typeof t == "string" && t.startsWith(wl))
      return t;
  return null;
}, fr = async (r) => {
  if (r.startsWith(Tl))
    return de(), Yt.info("OAuth return deep link handled", { url: r }), !0;
  if (!r.startsWith(Sl))
    return !1;
  try {
    return await qt.handleOAuthCallback(r), de(), xe({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Yt.info("OAuth callback processed", { url: r }), !0;
  } catch (t) {
    const e = t instanceof Error ? t.message : String(t), n = _l(t), a = qt.getStatus();
    return a.connected && Il(n) ? (de(), xe({
      status: "stale",
      reason: An(n),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Yt.warn("OAuth callback arrived after connection was already established", {
      url: r,
      reason: n,
      error: t
    }), !0) : (de(), xe({
      status: "error",
      reason: An(n),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Yt.error(a.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
      url: r,
      reason: n,
      error: t
    }), !1);
  }
}, at = (r, t, e) => {
  if (!(!r || r.isDestroyed()))
    try {
      r.webContents.send(bt.APP_QUIT_PHASE, { phase: t, message: e });
    } catch {
    }
}, Ge = async (r, t) => r && !r.isDestroyed() ? He.showMessageBox(r, t) : He.showMessageBox(t), Pl = (r) => {
  let t = !1;
  T.on("window-all-closed", () => {
    process.platform !== "darwin" && T.quit();
  }), T.on("before-quit", (e) => {
    t || (t = !0, e.preventDefault(), (async () => {
      r.info("App is quitting");
      const n = G.getMainWindow();
      at(n, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let a = !1, o = !1, s = !1;
      if (n && !n.isDestroyed() && n.webContents)
        try {
          a = await new Promise((p) => {
            const m = setTimeout(
              () => p(!1),
              no
            );
            Aa.once(bt.APP_FLUSH_COMPLETE, (w, g) => {
              o = !!g?.hadQueuedAutoSaves, s = !!g?.rendererDirty, clearTimeout(m), p(!0);
            }), n.webContents.send(bt.APP_BEFORE_QUIT);
          }), r.info("Renderer flush phase completed", {
            rendererFlushed: a,
            rendererHadQueued: o,
            rendererDirty: s
          });
        } catch (p) {
          r.warn("Renderer flush request failed", p);
        }
      at(n, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored: p } = await Q.flushCritical();
        r.info("Pre-dialog mirror flush completed", { mirrored: p });
      } catch (p) {
        r.error("Pre-dialog mirror flush failed", p);
      }
      const c = Q.getPendingSaveCount();
      if (c > 0 || o || s || !a)
        try {
          const p = c > 0 ? `${c}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", m = await Ge(n, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message: p,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: !0
          });
          if (m.response === 2) {
            r.info("Quit cancelled by user"), t = !1, at(n, "aborted", "종료가 취소되었습니다.");
            return;
          }
          if (m.response === 0) {
            r.info("User chose: save and quit");
            try {
              await Promise.race([
                Q.flushAll(),
                new Promise((w) => setTimeout(w, ao))
              ]), await Q.flushMirrorsToSnapshots("session-end");
            } catch (w) {
              r.error("Save during quit failed", w);
            }
          } else {
            r.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await Q.flushMirrorsToSnapshots("session-end-no-save");
            } catch (w) {
              r.warn("Mirror-to-snapshot conversion failed", w);
            }
          }
        } catch (p) {
          r.error("Quit dialog failed; exiting with mirrors on disk", p);
        }
      else
        try {
          await Q.flushMirrorsToSnapshots("session-end");
        } catch (p) {
          r.warn("Session-end mirror flush failed", p);
        }
      at(n, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let l = "continue";
      if ((await b.flushPendingExports(oo)).timedOut) {
        const p = await Ge(n, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: !0
        });
        (p.response === 1 || p.response === 0 && (await b.flushPendingExports(so)).timedOut && (await Ge(n, {
          type: "warning",
          title: "저장 지연 지속",
          message: "저장이 아직 완료되지 않았습니다.",
          detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
          buttons: ["종료 취소", "저장 생략 후 종료"],
          defaultId: 0,
          cancelId: 0,
          noLink: !0
        })).response === 0) && (l = "cancel");
      }
      if (l === "cancel") {
        r.info("Quit cancelled by user during export flush"), t = !1, at(n, "aborted", "종료가 취소되었습니다.");
        return;
      }
      at(n, "finalize", "마무리 정리 중입니다...");
      try {
        await z.pruneSnapshotsAllProjects();
      } catch (p) {
        r.warn("Snapshot pruning failed during quit", p);
      }
      try {
        await h.disconnect();
      } catch (p) {
        r.warn("DB disconnect failed during quit", p);
      }
      at(n, "completed", "안전하게 종료합니다."), T.exit(0);
    })().catch((n) => {
      r.error("Quit guard failed", n), t = !1;
      const a = G.getMainWindow();
      at(a, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
    }));
  }), process.on("SIGINT", () => {
    r.info("Received SIGINT"), T.quit();
  }), process.on("SIGTERM", () => {
    r.info("Received SIGTERM"), T.quit();
  }), process.on("uncaughtException", (e) => {
    r.error("Uncaught exception", e);
  }), process.on("unhandledRejection", (e) => {
    r.error("Unhandled rejection", e);
  });
}, Cl = (r) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : T.requestSingleInstanceLock())) {
    const n = hr(process.argv);
    return r.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!n,
      argv: process.argv
    }), T.quit(), !1;
  }
  return T.on("second-instance", (n, a) => {
    const o = hr(a);
    r.info("Second instance event received", {
      hasCallbackUrl: !!o
    }), o && fr(o);
    const s = G.getMainWindow();
    s && (s.isMinimized() && s.restore(), s.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-B9Gu_Tvs.js").then((r) => r.c);
Dn({
  logToFile: !0,
  logFilePath: k.join(T.getPath("userData"), Ro, Do),
  minLevel: mr.INFO
});
const st = D("Main"), he = process.defaultApp === !0, gr = Date.now();
st.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: T.isPackaged,
  defaultApp: he,
  startupStartedAtMs: gr
});
const Rl = () => {
  const r = "luie";
  let t = !1;
  const e = T.getAppPath();
  if (he ? e && (t = T.setAsDefaultProtocolClient(r, process.execPath, [e])) : t = T.setAsDefaultProtocolClient(r), !t) {
    const a = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    _.getSyncSettings().connected || _.setSyncSettings({ lastError: a }), st.warn("Failed to register custom protocol for OAuth callback", {
      protocol: r,
      defaultApp: he,
      reason: a
    });
    return;
  }
  _.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && _.setSyncSettings({ lastError: void 0 }), st.info("Custom protocol registered", {
    protocol: r,
    defaultApp: he,
    appEntry: e
  });
};
if (!Cl(st))
  T.quit();
else {
  yl(st), Bo(), T.disableHardwareAcceleration(), process.platform === "darwin" && T.on("open-url", (t, e) => {
    t.preventDefault(), fr(e);
  }), Rl();
  const r = hr(process.argv);
  r && fr(r), ul(st, {
    startupStartedAtMs: gr,
    onFirstRendererReady: () => {
      const t = Date.now();
      qt.initialize(), st.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - gr
      });
    }
  }), Pl(st);
}
export {
  ip as $,
  Va as A,
  lp as B,
  jt as C,
  op as D,
  E,
  sp as F,
  Sr as G,
  Rs as H,
  bt as I,
  Cs as J,
  x as K,
  X as L,
  Pe as M,
  Fn as N,
  vn as O,
  tp as P,
  Jt as Q,
  Te as R,
  f as S,
  we as T,
  Zl as U,
  _e as V,
  ep as W,
  yr as X,
  Ie as Y,
  Ps as Z,
  Ls as _,
  Se as a,
  np as a0,
  ap as a1,
  tl as a2,
  Be as a3,
  qt as a4,
  G as a5,
  fa as a6,
  mp as a7,
  ca as a8,
  nr as a9,
  ar as aa,
  Q as ab,
  z as ac,
  jr as ad,
  rp as ae,
  dp as af,
  hp as ag,
  fp as ah,
  Ep as ai,
  gp as b,
  D as c,
  h as d,
  K as e,
  Ft as f,
  up as g,
  Ar as h,
  pd as i,
  va as j,
  ft as k,
  $o as l,
  cp as m,
  Qt as n,
  Kt as o,
  b as p,
  me as q,
  Z as r,
  Ds as s,
  Ss as t,
  _s as u,
  pp as v,
  $a as w,
  Os as x,
  Is as y,
  Ns as z
};

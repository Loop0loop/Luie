import { app as S, nativeTheme as la, shell as pa, safeStorage as rt, BrowserWindow as tt, Menu as Pe, session as yr, dialog as We, ipcMain as ua } from "electron";
import * as dt from "node:path";
import W from "node:path";
import { z as u } from "zod";
import { EventEmitter as ha } from "events";
import * as fa from "fs";
import { promises as R, existsSync as ga } from "fs";
import * as Y from "fs/promises";
import * as at from "path";
import C, { join as V } from "path";
import { spawn as Ea } from "node:child_process";
import { constants as Be, promises as Nt } from "node:fs";
import * as Ht from "node:fs/promises";
import { access as gn, mkdir as Sr, writeFile as Tr, unlink as wr } from "node:fs/promises";
import { createRequire as ma } from "node:module";
import "./config-B9Gu_Tvs.js";
import _r from "electron-store";
import Aa from "yauzl";
import ya from "yazl";
import { randomUUID as X, randomBytes as Sa, createHash as Ta } from "node:crypto";
import { Type as ht } from "@google/genai";
import { promisify as pr } from "node:util";
import { gzip as En, gunzip as wa } from "node:zlib";
import _a from "electron-window-state";
import { EventEmitter as Ia } from "node:events";
import Pa from "node:module";
const Dl = import.meta.filename, st = import.meta.dirname, Ll = Pa.createRequire(import.meta.url), Ol = 2, jl = 2, bl = 2, $e = 1, Ca = (r) => !!r && typeof r == "object" && typeof r.then == "function", Ce = () => typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now(), xe = (r, t, e, n) => {
  const a = r?.[t];
  if (a)
    try {
      const o = a(e, n);
      Ca(o) && o.then(() => {
      }, () => {
      });
    } catch {
    }
}, mn = (r) => ({
  flattened: u.flattenError(r),
  pretty: u.prettifyError(r),
  issues: r.issues.map((t) => ({
    code: t.code,
    path: t.path.map(String).join("."),
    message: t.message
  }))
}), Ra = (r) => ({
  schemaVersion: $e,
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
  zod: mn(r.error),
  ...r.meta ?? {}
}), An = (r) => {
  const t = Ce();
  return {
    complete(e, n) {
      const a = Number((Ce() - t).toFixed(1));
      return xe(e, "info", r.event, {
        schemaVersion: $e,
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
      const o = Number((Ce() - t).toFixed(1));
      return xe(e, "warn", r.event, {
        schemaVersion: $e,
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
var ur = /* @__PURE__ */ ((r) => (r.DEBUG = "DEBUG", r.INFO = "INFO", r.WARN = "WARN", r.ERROR = "ERROR", r))(ur || {});
const pe = /* @__PURE__ */ Symbol.for("luie.logger.context"), Ge = "[REDACTED]", Na = "[REDACTED_PATH]", yn = "[REDACTED_TEXT]", Sn = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, Tn = /(content|synopsis|manuscript|chapterText|prompt)/i, wn = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, Da = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, La = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, Oa = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function Ir(r, t) {
  if (Sn.test(t ?? ""))
    return Ge;
  if (Tn.test(t ?? ""))
    return yn;
  if (wn.test(t ?? "") && Da.test(r))
    return Na;
  let e = r.replace(La, "Bearer [REDACTED]");
  return Oa.test(e) && (e = Ge), e;
}
function Pt(r, t, e = /* @__PURE__ */ new WeakSet()) {
  if (typeof r == "string")
    return Ir(r, t);
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
      return r.map((n) => Pt(n, t, e));
    if (typeof r == "object") {
      const n = r;
      if (e.has(n))
        return "[Circular]";
      e.add(n);
      const a = {};
      for (const [o, s] of Object.entries(n)) {
        if (Sn.test(o)) {
          a[o] = Ge;
          continue;
        }
        if (Tn.test(o) && typeof s == "string") {
          a[o] = yn;
          continue;
        }
        if (wn.test(o) && typeof s == "string") {
          a[o] = Ir(s, o);
          continue;
        }
        a[o] = Pt(s, o, e);
      }
      return a;
    }
    return String(r);
  }
}
function ja(r) {
  if (!r || typeof r != "object") return Pt(r);
  const t = r[pe];
  return !t || typeof t != "object" ? Pt(r) : Array.isArray(r) ? Pt({ items: r, _ctx: t }) : Pt({ ...r, _ctx: t });
}
function ba(r, t) {
  return r && typeof r == "object" ? { ...r, [pe]: t } : { value: r, [pe]: t };
}
class Fa {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, e, n) {
    if (!va(t)) return;
    const a = ja(n), o = {
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
    ot.logToFile && ot.logFilePath && ka(o);
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
const _n = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, Pr = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let ot = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, Re = null;
const He = async (r) => import(
  /* @vite-ignore */
  r
);
function va(r) {
  return Pr[r] >= Pr[ot.minLevel];
}
async function Ua() {
  !_n || !ot.logFilePath || (Re || (Re = (async () => {
    const r = await He("node:path");
    await (await He("node:fs/promises")).mkdir(r.dirname(ot.logFilePath), {
      recursive: !0
    });
  })()), await Re);
}
function Ma(r) {
  try {
    return JSON.stringify(r);
  } catch {
    return '"[unserializable]"';
  }
}
async function ka(r) {
  if (!(!_n || !ot.logFilePath))
    try {
      await Ua();
      const t = await He("node:fs/promises"), e = Ma(r);
      await t.appendFile(ot.logFilePath, `${e}
`, "utf8");
    } catch {
    }
}
function In(r) {
  ot = {
    ...ot,
    ...r
  };
}
function N(r) {
  return new Fa(r);
}
const Fl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: pe,
  LogLevel: ur,
  buildValidationFailureData: Ra,
  configureLogger: In,
  createLogger: N,
  createPerformanceTimer: An,
  emitOperationalLog: xe,
  summarizeZodError: mn,
  withLogContext: ba
}, Symbol.toStringTag, { value: "Module" })), Wa = "Luie", Ba = "0.1.0", Pn = (r, t) => typeof r == "string" && r.trim().length > 0 ? r : t, Cr = Pn(
  "luie",
  Wa
), $a = Pn(
  "0.1.16",
  Ba
), Cn = "luie.db", xa = 3e4, Rn = xa, Ga = 1e3, Ee = 30, Ha = !0, Ya = 300 * 1e3, za = 60 * 1e3, Xa = 200, Ka = 5e3, qa = 3e3, Va = 1e4, Ja = 8e3, Qa = 2e4, Ne = 60 * 1e3, Za = 2e3, ue = 50, Nn = 2e3, to = 1, eo = 0, ro = 30, Rr = 50, no = 2e3, ao = 5e3, oo = 1400, so = 900, io = 1e3, co = 600, lo = 16, po = 16, uo = "sans", ho = "inter", fo = 16, go = 1.6, Eo = 800, mo = "blue", Ao = !0, yo = "logs", So = "luie.log", Ye = "snapshot-mirror", hr = "Backups", To = "settings", wo = "settings.json", Dn = "luie", q = ".luie", vl = "luie", Dt = "luie", Ul = "Luie Project", Ml = "New Project", kl = "project", Lt = "zip", Ot = 1, me = "meta.json", vt = "manuscript", Wl = `${vt}/README.md`, G = "world", jt = "snapshots", _o = "assets", Ln = "characters.json", On = "terms.json", Qt = "synopsis.json", Ae = "plot-board.json", ye = "map-drawing.json", Se = "mindmap.json", fr = "scrap-memos.json", Te = "graph.json", we = ".md", E = {
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
}, Io = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), Nr = (r) => Io.has(r), Bl = (r, t, e) => !0, Po = "neutral", Co = "soft", Kt = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", Ro = () => !S.isPackaged && !Kt(), No = () => S.isPackaged, Do = () => W.join(process.cwd(), "prisma", "dev.db"), Lo = () => W.join(process.cwd(), "prisma", ".tmp", "test.db"), Oo = () => W.join(S.getPath("userData"), Cn);
function jo() {
  if (process.env.DATABASE_URL) return;
  const r = Kt() ? Lo() : S.isPackaged ? Oo() : Do();
  process.env.DATABASE_URL = `file:${r}`;
}
class f extends Error {
  code;
  details;
  constructor(t, e, n, a) {
    super(e), this.code = t, this.details = n, a && (this.cause = a);
  }
}
function bo(r) {
  return typeof r == "object" && r !== null && "code" in r && "message" in r;
}
const Dr = 4096, Fo = process.platform === "win32" ? [W.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], Lr = (r) => process.platform === "win32" ? r.toLowerCase() : r, vo = (r, t) => {
  const e = Lr(W.resolve(r)), n = Lr(W.resolve(t));
  return e === n || e.startsWith(`${n}${W.sep}`);
};
function Uo(r, t) {
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
  if (e.length > Dr)
    throw new f(
      E.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: e.length, maxLength: Dr }
    );
  if (e.includes("\0"))
    throw new f(
      E.INVALID_INPUT,
      `${t} contains invalid null bytes`,
      { fieldName: t }
    );
  return e;
}
function z(r, t = "path") {
  const e = Uo(r, t);
  if (!W.isAbsolute(e))
    throw new f(
      E.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: e }
    );
  const n = W.resolve(e);
  for (const a of Fo)
    if (vo(n, a))
      throw new f(
        E.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: n, restrictedRoot: W.resolve(a) }
      );
  return n;
}
const Mo = [
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
], ko = [
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
], Wo = {
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
}, Bo = `
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
`, Or = N("DatabaseSeed");
async function $o(r) {
  const t = await r.project.count();
  return t > 0 ? (Or.info("Seed skipped (projects exist)", { count: t }), !1) : (await r.project.create({
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
  }), Or.info("Seed completed (default project created)"), !0);
}
const j = N("DatabaseService"), gr = ma(import.meta.url), { PrismaClient: jr } = gr("@prisma/client"), xo = () => {
  const r = gr("@prisma/adapter-better-sqlite3");
  if (typeof r == "function") return r;
  if (r && typeof r == "object" && typeof r.PrismaBetterSqlite3 == "function")
    return r.PrismaBetterSqlite3;
  throw new Error("Failed to load Prisma better-sqlite3 adapter");
}, Go = () => {
  const r = gr("better-sqlite3");
  return typeof r == "function" ? r : r.default;
}, Ho = (r) => `"${r.replace(/"/g, '""')}"`, kt = async (r) => {
  try {
    return await Ht.access(r, Be.F_OK), !0;
  } catch {
    return !1;
  }
}, Yo = (r) => {
  const t = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return dt.join(r, "node_modules", ".bin", t);
}, br = "file:", zo = (r) => {
  if (!r.startsWith(br))
    throw new Error("DATABASE_URL must use sqlite file: URL");
  const t = r.slice(br.length);
  if (!t || t === ":memory:" || t.startsWith(":memory:?"))
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  const e = t.indexOf("?"), n = e >= 0 ? t.slice(0, e) : t, a = e >= 0 ? t.slice(e + 1) : "", o = z(
    dt.isAbsolute(n) ? n : dt.resolve(process.cwd(), n),
    "DATABASE_URL"
  ), s = a.length > 0 ? `file:${o}?${a}` : `file:${o}`;
  return { dbPath: o, datasourceUrl: s };
}, De = async (r, t, e) => await new Promise((n, a) => {
  const o = Ea(r, t, {
    env: e,
    shell: !1,
    windowsHide: !0
  });
  let s = "", c = "";
  o.stdout?.on("data", (d) => {
    s += d.toString();
  }), o.stderr?.on("data", (d) => {
    c += d.toString();
  }), o.on("error", (d) => {
    a(d);
  }), o.on("close", (d) => {
    if (d === 0) {
      n({ stdout: s, stderr: c });
      return;
    }
    const l = new Error(`Prisma command failed with exit code ${d}`);
    l.code = d, l.stdout = s, l.stderr = c, a(l);
  });
}), Xo = () => (process.env.LUIE_PACKAGED_SCHEMA_MODE ?? "").trim().toLowerCase() === "prisma-migrate" ? "prisma-migrate" : "bootstrap";
class Ct {
  static instance;
  prisma = null;
  dbPath = null;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    return Ct.instance || (Ct.instance = new Ct()), Ct.instance;
  }
  async initialize() {
    this.prisma || (this.initPromise || (this.initPromise = this.initializeInternal().finally(() => {
      this.initPromise = null;
    })), await this.initPromise);
  }
  async initializeInternal() {
    const t = await this.prepareDatabaseContext();
    if (this.dbPath = t.dbPath, j.info("Initializing database", {
      isPackaged: t.isPackaged,
      isTest: t.isTest,
      hasEnvDb: !!process.env.DATABASE_URL,
      userDataPath: S.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await $o(this.prisma);
      } catch (e) {
        j.error("Failed to seed packaged database", { error: e });
      }
    if (this.prisma.$executeRawUnsafe)
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"), await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"), j.info("SQLite WAL mode enabled");
      } catch (e) {
        j.warn("Failed to enable WAL mode", { error: e });
      }
    j.info("Database service initialized");
  }
  createPrismaClient(t) {
    try {
      const e = xo(), n = new e({
        url: t.datasourceUrl
      });
      return new jr({
        adapter: n,
        log: ["error", "warn"]
      });
    } catch (e) {
      if (t.isPackaged)
        throw e;
      return j.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: e,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new jr({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = No(), e = S.getPath("userData"), n = Kt(), a = process.env.DATABASE_URL, o = !!a;
    let s, c;
    if (o) {
      const d = zo(a ?? "");
      s = d.dbPath, c = d.datasourceUrl;
    } else t ? (s = z(dt.join(e, Cn), "dbPath"), c = `file:${s}`) : (s = z(dt.join(process.cwd(), "prisma", "dev.db"), "dbPath"), c = `file:${s}`);
    return process.env.DATABASE_URL = c, await Ht.mkdir(e, { recursive: !0 }), await Ht.mkdir(dt.dirname(s), { recursive: !0 }), await kt(s) || await Ht.writeFile(s, ""), {
      dbPath: s,
      datasourceUrl: c,
      isPackaged: t,
      isTest: n
    };
  }
  async applySchema(t) {
    const e = await kt(t.dbPath), n = t.isPackaged ? process.resourcesPath : process.cwd(), a = dt.join(n, "prisma", "schema.prisma"), o = Yo(n), s = dt.join(n, "prisma", "migrations"), c = await kt(s) && await Ht.readdir(s, { withFileTypes: !0 }).then((l) => l.some((i) => i.isDirectory())), d = { ...process.env, DATABASE_URL: t.datasourceUrl };
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
      j.info("Running test database push", {
        dbPath: t.dbPath,
        dbExists: e,
        command: "db push"
      });
      try {
        await De(
          o,
          ["db", "push", "--accept-data-loss", `--schema=${a}`],
          d
        ), j.info("Test database push completed successfully");
      } catch (l) {
        const i = l;
        j.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: l,
          stdout: i.stdout,
          stderr: i.stderr,
          dbPath: t.dbPath
        }), this.ensurePackagedSqliteSchema(t.dbPath);
      }
      return;
    }
    j.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: e,
      hasMigrations: c,
      command: "db push"
    });
    try {
      await De(
        o,
        ["db", "push", "--accept-data-loss", `--schema=${a}`],
        d
      ), j.info("Development database ready");
    } catch (l) {
      const i = l;
      throw j.error("Failed to prepare development database", {
        error: l,
        stdout: i.stdout,
        stderr: i.stderr
      }), l;
    }
  }
  async applyPackagedSchema(t, e) {
    const n = Xo();
    if (n === "bootstrap") {
      j.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: n
      }), this.ensurePackagedSqliteSchema(t.dbPath);
      return;
    }
    const { dbExists: a, schemaPath: o, prismaPath: s, hasMigrations: c, commandEnv: d } = e, l = await kt(o), i = await kt(s);
    if (c && l && i) {
      j.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: a,
        command: "migrate deploy"
      });
      try {
        await De(s, ["migrate", "deploy", `--schema=${o}`], d), j.info("Production migrations applied successfully");
      } catch (p) {
        const A = p;
        j.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: p,
          stdout: A.stdout,
          stderr: A.stderr,
          schemaMode: n
        });
      }
    } else
      j.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: t.dbPath,
        hasMigrations: c,
        hasSchemaFile: l,
        hasPrismaBinary: i,
        resourcesPath: process.resourcesPath,
        schemaMode: n
      });
    this.ensurePackagedSqliteSchema(t.dbPath);
  }
  ensurePackagedSqliteSchema(t) {
    const e = Go(), n = new e(t);
    try {
      n.pragma("foreign_keys = ON");
      const a = Mo.filter(
        (c) => !this.sqliteTableExists(n, c)
      );
      n.exec(Bo);
      const o = [];
      for (const c of ko)
        this.sqliteTableExists(n, c.table) && (this.sqliteTableHasColumn(n, c.table, c.column) || (n.exec(c.sql), o.push(`${c.table}.${c.column}`)));
      const s = [];
      for (const [c, d] of Object.entries(Wo))
        for (const l of d)
          this.sqliteTableHasColumn(n, c, l) || s.push(`${c}.${l}`);
      if (s.length > 0)
        throw new Error(`Packaged SQLite schema verification failed: missing ${s.join(", ")}`);
      (a.length > 0 || o.length > 0) && j.info("Packaged SQLite schema bootstrap applied", {
        dbPath: t,
        createdTables: a,
        patchedColumns: o
      });
    } finally {
      n.close();
    }
  }
  sqliteTableExists(t, e) {
    return !!t.prepare(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    ).get(e)?.found;
  }
  sqliteTableHasColumn(t, e, n) {
    return this.sqliteTableExists(t, e) ? t.prepare(
      `PRAGMA table_info(${Ho(e)})`
    ).all().some((s) => s.name === n) : !1;
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
      j.error("Database initialization failed before disconnect", { error: t });
    }), this.prisma && (await this.prisma.$disconnect(), this.prisma = null, j.info("Database disconnected"));
  }
}
const h = Ct.getInstance(), Fr = N("KeywordExtractor");
class Ko {
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
    return Fr.debug("Keywords extracted", {
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
    return Fr.debug("New keywords extracted", {
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
const Et = new Ko(), qo = Dn, Vo = wo, Le = To, Jo = (r) => {
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
}, Qo = (r) => {
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
}, ce = Qo(process.platform), ze = process.platform === "darwin" ? "visible" : "hidden", Xe = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = typeof r.url == "string" ? r.url.trim() : "", e = typeof r.anonKey == "string" ? r.anonKey.trim() : "";
  if (!(t.length === 0 || e.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: e
    };
}, vr = () => ({
  editor: {
    fontFamily: uo,
    fontPreset: ho,
    fontSize: fo,
    lineHeight: go,
    maxWidth: Eo,
    theme: la.shouldUseDarkColors ? "dark" : "light",
    themeTemp: Po,
    themeContrast: Co,
    themeAccent: mo,
    themeTexture: Ao,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: ce,
  lastProjectPath: void 0,
  autoSaveEnabled: Ha,
  autoSaveInterval: Rn,
  snapshotExportLimit: ue,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: ze,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
}), Tt = (r) => typeof r == "string" && r.length > 0, Zo = (r) => {
  if (!Array.isArray(r)) return;
  const t = r.filter(
    (e) => !!(e && typeof e == "object" && Tt(e.projectId) && Tt(e.deletedAt))
  ).map((e) => ({
    projectId: e.projectId,
    deletedAt: e.deletedAt
  }));
  return t.length > 0 ? t : void 0;
}, Ke = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(
      (e) => Tt(e[0]) && Tt(e[1])
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, ts = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const t = r;
  return {
    chapter: Ke(t.chapter) ?? {},
    memo: Ke(t.memo) ?? {},
    capturedAt: Tt(t.capturedAt) ? t.capturedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}, es = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(([e]) => Tt(e)).map(([e, n]) => [e, ts(n)]).filter((e) => !!e[1])
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, rs = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return;
  const t = Object.fromEntries(
    Object.entries(r).filter(
      (e) => Tt(e[0]) && (e[1] === "local" || e[1] === "remote")
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, Ur = (r) => {
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
    pendingProjectDeletes: Zo(t.pendingProjectDeletes),
    projectLastSyncedAtByProjectId: Ke(t.projectLastSyncedAtByProjectId),
    entityBaselinesByProjectId: es(t.entityBaselinesByProjectId),
    pendingConflictResolutions: rs(
      t.pendingConflictResolutions
    ),
    runtimeSupabaseConfig: Xe(t.runtimeSupabaseConfig)
  };
}, _t = N("SettingsManager");
class mt {
  static instance;
  store;
  constructor() {
    const t = S.getPath("userData"), e = `${t}/${qo}/${Le}`, n = `${e}/${Vo}`;
    this.store = new _r({
      name: Le,
      defaults: vr(),
      // 저장 위치: userData/settings.json
      cwd: t,
      encryptionKey: void 0,
      // 필요하다면 암호화 키 추가
      fileExtension: "json"
    }), this.migrateLegacySettingsIfNeeded(e, n), this.migrateLegacyWindowSettings(), _t.info("Settings manager initialized", {
      path: this.store.path
    });
  }
  async migrateLegacySettingsIfNeeded(t, e) {
    const n = await this.pathExists(e), a = await this.pathExists(this.store.path);
    if (!(!n || a))
      try {
        const o = new _r({
          name: Le,
          defaults: vr(),
          cwd: t,
          fileExtension: "json"
        });
        this.store.set(o.store), _t.info("Settings migrated from legacy path", {
          from: o.path,
          to: this.store.path
        });
      } catch (o) {
        _t.error("Failed to migrate legacy settings", o);
      }
  }
  async pathExists(t) {
    try {
      return await gn(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", ze), "titleBarMode" in t) {
      const { titleBarMode: e, ...n } = t;
      this.store.set(n);
    }
  }
  static getInstance() {
    return mt.instance || (mt.instance = new mt()), mt.instance;
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
      sync: Jo(t.sync)
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
    this.store.set(n), _t.info("Settings updated", { settings: n });
  }
  // 에디터 설정
  getEditorSettings() {
    return this.store.get("editor");
  }
  setEditorSettings(t) {
    this.store.set("editor", { ...this.getEditorSettings(), ...t }), _t.info("Editor settings updated", { settings: t });
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
    return { shortcuts: { ...ce, ...t }, defaults: ce };
  }
  setShortcuts(t) {
    const e = { ...ce, ...t };
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
    return this.store.get("menuBarMode") ?? ze;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    return Ur(this.store.get("sync"));
  }
  setSyncSettings(t) {
    const e = Ur({
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
    return Xe(t.runtimeSupabaseConfig);
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
    const e = Xe(t);
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
    this.store.clear(), _t.info("Settings reset to defaults");
  }
  // 저장 경로 가져오기 (디버깅용)
  getSettingsPath() {
    return this.store.path;
  }
}
const _ = mt.getInstance(), $l = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: mt,
  settingsManager: _
}, Symbol.toStringTag, { value: "Module" })), ns = () => ({
  timer: null,
  inFlight: null,
  dirty: !1
});
class as {
  constructor(t, e, n) {
    this.debounceMs = t, this.runExport = e, this.logger = n;
  }
  states = /* @__PURE__ */ new Map();
  getOrCreate(t) {
    const e = this.states.get(t);
    if (e) return e;
    const n = ns();
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
const bt = (r, t = "") => {
  const e = r.trim();
  return e ? e.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, he = 5 * 1024 * 1024, qt = (r) => at.posix.normalize(r.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), fe = (r) => {
  const t = qt(r);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !at.isAbsolute(t);
}, Zt = (r) => r.toLowerCase().endsWith(q) ? r : `${r}${q}`, Mr = (r) => process.platform === "win32" ? r.toLowerCase() : r, os = (r, t) => {
  const e = Mr(at.resolve(r)), n = Mr(at.resolve(t));
  return e === n || e.startsWith(`${n}${at.sep}`);
}, jn = async (r, t, e) => {
  const n = qt(t);
  if (!n || !fe(n))
    throw new Error("INVALID_RELATIVE_PATH");
  let a = !1, o = null;
  return await new Promise((s, c) => {
    Aa.open(r, { lazyEntries: !0 }, (d, l) => {
      if (d || !l) {
        c(d ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      l.on("entry", (i) => {
        const p = qt(i.fileName);
        if (!p || !fe(p)) {
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
        l.openReadStream(i, (A, w) => {
          if (A || !w) {
            c(A ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          a = !0;
          const g = [], m = w;
          let T = 0;
          m.on("data", (I) => {
            if (T += I.length, T > he) {
              m.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${p}:${he}`
                )
              );
              return;
            }
            g.push(I);
          }), m.on("end", () => {
            o = Buffer.concat(g).toString("utf-8"), l.close(), s();
          }), m.on("error", c);
        });
      }), l.on("end", () => {
        a || s();
      }), l.on("error", c), l.readEntry();
    });
  }), o;
}, et = async (r, t, e) => {
  const n = Zt(r), a = qt(t);
  if (!a || !fe(a))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const o = await Y.stat(n);
    if (o.isDirectory()) {
      const s = await Y.realpath(n), c = at.resolve(n, a);
      try {
        const d = await Y.realpath(c);
        if (!os(d, s))
          throw new Error("INVALID_RELATIVE_PATH");
        const l = await Y.stat(d);
        if (l.isDirectory())
          return null;
        if (l.size > he)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${a}:${he}`
          );
        return await Y.readFile(d, "utf-8");
      } catch (d) {
        if (d?.code === "ENOENT") return null;
        throw d;
      }
    }
    if (o.isFile())
      return await jn(n, a, e);
  } catch (o) {
    if (o?.code === "ENOENT") return null;
    throw o;
  }
  return null;
}, kr = (r) => {
  const t = C.resolve(r);
  return process.platform === "win32" ? t.toLowerCase() : t;
}, Wr = (r) => {
  if (typeof r != "string") return;
  const t = r.trim();
  return t.length > 0 ? z(t, "projectPath") : void 0;
}, bn = (r, t) => {
  const e = z(r, t);
  return Zt(e);
}, Br = async (r, t) => {
  const e = kr(r), n = await h.getClient().project.findMany({
    select: {
      id: !0,
      title: !0,
      projectPath: !0
    }
  });
  for (const a of n)
    if (!(t && String(a.id) === t) && !(typeof a.projectPath != "string" || a.projectPath.trim().length === 0))
      try {
        const o = z(a.projectPath, "projectPath");
        if (kr(o) === e)
          return {
            id: String(a.id),
            title: typeof a.title == "string" ? a.title : "",
            projectPath: o
          };
      } catch {
      }
  return null;
}, ss = async (r) => {
  const { projectId: t, projectPath: e, previousTitle: n, nextTitle: a, logger: o } = r;
  if (!(!e || n === a))
    try {
      const s = z(e, "projectPath"), d = `${C.dirname(s)}${C.sep}.luie${C.sep}${jt}`, l = bt(n, ""), i = bt(a, "");
      if (!l || !i || l === i) return;
      const p = `${d}${C.sep}${l}`, A = `${d}${C.sep}${i}`;
      try {
        if (!(await R.stat(p)).isDirectory()) return;
      } catch {
        return;
      }
      await R.mkdir(C.dirname(A), { recursive: !0 }), await R.rename(p, A);
    } catch (s) {
      o.warn("Failed to rename snapshot directory after project title update", {
        projectId: t,
        previousTitle: n,
        nextTitle: a,
        error: s
      });
    }
}, Fn = (r) => {
  if (typeof r == "number") return r === Ot;
  if (typeof r == "string" && r.trim().length > 0) {
    const t = Number(r);
    return Number.isFinite(t) && t === Ot;
  }
  return !1;
}, is = (r) => {
  try {
    const t = JSON.parse(r);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, cs = (r) => r && typeof r == "object" && !Array.isArray(r) ? r : {}, ds = (r, t) => {
  if (r.format !== Dt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: r.format }
    );
  if (r.container !== Lt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: r.container }
    );
  if (!Fn(r.version))
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: r.version }
    );
}, ls = (r, t) => {
  const e = cs(r), n = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), a = t.createdAtFallback ?? n;
  if (Object.prototype.hasOwnProperty.call(e, "format") && e.format !== Dt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: e.format }
    );
  if (Object.prototype.hasOwnProperty.call(e, "container") && e.container !== Lt)
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: e.container }
    );
  if (Object.prototype.hasOwnProperty.call(e, "version") && !Fn(e.version))
    throw new f(
      E.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: e.version }
    );
  const o = typeof e.title == "string" && e.title.trim().length > 0 ? e.title : t.titleFallback, s = typeof e.createdAt == "string" && e.createdAt.length > 0 ? e.createdAt : a, c = typeof e.updatedAt == "string" && e.updatedAt.length > 0 ? e.updatedAt : n;
  return {
    ...e,
    format: Dt,
    container: Lt,
    version: Ot,
    title: o,
    createdAt: s,
    updatedAt: c
  };
}, ps = async (r, t) => {
  const e = await jn(r, me, t);
  if (!e)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: r }
    );
  const n = is(e);
  if (!n)
    throw new f(
      E.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: r }
    );
  ds(n, { source: r });
}, us = ".tmp", ne = /* @__PURE__ */ new Map(), hs = async (r) => {
  const t = at.dirname(r);
  await Y.mkdir(t, { recursive: !0 });
}, xl = async (r) => {
  try {
    return await Y.access(r), !0;
  } catch {
    return !1;
  }
}, fs = async (r, t) => {
  const e = at.resolve(Zt(r)), a = (ne.get(e) ?? Promise.resolve()).catch(() => {
  }).then(t), o = a.then(
    () => {
    },
    () => {
    }
  );
  ne.set(e, o);
  try {
    return await a;
  } finally {
    ne.get(e) === o && ne.delete(e);
  }
}, gs = async (r, t) => {
  const e = new ya.ZipFile(), n = fa.createWriteStream(r), a = new Promise((o, s) => {
    n.on("close", () => o()), n.on("error", s), e.outputStream.on("error", s);
  });
  e.outputStream.pipe(n), await t(e), e.end(), await a;
}, Es = async (r, t, e) => {
  const n = `${t}.bak-${Date.now()}`;
  let a = !1;
  try {
    await Y.rename(r, t);
    return;
  } catch (o) {
    const s = o;
    if (s?.code !== "EEXIST" && s?.code !== "ENOTEMPTY" && s?.code !== "EPERM" && s?.code !== "EISDIR")
      throw o;
  }
  try {
    await Y.rename(t, n), a = !0, await Y.rename(r, t), await Y.rm(n, { force: !0, recursive: !0 });
  } catch (o) {
    if (e.error("Atomic replace failed", { error: o, targetPath: t }), a)
      try {
        await Y.rename(n, t);
      } catch (s) {
        e.error("Failed to restore backup", { restoreError: s, targetPath: t, backupPath: n });
      }
    throw o;
  }
}, ms = () => [
  { name: `${vt}/`, isDirectory: !0 },
  { name: `${G}/`, isDirectory: !0 },
  { name: `${jt}/`, isDirectory: !0 },
  { name: `${_o}/`, isDirectory: !0 }
], Gl = (r) => ({
  name: me,
  content: JSON.stringify(r ?? {}, null, 2)
}), As = async (r, t) => {
  for (const e of t) {
    const n = qt(e.name);
    if (!n || !fe(n))
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
}, Er = async (r, t, e) => {
  const n = Zt(r);
  return await fs(n, async () => {
    await hs(n);
    const a = (/* @__PURE__ */ new Date()).toISOString(), o = ls(t.meta, {
      titleFallback: at.basename(n, q),
      nowIso: a,
      createdAtFallback: a
    }), s = `${n}${us}-${Date.now()}`, c = [
      ...ms(),
      {
        name: me,
        content: JSON.stringify(o, null, 2)
      },
      {
        name: `${G}/${Ln}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${G}/${On}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${G}/${Qt}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${G}/${Ae}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${G}/${ye}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${G}/${Se}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${G}/${fr}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${G}/${Te}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${jt}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const d of t.chapters ?? [])
      d.id && c.push({
        name: `${vt}/${d.id}${we}`,
        content: d.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const d of t.snapshots)
        d.id && c.push({
          name: `${jt}/${d.id}.snap`,
          content: JSON.stringify(d, null, 2)
        });
    await gs(s, (d) => As(d, c)), await ps(s, e), await Es(s, n, e);
  });
}, vn = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), ys = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), U = (r) => !!(r && typeof r == "object" && !Array.isArray(r)), Un = (r) => {
  if (!r) return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, Ss = (r) => {
  if (U(r))
    return typeof r.updatedAt == "string" ? r.updatedAt : void 0;
}, Ts = (r, t = "pen") => typeof r == "string" && ys.has(r) ? r : t, ws = (r, t = "mountain") => typeof r == "string" && vn.has(r) ? r : t, Mn = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!U(n)) continue;
    const a = n.type;
    if (a !== "path" && a !== "text" && a !== "icon") continue;
    const o = {
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `path-${e}`,
      type: a,
      color: typeof n.color == "string" ? n.color : "#000000"
    };
    typeof n.d == "string" && (o.d = n.d), typeof n.width == "number" && (o.width = n.width), typeof n.x == "number" && (o.x = n.x), typeof n.y == "number" && (o.y = n.y), typeof n.text == "string" && (o.text = n.text), typeof n.icon == "string" && vn.has(n.icon) && (o.icon = n.icon), t.push(o);
  }
  return t;
}, kn = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!U(n)) continue;
    const a = n.position;
    if (!U(a)) continue;
    const o = U(n.data) ? n.data : void 0;
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
}, Wn = (r) => {
  if (!Array.isArray(r)) return [];
  const t = [];
  for (const [e, n] of r.entries()) {
    if (!U(n)) continue;
    const a = typeof n.source == "string" ? n.source : "", o = typeof n.target == "string" ? n.target : "";
    !a || !o || t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `edge-${e}`,
      source: a,
      target: o,
      type: typeof n.type == "string" ? n.type : void 0
    });
  }
  return t;
}, _s = (r, t, e) => U(r) ? {
  id: typeof r.id == "string" && r.id.length > 0 ? r.id : `memo-${t}`,
  title: typeof r.title == "string" ? r.title : "",
  content: typeof r.content == "string" ? r.content : "",
  tags: Array.isArray(r.tags) ? r.tags.filter((n) => typeof n == "string") : [],
  updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : e()
} : null, Bn = (r, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(r) ? r.map((e, n) => _s(e, n, t)).filter((e) => e !== null) : [], $n = (r, t = () => (/* @__PURE__ */ new Date()).toISOString()) => U(r) ? {
  memos: Bn(r.memos, t),
  updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
} : { memos: [] }, Wt = (r) => {
  if (!r) return null;
  try {
    const t = JSON.parse(r);
    return t && typeof t == "object" && !Array.isArray(t) ? t : null;
  } catch {
    return null;
  }
}, Is = (r) => {
  const t = r.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    updatedAt: n.updatedAt,
    content: n.content,
    file: `${vt}/${n.id}${we}`
  })), e = t.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    file: n.file
  }));
  return { exportChapters: t, chapterMeta: e };
}, Ps = (r) => r.map((t) => {
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
}), Cs = (r) => r.map((t) => ({
  id: t.id,
  term: t.term,
  definition: t.definition,
  category: t.category,
  firstAppearance: t.firstAppearance,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
})), Rs = (r, t) => {
  const e = r.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    chapterId: n.chapterId,
    content: n.content,
    description: n.description,
    createdAt: n.createdAt?.toISOString?.() ?? String(n.createdAt)
  }));
  return t > 0 ? e.slice(0, t) : e;
}, Ns = (r, t) => {
  const e = t.success ? t.data : void 0;
  return {
    synopsis: r.description ?? (typeof e?.synopsis == "string" ? e.synopsis : ""),
    status: e?.status ?? "draft",
    genre: typeof e?.genre == "string" ? e.genre : void 0,
    targetAudience: typeof e?.targetAudience == "string" ? e.targetAudience : void 0,
    logline: typeof e?.logline == "string" ? e.logline : void 0,
    updatedAt: typeof e?.updatedAt == "string" ? e.updatedAt : void 0
  };
}, Ds = (r) => !r.success || !Array.isArray(r.data.columns) ? { columns: [] } : {
  columns: r.data.columns,
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
}, Ls = (r) => !r.success || !Array.isArray(r.data.paths) ? { paths: [] } : {
  paths: Mn(r.data.paths),
  tool: r.data.tool,
  iconType: r.data.iconType,
  color: typeof r.data.color == "string" ? r.data.color : void 0,
  lineWidth: typeof r.data.lineWidth == "number" ? r.data.lineWidth : void 0,
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
}, Os = (r) => r.success ? {
  nodes: kn(r.data.nodes),
  edges: Wn(r.data.edges),
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
} : { nodes: [], edges: [] }, js = (r) => r.success ? {
  memos: Bn(r.data.memos),
  updatedAt: typeof r.data.updatedAt == "string" ? r.data.updatedAt : void 0
} : { memos: [] }, bs = (r) => {
  const t = [
    ...r.characters.map((n) => ({
      id: n.id,
      entityType: "Character",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Wt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...r.factions.map((n) => ({
      id: n.id,
      entityType: "Faction",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Wt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...r.events.map((n) => ({
      id: n.id,
      entityType: "Event",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Wt(n.attributes),
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
      attributes: typeof n.attributes == "string" ? Wt(n.attributes) : n.attributes ?? null,
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
    attributes: typeof n.attributes == "string" ? Wt(n.attributes) : n.attributes ?? null,
    sourceWorldEntityId: n.sourceWorldEntityId ?? null,
    targetWorldEntityId: n.targetWorldEntityId ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  }));
  return {
    nodes: t,
    edges: e
  };
}, Fs = (r, t) => ({
  format: Dt,
  container: Lt,
  version: Ot,
  projectId: r.id,
  title: r.title,
  description: r.description,
  createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
  chapters: t
}), vs = u.object({
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
}).passthrough(), Us = u.object({
  characters: u.array(u.record(u.string(), u.unknown())).optional()
}).passthrough(), Ms = u.object({
  terms: u.array(u.record(u.string(), u.unknown())).optional()
}).passthrough(), qe = u.object({
  synopsis: u.string().optional(),
  status: u.enum(["draft", "working", "locked"]).optional(),
  genre: u.string().optional(),
  targetAudience: u.string().optional(),
  logline: u.string().optional(),
  updatedAt: u.string().optional()
}).passthrough(), $r = u.object({
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
}).passthrough(), xr = u.object({
  paths: u.array(u.record(u.string(), u.unknown())).optional(),
  tool: u.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: u.enum(["mountain", "castle", "village"]).optional(),
  color: u.string().optional(),
  lineWidth: u.number().optional(),
  updatedAt: u.string().optional()
}).passthrough(), Gr = u.object({
  nodes: u.array(u.record(u.string(), u.unknown())).optional(),
  edges: u.array(u.record(u.string(), u.unknown())).optional(),
  updatedAt: u.string().optional()
}).passthrough(), Hr = u.object({
  memos: u.array(u.record(u.string(), u.unknown())).optional(),
  updatedAt: u.string().optional()
}).passthrough(), ks = u.object({
  id: u.string(),
  entityType: u.string(),
  subType: u.string().optional(),
  name: u.string(),
  description: u.string().optional().nullable(),
  firstAppearance: u.string().optional().nullable(),
  attributes: u.record(u.string(), u.unknown()).optional().nullable(),
  positionX: u.number().optional(),
  positionY: u.number().optional()
}).passthrough(), Ws = u.object({
  id: u.string(),
  sourceId: u.string(),
  sourceType: u.string(),
  targetId: u.string(),
  targetType: u.string(),
  relation: u.string(),
  attributes: u.record(u.string(), u.unknown()).optional().nullable(),
  createdAt: u.string().optional(),
  updatedAt: u.string().optional()
}).passthrough(), Bs = u.object({
  nodes: u.array(ks).optional(),
  edges: u.array(Ws).optional(),
  updatedAt: u.string().optional()
}).passthrough(), $s = u.object({
  id: u.string(),
  projectId: u.string().optional(),
  chapterId: u.string().optional().nullable(),
  content: u.string().optional(),
  description: u.string().optional().nullable(),
  createdAt: u.string().optional()
}).passthrough(), xs = u.object({
  snapshots: u.array($s).optional()
}).passthrough(), Gs = (r, t, e, n) => {
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
}, Hs = async (r) => await h.getClient().project.findUnique({
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
}), Ys = (r, t, e) => {
  if (!t)
    return e.info("Skipping package export (missing projectPath)", { projectId: r }), null;
  if (!t.toLowerCase().endsWith(q))
    return e.info("Skipping package export (not .luie)", {
      projectId: r,
      projectPath: t
    }), null;
  try {
    return z(t, "projectPath");
  } catch (n) {
    return e.warn("Skipping package export (invalid projectPath)", {
      projectId: r,
      projectPath: t,
      error: n
    }), null;
  }
}, zs = async (r, t) => {
  if (!r || !r.toLowerCase().endsWith(q))
    return {
      synopsis: qe.safeParse(null),
      plot: $r.safeParse(null),
      drawing: xr.safeParse(null),
      mindmap: Gr.safeParse(null),
      memos: Hr.safeParse(null)
    };
  const e = async (d, l, i) => {
    const p = `${G}/${d}`;
    try {
      const A = await et(r, p, t);
      return Gs(
        A,
        l,
        {
          packagePath: r,
          entryPath: p,
          label: i
        },
        t
      );
    } catch (A) {
      return t.warn("Failed to read .luie world document; using default during export", {
        projectPath: r,
        entryPath: p,
        label: i,
        error: A
      }), l.safeParse(null);
    }
  }, [n, a, o, s, c] = await Promise.all([
    e(
      Qt,
      qe,
      "synopsis"
    ),
    e(Ae, $r, "plot"),
    e(ye, xr, "drawing"),
    e(Se, Gr, "mindmap"),
    e(
      fr,
      Hr,
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
}, Xs = async (r) => {
  const t = await Hs(r.projectId);
  if (!t) return !1;
  const e = r.options?.targetPath ? bn(r.options.targetPath, "targetPath") : Ys(r.projectId, t.projectPath, r.logger);
  if (!e) return !1;
  const n = r.options?.worldSourcePath === void 0 ? e : r.options.worldSourcePath, { exportChapters: a, chapterMeta: o } = Is(t.chapters), s = Ps(t.characters), c = Cs(t.terms), d = _.getAll().snapshotExportLimit ?? ue, l = Rs(t.snapshots, d), i = await zs(n, r.logger), p = Ns(t, i.synopsis), A = Ds(i.plot), w = Ls(i.drawing), g = Os(i.mindmap), m = js(i.memos), T = bs(t), I = Fs(t, o);
  return r.logger.info("Exporting .luie package", {
    projectId: r.projectId,
    projectPath: e,
    chapterCount: a.length,
    characterCount: s.length,
    termCount: c.length,
    worldNodeCount: T.nodes.length,
    relationCount: T.edges.length,
    snapshotCount: l.length
  }), await Er(
    e,
    {
      meta: I,
      chapters: a,
      characters: s,
      terms: c,
      synopsis: p,
      plot: A,
      drawing: w,
      mindmap: g,
      memos: m,
      graph: T,
      snapshots: l
    },
    r.logger
  ), !0;
}, Ks = async (r) => {
  const t = [];
  for (let e = 0; e < r.chaptersMeta.length; e += 1) {
    const n = r.chaptersMeta[e], a = n.id ?? X(), o = n.file ?? `${vt}/${a}${we}`, s = typeof n.content == "string" ? n.content : await r.readChapterEntry(o);
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
}, qs = (r, t) => t.map((e, n) => {
  const a = typeof e.name == "string" && e.name.trim().length > 0 ? e.name : `Character ${n + 1}`, o = typeof e.attributes == "string" ? e.attributes : e.attributes ? JSON.stringify(e.attributes) : null;
  return {
    id: typeof e.id == "string" ? e.id : X(),
    projectId: r,
    name: a,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: o
  };
}), Vs = (r, t) => t.map((e, n) => {
  const a = typeof e.term == "string" && e.term.trim().length > 0 ? e.term : `Term ${n + 1}`;
  return {
    id: typeof e.id == "string" ? e.id : X(),
    projectId: r,
    term: a,
    definition: typeof e.definition == "string" ? e.definition : null,
    category: typeof e.category == "string" ? e.category : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null
  };
}), Js = (r) => {
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
}, Qs = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], Zs = ["Place", "Concept", "Rule", "Item"], ti = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], Ve = (r) => typeof r == "string" && Qs.includes(r), Je = (r) => typeof r == "string" && Zs.includes(r), ei = (r) => typeof r == "string" && ti.includes(r), te = (r) => {
  if (r == null)
    return null;
  if (typeof r == "string")
    return r;
  try {
    return JSON.stringify(r);
  } catch {
    return null;
  }
}, ri = (r, t) => Je(r) ? r : r === "WorldEntity" && Je(t) ? t : null, ni = (r, t) => ({
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
}), ai = (r) => Ve(r.entityType) ? r.entityType : Je(r.subType) ? r.subType : null, oi = (r, t, e) => {
  !e.id || !e.name || r.characterIds.has(e.id) || (r.characterIds.add(e.id), r.charactersForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: te(e.attributes)
  }));
}, si = (r, t, e) => {
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
}, ii = (r, t, e) => {
  !e.id || !e.name || r.factionIds.has(e.id) || (r.factionIds.add(e.id), r.factionsForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: te(e.attributes)
  }));
}, ci = (r, t, e) => {
  !e.id || !e.name || r.eventIds.has(e.id) || (r.eventIds.add(e.id), r.eventsForCreate.push({
    id: e.id,
    projectId: t,
    name: e.name,
    description: typeof e.description == "string" ? e.description : null,
    firstAppearance: typeof e.firstAppearance == "string" ? e.firstAppearance : null,
    attributes: te(e.attributes)
  }));
}, di = (r, t, e, n) => {
  if (!n.id || !n.name) return;
  const a = ri(e, n.subType);
  !a || r.worldEntityIds.has(n.id) || (r.worldEntityIds.add(n.id), r.worldEntitiesForCreate.push({
    id: n.id,
    projectId: t,
    type: a,
    name: n.name,
    description: typeof n.description == "string" ? n.description : null,
    firstAppearance: typeof n.firstAppearance == "string" ? n.firstAppearance : null,
    attributes: te(n.attributes),
    positionX: typeof n.positionX == "number" ? n.positionX : 0,
    positionY: typeof n.positionY == "number" ? n.positionY : 0
  }));
}, Yr = (r, t, e) => {
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
}, li = (r, t, e) => {
  if (!e.id || !e.name)
    return;
  const n = ai(e);
  if (n) {
    if (n === "Character") {
      oi(r, t, e);
      return;
    }
    if (n === "Term") {
      si(r, t, e);
      return;
    }
    if (n === "Faction") {
      ii(r, t, e);
      return;
    }
    if (n === "Event") {
      ci(r, t, e);
      return;
    }
    di(r, t, n, e);
  }
}, pi = (r, t, e) => {
  !e.sourceId || !e.targetId || !Ve(e.sourceType) || !Ve(e.targetType) || ei(e.relation) && (!Yr(r, e.sourceType, e.sourceId) || !Yr(r, e.targetType, e.targetId) || r.relationsForCreate.push({
    id: e.id || X(),
    projectId: t,
    sourceId: e.sourceId,
    sourceType: e.sourceType,
    targetId: e.targetId,
    targetType: e.targetType,
    relation: e.relation,
    attributes: te(e.attributes),
    sourceWorldEntityId: Nr(e.sourceType) && r.worldEntityIds.has(e.sourceId) ? e.sourceId : null,
    targetWorldEntityId: Nr(e.targetType) && r.worldEntityIds.has(e.targetId) ? e.targetId : null
  }));
}, ui = (r) => {
  const t = ni(r.baseCharacters, r.baseTerms);
  if (!r.graph)
    return t;
  for (const e of r.graph.nodes ?? [])
    li(t, r.projectId, e);
  for (const e of r.graph.edges ?? [])
    pi(t, r.projectId, e);
  return t;
}, hi = async (r) => {
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
    worldEntitiesForCreate: A,
    relationsForCreate: w,
    snapshotsForCreate: g
  } = r;
  return await h.getClient().$transaction(async (m) => {
    e && await m.project.delete({ where: { id: e } }), n && await m.project.delete({ where: { id: t } });
    const T = await m.project.create({
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
            autoSaveInterval: Ee
          }
        }
      },
      include: { settings: !0 }
    });
    return c.length > 0 && await m.chapter.createMany({ data: c }), d.length > 0 && await m.character.createMany({ data: d }), l.length > 0 && await m.term.createMany({ data: l }), i.length > 0 && await m.faction.createMany({ data: i }), p.length > 0 && await m.event.createMany({ data: p }), A.length > 0 && await m.worldEntity.createMany({ data: A }), w.length > 0 && await m.entityRelation.createMany({ data: w }), g.length > 0 && await m.snapshot.createMany({ data: g }), T;
  });
}, Bt = (r, t, e) => {
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
}, fi = async (r) => await h.getClient().project.findFirst({
  where: { projectPath: r },
  select: { id: !0, updatedAt: !0 }
}), gi = async (r, t) => {
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
    const e = await et(r, me, t);
    if (!e)
      throw new Error("MISSING_META");
    const n = vs.safeParse(JSON.parse(e));
    if (!n.success)
      throw new Error("INVALID_META");
    return { meta: n.data, luieCorrupted: !1 };
  } catch (e) {
    return t.warn("Failed to read .luie meta; treating as corrupted", {
      packagePath: r,
      error: e
    }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
  }
}, Ei = (r, t) => {
  const n = (typeof r.projectId == "string" ? r.projectId : void 0) ?? t?.id ?? X(), a = t && t.id !== n ? t.id : null;
  return { resolvedProjectId: n, legacyProjectId: a };
}, mi = (r = /* @__PURE__ */ new Date()) => {
  const t = (e) => String(e).padStart(2, "0");
  return `${r.getFullYear()}${t(r.getMonth() + 1)}${t(r.getDate())}-${t(r.getHours())}${t(r.getMinutes())}${t(r.getSeconds())}`;
}, Ai = async (r) => {
  const t = Zt(r), e = q, a = t.toLowerCase().endsWith(e) ? t.slice(0, t.length - e.length) : t, o = mi();
  let s = `${a}.recovered-${o}${e}`, c = 1;
  for (; ; )
    try {
      await R.access(s), s = `${a}.recovered-${o}-${c}${e}`, c += 1;
    } catch {
      return s;
    }
}, yi = async (r, t) => {
  const e = `${G}/${Ln}`, n = `${G}/${On}`, a = `${jt}/index.json`, o = `${G}/${Qt}`, s = `${G}/${Te}`, [c, d, l, i, p] = await Promise.all([
    et(r, e, t),
    et(r, n, t),
    et(r, a, t),
    et(r, o, t),
    et(r, s, t)
  ]), A = Bt(c, Us, {
    packagePath: r,
    entryPath: e,
    label: "world characters"
  }), w = Bt(d, Ms, {
    packagePath: r,
    entryPath: n,
    label: "world terms"
  }), g = Bt(l, xs, {
    packagePath: r,
    entryPath: a,
    label: "snapshot index"
  }), m = Bt(
    i,
    qe,
    {
      packagePath: r,
      entryPath: o,
      label: "world synopsis"
    }
  ), T = Bt(p, Bs, {
    packagePath: r,
    entryPath: s,
    label: "world graph"
  });
  return {
    characters: A?.characters ?? [],
    terms: w?.terms ?? [],
    snapshots: g?.snapshots ?? [],
    worldSynopsis: m && typeof m.synopsis == "string" ? m.synopsis : void 0,
    graph: T ? {
      nodes: T.nodes ?? [],
      edges: T.edges ?? [],
      updatedAt: T.updatedAt
    } : void 0
  };
}, Si = async (r) => {
  const t = bn(r.packagePath, "packagePath"), { meta: e, luieCorrupted: n, recoveryReason: a } = await gi(
    t,
    r.logger
  ), o = await fi(t);
  if (n) {
    if (!o)
      throw new f(
        E.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: t }
      );
    const I = await Ai(t);
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
  const { resolvedProjectId: s, legacyProjectId: c } = Ei(e, o), d = await h.getClient().project.findUnique({
    where: { id: s },
    select: { id: !0, updatedAt: !0 }
  }), l = e.chapters ?? [], i = await yi(t, r.logger), p = await Ks({
    packagePath: t,
    resolvedProjectId: s,
    chaptersMeta: l,
    readChapterEntry: async (I) => await et(t, I, r.logger)
  }), A = qs(
    s,
    i.characters
  ), w = Vs(s, i.terms), g = ui({
    projectId: s,
    graph: i.graph,
    baseCharacters: A,
    baseTerms: w
  }), m = Js({
    resolvedProjectId: s,
    snapshots: i.snapshots,
    validChapterIds: new Set(p.map((I) => I.id)),
    logger: r.logger
  }), T = await hi({
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
    snapshotsForCreate: m
  });
  return r.logger.info(".luie package hydrated", {
    projectId: T.id,
    chapterCount: p.length,
    characterCount: g.charactersForCreate.length,
    termCount: g.termsForCreate.length,
    factionCount: g.factionsForCreate.length,
    eventCount: g.eventsForCreate.length,
    worldEntityCount: g.worldEntitiesForCreate.length,
    relationCount: g.relationsForCreate.length,
    snapshotCount: m.length
  }), { project: T, conflict: "luie-newer" };
}, M = N("ProjectService");
class Ti {
  exportQueue = new as(
    ao,
    async (t) => {
      await this.exportProjectPackage(t);
    },
    M
  );
  toProjectPathKey(t) {
    const e = C.resolve(t);
    return process.platform === "win32" ? e.toLowerCase() : e;
  }
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
    }), e = /* @__PURE__ */ new Map();
    for (const c of t)
      if (!(typeof c.projectPath != "string" || c.projectPath.length === 0))
        try {
          const d = z(
            c.projectPath,
            "projectPath"
          ), l = this.toProjectPathKey(d), i = e.get(l) ?? [];
          i.push({
            id: String(c.id),
            projectPath: d,
            updatedAt: c.updatedAt instanceof Date ? c.updatedAt : new Date(String(c.updatedAt))
          }), e.set(l, i);
        } catch {
          continue;
        }
    const n = Array.from(e.values()).filter(
      (c) => c.length > 1
    ), a = await Promise.all(
      n.map(async (c) => {
        const d = [...c].sort(
          (p, A) => A.updatedAt.getTime() - p.updatedAt.getTime()
        ), l = d[0], i = d.slice(1);
        return await Promise.all(
          i.map(async (p) => {
            await h.getClient().project.update({
              where: { id: p.id },
              data: { projectPath: null }
            }), M.warn("Cleared duplicate projectPath from stale record", {
              keepProjectId: l.id,
              staleProjectId: p.id,
              projectPath: p.projectPath
            });
          })
        ), i.length;
      })
    ), o = n.length, s = a.reduce(
      (c, d) => c + d,
      0
    );
    return o > 0 && M.info("Project path duplicate reconciliation completed", {
      duplicateGroups: o,
      clearedRecords: s
    }), { duplicateGroups: o, clearedRecords: s };
  }
  async createProject(t) {
    try {
      M.info("Creating project", t);
      const e = Wr(t.projectPath);
      if (e) {
        const o = await Br(e);
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
              autoSaveInterval: Ee
            }
          }
        },
        include: {
          settings: !0
        }
      }), a = String(n.id);
      return M.info("Project created successfully", { projectId: a }), this.schedulePackageExport(a, "project:create"), n;
    } catch (e) {
      throw M.error("Failed to create project", e), new f(
        E.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        e
      );
    }
  }
  async openLuieProject(t) {
    try {
      return await Si({
        packagePath: t,
        logger: M,
        exportRecoveredPackage: async (e, n) => await this.exportProjectPackageWithOptions(e, {
          targetPath: n,
          worldSourcePath: null
        }),
        getProjectById: async (e) => await this.getProject(e)
      });
    } catch (e) {
      throw M.error("Failed to open .luie package", { packagePath: t, error: e }), e instanceof f ? e : new f(
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
      throw M.error("Failed to get project", e), e;
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
      return await Promise.all(
        t.map(async (n) => {
          const a = typeof n.projectPath == "string" ? n.projectPath : null;
          if (!!!(a && a.toLowerCase().endsWith(q)) || !a)
            return {
              ...n,
              pathMissing: !1
            };
          try {
            const s = z(
              a,
              "projectPath"
            );
            return await R.access(s), {
              ...n,
              pathMissing: !1
            };
          } catch {
            return {
              ...n,
              pathMissing: !0
            };
          }
        })
      );
    } catch (t) {
      throw M.error("Failed to get all projects", t), new f(
        E.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async updateProject(t) {
    try {
      const e = t.projectPath === void 0 ? void 0 : Wr(t.projectPath) ?? null;
      if (e) {
        const l = await Br(
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
      await ss({
        projectId: String(a.id),
        projectPath: c,
        previousTitle: o,
        nextTitle: s,
        logger: M
      });
      const d = String(a.id);
      return M.info("Project updated successfully", { projectId: d }), this.schedulePackageExport(d, "project:update"), a;
    } catch (e) {
      throw M.error("Failed to update project", e), new f(
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
    const e = typeof t == "string" ? { id: t, deleteFile: !1 } : { id: t.id, deleteFile: !!t.deleteFile };
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
      if (e.deleteFile) {
        const o = typeof a.projectPath == "string" ? a.projectPath : null;
        if (o && o.toLowerCase().endsWith(q)) {
          const s = z(
            o,
            "projectPath"
          );
          await R.rm(s, { force: !0, recursive: !0 });
        }
      }
      return _.addPendingProjectDelete({
        projectId: e.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), n = !0, await h.getClient().project.delete({
        where: { id: e.id }
      }), this.clearSyncBaselineForProject(e.id), M.info("Project deleted successfully", {
        projectId: e.id,
        deleteFile: e.deleteFile
      }), { success: !0 };
    } catch (a) {
      throw n && _.removePendingProjectDeletes([e.id]), M.error("Failed to delete project", a), a instanceof f ? a : new f(
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
      }), this.clearSyncBaselineForProject(t), M.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (e) {
      throw M.error("Failed to remove project from list", e), e instanceof f ? e : new f(
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
    return await Xs({
      projectId: t,
      options: e,
      logger: M
    });
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const F = new Ti(), x = N("CharacterService"), Hl = () => h.getClient();
function wi(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class _i {
  async createCharacter(t) {
    try {
      x.info("Creating character", t);
      const e = await h.getClient().character.create({
        data: {
          projectId: t.projectId,
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: t.attributes ? JSON.stringify(t.attributes) : null
        }
      });
      return x.info("Character created successfully", {
        characterId: e.id
      }), F.schedulePackageExport(t.projectId, "character:create"), e;
    } catch (e) {
      throw x.error("Failed to create character", e), new f(
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
      throw x.error("Failed to get character", e), e;
    }
  }
  async getAllCharacters(t) {
    try {
      return await h.getClient().character.findMany({
        where: { projectId: t },
        orderBy: { createdAt: "asc" }
      });
    } catch (e) {
      throw x.error("Failed to get all characters", e), new f(
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
      return x.info("Character updated successfully", {
        characterId: n.id
      }), F.schedulePackageExport(String(n.projectId), "character:update"), n;
    } catch (e) {
      throw x.error("Failed to update character", e), wi(e) ? new f(
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
      }), x.info("Character deleted successfully", { characterId: t }), n && F.schedulePackageExport(
        n,
        "character:delete"
      ), { success: !0 };
    } catch (e) {
      throw x.error("Failed to delete character", e), new f(
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
      return x.info("Character appearance recorded", {
        characterId: t.characterId,
        chapterId: t.chapterId
      }), e;
    } catch (e) {
      throw x.error("Failed to record character appearance", e), new f(
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
      throw x.error("Failed to get appearances by chapter", e), new f(
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
      }), x.info("First appearance updated", { characterId: t, chapterId: e }));
    } catch (n) {
      throw x.error("Failed to update first appearance", n), new f(
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
      throw x.error("Failed to search characters", n), new f(
        E.SEARCH_QUERY_FAILED,
        "Failed to search characters",
        { projectId: t, query: e },
        n
      );
    }
  }
}
const Qe = new _i(), B = N("TermService");
function Ii(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class Pi {
  async createTerm(t) {
    try {
      B.info("Creating term", t);
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
      return B.info("Term created successfully", { termId: e.id }), F.schedulePackageExport(t.projectId, "term:create"), e;
    } catch (e) {
      throw B.error("Failed to create term", e), new f(
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
      throw B.error("Failed to get term", e), e;
    }
  }
  async getAllTerms(t) {
    try {
      return await h.getClient().term.findMany({
        where: { projectId: t },
        orderBy: { term: "asc" }
      });
    } catch (e) {
      throw B.error("Failed to get all terms", e), new f(
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
      return B.info("Term updated successfully", { termId: n.id }), F.schedulePackageExport(String(n.projectId), "term:update"), n;
    } catch (e) {
      throw B.error("Failed to update term", e), Ii(e) ? new f(
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
      }), B.info("Term deleted successfully", { termId: t }), n && F.schedulePackageExport(n, "term:delete"), { success: !0 };
    } catch (e) {
      throw B.error("Failed to delete term", e), new f(
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
      return B.info("Term appearance recorded", {
        termId: t.termId,
        chapterId: t.chapterId
      }), e;
    } catch (e) {
      throw B.error("Failed to record term appearance", e), new f(
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
      throw B.error("Failed to get appearances by chapter", e), new f(
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
      }), B.info("First appearance updated", { termId: t, chapterId: e }));
    } catch (n) {
      throw B.error("Failed to update first appearance", n), new f(
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
      throw B.error("Failed to search terms", n), new f(
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
      throw B.error("Failed to get terms by category", n), new f(
        E.DB_QUERY_FAILED,
        "Failed to get terms by category",
        { projectId: t, category: e },
        n
      );
    }
  }
}
const Ze = new Pi(), Vt = (r) => {
  if (typeof r != "string") return null;
  const t = r.trim();
  if (!t) return null;
  const n = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return n.length > 0 ? n : null;
}, xn = (r) => {
  const t = r.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, tr = (r) => /^https?:\/\//i.test(r), Gn = (r) => {
  try {
    const t = new URL(r);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : xn(t.toString());
  } catch {
    return null;
  }
}, Ci = (r) => {
  let t = r.trim();
  if (!t) return null;
  if (tr(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, _e = (r) => {
  if (!r) return null;
  const t = Vt(r.url), e = Vt(r.anonKey);
  if (!t || !e) return null;
  const n = Gn(t);
  return n ? {
    url: n,
    anonKey: e
  } : null;
}, Hn = (r) => {
  const t = [], e = Vt(r?.url), n = Vt(r?.anonKey);
  e || t.push("SUPABASE_URL_REQUIRED"), n || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let a = null;
  return e && (a = Gn(e), a || t.push("SUPABASE_URL_INVALID")), n && n.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !a || !n ? {
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
}, gt = (r) => Vt(process.env[r]), Ri = "https://qzgyjlbpnxxpspoyibpt.supabase.co", Ni = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", Di = () => {
  const r = _e({
    url: Ri,
    anonKey: Ni
  });
  return r ? {
    ...r,
    source: "legacy"
  } : null;
}, Li = () => {
  const r = _e({
    url: gt("SUPABASE_URL") ?? gt("SUPADB_URL") ?? void 0,
    anonKey: gt("SUPABASE_ANON_KEY") ?? gt("SUPABASE_PUBLISHABLE_KEY") ?? gt("SUPADATABASE_API") ?? void 0
  });
  return r ? {
    ...r,
    source: "env"
  } : null;
}, Yn = () => {
  const r = _.getRuntimeSupabaseConfig(), t = _e(r);
  return t ? {
    ...t,
    source: "runtime"
  } : null;
}, Oi = () => {
  const r = gt("SUPADATABASE_API"), t = gt("SUPADATABASE_PRJ_ID");
  let e = null, n = null;
  if (r && tr(r))
    e = xn(r);
  else if (t) {
    const a = Ci(t);
    a && (e = `https://${a}.supabase.co`);
  }
  return r && !tr(r) && (n = r), !e || !n ? null : {
    url: e,
    anonKey: n,
    source: "legacy"
  };
}, mr = () => Li() ?? Yn() ?? Oi() ?? Di(), pt = () => {
  const r = mr();
  return r ? {
    url: r.url,
    anonKey: r.anonKey
  } : null;
}, Xt = () => {
  const r = pt();
  if (!r)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return r;
}, zn = () => mr()?.source ?? null, ji = () => _e(Yn()) ?? null, bi = (r) => {
  const t = Hn(r);
  return !t.valid || !t.normalized || _.setRuntimeSupabaseConfig(t.normalized), t;
}, Fi = (r) => Hn(r), Yl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: mr,
  getRuntimeSupabaseConfig: ji,
  getSupabaseConfig: pt,
  getSupabaseConfigOrThrow: Xt,
  getSupabaseConfigSource: zn,
  setRuntimeSupabaseConfig: bi,
  validateRuntimeSupabaseConfig: Fi
}, Symbol.toStringTag, { value: "Module" })), Ft = {
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
}, $t = N("SyncAuthService"), vi = "luie://auth/callback", er = "v2:safe:", rr = "v2:plain:", ge = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", Xn = (r) => r.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), Ui = () => Xn(Sa(48)), Mi = (r) => Xn(Ta("sha256").update(r).digest()), ae = () => {
  const r = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return r && r.length > 0 ? r : vi;
}, St = (r, t = "token") => {
  if (rt.isEncryptionAvailable()) {
    const n = rt.encryptString(r).toString("base64");
    return `${er}${n}`;
  }
  if (t === "token")
    throw new Error(ge);
  const e = Buffer.from(r, "utf-8").toString("base64");
  return `${rr}${e}`;
}, ki = (r, t = "token") => {
  const e = Buffer.from(r, "base64");
  if (rt.isEncryptionAvailable())
    try {
      const a = rt.decryptString(e);
      return {
        plain: a,
        migratedCipher: St(a, t)
      };
    } catch {
      const a = e.toString("utf-8");
      return {
        plain: a,
        migratedCipher: St(a, t)
      };
    }
  if (t === "token")
    throw new Error(ge);
  const n = e.toString("utf-8");
  return {
    plain: n,
    migratedCipher: St(n, t)
  };
}, oe = (r, t = "token") => {
  if (r.startsWith(er)) {
    if (!rt.isEncryptionAvailable())
      throw new Error(ge);
    const e = r.slice(er.length), n = Buffer.from(e, "base64");
    try {
      return {
        plain: rt.decryptString(n)
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
  if (r.startsWith(rr)) {
    if (t === "token" && !rt.isEncryptionAvailable())
      throw new Error(ge);
    const e = r.slice(rr.length), a = Buffer.from(e, "base64").toString("utf-8"), o = rt.isEncryptionAvailable() ? St(a, t) : void 0;
    return {
      plain: a,
      migratedCipher: o
    };
  }
  return ki(r, t);
};
class Wi {
  pendingPkce = null;
  pendingTtlMs = 600 * 1e3;
  clearPendingPkce() {
    this.pendingPkce = null, _.clearPendingSyncAuth();
  }
  storePendingPkce(t) {
    this.pendingPkce = t, _.setPendingSyncAuth({
      state: t.state,
      verifierCipher: St(t.verifier, "pending"),
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
      const n = oe(t.pendingAuthVerifierCipher, "pending");
      return n.migratedCipher && _.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: n.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: n.plain,
        createdAt: e,
        redirectUri: t.pendingAuthRedirectUri || ae()
      };
    } catch (n) {
      return $t.warn("Failed to decode pending OAuth verifier", { error: n }), this.clearPendingPkce(), null;
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
        this.pendingPkce.redirectUri = e || ae();
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
    return pt() !== null;
  }
  async startGoogleAuth() {
    const t = this.getActivePendingPkce();
    if (t) {
      const c = Date.now() - t.createdAt;
      throw $t.info("OAuth flow already in progress", { ageMs: c }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: e } = Xt(), n = Ui(), a = Mi(n), o = ae();
    this.storePendingPkce({
      verifier: n,
      createdAt: Date.now(),
      redirectUri: o
    });
    const s = new URL("/auth/v1/authorize", e);
    s.searchParams.set("provider", "google"), s.searchParams.set("redirect_to", o), s.searchParams.set("code_challenge", a), s.searchParams.set("code_challenge_method", "s256"), $t.info("Opening OAuth authorize URL", {
      authorizeBase: `${s.origin}${s.pathname}`,
      redirectUri: o,
      authorizeUrl: s.toString()
    }), await pa.openExternal(s.toString());
  }
  async completeOAuthCallback(t) {
    const e = this.getPendingPkce();
    if (!e)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - e.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const n = new URL(t), a = n.searchParams, o = n.hash.startsWith("#") ? n.hash.slice(1) : n.hash, s = new URLSearchParams(o), c = (g) => a.get(g) ?? s.get(g), d = c("state"), l = c("code"), i = c("error"), p = c("error_code"), A = c("error_description");
    if (i) {
      this.clearPendingPkce();
      const g = p ?? i, m = A ?? i;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${g}:${m}`
      );
    }
    if (!l)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_CODE_MISSING");
    if (e.state && (!d || d !== e.state))
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_STATE_MISMATCH");
    const w = await this.exchangeCodeForSession(
      l,
      e.verifier,
      e.redirectUri || ae()
    );
    return this.clearPendingPkce(), w;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const e = oe(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(e);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const e = oe(t.accessTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return $t.warn("Failed to decrypt sync access token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  getRefreshToken(t) {
    if (!t.refreshTokenCipher)
      return { token: null };
    try {
      const e = oe(t.refreshTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return $t.warn("Failed to decrypt sync refresh token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  async exchangeCodeForSession(t, e, n) {
    const { url: a, anonKey: o } = Xt(), s = new URL("/auth/v1/token", a);
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
    const { url: e, anonKey: n } = Xt(), a = new URL("/auth/v1/token", e);
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
      accessTokenCipher: St(e),
      refreshTokenCipher: St(n)
    };
  }
}
const J = new Wi(), Kn = () => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: []
}), nt = (r) => {
  if (!r) return 0;
  const t = Date.parse(r);
  return Number.isFinite(t) ? t : 0;
}, zr = (r, t, e, n) => {
  const a = r?.[t];
  if (!a) return 0;
  const o = e === "chapter" ? a.chapter : a.memo;
  return nt(o[n]);
}, Ie = (r, t) => nt(r.updatedAt) >= nt(t.updatedAt) ? [r, t] : [t, r], xt = (r, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const n of r)
    e.set(n.id, n);
  for (const n of t) {
    const a = e.get(n.id);
    if (!a) {
      e.set(n.id, n);
      continue;
    }
    const [o] = Ie(a, n);
    e.set(n.id, o);
  }
  return Array.from(e.values());
}, Bi = (r, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const n of r)
    e.set(`${n.projectId}:${n.docType}`, n);
  for (const n of t) {
    const a = `${n.projectId}:${n.docType}`, o = e.get(a);
    if (!o) {
      e.set(a, n);
      continue;
    }
    const [s] = Ie(o, n);
    e.set(a, s);
  }
  return Array.from(e.values());
}, Xr = (r, t, e, n, a, o) => {
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
    const [A, w] = Ie(
      p,
      i
    );
    let g = A;
    if (p.content !== i.content && (a ? a(p, i) : !0)) {
      const T = `${e}:${p.id}`, I = o?.[T];
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
        const b = n(w);
        s.set(b.id, b);
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
}, $i = (r, t, e) => {
  const n = r + t;
  return {
    chapters: r,
    memos: t,
    total: n,
    items: e.length > 0 ? e : void 0
  };
}, xi = (r) => {
  const t = /* @__PURE__ */ new Map();
  for (const s of r.tombstones) {
    const c = `${s.entityType}:${s.entityId}`, d = t.get(c);
    if (!d) {
      t.set(c, s);
      continue;
    }
    const [l] = Ie(d, s);
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
    const d = c.deletedAt, l = nt(c.updatedAt) > nt(s.updatedAt) ? c.updatedAt : s.updatedAt;
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
}, Gi = (r, t, e) => {
  const n = new Set(
    [...r.tombstones, ...t.tombstones].map(
      (l) => `${l.entityType}:${l.entityId}`
    )
  ), a = e?.baselinesByProjectId, o = Xr(
    r.chapters,
    t.chapters,
    "chapter",
    (l) => ({
      ...l,
      id: X(),
      title: `${l.title} (Conflict Copy)`,
      order: l.order + 1e4,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`chapter:${l.id}`) && !n.has(`chapter:${i.id}`) && (() => {
      const p = zr(
        a,
        l.projectId,
        "chapter",
        l.id
      );
      return p <= 0 ? !1 : nt(l.updatedAt) > p && nt(i.updatedAt) > p;
    })(),
    e?.conflictResolutions
  ), s = Xr(
    r.memos,
    t.memos,
    "memo",
    (l) => ({
      ...l,
      id: X(),
      title: `${l.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`memo:${l.id}`) && !n.has(`memo:${i.id}`) && (() => {
      const p = zr(
        a,
        l.projectId,
        "memo",
        l.id
      );
      return p <= 0 ? !1 : nt(l.updatedAt) > p && nt(i.updatedAt) > p;
    })(),
    e?.conflictResolutions
  ), c = [
    ...o.conflictItems,
    ...s.conflictItems
  ], d = {
    projects: xt(r.projects, t.projects),
    chapters: o.merged,
    characters: xt(r.characters, t.characters),
    terms: xt(r.terms, t.terms),
    worldDocuments: Bi(r.worldDocuments, t.worldDocuments),
    memos: s.merged,
    snapshots: xt(r.snapshots, t.snapshots),
    tombstones: xt(r.tombstones, t.tombstones)
  };
  return {
    merged: xi(d),
    conflicts: $i(
      o.conflicts,
      s.conflicts,
      c
    )
  };
}, Hi = [
  { docType: "synopsis", fileName: Qt },
  { docType: "plot", fileName: Ae },
  { docType: "drawing", fileName: ye },
  { docType: "mindmap", fileName: Se },
  { docType: "graph", fileName: Te }
], Yi = {
  synopsis: Qt,
  plot: Ae,
  drawing: ye,
  mindmap: Se,
  graph: Te,
  scrap: fr
}, zi = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], ut = (r, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof r == "string" && r.length > 0 ? r : r instanceof Date ? r.toISOString() : t, v = (r) => typeof r == "string" ? r : null, nr = (r, t = 0) => typeof r == "number" && Number.isFinite(r) ? r : t, Xi = (r, t, e) => {
  const n = v(e.id);
  if (!n) return null;
  const a = ut(e.updatedAt);
  return r.projects.push({
    id: n,
    userId: t,
    title: v(e.title) ?? "Untitled",
    description: v(e.description),
    createdAt: ut(e.createdAt),
    updatedAt: a
  }), {
    projectId: n,
    projectPath: v(e.projectPath),
    projectUpdatedAt: a
  };
}, Ki = (r, t, e, n) => {
  for (const a of n) {
    const o = v(a.id);
    if (!o) continue;
    const s = v(a.deletedAt);
    r.chapters.push({
      id: o,
      userId: t,
      projectId: e,
      title: v(a.title) ?? "Untitled",
      content: v(a.content) ?? "",
      synopsis: v(a.synopsis),
      order: nr(a.order),
      wordCount: nr(a.wordCount),
      createdAt: ut(a.createdAt),
      updatedAt: ut(a.updatedAt),
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
}, qi = (r, t, e, n) => {
  for (const a of n) {
    const o = v(a.id);
    o && r.characters.push({
      id: o,
      userId: t,
      projectId: e,
      name: v(a.name) ?? "Character",
      description: v(a.description),
      firstAppearance: v(a.firstAppearance),
      attributes: v(a.attributes),
      createdAt: ut(a.createdAt),
      updatedAt: ut(a.updatedAt)
    });
  }
}, Vi = (r, t, e, n) => {
  for (const a of n) {
    const o = v(a.id);
    o && r.terms.push({
      id: o,
      userId: t,
      projectId: e,
      term: v(a.term) ?? "Term",
      definition: v(a.definition),
      category: v(a.category),
      order: nr(a.order),
      firstAppearance: v(a.firstAppearance),
      createdAt: ut(a.createdAt),
      updatedAt: ut(a.updatedAt)
    });
  }
}, Ji = (r, t, e) => {
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
}, Kr = (r, t, e, n, a, o) => {
  r.worldDocuments.push({
    id: `${e}:${n}`,
    userId: t,
    projectId: e,
    docType: n,
    payload: a,
    updatedAt: Ss(a) ?? o
  });
}, ar = async (r, t, e) => {
  const n = Yi[t], a = `${G}/${n}`;
  let o;
  try {
    o = await et(r, a, e);
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
  const s = Un(o);
  return s === null ? (e.warn("Failed to parse .luie world document for sync; skipping doc", {
    projectPath: r,
    entryPath: a,
    docType: t
  }), null) : s;
}, Qi = (r, t, e, n, a) => {
  const o = $n(n);
  for (const s of o.memos)
    r.memos.push({
      id: s.id || X(),
      userId: t,
      projectId: e,
      title: s.title || "Memo",
      content: s.content,
      tags: s.tags,
      updatedAt: s.updatedAt || a
    });
}, Zi = async (r) => {
  for (const e of Hi) {
    const n = await ar(
      r.projectPath,
      e.docType,
      r.logger
    );
    n && Kr(
      r.bundle,
      r.userId,
      r.projectId,
      e.docType,
      n,
      r.updatedAtFallback
    );
  }
  const t = await ar(
    r.projectPath,
    "scrap",
    r.logger
  );
  U(t) && (Kr(
    r.bundle,
    r.userId,
    r.projectId,
    "scrap",
    t,
    r.updatedAtFallback
  ), Qi(
    r.bundle,
    r.userId,
    r.projectId,
    t,
    r.updatedAtFallback
  ));
}, tc = async (r, t, e, n) => {
  const a = Xi(r, t, e);
  if (!a) return;
  const { projectId: o, projectPath: s, projectUpdatedAt: c } = a;
  if (Ki(
    r,
    t,
    o,
    Array.isArray(e.chapters) ? e.chapters : []
  ), qi(
    r,
    t,
    o,
    Array.isArray(e.characters) ? e.characters : []
  ), Vi(
    r,
    t,
    o,
    Array.isArray(e.terms) ? e.terms : []
  ), s && s.toLowerCase().endsWith(q))
    try {
      const d = z(
        s,
        "projectPath"
      );
      await Zi({
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
}, ec = async (r) => {
  const t = Kn();
  for (const e of r.projectRows)
    await tc(
      t,
      r.userId,
      e,
      r.logger
    );
  return Ji(
    t,
    r.userId,
    r.pendingProjectDeletes
  ), t;
}, qr = async (r, t, e) => {
  const n = zi.filter(
    (a) => !r.has(a)
  );
  n.length !== 0 && await Promise.all(
    n.map(async (a) => {
      const o = await ar(
        t,
        a,
        e
      );
      o !== null && r.set(a, o);
    })
  );
}, Vr = (r) => {
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
}, rc = (r, t) => {
  const e = { ...r ?? {} };
  for (const n of t.items ?? [])
    e[n.projectId] = {
      state: "pending",
      lastSyncedAt: e[n.projectId]?.lastSyncedAt,
      reason: "SYNC_CONFLICT_DETECTED"
    };
  return Object.keys(e).length > 0 ? e : void 0;
}, qn = (r, t) => {
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
}, nc = (r, t, e, n) => {
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
}, ac = (r) => {
  const t = /* @__PURE__ */ new Set();
  for (const e of r.projects)
    e.deletedAt && t.add(e.id);
  for (const e of r.tombstones)
    e.entityType === "project" && (t.add(e.entityId), t.add(e.projectId));
  return t;
}, Jr = (r, t) => {
  for (const e of t)
    delete r[e];
}, oc = (r, t, e, n) => {
  const a = /* @__PURE__ */ new Set();
  for (const o of t.projects)
    o.deletedAt || e.has(o.id) || (a.add(o.id), r[o.id] = {
      chapter: {},
      memo: {},
      capturedAt: n
    });
  return a;
}, sc = (r, t, e, n, a) => {
  for (const o of t.chapters) {
    if (o.deletedAt || e.has(o.projectId) || !n.has(o.projectId)) continue;
    const s = r[o.projectId];
    s && (s.chapter[o.id] = o.updatedAt, s.capturedAt = a);
  }
}, ic = (r, t, e, n, a) => {
  for (const o of t.memos) {
    if (o.deletedAt || e.has(o.projectId) || !n.has(o.projectId)) continue;
    const s = r[o.projectId];
    s && (s.memo[o.id] = o.updatedAt, s.capturedAt = a);
  }
}, cc = (r, t, e, n) => {
  const a = {
    ...r.entityBaselinesByProjectId ?? {}
  };
  Jr(a, n);
  const o = ac(t);
  Jr(a, Array.from(o));
  const s = oc(
    a,
    t,
    o,
    e
  );
  return sc(a, t, o, s, e), ic(a, t, o, s, e), Object.keys(a).length > 0 ? a : void 0;
}, dc = async (r) => {
  const t = (o) => {
    o && _.setSyncSettings({
      accessTokenCipher: o
    });
  }, e = r.syncSettings.expiresAt ? Date.parse(r.syncSettings.expiresAt) <= Date.now() + 6e4 : !0, n = J.getAccessToken(r.syncSettings);
  if (n.errorCode && r.isAuthFatalMessage(n.errorCode))
    throw new Error(n.errorCode);
  t(n.migratedCipher);
  let a = n.token;
  if (e || !a) {
    const o = J.getRefreshToken(r.syncSettings);
    if (o.errorCode && r.isAuthFatalMessage(o.errorCode))
      throw new Error(o.errorCode);
    if (o.migratedCipher && _.setSyncSettings({
      refreshTokenCipher: o.migratedCipher
    }), !o.token)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const s = await J.refreshSession(r.syncSettings), c = _.setSyncSettings({
      provider: s.provider,
      userId: s.userId,
      email: s.email,
      expiresAt: s.expiresAt,
      accessTokenCipher: s.accessTokenCipher,
      refreshTokenCipher: s.refreshTokenCipher
    }), d = J.getAccessToken(c);
    if (d.errorCode && r.isAuthFatalMessage(d.errorCode))
      throw new Error(d.errorCode);
    t(d.migratedCipher), a = d.token;
  }
  if (!a)
    throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  return a;
}, lc = (r) => {
  const t = /* @__PURE__ */ new Set();
  for (const e of r.projects)
    e.deletedAt && t.add(e.id);
  for (const e of r.tombstones)
    e.entityType === "project" && (t.add(e.entityId), t.add(e.projectId));
  return t;
}, pc = async (r, t) => {
  for (const e of t)
    (await r.project.findUnique({
      where: { id: e },
      select: { id: !0 }
    }))?.id && await r.project.delete({ where: { id: e } });
}, uc = async (r, t, e) => {
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
            autoSaveInterval: Ee
          }
        }
      }
    });
  }
}, hc = async (r, t) => {
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
}, fc = async (r, t, e) => {
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
}, gc = async (r, t, e) => {
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
}, Ec = async (r, t, e) => {
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
}, mc = /* @__PURE__ */ new Set(["draft", "working", "locked"]), Ut = (r, t, e, n) => {
  if (typeof e != "string")
    return e;
  const a = Un(e);
  return a !== null ? a : (n.warn("Invalid sync world document payload string; using default payload", {
    projectId: r,
    docType: t
  }), null);
}, Ac = (r, t, e) => {
  const n = Ut(r, "synopsis", t, e);
  if (!U(n))
    return { synopsis: "", status: "draft" };
  const a = n.status, o = typeof a == "string" && mc.has(a) ? a : "draft", s = {
    synopsis: typeof n.synopsis == "string" ? n.synopsis : "",
    status: o
  };
  return typeof n.genre == "string" && (s.genre = n.genre), typeof n.targetAudience == "string" && (s.targetAudience = n.targetAudience), typeof n.logline == "string" && (s.logline = n.logline), typeof n.updatedAt == "string" && (s.updatedAt = n.updatedAt), s;
}, yc = (r, t, e) => {
  const n = Ut(r, "plot", t, e);
  return U(n) ? {
    columns: (Array.isArray(n.columns) ? n.columns : []).filter((s) => U(s)).map((s, c) => {
      const l = (Array.isArray(s.cards) ? s.cards : []).filter((i) => U(i)).map((i, p) => ({
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
}, Sc = (r, t, e) => {
  const n = Ut(r, "drawing", t, e);
  return U(n) ? {
    paths: Mn(n.paths),
    tool: Ts(n.tool),
    iconType: ws(n.iconType),
    color: typeof n.color == "string" ? n.color : void 0,
    lineWidth: typeof n.lineWidth == "number" ? n.lineWidth : void 0,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { paths: [] };
}, Tc = (r, t, e) => {
  const n = Ut(r, "mindmap", t, e);
  return U(n) ? {
    nodes: kn(n.nodes),
    edges: Wn(n.edges),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { nodes: [], edges: [] };
}, wc = (r, t, e) => {
  const n = Ut(r, "graph", t, e);
  if (!U(n))
    return { nodes: [], edges: [] };
  const a = Array.isArray(n.nodes) ? n.nodes.filter((s) => U(s)) : [], o = Array.isArray(n.edges) ? n.edges.filter((s) => U(s)) : [];
  return {
    nodes: a,
    edges: o,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  };
}, _c = (r, t, e, n, a) => {
  const o = Ut(r, "scrap", t, a);
  if (!U(o))
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
  const s = $n(o);
  return {
    memos: s.memos,
    updatedAt: typeof s.updatedAt == "string" ? s.updatedAt : n
  };
}, Ic = (r) => typeof r == "string" ? r : null, Pc = (r) => [...r].sort((t, e) => Date.parse(e.updatedAt) - Date.parse(t.updatedAt)), Vn = async (r) => {
  const {
    bundle: t,
    projectId: e,
    projectPath: n,
    localSnapshots: a,
    hydrateMissingWorldDocsFromPackage: o,
    logger: s
  } = r, c = t.projects.find((y) => y.id === e);
  if (!c || c.deletedAt) return null;
  const d = t.chapters.filter((y) => y.projectId === e && !y.deletedAt).sort((y, re) => y.order - re.order), l = t.characters.filter((y) => y.projectId === e && !y.deletedAt).map((y) => ({
    id: y.id,
    name: y.name,
    description: y.description ?? void 0,
    firstAppearance: y.firstAppearance ?? void 0,
    attributes: y.attributes ?? void 0
  })), i = t.terms.filter((y) => y.projectId === e && !y.deletedAt).sort((y, re) => y.order - re.order).map((y) => ({
    id: y.id,
    term: y.term,
    definition: y.definition ?? void 0,
    category: y.category ?? void 0,
    firstAppearance: y.firstAppearance ?? void 0
  })), p = /* @__PURE__ */ new Map();
  for (const y of Pc(t.worldDocuments))
    y.projectId !== e || y.deletedAt || p.has(y.docType) || p.set(y.docType, y.payload);
  await o(p, n);
  const A = t.memos.filter((y) => y.projectId === e && !y.deletedAt).map((y) => ({
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
  })), g = Ac(
    e,
    p.get("synopsis"),
    s
  ), m = yc(
    e,
    p.get("plot"),
    s
  ), T = Sc(
    e,
    p.get("drawing"),
    s
  ), I = Tc(
    e,
    p.get("mindmap"),
    s
  ), b = wc(
    e,
    p.get("graph"),
    s
  ), wt = _c(
    e,
    p.get("scrap"),
    A,
    c.updatedAt,
    s
  ), Mt = d.map((y) => ({
    id: y.id,
    title: y.title,
    order: y.order,
    file: `${vt}/${y.id}${we}`,
    updatedAt: y.updatedAt
  }));
  return {
    meta: {
      format: Dt,
      container: Lt,
      version: Ot,
      projectId: c.id,
      title: c.title,
      description: c.description ?? void 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      chapters: Mt
    },
    chapters: d.map((y) => ({
      id: y.id,
      content: y.content
    })),
    characters: l,
    terms: i,
    synopsis: g,
    plot: m,
    drawing: T,
    mindmap: I,
    graph: b,
    memos: wt,
    snapshots: w
  };
}, Cc = async (r) => {
  const { bundle: t, hydrateMissingWorldDocsFromPackage: e, logger: n } = r, a = r.buildProjectPackagePayload ?? Vn, o = [], s = [];
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
    }), l = Ic(d?.projectPath);
    if (!l || !l.toLowerCase().endsWith(q))
      continue;
    let i;
    try {
      i = z(l, "projectPath");
    } catch (A) {
      n.warn("Skipping .luie persistence for invalid projectPath", {
        projectId: c.id,
        projectPath: l,
        error: A
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
        await Er(i, p, n), s.push({
          projectId: c.id,
          projectPath: i
        });
      } catch (A) {
        o.push(c.id), n.error("Failed to persist merged bundle into .luie package", {
          projectId: c.id,
          projectPath: i,
          error: A
        });
      }
  }
  if (o.length > 0)
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${o.join(",")}`);
  return s;
}, Rc = async (r, t) => {
  if (r.length === 0) return [];
  const e = [];
  for (const n of r)
    try {
      await F.openLuieProject(n.projectPath);
    } catch (a) {
      e.push(n.projectId), t.error("Failed to recover DB cache from persisted .luie package", {
        projectId: n.projectId,
        projectPath: n.projectPath,
        error: a
      });
    }
  return e;
}, Nc = async (r) => Vn({
  bundle: r.bundle,
  projectId: r.projectId,
  projectPath: r.projectPath,
  localSnapshots: r.localSnapshots,
  hydrateMissingWorldDocsFromPackage: r.hydrateMissingWorldDocsFromPackage,
  logger: r.logger
}), Dc = async (r) => {
  const t = await Cc({
    bundle: r.bundle,
    hydrateMissingWorldDocsFromPackage: r.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: r.buildProjectPackagePayload,
    logger: r.logger
  }), e = h.getClient(), n = lc(r.bundle);
  try {
    await e.$transaction(async (a) => {
      const o = a;
      await pc(o, n), await uc(
        o,
        r.bundle.projects,
        n
      );
      for (const s of r.bundle.chapters)
        n.has(s.projectId) || await hc(o, s);
      await fc(
        o,
        r.bundle.characters,
        n
      ), await gc(
        o,
        r.bundle.terms,
        n
      ), await Ec(
        o,
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
    const s = await Rc(
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
}, Jn = N("SyncRepository"), P = (r) => typeof r == "string" ? r : null, ee = (r, t) => typeof r == "string" && r.length > 0 ? r : t, Q = (r, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof r == "string" && r.length > 0 ? r : r instanceof Date ? r.toISOString() : t, or = (r, t = 0) => typeof r == "number" && Number.isFinite(r) ? r : t, Lc = (r) => Array.isArray(r) ? r.filter((t) => typeof t == "string") : [], Qr = (r) => !!(r && typeof r == "object" && !Array.isArray(r)), Oc = (r) => {
  try {
    return JSON.parse(r);
  } catch {
    return r;
  }
}, Ar = (r) => typeof r == "string" ? Oc(r) : r ?? null, ft = (r) => {
  const t = {};
  for (const [e, n] of Object.entries(r))
    n !== void 0 && (t[e] = n);
  return t;
}, Zr = async (r, t, e) => {
  const n = await e.text();
  return e.status === 404 && n.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${r}_FAILED:${t}:${e.status}:${n}`);
}, jc = (r) => {
  const t = P(r.id), e = P(r.user_id);
  return !t || !e ? null : {
    id: t,
    userId: e,
    title: ee(r.title, "Untitled"),
    description: P(r.description),
    createdAt: Q(r.created_at),
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, bc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    title: ee(r.title, "Untitled"),
    content: P(r.content) ?? "",
    synopsis: P(r.synopsis),
    order: or(r.order),
    wordCount: or(r.word_count),
    createdAt: Q(r.created_at),
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Fc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    name: ee(r.name, "Character"),
    description: P(r.description),
    firstAppearance: P(r.first_appearance),
    attributes: Ar(r.attributes),
    createdAt: Q(r.created_at),
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, vc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    term: ee(r.term, "Term"),
    definition: P(r.definition),
    category: P(r.category),
    order: or(r.order),
    firstAppearance: P(r.first_appearance),
    createdAt: Q(r.created_at),
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Uc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id), a = P(r.doc_type);
  if (!t || !e || !n || !a || a !== "synopsis" && a !== "plot" && a !== "drawing" && a !== "mindmap" && a !== "scrap" && a !== "graph")
    return null;
  const o = Ar(r.payload), s = Qr(o) ? o : {};
  return Qr(o) || Jn.warn("Invalid world document payload from sync source; using empty payload", {
    docType: a,
    payloadType: o === null ? "null" : typeof o
  }), {
    id: t,
    userId: e,
    projectId: n,
    docType: a,
    payload: s,
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, Mc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id);
  return !t || !e || !n ? null : {
    id: t,
    userId: e,
    projectId: n,
    title: ee(r.title, "Memo"),
    content: P(r.content) ?? "",
    tags: Lc(r.tags),
    updatedAt: Q(r.updated_at),
    deletedAt: P(r.deleted_at)
  };
}, kc = (r) => {
  const t = P(r.id), e = P(r.user_id), n = P(r.project_id), a = P(r.entity_type), o = P(r.entity_id);
  return !t || !e || !n || !a || !o ? null : {
    id: t,
    userId: e,
    projectId: n,
    entityType: a,
    entityId: o,
    deletedAt: Q(r.deleted_at),
    updatedAt: Q(r.updated_at)
  };
};
class Wc {
  isConfigured() {
    return pt() !== null;
  }
  async fetchBundle(t, e) {
    const n = Kn(), [
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
    return n.projects = a.map(jc).filter((p) => p !== null), n.chapters = o.map(bc).filter((p) => p !== null), n.characters = s.map(Fc).filter((p) => p !== null), n.terms = c.map(vc).filter((p) => p !== null), n.worldDocuments = d.map(Uc).filter((p) => p !== null), n.memos = l.map(Mc).filter((p) => p !== null), n.tombstones = i.map(kc).filter((p) => p !== null), n;
  }
  async upsertBundle(t, e) {
    const n = e.projects.map(
      (i) => ft({
        id: i.id,
        user_id: i.userId,
        title: i.title,
        description: i.description ?? null,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), a = e.chapters.map(
      (i) => ft({
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
      (i) => ft({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        name: i.name,
        description: i.description ?? null,
        first_appearance: i.firstAppearance ?? null,
        attributes: Ar(i.attributes),
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), s = e.terms.map(
      (i) => ft({
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
      (i) => ft({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        doc_type: i.docType,
        payload: i.payload ?? {},
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), d = e.memos.map(
      (i) => ft({
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
      (i) => ft({
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
    const a = pt();
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
      const d = await Zr("FETCH", t, s);
      throw Jn.warn("Failed to fetch sync table", {
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
    const o = Xt(), s = await fetch(
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
      throw await Zr("UPSERT", t, s);
  }
}
const tn = new Wc(), Bc = async (r) => {
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
      tn.fetchBundle(a, e),
      r.buildLocalBundle(e)
    ]), { merged: c, conflicts: d } = Gi(s, o, {
      baselinesByProjectId: t.entityBaselinesByProjectId,
      conflictResolutions: t.pendingConflictResolutions
    });
    if (d.total > 0) {
      const g = new Set(
        (d.items ?? []).map((b) => `${b.type}:${b.id}`)
      ), m = Object.fromEntries(
        Object.entries(t.pendingConflictResolutions ?? {}).filter(
          (b) => g.has(b[0])
        )
      );
      _.setSyncSettings({
        pendingConflictResolutions: Object.keys(m).length > 0 ? m : void 0,
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
        projectStateById: rc(
          Vr(t.projectLastSyncedAtByProjectId),
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
    await r.applyMergedBundleToLocal(c), await tn.upsertBundle(a, c);
    const l = (/* @__PURE__ */ new Date()).toISOString(), i = nc(
      t,
      c,
      l,
      n
    ), p = cc(
      t,
      c,
      l,
      n
    ), A = _.setSyncSettings({
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
      ...r.toSyncStatusFromSettings(A, r.getStatus()),
      mode: "idle",
      health: "connected",
      degradedReason: void 0,
      inFlight: !1,
      conflicts: d,
      projectStateById: Vr(i),
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
        projectStateById: qn(r.getStatus().projectStateById, e),
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
}, en = (r, t) => {
  t && _.setSyncSettings(
    r === "access" ? { accessTokenCipher: t } : { refreshTokenCipher: t }
  );
}, $c = (r, t) => {
  const e = J.getAccessToken(r);
  if (e.errorCode && t(e.errorCode))
    return e.errorCode;
  en("access", e.migratedCipher);
  const n = J.getRefreshToken(r);
  return n.errorCode && t(n.errorCode) ? n.errorCode : (en("refresh", n.migratedCipher), !!e.token || !!n.token ? null : e.errorCode ?? n.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
}, it = N("SyncService"), xc = 1500, rn = {
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
}, Gc = (r) => {
  const t = r instanceof Error ? r.message : String(r);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, Hc = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], Oe = (r) => Hc.some((t) => r.includes(t)), It = (r, t) => ({
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
}), nn = (r) => Array.isArray(r) ? r.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [];
class Qn {
  status = rn;
  inFlightPromise = null;
  queuedRun = !1;
  autoSyncTimer = null;
  applyAuthFailureState(t, e) {
    const n = _.setSyncSettings({
      lastError: t
    });
    this.updateStatus({
      ...It(n, this.status),
      mode: "error",
      health: "degraded",
      degradedReason: t,
      inFlight: !1,
      queued: !1,
      projectStateById: qn(this.status.projectStateById, t),
      lastRun: e ?? this.status.lastRun
    });
  }
  initialize() {
    const t = _.getSyncSettings();
    if (this.status = It(t, this.status), !t.connected && J.hasPendingAuthFlow() && (this.status = {
      ...this.status,
      mode: "connecting"
    }), t.connected) {
      const e = $c(
        t,
        Oe
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
    if (!J.isConfigured())
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
      return await J.startGoogleAuth(), this.status;
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
      const e = await J.completeOAuthCallback(t), n = _.getSyncSettings(), a = _.setSyncSettings({
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
        ...It(a, this.status),
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
      ...It(t, rn),
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
    return this.updateStatus(It(e, this.status)), this.status;
  }
  async resolveConflict(t) {
    if (it.info("Sync conflict resolution requested", {
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
    }, xc));
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
    return await Bc({
      reason: t,
      getStatus: () => this.status,
      getQueuedRun: () => this.queuedRun,
      setQueuedRun: (e) => {
        this.queuedRun = e;
      },
      runQueuedSync: () => {
        this.runNow("queued");
      },
      normalizePendingProjectDeletes: nn,
      toSyncStatusFromSettings: It,
      ensureAccessToken: async (e) => await this.ensureAccessToken(e),
      buildLocalBundle: async (e) => await this.buildLocalBundle(e),
      applyMergedBundleToLocal: async (e) => await this.applyMergedBundleToLocal(e),
      countBundleRows: (e) => this.countBundleRows(e),
      updateStatus: (e) => this.updateStatus(e),
      applyAuthFailureState: (e, n) => this.applyAuthFailureState(e, n),
      isAuthFatalMessage: Oe,
      toSyncErrorMessage: Gc,
      logRunFailed: (e, n) => {
        it.error("Sync run failed", { error: e, reason: n });
      }
    });
  }
  async ensureAccessToken(t) {
    return await dc({
      syncSettings: t,
      isAuthFatalMessage: Oe
    });
  }
  async buildLocalBundle(t) {
    const e = h.getClient(), n = nn(
      _.getSyncSettings().pendingProjectDeletes
    ), a = await e.project.findMany({
      include: {
        chapters: !0,
        characters: !0,
        terms: !0
      }
    });
    return await ec({
      userId: t,
      pendingProjectDeletes: n,
      projectRows: a,
      logger: it
    });
  }
  async buildProjectPackagePayload(t, e, n, a) {
    return await Nc({
      bundle: t,
      projectId: e,
      projectPath: n,
      localSnapshots: a,
      hydrateMissingWorldDocsFromPackage: async (o, s) => await qr(o, s, it),
      logger: it
    });
  }
  async applyMergedBundleToLocal(t) {
    await Dc({
      bundle: t,
      hydrateMissingWorldDocsFromPackage: async (e, n) => await qr(e, n, it),
      buildProjectPackagePayload: async (e) => await this.buildProjectPackagePayload(
        e.bundle,
        e.projectId,
        e.projectPath,
        e.localSnapshots
      ),
      logger: it
    });
  }
  countBundleRows(t) {
    return t.projects.length + t.chapters.length + t.characters.length + t.terms.length + t.worldDocuments.length + t.memos.length + t.snapshots.length + t.tombstones.length;
  }
  updateStatus(t) {
    this.status = {
      ...this.status,
      ...t
    }, this.broadcastStatus();
  }
  broadcastStatus() {
    const t = tt.getAllWindows();
    for (const e of t)
      if (!e.isDestroyed())
        try {
          e.webContents.send(Ft.SYNC_STATUS_CHANGED, this.status);
        } catch (n) {
          it.warn("Failed to broadcast sync status", { error: n });
        }
  }
}
const Jt = new Qn(), zl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: Qn,
  syncService: Jt
}, Symbol.toStringTag, { value: "Module" })), sr = N("GeminiProxyClient"), Zn = (r, t) => {
  const e = new Error(t);
  return e.status = r, e;
}, Yc = (r) => {
  const t = process.env.LUIE_GEMINI_PROXY_URL?.trim();
  return t && t.length > 0 ? t : `${r.url}/functions/v1/gemini-proxy`;
}, ta = (r) => {
  if (typeof r == "string") {
    const t = r.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}, ea = (r) => {
  if (!Array.isArray(r))
    return null;
  const t = r[0];
  if (!t || typeof t != "object") return null;
  const e = t.content;
  if (!e || typeof e != "object") return null;
  const n = e.parts;
  if (!Array.isArray(n)) return null;
  const a = n.map(
    (o) => o && typeof o == "object" ? ta(o.text) : null
  ).filter((o) => !!o);
  return a.length === 0 ? null : a.join(`
`).trim();
}, zc = () => {
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
}, Xc = async (r, t) => {
  const e = await Jt.getEdgeAccessToken(), n = Yc(t), a = await fetch(n, {
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
    throw sr.warn("gemini-proxy request failed", {
      endpoint: n,
      status: a.status,
      body: c
    }), Zn(
      a.status,
      `GEMINI_PROXY_FAILED:${a.status}:${c}`
    );
  }
  const o = await a.json(), s = ta(o.text) ?? ea(o.candidates);
  if (!s)
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  return s;
}, Kc = async (r, t) => {
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
    throw Zn(
      n.status,
      `GEMINI_LOCAL_FAILED:${n.status}:${a}`
    );
  const s = ea(
    o && typeof o == "object" ? o.candidates : null
  );
  if (!s)
    throw new Error("GEMINI_LOCAL_EMPTY_RESPONSE");
  return s;
}, qc = async (r) => {
  const t = pt(), e = zc(), n = [];
  if (t)
    try {
      return await Xc(r, t);
    } catch (a) {
      const o = a instanceof Error ? a.message : String(a);
      n.push(`edge:${o}`), sr.warn("Edge Gemini path failed; falling back to local path", {
        message: o
      });
    }
  else
    n.push("edge:SUPABASE_NOT_CONFIGURED");
  if (e)
    try {
      return await Kc(r, e);
    } catch (a) {
      const o = a instanceof Error ? a.message : String(a);
      n.push(`local:${o}`), sr.warn("Local Gemini path failed", { message: o });
    }
  else
    n.push("local:GEMINI_LOCAL_API_KEY_MISSING");
  throw new Error(`GEMINI_ALL_PATHS_FAILED:${n.join("|")}`);
}, ra = (r) => r.replace(/\s+/g, " ").trim(), Vc = (r, t = "본문 발췌") => {
  const e = ra(r);
  return e ? e.slice(0, Math.min(120, e.length)) : t;
}, Jc = (r, t) => {
  const e = ra(r);
  if (!e) return t;
  const n = Math.min(e.length - 1, t.length + 1);
  if (n <= 0 || n >= e.length) return t;
  const a = e.slice(n, Math.min(e.length, n + 120)).trim();
  return a.length > 0 ? a : t;
}, Xl = (r) => {
  const t = r.manuscript.content, e = Vc(t), n = Jc(t, e);
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
}, Qc = (r, t) => {
  const e = `${r} ${t.join(" ")}`;
  return /(길드|협회|조직|단체|학교|대학|회사|연맹)/.test(e) ? "organization" : /(성|탑|궁|마을|도시|숲|산|강|거리|던전)/.test(e) ? "location" : /(검|창|방패|반지|목걸이|무기|유물|artifact|아이템)/i.test(e) ? "item" : /(님|씨|군|양|왕|황제|공주|기사|마법사|선생|대장)/.test(e) ? "character" : "concept";
}, an = (r, t) => {
  const e = Qc(r, t), n = t.length >= 3 ? "main" : t.length >= 2 ? "supporting" : "minor";
  return {
    name: r,
    entityType: e,
    importance: n,
    summary: `${r}와(과) 관련된 ${e} 요소로 추정됩니다. 문맥 기반 로컬 분류 결과입니다.`,
    confidence: t.length >= 2 ? 0.58 : 0.42,
    reasoning: "Edge/원격 모델 호출 실패로 로컬 규칙 기반 추정치를 사용했습니다."
  };
}, Zc = u.object({
  name: u.string(),
  entityType: u.enum(["character", "location", "organization", "item", "concept"]),
  importance: u.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: u.string(),
  confidence: u.number().min(0).max(1).default(0.5),
  reasoning: u.string().optional()
}), td = `
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
`.trim(), ed = {
  type: ht.OBJECT,
  properties: {
    name: { type: ht.STRING },
    entityType: {
      type: ht.STRING,
      enum: ["character", "location", "organization", "item", "concept"]
    },
    importance: {
      type: ht.STRING,
      enum: ["main", "supporting", "minor", "unknown"]
    },
    summary: { type: ht.STRING },
    confidence: { type: ht.NUMBER },
    reasoning: { type: ht.STRING }
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
}, se = N("AutoExtractService"), rd = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
class nd {
  timers = /* @__PURE__ */ new Map();
  paragraphCache = /* @__PURE__ */ new Map();
  scheduleAnalysis(t, e, n) {
    const a = `${e}:${t}`, o = this.timers.get(a);
    o && clearTimeout(o);
    const s = setTimeout(() => {
      this.analyzeChapter(t, e, n).catch((c) => {
        se.error("Auto extraction failed", { chapterId: t, projectId: e, error: c });
      });
    }, no);
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
    Et.setKnownCharacters(o.map((i) => i.name)), Et.setKnownTerms(s.map((i) => i.term));
    const c = a.flatMap((i) => Et.extractNouns(i)), d = Et.filterByFrequency(c, 2).filter((i) => !o.some((p) => p.name === i)).filter((i) => !s.some((p) => p.term === i)), l = Array.from(new Set(d)).slice(0, 10);
    if (l.length !== 0) {
      for (const i of l) {
        const p = a.filter((w) => w.includes(i)).slice(0, 3), A = await this.classifyWithGemini(i, p);
        A && (A.entityType === "character" ? await Qe.createCharacter({
          projectId: e,
          name: A.name,
          description: A.summary,
          attributes: {
            importance: A.importance,
            confidence: A.confidence,
            source: "auto-extract"
          }
        }) : await Ze.createTerm({
          projectId: e,
          term: A.name,
          definition: A.summary,
          category: A.entityType
        }));
      }
      se.info("Auto extraction completed", {
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

${td}

---

이제 아래 문맥에서 "${t}"를 분석하세요.

${n}

[고유명사]: ${t}

JSON 형식으로만 답하세요:`;
    try {
      const o = await qc({
        model: rd,
        prompt: a,
        responseMimeType: "application/json",
        responseSchema: ed
      }), s = Zc.safeParse(JSON.parse(o));
      return s.success ? s.data : (se.warn("Gemini response parse failed", s.error), an(t, e));
    } catch (o) {
      return se.warn("Gemini classification failed; using local deterministic fallback", {
        error: o
      }), an(t, e);
    }
  }
}
const ad = new nd(), on = N("ChapterKeywords");
async function od(r, t, e) {
  try {
    const n = await h.getClient().character.findMany({
      where: { projectId: e },
      select: { id: !0, name: !0 }
    }), a = await h.getClient().term.findMany({
      where: { projectId: e },
      select: { id: !0, term: !0 }
    }), o = n.map((d) => d.name), s = a.map((d) => d.term);
    Et.setKnownCharacters(o), Et.setKnownTerms(s);
    const c = Et.extractFromText(t);
    for (const d of c.filter((l) => l.type === "character")) {
      const l = n.find((i) => i.name === d.text);
      l && (await Qe.recordAppearance({
        characterId: String(l.id),
        chapterId: r,
        position: d.position,
        context: sn(t, d.position, Rr)
      }), await Qe.updateFirstAppearance(String(l.id), r));
    }
    for (const d of c.filter((l) => l.type === "term")) {
      const l = a.find((i) => i.term === d.text);
      l && (await Ze.recordAppearance({
        termId: String(l.id),
        chapterId: r,
        position: d.position,
        context: sn(t, d.position, Rr)
      }), await Ze.updateFirstAppearance(String(l.id), r));
    }
    on.info("Keyword tracking completed", {
      chapterId: r,
      characterCount: c.filter((d) => d.type === "character").length,
      termCount: c.filter((d) => d.type === "term").length
    });
  } catch (n) {
    on.error("Failed to track keyword appearances", n);
  }
}
function sn(r, t, e) {
  const n = Math.max(0, t - e), a = Math.min(r.length, t + e);
  return r.substring(n, a);
}
const k = N("ChapterService");
function cn(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class sd {
  async resolveProjectTitle(t) {
    if (!t) return "Unknown";
    const e = await h.getClient().project.findUnique({
      where: { id: t },
      select: { title: !0 }
    });
    return typeof e?.title == "string" ? String(e.title) : "Unknown";
  }
  async writeSuspiciousContentDump(t) {
    if (Kt()) return;
    const e = await this.resolveProjectTitle(t.projectId), n = bt(e, "Unknown"), a = C.join(
      S.getPath("userData"),
      hr,
      n || "Unknown",
      "_suspicious"
    );
    await Y.mkdir(a, { recursive: !0 });
    const o = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), s = C.join(a, `${t.filePrefix}-${t.chapterId}-${o}.txt`);
    return await Y.writeFile(s, t.content, "utf8"), s;
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
      throw k.warn("Empty content save blocked.", { chapterId: t.id, oldLen: o, dumpPath: d }), new f(
        E.VALIDATION_FAILED,
        "Empty content save blocked",
        { chapterId: t.id, oldLen: o }
      );
    }
    if (!Kt() && o > 1e3 && s < o * 0.1) {
      const d = await this.writeSuspiciousContentDump({
        projectId: c,
        chapterId: t.id,
        filePrefix: "dump",
        content: t.content
      });
      throw k.warn("Suspicious large deletion detected. Save blocked.", {
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
    n.content = t.content, n.wordCount = t.content.length, c && (await od(t.id, t.content, c), ad.scheduleAnalysis(t.id, c, t.content));
  }
  async createChapter(t) {
    try {
      if (!t.title || t.title.trim().length === 0)
        throw new f(
          E.REQUIRED_FIELD_MISSING,
          "Chapter title is required",
          { input: t }
        );
      k.info("Creating chapter", t);
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
      return k.info("Chapter created successfully", { chapterId: o.id }), F.schedulePackageExport(t.projectId, "chapter:create"), o;
    } catch (e) {
      throw k.error("Failed to create chapter", e), e instanceof f ? e : new f(
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
      throw k.error("Failed to get chapter", e), e;
    }
  }
  async getAllChapters(t) {
    try {
      return await h.getClient().chapter.findMany({
        where: { projectId: t, deletedAt: null },
        orderBy: { order: "asc" }
      });
    } catch (e) {
      throw k.error("Failed to get all chapters", e), new f(
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
      return k.info("Chapter updated successfully", {
        chapterId: a.id
      }), F.schedulePackageExport(
        String(a.projectId),
        "chapter:update"
      ), a;
    } catch (e) {
      throw k.error("Failed to update chapter", e), e instanceof f ? e : cn(e) ? new f(
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
      return e?.projectId && await Z.forgetChapter(
        String(e.projectId),
        t
      ), k.info("Chapter soft-deleted successfully", { chapterId: t }), e?.projectId && F.schedulePackageExport(
        String(e.projectId),
        "chapter:delete"
      ), n;
    } catch (e) {
      throw k.error("Failed to delete chapter", e), new f(
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
      throw k.error("Failed to get deleted chapters", e), new f(
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
      return k.info("Chapter restored successfully", { chapterId: t }), F.schedulePackageExport(String(e.projectId), "chapter:restore"), n;
    } catch (e) {
      throw k.error("Failed to restore chapter", e), cn(e) ? new f(
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
      return await h.getClient().chapter.delete({ where: { id: t } }), e?.projectId && await Z.forgetChapter(
        String(e.projectId),
        t
      ), k.info("Chapter purged successfully", { chapterId: t }), e?.projectId && F.schedulePackageExport(
        String(e.projectId),
        "chapter:purge"
      ), { success: !0 };
    } catch (e) {
      throw k.error("Failed to purge chapter", e), new f(
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
      ), k.info("Chapters reordered successfully", { projectId: t }), F.schedulePackageExport(t, "chapter:reorder"), { success: !0 };
    } catch (n) {
      throw k.error("Failed to reorder chapters", n), new f(
        E.DB_TRANSACTION_FAILED,
        "Failed to reorder chapters",
        { projectId: t },
        n
      );
    }
  }
}
const na = new sd(), id = N("AtomicWrite"), cd = pr(En), dd = pr(wa);
async function de(r, t) {
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
    id.warn("Failed to fsync directory", { dir: e, error: o });
  }
}
async function dn(r, t) {
  const e = await cd(Buffer.from(t, "utf8"));
  await de(r, e);
}
async function aa(r) {
  const t = await R.readFile(r);
  return (t.length >= 2 && t[0] === 31 && t[1] === 139 ? await dd(t) : t).toString("utf8");
}
const At = N("SnapshotArtifacts"), ld = pr(En), pd = /-([0-9a-fA-F-]{36})\.snap$/;
async function ud(r) {
  const t = await aa(r);
  return JSON.parse(t);
}
function oa(r) {
  const t = z(r, "projectPath"), e = t.toLowerCase(), n = q.toLowerCase();
  return e.endsWith(n) ? C.dirname(t) : t;
}
function sa(r, t) {
  return C.join(r, ".luie", jt, t);
}
const hd = (r) => C.basename(r).match(pd)?.[1] ?? null, ia = async (r, t) => {
  let e;
  try {
    e = await R.readdir(r, { withFileTypes: !0 });
  } catch (n) {
    if (n?.code === "ENOENT") return;
    At.warn("Failed to read snapshot artifact directory", { rootDir: r, error: n });
    return;
  }
  for (const n of e) {
    const a = C.join(r, n.name);
    if (n.isDirectory()) {
      await ia(a, t);
      continue;
    }
    !n.isFile() || !n.name.endsWith(".snap") || t.push(a);
  }
}, fd = async () => {
  const r = /* @__PURE__ */ new Set([C.join(S.getPath("userData"), hr)]), t = await h.getClient().project.findMany({
    select: { id: !0, title: !0, projectPath: !0 }
  });
  for (const e of t) {
    if (!e.projectPath) continue;
    const n = bt(e.title ?? "", String(e.id));
    try {
      const a = oa(e.projectPath);
      r.add(sa(a, n)), r.add(C.join(a, `backup${n}`));
    } catch (a) {
      At.warn("Skipping snapshot artifact roots for invalid projectPath", {
        projectId: e.id,
        projectPath: e.projectPath,
        error: a
      });
    }
  }
  return Array.from(r);
};
async function ln(r) {
  const t = r?.snapshotIds && r.snapshotIds.length > 0 ? new Set(r.snapshotIds) : null, e = typeof r?.minAgeMs == "number" && r.minAgeMs > 0 ? r.minAgeMs : 0, n = Date.now(), a = t ? await h.getClient().snapshot.findMany({
    where: { id: { in: Array.from(t) } },
    select: { id: !0 }
  }) : await h.getClient().snapshot.findMany({
    select: { id: !0 }
  }), o = new Set(a.map((i) => i.id)), s = await fd(), c = [];
  for (const i of s)
    await ia(i, c);
  let d = 0, l = 0;
  for (const i of c) {
    const p = hd(i);
    if (p && !(t && !t.has(p)) && (d += 1, !o.has(p))) {
      if (e > 0)
        try {
          const A = await R.stat(i);
          if (n - A.mtimeMs < e)
            continue;
        } catch {
          continue;
        }
      try {
        await R.unlink(i), l += 1;
      } catch (A) {
        At.warn("Failed to delete orphan snapshot artifact", {
          artifactPath: i,
          snapshotId: p,
          error: A
        });
      }
    }
  }
  return { scanned: d, deleted: l };
}
async function gd(r, t) {
  At.info("Preparing snapshot artifact", {
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
  e.projectPath || At.warn("Project path missing for snapshot; skipping local package snapshot", {
    snapshotId: r,
    projectId: t.projectId
  });
  const n = {
    meta: {
      version: $a,
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
  }, a = JSON.stringify(n), o = await ld(Buffer.from(a, "utf8")), c = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${r}.snap`;
  let d, l;
  const i = bt(e.title ?? "", String(e.id));
  let p = null;
  if (e.projectPath)
    try {
      p = oa(e.projectPath);
      const g = sa(p, i);
      await R.mkdir(g, { recursive: !0 }), d = C.join(g, c), await de(d, o);
    } catch (g) {
      At.warn("Skipping project-local snapshot artifact write for invalid projectPath", {
        snapshotId: r,
        projectId: e.id,
        projectPath: e.projectPath,
        error: g
      });
    }
  const A = C.join(S.getPath("userData"), hr, i);
  await R.mkdir(A, { recursive: !0 });
  const w = C.join(A, c);
  if (await de(w, o), p) {
    const g = C.join(p, `backup${i}`);
    await R.mkdir(g, { recursive: !0 }), l = C.join(g, c), await de(l, o);
  }
  At.info("Full snapshot saved", {
    snapshotId: r,
    projectId: e.id,
    projectPath: e.projectPath,
    localPath: d,
    backupPath: w,
    projectBackupPath: l
  });
}
const Ed = async (r, t, e) => {
  try {
    const n = C.join(
      S.getPath("userData"),
      Ye,
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
}, md = async (r) => {
  const t = bt(r || "Recovered Snapshot", "Recovered Snapshot"), e = S.getPath("documents");
  let n = C.join(
    e,
    `${t || "Recovered Snapshot"}${q}`
  );
  try {
    await R.access(n);
    const a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    n = C.join(
      e,
      `${t || "Recovered Snapshot"}-${a}${q}`
    );
  } catch {
  }
  return n;
}, Ad = (r) => {
  const t = r;
  return {
    autoSave: typeof t?.autoSave == "boolean" ? t.autoSave : !0,
    autoSaveInterval: typeof t?.autoSaveInterval == "number" ? t.autoSaveInterval : Ee
  };
}, yd = async (r, t) => {
  const { autoSave: e, autoSaveInterval: n } = Ad(r.data.settings), a = r.data.project;
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
      }), d = c.id, l = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), A = r.data.chapters.map((m, T) => {
        const I = X();
        return l.set(m.id, I), {
          id: I,
          projectId: d,
          title: m.title,
          content: m.content ?? "",
          synopsis: m.synopsis ?? null,
          order: typeof m.order == "number" ? m.order : T,
          wordCount: m.wordCount ?? 0
        };
      }), w = r.data.characters.map((m) => {
        const T = X();
        return i.set(m.id, T), {
          id: T,
          projectId: d,
          name: m.name,
          description: m.description ?? null,
          firstAppearance: m.firstAppearance ?? null,
          attributes: typeof m.attributes == "string" ? m.attributes : m.attributes ? JSON.stringify(m.attributes) : null
        };
      }), g = r.data.terms.map((m) => {
        const T = X();
        return p.set(m.id, T), {
          id: T,
          projectId: d,
          term: m.term,
          definition: m.definition ?? null,
          category: m.category ?? null,
          firstAppearance: m.firstAppearance ?? null
        };
      });
      return A.length > 0 && await s.chapter.createMany({
        data: A
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
}, Sd = (r) => ({
  format: Dt,
  container: Lt,
  version: Ot,
  projectId: r.id,
  title: r.title,
  description: r.description ?? void 0,
  createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
  updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt)
}), Td = async (r, t, e) => {
  try {
    await h.getClient().project.delete({ where: { id: r } });
  } catch (n) {
    e.error("Failed to rollback project after snapshot .luie import failure", {
      projectId: r,
      filePath: t,
      error: n
    });
  }
}, wd = async (r, t) => {
  const e = await ud(r), n = await md(e.data.project.title), a = await yd(e, n), { created: o, chapterIdMap: s, characterIdMap: c, termIdMap: d } = a, l = Sd(o);
  try {
    await Er(
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
    throw await Td(o.id, r, t), i;
  }
  return o;
}, D = N("SnapshotService"), _d = 3e4, Id = 1e4;
class Pd {
  orphanArtifactIds = /* @__PURE__ */ new Set();
  orphanCleanupTimer = null;
  scheduleOrphanArtifactCleanup() {
    this.orphanCleanupTimer || (this.orphanCleanupTimer = setTimeout(() => {
      this.orphanCleanupTimer = null, this.cleanupOrphanArtifacts("idle").catch((t) => {
        D.warn("Idle orphan artifact cleanup failed", { error: t });
      });
    }, _d), typeof this.orphanCleanupTimer.unref == "function" && this.orphanCleanupTimer.unref());
  }
  queueOrphanArtifactCleanup(t) {
    this.orphanArtifactIds.add(t), this.scheduleOrphanArtifactCleanup();
  }
  async cleanupOrphanArtifacts(t = "idle") {
    if (t === "startup") {
      const n = await ln();
      return D.info("Startup orphan artifact cleanup completed", n), n;
    }
    const e = Array.from(this.orphanArtifactIds);
    if (e.length === 0)
      return { scanned: 0, deleted: 0 };
    for (const n of e)
      this.orphanArtifactIds.delete(n);
    try {
      const n = await ln({
        snapshotIds: e,
        minAgeMs: Id
      });
      return D.info("Queued orphan artifact cleanup completed", {
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
    const e = X();
    try {
      const n = t.type ?? "AUTO", a = t.content.length;
      D.info("Creating snapshot", {
        snapshotId: e,
        projectId: t.projectId,
        chapterId: t.chapterId,
        hasContent: !!t.content,
        descriptionLength: t.description?.length ?? 0,
        type: n
      }), await gd(e, t);
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
      return D.info("Snapshot created successfully", { snapshotId: o.id }), F.schedulePackageExport(t.projectId, "snapshot:create"), this.scheduleOrphanArtifactCleanup(), o;
    } catch (n) {
      throw this.queueOrphanArtifactCleanup(e), await Ed(t, D, n), D.error("Failed to create snapshot", {
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
      throw D.error("Failed to get snapshot", e), new f(
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
      throw D.error("Failed to get snapshots by project", e), new f(
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
      throw D.error("Failed to get snapshots by chapter", e), new f(
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
      }), this.queueOrphanArtifactCleanup(t), D.info("Snapshot deleted successfully", { snapshotId: t }), e?.projectId && F.schedulePackageExport(
        String(e.projectId),
        "snapshot:delete"
      ), { success: !0 };
    } catch (e) {
      throw D.error("Failed to delete snapshot", e), new f(
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
      }), D.info("Snapshot restored successfully", {
        snapshotId: t,
        chapterId: e.chapterId
      }), F.schedulePackageExport(String(e.projectId), "snapshot:restore"), {
        success: !0,
        chapterId: e.chapterId
      };
    } catch (e) {
      throw D.error("Failed to restore snapshot", e), e instanceof f ? e : new f(
        E.SNAPSHOT_RESTORE_FAILED,
        "Failed to restore snapshot",
        { snapshotId: t },
        e
      );
    }
  }
  async importSnapshotFile(t) {
    try {
      D.info("Importing snapshot file", { filePath: t });
      const e = await wd(t, D);
      return D.info("Snapshot imported successfully", {
        projectId: e.id,
        filePath: t
      }), e;
    } catch (e) {
      throw D.error("Failed to import snapshot file", e), new f(
        E.SNAPSHOT_RESTORE_FAILED,
        "Failed to import snapshot file",
        { filePath: t },
        e
      );
    }
  }
  async deleteOldSnapshots(t, e = Nn) {
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
      return D.info("Old snapshots deleted successfully", {
        projectId: t,
        deletedCount: a.length
      }), { success: !0, deletedCount: a.length };
    } catch (n) {
      throw D.error("Failed to delete old snapshots", n), new f(
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
        const p = i.createdAt instanceof Date ? i.createdAt : new Date(String(i.createdAt)), A = e - p.getTime();
        if (A < a)
          continue;
        if (A < o) {
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
      return D.info("Snapshots pruned", {
        projectId: t,
        deletedCount: c.length
      }), { success: !0, deletedCount: c.length };
    } catch (s) {
      throw D.error("Failed to prune snapshots", s), new f(
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
      throw D.error("Failed to get latest snapshot", e), new f(
        E.DB_QUERY_FAILED,
        "Failed to get latest snapshot",
        { chapterId: t },
        e
      );
    }
  }
}
const K = new Pd();
class Cd {
  constructor(t) {
    this.logger = t;
  }
  getMirrorBaseDir(t, e) {
    return C.join(
      S.getPath("userData"),
      Ye,
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
      await dn(o, s);
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
      await dn(s, c);
      const d = (await R.readdir(a)).filter(
        (l) => l.endsWith(".snap") && l !== "latest.snap"
      );
      if (d.length > ue) {
        const i = d.sort().slice(0, d.length - ue);
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
        const l = await K.getLatestSnapshot(s.chapterId), i = l?.createdAt ? new Date(String(l.createdAt)).getTime() : 0, p = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
        if (p && p <= i)
          continue;
        await K.createSnapshot({
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
    const t = C.join(S.getPath("userData"), Ye), e = [];
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
      const e = await aa(t), n = JSON.parse(e);
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
const Rd = async (r, t, e) => {
  try {
    if (e) {
      const a = await na.getChapter(e);
      await K.createSnapshot({
        projectId: r,
        chapterId: String(a.id ?? e),
        content: String(a.content ?? ""),
        description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      });
    } else
      await K.createSnapshot({
        projectId: r,
        content: JSON.stringify({ timestamp: Date.now() }),
        description: `프로젝트 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      });
    await K.deleteOldSnapshots(r, Nn), t.info("Snapshot created", { projectId: r, chapterId: e });
  } catch (n) {
    t.error("Failed to create snapshot", n);
  }
}, Nd = async (r, t, e) => {
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
}, Dd = async (r, t, e) => {
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
      await K.createSnapshot({
        projectId: o.projectId,
        chapterId: o.chapterId,
        content: o.content,
        description: `긴급 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      }), a += 1;
    } catch (s) {
      e.error("Emergency snapshot failed", s);
    }
  return e.info("Emergency flush completed", { mirrored: n, snapshots: a }), { mirrored: n, snapshots: a };
}, Ld = async (r) => {
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
      await K.createSnapshot({
        projectId: t,
        chapterId: e,
        content: n,
        description: `긴급 마이크로 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
      }), await c(t, e, n);
    } catch (A) {
      d.warn("Failed to create emergency micro snapshot", { error: A, chapterId: e });
    }
  }
}, Od = async (r) => {
  const { jobs: t, writeTimestampedMirror: e, logger: n } = r;
  for (; t.length > 0; ) {
    const a = t.shift();
    if (a)
      try {
        await K.createSnapshot({
          projectId: a.projectId,
          chapterId: a.chapterId,
          content: a.content,
          description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        }), await K.deleteOldSnapshots(a.projectId, Za), await e(a.projectId, a.chapterId, a.content);
      } catch (o) {
        n.error("Failed to create snapshot", o);
      }
  }
}, $ = N("AutoSaveManager");
class Rt extends ha {
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
  mirrorStore = new Cd($);
  constructor() {
    super(), this.on("error", (t) => {
      $.warn("Auto-save error event", t);
    }), this.startCleanupInterval();
  }
  static getInstance() {
    return Rt.instance || (Rt.instance = new Rt()), Rt.instance;
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
      $.warn("Failed to purge chapter mirrors", { projectId: t, chapterId: e, error: o });
    }
  }
  setConfig(t, e) {
    this.configs.set(t, e), e.enabled ? (this.startAutoSave(t), this.startSnapshotSchedule(t)) : this.stopAutoSave(t);
  }
  getConfig(t) {
    return this.configs.get(t) || {
      enabled: !0,
      interval: Rn,
      debounceMs: Ga
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
      $.info("Skipping auto-save for missing/deleted chapter", {
        chapterId: t,
        projectId: n
      });
      return;
    }
    this.pendingSaves.set(t, { chapterId: t, content: e, projectId: n }), this.lastSaveAt.set(t, Date.now()), await this.mirrorStore.writeLatestMirror(n, t, e), Ld({
      projectId: n,
      chapterId: t,
      content: e,
      maxLength: Xa,
      minIntervalMs: Ka,
      lastSnapshotAtByChapterKey: this.lastEmergencySnapshotAt,
      writeTimestampedMirror: (d, l, i) => this.mirrorStore.writeTimestampedMirror(
        d,
        l,
        i
      ),
      logger: $
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
        await na.updateChapter({
          id: e.chapterId,
          content: e.content
        }), this.pendingSaves.delete(t), this.saveTimers.delete(t), this.lastSaveAt.delete(t), this.emit("saved", { chapterId: t }), await this.mirrorStore.writeLatestMirror(e.projectId, e.chapterId, e.content), this.maybeEnqueueSnapshot(e.projectId, e.chapterId, e.content), $.info("Auto-save completed", { chapterId: t });
      } catch (n) {
        if (bo(n) && n.code === E.VALIDATION_FAILED) {
          $.warn("Auto-save blocked by validation; writing safety snapshot", {
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
            ), await K.createSnapshot({
              projectId: e.projectId,
              chapterId: e.chapterId,
              content: e.content,
              description: `Safety snapshot (블로킹된 저장) ${(/* @__PURE__ */ new Date()).toLocaleString()}`
            });
          } catch (a) {
            $.error("Failed to write safety snapshot after validation block", a);
          }
          this.pendingSaves.delete(t), this.saveTimers.delete(t), this.lastSaveAt.delete(t), this.emit("save-blocked", { chapterId: t, error: n });
          return;
        }
        $.error("Auto-save failed", n), this.listenerCount("error") > 0 && this.emit("error", { chapterId: t, error: n });
      }
  }
  // ─── Snapshot Scheduling (Time Machine style) ────────────────────────────
  maybeEnqueueSnapshot(t, e, n) {
    const a = `${t}:${e}`, o = Date.now(), s = this.lastSnapshotAt.get(a) ?? 0;
    if (o - s < Ne || n.length < to) return;
    const c = this.hashContent(n);
    if (this.lastSnapshotHash.get(a) === c) return;
    const l = this.lastSnapshotLength.get(a) ?? 0;
    if (l > 0) {
      const i = Math.abs(n.length - l);
      if (i / l < eo && i < ro) return;
    }
    this.lastSnapshotAt.set(a, o), this.lastSnapshotHash.set(a, c), this.lastSnapshotLength.set(a, n.length), this.snapshotQueue.push({ projectId: t, chapterId: e, content: n }), this.snapshotProcessing || (this.snapshotProcessing = !0, setImmediate(async () => {
      try {
        await Od({
          jobs: this.snapshotQueue,
          writeTimestampedMirror: (i, p, A) => this.mirrorStore.writeTimestampedMirror(
            i,
            p,
            A
          ),
          logger: $
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
        const o = Array.from(this.pendingSaves.entries()).filter(
          ([, s]) => s.projectId === t
        );
        for (const [s] of o)
          await this.performSave(s);
      });
    }, e.interval);
    typeof a.unref == "function" && a.unref(), this.intervalTimers.set(t, a), $.info("Auto-save started", { projectId: t, interval: e.interval });
  }
  stopAutoSave(t) {
    const e = this.intervalTimers.get(t);
    e && (clearInterval(e), this.intervalTimers.delete(t), $.info("Auto-save stopped", { projectId: t }));
    const n = this.snapshotTimers.get(t);
    n && (clearInterval(n), this.snapshotTimers.delete(t), $.info("Snapshot schedule stopped", { projectId: t }));
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
    }, Ne);
    typeof n.unref == "function" && n.unref(), this.snapshotTimers.set(t, n), $.info("Snapshot schedule started", {
      projectId: t,
      interval: Ne
    });
  }
  async createSnapshot(t, e) {
    await Rd(t, $, e);
  }
  // ─── Flush (quit / critical) ──────────────────────────────────────────────
  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    await Nd(
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
    this.criticalFlushPromise = Dd(
      Array.from(this.pendingSaves.values()),
      (t, e, n) => this.mirrorStore.writeLatestMirror(t, e, n),
      $
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
    }, za);
    typeof t.unref == "function" && t.unref();
  }
  cleanupOldEntries() {
    const t = Date.now();
    for (const [e, n] of Array.from(this.lastSaveAt.entries()))
      if (t - n > Ya) {
        const a = this.saveTimers.get(e);
        a && clearTimeout(a), this.saveTimers.delete(e), this.pendingSaves.delete(e), this.lastSaveAt.delete(e);
      }
  }
  clearProject(t) {
    this.stopAutoSave(t), this.configs.delete(t);
  }
}
const Z = Rt.getInstance(), L = N("WindowManager"), je = "#f4f4f5";
class jd {
  mainWindow = null;
  startupWizardWindow = null;
  resolveWindowIconPath() {
    const t = [
      V(process.resourcesPath, "icon.png"),
      V(process.resourcesPath, "build", "icons", "icon.png")
    ], e = [
      V(S.getAppPath(), "build", "icons", "icon.png"),
      V(S.getAppPath(), "assets", "public", "luie.png")
    ], n = S.isPackaged ? t : e;
    for (const a of n)
      if (ga(a))
        return a;
  }
  getTitleBarOptions() {
    return process.platform !== "darwin" ? {} : {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: lo, y: po }
    };
  }
  getMenuBarMode() {
    return _.getMenuBarMode();
  }
  shouldShowMenuBar() {
    return process.platform !== "darwin" ? !1 : this.getMenuBarMode() === "visible";
  }
  applyMenuBarMode(t) {
    const e = this.shouldShowMenuBar();
    if (process.platform === "darwin") {
      if (e) {
        t.isSimpleFullScreen() && t.setSimpleFullScreen(!1), t.isFullScreen() && t.setFullScreen(!1), t.setMenuBarVisibility(!0);
        return;
      }
      t.setMenuBarVisibility(!1), t.isSimpleFullScreen() || t.setSimpleFullScreen(!0);
      return;
    }
    t.setAutoHideMenuBar(!0), t.setMenuBarVisibility(!1);
  }
  createMainWindow(t = {}) {
    const e = t.deferShow === !0;
    if (this.mainWindow)
      return this.mainWindow;
    const n = _a({
      defaultWidth: oo,
      defaultHeight: so
    }), a = this.resolveWindowIconPath();
    this.mainWindow = new tt({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      minWidth: io,
      minHeight: co,
      title: Cr,
      show: !1,
      backgroundColor: je,
      ...a ? { icon: a } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: V(st, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.mainWindow), n.manage(this.mainWindow);
    const o = S.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !o && process.env.NODE_ENV !== "production";
    if (c)
      L.info("Loading development server", { url: s, isPackaged: o }), this.mainWindow.loadURL(s).catch((d) => {
        L.error("Failed to load development renderer URL", { url: s, error: d });
      }), this.mainWindow.webContents.openDevTools({ mode: "detach" });
    else {
      const d = V(st, "../renderer/index.html");
      L.info("Loading production renderer", { path: d, isPackaged: o }), this.mainWindow.loadFile(d).catch((l) => {
        L.error("Failed to load production renderer file", { path: d, error: l });
      });
    }
    return this.mainWindow.once("ready-to-show", () => {
      this.mainWindow && !this.mainWindow.isDestroyed() && (L.info("Main window ready to show", { deferShow: e }), e || this.showMainWindow());
    }), this.mainWindow.on("closed", () => {
      this.mainWindow = null, L.info("Main window closed");
    }), L.info("Main window created", { isPackaged: o, useDevServer: c }), this.mainWindow;
  }
  createStartupWizardWindow() {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed())
      return this.startupWizardWindow.focus(), this.startupWizardWindow;
    const t = this.resolveWindowIconPath(), e = S.isPackaged, n = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", a = !e && process.env.NODE_ENV !== "production";
    if (this.startupWizardWindow = new tt({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: !0,
      title: `${Cr} Setup`,
      backgroundColor: "#0b1020",
      ...t ? { icon: t } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !0 } : {},
      webPreferences: {
        preload: V(st, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.startupWizardWindow), a) {
      const o = `${n}/#startup-wizard`;
      L.info("Loading startup wizard (dev)", { wizardUrl: o }), this.startupWizardWindow.loadURL(o).catch((s) => {
        L.error("Failed to load startup wizard (dev)", { wizardUrl: o, error: s });
      });
    } else {
      const o = V(st, "../renderer/index.html");
      L.info("Loading startup wizard (prod)", { path: o }), this.startupWizardWindow.loadFile(o, { hash: "startup-wizard" }).catch((s) => {
        L.error("Failed to load startup wizard (prod)", { path: o, error: s });
      });
    }
    return this.startupWizardWindow.on("closed", () => {
      this.startupWizardWindow = null, L.info("Startup wizard window closed");
    }), this.startupWizardWindow;
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
  // ─── Export Window ────────────────────────────────────────────────────────
  exportWindow = null;
  createExportWindow(t) {
    if (this.exportWindow)
      return this.exportWindow.focus(), this.exportWindow;
    const e = 1200, n = 900, a = this.resolveWindowIconPath();
    this.exportWindow = new tt({
      width: e,
      height: n,
      minWidth: 1e3,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: je,
      ...a ? { icon: a } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: V(st, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.exportWindow);
    const o = S.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !o && process.env.NODE_ENV !== "production", d = `?chapterId=${t}`, l = "#export";
    if (c) {
      const i = `${s}/${d}${l}`;
      L.info("Loading export window (dev)", { url: i }), this.exportWindow.loadURL(i).catch((p) => {
        L.error("Failed to load export window (dev)", { url: i, error: p });
      });
    } else {
      const i = V(st, "../renderer/index.html");
      L.info("Loading export window (prod)", { path: i }), this.exportWindow.loadFile(i, { hash: "export", search: d }).catch((p) => {
        L.error("Failed to load export window (prod)", {
          path: i,
          hash: "export",
          search: d,
          error: p
        });
      });
    }
    return this.exportWindow.on("closed", () => {
      this.exportWindow = null, L.info("Export window closed");
    }), c && this.exportWindow.webContents.openDevTools({ mode: "detach" }), this.exportWindow;
  }
  // ─── World Graph Window ───────────────────────────────────────────────────
  worldGraphWindow = null;
  createWorldGraphWindow() {
    if (this.worldGraphWindow)
      return this.worldGraphWindow.focus(), this.worldGraphWindow;
    const t = 1200, e = 800, n = this.resolveWindowIconPath();
    this.worldGraphWindow = new tt({
      width: t,
      height: e,
      minWidth: 1e3,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: je,
      ...n ? { icon: n } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: V(st, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.worldGraphWindow);
    const a = S.isPackaged, o = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", s = !a && process.env.NODE_ENV !== "production", c = "#world-graph";
    if (s) {
      const d = `${o}/${c}`;
      L.info("Loading world graph window (dev)", { url: d }), this.worldGraphWindow.loadURL(d).catch((l) => {
        L.error("Failed to load world graph window (dev)", { url: d, error: l });
      });
    } else {
      const d = V(st, "../renderer/index.html");
      L.info("Loading world graph window (prod)", { path: d }), this.worldGraphWindow.loadFile(d, { hash: "world-graph" }).catch((l) => {
        L.error("Failed to load world graph window (prod)", {
          path: d,
          hash: "world-graph",
          error: l
        });
      });
    }
    return this.worldGraphWindow.on("closed", () => {
      this.worldGraphWindow = null, L.info("World graph window closed");
    }), s && this.worldGraphWindow.webContents.openDevTools({ mode: "detach" }), this.worldGraphWindow;
  }
  applyMenuBarModeToAllWindows() {
    const t = tt.getAllWindows();
    for (const e of t)
      e.isDestroyed() || this.applyMenuBarMode(e);
  }
}
const H = new jd(), Kl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: H
}, Symbol.toStringTag, { value: "Module" })), bd = () => {
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
}, Fd = (r) => {
  if (process.platform !== "darwin" || r === "hidden") {
    Pe.setApplicationMenu(null);
    return;
  }
  Pe.setApplicationMenu(Pe.buildFromTemplate(bd()));
}, Yt = N("BootstrapLifecycle");
let yt = { isReady: !1 }, Gt = null;
const vd = (r) => r instanceof Error && r.message ? r.message : "Failed to initialize database", Ud = () => {
  for (const r of tt.getAllWindows())
    if (!r.isDestroyed())
      try {
        r.webContents.send(Ft.APP_BOOTSTRAP_STATUS_CHANGED, yt);
      } catch (t) {
        Yt.warn("Failed to broadcast bootstrap status", t);
      }
}, be = (r) => {
  yt = r, Ud();
}, ql = () => yt, ca = async () => {
  if (yt.isReady)
    return yt;
  if (Gt)
    return Gt;
  be({ isReady: !1 });
  const r = An({
    scope: "bootstrap",
    event: "bootstrap.ensure-ready"
  });
  return Gt = h.initialize().then(() => (be({ isReady: !0 }), r.complete(Yt, {
    isReady: !0
  }), Yt.info("Bootstrap completed"), yt)).catch((t) => {
    const e = vd(t);
    return be({ isReady: !1, error: e }), r.fail(Yt, t, {
      isReady: !1
    }), Yt.error("Bootstrap failed", t), yt;
  }).finally(() => {
    Gt = null;
  }), Gt;
}, Md = N("StartupReadinessService"), Fe = "startup:wizard-completed", da = () => (/* @__PURE__ */ new Date()).toISOString(), O = (r, t, e, n = !0) => ({
  key: r,
  ok: t,
  blocking: n,
  detail: e,
  checkedAt: da()
});
class kd {
  events = new Ia();
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
    _.setStartupCompletedAt(da());
    const e = await this.getReadiness();
    return this.events.emit(Fe, e), e;
  }
  onWizardCompleted(t) {
    return this.events.on(Fe, t), () => {
      this.events.off(Fe, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = rt.isEncryptionAvailable();
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
    const t = S.getPath("userData"), e = W.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await Sr(t, { recursive: !0 }), await Tr(e, "ok", { encoding: "utf8" }), O("dataDirRW", !0, t);
    } catch (n) {
      return O(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(n)}`
      );
    } finally {
      await wr(e).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = S.getPath("documents"), e = W.join(t, Dn), n = W.join(e, ".startup-probe");
    try {
      return await Sr(e, { recursive: !0 }), await gn(e, Be.R_OK | Be.W_OK), await Tr(n, "ok", { encoding: "utf8" }), O("defaultLuiePath", !0, e);
    } catch (a) {
      return O(
        "defaultLuiePath",
        !1,
        `${e}: ${this.toErrorMessage(a)}`
      );
    } finally {
      await wr(n).catch(() => {
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
      const t = pt(), e = zn();
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
      const e = J.getAccessToken(t), n = J.getRefreshToken(t);
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
      const o = pt();
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
      return Md.warn("Startup session check failed", { error: t }), O("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const ve = new kd(), pn = 1500, Wd = 8e3, Bd = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), $d = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), xd = (r) => r ? process.env.LUIE_DEV_CSP === "1" ? $d() : null : Bd(), Gd = (r) => r.startsWith("file://"), Hd = async (r, t, e) => {
  r.error("Renderer process crashed", {
    killed: e,
    webContentsId: t.id
  });
  try {
    await Z.flushCritical(), r.info("Emergency save completed after crash");
  } catch (a) {
    r.error("Failed to save during crash recovery", a);
  }
  const n = H.getMainWindow();
  n && !n.isDestroyed() && ((await We.showMessageBox(n, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (H.closeMainWindow(), setTimeout(() => {
    H.createMainWindow();
  }, 500)) : S.quit());
}, Yd = async (r) => {
  const t = Date.now(), e = await ca();
  if (!e.isReady) {
    r.error("App bootstrap did not complete", e);
    return;
  }
  try {
    await Z.flushMirrorsToSnapshots("startup-recovery"), K.pruneSnapshotsAllProjects(), K.cleanupOrphanArtifacts("startup");
  } catch (n) {
    r.warn("Snapshot recovery/pruning skipped", n);
  }
  try {
    await F.reconcileProjectPathDuplicates();
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
}, zd = (r, t = {}) => {
  const e = t.startupStartedAtMs ?? Date.now();
  S.whenReady().then(async () => {
    r.info("App is ready", {
      startupElapsedMs: Date.now() - e
    });
    const n = Ro(), a = xd(n);
    let o = !1, s = !1, c = !1, d = null;
    const l = (m) => {
      if (!o && (o = !0, H.showMainWindow(), r.info("Startup checkpoint: renderer ready", {
        reason: m,
        startupElapsedMs: Date.now() - e
      }), r.info("Startup checkpoint: main window shown", {
        reason: m,
        startupElapsedMs: Date.now() - e
      }), !!t.onFirstRendererReady))
        try {
          t.onFirstRendererReady();
        } catch (T) {
          r.warn("Startup hook failed: onFirstRendererReady", T);
        }
    }, i = (m) => {
      s || (s = !0, r.info("Deferred startup maintenance scheduled", {
        reason: m,
        delayMs: pn
      }), setTimeout(() => {
        Yd(r);
      }, pn));
    }, p = (m) => {
      if (c) return;
      c = !0, r.info("Starting main window flow", {
        reason: m,
        startupElapsedMs: Date.now() - e
      }), H.createMainWindow({ deferShow: !0 }), r.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - e
      });
      const T = Date.now();
      ca().then((I) => {
        r.info("Startup checkpoint: bootstrap ready", {
          isReady: I.isReady,
          bootstrapElapsedMs: Date.now() - T,
          startupElapsedMs: Date.now() - e
        }), I.isReady || r.error("App bootstrap did not complete", I);
      }).catch((I) => {
        r.error("App bootstrap did not complete", I);
      }), d && clearTimeout(d), d = setTimeout(() => {
        o || l("fallback-timeout"), i("fallback-timeout");
      }, Wd);
    };
    n && yr.defaultSession.webRequest.onBeforeSendHeaders((m, T) => {
      T({
        requestHeaders: {
          ...m.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), yr.defaultSession.webRequest.onHeadersReceived((m, T) => {
      const I = {
        ...m.responseHeaders
      };
      n && (I["Access-Control-Allow-Origin"] = ["*"], I["Access-Control-Allow-Headers"] = ["*"], I["Access-Control-Allow-Methods"] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]), a && !Gd(m.url) && (I["Content-Security-Policy"] = [a]), T({ responseHeaders: I });
    }), S.on("web-contents-created", (m, T) => {
      T.on(
        "did-fail-load",
        (I, b, wt, Mt, y) => {
          r.error("Renderer failed to load", {
            errorCode: b,
            errorDescription: wt,
            validatedURL: Mt,
            isMainFrame: y,
            startupElapsedMs: Date.now() - e
          });
        }
      ), T.on("did-finish-load", () => {
        const I = Date.now() - e;
        r.info("Renderer finished load", {
          url: T.getURL(),
          startupElapsedMs: I
        }), T.getType() === "window" && H.isMainWindowWebContentsId(T.id) && (l("did-finish-load"), i("did-finish-load"));
      }), T.on("console-message", (I) => {
        const { level: b, message: wt, lineNumber: Mt, sourceId: y } = I;
        (b === "error" ? 3 : b === "warning" ? 2 : b === "info" ? 1 : 0) < 2 || r.warn("Renderer console message", {
          level: b,
          message: wt,
          line: Mt,
          sourceId: y
        });
      }), T.on("render-process-gone", (I, b) => {
        Hd(r, T, b.reason === "killed");
      });
    });
    const A = Date.now(), { registerIPCHandlers: w } = await import("./index-6tHHrYSS.js");
    w(), r.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - A,
      startupElapsedMs: Date.now() - e
    }), Fd(_.getMenuBarMode());
    const g = await ve.getReadiness();
    r.info("Startup readiness evaluated", {
      mustRunWizard: g.mustRunWizard,
      reasons: g.reasons,
      completedAt: g.completedAt
    }), g.mustRunWizard ? (H.createStartupWizardWindow(), r.info("Startup wizard requested before main window", {
      reasons: g.reasons
    })) : p("readiness-pass"), ve.onWizardCompleted((m) => {
      r.info("Startup wizard completion received", {
        mustRunWizard: m.mustRunWizard,
        reasons: m.reasons
      }), !m.mustRunWizard && (H.closeStartupWizardWindow(), p("wizard-complete"));
    }), S.on("activate", () => {
      tt.getAllWindows().length === 0 && ve.getReadiness().then((m) => {
        if (m.mustRunWizard) {
          H.createStartupWizardWindow();
          return;
        }
        p("activate");
      });
    });
  });
}, Xd = "crash-reports", un = 100;
let hn = !1;
const Ue = (r) => r.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), ir = (r, t = 0) => {
  if (r == null) return r;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof r == "string" || typeof r == "number" || typeof r == "boolean")
    return typeof r == "string" ? Ue(r) : r;
  if (typeof r == "bigint" || typeof r == "symbol") return r.toString();
  if (typeof r == "function") return "[Function]";
  if (r instanceof Error)
    return {
      name: r.name,
      message: Ue(r.message),
      stack: r.stack ? Ue(r.stack) : void 0
    };
  if (Array.isArray(r))
    return r.slice(0, 50).map((e) => ir(e, t + 1));
  if (typeof r == "object") {
    const n = Object.entries(r).slice(0, 100), a = {};
    for (const [o, s] of n)
      a[o] = ir(s, t + 1);
    return a;
  }
  return String(r);
}, Kd = () => W.join(S.getPath("userData"), Xd), qd = async (r, t) => {
  const e = await Nt.readdir(r, { withFileTypes: !0 }), n = await Promise.all(
    e.filter((o) => o.isFile() && o.name.endsWith(".json")).map(async (o) => {
      const s = W.join(r, o.name), c = await Nt.stat(s);
      return { fullPath: s, mtimeMs: c.mtimeMs };
    })
  );
  if (n.length <= un) return;
  n.sort((o, s) => s.mtimeMs - o.mtimeMs);
  const a = n.slice(un);
  await Promise.all(
    a.map(async (o) => {
      try {
        await Nt.rm(o.fullPath, { force: !0 });
      } catch (s) {
        t.warn("Failed to remove stale crash report", { error: s, path: o.fullPath });
      }
    })
  );
}, Vd = async (r, t, e) => {
  const n = Kd();
  await Nt.mkdir(n, { recursive: !0 });
  const a = (/* @__PURE__ */ new Date()).toISOString(), o = X(), s = `${a.replace(/[:.]/g, "-")}-${t}-${o}.json`, c = W.join(n, s), d = `${c}.tmp`, l = {
    id: o,
    timestamp: a,
    type: t,
    appVersion: S.getVersion(),
    isPackaged: S.isPackaged,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    processType: process.type,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    payload: ir(e)
  };
  await Nt.writeFile(d, JSON.stringify(l, null, 2), "utf-8"), await Nt.rename(d, c), await qd(n, r);
}, Jd = (r, t) => {
  const e = t ?? {}, n = r ?? {};
  return {
    webContentsId: typeof n.id == "number" ? n.id : void 0,
    reason: e.reason,
    exitCode: e.exitCode
  };
}, Qd = (r) => {
  const t = r ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, Zd = (r) => {
  if (hn) return;
  hn = !0;
  const t = (e, n) => {
    Vd(r, e, n).catch((a) => {
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
  }), S.on("render-process-gone", (e, n, a) => {
    t("render-process-gone", Jd(n, a));
  }), S.on("child-process-gone", (e, n) => {
    t("child-process-gone", Qd(n));
  });
}, zt = N("DeepLink"), tl = "luie://auth/callback", el = "luie://auth/return", rl = "luie://auth/", ie = () => {
  const r = H.getMainWindow();
  if (r) {
    r.isMinimized() && r.restore(), r.focus();
    return;
  }
  const t = H.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, Me = (r) => {
  const t = tt.getAllWindows();
  for (const e of t)
    if (!e.isDestroyed())
      try {
        e.webContents.send(Ft.SYNC_AUTH_RESULT, r);
      } catch (n) {
        zt.warn("Failed to broadcast OAuth result", { error: n });
      }
}, nl = (r) => {
  const t = r instanceof Error ? r.message : String(r);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, al = (r) => r === "NO_PENDING" || r === "EXPIRED" || r === "STATE_MISMATCH", fn = (r) => r === "NO_PENDING" ? "NO_PENDING" : r === "EXPIRED" ? "EXPIRED" : r === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", cr = (r) => {
  for (const t of r)
    if (typeof t == "string" && t.startsWith(rl))
      return t;
  return null;
}, dr = async (r) => {
  if (r.startsWith(el))
    return ie(), zt.info("OAuth return deep link handled", { url: r }), !0;
  if (!r.startsWith(tl))
    return !1;
  try {
    return await Jt.handleOAuthCallback(r), ie(), Me({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), zt.info("OAuth callback processed", { url: r }), !0;
  } catch (t) {
    const e = t instanceof Error ? t.message : String(t), n = nl(t), a = Jt.getStatus();
    return a.connected && al(n) ? (ie(), Me({
      status: "stale",
      reason: fn(n),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), zt.warn("OAuth callback arrived after connection was already established", {
      url: r,
      reason: n,
      error: t
    }), !0) : (ie(), Me({
      status: "error",
      reason: fn(n),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), zt.error(a.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
      url: r,
      reason: n,
      error: t
    }), !1);
  }
}, ct = (r, t, e) => {
  if (!(!r || r.isDestroyed()))
    try {
      r.webContents.send(Ft.APP_QUIT_PHASE, { phase: t, message: e });
    } catch {
    }
}, ke = async (r, t) => r && !r.isDestroyed() ? We.showMessageBox(r, t) : We.showMessageBox(t), ol = (r) => {
  let t = !1;
  S.on("window-all-closed", () => {
    process.platform !== "darwin" && S.quit();
  }), S.on("before-quit", (e) => {
    t || (t = !0, e.preventDefault(), (async () => {
      r.info("App is quitting");
      const n = H.getMainWindow();
      ct(n, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let a = !1, o = !1, s = !1;
      if (n && !n.isDestroyed() && n.webContents)
        try {
          a = await new Promise((p) => {
            const A = setTimeout(
              () => p(!1),
              qa
            );
            ua.once(Ft.APP_FLUSH_COMPLETE, (w, g) => {
              o = !!g?.hadQueuedAutoSaves, s = !!g?.rendererDirty, clearTimeout(A), p(!0);
            }), n.webContents.send(Ft.APP_BEFORE_QUIT);
          }), r.info("Renderer flush phase completed", {
            rendererFlushed: a,
            rendererHadQueued: o,
            rendererDirty: s
          });
        } catch (p) {
          r.warn("Renderer flush request failed", p);
        }
      ct(n, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored: p } = await Z.flushCritical();
        r.info("Pre-dialog mirror flush completed", { mirrored: p });
      } catch (p) {
        r.error("Pre-dialog mirror flush failed", p);
      }
      const c = Z.getPendingSaveCount();
      if (c > 0 || o || s || !a)
        try {
          const p = c > 0 ? `${c}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", A = await ke(n, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message: p,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: !0
          });
          if (A.response === 2) {
            r.info("Quit cancelled by user"), t = !1, ct(n, "aborted", "종료가 취소되었습니다.");
            return;
          }
          if (A.response === 0) {
            r.info("User chose: save and quit");
            try {
              await Promise.race([
                Z.flushAll(),
                new Promise((w) => setTimeout(w, Va))
              ]), await Z.flushMirrorsToSnapshots("session-end");
            } catch (w) {
              r.error("Save during quit failed", w);
            }
          } else {
            r.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await Z.flushMirrorsToSnapshots("session-end-no-save");
            } catch (w) {
              r.warn("Mirror-to-snapshot conversion failed", w);
            }
          }
        } catch (p) {
          r.error("Quit dialog failed; exiting with mirrors on disk", p);
        }
      else
        try {
          await Z.flushMirrorsToSnapshots("session-end");
        } catch (p) {
          r.warn("Session-end mirror flush failed", p);
        }
      ct(n, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let l = "continue";
      if ((await F.flushPendingExports(Ja)).timedOut) {
        const p = await ke(n, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: !0
        });
        (p.response === 1 || p.response === 0 && (await F.flushPendingExports(Qa)).timedOut && (await ke(n, {
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
        r.info("Quit cancelled by user during export flush"), t = !1, ct(n, "aborted", "종료가 취소되었습니다.");
        return;
      }
      ct(n, "finalize", "마무리 정리 중입니다...");
      try {
        await K.pruneSnapshotsAllProjects();
      } catch (p) {
        r.warn("Snapshot pruning failed during quit", p);
      }
      try {
        await h.disconnect();
      } catch (p) {
        r.warn("DB disconnect failed during quit", p);
      }
      ct(n, "completed", "안전하게 종료합니다."), S.exit(0);
    })().catch((n) => {
      r.error("Quit guard failed", n), t = !1;
      const a = H.getMainWindow();
      ct(a, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
    }));
  }), process.on("SIGINT", () => {
    r.info("Received SIGINT"), S.quit();
  }), process.on("SIGTERM", () => {
    r.info("Received SIGTERM"), S.quit();
  }), process.on("uncaughtException", (e) => {
    r.error("Uncaught exception", e);
  }), process.on("unhandledRejection", (e) => {
    r.error("Unhandled rejection", e);
  });
}, sl = (r) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : S.requestSingleInstanceLock())) {
    const n = cr(process.argv);
    return r.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!n,
      argv: process.argv
    }), S.quit(), !1;
  }
  return S.on("second-instance", (n, a) => {
    const o = cr(a);
    r.info("Second instance event received", {
      hasCallbackUrl: !!o
    }), o && dr(o);
    const s = H.getMainWindow();
    s && (s.isMinimized() && s.restore(), s.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-B9Gu_Tvs.js").then((r) => r.c);
In({
  logToFile: !0,
  logFilePath: W.join(S.getPath("userData"), yo, So),
  minLevel: ur.INFO
});
const lt = N("Main"), le = process.defaultApp === !0, lr = Date.now();
lt.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: S.isPackaged,
  defaultApp: le,
  startupStartedAtMs: lr
});
const il = () => {
  const r = "luie";
  let t = !1;
  const e = S.getAppPath();
  if (le ? e && (t = S.setAsDefaultProtocolClient(r, process.execPath, [e])) : t = S.setAsDefaultProtocolClient(r), !t) {
    const a = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    _.getSyncSettings().connected || _.setSyncSettings({ lastError: a }), lt.warn("Failed to register custom protocol for OAuth callback", {
      protocol: r,
      defaultApp: le,
      reason: a
    });
    return;
  }
  _.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && _.setSyncSettings({ lastError: void 0 }), lt.info("Custom protocol registered", {
    protocol: r,
    defaultApp: le,
    appEntry: e
  });
};
if (!sl(lt))
  S.quit();
else {
  Zd(lt), jo(), S.disableHardwareAcceleration(), process.platform === "darwin" && S.on("open-url", (t, e) => {
    t.preventDefault(), dr(e);
  }), il();
  const r = cr(process.argv);
  r && dr(r), zd(lt, {
    startupStartedAtMs: lr,
    onFirstRendererReady: () => {
      const t = Date.now();
      Jt.initialize(), lt.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - lr
      });
    }
  }), ol(lt);
}
export {
  Wl as $,
  $a as A,
  xl as B,
  bt as C,
  Ml as D,
  E,
  kl as F,
  Er as G,
  fs as H,
  Ft as I,
  hs as J,
  G as K,
  q as L,
  we as M,
  Ln as N,
  On as O,
  jl as P,
  Qt as Q,
  Ae as R,
  f as S,
  ye as T,
  Ol as U,
  Se as V,
  bl as W,
  fr as X,
  Te as Y,
  us as Z,
  ms as _,
  me as a,
  vl as a0,
  Ul as a1,
  Fd as a2,
  ve as a3,
  Jt as a4,
  H as a5,
  ca as a6,
  ql as a7,
  na as a8,
  Qe as a9,
  Ze as aa,
  Z as ab,
  K as ac,
  Nr as ad,
  Fl as ae,
  $l as af,
  Yl as ag,
  zl as ah,
  Kl as ai,
  Xl as b,
  N as c,
  h as d,
  z as e,
  vt as f,
  Hl as g,
  hr as h,
  qc as i,
  Ra as j,
  Et as k,
  bo as l,
  Bl as m,
  Zt as n,
  qt as o,
  F as p,
  fe as q,
  et as r,
  gs as s,
  is as t,
  ls as u,
  Gl as v,
  ba as w,
  As as x,
  ps as y,
  Es as z
};

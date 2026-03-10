import { app as m, nativeTheme as Rn, BrowserWindow as G, Menu as ie, shell as Nn, safeStorage as z, session as qe, dialog as Se, ipcMain as Cn } from "electron";
import * as tt from "node:path";
import j from "node:path";
import { z as p } from "zod";
import * as Dn from "fs";
import { existsSync as Ln, promises as it } from "fs";
import * as X from "path";
import Z, { join as W } from "path";
import On from "electron-window-state";
import Ke from "electron-store";
import * as Nt from "node:fs/promises";
import { access as Mr, mkdir as Je, writeFile as Qe, unlink as Ze } from "node:fs/promises";
import { spawn as bn } from "node:child_process";
import { constants as ye, promises as At } from "node:fs";
import { createRequire as jn } from "node:module";
import { EventEmitter as Fn } from "node:events";
import { randomBytes as Un, createHash as vn, randomUUID as V } from "node:crypto";
import * as k from "fs/promises";
import Mn from "yauzl";
import Wn from "yazl";
import kn from "node:module";
const Uc = import.meta.filename, K = import.meta.dirname, vc = kn.createRequire(import.meta.url), Mc = 2, Wc = 2, kc = 2, _e = 1, Bn = (e) => !!e && typeof e == "object" && typeof e.then == "function", ce = () => typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now(), we = (e, t, r, n) => {
  const o = e?.[t];
  if (o)
    try {
      const s = o(r, n);
      Bn(s) && s.then(() => {
      }, () => {
      });
    } catch {
    }
}, Wr = (e) => ({
  flattened: p.flattenError(e),
  pretty: p.prettifyError(e),
  issues: e.issues.map((t) => ({
    code: t.code,
    path: t.path.map(String).join("."),
    message: t.message
  }))
}), $n = (e) => ({
  schemaVersion: _e,
  domain: e.domain ?? "validation",
  event: "validation.failed",
  scope: e.scope,
  source: e.source,
  ...e.storageKey ? { storageKey: e.storageKey } : {},
  ...e.channel ? { channel: e.channel } : {},
  ...e.requestId ? { requestId: e.requestId } : {},
  ...typeof e.persistedVersion == "number" ? { persistedVersion: e.persistedVersion } : {},
  ...typeof e.targetVersion == "number" ? { targetVersion: e.targetVersion } : {},
  ...e.fallback ? { fallback: e.fallback } : {},
  zod: Wr(e.error),
  ...e.meta ?? {}
}), kr = (e) => {
  const t = ce();
  return {
    complete(r, n) {
      const o = Number((ce() - t).toFixed(1));
      return we(r, "info", e.event, {
        schemaVersion: _e,
        domain: "performance",
        event: e.event,
        scope: e.scope,
        durationMs: o,
        status: "ok",
        ...e.meta ?? {},
        ...n ?? {}
      }), o;
    },
    fail(r, n, o) {
      const s = Number((ce() - t).toFixed(1));
      return we(r, "warn", e.event, {
        schemaVersion: _e,
        domain: "performance",
        event: e.event,
        scope: e.scope,
        durationMs: s,
        status: "failed",
        error: n instanceof Error ? {
          name: n.name,
          message: n.message
        } : n,
        ...e.meta ?? {},
        ...o ?? {}
      }), s;
    }
  };
};
var xe = /* @__PURE__ */ ((e) => (e.DEBUG = "DEBUG", e.INFO = "INFO", e.WARN = "WARN", e.ERROR = "ERROR", e))(xe || {});
const Vt = /* @__PURE__ */ Symbol.for("luie.logger.context"), Ie = "[REDACTED]", xn = "[REDACTED_PATH]", Br = "[REDACTED_TEXT]", $r = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, xr = /(content|synopsis|manuscript|chapterText|prompt)/i, Gr = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, Gn = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, Hn = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, zn = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function tr(e, t) {
  if ($r.test(t ?? ""))
    return Ie;
  if (xr.test(t ?? ""))
    return Br;
  if (Gr.test(t ?? "") && Gn.test(e))
    return xn;
  let r = e.replace(Hn, "Bearer [REDACTED]");
  return zn.test(r) && (r = Ie), r;
}
function Et(e, t, r = /* @__PURE__ */ new WeakSet()) {
  if (typeof e == "string")
    return tr(e, t);
  if (typeof e == "number" || typeof e == "boolean" || e === null)
    return e;
  if (typeof e == "bigint")
    return e.toString();
  if (!(typeof e > "u")) {
    if (typeof e == "function" || typeof e == "symbol")
      return String(e);
    if (e instanceof Date)
      return e.toISOString();
    if (Array.isArray(e))
      return e.map((n) => Et(n, t, r));
    if (typeof e == "object") {
      const n = e;
      if (r.has(n))
        return "[Circular]";
      r.add(n);
      const o = {};
      for (const [s, a] of Object.entries(n)) {
        if ($r.test(s)) {
          o[s] = Ie;
          continue;
        }
        if (xr.test(s) && typeof a == "string") {
          o[s] = Br;
          continue;
        }
        if (Gr.test(s) && typeof a == "string") {
          o[s] = tr(a, s);
          continue;
        }
        o[s] = Et(a, s, r);
      }
      return o;
    }
    return String(e);
  }
}
function Yn(e) {
  if (!e || typeof e != "object") return Et(e);
  const t = e[Vt];
  return !t || typeof t != "object" ? Et(e) : Array.isArray(e) ? Et({ items: e, _ctx: t }) : Et({ ...e, _ctx: t });
}
function Xn(e, t) {
  return e && typeof e == "object" ? { ...e, [Vt]: t } : { value: e, [Vt]: t };
}
class Vn {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, r, n) {
    if (!qn(t)) return;
    const o = Yn(n), s = {
      level: t,
      message: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: this.context,
      ...o !== void 0 ? { data: o } : {}
    }, a = `[${s.timestamp}] [${s.level}] [${s.context}] ${s.message}`;
    switch (t) {
      case "DEBUG":
        console.debug(a, o ?? "");
        break;
      case "INFO":
        console.info(a, o ?? "");
        break;
      case "WARN":
        console.warn(a, o ?? "");
        break;
      case "ERROR":
        console.error(a, o ?? "");
        break;
    }
    q.logToFile && q.logFilePath && Qn(s);
  }
  debug(t, r) {
    this.log("DEBUG", t, r);
  }
  info(t, r) {
    this.log("INFO", t, r);
  }
  warn(t, r) {
    this.log("WARN", t, r);
  }
  error(t, r) {
    this.log("ERROR", t, r);
  }
}
const Hr = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, er = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let q = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, de = null;
const Pe = async (e) => import(
  /* @vite-ignore */
  e
);
function qn(e) {
  return er[e] >= er[q.minLevel];
}
async function Kn() {
  !Hr || !q.logFilePath || (de || (de = (async () => {
    const e = await Pe("node:path");
    await (await Pe("node:fs/promises")).mkdir(e.dirname(q.logFilePath), {
      recursive: !0
    });
  })()), await de);
}
function Jn(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return '"[unserializable]"';
  }
}
async function Qn(e) {
  if (!(!Hr || !q.logFilePath))
    try {
      await Kn();
      const t = await Pe("node:fs/promises"), r = Jn(e);
      await t.appendFile(q.logFilePath, `${r}
`, "utf8");
    } catch {
    }
}
function zr(e) {
  q = {
    ...q,
    ...e
  };
}
function M(e) {
  return new Vn(e);
}
const Bc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: Vt,
  LogLevel: xe,
  buildValidationFailureData: $n,
  configureLogger: zr,
  createLogger: M,
  createPerformanceTimer: kr,
  emitOperationalLog: we,
  summarizeZodError: Wr,
  withLogContext: Xn
}, Symbol.toStringTag, { value: "Module" })), Zn = "Luie", to = "0.1.0", Yr = (e, t) => typeof e == "string" && e.trim().length > 0 ? e : t, rr = Yr(
  "luie",
  Zn
), $c = Yr(
  "0.1.16",
  to
), Xr = "luie.db", eo = 3e4, ro = eo, xc = 1e3, Ge = 30, no = !0, Gc = 300 * 1e3, Hc = 60 * 1e3, zc = 200, Yc = 5e3, oo = 3e3, so = 1e4, ao = 8e3, io = 2e4, Xc = 60 * 1e3, Vc = 2e3, Vr = 50, qc = 2e3, Kc = 1, Jc = 0, Qc = 30, Zc = 50, td = 2e3, co = 5e3, lo = 1400, po = 900, uo = 1e3, ho = 600, Eo = 16, fo = 16, Ao = "sans", go = "inter", To = 16, mo = 1.6, So = 800, yo = "blue", _o = !0, wo = "logs", Io = "luie.log", ed = "snapshot-mirror", rd = "Backups", Po = "settings", Ro = "settings.json", qr = "luie", x = ".luie", nd = "luie", Ot = "luie", od = "Luie Project", sd = "New Project", ad = "project", bt = "zip", jt = 1, Zt = "meta.json", Tt = "manuscript", id = `${Tt}/README.md`, F = "world", Ft = "snapshots", No = "assets", Kr = "characters.json", Jr = "terms.json", Mt = "synopsis.json", te = "plot-board.json", ee = "map-drawing.json", re = "mindmap.json", He = "scrap-memos.json", ne = "graph.json", oe = ".md", w = {
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
}, Co = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), nr = (e) => Co.has(e), cd = (e, t, r) => !0, Do = "neutral", Lo = "soft", ze = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", Oo = () => !m.isPackaged && !ze(), bo = () => m.isPackaged, jo = () => j.join(process.cwd(), "prisma", "dev.db"), Fo = () => j.join(process.cwd(), "prisma", ".tmp", "test.db"), Uo = () => j.join(m.getPath("userData"), Xr);
function vo() {
  if (process.env.DATABASE_URL) return;
  const e = ze() ? Fo() : m.isPackaged ? Uo() : jo();
  process.env.DATABASE_URL = `file:${e}`;
}
const Mo = qr, Wo = Ro, le = Po, ko = (e) => {
  if (e)
    return {
      connected: e.connected ?? !1,
      provider: e.provider,
      email: e.email,
      userId: e.userId,
      expiresAt: e.expiresAt,
      autoSync: e.autoSync ?? !0,
      lastSyncedAt: e.lastSyncedAt,
      lastError: e.lastError,
      projectLastSyncedAtByProjectId: e.projectLastSyncedAtByProjectId
    };
}, Bo = (e) => {
  const t = e === "darwin" ? "Cmd" : "Ctrl";
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
}, Yt = Bo(process.platform), Re = process.platform === "darwin" ? "visible" : "hidden", Ne = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = typeof e.url == "string" ? e.url.trim() : "", r = typeof e.anonKey == "string" ? e.anonKey.trim() : "";
  if (!(t.length === 0 || r.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: r
    };
}, or = () => ({
  editor: {
    fontFamily: Ao,
    fontPreset: go,
    fontSize: To,
    lineHeight: mo,
    maxWidth: So,
    theme: Rn.shouldUseDarkColors ? "dark" : "light",
    themeTemp: Do,
    themeContrast: Lo,
    themeAccent: yo,
    themeTexture: _o,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: Yt,
  lastProjectPath: void 0,
  autoSaveEnabled: no,
  autoSaveInterval: ro,
  snapshotExportLimit: Vr,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: Re,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
}), dt = (e) => typeof e == "string" && e.length > 0, $o = (e) => {
  if (!Array.isArray(e)) return;
  const t = e.filter(
    (r) => !!(r && typeof r == "object" && dt(r.projectId) && dt(r.deletedAt))
  ).map((r) => ({
    projectId: r.projectId,
    deletedAt: r.deletedAt
  }));
  return t.length > 0 ? t : void 0;
}, Ce = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(
      (r) => dt(r[0]) && dt(r[1])
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, xo = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const t = e;
  return {
    chapter: Ce(t.chapter) ?? {},
    memo: Ce(t.memo) ?? {},
    capturedAt: dt(t.capturedAt) ? t.capturedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}, Go = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(([r]) => dt(r)).map(([r, n]) => [r, xo(n)]).filter((r) => !!r[1])
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, Ho = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(
      (r) => dt(r[0]) && (r[1] === "local" || r[1] === "remote")
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, sr = (e) => {
  const t = e ?? {};
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
    pendingProjectDeletes: $o(t.pendingProjectDeletes),
    projectLastSyncedAtByProjectId: Ce(t.projectLastSyncedAtByProjectId),
    entityBaselinesByProjectId: Go(t.entityBaselinesByProjectId),
    pendingConflictResolutions: Ho(
      t.pendingConflictResolutions
    ),
    runtimeSupabaseConfig: Ne(t.runtimeSupabaseConfig)
  };
}, ut = M("SettingsManager");
class st {
  static instance;
  store;
  constructor() {
    const t = m.getPath("userData"), r = `${t}/${Mo}/${le}`, n = `${r}/${Wo}`;
    this.store = new Ke({
      name: le,
      defaults: or(),
      // 저장 위치: userData/settings.json
      cwd: t,
      encryptionKey: void 0,
      // 필요하다면 암호화 키 추가
      fileExtension: "json"
    }), this.migrateLegacySettingsIfNeeded(r, n), this.migrateLegacyWindowSettings(), ut.info("Settings manager initialized", {
      path: this.store.path
    });
  }
  async migrateLegacySettingsIfNeeded(t, r) {
    const n = await this.pathExists(r), o = await this.pathExists(this.store.path);
    if (!(!n || o))
      try {
        const s = new Ke({
          name: le,
          defaults: or(),
          cwd: t,
          fileExtension: "json"
        });
        this.store.set(s.store), ut.info("Settings migrated from legacy path", {
          from: s.path,
          to: this.store.path
        });
      } catch (s) {
        ut.error("Failed to migrate legacy settings", s);
      }
  }
  async pathExists(t) {
    try {
      return await Mr(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", Re), "titleBarMode" in t) {
      const { titleBarMode: r, ...n } = t;
      this.store.set(n);
    }
  }
  static getInstance() {
    return st.instance || (st.instance = new st()), st.instance;
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
      sync: ko(t.sync)
    };
  }
  // 전체 설정 저장
  setAll(t) {
    const r = this.store.store, n = {
      editor: { ...r.editor, ...t.editor || {} },
      language: t.language ?? r.language,
      shortcuts: t.shortcuts ?? r.shortcuts,
      lastProjectPath: t.lastProjectPath ?? r.lastProjectPath,
      autoSaveEnabled: t.autoSaveEnabled ?? r.autoSaveEnabled,
      autoSaveInterval: t.autoSaveInterval ?? r.autoSaveInterval,
      snapshotExportLimit: t.snapshotExportLimit ?? r.snapshotExportLimit,
      windowBounds: t.windowBounds ?? r.windowBounds,
      lastWindowState: t.lastWindowState ?? r.lastWindowState,
      menuBarMode: t.menuBarMode ?? r.menuBarMode,
      sync: t.sync ?? r.sync,
      startup: t.startup ?? r.startup
    };
    this.store.set(n), ut.info("Settings updated", { settings: n });
  }
  // 에디터 설정
  getEditorSettings() {
    return this.store.get("editor");
  }
  setEditorSettings(t) {
    this.store.set("editor", { ...this.getEditorSettings(), ...t }), ut.info("Editor settings updated", { settings: t });
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
    return { shortcuts: { ...Yt, ...t }, defaults: Yt };
  }
  setShortcuts(t) {
    const r = { ...Yt, ...t };
    return this.store.set("shortcuts", r), r;
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
    return this.store.get("menuBarMode") ?? Re;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    return sr(this.store.get("sync"));
  }
  setSyncSettings(t) {
    const r = sr({
      ...this.getSyncSettings(),
      ...t
    });
    return this.store.set("sync", r), r;
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
    const r = this.getSyncSettings(), o = (Array.isArray(r.pendingProjectDeletes) ? r.pendingProjectDeletes : []).filter((s) => s.projectId !== t.projectId);
    return this.setSyncSettings({
      pendingProjectDeletes: [
        ...o,
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
    const r = new Set(t), n = this.getSyncSettings(), s = (Array.isArray(n.pendingProjectDeletes) ? n.pendingProjectDeletes : []).filter((a) => !r.has(a.projectId));
    return this.setSyncSettings({
      pendingProjectDeletes: s.length > 0 ? s : void 0
    });
  }
  clearSyncSettings() {
    const t = this.getSyncSettings(), r = {
      connected: !1,
      autoSync: !0,
      pendingProjectDeletes: t.pendingProjectDeletes,
      entityBaselinesByProjectId: t.entityBaselinesByProjectId,
      runtimeSupabaseConfig: t.runtimeSupabaseConfig
    };
    return this.store.set("sync", r), r;
  }
  getRuntimeSupabaseConfig() {
    const t = this.getSyncSettings();
    return Ne(t.runtimeSupabaseConfig);
  }
  getRuntimeSupabaseConfigView(t) {
    const r = this.getRuntimeSupabaseConfig();
    return {
      url: r?.url ?? null,
      hasAnonKey: !!r?.anonKey,
      source: t?.source
    };
  }
  setRuntimeSupabaseConfig(t) {
    const r = Ne(t);
    return this.setSyncSettings({
      runtimeSupabaseConfig: r
    }), r;
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
    const r = this.getStartupSettings(), o = Object.prototype.hasOwnProperty.call(t, "completedAt") ? t.completedAt : r.completedAt, s = o ? { completedAt: o } : {};
    return this.store.set("startup", s), s;
  }
  setStartupCompletedAt(t) {
    return this.setStartupSettings({ completedAt: t });
  }
  clearStartupCompletedAt() {
    return this.setStartupSettings({ completedAt: void 0 });
  }
  // 설정 초기화
  resetToDefaults() {
    this.store.clear(), ut.info("Settings reset to defaults");
  }
  // 저장 경로 가져오기 (디버깅용)
  getSettingsPath() {
    return this.store.path;
  }
}
const g = st.getInstance(), dd = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: st,
  settingsManager: g
}, Symbol.toStringTag, { value: "Module" })), R = M("WindowManager"), pe = "#f4f4f5";
class zo {
  mainWindow = null;
  startupWizardWindow = null;
  resolveWindowIconPath() {
    const t = [
      W(process.resourcesPath, "icon.png"),
      W(process.resourcesPath, "build", "icons", "icon.png")
    ], r = [
      W(m.getAppPath(), "build", "icons", "icon.png"),
      W(m.getAppPath(), "assets", "public", "luie.png")
    ], n = m.isPackaged ? t : r;
    for (const o of n)
      if (Ln(o))
        return o;
  }
  getTitleBarOptions() {
    return process.platform !== "darwin" ? {} : {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: Eo, y: fo }
    };
  }
  getMenuBarMode() {
    return g.getMenuBarMode();
  }
  shouldShowMenuBar() {
    return process.platform !== "darwin" ? !1 : this.getMenuBarMode() === "visible";
  }
  applyMenuBarMode(t) {
    const r = this.shouldShowMenuBar();
    if (process.platform === "darwin") {
      if (r) {
        t.isSimpleFullScreen() && t.setSimpleFullScreen(!1), t.isFullScreen() && t.setFullScreen(!1), t.setMenuBarVisibility(!0);
        return;
      }
      t.setMenuBarVisibility(!1), t.isSimpleFullScreen() || t.setSimpleFullScreen(!0);
      return;
    }
    t.setAutoHideMenuBar(!0), t.setMenuBarVisibility(!1);
  }
  createMainWindow(t = {}) {
    const r = t.deferShow === !0;
    if (this.mainWindow)
      return this.mainWindow;
    const n = On({
      defaultWidth: lo,
      defaultHeight: po
    }), o = this.resolveWindowIconPath();
    this.mainWindow = new G({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      minWidth: uo,
      minHeight: ho,
      title: rr,
      show: !1,
      backgroundColor: pe,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: W(K, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.mainWindow), n.manage(this.mainWindow);
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", i = !s && process.env.NODE_ENV !== "production";
    if (i)
      R.info("Loading development server", { url: a, isPackaged: s }), this.mainWindow.loadURL(a).catch((d) => {
        R.error("Failed to load development renderer URL", { url: a, error: d });
      }), this.mainWindow.webContents.openDevTools({ mode: "detach" });
    else {
      const d = W(K, "../renderer/index.html");
      R.info("Loading production renderer", { path: d, isPackaged: s }), this.mainWindow.loadFile(d).catch((l) => {
        R.error("Failed to load production renderer file", { path: d, error: l });
      });
    }
    return this.mainWindow.once("ready-to-show", () => {
      this.mainWindow && !this.mainWindow.isDestroyed() && (R.info("Main window ready to show", { deferShow: r }), r || this.showMainWindow());
    }), this.mainWindow.on("closed", () => {
      this.mainWindow = null, R.info("Main window closed");
    }), R.info("Main window created", { isPackaged: s, useDevServer: i }), this.mainWindow;
  }
  createStartupWizardWindow() {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed())
      return this.startupWizardWindow.focus(), this.startupWizardWindow;
    const t = this.resolveWindowIconPath(), r = m.isPackaged, n = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", o = !r && process.env.NODE_ENV !== "production";
    if (this.startupWizardWindow = new G({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: !0,
      title: `${rr} Setup`,
      backgroundColor: "#0b1020",
      ...t ? { icon: t } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !0 } : {},
      webPreferences: {
        preload: W(K, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.startupWizardWindow), o) {
      const s = `${n}/#startup-wizard`;
      R.info("Loading startup wizard (dev)", { wizardUrl: s }), this.startupWizardWindow.loadURL(s).catch((a) => {
        R.error("Failed to load startup wizard (dev)", { wizardUrl: s, error: a });
      });
    } else {
      const s = W(K, "../renderer/index.html");
      R.info("Loading startup wizard (prod)", { path: s }), this.startupWizardWindow.loadFile(s, { hash: "startup-wizard" }).catch((a) => {
        R.error("Failed to load startup wizard (prod)", { path: s, error: a });
      });
    }
    return this.startupWizardWindow.on("closed", () => {
      this.startupWizardWindow = null, R.info("Startup wizard window closed");
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
    const r = 1200, n = 900, o = this.resolveWindowIconPath();
    this.exportWindow = new G({
      width: r,
      height: n,
      minWidth: 1e3,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: pe,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: W(K, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.exportWindow);
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", i = !s && process.env.NODE_ENV !== "production", d = `?chapterId=${t}`, l = "#export";
    if (i) {
      const c = `${a}/${d}${l}`;
      R.info("Loading export window (dev)", { url: c }), this.exportWindow.loadURL(c).catch((u) => {
        R.error("Failed to load export window (dev)", { url: c, error: u });
      });
    } else {
      const c = W(K, "../renderer/index.html");
      R.info("Loading export window (prod)", { path: c }), this.exportWindow.loadFile(c, { hash: "export", search: d }).catch((u) => {
        R.error("Failed to load export window (prod)", {
          path: c,
          hash: "export",
          search: d,
          error: u
        });
      });
    }
    return this.exportWindow.on("closed", () => {
      this.exportWindow = null, R.info("Export window closed");
    }), i && this.exportWindow.webContents.openDevTools({ mode: "detach" }), this.exportWindow;
  }
  // ─── World Graph Window ───────────────────────────────────────────────────
  worldGraphWindow = null;
  createWorldGraphWindow() {
    if (this.worldGraphWindow)
      return this.worldGraphWindow.focus(), this.worldGraphWindow;
    const t = 1200, r = 800, n = this.resolveWindowIconPath();
    this.worldGraphWindow = new G({
      width: t,
      height: r,
      minWidth: 1e3,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: pe,
      ...n ? { icon: n } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: W(K, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.worldGraphWindow);
    const o = m.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", a = !o && process.env.NODE_ENV !== "production", i = "#world-graph";
    if (a) {
      const d = `${s}/${i}`;
      R.info("Loading world graph window (dev)", { url: d }), this.worldGraphWindow.loadURL(d).catch((l) => {
        R.error("Failed to load world graph window (dev)", { url: d, error: l });
      });
    } else {
      const d = W(K, "../renderer/index.html");
      R.info("Loading world graph window (prod)", { path: d }), this.worldGraphWindow.loadFile(d, { hash: "world-graph" }).catch((l) => {
        R.error("Failed to load world graph window (prod)", {
          path: d,
          hash: "world-graph",
          error: l
        });
      });
    }
    return this.worldGraphWindow.on("closed", () => {
      this.worldGraphWindow = null, R.info("World graph window closed");
    }), a && this.worldGraphWindow.webContents.openDevTools({ mode: "detach" }), this.worldGraphWindow;
  }
  applyMenuBarModeToAllWindows() {
    const t = G.getAllWindows();
    for (const r of t)
      r.isDestroyed() || this.applyMenuBarMode(r);
  }
}
const U = new zo(), ld = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: U
}, Symbol.toStringTag, { value: "Module" })), Yo = () => {
  const e = {
    label: "File",
    submenu: process.platform === "darwin" ? [{ role: "close" }] : [{ role: "close" }, { role: "quit" }]
  };
  return process.platform === "darwin" ? [
    { role: "appMenu" },
    e,
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ] : [e, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }, { role: "help" }];
}, Xo = (e) => {
  if (process.platform !== "darwin" || e === "hidden") {
    ie.setApplicationMenu(null);
    return;
  }
  ie.setApplicationMenu(ie.buildFromTemplate(Yo()));
}, gt = {
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
};
class _ extends Error {
  code;
  details;
  constructor(t, r, n, o) {
    super(r), this.code = t, this.details = n, o && (this.cause = o);
  }
}
function pd(e) {
  return typeof e == "object" && e !== null && "code" in e && "message" in e;
}
const ar = 4096, Vo = process.platform === "win32" ? [j.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], ir = (e) => process.platform === "win32" ? e.toLowerCase() : e, qo = (e, t) => {
  const r = ir(j.resolve(e)), n = ir(j.resolve(t));
  return r === n || r.startsWith(`${n}${j.sep}`);
};
function Ko(e, t) {
  if (typeof e != "string")
    throw new _(
      w.INVALID_INPUT,
      `${t} must be a string`,
      { fieldName: t, receivedType: typeof e }
    );
  const r = e.trim();
  if (!r)
    throw new _(
      w.REQUIRED_FIELD_MISSING,
      `${t} is required`,
      { fieldName: t }
    );
  if (r.length > ar)
    throw new _(
      w.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: r.length, maxLength: ar }
    );
  if (r.includes("\0"))
    throw new _(
      w.INVALID_INPUT,
      `${t} contains invalid null bytes`,
      { fieldName: t }
    );
  return r;
}
function v(e, t = "path") {
  const r = Ko(e, t);
  if (!j.isAbsolute(r))
    throw new _(
      w.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: r }
    );
  const n = j.resolve(r);
  for (const o of Vo)
    if (qo(n, o))
      throw new _(
        w.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: n, restrictedRoot: j.resolve(o) }
      );
  return n;
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
`, cr = M("DatabaseSeed");
async function es(e) {
  const t = await e.project.count();
  return t > 0 ? (cr.info("Seed skipped (projects exist)", { count: t }), !1) : (await e.project.create({
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
  }), cr.info("Seed completed (default project created)"), !0);
}
const C = M("DatabaseService"), Ye = jn(import.meta.url), { PrismaClient: dr } = Ye("@prisma/client"), rs = () => {
  const e = Ye("@prisma/adapter-better-sqlite3");
  if (typeof e == "function") return e;
  if (e && typeof e == "object" && typeof e.PrismaBetterSqlite3 == "function")
    return e.PrismaBetterSqlite3;
  throw new Error("Failed to load Prisma better-sqlite3 adapter");
}, ns = () => {
  const e = Ye("better-sqlite3");
  return typeof e == "function" ? e : e.default;
}, os = (e) => `"${e.replace(/"/g, '""')}"`, yt = async (e) => {
  try {
    return await Nt.access(e, ye.F_OK), !0;
  } catch {
    return !1;
  }
}, ss = (e) => {
  const t = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return tt.join(e, "node_modules", ".bin", t);
}, lr = "file:", as = (e) => {
  if (!e.startsWith(lr))
    throw new Error("DATABASE_URL must use sqlite file: URL");
  const t = e.slice(lr.length);
  if (!t || t === ":memory:" || t.startsWith(":memory:?"))
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  const r = t.indexOf("?"), n = r >= 0 ? t.slice(0, r) : t, o = r >= 0 ? t.slice(r + 1) : "", s = v(
    tt.isAbsolute(n) ? n : tt.resolve(process.cwd(), n),
    "DATABASE_URL"
  ), a = o.length > 0 ? `file:${s}?${o}` : `file:${s}`;
  return { dbPath: s, datasourceUrl: a };
}, ue = async (e, t, r) => await new Promise((n, o) => {
  const s = bn(e, t, {
    env: r,
    shell: !1,
    windowsHide: !0
  });
  let a = "", i = "";
  s.stdout?.on("data", (d) => {
    a += d.toString();
  }), s.stderr?.on("data", (d) => {
    i += d.toString();
  }), s.on("error", (d) => {
    o(d);
  }), s.on("close", (d) => {
    if (d === 0) {
      n({ stdout: a, stderr: i });
      return;
    }
    const l = new Error(`Prisma command failed with exit code ${d}`);
    l.code = d, l.stdout = a, l.stderr = i, o(l);
  });
}), is = () => (process.env.LUIE_PACKAGED_SCHEMA_MODE ?? "").trim().toLowerCase() === "prisma-migrate" ? "prisma-migrate" : "bootstrap";
class ft {
  static instance;
  prisma = null;
  dbPath = null;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    return ft.instance || (ft.instance = new ft()), ft.instance;
  }
  async initialize() {
    this.prisma || (this.initPromise || (this.initPromise = this.initializeInternal().finally(() => {
      this.initPromise = null;
    })), await this.initPromise);
  }
  async initializeInternal() {
    const t = await this.prepareDatabaseContext();
    if (this.dbPath = t.dbPath, C.info("Initializing database", {
      isPackaged: t.isPackaged,
      isTest: t.isTest,
      hasEnvDb: !!process.env.DATABASE_URL,
      userDataPath: m.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await es(this.prisma);
      } catch (r) {
        C.error("Failed to seed packaged database", { error: r });
      }
    if (this.prisma.$executeRawUnsafe)
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"), await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"), C.info("SQLite WAL mode enabled");
      } catch (r) {
        C.warn("Failed to enable WAL mode", { error: r });
      }
    C.info("Database service initialized");
  }
  createPrismaClient(t) {
    try {
      const r = rs(), n = new r({
        url: t.datasourceUrl
      });
      return new dr({
        adapter: n,
        log: ["error", "warn"]
      });
    } catch (r) {
      if (t.isPackaged)
        throw r;
      return C.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: r,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new dr({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = bo(), r = m.getPath("userData"), n = ze(), o = process.env.DATABASE_URL, s = !!o;
    let a, i;
    if (s) {
      const d = as(o ?? "");
      a = d.dbPath, i = d.datasourceUrl;
    } else t ? (a = v(tt.join(r, Xr), "dbPath"), i = `file:${a}`) : (a = v(tt.join(process.cwd(), "prisma", "dev.db"), "dbPath"), i = `file:${a}`);
    return process.env.DATABASE_URL = i, await Nt.mkdir(r, { recursive: !0 }), await Nt.mkdir(tt.dirname(a), { recursive: !0 }), await yt(a) || await Nt.writeFile(a, ""), {
      dbPath: a,
      datasourceUrl: i,
      isPackaged: t,
      isTest: n
    };
  }
  async applySchema(t) {
    const r = await yt(t.dbPath), n = t.isPackaged ? process.resourcesPath : process.cwd(), o = tt.join(n, "prisma", "schema.prisma"), s = ss(n), a = tt.join(n, "prisma", "migrations"), i = await yt(a) && await Nt.readdir(a, { withFileTypes: !0 }).then((l) => l.some((c) => c.isDirectory())), d = { ...process.env, DATABASE_URL: t.datasourceUrl };
    if (t.isPackaged) {
      await this.applyPackagedSchema(t, {
        dbExists: r,
        schemaPath: o,
        prismaPath: s,
        hasMigrations: i,
        commandEnv: d
      });
      return;
    }
    if (t.isTest) {
      C.info("Running test database push", {
        dbPath: t.dbPath,
        dbExists: r,
        command: "db push"
      });
      try {
        await ue(
          s,
          ["db", "push", "--accept-data-loss", `--schema=${o}`],
          d
        ), C.info("Test database push completed successfully");
      } catch (l) {
        const c = l;
        C.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: l,
          stdout: c.stdout,
          stderr: c.stderr,
          dbPath: t.dbPath
        }), this.ensurePackagedSqliteSchema(t.dbPath);
      }
      return;
    }
    C.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: r,
      hasMigrations: i,
      command: "db push"
    });
    try {
      await ue(
        s,
        ["db", "push", "--accept-data-loss", `--schema=${o}`],
        d
      ), C.info("Development database ready");
    } catch (l) {
      const c = l;
      throw C.error("Failed to prepare development database", {
        error: l,
        stdout: c.stdout,
        stderr: c.stderr
      }), l;
    }
  }
  async applyPackagedSchema(t, r) {
    const n = is();
    if (n === "bootstrap") {
      C.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: n
      }), this.ensurePackagedSqliteSchema(t.dbPath);
      return;
    }
    const { dbExists: o, schemaPath: s, prismaPath: a, hasMigrations: i, commandEnv: d } = r, l = await yt(s), c = await yt(a);
    if (i && l && c) {
      C.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: o,
        command: "migrate deploy"
      });
      try {
        await ue(a, ["migrate", "deploy", `--schema=${s}`], d), C.info("Production migrations applied successfully");
      } catch (u) {
        const S = u;
        C.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: u,
          stdout: S.stdout,
          stderr: S.stderr,
          schemaMode: n
        });
      }
    } else
      C.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: t.dbPath,
        hasMigrations: i,
        hasSchemaFile: l,
        hasPrismaBinary: c,
        resourcesPath: process.resourcesPath,
        schemaMode: n
      });
    this.ensurePackagedSqliteSchema(t.dbPath);
  }
  ensurePackagedSqliteSchema(t) {
    const r = ns(), n = new r(t);
    try {
      n.pragma("foreign_keys = ON");
      const o = Jo.filter(
        (i) => !this.sqliteTableExists(n, i)
      );
      n.exec(ts);
      const s = [];
      for (const i of Qo)
        this.sqliteTableExists(n, i.table) && (this.sqliteTableHasColumn(n, i.table, i.column) || (n.exec(i.sql), s.push(`${i.table}.${i.column}`)));
      const a = [];
      for (const [i, d] of Object.entries(Zo))
        for (const l of d)
          this.sqliteTableHasColumn(n, i, l) || a.push(`${i}.${l}`);
      if (a.length > 0)
        throw new Error(`Packaged SQLite schema verification failed: missing ${a.join(", ")}`);
      (o.length > 0 || s.length > 0) && C.info("Packaged SQLite schema bootstrap applied", {
        dbPath: t,
        createdTables: o,
        patchedColumns: s
      });
    } finally {
      n.close();
    }
  }
  sqliteTableExists(t, r) {
    return !!t.prepare(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    ).get(r)?.found;
  }
  sqliteTableHasColumn(t, r, n) {
    return this.sqliteTableExists(t, r) ? t.prepare(
      `PRAGMA table_info(${os(r)})`
    ).all().some((a) => a.name === n) : !1;
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
      C.error("Database initialization failed before disconnect", { error: t });
    }), this.prisma && (await this.prisma.$disconnect(), this.prisma = null, C.info("Database disconnected"));
  }
}
const P = ft.getInstance(), cs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  db: P
}, Symbol.toStringTag, { value: "Module" })), Ct = M("BootstrapLifecycle");
let at = { isReady: !1 }, _t = null;
const ds = (e) => e instanceof Error && e.message ? e.message : "Failed to initialize database", ls = () => {
  for (const e of G.getAllWindows())
    if (!e.isDestroyed())
      try {
        e.webContents.send(gt.APP_BOOTSTRAP_STATUS_CHANGED, at);
      } catch (t) {
        Ct.warn("Failed to broadcast bootstrap status", t);
      }
}, he = (e) => {
  at = e, ls();
}, ud = () => at, Qr = async () => {
  if (at.isReady)
    return at;
  if (_t)
    return _t;
  he({ isReady: !1 });
  const e = kr({
    scope: "bootstrap",
    event: "bootstrap.ensure-ready"
  });
  return _t = P.initialize().then(() => (he({ isReady: !0 }), e.complete(Ct, {
    isReady: !0
  }), Ct.info("Bootstrap completed"), at)).catch((t) => {
    const r = ds(t);
    return he({ isReady: !1, error: r }), e.fail(Ct, t, {
      isReady: !1
    }), Ct.error("Bootstrap failed", t), at;
  }).finally(() => {
    _t = null;
  }), _t;
}, Ut = (e) => {
  if (typeof e != "string") return null;
  const t = e.trim();
  if (!t) return null;
  const n = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return n.length > 0 ? n : null;
}, Zr = (e) => {
  const t = e.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, De = (e) => /^https?:\/\//i.test(e), tn = (e) => {
  try {
    const t = new URL(e);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : Zr(t.toString());
  } catch {
    return null;
  }
}, ps = (e) => {
  let t = e.trim();
  if (!t) return null;
  if (De(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, se = (e) => {
  if (!e) return null;
  const t = Ut(e.url), r = Ut(e.anonKey);
  if (!t || !r) return null;
  const n = tn(t);
  return n ? {
    url: n,
    anonKey: r
  } : null;
}, en = (e) => {
  const t = [], r = Ut(e?.url), n = Ut(e?.anonKey);
  r || t.push("SUPABASE_URL_REQUIRED"), n || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let o = null;
  return r && (o = tn(r), o || t.push("SUPABASE_URL_INVALID")), n && n.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !o || !n ? {
    valid: !1,
    issues: t
  } : {
    valid: !0,
    issues: t,
    normalized: {
      url: o,
      anonKey: n
    }
  };
}, ot = (e) => Ut(process.env[e]), us = "https://qzgyjlbpnxxpspoyibpt.supabase.co", hs = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", Es = () => {
  const e = se({
    url: us,
    anonKey: hs
  });
  return e ? {
    ...e,
    source: "legacy"
  } : null;
}, fs = () => {
  const e = se({
    url: ot("SUPABASE_URL") ?? ot("SUPADB_URL") ?? void 0,
    anonKey: ot("SUPABASE_ANON_KEY") ?? ot("SUPABASE_PUBLISHABLE_KEY") ?? ot("SUPADATABASE_API") ?? void 0
  });
  return e ? {
    ...e,
    source: "env"
  } : null;
}, rn = () => {
  const e = g.getRuntimeSupabaseConfig(), t = se(e);
  return t ? {
    ...t,
    source: "runtime"
  } : null;
}, As = () => {
  const e = ot("SUPADATABASE_API"), t = ot("SUPADATABASE_PRJ_ID");
  let r = null, n = null;
  if (e && De(e))
    r = Zr(e);
  else if (t) {
    const o = ps(t);
    o && (r = `https://${o}.supabase.co`);
  }
  return e && !De(e) && (n = e), !r || !n ? null : {
    url: r,
    anonKey: n,
    source: "legacy"
  };
}, Xe = () => fs() ?? rn() ?? As() ?? Es(), lt = () => {
  const e = Xe();
  return e ? {
    url: e.url,
    anonKey: e.anonKey
  } : null;
}, Lt = () => {
  const e = lt();
  if (!e)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return e;
}, nn = () => Xe()?.source ?? null, gs = () => se(rn()) ?? null, Ts = (e) => {
  const t = en(e);
  return !t.valid || !t.normalized || g.setRuntimeSupabaseConfig(t.normalized), t;
}, ms = (e) => en(e), hd = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: Xe,
  getRuntimeSupabaseConfig: gs,
  getSupabaseConfig: lt,
  getSupabaseConfigOrThrow: Lt,
  getSupabaseConfigSource: nn,
  setRuntimeSupabaseConfig: Ts,
  validateRuntimeSupabaseConfig: ms
}, Symbol.toStringTag, { value: "Module" })), wt = M("SyncAuthService"), Ss = "luie://auth/callback", Le = "v2:safe:", Oe = "v2:plain:", qt = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", on = (e) => e.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), ys = () => on(Un(48)), _s = (e) => on(vn("sha256").update(e).digest()), xt = () => {
  const e = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return e && e.length > 0 ? e : Ss;
}, ct = (e, t = "token") => {
  if (z.isEncryptionAvailable()) {
    const n = z.encryptString(e).toString("base64");
    return `${Le}${n}`;
  }
  if (t === "token")
    throw new Error(qt);
  const r = Buffer.from(e, "utf-8").toString("base64");
  return `${Oe}${r}`;
}, ws = (e, t = "token") => {
  const r = Buffer.from(e, "base64");
  if (z.isEncryptionAvailable())
    try {
      const o = z.decryptString(r);
      return {
        plain: o,
        migratedCipher: ct(o, t)
      };
    } catch {
      const o = r.toString("utf-8");
      return {
        plain: o,
        migratedCipher: ct(o, t)
      };
    }
  if (t === "token")
    throw new Error(qt);
  const n = r.toString("utf-8");
  return {
    plain: n,
    migratedCipher: ct(n, t)
  };
}, Gt = (e, t = "token") => {
  if (e.startsWith(Le)) {
    if (!z.isEncryptionAvailable())
      throw new Error(qt);
    const r = e.slice(Le.length), n = Buffer.from(r, "base64");
    try {
      return {
        plain: z.decryptString(n)
      };
    } catch (o) {
      throw new Error(
        `SYNC_TOKEN_DECRYPT_FAILED:${o instanceof Error ? o.message : String(o)}`,
        {
          cause: o
        }
      );
    }
  }
  if (e.startsWith(Oe)) {
    if (t === "token" && !z.isEncryptionAvailable())
      throw new Error(qt);
    const r = e.slice(Oe.length), o = Buffer.from(r, "base64").toString("utf-8"), s = z.isEncryptionAvailable() ? ct(o, t) : void 0;
    return {
      plain: o,
      migratedCipher: s
    };
  }
  return ws(e, t);
};
class Is {
  pendingPkce = null;
  pendingTtlMs = 600 * 1e3;
  clearPendingPkce() {
    this.pendingPkce = null, g.clearPendingSyncAuth();
  }
  storePendingPkce(t) {
    this.pendingPkce = t, g.setPendingSyncAuth({
      state: t.state,
      verifierCipher: ct(t.verifier, "pending"),
      createdAt: new Date(t.createdAt).toISOString(),
      redirectUri: t.redirectUri
    });
  }
  getPendingPkceFromSettings() {
    const t = g.getSyncSettings();
    if (!t.pendingAuthVerifierCipher || !t.pendingAuthCreatedAt)
      return null;
    const r = Date.parse(t.pendingAuthCreatedAt);
    if (!Number.isFinite(r))
      return this.clearPendingPkce(), null;
    try {
      const n = Gt(t.pendingAuthVerifierCipher, "pending");
      return n.migratedCipher && g.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: n.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: n.plain,
        createdAt: r,
        redirectUri: t.pendingAuthRedirectUri || xt()
      };
    } catch (n) {
      return wt.warn("Failed to decode pending OAuth verifier", { error: n }), this.clearPendingPkce(), null;
    }
  }
  getPendingPkce() {
    if (this.pendingPkce) {
      if (!this.pendingPkce.state) {
        const r = g.getSyncSettings().pendingAuthState;
        r && (this.pendingPkce.state = r);
      }
      if (!this.pendingPkce.redirectUri) {
        const r = g.getSyncSettings().pendingAuthRedirectUri;
        this.pendingPkce.redirectUri = r || xt();
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
    return lt() !== null;
  }
  async startGoogleAuth() {
    const t = this.getActivePendingPkce();
    if (t) {
      const i = Date.now() - t.createdAt;
      throw wt.info("OAuth flow already in progress", { ageMs: i }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: r } = Lt(), n = ys(), o = _s(n), s = xt();
    this.storePendingPkce({
      verifier: n,
      createdAt: Date.now(),
      redirectUri: s
    });
    const a = new URL("/auth/v1/authorize", r);
    a.searchParams.set("provider", "google"), a.searchParams.set("redirect_to", s), a.searchParams.set("code_challenge", o), a.searchParams.set("code_challenge_method", "s256"), wt.info("Opening OAuth authorize URL", {
      authorizeBase: `${a.origin}${a.pathname}`,
      redirectUri: s,
      authorizeUrl: a.toString()
    }), await Nn.openExternal(a.toString());
  }
  async completeOAuthCallback(t) {
    const r = this.getPendingPkce();
    if (!r)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - r.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const n = new URL(t), o = n.searchParams, s = n.hash.startsWith("#") ? n.hash.slice(1) : n.hash, a = new URLSearchParams(s), i = (h) => o.get(h) ?? a.get(h), d = i("state"), l = i("code"), c = i("error"), u = i("error_code"), S = i("error_description");
    if (c) {
      this.clearPendingPkce();
      const h = u ?? c, f = S ?? c;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${h}:${f}`
      );
    }
    if (!l)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_CODE_MISSING");
    if (r.state && (!d || d !== r.state))
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_STATE_MISMATCH");
    const I = await this.exchangeCodeForSession(
      l,
      r.verifier,
      r.redirectUri || xt()
    );
    return this.clearPendingPkce(), I;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const r = Gt(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(r);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const r = Gt(t.accessTokenCipher);
      return {
        token: r.plain,
        migratedCipher: r.migratedCipher
      };
    } catch (r) {
      return wt.warn("Failed to decrypt sync access token", { error: r }), {
        token: null,
        errorCode: r instanceof Error ? r.message : String(r)
      };
    }
  }
  getRefreshToken(t) {
    if (!t.refreshTokenCipher)
      return { token: null };
    try {
      const r = Gt(t.refreshTokenCipher);
      return {
        token: r.plain,
        migratedCipher: r.migratedCipher
      };
    } catch (r) {
      return wt.warn("Failed to decrypt sync refresh token", { error: r }), {
        token: null,
        errorCode: r instanceof Error ? r.message : String(r)
      };
    }
  }
  async exchangeCodeForSession(t, r, n) {
    const { url: o, anonKey: s } = Lt(), a = new URL("/auth/v1/token", o);
    a.searchParams.set("grant_type", "pkce");
    const i = await fetch(a, {
      method: "POST",
      headers: {
        apikey: s,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_code: t,
        code_verifier: r,
        redirect_uri: n
      })
    });
    if (!i.ok) {
      const l = await i.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${i.status}:${l}`);
    }
    const d = await i.json();
    return this.toSyncSession(d);
  }
  async exchangeRefreshToken(t) {
    const { url: r, anonKey: n } = Lt(), o = new URL("/auth/v1/token", r);
    o.searchParams.set("grant_type", "refresh_token");
    const s = await fetch(o, {
      method: "POST",
      headers: {
        apikey: n,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh_token: t
      })
    });
    if (!s.ok) {
      const i = await s.text();
      throw new Error(`SYNC_AUTH_REFRESH_FAILED:${s.status}:${i}`);
    }
    const a = await s.json();
    return this.toSyncSession(a);
  }
  toSyncSession(t) {
    const r = t.access_token, n = t.refresh_token, o = t.user?.id;
    if (!r || !n || !o)
      throw new Error("SYNC_AUTH_INVALID_SESSION");
    return {
      provider: "google",
      userId: o,
      email: t.user?.email,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1e3).toISOString() : void 0,
      accessTokenCipher: ct(r),
      refreshTokenCipher: ct(n)
    };
  }
}
const B = new Is(), Ps = M("StartupReadinessService"), Ee = "startup:wizard-completed", sn = () => (/* @__PURE__ */ new Date()).toISOString(), N = (e, t, r, n = !0) => ({
  key: e,
  ok: t,
  blocking: n,
  detail: r,
  checkedAt: sn()
});
class Rs {
  events = new Fn();
  async getReadiness() {
    const t = await this.runChecks(), r = t.filter((s) => s.blocking && !s.ok).map((s) => s.key), n = g.getStartupSettings().completedAt;
    return {
      mustRunWizard: !n || r.length > 0,
      checks: t,
      reasons: r,
      completedAt: n
    };
  }
  async completeWizard() {
    const t = await this.getReadiness();
    if (t.reasons.length > 0)
      return t;
    g.setStartupCompletedAt(sn());
    const r = await this.getReadiness();
    return this.events.emit(Ee, r), r;
  }
  onWizardCompleted(t) {
    return this.events.on(Ee, t), () => {
      this.events.off(Ee, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = z.isEncryptionAvailable();
      return N(
        "osPermission",
        t,
        t ? "safeStorage available" : "safeStorage encryption is unavailable on this OS session"
      );
    } catch (t) {
      return N("osPermission", !1, this.toErrorMessage(t));
    }
  }
  async checkDataDirRW() {
    const t = m.getPath("userData"), r = j.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await Je(t, { recursive: !0 }), await Qe(r, "ok", { encoding: "utf8" }), N("dataDirRW", !0, t);
    } catch (n) {
      return N(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(n)}`
      );
    } finally {
      await Ze(r).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = m.getPath("documents"), r = j.join(t, qr), n = j.join(r, ".startup-probe");
    try {
      return await Je(r, { recursive: !0 }), await Mr(r, ye.R_OK | ye.W_OK), await Qe(n, "ok", { encoding: "utf8" }), N("defaultLuiePath", !0, r);
    } catch (o) {
      return N(
        "defaultLuiePath",
        !1,
        `${r}: ${this.toErrorMessage(o)}`
      );
    } finally {
      await Ze(n).catch(() => {
      });
    }
  }
  async checkSqliteConnect() {
    try {
      return await P.initialize(), P.getClient(), N("sqliteConnect", !0, "SQLite connection ready");
    } catch (t) {
      return N("sqliteConnect", !1, this.toErrorMessage(t));
    }
  }
  async checkSqliteWal() {
    try {
      return await P.initialize(), N("sqliteWal", !0, "WAL mode enforced during DB initialization");
    } catch (t) {
      return N("sqliteWal", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseRuntimeConfig() {
    try {
      const t = lt(), r = nn();
      return t ? N(
        "supabaseRuntimeConfig",
        !0,
        r ? `resolved from ${r}` : "resolved"
      ) : N(
        "supabaseRuntimeConfig",
        !1,
        "Runtime Supabase configuration is not completed"
      );
    } catch (t) {
      return N("supabaseRuntimeConfig", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseSession() {
    try {
      const t = g.getSyncSettings();
      if (!t.connected || !t.userId)
        return N(
          "supabaseSession",
          !1,
          "Sync login is not connected yet (non-blocking)",
          !1
        );
      const r = B.getAccessToken(t), n = B.getRefreshToken(t);
      if (!(!!r.token || !!n.token))
        return N(
          "supabaseSession",
          !1,
          r.errorCode ?? n.errorCode ?? "No usable JWT token",
          !1
        );
      if (!r.token)
        return N(
          "supabaseSession",
          !1,
          "Access token is unavailable. Reconnect sync login.",
          !1
        );
      const s = lt();
      if (!s)
        return N(
          "supabaseSession",
          !1,
          "Runtime Supabase configuration is not completed",
          !1
        );
      const a = await fetch(`${s.url}/functions/v1/luieEnv`, {
        method: "GET",
        headers: {
          apikey: s.anonKey,
          Authorization: `Bearer ${r.token}`
        }
      });
      if (!a.ok)
        return N(
          "supabaseSession",
          !1,
          `Edge auth health check failed (${a.status})`,
          !1
        );
      let i = null;
      try {
        i = await a.json();
      } catch {
        i = null;
      }
      return i?.ok ? N(
        "supabaseSession",
        !0,
        i.userId ?? t.email ?? t.userId,
        !1
      ) : N(
        "supabaseSession",
        !1,
        "Edge auth health response is invalid",
        !1
      );
    } catch (t) {
      return Ps.warn("Startup session check failed", { error: t }), N("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const fe = new Rs(), pr = 1500, Ns = 8e3, Cs = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), Ds = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), Ls = (e) => e ? process.env.LUIE_DEV_CSP === "1" ? Ds() : null : Cs(), Os = (e) => e.startsWith("file://"), bs = async (e, t, r) => {
  e.error("Renderer process crashed", {
    killed: r,
    webContentsId: t.id
  });
  try {
    const { autoSaveManager: o } = await import("./autoSaveManager-DayVX5OV.js").then((s) => s.d);
    await o.flushCritical(), e.info("Emergency save completed after crash");
  } catch (o) {
    e.error("Failed to save during crash recovery", o);
  }
  const n = U.getMainWindow();
  n && !n.isDestroyed() && ((await Se.showMessageBox(n, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (U.closeMainWindow(), setTimeout(() => {
    U.createMainWindow();
  }, 500)) : m.quit());
}, js = async (e) => {
  const t = Date.now(), r = await Qr();
  if (!r.isReady) {
    e.error("App bootstrap did not complete", r);
    return;
  }
  try {
    const { autoSaveManager: n } = await import("./autoSaveManager-DayVX5OV.js").then((s) => s.d);
    await n.flushMirrorsToSnapshots("startup-recovery");
    const { snapshotService: o } = await import("./snapshotService-BSZ4abpR.js").then((s) => s.a);
    o.pruneSnapshotsAllProjects(), o.cleanupOrphanArtifacts("startup");
  } catch (n) {
    e.warn("Snapshot recovery/pruning skipped", n);
  }
  try {
    const { projectService: n } = await Promise.resolve().then(() => _n);
    await n.reconcileProjectPathDuplicates();
  } catch (n) {
    e.warn("Project path duplicate reconciliation skipped", n);
  }
  try {
    const { entityRelationService: n } = await import("./entityRelationService-CK7wN6Oz.js");
    await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !0 }), await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !1 });
  } catch (n) {
    e.warn("Entity relation orphan cleanup skipped", n);
  }
  e.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - t
  });
}, Fs = (e, t = {}) => {
  const r = t.startupStartedAtMs ?? Date.now();
  m.whenReady().then(async () => {
    e.info("App is ready", {
      startupElapsedMs: Date.now() - r
    });
    const n = Oo(), o = Ls(n);
    let s = !1, a = !1, i = !1, d = null;
    const l = (f) => {
      if (!s && (s = !0, U.showMainWindow(), e.info("Startup checkpoint: renderer ready", {
        reason: f,
        startupElapsedMs: Date.now() - r
      }), e.info("Startup checkpoint: main window shown", {
        reason: f,
        startupElapsedMs: Date.now() - r
      }), !!t.onFirstRendererReady))
        try {
          t.onFirstRendererReady();
        } catch (A) {
          e.warn("Startup hook failed: onFirstRendererReady", A);
        }
    }, c = (f) => {
      a || (a = !0, e.info("Deferred startup maintenance scheduled", {
        reason: f,
        delayMs: pr
      }), setTimeout(() => {
        js(e);
      }, pr));
    }, u = (f) => {
      if (i) return;
      i = !0, e.info("Starting main window flow", {
        reason: f,
        startupElapsedMs: Date.now() - r
      }), U.createMainWindow({ deferShow: !0 }), e.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - r
      });
      const A = Date.now();
      Qr().then((T) => {
        e.info("Startup checkpoint: bootstrap ready", {
          isReady: T.isReady,
          bootstrapElapsedMs: Date.now() - A,
          startupElapsedMs: Date.now() - r
        }), T.isReady || e.error("App bootstrap did not complete", T);
      }).catch((T) => {
        e.error("App bootstrap did not complete", T);
      }), d && clearTimeout(d), d = setTimeout(() => {
        s || l("fallback-timeout"), c("fallback-timeout");
      }, Ns);
    };
    n && qe.defaultSession.webRequest.onBeforeSendHeaders((f, A) => {
      A({
        requestHeaders: {
          ...f.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), qe.defaultSession.webRequest.onHeadersReceived((f, A) => {
      const T = {
        ...f.responseHeaders
      };
      n && (T["Access-Control-Allow-Origin"] = ["*"], T["Access-Control-Allow-Headers"] = ["*"], T["Access-Control-Allow-Methods"] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]), o && !Os(f.url) && (T["Content-Security-Policy"] = [o]), A({ responseHeaders: T });
    }), m.on("web-contents-created", (f, A) => {
      A.on(
        "did-fail-load",
        (T, D, pt, St, E) => {
          e.error("Renderer failed to load", {
            errorCode: D,
            errorDescription: pt,
            validatedURL: St,
            isMainFrame: E,
            startupElapsedMs: Date.now() - r
          });
        }
      ), A.on("did-finish-load", () => {
        const T = Date.now() - r;
        e.info("Renderer finished load", {
          url: A.getURL(),
          startupElapsedMs: T
        }), A.getType() === "window" && U.isMainWindowWebContentsId(A.id) && (l("did-finish-load"), c("did-finish-load"));
      }), A.on("console-message", (T) => {
        const { level: D, message: pt, lineNumber: St, sourceId: E } = T;
        (D === "error" ? 3 : D === "warning" ? 2 : D === "info" ? 1 : 0) < 2 || e.warn("Renderer console message", {
          level: D,
          message: pt,
          line: St,
          sourceId: E
        });
      }), A.on("render-process-gone", (T, D) => {
        bs(e, A, D.reason === "killed");
      });
    });
    const S = Date.now(), { registerIPCHandlers: I } = await import("./index-D7ISrhTk.js");
    I(), e.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - S,
      startupElapsedMs: Date.now() - r
    }), Xo(g.getMenuBarMode());
    const h = await fe.getReadiness();
    e.info("Startup readiness evaluated", {
      mustRunWizard: h.mustRunWizard,
      reasons: h.reasons,
      completedAt: h.completedAt
    }), h.mustRunWizard ? (U.createStartupWizardWindow(), e.info("Startup wizard requested before main window", {
      reasons: h.reasons
    })) : u("readiness-pass"), fe.onWizardCompleted((f) => {
      e.info("Startup wizard completion received", {
        mustRunWizard: f.mustRunWizard,
        reasons: f.reasons
      }), !f.mustRunWizard && (U.closeStartupWizardWindow(), u("wizard-complete"));
    }), m.on("activate", () => {
      G.getAllWindows().length === 0 && fe.getReadiness().then((f) => {
        if (f.mustRunWizard) {
          U.createStartupWizardWindow();
          return;
        }
        u("activate");
      });
    });
  });
}, Us = "crash-reports", ur = 100;
let hr = !1;
const Ae = (e) => e.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), be = (e, t = 0) => {
  if (e == null) return e;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof e == "string" || typeof e == "number" || typeof e == "boolean")
    return typeof e == "string" ? Ae(e) : e;
  if (typeof e == "bigint" || typeof e == "symbol") return e.toString();
  if (typeof e == "function") return "[Function]";
  if (e instanceof Error)
    return {
      name: e.name,
      message: Ae(e.message),
      stack: e.stack ? Ae(e.stack) : void 0
    };
  if (Array.isArray(e))
    return e.slice(0, 50).map((r) => be(r, t + 1));
  if (typeof e == "object") {
    const n = Object.entries(e).slice(0, 100), o = {};
    for (const [s, a] of n)
      o[s] = be(a, t + 1);
    return o;
  }
  return String(e);
}, vs = () => j.join(m.getPath("userData"), Us), Ms = async (e, t) => {
  const r = await At.readdir(e, { withFileTypes: !0 }), n = await Promise.all(
    r.filter((s) => s.isFile() && s.name.endsWith(".json")).map(async (s) => {
      const a = j.join(e, s.name), i = await At.stat(a);
      return { fullPath: a, mtimeMs: i.mtimeMs };
    })
  );
  if (n.length <= ur) return;
  n.sort((s, a) => a.mtimeMs - s.mtimeMs);
  const o = n.slice(ur);
  await Promise.all(
    o.map(async (s) => {
      try {
        await At.rm(s.fullPath, { force: !0 });
      } catch (a) {
        t.warn("Failed to remove stale crash report", { error: a, path: s.fullPath });
      }
    })
  );
}, Ws = async (e, t, r) => {
  const n = vs();
  await At.mkdir(n, { recursive: !0 });
  const o = (/* @__PURE__ */ new Date()).toISOString(), s = V(), a = `${o.replace(/[:.]/g, "-")}-${t}-${s}.json`, i = j.join(n, a), d = `${i}.tmp`, l = {
    id: s,
    timestamp: o,
    type: t,
    appVersion: m.getVersion(),
    isPackaged: m.isPackaged,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    processType: process.type,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    payload: be(r)
  };
  await At.writeFile(d, JSON.stringify(l, null, 2), "utf-8"), await At.rename(d, i), await Ms(n, e);
}, ks = (e, t) => {
  const r = t ?? {}, n = e ?? {};
  return {
    webContentsId: typeof n.id == "number" ? n.id : void 0,
    reason: r.reason,
    exitCode: r.exitCode
  };
}, Bs = (e) => {
  const t = e ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, $s = (e) => {
  if (hr) return;
  hr = !0;
  const t = (r, n) => {
    Ws(e, r, n).catch((o) => {
      e.warn("Failed to persist crash report", { error: o, kind: r });
    });
  };
  process.on("uncaughtExceptionMonitor", (r, n) => {
    t("uncaught-exception", {
      origin: n,
      error: r
    });
  }), process.on("unhandledRejection", (r) => {
    t("unhandled-rejection", {
      reason: r
    });
  }), m.on("render-process-gone", (r, n, o) => {
    t("render-process-gone", ks(n, o));
  }), m.on("child-process-gone", (r, n) => {
    t("child-process-gone", Bs(n));
  });
}, an = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), xs = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), O = (e) => !!(e && typeof e == "object" && !Array.isArray(e)), cn = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, Gs = (e) => {
  if (O(e))
    return typeof e.updatedAt == "string" ? e.updatedAt : void 0;
}, Hs = (e, t = "pen") => typeof e == "string" && xs.has(e) ? e : t, zs = (e, t = "mountain") => typeof e == "string" && an.has(e) ? e : t, dn = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!O(n)) continue;
    const o = n.type;
    if (o !== "path" && o !== "text" && o !== "icon") continue;
    const s = {
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `path-${r}`,
      type: o,
      color: typeof n.color == "string" ? n.color : "#000000"
    };
    typeof n.d == "string" && (s.d = n.d), typeof n.width == "number" && (s.width = n.width), typeof n.x == "number" && (s.x = n.x), typeof n.y == "number" && (s.y = n.y), typeof n.text == "string" && (s.text = n.text), typeof n.icon == "string" && an.has(n.icon) && (s.icon = n.icon), t.push(s);
  }
  return t;
}, ln = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!O(n)) continue;
    const o = n.position;
    if (!O(o)) continue;
    const s = O(n.data) ? n.data : void 0;
    t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `node-${r}`,
      type: typeof n.type == "string" ? n.type : void 0,
      position: {
        x: typeof o.x == "number" ? o.x : 0,
        y: typeof o.y == "number" ? o.y : 0
      },
      data: {
        label: typeof s?.label == "string" ? s.label : "",
        image: typeof s?.image == "string" ? s.image : void 0
      }
    });
  }
  return t;
}, pn = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!O(n)) continue;
    const o = typeof n.source == "string" ? n.source : "", s = typeof n.target == "string" ? n.target : "";
    !o || !s || t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `edge-${r}`,
      source: o,
      target: s,
      type: typeof n.type == "string" ? n.type : void 0
    });
  }
  return t;
}, Ys = (e, t, r) => O(e) ? {
  id: typeof e.id == "string" && e.id.length > 0 ? e.id : `memo-${t}`,
  title: typeof e.title == "string" ? e.title : "",
  content: typeof e.content == "string" ? e.content : "",
  tags: Array.isArray(e.tags) ? e.tags.filter((n) => typeof n == "string") : [],
  updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : r()
} : null, un = (e, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(e) ? e.map((r, n) => Ys(r, n, t)).filter((r) => r !== null) : [], hn = (e, t = () => (/* @__PURE__ */ new Date()).toISOString()) => O(e) ? {
  memos: un(e.memos, t),
  updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : void 0
} : { memos: [] }, Kt = 5 * 1024 * 1024, vt = (e) => X.posix.normalize(e.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), Jt = (e) => {
  const t = vt(e);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !X.isAbsolute(t);
}, Wt = (e) => e.toLowerCase().endsWith(x) ? e : `${e}${x}`, Er = (e) => process.platform === "win32" ? e.toLowerCase() : e, Xs = (e, t) => {
  const r = Er(X.resolve(e)), n = Er(X.resolve(t));
  return r === n || r.startsWith(`${n}${X.sep}`);
}, En = async (e, t, r) => {
  const n = vt(t);
  if (!n || !Jt(n))
    throw new Error("INVALID_RELATIVE_PATH");
  let o = !1, s = null;
  return await new Promise((a, i) => {
    Mn.open(e, { lazyEntries: !0 }, (d, l) => {
      if (d || !l) {
        i(d ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      l.on("entry", (c) => {
        const u = vt(c.fileName);
        if (!u || !Jt(u)) {
          r?.error("Unsafe zip entry skipped", { entry: c.fileName, zipPath: e }), l.readEntry();
          return;
        }
        if (u !== n) {
          l.readEntry();
          return;
        }
        if (c.fileName.endsWith("/")) {
          o = !0, s = null, l.close(), a();
          return;
        }
        l.openReadStream(c, (S, I) => {
          if (S || !I) {
            i(S ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          o = !0;
          const h = [], f = I;
          let A = 0;
          f.on("data", (T) => {
            if (A += T.length, A > Kt) {
              f.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${u}:${Kt}`
                )
              );
              return;
            }
            h.push(T);
          }), f.on("end", () => {
            s = Buffer.concat(h).toString("utf-8"), l.close(), a();
          }), f.on("error", i);
        });
      }), l.on("end", () => {
        o || a();
      }), l.on("error", i), l.readEntry();
    });
  }), s;
}, H = async (e, t, r) => {
  const n = Wt(e), o = vt(t);
  if (!o || !Jt(o))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const s = await k.stat(n);
    if (s.isDirectory()) {
      const a = await k.realpath(n), i = X.resolve(n, o);
      try {
        const d = await k.realpath(i);
        if (!Xs(d, a))
          throw new Error("INVALID_RELATIVE_PATH");
        const l = await k.stat(d);
        if (l.isDirectory())
          return null;
        if (l.size > Kt)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${o}:${Kt}`
          );
        return await k.readFile(d, "utf-8");
      } catch (d) {
        if (d?.code === "ENOENT") return null;
        throw d;
      }
    }
    if (s.isFile())
      return await En(n, o, r);
  } catch (s) {
    if (s?.code === "ENOENT") return null;
    throw s;
  }
  return null;
}, fn = () => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: []
}), Y = (e) => {
  if (!e) return 0;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : 0;
}, fr = (e, t, r, n) => {
  const o = e?.[t];
  if (!o) return 0;
  const s = r === "chapter" ? o.chapter : o.memo;
  return Y(s[n]);
}, ae = (e, t) => Y(e.updatedAt) >= Y(t.updatedAt) ? [e, t] : [t, e], It = (e, t) => {
  const r = /* @__PURE__ */ new Map();
  for (const n of e)
    r.set(n.id, n);
  for (const n of t) {
    const o = r.get(n.id);
    if (!o) {
      r.set(n.id, n);
      continue;
    }
    const [s] = ae(o, n);
    r.set(n.id, s);
  }
  return Array.from(r.values());
}, Vs = (e, t) => {
  const r = /* @__PURE__ */ new Map();
  for (const n of e)
    r.set(`${n.projectId}:${n.docType}`, n);
  for (const n of t) {
    const o = `${n.projectId}:${n.docType}`, s = r.get(o);
    if (!s) {
      r.set(o, n);
      continue;
    }
    const [a] = ae(s, n);
    r.set(o, a);
  }
  return Array.from(r.values());
}, Ar = (e, t, r, n, o, s) => {
  const a = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  let d = 0;
  const l = [];
  for (const c of t)
    i.set(c.id, c);
  for (const c of e)
    a.set(c.id, c);
  for (const c of t) {
    const u = a.get(c.id);
    if (!u) {
      a.set(c.id, c);
      continue;
    }
    const [S, I] = ae(
      u,
      c
    );
    let h = S;
    if (u.content !== c.content && (o ? o(u, c) : !0)) {
      const A = `${r}:${u.id}`, T = s?.[A];
      if (T === "local")
        h = u;
      else if (T === "remote")
        h = c;
      else {
        d += 1, l.push({
          type: r,
          id: u.id,
          projectId: u.projectId,
          title: u.title,
          localUpdatedAt: u.updatedAt,
          remoteUpdatedAt: c.updatedAt,
          localPreview: u.content.slice(0, 400),
          remotePreview: c.content.slice(0, 400)
        });
        const D = n(I);
        a.set(D.id, D);
      }
    }
    a.set(c.id, h);
  }
  for (const [c, u] of i.entries())
    a.has(c) || a.set(c, u);
  return {
    merged: Array.from(a.values()),
    conflicts: d,
    conflictItems: l
  };
}, qs = (e, t, r) => {
  const n = e + t;
  return {
    chapters: e,
    memos: t,
    total: n,
    items: r.length > 0 ? r : void 0
  };
}, Ks = (e) => {
  const t = /* @__PURE__ */ new Map();
  for (const a of e.tombstones) {
    const i = `${a.entityType}:${a.entityId}`, d = t.get(i);
    if (!d) {
      t.set(i, a);
      continue;
    }
    const [l] = ae(d, a);
    t.set(i, l);
  }
  const r = /* @__PURE__ */ new Set();
  for (const a of e.projects)
    a.deletedAt && r.add(a.id);
  for (const a of t.values())
    a.entityType === "project" && (r.add(a.entityId), r.add(a.projectId));
  const n = (a) => r.has(a), o = (a) => {
    const i = t.get(`chapter:${a.id}`);
    if (!i) return a;
    const d = i.deletedAt, l = Y(i.updatedAt) > Y(a.updatedAt) ? i.updatedAt : a.updatedAt;
    return {
      ...a,
      deletedAt: d,
      updatedAt: l
    };
  }, s = (a, i) => i.filter(
    (d) => !t.has(`${a}:${d.id}`)
  );
  return {
    ...e,
    projects: s(
      "project",
      e.projects.filter((a) => !n(a.id))
    ),
    chapters: e.chapters.filter((a) => !n(a.projectId)).map(o),
    characters: s(
      "character",
      e.characters.filter(
        (a) => !n(a.projectId)
      )
    ),
    terms: s(
      "term",
      e.terms.filter((a) => !n(a.projectId))
    ),
    worldDocuments: e.worldDocuments.filter(
      (a) => !n(a.projectId)
    ),
    memos: s(
      "memo",
      e.memos.filter((a) => !n(a.projectId))
    ),
    snapshots: s(
      "snapshot",
      e.snapshots.filter(
        (a) => !n(a.projectId)
      )
    )
  };
}, Js = (e, t, r) => {
  const n = new Set(
    [...e.tombstones, ...t.tombstones].map(
      (l) => `${l.entityType}:${l.entityId}`
    )
  ), o = r?.baselinesByProjectId, s = Ar(
    e.chapters,
    t.chapters,
    "chapter",
    (l) => ({
      ...l,
      id: V(),
      title: `${l.title} (Conflict Copy)`,
      order: l.order + 1e4,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, c) => l.projectId === c.projectId && !l.deletedAt && !c.deletedAt && !n.has(`chapter:${l.id}`) && !n.has(`chapter:${c.id}`) && (() => {
      const u = fr(
        o,
        l.projectId,
        "chapter",
        l.id
      );
      return u <= 0 ? !1 : Y(l.updatedAt) > u && Y(c.updatedAt) > u;
    })(),
    r?.conflictResolutions
  ), a = Ar(
    e.memos,
    t.memos,
    "memo",
    (l) => ({
      ...l,
      id: V(),
      title: `${l.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, c) => l.projectId === c.projectId && !l.deletedAt && !c.deletedAt && !n.has(`memo:${l.id}`) && !n.has(`memo:${c.id}`) && (() => {
      const u = fr(
        o,
        l.projectId,
        "memo",
        l.id
      );
      return u <= 0 ? !1 : Y(l.updatedAt) > u && Y(c.updatedAt) > u;
    })(),
    r?.conflictResolutions
  ), i = [
    ...s.conflictItems,
    ...a.conflictItems
  ], d = {
    projects: It(e.projects, t.projects),
    chapters: s.merged,
    characters: It(e.characters, t.characters),
    terms: It(e.terms, t.terms),
    worldDocuments: Vs(e.worldDocuments, t.worldDocuments),
    memos: a.merged,
    snapshots: It(e.snapshots, t.snapshots),
    tombstones: It(e.tombstones, t.tombstones)
  };
  return {
    merged: Ks(d),
    conflicts: qs(
      s.conflicts,
      a.conflicts,
      i
    )
  };
}, Qs = [
  { docType: "synopsis", fileName: Mt },
  { docType: "plot", fileName: te },
  { docType: "drawing", fileName: ee },
  { docType: "mindmap", fileName: re },
  { docType: "graph", fileName: ne }
], Zs = {
  synopsis: Mt,
  plot: te,
  drawing: ee,
  mindmap: re,
  graph: ne,
  scrap: He
}, ta = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], rt = (e, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof e == "string" && e.length > 0 ? e : e instanceof Date ? e.toISOString() : t, L = (e) => typeof e == "string" ? e : null, je = (e, t = 0) => typeof e == "number" && Number.isFinite(e) ? e : t, ea = (e, t, r) => {
  const n = L(r.id);
  if (!n) return null;
  const o = rt(r.updatedAt);
  return e.projects.push({
    id: n,
    userId: t,
    title: L(r.title) ?? "Untitled",
    description: L(r.description),
    createdAt: rt(r.createdAt),
    updatedAt: o
  }), {
    projectId: n,
    projectPath: L(r.projectPath),
    projectUpdatedAt: o
  };
}, ra = (e, t, r, n) => {
  for (const o of n) {
    const s = L(o.id);
    if (!s) continue;
    const a = L(o.deletedAt);
    e.chapters.push({
      id: s,
      userId: t,
      projectId: r,
      title: L(o.title) ?? "Untitled",
      content: L(o.content) ?? "",
      synopsis: L(o.synopsis),
      order: je(o.order),
      wordCount: je(o.wordCount),
      createdAt: rt(o.createdAt),
      updatedAt: rt(o.updatedAt),
      deletedAt: a
    }), a && e.tombstones.push({
      id: `${r}:chapter:${s}`,
      userId: t,
      projectId: r,
      entityType: "chapter",
      entityId: s,
      deletedAt: a,
      updatedAt: a
    });
  }
}, na = (e, t, r, n) => {
  for (const o of n) {
    const s = L(o.id);
    s && e.characters.push({
      id: s,
      userId: t,
      projectId: r,
      name: L(o.name) ?? "Character",
      description: L(o.description),
      firstAppearance: L(o.firstAppearance),
      attributes: L(o.attributes),
      createdAt: rt(o.createdAt),
      updatedAt: rt(o.updatedAt)
    });
  }
}, oa = (e, t, r, n) => {
  for (const o of n) {
    const s = L(o.id);
    s && e.terms.push({
      id: s,
      userId: t,
      projectId: r,
      term: L(o.term) ?? "Term",
      definition: L(o.definition),
      category: L(o.category),
      order: je(o.order),
      firstAppearance: L(o.firstAppearance),
      createdAt: rt(o.createdAt),
      updatedAt: rt(o.updatedAt)
    });
  }
}, sa = (e, t, r) => {
  for (const n of r)
    e.tombstones.push({
      id: `${n.projectId}:project:${n.projectId}`,
      userId: t,
      projectId: n.projectId,
      entityType: "project",
      entityId: n.projectId,
      deletedAt: n.deletedAt,
      updatedAt: n.deletedAt
    });
}, gr = (e, t, r, n, o, s) => {
  e.worldDocuments.push({
    id: `${r}:${n}`,
    userId: t,
    projectId: r,
    docType: n,
    payload: o,
    updatedAt: Gs(o) ?? s
  });
}, Fe = async (e, t, r) => {
  const n = Zs[t], o = `${F}/${n}`;
  let s;
  try {
    s = await H(e, o, r);
  } catch (i) {
    return r.warn("Failed to read .luie world document for sync; skipping doc", {
      projectPath: e,
      entryPath: o,
      docType: t,
      error: i
    }), null;
  }
  if (s === null)
    return null;
  const a = cn(s);
  return a === null ? (r.warn("Failed to parse .luie world document for sync; skipping doc", {
    projectPath: e,
    entryPath: o,
    docType: t
  }), null) : a;
}, aa = (e, t, r, n, o) => {
  const s = hn(n);
  for (const a of s.memos)
    e.memos.push({
      id: a.id || V(),
      userId: t,
      projectId: r,
      title: a.title || "Memo",
      content: a.content,
      tags: a.tags,
      updatedAt: a.updatedAt || o
    });
}, ia = async (e) => {
  for (const r of Qs) {
    const n = await Fe(
      e.projectPath,
      r.docType,
      e.logger
    );
    n && gr(
      e.bundle,
      e.userId,
      e.projectId,
      r.docType,
      n,
      e.updatedAtFallback
    );
  }
  const t = await Fe(
    e.projectPath,
    "scrap",
    e.logger
  );
  O(t) && (gr(
    e.bundle,
    e.userId,
    e.projectId,
    "scrap",
    t,
    e.updatedAtFallback
  ), aa(
    e.bundle,
    e.userId,
    e.projectId,
    t,
    e.updatedAtFallback
  ));
}, ca = async (e, t, r, n) => {
  const o = ea(e, t, r);
  if (!o) return;
  const { projectId: s, projectPath: a, projectUpdatedAt: i } = o;
  if (ra(
    e,
    t,
    s,
    Array.isArray(r.chapters) ? r.chapters : []
  ), na(
    e,
    t,
    s,
    Array.isArray(r.characters) ? r.characters : []
  ), oa(
    e,
    t,
    s,
    Array.isArray(r.terms) ? r.terms : []
  ), a && a.toLowerCase().endsWith(x))
    try {
      const d = v(
        a,
        "projectPath"
      );
      await ia({
        bundle: e,
        userId: t,
        projectId: s,
        projectPath: d,
        updatedAtFallback: i,
        logger: n
      });
    } catch (d) {
      n.warn("Skipping sync world document read for invalid projectPath", {
        projectId: s,
        projectPath: a,
        error: d
      });
    }
}, da = async (e) => {
  const t = fn();
  for (const r of e.projectRows)
    await ca(
      t,
      e.userId,
      r,
      e.logger
    );
  return sa(
    t,
    e.userId,
    e.pendingProjectDeletes
  ), t;
}, Tr = async (e, t, r) => {
  const n = ta.filter(
    (o) => !e.has(o)
  );
  n.length !== 0 && await Promise.all(
    n.map(async (o) => {
      const s = await Fe(
        t,
        o,
        r
      );
      s !== null && e.set(o, s);
    })
  );
}, mr = (e) => {
  if (!e) return;
  const t = Object.entries(e);
  if (t.length !== 0)
    return Object.fromEntries(
      t.map(([r, n]) => [
        r,
        {
          state: "synced",
          lastSyncedAt: n
        }
      ])
    );
}, la = (e, t) => {
  const r = { ...e ?? {} };
  for (const n of t.items ?? [])
    r[n.projectId] = {
      state: "pending",
      lastSyncedAt: r[n.projectId]?.lastSyncedAt,
      reason: "SYNC_CONFLICT_DETECTED"
    };
  return Object.keys(r).length > 0 ? r : void 0;
}, An = (e, t) => {
  if (!e) return e;
  const r = Object.fromEntries(
    Object.entries(e).map(([n, o]) => [
      n,
      {
        state: "error",
        lastSyncedAt: o.lastSyncedAt,
        reason: t
      }
    ])
  );
  return Object.keys(r).length > 0 ? r : void 0;
}, pa = (e, t, r, n) => {
  const o = {
    ...e.projectLastSyncedAtByProjectId ?? {}
  };
  for (const s of n)
    delete o[s];
  for (const s of t.projects) {
    if (s.deletedAt) {
      delete o[s.id];
      continue;
    }
    o[s.id] = r;
  }
  for (const s of t.tombstones)
    s.entityType === "project" && (delete o[s.entityId], delete o[s.projectId]);
  return Object.keys(o).length > 0 ? o : void 0;
}, ua = (e) => {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.projects)
    r.deletedAt && t.add(r.id);
  for (const r of e.tombstones)
    r.entityType === "project" && (t.add(r.entityId), t.add(r.projectId));
  return t;
}, Sr = (e, t) => {
  for (const r of t)
    delete e[r];
}, ha = (e, t, r, n) => {
  const o = /* @__PURE__ */ new Set();
  for (const s of t.projects)
    s.deletedAt || r.has(s.id) || (o.add(s.id), e[s.id] = {
      chapter: {},
      memo: {},
      capturedAt: n
    });
  return o;
}, Ea = (e, t, r, n, o) => {
  for (const s of t.chapters) {
    if (s.deletedAt || r.has(s.projectId) || !n.has(s.projectId)) continue;
    const a = e[s.projectId];
    a && (a.chapter[s.id] = s.updatedAt, a.capturedAt = o);
  }
}, fa = (e, t, r, n, o) => {
  for (const s of t.memos) {
    if (s.deletedAt || r.has(s.projectId) || !n.has(s.projectId)) continue;
    const a = e[s.projectId];
    a && (a.memo[s.id] = s.updatedAt, a.capturedAt = o);
  }
}, Aa = (e, t, r, n) => {
  const o = {
    ...e.entityBaselinesByProjectId ?? {}
  };
  Sr(o, n);
  const s = ua(t);
  Sr(o, Array.from(s));
  const a = ha(
    o,
    t,
    s,
    r
  );
  return Ea(o, t, s, a, r), fa(o, t, s, a, r), Object.keys(o).length > 0 ? o : void 0;
}, ga = async (e) => {
  const t = (s) => {
    s && g.setSyncSettings({
      accessTokenCipher: s
    });
  }, r = e.syncSettings.expiresAt ? Date.parse(e.syncSettings.expiresAt) <= Date.now() + 6e4 : !0, n = B.getAccessToken(e.syncSettings);
  if (n.errorCode && e.isAuthFatalMessage(n.errorCode))
    throw new Error(n.errorCode);
  t(n.migratedCipher);
  let o = n.token;
  if (r || !o) {
    const s = B.getRefreshToken(e.syncSettings);
    if (s.errorCode && e.isAuthFatalMessage(s.errorCode))
      throw new Error(s.errorCode);
    if (s.migratedCipher && g.setSyncSettings({
      refreshTokenCipher: s.migratedCipher
    }), !s.token)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const a = await B.refreshSession(e.syncSettings), i = g.setSyncSettings({
      provider: a.provider,
      userId: a.userId,
      email: a.email,
      expiresAt: a.expiresAt,
      accessTokenCipher: a.accessTokenCipher,
      refreshTokenCipher: a.refreshTokenCipher
    }), d = B.getAccessToken(i);
    if (d.errorCode && e.isAuthFatalMessage(d.errorCode))
      throw new Error(d.errorCode);
    t(d.migratedCipher), o = d.token;
  }
  if (!o)
    throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  return o;
}, Ta = (e) => {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.projects)
    r.deletedAt && t.add(r.id);
  for (const r of e.tombstones)
    r.entityType === "project" && (t.add(r.entityId), t.add(r.projectId));
  return t;
}, ma = async (e, t) => {
  for (const r of t)
    (await e.project.findUnique({
      where: { id: r },
      select: { id: !0 }
    }))?.id && await e.project.delete({ where: { id: r } });
}, Sa = async (e, t, r) => {
  for (const n of t) {
    if (n.deletedAt || r.has(n.id)) continue;
    if ((await e.project.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    }))?.id) {
      await e.project.update({
        where: { id: n.id },
        data: {
          title: n.title,
          description: n.description,
          updatedAt: new Date(n.updatedAt)
        }
      });
      continue;
    }
    await e.project.create({
      data: {
        id: n.id,
        title: n.title,
        description: n.description,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        settings: {
          create: {
            autoSave: !0,
            autoSaveInterval: Ge
          }
        }
      }
    });
  }
}, ya = async (e, t) => {
  const r = await e.chapter.findUnique({
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
  r?.id ? await e.chapter.update({
    where: { id: t.id },
    data: n
  }) : await e.chapter.create({
    data: {
      id: t.id,
      ...n,
      createdAt: new Date(t.createdAt)
    }
  });
}, _a = async (e, t, r) => {
  for (const n of t) {
    if (r.has(n.projectId)) continue;
    const o = await e.character.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    });
    if (n.deletedAt) {
      o?.id && await e.character.delete({ where: { id: n.id } });
      continue;
    }
    const s = {
      name: n.name,
      description: n.description,
      firstAppearance: n.firstAppearance,
      attributes: typeof n.attributes == "string" ? n.attributes : JSON.stringify(n.attributes ?? null),
      updatedAt: new Date(n.updatedAt),
      project: {
        connect: { id: n.projectId }
      }
    };
    o?.id ? await e.character.update({ where: { id: n.id }, data: s }) : await e.character.create({
      data: {
        id: n.id,
        ...s,
        createdAt: new Date(n.createdAt)
      }
    });
  }
}, wa = async (e, t, r) => {
  for (const n of t) {
    if (r.has(n.projectId)) continue;
    const o = await e.term.findUnique({
      where: { id: n.id },
      select: { id: !0 }
    });
    if (n.deletedAt) {
      o?.id && await e.term.delete({ where: { id: n.id } });
      continue;
    }
    const s = {
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
    o?.id ? await e.term.update({ where: { id: n.id }, data: s }) : await e.term.create({
      data: {
        id: n.id,
        ...s,
        createdAt: new Date(n.createdAt)
      }
    });
  }
}, Ia = async (e, t, r) => {
  for (const n of t) {
    if (n.entityType !== "chapter" || r.has(n.projectId)) continue;
    const o = await e.chapter.findUnique({
      where: { id: n.entityId },
      select: { id: !0, projectId: !0 }
    });
    !o?.id || o.projectId !== n.projectId || await e.chapter.update({
      where: { id: n.entityId },
      data: {
        deletedAt: new Date(n.deletedAt),
        updatedAt: new Date(n.updatedAt)
      }
    });
  }
}, gn = (e) => {
  if (typeof e == "number") return e === jt;
  if (typeof e == "string" && e.trim().length > 0) {
    const t = Number(e);
    return Number.isFinite(t) && t === jt;
  }
  return !1;
}, Pa = (e) => {
  try {
    const t = JSON.parse(e);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, Ra = (e) => e && typeof e == "object" && !Array.isArray(e) ? e : {}, Na = (e, t) => {
  if (e.format !== Ot)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: e.format }
    );
  if (e.container !== bt)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: e.container }
    );
  if (!gn(e.version))
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: e.version }
    );
}, Ca = (e, t) => {
  const r = Ra(e), n = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), o = t.createdAtFallback ?? n;
  if (Object.prototype.hasOwnProperty.call(r, "format") && r.format !== Ot)
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: r.format }
    );
  if (Object.prototype.hasOwnProperty.call(r, "container") && r.container !== bt)
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: r.container }
    );
  if (Object.prototype.hasOwnProperty.call(r, "version") && !gn(r.version))
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: r.version }
    );
  const s = typeof r.title == "string" && r.title.trim().length > 0 ? r.title : t.titleFallback, a = typeof r.createdAt == "string" && r.createdAt.length > 0 ? r.createdAt : o, i = typeof r.updatedAt == "string" && r.updatedAt.length > 0 ? r.updatedAt : n;
  return {
    ...r,
    format: Ot,
    container: bt,
    version: jt,
    title: s,
    createdAt: a,
    updatedAt: i
  };
}, Da = async (e, t) => {
  const r = await En(e, Zt, t);
  if (!r)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: e }
    );
  const n = Pa(r);
  if (!n)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: e }
    );
  Na(n, { source: e });
}, La = ".tmp", Ht = /* @__PURE__ */ new Map(), Oa = async (e) => {
  const t = X.dirname(e);
  await k.mkdir(t, { recursive: !0 });
}, Ed = async (e) => {
  try {
    return await k.access(e), !0;
  } catch {
    return !1;
  }
}, ba = async (e, t) => {
  const r = X.resolve(Wt(e)), o = (Ht.get(r) ?? Promise.resolve()).catch(() => {
  }).then(t), s = o.then(
    () => {
    },
    () => {
    }
  );
  Ht.set(r, s);
  try {
    return await o;
  } finally {
    Ht.get(r) === s && Ht.delete(r);
  }
}, ja = async (e, t) => {
  const r = new Wn.ZipFile(), n = Dn.createWriteStream(e), o = new Promise((s, a) => {
    n.on("close", () => s()), n.on("error", a), r.outputStream.on("error", a);
  });
  r.outputStream.pipe(n), await t(r), r.end(), await o;
}, Fa = async (e, t, r) => {
  const n = `${t}.bak-${Date.now()}`;
  let o = !1;
  try {
    await k.rename(e, t);
    return;
  } catch (s) {
    const a = s;
    if (a?.code !== "EEXIST" && a?.code !== "ENOTEMPTY" && a?.code !== "EPERM" && a?.code !== "EISDIR")
      throw s;
  }
  try {
    await k.rename(t, n), o = !0, await k.rename(e, t), await k.rm(n, { force: !0, recursive: !0 });
  } catch (s) {
    if (r.error("Atomic replace failed", { error: s, targetPath: t }), o)
      try {
        await k.rename(n, t);
      } catch (a) {
        r.error("Failed to restore backup", { restoreError: a, targetPath: t, backupPath: n });
      }
    throw s;
  }
}, Ua = () => [
  { name: `${Tt}/`, isDirectory: !0 },
  { name: `${F}/`, isDirectory: !0 },
  { name: `${Ft}/`, isDirectory: !0 },
  { name: `${No}/`, isDirectory: !0 }
], fd = (e) => ({
  name: Zt,
  content: JSON.stringify(e ?? {}, null, 2)
}), va = async (e, t) => {
  for (const r of t) {
    const n = vt(r.name);
    if (!n || !Jt(n))
      throw new Error("INVALID_ZIP_ENTRY_PATH");
    if (r.isDirectory) {
      e.addEmptyDirectory(n.endsWith("/") ? n : `${n}/`);
      continue;
    }
    if (r.fromFilePath) {
      e.addFile(r.fromFilePath, n);
      continue;
    }
    const o = Buffer.from(r.content ?? "", "utf-8");
    e.addBuffer(o, n);
  }
}, Tn = async (e, t, r) => {
  const n = Wt(e);
  return await ba(n, async () => {
    await Oa(n);
    const o = (/* @__PURE__ */ new Date()).toISOString(), s = Ca(t.meta, {
      titleFallback: X.basename(n, x),
      nowIso: o,
      createdAtFallback: o
    }), a = `${n}${La}-${Date.now()}`, i = [
      ...Ua(),
      {
        name: Zt,
        content: JSON.stringify(s, null, 2)
      },
      {
        name: `${F}/${Kr}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${F}/${Jr}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${F}/${Mt}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${F}/${te}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${F}/${ee}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${F}/${re}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${F}/${He}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${F}/${ne}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${Ft}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const d of t.chapters ?? [])
      d.id && i.push({
        name: `${Tt}/${d.id}${oe}`,
        content: d.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const d of t.snapshots)
        d.id && i.push({
          name: `${Ft}/${d.id}.snap`,
          content: JSON.stringify(d, null, 2)
        });
    await ja(a, (d) => va(d, i)), await Da(a, r), await Fa(a, n, r);
  });
}, Ma = () => ({
  timer: null,
  inFlight: null,
  dirty: !1
});
class Wa {
  constructor(t, r, n) {
    this.debounceMs = t, this.runExport = r, this.logger = n;
  }
  states = /* @__PURE__ */ new Map();
  getOrCreate(t) {
    const r = this.states.get(t);
    if (r) return r;
    const n = Ma();
    return this.states.set(t, n), n;
  }
  cleanupIfIdle(t) {
    const r = this.states.get(t);
    r && (r.timer || r.inFlight || r.dirty || this.states.delete(t));
  }
  clearTimer(t) {
    t.timer && (clearTimeout(t.timer), t.timer = null);
  }
  schedule(t, r) {
    const n = this.getOrCreate(t);
    n.dirty = !0, this.clearTimer(n), n.timer = setTimeout(() => {
      n.timer = null, this.runLoop(t, r).catch((o) => {
        this.logger.error("Failed to export project package", { projectId: t, reason: r, error: o });
      });
    }, this.debounceMs);
  }
  async runLoop(t, r) {
    const n = this.getOrCreate(t);
    if (n.inFlight)
      return n.dirty = !0, n.inFlight;
    const s = (async () => {
      for (; n.dirty; )
        n.dirty = !1, await this.runExport(t);
    })().catch((a) => {
      throw this.logger.error("Failed to run package export", { projectId: t, reason: r, error: a }), a;
    }).finally(() => {
      n.inFlight = null, this.cleanupIfIdle(t);
    });
    return n.inFlight = s, s;
  }
  async flush(t = 8e3) {
    const r = Array.from(this.states.entries()).filter(([, d]) => !!(d.timer || d.inFlight || d.dirty)).map(([d]) => d);
    if (r.length === 0)
      return { total: 0, flushed: 0, failed: 0, timedOut: !1 };
    for (const d of r) {
      const l = this.getOrCreate(d);
      l.dirty = !0, this.clearTimer(l);
    }
    let n = 0, o = 0;
    const s = r.map(async (d) => {
      try {
        await this.runLoop(d, "flush"), n += 1;
      } catch (l) {
        o += 1, this.logger.error("Failed to flush pending package export", { projectId: d, error: l });
      }
    }), a = Promise.all(s).then(() => !0), i = await new Promise((d) => {
      const l = setTimeout(() => d(!0), t);
      a.then(() => {
        clearTimeout(l), d(!1);
      });
    });
    return {
      total: r.length,
      flushed: n,
      failed: o,
      timedOut: i
    };
  }
}
const yr = (e, t = "") => {
  const r = e.trim();
  return r ? r.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, _r = (e) => {
  const t = Z.resolve(e);
  return process.platform === "win32" ? t.toLowerCase() : t;
}, wr = (e) => {
  if (typeof e != "string") return;
  const t = e.trim();
  return t.length > 0 ? v(t, "projectPath") : void 0;
}, mn = (e, t) => {
  const r = v(e, t);
  return Wt(r);
}, Ir = async (e, t) => {
  const r = _r(e), n = await P.getClient().project.findMany({
    select: {
      id: !0,
      title: !0,
      projectPath: !0
    }
  });
  for (const o of n)
    if (!(t && String(o.id) === t) && !(typeof o.projectPath != "string" || o.projectPath.trim().length === 0))
      try {
        const s = v(o.projectPath, "projectPath");
        if (_r(s) === r)
          return {
            id: String(o.id),
            title: typeof o.title == "string" ? o.title : "",
            projectPath: s
          };
      } catch {
      }
  return null;
}, ka = async (e) => {
  const { projectId: t, projectPath: r, previousTitle: n, nextTitle: o, logger: s } = e;
  if (!(!r || n === o))
    try {
      const a = v(r, "projectPath"), d = `${Z.dirname(a)}${Z.sep}.luie${Z.sep}${Ft}`, l = yr(n, ""), c = yr(o, "");
      if (!l || !c || l === c) return;
      const u = `${d}${Z.sep}${l}`, S = `${d}${Z.sep}${c}`;
      try {
        if (!(await it.stat(u)).isDirectory()) return;
      } catch {
        return;
      }
      await it.mkdir(Z.dirname(S), { recursive: !0 }), await it.rename(u, S);
    } catch (a) {
      s.warn("Failed to rename snapshot directory after project title update", {
        projectId: t,
        previousTitle: n,
        nextTitle: o,
        error: a
      });
    }
}, Pt = (e) => {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return t && typeof t == "object" && !Array.isArray(t) ? t : null;
  } catch {
    return null;
  }
}, Ba = (e) => {
  const t = e.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    updatedAt: n.updatedAt,
    content: n.content,
    file: `${Tt}/${n.id}${oe}`
  })), r = t.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    file: n.file
  }));
  return { exportChapters: t, chapterMeta: r };
}, $a = (e) => e.map((t) => {
  let r;
  if (t.attributes)
    try {
      r = JSON.parse(t.attributes);
    } catch {
      r = t.attributes;
    }
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    firstAppearance: t.firstAppearance,
    attributes: r,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}), xa = (e) => e.map((t) => ({
  id: t.id,
  term: t.term,
  definition: t.definition,
  category: t.category,
  firstAppearance: t.firstAppearance,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
})), Ga = (e, t) => {
  const r = e.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    chapterId: n.chapterId,
    content: n.content,
    description: n.description,
    createdAt: n.createdAt?.toISOString?.() ?? String(n.createdAt)
  }));
  return t > 0 ? r.slice(0, t) : r;
}, Ha = (e, t) => {
  const r = t.success ? t.data : void 0;
  return {
    synopsis: e.description ?? (typeof r?.synopsis == "string" ? r.synopsis : ""),
    status: r?.status ?? "draft",
    genre: typeof r?.genre == "string" ? r.genre : void 0,
    targetAudience: typeof r?.targetAudience == "string" ? r.targetAudience : void 0,
    logline: typeof r?.logline == "string" ? r.logline : void 0,
    updatedAt: typeof r?.updatedAt == "string" ? r.updatedAt : void 0
  };
}, za = (e) => !e.success || !Array.isArray(e.data.columns) ? { columns: [] } : {
  columns: e.data.columns,
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
}, Ya = (e) => !e.success || !Array.isArray(e.data.paths) ? { paths: [] } : {
  paths: dn(e.data.paths),
  tool: e.data.tool,
  iconType: e.data.iconType,
  color: typeof e.data.color == "string" ? e.data.color : void 0,
  lineWidth: typeof e.data.lineWidth == "number" ? e.data.lineWidth : void 0,
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
}, Xa = (e) => e.success ? {
  nodes: ln(e.data.nodes),
  edges: pn(e.data.edges),
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
} : { nodes: [], edges: [] }, Va = (e) => e.success ? {
  memos: un(e.data.memos),
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
} : { memos: [] }, qa = (e) => {
  const t = [
    ...e.characters.map((n) => ({
      id: n.id,
      entityType: "Character",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Pt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...e.factions.map((n) => ({
      id: n.id,
      entityType: "Faction",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Pt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...e.events.map((n) => ({
      id: n.id,
      entityType: "Event",
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: Pt(n.attributes),
      positionX: 0,
      positionY: 0
    })),
    ...e.terms.map((n) => ({
      id: n.id,
      entityType: "Term",
      name: n.term,
      description: n.definition ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: n.category ? { tags: [n.category] } : null,
      positionX: 0,
      positionY: 0
    })),
    ...e.worldEntities.map((n) => ({
      id: n.id,
      entityType: n.type,
      subType: n.type,
      name: n.name,
      description: n.description ?? null,
      firstAppearance: n.firstAppearance ?? null,
      attributes: typeof n.attributes == "string" ? Pt(n.attributes) : n.attributes ?? null,
      positionX: n.positionX,
      positionY: n.positionY
    }))
  ], r = e.entityRelations.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    sourceId: n.sourceId,
    sourceType: n.sourceType,
    targetId: n.targetId,
    targetType: n.targetType,
    relation: n.relation,
    attributes: typeof n.attributes == "string" ? Pt(n.attributes) : n.attributes ?? null,
    sourceWorldEntityId: n.sourceWorldEntityId ?? null,
    targetWorldEntityId: n.targetWorldEntityId ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  }));
  return {
    nodes: t,
    edges: r
  };
}, Ka = (e, t) => ({
  format: Ot,
  container: bt,
  version: jt,
  projectId: e.id,
  title: e.title,
  description: e.description,
  createdAt: e.createdAt?.toISOString?.() ?? String(e.createdAt),
  updatedAt: e.updatedAt?.toISOString?.() ?? String(e.updatedAt),
  chapters: t
}), Ja = p.object({
  format: p.string().optional(),
  version: p.number().optional(),
  projectId: p.string().optional(),
  title: p.string().optional(),
  description: p.string().optional().nullable(),
  createdAt: p.string().optional(),
  updatedAt: p.string().optional(),
  chapters: p.array(
    p.object({
      id: p.string().optional(),
      title: p.string().optional(),
      order: p.number().optional(),
      file: p.string().optional(),
      content: p.string().optional(),
      updatedAt: p.string().optional()
    })
  ).optional()
}).passthrough(), Qa = p.object({
  characters: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), Za = p.object({
  terms: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), Ue = p.object({
  synopsis: p.string().optional(),
  status: p.enum(["draft", "working", "locked"]).optional(),
  genre: p.string().optional(),
  targetAudience: p.string().optional(),
  logline: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), Pr = p.object({
  columns: p.array(
    p.object({
      id: p.string(),
      title: p.string(),
      cards: p.array(
        p.object({
          id: p.string(),
          content: p.string()
        })
      )
    })
  ).optional(),
  updatedAt: p.string().optional()
}).passthrough(), Rr = p.object({
  paths: p.array(p.record(p.string(), p.unknown())).optional(),
  tool: p.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: p.enum(["mountain", "castle", "village"]).optional(),
  color: p.string().optional(),
  lineWidth: p.number().optional(),
  updatedAt: p.string().optional()
}).passthrough(), Nr = p.object({
  nodes: p.array(p.record(p.string(), p.unknown())).optional(),
  edges: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), Cr = p.object({
  memos: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), ti = p.object({
  id: p.string(),
  entityType: p.string(),
  subType: p.string().optional(),
  name: p.string(),
  description: p.string().optional().nullable(),
  firstAppearance: p.string().optional().nullable(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  positionX: p.number().optional(),
  positionY: p.number().optional()
}).passthrough(), ei = p.object({
  id: p.string(),
  sourceId: p.string(),
  sourceType: p.string(),
  targetId: p.string(),
  targetType: p.string(),
  relation: p.string(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  createdAt: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), ri = p.object({
  nodes: p.array(ti).optional(),
  edges: p.array(ei).optional(),
  updatedAt: p.string().optional()
}).passthrough(), ni = p.object({
  id: p.string(),
  projectId: p.string().optional(),
  chapterId: p.string().optional().nullable(),
  content: p.string().optional(),
  description: p.string().optional().nullable(),
  createdAt: p.string().optional()
}).passthrough(), oi = p.object({
  snapshots: p.array(ni).optional()
}).passthrough(), si = (e, t, r, n) => {
  if (typeof e != "string" || e.trim().length === 0)
    return t.safeParse(null);
  let o;
  try {
    o = JSON.parse(e);
  } catch (a) {
    return n.warn("Invalid .luie world JSON; using default during export", {
      packagePath: r.packagePath,
      entryPath: r.entryPath,
      label: r.label,
      error: a
    }), t.safeParse(null);
  }
  const s = t.safeParse(o);
  return s.success || n.warn("Invalid .luie world format; using default during export", {
    packagePath: r.packagePath,
    entryPath: r.entryPath,
    label: r.label,
    issues: s.error.issues
  }), s;
}, ai = async (e) => await P.getClient().project.findUnique({
  where: { id: e },
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
}), ii = (e, t, r) => {
  if (!t)
    return r.info("Skipping package export (missing projectPath)", { projectId: e }), null;
  if (!t.toLowerCase().endsWith(x))
    return r.info("Skipping package export (not .luie)", {
      projectId: e,
      projectPath: t
    }), null;
  try {
    return v(t, "projectPath");
  } catch (n) {
    return r.warn("Skipping package export (invalid projectPath)", {
      projectId: e,
      projectPath: t,
      error: n
    }), null;
  }
}, ci = async (e, t) => {
  if (!e || !e.toLowerCase().endsWith(x))
    return {
      synopsis: Ue.safeParse(null),
      plot: Pr.safeParse(null),
      drawing: Rr.safeParse(null),
      mindmap: Nr.safeParse(null),
      memos: Cr.safeParse(null)
    };
  const r = async (d, l, c) => {
    const u = `${F}/${d}`;
    try {
      const S = await H(e, u, t);
      return si(
        S,
        l,
        {
          packagePath: e,
          entryPath: u,
          label: c
        },
        t
      );
    } catch (S) {
      return t.warn("Failed to read .luie world document; using default during export", {
        projectPath: e,
        entryPath: u,
        label: c,
        error: S
      }), l.safeParse(null);
    }
  }, [n, o, s, a, i] = await Promise.all([
    r(
      Mt,
      Ue,
      "synopsis"
    ),
    r(te, Pr, "plot"),
    r(ee, Rr, "drawing"),
    r(re, Nr, "mindmap"),
    r(
      He,
      Cr,
      "scrap-memos"
    )
  ]);
  return {
    synopsis: n,
    plot: o,
    drawing: s,
    mindmap: a,
    memos: i
  };
}, di = async (e) => {
  const t = await ai(e.projectId);
  if (!t) return !1;
  const r = e.options?.targetPath ? mn(e.options.targetPath, "targetPath") : ii(e.projectId, t.projectPath, e.logger);
  if (!r) return !1;
  const n = e.options?.worldSourcePath === void 0 ? r : e.options.worldSourcePath, { exportChapters: o, chapterMeta: s } = Ba(t.chapters), a = $a(t.characters), i = xa(t.terms), d = g.getAll().snapshotExportLimit ?? Vr, l = Ga(t.snapshots, d), c = await ci(n, e.logger), u = Ha(t, c.synopsis), S = za(c.plot), I = Ya(c.drawing), h = Xa(c.mindmap), f = Va(c.memos), A = qa(t), T = Ka(t, s);
  return e.logger.info("Exporting .luie package", {
    projectId: e.projectId,
    projectPath: r,
    chapterCount: o.length,
    characterCount: a.length,
    termCount: i.length,
    worldNodeCount: A.nodes.length,
    relationCount: A.edges.length,
    snapshotCount: l.length
  }), await Tn(
    r,
    {
      meta: T,
      chapters: o,
      characters: a,
      terms: i,
      synopsis: u,
      plot: S,
      drawing: I,
      mindmap: h,
      memos: f,
      graph: A,
      snapshots: l
    },
    e.logger
  ), !0;
}, li = async (e) => {
  const t = [];
  for (let r = 0; r < e.chaptersMeta.length; r += 1) {
    const n = e.chaptersMeta[r], o = n.id ?? V(), s = n.file ?? `${Tt}/${o}${oe}`, a = typeof n.content == "string" ? n.content : await e.readChapterEntry(s);
    if (a === null)
      throw new _(
        w.VALIDATION_FAILED,
        "Missing chapter content entry in .luie package",
        {
          packagePath: e.packagePath,
          entryPath: s,
          chapterId: o
        }
      );
    const i = a ?? "";
    t.push({
      id: o,
      projectId: e.resolvedProjectId,
      title: n.title ?? `Chapter ${r + 1}`,
      content: i,
      synopsis: null,
      order: typeof n.order == "number" ? n.order : r,
      wordCount: i.length
    });
  }
  return t;
}, pi = (e, t) => t.map((r, n) => {
  const o = typeof r.name == "string" && r.name.trim().length > 0 ? r.name : `Character ${n + 1}`, s = typeof r.attributes == "string" ? r.attributes : r.attributes ? JSON.stringify(r.attributes) : null;
  return {
    id: typeof r.id == "string" ? r.id : V(),
    projectId: e,
    name: o,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: s
  };
}), ui = (e, t) => t.map((r, n) => {
  const o = typeof r.term == "string" && r.term.trim().length > 0 ? r.term : `Term ${n + 1}`;
  return {
    id: typeof r.id == "string" ? r.id : V(),
    projectId: e,
    term: o,
    definition: typeof r.definition == "string" ? r.definition : null,
    category: typeof r.category == "string" ? r.category : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
  };
}), hi = (e) => {
  const t = /* @__PURE__ */ new Set(), r = [];
  for (const n of e.snapshots) {
    if (typeof n.id != "string" || n.id.trim().length === 0 || t.has(n.id))
      continue;
    t.add(n.id);
    const o = typeof n.content == "string" ? n.content : "", s = typeof n.chapterId == "string" ? n.chapterId.trim() : "", a = s.length > 0 && e.validChapterIds.has(s);
    s.length > 0 && !a && e.logger.warn("Snapshot chapter reference missing during .luie import; detaching snapshot", {
      snapshotId: n.id,
      chapterId: s,
      projectId: e.resolvedProjectId
    });
    const i = typeof n.createdAt == "string" && n.createdAt.trim().length > 0 ? new Date(n.createdAt) : /* @__PURE__ */ new Date(), d = Number.isNaN(i.getTime()) ? /* @__PURE__ */ new Date() : i;
    r.push({
      id: n.id,
      projectId: e.resolvedProjectId,
      chapterId: a ? s : null,
      content: o,
      contentLength: o.length,
      description: typeof n.description == "string" ? n.description : null,
      createdAt: d
    });
  }
  return r;
}, Ei = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], fi = ["Place", "Concept", "Rule", "Item"], Ai = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], ve = (e) => typeof e == "string" && Ei.includes(e), Me = (e) => typeof e == "string" && fi.includes(e), gi = (e) => typeof e == "string" && Ai.includes(e), kt = (e) => {
  if (e == null)
    return null;
  if (typeof e == "string")
    return e;
  try {
    return JSON.stringify(e);
  } catch {
    return null;
  }
}, Ti = (e, t) => Me(e) ? e : e === "WorldEntity" && Me(t) ? t : null, mi = (e, t) => ({
  charactersForCreate: [...e],
  termsForCreate: [...t],
  factionsForCreate: [],
  eventsForCreate: [],
  worldEntitiesForCreate: [],
  relationsForCreate: [],
  characterIds: new Set(e.map((r) => r.id)),
  termIds: new Set(t.map((r) => r.id)),
  factionIds: /* @__PURE__ */ new Set(),
  eventIds: /* @__PURE__ */ new Set(),
  worldEntityIds: /* @__PURE__ */ new Set()
}), Si = (e) => ve(e.entityType) ? e.entityType : Me(e.subType) ? e.subType : null, yi = (e, t, r) => {
  !r.id || !r.name || e.characterIds.has(r.id) || (e.characterIds.add(r.id), e.charactersForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: kt(r.attributes)
  }));
}, _i = (e, t, r) => {
  if (!r.id || !r.name || e.termIds.has(r.id)) return;
  e.termIds.add(r.id);
  const n = Array.isArray(r.attributes?.tags) ? r.attributes.tags.find((o) => typeof o == "string") : null;
  e.termsForCreate.push({
    id: r.id,
    projectId: t,
    term: r.name,
    definition: typeof r.description == "string" ? r.description : null,
    category: n ?? null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
  });
}, wi = (e, t, r) => {
  !r.id || !r.name || e.factionIds.has(r.id) || (e.factionIds.add(r.id), e.factionsForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: kt(r.attributes)
  }));
}, Ii = (e, t, r) => {
  !r.id || !r.name || e.eventIds.has(r.id) || (e.eventIds.add(r.id), e.eventsForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: kt(r.attributes)
  }));
}, Pi = (e, t, r, n) => {
  if (!n.id || !n.name) return;
  const o = Ti(r, n.subType);
  !o || e.worldEntityIds.has(n.id) || (e.worldEntityIds.add(n.id), e.worldEntitiesForCreate.push({
    id: n.id,
    projectId: t,
    type: o,
    name: n.name,
    description: typeof n.description == "string" ? n.description : null,
    firstAppearance: typeof n.firstAppearance == "string" ? n.firstAppearance : null,
    attributes: kt(n.attributes),
    positionX: typeof n.positionX == "number" ? n.positionX : 0,
    positionY: typeof n.positionY == "number" ? n.positionY : 0
  }));
}, Dr = (e, t, r) => {
  switch (t) {
    case "Character":
      return e.characterIds.has(r);
    case "Term":
      return e.termIds.has(r);
    case "Faction":
      return e.factionIds.has(r);
    case "Event":
      return e.eventIds.has(r);
    case "Place":
    case "Concept":
    case "Rule":
    case "Item":
    case "WorldEntity":
      return e.worldEntityIds.has(r);
    default:
      return !1;
  }
}, Ri = (e, t, r) => {
  if (!r.id || !r.name)
    return;
  const n = Si(r);
  if (n) {
    if (n === "Character") {
      yi(e, t, r);
      return;
    }
    if (n === "Term") {
      _i(e, t, r);
      return;
    }
    if (n === "Faction") {
      wi(e, t, r);
      return;
    }
    if (n === "Event") {
      Ii(e, t, r);
      return;
    }
    Pi(e, t, n, r);
  }
}, Ni = (e, t, r) => {
  !r.sourceId || !r.targetId || !ve(r.sourceType) || !ve(r.targetType) || gi(r.relation) && (!Dr(e, r.sourceType, r.sourceId) || !Dr(e, r.targetType, r.targetId) || e.relationsForCreate.push({
    id: r.id || V(),
    projectId: t,
    sourceId: r.sourceId,
    sourceType: r.sourceType,
    targetId: r.targetId,
    targetType: r.targetType,
    relation: r.relation,
    attributes: kt(r.attributes),
    sourceWorldEntityId: nr(r.sourceType) && e.worldEntityIds.has(r.sourceId) ? r.sourceId : null,
    targetWorldEntityId: nr(r.targetType) && e.worldEntityIds.has(r.targetId) ? r.targetId : null
  }));
}, Ci = (e) => {
  const t = mi(e.baseCharacters, e.baseTerms);
  if (!e.graph)
    return t;
  for (const r of e.graph.nodes ?? [])
    Ri(t, e.projectId, r);
  for (const r of e.graph.edges ?? [])
    Ni(t, e.projectId, r);
  return t;
}, Di = async (e) => {
  const {
    resolvedProjectId: t,
    legacyProjectId: r,
    existing: n,
    meta: o,
    worldSynopsis: s,
    resolvedPath: a,
    chaptersForCreate: i,
    charactersForCreate: d,
    termsForCreate: l,
    factionsForCreate: c,
    eventsForCreate: u,
    worldEntitiesForCreate: S,
    relationsForCreate: I,
    snapshotsForCreate: h
  } = e;
  return await P.getClient().$transaction(async (f) => {
    r && await f.project.delete({ where: { id: r } }), n && await f.project.delete({ where: { id: t } });
    const A = await f.project.create({
      data: {
        id: t,
        title: o.title ?? "Recovered Project",
        description: (typeof o.description == "string" ? o.description : void 0) ?? s ?? void 0,
        projectPath: a,
        createdAt: o.createdAt ? new Date(o.createdAt) : void 0,
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : void 0,
        settings: {
          create: {
            autoSave: !0,
            autoSaveInterval: Ge
          }
        }
      },
      include: { settings: !0 }
    });
    return i.length > 0 && await f.chapter.createMany({ data: i }), d.length > 0 && await f.character.createMany({ data: d }), l.length > 0 && await f.term.createMany({ data: l }), c.length > 0 && await f.faction.createMany({ data: c }), u.length > 0 && await f.event.createMany({ data: u }), S.length > 0 && await f.worldEntity.createMany({ data: S }), I.length > 0 && await f.entityRelation.createMany({ data: I }), h.length > 0 && await f.snapshot.createMany({ data: h }), A;
  });
}, Rt = (e, t, r) => {
  if (typeof e != "string" || e.trim().length === 0)
    return null;
  let n;
  try {
    n = JSON.parse(e);
  } catch (s) {
    throw new _(
      w.VALIDATION_FAILED,
      `Invalid ${r.label} JSON in .luie package`,
      {
        packagePath: r.packagePath,
        entryPath: r.entryPath
      },
      s
    );
  }
  const o = t.safeParse(n);
  if (!o.success)
    throw new _(
      w.VALIDATION_FAILED,
      `Invalid ${r.label} format in .luie package`,
      {
        packagePath: r.packagePath,
        entryPath: r.entryPath,
        issues: o.error.issues
      }
    );
  return o.data;
}, Li = async (e) => await P.getClient().project.findFirst({
  where: { projectPath: e },
  select: { id: !0, updatedAt: !0 }
}), Oi = async (e, t) => {
  try {
    await it.access(e);
  } catch {
    return {
      meta: null,
      luieCorrupted: !0,
      recoveryReason: "missing"
    };
  }
  try {
    const r = await H(e, Zt, t);
    if (!r)
      throw new Error("MISSING_META");
    const n = Ja.safeParse(JSON.parse(r));
    if (!n.success)
      throw new Error("INVALID_META");
    return { meta: n.data, luieCorrupted: !1 };
  } catch (r) {
    return t.warn("Failed to read .luie meta; treating as corrupted", {
      packagePath: e,
      error: r
    }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
  }
}, bi = (e, t) => {
  const n = (typeof e.projectId == "string" ? e.projectId : void 0) ?? t?.id ?? V(), o = t && t.id !== n ? t.id : null;
  return { resolvedProjectId: n, legacyProjectId: o };
}, ji = (e = /* @__PURE__ */ new Date()) => {
  const t = (r) => String(r).padStart(2, "0");
  return `${e.getFullYear()}${t(e.getMonth() + 1)}${t(e.getDate())}-${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`;
}, Fi = async (e) => {
  const t = Wt(e), r = x, o = t.toLowerCase().endsWith(r) ? t.slice(0, t.length - r.length) : t, s = ji();
  let a = `${o}.recovered-${s}${r}`, i = 1;
  for (; ; )
    try {
      await it.access(a), a = `${o}.recovered-${s}-${i}${r}`, i += 1;
    } catch {
      return a;
    }
}, Ui = async (e, t) => {
  const r = `${F}/${Kr}`, n = `${F}/${Jr}`, o = `${Ft}/index.json`, s = `${F}/${Mt}`, a = `${F}/${ne}`, [i, d, l, c, u] = await Promise.all([
    H(e, r, t),
    H(e, n, t),
    H(e, o, t),
    H(e, s, t),
    H(e, a, t)
  ]), S = Rt(i, Qa, {
    packagePath: e,
    entryPath: r,
    label: "world characters"
  }), I = Rt(d, Za, {
    packagePath: e,
    entryPath: n,
    label: "world terms"
  }), h = Rt(l, oi, {
    packagePath: e,
    entryPath: o,
    label: "snapshot index"
  }), f = Rt(
    c,
    Ue,
    {
      packagePath: e,
      entryPath: s,
      label: "world synopsis"
    }
  ), A = Rt(u, ri, {
    packagePath: e,
    entryPath: a,
    label: "world graph"
  });
  return {
    characters: S?.characters ?? [],
    terms: I?.terms ?? [],
    snapshots: h?.snapshots ?? [],
    worldSynopsis: f && typeof f.synopsis == "string" ? f.synopsis : void 0,
    graph: A ? {
      nodes: A.nodes ?? [],
      edges: A.edges ?? [],
      updatedAt: A.updatedAt
    } : void 0
  };
}, vi = async (e) => {
  const t = mn(e.packagePath, "packagePath"), { meta: r, luieCorrupted: n, recoveryReason: o } = await Oi(
    t,
    e.logger
  ), s = await Li(t);
  if (n) {
    if (!s)
      throw new _(
        w.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: t }
      );
    const T = await Fi(t);
    if (!await e.exportRecoveredPackage(s.id, T))
      throw new _(
        w.FS_WRITE_FAILED,
        "Failed to write recovered .luie package",
        { packagePath: t, recoveryPath: T }
      );
    return await P.getClient().project.update({
      where: { id: s.id },
      data: { projectPath: T }
    }), {
      project: await e.getProjectById(s.id),
      recovery: !0,
      recoveryPath: T,
      recoveryReason: o ?? "corrupt"
    };
  }
  if (!r)
    throw new _(
      w.VALIDATION_FAILED,
      "Invalid .luie meta format",
      { packagePath: t }
    );
  const { resolvedProjectId: a, legacyProjectId: i } = bi(r, s), d = await P.getClient().project.findUnique({
    where: { id: a },
    select: { id: !0, updatedAt: !0 }
  }), l = r.chapters ?? [], c = await Ui(t, e.logger), u = await li({
    packagePath: t,
    resolvedProjectId: a,
    chaptersMeta: l,
    readChapterEntry: async (T) => await H(t, T, e.logger)
  }), S = pi(
    a,
    c.characters
  ), I = ui(a, c.terms), h = Ci({
    projectId: a,
    graph: c.graph,
    baseCharacters: S,
    baseTerms: I
  }), f = hi({
    resolvedProjectId: a,
    snapshots: c.snapshots,
    validChapterIds: new Set(u.map((T) => T.id)),
    logger: e.logger
  }), A = await Di({
    resolvedProjectId: a,
    legacyProjectId: i,
    existing: d,
    meta: r,
    worldSynopsis: c.worldSynopsis,
    resolvedPath: t,
    chaptersForCreate: u,
    charactersForCreate: h.charactersForCreate,
    termsForCreate: h.termsForCreate,
    factionsForCreate: h.factionsForCreate,
    eventsForCreate: h.eventsForCreate,
    worldEntitiesForCreate: h.worldEntitiesForCreate,
    relationsForCreate: h.relationsForCreate,
    snapshotsForCreate: f
  });
  return e.logger.info(".luie package hydrated", {
    projectId: A.id,
    chapterCount: u.length,
    characterCount: h.charactersForCreate.length,
    termCount: h.termsForCreate.length,
    factionCount: h.factionsForCreate.length,
    eventCount: h.eventsForCreate.length,
    worldEntityCount: h.worldEntitiesForCreate.length,
    relationCount: h.relationsForCreate.length,
    snapshotCount: f.length
  }), { project: A, conflict: "luie-newer" };
}, b = M("ProjectService");
class Sn {
  exportQueue = new Wa(
    co,
    async (t) => {
      await this.exportProjectPackage(t);
    },
    b
  );
  toProjectPathKey(t) {
    const r = Z.resolve(t);
    return process.platform === "win32" ? r.toLowerCase() : r;
  }
  async reconcileProjectPathDuplicates() {
    const t = await P.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: {
        id: !0,
        projectPath: !0,
        updatedAt: !0
      }
    }), r = /* @__PURE__ */ new Map();
    for (const i of t)
      if (!(typeof i.projectPath != "string" || i.projectPath.length === 0))
        try {
          const d = v(
            i.projectPath,
            "projectPath"
          ), l = this.toProjectPathKey(d), c = r.get(l) ?? [];
          c.push({
            id: String(i.id),
            projectPath: d,
            updatedAt: i.updatedAt instanceof Date ? i.updatedAt : new Date(String(i.updatedAt))
          }), r.set(l, c);
        } catch {
          continue;
        }
    const n = Array.from(r.values()).filter(
      (i) => i.length > 1
    ), o = await Promise.all(
      n.map(async (i) => {
        const d = [...i].sort(
          (u, S) => S.updatedAt.getTime() - u.updatedAt.getTime()
        ), l = d[0], c = d.slice(1);
        return await Promise.all(
          c.map(async (u) => {
            await P.getClient().project.update({
              where: { id: u.id },
              data: { projectPath: null }
            }), b.warn("Cleared duplicate projectPath from stale record", {
              keepProjectId: l.id,
              staleProjectId: u.id,
              projectPath: u.projectPath
            });
          })
        ), c.length;
      })
    ), s = n.length, a = o.reduce(
      (i, d) => i + d,
      0
    );
    return s > 0 && b.info("Project path duplicate reconciliation completed", {
      duplicateGroups: s,
      clearedRecords: a
    }), { duplicateGroups: s, clearedRecords: a };
  }
  async createProject(t) {
    try {
      b.info("Creating project", t);
      const r = wr(t.projectPath);
      if (r) {
        const s = await Ir(r);
        if (s)
          throw new _(
            w.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath: r, conflictProjectId: s.id }
          );
      }
      const n = await P.getClient().project.create({
        data: {
          title: t.title,
          description: t.description,
          projectPath: r,
          settings: {
            create: {
              autoSave: !0,
              autoSaveInterval: Ge
            }
          }
        },
        include: {
          settings: !0
        }
      }), o = String(n.id);
      return b.info("Project created successfully", { projectId: o }), this.schedulePackageExport(o, "project:create"), n;
    } catch (r) {
      throw b.error("Failed to create project", r), new _(
        w.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        r
      );
    }
  }
  async openLuieProject(t) {
    try {
      return await vi({
        packagePath: t,
        logger: b,
        exportRecoveredPackage: async (r, n) => await this.exportProjectPackageWithOptions(r, {
          targetPath: n,
          worldSourcePath: null
        }),
        getProjectById: async (r) => await this.getProject(r)
      });
    } catch (r) {
      throw b.error("Failed to open .luie package", { packagePath: t, error: r }), r instanceof _ ? r : new _(
        w.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath: t },
        r
      );
    }
  }
  async getProject(t) {
    try {
      const r = await P.getClient().project.findUnique({
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
      if (!r)
        throw new _(
          w.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return r;
    } catch (r) {
      throw b.error("Failed to get project", r), r;
    }
  }
  async getAllProjects() {
    try {
      const t = await P.getClient().project.findMany({
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
          const o = typeof n.projectPath == "string" ? n.projectPath : null;
          if (!!!(o && o.toLowerCase().endsWith(x)) || !o)
            return {
              ...n,
              pathMissing: !1
            };
          try {
            const a = v(
              o,
              "projectPath"
            );
            return await it.access(a), {
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
      throw b.error("Failed to get all projects", t), new _(
        w.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async updateProject(t) {
    try {
      const r = t.projectPath === void 0 ? void 0 : wr(t.projectPath) ?? null;
      if (r) {
        const l = await Ir(
          r,
          t.id
        );
        if (l)
          throw new _(
            w.VALIDATION_FAILED,
            "Project path is already registered",
            {
              projectPath: r,
              conflictProjectId: l.id,
              projectId: t.id
            }
          );
      }
      const n = await P.getClient().project.findUnique({
        where: { id: t.id },
        select: { title: !0, projectPath: !0 }
      }), o = await P.getClient().project.update({
        where: { id: t.id },
        data: {
          title: t.title,
          description: t.description,
          projectPath: r
        }
      }), s = typeof n?.title == "string" ? n.title : "", a = typeof o.title == "string" ? o.title : "", i = typeof o.projectPath == "string" ? o.projectPath : null;
      await ka({
        projectId: String(o.id),
        projectPath: i,
        previousTitle: s,
        nextTitle: a,
        logger: b
      });
      const d = String(o.id);
      return b.info("Project updated successfully", { projectId: d }), this.schedulePackageExport(d, "project:update"), o;
    } catch (r) {
      throw b.error("Failed to update project", r), new _(
        w.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input: t },
        r
      );
    }
  }
  clearSyncBaselineForProject(t) {
    const n = g.getSyncSettings().entityBaselinesByProjectId;
    if (!n || !(t in n)) return;
    const o = { ...n };
    delete o[t], g.setSyncSettings({
      entityBaselinesByProjectId: Object.keys(o).length > 0 ? o : void 0
    });
  }
  async deleteProject(t) {
    const r = typeof t == "string" ? { id: t, deleteFile: !1 } : { id: t.id, deleteFile: !!t.deleteFile };
    let n = !1;
    try {
      const o = await P.getClient().project.findUnique({
        where: { id: r.id },
        select: { id: !0, projectPath: !0 }
      });
      if (!o?.id)
        throw new _(
          w.PROJECT_NOT_FOUND,
          "Project not found",
          { id: r.id }
        );
      if (r.deleteFile) {
        const s = typeof o.projectPath == "string" ? o.projectPath : null;
        if (s && s.toLowerCase().endsWith(x)) {
          const a = v(
            s,
            "projectPath"
          );
          await it.rm(a, { force: !0, recursive: !0 });
        }
      }
      return g.addPendingProjectDelete({
        projectId: r.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), n = !0, await P.getClient().project.delete({
        where: { id: r.id }
      }), this.clearSyncBaselineForProject(r.id), b.info("Project deleted successfully", {
        projectId: r.id,
        deleteFile: r.deleteFile
      }), { success: !0 };
    } catch (o) {
      throw n && g.removePendingProjectDeletes([r.id]), b.error("Failed to delete project", o), o instanceof _ ? o : new _(
        w.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id: r.id, deleteFile: r.deleteFile },
        o
      );
    }
  }
  async removeProjectFromList(t) {
    try {
      if (!(await P.getClient().project.findUnique({
        where: { id: t },
        select: { id: !0 }
      }))?.id)
        throw new _(
          w.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return await P.getClient().project.delete({
        where: { id: t }
      }), this.clearSyncBaselineForProject(t), b.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (r) {
      throw b.error("Failed to remove project from list", r), r instanceof _ ? r : new _(
        w.PROJECT_DELETE_FAILED,
        "Failed to remove project from list",
        { id: t },
        r
      );
    }
  }
  schedulePackageExport(t, r) {
    this.exportQueue.schedule(t, r);
  }
  async flushPendingExports(t = 8e3) {
    return await this.exportQueue.flush(t);
  }
  async exportProjectPackageWithOptions(t, r) {
    return await di({
      projectId: t,
      options: r,
      logger: b
    });
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const yn = new Sn(), _n = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ProjectService: Sn,
  projectService: yn
}, Symbol.toStringTag, { value: "Module" })), Mi = /* @__PURE__ */ new Set(["draft", "working", "locked"]), mt = (e, t, r, n) => {
  if (typeof r != "string")
    return r;
  const o = cn(r);
  return o !== null ? o : (n.warn("Invalid sync world document payload string; using default payload", {
    projectId: e,
    docType: t
  }), null);
}, Wi = (e, t, r) => {
  const n = mt(e, "synopsis", t, r);
  if (!O(n))
    return { synopsis: "", status: "draft" };
  const o = n.status, s = typeof o == "string" && Mi.has(o) ? o : "draft", a = {
    synopsis: typeof n.synopsis == "string" ? n.synopsis : "",
    status: s
  };
  return typeof n.genre == "string" && (a.genre = n.genre), typeof n.targetAudience == "string" && (a.targetAudience = n.targetAudience), typeof n.logline == "string" && (a.logline = n.logline), typeof n.updatedAt == "string" && (a.updatedAt = n.updatedAt), a;
}, ki = (e, t, r) => {
  const n = mt(e, "plot", t, r);
  return O(n) ? {
    columns: (Array.isArray(n.columns) ? n.columns : []).filter((a) => O(a)).map((a, i) => {
      const l = (Array.isArray(a.cards) ? a.cards : []).filter((c) => O(c)).map((c, u) => ({
        id: typeof c.id == "string" && c.id.length > 0 ? c.id : `card-${i}-${u}`,
        content: typeof c.content == "string" ? c.content : ""
      }));
      return {
        id: typeof a.id == "string" && a.id.length > 0 ? a.id : `col-${i}`,
        title: typeof a.title == "string" ? a.title : "",
        cards: l
      };
    }),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { columns: [] };
}, Bi = (e, t, r) => {
  const n = mt(e, "drawing", t, r);
  return O(n) ? {
    paths: dn(n.paths),
    tool: Hs(n.tool),
    iconType: zs(n.iconType),
    color: typeof n.color == "string" ? n.color : void 0,
    lineWidth: typeof n.lineWidth == "number" ? n.lineWidth : void 0,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { paths: [] };
}, $i = (e, t, r) => {
  const n = mt(e, "mindmap", t, r);
  return O(n) ? {
    nodes: ln(n.nodes),
    edges: pn(n.edges),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { nodes: [], edges: [] };
}, xi = (e, t, r) => {
  const n = mt(e, "graph", t, r);
  if (!O(n))
    return { nodes: [], edges: [] };
  const o = Array.isArray(n.nodes) ? n.nodes.filter((a) => O(a)) : [], s = Array.isArray(n.edges) ? n.edges.filter((a) => O(a)) : [];
  return {
    nodes: o,
    edges: s,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  };
}, Gi = (e, t, r, n, o) => {
  const s = mt(e, "scrap", t, o);
  if (!O(s))
    return {
      memos: r.map((i) => ({
        id: i.id,
        title: i.title,
        content: i.content,
        tags: i.tags,
        updatedAt: i.updatedAt
      })),
      updatedAt: n
    };
  const a = hn(s);
  return {
    memos: a.memos,
    updatedAt: typeof a.updatedAt == "string" ? a.updatedAt : n
  };
}, Hi = (e) => typeof e == "string" ? e : null, zi = (e) => [...e].sort((t, r) => Date.parse(r.updatedAt) - Date.parse(t.updatedAt)), wn = async (e) => {
  const {
    bundle: t,
    projectId: r,
    projectPath: n,
    localSnapshots: o,
    hydrateMissingWorldDocsFromPackage: s,
    logger: a
  } = e, i = t.projects.find((E) => E.id === r);
  if (!i || i.deletedAt) return null;
  const d = t.chapters.filter((E) => E.projectId === r && !E.deletedAt).sort((E, $t) => E.order - $t.order), l = t.characters.filter((E) => E.projectId === r && !E.deletedAt).map((E) => ({
    id: E.id,
    name: E.name,
    description: E.description ?? void 0,
    firstAppearance: E.firstAppearance ?? void 0,
    attributes: E.attributes ?? void 0
  })), c = t.terms.filter((E) => E.projectId === r && !E.deletedAt).sort((E, $t) => E.order - $t.order).map((E) => ({
    id: E.id,
    term: E.term,
    definition: E.definition ?? void 0,
    category: E.category ?? void 0,
    firstAppearance: E.firstAppearance ?? void 0
  })), u = /* @__PURE__ */ new Map();
  for (const E of zi(t.worldDocuments))
    E.projectId !== r || E.deletedAt || u.has(E.docType) || u.set(E.docType, E.payload);
  await s(u, n);
  const S = t.memos.filter((E) => E.projectId === r && !E.deletedAt).map((E) => ({
    id: E.id,
    title: E.title,
    content: E.content,
    tags: E.tags,
    updatedAt: E.updatedAt
  })), I = o.map((E) => ({
    id: E.id,
    chapterId: E.chapterId ?? void 0,
    content: E.content,
    description: E.description ?? void 0,
    createdAt: E.createdAt.toISOString()
  })), h = Wi(
    r,
    u.get("synopsis"),
    a
  ), f = ki(
    r,
    u.get("plot"),
    a
  ), A = Bi(
    r,
    u.get("drawing"),
    a
  ), T = $i(
    r,
    u.get("mindmap"),
    a
  ), D = xi(
    r,
    u.get("graph"),
    a
  ), pt = Gi(
    r,
    u.get("scrap"),
    S,
    i.updatedAt,
    a
  ), St = d.map((E) => ({
    id: E.id,
    title: E.title,
    order: E.order,
    file: `${Tt}/${E.id}${oe}`,
    updatedAt: E.updatedAt
  }));
  return {
    meta: {
      format: Ot,
      container: bt,
      version: jt,
      projectId: i.id,
      title: i.title,
      description: i.description ?? void 0,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      chapters: St
    },
    chapters: d.map((E) => ({
      id: E.id,
      content: E.content
    })),
    characters: l,
    terms: c,
    synopsis: h,
    plot: f,
    drawing: A,
    mindmap: T,
    graph: D,
    memos: pt,
    snapshots: I
  };
}, Yi = async (e) => {
  const { bundle: t, hydrateMissingWorldDocsFromPackage: r, logger: n } = e, o = e.buildProjectPackagePayload ?? wn, s = [], a = [];
  for (const i of t.projects) {
    const d = await P.getClient().project.findUnique({
      where: { id: i.id },
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
    }), l = Hi(d?.projectPath);
    if (!l || !l.toLowerCase().endsWith(x))
      continue;
    let c;
    try {
      c = v(l, "projectPath");
    } catch (S) {
      n.warn("Skipping .luie persistence for invalid projectPath", {
        projectId: i.id,
        projectPath: l,
        error: S
      });
      continue;
    }
    const u = await o({
      bundle: t,
      projectId: i.id,
      projectPath: c,
      localSnapshots: d?.snapshots ?? [],
      hydrateMissingWorldDocsFromPackage: r,
      logger: n
    });
    if (u)
      try {
        await Tn(c, u, n), a.push({
          projectId: i.id,
          projectPath: c
        });
      } catch (S) {
        s.push(i.id), n.error("Failed to persist merged bundle into .luie package", {
          projectId: i.id,
          projectPath: c,
          error: S
        });
      }
  }
  if (s.length > 0)
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${s.join(",")}`);
  return a;
}, Xi = async (e, t) => {
  if (e.length === 0) return [];
  const r = [];
  for (const n of e)
    try {
      await yn.openLuieProject(n.projectPath);
    } catch (o) {
      r.push(n.projectId), t.error("Failed to recover DB cache from persisted .luie package", {
        projectId: n.projectId,
        projectPath: n.projectPath,
        error: o
      });
    }
  return r;
}, Vi = async (e) => wn({
  bundle: e.bundle,
  projectId: e.projectId,
  projectPath: e.projectPath,
  localSnapshots: e.localSnapshots,
  hydrateMissingWorldDocsFromPackage: e.hydrateMissingWorldDocsFromPackage,
  logger: e.logger
}), qi = async (e) => {
  const t = await Yi({
    bundle: e.bundle,
    hydrateMissingWorldDocsFromPackage: e.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: e.buildProjectPackagePayload,
    logger: e.logger
  }), r = P.getClient(), n = Ta(e.bundle);
  try {
    await r.$transaction(async (o) => {
      const s = o;
      await ma(s, n), await Sa(
        s,
        e.bundle.projects,
        n
      );
      for (const a of e.bundle.chapters)
        n.has(a.projectId) || await ya(s, a);
      await _a(
        s,
        e.bundle.characters,
        n
      ), await wa(
        s,
        e.bundle.terms,
        n
      ), await Ia(
        s,
        e.bundle.tombstones,
        n
      );
    });
  } catch (o) {
    const s = t.map((i) => i.projectId);
    e.logger.error(
      "Failed to apply merged bundle to DB cache after .luie persistence",
      {
        error: o,
        persistedProjectIds: s
      }
    );
    const a = await Xi(
      t,
      e.logger
    );
    throw a.length > 0 ? new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${a.join(",")}`,
      { cause: o }
    ) : new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"}`,
      { cause: o }
    );
  }
}, In = M("SyncRepository"), y = (e) => typeof e == "string" ? e : null, Bt = (e, t) => typeof e == "string" && e.length > 0 ? e : t, $ = (e, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof e == "string" && e.length > 0 ? e : e instanceof Date ? e.toISOString() : t, We = (e, t = 0) => typeof e == "number" && Number.isFinite(e) ? e : t, Ki = (e) => Array.isArray(e) ? e.filter((t) => typeof t == "string") : [], Lr = (e) => !!(e && typeof e == "object" && !Array.isArray(e)), Ji = (e) => {
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}, Ve = (e) => typeof e == "string" ? Ji(e) : e ?? null, nt = (e) => {
  const t = {};
  for (const [r, n] of Object.entries(e))
    n !== void 0 && (t[r] = n);
  return t;
}, Or = async (e, t, r) => {
  const n = await r.text();
  return r.status === 404 && n.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${e}_FAILED:${t}:${r.status}:${n}`);
}, Qi = (e) => {
  const t = y(e.id), r = y(e.user_id);
  return !t || !r ? null : {
    id: t,
    userId: r,
    title: Bt(e.title, "Untitled"),
    description: y(e.description),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, Zi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    title: Bt(e.title, "Untitled"),
    content: y(e.content) ?? "",
    synopsis: y(e.synopsis),
    order: We(e.order),
    wordCount: We(e.word_count),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, tc = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    name: Bt(e.name, "Character"),
    description: y(e.description),
    firstAppearance: y(e.first_appearance),
    attributes: Ve(e.attributes),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, ec = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    term: Bt(e.term, "Term"),
    definition: y(e.definition),
    category: y(e.category),
    order: We(e.order),
    firstAppearance: y(e.first_appearance),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, rc = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id), o = y(e.doc_type);
  if (!t || !r || !n || !o || o !== "synopsis" && o !== "plot" && o !== "drawing" && o !== "mindmap" && o !== "scrap" && o !== "graph")
    return null;
  const s = Ve(e.payload), a = Lr(s) ? s : {};
  return Lr(s) || In.warn("Invalid world document payload from sync source; using empty payload", {
    docType: o,
    payloadType: s === null ? "null" : typeof s
  }), {
    id: t,
    userId: r,
    projectId: n,
    docType: o,
    payload: a,
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, nc = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    title: Bt(e.title, "Memo"),
    content: y(e.content) ?? "",
    tags: Ki(e.tags),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, oc = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id), o = y(e.entity_type), s = y(e.entity_id);
  return !t || !r || !n || !o || !s ? null : {
    id: t,
    userId: r,
    projectId: n,
    entityType: o,
    entityId: s,
    deletedAt: $(e.deleted_at),
    updatedAt: $(e.updated_at)
  };
};
class sc {
  isConfigured() {
    return lt() !== null;
  }
  async fetchBundle(t, r) {
    const n = fn(), [
      o,
      s,
      a,
      i,
      d,
      l,
      c
    ] = await Promise.all([
      this.fetchTableRaw("projects", t, r),
      this.fetchTableRaw("chapters", t, r),
      this.fetchTableRaw("characters", t, r),
      this.fetchTableRaw("terms", t, r),
      this.fetchTableRaw("world_documents", t, r),
      this.fetchTableRaw("memos", t, r),
      this.fetchTableRaw("tombstones", t, r)
    ]);
    return n.projects = o.map(Qi).filter((u) => u !== null), n.chapters = s.map(Zi).filter((u) => u !== null), n.characters = a.map(tc).filter((u) => u !== null), n.terms = i.map(ec).filter((u) => u !== null), n.worldDocuments = d.map(rc).filter((u) => u !== null), n.memos = l.map(nc).filter((u) => u !== null), n.tombstones = c.map(oc).filter((u) => u !== null), n;
  }
  async upsertBundle(t, r) {
    const n = r.projects.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        title: c.title,
        description: c.description ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), o = r.chapters.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        title: c.title,
        content: c.content,
        synopsis: c.synopsis ?? null,
        order: c.order,
        word_count: c.wordCount,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), s = r.characters.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        name: c.name,
        description: c.description ?? null,
        first_appearance: c.firstAppearance ?? null,
        attributes: Ve(c.attributes),
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), a = r.terms.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        term: c.term,
        definition: c.definition ?? null,
        category: c.category ?? null,
        order: c.order,
        first_appearance: c.firstAppearance ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), i = r.worldDocuments.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        doc_type: c.docType,
        payload: c.payload ?? {},
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), d = r.memos.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        title: c.title,
        content: c.content,
        tags: c.tags,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      })
    ), l = r.tombstones.map(
      (c) => nt({
        id: c.id,
        user_id: c.userId,
        project_id: c.projectId,
        entity_type: c.entityType,
        entity_id: c.entityId,
        deleted_at: c.deletedAt,
        updated_at: c.updatedAt
      })
    );
    await this.upsertTable("projects", t, n, "id,user_id"), await this.upsertTable("chapters", t, o, "id,user_id"), await this.upsertTable("characters", t, s, "id,user_id"), await this.upsertTable("terms", t, a, "id,user_id"), await this.upsertTable("world_documents", t, i, "id,user_id"), await this.upsertTable("memos", t, d, "id,user_id"), await this.upsertTable("tombstones", t, l, "id,user_id");
  }
  async fetchTableRaw(t, r, n) {
    const o = lt();
    if (!o)
      throw new Error(
        "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed"
      );
    const s = new URLSearchParams();
    s.set("select", "*"), s.set("user_id", `eq.${n}`);
    const a = await fetch(`${o.url}/rest/v1/${t}?${s.toString()}`, {
      method: "GET",
      headers: {
        apikey: o.anonKey,
        Authorization: `Bearer ${r}`
      }
    });
    if (!a.ok) {
      const d = await Or("FETCH", t, a);
      throw In.warn("Failed to fetch sync table", {
        table: t,
        status: a.status,
        error: d.message
      }), d;
    }
    const i = await a.json();
    return Array.isArray(i) ? i : [];
  }
  async upsertTable(t, r, n, o) {
    if (n.length === 0) return;
    const s = Lt(), a = await fetch(
      `${s.url}/rest/v1/${t}?on_conflict=${encodeURIComponent(o)}`,
      {
        method: "POST",
        headers: {
          apikey: s.anonKey,
          Authorization: `Bearer ${r}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(n)
      }
    );
    if (!a.ok)
      throw await Or("UPSERT", t, a);
  }
}
const br = new sc(), ac = async (e) => {
  e.updateStatus({
    mode: "syncing",
    inFlight: !0,
    queued: !1,
    lastError: void 0
  });
  try {
    const t = g.getSyncSettings(), r = t.userId;
    if (!r)
      throw new Error("SYNC_USER_ID_MISSING");
    const n = e.normalizePendingProjectDeletes(t.pendingProjectDeletes).map((h) => h.projectId), o = await e.ensureAccessToken(t), [s, a] = await Promise.all([
      br.fetchBundle(o, r),
      e.buildLocalBundle(r)
    ]), { merged: i, conflicts: d } = Js(a, s, {
      baselinesByProjectId: t.entityBaselinesByProjectId,
      conflictResolutions: t.pendingConflictResolutions
    });
    if (d.total > 0) {
      const h = new Set(
        (d.items ?? []).map((D) => `${D.type}:${D.id}`)
      ), f = Object.fromEntries(
        Object.entries(t.pendingConflictResolutions ?? {}).filter(
          (D) => h.has(D[0])
        )
      );
      g.setSyncSettings({
        pendingConflictResolutions: Object.keys(f).length > 0 ? f : void 0,
        lastError: void 0
      });
      const T = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        pulled: e.countBundleRows(s),
        pushed: 0,
        conflicts: d.total,
        success: !1,
        message: "SYNC_CONFLICT_DETECTED"
      };
      return e.updateStatus({
        ...e.toSyncStatusFromSettings(g.getSyncSettings(), e.getStatus()),
        mode: "idle",
        health: "connected",
        degradedReason: void 0,
        inFlight: !1,
        queued: !1,
        conflicts: d,
        projectStateById: la(
          mr(t.projectLastSyncedAtByProjectId),
          d
        ),
        lastRun: T
      }), {
        success: !1,
        message: "SYNC_CONFLICT_DETECTED",
        pulled: T.pulled,
        pushed: 0,
        conflicts: d
      };
    }
    await e.applyMergedBundleToLocal(i), await br.upsertBundle(o, i);
    const l = (/* @__PURE__ */ new Date()).toISOString(), c = pa(
      t,
      i,
      l,
      n
    ), u = Aa(
      t,
      i,
      l,
      n
    ), S = g.setSyncSettings({
      lastSyncedAt: l,
      lastError: void 0,
      projectLastSyncedAtByProjectId: c,
      entityBaselinesByProjectId: u,
      pendingConflictResolutions: void 0
    });
    n.length > 0 && g.removePendingProjectDeletes(n);
    const I = {
      success: !0,
      message: `SYNC_OK:${e.reason}`,
      pulled: e.countBundleRows(s),
      pushed: e.countBundleRows(i),
      conflicts: d,
      syncedAt: l
    };
    return e.updateStatus({
      ...e.toSyncStatusFromSettings(S, e.getStatus()),
      mode: "idle",
      health: "connected",
      degradedReason: void 0,
      inFlight: !1,
      conflicts: d,
      projectStateById: mr(c),
      lastRun: {
        at: l,
        pulled: I.pulled,
        pushed: I.pushed,
        conflicts: I.conflicts.total,
        success: !0,
        message: I.message
      }
    }), e.getQueuedRun() && (e.setQueuedRun(!1), e.runQueuedSync()), I;
  } catch (t) {
    const r = e.toSyncErrorMessage(t), o = {
      at: (/* @__PURE__ */ new Date()).toISOString(),
      pulled: 0,
      pushed: 0,
      conflicts: e.getStatus().conflicts.total,
      success: !1,
      message: r
    };
    if (e.isAuthFatalMessage(r))
      e.applyAuthFailureState(r, o);
    else {
      const s = g.setSyncSettings({
        lastError: r
      });
      e.updateStatus({
        ...e.toSyncStatusFromSettings(s, e.getStatus()),
        mode: "error",
        health: e.getStatus().connected ? "connected" : "disconnected",
        degradedReason: void 0,
        inFlight: !1,
        queued: !1,
        projectStateById: An(e.getStatus().projectStateById, r),
        lastRun: o
      });
    }
    return e.setQueuedRun(!1), e.logRunFailed(t, e.reason), {
      success: !1,
      message: r,
      pulled: 0,
      pushed: 0,
      conflicts: e.getStatus().conflicts
    };
  }
}, jr = (e, t) => {
  t && g.setSyncSettings(
    e === "access" ? { accessTokenCipher: t } : { refreshTokenCipher: t }
  );
}, ic = (e, t) => {
  const r = B.getAccessToken(e);
  if (r.errorCode && t(r.errorCode))
    return r.errorCode;
  jr("access", r.migratedCipher);
  const n = B.getRefreshToken(e);
  return n.errorCode && t(n.errorCode) ? n.errorCode : (jr("refresh", n.migratedCipher), !!r.token || !!n.token ? null : r.errorCode ?? n.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
}, J = M("SyncService"), cc = 1500, Fr = {
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
}, dc = (e) => {
  const t = e instanceof Error ? e.message : String(e);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, lc = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], ge = (e) => lc.some((t) => e.includes(t)), ht = (e, t) => ({
  ...t,
  connected: e.connected,
  provider: e.provider,
  email: e.email,
  userId: e.userId,
  expiresAt: e.expiresAt,
  autoSync: e.autoSync,
  lastSyncedAt: e.lastSyncedAt,
  lastError: e.lastError,
  projectLastSyncedAtByProjectId: e.projectLastSyncedAtByProjectId,
  health: e.connected ? t.health === "degraded" ? "degraded" : "connected" : "disconnected",
  degradedReason: e.connected && t.health === "degraded" ? t.degradedReason ?? e.lastError : void 0
}), Ur = (e) => Array.isArray(e) ? e.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [];
class Pn {
  status = Fr;
  inFlightPromise = null;
  queuedRun = !1;
  autoSyncTimer = null;
  applyAuthFailureState(t, r) {
    const n = g.setSyncSettings({
      lastError: t
    });
    this.updateStatus({
      ...ht(n, this.status),
      mode: "error",
      health: "degraded",
      degradedReason: t,
      inFlight: !1,
      queued: !1,
      projectStateById: An(this.status.projectStateById, t),
      lastRun: r ?? this.status.lastRun
    });
  }
  initialize() {
    const t = g.getSyncSettings();
    if (this.status = ht(t, this.status), !t.connected && B.hasPendingAuthFlow() && (this.status = {
      ...this.status,
      mode: "connecting"
    }), t.connected) {
      const r = ic(
        t,
        ge
      );
      r && this.applyAuthFailureState(r);
    }
    this.broadcastStatus(), this.status.connected && this.status.autoSync && this.runNow("startup");
  }
  getStatus() {
    return this.status;
  }
  async connectGoogle() {
    if (this.status.mode === "connecting")
      return this.status;
    if (!B.isConfigured())
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
      return await B.startGoogleAuth(), this.status;
    } catch (t) {
      const r = t instanceof Error ? t.message : String(t);
      return r.includes("SYNC_AUTH_FLOW_IN_PROGRESS") ? (this.updateStatus({
        mode: "connecting",
        health: "disconnected",
        degradedReason: void 0,
        lastError: void 0
      }), this.status) : (this.updateStatus({
        mode: "error",
        health: "disconnected",
        degradedReason: void 0,
        lastError: r
      }), this.status);
    }
  }
  async getEdgeAccessToken() {
    const t = g.getSyncSettings();
    if (!t.connected || !t.userId)
      throw new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    return this.ensureAccessToken(t);
  }
  async handleOAuthCallback(t) {
    try {
      const r = await B.completeOAuthCallback(t), n = g.getSyncSettings(), o = g.setSyncSettings({
        ...n,
        connected: !0,
        provider: r.provider,
        userId: r.userId,
        email: r.email,
        expiresAt: r.expiresAt,
        accessTokenCipher: r.accessTokenCipher,
        refreshTokenCipher: r.refreshTokenCipher,
        lastError: void 0
      });
      this.updateStatus({
        ...ht(o, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: void 0
      }), this.runNow("oauth-callback");
    } catch (r) {
      const n = r instanceof Error ? r.message : String(r);
      throw this.updateStatus({
        mode: "error",
        lastError: n
      }), r;
    }
  }
  async disconnect() {
    this.autoSyncTimer && (clearTimeout(this.autoSyncTimer), this.autoSyncTimer = null), this.queuedRun = !1;
    const t = g.clearSyncSettings();
    return this.updateStatus({
      ...ht(t, Fr),
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
    const r = g.setSyncSettings({ autoSync: t });
    return this.updateStatus(ht(r, this.status)), this.status;
  }
  async resolveConflict(t) {
    if (J.info("Sync conflict resolution requested", {
      type: t.type,
      id: t.id,
      resolution: t.resolution
    }), !(this.status.conflicts.items ?? []).some(
      (i) => i.type === t.type && i.id === t.id
    ))
      throw new Error("SYNC_CONFLICT_NOT_FOUND");
    const s = {
      ...g.getSyncSettings().pendingConflictResolutions ?? {},
      [`${t.type}:${t.id}`]: t.resolution
    };
    g.setSyncSettings({
      pendingConflictResolutions: s,
      lastError: void 0
    });
    const a = await this.runNow(
      `resolve-conflict:${t.type}:${t.id}:${t.resolution}`
    );
    if (!a.success && a.message !== "SYNC_CONFLICT_DETECTED")
      throw new Error(a.message || "SYNC_RESOLVE_CONFLICT_FAILED");
  }
  onLocalMutation(t) {
    !this.status.connected || !this.status.autoSync || (this.autoSyncTimer && clearTimeout(this.autoSyncTimer), this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null, this.runNow("auto");
    }, cc));
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
    const r = this.executeRun(t).finally(() => {
      this.inFlightPromise = null;
    });
    return this.inFlightPromise = r, r;
  }
  async executeRun(t) {
    return await ac({
      reason: t,
      getStatus: () => this.status,
      getQueuedRun: () => this.queuedRun,
      setQueuedRun: (r) => {
        this.queuedRun = r;
      },
      runQueuedSync: () => {
        this.runNow("queued");
      },
      normalizePendingProjectDeletes: Ur,
      toSyncStatusFromSettings: ht,
      ensureAccessToken: async (r) => await this.ensureAccessToken(r),
      buildLocalBundle: async (r) => await this.buildLocalBundle(r),
      applyMergedBundleToLocal: async (r) => await this.applyMergedBundleToLocal(r),
      countBundleRows: (r) => this.countBundleRows(r),
      updateStatus: (r) => this.updateStatus(r),
      applyAuthFailureState: (r, n) => this.applyAuthFailureState(r, n),
      isAuthFatalMessage: ge,
      toSyncErrorMessage: dc,
      logRunFailed: (r, n) => {
        J.error("Sync run failed", { error: r, reason: n });
      }
    });
  }
  async ensureAccessToken(t) {
    return await ga({
      syncSettings: t,
      isAuthFatalMessage: ge
    });
  }
  async buildLocalBundle(t) {
    const r = P.getClient(), n = Ur(
      g.getSyncSettings().pendingProjectDeletes
    ), o = await r.project.findMany({
      include: {
        chapters: !0,
        characters: !0,
        terms: !0
      }
    });
    return await da({
      userId: t,
      pendingProjectDeletes: n,
      projectRows: o,
      logger: J
    });
  }
  async buildProjectPackagePayload(t, r, n, o) {
    return await Vi({
      bundle: t,
      projectId: r,
      projectPath: n,
      localSnapshots: o,
      hydrateMissingWorldDocsFromPackage: async (s, a) => await Tr(s, a, J),
      logger: J
    });
  }
  async applyMergedBundleToLocal(t) {
    await qi({
      bundle: t,
      hydrateMissingWorldDocsFromPackage: async (r, n) => await Tr(r, n, J),
      buildProjectPackagePayload: async (r) => await this.buildProjectPackagePayload(
        r.bundle,
        r.projectId,
        r.projectPath,
        r.localSnapshots
      ),
      logger: J
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
    const t = G.getAllWindows();
    for (const r of t)
      if (!r.isDestroyed())
        try {
          r.webContents.send(gt.SYNC_STATUS_CHANGED, this.status);
        } catch (n) {
          J.warn("Failed to broadcast sync status", { error: n });
        }
  }
}
const Qt = new Pn(), Ad = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: Pn,
  syncService: Qt
}, Symbol.toStringTag, { value: "Module" })), Dt = M("DeepLink"), pc = "luie://auth/callback", uc = "luie://auth/return", hc = "luie://auth/", zt = () => {
  const e = U.getMainWindow();
  if (e) {
    e.isMinimized() && e.restore(), e.focus();
    return;
  }
  const t = U.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, Te = (e) => {
  const t = G.getAllWindows();
  for (const r of t)
    if (!r.isDestroyed())
      try {
        r.webContents.send(gt.SYNC_AUTH_RESULT, e);
      } catch (n) {
        Dt.warn("Failed to broadcast OAuth result", { error: n });
      }
}, Ec = (e) => {
  const t = e instanceof Error ? e.message : String(e);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, fc = (e) => e === "NO_PENDING" || e === "EXPIRED" || e === "STATE_MISMATCH", vr = (e) => e === "NO_PENDING" ? "NO_PENDING" : e === "EXPIRED" ? "EXPIRED" : e === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", ke = (e) => {
  for (const t of e)
    if (typeof t == "string" && t.startsWith(hc))
      return t;
  return null;
}, Be = async (e) => {
  if (e.startsWith(uc))
    return zt(), Dt.info("OAuth return deep link handled", { url: e }), !0;
  if (!e.startsWith(pc))
    return !1;
  try {
    return await Qt.handleOAuthCallback(e), zt(), Te({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Dt.info("OAuth callback processed", { url: e }), !0;
  } catch (t) {
    const r = t instanceof Error ? t.message : String(t), n = Ec(t), o = Qt.getStatus();
    return o.connected && fc(n) ? (zt(), Te({
      status: "stale",
      reason: vr(n),
      detail: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Dt.warn("OAuth callback arrived after connection was already established", {
      url: e,
      reason: n,
      error: t
    }), !0) : (zt(), Te({
      status: "error",
      reason: vr(n),
      detail: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Dt.error(o.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
      url: e,
      reason: n,
      error: t
    }), !1);
  }
}, Q = (e, t, r) => {
  if (!(!e || e.isDestroyed()))
    try {
      e.webContents.send(gt.APP_QUIT_PHASE, { phase: t, message: r });
    } catch {
    }
}, me = async (e, t) => e && !e.isDestroyed() ? Se.showMessageBox(e, t) : Se.showMessageBox(t), Ac = (e) => {
  let t = !1;
  m.on("window-all-closed", () => {
    process.platform !== "darwin" && m.quit();
  }), m.on("before-quit", (r) => {
    t || (t = !0, r.preventDefault(), (async () => {
      e.info("App is quitting");
      const { autoSaveManager: n } = await import("./autoSaveManager-DayVX5OV.js").then((h) => h.d), { snapshotService: o } = await import("./snapshotService-BSZ4abpR.js").then((h) => h.a), { projectService: s } = await Promise.resolve().then(() => _n), a = U.getMainWindow();
      Q(a, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let i = !1, d = !1, l = !1;
      if (a && !a.isDestroyed() && a.webContents)
        try {
          i = await new Promise((h) => {
            const f = setTimeout(
              () => h(!1),
              oo
            );
            Cn.once(gt.APP_FLUSH_COMPLETE, (A, T) => {
              d = !!T?.hadQueuedAutoSaves, l = !!T?.rendererDirty, clearTimeout(f), h(!0);
            }), a.webContents.send(gt.APP_BEFORE_QUIT);
          }), e.info("Renderer flush phase completed", {
            rendererFlushed: i,
            rendererHadQueued: d,
            rendererDirty: l
          });
        } catch (h) {
          e.warn("Renderer flush request failed", h);
        }
      Q(a, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored: h } = await n.flushCritical();
        e.info("Pre-dialog mirror flush completed", { mirrored: h });
      } catch (h) {
        e.error("Pre-dialog mirror flush failed", h);
      }
      const c = n.getPendingSaveCount();
      if (c > 0 || d || l || !i)
        try {
          const h = c > 0 ? `${c}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", f = await me(a, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message: h,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: !0
          });
          if (f.response === 2) {
            e.info("Quit cancelled by user"), t = !1, Q(a, "aborted", "종료가 취소되었습니다.");
            return;
          }
          if (f.response === 0) {
            e.info("User chose: save and quit");
            try {
              await Promise.race([
                n.flushAll(),
                new Promise((A) => setTimeout(A, so))
              ]), await n.flushMirrorsToSnapshots("session-end");
            } catch (A) {
              e.error("Save during quit failed", A);
            }
          } else {
            e.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await n.flushMirrorsToSnapshots("session-end-no-save");
            } catch (A) {
              e.warn("Mirror-to-snapshot conversion failed", A);
            }
          }
        } catch (h) {
          e.error("Quit dialog failed; exiting with mirrors on disk", h);
        }
      else
        try {
          await n.flushMirrorsToSnapshots("session-end");
        } catch (h) {
          e.warn("Session-end mirror flush failed", h);
        }
      Q(a, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let S = "continue";
      if ((await s.flushPendingExports(ao)).timedOut) {
        const h = await me(a, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: !0
        });
        (h.response === 1 || h.response === 0 && (await s.flushPendingExports(io)).timedOut && (await me(a, {
          type: "warning",
          title: "저장 지연 지속",
          message: "저장이 아직 완료되지 않았습니다.",
          detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
          buttons: ["종료 취소", "저장 생략 후 종료"],
          defaultId: 0,
          cancelId: 0,
          noLink: !0
        })).response === 0) && (S = "cancel");
      }
      if (S === "cancel") {
        e.info("Quit cancelled by user during export flush"), t = !1, Q(a, "aborted", "종료가 취소되었습니다.");
        return;
      }
      Q(a, "finalize", "마무리 정리 중입니다...");
      try {
        await o.pruneSnapshotsAllProjects();
      } catch (h) {
        e.warn("Snapshot pruning failed during quit", h);
      }
      try {
        const { db: h } = await Promise.resolve().then(() => cs);
        await h.disconnect();
      } catch (h) {
        e.warn("DB disconnect failed during quit", h);
      }
      Q(a, "completed", "안전하게 종료합니다."), m.exit(0);
    })().catch((n) => {
      e.error("Quit guard failed", n), t = !1;
      const o = U.getMainWindow();
      Q(o, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
    }));
  }), process.on("SIGINT", () => {
    e.info("Received SIGINT"), m.quit();
  }), process.on("SIGTERM", () => {
    e.info("Received SIGTERM"), m.quit();
  }), process.on("uncaughtException", (r) => {
    e.error("Uncaught exception", r);
  }), process.on("unhandledRejection", (r) => {
    e.error("Unhandled rejection", r);
  });
}, gc = (e) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : m.requestSingleInstanceLock())) {
    const n = ke(process.argv);
    return e.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!n,
      argv: process.argv
    }), m.quit(), !1;
  }
  return m.on("second-instance", (n, o) => {
    const s = ke(o);
    e.info("Second instance event received", {
      hasCallbackUrl: !!s
    }), s && Be(s);
    const a = U.getMainWindow();
    a && (a.isMinimized() && a.restore(), a.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-HSSbDImy.js").then((e) => e.c);
zr({
  logToFile: !0,
  logFilePath: j.join(m.getPath("userData"), wo, Io),
  minLevel: xe.INFO
});
const et = M("Main"), Xt = process.defaultApp === !0, $e = Date.now();
et.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: m.isPackaged,
  defaultApp: Xt,
  startupStartedAtMs: $e
});
const Tc = () => {
  const e = "luie";
  let t = !1;
  const r = m.getAppPath();
  if (Xt ? r && (t = m.setAsDefaultProtocolClient(e, process.execPath, [r])) : t = m.setAsDefaultProtocolClient(e), !t) {
    const o = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    g.getSyncSettings().connected || g.setSyncSettings({ lastError: o }), et.warn("Failed to register custom protocol for OAuth callback", {
      protocol: e,
      defaultApp: Xt,
      reason: o
    });
    return;
  }
  g.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && g.setSyncSettings({ lastError: void 0 }), et.info("Custom protocol registered", {
    protocol: e,
    defaultApp: Xt,
    appEntry: r
  });
};
if (!gc(et))
  m.quit();
else {
  $s(et), vo(), m.disableHardwareAcceleration(), process.platform === "darwin" && m.on("open-url", (t, r) => {
    t.preventDefault(), Be(r);
  }), Tc();
  const e = ke(process.argv);
  e && Be(e), Fs(et, {
    startupStartedAtMs: $e,
    onFirstRendererReady: () => {
      const t = Date.now();
      Qt.initialize(), et.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - $e
      });
    }
  }), Ac(et);
}
export {
  fe as $,
  $c as A,
  ba as B,
  Oa as C,
  sd as D,
  w as E,
  F,
  Kr as G,
  Jr as H,
  gt as I,
  Mt as J,
  te as K,
  x as L,
  oe as M,
  ee as N,
  re as O,
  Wc as P,
  He as Q,
  ne as R,
  _ as S,
  Ua as T,
  Mc as U,
  id as V,
  kc as W,
  nd as X,
  od as Y,
  La as Z,
  Xo as _,
  Zt as a,
  Qt as a0,
  U as a1,
  Qr as a2,
  ud as a3,
  lt as a4,
  td as a5,
  Zc as a6,
  ze as a7,
  ed as a8,
  Vr as a9,
  qc as aa,
  Vc as ab,
  xc as ac,
  ro as ad,
  Xc as ae,
  Kc as af,
  Jc as ag,
  Qc as ah,
  Hc as ai,
  Gc as aj,
  zc as ak,
  Yc as al,
  Ft as am,
  jt as an,
  bt as ao,
  Ot as ap,
  Ge as aq,
  nr as ar,
  Bc as as,
  dd as at,
  ld as au,
  hd as av,
  Ad as aw,
  Tt as b,
  M as c,
  P as d,
  v as e,
  rd as f,
  $n as g,
  cd as h,
  pd as i,
  Wt as j,
  Jt as k,
  ja as l,
  Pa as m,
  vt as n,
  Ca as o,
  yn as p,
  fd as q,
  H as r,
  va as s,
  Fa as t,
  Ed as u,
  Da as v,
  Xn as w,
  yr as x,
  ad as y,
  Tn as z
};

import { app as m, nativeTheme as mn, BrowserWindow as G, Menu as ae, shell as yn, safeStorage as z, session as ze, dialog as Te, ipcMain as _n } from "electron";
import * as tt from "node:path";
import j from "node:path";
import * as wn from "fs";
import { existsSync as In, promises as it } from "fs";
import * as X from "path";
import Z, { join as W } from "path";
import Pn from "electron-window-state";
import Ye from "electron-store";
import * as Ct from "node:fs/promises";
import { access as br, mkdir as Xe, writeFile as Ve, unlink as qe } from "node:fs/promises";
import { spawn as Rn } from "node:child_process";
import { constants as Se, promises as At } from "node:fs";
import { createRequire as Cn } from "node:module";
import { EventEmitter as Nn } from "node:events";
import { randomBytes as Dn, createHash as Ln, randomUUID as V } from "node:crypto";
import * as k from "fs/promises";
import On from "yauzl";
import jn from "yazl";
import { z as p } from "zod";
import bn from "node:module";
const Cc = import.meta.filename, K = import.meta.dirname, Nc = bn.createRequire(import.meta.url);
var We = /* @__PURE__ */ ((e) => (e.DEBUG = "DEBUG", e.INFO = "INFO", e.WARN = "WARN", e.ERROR = "ERROR", e))(We || {});
const Xt = /* @__PURE__ */ Symbol.for("luie.logger.context"), me = "[REDACTED]", Fn = "[REDACTED_PATH]", Fr = "[REDACTED_TEXT]", Ur = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, vr = /(content|synopsis|manuscript|chapterText|prompt)/i, Mr = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, Un = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, vn = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, Mn = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function Ke(e, t) {
  if (Ur.test(t ?? ""))
    return me;
  if (vr.test(t ?? ""))
    return Fr;
  if (Mr.test(t ?? "") && Un.test(e))
    return Fn;
  let r = e.replace(vn, "Bearer [REDACTED]");
  return Mn.test(r) && (r = me), r;
}
function Et(e, t, r = /* @__PURE__ */ new WeakSet()) {
  if (typeof e == "string")
    return Ke(e, t);
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
        if (Ur.test(s)) {
          o[s] = me;
          continue;
        }
        if (vr.test(s) && typeof a == "string") {
          o[s] = Fr;
          continue;
        }
        if (Mr.test(s) && typeof a == "string") {
          o[s] = Ke(a, s);
          continue;
        }
        o[s] = Et(a, s, r);
      }
      return o;
    }
    return String(e);
  }
}
function Wn(e) {
  if (!e || typeof e != "object") return Et(e);
  const t = e[Xt];
  return !t || typeof t != "object" ? Et(e) : Array.isArray(e) ? Et({ items: e, _ctx: t }) : Et({ ...e, _ctx: t });
}
function kn(e, t) {
  return e && typeof e == "object" ? { ...e, [Xt]: t } : { value: e, [Xt]: t };
}
class Bn {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, r, n) {
    if (!$n(t)) return;
    const o = Wn(n), s = {
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
    q.logToFile && q.logFilePath && Hn(s);
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
const Wr = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, Je = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let q = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, ie = null;
function $n(e) {
  return Je[e] >= Je[q.minLevel];
}
async function xn() {
  !Wr || !q.logFilePath || (ie || (ie = (async () => {
    const e = await import("node:path");
    await (await import("node:fs/promises")).mkdir(e.dirname(q.logFilePath), {
      recursive: !0
    });
  })()), await ie);
}
function Gn(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return '"[unserializable]"';
  }
}
async function Hn(e) {
  if (!(!Wr || !q.logFilePath))
    try {
      await xn();
      const t = await import("node:fs/promises"), r = Gn(e);
      await t.appendFile(q.logFilePath, `${r}
`, "utf8");
    } catch {
    }
}
function kr(e) {
  q = {
    ...q,
    ...e
  };
}
function M(e) {
  return new Bn(e);
}
const Dc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: Xt,
  LogLevel: We,
  configureLogger: kr,
  createLogger: M,
  withLogContext: kn
}, Symbol.toStringTag, { value: "Module" })), zn = "Luie", Yn = "0.1.0", Br = (e, t) => typeof e == "string" && e.trim().length > 0 ? e : t, Qe = Br(
  "luie",
  zn
), Lc = Br(
  "0.1.16",
  Yn
), $r = "luie.db", Xn = 3e4, Vn = Xn, Oc = 1e3, ke = 30, qn = !0, jc = 300 * 1e3, bc = 60 * 1e3, Fc = 200, Uc = 5e3, Kn = 3e3, Jn = 1e4, Qn = 8e3, Zn = 2e4, vc = 60 * 1e3, Mc = 2e3, xr = 50, Wc = 2e3, kc = 1, Bc = 0, $c = 30, xc = 50, Gc = 2e3, to = 5e3, eo = 1400, ro = 900, no = 1e3, oo = 600, so = 16, ao = 16, io = "sans", co = "inter", lo = 16, po = 1.6, uo = 800, ho = "blue", Eo = !0, fo = "logs", Ao = "luie.log", Hc = "snapshot-mirror", zc = "Backups", go = "settings", To = "settings.json", Gr = "luie", x = ".luie", Yc = "luie", Lt = "luie", Xc = "Luie Project", Vc = "New Project", qc = "project", Ot = "zip", jt = 1, Qt = "meta.json", Tt = "manuscript", Kc = `${Tt}/README.md`, F = "world", bt = "snapshots", So = "assets", Hr = "characters.json", zr = "terms.json", vt = "synopsis.json", Zt = "plot-board.json", te = "map-drawing.json", ee = "mindmap.json", Be = "scrap-memos.json", re = "graph.json", ne = ".md", w = {
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
}, mo = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), Ze = (e) => mo.has(e), Jc = (e, t, r) => !0, yo = "neutral", _o = "soft", $e = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", wo = () => !m.isPackaged && !$e(), Io = () => m.isPackaged, Po = () => j.join(process.cwd(), "prisma", "dev.db"), Ro = () => j.join(process.cwd(), "prisma", ".tmp", "test.db"), Co = () => j.join(m.getPath("userData"), $r);
function No() {
  if (process.env.DATABASE_URL) return;
  const e = $e() ? Ro() : m.isPackaged ? Co() : Po();
  process.env.DATABASE_URL = `file:${e}`;
}
const Do = Gr, Lo = To, ce = go, Oo = (e) => {
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
}, jo = (e) => {
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
}, zt = jo(process.platform), ye = process.platform === "darwin" ? "visible" : "hidden", _e = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = typeof e.url == "string" ? e.url.trim() : "", r = typeof e.anonKey == "string" ? e.anonKey.trim() : "";
  if (!(t.length === 0 || r.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: r
    };
}, tr = () => ({
  editor: {
    fontFamily: io,
    fontPreset: co,
    fontSize: lo,
    lineHeight: po,
    maxWidth: uo,
    theme: mn.shouldUseDarkColors ? "dark" : "light",
    themeTemp: yo,
    themeContrast: _o,
    themeAccent: ho,
    themeTexture: Eo,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: zt,
  lastProjectPath: void 0,
  autoSaveEnabled: qn,
  autoSaveInterval: Vn,
  snapshotExportLimit: xr,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: ye,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
}), dt = (e) => typeof e == "string" && e.length > 0, bo = (e) => {
  if (!Array.isArray(e)) return;
  const t = e.filter(
    (r) => !!(r && typeof r == "object" && dt(r.projectId) && dt(r.deletedAt))
  ).map((r) => ({
    projectId: r.projectId,
    deletedAt: r.deletedAt
  }));
  return t.length > 0 ? t : void 0;
}, we = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(
      (r) => dt(r[0]) && dt(r[1])
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, Fo = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const t = e;
  return {
    chapter: we(t.chapter) ?? {},
    memo: we(t.memo) ?? {},
    capturedAt: dt(t.capturedAt) ? t.capturedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}, Uo = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(([r]) => dt(r)).map(([r, n]) => [r, Fo(n)]).filter((r) => !!r[1])
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, vo = (e) => {
  if (!e || typeof e != "object" || Array.isArray(e))
    return;
  const t = Object.fromEntries(
    Object.entries(e).filter(
      (r) => dt(r[0]) && (r[1] === "local" || r[1] === "remote")
    )
  );
  return Object.keys(t).length > 0 ? t : void 0;
}, er = (e) => {
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
    pendingProjectDeletes: bo(t.pendingProjectDeletes),
    projectLastSyncedAtByProjectId: we(t.projectLastSyncedAtByProjectId),
    entityBaselinesByProjectId: Uo(t.entityBaselinesByProjectId),
    pendingConflictResolutions: vo(
      t.pendingConflictResolutions
    ),
    runtimeSupabaseConfig: _e(t.runtimeSupabaseConfig)
  };
}, ut = M("SettingsManager");
class st {
  static instance;
  store;
  constructor() {
    const t = m.getPath("userData"), r = `${t}/${Do}/${ce}`, n = `${r}/${Lo}`;
    this.store = new Ye({
      name: ce,
      defaults: tr(),
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
        const s = new Ye({
          name: ce,
          defaults: tr(),
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
      return await br(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", ye), "titleBarMode" in t) {
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
      sync: Oo(t.sync)
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
    return { shortcuts: { ...zt, ...t }, defaults: zt };
  }
  setShortcuts(t) {
    const r = { ...zt, ...t };
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
    return this.store.get("menuBarMode") ?? ye;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    return er(this.store.get("sync"));
  }
  setSyncSettings(t) {
    const r = er({
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
    return _e(t.runtimeSupabaseConfig);
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
    const r = _e(t);
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
const g = st.getInstance(), Qc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: st,
  settingsManager: g
}, Symbol.toStringTag, { value: "Module" })), R = M("WindowManager"), de = "#f4f4f5";
class Mo {
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
      if (In(o))
        return o;
  }
  getTitleBarOptions() {
    return process.platform !== "darwin" ? {} : {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: so, y: ao }
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
    const n = Pn({
      defaultWidth: eo,
      defaultHeight: ro
    }), o = this.resolveWindowIconPath();
    this.mainWindow = new G({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      minWidth: no,
      minHeight: oo,
      title: Qe,
      show: !1,
      backgroundColor: de,
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
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !s && process.env.NODE_ENV !== "production";
    if (c)
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
    }), R.info("Main window created", { isPackaged: s, useDevServer: c }), this.mainWindow;
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
      title: `${Qe} Setup`,
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
      backgroundColor: de,
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
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !s && process.env.NODE_ENV !== "production", d = `?chapterId=${t}`, l = "#export";
    if (c) {
      const i = `${a}/${d}${l}`;
      R.info("Loading export window (dev)", { url: i }), this.exportWindow.loadURL(i).catch((u) => {
        R.error("Failed to load export window (dev)", { url: i, error: u });
      });
    } else {
      const i = W(K, "../renderer/index.html");
      R.info("Loading export window (prod)", { path: i }), this.exportWindow.loadFile(i, { hash: "export", search: d }).catch((u) => {
        R.error("Failed to load export window (prod)", {
          path: i,
          hash: "export",
          search: d,
          error: u
        });
      });
    }
    return this.exportWindow.on("closed", () => {
      this.exportWindow = null, R.info("Export window closed");
    }), c && this.exportWindow.webContents.openDevTools({ mode: "detach" }), this.exportWindow;
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
      backgroundColor: de,
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
    const o = m.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", a = !o && process.env.NODE_ENV !== "production", c = "#world-graph";
    if (a) {
      const d = `${s}/${c}`;
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
const U = new Mo(), Zc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: U
}, Symbol.toStringTag, { value: "Module" })), Wo = () => {
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
}, ko = (e) => {
  if (process.platform !== "darwin" || e === "hidden") {
    ae.setApplicationMenu(null);
    return;
  }
  ae.setApplicationMenu(ae.buildFromTemplate(Wo()));
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
function td(e) {
  return typeof e == "object" && e !== null && "code" in e && "message" in e;
}
const rr = 4096, Bo = process.platform === "win32" ? [j.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], nr = (e) => process.platform === "win32" ? e.toLowerCase() : e, $o = (e, t) => {
  const r = nr(j.resolve(e)), n = nr(j.resolve(t));
  return r === n || r.startsWith(`${n}${j.sep}`);
};
function xo(e, t) {
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
  if (r.length > rr)
    throw new _(
      w.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: r.length, maxLength: rr }
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
  const r = xo(e, t);
  if (!j.isAbsolute(r))
    throw new _(
      w.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: r }
    );
  const n = j.resolve(r);
  for (const o of Bo)
    if ($o(n, o))
      throw new _(
        w.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: n, restrictedRoot: j.resolve(o) }
      );
  return n;
}
const Go = [
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
], Ho = [
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
], zo = {
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
}, Yo = `
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
`, or = M("DatabaseSeed");
async function Xo(e) {
  const t = await e.project.count();
  return t > 0 ? (or.info("Seed skipped (projects exist)", { count: t }), !1) : (await e.project.create({
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
  }), or.info("Seed completed (default project created)"), !0);
}
const N = M("DatabaseService"), xe = Cn(import.meta.url), { PrismaClient: sr } = xe("@prisma/client"), Vo = () => {
  const e = xe("@prisma/adapter-better-sqlite3");
  if (typeof e == "function") return e;
  if (e && typeof e == "object" && typeof e.PrismaBetterSqlite3 == "function")
    return e.PrismaBetterSqlite3;
  throw new Error("Failed to load Prisma better-sqlite3 adapter");
}, qo = () => {
  const e = xe("better-sqlite3");
  return typeof e == "function" ? e : e.default;
}, Ko = (e) => `"${e.replace(/"/g, '""')}"`, yt = async (e) => {
  try {
    return await Ct.access(e, Se.F_OK), !0;
  } catch {
    return !1;
  }
}, Jo = (e) => {
  const t = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return tt.join(e, "node_modules", ".bin", t);
}, ar = "file:", Qo = (e) => {
  if (!e.startsWith(ar))
    throw new Error("DATABASE_URL must use sqlite file: URL");
  const t = e.slice(ar.length);
  if (!t || t === ":memory:" || t.startsWith(":memory:?"))
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  const r = t.indexOf("?"), n = r >= 0 ? t.slice(0, r) : t, o = r >= 0 ? t.slice(r + 1) : "", s = v(
    tt.isAbsolute(n) ? n : tt.resolve(process.cwd(), n),
    "DATABASE_URL"
  ), a = o.length > 0 ? `file:${s}?${o}` : `file:${s}`;
  return { dbPath: s, datasourceUrl: a };
}, le = async (e, t, r) => await new Promise((n, o) => {
  const s = Rn(e, t, {
    env: r,
    shell: !1,
    windowsHide: !0
  });
  let a = "", c = "";
  s.stdout?.on("data", (d) => {
    a += d.toString();
  }), s.stderr?.on("data", (d) => {
    c += d.toString();
  }), s.on("error", (d) => {
    o(d);
  }), s.on("close", (d) => {
    if (d === 0) {
      n({ stdout: a, stderr: c });
      return;
    }
    const l = new Error(`Prisma command failed with exit code ${d}`);
    l.code = d, l.stdout = a, l.stderr = c, o(l);
  });
}), Zo = () => (process.env.LUIE_PACKAGED_SCHEMA_MODE ?? "").trim().toLowerCase() === "prisma-migrate" ? "prisma-migrate" : "bootstrap";
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
    if (this.dbPath = t.dbPath, N.info("Initializing database", {
      isPackaged: t.isPackaged,
      isTest: t.isTest,
      hasEnvDb: !!process.env.DATABASE_URL,
      userDataPath: m.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await Xo(this.prisma);
      } catch (r) {
        N.error("Failed to seed packaged database", { error: r });
      }
    if (this.prisma.$executeRawUnsafe)
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"), await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"), N.info("SQLite WAL mode enabled");
      } catch (r) {
        N.warn("Failed to enable WAL mode", { error: r });
      }
    N.info("Database service initialized");
  }
  createPrismaClient(t) {
    try {
      const r = Vo(), n = new r({
        url: t.datasourceUrl
      });
      return new sr({
        adapter: n,
        log: ["error", "warn"]
      });
    } catch (r) {
      if (t.isPackaged)
        throw r;
      return N.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: r,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new sr({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = Io(), r = m.getPath("userData"), n = $e(), o = process.env.DATABASE_URL, s = !!o;
    let a, c;
    if (s) {
      const d = Qo(o ?? "");
      a = d.dbPath, c = d.datasourceUrl;
    } else t ? (a = v(tt.join(r, $r), "dbPath"), c = `file:${a}`) : (a = v(tt.join(process.cwd(), "prisma", "dev.db"), "dbPath"), c = `file:${a}`);
    return process.env.DATABASE_URL = c, await Ct.mkdir(r, { recursive: !0 }), await Ct.mkdir(tt.dirname(a), { recursive: !0 }), await yt(a) || await Ct.writeFile(a, ""), {
      dbPath: a,
      datasourceUrl: c,
      isPackaged: t,
      isTest: n
    };
  }
  async applySchema(t) {
    const r = await yt(t.dbPath), n = t.isPackaged ? process.resourcesPath : process.cwd(), o = tt.join(n, "prisma", "schema.prisma"), s = Jo(n), a = tt.join(n, "prisma", "migrations"), c = await yt(a) && await Ct.readdir(a, { withFileTypes: !0 }).then((l) => l.some((i) => i.isDirectory())), d = { ...process.env, DATABASE_URL: t.datasourceUrl };
    if (t.isPackaged) {
      await this.applyPackagedSchema(t, {
        dbExists: r,
        schemaPath: o,
        prismaPath: s,
        hasMigrations: c,
        commandEnv: d
      });
      return;
    }
    if (t.isTest) {
      N.info("Running test database push", {
        dbPath: t.dbPath,
        dbExists: r,
        command: "db push"
      });
      try {
        await le(
          s,
          ["db", "push", "--accept-data-loss", `--schema=${o}`],
          d
        ), N.info("Test database push completed successfully");
      } catch (l) {
        const i = l;
        N.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: l,
          stdout: i.stdout,
          stderr: i.stderr,
          dbPath: t.dbPath
        }), this.ensurePackagedSqliteSchema(t.dbPath);
      }
      return;
    }
    N.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: r,
      hasMigrations: c,
      command: "db push"
    });
    try {
      await le(
        s,
        ["db", "push", "--accept-data-loss", `--schema=${o}`],
        d
      ), N.info("Development database ready");
    } catch (l) {
      const i = l;
      throw N.error("Failed to prepare development database", {
        error: l,
        stdout: i.stdout,
        stderr: i.stderr
      }), l;
    }
  }
  async applyPackagedSchema(t, r) {
    const n = Zo();
    if (n === "bootstrap") {
      N.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: n
      }), this.ensurePackagedSqliteSchema(t.dbPath);
      return;
    }
    const { dbExists: o, schemaPath: s, prismaPath: a, hasMigrations: c, commandEnv: d } = r, l = await yt(s), i = await yt(a);
    if (c && l && i) {
      N.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: o,
        command: "migrate deploy"
      });
      try {
        await le(a, ["migrate", "deploy", `--schema=${s}`], d), N.info("Production migrations applied successfully");
      } catch (u) {
        const S = u;
        N.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: u,
          stdout: S.stdout,
          stderr: S.stderr,
          schemaMode: n
        });
      }
    } else
      N.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
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
    const r = qo(), n = new r(t);
    try {
      n.pragma("foreign_keys = ON");
      const o = Go.filter(
        (c) => !this.sqliteTableExists(n, c)
      );
      n.exec(Yo);
      const s = [];
      for (const c of Ho)
        this.sqliteTableExists(n, c.table) && (this.sqliteTableHasColumn(n, c.table, c.column) || (n.exec(c.sql), s.push(`${c.table}.${c.column}`)));
      const a = [];
      for (const [c, d] of Object.entries(zo))
        for (const l of d)
          this.sqliteTableHasColumn(n, c, l) || a.push(`${c}.${l}`);
      if (a.length > 0)
        throw new Error(`Packaged SQLite schema verification failed: missing ${a.join(", ")}`);
      (o.length > 0 || s.length > 0) && N.info("Packaged SQLite schema bootstrap applied", {
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
      `PRAGMA table_info(${Ko(r)})`
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
      N.error("Database initialization failed before disconnect", { error: t });
    }), this.prisma && (await this.prisma.$disconnect(), this.prisma = null, N.info("Database disconnected"));
  }
}
const P = ft.getInstance(), ts = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  db: P
}, Symbol.toStringTag, { value: "Module" })), Ie = M("BootstrapLifecycle");
let at = { isReady: !1 }, _t = null;
const es = (e) => e instanceof Error && e.message ? e.message : "Failed to initialize database", rs = () => {
  for (const e of G.getAllWindows())
    if (!e.isDestroyed())
      try {
        e.webContents.send(gt.APP_BOOTSTRAP_STATUS_CHANGED, at);
      } catch (t) {
        Ie.warn("Failed to broadcast bootstrap status", t);
      }
}, pe = (e) => {
  at = e, rs();
}, ed = () => at, Yr = async () => at.isReady ? at : _t || (pe({ isReady: !1 }), _t = P.initialize().then(() => (pe({ isReady: !0 }), Ie.info("Bootstrap completed"), at)).catch((e) => {
  const t = es(e);
  return pe({ isReady: !1, error: t }), Ie.error("Bootstrap failed", e), at;
}).finally(() => {
  _t = null;
}), _t), Ft = (e) => {
  if (typeof e != "string") return null;
  const t = e.trim();
  if (!t) return null;
  const n = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return n.length > 0 ? n : null;
}, Xr = (e) => {
  const t = e.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, Pe = (e) => /^https?:\/\//i.test(e), Vr = (e) => {
  try {
    const t = new URL(e);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : Xr(t.toString());
  } catch {
    return null;
  }
}, ns = (e) => {
  let t = e.trim();
  if (!t) return null;
  if (Pe(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, oe = (e) => {
  if (!e) return null;
  const t = Ft(e.url), r = Ft(e.anonKey);
  if (!t || !r) return null;
  const n = Vr(t);
  return n ? {
    url: n,
    anonKey: r
  } : null;
}, qr = (e) => {
  const t = [], r = Ft(e?.url), n = Ft(e?.anonKey);
  r || t.push("SUPABASE_URL_REQUIRED"), n || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let o = null;
  return r && (o = Vr(r), o || t.push("SUPABASE_URL_INVALID")), n && n.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !o || !n ? {
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
}, ot = (e) => Ft(process.env[e]), os = "https://qzgyjlbpnxxpspoyibpt.supabase.co", ss = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", as = () => {
  const e = oe({
    url: os,
    anonKey: ss
  });
  return e ? {
    ...e,
    source: "legacy"
  } : null;
}, is = () => {
  const e = oe({
    url: ot("SUPABASE_URL") ?? ot("SUPADB_URL") ?? void 0,
    anonKey: ot("SUPABASE_ANON_KEY") ?? ot("SUPABASE_PUBLISHABLE_KEY") ?? ot("SUPADATABASE_API") ?? void 0
  });
  return e ? {
    ...e,
    source: "env"
  } : null;
}, Kr = () => {
  const e = g.getRuntimeSupabaseConfig(), t = oe(e);
  return t ? {
    ...t,
    source: "runtime"
  } : null;
}, cs = () => {
  const e = ot("SUPADATABASE_API"), t = ot("SUPADATABASE_PRJ_ID");
  let r = null, n = null;
  if (e && Pe(e))
    r = Xr(e);
  else if (t) {
    const o = ns(t);
    o && (r = `https://${o}.supabase.co`);
  }
  return e && !Pe(e) && (n = e), !r || !n ? null : {
    url: r,
    anonKey: n,
    source: "legacy"
  };
}, Ge = () => is() ?? Kr() ?? cs() ?? as(), lt = () => {
  const e = Ge();
  return e ? {
    url: e.url,
    anonKey: e.anonKey
  } : null;
}, Dt = () => {
  const e = lt();
  if (!e)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return e;
}, Jr = () => Ge()?.source ?? null, ds = () => oe(Kr()) ?? null, ls = (e) => {
  const t = qr(e);
  return !t.valid || !t.normalized || g.setRuntimeSupabaseConfig(t.normalized), t;
}, ps = (e) => qr(e), rd = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: Ge,
  getRuntimeSupabaseConfig: ds,
  getSupabaseConfig: lt,
  getSupabaseConfigOrThrow: Dt,
  getSupabaseConfigSource: Jr,
  setRuntimeSupabaseConfig: ls,
  validateRuntimeSupabaseConfig: ps
}, Symbol.toStringTag, { value: "Module" })), wt = M("SyncAuthService"), us = "https://eluie.kro.kr/auth/callback", Re = "v2:safe:", Ce = "v2:plain:", Vt = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", Qr = (e) => e.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), hs = () => Qr(Dn(48)), Es = (e) => Qr(Ln("sha256").update(e).digest()), $t = () => {
  const e = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return e && e.length > 0 ? e : us;
}, ct = (e, t = "token") => {
  if (z.isEncryptionAvailable()) {
    const n = z.encryptString(e).toString("base64");
    return `${Re}${n}`;
  }
  if (t === "token")
    throw new Error(Vt);
  const r = Buffer.from(e, "utf-8").toString("base64");
  return `${Ce}${r}`;
}, fs = (e, t = "token") => {
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
    throw new Error(Vt);
  const n = r.toString("utf-8");
  return {
    plain: n,
    migratedCipher: ct(n, t)
  };
}, xt = (e, t = "token") => {
  if (e.startsWith(Re)) {
    if (!z.isEncryptionAvailable())
      throw new Error(Vt);
    const r = e.slice(Re.length), n = Buffer.from(r, "base64");
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
  if (e.startsWith(Ce)) {
    if (t === "token" && !z.isEncryptionAvailable())
      throw new Error(Vt);
    const r = e.slice(Ce.length), o = Buffer.from(r, "base64").toString("utf-8"), s = z.isEncryptionAvailable() ? ct(o, t) : void 0;
    return {
      plain: o,
      migratedCipher: s
    };
  }
  return fs(e, t);
};
class As {
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
      const n = xt(t.pendingAuthVerifierCipher, "pending");
      return n.migratedCipher && g.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: n.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: n.plain,
        createdAt: r,
        redirectUri: t.pendingAuthRedirectUri || $t()
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
        this.pendingPkce.redirectUri = r || $t();
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
      const c = Date.now() - t.createdAt;
      throw wt.info("OAuth flow already in progress", { ageMs: c }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: r } = Dt(), n = hs(), o = Es(n), s = $t();
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
    }), await yn.openExternal(a.toString());
  }
  async completeOAuthCallback(t) {
    const r = this.getPendingPkce();
    if (!r)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - r.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const n = new URL(t), o = n.searchParams, s = n.hash.startsWith("#") ? n.hash.slice(1) : n.hash, a = new URLSearchParams(s), c = (h) => o.get(h) ?? a.get(h), d = c("state"), l = c("code"), i = c("error"), u = c("error_code"), S = c("error_description");
    if (i) {
      this.clearPendingPkce();
      const h = u ?? i, f = S ?? i;
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
      r.redirectUri || $t()
    );
    return this.clearPendingPkce(), I;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const r = xt(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(r);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const r = xt(t.accessTokenCipher);
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
      const r = xt(t.refreshTokenCipher);
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
    const { url: o, anonKey: s } = Dt(), a = new URL("/auth/v1/token", o);
    a.searchParams.set("grant_type", "pkce");
    const c = await fetch(a, {
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
    if (!c.ok) {
      const l = await c.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${c.status}:${l}`);
    }
    const d = await c.json();
    return this.toSyncSession(d);
  }
  async exchangeRefreshToken(t) {
    const { url: r, anonKey: n } = Dt(), o = new URL("/auth/v1/token", r);
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
      const c = await s.text();
      throw new Error(`SYNC_AUTH_REFRESH_FAILED:${s.status}:${c}`);
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
const B = new As(), gs = M("StartupReadinessService"), ue = "startup:wizard-completed", Zr = () => (/* @__PURE__ */ new Date()).toISOString(), C = (e, t, r, n = !0) => ({
  key: e,
  ok: t,
  blocking: n,
  detail: r,
  checkedAt: Zr()
});
class Ts {
  events = new Nn();
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
    g.setStartupCompletedAt(Zr());
    const r = await this.getReadiness();
    return this.events.emit(ue, r), r;
  }
  onWizardCompleted(t) {
    return this.events.on(ue, t), () => {
      this.events.off(ue, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = z.isEncryptionAvailable();
      return C(
        "osPermission",
        t,
        t ? "safeStorage available" : "safeStorage encryption is unavailable on this OS session"
      );
    } catch (t) {
      return C("osPermission", !1, this.toErrorMessage(t));
    }
  }
  async checkDataDirRW() {
    const t = m.getPath("userData"), r = j.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await Xe(t, { recursive: !0 }), await Ve(r, "ok", { encoding: "utf8" }), C("dataDirRW", !0, t);
    } catch (n) {
      return C(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(n)}`
      );
    } finally {
      await qe(r).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = m.getPath("documents"), r = j.join(t, Gr), n = j.join(r, ".startup-probe");
    try {
      return await Xe(r, { recursive: !0 }), await br(r, Se.R_OK | Se.W_OK), await Ve(n, "ok", { encoding: "utf8" }), C("defaultLuiePath", !0, r);
    } catch (o) {
      return C(
        "defaultLuiePath",
        !1,
        `${r}: ${this.toErrorMessage(o)}`
      );
    } finally {
      await qe(n).catch(() => {
      });
    }
  }
  async checkSqliteConnect() {
    try {
      return await P.initialize(), P.getClient(), C("sqliteConnect", !0, "SQLite connection ready");
    } catch (t) {
      return C("sqliteConnect", !1, this.toErrorMessage(t));
    }
  }
  async checkSqliteWal() {
    try {
      return await P.initialize(), C("sqliteWal", !0, "WAL mode enforced during DB initialization");
    } catch (t) {
      return C("sqliteWal", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseRuntimeConfig() {
    try {
      const t = lt(), r = Jr();
      return t ? C(
        "supabaseRuntimeConfig",
        !0,
        r ? `resolved from ${r}` : "resolved"
      ) : C(
        "supabaseRuntimeConfig",
        !1,
        "Runtime Supabase configuration is not completed"
      );
    } catch (t) {
      return C("supabaseRuntimeConfig", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseSession() {
    try {
      const t = g.getSyncSettings();
      if (!t.connected || !t.userId)
        return C(
          "supabaseSession",
          !1,
          "Sync login is not connected yet (non-blocking)",
          !1
        );
      const r = B.getAccessToken(t), n = B.getRefreshToken(t);
      if (!(!!r.token || !!n.token))
        return C(
          "supabaseSession",
          !1,
          r.errorCode ?? n.errorCode ?? "No usable JWT token",
          !1
        );
      if (!r.token)
        return C(
          "supabaseSession",
          !1,
          "Access token is unavailable. Reconnect sync login.",
          !1
        );
      const s = lt();
      if (!s)
        return C(
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
        return C(
          "supabaseSession",
          !1,
          `Edge auth health check failed (${a.status})`,
          !1
        );
      let c = null;
      try {
        c = await a.json();
      } catch {
        c = null;
      }
      return c?.ok ? C(
        "supabaseSession",
        !0,
        c.userId ?? t.email ?? t.userId,
        !1
      ) : C(
        "supabaseSession",
        !1,
        "Edge auth health response is invalid",
        !1
      );
    } catch (t) {
      return gs.warn("Startup session check failed", { error: t }), C("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const he = new Ts(), ir = 1500, Ss = 8e3, ms = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), ys = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), _s = (e) => e ? process.env.LUIE_DEV_CSP === "1" ? ys() : null : ms(), ws = (e) => e.startsWith("file://"), Is = async (e, t, r) => {
  e.error("Renderer process crashed", {
    killed: r,
    webContentsId: t.id
  });
  try {
    const { autoSaveManager: o } = await import("./autoSaveManager-Peec-Kx6.js").then((s) => s.d);
    await o.flushCritical(), e.info("Emergency save completed after crash");
  } catch (o) {
    e.error("Failed to save during crash recovery", o);
  }
  const n = U.getMainWindow();
  n && !n.isDestroyed() && ((await Te.showMessageBox(n, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (U.closeMainWindow(), setTimeout(() => {
    U.createMainWindow();
  }, 500)) : m.quit());
}, Ps = async (e) => {
  const t = Date.now(), r = await Yr();
  if (!r.isReady) {
    e.error("App bootstrap did not complete", r);
    return;
  }
  try {
    const { autoSaveManager: n } = await import("./autoSaveManager-Peec-Kx6.js").then((s) => s.d);
    await n.flushMirrorsToSnapshots("startup-recovery");
    const { snapshotService: o } = await import("./snapshotService--MrFU9a2.js").then((s) => s.a);
    o.pruneSnapshotsAllProjects(), o.cleanupOrphanArtifacts("startup");
  } catch (n) {
    e.warn("Snapshot recovery/pruning skipped", n);
  }
  try {
    const { projectService: n } = await Promise.resolve().then(() => An);
    await n.reconcileProjectPathDuplicates();
  } catch (n) {
    e.warn("Project path duplicate reconciliation skipped", n);
  }
  try {
    const { entityRelationService: n } = await import("./entityRelationService-CkAl1PzR.js");
    await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !0 }), await n.cleanupOrphanRelationsAcrossProjects({ dryRun: !1 });
  } catch (n) {
    e.warn("Entity relation orphan cleanup skipped", n);
  }
  e.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - t
  });
}, Rs = (e, t = {}) => {
  const r = t.startupStartedAtMs ?? Date.now();
  m.whenReady().then(async () => {
    e.info("App is ready", {
      startupElapsedMs: Date.now() - r
    });
    const n = wo(), o = _s(n);
    let s = !1, a = !1, c = !1, d = null;
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
    }, i = (f) => {
      a || (a = !0, e.info("Deferred startup maintenance scheduled", {
        reason: f,
        delayMs: ir
      }), setTimeout(() => {
        Ps(e);
      }, ir));
    }, u = (f) => {
      if (c) return;
      c = !0, e.info("Starting main window flow", {
        reason: f,
        startupElapsedMs: Date.now() - r
      }), U.createMainWindow({ deferShow: !0 }), e.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - r
      });
      const A = Date.now();
      Yr().then((T) => {
        e.info("Startup checkpoint: bootstrap ready", {
          isReady: T.isReady,
          bootstrapElapsedMs: Date.now() - A,
          startupElapsedMs: Date.now() - r
        }), T.isReady || e.error("App bootstrap did not complete", T);
      }).catch((T) => {
        e.error("App bootstrap did not complete", T);
      }), d && clearTimeout(d), d = setTimeout(() => {
        s || l("fallback-timeout"), i("fallback-timeout");
      }, Ss);
    };
    n && ze.defaultSession.webRequest.onBeforeSendHeaders((f, A) => {
      A({
        requestHeaders: {
          ...f.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), ze.defaultSession.webRequest.onHeadersReceived((f, A) => {
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
      ]), o && !ws(f.url) && (T["Content-Security-Policy"] = [o]), A({ responseHeaders: T });
    }), m.on("web-contents-created", (f, A) => {
      A.on(
        "did-fail-load",
        (T, b, pt, mt, E) => {
          e.error("Renderer failed to load", {
            errorCode: b,
            errorDescription: pt,
            validatedURL: mt,
            isMainFrame: E,
            startupElapsedMs: Date.now() - r
          });
        }
      ), A.on("did-finish-load", () => {
        const T = Date.now() - r;
        e.info("Renderer finished load", {
          url: A.getURL(),
          startupElapsedMs: T
        }), A.getType() === "window" && U.isMainWindowWebContentsId(A.id) && (l("did-finish-load"), i("did-finish-load"));
      }), A.on("console-message", (T) => {
        const { level: b, message: pt, lineNumber: mt, sourceId: E } = T;
        (b === "error" ? 3 : b === "warning" ? 2 : b === "info" ? 1 : 0) < 2 || e.warn("Renderer console message", {
          level: b,
          message: pt,
          line: mt,
          sourceId: E
        });
      }), A.on("render-process-gone", (T, b) => {
        Is(e, A, b.reason === "killed");
      });
    });
    const S = Date.now(), { registerIPCHandlers: I } = await import("./index-DWvJDrmq.js");
    I(), e.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - S,
      startupElapsedMs: Date.now() - r
    }), ko(g.getMenuBarMode());
    const h = await he.getReadiness();
    e.info("Startup readiness evaluated", {
      mustRunWizard: h.mustRunWizard,
      reasons: h.reasons,
      completedAt: h.completedAt
    }), h.mustRunWizard ? (U.createStartupWizardWindow(), e.info("Startup wizard requested before main window", {
      reasons: h.reasons
    })) : u("readiness-pass"), he.onWizardCompleted((f) => {
      e.info("Startup wizard completion received", {
        mustRunWizard: f.mustRunWizard,
        reasons: f.reasons
      }), !f.mustRunWizard && (U.closeStartupWizardWindow(), u("wizard-complete"));
    }), m.on("activate", () => {
      G.getAllWindows().length === 0 && he.getReadiness().then((f) => {
        if (f.mustRunWizard) {
          U.createStartupWizardWindow();
          return;
        }
        u("activate");
      });
    });
  });
}, Cs = "crash-reports", cr = 100;
let dr = !1;
const Ee = (e) => e.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), Ne = (e, t = 0) => {
  if (e == null) return e;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof e == "string" || typeof e == "number" || typeof e == "boolean")
    return typeof e == "string" ? Ee(e) : e;
  if (typeof e == "bigint" || typeof e == "symbol") return e.toString();
  if (typeof e == "function") return "[Function]";
  if (e instanceof Error)
    return {
      name: e.name,
      message: Ee(e.message),
      stack: e.stack ? Ee(e.stack) : void 0
    };
  if (Array.isArray(e))
    return e.slice(0, 50).map((r) => Ne(r, t + 1));
  if (typeof e == "object") {
    const n = Object.entries(e).slice(0, 100), o = {};
    for (const [s, a] of n)
      o[s] = Ne(a, t + 1);
    return o;
  }
  return String(e);
}, Ns = () => j.join(m.getPath("userData"), Cs), Ds = async (e, t) => {
  const r = await At.readdir(e, { withFileTypes: !0 }), n = await Promise.all(
    r.filter((s) => s.isFile() && s.name.endsWith(".json")).map(async (s) => {
      const a = j.join(e, s.name), c = await At.stat(a);
      return { fullPath: a, mtimeMs: c.mtimeMs };
    })
  );
  if (n.length <= cr) return;
  n.sort((s, a) => a.mtimeMs - s.mtimeMs);
  const o = n.slice(cr);
  await Promise.all(
    o.map(async (s) => {
      try {
        await At.rm(s.fullPath, { force: !0 });
      } catch (a) {
        t.warn("Failed to remove stale crash report", { error: a, path: s.fullPath });
      }
    })
  );
}, Ls = async (e, t, r) => {
  const n = Ns();
  await At.mkdir(n, { recursive: !0 });
  const o = (/* @__PURE__ */ new Date()).toISOString(), s = V(), a = `${o.replace(/[:.]/g, "-")}-${t}-${s}.json`, c = j.join(n, a), d = `${c}.tmp`, l = {
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
    payload: Ne(r)
  };
  await At.writeFile(d, JSON.stringify(l, null, 2), "utf-8"), await At.rename(d, c), await Ds(n, e);
}, Os = (e, t) => {
  const r = t ?? {}, n = e ?? {};
  return {
    webContentsId: typeof n.id == "number" ? n.id : void 0,
    reason: r.reason,
    exitCode: r.exitCode
  };
}, js = (e) => {
  const t = e ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, bs = (e) => {
  if (dr) return;
  dr = !0;
  const t = (r, n) => {
    Ls(e, r, n).catch((o) => {
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
    t("render-process-gone", Os(n, o));
  }), m.on("child-process-gone", (r, n) => {
    t("child-process-gone", js(n));
  });
}, tn = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), Fs = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), L = (e) => !!(e && typeof e == "object" && !Array.isArray(e)), en = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, Us = (e) => {
  if (L(e))
    return typeof e.updatedAt == "string" ? e.updatedAt : void 0;
}, vs = (e, t = "pen") => typeof e == "string" && Fs.has(e) ? e : t, Ms = (e, t = "mountain") => typeof e == "string" && tn.has(e) ? e : t, rn = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!L(n)) continue;
    const o = n.type;
    if (o !== "path" && o !== "text" && o !== "icon") continue;
    const s = {
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `path-${r}`,
      type: o,
      color: typeof n.color == "string" ? n.color : "#000000"
    };
    typeof n.d == "string" && (s.d = n.d), typeof n.width == "number" && (s.width = n.width), typeof n.x == "number" && (s.x = n.x), typeof n.y == "number" && (s.y = n.y), typeof n.text == "string" && (s.text = n.text), typeof n.icon == "string" && tn.has(n.icon) && (s.icon = n.icon), t.push(s);
  }
  return t;
}, nn = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!L(n)) continue;
    const o = n.position;
    if (!L(o)) continue;
    const s = L(n.data) ? n.data : void 0;
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
}, on = (e) => {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const [r, n] of e.entries()) {
    if (!L(n)) continue;
    const o = typeof n.source == "string" ? n.source : "", s = typeof n.target == "string" ? n.target : "";
    !o || !s || t.push({
      id: typeof n.id == "string" && n.id.length > 0 ? n.id : `edge-${r}`,
      source: o,
      target: s,
      type: typeof n.type == "string" ? n.type : void 0
    });
  }
  return t;
}, Ws = (e, t, r) => L(e) ? {
  id: typeof e.id == "string" && e.id.length > 0 ? e.id : `memo-${t}`,
  title: typeof e.title == "string" ? e.title : "",
  content: typeof e.content == "string" ? e.content : "",
  tags: Array.isArray(e.tags) ? e.tags.filter((n) => typeof n == "string") : [],
  updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : r()
} : null, sn = (e, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(e) ? e.map((r, n) => Ws(r, n, t)).filter((r) => r !== null) : [], an = (e, t = () => (/* @__PURE__ */ new Date()).toISOString()) => L(e) ? {
  memos: sn(e.memos, t),
  updatedAt: typeof e.updatedAt == "string" ? e.updatedAt : void 0
} : { memos: [] }, qt = 5 * 1024 * 1024, Ut = (e) => X.posix.normalize(e.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), Kt = (e) => {
  const t = Ut(e);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !X.isAbsolute(t);
}, Mt = (e) => e.toLowerCase().endsWith(x) ? e : `${e}${x}`, lr = (e) => process.platform === "win32" ? e.toLowerCase() : e, ks = (e, t) => {
  const r = lr(X.resolve(e)), n = lr(X.resolve(t));
  return r === n || r.startsWith(`${n}${X.sep}`);
}, cn = async (e, t, r) => {
  const n = Ut(t);
  if (!n || !Kt(n))
    throw new Error("INVALID_RELATIVE_PATH");
  let o = !1, s = null;
  return await new Promise((a, c) => {
    On.open(e, { lazyEntries: !0 }, (d, l) => {
      if (d || !l) {
        c(d ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      l.on("entry", (i) => {
        const u = Ut(i.fileName);
        if (!u || !Kt(u)) {
          r?.error("Unsafe zip entry skipped", { entry: i.fileName, zipPath: e }), l.readEntry();
          return;
        }
        if (u !== n) {
          l.readEntry();
          return;
        }
        if (i.fileName.endsWith("/")) {
          o = !0, s = null, l.close(), a();
          return;
        }
        l.openReadStream(i, (S, I) => {
          if (S || !I) {
            c(S ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          o = !0;
          const h = [], f = I;
          let A = 0;
          f.on("data", (T) => {
            if (A += T.length, A > qt) {
              f.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${u}:${qt}`
                )
              );
              return;
            }
            h.push(T);
          }), f.on("end", () => {
            s = Buffer.concat(h).toString("utf-8"), l.close(), a();
          }), f.on("error", c);
        });
      }), l.on("end", () => {
        o || a();
      }), l.on("error", c), l.readEntry();
    });
  }), s;
}, H = async (e, t, r) => {
  const n = Mt(e), o = Ut(t);
  if (!o || !Kt(o))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const s = await k.stat(n);
    if (s.isDirectory()) {
      const a = await k.realpath(n), c = X.resolve(n, o);
      try {
        const d = await k.realpath(c);
        if (!ks(d, a))
          throw new Error("INVALID_RELATIVE_PATH");
        const l = await k.stat(d);
        if (l.isDirectory())
          return null;
        if (l.size > qt)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${o}:${qt}`
          );
        return await k.readFile(d, "utf-8");
      } catch (d) {
        if (d?.code === "ENOENT") return null;
        throw d;
      }
    }
    if (s.isFile())
      return await cn(n, o, r);
  } catch (s) {
    if (s?.code === "ENOENT") return null;
    throw s;
  }
  return null;
}, dn = () => ({
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
}, pr = (e, t, r, n) => {
  const o = e?.[t];
  if (!o) return 0;
  const s = r === "chapter" ? o.chapter : o.memo;
  return Y(s[n]);
}, se = (e, t) => Y(e.updatedAt) >= Y(t.updatedAt) ? [e, t] : [t, e], It = (e, t) => {
  const r = /* @__PURE__ */ new Map();
  for (const n of e)
    r.set(n.id, n);
  for (const n of t) {
    const o = r.get(n.id);
    if (!o) {
      r.set(n.id, n);
      continue;
    }
    const [s] = se(o, n);
    r.set(n.id, s);
  }
  return Array.from(r.values());
}, Bs = (e, t) => {
  const r = /* @__PURE__ */ new Map();
  for (const n of e)
    r.set(`${n.projectId}:${n.docType}`, n);
  for (const n of t) {
    const o = `${n.projectId}:${n.docType}`, s = r.get(o);
    if (!s) {
      r.set(o, n);
      continue;
    }
    const [a] = se(s, n);
    r.set(o, a);
  }
  return Array.from(r.values());
}, ur = (e, t, r, n, o, s) => {
  const a = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
  let d = 0;
  const l = [];
  for (const i of t)
    c.set(i.id, i);
  for (const i of e)
    a.set(i.id, i);
  for (const i of t) {
    const u = a.get(i.id);
    if (!u) {
      a.set(i.id, i);
      continue;
    }
    let [S, I] = se(u, i);
    if (u.content !== i.content && (o ? o(u, i) : !0)) {
      const f = `${r}:${u.id}`, A = s?.[f];
      if (A === "local")
        S = u, I = i;
      else if (A === "remote")
        S = i, I = u;
      else {
        d += 1, l.push({
          type: r,
          id: u.id,
          projectId: u.projectId,
          title: u.title,
          localUpdatedAt: u.updatedAt,
          remoteUpdatedAt: i.updatedAt,
          localPreview: u.content.slice(0, 400),
          remotePreview: i.content.slice(0, 400)
        });
        const T = n(I);
        a.set(T.id, T);
      }
    }
    a.set(i.id, S);
  }
  for (const [i, u] of c.entries())
    a.has(i) || a.set(i, u);
  return {
    merged: Array.from(a.values()),
    conflicts: d,
    conflictItems: l
  };
}, $s = (e, t, r) => {
  const n = e + t;
  return {
    chapters: e,
    memos: t,
    total: n,
    items: r.length > 0 ? r : void 0
  };
}, xs = (e) => {
  const t = /* @__PURE__ */ new Map();
  for (const a of e.tombstones) {
    const c = `${a.entityType}:${a.entityId}`, d = t.get(c);
    if (!d) {
      t.set(c, a);
      continue;
    }
    const [l] = se(d, a);
    t.set(c, l);
  }
  const r = /* @__PURE__ */ new Set();
  for (const a of e.projects)
    a.deletedAt && r.add(a.id);
  for (const a of t.values())
    a.entityType === "project" && (r.add(a.entityId), r.add(a.projectId));
  const n = (a) => r.has(a), o = (a) => {
    const c = t.get(`chapter:${a.id}`);
    if (!c) return a;
    const d = c.deletedAt, l = Y(c.updatedAt) > Y(a.updatedAt) ? c.updatedAt : a.updatedAt;
    return {
      ...a,
      deletedAt: d,
      updatedAt: l
    };
  }, s = (a, c) => c.filter((d) => !t.has(`${a}:${d.id}`));
  return {
    ...e,
    projects: s(
      "project",
      e.projects.filter((a) => !n(a.id))
    ),
    chapters: e.chapters.filter((a) => !n(a.projectId)).map(o),
    characters: s(
      "character",
      e.characters.filter((a) => !n(a.projectId))
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
      e.snapshots.filter((a) => !n(a.projectId))
    )
  };
}, Gs = (e, t, r) => {
  const n = new Set(
    [...e.tombstones, ...t.tombstones].map(
      (l) => `${l.entityType}:${l.entityId}`
    )
  ), o = r?.baselinesByProjectId, s = ur(
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
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`chapter:${l.id}`) && !n.has(`chapter:${i.id}`) && (() => {
      const u = pr(
        o,
        l.projectId,
        "chapter",
        l.id
      );
      return u <= 0 ? !1 : Y(l.updatedAt) > u && Y(i.updatedAt) > u;
    })(),
    r?.conflictResolutions
  ), a = ur(
    e.memos,
    t.memos,
    "memo",
    (l) => ({
      ...l,
      id: V(),
      title: `${l.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (l, i) => l.projectId === i.projectId && !l.deletedAt && !i.deletedAt && !n.has(`memo:${l.id}`) && !n.has(`memo:${i.id}`) && (() => {
      const u = pr(
        o,
        l.projectId,
        "memo",
        l.id
      );
      return u <= 0 ? !1 : Y(l.updatedAt) > u && Y(i.updatedAt) > u;
    })(),
    r?.conflictResolutions
  ), c = [
    ...s.conflictItems,
    ...a.conflictItems
  ], d = {
    projects: It(e.projects, t.projects),
    chapters: s.merged,
    characters: It(e.characters, t.characters),
    terms: It(e.terms, t.terms),
    worldDocuments: Bs(e.worldDocuments, t.worldDocuments),
    memos: a.merged,
    snapshots: It(e.snapshots, t.snapshots),
    tombstones: It(e.tombstones, t.tombstones)
  };
  return {
    merged: xs(d),
    conflicts: $s(
      s.conflicts,
      a.conflicts,
      c
    )
  };
}, Hs = [
  { docType: "synopsis", fileName: vt },
  { docType: "plot", fileName: Zt },
  { docType: "drawing", fileName: te },
  { docType: "mindmap", fileName: ee },
  { docType: "graph", fileName: re }
], zs = {
  synopsis: vt,
  plot: Zt,
  drawing: te,
  mindmap: ee,
  graph: re,
  scrap: Be
}, Ys = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], rt = (e, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof e == "string" && e.length > 0 ? e : e instanceof Date ? e.toISOString() : t, D = (e) => typeof e == "string" ? e : null, De = (e, t = 0) => typeof e == "number" && Number.isFinite(e) ? e : t, Xs = (e, t, r) => {
  const n = D(r.id);
  if (!n) return null;
  const o = rt(r.updatedAt);
  return e.projects.push({
    id: n,
    userId: t,
    title: D(r.title) ?? "Untitled",
    description: D(r.description),
    createdAt: rt(r.createdAt),
    updatedAt: o
  }), {
    projectId: n,
    projectPath: D(r.projectPath),
    projectUpdatedAt: o
  };
}, Vs = (e, t, r, n) => {
  for (const o of n) {
    const s = D(o.id);
    if (!s) continue;
    const a = D(o.deletedAt);
    e.chapters.push({
      id: s,
      userId: t,
      projectId: r,
      title: D(o.title) ?? "Untitled",
      content: D(o.content) ?? "",
      synopsis: D(o.synopsis),
      order: De(o.order),
      wordCount: De(o.wordCount),
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
}, qs = (e, t, r, n) => {
  for (const o of n) {
    const s = D(o.id);
    s && e.characters.push({
      id: s,
      userId: t,
      projectId: r,
      name: D(o.name) ?? "Character",
      description: D(o.description),
      firstAppearance: D(o.firstAppearance),
      attributes: D(o.attributes),
      createdAt: rt(o.createdAt),
      updatedAt: rt(o.updatedAt)
    });
  }
}, Ks = (e, t, r, n) => {
  for (const o of n) {
    const s = D(o.id);
    s && e.terms.push({
      id: s,
      userId: t,
      projectId: r,
      term: D(o.term) ?? "Term",
      definition: D(o.definition),
      category: D(o.category),
      order: De(o.order),
      firstAppearance: D(o.firstAppearance),
      createdAt: rt(o.createdAt),
      updatedAt: rt(o.updatedAt)
    });
  }
}, Js = (e, t, r) => {
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
}, hr = (e, t, r, n, o, s) => {
  e.worldDocuments.push({
    id: `${r}:${n}`,
    userId: t,
    projectId: r,
    docType: n,
    payload: o,
    updatedAt: Us(o) ?? s
  });
}, Le = async (e, t, r) => {
  const n = zs[t], o = `${F}/${n}`;
  let s = null;
  try {
    s = await H(e, o, r);
  } catch (c) {
    return r.warn("Failed to read .luie world document for sync; skipping doc", {
      projectPath: e,
      entryPath: o,
      docType: t,
      error: c
    }), null;
  }
  if (s === null)
    return null;
  const a = en(s);
  return a === null ? (r.warn("Failed to parse .luie world document for sync; skipping doc", {
    projectPath: e,
    entryPath: o,
    docType: t
  }), null) : a;
}, Qs = (e, t, r, n, o) => {
  const s = an(n);
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
}, Zs = async (e) => {
  for (const r of Hs) {
    const n = await Le(
      e.projectPath,
      r.docType,
      e.logger
    );
    n && hr(
      e.bundle,
      e.userId,
      e.projectId,
      r.docType,
      n,
      e.updatedAtFallback
    );
  }
  const t = await Le(
    e.projectPath,
    "scrap",
    e.logger
  );
  L(t) && (hr(
    e.bundle,
    e.userId,
    e.projectId,
    "scrap",
    t,
    e.updatedAtFallback
  ), Qs(
    e.bundle,
    e.userId,
    e.projectId,
    t,
    e.updatedAtFallback
  ));
}, ta = async (e, t, r, n) => {
  const o = Xs(e, t, r);
  if (!o) return;
  const { projectId: s, projectPath: a, projectUpdatedAt: c } = o;
  if (Vs(
    e,
    t,
    s,
    Array.isArray(r.chapters) ? r.chapters : []
  ), qs(
    e,
    t,
    s,
    Array.isArray(r.characters) ? r.characters : []
  ), Ks(
    e,
    t,
    s,
    Array.isArray(r.terms) ? r.terms : []
  ), a && a.toLowerCase().endsWith(x))
    try {
      const d = v(a, "projectPath");
      await Zs({
        bundle: e,
        userId: t,
        projectId: s,
        projectPath: d,
        updatedAtFallback: c,
        logger: n
      });
    } catch (d) {
      n.warn("Skipping sync world document read for invalid projectPath", {
        projectId: s,
        projectPath: a,
        error: d
      });
    }
}, ea = async (e) => {
  const t = dn();
  for (const r of e.projectRows)
    await ta(t, e.userId, r, e.logger);
  return Js(
    t,
    e.userId,
    e.pendingProjectDeletes
  ), t;
}, Er = async (e, t, r) => {
  const n = Ys.filter((o) => !e.has(o));
  n.length !== 0 && await Promise.all(
    n.map(async (o) => {
      const s = await Le(t, o, r);
      s !== null && e.set(o, s);
    })
  );
}, fr = (e) => {
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
}, ra = (e, t) => {
  const r = { ...e ?? {} };
  for (const n of t.items ?? [])
    r[n.projectId] = {
      state: "pending",
      lastSyncedAt: r[n.projectId]?.lastSyncedAt,
      reason: "SYNC_CONFLICT_DETECTED"
    };
  return Object.keys(r).length > 0 ? r : void 0;
}, ln = (e, t) => {
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
}, na = (e, t, r, n) => {
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
}, oa = (e) => {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.projects)
    r.deletedAt && t.add(r.id);
  for (const r of e.tombstones)
    r.entityType === "project" && (t.add(r.entityId), t.add(r.projectId));
  return t;
}, Ar = (e, t) => {
  for (const r of t)
    delete e[r];
}, sa = (e, t, r, n) => {
  const o = /* @__PURE__ */ new Set();
  for (const s of t.projects)
    s.deletedAt || r.has(s.id) || (o.add(s.id), e[s.id] = {
      chapter: {},
      memo: {},
      capturedAt: n
    });
  return o;
}, aa = (e, t, r, n, o) => {
  for (const s of t.chapters) {
    if (s.deletedAt || r.has(s.projectId) || !n.has(s.projectId)) continue;
    const a = e[s.projectId];
    a && (a.chapter[s.id] = s.updatedAt, a.capturedAt = o);
  }
}, ia = (e, t, r, n, o) => {
  for (const s of t.memos) {
    if (s.deletedAt || r.has(s.projectId) || !n.has(s.projectId)) continue;
    const a = e[s.projectId];
    a && (a.memo[s.id] = s.updatedAt, a.capturedAt = o);
  }
}, ca = (e, t, r, n) => {
  const o = {
    ...e.entityBaselinesByProjectId ?? {}
  };
  Ar(o, n);
  const s = oa(t);
  Ar(o, Array.from(s));
  const a = sa(
    o,
    t,
    s,
    r
  );
  return aa(o, t, s, a, r), ia(o, t, s, a, r), Object.keys(o).length > 0 ? o : void 0;
}, da = async (e) => {
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
    const a = await B.refreshSession(e.syncSettings), c = g.setSyncSettings({
      provider: a.provider,
      userId: a.userId,
      email: a.email,
      expiresAt: a.expiresAt,
      accessTokenCipher: a.accessTokenCipher,
      refreshTokenCipher: a.refreshTokenCipher
    }), d = B.getAccessToken(c);
    if (d.errorCode && e.isAuthFatalMessage(d.errorCode))
      throw new Error(d.errorCode);
    t(d.migratedCipher), o = d.token;
  }
  if (!o)
    throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  return o;
}, la = (e) => {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.projects)
    r.deletedAt && t.add(r.id);
  for (const r of e.tombstones)
    r.entityType === "project" && (t.add(r.entityId), t.add(r.projectId));
  return t;
}, pa = async (e, t) => {
  for (const r of t)
    (await e.project.findUnique({
      where: { id: r },
      select: { id: !0 }
    }))?.id && await e.project.delete({ where: { id: r } });
}, ua = async (e, t, r) => {
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
            autoSaveInterval: ke
          }
        }
      }
    });
  }
}, ha = async (e, t) => {
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
}, Ea = async (e, t, r) => {
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
}, fa = async (e, t, r) => {
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
}, Aa = async (e, t, r) => {
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
}, pn = (e) => {
  if (typeof e == "number") return e === jt;
  if (typeof e == "string" && e.trim().length > 0) {
    const t = Number(e);
    return Number.isFinite(t) && t === jt;
  }
  return !1;
}, ga = (e) => {
  try {
    const t = JSON.parse(e);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, Ta = (e) => e && typeof e == "object" && !Array.isArray(e) ? e : {}, Sa = (e, t) => {
  if (e.format !== Lt)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: e.format }
    );
  if (e.container !== Ot)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: e.container }
    );
  if (!pn(e.version))
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: e.version }
    );
}, ma = (e, t) => {
  const r = Ta(e), n = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), o = t.createdAtFallback ?? n;
  if (Object.prototype.hasOwnProperty.call(r, "format") && r.format !== Lt)
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: r.format }
    );
  if (Object.prototype.hasOwnProperty.call(r, "container") && r.container !== Ot)
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: r.container }
    );
  if (Object.prototype.hasOwnProperty.call(r, "version") && !pn(r.version))
    throw new _(
      w.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: r.version }
    );
  const s = typeof r.title == "string" && r.title.trim().length > 0 ? r.title : t.titleFallback, a = typeof r.createdAt == "string" && r.createdAt.length > 0 ? r.createdAt : o, c = typeof r.updatedAt == "string" && r.updatedAt.length > 0 ? r.updatedAt : n;
  return {
    ...r,
    format: Lt,
    container: Ot,
    version: jt,
    title: s,
    createdAt: a,
    updatedAt: c
  };
}, ya = async (e, t) => {
  const r = await cn(e, Qt, t);
  if (!r)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: e }
    );
  const n = ga(r);
  if (!n)
    throw new _(
      w.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: e }
    );
  Sa(n, { source: e });
}, _a = ".tmp", Gt = /* @__PURE__ */ new Map(), wa = async (e) => {
  const t = X.dirname(e);
  await k.mkdir(t, { recursive: !0 });
}, nd = async (e) => {
  try {
    return await k.access(e), !0;
  } catch {
    return !1;
  }
}, Ia = async (e, t) => {
  const r = X.resolve(Mt(e)), o = (Gt.get(r) ?? Promise.resolve()).catch(() => {
  }).then(t), s = o.then(
    () => {
    },
    () => {
    }
  );
  Gt.set(r, s);
  try {
    return await o;
  } finally {
    Gt.get(r) === s && Gt.delete(r);
  }
}, Pa = async (e, t) => {
  const r = new jn.ZipFile(), n = wn.createWriteStream(e), o = new Promise((s, a) => {
    n.on("close", () => s()), n.on("error", a), r.outputStream.on("error", a);
  });
  r.outputStream.pipe(n), await t(r), r.end(), await o;
}, Ra = async (e, t, r) => {
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
}, Ca = () => [
  { name: `${Tt}/`, isDirectory: !0 },
  { name: `${F}/`, isDirectory: !0 },
  { name: `${bt}/`, isDirectory: !0 },
  { name: `${So}/`, isDirectory: !0 }
], od = (e) => ({
  name: Qt,
  content: JSON.stringify(e ?? {}, null, 2)
}), Na = async (e, t) => {
  for (const r of t) {
    const n = Ut(r.name);
    if (!n || !Kt(n))
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
}, un = async (e, t, r) => {
  const n = Mt(e);
  return await Ia(n, async () => {
    await wa(n);
    const o = (/* @__PURE__ */ new Date()).toISOString(), s = ma(t.meta, {
      titleFallback: X.basename(n, x),
      nowIso: o,
      createdAtFallback: o
    }), a = `${n}${_a}-${Date.now()}`, c = [
      ...Ca(),
      {
        name: Qt,
        content: JSON.stringify(s, null, 2)
      },
      {
        name: `${F}/${Hr}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${F}/${zr}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${F}/${vt}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${F}/${Zt}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${F}/${te}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${F}/${ee}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${F}/${Be}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${F}/${re}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${bt}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const d of t.chapters ?? [])
      d.id && c.push({
        name: `${Tt}/${d.id}${ne}`,
        content: d.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const d of t.snapshots)
        d.id && c.push({
          name: `${bt}/${d.id}.snap`,
          content: JSON.stringify(d, null, 2)
        });
    await Pa(a, (d) => Na(d, c)), await ya(a, r), await Ra(a, n, r);
  });
}, Da = () => ({
  timer: null,
  inFlight: null,
  dirty: !1
});
class La {
  constructor(t, r, n) {
    this.debounceMs = t, this.runExport = r, this.logger = n;
  }
  states = /* @__PURE__ */ new Map();
  getOrCreate(t) {
    const r = this.states.get(t);
    if (r) return r;
    const n = Da();
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
    }), a = Promise.all(s).then(() => !0), c = await new Promise((d) => {
      const l = setTimeout(() => d(!0), t);
      a.then(() => {
        clearTimeout(l), d(!1);
      });
    });
    return {
      total: r.length,
      flushed: n,
      failed: o,
      timedOut: c
    };
  }
}
const gr = (e, t = "") => {
  const r = e.trim();
  return r ? r.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, Tr = (e) => {
  const t = Z.resolve(e);
  return process.platform === "win32" ? t.toLowerCase() : t;
}, Sr = (e) => {
  if (typeof e != "string") return;
  const t = e.trim();
  return t.length > 0 ? v(t, "projectPath") : void 0;
}, hn = (e, t) => {
  const r = v(e, t);
  return Mt(r);
}, mr = async (e, t) => {
  const r = Tr(e), n = await P.getClient().project.findMany({
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
        if (Tr(s) === r)
          return {
            id: String(o.id),
            title: typeof o.title == "string" ? o.title : "",
            projectPath: s
          };
      } catch {
      }
  return null;
}, Oa = async (e) => {
  const { projectId: t, projectPath: r, previousTitle: n, nextTitle: o, logger: s } = e;
  if (!(!r || n === o))
    try {
      const a = v(r, "projectPath"), d = `${Z.dirname(a)}${Z.sep}.luie${Z.sep}${bt}`, l = gr(n, ""), i = gr(o, "");
      if (!l || !i || l === i) return;
      const u = `${d}${Z.sep}${l}`, S = `${d}${Z.sep}${i}`;
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
}, ja = (e) => {
  const t = e.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    updatedAt: n.updatedAt,
    content: n.content,
    file: `${Tt}/${n.id}${ne}`
  })), r = t.map((n) => ({
    id: n.id,
    title: n.title,
    order: n.order,
    file: n.file
  }));
  return { exportChapters: t, chapterMeta: r };
}, ba = (e) => e.map((t) => {
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
}), Fa = (e) => e.map((t) => ({
  id: t.id,
  term: t.term,
  definition: t.definition,
  category: t.category,
  firstAppearance: t.firstAppearance,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
})), Ua = (e, t) => {
  const r = e.map((n) => ({
    id: n.id,
    projectId: n.projectId,
    chapterId: n.chapterId,
    content: n.content,
    description: n.description,
    createdAt: n.createdAt?.toISOString?.() ?? String(n.createdAt)
  }));
  return t > 0 ? r.slice(0, t) : r;
}, va = (e, t) => {
  const r = t.success ? t.data : void 0;
  return {
    synopsis: e.description ?? (typeof r?.synopsis == "string" ? r.synopsis : ""),
    status: r?.status ?? "draft",
    genre: typeof r?.genre == "string" ? r.genre : void 0,
    targetAudience: typeof r?.targetAudience == "string" ? r.targetAudience : void 0,
    logline: typeof r?.logline == "string" ? r.logline : void 0,
    updatedAt: typeof r?.updatedAt == "string" ? r.updatedAt : void 0
  };
}, Ma = (e) => !e.success || !Array.isArray(e.data.columns) ? { columns: [] } : {
  columns: e.data.columns,
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
}, Wa = (e) => !e.success || !Array.isArray(e.data.paths) ? { paths: [] } : {
  paths: rn(e.data.paths),
  tool: e.data.tool,
  iconType: e.data.iconType,
  color: typeof e.data.color == "string" ? e.data.color : void 0,
  lineWidth: typeof e.data.lineWidth == "number" ? e.data.lineWidth : void 0,
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
}, ka = (e) => e.success ? {
  nodes: nn(e.data.nodes),
  edges: on(e.data.edges),
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
} : { nodes: [], edges: [] }, Ba = (e) => e.success ? {
  memos: sn(e.data.memos),
  updatedAt: typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
} : { memos: [] }, $a = (e) => {
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
}, xa = (e, t) => ({
  format: Lt,
  container: Ot,
  version: jt,
  projectId: e.id,
  title: e.title,
  description: e.description,
  createdAt: e.createdAt?.toISOString?.() ?? String(e.createdAt),
  updatedAt: e.updatedAt?.toISOString?.() ?? String(e.updatedAt),
  chapters: t
}), Ga = p.object({
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
}).passthrough(), Ha = p.object({
  characters: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), za = p.object({
  terms: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), Oe = p.object({
  synopsis: p.string().optional(),
  status: p.enum(["draft", "working", "locked"]).optional(),
  genre: p.string().optional(),
  targetAudience: p.string().optional(),
  logline: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), yr = p.object({
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
}).passthrough(), _r = p.object({
  paths: p.array(p.record(p.string(), p.unknown())).optional(),
  tool: p.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: p.enum(["mountain", "castle", "village"]).optional(),
  color: p.string().optional(),
  lineWidth: p.number().optional(),
  updatedAt: p.string().optional()
}).passthrough(), wr = p.object({
  nodes: p.array(p.record(p.string(), p.unknown())).optional(),
  edges: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), Ir = p.object({
  memos: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), Ya = p.object({
  id: p.string(),
  entityType: p.string(),
  subType: p.string().optional(),
  name: p.string(),
  description: p.string().optional().nullable(),
  firstAppearance: p.string().optional().nullable(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  positionX: p.number().optional(),
  positionY: p.number().optional()
}).passthrough(), Xa = p.object({
  id: p.string(),
  sourceId: p.string(),
  sourceType: p.string(),
  targetId: p.string(),
  targetType: p.string(),
  relation: p.string(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  createdAt: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), Va = p.object({
  nodes: p.array(Ya).optional(),
  edges: p.array(Xa).optional(),
  updatedAt: p.string().optional()
}).passthrough(), qa = p.object({
  id: p.string(),
  projectId: p.string().optional(),
  chapterId: p.string().optional().nullable(),
  content: p.string().optional(),
  description: p.string().optional().nullable(),
  createdAt: p.string().optional()
}).passthrough(), Ka = p.object({
  snapshots: p.array(qa).optional()
}).passthrough(), Ja = (e, t, r, n) => {
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
}, Qa = async (e) => await P.getClient().project.findUnique({
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
}), Za = (e, t, r) => {
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
}, ti = async (e, t) => {
  if (!e || !e.toLowerCase().endsWith(x))
    return {
      synopsis: Oe.safeParse(null),
      plot: yr.safeParse(null),
      drawing: _r.safeParse(null),
      mindmap: wr.safeParse(null),
      memos: Ir.safeParse(null)
    };
  const r = async (d, l, i) => {
    const u = `${F}/${d}`;
    try {
      const S = await H(e, u, t);
      return Ja(
        S,
        l,
        {
          packagePath: e,
          entryPath: u,
          label: i
        },
        t
      );
    } catch (S) {
      return t.warn("Failed to read .luie world document; using default during export", {
        projectPath: e,
        entryPath: u,
        label: i,
        error: S
      }), l.safeParse(null);
    }
  }, [n, o, s, a, c] = await Promise.all([
    r(
      vt,
      Oe,
      "synopsis"
    ),
    r(Zt, yr, "plot"),
    r(te, _r, "drawing"),
    r(ee, wr, "mindmap"),
    r(
      Be,
      Ir,
      "scrap-memos"
    )
  ]);
  return {
    synopsis: n,
    plot: o,
    drawing: s,
    mindmap: a,
    memos: c
  };
}, ei = async (e) => {
  const t = await Qa(e.projectId);
  if (!t) return !1;
  const r = e.options?.targetPath ? hn(e.options.targetPath, "targetPath") : Za(e.projectId, t.projectPath, e.logger);
  if (!r) return !1;
  const n = e.options?.worldSourcePath === void 0 ? r : e.options.worldSourcePath, { exportChapters: o, chapterMeta: s } = ja(t.chapters), a = ba(t.characters), c = Fa(t.terms), d = g.getAll().snapshotExportLimit ?? xr, l = Ua(t.snapshots, d), i = await ti(n, e.logger), u = va(t, i.synopsis), S = Ma(i.plot), I = Wa(i.drawing), h = ka(i.mindmap), f = Ba(i.memos), A = $a(t), T = xa(t, s);
  return e.logger.info("Exporting .luie package", {
    projectId: e.projectId,
    projectPath: r,
    chapterCount: o.length,
    characterCount: a.length,
    termCount: c.length,
    worldNodeCount: A.nodes.length,
    relationCount: A.edges.length,
    snapshotCount: l.length
  }), await un(
    r,
    {
      meta: T,
      chapters: o,
      characters: a,
      terms: c,
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
}, ri = async (e) => {
  const t = [];
  for (let r = 0; r < e.chaptersMeta.length; r += 1) {
    const n = e.chaptersMeta[r], o = n.id ?? V(), s = n.file ?? `${Tt}/${o}${ne}`, a = typeof n.content == "string" ? n.content : await e.readChapterEntry(s);
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
    const c = a ?? "";
    t.push({
      id: o,
      projectId: e.resolvedProjectId,
      title: n.title ?? `Chapter ${r + 1}`,
      content: c,
      synopsis: null,
      order: typeof n.order == "number" ? n.order : r,
      wordCount: c.length
    });
  }
  return t;
}, ni = (e, t) => t.map((r, n) => {
  const o = typeof r.name == "string" && r.name.trim().length > 0 ? r.name : `Character ${n + 1}`, s = typeof r.attributes == "string" ? r.attributes : r.attributes ? JSON.stringify(r.attributes) : null;
  return {
    id: typeof r.id == "string" ? r.id : V(),
    projectId: e,
    name: o,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: s
  };
}), oi = (e, t) => t.map((r, n) => {
  const o = typeof r.term == "string" && r.term.trim().length > 0 ? r.term : `Term ${n + 1}`;
  return {
    id: typeof r.id == "string" ? r.id : V(),
    projectId: e,
    term: o,
    definition: typeof r.definition == "string" ? r.definition : null,
    category: typeof r.category == "string" ? r.category : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
  };
}), si = (e) => {
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
    const c = typeof n.createdAt == "string" && n.createdAt.trim().length > 0 ? new Date(n.createdAt) : /* @__PURE__ */ new Date(), d = Number.isNaN(c.getTime()) ? /* @__PURE__ */ new Date() : c;
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
}, ai = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], ii = ["Place", "Concept", "Rule", "Item"], ci = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], je = (e) => typeof e == "string" && ai.includes(e), be = (e) => typeof e == "string" && ii.includes(e), di = (e) => typeof e == "string" && ci.includes(e), Wt = (e) => {
  if (e == null)
    return null;
  if (typeof e == "string")
    return e;
  try {
    return JSON.stringify(e);
  } catch {
    return null;
  }
}, li = (e, t) => be(e) ? e : e === "WorldEntity" && be(t) ? t : null, pi = (e, t) => ({
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
}), ui = (e) => je(e.entityType) ? e.entityType : be(e.subType) ? e.subType : null, hi = (e, t, r) => {
  !r.id || !r.name || e.characterIds.has(r.id) || (e.characterIds.add(r.id), e.charactersForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: Wt(r.attributes)
  }));
}, Ei = (e, t, r) => {
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
}, fi = (e, t, r) => {
  !r.id || !r.name || e.factionIds.has(r.id) || (e.factionIds.add(r.id), e.factionsForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: Wt(r.attributes)
  }));
}, Ai = (e, t, r) => {
  !r.id || !r.name || e.eventIds.has(r.id) || (e.eventIds.add(r.id), e.eventsForCreate.push({
    id: r.id,
    projectId: t,
    name: r.name,
    description: typeof r.description == "string" ? r.description : null,
    firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
    attributes: Wt(r.attributes)
  }));
}, gi = (e, t, r, n) => {
  if (!n.id || !n.name) return;
  const o = li(r, n.subType);
  !o || e.worldEntityIds.has(n.id) || (e.worldEntityIds.add(n.id), e.worldEntitiesForCreate.push({
    id: n.id,
    projectId: t,
    type: o,
    name: n.name,
    description: typeof n.description == "string" ? n.description : null,
    firstAppearance: typeof n.firstAppearance == "string" ? n.firstAppearance : null,
    attributes: Wt(n.attributes),
    positionX: typeof n.positionX == "number" ? n.positionX : 0,
    positionY: typeof n.positionY == "number" ? n.positionY : 0
  }));
}, Pr = (e, t, r) => {
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
}, Ti = (e, t, r) => {
  if (!r.id || !r.name)
    return;
  const n = ui(r);
  if (n) {
    if (n === "Character") {
      hi(e, t, r);
      return;
    }
    if (n === "Term") {
      Ei(e, t, r);
      return;
    }
    if (n === "Faction") {
      fi(e, t, r);
      return;
    }
    if (n === "Event") {
      Ai(e, t, r);
      return;
    }
    gi(e, t, n, r);
  }
}, Si = (e, t, r) => {
  !r.sourceId || !r.targetId || !je(r.sourceType) || !je(r.targetType) || di(r.relation) && (!Pr(e, r.sourceType, r.sourceId) || !Pr(e, r.targetType, r.targetId) || e.relationsForCreate.push({
    id: r.id || V(),
    projectId: t,
    sourceId: r.sourceId,
    sourceType: r.sourceType,
    targetId: r.targetId,
    targetType: r.targetType,
    relation: r.relation,
    attributes: Wt(r.attributes),
    sourceWorldEntityId: Ze(r.sourceType) && e.worldEntityIds.has(r.sourceId) ? r.sourceId : null,
    targetWorldEntityId: Ze(r.targetType) && e.worldEntityIds.has(r.targetId) ? r.targetId : null
  }));
}, mi = (e) => {
  const t = pi(e.baseCharacters, e.baseTerms);
  if (!e.graph)
    return t;
  for (const r of e.graph.nodes ?? [])
    Ti(t, e.projectId, r);
  for (const r of e.graph.edges ?? [])
    Si(t, e.projectId, r);
  return t;
}, yi = async (e) => {
  const {
    resolvedProjectId: t,
    legacyProjectId: r,
    existing: n,
    meta: o,
    worldSynopsis: s,
    resolvedPath: a,
    chaptersForCreate: c,
    charactersForCreate: d,
    termsForCreate: l,
    factionsForCreate: i,
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
            autoSaveInterval: ke
          }
        }
      },
      include: { settings: !0 }
    });
    return c.length > 0 && await f.chapter.createMany({ data: c }), d.length > 0 && await f.character.createMany({ data: d }), l.length > 0 && await f.term.createMany({ data: l }), i.length > 0 && await f.faction.createMany({ data: i }), u.length > 0 && await f.event.createMany({ data: u }), S.length > 0 && await f.worldEntity.createMany({ data: S }), I.length > 0 && await f.entityRelation.createMany({ data: I }), h.length > 0 && await f.snapshot.createMany({ data: h }), A;
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
}, _i = async (e) => await P.getClient().project.findFirst({
  where: { projectPath: e },
  select: { id: !0, updatedAt: !0 }
}), wi = async (e, t) => {
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
    const r = await H(e, Qt, t);
    if (!r)
      throw new Error("MISSING_META");
    const n = Ga.safeParse(JSON.parse(r));
    if (!n.success)
      throw new Error("INVALID_META");
    return { meta: n.data, luieCorrupted: !1 };
  } catch (r) {
    return t.warn("Failed to read .luie meta; treating as corrupted", {
      packagePath: e,
      error: r
    }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
  }
}, Ii = (e, t) => {
  const n = (typeof e.projectId == "string" ? e.projectId : void 0) ?? t?.id ?? V(), o = t && t.id !== n ? t.id : null;
  return { resolvedProjectId: n, legacyProjectId: o };
}, Pi = (e = /* @__PURE__ */ new Date()) => {
  const t = (r) => String(r).padStart(2, "0");
  return `${e.getFullYear()}${t(e.getMonth() + 1)}${t(e.getDate())}-${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`;
}, Ri = async (e) => {
  const t = Mt(e), r = x, o = t.toLowerCase().endsWith(r) ? t.slice(0, t.length - r.length) : t, s = Pi();
  let a = `${o}.recovered-${s}${r}`, c = 1;
  for (; ; )
    try {
      await it.access(a), a = `${o}.recovered-${s}-${c}${r}`, c += 1;
    } catch {
      return a;
    }
}, Ci = async (e, t) => {
  const r = `${F}/${Hr}`, n = `${F}/${zr}`, o = `${bt}/index.json`, s = `${F}/${vt}`, a = `${F}/${re}`, [c, d, l, i, u] = await Promise.all([
    H(e, r, t),
    H(e, n, t),
    H(e, o, t),
    H(e, s, t),
    H(e, a, t)
  ]), S = Rt(c, Ha, {
    packagePath: e,
    entryPath: r,
    label: "world characters"
  }), I = Rt(d, za, {
    packagePath: e,
    entryPath: n,
    label: "world terms"
  }), h = Rt(l, Ka, {
    packagePath: e,
    entryPath: o,
    label: "snapshot index"
  }), f = Rt(
    i,
    Oe,
    {
      packagePath: e,
      entryPath: s,
      label: "world synopsis"
    }
  ), A = Rt(u, Va, {
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
}, Ni = async (e) => {
  const t = hn(e.packagePath, "packagePath"), { meta: r, luieCorrupted: n, recoveryReason: o } = await wi(
    t,
    e.logger
  ), s = await _i(t);
  if (n) {
    if (!s)
      throw new _(
        w.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: t }
      );
    const T = await Ri(t);
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
  const { resolvedProjectId: a, legacyProjectId: c } = Ii(r, s), d = await P.getClient().project.findUnique({
    where: { id: a },
    select: { id: !0, updatedAt: !0 }
  }), l = r.chapters ?? [], i = await Ci(t, e.logger), u = await ri({
    packagePath: t,
    resolvedProjectId: a,
    chaptersMeta: l,
    readChapterEntry: async (T) => await H(t, T, e.logger)
  }), S = ni(
    a,
    i.characters
  ), I = oi(a, i.terms), h = mi({
    projectId: a,
    graph: i.graph,
    baseCharacters: S,
    baseTerms: I
  }), f = si({
    resolvedProjectId: a,
    snapshots: i.snapshots,
    validChapterIds: new Set(u.map((T) => T.id)),
    logger: e.logger
  }), A = await yi({
    resolvedProjectId: a,
    legacyProjectId: c,
    existing: d,
    meta: r,
    worldSynopsis: i.worldSynopsis,
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
}, O = M("ProjectService");
class En {
  exportQueue = new La(
    to,
    async (t) => {
      await this.exportProjectPackage(t);
    },
    O
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
    for (const s of t)
      if (!(typeof s.projectPath != "string" || s.projectPath.length === 0))
        try {
          const a = v(s.projectPath, "projectPath"), c = this.toProjectPathKey(a), d = r.get(c) ?? [];
          d.push({
            id: String(s.id),
            projectPath: a,
            updatedAt: s.updatedAt instanceof Date ? s.updatedAt : new Date(String(s.updatedAt))
          }), r.set(c, d);
        } catch {
          continue;
        }
    let n = 0, o = 0;
    for (const s of r.values()) {
      if (s.length <= 1) continue;
      n += 1;
      const a = [...s].sort(
        (l, i) => i.updatedAt.getTime() - l.updatedAt.getTime()
      ), c = a[0], d = a.slice(1);
      await Promise.all(
        d.map(async (l) => {
          await P.getClient().project.update({
            where: { id: l.id },
            data: { projectPath: null }
          }), O.warn("Cleared duplicate projectPath from stale record", {
            keepProjectId: c.id,
            staleProjectId: l.id,
            projectPath: l.projectPath
          });
        })
      ), o += d.length;
    }
    return n > 0 && O.info("Project path duplicate reconciliation completed", {
      duplicateGroups: n,
      clearedRecords: o
    }), { duplicateGroups: n, clearedRecords: o };
  }
  async createProject(t) {
    try {
      O.info("Creating project", t);
      const r = Sr(t.projectPath);
      if (r) {
        const s = await mr(r);
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
              autoSaveInterval: ke
            }
          }
        },
        include: {
          settings: !0
        }
      }), o = String(n.id);
      return O.info("Project created successfully", { projectId: o }), this.schedulePackageExport(o, "project:create"), n;
    } catch (r) {
      throw O.error("Failed to create project", r), new _(
        w.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        r
      );
    }
  }
  async openLuieProject(t) {
    try {
      return await Ni({
        packagePath: t,
        logger: O,
        exportRecoveredPackage: async (r, n) => await this.exportProjectPackageWithOptions(r, {
          targetPath: n,
          worldSourcePath: null
        }),
        getProjectById: async (r) => await this.getProject(r)
      });
    } catch (r) {
      throw O.error("Failed to open .luie package", { packagePath: t, error: r }), r instanceof _ ? r : new _(
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
      throw O.error("Failed to get project", r), r;
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
            const a = v(o, "projectPath");
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
      throw O.error("Failed to get all projects", t), new _(
        w.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async updateProject(t) {
    try {
      const r = t.projectPath === void 0 ? void 0 : Sr(t.projectPath) ?? null;
      if (r) {
        const l = await mr(r, t.id);
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
      }), s = typeof n?.title == "string" ? n.title : "", a = typeof o.title == "string" ? o.title : "", c = typeof o.projectPath == "string" ? o.projectPath : null;
      await Oa({
        projectId: String(o.id),
        projectPath: c,
        previousTitle: s,
        nextTitle: a,
        logger: O
      });
      const d = String(o.id);
      return O.info("Project updated successfully", { projectId: d }), this.schedulePackageExport(d, "project:update"), o;
    } catch (r) {
      throw O.error("Failed to update project", r), new _(
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
          const a = v(s, "projectPath");
          await it.rm(a, { force: !0, recursive: !0 });
        }
      }
      return g.addPendingProjectDelete({
        projectId: r.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), n = !0, await P.getClient().project.delete({
        where: { id: r.id }
      }), this.clearSyncBaselineForProject(r.id), O.info("Project deleted successfully", { projectId: r.id, deleteFile: r.deleteFile }), { success: !0 };
    } catch (o) {
      throw n && g.removePendingProjectDeletes([r.id]), O.error("Failed to delete project", o), o instanceof _ ? o : new _(
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
      }), this.clearSyncBaselineForProject(t), O.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (r) {
      throw O.error("Failed to remove project from list", r), r instanceof _ ? r : new _(
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
    return await ei({
      projectId: t,
      options: r,
      logger: O
    });
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const fn = new En(), An = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ProjectService: En,
  projectService: fn
}, Symbol.toStringTag, { value: "Module" })), Di = /* @__PURE__ */ new Set(["draft", "working", "locked"]), St = (e, t, r, n) => {
  if (typeof r != "string")
    return r;
  const o = en(r);
  return o !== null ? o : (n.warn("Invalid sync world document payload string; using default payload", {
    projectId: e,
    docType: t
  }), null);
}, Li = (e, t, r) => {
  const n = St(e, "synopsis", t, r);
  if (!L(n))
    return { synopsis: "", status: "draft" };
  const o = n.status, s = typeof o == "string" && Di.has(o) ? o : "draft", a = {
    synopsis: typeof n.synopsis == "string" ? n.synopsis : "",
    status: s
  };
  return typeof n.genre == "string" && (a.genre = n.genre), typeof n.targetAudience == "string" && (a.targetAudience = n.targetAudience), typeof n.logline == "string" && (a.logline = n.logline), typeof n.updatedAt == "string" && (a.updatedAt = n.updatedAt), a;
}, Oi = (e, t, r) => {
  const n = St(e, "plot", t, r);
  return L(n) ? {
    columns: (Array.isArray(n.columns) ? n.columns : []).filter((a) => L(a)).map((a, c) => {
      const l = (Array.isArray(a.cards) ? a.cards : []).filter((i) => L(i)).map((i, u) => ({
        id: typeof i.id == "string" && i.id.length > 0 ? i.id : `card-${c}-${u}`,
        content: typeof i.content == "string" ? i.content : ""
      }));
      return {
        id: typeof a.id == "string" && a.id.length > 0 ? a.id : `col-${c}`,
        title: typeof a.title == "string" ? a.title : "",
        cards: l
      };
    }),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { columns: [] };
}, ji = (e, t, r) => {
  const n = St(e, "drawing", t, r);
  return L(n) ? {
    paths: rn(n.paths),
    tool: vs(n.tool),
    iconType: Ms(n.iconType),
    color: typeof n.color == "string" ? n.color : void 0,
    lineWidth: typeof n.lineWidth == "number" ? n.lineWidth : void 0,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { paths: [] };
}, bi = (e, t, r) => {
  const n = St(e, "mindmap", t, r);
  return L(n) ? {
    nodes: nn(n.nodes),
    edges: on(n.edges),
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  } : { nodes: [], edges: [] };
}, Fi = (e, t, r) => {
  const n = St(e, "graph", t, r);
  if (!L(n))
    return { nodes: [], edges: [] };
  const o = Array.isArray(n.nodes) ? n.nodes.filter((a) => L(a)) : [], s = Array.isArray(n.edges) ? n.edges.filter((a) => L(a)) : [];
  return {
    nodes: o,
    edges: s,
    updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
  };
}, Ui = (e, t, r, n, o) => {
  const s = St(e, "scrap", t, o);
  if (!L(s))
    return {
      memos: r.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        tags: c.tags,
        updatedAt: c.updatedAt
      })),
      updatedAt: n
    };
  const a = an(s);
  return {
    memos: a.memos,
    updatedAt: typeof a.updatedAt == "string" ? a.updatedAt : n
  };
}, vi = (e) => typeof e == "string" ? e : null, Mi = (e) => [...e].sort((t, r) => Date.parse(r.updatedAt) - Date.parse(t.updatedAt)), gn = async (e) => {
  const {
    bundle: t,
    projectId: r,
    projectPath: n,
    localSnapshots: o,
    hydrateMissingWorldDocsFromPackage: s,
    logger: a
  } = e, c = t.projects.find((E) => E.id === r);
  if (!c || c.deletedAt) return null;
  const d = t.chapters.filter((E) => E.projectId === r && !E.deletedAt).sort((E, Bt) => E.order - Bt.order), l = t.characters.filter((E) => E.projectId === r && !E.deletedAt).map((E) => ({
    id: E.id,
    name: E.name,
    description: E.description ?? void 0,
    firstAppearance: E.firstAppearance ?? void 0,
    attributes: E.attributes ?? void 0
  })), i = t.terms.filter((E) => E.projectId === r && !E.deletedAt).sort((E, Bt) => E.order - Bt.order).map((E) => ({
    id: E.id,
    term: E.term,
    definition: E.definition ?? void 0,
    category: E.category ?? void 0,
    firstAppearance: E.firstAppearance ?? void 0
  })), u = /* @__PURE__ */ new Map();
  for (const E of Mi(t.worldDocuments))
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
  })), h = Li(
    r,
    u.get("synopsis"),
    a
  ), f = Oi(
    r,
    u.get("plot"),
    a
  ), A = ji(
    r,
    u.get("drawing"),
    a
  ), T = bi(
    r,
    u.get("mindmap"),
    a
  ), b = Fi(
    r,
    u.get("graph"),
    a
  ), pt = Ui(
    r,
    u.get("scrap"),
    S,
    c.updatedAt,
    a
  ), mt = d.map((E) => ({
    id: E.id,
    title: E.title,
    order: E.order,
    file: `${Tt}/${E.id}${ne}`,
    updatedAt: E.updatedAt
  }));
  return {
    meta: {
      format: Lt,
      container: Ot,
      version: jt,
      projectId: c.id,
      title: c.title,
      description: c.description ?? void 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      chapters: mt
    },
    chapters: d.map((E) => ({
      id: E.id,
      content: E.content
    })),
    characters: l,
    terms: i,
    synopsis: h,
    plot: f,
    drawing: A,
    mindmap: T,
    graph: b,
    memos: pt,
    snapshots: I
  };
}, Wi = async (e) => {
  const { bundle: t, hydrateMissingWorldDocsFromPackage: r, logger: n } = e, o = e.buildProjectPackagePayload ?? gn, s = [], a = [];
  for (const c of t.projects) {
    const d = await P.getClient().project.findUnique({
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
    }), l = vi(d?.projectPath);
    if (!l || !l.toLowerCase().endsWith(x))
      continue;
    let i;
    try {
      i = v(l, "projectPath");
    } catch (S) {
      n.warn("Skipping .luie persistence for invalid projectPath", {
        projectId: c.id,
        projectPath: l,
        error: S
      });
      continue;
    }
    const u = await o({
      bundle: t,
      projectId: c.id,
      projectPath: i,
      localSnapshots: d?.snapshots ?? [],
      hydrateMissingWorldDocsFromPackage: r,
      logger: n
    });
    if (u)
      try {
        await un(i, u, n), a.push({
          projectId: c.id,
          projectPath: i
        });
      } catch (S) {
        s.push(c.id), n.error("Failed to persist merged bundle into .luie package", {
          projectId: c.id,
          projectPath: i,
          error: S
        });
      }
  }
  if (s.length > 0)
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${s.join(",")}`);
  return a;
}, ki = async (e, t) => {
  if (e.length === 0) return [];
  const r = [];
  for (const n of e)
    try {
      await fn.openLuieProject(n.projectPath);
    } catch (o) {
      r.push(n.projectId), t.error("Failed to recover DB cache from persisted .luie package", {
        projectId: n.projectId,
        projectPath: n.projectPath,
        error: o
      });
    }
  return r;
}, Bi = async (e) => gn({
  bundle: e.bundle,
  projectId: e.projectId,
  projectPath: e.projectPath,
  localSnapshots: e.localSnapshots,
  hydrateMissingWorldDocsFromPackage: e.hydrateMissingWorldDocsFromPackage,
  logger: e.logger
}), $i = async (e) => {
  const t = await Wi({
    bundle: e.bundle,
    hydrateMissingWorldDocsFromPackage: e.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: e.buildProjectPackagePayload,
    logger: e.logger
  }), r = P.getClient(), n = la(e.bundle);
  try {
    await r.$transaction(async (o) => {
      const s = o;
      await pa(s, n), await ua(s, e.bundle.projects, n);
      for (const a of e.bundle.chapters)
        n.has(a.projectId) || await ha(s, a);
      await Ea(s, e.bundle.characters, n), await fa(s, e.bundle.terms, n), await Aa(
        s,
        e.bundle.tombstones,
        n
      );
    });
  } catch (o) {
    const s = t.map((c) => c.projectId);
    e.logger.error("Failed to apply merged bundle to DB cache after .luie persistence", {
      error: o,
      persistedProjectIds: s
    });
    const a = await ki(
      t,
      e.logger
    );
    throw a.length > 0 ? new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${a.join(",")}`
    ) : new Error(`SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"}`);
  }
}, Tn = M("SyncRepository"), y = (e) => typeof e == "string" ? e : null, kt = (e, t) => typeof e == "string" && e.length > 0 ? e : t, $ = (e, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof e == "string" && e.length > 0 ? e : e instanceof Date ? e.toISOString() : t, Fe = (e, t = 0) => typeof e == "number" && Number.isFinite(e) ? e : t, xi = (e) => Array.isArray(e) ? e.filter((t) => typeof t == "string") : [], Rr = (e) => !!(e && typeof e == "object" && !Array.isArray(e)), Gi = (e) => {
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}, He = (e) => typeof e == "string" ? Gi(e) : e ?? null, nt = (e) => {
  const t = {};
  for (const [r, n] of Object.entries(e))
    n !== void 0 && (t[r] = n);
  return t;
}, Cr = async (e, t, r) => {
  const n = await r.text();
  return r.status === 404 && n.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${e}_FAILED:${t}:${r.status}:${n}`);
}, Hi = (e) => {
  const t = y(e.id), r = y(e.user_id);
  return !t || !r ? null : {
    id: t,
    userId: r,
    title: kt(e.title, "Untitled"),
    description: y(e.description),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, zi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    title: kt(e.title, "Untitled"),
    content: y(e.content) ?? "",
    synopsis: y(e.synopsis),
    order: Fe(e.order),
    wordCount: Fe(e.word_count),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, Yi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    name: kt(e.name, "Character"),
    description: y(e.description),
    firstAppearance: y(e.first_appearance),
    attributes: He(e.attributes),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, Xi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    term: kt(e.term, "Term"),
    definition: y(e.definition),
    category: y(e.category),
    order: Fe(e.order),
    firstAppearance: y(e.first_appearance),
    createdAt: $(e.created_at),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, Vi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id), o = y(e.doc_type);
  if (!t || !r || !n || !o || o !== "synopsis" && o !== "plot" && o !== "drawing" && o !== "mindmap" && o !== "scrap" && o !== "graph")
    return null;
  const s = He(e.payload), a = Rr(s) ? s : {};
  return Rr(s) || Tn.warn("Invalid world document payload from sync source; using empty payload", {
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
}, qi = (e) => {
  const t = y(e.id), r = y(e.user_id), n = y(e.project_id);
  return !t || !r || !n ? null : {
    id: t,
    userId: r,
    projectId: n,
    title: kt(e.title, "Memo"),
    content: y(e.content) ?? "",
    tags: xi(e.tags),
    updatedAt: $(e.updated_at),
    deletedAt: y(e.deleted_at)
  };
}, Ki = (e) => {
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
class Ji {
  isConfigured() {
    return lt() !== null;
  }
  async fetchBundle(t, r) {
    const n = dn(), [
      o,
      s,
      a,
      c,
      d,
      l,
      i
    ] = await Promise.all([
      this.fetchTableRaw("projects", t, r),
      this.fetchTableRaw("chapters", t, r),
      this.fetchTableRaw("characters", t, r),
      this.fetchTableRaw("terms", t, r),
      this.fetchTableRaw("world_documents", t, r),
      this.fetchTableRaw("memos", t, r),
      this.fetchTableRaw("tombstones", t, r)
    ]);
    return n.projects = o.map(Hi).filter((u) => u !== null), n.chapters = s.map(zi).filter((u) => u !== null), n.characters = a.map(Yi).filter((u) => u !== null), n.terms = c.map(Xi).filter((u) => u !== null), n.worldDocuments = d.map(Vi).filter((u) => u !== null), n.memos = l.map(qi).filter((u) => u !== null), n.tombstones = i.map(Ki).filter((u) => u !== null), n;
  }
  async upsertBundle(t, r) {
    const n = r.projects.map(
      (i) => nt({
        id: i.id,
        user_id: i.userId,
        title: i.title,
        description: i.description ?? null,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), o = r.chapters.map(
      (i) => nt({
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
    ), s = r.characters.map(
      (i) => nt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        name: i.name,
        description: i.description ?? null,
        first_appearance: i.firstAppearance ?? null,
        attributes: He(i.attributes),
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), a = r.terms.map(
      (i) => nt({
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
    ), c = r.worldDocuments.map(
      (i) => nt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        doc_type: i.docType,
        payload: i.payload ?? {},
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), d = r.memos.map(
      (i) => nt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        title: i.title,
        content: i.content,
        tags: i.tags,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      })
    ), l = r.tombstones.map(
      (i) => nt({
        id: i.id,
        user_id: i.userId,
        project_id: i.projectId,
        entity_type: i.entityType,
        entity_id: i.entityId,
        deleted_at: i.deletedAt,
        updated_at: i.updatedAt
      })
    );
    await this.upsertTable("projects", t, n, "id,user_id"), await this.upsertTable("chapters", t, o, "id,user_id"), await this.upsertTable("characters", t, s, "id,user_id"), await this.upsertTable("terms", t, a, "id,user_id"), await this.upsertTable("world_documents", t, c, "id,user_id"), await this.upsertTable("memos", t, d, "id,user_id"), await this.upsertTable("tombstones", t, l, "id,user_id");
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
      const d = await Cr("FETCH", t, a);
      throw Tn.warn("Failed to fetch sync table", {
        table: t,
        status: a.status,
        error: d.message
      }), d;
    }
    const c = await a.json();
    return Array.isArray(c) ? c : [];
  }
  async upsertTable(t, r, n, o) {
    if (n.length === 0) return;
    const s = Dt(), a = await fetch(
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
      throw await Cr("UPSERT", t, a);
  }
}
const Nr = new Ji(), Qi = async (e) => {
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
      Nr.fetchBundle(o, r),
      e.buildLocalBundle(r)
    ]), { merged: c, conflicts: d } = Gs(a, s, {
      baselinesByProjectId: t.entityBaselinesByProjectId,
      conflictResolutions: t.pendingConflictResolutions
    });
    if (d.total > 0) {
      const h = new Set(
        (d.items ?? []).map((b) => `${b.type}:${b.id}`)
      ), f = Object.fromEntries(
        Object.entries(t.pendingConflictResolutions ?? {}).filter(
          (b) => h.has(b[0])
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
        projectStateById: ra(
          fr(t.projectLastSyncedAtByProjectId),
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
    await e.applyMergedBundleToLocal(c), await Nr.upsertBundle(o, c);
    const l = (/* @__PURE__ */ new Date()).toISOString(), i = na(
      t,
      c,
      l,
      n
    ), u = ca(
      t,
      c,
      l,
      n
    ), S = g.setSyncSettings({
      lastSyncedAt: l,
      lastError: void 0,
      projectLastSyncedAtByProjectId: i,
      entityBaselinesByProjectId: u,
      pendingConflictResolutions: void 0
    });
    n.length > 0 && g.removePendingProjectDeletes(n);
    const I = {
      success: !0,
      message: `SYNC_OK:${e.reason}`,
      pulled: e.countBundleRows(s),
      pushed: e.countBundleRows(c),
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
      projectStateById: fr(i),
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
        projectStateById: ln(e.getStatus().projectStateById, r),
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
}, Dr = (e, t) => {
  t && g.setSyncSettings(
    e === "access" ? { accessTokenCipher: t } : { refreshTokenCipher: t }
  );
}, Zi = (e, t) => {
  const r = B.getAccessToken(e);
  if (r.errorCode && t(r.errorCode))
    return r.errorCode;
  Dr("access", r.migratedCipher);
  const n = B.getRefreshToken(e);
  return n.errorCode && t(n.errorCode) ? n.errorCode : (Dr("refresh", n.migratedCipher), !!r.token || !!n.token ? null : r.errorCode ?? n.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
}, J = M("SyncService"), tc = 1500, Lr = {
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
}, ec = (e) => {
  const t = e instanceof Error ? e.message : String(e);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, rc = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], fe = (e) => rc.some((t) => e.includes(t)), ht = (e, t) => ({
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
}), Or = (e) => Array.isArray(e) ? e.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [];
class Sn {
  status = Lr;
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
      projectStateById: ln(this.status.projectStateById, t),
      lastRun: r ?? this.status.lastRun
    });
  }
  initialize() {
    const t = g.getSyncSettings();
    if (this.status = ht(t, this.status), !t.connected && B.hasPendingAuthFlow() && (this.status = {
      ...this.status,
      mode: "connecting"
    }), t.connected) {
      const r = Zi(
        t,
        fe
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
      ...ht(t, Lr),
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
      (c) => c.type === t.type && c.id === t.id
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
    }, tc));
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
    return await Qi({
      reason: t,
      getStatus: () => this.status,
      getQueuedRun: () => this.queuedRun,
      setQueuedRun: (r) => {
        this.queuedRun = r;
      },
      runQueuedSync: () => {
        this.runNow("queued");
      },
      normalizePendingProjectDeletes: Or,
      toSyncStatusFromSettings: ht,
      ensureAccessToken: async (r) => await this.ensureAccessToken(r),
      buildLocalBundle: async (r) => await this.buildLocalBundle(r),
      applyMergedBundleToLocal: async (r) => await this.applyMergedBundleToLocal(r),
      countBundleRows: (r) => this.countBundleRows(r),
      updateStatus: (r) => this.updateStatus(r),
      applyAuthFailureState: (r, n) => this.applyAuthFailureState(r, n),
      isAuthFatalMessage: fe,
      toSyncErrorMessage: ec,
      logRunFailed: (r, n) => {
        J.error("Sync run failed", { error: r, reason: n });
      }
    });
  }
  async ensureAccessToken(t) {
    return await da({
      syncSettings: t,
      isAuthFatalMessage: fe
    });
  }
  async buildLocalBundle(t) {
    const r = P.getClient(), n = Or(
      g.getSyncSettings().pendingProjectDeletes
    ), o = await r.project.findMany({
      include: {
        chapters: !0,
        characters: !0,
        terms: !0
      }
    });
    return await ea({
      userId: t,
      pendingProjectDeletes: n,
      projectRows: o,
      logger: J
    });
  }
  async buildProjectPackagePayload(t, r, n, o) {
    return await Bi({
      bundle: t,
      projectId: r,
      projectPath: n,
      localSnapshots: o,
      hydrateMissingWorldDocsFromPackage: async (s, a) => await Er(s, a, J),
      logger: J
    });
  }
  async applyMergedBundleToLocal(t) {
    await $i({
      bundle: t,
      hydrateMissingWorldDocsFromPackage: async (r, n) => await Er(r, n, J),
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
const Jt = new Sn(), sd = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: Sn,
  syncService: Jt
}, Symbol.toStringTag, { value: "Module" })), Nt = M("DeepLink"), nc = "luie://auth/callback", oc = "luie://auth/return", sc = "luie://auth/", Ht = () => {
  const e = U.getMainWindow();
  if (e) {
    e.isMinimized() && e.restore(), e.focus();
    return;
  }
  const t = U.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, Ae = (e) => {
  const t = G.getAllWindows();
  for (const r of t)
    if (!r.isDestroyed())
      try {
        r.webContents.send(gt.SYNC_AUTH_RESULT, e);
      } catch (n) {
        Nt.warn("Failed to broadcast OAuth result", { error: n });
      }
}, ac = (e) => {
  const t = e instanceof Error ? e.message : String(e);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, ic = (e) => e === "NO_PENDING" || e === "EXPIRED" || e === "STATE_MISMATCH", jr = (e) => e === "NO_PENDING" ? "NO_PENDING" : e === "EXPIRED" ? "EXPIRED" : e === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", Ue = (e) => {
  for (const t of e)
    if (typeof t == "string" && t.startsWith(sc))
      return t;
  return null;
}, ve = async (e) => {
  if (e.startsWith(oc))
    return Ht(), Nt.info("OAuth return deep link handled", { url: e }), !0;
  if (!e.startsWith(nc))
    return !1;
  try {
    return await Jt.handleOAuthCallback(e), Ht(), Ae({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Nt.info("OAuth callback processed", { url: e }), !0;
  } catch (t) {
    const r = t instanceof Error ? t.message : String(t), n = ac(t), o = Jt.getStatus();
    return o.connected && ic(n) ? (Ht(), Ae({
      status: "stale",
      reason: jr(n),
      detail: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Nt.warn("OAuth callback arrived after connection was already established", {
      url: e,
      reason: n,
      error: t
    }), !0) : (Ht(), Ae({
      status: "error",
      reason: jr(n),
      detail: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Nt.error(o.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
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
}, ge = async (e, t) => e && !e.isDestroyed() ? Te.showMessageBox(e, t) : Te.showMessageBox(t), cc = (e) => {
  let t = !1;
  m.on("window-all-closed", () => {
    process.platform !== "darwin" && m.quit();
  }), m.on("before-quit", (r) => {
    t || (t = !0, r.preventDefault(), (async () => {
      e.info("App is quitting");
      const { autoSaveManager: n } = await import("./autoSaveManager-Peec-Kx6.js").then((h) => h.d), { snapshotService: o } = await import("./snapshotService--MrFU9a2.js").then((h) => h.a), { projectService: s } = await Promise.resolve().then(() => An), a = U.getMainWindow();
      Q(a, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let c = !1, d = !1, l = !1;
      if (a && !a.isDestroyed() && a.webContents)
        try {
          c = await new Promise((h) => {
            const f = setTimeout(
              () => h(!1),
              Kn
            );
            _n.once(gt.APP_FLUSH_COMPLETE, (A, T) => {
              d = !!T?.hadQueuedAutoSaves, l = !!T?.rendererDirty, clearTimeout(f), h(!0);
            }), a.webContents.send(gt.APP_BEFORE_QUIT);
          }), e.info("Renderer flush phase completed", {
            rendererFlushed: c,
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
      const i = n.getPendingSaveCount();
      if (i > 0 || d || l || !c)
        try {
          const h = i > 0 ? `${i}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", f = await ge(a, {
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
                new Promise((A) => setTimeout(A, Jn))
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
      if ((await s.flushPendingExports(Qn)).timedOut) {
        const h = await ge(a, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: !0
        });
        (h.response === 1 || h.response === 0 && (await s.flushPendingExports(Zn)).timedOut && (await ge(a, {
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
        const { db: h } = await Promise.resolve().then(() => ts);
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
}, dc = (e) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : m.requestSingleInstanceLock())) {
    const n = Ue(process.argv);
    return e.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!n,
      argv: process.argv
    }), m.quit(), !1;
  }
  return m.on("second-instance", (n, o) => {
    const s = Ue(o);
    e.info("Second instance event received", {
      hasCallbackUrl: !!s
    }), s && ve(s);
    const a = U.getMainWindow();
    a && (a.isMinimized() && a.restore(), a.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-HSSbDImy.js").then((e) => e.c);
kr({
  logToFile: !0,
  logFilePath: j.join(m.getPath("userData"), fo, Ao),
  minLevel: We.INFO
});
const et = M("Main"), Yt = process.defaultApp === !0, Me = Date.now();
et.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: m.isPackaged,
  defaultApp: Yt,
  startupStartedAtMs: Me
});
const lc = () => {
  const e = "luie";
  let t = !1;
  if (Yt) {
    const n = process.argv[1] ? j.resolve(process.argv[1]) : "";
    n && (t = m.setAsDefaultProtocolClient(e, process.execPath, [n]));
  } else
    t = m.setAsDefaultProtocolClient(e);
  if (!t) {
    const n = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    g.getSyncSettings().connected || g.setSyncSettings({ lastError: n }), et.warn("Failed to register custom protocol for OAuth callback", {
      protocol: e,
      defaultApp: Yt,
      reason: n
    });
    return;
  }
  g.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && g.setSyncSettings({ lastError: void 0 }), et.info("Custom protocol registered", {
    protocol: e,
    defaultApp: Yt
  });
};
if (!dc(et))
  m.quit();
else {
  bs(et), No(), m.disableHardwareAcceleration(), process.platform === "darwin" && m.on("open-url", (t, r) => {
    t.preventDefault(), ve(r);
  }), lc();
  const e = Ue(process.argv);
  e && ve(e), Rs(et, {
    startupStartedAtMs: Me,
    onFirstRendererReady: () => {
      const t = Date.now();
      Jt.initialize(), et.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - Me
      });
    }
  }), cc(et);
}
export {
  ed as $,
  Lc as A,
  wa as B,
  F as C,
  Vc as D,
  w as E,
  Hr as F,
  zr as G,
  vt as H,
  gt as I,
  Zt as J,
  te as K,
  x as L,
  ne as M,
  ee as N,
  Be as O,
  re as P,
  Ca as Q,
  Kc as R,
  _ as S,
  Yc as T,
  Xc as U,
  ko as V,
  he as W,
  Jt as X,
  U as Y,
  _a as Z,
  Yr as _,
  Qt as a,
  lt as a0,
  Gc as a1,
  xc as a2,
  $e as a3,
  Hc as a4,
  xr as a5,
  Wc as a6,
  Mc as a7,
  Oc as a8,
  Vn as a9,
  vc as aa,
  kc as ab,
  Bc as ac,
  $c as ad,
  bc as ae,
  jc as af,
  Fc as ag,
  Uc as ah,
  bt as ai,
  jt as aj,
  Ot as ak,
  Lt as al,
  ke as am,
  Ze as an,
  Dc as ao,
  Qc as ap,
  Zc as aq,
  rd as ar,
  sd as as,
  Tt as b,
  M as c,
  P as d,
  v as e,
  zc as f,
  Jc as g,
  Mt as h,
  td as i,
  Kt as j,
  Pa as k,
  ga as l,
  ma as m,
  Ut as n,
  od as o,
  fn as p,
  Na as q,
  H as r,
  Ra as s,
  nd as t,
  gr as u,
  ya as v,
  kn as w,
  qc as x,
  un as y,
  Ia as z
};

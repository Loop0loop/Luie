import { app as m, nativeTheme as Zr, BrowserWindow as z, Menu as ne, shell as tn, safeStorage as X, session as We, dialog as Te, ipcMain as en } from "electron";
import * as rt from "node:path";
import b from "node:path";
import * as rn from "fs";
import { existsSync as nn, promises as ot } from "fs";
import * as V from "path";
import pt, { join as k } from "path";
import on from "electron-window-state";
import ke from "electron-store";
import * as It from "node:fs/promises";
import { access as Tr, mkdir as Be, writeFile as $e, unlink as xe } from "node:fs/promises";
import { spawn as sn } from "node:child_process";
import { constants as me, promises as At } from "node:fs";
import { createRequire as an } from "node:module";
import { EventEmitter as cn } from "node:events";
import { randomBytes as dn, createHash as ln, randomUUID as Y } from "node:crypto";
import * as $ from "fs/promises";
import pn from "yazl";
import un from "yauzl";
import { z as p } from "zod";
import hn from "node:module";
const ba = import.meta.filename, Q = import.meta.dirname, Fa = hn.createRequire(import.meta.url);
var je = /* @__PURE__ */ ((n) => (n.DEBUG = "DEBUG", n.INFO = "INFO", n.WARN = "WARN", n.ERROR = "ERROR", n))(je || {});
const Gt = /* @__PURE__ */ Symbol.for("luie.logger.context"), Se = "[REDACTED]", fn = "[REDACTED_PATH]", mr = "[REDACTED_TEXT]", Sr = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, yr = /(content|synopsis|manuscript|chapterText|prompt)/i, _r = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, En = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, An = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, gn = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function Ge(n, t) {
  if (Sr.test(t ?? ""))
    return Se;
  if (yr.test(t ?? ""))
    return mr;
  if (_r.test(t ?? "") && En.test(n))
    return fn;
  let e = n.replace(An, "Bearer [REDACTED]");
  return gn.test(e) && (e = Se), e;
}
function ft(n, t, e = /* @__PURE__ */ new WeakSet()) {
  if (typeof n == "string")
    return Ge(n, t);
  if (typeof n == "number" || typeof n == "boolean" || n === null)
    return n;
  if (typeof n == "bigint")
    return n.toString();
  if (!(typeof n > "u")) {
    if (typeof n == "function" || typeof n == "symbol")
      return String(n);
    if (n instanceof Date)
      return n.toISOString();
    if (Array.isArray(n))
      return n.map((r) => ft(r, t, e));
    if (typeof n == "object") {
      const r = n;
      if (e.has(r))
        return "[Circular]";
      e.add(r);
      const o = {};
      for (const [s, a] of Object.entries(r)) {
        if (Sr.test(s)) {
          o[s] = Se;
          continue;
        }
        if (yr.test(s) && typeof a == "string") {
          o[s] = mr;
          continue;
        }
        if (_r.test(s) && typeof a == "string") {
          o[s] = Ge(a, s);
          continue;
        }
        o[s] = ft(a, s, e);
      }
      return o;
    }
    return String(n);
  }
}
function Tn(n) {
  if (!n || typeof n != "object") return ft(n);
  const t = n[Gt];
  return !t || typeof t != "object" ? ft(n) : Array.isArray(n) ? ft({ items: n, _ctx: t }) : ft({ ...n, _ctx: t });
}
function mn(n, t) {
  return n && typeof n == "object" ? { ...n, [Gt]: t } : { value: n, [Gt]: t };
}
class Sn {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, e, r) {
    if (!yn(t)) return;
    const o = Tn(r), s = {
      level: t,
      message: e,
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
    K.logToFile && K.logFilePath && In(s);
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
const wr = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, He = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let K = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, oe = null;
function yn(n) {
  return He[n] >= He[K.minLevel];
}
async function _n() {
  !wr || !K.logFilePath || (oe || (oe = (async () => {
    const n = await import("node:path");
    await (await import("node:fs/promises")).mkdir(n.dirname(K.logFilePath), {
      recursive: !0
    });
  })()), await oe);
}
function wn(n) {
  try {
    return JSON.stringify(n);
  } catch {
    return '"[unserializable]"';
  }
}
async function In(n) {
  if (!(!wr || !K.logFilePath))
    try {
      await _n();
      const t = await import("node:fs/promises"), e = wn(n);
      await t.appendFile(K.logFilePath, `${e}
`, "utf8");
    } catch {
    }
}
function Ir(n) {
  K = {
    ...K,
    ...n
  };
}
function W(n) {
  return new Sn(n);
}
const Ua = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: Gt,
  LogLevel: je,
  configureLogger: Ir,
  createLogger: W,
  withLogContext: mn
}, Symbol.toStringTag, { value: "Module" })), Pn = "Luie", Rn = "0.1.0", Pr = (n, t) => typeof n == "string" && n.trim().length > 0 ? n : t, ze = Pr(
  "luie",
  Pn
), va = Pr(
  "0.1.16",
  Rn
), Rr = "luie.db", Cn = 3e4, Nn = Cn, Ma = 1e3, ye = 30, Dn = !0, Wa = 300 * 1e3, ka = 60 * 1e3, Ba = 200, $a = 5e3, Ln = 3e3, On = 1e4, jn = 8e3, bn = 2e4, xa = 60 * 1e3, Ga = 2e3, Cr = 50, Ha = 2e3, za = 1, Ya = 0, Xa = 30, qa = 50, Va = 2e3, Fn = 5e3, Un = 1400, vn = 900, Mn = 1e3, Wn = 600, kn = 16, Bn = 16, $n = "sans", xn = "inter", Gn = 16, Hn = 1.6, zn = 800, Yn = "blue", Xn = !0, qn = "logs", Vn = "luie.log", Ka = "snapshot-mirror", Ja = "Backups", se = "settings", Kn = "settings.json", Nr = "luie", G = ".luie", Qa = "luie", Ct = "luie", Za = "Luie Project", ti = "New Project", ei = "project", Nt = "zip", Dt = 1, Vt = "meta.json", gt = "manuscript", ri = `${gt}/README.md`, F = "world", Lt = "snapshots", Jn = "assets", Dr = "characters.json", Lr = "terms.json", Ot = "synopsis.json", Kt = "plot-board.json", Jt = "map-drawing.json", Qt = "mindmap.json", be = "scrap-memos.json", Zt = "graph.json", Ht = ".md", P = {
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
}, Qn = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), Ye = (n) => Qn.has(n), ni = (n, t, e) => !0, Zn = "neutral", to = "soft", Fe = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", eo = () => !m.isPackaged && !Fe(), ro = () => m.isPackaged, no = () => b.join(process.cwd(), "prisma", "dev.db"), oo = () => b.join(process.cwd(), "prisma", ".tmp", "test.db"), so = () => b.join(m.getPath("userData"), Rr);
function ao() {
  if (process.env.DATABASE_URL) return;
  const n = Fe() ? oo() : m.isPackaged ? so() : no();
  process.env.DATABASE_URL = `file:${n}`;
}
const ut = W("SettingsManager"), io = (n) => {
  if (n)
    return {
      connected: n.connected ?? !1,
      provider: n.provider,
      email: n.email,
      userId: n.userId,
      expiresAt: n.expiresAt,
      autoSync: n.autoSync ?? !0,
      lastSyncedAt: n.lastSyncedAt,
      lastError: n.lastError,
      projectLastSyncedAtByProjectId: n.projectLastSyncedAtByProjectId
    };
}, co = (n) => {
  const t = n === "darwin" ? "Cmd" : "Ctrl";
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
}, $t = co(process.platform), _e = process.platform === "darwin" ? "visible" : "hidden", vt = (n) => {
  if (!n || typeof n != "object" || Array.isArray(n))
    return;
  const t = typeof n.url == "string" ? n.url.trim() : "", e = typeof n.anonKey == "string" ? n.anonKey.trim() : "";
  if (!(t.length === 0 || e.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: e
    };
}, Xe = () => ({
  editor: {
    fontFamily: $n,
    fontPreset: xn,
    fontSize: Gn,
    lineHeight: Hn,
    maxWidth: zn,
    theme: Zr.shouldUseDarkColors ? "dark" : "light",
    themeTemp: Zn,
    themeContrast: to,
    themeAccent: Yn,
    themeTexture: Xn,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: $t,
  lastProjectPath: void 0,
  autoSaveEnabled: Dn,
  autoSaveInterval: Nn,
  snapshotExportLimit: Cr,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: _e,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
});
class it {
  static instance;
  store;
  constructor() {
    const t = m.getPath("userData"), e = `${t}/${Nr}/${se}`, r = `${e}/${Kn}`;
    this.store = new ke({
      name: se,
      defaults: Xe(),
      // 저장 위치: userData/settings.json
      cwd: t,
      encryptionKey: void 0,
      // 필요하다면 암호화 키 추가
      fileExtension: "json"
    }), this.migrateLegacySettingsIfNeeded(e, r), this.migrateLegacyWindowSettings(), ut.info("Settings manager initialized", {
      path: this.store.path
    });
  }
  async migrateLegacySettingsIfNeeded(t, e) {
    const r = await this.pathExists(e), o = await this.pathExists(this.store.path);
    if (!(!r || o))
      try {
        const s = new ke({
          name: se,
          defaults: Xe(),
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
      return await Tr(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", _e), "titleBarMode" in t) {
      const { titleBarMode: e, ...r } = t;
      this.store.set(r);
    }
  }
  static getInstance() {
    return it.instance || (it.instance = new it()), it.instance;
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
      sync: io(t.sync)
    };
  }
  // 전체 설정 저장
  setAll(t) {
    const e = this.store.store, r = {
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
    this.store.set(r), ut.info("Settings updated", { settings: r });
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
    return { shortcuts: { ...$t, ...t }, defaults: $t };
  }
  setShortcuts(t) {
    const e = { ...$t, ...t };
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
    return this.store.get("menuBarMode") ?? _e;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    const t = this.store.get("sync"), e = Array.isArray(t?.pendingProjectDeletes) ? t.pendingProjectDeletes.filter(
      (c) => !!(c && typeof c == "object" && typeof c.projectId == "string" && c.projectId.length > 0 && typeof c.deletedAt == "string" && c.deletedAt.length > 0)
    ).map((c) => ({
      projectId: c.projectId,
      deletedAt: c.deletedAt
    })) : void 0, r = t?.projectLastSyncedAtByProjectId, o = r && typeof r == "object" && !Array.isArray(r) ? Object.fromEntries(
      Object.entries(r).filter(
        (c) => typeof c[0] == "string" && c[0].length > 0 && typeof c[1] == "string" && c[1].length > 0
      )
    ) : void 0, s = t?.entityBaselinesByProjectId, a = s && typeof s == "object" && !Array.isArray(s) ? Object.fromEntries(
      Object.entries(s).filter(
        (c) => typeof c[0] == "string" && c[0].length > 0 && !!c[1] && typeof c[1] == "object" && !Array.isArray(c[1])
      ).map(([c, d]) => {
        const u = d.chapter && typeof d.chapter == "object" && !Array.isArray(d.chapter) ? Object.fromEntries(
          Object.entries(d.chapter).filter(
            (h) => typeof h[0] == "string" && h[0].length > 0 && typeof h[1] == "string" && h[1].length > 0
          )
        ) : {}, T = d.memo && typeof d.memo == "object" && !Array.isArray(d.memo) ? Object.fromEntries(
          Object.entries(d.memo).filter(
            (h) => typeof h[0] == "string" && h[0].length > 0 && typeof h[1] == "string" && h[1].length > 0
          )
        ) : {}, _ = typeof d.capturedAt == "string" && d.capturedAt.length > 0 ? d.capturedAt : (/* @__PURE__ */ new Date()).toISOString();
        return [
          c,
          {
            chapter: u,
            memo: T,
            capturedAt: _
          }
        ];
      })
    ) : void 0, i = t?.pendingConflictResolutions, l = i && typeof i == "object" && !Array.isArray(i) ? Object.fromEntries(
      Object.entries(i).filter(
        (c) => typeof c[0] == "string" && c[0].length > 0 && (c[1] === "local" || c[1] === "remote")
      )
    ) : void 0;
    return {
      connected: t?.connected ?? !1,
      provider: t?.provider,
      email: t?.email,
      userId: t?.userId,
      expiresAt: t?.expiresAt,
      autoSync: t?.autoSync ?? !0,
      lastSyncedAt: t?.lastSyncedAt,
      lastError: t?.lastError,
      accessTokenCipher: t?.accessTokenCipher,
      refreshTokenCipher: t?.refreshTokenCipher,
      pendingAuthState: t?.pendingAuthState,
      pendingAuthVerifierCipher: t?.pendingAuthVerifierCipher,
      pendingAuthCreatedAt: t?.pendingAuthCreatedAt,
      pendingAuthRedirectUri: t?.pendingAuthRedirectUri,
      pendingProjectDeletes: e,
      projectLastSyncedAtByProjectId: o && Object.keys(o).length > 0 ? o : void 0,
      entityBaselinesByProjectId: a && Object.keys(a).length > 0 ? a : void 0,
      pendingConflictResolutions: l && Object.keys(l).length > 0 ? l : void 0,
      runtimeSupabaseConfig: vt(
        t.runtimeSupabaseConfig
      )
    };
  }
  setSyncSettings(t) {
    const r = {
      ...this.getSyncSettings(),
      ...t
    }, o = r.projectLastSyncedAtByProjectId;
    if (o && typeof o == "object" && !Array.isArray(o)) {
      const i = Object.fromEntries(
        Object.entries(o).filter(
          (l) => typeof l[0] == "string" && l[0].length > 0 && typeof l[1] == "string" && l[1].length > 0
        )
      );
      r.projectLastSyncedAtByProjectId = Object.keys(i).length > 0 ? i : void 0;
    } else
      r.projectLastSyncedAtByProjectId = void 0;
    const s = r.entityBaselinesByProjectId;
    if (s && typeof s == "object" && !Array.isArray(s)) {
      const i = Object.fromEntries(
        Object.entries(s).filter(
          (l) => typeof l[0] == "string" && l[0].length > 0 && !!l[1] && typeof l[1] == "object" && !Array.isArray(l[1])
        ).map(([l, c]) => {
          const d = c.chapter && typeof c.chapter == "object" && !Array.isArray(c.chapter) ? Object.fromEntries(
            Object.entries(c.chapter).filter(
              (_) => typeof _[0] == "string" && _[0].length > 0 && typeof _[1] == "string" && _[1].length > 0
            )
          ) : {}, u = c.memo && typeof c.memo == "object" && !Array.isArray(c.memo) ? Object.fromEntries(
            Object.entries(c.memo).filter(
              (_) => typeof _[0] == "string" && _[0].length > 0 && typeof _[1] == "string" && _[1].length > 0
            )
          ) : {}, T = typeof c.capturedAt == "string" && c.capturedAt.length > 0 ? c.capturedAt : (/* @__PURE__ */ new Date()).toISOString();
          return [
            l,
            {
              chapter: d,
              memo: u,
              capturedAt: T
            }
          ];
        })
      );
      r.entityBaselinesByProjectId = Object.keys(i).length > 0 ? i : void 0;
    } else
      r.entityBaselinesByProjectId = void 0;
    const a = r.pendingConflictResolutions;
    if (a && typeof a == "object" && !Array.isArray(a)) {
      const i = Object.fromEntries(
        Object.entries(a).filter(
          (l) => typeof l[0] == "string" && l[0].length > 0 && (l[1] === "local" || l[1] === "remote")
        )
      );
      r.pendingConflictResolutions = Object.keys(i).length > 0 ? i : void 0;
    } else
      r.pendingConflictResolutions = void 0;
    return r.runtimeSupabaseConfig = vt(r.runtimeSupabaseConfig), this.store.set("sync", r), r;
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
    const e = this.getSyncSettings(), o = (Array.isArray(e.pendingProjectDeletes) ? e.pendingProjectDeletes : []).filter((s) => s.projectId !== t.projectId);
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
    const e = new Set(t), r = this.getSyncSettings(), s = (Array.isArray(r.pendingProjectDeletes) ? r.pendingProjectDeletes : []).filter((a) => !e.has(a.projectId));
    return this.setSyncSettings({
      pendingProjectDeletes: s.length > 0 ? s : void 0
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
    return vt(t.runtimeSupabaseConfig);
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
    const e = vt(t);
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
    const e = this.getStartupSettings(), o = Object.prototype.hasOwnProperty.call(t, "completedAt") ? t.completedAt : e.completedAt, s = o ? { completedAt: o } : {};
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
const g = it.getInstance(), oi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: it,
  settingsManager: g
}, Symbol.toStringTag, { value: "Module" })), N = W("WindowManager"), ae = "#f4f4f5";
class lo {
  mainWindow = null;
  startupWizardWindow = null;
  resolveWindowIconPath() {
    const t = [
      k(process.resourcesPath, "icon.png"),
      k(process.resourcesPath, "build", "icons", "icon.png")
    ], e = [
      k(m.getAppPath(), "build", "icons", "icon.png"),
      k(m.getAppPath(), "assets", "public", "luie.png")
    ], r = m.isPackaged ? t : e;
    for (const o of r)
      if (nn(o))
        return o;
  }
  getTitleBarOptions() {
    return process.platform !== "darwin" ? {} : {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: kn, y: Bn }
    };
  }
  getMenuBarMode() {
    return g.getMenuBarMode();
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
    const r = on({
      defaultWidth: Un,
      defaultHeight: vn
    }), o = this.resolveWindowIconPath();
    this.mainWindow = new z({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      minWidth: Mn,
      minHeight: Wn,
      title: ze,
      show: !1,
      backgroundColor: ae,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: k(Q, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.mainWindow), r.manage(this.mainWindow);
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", i = !s && process.env.NODE_ENV !== "production";
    if (i)
      N.info("Loading development server", { url: a, isPackaged: s }), this.mainWindow.loadURL(a).catch((l) => {
        N.error("Failed to load development renderer URL", { url: a, error: l });
      }), this.mainWindow.webContents.openDevTools({ mode: "detach" });
    else {
      const l = k(Q, "../renderer/index.html");
      N.info("Loading production renderer", { path: l, isPackaged: s }), this.mainWindow.loadFile(l).catch((c) => {
        N.error("Failed to load production renderer file", { path: l, error: c });
      });
    }
    return this.mainWindow.once("ready-to-show", () => {
      this.mainWindow && !this.mainWindow.isDestroyed() && (N.info("Main window ready to show", { deferShow: e }), e || this.showMainWindow());
    }), this.mainWindow.on("closed", () => {
      this.mainWindow = null, N.info("Main window closed");
    }), N.info("Main window created", { isPackaged: s, useDevServer: i }), this.mainWindow;
  }
  createStartupWizardWindow() {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed())
      return this.startupWizardWindow.focus(), this.startupWizardWindow;
    const t = this.resolveWindowIconPath(), e = m.isPackaged, r = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", o = !e && process.env.NODE_ENV !== "production";
    if (this.startupWizardWindow = new z({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: !0,
      title: `${ze} Setup`,
      backgroundColor: "#0b1020",
      ...t ? { icon: t } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !0 } : {},
      webPreferences: {
        preload: k(Q, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.startupWizardWindow), o) {
      const s = `${r}/#startup-wizard`;
      N.info("Loading startup wizard (dev)", { wizardUrl: s }), this.startupWizardWindow.loadURL(s).catch((a) => {
        N.error("Failed to load startup wizard (dev)", { wizardUrl: s, error: a });
      });
    } else {
      const s = k(Q, "../renderer/index.html");
      N.info("Loading startup wizard (prod)", { path: s }), this.startupWizardWindow.loadFile(s, { hash: "startup-wizard" }).catch((a) => {
        N.error("Failed to load startup wizard (prod)", { path: s, error: a });
      });
    }
    return this.startupWizardWindow.on("closed", () => {
      this.startupWizardWindow = null, N.info("Startup wizard window closed");
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
    const e = 1200, r = 900, o = this.resolveWindowIconPath();
    this.exportWindow = new z({
      width: e,
      height: r,
      minWidth: 1e3,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: ae,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: k(Q, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.exportWindow);
    const s = m.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", i = !s && process.env.NODE_ENV !== "production", l = `?chapterId=${t}`, c = "#export";
    if (i) {
      const d = `${a}/${l}${c}`;
      N.info("Loading export window (dev)", { url: d }), this.exportWindow.loadURL(d).catch((u) => {
        N.error("Failed to load export window (dev)", { url: d, error: u });
      });
    } else {
      const d = k(Q, "../renderer/index.html");
      N.info("Loading export window (prod)", { path: d }), this.exportWindow.loadFile(d, { hash: "export", search: l }).catch((u) => {
        N.error("Failed to load export window (prod)", {
          path: d,
          hash: "export",
          search: l,
          error: u
        });
      });
    }
    return this.exportWindow.on("closed", () => {
      this.exportWindow = null, N.info("Export window closed");
    }), i && this.exportWindow.webContents.openDevTools({ mode: "detach" }), this.exportWindow;
  }
  // ─── World Graph Window ───────────────────────────────────────────────────
  worldGraphWindow = null;
  createWorldGraphWindow() {
    if (this.worldGraphWindow)
      return this.worldGraphWindow.focus(), this.worldGraphWindow;
    const t = 1200, e = 800, r = this.resolveWindowIconPath();
    this.worldGraphWindow = new z({
      width: t,
      height: e,
      minWidth: 1e3,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: ae,
      ...r ? { icon: r } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: k(Q, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.worldGraphWindow);
    const o = m.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", a = !o && process.env.NODE_ENV !== "production", i = "#world-graph";
    if (a) {
      const l = `${s}/${i}`;
      N.info("Loading world graph window (dev)", { url: l }), this.worldGraphWindow.loadURL(l).catch((c) => {
        N.error("Failed to load world graph window (dev)", { url: l, error: c });
      });
    } else {
      const l = k(Q, "../renderer/index.html");
      N.info("Loading world graph window (prod)", { path: l }), this.worldGraphWindow.loadFile(l, { hash: "world-graph" }).catch((c) => {
        N.error("Failed to load world graph window (prod)", {
          path: l,
          hash: "world-graph",
          error: c
        });
      });
    }
    return this.worldGraphWindow.on("closed", () => {
      this.worldGraphWindow = null, N.info("World graph window closed");
    }), a && this.worldGraphWindow.webContents.openDevTools({ mode: "detach" }), this.worldGraphWindow;
  }
  applyMenuBarModeToAllWindows() {
    const t = z.getAllWindows();
    for (const e of t)
      e.isDestroyed() || this.applyMenuBarMode(e);
  }
}
const U = new lo(), si = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: U
}, Symbol.toStringTag, { value: "Module" })), po = () => {
  const n = {
    label: "File",
    submenu: process.platform === "darwin" ? [{ role: "close" }] : [{ role: "close" }, { role: "quit" }]
  };
  return process.platform === "darwin" ? [
    { role: "appMenu" },
    n,
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ] : [n, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }, { role: "help" }];
}, uo = (n) => {
  if (process.platform !== "darwin" || n === "hidden") {
    ne.setApplicationMenu(null);
    return;
  }
  ne.setApplicationMenu(ne.buildFromTemplate(po()));
}, Tt = {
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
class I extends Error {
  code;
  details;
  constructor(t, e, r, o) {
    super(e), this.code = t, this.details = r, o && (this.cause = o);
  }
}
function ai(n) {
  return typeof n == "object" && n !== null && "code" in n && "message" in n;
}
const qe = 4096, ho = process.platform === "win32" ? [b.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], Ve = (n) => process.platform === "win32" ? n.toLowerCase() : n, fo = (n, t) => {
  const e = Ve(b.resolve(n)), r = Ve(b.resolve(t));
  return e === r || e.startsWith(`${r}${b.sep}`);
};
function Eo(n, t) {
  if (typeof n != "string")
    throw new I(
      P.INVALID_INPUT,
      `${t} must be a string`,
      { fieldName: t, receivedType: typeof n }
    );
  const e = n.trim();
  if (!e)
    throw new I(
      P.REQUIRED_FIELD_MISSING,
      `${t} is required`,
      { fieldName: t }
    );
  if (e.length > qe)
    throw new I(
      P.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: e.length, maxLength: qe }
    );
  if (e.includes("\0"))
    throw new I(
      P.INVALID_INPUT,
      `${t} contains invalid null bytes`,
      { fieldName: t }
    );
  return e;
}
function M(n, t = "path") {
  const e = Eo(n, t);
  if (!b.isAbsolute(e))
    throw new I(
      P.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: e }
    );
  const r = b.resolve(e);
  for (const o of ho)
    if (fo(r, o))
      throw new I(
        P.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: r, restrictedRoot: b.resolve(o) }
      );
  return r;
}
const Ao = [
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
], go = [
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
], To = {
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
}, mo = `
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
`, Ke = W("DatabaseSeed");
async function So(n) {
  const t = await n.project.count();
  return t > 0 ? (Ke.info("Seed skipped (projects exist)", { count: t }), !1) : (await n.project.create({
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
  }), Ke.info("Seed completed (default project created)"), !0);
}
const L = W("DatabaseService"), Ue = an(import.meta.url), { PrismaClient: Je } = Ue("@prisma/client"), yo = () => {
  const n = Ue("@prisma/adapter-better-sqlite3");
  if (typeof n == "function") return n;
  if (n && typeof n == "object" && typeof n.PrismaBetterSqlite3 == "function")
    return n.PrismaBetterSqlite3;
  throw new Error("Failed to load Prisma better-sqlite3 adapter");
}, _o = () => {
  const n = Ue("better-sqlite3");
  return typeof n == "function" ? n : n.default;
}, wo = (n) => `"${n.replace(/"/g, '""')}"`, mt = async (n) => {
  try {
    return await It.access(n, me.F_OK), !0;
  } catch {
    return !1;
  }
}, Io = (n) => {
  const t = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return rt.join(n, "node_modules", ".bin", t);
}, Qe = "file:", Po = (n) => {
  if (!n.startsWith(Qe))
    throw new Error("DATABASE_URL must use sqlite file: URL");
  const t = n.slice(Qe.length);
  if (!t || t === ":memory:" || t.startsWith(":memory:?"))
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  const e = t.indexOf("?"), r = e >= 0 ? t.slice(0, e) : t, o = e >= 0 ? t.slice(e + 1) : "", s = M(
    rt.isAbsolute(r) ? r : rt.resolve(process.cwd(), r),
    "DATABASE_URL"
  ), a = o.length > 0 ? `file:${s}?${o}` : `file:${s}`;
  return { dbPath: s, datasourceUrl: a };
}, ie = async (n, t, e) => await new Promise((r, o) => {
  const s = sn(n, t, {
    env: e,
    shell: !1,
    windowsHide: !0
  });
  let a = "", i = "";
  s.stdout?.on("data", (l) => {
    a += l.toString();
  }), s.stderr?.on("data", (l) => {
    i += l.toString();
  }), s.on("error", (l) => {
    o(l);
  }), s.on("close", (l) => {
    if (l === 0) {
      r({ stdout: a, stderr: i });
      return;
    }
    const c = new Error(`Prisma command failed with exit code ${l}`);
    c.code = l, c.stdout = a, c.stderr = i, o(c);
  });
}), Ro = () => (process.env.LUIE_PACKAGED_SCHEMA_MODE ?? "").trim().toLowerCase() === "prisma-migrate" ? "prisma-migrate" : "bootstrap";
class Et {
  static instance;
  prisma = null;
  dbPath = null;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    return Et.instance || (Et.instance = new Et()), Et.instance;
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
      userDataPath: m.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await So(this.prisma);
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
      const e = yo(), r = new e({
        url: t.datasourceUrl
      });
      return new Je({
        adapter: r,
        log: ["error", "warn"]
      });
    } catch (e) {
      if (t.isPackaged)
        throw e;
      return L.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: e,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new Je({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = ro(), e = m.getPath("userData"), r = Fe(), o = process.env.DATABASE_URL, s = !!o;
    let a, i;
    if (s) {
      const l = Po(o ?? "");
      a = l.dbPath, i = l.datasourceUrl;
    } else t ? (a = M(rt.join(e, Rr), "dbPath"), i = `file:${a}`) : (a = M(rt.join(process.cwd(), "prisma", "dev.db"), "dbPath"), i = `file:${a}`);
    return process.env.DATABASE_URL = i, await It.mkdir(e, { recursive: !0 }), await It.mkdir(rt.dirname(a), { recursive: !0 }), await mt(a) || await It.writeFile(a, ""), {
      dbPath: a,
      datasourceUrl: i,
      isPackaged: t,
      isTest: r
    };
  }
  async applySchema(t) {
    const e = await mt(t.dbPath), r = t.isPackaged ? process.resourcesPath : process.cwd(), o = rt.join(r, "prisma", "schema.prisma"), s = Io(r), a = rt.join(r, "prisma", "migrations"), i = await mt(a) && await It.readdir(a, { withFileTypes: !0 }).then((c) => c.some((d) => d.isDirectory())), l = { ...process.env, DATABASE_URL: t.datasourceUrl };
    if (t.isPackaged) {
      await this.applyPackagedSchema(t, {
        dbExists: e,
        schemaPath: o,
        prismaPath: s,
        hasMigrations: i,
        commandEnv: l
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
        await ie(
          s,
          ["db", "push", "--accept-data-loss", `--schema=${o}`],
          l
        ), L.info("Test database push completed successfully");
      } catch (c) {
        const d = c;
        L.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: c,
          stdout: d.stdout,
          stderr: d.stderr,
          dbPath: t.dbPath
        }), this.ensurePackagedSqliteSchema(t.dbPath);
      }
      return;
    }
    L.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: e,
      hasMigrations: i,
      command: "db push"
    });
    try {
      await ie(
        s,
        ["db", "push", "--accept-data-loss", `--schema=${o}`],
        l
      ), L.info("Development database ready");
    } catch (c) {
      const d = c;
      throw L.error("Failed to prepare development database", {
        error: c,
        stdout: d.stdout,
        stderr: d.stderr
      }), c;
    }
  }
  async applyPackagedSchema(t, e) {
    const r = Ro();
    if (r === "bootstrap") {
      L.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: r
      }), this.ensurePackagedSqliteSchema(t.dbPath);
      return;
    }
    const { dbExists: o, schemaPath: s, prismaPath: a, hasMigrations: i, commandEnv: l } = e, c = await mt(s), d = await mt(a);
    if (i && c && d) {
      L.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: o,
        command: "migrate deploy"
      });
      try {
        await ie(a, ["migrate", "deploy", `--schema=${s}`], l), L.info("Production migrations applied successfully");
      } catch (u) {
        const T = u;
        L.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: u,
          stdout: T.stdout,
          stderr: T.stderr,
          schemaMode: r
        });
      }
    } else
      L.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: t.dbPath,
        hasMigrations: i,
        hasSchemaFile: c,
        hasPrismaBinary: d,
        resourcesPath: process.resourcesPath,
        schemaMode: r
      });
    this.ensurePackagedSqliteSchema(t.dbPath);
  }
  ensurePackagedSqliteSchema(t) {
    const e = _o(), r = new e(t);
    try {
      r.pragma("foreign_keys = ON");
      const o = Ao.filter(
        (i) => !this.sqliteTableExists(r, i)
      );
      r.exec(mo);
      const s = [];
      for (const i of go)
        this.sqliteTableExists(r, i.table) && (this.sqliteTableHasColumn(r, i.table, i.column) || (r.exec(i.sql), s.push(`${i.table}.${i.column}`)));
      const a = [];
      for (const [i, l] of Object.entries(To))
        for (const c of l)
          this.sqliteTableHasColumn(r, i, c) || a.push(`${i}.${c}`);
      if (a.length > 0)
        throw new Error(`Packaged SQLite schema verification failed: missing ${a.join(", ")}`);
      (o.length > 0 || s.length > 0) && L.info("Packaged SQLite schema bootstrap applied", {
        dbPath: t,
        createdTables: o,
        patchedColumns: s
      });
    } finally {
      r.close();
    }
  }
  sqliteTableExists(t, e) {
    return !!t.prepare(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    ).get(e)?.found;
  }
  sqliteTableHasColumn(t, e, r) {
    return this.sqliteTableExists(t, e) ? t.prepare(
      `PRAGMA table_info(${wo(e)})`
    ).all().some((a) => a.name === r) : !1;
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
const R = Et.getInstance(), Co = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  db: R
}, Symbol.toStringTag, { value: "Module" })), we = W("BootstrapLifecycle");
let ct = { isReady: !1 }, St = null;
const No = (n) => n instanceof Error && n.message ? n.message : "Failed to initialize database", Do = () => {
  for (const n of z.getAllWindows())
    if (!n.isDestroyed())
      try {
        n.webContents.send(Tt.APP_BOOTSTRAP_STATUS_CHANGED, ct);
      } catch (t) {
        we.warn("Failed to broadcast bootstrap status", t);
      }
}, ce = (n) => {
  ct = n, Do();
}, ii = () => ct, Or = async () => ct.isReady ? ct : St || (ce({ isReady: !1 }), St = R.initialize().then(() => (ce({ isReady: !0 }), we.info("Bootstrap completed"), ct)).catch((n) => {
  const t = No(n);
  return ce({ isReady: !1, error: t }), we.error("Bootstrap failed", n), ct;
}).finally(() => {
  St = null;
}), St), jt = (n) => {
  if (typeof n != "string") return null;
  const t = n.trim();
  if (!t) return null;
  const r = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return r.length > 0 ? r : null;
}, jr = (n) => {
  const t = n.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, Ie = (n) => /^https?:\/\//i.test(n), br = (n) => {
  try {
    const t = new URL(n);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : jr(t.toString());
  } catch {
    return null;
  }
}, Lo = (n) => {
  let t = n.trim();
  if (!t) return null;
  if (Ie(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, te = (n) => {
  if (!n) return null;
  const t = jt(n.url), e = jt(n.anonKey);
  if (!t || !e) return null;
  const r = br(t);
  return r ? {
    url: r,
    anonKey: e
  } : null;
}, Fr = (n) => {
  const t = [], e = jt(n?.url), r = jt(n?.anonKey);
  e || t.push("SUPABASE_URL_REQUIRED"), r || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let o = null;
  return e && (o = br(e), o || t.push("SUPABASE_URL_INVALID")), r && r.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !o || !r ? {
    valid: !1,
    issues: t
  } : {
    valid: !0,
    issues: t,
    normalized: {
      url: o,
      anonKey: r
    }
  };
}, at = (n) => jt(process.env[n]), Oo = "https://qzgyjlbpnxxpspoyibpt.supabase.co", jo = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", bo = () => {
  const n = te({
    url: Oo,
    anonKey: jo
  });
  return n ? {
    ...n,
    source: "legacy"
  } : null;
}, Fo = () => {
  const n = te({
    url: at("SUPABASE_URL") ?? at("SUPADB_URL") ?? void 0,
    anonKey: at("SUPABASE_ANON_KEY") ?? at("SUPABASE_PUBLISHABLE_KEY") ?? at("SUPADATABASE_API") ?? void 0
  });
  return n ? {
    ...n,
    source: "env"
  } : null;
}, Ur = () => {
  const n = g.getRuntimeSupabaseConfig;
  if (typeof n != "function")
    return null;
  const t = n.call(g), e = te(t);
  return e ? {
    ...e,
    source: "runtime"
  } : null;
}, Uo = () => {
  const n = at("SUPADATABASE_API"), t = at("SUPADATABASE_PRJ_ID");
  let e = null, r = null;
  if (n && Ie(n))
    e = jr(n);
  else if (t) {
    const o = Lo(t);
    o && (e = `https://${o}.supabase.co`);
  }
  return n && !Ie(n) && (r = n), !e || !r ? null : {
    url: e,
    anonKey: r,
    source: "legacy"
  };
}, ve = () => Fo() ?? Ur() ?? Uo() ?? bo(), lt = () => {
  const n = ve();
  return n ? {
    url: n.url,
    anonKey: n.anonKey
  } : null;
}, Rt = () => {
  const n = lt();
  if (!n)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return n;
}, vr = () => ve()?.source ?? null, vo = () => te(Ur()) ?? null, Mo = (n) => {
  const t = Fr(n);
  if (!t.valid || !t.normalized)
    return t;
  const e = g.setRuntimeSupabaseConfig;
  return typeof e == "function" && e.call(g, t.normalized), t;
}, Wo = (n) => Fr(n), ci = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: ve,
  getRuntimeSupabaseConfig: vo,
  getSupabaseConfig: lt,
  getSupabaseConfigOrThrow: Rt,
  getSupabaseConfigSource: vr,
  setRuntimeSupabaseConfig: Mo,
  validateRuntimeSupabaseConfig: Wo
}, Symbol.toStringTag, { value: "Module" })), yt = W("SyncAuthService"), ko = "https://eluie.kro.kr/auth/callback", Pe = "v2:safe:", Re = "v2:plain:", zt = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", Mr = (n) => n.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), Bo = () => Mr(dn(48)), $o = (n) => Mr(ln("sha256").update(n).digest()), Mt = () => {
  const n = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return n && n.length > 0 ? n : ko;
}, dt = (n, t = "token") => {
  if (X.isEncryptionAvailable()) {
    const r = X.encryptString(n).toString("base64");
    return `${Pe}${r}`;
  }
  if (t === "token")
    throw new Error(zt);
  const e = Buffer.from(n, "utf-8").toString("base64");
  return `${Re}${e}`;
}, xo = (n, t = "token") => {
  const e = Buffer.from(n, "base64");
  if (X.isEncryptionAvailable())
    try {
      const o = X.decryptString(e);
      return {
        plain: o,
        migratedCipher: dt(o, t)
      };
    } catch {
      const o = e.toString("utf-8");
      return {
        plain: o,
        migratedCipher: dt(o, t)
      };
    }
  if (t === "token")
    throw new Error(zt);
  const r = e.toString("utf-8");
  return {
    plain: r,
    migratedCipher: dt(r, t)
  };
}, Wt = (n, t = "token") => {
  if (n.startsWith(Pe)) {
    if (!X.isEncryptionAvailable())
      throw new Error(zt);
    const e = n.slice(Pe.length), r = Buffer.from(e, "base64");
    try {
      return {
        plain: X.decryptString(r)
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
  if (n.startsWith(Re)) {
    if (t === "token" && !X.isEncryptionAvailable())
      throw new Error(zt);
    const e = n.slice(Re.length), o = Buffer.from(e, "base64").toString("utf-8"), s = X.isEncryptionAvailable() ? dt(o, t) : void 0;
    return {
      plain: o,
      migratedCipher: s
    };
  }
  return xo(n, t);
};
class Go {
  pendingPkce = null;
  pendingTtlMs = 600 * 1e3;
  clearPendingPkce() {
    this.pendingPkce = null, g.clearPendingSyncAuth();
  }
  storePendingPkce(t) {
    this.pendingPkce = t, g.setPendingSyncAuth({
      state: t.state,
      verifierCipher: dt(t.verifier, "pending"),
      createdAt: new Date(t.createdAt).toISOString(),
      redirectUri: t.redirectUri
    });
  }
  getPendingPkceFromSettings() {
    const t = g.getSyncSettings();
    if (!t.pendingAuthVerifierCipher || !t.pendingAuthCreatedAt)
      return null;
    const e = Date.parse(t.pendingAuthCreatedAt);
    if (!Number.isFinite(e))
      return this.clearPendingPkce(), null;
    try {
      const r = Wt(t.pendingAuthVerifierCipher, "pending");
      return r.migratedCipher && g.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: r.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: r.plain,
        createdAt: e,
        redirectUri: t.pendingAuthRedirectUri || Mt()
      };
    } catch (r) {
      return yt.warn("Failed to decode pending OAuth verifier", { error: r }), this.clearPendingPkce(), null;
    }
  }
  getPendingPkce() {
    if (this.pendingPkce) {
      if (!this.pendingPkce.state) {
        const e = g.getSyncSettings().pendingAuthState;
        e && (this.pendingPkce.state = e);
      }
      if (!this.pendingPkce.redirectUri) {
        const e = g.getSyncSettings().pendingAuthRedirectUri;
        this.pendingPkce.redirectUri = e || Mt();
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
      throw yt.info("OAuth flow already in progress", { ageMs: i }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: e } = Rt(), r = Bo(), o = $o(r), s = Mt();
    this.storePendingPkce({
      verifier: r,
      createdAt: Date.now(),
      redirectUri: s
    });
    const a = new URL("/auth/v1/authorize", e);
    a.searchParams.set("provider", "google"), a.searchParams.set("redirect_to", s), a.searchParams.set("code_challenge", o), a.searchParams.set("code_challenge_method", "s256"), yt.info("Opening OAuth authorize URL", {
      authorizeBase: `${a.origin}${a.pathname}`,
      redirectUri: s,
      authorizeUrl: a.toString()
    }), await tn.openExternal(a.toString());
  }
  async completeOAuthCallback(t) {
    const e = this.getPendingPkce();
    if (!e)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - e.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const r = new URL(t), o = r.searchParams, s = r.hash.startsWith("#") ? r.hash.slice(1) : r.hash, a = new URLSearchParams(s), i = (h) => o.get(h) ?? a.get(h), l = i("state"), c = i("code"), d = i("error"), u = i("error_code"), T = i("error_description");
    if (d) {
      this.clearPendingPkce();
      const h = u ?? d, E = T ?? d;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${h}:${E}`
      );
    }
    if (!c)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_CODE_MISSING");
    if (e.state && (!l || l !== e.state))
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_STATE_MISMATCH");
    const _ = await this.exchangeCodeForSession(
      c,
      e.verifier,
      e.redirectUri || Mt()
    );
    return this.clearPendingPkce(), _;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const e = Wt(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(e);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const e = Wt(t.accessTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return yt.warn("Failed to decrypt sync access token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  getRefreshToken(t) {
    if (!t.refreshTokenCipher)
      return { token: null };
    try {
      const e = Wt(t.refreshTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return yt.warn("Failed to decrypt sync refresh token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  async exchangeCodeForSession(t, e, r) {
    const { url: o, anonKey: s } = Rt(), a = new URL("/auth/v1/token", o);
    a.searchParams.set("grant_type", "pkce");
    const i = await fetch(a, {
      method: "POST",
      headers: {
        apikey: s,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_code: t,
        code_verifier: e,
        redirect_uri: r
      })
    });
    if (!i.ok) {
      const c = await i.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${i.status}:${c}`);
    }
    const l = await i.json();
    return this.toSyncSession(l);
  }
  async exchangeRefreshToken(t) {
    const { url: e, anonKey: r } = Rt(), o = new URL("/auth/v1/token", e);
    o.searchParams.set("grant_type", "refresh_token");
    const s = await fetch(o, {
      method: "POST",
      headers: {
        apikey: r,
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
    const e = t.access_token, r = t.refresh_token, o = t.user?.id;
    if (!e || !r || !o)
      throw new Error("SYNC_AUTH_INVALID_SESSION");
    return {
      provider: "google",
      userId: o,
      email: t.user?.email,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1e3).toISOString() : void 0,
      accessTokenCipher: dt(e),
      refreshTokenCipher: dt(r)
    };
  }
}
const B = new Go(), Ho = W("StartupReadinessService"), de = "startup:wizard-completed", Wr = () => (/* @__PURE__ */ new Date()).toISOString(), D = (n, t, e, r = !0) => ({
  key: n,
  ok: t,
  blocking: r,
  detail: e,
  checkedAt: Wr()
});
class zo {
  events = new cn();
  async getReadiness() {
    const t = await this.runChecks(), e = t.filter((s) => s.blocking && !s.ok).map((s) => s.key), r = g.getStartupSettings().completedAt;
    return {
      mustRunWizard: !r || e.length > 0,
      checks: t,
      reasons: e,
      completedAt: r
    };
  }
  async completeWizard() {
    const t = await this.getReadiness();
    if (t.reasons.length > 0)
      return t;
    g.setStartupCompletedAt(Wr());
    const e = await this.getReadiness();
    return this.events.emit(de, e), e;
  }
  onWizardCompleted(t) {
    return this.events.on(de, t), () => {
      this.events.off(de, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = X.isEncryptionAvailable();
      return D(
        "osPermission",
        t,
        t ? "safeStorage available" : "safeStorage encryption is unavailable on this OS session"
      );
    } catch (t) {
      return D("osPermission", !1, this.toErrorMessage(t));
    }
  }
  async checkDataDirRW() {
    const t = m.getPath("userData"), e = b.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await Be(t, { recursive: !0 }), await $e(e, "ok", { encoding: "utf8" }), D("dataDirRW", !0, t);
    } catch (r) {
      return D(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(r)}`
      );
    } finally {
      await xe(e).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = m.getPath("documents"), e = b.join(t, Nr), r = b.join(e, ".startup-probe");
    try {
      return await Be(e, { recursive: !0 }), await Tr(e, me.R_OK | me.W_OK), await $e(r, "ok", { encoding: "utf8" }), D("defaultLuiePath", !0, e);
    } catch (o) {
      return D(
        "defaultLuiePath",
        !1,
        `${e}: ${this.toErrorMessage(o)}`
      );
    } finally {
      await xe(r).catch(() => {
      });
    }
  }
  async checkSqliteConnect() {
    try {
      return await R.initialize(), R.getClient(), D("sqliteConnect", !0, "SQLite connection ready");
    } catch (t) {
      return D("sqliteConnect", !1, this.toErrorMessage(t));
    }
  }
  async checkSqliteWal() {
    try {
      await R.initialize();
      const t = R.getClient();
      return typeof t.$executeRawUnsafe == "function" && await t.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), D("sqliteWal", !0, "WAL mode enabled");
    } catch (t) {
      return D("sqliteWal", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseRuntimeConfig() {
    try {
      const t = lt(), e = vr();
      return t ? D(
        "supabaseRuntimeConfig",
        !0,
        e ? `resolved from ${e}` : "resolved"
      ) : D(
        "supabaseRuntimeConfig",
        !1,
        "Runtime Supabase configuration is not completed"
      );
    } catch (t) {
      return D("supabaseRuntimeConfig", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseSession() {
    try {
      const t = g.getSyncSettings();
      if (!t.connected || !t.userId)
        return D(
          "supabaseSession",
          !1,
          "Sync login is not connected yet (non-blocking)",
          !1
        );
      const e = B.getAccessToken(t), r = B.getRefreshToken(t);
      if (!(!!e.token || !!r.token))
        return D(
          "supabaseSession",
          !1,
          e.errorCode ?? r.errorCode ?? "No usable JWT token",
          !1
        );
      if (!e.token)
        return D(
          "supabaseSession",
          !1,
          "Access token is unavailable. Reconnect sync login.",
          !1
        );
      const s = lt();
      if (!s)
        return D(
          "supabaseSession",
          !1,
          "Runtime Supabase configuration is not completed",
          !1
        );
      const a = await fetch(`${s.url}/functions/v1/luieEnv`, {
        method: "GET",
        headers: {
          apikey: s.anonKey,
          Authorization: `Bearer ${e.token}`
        }
      });
      if (!a.ok)
        return D(
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
      return i?.ok ? D(
        "supabaseSession",
        !0,
        i.userId ?? t.email ?? t.userId,
        !1
      ) : D(
        "supabaseSession",
        !1,
        "Edge auth health response is invalid",
        !1
      );
    } catch (t) {
      return Ho.warn("Startup session check failed", { error: t }), D("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const le = new zo(), Ze = 1500, Yo = 8e3, Xo = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), qo = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), Vo = (n) => n ? process.env.LUIE_DEV_CSP === "1" ? qo() : null : Xo(), Ko = (n) => n.startsWith("file://"), Jo = async (n, t, e) => {
  n.error("Renderer process crashed", {
    killed: e,
    webContentsId: t.id
  });
  try {
    const { autoSaveManager: o } = await import("./autoSaveManager-_jjQRUWx.js").then((s) => s.d);
    await o.flushCritical(), n.info("Emergency save completed after crash");
  } catch (o) {
    n.error("Failed to save during crash recovery", o);
  }
  const r = U.getMainWindow();
  r && !r.isDestroyed() && ((await Te.showMessageBox(r, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (U.closeMainWindow(), setTimeout(() => {
    U.createMainWindow();
  }, 500)) : m.quit());
}, Qo = async (n) => {
  const t = Date.now(), e = await Or();
  if (!e.isReady) {
    n.error("App bootstrap did not complete", e);
    return;
  }
  try {
    const { autoSaveManager: r } = await import("./autoSaveManager-_jjQRUWx.js").then((s) => s.d);
    await r.flushMirrorsToSnapshots("startup-recovery");
    const { snapshotService: o } = await import("./snapshotService-CkktZTOV.js").then((s) => s.a);
    o.pruneSnapshotsAllProjects(), o.cleanupOrphanArtifacts("startup");
  } catch (r) {
    n.warn("Snapshot recovery/pruning skipped", r);
  }
  try {
    const { projectService: r } = await Promise.resolve().then(() => Vr);
    await r.reconcileProjectPathDuplicates();
  } catch (r) {
    n.warn("Project path duplicate reconciliation skipped", r);
  }
  try {
    const { entityRelationService: r } = await import("./entityRelationService-CkAl1PzR.js");
    await r.cleanupOrphanRelationsAcrossProjects({ dryRun: !0 }), await r.cleanupOrphanRelationsAcrossProjects({ dryRun: !1 });
  } catch (r) {
    n.warn("Entity relation orphan cleanup skipped", r);
  }
  n.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - t
  });
}, Zo = (n, t = {}) => {
  const e = t.startupStartedAtMs ?? Date.now();
  m.whenReady().then(async () => {
    n.info("App is ready", {
      startupElapsedMs: Date.now() - e
    });
    const r = eo(), o = Vo(r);
    let s = !1, a = !1, i = !1, l = null;
    const c = (E) => {
      if (!s && (s = !0, U.showMainWindow(), n.info("Startup checkpoint: renderer ready", {
        reason: E,
        startupElapsedMs: Date.now() - e
      }), n.info("Startup checkpoint: main window shown", {
        reason: E,
        startupElapsedMs: Date.now() - e
      }), !!t.onFirstRendererReady))
        try {
          t.onFirstRendererReady();
        } catch (A) {
          n.warn("Startup hook failed: onFirstRendererReady", A);
        }
    }, d = (E) => {
      a || (a = !0, n.info("Deferred startup maintenance scheduled", {
        reason: E,
        delayMs: Ze
      }), setTimeout(() => {
        Qo(n);
      }, Ze));
    }, u = (E) => {
      if (i) return;
      i = !0, n.info("Starting main window flow", {
        reason: E,
        startupElapsedMs: Date.now() - e
      }), U.createMainWindow({ deferShow: !0 }), n.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - e
      });
      const A = Date.now();
      Or().then((S) => {
        n.info("Startup checkpoint: bootstrap ready", {
          isReady: S.isReady,
          bootstrapElapsedMs: Date.now() - A,
          startupElapsedMs: Date.now() - e
        }), S.isReady || n.error("App bootstrap did not complete", S);
      }).catch((S) => {
        n.error("App bootstrap did not complete", S);
      }), l && clearTimeout(l), l = setTimeout(() => {
        s || c("fallback-timeout"), d("fallback-timeout");
      }, Yo);
    };
    r && We.defaultSession.webRequest.onBeforeSendHeaders((E, A) => {
      A({
        requestHeaders: {
          ...E.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), We.defaultSession.webRequest.onHeadersReceived((E, A) => {
      const S = {
        ...E.responseHeaders
      };
      r && (S["Access-Control-Allow-Origin"] = ["*"], S["Access-Control-Allow-Headers"] = ["*"], S["Access-Control-Allow-Methods"] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]), o && !Ko(E.url) && (S["Content-Security-Policy"] = [o]), A({ responseHeaders: S });
    }), m.on("web-contents-created", (E, A) => {
      A.on(
        "did-fail-load",
        (S, C, f, J, re) => {
          n.error("Renderer failed to load", {
            errorCode: C,
            errorDescription: f,
            validatedURL: J,
            isMainFrame: re,
            startupElapsedMs: Date.now() - e
          });
        }
      ), A.on("did-finish-load", () => {
        const S = Date.now() - e;
        n.info("Renderer finished load", {
          url: A.getURL(),
          startupElapsedMs: S
        }), A.getType() === "window" && U.isMainWindowWebContentsId(A.id) && (c("did-finish-load"), d("did-finish-load"));
      }), A.on("console-message", (S) => {
        const { level: C, message: f, lineNumber: J, sourceId: re } = S;
        (C === "error" ? 3 : C === "warning" ? 2 : C === "info" ? 1 : 0) < 2 || n.warn("Renderer console message", {
          level: C,
          message: f,
          line: J,
          sourceId: re
        });
      }), A.on("render-process-gone", (S, C) => {
        Jo(n, A, C.reason === "killed");
      });
    });
    const T = Date.now(), { registerIPCHandlers: _ } = await import("./index-xhnrOJKx.js");
    _(), n.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - T,
      startupElapsedMs: Date.now() - e
    }), uo(g.getMenuBarMode());
    const h = await le.getReadiness();
    n.info("Startup readiness evaluated", {
      mustRunWizard: h.mustRunWizard,
      reasons: h.reasons,
      completedAt: h.completedAt
    }), h.mustRunWizard ? (U.createStartupWizardWindow(), n.info("Startup wizard requested before main window", {
      reasons: h.reasons
    })) : u("readiness-pass"), le.onWizardCompleted((E) => {
      n.info("Startup wizard completion received", {
        mustRunWizard: E.mustRunWizard,
        reasons: E.reasons
      }), !E.mustRunWizard && (U.closeStartupWizardWindow(), u("wizard-complete"));
    }), m.on("activate", () => {
      z.getAllWindows().length === 0 && le.getReadiness().then((E) => {
        if (E.mustRunWizard) {
          U.createStartupWizardWindow();
          return;
        }
        u("activate");
      });
    });
  });
}, ts = "crash-reports", tr = 100;
let er = !1;
const pe = (n) => n.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), Ce = (n, t = 0) => {
  if (n == null) return n;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof n == "string" || typeof n == "number" || typeof n == "boolean")
    return typeof n == "string" ? pe(n) : n;
  if (typeof n == "bigint" || typeof n == "symbol") return n.toString();
  if (typeof n == "function") return "[Function]";
  if (n instanceof Error)
    return {
      name: n.name,
      message: pe(n.message),
      stack: n.stack ? pe(n.stack) : void 0
    };
  if (Array.isArray(n))
    return n.slice(0, 50).map((e) => Ce(e, t + 1));
  if (typeof n == "object") {
    const r = Object.entries(n).slice(0, 100), o = {};
    for (const [s, a] of r)
      o[s] = Ce(a, t + 1);
    return o;
  }
  return String(n);
}, es = () => b.join(m.getPath("userData"), ts), rs = async (n, t) => {
  const e = await At.readdir(n, { withFileTypes: !0 }), r = await Promise.all(
    e.filter((s) => s.isFile() && s.name.endsWith(".json")).map(async (s) => {
      const a = b.join(n, s.name), i = await At.stat(a);
      return { fullPath: a, mtimeMs: i.mtimeMs };
    })
  );
  if (r.length <= tr) return;
  r.sort((s, a) => a.mtimeMs - s.mtimeMs);
  const o = r.slice(tr);
  await Promise.all(
    o.map(async (s) => {
      try {
        await At.rm(s.fullPath, { force: !0 });
      } catch (a) {
        t.warn("Failed to remove stale crash report", { error: a, path: s.fullPath });
      }
    })
  );
}, ns = async (n, t, e) => {
  const r = es();
  await At.mkdir(r, { recursive: !0 });
  const o = (/* @__PURE__ */ new Date()).toISOString(), s = Y(), a = `${o.replace(/[:.]/g, "-")}-${t}-${s}.json`, i = b.join(r, a), l = `${i}.tmp`, c = {
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
    payload: Ce(e)
  };
  await At.writeFile(l, JSON.stringify(c, null, 2), "utf-8"), await At.rename(l, i), await rs(r, n);
}, os = (n, t) => {
  const e = t ?? {}, r = n ?? {};
  return {
    webContentsId: typeof r.id == "number" ? r.id : void 0,
    reason: e.reason,
    exitCode: e.exitCode
  };
}, ss = (n) => {
  const t = n ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, as = (n) => {
  if (er) return;
  er = !0;
  const t = (e, r) => {
    ns(n, e, r).catch((o) => {
      n.warn("Failed to persist crash report", { error: o, kind: e });
    });
  };
  process.on("uncaughtExceptionMonitor", (e, r) => {
    t("uncaught-exception", {
      origin: r,
      error: e
    });
  }), process.on("unhandledRejection", (e) => {
    t("unhandled-rejection", {
      reason: e
    });
  }), m.on("render-process-gone", (e, r, o) => {
    t("render-process-gone", os(r, o));
  }), m.on("child-process-gone", (e, r) => {
    t("child-process-gone", ss(r));
  });
}, Yt = 5 * 1024 * 1024, bt = (n) => V.posix.normalize(n.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), Xt = (n) => {
  const t = bt(n);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !V.isAbsolute(t);
}, Ft = (n) => n.toLowerCase().endsWith(G) ? n : `${n}${G}`, rr = (n) => process.platform === "win32" ? n.toLowerCase() : n, is = (n, t) => {
  const e = rr(V.resolve(n)), r = rr(V.resolve(t));
  return e === r || e.startsWith(`${r}${V.sep}`);
}, kr = async (n, t, e) => {
  const r = bt(t);
  if (!r || !Xt(r))
    throw new Error("INVALID_RELATIVE_PATH");
  let o = !1, s = null;
  return await new Promise((a, i) => {
    un.open(n, { lazyEntries: !0 }, (l, c) => {
      if (l || !c) {
        i(l ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      c.on("entry", (d) => {
        const u = bt(d.fileName);
        if (!u || !Xt(u)) {
          e?.error("Unsafe zip entry skipped", { entry: d.fileName, zipPath: n }), c.readEntry();
          return;
        }
        if (u !== r) {
          c.readEntry();
          return;
        }
        if (d.fileName.endsWith("/")) {
          o = !0, s = null, c.close(), a();
          return;
        }
        c.openReadStream(d, (T, _) => {
          if (T || !_) {
            i(T ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          o = !0;
          const h = [], E = _;
          let A = 0;
          E.on("data", (S) => {
            if (A += S.length, A > Yt) {
              E.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${u}:${Yt}`
                )
              );
              return;
            }
            h.push(S);
          }), E.on("end", () => {
            s = Buffer.concat(h).toString("utf-8"), c.close(), a();
          }), E.on("error", i);
        });
      }), c.on("end", () => {
        o || a();
      }), c.on("error", i), c.readEntry();
    });
  }), s;
}, H = async (n, t, e) => {
  const r = Ft(n), o = bt(t);
  if (!o || !Xt(o))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const s = await $.stat(r);
    if (s.isDirectory()) {
      const a = await $.realpath(r), i = V.resolve(r, o);
      try {
        const l = await $.realpath(i);
        if (!is(l, a))
          throw new Error("INVALID_RELATIVE_PATH");
        const c = await $.stat(l);
        if (c.isDirectory())
          return null;
        if (c.size > Yt)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${o}:${Yt}`
          );
        return await $.readFile(l, "utf-8");
      } catch (l) {
        if (l?.code === "ENOENT") return null;
        throw l;
      }
    }
    if (s.isFile())
      return await kr(r, o, e);
  } catch (s) {
    if (s?.code === "ENOENT") return null;
    throw s;
  }
  return null;
}, Br = (n) => {
  if (typeof n == "number") return n === Dt;
  if (typeof n == "string" && n.trim().length > 0) {
    const t = Number(n);
    return Number.isFinite(t) && t === Dt;
  }
  return !1;
}, cs = (n) => {
  try {
    const t = JSON.parse(n);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, ds = (n) => n && typeof n == "object" && !Array.isArray(n) ? n : {}, ls = (n, t) => {
  if (n.format !== Ct)
    throw new I(
      P.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: n.format }
    );
  if (n.container !== Nt)
    throw new I(
      P.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: n.container }
    );
  if (!Br(n.version))
    throw new I(
      P.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: n.version }
    );
}, ps = (n, t) => {
  const e = ds(n), r = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), o = t.createdAtFallback ?? r;
  if (Object.prototype.hasOwnProperty.call(e, "format") && e.format !== Ct)
    throw new I(
      P.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: e.format }
    );
  if (Object.prototype.hasOwnProperty.call(e, "container") && e.container !== Nt)
    throw new I(
      P.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: e.container }
    );
  if (Object.prototype.hasOwnProperty.call(e, "version") && !Br(e.version))
    throw new I(
      P.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: e.version }
    );
  const s = typeof e.title == "string" && e.title.trim().length > 0 ? e.title : t.titleFallback, a = typeof e.createdAt == "string" && e.createdAt.length > 0 ? e.createdAt : o, i = typeof e.updatedAt == "string" && e.updatedAt.length > 0 ? e.updatedAt : r;
  return {
    ...e,
    format: Ct,
    container: Nt,
    version: Dt,
    title: s,
    createdAt: a,
    updatedAt: i
  };
}, us = async (n, t) => {
  const e = await kr(n, Vt, t);
  if (!e)
    throw new I(
      P.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: n }
    );
  const r = cs(e);
  if (!r)
    throw new I(
      P.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: n }
    );
  ls(r, { source: n });
}, hs = ".tmp", kt = /* @__PURE__ */ new Map(), fs = async (n) => {
  const t = V.dirname(n);
  await $.mkdir(t, { recursive: !0 });
}, di = async (n) => {
  try {
    return await $.access(n), !0;
  } catch {
    return !1;
  }
}, Es = async (n, t) => {
  const e = V.resolve(Ft(n)), o = (kt.get(e) ?? Promise.resolve()).catch(() => {
  }).then(t), s = o.then(
    () => {
    },
    () => {
    }
  );
  kt.set(e, s);
  try {
    return await o;
  } finally {
    kt.get(e) === s && kt.delete(e);
  }
}, As = async (n, t) => {
  const e = new pn.ZipFile(), r = rn.createWriteStream(n), o = new Promise((s, a) => {
    r.on("close", () => s()), r.on("error", a), e.outputStream.on("error", a);
  });
  e.outputStream.pipe(r), await t(e), e.end(), await o;
}, gs = async (n, t, e) => {
  const r = `${t}.bak-${Date.now()}`;
  let o = !1;
  try {
    await $.rename(n, t);
    return;
  } catch (s) {
    const a = s;
    if (a?.code !== "EEXIST" && a?.code !== "ENOTEMPTY" && a?.code !== "EPERM" && a?.code !== "EISDIR")
      throw s;
  }
  try {
    await $.rename(t, r), o = !0, await $.rename(n, t), await $.rm(r, { force: !0, recursive: !0 });
  } catch (s) {
    if (e.error("Atomic replace failed", { error: s, targetPath: t }), o)
      try {
        await $.rename(r, t);
      } catch (a) {
        e.error("Failed to restore backup", { restoreError: a, targetPath: t, backupPath: r });
      }
    throw s;
  }
}, Ts = () => [
  { name: `${gt}/`, isDirectory: !0 },
  { name: `${F}/`, isDirectory: !0 },
  { name: `${Lt}/`, isDirectory: !0 },
  { name: `${Jn}/`, isDirectory: !0 }
], li = (n) => ({
  name: Vt,
  content: JSON.stringify(n ?? {}, null, 2)
}), ms = async (n, t) => {
  for (const e of t) {
    const r = bt(e.name);
    if (!r || !Xt(r))
      throw new Error("INVALID_ZIP_ENTRY_PATH");
    if (e.isDirectory) {
      n.addEmptyDirectory(r.endsWith("/") ? r : `${r}/`);
      continue;
    }
    if (e.fromFilePath) {
      n.addFile(e.fromFilePath, r);
      continue;
    }
    const o = Buffer.from(e.content ?? "", "utf-8");
    n.addBuffer(o, r);
  }
}, $r = async (n, t, e) => {
  const r = Ft(n);
  return await Es(r, async () => {
    await fs(r);
    const o = (/* @__PURE__ */ new Date()).toISOString(), s = ps(t.meta, {
      titleFallback: V.basename(r, G),
      nowIso: o,
      createdAtFallback: o
    }), a = `${r}${hs}-${Date.now()}`, i = [
      ...Ts(),
      {
        name: Vt,
        content: JSON.stringify(s, null, 2)
      },
      {
        name: `${F}/${Dr}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${F}/${Lr}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${F}/${Ot}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${F}/${Kt}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${F}/${Jt}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${F}/${Qt}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${F}/${be}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${F}/${Zt}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${Lt}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const l of t.chapters ?? [])
      l.id && i.push({
        name: `${gt}/${l.id}${Ht}`,
        content: l.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const l of t.snapshots)
        l.id && i.push({
          name: `${Lt}/${l.id}.snap`,
          content: JSON.stringify(l, null, 2)
        });
    await As(a, (l) => ms(l, i)), await us(a, e), await gs(a, r, e);
  });
}, nr = (n, t = "") => {
  const e = n.trim();
  return e ? e.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, xr = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), Ss = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), j = (n) => !!(n && typeof n == "object" && !Array.isArray(n)), or = (n) => {
  if (!n) return null;
  try {
    return JSON.parse(n);
  } catch {
    return null;
  }
}, ys = (n) => {
  if (j(n))
    return typeof n.updatedAt == "string" ? n.updatedAt : void 0;
}, _s = (n, t = "pen") => typeof n == "string" && Ss.has(n) ? n : t, ws = (n, t = "mountain") => typeof n == "string" && xr.has(n) ? n : t, Gr = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!j(r)) continue;
    const o = r.type;
    if (o !== "path" && o !== "text" && o !== "icon") continue;
    const s = {
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `path-${e}`,
      type: o,
      color: typeof r.color == "string" ? r.color : "#000000"
    };
    typeof r.d == "string" && (s.d = r.d), typeof r.width == "number" && (s.width = r.width), typeof r.x == "number" && (s.x = r.x), typeof r.y == "number" && (s.y = r.y), typeof r.text == "string" && (s.text = r.text), typeof r.icon == "string" && xr.has(r.icon) && (s.icon = r.icon), t.push(s);
  }
  return t;
}, Hr = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!j(r)) continue;
    const o = r.position;
    if (!j(o)) continue;
    const s = j(r.data) ? r.data : void 0;
    t.push({
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `node-${e}`,
      type: typeof r.type == "string" ? r.type : void 0,
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
}, zr = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!j(r)) continue;
    const o = typeof r.source == "string" ? r.source : "", s = typeof r.target == "string" ? r.target : "";
    !o || !s || t.push({
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `edge-${e}`,
      source: o,
      target: s,
      type: typeof r.type == "string" ? r.type : void 0
    });
  }
  return t;
}, Is = (n, t, e) => j(n) ? {
  id: typeof n.id == "string" && n.id.length > 0 ? n.id : `memo-${t}`,
  title: typeof n.title == "string" ? n.title : "",
  content: typeof n.content == "string" ? n.content : "",
  tags: Array.isArray(n.tags) ? n.tags.filter((r) => typeof r == "string") : [],
  updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : e()
} : null, Yr = (n, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(n) ? n.map((e, r) => Is(e, r, t)).filter((e) => e !== null) : [], sr = (n, t = () => (/* @__PURE__ */ new Date()).toISOString()) => j(n) ? {
  memos: Yr(n.memos, t),
  updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
} : { memos: [] }, Ps = () => ({
  timer: null,
  inFlight: null,
  dirty: !1
});
class Rs {
  constructor(t, e, r) {
    this.debounceMs = t, this.runExport = e, this.logger = r;
  }
  states = /* @__PURE__ */ new Map();
  getOrCreate(t) {
    const e = this.states.get(t);
    if (e) return e;
    const r = Ps();
    return this.states.set(t, r), r;
  }
  cleanupIfIdle(t) {
    const e = this.states.get(t);
    e && (e.timer || e.inFlight || e.dirty || this.states.delete(t));
  }
  clearTimer(t) {
    t.timer && (clearTimeout(t.timer), t.timer = null);
  }
  schedule(t, e) {
    const r = this.getOrCreate(t);
    r.dirty = !0, this.clearTimer(r), r.timer = setTimeout(() => {
      r.timer = null, this.runLoop(t, e).catch((o) => {
        this.logger.error("Failed to export project package", { projectId: t, reason: e, error: o });
      });
    }, this.debounceMs);
  }
  async runLoop(t, e) {
    const r = this.getOrCreate(t);
    if (r.inFlight)
      return r.dirty = !0, r.inFlight;
    const s = (async () => {
      for (; r.dirty; )
        r.dirty = !1, await this.runExport(t);
    })().catch((a) => {
      throw this.logger.error("Failed to run package export", { projectId: t, reason: e, error: a }), a;
    }).finally(() => {
      r.inFlight = null, this.cleanupIfIdle(t);
    });
    return r.inFlight = s, s;
  }
  async flush(t = 8e3) {
    const e = Array.from(this.states.entries()).filter(([, l]) => !!(l.timer || l.inFlight || l.dirty)).map(([l]) => l);
    if (e.length === 0)
      return { total: 0, flushed: 0, failed: 0, timedOut: !1 };
    for (const l of e) {
      const c = this.getOrCreate(l);
      c.dirty = !0, this.clearTimer(c);
    }
    let r = 0, o = 0;
    const s = e.map(async (l) => {
      try {
        await this.runLoop(l, "flush"), r += 1;
      } catch (c) {
        o += 1, this.logger.error("Failed to flush pending package export", { projectId: l, error: c });
      }
    }), a = Promise.all(s).then(() => !0), i = await new Promise((l) => {
      const c = setTimeout(() => l(!0), t);
      a.then(() => {
        clearTimeout(c), l(!1);
      });
    });
    return {
      total: e.length,
      flushed: r,
      failed: o,
      timedOut: i
    };
  }
}
const w = W("ProjectService"), Cs = p.object({
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
}).passthrough(), Ns = p.object({
  characters: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), Ds = p.object({
  terms: p.array(p.record(p.string(), p.unknown())).optional()
}).passthrough(), ue = p.object({
  synopsis: p.string().optional(),
  status: p.enum(["draft", "working", "locked"]).optional(),
  genre: p.string().optional(),
  targetAudience: p.string().optional(),
  logline: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), ar = p.object({
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
}).passthrough(), ir = p.object({
  paths: p.array(p.record(p.string(), p.unknown())).optional(),
  tool: p.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: p.enum(["mountain", "castle", "village"]).optional(),
  color: p.string().optional(),
  lineWidth: p.number().optional(),
  updatedAt: p.string().optional()
}).passthrough(), cr = p.object({
  nodes: p.array(p.record(p.string(), p.unknown())).optional(),
  edges: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), dr = p.object({
  memos: p.array(p.record(p.string(), p.unknown())).optional(),
  updatedAt: p.string().optional()
}).passthrough(), Ls = p.object({
  id: p.string(),
  entityType: p.string(),
  subType: p.string().optional(),
  name: p.string(),
  description: p.string().optional().nullable(),
  firstAppearance: p.string().optional().nullable(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  positionX: p.number().optional(),
  positionY: p.number().optional()
}).passthrough(), Os = p.object({
  id: p.string(),
  sourceId: p.string(),
  sourceType: p.string(),
  targetId: p.string(),
  targetType: p.string(),
  relation: p.string(),
  attributes: p.record(p.string(), p.unknown()).optional().nullable(),
  createdAt: p.string().optional(),
  updatedAt: p.string().optional()
}).passthrough(), js = p.object({
  nodes: p.array(Ls).optional(),
  edges: p.array(Os).optional(),
  updatedAt: p.string().optional()
}).passthrough(), bs = p.object({
  id: p.string(),
  projectId: p.string().optional(),
  chapterId: p.string().optional().nullable(),
  content: p.string().optional(),
  description: p.string().optional().nullable(),
  createdAt: p.string().optional()
}).passthrough(), Fs = p.object({
  snapshots: p.array(bs).optional()
}).passthrough(), _t = (n, t, e) => {
  if (typeof n != "string" || n.trim().length === 0)
    return null;
  let r;
  try {
    r = JSON.parse(n);
  } catch (s) {
    throw new I(
      P.VALIDATION_FAILED,
      `Invalid ${e.label} JSON in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath
      },
      s
    );
  }
  const o = t.safeParse(r);
  if (!o.success)
    throw new I(
      P.VALIDATION_FAILED,
      `Invalid ${e.label} format in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath,
        issues: o.error.issues
      }
    );
  return o.data;
}, Us = (n, t, e) => {
  if (typeof n != "string" || n.trim().length === 0)
    return t.safeParse(null);
  let r;
  try {
    r = JSON.parse(n);
  } catch (s) {
    return w.warn("Invalid .luie world JSON; using default during export", {
      packagePath: e.packagePath,
      entryPath: e.entryPath,
      label: e.label,
      error: s
    }), t.safeParse(null);
  }
  const o = t.safeParse(r);
  return o.success || w.warn("Invalid .luie world format; using default during export", {
    packagePath: e.packagePath,
    entryPath: e.entryPath,
    label: e.label,
    issues: o.error.issues
  }), o;
}, vs = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], Ms = ["Place", "Concept", "Rule", "Item"], Ws = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], he = (n) => typeof n == "string" && vs.includes(n), fe = (n) => typeof n == "string" && Ms.includes(n), ks = (n) => typeof n == "string" && Ws.includes(n);
class Xr {
  exportQueue = new Rs(
    Fn,
    async (t) => {
      await this.exportProjectPackage(t);
    },
    w
  );
  normalizeProjectPath(t) {
    if (typeof t != "string") return;
    const e = t.trim();
    if (e.length !== 0)
      return M(e, "projectPath");
  }
  normalizeLuiePackagePath(t, e) {
    return Ft(M(t, e));
  }
  toProjectPathKey(t) {
    const e = pt.resolve(t);
    return process.platform === "win32" ? e.toLowerCase() : e;
  }
  async findProjectPathConflict(t, e) {
    const r = this.toProjectPathKey(t), o = await R.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: { id: !0, projectPath: !0 }
    });
    for (const s of o)
      if (!(typeof s.projectPath != "string" || s.projectPath.length === 0) && !(e && String(s.id) === e))
        try {
          const a = M(s.projectPath, "projectPath");
          if (this.toProjectPathKey(a) === r)
            return { id: String(s.id) };
        } catch {
          continue;
        }
    return null;
  }
  async reconcileProjectPathDuplicates() {
    const t = await R.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: {
        id: !0,
        projectPath: !0,
        updatedAt: !0
      }
    }), e = /* @__PURE__ */ new Map();
    for (const s of t)
      if (!(typeof s.projectPath != "string" || s.projectPath.length === 0))
        try {
          const a = M(s.projectPath, "projectPath"), i = this.toProjectPathKey(a), l = e.get(i) ?? [];
          l.push({
            id: String(s.id),
            projectPath: a,
            updatedAt: s.updatedAt instanceof Date ? s.updatedAt : new Date(String(s.updatedAt))
          }), e.set(i, l);
        } catch {
          continue;
        }
    let r = 0, o = 0;
    for (const s of e.values()) {
      if (s.length <= 1) continue;
      r += 1;
      const a = [...s].sort(
        (c, d) => d.updatedAt.getTime() - c.updatedAt.getTime()
      ), i = a[0], l = a.slice(1);
      for (const c of l)
        await R.getClient().project.update({
          where: { id: c.id },
          data: { projectPath: null }
        }), o += 1, w.warn("Cleared duplicate projectPath from stale record", {
          keepProjectId: i.id,
          staleProjectId: c.id,
          projectPath: c.projectPath
        });
    }
    return r > 0 && w.info("Project path duplicate reconciliation completed", {
      duplicateGroups: r,
      clearedRecords: o
    }), { duplicateGroups: r, clearedRecords: o };
  }
  async createProject(t) {
    try {
      w.info("Creating project", t);
      const e = this.normalizeProjectPath(t.projectPath);
      if (e) {
        const s = await this.findProjectPathConflict(e);
        if (s)
          throw new I(
            P.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath: e, conflictProjectId: s.id }
          );
      }
      const r = await R.getClient().project.create({
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
      }), o = String(r.id);
      return w.info("Project created successfully", { projectId: o }), this.schedulePackageExport(o, "project:create"), r;
    } catch (e) {
      throw w.error("Failed to create project", e), new I(
        P.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        e
      );
    }
  }
  async readMetaOrMarkCorrupt(t) {
    try {
      await ot.access(t);
    } catch {
      return {
        meta: null,
        luieCorrupted: !0,
        recoveryReason: "missing"
      };
    }
    try {
      const e = await H(t, Vt, w);
      if (!e)
        throw new Error("MISSING_META");
      const r = Cs.safeParse(JSON.parse(e));
      if (!r.success)
        throw new Error("INVALID_META");
      return { meta: r.data, luieCorrupted: !1 };
    } catch (e) {
      return w.warn("Failed to read .luie meta; treating as corrupted", {
        packagePath: t,
        error: e
      }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
    }
  }
  async findProjectByPath(t) {
    return await R.getClient().project.findFirst({
      where: { projectPath: t },
      select: { id: !0, updatedAt: !0 }
    });
  }
  resolveImportIdentity(t, e) {
    const o = (typeof t.projectId == "string" ? t.projectId : void 0) ?? e?.id ?? Y(), s = e && e.id !== o ? e.id : null;
    return { resolvedProjectId: o, legacyProjectId: s };
  }
  buildRecoveryTimestamp(t = /* @__PURE__ */ new Date()) {
    const e = (r) => String(r).padStart(2, "0");
    return `${t.getFullYear()}${e(t.getMonth() + 1)}${e(t.getDate())}-${e(t.getHours())}${e(t.getMinutes())}${e(t.getSeconds())}`;
  }
  async resolveRecoveredPackagePath(t) {
    const e = Ft(t), r = G, s = e.toLowerCase().endsWith(r) ? e.slice(0, e.length - r.length) : e, a = this.buildRecoveryTimestamp();
    let i = `${s}.recovered-${a}${r}`, l = 1;
    for (; ; )
      try {
        await ot.access(i), i = `${s}.recovered-${a}-${l}${r}`, l += 1;
      } catch {
        return i;
      }
  }
  async readLuieImportCollections(t) {
    const e = `${F}/${Dr}`, r = `${F}/${Lr}`, o = `${Lt}/index.json`, s = `${F}/${Ot}`, a = `${F}/${Zt}`, [i, l, c, d, u] = await Promise.all([
      H(t, e, w),
      H(t, r, w),
      H(t, o, w),
      H(t, s, w),
      H(t, a, w)
    ]), T = _t(i, Ns, {
      packagePath: t,
      entryPath: e,
      label: "world characters"
    }), _ = _t(l, Ds, {
      packagePath: t,
      entryPath: r,
      label: "world terms"
    }), h = _t(c, Fs, {
      packagePath: t,
      entryPath: o,
      label: "snapshot index"
    }), E = _t(
      d,
      ue,
      {
        packagePath: t,
        entryPath: s,
        label: "world synopsis"
      }
    ), A = _t(u, js, {
      packagePath: t,
      entryPath: a,
      label: "world graph"
    });
    return {
      characters: T?.characters ?? [],
      terms: _?.terms ?? [],
      snapshots: h?.snapshots ?? [],
      worldSynopsis: E && typeof E.synopsis == "string" ? E.synopsis : void 0,
      graph: A ? {
        nodes: A.nodes ?? [],
        edges: A.edges ?? [],
        updatedAt: A.updatedAt
      } : void 0
    };
  }
  async buildChapterCreateRows(t, e, r) {
    const o = [];
    for (let s = 0; s < r.length; s += 1) {
      const a = r[s], i = a.id ?? Y(), l = a.file ?? `${gt}/${i}${Ht}`, c = typeof a.content == "string" ? a.content : await H(t, l, w);
      if (c === null)
        throw new I(
          P.VALIDATION_FAILED,
          "Missing chapter content entry in .luie package",
          {
            packagePath: t,
            entryPath: l,
            chapterId: i
          }
        );
      const d = c ?? "";
      o.push({
        id: i,
        projectId: e,
        title: a.title ?? `Chapter ${s + 1}`,
        content: d,
        synopsis: null,
        order: typeof a.order == "number" ? a.order : s,
        wordCount: d.length
      });
    }
    return o;
  }
  buildCharacterCreateRows(t, e) {
    return e.map((r, o) => {
      const s = typeof r.name == "string" && r.name.trim().length > 0 ? r.name : `Character ${o + 1}`, a = typeof r.attributes == "string" ? r.attributes : r.attributes ? JSON.stringify(r.attributes) : null;
      return {
        id: typeof r.id == "string" ? r.id : Y(),
        projectId: t,
        name: s,
        description: typeof r.description == "string" ? r.description : null,
        firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
        attributes: a
      };
    });
  }
  buildTermCreateRows(t, e) {
    return e.map((r, o) => {
      const s = typeof r.term == "string" && r.term.trim().length > 0 ? r.term : `Term ${o + 1}`;
      return {
        id: typeof r.id == "string" ? r.id : Y(),
        projectId: t,
        term: s,
        definition: typeof r.definition == "string" ? r.definition : null,
        category: typeof r.category == "string" ? r.category : null,
        firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
      };
    });
  }
  buildSnapshotCreateRows(t, e, r) {
    const o = /* @__PURE__ */ new Set(), s = [];
    for (const a of e) {
      if (typeof a.id != "string" || a.id.trim().length === 0 || o.has(a.id))
        continue;
      o.add(a.id);
      const i = typeof a.content == "string" ? a.content : "", l = typeof a.chapterId == "string" ? a.chapterId.trim() : "", c = l.length > 0 && r.has(l);
      l.length > 0 && !c && w.warn("Snapshot chapter reference missing during .luie import; detaching snapshot", {
        snapshotId: a.id,
        chapterId: l,
        projectId: t
      });
      const d = typeof a.createdAt == "string" && a.createdAt.trim().length > 0 ? new Date(a.createdAt) : /* @__PURE__ */ new Date(), u = Number.isNaN(d.getTime()) ? /* @__PURE__ */ new Date() : d;
      s.push({
        id: a.id,
        projectId: t,
        chapterId: c ? l : null,
        content: i,
        contentLength: i.length,
        description: typeof a.description == "string" ? a.description : null,
        createdAt: u
      });
    }
    return s;
  }
  serializeAttributes(t) {
    if (t == null)
      return null;
    if (typeof t == "string")
      return t;
    try {
      return JSON.stringify(t);
    } catch {
      return null;
    }
  }
  getWorldEntityType(t, e) {
    return fe(t) ? t : t === "WorldEntity" && fe(e) ? e : null;
  }
  createGraphImportState(t, e) {
    return {
      charactersForCreate: [...t],
      termsForCreate: [...e],
      factionsForCreate: [],
      eventsForCreate: [],
      worldEntitiesForCreate: [],
      relationsForCreate: [],
      characterIds: new Set(t.map((r) => r.id)),
      termIds: new Set(e.map((r) => r.id)),
      factionIds: /* @__PURE__ */ new Set(),
      eventIds: /* @__PURE__ */ new Set(),
      worldEntityIds: /* @__PURE__ */ new Set()
    };
  }
  resolveGraphNodeType(t) {
    return he(t.entityType) ? t.entityType : fe(t.subType) ? t.subType : null;
  }
  addCharacterNode(t, e, r) {
    t.characterIds.has(r.id) || (t.characterIds.add(r.id), t.charactersForCreate.push({
      id: r.id,
      projectId: e,
      name: r.name,
      description: typeof r.description == "string" ? r.description : null,
      firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
      attributes: this.serializeAttributes(r.attributes)
    }));
  }
  addTermNode(t, e, r) {
    if (t.termIds.has(r.id)) return;
    t.termIds.add(r.id);
    const o = Array.isArray(r.attributes?.tags) ? r.attributes.tags.find((s) => typeof s == "string") : null;
    t.termsForCreate.push({
      id: r.id,
      projectId: e,
      term: r.name,
      definition: typeof r.description == "string" ? r.description : null,
      category: o ?? null,
      firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
    });
  }
  addFactionNode(t, e, r) {
    t.factionIds.has(r.id) || (t.factionIds.add(r.id), t.factionsForCreate.push({
      id: r.id,
      projectId: e,
      name: r.name,
      description: typeof r.description == "string" ? r.description : null,
      firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
      attributes: this.serializeAttributes(r.attributes)
    }));
  }
  addEventNode(t, e, r) {
    t.eventIds.has(r.id) || (t.eventIds.add(r.id), t.eventsForCreate.push({
      id: r.id,
      projectId: e,
      name: r.name,
      description: typeof r.description == "string" ? r.description : null,
      firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
      attributes: this.serializeAttributes(r.attributes)
    }));
  }
  addWorldEntityNode(t, e, r, o) {
    const s = this.getWorldEntityType(r, o.subType);
    !s || t.worldEntityIds.has(o.id) || (t.worldEntityIds.add(o.id), t.worldEntitiesForCreate.push({
      id: o.id,
      projectId: e,
      type: s,
      name: o.name,
      description: typeof o.description == "string" ? o.description : null,
      firstAppearance: typeof o.firstAppearance == "string" ? o.firstAppearance : null,
      attributes: this.serializeAttributes(o.attributes),
      positionX: typeof o.positionX == "number" ? o.positionX : 0,
      positionY: typeof o.positionY == "number" ? o.positionY : 0
    }));
  }
  hasGraphEntity(t, e, r) {
    switch (e) {
      case "Character":
        return t.characterIds.has(r);
      case "Term":
        return t.termIds.has(r);
      case "Faction":
        return t.factionIds.has(r);
      case "Event":
        return t.eventIds.has(r);
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity":
        return t.worldEntityIds.has(r);
      default:
        return !1;
    }
  }
  addGraphNodeToState(t, e, r) {
    if (!r.id || !r.name)
      return;
    const o = this.resolveGraphNodeType(r);
    if (o) {
      if (o === "Character") {
        this.addCharacterNode(t, e, r);
        return;
      }
      if (o === "Term") {
        this.addTermNode(t, e, r);
        return;
      }
      if (o === "Faction") {
        this.addFactionNode(t, e, r);
        return;
      }
      if (o === "Event") {
        this.addEventNode(t, e, r);
        return;
      }
      this.addWorldEntityNode(t, e, o, r);
    }
  }
  addGraphEdgeToState(t, e, r) {
    !r.sourceId || !r.targetId || !he(r.sourceType) || !he(r.targetType) || ks(r.relation) && (!this.hasGraphEntity(t, r.sourceType, r.sourceId) || !this.hasGraphEntity(t, r.targetType, r.targetId) || t.relationsForCreate.push({
      id: r.id || Y(),
      projectId: e,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      targetId: r.targetId,
      targetType: r.targetType,
      relation: r.relation,
      attributes: this.serializeAttributes(r.attributes),
      sourceWorldEntityId: Ye(r.sourceType) && t.worldEntityIds.has(r.sourceId) ? r.sourceId : null,
      targetWorldEntityId: Ye(r.targetType) && t.worldEntityIds.has(r.targetId) ? r.targetId : null
    }));
  }
  buildGraphCreateRows(t) {
    const e = this.createGraphImportState(t.baseCharacters, t.baseTerms);
    if (!t.graph)
      return e;
    for (const r of t.graph.nodes ?? [])
      this.addGraphNodeToState(e, t.projectId, r);
    for (const r of t.graph.edges ?? [])
      this.addGraphEdgeToState(e, t.projectId, r);
    return e;
  }
  async applyImportTransaction(t) {
    const {
      resolvedProjectId: e,
      legacyProjectId: r,
      existing: o,
      meta: s,
      worldSynopsis: a,
      resolvedPath: i,
      chaptersForCreate: l,
      charactersForCreate: c,
      termsForCreate: d,
      factionsForCreate: u,
      eventsForCreate: T,
      worldEntitiesForCreate: _,
      relationsForCreate: h,
      snapshotsForCreate: E
    } = t;
    return await R.getClient().$transaction(async (A) => {
      r && await A.project.delete({ where: { id: r } }), o && await A.project.delete({ where: { id: e } });
      const S = await A.project.create({
        data: {
          id: e,
          title: s.title ?? "Recovered Project",
          description: (typeof s.description == "string" ? s.description : void 0) ?? a ?? void 0,
          projectPath: i,
          createdAt: s.createdAt ? new Date(s.createdAt) : void 0,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : void 0,
          settings: {
            create: {
              autoSave: !0,
              autoSaveInterval: ye
            }
          }
        },
        include: { settings: !0 }
      });
      return l.length > 0 && await A.chapter.createMany({ data: l }), c.length > 0 && await A.character.createMany({ data: c }), d.length > 0 && await A.term.createMany({ data: d }), u.length > 0 && await A.faction.createMany({ data: u }), T.length > 0 && await A.event.createMany({ data: T }), _.length > 0 && await A.worldEntity.createMany({ data: _ }), h.length > 0 && await A.entityRelation.createMany({ data: h }), E.length > 0 && await A.snapshot.createMany({ data: E }), S;
    });
  }
  async openLuieProject(t) {
    try {
      const e = this.normalizeLuiePackagePath(t, "packagePath"), { meta: r, luieCorrupted: o, recoveryReason: s } = await this.readMetaOrMarkCorrupt(
        e
      ), a = await this.findProjectByPath(e);
      if (o) {
        if (!a)
          throw new I(
            P.FS_READ_FAILED,
            "Failed to read .luie meta",
            { packagePath: e }
          );
        const C = await this.resolveRecoveredPackagePath(e);
        if (!await this.exportProjectPackageWithOptions(a.id, {
          targetPath: C,
          worldSourcePath: null
        }))
          throw new I(
            P.FS_WRITE_FAILED,
            "Failed to write recovered .luie package",
            { packagePath: e, recoveryPath: C }
          );
        return await R.getClient().project.update({
          where: { id: a.id },
          data: { projectPath: C }
        }), {
          project: await this.getProject(a.id),
          recovery: !0,
          recoveryPath: C,
          recoveryReason: s ?? "corrupt"
        };
      }
      if (!r)
        throw new I(
          P.VALIDATION_FAILED,
          "Invalid .luie meta format",
          { packagePath: e }
        );
      const { resolvedProjectId: i, legacyProjectId: l } = this.resolveImportIdentity(r, a), c = await R.getClient().project.findUnique({
        where: { id: i },
        select: { id: !0, updatedAt: !0 }
      }), d = r.chapters ?? [], u = await this.readLuieImportCollections(e), T = await this.buildChapterCreateRows(
        e,
        i,
        d
      ), _ = this.buildCharacterCreateRows(
        i,
        u.characters
      ), h = this.buildTermCreateRows(i, u.terms), E = this.buildGraphCreateRows({
        projectId: i,
        graph: u.graph,
        baseCharacters: _,
        baseTerms: h
      }), A = this.buildSnapshotCreateRows(
        i,
        u.snapshots,
        new Set(T.map((C) => C.id))
      ), S = await this.applyImportTransaction({
        resolvedProjectId: i,
        legacyProjectId: l,
        existing: c,
        meta: r,
        worldSynopsis: u.worldSynopsis,
        resolvedPath: e,
        chaptersForCreate: T,
        charactersForCreate: E.charactersForCreate,
        termsForCreate: E.termsForCreate,
        factionsForCreate: E.factionsForCreate,
        eventsForCreate: E.eventsForCreate,
        worldEntitiesForCreate: E.worldEntitiesForCreate,
        relationsForCreate: E.relationsForCreate,
        snapshotsForCreate: A
      });
      return w.info(".luie package hydrated", {
        projectId: S.id,
        chapterCount: T.length,
        characterCount: E.charactersForCreate.length,
        termCount: E.termsForCreate.length,
        factionCount: E.factionsForCreate.length,
        eventCount: E.eventsForCreate.length,
        worldEntityCount: E.worldEntitiesForCreate.length,
        relationCount: E.relationsForCreate.length,
        snapshotCount: A.length
      }), { project: S, conflict: "luie-newer" };
    } catch (e) {
      throw w.error("Failed to open .luie package", { packagePath: t, error: e }), e instanceof I ? e : new I(
        P.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath: t },
        e
      );
    }
  }
  async getProject(t) {
    try {
      const e = await R.getClient().project.findUnique({
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
        throw new I(
          P.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw w.error("Failed to get project", e), e;
    }
  }
  async getAllProjects() {
    try {
      const t = await R.getClient().project.findMany({
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
        t.map(async (r) => {
          const o = typeof r.projectPath == "string" ? r.projectPath : null;
          if (!!!(o && o.toLowerCase().endsWith(G)) || !o)
            return {
              ...r,
              pathMissing: !1
            };
          try {
            const a = M(o, "projectPath");
            return await ot.access(a), {
              ...r,
              pathMissing: !1
            };
          } catch {
            return {
              ...r,
              pathMissing: !0
            };
          }
        })
      );
    } catch (t) {
      throw w.error("Failed to get all projects", t), new I(
        P.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async assertNoProjectPathConflict(t, e) {
    if (!t) return;
    const r = await this.findProjectPathConflict(t, e);
    if (r)
      throw new I(
        P.VALIDATION_FAILED,
        "Project path is already registered",
        { projectPath: t, conflictProjectId: r.id }
      );
  }
  async tryRenameSnapshotDirectoryForProjectTitleChange(t) {
    const { projectId: e, projectPath: r, previousTitle: o, nextTitle: s } = t;
    if (!(!r || !r.toLowerCase().endsWith(G)) && !(!o || !s || o === s))
      try {
        const a = M(r, "projectPath"), l = `${pt.dirname(a)}${pt.sep}.luie${pt.sep}${Lt}`, c = nr(o, ""), d = nr(s, "");
        if (!c || !d || c === d) return;
        const u = `${l}${pt.sep}${c}`, T = `${l}${pt.sep}${d}`;
        try {
          if (!(await ot.stat(u)).isDirectory()) return;
        } catch {
          return;
        }
        await ot.mkdir(l, { recursive: !0 }), await ot.rename(u, T);
      } catch (a) {
        w.warn("Skipping snapshot directory rename for invalid projectPath", {
          projectId: e,
          projectPath: r,
          error: a
        });
      }
  }
  async updateProject(t) {
    try {
      const e = t.projectPath === void 0 ? void 0 : this.normalizeProjectPath(t.projectPath) ?? null;
      await this.assertNoProjectPathConflict(e, t.id);
      const r = await R.getClient().project.findUnique({
        where: { id: t.id },
        select: { title: !0, projectPath: !0 }
      }), o = await R.getClient().project.update({
        where: { id: t.id },
        data: {
          title: t.title,
          description: t.description,
          projectPath: e
        }
      }), s = typeof r?.title == "string" ? r.title : "", a = typeof o.title == "string" ? o.title : "", i = typeof o.projectPath == "string" ? o.projectPath : null;
      await this.tryRenameSnapshotDirectoryForProjectTitleChange({
        projectId: String(o.id),
        projectPath: i,
        previousTitle: s,
        nextTitle: a
      });
      const l = String(o.id);
      return w.info("Project updated successfully", { projectId: l }), this.schedulePackageExport(l, "project:update"), o;
    } catch (e) {
      throw w.error("Failed to update project", e), new I(
        P.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input: t },
        e
      );
    }
  }
  clearSyncBaselineForProject(t) {
    const r = g.getSyncSettings().entityBaselinesByProjectId;
    if (!r || !(t in r)) return;
    const o = { ...r };
    delete o[t], g.setSyncSettings({
      entityBaselinesByProjectId: Object.keys(o).length > 0 ? o : void 0
    });
  }
  async deleteProject(t) {
    const e = typeof t == "string" ? { id: t, deleteFile: !1 } : { id: t.id, deleteFile: !!t.deleteFile };
    let r = !1;
    try {
      const o = await R.getClient().project.findUnique({
        where: { id: e.id },
        select: { id: !0, projectPath: !0 }
      });
      if (!o?.id)
        throw new I(
          P.PROJECT_NOT_FOUND,
          "Project not found",
          { id: e.id }
        );
      if (e.deleteFile) {
        const s = typeof o.projectPath == "string" ? o.projectPath : null;
        if (s && s.toLowerCase().endsWith(G)) {
          const a = M(s, "projectPath");
          await ot.rm(a, { force: !0, recursive: !0 });
        }
      }
      return g.addPendingProjectDelete({
        projectId: e.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), r = !0, await R.getClient().project.delete({
        where: { id: e.id }
      }), this.clearSyncBaselineForProject(e.id), w.info("Project deleted successfully", { projectId: e.id, deleteFile: e.deleteFile }), { success: !0 };
    } catch (o) {
      throw r && g.removePendingProjectDeletes([e.id]), w.error("Failed to delete project", o), o instanceof I ? o : new I(
        P.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id: e.id, deleteFile: e.deleteFile },
        o
      );
    }
  }
  async removeProjectFromList(t) {
    try {
      if (!(await R.getClient().project.findUnique({
        where: { id: t },
        select: { id: !0 }
      }))?.id)
        throw new I(
          P.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return await R.getClient().project.delete({
        where: { id: t }
      }), this.clearSyncBaselineForProject(t), w.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (e) {
      throw w.error("Failed to remove project from list", e), e instanceof I ? e : new I(
        P.PROJECT_DELETE_FAILED,
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
  async getProjectForExport(t) {
    return await R.getClient().project.findUnique({
      where: { id: t },
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
    });
  }
  resolveExportPath(t, e) {
    if (!e)
      return w.info("Skipping package export (missing projectPath)", { projectId: t }), null;
    if (!e.toLowerCase().endsWith(G))
      return w.info("Skipping package export (not .luie)", {
        projectId: t,
        projectPath: e
      }), null;
    try {
      return M(e, "projectPath");
    } catch (r) {
      return w.warn("Skipping package export (invalid projectPath)", {
        projectId: t,
        projectPath: e,
        error: r
      }), null;
    }
  }
  buildExportChapterData(t) {
    const e = t.map((o) => ({
      id: o.id,
      title: o.title,
      order: o.order,
      updatedAt: o.updatedAt,
      content: o.content,
      file: `${gt}/${o.id}${Ht}`
    })), r = e.map((o) => ({
      id: o.id,
      title: o.title,
      order: o.order,
      file: o.file
    }));
    return { exportChapters: e, chapterMeta: r };
  }
  buildExportCharacterData(t) {
    return t.map((e) => {
      let r;
      if (e.attributes)
        try {
          r = JSON.parse(e.attributes);
        } catch {
          r = e.attributes;
        }
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        firstAppearance: e.firstAppearance,
        attributes: r,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      };
    });
  }
  buildExportTermData(t) {
    return t.map((e) => ({
      id: e.id,
      term: e.term,
      definition: e.definition,
      category: e.category,
      firstAppearance: e.firstAppearance,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));
  }
  buildExportSnapshotData(t) {
    const e = t.map((o) => ({
      id: o.id,
      projectId: o.projectId,
      chapterId: o.chapterId,
      content: o.content,
      description: o.description,
      createdAt: o.createdAt?.toISOString?.() ?? String(o.createdAt)
    })), r = g.getAll().snapshotExportLimit ?? Cr;
    return r > 0 ? e.slice(0, r) : e;
  }
  async readWorldPayloadFromPackage(t) {
    if (!t || !t.toLowerCase().endsWith(G))
      return {
        synopsis: ue.safeParse(null),
        plot: ar.safeParse(null),
        drawing: ir.safeParse(null),
        mindmap: cr.safeParse(null),
        memos: dr.safeParse(null)
      };
    const e = async (l, c, d) => {
      const u = `${F}/${l}`;
      try {
        const T = await H(t, u, w);
        return Us(T, c, {
          packagePath: t,
          entryPath: u,
          label: d
        });
      } catch (T) {
        return w.warn("Failed to read .luie world document; using default during export", {
          projectPath: t,
          entryPath: u,
          label: d,
          error: T
        }), c.safeParse(null);
      }
    }, [r, o, s, a, i] = await Promise.all([
      e(
        Ot,
        ue,
        "synopsis"
      ),
      e(Kt, ar, "plot"),
      e(Jt, ir, "drawing"),
      e(Qt, cr, "mindmap"),
      e(
        be,
        dr,
        "scrap-memos"
      )
    ]);
    return {
      synopsis: r,
      plot: o,
      drawing: s,
      mindmap: a,
      memos: i
    };
  }
  buildWorldSynopsis(t, e) {
    return {
      synopsis: t.description ?? (e.success && typeof e.data.synopsis == "string" ? e.data.synopsis : ""),
      status: e.success && e.data.status ? e.data.status : "draft",
      genre: e.success && typeof e.data.genre == "string" ? e.data.genre : void 0,
      targetAudience: e.success && typeof e.data.targetAudience == "string" ? e.data.targetAudience : void 0,
      logline: e.success && typeof e.data.logline == "string" ? e.data.logline : void 0,
      updatedAt: e.success && typeof e.data.updatedAt == "string" ? e.data.updatedAt : void 0
    };
  }
  buildWorldPlot(t) {
    return !t.success || !Array.isArray(t.data.columns) ? { columns: [] } : {
      columns: t.data.columns,
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    };
  }
  buildWorldDrawing(t) {
    return !t.success || !Array.isArray(t.data.paths) ? { paths: [] } : {
      paths: Gr(t.data.paths),
      tool: t.data.tool,
      iconType: t.data.iconType,
      color: typeof t.data.color == "string" ? t.data.color : void 0,
      lineWidth: typeof t.data.lineWidth == "number" ? t.data.lineWidth : void 0,
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    };
  }
  buildWorldMindmap(t) {
    return t.success ? {
      nodes: Hr(t.data.nodes),
      edges: zr(t.data.edges),
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    } : { nodes: [], edges: [] };
  }
  buildWorldScrapMemos(t) {
    return t.success ? {
      memos: Yr(t.data.memos),
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    } : { memos: [] };
  }
  parseAttributesRecord(t) {
    if (!t) return null;
    try {
      const e = JSON.parse(t);
      return e && typeof e == "object" && !Array.isArray(e) ? e : null;
    } catch {
      return null;
    }
  }
  buildWorldGraph(t) {
    const e = [
      ...t.characters.map((o) => ({
        id: o.id,
        entityType: "Character",
        name: o.name,
        description: o.description ?? null,
        firstAppearance: o.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(o.attributes),
        positionX: 0,
        positionY: 0
      })),
      ...t.factions.map((o) => ({
        id: o.id,
        entityType: "Faction",
        name: o.name,
        description: o.description ?? null,
        firstAppearance: o.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(o.attributes),
        positionX: 0,
        positionY: 0
      })),
      ...t.events.map((o) => ({
        id: o.id,
        entityType: "Event",
        name: o.name,
        description: o.description ?? null,
        firstAppearance: o.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(o.attributes),
        positionX: 0,
        positionY: 0
      })),
      ...t.terms.map((o) => ({
        id: o.id,
        entityType: "Term",
        name: o.term,
        description: o.definition ?? null,
        firstAppearance: o.firstAppearance ?? null,
        attributes: o.category ? { tags: [o.category] } : null,
        positionX: 0,
        positionY: 0
      })),
      ...t.worldEntities.map((o) => ({
        id: o.id,
        entityType: o.type,
        subType: o.type,
        name: o.name,
        description: o.description ?? null,
        firstAppearance: o.firstAppearance ?? null,
        attributes: typeof o.attributes == "string" ? this.parseAttributesRecord(o.attributes) : o.attributes ?? null,
        positionX: o.positionX,
        positionY: o.positionY
      }))
    ], r = t.entityRelations.map((o) => ({
      id: o.id,
      projectId: o.projectId,
      sourceId: o.sourceId,
      sourceType: o.sourceType,
      targetId: o.targetId,
      targetType: o.targetType,
      relation: o.relation,
      attributes: typeof o.attributes == "string" ? this.parseAttributesRecord(o.attributes) : o.attributes ?? null,
      sourceWorldEntityId: o.sourceWorldEntityId ?? null,
      targetWorldEntityId: o.targetWorldEntityId ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }));
    return {
      nodes: e,
      edges: r
    };
  }
  buildProjectPackageMeta(t, e) {
    return {
      format: Ct,
      container: Nt,
      version: Dt,
      projectId: t.id,
      title: t.title,
      description: t.description,
      createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt),
      updatedAt: t.updatedAt?.toISOString?.() ?? String(t.updatedAt),
      chapters: e
    };
  }
  async exportProjectPackageWithOptions(t, e) {
    const r = await this.getProjectForExport(t);
    if (!r) return !1;
    const o = e?.targetPath ? this.normalizeLuiePackagePath(e.targetPath, "targetPath") : this.resolveExportPath(t, r.projectPath);
    if (!o) return !1;
    const s = e?.worldSourcePath === void 0 ? o : e.worldSourcePath, { exportChapters: a, chapterMeta: i } = this.buildExportChapterData(r.chapters), l = this.buildExportCharacterData(r.characters), c = this.buildExportTermData(r.terms), d = this.buildExportSnapshotData(r.snapshots), u = await this.readWorldPayloadFromPackage(s), T = this.buildWorldSynopsis(r, u.synopsis), _ = this.buildWorldPlot(u.plot), h = this.buildWorldDrawing(u.drawing), E = this.buildWorldMindmap(u.mindmap), A = this.buildWorldScrapMemos(u.memos), S = this.buildWorldGraph(r), C = this.buildProjectPackageMeta(r, i);
    return w.info("Exporting .luie package", {
      projectId: t,
      projectPath: o,
      chapterCount: a.length,
      characterCount: l.length,
      termCount: c.length,
      worldNodeCount: S.nodes.length,
      relationCount: S.edges.length,
      snapshotCount: d.length
    }), await $r(
      o,
      {
        meta: C,
        chapters: a,
        characters: l,
        terms: c,
        synopsis: T,
        plot: _,
        drawing: h,
        mindmap: E,
        memos: A,
        graph: S,
        snapshots: d
      },
      w
    ), !0;
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const qr = new Xr(), Vr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ProjectService: Xr,
  projectService: qr
}, Symbol.toStringTag, { value: "Module" })), Kr = () => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: []
}), q = (n) => {
  if (!n) return 0;
  const t = Date.parse(n);
  return Number.isFinite(t) ? t : 0;
}, lr = (n, t, e, r) => {
  const o = n?.[t];
  if (!o) return 0;
  const s = e === "chapter" ? o.chapter : o.memo;
  return q(s[r]);
}, ee = (n, t) => q(n.updatedAt) >= q(t.updatedAt) ? [n, t] : [t, n], wt = (n, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const r of n)
    e.set(r.id, r);
  for (const r of t) {
    const o = e.get(r.id);
    if (!o) {
      e.set(r.id, r);
      continue;
    }
    const [s] = ee(o, r);
    e.set(r.id, s);
  }
  return Array.from(e.values());
}, Bs = (n, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const r of n)
    e.set(`${r.projectId}:${r.docType}`, r);
  for (const r of t) {
    const o = `${r.projectId}:${r.docType}`, s = e.get(o);
    if (!s) {
      e.set(o, r);
      continue;
    }
    const [a] = ee(s, r);
    e.set(o, a);
  }
  return Array.from(e.values());
}, pr = (n, t, e, r, o, s) => {
  const a = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  let l = 0;
  const c = [];
  for (const d of t)
    i.set(d.id, d);
  for (const d of n)
    a.set(d.id, d);
  for (const d of t) {
    const u = a.get(d.id);
    if (!u) {
      a.set(d.id, d);
      continue;
    }
    let [T, _] = ee(u, d);
    if (u.content !== d.content && (o ? o(u, d) : !0)) {
      const E = `${e}:${u.id}`, A = s?.[E];
      if (A === "local")
        T = u, _ = d;
      else if (A === "remote")
        T = d, _ = u;
      else {
        l += 1, c.push({
          type: e,
          id: u.id,
          projectId: u.projectId,
          title: u.title,
          localUpdatedAt: u.updatedAt,
          remoteUpdatedAt: d.updatedAt,
          localPreview: u.content.slice(0, 400),
          remotePreview: d.content.slice(0, 400)
        });
        const S = r(_);
        a.set(S.id, S);
      }
    }
    a.set(d.id, T);
  }
  for (const [d, u] of i.entries())
    a.has(d) || a.set(d, u);
  return {
    merged: Array.from(a.values()),
    conflicts: l,
    conflictItems: c
  };
}, $s = (n, t, e) => {
  const r = n + t;
  return {
    chapters: n,
    memos: t,
    total: r,
    items: e.length > 0 ? e : void 0
  };
}, xs = (n) => {
  const t = /* @__PURE__ */ new Map();
  for (const a of n.tombstones) {
    const i = `${a.entityType}:${a.entityId}`, l = t.get(i);
    if (!l) {
      t.set(i, a);
      continue;
    }
    const [c] = ee(l, a);
    t.set(i, c);
  }
  const e = /* @__PURE__ */ new Set();
  for (const a of n.projects)
    a.deletedAt && e.add(a.id);
  for (const a of t.values())
    a.entityType === "project" && (e.add(a.entityId), e.add(a.projectId));
  const r = (a) => e.has(a), o = (a) => {
    const i = t.get(`chapter:${a.id}`);
    if (!i) return a;
    const l = i.deletedAt, c = q(i.updatedAt) > q(a.updatedAt) ? i.updatedAt : a.updatedAt;
    return {
      ...a,
      deletedAt: l,
      updatedAt: c
    };
  }, s = (a, i) => i.filter((l) => !t.has(`${a}:${l.id}`));
  return {
    ...n,
    projects: s(
      "project",
      n.projects.filter((a) => !r(a.id))
    ),
    chapters: n.chapters.filter((a) => !r(a.projectId)).map(o),
    characters: s(
      "character",
      n.characters.filter((a) => !r(a.projectId))
    ),
    terms: s(
      "term",
      n.terms.filter((a) => !r(a.projectId))
    ),
    worldDocuments: n.worldDocuments.filter(
      (a) => !r(a.projectId)
    ),
    memos: s(
      "memo",
      n.memos.filter((a) => !r(a.projectId))
    ),
    snapshots: s(
      "snapshot",
      n.snapshots.filter((a) => !r(a.projectId))
    )
  };
}, Gs = (n, t, e) => {
  const r = new Set(
    [...n.tombstones, ...t.tombstones].map(
      (c) => `${c.entityType}:${c.entityId}`
    )
  ), o = e?.baselinesByProjectId, s = pr(
    n.chapters,
    t.chapters,
    "chapter",
    (c) => ({
      ...c,
      id: Y(),
      title: `${c.title} (Conflict Copy)`,
      order: c.order + 1e4,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (c, d) => c.projectId === d.projectId && !c.deletedAt && !d.deletedAt && !r.has(`chapter:${c.id}`) && !r.has(`chapter:${d.id}`) && (() => {
      const u = lr(
        o,
        c.projectId,
        "chapter",
        c.id
      );
      return u <= 0 ? !1 : q(c.updatedAt) > u && q(d.updatedAt) > u;
    })(),
    e?.conflictResolutions
  ), a = pr(
    n.memos,
    t.memos,
    "memo",
    (c) => ({
      ...c,
      id: Y(),
      title: `${c.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (c, d) => c.projectId === d.projectId && !c.deletedAt && !d.deletedAt && !r.has(`memo:${c.id}`) && !r.has(`memo:${d.id}`) && (() => {
      const u = lr(
        o,
        c.projectId,
        "memo",
        c.id
      );
      return u <= 0 ? !1 : q(c.updatedAt) > u && q(d.updatedAt) > u;
    })(),
    e?.conflictResolutions
  ), i = [
    ...s.conflictItems,
    ...a.conflictItems
  ], l = {
    projects: wt(n.projects, t.projects),
    chapters: s.merged,
    characters: wt(n.characters, t.characters),
    terms: wt(n.terms, t.terms),
    worldDocuments: Bs(n.worldDocuments, t.worldDocuments),
    memos: a.merged,
    snapshots: wt(n.snapshots, t.snapshots),
    tombstones: wt(n.tombstones, t.tombstones)
  };
  return {
    merged: xs(l),
    conflicts: $s(
      s.conflicts,
      a.conflicts,
      i
    )
  };
}, Jr = W("SyncRepository"), y = (n) => typeof n == "string" ? n : null, Ut = (n, t) => typeof n == "string" && n.length > 0 ? n : t, x = (n, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof n == "string" && n.length > 0 ? n : n instanceof Date ? n.toISOString() : t, Ne = (n, t = 0) => typeof n == "number" && Number.isFinite(n) ? n : t, Hs = (n) => Array.isArray(n) ? n.filter((t) => typeof t == "string") : [], ur = (n) => !!(n && typeof n == "object" && !Array.isArray(n)), zs = (n) => {
  try {
    return JSON.parse(n);
  } catch {
    return n;
  }
}, Me = (n) => typeof n == "string" ? zs(n) : n ?? null, st = (n) => {
  const t = {};
  for (const [e, r] of Object.entries(n))
    r !== void 0 && (t[e] = r);
  return t;
}, hr = async (n, t, e) => {
  const r = await e.text();
  return e.status === 404 && r.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${n}_FAILED:${t}:${e.status}:${r}`);
}, Ys = (n) => {
  const t = y(n.id), e = y(n.user_id);
  return !t || !e ? null : {
    id: t,
    userId: e,
    title: Ut(n.title, "Untitled"),
    description: y(n.description),
    createdAt: x(n.created_at),
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, Xs = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    title: Ut(n.title, "Untitled"),
    content: y(n.content) ?? "",
    synopsis: y(n.synopsis),
    order: Ne(n.order),
    wordCount: Ne(n.word_count),
    createdAt: x(n.created_at),
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, qs = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    name: Ut(n.name, "Character"),
    description: y(n.description),
    firstAppearance: y(n.first_appearance),
    attributes: Me(n.attributes),
    createdAt: x(n.created_at),
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, Vs = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    term: Ut(n.term, "Term"),
    definition: y(n.definition),
    category: y(n.category),
    order: Ne(n.order),
    firstAppearance: y(n.first_appearance),
    createdAt: x(n.created_at),
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, Ks = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id), o = y(n.doc_type);
  if (!t || !e || !r || !o || o !== "synopsis" && o !== "plot" && o !== "drawing" && o !== "mindmap" && o !== "scrap" && o !== "graph")
    return null;
  const s = Me(n.payload), a = ur(s) ? s : {};
  return ur(s) || Jr.warn("Invalid world document payload from sync source; using empty payload", {
    docType: o,
    payloadType: s === null ? "null" : typeof s
  }), {
    id: t,
    userId: e,
    projectId: r,
    docType: o,
    payload: a,
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, Js = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    title: Ut(n.title, "Memo"),
    content: y(n.content) ?? "",
    tags: Hs(n.tags),
    updatedAt: x(n.updated_at),
    deletedAt: y(n.deleted_at)
  };
}, Qs = (n) => {
  const t = y(n.id), e = y(n.user_id), r = y(n.project_id), o = y(n.entity_type), s = y(n.entity_id);
  return !t || !e || !r || !o || !s ? null : {
    id: t,
    userId: e,
    projectId: r,
    entityType: o,
    entityId: s,
    deletedAt: x(n.deleted_at),
    updatedAt: x(n.updated_at)
  };
};
class Zs {
  isConfigured() {
    return lt() !== null;
  }
  async fetchBundle(t, e) {
    const r = Kr(), [
      o,
      s,
      a,
      i,
      l,
      c,
      d
    ] = await Promise.all([
      this.fetchTableRaw("projects", t, e),
      this.fetchTableRaw("chapters", t, e),
      this.fetchTableRaw("characters", t, e),
      this.fetchTableRaw("terms", t, e),
      this.fetchTableRaw("world_documents", t, e),
      this.fetchTableRaw("memos", t, e),
      this.fetchTableRaw("tombstones", t, e)
    ]);
    return r.projects = o.map(Ys).filter((u) => u !== null), r.chapters = s.map(Xs).filter((u) => u !== null), r.characters = a.map(qs).filter((u) => u !== null), r.terms = i.map(Vs).filter((u) => u !== null), r.worldDocuments = l.map(Ks).filter((u) => u !== null), r.memos = c.map(Js).filter((u) => u !== null), r.tombstones = d.map(Qs).filter((u) => u !== null), r;
  }
  async upsertBundle(t, e) {
    const r = e.projects.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        title: d.title,
        description: d.description ?? null,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), o = e.chapters.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        title: d.title,
        content: d.content,
        synopsis: d.synopsis ?? null,
        order: d.order,
        word_count: d.wordCount,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), s = e.characters.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        name: d.name,
        description: d.description ?? null,
        first_appearance: d.firstAppearance ?? null,
        attributes: Me(d.attributes),
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), a = e.terms.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        term: d.term,
        definition: d.definition ?? null,
        category: d.category ?? null,
        order: d.order,
        first_appearance: d.firstAppearance ?? null,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), i = e.worldDocuments.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        doc_type: d.docType,
        payload: d.payload ?? {},
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), l = e.memos.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        title: d.title,
        content: d.content,
        tags: d.tags,
        updated_at: d.updatedAt,
        deleted_at: d.deletedAt ?? null
      })
    ), c = e.tombstones.map(
      (d) => st({
        id: d.id,
        user_id: d.userId,
        project_id: d.projectId,
        entity_type: d.entityType,
        entity_id: d.entityId,
        deleted_at: d.deletedAt,
        updated_at: d.updatedAt
      })
    );
    await this.upsertTable("projects", t, r, "id,user_id"), await this.upsertTable("chapters", t, o, "id,user_id"), await this.upsertTable("characters", t, s, "id,user_id"), await this.upsertTable("terms", t, a, "id,user_id"), await this.upsertTable("world_documents", t, i, "id,user_id"), await this.upsertTable("memos", t, l, "id,user_id"), await this.upsertTable("tombstones", t, c, "id,user_id");
  }
  async fetchTableRaw(t, e, r) {
    const o = lt();
    if (!o)
      throw new Error(
        "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed"
      );
    const s = new URLSearchParams();
    s.set("select", "*"), s.set("user_id", `eq.${r}`);
    const a = await fetch(`${o.url}/rest/v1/${t}?${s.toString()}`, {
      method: "GET",
      headers: {
        apikey: o.anonKey,
        Authorization: `Bearer ${e}`
      }
    });
    if (!a.ok) {
      const l = await hr("FETCH", t, a);
      throw Jr.warn("Failed to fetch sync table", {
        table: t,
        status: a.status,
        error: l.message
      }), l;
    }
    const i = await a.json();
    return Array.isArray(i) ? i : [];
  }
  async upsertTable(t, e, r, o) {
    if (r.length === 0) return;
    const s = Rt(), a = await fetch(
      `${s.url}/rest/v1/${t}?on_conflict=${encodeURIComponent(o)}`,
      {
        method: "POST",
        headers: {
          apikey: s.anonKey,
          Authorization: `Bearer ${e}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(r)
      }
    );
    if (!a.ok)
      throw await hr("UPSERT", t, a);
  }
}
const fr = new Zs(), v = W("SyncService"), ta = 1500, Er = {
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
}, Z = (n, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof n == "string" && n.length > 0 ? n : n instanceof Date ? n.toISOString() : t, O = (n) => typeof n == "string" ? n : null, Ee = (n, t = 0) => typeof n == "number" && Number.isFinite(n) ? n : t, ea = (n) => [...n].sort((t, e) => Date.parse(e.updatedAt) - Date.parse(t.updatedAt)), ra = (n) => {
  const t = n instanceof Error ? n.message : String(n);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, na = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], oa = [
  { docType: "synopsis", fileName: Ot },
  { docType: "plot", fileName: Kt },
  { docType: "drawing", fileName: Jt },
  { docType: "mindmap", fileName: Qt },
  { docType: "graph", fileName: Zt }
], sa = {
  synopsis: Ot,
  plot: Kt,
  drawing: Jt,
  mindmap: Qt,
  graph: Zt,
  scrap: be
}, aa = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], ia = /* @__PURE__ */ new Set(["draft", "working", "locked"]), ht = (n) => na.some((t) => n.includes(t)), tt = (n, t) => ({
  ...t,
  connected: n.connected,
  provider: n.provider,
  email: n.email,
  userId: n.userId,
  expiresAt: n.expiresAt,
  autoSync: n.autoSync,
  lastSyncedAt: n.lastSyncedAt,
  lastError: n.lastError,
  projectLastSyncedAtByProjectId: n.projectLastSyncedAtByProjectId,
  health: n.connected ? t.health === "degraded" ? "degraded" : "connected" : "disconnected",
  degradedReason: n.connected && t.health === "degraded" ? t.degradedReason ?? n.lastError : void 0
}), Ar = (n) => Array.isArray(n) ? n.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [];
class Qr {
  status = Er;
  inFlightPromise = null;
  queuedRun = !1;
  autoSyncTimer = null;
  toSyncedProjectStates(t) {
    if (!t) return;
    const e = Object.entries(t);
    if (e.length !== 0)
      return Object.fromEntries(
        e.map(([r, o]) => [
          r,
          {
            state: "synced",
            lastSyncedAt: o
          }
        ])
      );
  }
  withConflictProjectStates(t, e) {
    const r = { ...t ?? {} };
    for (const o of e.items ?? [])
      r[o.projectId] = {
        state: "pending",
        lastSyncedAt: r[o.projectId]?.lastSyncedAt,
        reason: "SYNC_CONFLICT_DETECTED"
      };
    return Object.keys(r).length > 0 ? r : void 0;
  }
  withErrorProjectStates(t, e) {
    if (!t) return t;
    const r = Object.fromEntries(
      Object.entries(t).map(([o, s]) => [
        o,
        {
          state: "error",
          lastSyncedAt: s.lastSyncedAt,
          reason: e
        }
      ])
    );
    return Object.keys(r).length > 0 ? r : void 0;
  }
  applyAuthFailureState(t, e) {
    const r = g.setSyncSettings({
      lastError: t
    });
    this.updateStatus({
      ...tt(r, this.status),
      mode: "error",
      health: "degraded",
      degradedReason: t,
      inFlight: !1,
      queued: !1,
      projectStateById: this.withErrorProjectStates(this.status.projectStateById, t),
      lastRun: e ?? this.status.lastRun
    });
  }
  buildProjectSyncMapForSuccess(t, e, r, o) {
    const s = {
      ...t.projectLastSyncedAtByProjectId ?? {}
    };
    for (const a of o)
      delete s[a];
    for (const a of e.projects) {
      if (a.deletedAt) {
        delete s[a.id];
        continue;
      }
      s[a.id] = r;
    }
    for (const a of e.tombstones)
      a.entityType === "project" && (delete s[a.entityId], delete s[a.projectId]);
    return Object.keys(s).length > 0 ? s : void 0;
  }
  buildEntityBaselineMapForSuccess(t, e, r, o) {
    const s = {
      ...t.entityBaselinesByProjectId ?? {}
    };
    this.dropEntityBaselines(s, o);
    const a = this.collectDeletedProjectIdsForBaselines(e);
    this.dropEntityBaselines(s, Array.from(a));
    const i = this.seedActiveProjectBaselines(
      s,
      e,
      a,
      r
    );
    return this.applyChapterBaselines(s, e, a, i, r), this.applyMemoBaselines(s, e, a, i, r), Object.keys(s).length > 0 ? s : void 0;
  }
  collectDeletedProjectIdsForBaselines(t) {
    const e = /* @__PURE__ */ new Set();
    for (const r of t.projects)
      r.deletedAt && e.add(r.id);
    for (const r of t.tombstones)
      r.entityType === "project" && (e.add(r.entityId), e.add(r.projectId));
    return e;
  }
  dropEntityBaselines(t, e) {
    for (const r of e)
      delete t[r];
  }
  seedActiveProjectBaselines(t, e, r, o) {
    const s = /* @__PURE__ */ new Set();
    for (const a of e.projects)
      a.deletedAt || r.has(a.id) || (s.add(a.id), t[a.id] = {
        chapter: {},
        memo: {},
        capturedAt: o
      });
    return s;
  }
  applyChapterBaselines(t, e, r, o, s) {
    for (const a of e.chapters) {
      if (a.deletedAt || r.has(a.projectId) || !o.has(a.projectId)) continue;
      const i = t[a.projectId];
      i && (i.chapter[a.id] = a.updatedAt, i.capturedAt = s);
    }
  }
  applyMemoBaselines(t, e, r, o, s) {
    for (const a of e.memos) {
      if (a.deletedAt || r.has(a.projectId) || !o.has(a.projectId)) continue;
      const i = t[a.projectId];
      i && (i.memo[a.id] = a.updatedAt, i.capturedAt = s);
    }
  }
  persistMigratedTokenCipher(t, e) {
    e && g.setSyncSettings(
      t === "access" ? { accessTokenCipher: e } : { refreshTokenCipher: e }
    );
  }
  resolveStartupAuthFailure(t) {
    const e = B.getAccessToken(t);
    if (e.errorCode && ht(e.errorCode))
      return e.errorCode;
    this.persistMigratedTokenCipher("access", e.migratedCipher);
    const r = B.getRefreshToken(t);
    return r.errorCode && ht(r.errorCode) ? r.errorCode : (this.persistMigratedTokenCipher("refresh", r.migratedCipher), !!e.token || !!r.token ? null : e.errorCode ?? r.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
  }
  initialize() {
    const t = g.getSyncSettings();
    if (this.status = tt(t, this.status), !t.connected && B.hasPendingAuthFlow() && (this.status = {
      ...this.status,
      mode: "connecting"
    }), t.connected) {
      const e = this.resolveStartupAuthFailure(t);
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
    const t = g.getSyncSettings();
    if (!t.connected || !t.userId)
      throw new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    return this.ensureAccessToken(t);
  }
  async handleOAuthCallback(t) {
    try {
      const e = await B.completeOAuthCallback(t), r = g.getSyncSettings(), o = g.setSyncSettings({
        ...r,
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
        ...tt(o, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: void 0
      }), this.runNow("oauth-callback");
    } catch (e) {
      const r = e instanceof Error ? e.message : String(e);
      throw this.updateStatus({
        mode: "error",
        lastError: r
      }), e;
    }
  }
  async disconnect() {
    this.autoSyncTimer && (clearTimeout(this.autoSyncTimer), this.autoSyncTimer = null), this.queuedRun = !1;
    const t = g.clearSyncSettings();
    return this.updateStatus({
      ...tt(t, Er),
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
    const e = g.setSyncSettings({ autoSync: t });
    return this.updateStatus(tt(e, this.status)), this.status;
  }
  async resolveConflict(t) {
    if (v.info("Sync conflict resolution requested", {
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
    }, ta));
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
    this.updateStatus({
      mode: "syncing",
      inFlight: !0,
      queued: !1,
      lastError: void 0
    });
    try {
      const e = g.getSyncSettings(), r = e.userId;
      if (!r)
        throw new Error("SYNC_USER_ID_MISSING");
      const o = Ar(
        e.pendingProjectDeletes
      ).map((E) => E.projectId), s = await this.ensureAccessToken(e), [a, i] = await Promise.all([
        fr.fetchBundle(s, r),
        this.buildLocalBundle(r)
      ]), { merged: l, conflicts: c } = Gs(i, a, {
        baselinesByProjectId: e.entityBaselinesByProjectId,
        conflictResolutions: e.pendingConflictResolutions
      });
      if (c.total > 0) {
        const E = new Set(
          (c.items ?? []).map((f) => `${f.type}:${f.id}`)
        ), A = Object.fromEntries(
          Object.entries(e.pendingConflictResolutions ?? {}).filter(
            (f) => E.has(f[0])
          )
        );
        g.setSyncSettings({
          pendingConflictResolutions: Object.keys(A).length > 0 ? A : void 0,
          lastError: void 0
        });
        const C = {
          at: (/* @__PURE__ */ new Date()).toISOString(),
          pulled: this.countBundleRows(a),
          pushed: 0,
          conflicts: c.total,
          success: !1,
          message: "SYNC_CONFLICT_DETECTED"
        };
        return this.updateStatus({
          ...tt(g.getSyncSettings(), this.status),
          mode: "idle",
          health: "connected",
          degradedReason: void 0,
          inFlight: !1,
          queued: !1,
          conflicts: c,
          projectStateById: this.withConflictProjectStates(
            this.toSyncedProjectStates(e.projectLastSyncedAtByProjectId),
            c
          ),
          lastRun: C
        }), {
          success: !1,
          message: "SYNC_CONFLICT_DETECTED",
          pulled: C.pulled,
          pushed: 0,
          conflicts: c
        };
      }
      await this.applyMergedBundleToLocal(l), await fr.upsertBundle(s, l);
      const d = (/* @__PURE__ */ new Date()).toISOString(), u = this.buildProjectSyncMapForSuccess(
        e,
        l,
        d,
        o
      ), T = this.buildEntityBaselineMapForSuccess(
        e,
        l,
        d,
        o
      ), _ = g.setSyncSettings({
        lastSyncedAt: d,
        lastError: void 0,
        projectLastSyncedAtByProjectId: u,
        entityBaselinesByProjectId: T,
        pendingConflictResolutions: void 0
      });
      o.length > 0 && g.removePendingProjectDeletes(o);
      const h = {
        success: !0,
        message: `SYNC_OK:${t}`,
        pulled: this.countBundleRows(a),
        pushed: this.countBundleRows(l),
        conflicts: c,
        syncedAt: d
      };
      return this.updateStatus({
        ...tt(_, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: void 0,
        inFlight: !1,
        conflicts: c,
        projectStateById: this.toSyncedProjectStates(u),
        lastRun: {
          at: d,
          pulled: h.pulled,
          pushed: h.pushed,
          conflicts: h.conflicts.total,
          success: !0,
          message: h.message
        }
      }), this.queuedRun && (this.queuedRun = !1, this.runNow("queued")), h;
    } catch (e) {
      const r = ra(e), s = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts.total,
        success: !1,
        message: r
      };
      if (ht(r))
        this.applyAuthFailureState(r, s);
      else {
        const a = g.setSyncSettings({
          lastError: r
        });
        this.updateStatus({
          ...tt(a, this.status),
          mode: "error",
          health: this.status.connected ? "connected" : "disconnected",
          degradedReason: void 0,
          inFlight: !1,
          queued: !1,
          projectStateById: this.withErrorProjectStates(this.status.projectStateById, r),
          lastRun: s
        });
      }
      return this.queuedRun = !1, v.error("Sync run failed", { error: e, reason: t }), {
        success: !1,
        message: r,
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts
      };
    }
  }
  async ensureAccessToken(t) {
    const e = (a) => {
      a && g.setSyncSettings({
        accessTokenCipher: a
      });
    }, r = t.expiresAt ? Date.parse(t.expiresAt) <= Date.now() + 6e4 : !0, o = B.getAccessToken(t);
    if (o.errorCode && ht(o.errorCode))
      throw new Error(o.errorCode);
    e(o.migratedCipher);
    let s = o.token;
    if (r || !s) {
      const a = B.getRefreshToken(t);
      if (a.errorCode && ht(a.errorCode))
        throw new Error(a.errorCode);
      if (a.migratedCipher && g.setSyncSettings({
        refreshTokenCipher: a.migratedCipher
      }), !a.token)
        throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
      const i = await B.refreshSession(t), l = g.setSyncSettings({
        provider: i.provider,
        userId: i.userId,
        email: i.email,
        expiresAt: i.expiresAt,
        accessTokenCipher: i.accessTokenCipher,
        refreshTokenCipher: i.refreshTokenCipher
      }), c = B.getAccessToken(l);
      if (c.errorCode && ht(c.errorCode))
        throw new Error(c.errorCode);
      e(c.migratedCipher), s = c.token;
    }
    if (!s)
      throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
    return s;
  }
  async buildLocalBundle(t) {
    const e = Kr(), r = R.getClient(), o = Ar(
      g.getSyncSettings().pendingProjectDeletes
    ), s = await r.project.findMany({
      include: {
        chapters: !0,
        characters: !0,
        terms: !0
      }
    });
    for (const a of s)
      await this.collectProjectBundleData(e, t, a);
    return this.appendPendingProjectDeleteTombstones(e, t, o), e;
  }
  async collectProjectBundleData(t, e, r) {
    const o = this.appendProjectRecord(t, e, r);
    if (!o) return;
    const { projectId: s, projectPath: a, projectUpdatedAt: i } = o;
    if (this.appendChapterRecords(
      t,
      e,
      s,
      Array.isArray(r.chapters) ? r.chapters : []
    ), this.appendCharacterRecords(
      t,
      e,
      s,
      Array.isArray(r.characters) ? r.characters : []
    ), this.appendTermRecords(
      t,
      e,
      s,
      Array.isArray(r.terms) ? r.terms : []
    ), a && a.toLowerCase().endsWith(G))
      try {
        const l = M(a, "projectPath");
        await this.collectWorldDocuments(
          t,
          e,
          s,
          l,
          i
        );
      } catch (l) {
        v.warn("Skipping sync world document read for invalid projectPath", {
          projectId: s,
          projectPath: a,
          error: l
        });
      }
  }
  appendProjectRecord(t, e, r) {
    const o = O(r.id);
    if (!o) return null;
    const s = Z(r.updatedAt);
    return t.projects.push({
      id: o,
      userId: e,
      title: O(r.title) ?? "Untitled",
      description: O(r.description),
      createdAt: Z(r.createdAt),
      updatedAt: s
    }), {
      projectId: o,
      projectPath: O(r.projectPath),
      projectUpdatedAt: s
    };
  }
  appendChapterRecords(t, e, r, o) {
    for (const s of o) {
      const a = O(s.id);
      if (!a) continue;
      const i = O(s.deletedAt);
      t.chapters.push({
        id: a,
        userId: e,
        projectId: r,
        title: O(s.title) ?? "Untitled",
        content: O(s.content) ?? "",
        synopsis: O(s.synopsis),
        order: Ee(s.order),
        wordCount: Ee(s.wordCount),
        createdAt: Z(s.createdAt),
        updatedAt: Z(s.updatedAt),
        deletedAt: i
      }), i && t.tombstones.push({
        id: `${r}:chapter:${a}`,
        userId: e,
        projectId: r,
        entityType: "chapter",
        entityId: a,
        deletedAt: i,
        updatedAt: i
      });
    }
  }
  appendCharacterRecords(t, e, r, o) {
    for (const s of o) {
      const a = O(s.id);
      a && t.characters.push({
        id: a,
        userId: e,
        projectId: r,
        name: O(s.name) ?? "Character",
        description: O(s.description),
        firstAppearance: O(s.firstAppearance),
        attributes: O(s.attributes),
        createdAt: Z(s.createdAt),
        updatedAt: Z(s.updatedAt)
      });
    }
  }
  appendTermRecords(t, e, r, o) {
    for (const s of o) {
      const a = O(s.id);
      a && t.terms.push({
        id: a,
        userId: e,
        projectId: r,
        term: O(s.term) ?? "Term",
        definition: O(s.definition),
        category: O(s.category),
        order: Ee(s.order),
        firstAppearance: O(s.firstAppearance),
        createdAt: Z(s.createdAt),
        updatedAt: Z(s.updatedAt)
      });
    }
  }
  appendPendingProjectDeleteTombstones(t, e, r) {
    for (const o of r)
      t.tombstones.push({
        id: `${o.projectId}:project:${o.projectId}`,
        userId: e,
        projectId: o.projectId,
        entityType: "project",
        entityId: o.projectId,
        deletedAt: o.deletedAt,
        updatedAt: o.deletedAt
      });
  }
  addWorldDocumentRecord(t, e, r, o, s, a) {
    t.worldDocuments.push({
      id: `${r}:${o}`,
      userId: e,
      projectId: r,
      docType: o,
      payload: s,
      updatedAt: ys(s) ?? a
    });
  }
  async readWorldDocumentPayload(t, e) {
    const r = sa[e], o = `${F}/${r}`;
    let s = null;
    try {
      s = await H(t, o, v);
    } catch (i) {
      return v.warn("Failed to read .luie world document for sync; skipping doc", {
        projectPath: t,
        entryPath: o,
        docType: e,
        error: i
      }), null;
    }
    if (s === null)
      return null;
    const a = or(s);
    return a === null ? (v.warn("Failed to parse .luie world document for sync; skipping doc", {
      projectPath: t,
      entryPath: o,
      docType: e
    }), null) : a;
  }
  appendScrapMemos(t, e, r, o, s) {
    const a = sr(o);
    for (const i of a.memos)
      t.memos.push({
        id: i.id || Y(),
        userId: e,
        projectId: r,
        title: i.title || "Memo",
        content: i.content,
        tags: i.tags,
        updatedAt: i.updatedAt || s
      });
  }
  async collectWorldDocuments(t, e, r, o, s) {
    for (const i of oa) {
      const l = await this.readWorldDocumentPayload(o, i.docType);
      l && this.addWorldDocumentRecord(
        t,
        e,
        r,
        i.docType,
        l,
        s
      );
    }
    const a = await this.readWorldDocumentPayload(o, "scrap");
    j(a) && (this.addWorldDocumentRecord(
      t,
      e,
      r,
      "scrap",
      a,
      s
    ), this.appendScrapMemos(t, e, r, a, s));
  }
  async hydrateMissingWorldDocsFromPackage(t, e) {
    const r = aa.filter((o) => !t.has(o));
    r.length !== 0 && await Promise.all(
      r.map(async (o) => {
        const s = await this.readWorldDocumentPayload(e, o);
        s !== null && t.set(o, s);
      })
    );
  }
  decodeWorldDocumentPayload(t, e, r) {
    if (typeof r != "string")
      return r;
    const o = or(r);
    return o !== null ? o : (v.warn("Invalid sync world document payload string; using default payload", {
      projectId: t,
      docType: e
    }), null);
  }
  normalizeSynopsisPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "synopsis", e);
    if (!j(r))
      return { synopsis: "", status: "draft" };
    const o = r.status, s = typeof o == "string" && ia.has(o) ? o : "draft", a = {
      synopsis: typeof r.synopsis == "string" ? r.synopsis : "",
      status: s
    };
    return typeof r.genre == "string" && (a.genre = r.genre), typeof r.targetAudience == "string" && (a.targetAudience = r.targetAudience), typeof r.logline == "string" && (a.logline = r.logline), typeof r.updatedAt == "string" && (a.updatedAt = r.updatedAt), a;
  }
  normalizePlotPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "plot", e);
    return j(r) ? {
      columns: (Array.isArray(r.columns) ? r.columns : []).filter((a) => j(a)).map((a, i) => {
        const c = (Array.isArray(a.cards) ? a.cards : []).filter((d) => j(d)).map((d, u) => ({
          id: typeof d.id == "string" && d.id.length > 0 ? d.id : `card-${i}-${u}`,
          content: typeof d.content == "string" ? d.content : ""
        }));
        return {
          id: typeof a.id == "string" && a.id.length > 0 ? a.id : `col-${i}`,
          title: typeof a.title == "string" ? a.title : "",
          cards: c
        };
      }),
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { columns: [] };
  }
  normalizeDrawingPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "drawing", e);
    return j(r) ? {
      paths: Gr(r.paths),
      tool: _s(r.tool),
      iconType: ws(r.iconType),
      color: typeof r.color == "string" ? r.color : void 0,
      lineWidth: typeof r.lineWidth == "number" ? r.lineWidth : void 0,
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { paths: [] };
  }
  normalizeMindmapPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "mindmap", e);
    return j(r) ? {
      nodes: Hr(r.nodes),
      edges: zr(r.edges),
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { nodes: [], edges: [] };
  }
  normalizeGraphPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "graph", e);
    if (!j(r))
      return { nodes: [], edges: [] };
    const o = Array.isArray(r.nodes) ? r.nodes.filter((a) => j(a)) : [], s = Array.isArray(r.edges) ? r.edges.filter((a) => j(a)) : [];
    return {
      nodes: o,
      edges: s,
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    };
  }
  normalizeScrapPayload(t, e, r, o) {
    const s = this.decodeWorldDocumentPayload(t, "scrap", e);
    if (!j(s))
      return {
        memos: r.map((i) => ({
          id: i.id,
          title: i.title,
          content: i.content,
          tags: i.tags,
          updatedAt: i.updatedAt
        })),
        updatedAt: o
      };
    const a = sr(s);
    return {
      memos: a.memos,
      updatedAt: typeof a.updatedAt == "string" ? a.updatedAt : o
    };
  }
  collectDeletedProjectIds(t) {
    const e = /* @__PURE__ */ new Set();
    for (const r of t.projects)
      r.deletedAt && e.add(r.id);
    for (const r of t.tombstones)
      r.entityType === "project" && (e.add(r.entityId), e.add(r.projectId));
    return e;
  }
  async applyProjectDeletes(t, e) {
    for (const r of e)
      (await t.project.findUnique({
        where: { id: r },
        select: { id: !0 }
      }))?.id && await t.project.delete({ where: { id: r } });
  }
  async upsertProjects(t, e, r) {
    for (const o of e) {
      if (o.deletedAt || r.has(o.id)) continue;
      if ((await t.project.findUnique({
        where: { id: o.id },
        select: { id: !0 }
      }))?.id) {
        await t.project.update({
          where: { id: o.id },
          data: {
            title: o.title,
            description: o.description,
            updatedAt: new Date(o.updatedAt)
          }
        });
        continue;
      }
      await t.project.create({
        data: {
          id: o.id,
          title: o.title,
          description: o.description,
          createdAt: new Date(o.createdAt),
          updatedAt: new Date(o.updatedAt),
          settings: {
            create: {
              autoSave: !0,
              autoSaveInterval: ye
            }
          }
        }
      });
    }
  }
  async upsertCharacters(t, e, r) {
    for (const o of e) {
      if (r.has(o.projectId)) continue;
      const s = await t.character.findUnique({
        where: { id: o.id },
        select: { id: !0 }
      });
      if (o.deletedAt) {
        s?.id && await t.character.delete({ where: { id: o.id } });
        continue;
      }
      const a = {
        name: o.name,
        description: o.description,
        firstAppearance: o.firstAppearance,
        attributes: typeof o.attributes == "string" ? o.attributes : JSON.stringify(o.attributes ?? null),
        updatedAt: new Date(o.updatedAt),
        project: {
          connect: { id: o.projectId }
        }
      };
      s?.id ? await t.character.update({ where: { id: o.id }, data: a }) : await t.character.create({
        data: {
          id: o.id,
          ...a,
          createdAt: new Date(o.createdAt)
        }
      });
    }
  }
  async upsertTerms(t, e, r) {
    for (const o of e) {
      if (r.has(o.projectId)) continue;
      const s = await t.term.findUnique({
        where: { id: o.id },
        select: { id: !0 }
      });
      if (o.deletedAt) {
        s?.id && await t.term.delete({ where: { id: o.id } });
        continue;
      }
      const a = {
        term: o.term,
        definition: o.definition,
        category: o.category,
        order: o.order,
        firstAppearance: o.firstAppearance,
        updatedAt: new Date(o.updatedAt),
        project: {
          connect: { id: o.projectId }
        }
      };
      s?.id ? await t.term.update({ where: { id: o.id }, data: a }) : await t.term.create({
        data: {
          id: o.id,
          ...a,
          createdAt: new Date(o.createdAt)
        }
      });
    }
  }
  async applyChapterTombstones(t, e, r) {
    for (const o of e) {
      if (o.entityType !== "chapter" || r.has(o.projectId)) continue;
      const s = await t.chapter.findUnique({
        where: { id: o.entityId },
        select: { id: !0, projectId: !0 }
      });
      !s?.id || s.projectId !== o.projectId || await t.chapter.update({
        where: { id: o.entityId },
        data: {
          deletedAt: new Date(o.deletedAt),
          updatedAt: new Date(o.updatedAt)
        }
      });
    }
  }
  async applyMergedBundleToLocal(t) {
    const e = await this.persistBundleToLuiePackages(t), r = R.getClient(), o = this.collectDeletedProjectIds(t);
    try {
      await r.$transaction(async (s) => {
        const a = s;
        await this.applyProjectDeletes(a, o), await this.upsertProjects(a, t.projects, o);
        for (const i of t.chapters)
          o.has(i.projectId) || await this.upsertChapter(a, i);
        await this.upsertCharacters(a, t.characters, o), await this.upsertTerms(a, t.terms, o), await this.applyChapterTombstones(a, t.tombstones, o);
      });
    } catch (s) {
      const a = e.map((l) => l.projectId);
      v.error("Failed to apply merged bundle to DB cache after .luie persistence", {
        error: s,
        persistedProjectIds: a
      });
      const i = await this.recoverDbCacheFromPersistedPackages(
        e
      );
      throw i.length > 0 ? new Error(
        `SYNC_DB_CACHE_APPLY_FAILED:${a.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${i.join(",")}`
      ) : new Error(`SYNC_DB_CACHE_APPLY_FAILED:${a.join(",") || "none"}`);
    }
  }
  async buildProjectPackagePayload(t, e, r, o) {
    const s = t.projects.find((f) => f.id === e);
    if (!s || s.deletedAt) return null;
    const a = t.chapters.filter((f) => f.projectId === e && !f.deletedAt).sort((f, J) => f.order - J.order), i = t.characters.filter((f) => f.projectId === e && !f.deletedAt).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description ?? void 0,
      firstAppearance: f.firstAppearance ?? void 0,
      attributes: f.attributes ?? void 0
    })), l = t.terms.filter((f) => f.projectId === e && !f.deletedAt).sort((f, J) => f.order - J.order).map((f) => ({
      id: f.id,
      term: f.term,
      definition: f.definition ?? void 0,
      category: f.category ?? void 0,
      firstAppearance: f.firstAppearance ?? void 0
    })), c = /* @__PURE__ */ new Map();
    for (const f of ea(t.worldDocuments))
      f.projectId !== e || f.deletedAt || c.has(f.docType) || c.set(f.docType, f.payload);
    await this.hydrateMissingWorldDocsFromPackage(c, r);
    const d = t.memos.filter((f) => f.projectId === e && !f.deletedAt).map((f) => ({
      id: f.id,
      title: f.title,
      content: f.content,
      tags: f.tags,
      updatedAt: f.updatedAt
    })), u = o.map((f) => ({
      id: f.id,
      chapterId: f.chapterId ?? void 0,
      content: f.content,
      description: f.description ?? void 0,
      createdAt: f.createdAt.toISOString()
    })), T = this.normalizeSynopsisPayload(
      e,
      c.get("synopsis")
    ), _ = this.normalizePlotPayload(
      e,
      c.get("plot")
    ), h = this.normalizeDrawingPayload(
      e,
      c.get("drawing")
    ), E = this.normalizeMindmapPayload(
      e,
      c.get("mindmap")
    ), A = this.normalizeGraphPayload(
      e,
      c.get("graph")
    ), S = this.normalizeScrapPayload(
      e,
      c.get("scrap"),
      d,
      s.updatedAt
    ), C = a.map((f) => ({
      id: f.id,
      title: f.title,
      order: f.order,
      file: `${gt}/${f.id}${Ht}`,
      updatedAt: f.updatedAt
    }));
    return {
      meta: {
        format: Ct,
        container: Nt,
        version: Dt,
        projectId: s.id,
        title: s.title,
        description: s.description ?? void 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        chapters: C
      },
      chapters: a.map((f) => ({
        id: f.id,
        content: f.content
      })),
      characters: i,
      terms: l,
      synopsis: T,
      plot: _,
      drawing: h,
      mindmap: E,
      graph: A,
      memos: S,
      snapshots: u
    };
  }
  async persistBundleToLuiePackages(t) {
    const e = [], r = [];
    for (const o of t.projects) {
      const s = await R.getClient().project.findUnique({
        where: { id: o.id },
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
      }), a = O(s?.projectPath);
      if (!a || !a.toLowerCase().endsWith(G))
        continue;
      let i;
      try {
        i = M(a, "projectPath");
      } catch (c) {
        v.warn("Skipping .luie persistence for invalid projectPath", {
          projectId: o.id,
          projectPath: a,
          error: c
        });
        continue;
      }
      const l = await this.buildProjectPackagePayload(
        t,
        o.id,
        i,
        s?.snapshots ?? []
      );
      if (l)
        try {
          await $r(i, l, v), r.push({
            projectId: o.id,
            projectPath: i
          });
        } catch (c) {
          e.push(o.id), v.error("Failed to persist merged bundle into .luie package", {
            projectId: o.id,
            projectPath: i,
            error: c
          });
        }
    }
    if (e.length > 0)
      throw new Error(`SYNC_LUIE_PERSIST_FAILED:${e.join(",")}`);
    return r;
  }
  async recoverDbCacheFromPersistedPackages(t) {
    if (t.length === 0) return [];
    const e = [];
    for (const r of t)
      try {
        await qr.openLuieProject(r.projectPath);
      } catch (o) {
        e.push(r.projectId), v.error("Failed to recover DB cache from persisted .luie package", {
          projectId: r.projectId,
          projectPath: r.projectPath,
          error: o
        });
      }
    return e;
  }
  async upsertChapter(t, e) {
    const r = await t.chapter.findUnique({
      where: { id: e.id },
      select: { id: !0 }
    }), o = {
      title: e.title,
      content: e.content,
      synopsis: e.synopsis,
      order: e.order,
      wordCount: e.wordCount,
      updatedAt: new Date(e.updatedAt),
      deletedAt: e.deletedAt ? new Date(e.deletedAt) : null,
      project: {
        connect: { id: e.projectId }
      }
    };
    r?.id ? await t.chapter.update({
      where: { id: e.id },
      data: o
    }) : await t.chapter.create({
      data: {
        id: e.id,
        ...o,
        createdAt: new Date(e.createdAt)
      }
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
    const t = z.getAllWindows();
    for (const e of t)
      if (!e.isDestroyed())
        try {
          e.webContents.send(Tt.SYNC_STATUS_CHANGED, this.status);
        } catch (r) {
          v.warn("Failed to broadcast sync status", { error: r });
        }
  }
}
const qt = new Qr(), pi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: Qr,
  syncService: qt
}, Symbol.toStringTag, { value: "Module" })), Pt = W("DeepLink"), ca = "luie://auth/callback", da = "luie://auth/return", la = "luie://auth/", Bt = () => {
  const n = U.getMainWindow();
  if (n) {
    n.isMinimized() && n.restore(), n.focus();
    return;
  }
  const t = U.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, Ae = (n) => {
  const t = z.getAllWindows();
  for (const e of t)
    if (!e.isDestroyed())
      try {
        e.webContents.send(Tt.SYNC_AUTH_RESULT, n);
      } catch (r) {
        Pt.warn("Failed to broadcast OAuth result", { error: r });
      }
}, pa = (n) => {
  const t = n instanceof Error ? n.message : String(n);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, ua = (n) => n === "NO_PENDING" || n === "EXPIRED" || n === "STATE_MISMATCH", gr = (n) => n === "NO_PENDING" ? "NO_PENDING" : n === "EXPIRED" ? "EXPIRED" : n === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", De = (n) => {
  for (const t of n)
    if (typeof t == "string" && t.startsWith(la))
      return t;
  return null;
}, Le = async (n) => {
  if (n.startsWith(da))
    return Bt(), Pt.info("OAuth return deep link handled", { url: n }), !0;
  if (!n.startsWith(ca))
    return !1;
  try {
    return await qt.handleOAuthCallback(n), Bt(), Ae({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Pt.info("OAuth callback processed", { url: n }), !0;
  } catch (t) {
    const e = t instanceof Error ? t.message : String(t), r = pa(t), o = qt.getStatus();
    return o.connected && ua(r) ? (Bt(), Ae({
      status: "stale",
      reason: gr(r),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Pt.warn("OAuth callback arrived after connection was already established", {
      url: n,
      reason: r,
      error: t
    }), !0) : (Bt(), Ae({
      status: "error",
      reason: gr(r),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), Pt.error(o.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
      url: n,
      reason: r,
      error: t
    }), !1);
  }
}, et = (n, t, e) => {
  if (!(!n || n.isDestroyed()))
    try {
      n.webContents.send(Tt.APP_QUIT_PHASE, { phase: t, message: e });
    } catch {
    }
}, ge = async (n, t) => n && !n.isDestroyed() ? Te.showMessageBox(n, t) : Te.showMessageBox(t), ha = (n) => {
  let t = !1;
  m.on("window-all-closed", () => {
    process.platform !== "darwin" && m.quit();
  }), m.on("before-quit", (e) => {
    t || (t = !0, e.preventDefault(), (async () => {
      n.info("App is quitting");
      const { autoSaveManager: r } = await import("./autoSaveManager-_jjQRUWx.js").then((h) => h.d), { snapshotService: o } = await import("./snapshotService-CkktZTOV.js").then((h) => h.a), { projectService: s } = await Promise.resolve().then(() => Vr), a = U.getMainWindow();
      et(a, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let i = !1, l = !1, c = !1;
      if (a && !a.isDestroyed() && a.webContents)
        try {
          i = await new Promise((h) => {
            const E = setTimeout(
              () => h(!1),
              Ln
            );
            en.once(Tt.APP_FLUSH_COMPLETE, (A, S) => {
              l = !!S?.hadQueuedAutoSaves, c = !!S?.rendererDirty, clearTimeout(E), h(!0);
            }), a.webContents.send(Tt.APP_BEFORE_QUIT);
          }), n.info("Renderer flush phase completed", {
            rendererFlushed: i,
            rendererHadQueued: l,
            rendererDirty: c
          });
        } catch (h) {
          n.warn("Renderer flush request failed", h);
        }
      et(a, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored: h } = await r.flushCritical();
        n.info("Pre-dialog mirror flush completed", { mirrored: h });
      } catch (h) {
        n.error("Pre-dialog mirror flush failed", h);
      }
      const d = r.getPendingSaveCount();
      if (d > 0 || l || c || !i)
        try {
          const h = d > 0 ? `${d}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", E = await ge(a, {
            type: "question",
            title: "저장되지 않은 변경사항",
            message: h,
            detail: "저장하지 않으면 변경사항이 손실될 수 있습니다.",
            buttons: ["저장 후 종료", "저장하지 않고 종료", "취소"],
            defaultId: 0,
            cancelId: 2,
            noLink: !0
          });
          if (E.response === 2) {
            n.info("Quit cancelled by user"), t = !1, et(a, "aborted", "종료가 취소되었습니다.");
            return;
          }
          if (E.response === 0) {
            n.info("User chose: save and quit");
            try {
              await Promise.race([
                r.flushAll(),
                new Promise((A) => setTimeout(A, On))
              ]), await r.flushMirrorsToSnapshots("session-end");
            } catch (A) {
              n.error("Save during quit failed", A);
            }
          } else {
            n.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await r.flushMirrorsToSnapshots("session-end-no-save");
            } catch (A) {
              n.warn("Mirror-to-snapshot conversion failed", A);
            }
          }
        } catch (h) {
          n.error("Quit dialog failed; exiting with mirrors on disk", h);
        }
      else
        try {
          await r.flushMirrorsToSnapshots("session-end");
        } catch (h) {
          n.warn("Session-end mirror flush failed", h);
        }
      et(a, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let T = "continue";
      if ((await s.flushPendingExports(jn)).timedOut) {
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
        (h.response === 1 || h.response === 0 && (await s.flushPendingExports(bn)).timedOut && (await ge(a, {
          type: "warning",
          title: "저장 지연 지속",
          message: "저장이 아직 완료되지 않았습니다.",
          detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
          buttons: ["종료 취소", "저장 생략 후 종료"],
          defaultId: 0,
          cancelId: 0,
          noLink: !0
        })).response === 0) && (T = "cancel");
      }
      if (T === "cancel") {
        n.info("Quit cancelled by user during export flush"), t = !1, et(a, "aborted", "종료가 취소되었습니다.");
        return;
      }
      et(a, "finalize", "마무리 정리 중입니다...");
      try {
        await o.pruneSnapshotsAllProjects();
      } catch (h) {
        n.warn("Snapshot pruning failed during quit", h);
      }
      try {
        const { db: h } = await Promise.resolve().then(() => Co);
        await h.disconnect();
      } catch (h) {
        n.warn("DB disconnect failed during quit", h);
      }
      et(a, "completed", "안전하게 종료합니다."), m.exit(0);
    })().catch((r) => {
      n.error("Quit guard failed", r), t = !1;
      const o = U.getMainWindow();
      et(o, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
    }));
  }), process.on("SIGINT", () => {
    n.info("Received SIGINT"), m.quit();
  }), process.on("SIGTERM", () => {
    n.info("Received SIGTERM"), m.quit();
  }), process.on("uncaughtException", (e) => {
    n.error("Uncaught exception", e);
  }), process.on("unhandledRejection", (e) => {
    n.error("Unhandled rejection", e);
  });
}, fa = (n) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : m.requestSingleInstanceLock())) {
    const r = De(process.argv);
    return n.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!r,
      argv: process.argv
    }), m.quit(), !1;
  }
  return m.on("second-instance", (r, o) => {
    const s = De(o);
    n.info("Second instance event received", {
      hasCallbackUrl: !!s
    }), s && Le(s);
    const a = U.getMainWindow();
    a && (a.isMinimized() && a.restore(), a.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-HSSbDImy.js").then((n) => n.c);
Ir({
  logToFile: !0,
  logFilePath: b.join(m.getPath("userData"), qn, Vn),
  minLevel: je.INFO
});
const nt = W("Main"), xt = process.defaultApp === !0, Oe = Date.now();
nt.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: m.isPackaged,
  defaultApp: xt,
  startupStartedAtMs: Oe
});
const Ea = () => {
  const n = "luie";
  let t = !1;
  if (xt) {
    const r = process.argv[1] ? b.resolve(process.argv[1]) : "";
    r && (t = m.setAsDefaultProtocolClient(n, process.execPath, [r]));
  } else
    t = m.setAsDefaultProtocolClient(n);
  if (!t) {
    const r = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    g.getSyncSettings().connected || g.setSyncSettings({ lastError: r }), nt.warn("Failed to register custom protocol for OAuth callback", {
      protocol: n,
      defaultApp: xt,
      reason: r
    });
    return;
  }
  g.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && g.setSyncSettings({ lastError: void 0 }), nt.info("Custom protocol registered", {
    protocol: n,
    defaultApp: xt
  });
};
if (!fa(nt))
  m.quit();
else {
  as(nt), ao(), m.disableHardwareAcceleration(), process.platform === "darwin" && m.on("open-url", (t, e) => {
    t.preventDefault(), Le(e);
  }), Ea();
  const n = De(process.argv);
  n && Le(n), Zo(nt, {
    startupStartedAtMs: Oe,
    onFirstRendererReady: () => {
      const t = Date.now();
      qt.initialize(), nt.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - Oe
      });
    }
  }), ha(nt);
}
export {
  ii as $,
  va as A,
  Es as B,
  Ft as C,
  ti as D,
  P as E,
  fs as F,
  F as G,
  Dr as H,
  Tt as I,
  Lr as J,
  Ot as K,
  G as L,
  Ht as M,
  Kt as N,
  Jt as O,
  Qt as P,
  be as Q,
  Zt as R,
  I as S,
  Ts as T,
  ri as U,
  uo as V,
  le as W,
  qt as X,
  U as Y,
  hs as Z,
  Or as _,
  Vt as a,
  lt as a0,
  Va as a1,
  qa as a2,
  Fe as a3,
  Ma as a4,
  Nn as a5,
  xa as a6,
  za as a7,
  Ya as a8,
  Xa as a9,
  Ba as aa,
  $a as ab,
  Ga as ac,
  Ka as ad,
  Cr as ae,
  Ha as af,
  ka as ag,
  Wa as ah,
  Lt as ai,
  ye as aj,
  Dt as ak,
  Nt as al,
  Ct as am,
  Ye as an,
  Ua as ao,
  oi as ap,
  si as aq,
  ci as ar,
  pi as as,
  gt as b,
  W as c,
  R as d,
  M as e,
  Ja as f,
  ni as g,
  Xt as h,
  ai as i,
  As as j,
  cs as k,
  ps as l,
  li as m,
  bt as n,
  ms as o,
  qr as p,
  gs as q,
  H as r,
  di as s,
  Qa as t,
  Za as u,
  us as v,
  mn as w,
  nr as x,
  ei as y,
  $r as z
};

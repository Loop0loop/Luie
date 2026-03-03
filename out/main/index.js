import { app as S, BrowserWindow as V, Menu as Ae, shell as Yn, safeStorage as K, session as cr, dialog as ft, ipcMain as Jr } from "electron";
import * as at from "node:path";
import M from "node:path";
import * as Xn from "fs";
import { existsSync as qn, promises as pt } from "fs";
import * as C from "path";
import _t, { join as G } from "path";
import Vn from "electron-window-state";
import dr from "electron-store";
import * as Mt from "node:fs/promises";
import { access as Qr, mkdir as lr, writeFile as pr, unlink as ur } from "node:fs/promises";
import { spawn as Kn } from "node:child_process";
import { constants as ve, promises as Dt } from "node:fs";
import { createRequire as Jn } from "node:module";
import { EventEmitter as Qn } from "node:events";
import { randomBytes as Zn, createHash as to, randomUUID as q } from "node:crypto";
import * as R from "fs/promises";
import Zr from "yauzl";
import eo from "yazl";
import { z as i } from "zod";
import ro from "node:module";
const Qi = import.meta.filename, et = import.meta.dirname, Zi = ro.createRequire(import.meta.url);
var Je = /* @__PURE__ */ ((n) => (n.DEBUG = "DEBUG", n.INFO = "INFO", n.WARN = "WARN", n.ERROR = "ERROR", n))(Je || {});
const ie = /* @__PURE__ */ Symbol.for("luie.logger.context"), Ue = "[REDACTED]", no = "[REDACTED_PATH]", tn = "[REDACTED_TEXT]", en = /(token|secret|authorization|api[-_]?key|password|cookie|jwt|verifier)/i, rn = /(content|synopsis|manuscript|chapterText|prompt)/i, nn = /(path|dir|directory|cwd|execPath|userData|datasource|argv)/i, oo = /^(?:\/|[a-zA-Z]:\\|[a-zA-Z]:\/).+/, ao = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, so = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function hr(n, t) {
  if (en.test(t ?? ""))
    return Ue;
  if (rn.test(t ?? ""))
    return tn;
  if (nn.test(t ?? "") && oo.test(n))
    return no;
  let e = n.replace(ao, "Bearer [REDACTED]");
  return so.test(e) && (e = Ue), e;
}
function Ct(n, t, e = /* @__PURE__ */ new WeakSet()) {
  if (typeof n == "string")
    return hr(n, t);
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
      return n.map((r) => Ct(r, t, e));
    if (typeof n == "object") {
      const r = n;
      if (e.has(r))
        return "[Circular]";
      e.add(r);
      const o = {};
      for (const [a, s] of Object.entries(r)) {
        if (en.test(a)) {
          o[a] = Ue;
          continue;
        }
        if (rn.test(a) && typeof s == "string") {
          o[a] = tn;
          continue;
        }
        if (nn.test(a) && typeof s == "string") {
          o[a] = hr(s, a);
          continue;
        }
        o[a] = Ct(s, a, e);
      }
      return o;
    }
    return String(n);
  }
}
function io(n) {
  if (!n || typeof n != "object") return Ct(n);
  const t = n[ie];
  return !t || typeof t != "object" ? Ct(n) : Array.isArray(n) ? Ct({ items: n, _ctx: t }) : Ct({ ...n, _ctx: t });
}
function Me(n, t) {
  return n && typeof n == "object" ? { ...n, [ie]: t } : { value: n, [ie]: t };
}
class co {
  context;
  constructor(t) {
    this.context = t;
  }
  log(t, e, r) {
    if (!lo(t)) return;
    const o = io(r), a = {
      level: t,
      message: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: this.context,
      ...o !== void 0 ? { data: o } : {}
    }, s = `[${a.timestamp}] [${a.level}] [${a.context}] ${a.message}`;
    switch (t) {
      case "DEBUG":
        console.debug(s, o ?? "");
        break;
      case "INFO":
        console.info(s, o ?? "");
        break;
      case "WARN":
        console.warn(s, o ?? "");
        break;
      case "ERROR":
        console.error(s, o ?? "");
        break;
    }
    Z.logToFile && Z.logFilePath && ho(a);
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
const on = typeof process < "u" && typeof process.versions < "u" && !!process.versions.node, fr = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};
let Z = {
  minLevel: "DEBUG",
  logToFile: !1,
  logFilePath: ""
}, Te = null;
function lo(n) {
  return fr[n] >= fr[Z.minLevel];
}
async function po() {
  !on || !Z.logFilePath || (Te || (Te = (async () => {
    const n = await import("node:path");
    await (await import("node:fs/promises")).mkdir(n.dirname(Z.logFilePath), {
      recursive: !0
    });
  })()), await Te);
}
function uo(n) {
  try {
    return JSON.stringify(n);
  } catch {
    return '"[unserializable]"';
  }
}
async function ho(n) {
  if (!(!on || !Z.logFilePath))
    try {
      await po();
      const t = await import("node:fs/promises"), e = uo(n);
      await t.appendFile(Z.logFilePath, `${e}
`, "utf8");
    } catch {
    }
}
function an(n) {
  Z = {
    ...Z,
    ...n
  };
}
function x(n) {
  return new co(n);
}
const tc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LOG_CONTEXT: ie,
  LogLevel: Je,
  configureLogger: an,
  createLogger: x,
  withLogContext: Me
}, Symbol.toStringTag, { value: "Module" })), fo = "Luie", Eo = "0.1.0", sn = (n, t) => typeof n == "string" && n.trim().length > 0 ? n : t, Er = sn(
  "luie",
  fo
), go = sn(
  "0.1.16",
  Eo
), cn = "luie.db", mo = 3e4, Ao = mo, ec = 1e3, ke = 30, To = !0, rc = 300 * 1e3, nc = 60 * 1e3, oc = 200, ac = 5e3, So = 3e3, yo = 1e4, _o = 8e3, wo = 2e4, sc = 60 * 1e3, ic = 2e3, dn = 50, cc = 2e3, dc = 1, lc = 0, pc = 30, uc = 50, hc = 2e3, Io = 5e3, Po = 1400, Ro = 900, Co = 1e3, No = 600, Do = 16, Lo = 16, Oo = "sans", bo = "inter", jo = 16, Fo = 1.6, vo = 800, Uo = "blue", Mo = !0, ko = "logs", Wo = "luie.log", fc = "snapshot-mirror", Bo = "Backups", Se = "settings", $o = "settings.json", ln = "luie", j = ".luie", xo = "luie", Gt = "luie", Go = "Luie Project", gr = "New Project", Ho = "project", Ht = "zip", zt = 1, mt = "meta.json", Tt = "manuscript", zo = `${Tt}/README.md`, D = "world", Lt = "snapshots", pn = "assets", Qe = "characters.json", Ze = "terms.json", Ot = "synopsis.json", qt = "plot-board.json", Vt = "map-drawing.json", Kt = "mindmap.json", ue = "scrap-memos.json", Jt = "graph.json", Yt = ".md", _ = {
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
}, Yo = /* @__PURE__ */ new Set([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity"
]), mr = (n) => Yo.has(n), Xo = (n, t, e) => !0, qo = "light", Vo = "neutral", Ko = "soft", tr = () => process.env.VITEST === "true" || process.env.NODE_ENV === "test", Jo = () => !S.isPackaged && !tr(), Qo = () => S.isPackaged, Zo = () => M.join(process.cwd(), "prisma", "dev.db"), ta = () => M.join(process.cwd(), "prisma", ".tmp", "test.db"), ea = () => M.join(S.getPath("userData"), cn);
function ra() {
  if (process.env.DATABASE_URL) return;
  const n = tr() ? ta() : S.isPackaged ? ea() : Zo();
  process.env.DATABASE_URL = `file:${n}`;
}
const wt = x("SettingsManager"), na = (n) => {
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
}, oa = (n) => {
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
}, oe = oa(process.platform), We = process.platform === "darwin" ? "visible" : "hidden", Zt = (n) => {
  if (!n || typeof n != "object" || Array.isArray(n))
    return;
  const t = typeof n.url == "string" ? n.url.trim() : "", e = typeof n.anonKey == "string" ? n.anonKey.trim() : "";
  if (!(t.length === 0 || e.length === 0))
    return {
      url: t.endsWith("/") ? t.slice(0, -1) : t,
      anonKey: e
    };
}, Ar = {
  editor: {
    fontFamily: Oo,
    fontPreset: bo,
    fontSize: jo,
    lineHeight: Fo,
    maxWidth: vo,
    theme: qo,
    themeTemp: Vo,
    themeContrast: Ko,
    themeAccent: Uo,
    themeTexture: Mo,
    uiMode: "default"
  },
  language: "ko",
  shortcuts: oe,
  lastProjectPath: void 0,
  autoSaveEnabled: To,
  autoSaveInterval: Ao,
  snapshotExportLimit: dn,
  windowBounds: void 0,
  lastWindowState: void 0,
  menuBarMode: We,
  sync: {
    connected: !1,
    autoSync: !0
  },
  startup: {}
};
class Et {
  static instance;
  store;
  constructor() {
    const t = S.getPath("userData"), e = `${t}/${ln}/${Se}`, r = `${e}/${$o}`;
    this.store = new dr({
      name: Se,
      defaults: Ar,
      // 저장 위치: userData/settings.json
      cwd: t,
      encryptionKey: void 0,
      // 필요하다면 암호화 키 추가
      fileExtension: "json"
    }), this.migrateLegacySettingsIfNeeded(e, r), this.migrateLegacyWindowSettings(), wt.info("Settings manager initialized", {
      path: this.store.path
    });
  }
  async migrateLegacySettingsIfNeeded(t, e) {
    const r = await this.pathExists(e), o = await this.pathExists(this.store.path);
    if (!(!r || o))
      try {
        const a = new dr({
          name: Se,
          defaults: Ar,
          cwd: t,
          fileExtension: "json"
        });
        this.store.set(a.store), wt.info("Settings migrated from legacy path", {
          from: a.path,
          to: this.store.path
        });
      } catch (a) {
        wt.error("Failed to migrate legacy settings", a);
      }
  }
  async pathExists(t) {
    try {
      return await Qr(t), !0;
    } catch {
      return !1;
    }
  }
  migrateLegacyWindowSettings() {
    const t = this.store.store;
    if (t.menuBarMode || this.store.set("menuBarMode", We), "titleBarMode" in t) {
      const { titleBarMode: e, ...r } = t;
      this.store.set(r);
    }
  }
  static getInstance() {
    return Et.instance || (Et.instance = new Et()), Et.instance;
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
      sync: na(t.sync)
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
    this.store.set(r), wt.info("Settings updated", { settings: r });
  }
  // 에디터 설정
  getEditorSettings() {
    return this.store.get("editor");
  }
  setEditorSettings(t) {
    this.store.set("editor", { ...this.getEditorSettings(), ...t }), wt.info("Editor settings updated", { settings: t });
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
    return { shortcuts: { ...oe, ...t }, defaults: oe };
  }
  setShortcuts(t) {
    const e = { ...oe, ...t };
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
    return this.store.get("menuBarMode") ?? We;
  }
  setMenuBarMode(t) {
    this.store.set("menuBarMode", t);
  }
  getSyncSettings() {
    const t = this.store.get("sync"), e = Array.isArray(t?.pendingProjectDeletes) ? t.pendingProjectDeletes.filter(
      (d) => !!(d && typeof d == "object" && typeof d.projectId == "string" && d.projectId.length > 0 && typeof d.deletedAt == "string" && d.deletedAt.length > 0)
    ).map((d) => ({
      projectId: d.projectId,
      deletedAt: d.deletedAt
    })) : void 0, r = t?.projectLastSyncedAtByProjectId, o = r && typeof r == "object" && !Array.isArray(r) ? Object.fromEntries(
      Object.entries(r).filter(
        (d) => typeof d[0] == "string" && d[0].length > 0 && typeof d[1] == "string" && d[1].length > 0
      )
    ) : void 0, a = t?.entityBaselinesByProjectId, s = a && typeof a == "object" && !Array.isArray(a) ? Object.fromEntries(
      Object.entries(a).filter(
        (d) => typeof d[0] == "string" && d[0].length > 0 && !!d[1] && typeof d[1] == "object" && !Array.isArray(d[1])
      ).map(([d, l]) => {
        const u = l.chapter && typeof l.chapter == "object" && !Array.isArray(l.chapter) ? Object.fromEntries(
          Object.entries(l.chapter).filter(
            (h) => typeof h[0] == "string" && h[0].length > 0 && typeof h[1] == "string" && h[1].length > 0
          )
        ) : {}, m = l.memo && typeof l.memo == "object" && !Array.isArray(l.memo) ? Object.fromEntries(
          Object.entries(l.memo).filter(
            (h) => typeof h[0] == "string" && h[0].length > 0 && typeof h[1] == "string" && h[1].length > 0
          )
        ) : {}, A = typeof l.capturedAt == "string" && l.capturedAt.length > 0 ? l.capturedAt : (/* @__PURE__ */ new Date()).toISOString();
        return [
          d,
          {
            chapter: u,
            memo: m,
            capturedAt: A
          }
        ];
      })
    ) : void 0, c = t?.pendingConflictResolutions, p = c && typeof c == "object" && !Array.isArray(c) ? Object.fromEntries(
      Object.entries(c).filter(
        (d) => typeof d[0] == "string" && d[0].length > 0 && (d[1] === "local" || d[1] === "remote")
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
      entityBaselinesByProjectId: s && Object.keys(s).length > 0 ? s : void 0,
      pendingConflictResolutions: p && Object.keys(p).length > 0 ? p : void 0,
      runtimeSupabaseConfig: Zt(
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
      const c = Object.fromEntries(
        Object.entries(o).filter(
          (p) => typeof p[0] == "string" && p[0].length > 0 && typeof p[1] == "string" && p[1].length > 0
        )
      );
      r.projectLastSyncedAtByProjectId = Object.keys(c).length > 0 ? c : void 0;
    } else
      r.projectLastSyncedAtByProjectId = void 0;
    const a = r.entityBaselinesByProjectId;
    if (a && typeof a == "object" && !Array.isArray(a)) {
      const c = Object.fromEntries(
        Object.entries(a).filter(
          (p) => typeof p[0] == "string" && p[0].length > 0 && !!p[1] && typeof p[1] == "object" && !Array.isArray(p[1])
        ).map(([p, d]) => {
          const l = d.chapter && typeof d.chapter == "object" && !Array.isArray(d.chapter) ? Object.fromEntries(
            Object.entries(d.chapter).filter(
              (A) => typeof A[0] == "string" && A[0].length > 0 && typeof A[1] == "string" && A[1].length > 0
            )
          ) : {}, u = d.memo && typeof d.memo == "object" && !Array.isArray(d.memo) ? Object.fromEntries(
            Object.entries(d.memo).filter(
              (A) => typeof A[0] == "string" && A[0].length > 0 && typeof A[1] == "string" && A[1].length > 0
            )
          ) : {}, m = typeof d.capturedAt == "string" && d.capturedAt.length > 0 ? d.capturedAt : (/* @__PURE__ */ new Date()).toISOString();
          return [
            p,
            {
              chapter: l,
              memo: u,
              capturedAt: m
            }
          ];
        })
      );
      r.entityBaselinesByProjectId = Object.keys(c).length > 0 ? c : void 0;
    } else
      r.entityBaselinesByProjectId = void 0;
    const s = r.pendingConflictResolutions;
    if (s && typeof s == "object" && !Array.isArray(s)) {
      const c = Object.fromEntries(
        Object.entries(s).filter(
          (p) => typeof p[0] == "string" && p[0].length > 0 && (p[1] === "local" || p[1] === "remote")
        )
      );
      r.pendingConflictResolutions = Object.keys(c).length > 0 ? c : void 0;
    } else
      r.pendingConflictResolutions = void 0;
    return r.runtimeSupabaseConfig = Zt(r.runtimeSupabaseConfig), this.store.set("sync", r), r;
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
    const e = this.getSyncSettings(), o = (Array.isArray(e.pendingProjectDeletes) ? e.pendingProjectDeletes : []).filter((a) => a.projectId !== t.projectId);
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
    const e = new Set(t), r = this.getSyncSettings(), a = (Array.isArray(r.pendingProjectDeletes) ? r.pendingProjectDeletes : []).filter((s) => !e.has(s.projectId));
    return this.setSyncSettings({
      pendingProjectDeletes: a.length > 0 ? a : void 0
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
    return Zt(t.runtimeSupabaseConfig);
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
    const e = Zt(t);
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
    const e = this.getStartupSettings(), o = Object.prototype.hasOwnProperty.call(t, "completedAt") ? t.completedAt : e.completedAt, a = o ? { completedAt: o } : {};
    return this.store.set("startup", a), a;
  }
  setStartupCompletedAt(t) {
    return this.setStartupSettings({ completedAt: t });
  }
  clearStartupCompletedAt() {
    return this.setStartupSettings({ completedAt: void 0 });
  }
  // 설정 초기화
  resetToDefaults() {
    this.store.clear(), wt.info("Settings reset to defaults");
  }
  // 저장 경로 가져오기 (디버깅용)
  getSettingsPath() {
    return this.store.path;
  }
}
const T = Et.getInstance(), Ec = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsManager: Et,
  settingsManager: T
}, Symbol.toStringTag, { value: "Module" })), O = x("WindowManager"), ye = "#f4f4f5";
class aa {
  mainWindow = null;
  startupWizardWindow = null;
  resolveWindowIconPath() {
    const t = [
      G(process.resourcesPath, "icon.png"),
      G(process.resourcesPath, "build", "icons", "icon.png")
    ], e = [
      G(S.getAppPath(), "build", "icons", "icon.png"),
      G(S.getAppPath(), "assets", "public", "luie.png")
    ], r = S.isPackaged ? t : e;
    for (const o of r)
      if (qn(o))
        return o;
  }
  getTitleBarOptions() {
    return process.platform !== "darwin" ? {} : {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: Do, y: Lo }
    };
  }
  getMenuBarMode() {
    return T.getMenuBarMode();
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
    const r = Vn({
      defaultWidth: Po,
      defaultHeight: Ro
    }), o = this.resolveWindowIconPath();
    this.mainWindow = new V({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      minWidth: Co,
      minHeight: No,
      title: Er,
      show: !1,
      backgroundColor: ye,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: G(et, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.mainWindow), r.manage(this.mainWindow);
    const a = S.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !a && process.env.NODE_ENV !== "production";
    if (c)
      O.info("Loading development server", { url: s, isPackaged: a }), this.mainWindow.loadURL(s).catch((p) => {
        O.error("Failed to load development renderer URL", { url: s, error: p });
      }), this.mainWindow.webContents.openDevTools({ mode: "detach" });
    else {
      const p = G(et, "../renderer/index.html");
      O.info("Loading production renderer", { path: p, isPackaged: a }), this.mainWindow.loadFile(p).catch((d) => {
        O.error("Failed to load production renderer file", { path: p, error: d });
      });
    }
    return this.mainWindow.once("ready-to-show", () => {
      this.mainWindow && !this.mainWindow.isDestroyed() && (O.info("Main window ready to show", { deferShow: e }), e || this.showMainWindow());
    }), this.mainWindow.on("closed", () => {
      this.mainWindow = null, O.info("Main window closed");
    }), O.info("Main window created", { isPackaged: a, useDevServer: c }), this.mainWindow;
  }
  createStartupWizardWindow() {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed())
      return this.startupWizardWindow.focus(), this.startupWizardWindow;
    const t = this.resolveWindowIconPath(), e = S.isPackaged, r = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", o = !e && process.env.NODE_ENV !== "production";
    if (this.startupWizardWindow = new V({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: !0,
      title: `${Er} Setup`,
      backgroundColor: "#0b1020",
      ...t ? { icon: t } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !0 } : {},
      webPreferences: {
        preload: G(et, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.startupWizardWindow), o) {
      const a = `${r}/#startup-wizard`;
      O.info("Loading startup wizard (dev)", { wizardUrl: a }), this.startupWizardWindow.loadURL(a).catch((s) => {
        O.error("Failed to load startup wizard (dev)", { wizardUrl: a, error: s });
      });
    } else {
      const a = G(et, "../renderer/index.html");
      O.info("Loading startup wizard (prod)", { path: a }), this.startupWizardWindow.loadFile(a, { hash: "startup-wizard" }).catch((s) => {
        O.error("Failed to load startup wizard (prod)", { path: a, error: s });
      });
    }
    return this.startupWizardWindow.on("closed", () => {
      this.startupWizardWindow = null, O.info("Startup wizard window closed");
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
    this.exportWindow = new V({
      width: e,
      height: r,
      minWidth: 1e3,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: ye,
      ...o ? { icon: o } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: G(et, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.exportWindow);
    const a = S.isPackaged, s = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", c = !a && process.env.NODE_ENV !== "production", p = `?chapterId=${t}`, d = "#export";
    if (c) {
      const l = `${s}/${p}${d}`;
      O.info("Loading export window (dev)", { url: l }), this.exportWindow.loadURL(l).catch((u) => {
        O.error("Failed to load export window (dev)", { url: l, error: u });
      });
    } else {
      const l = G(et, "../renderer/index.html");
      O.info("Loading export window (prod)", { path: l }), this.exportWindow.loadFile(l, { hash: "export", search: p }).catch((u) => {
        O.error("Failed to load export window (prod)", {
          path: l,
          hash: "export",
          search: p,
          error: u
        });
      });
    }
    return this.exportWindow.on("closed", () => {
      this.exportWindow = null, O.info("Export window closed");
    }), c && this.exportWindow.webContents.openDevTools({ mode: "detach" }), this.exportWindow;
  }
  // ─── World Graph Window ───────────────────────────────────────────────────
  worldGraphWindow = null;
  createWorldGraphWindow() {
    if (this.worldGraphWindow)
      return this.worldGraphWindow.focus(), this.worldGraphWindow;
    const t = 1200, e = 800, r = this.resolveWindowIconPath();
    this.worldGraphWindow = new V({
      width: t,
      height: e,
      minWidth: 1e3,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: ye,
      ...r ? { icon: r } : {},
      ...this.getTitleBarOptions(),
      ...process.platform !== "darwin" ? { autoHideMenuBar: !this.shouldShowMenuBar() } : {},
      webPreferences: {
        preload: G(et, "../preload/index.cjs"),
        contextIsolation: !0,
        nodeIntegration: !1,
        sandbox: !0
      }
    }), this.applyMenuBarMode(this.worldGraphWindow);
    const o = S.isPackaged, a = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173", s = !o && process.env.NODE_ENV !== "production", c = "#world-graph";
    if (s) {
      const p = `${a}/${c}`;
      O.info("Loading world graph window (dev)", { url: p }), this.worldGraphWindow.loadURL(p).catch((d) => {
        O.error("Failed to load world graph window (dev)", { url: p, error: d });
      });
    } else {
      const p = G(et, "../renderer/index.html");
      O.info("Loading world graph window (prod)", { path: p }), this.worldGraphWindow.loadFile(p, { hash: "world-graph" }).catch((d) => {
        O.error("Failed to load world graph window (prod)", {
          path: p,
          hash: "world-graph",
          error: d
        });
      });
    }
    return this.worldGraphWindow.on("closed", () => {
      this.worldGraphWindow = null, O.info("World graph window closed");
    }), s && this.worldGraphWindow.webContents.openDevTools({ mode: "detach" }), this.worldGraphWindow;
  }
  applyMenuBarModeToAllWindows() {
    const t = V.getAllWindows();
    for (const e of t)
      e.isDestroyed() || this.applyMenuBarMode(e);
  }
}
const B = new aa(), gc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  windowManager: B
}, Symbol.toStringTag, { value: "Module" })), sa = () => {
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
}, ia = (n) => {
  if (process.platform !== "darwin" || n === "hidden") {
    Ae.setApplicationMenu(null);
    return;
  }
  Ae.setApplicationMenu(Ae.buildFromTemplate(sa()));
}, k = {
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
class y extends Error {
  code;
  details;
  constructor(t, e, r, o) {
    super(e), this.code = t, this.details = r, o && (this.cause = o);
  }
}
function ca(n) {
  return typeof n == "object" && n !== null && "code" in n && "message" in n;
}
const Tr = 4096, da = process.platform === "win32" ? [M.resolve(process.env.WINDIR ?? "C:\\Windows")] : ["/etc", "/bin", "/sbin", "/System", "/private/etc"], Sr = (n) => process.platform === "win32" ? n.toLowerCase() : n, la = (n, t) => {
  const e = Sr(M.resolve(n)), r = Sr(M.resolve(t));
  return e === r || e.startsWith(`${r}${M.sep}`);
};
function pa(n, t) {
  if (typeof n != "string")
    throw new y(
      _.INVALID_INPUT,
      `${t} must be a string`,
      { fieldName: t, receivedType: typeof n }
    );
  const e = n.trim();
  if (!e)
    throw new y(
      _.REQUIRED_FIELD_MISSING,
      `${t} is required`,
      { fieldName: t }
    );
  if (e.length > Tr)
    throw new y(
      _.INVALID_INPUT,
      `${t} is too long`,
      { fieldName: t, length: e.length, maxLength: Tr }
    );
  if (e.includes("\0"))
    throw new y(
      _.INVALID_INPUT,
      `${t} contains invalid null bytes`,
      { fieldName: t }
    );
  return e;
}
function W(n, t = "path") {
  const e = pa(n, t);
  if (!M.isAbsolute(e))
    throw new y(
      _.INVALID_INPUT,
      `${t} must be an absolute path`,
      { fieldName: t, input: e }
    );
  const r = M.resolve(e);
  for (const o of da)
    if (la(r, o))
      throw new y(
        _.FS_PERMISSION_DENIED,
        `${t} points to a restricted system path`,
        { fieldName: t, input: r, restrictedRoot: M.resolve(o) }
      );
  return r;
}
const ua = [
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
], ha = [
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
], fa = {
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
}, Ea = `
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
`, yr = x("DatabaseSeed");
async function ga(n) {
  const t = await n.project.count();
  return t > 0 ? (yr.info("Seed skipped (projects exist)", { count: t }), !1) : (await n.project.create({
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
  }), yr.info("Seed completed (default project created)"), !0);
}
const F = x("DatabaseService"), er = Jn(import.meta.url), { PrismaClient: _r } = er("@prisma/client"), ma = () => {
  const n = er("@prisma/adapter-better-sqlite3");
  if (typeof n == "function") return n;
  if (n && typeof n == "object" && typeof n.PrismaBetterSqlite3 == "function")
    return n.PrismaBetterSqlite3;
  throw new Error("Failed to load Prisma better-sqlite3 adapter");
}, Aa = () => {
  const n = er("better-sqlite3");
  return typeof n == "function" ? n : n.default;
}, Ta = (n) => `"${n.replace(/"/g, '""')}"`, bt = async (n) => {
  try {
    return await Mt.access(n, ve.F_OK), !0;
  } catch {
    return !1;
  }
}, Sa = (n) => {
  const t = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return at.join(n, "node_modules", ".bin", t);
}, wr = "file:", ya = (n) => {
  if (!n.startsWith(wr))
    throw new Error("DATABASE_URL must use sqlite file: URL");
  const t = n.slice(wr.length);
  if (!t || t === ":memory:" || t.startsWith(":memory:?"))
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  const e = t.indexOf("?"), r = e >= 0 ? t.slice(0, e) : t, o = e >= 0 ? t.slice(e + 1) : "", a = W(
    at.isAbsolute(r) ? r : at.resolve(process.cwd(), r),
    "DATABASE_URL"
  ), s = o.length > 0 ? `file:${a}?${o}` : `file:${a}`;
  return { dbPath: a, datasourceUrl: s };
}, _e = async (n, t, e) => await new Promise((r, o) => {
  const a = Kn(n, t, {
    env: e,
    shell: !1,
    windowsHide: !0
  });
  let s = "", c = "";
  a.stdout?.on("data", (p) => {
    s += p.toString();
  }), a.stderr?.on("data", (p) => {
    c += p.toString();
  }), a.on("error", (p) => {
    o(p);
  }), a.on("close", (p) => {
    if (p === 0) {
      r({ stdout: s, stderr: c });
      return;
    }
    const d = new Error(`Prisma command failed with exit code ${p}`);
    d.code = p, d.stdout = s, d.stderr = c, o(d);
  });
}), _a = () => (process.env.LUIE_PACKAGED_SCHEMA_MODE ?? "").trim().toLowerCase() === "prisma-migrate" ? "prisma-migrate" : "bootstrap";
class Nt {
  static instance;
  prisma = null;
  dbPath = null;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    return Nt.instance || (Nt.instance = new Nt()), Nt.instance;
  }
  async initialize() {
    this.prisma || (this.initPromise || (this.initPromise = this.initializeInternal().finally(() => {
      this.initPromise = null;
    })), await this.initPromise);
  }
  async initializeInternal() {
    const t = await this.prepareDatabaseContext();
    if (this.dbPath = t.dbPath, F.info("Initializing database", {
      isPackaged: t.isPackaged,
      isTest: t.isTest,
      hasEnvDb: !!process.env.DATABASE_URL,
      userDataPath: S.getPath("userData"),
      dbPath: t.dbPath,
      datasourceUrl: t.datasourceUrl
    }), await this.applySchema(t), this.prisma = this.createPrismaClient(t), t.isPackaged)
      try {
        await ga(this.prisma);
      } catch (e) {
        F.error("Failed to seed packaged database", { error: e });
      }
    if (this.prisma.$executeRawUnsafe)
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"), await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"), F.info("SQLite WAL mode enabled");
      } catch (e) {
        F.warn("Failed to enable WAL mode", { error: e });
      }
    F.info("Database service initialized");
  }
  createPrismaClient(t) {
    try {
      const e = ma(), r = new e({
        url: t.datasourceUrl
      });
      return new _r({
        adapter: r,
        log: ["error", "warn"]
      });
    } catch (e) {
      if (t.isPackaged)
        throw e;
      return F.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error: e,
        dbPath: t.dbPath,
        isTest: t.isTest
      }), new _r({
        datasources: {
          db: { url: t.datasourceUrl }
        },
        log: ["error", "warn"]
      });
    }
  }
  async prepareDatabaseContext() {
    const t = Qo(), e = S.getPath("userData"), r = tr(), o = process.env.DATABASE_URL, a = !!o;
    let s, c;
    if (a) {
      const p = ya(o ?? "");
      s = p.dbPath, c = p.datasourceUrl;
    } else t ? (s = W(at.join(e, cn), "dbPath"), c = `file:${s}`) : (s = W(at.join(process.cwd(), "prisma", "dev.db"), "dbPath"), c = `file:${s}`);
    return process.env.DATABASE_URL = c, await Mt.mkdir(e, { recursive: !0 }), await Mt.mkdir(at.dirname(s), { recursive: !0 }), await bt(s) || await Mt.writeFile(s, ""), {
      dbPath: s,
      datasourceUrl: c,
      isPackaged: t,
      isTest: r
    };
  }
  async applySchema(t) {
    const e = await bt(t.dbPath), r = t.isPackaged ? process.resourcesPath : process.cwd(), o = at.join(r, "prisma", "schema.prisma"), a = Sa(r), s = at.join(r, "prisma", "migrations"), c = await bt(s) && await Mt.readdir(s, { withFileTypes: !0 }).then((d) => d.some((l) => l.isDirectory())), p = { ...process.env, DATABASE_URL: t.datasourceUrl };
    if (t.isPackaged) {
      await this.applyPackagedSchema(t, {
        dbExists: e,
        schemaPath: o,
        prismaPath: a,
        hasMigrations: c,
        commandEnv: p
      });
      return;
    }
    if (t.isTest) {
      F.info("Running test database push", {
        dbPath: t.dbPath,
        dbExists: e,
        command: "db push"
      });
      try {
        await _e(
          a,
          ["db", "push", "--accept-data-loss", `--schema=${o}`],
          p
        ), F.info("Test database push completed successfully");
      } catch (d) {
        const l = d;
        F.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error: d,
          stdout: l.stdout,
          stderr: l.stderr,
          dbPath: t.dbPath
        }), this.ensurePackagedSqliteSchema(t.dbPath);
      }
      return;
    }
    F.info("Running development database push", {
      dbPath: t.dbPath,
      dbExists: e,
      hasMigrations: c,
      command: "db push"
    });
    try {
      await _e(
        a,
        ["db", "push", "--accept-data-loss", `--schema=${o}`],
        p
      ), F.info("Development database ready");
    } catch (d) {
      const l = d;
      throw F.error("Failed to prepare development database", {
        error: d,
        stdout: l.stdout,
        stderr: l.stderr
      }), d;
    }
  }
  async applyPackagedSchema(t, e) {
    const r = _a();
    if (r === "bootstrap") {
      F.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: t.dbPath,
        schemaMode: r
      }), this.ensurePackagedSqliteSchema(t.dbPath);
      return;
    }
    const { dbExists: o, schemaPath: a, prismaPath: s, hasMigrations: c, commandEnv: p } = e, d = await bt(a), l = await bt(s);
    if (c && d && l) {
      F.info("Running production migrations", {
        dbPath: t.dbPath,
        dbExists: o,
        command: "migrate deploy"
      });
      try {
        await _e(s, ["migrate", "deploy", `--schema=${a}`], p), F.info("Production migrations applied successfully");
      } catch (u) {
        const m = u;
        F.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error: u,
          stdout: m.stdout,
          stderr: m.stderr,
          schemaMode: r
        });
      }
    } else
      F.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: t.dbPath,
        hasMigrations: c,
        hasSchemaFile: d,
        hasPrismaBinary: l,
        resourcesPath: process.resourcesPath,
        schemaMode: r
      });
    this.ensurePackagedSqliteSchema(t.dbPath);
  }
  ensurePackagedSqliteSchema(t) {
    const e = Aa(), r = new e(t);
    try {
      r.pragma("foreign_keys = ON");
      const o = ua.filter(
        (c) => !this.sqliteTableExists(r, c)
      );
      r.exec(Ea);
      const a = [];
      for (const c of ha)
        this.sqliteTableExists(r, c.table) && (this.sqliteTableHasColumn(r, c.table, c.column) || (r.exec(c.sql), a.push(`${c.table}.${c.column}`)));
      const s = [];
      for (const [c, p] of Object.entries(fa))
        for (const d of p)
          this.sqliteTableHasColumn(r, c, d) || s.push(`${c}.${d}`);
      if (s.length > 0)
        throw new Error(`Packaged SQLite schema verification failed: missing ${s.join(", ")}`);
      (o.length > 0 || a.length > 0) && F.info("Packaged SQLite schema bootstrap applied", {
        dbPath: t,
        createdTables: o,
        patchedColumns: a
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
      `PRAGMA table_info(${Ta(e)})`
    ).all().some((s) => s.name === r) : !1;
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
      F.error("Database initialization failed before disconnect", { error: t });
    }), this.prisma && (await this.prisma.$disconnect(), this.prisma = null, F.info("Database disconnected"));
  }
}
const N = Nt.getInstance(), wa = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  db: N
}, Symbol.toStringTag, { value: "Module" })), Be = x("BootstrapLifecycle");
let gt = { isReady: !1 }, jt = null;
const Ia = (n) => n instanceof Error && n.message ? n.message : "Failed to initialize database", Pa = () => {
  for (const n of V.getAllWindows())
    if (!n.isDestroyed())
      try {
        n.webContents.send(k.APP_BOOTSTRAP_STATUS_CHANGED, gt);
      } catch (t) {
        Be.warn("Failed to broadcast bootstrap status", t);
      }
}, we = (n) => {
  gt = n, Pa();
}, mc = () => gt, un = async () => gt.isReady ? gt : jt || (we({ isReady: !1 }), jt = N.initialize().then(() => (we({ isReady: !0 }), Be.info("Bootstrap completed"), gt)).catch((n) => {
  const t = Ia(n);
  return we({ isReady: !1, error: t }), Be.error("Bootstrap failed", n), gt;
}).finally(() => {
  jt = null;
}), jt), Xt = (n) => {
  if (typeof n != "string") return null;
  const t = n.trim();
  if (!t) return null;
  const r = t.startsWith('"') && t.endsWith('"') || t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1).trim() : t;
  return r.length > 0 ? r : null;
}, hn = (n) => {
  const t = n.trim();
  if (!t) return t;
  try {
    return new URL(t).origin;
  } catch {
    return t.endsWith("/") ? t.slice(0, -1) : t;
  }
}, $e = (n) => /^https?:\/\//i.test(n), fn = (n) => {
  try {
    const t = new URL(n);
    return t.protocol !== "http:" && t.protocol !== "https:" ? null : hn(t.toString());
  } catch {
    return null;
  }
}, Ra = (n) => {
  let t = n.trim();
  if (!t) return null;
  if ($e(t))
    try {
      t = new URL(t).hostname;
    } catch {
      return null;
    }
  return t = t.replace(/^https?:\/\//i, ""), t = t.replace(/\/.*$/, ""), t.endsWith(".supabase.co") && (t = t.slice(0, -12)), t.includes(".") && (t = t.split(".")[0] ?? t), /^[a-z0-9-]+$/i.test(t) ? t.toLowerCase() : null;
}, he = (n) => {
  if (!n) return null;
  const t = Xt(n.url), e = Xt(n.anonKey);
  if (!t || !e) return null;
  const r = fn(t);
  return r ? {
    url: r,
    anonKey: e
  } : null;
}, En = (n) => {
  const t = [], e = Xt(n?.url), r = Xt(n?.anonKey);
  e || t.push("SUPABASE_URL_REQUIRED"), r || t.push("SUPABASE_ANON_KEY_REQUIRED");
  let o = null;
  return e && (o = fn(e), o || t.push("SUPABASE_URL_INVALID")), r && r.length < 16 && t.push("SUPABASE_ANON_KEY_TOO_SHORT"), t.length > 0 || !o || !r ? {
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
}, ht = (n) => Xt(process.env[n]), Ca = "https://qzgyjlbpnxxpspoyibpt.supabase.co", Na = "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs", Da = () => {
  const n = he({
    url: Ca,
    anonKey: Na
  });
  return n ? {
    ...n,
    source: "legacy"
  } : null;
}, La = () => {
  const n = he({
    url: ht("SUPABASE_URL") ?? ht("SUPADB_URL") ?? void 0,
    anonKey: ht("SUPABASE_ANON_KEY") ?? ht("SUPABASE_PUBLISHABLE_KEY") ?? ht("SUPADATABASE_API") ?? void 0
  });
  return n ? {
    ...n,
    source: "env"
  } : null;
}, gn = () => {
  const n = T.getRuntimeSupabaseConfig;
  if (typeof n != "function")
    return null;
  const t = n.call(T), e = he(t);
  return e ? {
    ...e,
    source: "runtime"
  } : null;
}, Oa = () => {
  const n = ht("SUPADATABASE_API"), t = ht("SUPADATABASE_PRJ_ID");
  let e = null, r = null;
  if (n && $e(n))
    e = hn(n);
  else if (t) {
    const o = Ra(t);
    o && (e = `https://${o}.supabase.co`);
  }
  return n && !$e(n) && (r = n), !e || !r ? null : {
    url: e,
    anonKey: r,
    source: "legacy"
  };
}, rr = () => La() ?? gn() ?? Oa() ?? Da(), St = () => {
  const n = rr();
  return n ? {
    url: n.url,
    anonKey: n.anonKey
  } : null;
}, Wt = () => {
  const n = St();
  if (!n)
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings."
    );
  return n;
}, mn = () => rr()?.source ?? null, ba = () => he(gn()) ?? null, ja = (n) => {
  const t = En(n);
  if (!t.valid || !t.normalized)
    return t;
  const e = T.setRuntimeSupabaseConfig;
  return typeof e == "function" && e.call(T, t.normalized), t;
}, Fa = (n) => En(n), Ac = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getResolvedSupabaseConfig: rr,
  getRuntimeSupabaseConfig: ba,
  getSupabaseConfig: St,
  getSupabaseConfigOrThrow: Wt,
  getSupabaseConfigSource: mn,
  setRuntimeSupabaseConfig: ja,
  validateRuntimeSupabaseConfig: Fa
}, Symbol.toStringTag, { value: "Module" })), Ft = x("SyncAuthService"), va = "https://eluie.kro.kr/auth/callback", xe = "v2:safe:", Ge = "v2:plain:", ce = "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE", An = (n) => n.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), Ua = () => An(Zn(48)), Ma = (n) => An(to("sha256").update(n).digest()), te = () => {
  const n = process.env.LUIE_OAUTH_REDIRECT_URI?.trim();
  return n && n.length > 0 ? n : va;
}, At = (n, t = "token") => {
  if (K.isEncryptionAvailable()) {
    const r = K.encryptString(n).toString("base64");
    return `${xe}${r}`;
  }
  if (t === "token")
    throw new Error(ce);
  const e = Buffer.from(n, "utf-8").toString("base64");
  return `${Ge}${e}`;
}, ka = (n, t = "token") => {
  const e = Buffer.from(n, "base64");
  if (K.isEncryptionAvailable())
    try {
      const o = K.decryptString(e);
      return {
        plain: o,
        migratedCipher: At(o, t)
      };
    } catch {
      const o = e.toString("utf-8");
      return {
        plain: o,
        migratedCipher: At(o, t)
      };
    }
  if (t === "token")
    throw new Error(ce);
  const r = e.toString("utf-8");
  return {
    plain: r,
    migratedCipher: At(r, t)
  };
}, ee = (n, t = "token") => {
  if (n.startsWith(xe)) {
    if (!K.isEncryptionAvailable())
      throw new Error(ce);
    const e = n.slice(xe.length), r = Buffer.from(e, "base64");
    try {
      return {
        plain: K.decryptString(r)
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
  if (n.startsWith(Ge)) {
    if (t === "token" && !K.isEncryptionAvailable())
      throw new Error(ce);
    const e = n.slice(Ge.length), o = Buffer.from(e, "base64").toString("utf-8"), a = K.isEncryptionAvailable() ? At(o, t) : void 0;
    return {
      plain: o,
      migratedCipher: a
    };
  }
  return ka(n, t);
};
class Wa {
  pendingPkce = null;
  pendingTtlMs = 600 * 1e3;
  clearPendingPkce() {
    this.pendingPkce = null, T.clearPendingSyncAuth();
  }
  storePendingPkce(t) {
    this.pendingPkce = t, T.setPendingSyncAuth({
      state: t.state,
      verifierCipher: At(t.verifier, "pending"),
      createdAt: new Date(t.createdAt).toISOString(),
      redirectUri: t.redirectUri
    });
  }
  getPendingPkceFromSettings() {
    const t = T.getSyncSettings();
    if (!t.pendingAuthVerifierCipher || !t.pendingAuthCreatedAt)
      return null;
    const e = Date.parse(t.pendingAuthCreatedAt);
    if (!Number.isFinite(e))
      return this.clearPendingPkce(), null;
    try {
      const r = ee(t.pendingAuthVerifierCipher, "pending");
      return r.migratedCipher && T.setPendingSyncAuth({
        state: t.pendingAuthState,
        verifierCipher: r.migratedCipher,
        createdAt: t.pendingAuthCreatedAt,
        redirectUri: t.pendingAuthRedirectUri
      }), {
        state: t.pendingAuthState,
        verifier: r.plain,
        createdAt: e,
        redirectUri: t.pendingAuthRedirectUri || te()
      };
    } catch (r) {
      return Ft.warn("Failed to decode pending OAuth verifier", { error: r }), this.clearPendingPkce(), null;
    }
  }
  getPendingPkce() {
    if (this.pendingPkce) {
      if (!this.pendingPkce.state) {
        const e = T.getSyncSettings().pendingAuthState;
        e && (this.pendingPkce.state = e);
      }
      if (!this.pendingPkce.redirectUri) {
        const e = T.getSyncSettings().pendingAuthRedirectUri;
        this.pendingPkce.redirectUri = e || te();
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
    return St() !== null;
  }
  async startGoogleAuth() {
    const t = this.getActivePendingPkce();
    if (t) {
      const c = Date.now() - t.createdAt;
      throw Ft.info("OAuth flow already in progress", { ageMs: c }), new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
    }
    const { url: e } = Wt(), r = Ua(), o = Ma(r), a = te();
    this.storePendingPkce({
      verifier: r,
      createdAt: Date.now(),
      redirectUri: a
    });
    const s = new URL("/auth/v1/authorize", e);
    s.searchParams.set("provider", "google"), s.searchParams.set("redirect_to", a), s.searchParams.set("code_challenge", o), s.searchParams.set("code_challenge_method", "s256"), Ft.info("Opening OAuth authorize URL", {
      authorizeBase: `${s.origin}${s.pathname}`,
      redirectUri: a,
      authorizeUrl: s.toString()
    }), await Yn.openExternal(s.toString());
  }
  async completeOAuthCallback(t) {
    const e = this.getPendingPkce();
    if (!e)
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    if (Date.now() - e.createdAt > this.pendingTtlMs)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_REQUEST_EXPIRED");
    const r = new URL(t), o = r.searchParams, a = r.hash.startsWith("#") ? r.hash.slice(1) : r.hash, s = new URLSearchParams(a), c = (h) => o.get(h) ?? s.get(h), p = c("state"), d = c("code"), l = c("error"), u = c("error_code"), m = c("error_description");
    if (l) {
      this.clearPendingPkce();
      const h = u ?? l, f = m ?? l;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${h}:${f}`
      );
    }
    if (!d)
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_CODE_MISSING");
    if (e.state && (!p || p !== e.state))
      throw this.clearPendingPkce(), new Error("SYNC_AUTH_STATE_MISMATCH");
    const A = await this.exchangeCodeForSession(
      d,
      e.verifier,
      e.redirectUri || te()
    );
    return this.clearPendingPkce(), A;
  }
  async refreshSession(t) {
    if (!t.refreshTokenCipher || !t.userId)
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    const e = ee(t.refreshTokenCipher).plain;
    return await this.exchangeRefreshToken(e);
  }
  getAccessToken(t) {
    if (!t.accessTokenCipher)
      return { token: null };
    try {
      const e = ee(t.accessTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return Ft.warn("Failed to decrypt sync access token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  getRefreshToken(t) {
    if (!t.refreshTokenCipher)
      return { token: null };
    try {
      const e = ee(t.refreshTokenCipher);
      return {
        token: e.plain,
        migratedCipher: e.migratedCipher
      };
    } catch (e) {
      return Ft.warn("Failed to decrypt sync refresh token", { error: e }), {
        token: null,
        errorCode: e instanceof Error ? e.message : String(e)
      };
    }
  }
  async exchangeCodeForSession(t, e, r) {
    const { url: o, anonKey: a } = Wt(), s = new URL("/auth/v1/token", o);
    s.searchParams.set("grant_type", "pkce");
    const c = await fetch(s, {
      method: "POST",
      headers: {
        apikey: a,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_code: t,
        code_verifier: e,
        redirect_uri: r
      })
    });
    if (!c.ok) {
      const d = await c.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${c.status}:${d}`);
    }
    const p = await c.json();
    return this.toSyncSession(p);
  }
  async exchangeRefreshToken(t) {
    const { url: e, anonKey: r } = Wt(), o = new URL("/auth/v1/token", e);
    o.searchParams.set("grant_type", "refresh_token");
    const a = await fetch(o, {
      method: "POST",
      headers: {
        apikey: r,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh_token: t
      })
    });
    if (!a.ok) {
      const c = await a.text();
      throw new Error(`SYNC_AUTH_REFRESH_FAILED:${a.status}:${c}`);
    }
    const s = await a.json();
    return this.toSyncSession(s);
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
      accessTokenCipher: At(e),
      refreshTokenCipher: At(r)
    };
  }
}
const H = new Wa(), Ba = x("StartupReadinessService"), Ie = "startup:wizard-completed", Tn = () => (/* @__PURE__ */ new Date()).toISOString(), b = (n, t, e, r = !0) => ({
  key: n,
  ok: t,
  blocking: r,
  detail: e,
  checkedAt: Tn()
});
class $a {
  events = new Qn();
  async getReadiness() {
    const t = await this.runChecks(), e = t.filter((a) => a.blocking && !a.ok).map((a) => a.key), r = T.getStartupSettings().completedAt;
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
    T.setStartupCompletedAt(Tn());
    const e = await this.getReadiness();
    return this.events.emit(Ie, e), e;
  }
  onWizardCompleted(t) {
    return this.events.on(Ie, t), () => {
      this.events.off(Ie, t);
    };
  }
  async runChecks() {
    const t = [];
    return t.push(await this.checkSafeStorage()), t.push(await this.checkDataDirRW()), t.push(await this.checkDefaultLuiePath()), t.push(await this.checkSqliteConnect()), t.push(await this.checkSqliteWal()), t.push(await this.checkSupabaseRuntimeConfig()), t.push(await this.checkSupabaseSession()), t;
  }
  async checkSafeStorage() {
    try {
      const t = K.isEncryptionAvailable();
      return b(
        "osPermission",
        t,
        t ? "safeStorage available" : "safeStorage encryption is unavailable on this OS session"
      );
    } catch (t) {
      return b("osPermission", !1, this.toErrorMessage(t));
    }
  }
  async checkDataDirRW() {
    const t = S.getPath("userData"), e = M.join(t, `.startup-rw-${Date.now()}.tmp`);
    try {
      return await lr(t, { recursive: !0 }), await pr(e, "ok", { encoding: "utf8" }), b("dataDirRW", !0, t);
    } catch (r) {
      return b(
        "dataDirRW",
        !1,
        `${t}: ${this.toErrorMessage(r)}`
      );
    } finally {
      await ur(e).catch(() => {
      });
    }
  }
  async checkDefaultLuiePath() {
    const t = S.getPath("documents"), e = M.join(t, ln), r = M.join(e, ".startup-probe");
    try {
      return await lr(e, { recursive: !0 }), await Qr(e, ve.R_OK | ve.W_OK), await pr(r, "ok", { encoding: "utf8" }), b("defaultLuiePath", !0, e);
    } catch (o) {
      return b(
        "defaultLuiePath",
        !1,
        `${e}: ${this.toErrorMessage(o)}`
      );
    } finally {
      await ur(r).catch(() => {
      });
    }
  }
  async checkSqliteConnect() {
    try {
      return await N.initialize(), N.getClient(), b("sqliteConnect", !0, "SQLite connection ready");
    } catch (t) {
      return b("sqliteConnect", !1, this.toErrorMessage(t));
    }
  }
  async checkSqliteWal() {
    try {
      await N.initialize();
      const t = N.getClient();
      return typeof t.$executeRawUnsafe == "function" && await t.$executeRawUnsafe("PRAGMA journal_mode=WAL;"), b("sqliteWal", !0, "WAL mode enabled");
    } catch (t) {
      return b("sqliteWal", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseRuntimeConfig() {
    try {
      const t = St(), e = mn();
      return t ? b(
        "supabaseRuntimeConfig",
        !0,
        e ? `resolved from ${e}` : "resolved"
      ) : b(
        "supabaseRuntimeConfig",
        !1,
        "Runtime Supabase configuration is not completed"
      );
    } catch (t) {
      return b("supabaseRuntimeConfig", !1, this.toErrorMessage(t));
    }
  }
  async checkSupabaseSession() {
    try {
      const t = T.getSyncSettings();
      if (!t.connected || !t.userId)
        return b(
          "supabaseSession",
          !1,
          "Sync login is not connected yet (non-blocking)",
          !1
        );
      const e = H.getAccessToken(t), r = H.getRefreshToken(t);
      if (!(!!e.token || !!r.token))
        return b(
          "supabaseSession",
          !1,
          e.errorCode ?? r.errorCode ?? "No usable JWT token",
          !1
        );
      if (!e.token)
        return b(
          "supabaseSession",
          !1,
          "Access token is unavailable. Reconnect sync login.",
          !1
        );
      const a = St();
      if (!a)
        return b(
          "supabaseSession",
          !1,
          "Runtime Supabase configuration is not completed",
          !1
        );
      const s = await fetch(`${a.url}/functions/v1/luieEnv`, {
        method: "GET",
        headers: {
          apikey: a.anonKey,
          Authorization: `Bearer ${e.token}`
        }
      });
      if (!s.ok)
        return b(
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
      return c?.ok ? b(
        "supabaseSession",
        !0,
        c.userId ?? t.email ?? t.userId,
        !1
      ) : b(
        "supabaseSession",
        !1,
        "Edge auth health response is invalid",
        !1
      );
    } catch (t) {
      return Ba.warn("Startup session check failed", { error: t }), b("supabaseSession", !1, this.toErrorMessage(t), !1);
    }
  }
  toErrorMessage(t) {
    return t instanceof Error && t.message ? t.message : String(t);
  }
}
const Pe = new $a(), Ir = 1500, xa = 8e3, Ga = () => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; "), Ha = () => [
  "default-src 'self' http://localhost:5173 ws://localhost:5173",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net http://localhost:5173",
  "img-src 'self' data: blob: https: http://localhost:5173",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173",
  "worker-src 'self' blob:"
].join("; "), za = (n) => n ? process.env.LUIE_DEV_CSP === "1" ? Ha() : null : Ga(), Ya = (n) => n.startsWith("file://"), Xa = async (n, t, e) => {
  n.error("Renderer process crashed", {
    killed: e,
    webContentsId: t.id
  });
  try {
    const { autoSaveManager: o } = await import("./autoSaveManager-ClMJw6rl.js").then((a) => a.d);
    await o.flushCritical(), n.info("Emergency save completed after crash");
  } catch (o) {
    n.error("Failed to save during crash recovery", o);
  }
  const r = B.getMainWindow();
  r && !r.isDestroyed() && ((await ft.showMessageBox(r, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1
  })).response === 0 ? (B.closeMainWindow(), setTimeout(() => {
    B.createMainWindow();
  }, 500)) : S.quit());
}, qa = async (n) => {
  const t = Date.now(), e = await un();
  if (!e.isReady) {
    n.error("App bootstrap did not complete", e);
    return;
  }
  try {
    const { autoSaveManager: r } = await import("./autoSaveManager-ClMJw6rl.js").then((a) => a.d);
    await r.flushMirrorsToSnapshots("startup-recovery");
    const { snapshotService: o } = await import("./snapshotService-BU9Ma5Io.js").then((a) => a.a);
    o.pruneSnapshotsAllProjects(), o.cleanupOrphanArtifacts("startup");
  } catch (r) {
    n.warn("Snapshot recovery/pruning skipped", r);
  }
  try {
    const { projectService: r } = await Promise.resolve().then(() => xn);
    await r.reconcileProjectPathDuplicates();
  } catch (r) {
    n.warn("Project path duplicate reconciliation skipped", r);
  }
  try {
    const { entityRelationService: r } = await import("./entityRelationService-CIZszZTO.js");
    await r.cleanupOrphanRelationsAcrossProjects({ dryRun: !0 }), await r.cleanupOrphanRelationsAcrossProjects({ dryRun: !1 });
  } catch (r) {
    n.warn("Entity relation orphan cleanup skipped", r);
  }
  n.info("Deferred startup maintenance completed", {
    elapsedMs: Date.now() - t
  });
}, Va = (n, t = {}) => {
  const e = t.startupStartedAtMs ?? Date.now();
  S.whenReady().then(async () => {
    n.info("App is ready", {
      startupElapsedMs: Date.now() - e
    });
    const r = Jo(), o = za(r);
    let a = !1, s = !1, c = !1, p = null;
    const d = (f) => {
      if (!a && (a = !0, B.showMainWindow(), n.info("Startup checkpoint: renderer ready", {
        reason: f,
        startupElapsedMs: Date.now() - e
      }), n.info("Startup checkpoint: main window shown", {
        reason: f,
        startupElapsedMs: Date.now() - e
      }), !!t.onFirstRendererReady))
        try {
          t.onFirstRendererReady();
        } catch (g) {
          n.warn("Startup hook failed: onFirstRendererReady", g);
        }
    }, l = (f) => {
      s || (s = !0, n.info("Deferred startup maintenance scheduled", {
        reason: f,
        delayMs: Ir
      }), setTimeout(() => {
        qa(n);
      }, Ir));
    }, u = (f) => {
      if (c) return;
      c = !0, n.info("Starting main window flow", {
        reason: f,
        startupElapsedMs: Date.now() - e
      }), B.createMainWindow({ deferShow: !0 }), n.info("Startup checkpoint: main window requested", {
        startupElapsedMs: Date.now() - e
      });
      const g = Date.now();
      un().then((w) => {
        n.info("Startup checkpoint: bootstrap ready", {
          isReady: w.isReady,
          bootstrapElapsedMs: Date.now() - g,
          startupElapsedMs: Date.now() - e
        }), w.isReady || n.error("App bootstrap did not complete", w);
      }).catch((w) => {
        n.error("App bootstrap did not complete", w);
      }), p && clearTimeout(p), p = setTimeout(() => {
        a || d("fallback-timeout"), l("fallback-timeout");
      }, xa);
    };
    r && cr.defaultSession.webRequest.onBeforeSendHeaders((f, g) => {
      g({
        requestHeaders: {
          ...f.requestHeaders,
          Origin: "http://localhost:5173"
        }
      });
    }), cr.defaultSession.webRequest.onHeadersReceived((f, g) => {
      const w = {
        ...f.responseHeaders
      };
      r && (w["Access-Control-Allow-Origin"] = ["*"], w["Access-Control-Allow-Headers"] = ["*"], w["Access-Control-Allow-Methods"] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]), o && !Ya(f.url) && (w["Content-Security-Policy"] = [o]), g({ responseHeaders: w });
    }), S.on("web-contents-created", (f, g) => {
      g.on(
        "did-fail-load",
        (w, L, E, tt, me) => {
          n.error("Renderer failed to load", {
            errorCode: L,
            errorDescription: E,
            validatedURL: tt,
            isMainFrame: me,
            startupElapsedMs: Date.now() - e
          });
        }
      ), g.on("did-finish-load", () => {
        const w = Date.now() - e;
        n.info("Renderer finished load", {
          url: g.getURL(),
          startupElapsedMs: w
        }), g.getType() === "window" && B.isMainWindowWebContentsId(g.id) && (d("did-finish-load"), l("did-finish-load"));
      }), g.on("console-message", (w) => {
        const { level: L, message: E, lineNumber: tt, sourceId: me } = w;
        (L === "error" ? 3 : L === "warning" ? 2 : L === "info" ? 1 : 0) < 2 || n.warn("Renderer console message", {
          level: L,
          message: E,
          line: tt,
          sourceId: me
        });
      }), g.on("render-process-gone", (w, L) => {
        Xa(n, g, L.reason === "killed");
      });
    });
    const m = Date.now(), { registerIPCHandlers: A } = await import("./index-DWPSqVZK.js");
    A(), n.info("Startup checkpoint: IPC handlers ready", {
      elapsedMs: Date.now() - m,
      startupElapsedMs: Date.now() - e
    }), ia(T.getMenuBarMode());
    const h = await Pe.getReadiness();
    n.info("Startup readiness evaluated", {
      mustRunWizard: h.mustRunWizard,
      reasons: h.reasons,
      completedAt: h.completedAt
    }), h.mustRunWizard ? (B.createStartupWizardWindow(), n.info("Startup wizard requested before main window", {
      reasons: h.reasons
    })) : u("readiness-pass"), Pe.onWizardCompleted((f) => {
      n.info("Startup wizard completion received", {
        mustRunWizard: f.mustRunWizard,
        reasons: f.reasons
      }), !f.mustRunWizard && (B.closeStartupWizardWindow(), u("wizard-complete"));
    }), S.on("activate", () => {
      V.getAllWindows().length === 0 && Pe.getReadiness().then((f) => {
        if (f.mustRunWizard) {
          B.createStartupWizardWindow();
          return;
        }
        u("activate");
      });
    });
  });
}, Ka = "crash-reports", Pr = 100;
let Rr = !1;
const Re = (n) => n.replace(/\b(Bearer\s+)[A-Za-z0-9._-]+\b/gi, "$1[REDACTED_TOKEN]").replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\b/g, "$1[REDACTED_JWT]").replace(
  /\b(AIza[0-9A-Za-z_-]{16,}|sk-[A-Za-z0-9_-]{16,}|pk_[A-Za-z0-9_-]{16,})\b/g,
  "[REDACTED_SECRET]"
), He = (n, t = 0) => {
  if (n == null) return n;
  if (t >= 4) return "[TRUNCATED_DEPTH]";
  if (typeof n == "string" || typeof n == "number" || typeof n == "boolean")
    return typeof n == "string" ? Re(n) : n;
  if (typeof n == "bigint" || typeof n == "symbol") return n.toString();
  if (typeof n == "function") return "[Function]";
  if (n instanceof Error)
    return {
      name: n.name,
      message: Re(n.message),
      stack: n.stack ? Re(n.stack) : void 0
    };
  if (Array.isArray(n))
    return n.slice(0, 50).map((e) => He(e, t + 1));
  if (typeof n == "object") {
    const r = Object.entries(n).slice(0, 100), o = {};
    for (const [a, s] of r)
      o[a] = He(s, t + 1);
    return o;
  }
  return String(n);
}, Ja = () => M.join(S.getPath("userData"), Ka), Qa = async (n, t) => {
  const e = await Dt.readdir(n, { withFileTypes: !0 }), r = await Promise.all(
    e.filter((a) => a.isFile() && a.name.endsWith(".json")).map(async (a) => {
      const s = M.join(n, a.name), c = await Dt.stat(s);
      return { fullPath: s, mtimeMs: c.mtimeMs };
    })
  );
  if (r.length <= Pr) return;
  r.sort((a, s) => s.mtimeMs - a.mtimeMs);
  const o = r.slice(Pr);
  await Promise.all(
    o.map(async (a) => {
      try {
        await Dt.rm(a.fullPath, { force: !0 });
      } catch (s) {
        t.warn("Failed to remove stale crash report", { error: s, path: a.fullPath });
      }
    })
  );
}, Za = async (n, t, e) => {
  const r = Ja();
  await Dt.mkdir(r, { recursive: !0 });
  const o = (/* @__PURE__ */ new Date()).toISOString(), a = q(), s = `${o.replace(/[:.]/g, "-")}-${t}-${a}.json`, c = M.join(r, s), p = `${c}.tmp`, d = {
    id: a,
    timestamp: o,
    type: t,
    appVersion: S.getVersion(),
    isPackaged: S.isPackaged,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    processType: process.type,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    payload: He(e)
  };
  await Dt.writeFile(p, JSON.stringify(d, null, 2), "utf-8"), await Dt.rename(p, c), await Qa(r, n);
}, ts = (n, t) => {
  const e = t ?? {}, r = n ?? {};
  return {
    webContentsId: typeof r.id == "number" ? r.id : void 0,
    reason: e.reason,
    exitCode: e.exitCode
  };
}, es = (n) => {
  const t = n ?? {};
  return {
    type: t.type,
    reason: t.reason,
    exitCode: t.exitCode,
    serviceName: t.serviceName,
    name: t.name
  };
}, rs = (n) => {
  if (Rr) return;
  Rr = !0;
  const t = (e, r) => {
    Za(n, e, r).catch((o) => {
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
  }), S.on("render-process-gone", (e, r, o) => {
    t("render-process-gone", ts(r, o));
  }), S.on("child-process-gone", (e, r) => {
    t("child-process-gone", es(r));
  });
}, de = 5 * 1024 * 1024, Y = (n) => C.posix.normalize(n.replace(/\\/g, "/")).replace(/^\.(\/|\\)/, "").replace(/^\//, ""), it = (n) => {
  const t = Y(n);
  return !t || t.startsWith("../") || t.startsWith("..\\") || t.includes("../") || t.includes("..\\") ? !1 : !C.isAbsolute(t);
}, ct = (n) => n.toLowerCase().endsWith(j) ? n : `${n}${j}`, Cr = (n) => process.platform === "win32" ? n.toLowerCase() : n, ns = (n, t) => {
  const e = Cr(C.resolve(n)), r = Cr(C.resolve(t));
  return e === r || e.startsWith(`${r}${C.sep}`);
}, Sn = async (n, t, e) => {
  const r = Y(t);
  if (!r || !it(r))
    throw new Error("INVALID_RELATIVE_PATH");
  let o = !1, a = null;
  return await new Promise((s, c) => {
    Zr.open(n, { lazyEntries: !0 }, (p, d) => {
      if (p || !d) {
        c(p ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }
      d.on("entry", (l) => {
        const u = Y(l.fileName);
        if (!u || !it(u)) {
          e?.error("Unsafe zip entry skipped", { entry: l.fileName, zipPath: n }), d.readEntry();
          return;
        }
        if (u !== r) {
          d.readEntry();
          return;
        }
        if (l.fileName.endsWith("/")) {
          o = !0, a = null, d.close(), s();
          return;
        }
        d.openReadStream(l, (m, A) => {
          if (m || !A) {
            c(m ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }
          o = !0;
          const h = [], f = A;
          let g = 0;
          f.on("data", (w) => {
            if (g += w.length, g > de) {
              f.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${u}:${de}`
                )
              );
              return;
            }
            h.push(w);
          }), f.on("end", () => {
            a = Buffer.concat(h).toString("utf-8"), d.close(), s();
          }), f.on("error", c);
        });
      }), d.on("end", () => {
        o || s();
      }), d.on("error", c), d.readEntry();
    });
  }), a;
}, X = async (n, t, e) => {
  const r = ct(n), o = Y(t);
  if (!o || !it(o))
    throw new Error("INVALID_RELATIVE_PATH");
  try {
    const a = await R.stat(r);
    if (a.isDirectory()) {
      const s = await R.realpath(r), c = C.resolve(r, o);
      try {
        const p = await R.realpath(c);
        if (!ns(p, s))
          throw new Error("INVALID_RELATIVE_PATH");
        const d = await R.stat(p);
        if (d.isDirectory())
          return null;
        if (d.size > de)
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${o}:${de}`
          );
        return await R.readFile(p, "utf-8");
      } catch (p) {
        if (p?.code === "ENOENT") return null;
        throw p;
      }
    }
    if (a.isFile())
      return await Sn(r, o, e);
  } catch (a) {
    if (a?.code === "ENOENT") return null;
    throw a;
  }
  return null;
};
function yn(n) {
  const t = n?.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...n,
    timestamp: t,
    version: n?.version ?? go
  };
}
function os(n, t) {
  return {
    success: !0,
    data: n,
    meta: yn(t)
  };
}
function Ce(n, t, e, r) {
  return {
    success: !1,
    error: {
      code: n,
      message: t,
      details: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    meta: yn(r)
  };
}
const as = [
  ":create",
  ":update",
  ":delete",
  ":restore",
  ":purge",
  ":reorder",
  ":set-",
  ":run-now",
  "fs:write-",
  "fs:create-",
  "auto-save"
], ss = [
  "sync:",
  "settings:",
  "window:",
  "logger:",
  "app:",
  "recovery:"
], is = (n) => !ss.some((t) => n.startsWith(t)) && as.some((t) => n.includes(t));
function cs(n) {
  Jr.handle(n.channel, async (t, ...e) => {
    const r = Date.now(), o = q();
    let a = e;
    if (n.argsSchema) {
      const s = n.argsSchema.safeParse(e);
      if (!s.success) {
        const c = {
          issues: s.error.issues
        };
        return Ce(
          _.INVALID_INPUT,
          "Invalid input",
          c,
          {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            duration: Date.now() - r,
            requestId: o,
            channel: n.channel
          }
        );
      }
      a = s.data;
    }
    try {
      const s = await n.handler(...a);
      return is(n.channel) && Promise.resolve().then(() => Ri).then(({ syncService: c }) => {
        c.onLocalMutation(n.channel);
      }).catch((c) => {
        n.logger.error(
          "Failed to trigger auto sync after local mutation",
          Me({ error: c }, { requestId: o, channel: n.channel })
        );
      }), os(s, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        duration: Date.now() - r,
        requestId: o,
        channel: n.channel
      });
    } catch (s) {
      const c = n.logTag ?? n.channel;
      n.logger.error(
        `${c} failed`,
        Me({ error: s }, { requestId: o, channel: n.channel })
      );
      const p = s;
      if (ca(p))
        return Ce(
          p.code,
          p.message,
          p.details,
          {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            duration: Date.now() - r,
            requestId: o,
            channel: n.channel
          }
        );
      const d = p?.message ?? n.failMessage, u = Object.values(_).includes(d);
      return Ce(
        u ? d : _.UNKNOWN_ERROR,
        n.failMessage,
        void 0,
        {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          duration: Date.now() - r,
          requestId: o,
          channel: n.channel
        }
      );
    }
  });
}
function ds(n, t) {
  t.forEach((e) => {
    cs({
      logger: n,
      channel: e.channel,
      logTag: e.logTag,
      failMessage: e.failMessage,
      argsSchema: e.argsSchema,
      handler: e.handler
    });
  });
}
const ze = (n, t = "") => {
  const e = n.trim();
  return e ? e.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() : t;
}, nr = 4096, _n = 255, ls = 1e7, dt = i.string().min(1, "Path is required").max(nr, "Path is too long").refine((n) => !n.includes("\0"), "Path must not contain null bytes"), fe = i.string().max(ls, "Content is too large"), ps = i.object({
  name: i.string().min(1).max(100),
  extensions: i.array(i.string().min(1).max(20)).max(20)
}), us = i.object({
  filters: i.array(ps).max(20).optional(),
  defaultPath: dt.optional(),
  title: i.string().min(1).max(200).optional()
}), Tc = i.object({
  title: i.string().min(1, "Title is required"),
  description: i.string().optional(),
  projectPath: i.string().optional()
}), Sc = i.object({
  id: i.string().uuid("Invalid project ID"),
  title: i.string().min(1, "Title is required").optional(),
  description: i.string().optional(),
  projectPath: i.string().optional()
}), hs = i.object({
  id: i.string().uuid("Invalid project ID"),
  deleteFile: i.boolean().optional()
}), yc = i.union([
  i.string().uuid("Invalid project ID"),
  hs
]), _c = i.object({
  projectId: i.string().uuid("Invalid project ID"),
  title: i.string().min(1, "Title is required"),
  synopsis: i.string().optional()
}), wc = i.object({
  id: i.string().uuid("Invalid chapter ID"),
  title: i.string().min(1, "Title is required").optional(),
  content: i.string().optional(),
  synopsis: i.string().optional()
}), Ic = i.object({
  projectId: i.string().uuid("Invalid project ID"),
  name: i.string().min(1, "Name is required"),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Pc = i.object({
  id: i.string().uuid("Invalid character ID"),
  name: i.string().min(1, "Name is required").optional(),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Rc = i.object({
  projectId: i.string().uuid("Invalid project ID"),
  name: i.string().min(1, "Name is required"),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Cc = i.object({
  id: i.string().uuid("Invalid event ID"),
  name: i.string().min(1, "Name is required").optional(),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Nc = i.object({
  projectId: i.string().uuid("Invalid project ID"),
  name: i.string().min(1, "Name is required"),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Dc = i.object({
  id: i.string().uuid("Invalid faction ID"),
  name: i.string().min(1, "Name is required").optional(),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), Lc = i.object({
  projectId: i.string().uuid("Invalid project ID"),
  term: i.string().min(1, "Term is required"),
  definition: i.string().optional(),
  category: i.string().optional(),
  firstAppearance: i.string().optional()
}), Oc = i.object({
  id: i.string().uuid("Invalid term ID"),
  term: i.string().min(1, "Term is required").optional(),
  definition: i.string().optional(),
  category: i.string().optional(),
  firstAppearance: i.string().optional()
}), lt = i.string().uuid("Invalid project ID"), yt = i.string().uuid("Invalid chapter ID"), fs = i.string().uuid("Invalid character ID"), bc = i.string().uuid("Invalid event ID"), jc = i.string().uuid("Invalid faction ID"), Es = i.string().uuid("Invalid term ID"), Fc = i.string().uuid("Invalid snapshot ID"), vc = i.tuple([
  yt,
  i.string(),
  lt
]);
i.object({
  characterId: fs,
  chapterId: yt,
  position: i.number().int().nonnegative(),
  context: i.string().optional()
});
i.object({
  termId: Es,
  chapterId: yt,
  position: i.number().int().nonnegative(),
  context: i.string().optional()
});
const Uc = i.object({
  projectId: lt,
  chapterId: yt.optional(),
  content: i.string(),
  description: i.string().optional(),
  type: i.enum(["AUTO", "MANUAL"]).optional()
}), Mc = i.object({
  projectId: lt,
  query: i.string().min(1, "Query is required"),
  type: i.enum(["all", "character", "term"]).optional()
}), gs = i.object({
  projectId: lt,
  chapterId: yt,
  title: i.string().min(1).max(_n),
  content: fe.min(1),
  format: i.enum(["DOCX", "HWPX"]),
  paperSize: i.enum(["A4", "Letter", "B5"]).optional(),
  marginTop: i.number().nonnegative().max(100).optional(),
  marginBottom: i.number().nonnegative().max(100).optional(),
  marginLeft: i.number().nonnegative().max(100).optional(),
  marginRight: i.number().nonnegative().max(100).optional(),
  fontFamily: i.string().min(1).max(100).optional(),
  fontSize: i.number().positive().max(96).optional(),
  lineHeight: i.string().min(1).max(20).optional(),
  showPageNumbers: i.boolean().optional(),
  startPageNumber: i.number().int().min(1).max(1e5).optional()
}), kc = i.tuple([gs]), Nr = i.tuple([us.optional()]), ms = i.tuple([
  i.string().min(1).max(_n),
  dt,
  fe
]), As = i.tuple([dt]), Ts = i.tuple([
  dt,
  i.string().min(1).max(nr)
]), Ss = i.tuple([dt, fe]), ys = i.tuple([dt, i.unknown()]), _s = i.tuple([
  dt,
  i.string().min(1).max(nr),
  fe
]), ws = i.tuple([dt]), Wc = i.tuple([i.boolean()]), Bc = i.tuple([yt]), $c = i.tuple([
  i.object({
    chapterId: yt,
    projectId: lt
  })
]), xc = i.tuple([
  i.object({
    dryRun: i.boolean().optional()
  }).optional()
]), Is = i.object({
  busy: i.number(),
  log: i.number(),
  checkpointed: i.number()
});
i.object({
  success: i.boolean(),
  message: i.string(),
  backupDir: i.string().optional(),
  checkpoint: i.array(Is).optional(),
  integrity: i.array(i.string()).optional()
});
i.object({
  isReady: i.boolean(),
  error: i.string().optional()
});
const wn = i.enum([
  "osPermission",
  "dataDirRW",
  "defaultLuiePath",
  "sqliteConnect",
  "sqliteWal",
  "supabaseRuntimeConfig",
  "supabaseSession"
]), Ps = i.object({
  key: wn,
  ok: i.boolean(),
  blocking: i.boolean(),
  detail: i.string().optional(),
  checkedAt: i.string()
});
i.object({
  mustRunWizard: i.boolean(),
  checks: i.array(Ps),
  reasons: i.array(wn),
  completedAt: i.string().optional()
});
const In = i.object({
  chapters: i.number().int().nonnegative(),
  memos: i.number().int().nonnegative(),
  total: i.number().int().nonnegative(),
  items: i.array(
    i.object({
      type: i.enum(["chapter", "memo"]),
      id: i.string().min(1),
      projectId: i.string().min(1),
      title: i.string(),
      localUpdatedAt: i.string(),
      remoteUpdatedAt: i.string(),
      localPreview: i.string(),
      remotePreview: i.string()
    })
  ).optional()
});
i.object({
  connected: i.boolean(),
  provider: i.enum(["google"]).optional(),
  email: i.string().email().optional(),
  userId: i.string().uuid().optional(),
  expiresAt: i.string().optional(),
  autoSync: i.boolean(),
  lastSyncedAt: i.string().optional(),
  lastError: i.string().optional(),
  mode: i.enum(["idle", "connecting", "syncing", "error"]),
  health: i.enum(["connected", "degraded", "disconnected"]),
  degradedReason: i.string().optional(),
  inFlight: i.boolean(),
  queued: i.boolean(),
  conflicts: In,
  projectLastSyncedAtByProjectId: i.record(i.string(), i.string()).optional(),
  projectStateById: i.record(
    i.string(),
    i.object({
      state: i.enum(["synced", "pending", "error"]),
      lastSyncedAt: i.string().optional(),
      reason: i.string().optional()
    })
  ).optional(),
  lastRun: i.object({
    at: i.string(),
    pulled: i.number().int().nonnegative(),
    pushed: i.number().int().nonnegative(),
    conflicts: i.number().int().nonnegative(),
    success: i.boolean(),
    message: i.string()
  }).optional()
});
i.object({
  success: i.boolean(),
  message: i.string(),
  pulled: i.number().int().nonnegative(),
  pushed: i.number().int().nonnegative(),
  conflicts: In,
  syncedAt: i.string().optional()
});
const Rs = i.object({
  enabled: i.boolean()
}), Gc = i.tuple([Rs]), Pn = i.object({
  url: i.string().min(1).max(1024).refine((n) => {
    try {
      const t = new URL(n);
      return t.protocol === "http:" || t.protocol === "https:";
    } catch {
      return !1;
    }
  }, "Supabase URL must be a valid http(s) URL"),
  anonKey: i.string().min(16).max(8096)
}), Cs = i.object({
  url: i.string().max(1024).optional(),
  anonKey: i.string().max(8096).optional()
});
i.object({
  url: i.string().nullable(),
  hasAnonKey: i.boolean(),
  source: i.enum(["env", "runtime", "legacy"]).optional()
});
i.object({
  valid: i.boolean(),
  issues: i.array(i.string()),
  normalized: Pn.optional()
});
const Hc = i.tuple([Pn]), zc = i.tuple([Cs]), Ns = i.object({
  type: i.enum(["chapter", "memo"]),
  id: i.string().min(1),
  resolution: i.enum(["local", "remote"])
}), Yc = i.tuple([Ns]), Xc = i.object({
  fontFamily: i.enum(["serif", "sans", "mono"]),
  fontPreset: i.enum([
    "inter",
    "lora",
    "bitter",
    "source-serif",
    "montserrat",
    "nunito-sans",
    "victor-mono"
  ]).optional(),
  fontSize: i.number().int().positive(),
  lineHeight: i.number().positive(),
  maxWidth: i.number().int().positive(),
  theme: i.enum(["light", "dark", "sepia"]),
  themeTemp: i.enum(["neutral", "warm", "cool"]).optional().default("neutral"),
  themeContrast: i.enum(["soft", "high"]).optional().default("soft"),
  themeAccent: i.enum(["blue", "violet", "green", "amber", "rose", "slate"]).optional().default("blue"),
  themeTexture: i.boolean().optional().default(!0),
  uiMode: i.enum(["default", "docs", "editor", "word", "scrivener"]).transform((n) => n === "word" ? "editor" : n).pipe(i.enum(["default", "docs", "editor", "scrivener"])).catch("default")
}), qc = i.object({
  enabled: i.boolean().optional(),
  interval: i.number().int().positive().optional()
}), Vc = i.object({
  language: i.enum(["ko", "en", "ja"])
}), Kc = i.object({
  mode: i.enum(["hidden", "visible"])
}), Jc = i.object({
  shortcuts: i.record(i.string(), i.string())
}), Qc = i.object({
  width: i.number().int().positive(),
  height: i.number().int().positive(),
  x: i.number().int(),
  y: i.number().int()
}), Rn = i.enum(["Place", "Concept", "Rule", "Item"]), Ye = i.enum([
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
]), Cn = i.enum([
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
]), Nn = i.string().uuid("Invalid world entity ID"), Ds = i.string().uuid("Invalid entity relation ID"), Zc = i.object({
  projectId: lt,
  type: Rn,
  name: i.string().min(1, "Name is required"),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional(),
  positionX: i.number().optional(),
  positionY: i.number().optional()
}), td = i.object({
  id: Nn,
  type: Rn.optional(),
  name: i.string().min(1, "Name is required").optional(),
  description: i.string().optional(),
  firstAppearance: i.string().optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), ed = i.object({
  id: Nn,
  positionX: i.number(),
  positionY: i.number()
}), rd = i.object({
  projectId: lt,
  sourceId: i.string().uuid("Invalid source ID"),
  sourceType: Ye,
  targetId: i.string().uuid("Invalid target ID"),
  targetType: Ye,
  relation: Cn,
  attributes: i.record(i.string(), i.unknown()).optional()
}).superRefine((n, t) => {
  Xo(n.relation, n.sourceType, n.targetType);
}), nd = i.object({
  id: Ds,
  relation: Cn.optional(),
  attributes: i.record(i.string(), i.unknown()).optional()
}), od = i.object({
  projectId: lt,
  entityId: i.string().uuid("Invalid entity ID"),
  entityType: Ye,
  limit: i.number().int().positive().max(500).optional()
}), Bt = ".tmp", Dr = 720 * 60 * 1e3, Lr = 128, Or = 16 * 1024 * 1024, br = /* @__PURE__ */ new Set([
  Yt,
  ".txt"
]), re = /* @__PURE__ */ new Map(), J = /* @__PURE__ */ new Map(), jr = (n) => process.platform === "win32" ? n.toLowerCase() : n, Ls = (n, t) => {
  const e = jr(C.resolve(n)), r = jr(C.resolve(t));
  return e === r || e.startsWith(`${r}${C.sep}`);
}, Os = () => {
  const n = Date.now();
  for (const [t, e] of J.entries())
    e.expiresAt <= n && J.delete(t);
}, bs = () => {
  if (J.size <= Lr) return;
  const n = Array.from(J.entries()).sort(
    (e, r) => e[1].lastAccessedAt - r[1].lastAccessedAt
  ), t = J.size - Lr;
  for (const [e] of n.slice(0, t))
    J.delete(e);
}, js = (n, t) => {
  const e = C.resolve(n), r = J.get(e), o = Date.now();
  if (r) {
    t.forEach((a) => r.permissions.add(a)), r.expiresAt = o + Dr, r.lastAccessedAt = o;
    return;
  }
  J.set(e, {
    permissions: new Set(t),
    expiresAt: o + Dr,
    lastAccessedAt: o
  }), bs();
}, Dn = async (n, t) => {
  const e = C.resolve(n);
  if (t === "read")
    try {
      return await R.realpath(e);
    } catch (o) {
      if (o?.code === "ENOENT")
        return e;
      throw o;
    }
  let r = e;
  for (; ; )
    try {
      await R.access(r);
      const o = await R.realpath(r);
      if (r === e)
        return o;
      const a = C.relative(r, e);
      return C.resolve(o, a);
    } catch (o) {
      if (o?.code === "ENOENT") {
        const s = C.dirname(r);
        if (s === r)
          return e;
        r = s;
        continue;
      }
      throw o;
    }
}, It = async (n, t, e = "file") => {
  const r = W(n, "path"), o = e === "directory" ? r : C.dirname(r), a = await Dn(o, "write");
  js(a, t);
}, Fs = async (n) => {
  const t = W(n, "projectPath");
  if (t.toLowerCase().endsWith(j))
    return ct(t);
  const e = ct(t);
  if (e === t)
    return t;
  try {
    return await R.access(e), e;
  } catch {
    return t;
  }
}, Pt = async (n, t) => {
  const e = W(n, t.fieldName), r = await Dn(e, t.mode);
  Os();
  for (const [o, a] of J.entries())
    if (a.permissions.has(t.permission) && Ls(r, o))
      return a.lastAccessedAt = Date.now(), e;
  throw new y(
    _.FS_PERMISSION_DENIED,
    `${t.fieldName} is outside approved roots`,
    {
      fieldName: t.fieldName,
      path: e,
      permission: t.permission
    }
  );
}, Fr = (n, t) => {
  if (!n.toLowerCase().endsWith(j))
    throw new y(
      _.INVALID_INPUT,
      `${t} must point to a ${j} package`,
      { fieldName: t, packagePath: n }
    );
}, vs = (n) => {
  const t = C.extname(n).toLowerCase();
  if (t === j)
    throw new y(
      _.INVALID_INPUT,
      "Direct .luie writes are blocked. Use fs.createLuiePackage or fs.writeProjectFile.",
      { filePath: n, extension: t }
    );
  if (!br.has(t))
    throw new y(
      _.INVALID_INPUT,
      "Unsupported file extension for fs.writeFile",
      { filePath: n, extension: t, allowed: Array.from(br) }
    );
}, Ln = async (n) => {
  const t = C.dirname(n);
  await R.mkdir(t, { recursive: !0 });
}, On = async (n) => {
  try {
    return await R.access(n), !0;
  } catch {
    return !1;
  }
}, ae = async (n, t) => {
  const e = C.resolve(ct(n)), o = (re.get(e) ?? Promise.resolve()).catch(() => {
  }).then(t), a = o.then(
    () => {
    },
    () => {
    }
  );
  re.set(e, a);
  try {
    return await o;
  } finally {
    re.get(e) === a && re.delete(e);
  }
}, Ee = async (n, t) => {
  const e = new eo.ZipFile(), r = Xn.createWriteStream(n), o = new Promise((a, s) => {
    r.on("close", () => a()), r.on("error", s), e.outputStream.on("error", s);
  });
  e.outputStream.pipe(r), await t(e), e.end(), await o;
}, $t = async (n, t, e) => {
  const r = `${t}.bak-${Date.now()}`;
  let o = !1;
  try {
    await R.rename(n, t);
    return;
  } catch (a) {
    const s = a;
    if (s?.code !== "EEXIST" && s?.code !== "ENOTEMPTY" && s?.code !== "EPERM" && s?.code !== "EISDIR")
      throw a;
  }
  try {
    await R.rename(t, r), o = !0, await R.rename(n, t), await R.rm(r, { force: !0, recursive: !0 });
  } catch (a) {
    if (e.error("Atomic replace failed", { error: a, targetPath: t }), o)
      try {
        await R.rename(r, t);
      } catch (s) {
        e.error("Failed to restore backup", { restoreError: s, targetPath: t, backupPath: r });
      }
    throw a;
  }
}, Us = () => [
  { name: `${Tt}/`, isDirectory: !0 },
  { name: `${D}/`, isDirectory: !0 },
  { name: `${Lt}/`, isDirectory: !0 },
  { name: `${pn}/`, isDirectory: !0 }
], bn = (n) => ({
  name: mt,
  content: JSON.stringify(n ?? {}, null, 2)
}), Ne = (n) => n.canceled || n.filePaths.length === 0 ? null : n.filePaths[0], Ms = (n) => n.canceled || !n.filePath ? null : n.filePath, or = async (n, t) => {
  for (const e of t) {
    const r = Y(e.name);
    if (!r || !it(r))
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
}, ar = (n) => {
  try {
    const t = JSON.parse(n);
    if (t && typeof t == "object" && !Array.isArray(t))
      return t;
  } catch {
  }
  return null;
}, ks = (n) => n && typeof n == "object" && !Array.isArray(n) ? n : {}, jn = (n) => {
  if (typeof n == "number") return n === zt;
  if (typeof n == "string" && n.trim().length > 0) {
    const t = Number(n);
    return Number.isFinite(t) && t === zt;
  }
  return !1;
}, Ws = (n, t) => {
  if (n.format !== Gt)
    throw new y(
      _.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...t, format: n.format }
    );
  if (n.container !== Ht)
    throw new y(
      _.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...t, container: n.container }
    );
  if (!jn(n.version))
    throw new y(
      _.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...t, version: n.version }
    );
}, le = (n, t) => {
  const e = ks(n), r = t.nowIso ?? (/* @__PURE__ */ new Date()).toISOString(), o = t.createdAtFallback ?? r;
  if (Object.prototype.hasOwnProperty.call(e, "format") && e.format !== Gt)
    throw new y(
      _.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: e.format }
    );
  if (Object.prototype.hasOwnProperty.call(e, "container") && e.container !== Ht)
    throw new y(
      _.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: e.container }
    );
  if (Object.prototype.hasOwnProperty.call(e, "version") && !jn(e.version))
    throw new y(
      _.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: e.version }
    );
  const a = typeof e.title == "string" && e.title.trim().length > 0 ? e.title : t.titleFallback, s = typeof e.createdAt == "string" && e.createdAt.length > 0 ? e.createdAt : o, c = typeof e.updatedAt == "string" && e.updatedAt.length > 0 ? e.updatedAt : r;
  return {
    ...e,
    format: Gt,
    container: Ht,
    version: zt,
    title: a,
    createdAt: s,
    updatedAt: c
  };
}, xt = async (n, t) => {
  const e = await Sn(n, mt, t);
  if (!e)
    throw new y(
      _.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath: n }
    );
  const r = ar(e);
  if (!r)
    throw new y(
      _.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath: n }
    );
  Ws(r, { source: n });
}, sr = async (n, t, e) => {
  const r = ct(n);
  return await ae(r, async () => {
    await Ln(r);
    const o = (/* @__PURE__ */ new Date()).toISOString(), a = le(t.meta, {
      titleFallback: C.basename(r, j),
      nowIso: o,
      createdAtFallback: o
    }), s = `${r}${Bt}-${Date.now()}`, c = [
      { name: `${Tt}/`, isDirectory: !0 },
      { name: `${D}/`, isDirectory: !0 },
      { name: `${Lt}/`, isDirectory: !0 },
      { name: `${pn}/`, isDirectory: !0 },
      {
        name: mt,
        content: JSON.stringify(a, null, 2)
      },
      {
        name: `${D}/${Qe}`,
        content: JSON.stringify({ characters: t.characters ?? [] }, null, 2)
      },
      {
        name: `${D}/${Ze}`,
        content: JSON.stringify({ terms: t.terms ?? [] }, null, 2)
      },
      {
        name: `${D}/${Ot}`,
        content: JSON.stringify(t.synopsis ?? { synopsis: "", status: "draft" }, null, 2)
      },
      {
        name: `${D}/${qt}`,
        content: JSON.stringify(t.plot ?? { columns: [] }, null, 2)
      },
      {
        name: `${D}/${Vt}`,
        content: JSON.stringify(t.drawing ?? { paths: [] }, null, 2)
      },
      {
        name: `${D}/${Kt}`,
        content: JSON.stringify(t.mindmap ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${D}/${ue}`,
        content: JSON.stringify(t.memos ?? { memos: [] }, null, 2)
      },
      {
        name: `${D}/${Jt}`,
        content: JSON.stringify(t.graph ?? { nodes: [], edges: [] }, null, 2)
      },
      {
        name: `${Lt}/index.json`,
        content: JSON.stringify({ snapshots: t.snapshots ?? [] }, null, 2)
      }
    ];
    for (const p of t.chapters ?? [])
      p.id && c.push({
        name: `${Tt}/${p.id}${Yt}`,
        content: p.content ?? ""
      });
    if (t.snapshots && t.snapshots.length > 0)
      for (const p of t.snapshots)
        p.id && c.push({
          name: `${Lt}/${p.id}.snap`,
          content: JSON.stringify(p, null, 2)
        });
    await Ee(s, (p) => or(p, c)), await xt(s, e), await $t(s, r, e);
  });
}, Fn = async (n, t = n) => {
  const e = [], r = await R.readdir(n, { withFileTypes: !0 });
  for (const o of r) {
    const a = `${n}${C.sep}${o.name}`, s = Y(C.relative(t, a));
    if (!(!s || !it(s)) && !o.isSymbolicLink()) {
      if (o.isDirectory()) {
        e.push({ name: `${s}/`, isDirectory: !0 }), e.push(...await Fn(a, t));
        continue;
      }
      o.isFile() && e.push({ name: s, fromFilePath: a });
    }
  }
  return e;
}, vr = async (n, t, e) => {
  const r = `${n}.dir-legacy-${Date.now()}`;
  await R.rename(n, r);
  const o = `${t}${Bt}-${Date.now()}`;
  try {
    const a = await Fn(r), s = a.some(
      (u) => Y(u.name) === mt
    ), c = (/* @__PURE__ */ new Date()).toISOString();
    let p = {};
    if (s)
      try {
        const u = await R.readFile(
          C.join(r, mt),
          "utf-8"
        );
        p = ar(u) ?? {};
      } catch {
        p = {};
      }
    const d = le(p, {
      titleFallback: C.basename(t, j),
      nowIso: c,
      createdAtFallback: c
    }), l = a.filter(
      (u) => Y(u.name) !== mt
    );
    return l.push(bn(d)), await Ee(o, (u) => or(u, l)), await xt(o, e), await $t(o, t, e), r;
  } catch (a) {
    e.error("Failed to migrate legacy directory package", {
      legacyDir: n,
      targetZip: t,
      backupPath: r,
      error: a
    });
    try {
      await R.rm(o, { force: !0 });
    } catch {
    }
    try {
      if (await On(n)) {
        const s = `${n}.migration-failed-${Date.now()}`;
        await R.rename(n, s), e.info("Moved partial migration output before restore", {
          legacyDir: n,
          collidedPath: s
        });
      }
      await R.rename(r, n), e.info("Restored legacy directory package after migration failure", {
        legacyDir: n,
        backupPath: r
      });
    } catch (s) {
      e.error("Failed to restore legacy directory package", {
        legacyDir: n,
        backupPath: r,
        restoreError: s
      });
    }
    throw a;
  }
}, Ur = async (n, t, e, r, o) => {
  const a = Y(e);
  if (!a || !it(a))
    throw new Error("INVALID_RELATIVE_PATH");
  await Ee(t, async (s) => {
    await new Promise((c, p) => {
      Zr.open(n, { lazyEntries: !0 }, (d, l) => {
        if (d || !l) {
          p(d ?? new Error("FAILED_TO_OPEN_ZIP"));
          return;
        }
        const u = (m) => {
          const A = Y(m.fileName);
          if (!A || !it(A)) {
            o.error("Unsafe zip entry skipped", { entry: m.fileName, sourceZip: n }), l.readEntry();
            return;
          }
          if (A === a) {
            l.readEntry();
            return;
          }
          if (m.fileName.endsWith("/")) {
            s.addEmptyDirectory(A.endsWith("/") ? A : `${A}/`), l.readEntry();
            return;
          }
          l.openReadStream(m, (h, f) => {
            if (h || !f) {
              p(h ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
              return;
            }
            s.addReadStream(f, A), f.on("end", () => l.readEntry()), f.on("error", p);
          });
        };
        l.on("entry", u), l.on("error", p), l.on("end", c), l.readEntry();
      });
    }), s.addBuffer(Buffer.from(r, "utf-8"), a);
  });
};
function ad(n) {
  ds(n, [
    {
      channel: k.FS_APPROVE_PROJECT_PATH,
      logTag: "FS_APPROVE_PROJECT_PATH",
      failMessage: "Failed to approve project path",
      argsSchema: ws,
      handler: async (t) => {
        const e = await Fs(t), r = e.toLowerCase().endsWith(j);
        return await It(
          e,
          r ? ["read", "package"] : ["read"],
          "file"
        ), {
          approved: !0,
          normalizedPath: e
        };
      }
    },
    {
      channel: k.FS_SELECT_DIRECTORY,
      logTag: "FS_SELECT_DIRECTORY",
      failMessage: "Failed to select directory",
      handler: async () => {
        const t = await ft.showOpenDialog({
          properties: ["openDirectory", "createDirectory"]
        }), e = Ne(t);
        return e ? (await It(e, ["read", "write", "package"], "directory"), e) : null;
      }
    },
    {
      channel: k.FS_SELECT_SAVE_LOCATION,
      logTag: "FS_SELECT_SAVE_LOCATION",
      failMessage: "Failed to select save location",
      argsSchema: Nr,
      handler: async (t) => {
        const e = await ft.showSaveDialog({
          title: t?.title,
          defaultPath: t?.defaultPath,
          filters: t?.filters ?? [
            { name: Go, extensions: [xo] }
          ]
        }), r = Ms(e);
        if (!r) return null;
        const a = r.toLowerCase().endsWith(j) ? ["read", "write", "package"] : ["read", "write"];
        return await It(r, a, "file"), r;
      }
    },
    {
      channel: k.FS_SELECT_FILE,
      logTag: "FS_SELECT_FILE",
      failMessage: "Failed to select file",
      argsSchema: Nr,
      handler: async (t) => {
        const e = await ft.showOpenDialog({
          title: t?.title,
          defaultPath: t?.defaultPath,
          filters: t?.filters,
          properties: ["openFile"]
        }), r = Ne(e);
        if (!r) return null;
        const a = r.toLowerCase().endsWith(j) ? ["read", "package"] : ["read"];
        return await It(r, a, "file"), r;
      }
    },
    {
      channel: k.FS_SELECT_SNAPSHOT_BACKUP,
      logTag: "FS_SELECT_SNAPSHOT_BACKUP",
      failMessage: "Failed to select snapshot backup",
      handler: async () => {
        const t = C.join(S.getPath("userData"), Bo), e = await ft.showOpenDialog({
          title: "스냅샷 복원하기",
          defaultPath: t,
          filters: [{ name: "Snapshot", extensions: ["snap"] }],
          properties: ["openFile"]
        }), r = Ne(e);
        return r ? (await It(r, ["read"], "file"), r) : null;
      }
    },
    {
      channel: k.FS_SAVE_PROJECT,
      logTag: "FS_SAVE_PROJECT",
      failMessage: "Failed to save project",
      argsSchema: ms,
      handler: async (t, e, r) => {
        const o = ze(t), a = await Pt(e, {
          fieldName: "projectPath",
          mode: "write",
          permission: "write"
        }), s = C.join(
          a,
          o || gr
        );
        await R.mkdir(s, { recursive: !0 });
        const c = C.join(
          s,
          `${o || Ho}${j}`
        ), p = ar(r.trim()), d = o || gr, l = (/* @__PURE__ */ new Date()).toISOString(), u = le(p ?? {}, {
          titleFallback: d,
          nowIso: l,
          createdAtFallback: l
        }), m = !p && r.trim().length > 0;
        return await sr(
          c,
          {
            meta: u,
            chapters: m ? [
              {
                id: "legacy-import",
                content: r
              }
            ] : [],
            characters: [],
            terms: [],
            snapshots: []
          },
          n
        ), m && await ae(c, async () => {
          const A = `${c}${Bt}-${Date.now()}`;
          await Ur(
            c,
            A,
            zo,
            `# Imported Legacy Content

Legacy project content was migrated into this package.`,
            n
          ), await xt(A, n), await $t(A, c, n);
        }), { path: c, projectDir: s };
      }
    },
    {
      channel: k.FS_READ_FILE,
      logTag: "FS_READ_FILE",
      failMessage: "Failed to read file",
      argsSchema: As,
      handler: async (t) => {
        const e = await Pt(t, {
          fieldName: "filePath",
          mode: "read",
          permission: "read"
        }), r = await R.stat(e);
        if (r.isDirectory())
          return null;
        if (r.size > Or)
          throw new y(
            _.INVALID_INPUT,
            "File is too large to read through IPC",
            {
              filePath: e,
              size: r.size,
              maxSize: Or
            }
          );
        return await R.readFile(e, "utf-8");
      }
    },
    {
      channel: k.FS_READ_LUIE_ENTRY,
      logTag: "FS_READ_LUIE_ENTRY",
      failMessage: "Failed to read Luie package entry",
      argsSchema: Ts,
      handler: async (t, e) => {
        const r = await Pt(t, {
          fieldName: "packagePath",
          mode: "read",
          permission: "package"
        });
        return Fr(r, "packagePath"), X(
          r,
          e,
          n
        );
      }
    },
    {
      channel: k.FS_WRITE_FILE,
      logTag: "FS_WRITE_FILE",
      failMessage: "Failed to write file",
      argsSchema: Ss,
      handler: async (t, e) => {
        const r = await Pt(t, {
          fieldName: "filePath",
          mode: "write",
          permission: "write"
        });
        vs(r);
        const o = C.dirname(r);
        return await R.mkdir(o, { recursive: !0 }), await R.writeFile(r, e, "utf-8"), { path: r };
      }
    },
    {
      channel: k.FS_CREATE_LUIE_PACKAGE,
      logTag: "FS_CREATE_LUIE_PACKAGE",
      failMessage: "Failed to create Luie package",
      argsSchema: ys,
      handler: async (t, e) => {
        const r = await Pt(t, {
          fieldName: "packagePath",
          mode: "write",
          permission: "package"
        }), o = ct(r), a = (/* @__PURE__ */ new Date()).toISOString(), s = le(e, {
          titleFallback: C.basename(o, j),
          nowIso: a,
          createdAtFallback: a
        });
        return await ae(o, async () => {
          await Ln(o);
          const c = `${o}${Bt}-${Date.now()}`;
          let p = null;
          try {
            const d = await R.stat(o);
            if (d.isDirectory())
              await vr(o, o, n);
            else if (d.isFile()) {
              const l = `${o}.legacy-${Date.now()}`;
              await R.rename(o, l), p = l;
            }
          } catch (d) {
            if (d?.code !== "ENOENT") throw d;
          }
          try {
            await Ee(
              c,
              (d) => or(d, [
                ...Us(),
                bn(s),
                {
                  name: `${D}/${Qe}`,
                  content: JSON.stringify({ characters: [] }, null, 2)
                },
                {
                  name: `${D}/${Ze}`,
                  content: JSON.stringify({ terms: [] }, null, 2)
                },
                {
                  name: `${D}/${Ot}`,
                  content: JSON.stringify({ synopsis: "", status: "draft" }, null, 2)
                },
                {
                  name: `${D}/${qt}`,
                  content: JSON.stringify({ columns: [] }, null, 2)
                },
                {
                  name: `${D}/${Vt}`,
                  content: JSON.stringify({ paths: [] }, null, 2)
                },
                {
                  name: `${D}/${Kt}`,
                  content: JSON.stringify({ nodes: [], edges: [] }, null, 2)
                },
                {
                  name: `${D}/${ue}`,
                  content: JSON.stringify({ memos: [] }, null, 2)
                },
                {
                  name: `${D}/${Jt}`,
                  content: JSON.stringify({ nodes: [], edges: [] }, null, 2)
                }
              ])
            ), await xt(c, n), await $t(c, o, n);
          } catch (d) {
            try {
              await R.rm(c, { force: !0 });
            } catch {
            }
            if (p)
              try {
                if (await On(o)) {
                  const l = `${o}.create-failed-${Date.now()}`;
                  await R.rename(o, l), n.info("Moved failed create output before restore", {
                    targetPath: o,
                    collidedPath: l
                  });
                }
                await R.rename(p, o), n.info("Restored existing .luie package after create failure", {
                  targetPath: o,
                  backupPath: p
                });
              } catch (l) {
                n.error("Failed to restore existing .luie package after create failure", {
                  targetPath: o,
                  backupPath: p,
                  restoreError: l
                });
              }
            throw d;
          }
        }), await It(o, ["read", "write", "package"], "file"), { path: o };
      }
    },
    {
      channel: k.FS_WRITE_PROJECT_FILE,
      logTag: "FS_WRITE_PROJECT_FILE",
      failMessage: "Failed to write project file",
      argsSchema: _s,
      handler: async (t, e, r) => {
        const o = Y(e);
        if (!o || !it(o))
          throw new Error("INVALID_RELATIVE_PATH");
        const a = await Pt(t, {
          fieldName: "projectRoot",
          mode: "write",
          permission: "package"
        });
        return Fr(a, "projectRoot"), await ae(a, async () => {
          try {
            (await R.stat(a)).isDirectory() && await vr(
              a,
              a,
              n
            );
          } catch (c) {
            throw c?.code === "ENOENT" ? new y(
              _.FS_WRITE_FAILED,
              "Project package does not exist. Create the .luie package first.",
              {
                projectRoot: a,
                relativePath: o
              }
            ) : c;
          }
          const s = `${a}${Bt}-${Date.now()}`;
          await Ur(
            a,
            s,
            o,
            r,
            n
          ), await xt(s, n), await $t(s, a, n);
        }), { path: `${a}:${o}` };
      }
    }
  ]);
}
const vn = /* @__PURE__ */ new Set(["mountain", "castle", "village"]), Bs = /* @__PURE__ */ new Set(["pen", "text", "eraser", "icon"]), U = (n) => !!(n && typeof n == "object" && !Array.isArray(n)), Mr = (n) => {
  if (!n) return null;
  try {
    return JSON.parse(n);
  } catch {
    return null;
  }
}, $s = (n) => {
  if (U(n))
    return typeof n.updatedAt == "string" ? n.updatedAt : void 0;
}, xs = (n, t = "pen") => typeof n == "string" && Bs.has(n) ? n : t, Gs = (n, t = "mountain") => typeof n == "string" && vn.has(n) ? n : t, Un = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!U(r)) continue;
    const o = r.type;
    if (o !== "path" && o !== "text" && o !== "icon") continue;
    const a = {
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `path-${e}`,
      type: o,
      color: typeof r.color == "string" ? r.color : "#000000"
    };
    typeof r.d == "string" && (a.d = r.d), typeof r.width == "number" && (a.width = r.width), typeof r.x == "number" && (a.x = r.x), typeof r.y == "number" && (a.y = r.y), typeof r.text == "string" && (a.text = r.text), typeof r.icon == "string" && vn.has(r.icon) && (a.icon = r.icon), t.push(a);
  }
  return t;
}, Mn = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!U(r)) continue;
    const o = r.position;
    if (!U(o)) continue;
    const a = U(r.data) ? r.data : void 0;
    t.push({
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `node-${e}`,
      type: typeof r.type == "string" ? r.type : void 0,
      position: {
        x: typeof o.x == "number" ? o.x : 0,
        y: typeof o.y == "number" ? o.y : 0
      },
      data: {
        label: typeof a?.label == "string" ? a.label : "",
        image: typeof a?.image == "string" ? a.image : void 0
      }
    });
  }
  return t;
}, kn = (n) => {
  if (!Array.isArray(n)) return [];
  const t = [];
  for (const [e, r] of n.entries()) {
    if (!U(r)) continue;
    const o = typeof r.source == "string" ? r.source : "", a = typeof r.target == "string" ? r.target : "";
    !o || !a || t.push({
      id: typeof r.id == "string" && r.id.length > 0 ? r.id : `edge-${e}`,
      source: o,
      target: a,
      type: typeof r.type == "string" ? r.type : void 0
    });
  }
  return t;
}, Hs = (n, t, e) => U(n) ? {
  id: typeof n.id == "string" && n.id.length > 0 ? n.id : `memo-${t}`,
  title: typeof n.title == "string" ? n.title : "",
  content: typeof n.content == "string" ? n.content : "",
  tags: Array.isArray(n.tags) ? n.tags.filter((r) => typeof r == "string") : [],
  updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : e()
} : null, Wn = (n, t = () => (/* @__PURE__ */ new Date()).toISOString()) => Array.isArray(n) ? n.map((e, r) => Hs(e, r, t)).filter((e) => e !== null) : [], kr = (n, t = () => (/* @__PURE__ */ new Date()).toISOString()) => U(n) ? {
  memos: Wn(n.memos, t),
  updatedAt: typeof n.updatedAt == "string" ? n.updatedAt : void 0
} : { memos: [] }, P = x("ProjectService"), zs = i.object({
  format: i.string().optional(),
  version: i.number().optional(),
  projectId: i.string().optional(),
  title: i.string().optional(),
  description: i.string().optional().nullable(),
  createdAt: i.string().optional(),
  updatedAt: i.string().optional(),
  chapters: i.array(
    i.object({
      id: i.string().optional(),
      title: i.string().optional(),
      order: i.number().optional(),
      file: i.string().optional(),
      content: i.string().optional(),
      updatedAt: i.string().optional()
    })
  ).optional()
}).passthrough(), Ys = i.object({
  characters: i.array(i.record(i.string(), i.unknown())).optional()
}).passthrough(), Xs = i.object({
  terms: i.array(i.record(i.string(), i.unknown())).optional()
}).passthrough(), De = i.object({
  synopsis: i.string().optional(),
  status: i.enum(["draft", "working", "locked"]).optional(),
  genre: i.string().optional(),
  targetAudience: i.string().optional(),
  logline: i.string().optional(),
  updatedAt: i.string().optional()
}).passthrough(), Wr = i.object({
  columns: i.array(
    i.object({
      id: i.string(),
      title: i.string(),
      cards: i.array(
        i.object({
          id: i.string(),
          content: i.string()
        })
      )
    })
  ).optional(),
  updatedAt: i.string().optional()
}).passthrough(), Br = i.object({
  paths: i.array(i.record(i.string(), i.unknown())).optional(),
  tool: i.enum(["pen", "text", "eraser", "icon"]).optional(),
  iconType: i.enum(["mountain", "castle", "village"]).optional(),
  color: i.string().optional(),
  lineWidth: i.number().optional(),
  updatedAt: i.string().optional()
}).passthrough(), $r = i.object({
  nodes: i.array(i.record(i.string(), i.unknown())).optional(),
  edges: i.array(i.record(i.string(), i.unknown())).optional(),
  updatedAt: i.string().optional()
}).passthrough(), xr = i.object({
  memos: i.array(i.record(i.string(), i.unknown())).optional(),
  updatedAt: i.string().optional()
}).passthrough(), qs = i.object({
  id: i.string(),
  entityType: i.string(),
  subType: i.string().optional(),
  name: i.string(),
  description: i.string().optional().nullable(),
  firstAppearance: i.string().optional().nullable(),
  attributes: i.record(i.string(), i.unknown()).optional().nullable(),
  positionX: i.number().optional(),
  positionY: i.number().optional()
}).passthrough(), Vs = i.object({
  id: i.string(),
  sourceId: i.string(),
  sourceType: i.string(),
  targetId: i.string(),
  targetType: i.string(),
  relation: i.string(),
  attributes: i.record(i.string(), i.unknown()).optional().nullable(),
  createdAt: i.string().optional(),
  updatedAt: i.string().optional()
}).passthrough(), Ks = i.object({
  nodes: i.array(qs).optional(),
  edges: i.array(Vs).optional(),
  updatedAt: i.string().optional()
}).passthrough(), Js = i.object({
  id: i.string(),
  projectId: i.string().optional(),
  chapterId: i.string().optional().nullable(),
  content: i.string().optional(),
  description: i.string().optional().nullable(),
  createdAt: i.string().optional()
}).passthrough(), Qs = i.object({
  snapshots: i.array(Js).optional()
}).passthrough(), vt = (n, t, e) => {
  if (typeof n != "string" || n.trim().length === 0)
    return null;
  let r;
  try {
    r = JSON.parse(n);
  } catch (a) {
    throw new y(
      _.VALIDATION_FAILED,
      `Invalid ${e.label} JSON in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath
      },
      a
    );
  }
  const o = t.safeParse(r);
  if (!o.success)
    throw new y(
      _.VALIDATION_FAILED,
      `Invalid ${e.label} format in .luie package`,
      {
        packagePath: e.packagePath,
        entryPath: e.entryPath,
        issues: o.error.issues
      }
    );
  return o.data;
}, Zs = (n, t, e) => {
  if (typeof n != "string" || n.trim().length === 0)
    return t.safeParse(null);
  let r;
  try {
    r = JSON.parse(n);
  } catch (a) {
    return P.warn("Invalid .luie world JSON; using default during export", {
      packagePath: e.packagePath,
      entryPath: e.entryPath,
      label: e.label,
      error: a
    }), t.safeParse(null);
  }
  const o = t.safeParse(r);
  return o.success || P.warn("Invalid .luie world format; using default during export", {
    packagePath: e.packagePath,
    entryPath: e.entryPath,
    label: e.label,
    issues: o.error.issues
  }), o;
}, ti = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
], ei = ["Place", "Concept", "Rule", "Item"], ri = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
], Le = (n) => typeof n == "string" && ti.includes(n), Oe = (n) => typeof n == "string" && ei.includes(n), ni = (n) => typeof n == "string" && ri.includes(n);
class Bn {
  exportTimers = /* @__PURE__ */ new Map();
  exportInFlight = /* @__PURE__ */ new Map();
  normalizeProjectPath(t) {
    if (typeof t != "string") return;
    const e = t.trim();
    if (e.length !== 0)
      return W(e, "projectPath");
  }
  normalizeLuiePackagePath(t, e) {
    return ct(W(t, e));
  }
  toProjectPathKey(t) {
    const e = _t.resolve(t);
    return process.platform === "win32" ? e.toLowerCase() : e;
  }
  async findProjectPathConflict(t, e) {
    const r = this.toProjectPathKey(t), o = await N.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: { id: !0, projectPath: !0 }
    });
    for (const a of o)
      if (!(typeof a.projectPath != "string" || a.projectPath.length === 0) && !(e && String(a.id) === e))
        try {
          const s = W(a.projectPath, "projectPath");
          if (this.toProjectPathKey(s) === r)
            return { id: String(a.id) };
        } catch {
          continue;
        }
    return null;
  }
  async reconcileProjectPathDuplicates() {
    const t = await N.getClient().project.findMany({
      where: {
        projectPath: { not: null }
      },
      select: {
        id: !0,
        projectPath: !0,
        updatedAt: !0
      }
    }), e = /* @__PURE__ */ new Map();
    for (const a of t)
      if (!(typeof a.projectPath != "string" || a.projectPath.length === 0))
        try {
          const s = W(a.projectPath, "projectPath"), c = this.toProjectPathKey(s), p = e.get(c) ?? [];
          p.push({
            id: String(a.id),
            projectPath: s,
            updatedAt: a.updatedAt instanceof Date ? a.updatedAt : new Date(String(a.updatedAt))
          }), e.set(c, p);
        } catch {
          continue;
        }
    let r = 0, o = 0;
    for (const a of e.values()) {
      if (a.length <= 1) continue;
      r += 1;
      const s = [...a].sort(
        (d, l) => l.updatedAt.getTime() - d.updatedAt.getTime()
      ), c = s[0], p = s.slice(1);
      for (const d of p)
        await N.getClient().project.update({
          where: { id: d.id },
          data: { projectPath: null }
        }), o += 1, P.warn("Cleared duplicate projectPath from stale record", {
          keepProjectId: c.id,
          staleProjectId: d.id,
          projectPath: d.projectPath
        });
    }
    return r > 0 && P.info("Project path duplicate reconciliation completed", {
      duplicateGroups: r,
      clearedRecords: o
    }), { duplicateGroups: r, clearedRecords: o };
  }
  async createProject(t) {
    try {
      P.info("Creating project", t);
      const e = this.normalizeProjectPath(t.projectPath);
      if (e) {
        const a = await this.findProjectPathConflict(e);
        if (a)
          throw new y(
            _.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath: e, conflictProjectId: a.id }
          );
      }
      const r = await N.getClient().project.create({
        data: {
          title: t.title,
          description: t.description,
          projectPath: e,
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
      }), o = String(r.id);
      return P.info("Project created successfully", { projectId: o }), this.schedulePackageExport(o, "project:create"), r;
    } catch (e) {
      throw P.error("Failed to create project", e), new y(
        _.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input: t },
        e
      );
    }
  }
  async readMetaOrMarkCorrupt(t) {
    try {
      await pt.access(t);
    } catch {
      return {
        meta: null,
        luieCorrupted: !0,
        recoveryReason: "missing"
      };
    }
    try {
      const e = await X(t, mt, P);
      if (!e)
        throw new Error("MISSING_META");
      const r = zs.safeParse(JSON.parse(e));
      if (!r.success)
        throw new Error("INVALID_META");
      return { meta: r.data, luieCorrupted: !1 };
    } catch (e) {
      return P.warn("Failed to read .luie meta; treating as corrupted", {
        packagePath: t,
        error: e
      }), { meta: null, luieCorrupted: !0, recoveryReason: "corrupt" };
    }
  }
  async findProjectByPath(t) {
    return await N.getClient().project.findFirst({
      where: { projectPath: t },
      select: { id: !0, updatedAt: !0 }
    });
  }
  resolveImportIdentity(t, e) {
    const o = (typeof t.projectId == "string" ? t.projectId : void 0) ?? e?.id ?? q(), a = e && e.id !== o ? e.id : null;
    return { resolvedProjectId: o, legacyProjectId: a };
  }
  buildRecoveryTimestamp(t = /* @__PURE__ */ new Date()) {
    const e = (r) => String(r).padStart(2, "0");
    return `${t.getFullYear()}${e(t.getMonth() + 1)}${e(t.getDate())}-${e(t.getHours())}${e(t.getMinutes())}${e(t.getSeconds())}`;
  }
  async resolveRecoveredPackagePath(t) {
    const e = ct(t), r = j, a = e.toLowerCase().endsWith(r) ? e.slice(0, e.length - r.length) : e, s = this.buildRecoveryTimestamp();
    let c = `${a}.recovered-${s}${r}`, p = 1;
    for (; ; )
      try {
        await pt.access(c), c = `${a}.recovered-${s}-${p}${r}`, p += 1;
      } catch {
        return c;
      }
  }
  async readLuieImportCollections(t) {
    const e = `${D}/${Qe}`, r = `${D}/${Ze}`, o = `${Lt}/index.json`, a = `${D}/${Ot}`, s = `${D}/${Jt}`, [c, p, d, l, u] = await Promise.all([
      X(t, e, P),
      X(t, r, P),
      X(t, o, P),
      X(t, a, P),
      X(t, s, P)
    ]), m = vt(c, Ys, {
      packagePath: t,
      entryPath: e,
      label: "world characters"
    }), A = vt(p, Xs, {
      packagePath: t,
      entryPath: r,
      label: "world terms"
    }), h = vt(d, Qs, {
      packagePath: t,
      entryPath: o,
      label: "snapshot index"
    }), f = vt(
      l,
      De,
      {
        packagePath: t,
        entryPath: a,
        label: "world synopsis"
      }
    ), g = vt(u, Ks, {
      packagePath: t,
      entryPath: s,
      label: "world graph"
    });
    return {
      characters: m?.characters ?? [],
      terms: A?.terms ?? [],
      snapshots: h?.snapshots ?? [],
      worldSynopsis: f && typeof f.synopsis == "string" ? f.synopsis : void 0,
      graph: g ? {
        nodes: g.nodes ?? [],
        edges: g.edges ?? [],
        updatedAt: g.updatedAt
      } : void 0
    };
  }
  async buildChapterCreateRows(t, e, r) {
    const o = [];
    for (let a = 0; a < r.length; a += 1) {
      const s = r[a], c = s.id ?? q(), p = s.file ?? `${Tt}/${c}${Yt}`, d = typeof s.content == "string" ? s.content : await X(t, p, P);
      if (d === null)
        throw new y(
          _.VALIDATION_FAILED,
          "Missing chapter content entry in .luie package",
          {
            packagePath: t,
            entryPath: p,
            chapterId: c
          }
        );
      const l = d ?? "";
      o.push({
        id: c,
        projectId: e,
        title: s.title ?? `Chapter ${a + 1}`,
        content: l,
        synopsis: null,
        order: typeof s.order == "number" ? s.order : a,
        wordCount: l.length
      });
    }
    return o;
  }
  buildCharacterCreateRows(t, e) {
    return e.map((r, o) => {
      const a = typeof r.name == "string" && r.name.trim().length > 0 ? r.name : `Character ${o + 1}`, s = typeof r.attributes == "string" ? r.attributes : r.attributes ? JSON.stringify(r.attributes) : null;
      return {
        id: typeof r.id == "string" ? r.id : q(),
        projectId: t,
        name: a,
        description: typeof r.description == "string" ? r.description : null,
        firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null,
        attributes: s
      };
    });
  }
  buildTermCreateRows(t, e) {
    return e.map((r, o) => {
      const a = typeof r.term == "string" && r.term.trim().length > 0 ? r.term : `Term ${o + 1}`;
      return {
        id: typeof r.id == "string" ? r.id : q(),
        projectId: t,
        term: a,
        definition: typeof r.definition == "string" ? r.definition : null,
        category: typeof r.category == "string" ? r.category : null,
        firstAppearance: typeof r.firstAppearance == "string" ? r.firstAppearance : null
      };
    });
  }
  buildSnapshotCreateRows(t, e, r) {
    const o = /* @__PURE__ */ new Set(), a = [];
    for (const s of e) {
      if (typeof s.id != "string" || s.id.trim().length === 0 || o.has(s.id))
        continue;
      o.add(s.id);
      const c = typeof s.content == "string" ? s.content : "", p = typeof s.chapterId == "string" ? s.chapterId.trim() : "", d = p.length > 0 && r.has(p);
      p.length > 0 && !d && P.warn("Snapshot chapter reference missing during .luie import; detaching snapshot", {
        snapshotId: s.id,
        chapterId: p,
        projectId: t
      });
      const l = typeof s.createdAt == "string" && s.createdAt.trim().length > 0 ? new Date(s.createdAt) : /* @__PURE__ */ new Date(), u = Number.isNaN(l.getTime()) ? /* @__PURE__ */ new Date() : l;
      a.push({
        id: s.id,
        projectId: t,
        chapterId: d ? p : null,
        content: c,
        contentLength: c.length,
        description: typeof s.description == "string" ? s.description : null,
        createdAt: u
      });
    }
    return a;
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
    return Oe(t) ? t : t === "WorldEntity" && Oe(e) ? e : null;
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
    return Le(t.entityType) ? t.entityType : Oe(t.subType) ? t.subType : null;
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
    const o = Array.isArray(r.attributes?.tags) ? r.attributes.tags.find((a) => typeof a == "string") : null;
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
    const a = this.getWorldEntityType(r, o.subType);
    !a || t.worldEntityIds.has(o.id) || (t.worldEntityIds.add(o.id), t.worldEntitiesForCreate.push({
      id: o.id,
      projectId: e,
      type: a,
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
    !r.sourceId || !r.targetId || !Le(r.sourceType) || !Le(r.targetType) || ni(r.relation) && (!this.hasGraphEntity(t, r.sourceType, r.sourceId) || !this.hasGraphEntity(t, r.targetType, r.targetId) || t.relationsForCreate.push({
      id: r.id || q(),
      projectId: e,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      targetId: r.targetId,
      targetType: r.targetType,
      relation: r.relation,
      attributes: this.serializeAttributes(r.attributes),
      sourceWorldEntityId: mr(r.sourceType) && t.worldEntityIds.has(r.sourceId) ? r.sourceId : null,
      targetWorldEntityId: mr(r.targetType) && t.worldEntityIds.has(r.targetId) ? r.targetId : null
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
      meta: a,
      worldSynopsis: s,
      resolvedPath: c,
      chaptersForCreate: p,
      charactersForCreate: d,
      termsForCreate: l,
      factionsForCreate: u,
      eventsForCreate: m,
      worldEntitiesForCreate: A,
      relationsForCreate: h,
      snapshotsForCreate: f
    } = t;
    return await N.getClient().$transaction(async (g) => {
      r && await g.project.delete({ where: { id: r } }), o && await g.project.delete({ where: { id: e } });
      const w = await g.project.create({
        data: {
          id: e,
          title: a.title ?? "Recovered Project",
          description: (typeof a.description == "string" ? a.description : void 0) ?? s ?? void 0,
          projectPath: c,
          createdAt: a.createdAt ? new Date(a.createdAt) : void 0,
          updatedAt: a.updatedAt ? new Date(a.updatedAt) : void 0,
          settings: {
            create: {
              autoSave: !0,
              autoSaveInterval: ke
            }
          }
        },
        include: { settings: !0 }
      });
      return p.length > 0 && await g.chapter.createMany({ data: p }), d.length > 0 && await g.character.createMany({ data: d }), l.length > 0 && await g.term.createMany({ data: l }), u.length > 0 && await g.faction.createMany({ data: u }), m.length > 0 && await g.event.createMany({ data: m }), A.length > 0 && await g.worldEntity.createMany({ data: A }), h.length > 0 && await g.entityRelation.createMany({ data: h }), f.length > 0 && await g.snapshot.createMany({ data: f }), w;
    });
  }
  async openLuieProject(t) {
    try {
      const e = this.normalizeLuiePackagePath(t, "packagePath"), { meta: r, luieCorrupted: o, recoveryReason: a } = await this.readMetaOrMarkCorrupt(
        e
      ), s = await this.findProjectByPath(e);
      if (o) {
        if (!s)
          throw new y(
            _.FS_READ_FAILED,
            "Failed to read .luie meta",
            { packagePath: e }
          );
        const L = await this.resolveRecoveredPackagePath(e);
        if (!await this.exportProjectPackageWithOptions(s.id, {
          targetPath: L,
          worldSourcePath: null
        }))
          throw new y(
            _.FS_WRITE_FAILED,
            "Failed to write recovered .luie package",
            { packagePath: e, recoveryPath: L }
          );
        return await N.getClient().project.update({
          where: { id: s.id },
          data: { projectPath: L }
        }), {
          project: await this.getProject(s.id),
          recovery: !0,
          recoveryPath: L,
          recoveryReason: a ?? "corrupt"
        };
      }
      if (!r)
        throw new y(
          _.VALIDATION_FAILED,
          "Invalid .luie meta format",
          { packagePath: e }
        );
      const { resolvedProjectId: c, legacyProjectId: p } = this.resolveImportIdentity(r, s), d = await N.getClient().project.findUnique({
        where: { id: c },
        select: { id: !0, updatedAt: !0 }
      }), l = r.chapters ?? [], u = await this.readLuieImportCollections(e), m = await this.buildChapterCreateRows(
        e,
        c,
        l
      ), A = this.buildCharacterCreateRows(
        c,
        u.characters
      ), h = this.buildTermCreateRows(c, u.terms), f = this.buildGraphCreateRows({
        projectId: c,
        graph: u.graph,
        baseCharacters: A,
        baseTerms: h
      }), g = this.buildSnapshotCreateRows(
        c,
        u.snapshots,
        new Set(m.map((L) => L.id))
      ), w = await this.applyImportTransaction({
        resolvedProjectId: c,
        legacyProjectId: p,
        existing: d,
        meta: r,
        worldSynopsis: u.worldSynopsis,
        resolvedPath: e,
        chaptersForCreate: m,
        charactersForCreate: f.charactersForCreate,
        termsForCreate: f.termsForCreate,
        factionsForCreate: f.factionsForCreate,
        eventsForCreate: f.eventsForCreate,
        worldEntitiesForCreate: f.worldEntitiesForCreate,
        relationsForCreate: f.relationsForCreate,
        snapshotsForCreate: g
      });
      return P.info(".luie package hydrated", {
        projectId: w.id,
        chapterCount: m.length,
        characterCount: f.charactersForCreate.length,
        termCount: f.termsForCreate.length,
        factionCount: f.factionsForCreate.length,
        eventCount: f.eventsForCreate.length,
        worldEntityCount: f.worldEntitiesForCreate.length,
        relationCount: f.relationsForCreate.length,
        snapshotCount: g.length
      }), { project: w, conflict: "luie-newer" };
    } catch (e) {
      throw P.error("Failed to open .luie package", { packagePath: t, error: e }), e instanceof y ? e : new y(
        _.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath: t },
        e
      );
    }
  }
  async getProject(t) {
    try {
      const e = await N.getClient().project.findUnique({
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
        throw new y(
          _.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return e;
    } catch (e) {
      throw P.error("Failed to get project", e), e;
    }
  }
  async getAllProjects() {
    try {
      const t = await N.getClient().project.findMany({
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
          if (!!!(o && o.toLowerCase().endsWith(j)) || !o)
            return {
              ...r,
              pathMissing: !1
            };
          try {
            const s = W(o, "projectPath");
            return await pt.access(s), {
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
      throw P.error("Failed to get all projects", t), new y(
        _.DB_QUERY_FAILED,
        "Failed to get all projects",
        void 0,
        t
      );
    }
  }
  async updateProject(t) {
    try {
      const e = t.projectPath === void 0 ? void 0 : this.normalizeProjectPath(t.projectPath) ?? null;
      if (e) {
        const d = await this.findProjectPathConflict(e, t.id);
        if (d)
          throw new y(
            _.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath: e, conflictProjectId: d.id }
          );
      }
      const r = await N.getClient().project.findUnique({
        where: { id: t.id },
        select: { title: !0, projectPath: !0 }
      }), o = await N.getClient().project.update({
        where: { id: t.id },
        data: {
          title: t.title,
          description: t.description,
          projectPath: e
        }
      }), a = typeof r?.title == "string" ? r.title : "", s = typeof o.title == "string" ? o.title : "", c = typeof o.projectPath == "string" ? o.projectPath : null;
      if (c && c.toLowerCase().endsWith(j) && a && s && a !== s)
        try {
          const d = W(c, "projectPath"), u = `${_t.dirname(d)}${_t.sep}.luie${_t.sep}${Lt}`, m = ze(a, ""), A = ze(s, "");
          if (m && A && m !== A) {
            const h = `${u}${_t.sep}${m}`, f = `${u}${_t.sep}${A}`;
            try {
              (await pt.stat(h)).isDirectory() && (await pt.mkdir(u, { recursive: !0 }), await pt.rename(h, f));
            } catch {
            }
          }
        } catch (d) {
          P.warn("Skipping snapshot directory rename for invalid projectPath", {
            projectId: o.id,
            projectPath: c,
            error: d
          });
        }
      const p = String(o.id);
      return P.info("Project updated successfully", { projectId: p }), this.schedulePackageExport(p, "project:update"), o;
    } catch (e) {
      throw P.error("Failed to update project", e), new y(
        _.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input: t },
        e
      );
    }
  }
  clearSyncBaselineForProject(t) {
    const r = T.getSyncSettings().entityBaselinesByProjectId;
    if (!r || !(t in r)) return;
    const o = { ...r };
    delete o[t], T.setSyncSettings({
      entityBaselinesByProjectId: Object.keys(o).length > 0 ? o : void 0
    });
  }
  async deleteProject(t) {
    const e = typeof t == "string" ? { id: t, deleteFile: !1 } : { id: t.id, deleteFile: !!t.deleteFile };
    let r = !1;
    try {
      const o = await N.getClient().project.findUnique({
        where: { id: e.id },
        select: { id: !0, projectPath: !0 }
      });
      if (!o?.id)
        throw new y(
          _.PROJECT_NOT_FOUND,
          "Project not found",
          { id: e.id }
        );
      if (e.deleteFile) {
        const a = typeof o.projectPath == "string" ? o.projectPath : null;
        if (a && a.toLowerCase().endsWith(j)) {
          const s = W(a, "projectPath");
          await pt.rm(s, { force: !0, recursive: !0 });
        }
      }
      return T.addPendingProjectDelete({
        projectId: e.id,
        deletedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), r = !0, await N.getClient().project.delete({
        where: { id: e.id }
      }), this.clearSyncBaselineForProject(e.id), P.info("Project deleted successfully", { projectId: e.id, deleteFile: e.deleteFile }), { success: !0 };
    } catch (o) {
      throw r && T.removePendingProjectDeletes([e.id]), P.error("Failed to delete project", o), o instanceof y ? o : new y(
        _.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id: e.id, deleteFile: e.deleteFile },
        o
      );
    }
  }
  async removeProjectFromList(t) {
    try {
      if (!(await N.getClient().project.findUnique({
        where: { id: t },
        select: { id: !0 }
      }))?.id)
        throw new y(
          _.PROJECT_NOT_FOUND,
          "Project not found",
          { id: t }
        );
      return await N.getClient().project.delete({
        where: { id: t }
      }), this.clearSyncBaselineForProject(t), P.info("Project removed from list", { projectId: t }), { success: !0 };
    } catch (e) {
      throw P.error("Failed to remove project from list", e), e instanceof y ? e : new y(
        _.PROJECT_DELETE_FAILED,
        "Failed to remove project from list",
        { id: t },
        e
      );
    }
  }
  schedulePackageExport(t, e) {
    const r = this.exportTimers.get(t);
    r && clearTimeout(r);
    const o = setTimeout(async () => {
      this.exportTimers.delete(t);
      try {
        await this.runPackageExport(t);
      } catch (a) {
        P.error("Failed to export project package", { projectId: t, reason: e, error: a });
      }
    }, Io);
    this.exportTimers.set(t, o);
  }
  runPackageExport(t) {
    const e = this.exportInFlight.get(t);
    if (e)
      return e;
    const r = this.exportProjectPackage(t).catch((o) => {
      throw P.error("Failed to run package export", { projectId: t, error: o }), o;
    }).finally(() => {
      this.exportInFlight.delete(t);
    });
    return this.exportInFlight.set(t, r), r;
  }
  async flushPendingExports(t = 8e3) {
    const e = /* @__PURE__ */ new Set([
      ...this.exportTimers.keys(),
      ...this.exportInFlight.keys()
    ]);
    for (const [p, d] of this.exportTimers.entries())
      clearTimeout(d), this.exportTimers.delete(p);
    if (e.size === 0)
      return { total: 0, flushed: 0, failed: 0, timedOut: !1 };
    let r = 0, o = 0;
    const a = Array.from(e).map(async (p) => {
      try {
        await this.runPackageExport(p), r += 1;
      } catch (d) {
        o += 1, P.error("Failed to flush pending package export", { projectId: p, error: d });
      }
    }), s = Promise.all(a).then(() => !0), c = await new Promise((p) => {
      const d = setTimeout(() => p(!0), t);
      s.then(() => {
        clearTimeout(d), p(!1);
      });
    });
    return {
      total: e.size,
      flushed: r,
      failed: o,
      timedOut: c
    };
  }
  async getProjectForExport(t) {
    return await N.getClient().project.findUnique({
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
      return P.info("Skipping package export (missing projectPath)", { projectId: t }), null;
    if (!e.toLowerCase().endsWith(j))
      return P.info("Skipping package export (not .luie)", {
        projectId: t,
        projectPath: e
      }), null;
    try {
      return W(e, "projectPath");
    } catch (r) {
      return P.warn("Skipping package export (invalid projectPath)", {
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
      file: `${Tt}/${o.id}${Yt}`
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
    })), r = T.getAll().snapshotExportLimit ?? dn;
    return r > 0 ? e.slice(0, r) : e;
  }
  async readWorldPayloadFromPackage(t) {
    if (!t || !t.toLowerCase().endsWith(j))
      return {
        synopsis: De.safeParse(null),
        plot: Wr.safeParse(null),
        drawing: Br.safeParse(null),
        mindmap: $r.safeParse(null),
        memos: xr.safeParse(null)
      };
    const e = async (p, d, l) => {
      const u = `${D}/${p}`;
      try {
        const m = await X(t, u, P);
        return Zs(m, d, {
          packagePath: t,
          entryPath: u,
          label: l
        });
      } catch (m) {
        return P.warn("Failed to read .luie world document; using default during export", {
          projectPath: t,
          entryPath: u,
          label: l,
          error: m
        }), d.safeParse(null);
      }
    }, [r, o, a, s, c] = await Promise.all([
      e(
        Ot,
        De,
        "synopsis"
      ),
      e(qt, Wr, "plot"),
      e(Vt, Br, "drawing"),
      e(Kt, $r, "mindmap"),
      e(
        ue,
        xr,
        "scrap-memos"
      )
    ]);
    return {
      synopsis: r,
      plot: o,
      drawing: a,
      mindmap: s,
      memos: c
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
      paths: Un(t.data.paths),
      tool: t.data.tool,
      iconType: t.data.iconType,
      color: typeof t.data.color == "string" ? t.data.color : void 0,
      lineWidth: typeof t.data.lineWidth == "number" ? t.data.lineWidth : void 0,
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    };
  }
  buildWorldMindmap(t) {
    return t.success ? {
      nodes: Mn(t.data.nodes),
      edges: kn(t.data.edges),
      updatedAt: typeof t.data.updatedAt == "string" ? t.data.updatedAt : void 0
    } : { nodes: [], edges: [] };
  }
  buildWorldScrapMemos(t) {
    return t.success ? {
      memos: Wn(t.data.memos),
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
      format: Gt,
      container: Ht,
      version: zt,
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
    const a = e?.worldSourcePath === void 0 ? o : e.worldSourcePath, { exportChapters: s, chapterMeta: c } = this.buildExportChapterData(r.chapters), p = this.buildExportCharacterData(r.characters), d = this.buildExportTermData(r.terms), l = this.buildExportSnapshotData(r.snapshots), u = await this.readWorldPayloadFromPackage(a), m = this.buildWorldSynopsis(r, u.synopsis), A = this.buildWorldPlot(u.plot), h = this.buildWorldDrawing(u.drawing), f = this.buildWorldMindmap(u.mindmap), g = this.buildWorldScrapMemos(u.memos), w = this.buildWorldGraph(r), L = this.buildProjectPackageMeta(r, c);
    return P.info("Exporting .luie package", {
      projectId: t,
      projectPath: o,
      chapterCount: s.length,
      characterCount: p.length,
      termCount: d.length,
      worldNodeCount: w.nodes.length,
      relationCount: w.edges.length,
      snapshotCount: l.length
    }), await sr(
      o,
      {
        meta: L,
        chapters: s,
        characters: p,
        terms: d,
        synopsis: m,
        plot: A,
        drawing: h,
        mindmap: f,
        memos: g,
        graph: w,
        snapshots: l
      },
      P
    ), !0;
  }
  async exportProjectPackage(t) {
    await this.exportProjectPackageWithOptions(t);
  }
}
const $n = new Bn(), xn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ProjectService: Bn,
  projectService: $n
}, Symbol.toStringTag, { value: "Module" })), Gn = () => ({
  projects: [],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: []
}), Q = (n) => {
  if (!n) return 0;
  const t = Date.parse(n);
  return Number.isFinite(t) ? t : 0;
}, Gr = (n, t, e, r) => {
  const o = n?.[t];
  if (!o) return 0;
  const a = e === "chapter" ? o.chapter : o.memo;
  return Q(a[r]);
}, ge = (n, t) => Q(n.updatedAt) >= Q(t.updatedAt) ? [n, t] : [t, n], Ut = (n, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const r of n)
    e.set(r.id, r);
  for (const r of t) {
    const o = e.get(r.id);
    if (!o) {
      e.set(r.id, r);
      continue;
    }
    const [a] = ge(o, r);
    e.set(r.id, a);
  }
  return Array.from(e.values());
}, oi = (n, t) => {
  const e = /* @__PURE__ */ new Map();
  for (const r of n)
    e.set(`${r.projectId}:${r.docType}`, r);
  for (const r of t) {
    const o = `${r.projectId}:${r.docType}`, a = e.get(o);
    if (!a) {
      e.set(o, r);
      continue;
    }
    const [s] = ge(a, r);
    e.set(o, s);
  }
  return Array.from(e.values());
}, Hr = (n, t, e, r, o, a) => {
  const s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
  let p = 0;
  const d = [];
  for (const l of t)
    c.set(l.id, l);
  for (const l of n)
    s.set(l.id, l);
  for (const l of t) {
    const u = s.get(l.id);
    if (!u) {
      s.set(l.id, l);
      continue;
    }
    let [m, A] = ge(u, l);
    if (u.content !== l.content && (o ? o(u, l) : !0)) {
      const f = `${e}:${u.id}`, g = a?.[f];
      if (g === "local")
        m = u, A = l;
      else if (g === "remote")
        m = l, A = u;
      else {
        p += 1, d.push({
          type: e,
          id: u.id,
          projectId: u.projectId,
          title: u.title,
          localUpdatedAt: u.updatedAt,
          remoteUpdatedAt: l.updatedAt,
          localPreview: u.content.slice(0, 400),
          remotePreview: l.content.slice(0, 400)
        });
        const w = r(A);
        s.set(w.id, w);
      }
    }
    s.set(l.id, m);
  }
  for (const [l, u] of c.entries())
    s.has(l) || s.set(l, u);
  return {
    merged: Array.from(s.values()),
    conflicts: p,
    conflictItems: d
  };
}, ai = (n, t, e) => {
  const r = n + t;
  return {
    chapters: n,
    memos: t,
    total: r,
    items: e.length > 0 ? e : void 0
  };
}, si = (n) => {
  const t = /* @__PURE__ */ new Map();
  for (const s of n.tombstones) {
    const c = `${s.entityType}:${s.entityId}`, p = t.get(c);
    if (!p) {
      t.set(c, s);
      continue;
    }
    const [d] = ge(p, s);
    t.set(c, d);
  }
  const e = /* @__PURE__ */ new Set();
  for (const s of n.projects)
    s.deletedAt && e.add(s.id);
  for (const s of t.values())
    s.entityType === "project" && (e.add(s.entityId), e.add(s.projectId));
  const r = (s) => e.has(s), o = (s) => {
    const c = t.get(`chapter:${s.id}`);
    if (!c) return s;
    const p = c.deletedAt, d = Q(c.updatedAt) > Q(s.updatedAt) ? c.updatedAt : s.updatedAt;
    return {
      ...s,
      deletedAt: p,
      updatedAt: d
    };
  }, a = (s, c) => c.filter((p) => !t.has(`${s}:${p.id}`));
  return {
    ...n,
    projects: a(
      "project",
      n.projects.filter((s) => !r(s.id))
    ),
    chapters: n.chapters.filter((s) => !r(s.projectId)).map(o),
    characters: a(
      "character",
      n.characters.filter((s) => !r(s.projectId))
    ),
    terms: a(
      "term",
      n.terms.filter((s) => !r(s.projectId))
    ),
    worldDocuments: n.worldDocuments.filter(
      (s) => !r(s.projectId)
    ),
    memos: a(
      "memo",
      n.memos.filter((s) => !r(s.projectId))
    ),
    snapshots: a(
      "snapshot",
      n.snapshots.filter((s) => !r(s.projectId))
    )
  };
}, ii = (n, t, e) => {
  const r = new Set(
    [...n.tombstones, ...t.tombstones].map(
      (d) => `${d.entityType}:${d.entityId}`
    )
  ), o = e?.baselinesByProjectId, a = Hr(
    n.chapters,
    t.chapters,
    "chapter",
    (d) => ({
      ...d,
      id: q(),
      title: `${d.title} (Conflict Copy)`,
      order: d.order + 1e4,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (d, l) => d.projectId === l.projectId && !d.deletedAt && !l.deletedAt && !r.has(`chapter:${d.id}`) && !r.has(`chapter:${l.id}`) && (() => {
      const u = Gr(
        o,
        d.projectId,
        "chapter",
        d.id
      );
      return u <= 0 ? !1 : Q(d.updatedAt) > u && Q(l.updatedAt) > u;
    })(),
    e?.conflictResolutions
  ), s = Hr(
    n.memos,
    t.memos,
    "memo",
    (d) => ({
      ...d,
      id: q(),
      title: `${d.title} (Conflict Copy)`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }),
    (d, l) => d.projectId === l.projectId && !d.deletedAt && !l.deletedAt && !r.has(`memo:${d.id}`) && !r.has(`memo:${l.id}`) && (() => {
      const u = Gr(
        o,
        d.projectId,
        "memo",
        d.id
      );
      return u <= 0 ? !1 : Q(d.updatedAt) > u && Q(l.updatedAt) > u;
    })(),
    e?.conflictResolutions
  ), c = [
    ...a.conflictItems,
    ...s.conflictItems
  ], p = {
    projects: Ut(n.projects, t.projects),
    chapters: a.merged,
    characters: Ut(n.characters, t.characters),
    terms: Ut(n.terms, t.terms),
    worldDocuments: oi(n.worldDocuments, t.worldDocuments),
    memos: s.merged,
    snapshots: Ut(n.snapshots, t.snapshots),
    tombstones: Ut(n.tombstones, t.tombstones)
  };
  return {
    merged: si(p),
    conflicts: ai(
      a.conflicts,
      s.conflicts,
      c
    )
  };
}, Hn = x("SyncRepository"), I = (n) => typeof n == "string" ? n : null, Qt = (n, t) => typeof n == "string" && n.length > 0 ? n : t, z = (n, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof n == "string" && n.length > 0 ? n : n instanceof Date ? n.toISOString() : t, Xe = (n, t = 0) => typeof n == "number" && Number.isFinite(n) ? n : t, ci = (n) => Array.isArray(n) ? n.filter((t) => typeof t == "string") : [], zr = (n) => !!(n && typeof n == "object" && !Array.isArray(n)), di = (n) => {
  try {
    return JSON.parse(n);
  } catch {
    return n;
  }
}, ir = (n) => typeof n == "string" ? di(n) : n ?? null, ut = (n) => {
  const t = {};
  for (const [e, r] of Object.entries(n))
    r !== void 0 && (t[e] = r);
  return t;
}, Yr = async (n, t, e) => {
  const r = await e.text();
  return e.status === 404 && r.includes("PGRST205") ? new Error(`SUPABASE_SCHEMA_MISSING:${t}`) : new Error(`SUPABASE_${n}_FAILED:${t}:${e.status}:${r}`);
}, li = (n) => {
  const t = I(n.id), e = I(n.user_id);
  return !t || !e ? null : {
    id: t,
    userId: e,
    title: Qt(n.title, "Untitled"),
    description: I(n.description),
    createdAt: z(n.created_at),
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, pi = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    title: Qt(n.title, "Untitled"),
    content: I(n.content) ?? "",
    synopsis: I(n.synopsis),
    order: Xe(n.order),
    wordCount: Xe(n.word_count),
    createdAt: z(n.created_at),
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, ui = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    name: Qt(n.name, "Character"),
    description: I(n.description),
    firstAppearance: I(n.first_appearance),
    attributes: ir(n.attributes),
    createdAt: z(n.created_at),
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, hi = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    term: Qt(n.term, "Term"),
    definition: I(n.definition),
    category: I(n.category),
    order: Xe(n.order),
    firstAppearance: I(n.first_appearance),
    createdAt: z(n.created_at),
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, fi = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id), o = I(n.doc_type);
  if (!t || !e || !r || !o || o !== "synopsis" && o !== "plot" && o !== "drawing" && o !== "mindmap" && o !== "scrap" && o !== "graph")
    return null;
  const a = ir(n.payload), s = zr(a) ? a : {};
  return zr(a) || Hn.warn("Invalid world document payload from sync source; using empty payload", {
    docType: o,
    payloadType: a === null ? "null" : typeof a
  }), {
    id: t,
    userId: e,
    projectId: r,
    docType: o,
    payload: s,
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, Ei = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id);
  return !t || !e || !r ? null : {
    id: t,
    userId: e,
    projectId: r,
    title: Qt(n.title, "Memo"),
    content: I(n.content) ?? "",
    tags: ci(n.tags),
    updatedAt: z(n.updated_at),
    deletedAt: I(n.deleted_at)
  };
}, gi = (n) => {
  const t = I(n.id), e = I(n.user_id), r = I(n.project_id), o = I(n.entity_type), a = I(n.entity_id);
  return !t || !e || !r || !o || !a ? null : {
    id: t,
    userId: e,
    projectId: r,
    entityType: o,
    entityId: a,
    deletedAt: z(n.deleted_at),
    updatedAt: z(n.updated_at)
  };
};
class mi {
  isConfigured() {
    return St() !== null;
  }
  async fetchBundle(t, e) {
    const r = Gn(), [
      o,
      a,
      s,
      c,
      p,
      d,
      l
    ] = await Promise.all([
      this.fetchTableRaw("projects", t, e),
      this.fetchTableRaw("chapters", t, e),
      this.fetchTableRaw("characters", t, e),
      this.fetchTableRaw("terms", t, e),
      this.fetchTableRaw("world_documents", t, e),
      this.fetchTableRaw("memos", t, e),
      this.fetchTableRaw("tombstones", t, e)
    ]);
    return r.projects = o.map(li).filter((u) => u !== null), r.chapters = a.map(pi).filter((u) => u !== null), r.characters = s.map(ui).filter((u) => u !== null), r.terms = c.map(hi).filter((u) => u !== null), r.worldDocuments = p.map(fi).filter((u) => u !== null), r.memos = d.map(Ei).filter((u) => u !== null), r.tombstones = l.map(gi).filter((u) => u !== null), r;
  }
  async upsertBundle(t, e) {
    const r = e.projects.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        title: l.title,
        description: l.description ?? null,
        created_at: l.createdAt,
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), o = e.chapters.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        title: l.title,
        content: l.content,
        synopsis: l.synopsis ?? null,
        order: l.order,
        word_count: l.wordCount,
        created_at: l.createdAt,
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), a = e.characters.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        name: l.name,
        description: l.description ?? null,
        first_appearance: l.firstAppearance ?? null,
        attributes: ir(l.attributes),
        created_at: l.createdAt,
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), s = e.terms.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        term: l.term,
        definition: l.definition ?? null,
        category: l.category ?? null,
        order: l.order,
        first_appearance: l.firstAppearance ?? null,
        created_at: l.createdAt,
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), c = e.worldDocuments.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        doc_type: l.docType,
        payload: l.payload ?? {},
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), p = e.memos.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        title: l.title,
        content: l.content,
        tags: l.tags,
        updated_at: l.updatedAt,
        deleted_at: l.deletedAt ?? null
      })
    ), d = e.tombstones.map(
      (l) => ut({
        id: l.id,
        user_id: l.userId,
        project_id: l.projectId,
        entity_type: l.entityType,
        entity_id: l.entityId,
        deleted_at: l.deletedAt,
        updated_at: l.updatedAt
      })
    );
    await this.upsertTable("projects", t, r, "id,user_id"), await this.upsertTable("chapters", t, o, "id,user_id"), await this.upsertTable("characters", t, a, "id,user_id"), await this.upsertTable("terms", t, s, "id,user_id"), await this.upsertTable("world_documents", t, c, "id,user_id"), await this.upsertTable("memos", t, p, "id,user_id"), await this.upsertTable("tombstones", t, d, "id,user_id");
  }
  async fetchTableRaw(t, e, r) {
    const o = St();
    if (!o)
      throw new Error(
        "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed"
      );
    const a = new URLSearchParams();
    a.set("select", "*"), a.set("user_id", `eq.${r}`);
    const s = await fetch(`${o.url}/rest/v1/${t}?${a.toString()}`, {
      method: "GET",
      headers: {
        apikey: o.anonKey,
        Authorization: `Bearer ${e}`
      }
    });
    if (!s.ok) {
      const p = await Yr("FETCH", t, s);
      throw Hn.warn("Failed to fetch sync table", {
        table: t,
        status: s.status,
        error: p.message
      }), p;
    }
    const c = await s.json();
    return Array.isArray(c) ? c : [];
  }
  async upsertTable(t, e, r, o) {
    if (r.length === 0) return;
    const a = Wt(), s = await fetch(
      `${a.url}/rest/v1/${t}?on_conflict=${encodeURIComponent(o)}`,
      {
        method: "POST",
        headers: {
          apikey: a.anonKey,
          Authorization: `Bearer ${e}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(r)
      }
    );
    if (!s.ok)
      throw await Yr("UPSERT", t, s);
  }
}
const Xr = new mi(), $ = x("SyncService"), Ai = 1500, qr = {
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
}, rt = (n, t = (/* @__PURE__ */ new Date()).toISOString()) => typeof n == "string" && n.length > 0 ? n : n instanceof Date ? n.toISOString() : t, v = (n) => typeof n == "string" ? n : null, be = (n, t = 0) => typeof n == "number" && Number.isFinite(n) ? n : t, Ti = (n) => [...n].sort((t, e) => Date.parse(e.updatedAt) - Date.parse(t.updatedAt)), Si = (n) => {
  const t = n instanceof Error ? n.message : String(n);
  return t.startsWith("SUPABASE_SCHEMA_MISSING:") ? `SYNC_REMOTE_SCHEMA_MISSING:${t.split(":")[1] ?? "unknown"}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project` : t;
}, yi = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE"
], _i = [
  { docType: "synopsis", fileName: Ot },
  { docType: "plot", fileName: qt },
  { docType: "drawing", fileName: Vt },
  { docType: "mindmap", fileName: Kt },
  { docType: "graph", fileName: Jt }
], wi = {
  synopsis: Ot,
  plot: qt,
  drawing: Vt,
  mindmap: Kt,
  graph: Jt,
  scrap: ue
}, Ii = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap"
], Pi = /* @__PURE__ */ new Set(["draft", "working", "locked"]), Rt = (n) => yi.some((t) => n.includes(t)), nt = (n, t) => ({
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
}), Vr = (n) => Array.isArray(n) ? n.filter(
  (t) => !!(t && typeof t.projectId == "string" && t.projectId.length > 0 && typeof t.deletedAt == "string" && t.deletedAt.length > 0)
).map((t) => ({
  projectId: t.projectId,
  deletedAt: t.deletedAt
})) : [];
class zn {
  status = qr;
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
      Object.entries(t).map(([o, a]) => [
        o,
        {
          state: "error",
          lastSyncedAt: a.lastSyncedAt,
          reason: e
        }
      ])
    );
    return Object.keys(r).length > 0 ? r : void 0;
  }
  applyAuthFailureState(t, e) {
    const r = T.setSyncSettings({
      lastError: t
    });
    this.updateStatus({
      ...nt(r, this.status),
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
    const a = {
      ...t.projectLastSyncedAtByProjectId ?? {}
    };
    for (const s of o)
      delete a[s];
    for (const s of e.projects) {
      if (s.deletedAt) {
        delete a[s.id];
        continue;
      }
      a[s.id] = r;
    }
    for (const s of e.tombstones)
      s.entityType === "project" && (delete a[s.entityId], delete a[s.projectId]);
    return Object.keys(a).length > 0 ? a : void 0;
  }
  buildEntityBaselineMapForSuccess(t, e, r, o) {
    const a = {
      ...t.entityBaselinesByProjectId ?? {}
    };
    this.dropEntityBaselines(a, o);
    const s = this.collectDeletedProjectIdsForBaselines(e);
    this.dropEntityBaselines(a, Array.from(s));
    const c = this.seedActiveProjectBaselines(
      a,
      e,
      s,
      r
    );
    return this.applyChapterBaselines(a, e, s, c, r), this.applyMemoBaselines(a, e, s, c, r), Object.keys(a).length > 0 ? a : void 0;
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
    const a = /* @__PURE__ */ new Set();
    for (const s of e.projects)
      s.deletedAt || r.has(s.id) || (a.add(s.id), t[s.id] = {
        chapter: {},
        memo: {},
        capturedAt: o
      });
    return a;
  }
  applyChapterBaselines(t, e, r, o, a) {
    for (const s of e.chapters) {
      if (s.deletedAt || r.has(s.projectId) || !o.has(s.projectId)) continue;
      const c = t[s.projectId];
      c && (c.chapter[s.id] = s.updatedAt, c.capturedAt = a);
    }
  }
  applyMemoBaselines(t, e, r, o, a) {
    for (const s of e.memos) {
      if (s.deletedAt || r.has(s.projectId) || !o.has(s.projectId)) continue;
      const c = t[s.projectId];
      c && (c.memo[s.id] = s.updatedAt, c.capturedAt = a);
    }
  }
  persistMigratedTokenCipher(t, e) {
    e && T.setSyncSettings(
      t === "access" ? { accessTokenCipher: e } : { refreshTokenCipher: e }
    );
  }
  resolveStartupAuthFailure(t) {
    const e = H.getAccessToken(t);
    if (e.errorCode && Rt(e.errorCode))
      return e.errorCode;
    this.persistMigratedTokenCipher("access", e.migratedCipher);
    const r = H.getRefreshToken(t);
    return r.errorCode && Rt(r.errorCode) ? r.errorCode : (this.persistMigratedTokenCipher("refresh", r.migratedCipher), !!e.token || !!r.token ? null : e.errorCode ?? r.errorCode ?? "SYNC_ACCESS_TOKEN_UNAVAILABLE");
  }
  initialize() {
    const t = T.getSyncSettings();
    if (this.status = nt(t, this.status), !t.connected && H.hasPendingAuthFlow() && (this.status = {
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
    if (!H.isConfigured())
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
      return await H.startGoogleAuth(), this.status;
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
    const t = T.getSyncSettings();
    if (!t.connected || !t.userId)
      throw new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    return this.ensureAccessToken(t);
  }
  async handleOAuthCallback(t) {
    try {
      const e = await H.completeOAuthCallback(t), r = T.getSyncSettings(), o = T.setSyncSettings({
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
        ...nt(o, this.status),
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
    const t = T.clearSyncSettings();
    return this.updateStatus({
      ...nt(t, qr),
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
    const e = T.setSyncSettings({ autoSync: t });
    return this.updateStatus(nt(e, this.status)), this.status;
  }
  async resolveConflict(t) {
    if ($.info("Sync conflict resolution requested", {
      type: t.type,
      id: t.id,
      resolution: t.resolution
    }), !(this.status.conflicts.items ?? []).some(
      (c) => c.type === t.type && c.id === t.id
    ))
      throw new Error("SYNC_CONFLICT_NOT_FOUND");
    const a = {
      ...T.getSyncSettings().pendingConflictResolutions ?? {},
      [`${t.type}:${t.id}`]: t.resolution
    };
    T.setSyncSettings({
      pendingConflictResolutions: a,
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
    }, Ai));
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
      const e = T.getSyncSettings(), r = e.userId;
      if (!r)
        throw new Error("SYNC_USER_ID_MISSING");
      const o = Vr(
        e.pendingProjectDeletes
      ).map((f) => f.projectId), a = await this.ensureAccessToken(e), [s, c] = await Promise.all([
        Xr.fetchBundle(a, r),
        this.buildLocalBundle(r)
      ]), { merged: p, conflicts: d } = ii(c, s, {
        baselinesByProjectId: e.entityBaselinesByProjectId,
        conflictResolutions: e.pendingConflictResolutions
      });
      if (d.total > 0) {
        const f = new Set(
          (d.items ?? []).map((E) => `${E.type}:${E.id}`)
        ), g = Object.fromEntries(
          Object.entries(e.pendingConflictResolutions ?? {}).filter(
            (E) => f.has(E[0])
          )
        );
        T.setSyncSettings({
          pendingConflictResolutions: Object.keys(g).length > 0 ? g : void 0,
          lastError: void 0
        });
        const L = {
          at: (/* @__PURE__ */ new Date()).toISOString(),
          pulled: this.countBundleRows(s),
          pushed: 0,
          conflicts: d.total,
          success: !1,
          message: "SYNC_CONFLICT_DETECTED"
        };
        return this.updateStatus({
          ...nt(T.getSyncSettings(), this.status),
          mode: "idle",
          health: "connected",
          degradedReason: void 0,
          inFlight: !1,
          queued: !1,
          conflicts: d,
          projectStateById: this.withConflictProjectStates(
            this.toSyncedProjectStates(e.projectLastSyncedAtByProjectId),
            d
          ),
          lastRun: L
        }), {
          success: !1,
          message: "SYNC_CONFLICT_DETECTED",
          pulled: L.pulled,
          pushed: 0,
          conflicts: d
        };
      }
      await this.applyMergedBundleToLocal(p), await Xr.upsertBundle(a, p);
      const l = (/* @__PURE__ */ new Date()).toISOString(), u = this.buildProjectSyncMapForSuccess(
        e,
        p,
        l,
        o
      ), m = this.buildEntityBaselineMapForSuccess(
        e,
        p,
        l,
        o
      ), A = T.setSyncSettings({
        lastSyncedAt: l,
        lastError: void 0,
        projectLastSyncedAtByProjectId: u,
        entityBaselinesByProjectId: m,
        pendingConflictResolutions: void 0
      });
      o.length > 0 && T.removePendingProjectDeletes(o);
      const h = {
        success: !0,
        message: `SYNC_OK:${t}`,
        pulled: this.countBundleRows(s),
        pushed: this.countBundleRows(p),
        conflicts: d,
        syncedAt: l
      };
      return this.updateStatus({
        ...nt(A, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: void 0,
        inFlight: !1,
        conflicts: d,
        projectStateById: this.toSyncedProjectStates(u),
        lastRun: {
          at: l,
          pulled: h.pulled,
          pushed: h.pushed,
          conflicts: h.conflicts.total,
          success: !0,
          message: h.message
        }
      }), this.queuedRun && (this.queuedRun = !1, this.runNow("queued")), h;
    } catch (e) {
      const r = Si(e), a = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts.total,
        success: !1,
        message: r
      };
      if (Rt(r))
        this.applyAuthFailureState(r, a);
      else {
        const s = T.setSyncSettings({
          lastError: r
        });
        this.updateStatus({
          ...nt(s, this.status),
          mode: "error",
          health: this.status.connected ? "connected" : "disconnected",
          degradedReason: void 0,
          inFlight: !1,
          queued: !1,
          projectStateById: this.withErrorProjectStates(this.status.projectStateById, r),
          lastRun: a
        });
      }
      return this.queuedRun = !1, $.error("Sync run failed", { error: e, reason: t }), {
        success: !1,
        message: r,
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts
      };
    }
  }
  async ensureAccessToken(t) {
    const e = (s) => {
      s && T.setSyncSettings({
        accessTokenCipher: s
      });
    }, r = t.expiresAt ? Date.parse(t.expiresAt) <= Date.now() + 6e4 : !0, o = H.getAccessToken(t);
    if (o.errorCode && Rt(o.errorCode))
      throw new Error(o.errorCode);
    e(o.migratedCipher);
    let a = o.token;
    if (r || !a) {
      const s = H.getRefreshToken(t);
      if (s.errorCode && Rt(s.errorCode))
        throw new Error(s.errorCode);
      if (s.migratedCipher && T.setSyncSettings({
        refreshTokenCipher: s.migratedCipher
      }), !s.token)
        throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
      const c = await H.refreshSession(t), p = T.setSyncSettings({
        provider: c.provider,
        userId: c.userId,
        email: c.email,
        expiresAt: c.expiresAt,
        accessTokenCipher: c.accessTokenCipher,
        refreshTokenCipher: c.refreshTokenCipher
      }), d = H.getAccessToken(p);
      if (d.errorCode && Rt(d.errorCode))
        throw new Error(d.errorCode);
      e(d.migratedCipher), a = d.token;
    }
    if (!a)
      throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
    return a;
  }
  async buildLocalBundle(t) {
    const e = Gn(), r = N.getClient(), o = Vr(
      T.getSyncSettings().pendingProjectDeletes
    ), a = await r.project.findMany({
      include: {
        chapters: !0,
        characters: !0,
        terms: !0
      }
    });
    for (const s of a)
      await this.collectProjectBundleData(e, t, s);
    return this.appendPendingProjectDeleteTombstones(e, t, o), e;
  }
  async collectProjectBundleData(t, e, r) {
    const o = this.appendProjectRecord(t, e, r);
    if (!o) return;
    const { projectId: a, projectPath: s, projectUpdatedAt: c } = o;
    if (this.appendChapterRecords(
      t,
      e,
      a,
      Array.isArray(r.chapters) ? r.chapters : []
    ), this.appendCharacterRecords(
      t,
      e,
      a,
      Array.isArray(r.characters) ? r.characters : []
    ), this.appendTermRecords(
      t,
      e,
      a,
      Array.isArray(r.terms) ? r.terms : []
    ), s && s.toLowerCase().endsWith(j))
      try {
        const p = W(s, "projectPath");
        await this.collectWorldDocuments(
          t,
          e,
          a,
          p,
          c
        );
      } catch (p) {
        $.warn("Skipping sync world document read for invalid projectPath", {
          projectId: a,
          projectPath: s,
          error: p
        });
      }
  }
  appendProjectRecord(t, e, r) {
    const o = v(r.id);
    if (!o) return null;
    const a = rt(r.updatedAt);
    return t.projects.push({
      id: o,
      userId: e,
      title: v(r.title) ?? "Untitled",
      description: v(r.description),
      createdAt: rt(r.createdAt),
      updatedAt: a
    }), {
      projectId: o,
      projectPath: v(r.projectPath),
      projectUpdatedAt: a
    };
  }
  appendChapterRecords(t, e, r, o) {
    for (const a of o) {
      const s = v(a.id);
      if (!s) continue;
      const c = v(a.deletedAt);
      t.chapters.push({
        id: s,
        userId: e,
        projectId: r,
        title: v(a.title) ?? "Untitled",
        content: v(a.content) ?? "",
        synopsis: v(a.synopsis),
        order: be(a.order),
        wordCount: be(a.wordCount),
        createdAt: rt(a.createdAt),
        updatedAt: rt(a.updatedAt),
        deletedAt: c
      }), c && t.tombstones.push({
        id: `${r}:chapter:${s}`,
        userId: e,
        projectId: r,
        entityType: "chapter",
        entityId: s,
        deletedAt: c,
        updatedAt: c
      });
    }
  }
  appendCharacterRecords(t, e, r, o) {
    for (const a of o) {
      const s = v(a.id);
      s && t.characters.push({
        id: s,
        userId: e,
        projectId: r,
        name: v(a.name) ?? "Character",
        description: v(a.description),
        firstAppearance: v(a.firstAppearance),
        attributes: v(a.attributes),
        createdAt: rt(a.createdAt),
        updatedAt: rt(a.updatedAt)
      });
    }
  }
  appendTermRecords(t, e, r, o) {
    for (const a of o) {
      const s = v(a.id);
      s && t.terms.push({
        id: s,
        userId: e,
        projectId: r,
        term: v(a.term) ?? "Term",
        definition: v(a.definition),
        category: v(a.category),
        order: be(a.order),
        firstAppearance: v(a.firstAppearance),
        createdAt: rt(a.createdAt),
        updatedAt: rt(a.updatedAt)
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
  addWorldDocumentRecord(t, e, r, o, a, s) {
    t.worldDocuments.push({
      id: `${r}:${o}`,
      userId: e,
      projectId: r,
      docType: o,
      payload: a,
      updatedAt: $s(a) ?? s
    });
  }
  async readWorldDocumentPayload(t, e) {
    const r = wi[e], o = `${D}/${r}`;
    let a = null;
    try {
      a = await X(t, o, $);
    } catch (c) {
      return $.warn("Failed to read .luie world document for sync; skipping doc", {
        projectPath: t,
        entryPath: o,
        docType: e,
        error: c
      }), null;
    }
    if (a === null)
      return null;
    const s = Mr(a);
    return s === null ? ($.warn("Failed to parse .luie world document for sync; skipping doc", {
      projectPath: t,
      entryPath: o,
      docType: e
    }), null) : s;
  }
  appendScrapMemos(t, e, r, o, a) {
    const s = kr(o);
    for (const c of s.memos)
      t.memos.push({
        id: c.id || q(),
        userId: e,
        projectId: r,
        title: c.title || "Memo",
        content: c.content,
        tags: c.tags,
        updatedAt: c.updatedAt || a
      });
  }
  async collectWorldDocuments(t, e, r, o, a) {
    for (const c of _i) {
      const p = await this.readWorldDocumentPayload(o, c.docType);
      p && this.addWorldDocumentRecord(
        t,
        e,
        r,
        c.docType,
        p,
        a
      );
    }
    const s = await this.readWorldDocumentPayload(o, "scrap");
    U(s) && (this.addWorldDocumentRecord(
      t,
      e,
      r,
      "scrap",
      s,
      a
    ), this.appendScrapMemos(t, e, r, s, a));
  }
  async hydrateMissingWorldDocsFromPackage(t, e) {
    const r = Ii.filter((o) => !t.has(o));
    r.length !== 0 && await Promise.all(
      r.map(async (o) => {
        const a = await this.readWorldDocumentPayload(e, o);
        a !== null && t.set(o, a);
      })
    );
  }
  decodeWorldDocumentPayload(t, e, r) {
    if (typeof r != "string")
      return r;
    const o = Mr(r);
    return o !== null ? o : ($.warn("Invalid sync world document payload string; using default payload", {
      projectId: t,
      docType: e
    }), null);
  }
  normalizeSynopsisPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "synopsis", e);
    if (!U(r))
      return { synopsis: "", status: "draft" };
    const o = r.status, a = typeof o == "string" && Pi.has(o) ? o : "draft", s = {
      synopsis: typeof r.synopsis == "string" ? r.synopsis : "",
      status: a
    };
    return typeof r.genre == "string" && (s.genre = r.genre), typeof r.targetAudience == "string" && (s.targetAudience = r.targetAudience), typeof r.logline == "string" && (s.logline = r.logline), typeof r.updatedAt == "string" && (s.updatedAt = r.updatedAt), s;
  }
  normalizePlotPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "plot", e);
    return U(r) ? {
      columns: (Array.isArray(r.columns) ? r.columns : []).filter((s) => U(s)).map((s, c) => {
        const d = (Array.isArray(s.cards) ? s.cards : []).filter((l) => U(l)).map((l, u) => ({
          id: typeof l.id == "string" && l.id.length > 0 ? l.id : `card-${c}-${u}`,
          content: typeof l.content == "string" ? l.content : ""
        }));
        return {
          id: typeof s.id == "string" && s.id.length > 0 ? s.id : `col-${c}`,
          title: typeof s.title == "string" ? s.title : "",
          cards: d
        };
      }),
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { columns: [] };
  }
  normalizeDrawingPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "drawing", e);
    return U(r) ? {
      paths: Un(r.paths),
      tool: xs(r.tool),
      iconType: Gs(r.iconType),
      color: typeof r.color == "string" ? r.color : void 0,
      lineWidth: typeof r.lineWidth == "number" ? r.lineWidth : void 0,
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { paths: [] };
  }
  normalizeMindmapPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "mindmap", e);
    return U(r) ? {
      nodes: Mn(r.nodes),
      edges: kn(r.edges),
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    } : { nodes: [], edges: [] };
  }
  normalizeGraphPayload(t, e) {
    const r = this.decodeWorldDocumentPayload(t, "graph", e);
    if (!U(r))
      return { nodes: [], edges: [] };
    const o = Array.isArray(r.nodes) ? r.nodes.filter((s) => U(s)) : [], a = Array.isArray(r.edges) ? r.edges.filter((s) => U(s)) : [];
    return {
      nodes: o,
      edges: a,
      updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : void 0
    };
  }
  normalizeScrapPayload(t, e, r, o) {
    const a = this.decodeWorldDocumentPayload(t, "scrap", e);
    if (!U(a))
      return {
        memos: r.map((c) => ({
          id: c.id,
          title: c.title,
          content: c.content,
          tags: c.tags,
          updatedAt: c.updatedAt
        })),
        updatedAt: o
      };
    const s = kr(a);
    return {
      memos: s.memos,
      updatedAt: typeof s.updatedAt == "string" ? s.updatedAt : o
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
              autoSaveInterval: ke
            }
          }
        }
      });
    }
  }
  async upsertCharacters(t, e, r) {
    for (const o of e) {
      if (r.has(o.projectId)) continue;
      const a = await t.character.findUnique({
        where: { id: o.id },
        select: { id: !0 }
      });
      if (o.deletedAt) {
        a?.id && await t.character.delete({ where: { id: o.id } });
        continue;
      }
      const s = {
        name: o.name,
        description: o.description,
        firstAppearance: o.firstAppearance,
        attributes: typeof o.attributes == "string" ? o.attributes : JSON.stringify(o.attributes ?? null),
        updatedAt: new Date(o.updatedAt),
        project: {
          connect: { id: o.projectId }
        }
      };
      a?.id ? await t.character.update({ where: { id: o.id }, data: s }) : await t.character.create({
        data: {
          id: o.id,
          ...s,
          createdAt: new Date(o.createdAt)
        }
      });
    }
  }
  async upsertTerms(t, e, r) {
    for (const o of e) {
      if (r.has(o.projectId)) continue;
      const a = await t.term.findUnique({
        where: { id: o.id },
        select: { id: !0 }
      });
      if (o.deletedAt) {
        a?.id && await t.term.delete({ where: { id: o.id } });
        continue;
      }
      const s = {
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
      a?.id ? await t.term.update({ where: { id: o.id }, data: s }) : await t.term.create({
        data: {
          id: o.id,
          ...s,
          createdAt: new Date(o.createdAt)
        }
      });
    }
  }
  async applyChapterTombstones(t, e, r) {
    for (const o of e) {
      if (o.entityType !== "chapter" || r.has(o.projectId)) continue;
      const a = await t.chapter.findUnique({
        where: { id: o.entityId },
        select: { id: !0, projectId: !0 }
      });
      !a?.id || a.projectId !== o.projectId || await t.chapter.update({
        where: { id: o.entityId },
        data: {
          deletedAt: new Date(o.deletedAt),
          updatedAt: new Date(o.updatedAt)
        }
      });
    }
  }
  async applyMergedBundleToLocal(t) {
    const e = await this.persistBundleToLuiePackages(t), r = N.getClient(), o = this.collectDeletedProjectIds(t);
    try {
      await r.$transaction(async (a) => {
        const s = a;
        await this.applyProjectDeletes(s, o), await this.upsertProjects(s, t.projects, o);
        for (const c of t.chapters)
          o.has(c.projectId) || await this.upsertChapter(s, c);
        await this.upsertCharacters(s, t.characters, o), await this.upsertTerms(s, t.terms, o), await this.applyChapterTombstones(s, t.tombstones, o);
      });
    } catch (a) {
      const s = e.map((p) => p.projectId);
      $.error("Failed to apply merged bundle to DB cache after .luie persistence", {
        error: a,
        persistedProjectIds: s
      });
      const c = await this.recoverDbCacheFromPersistedPackages(
        e
      );
      throw c.length > 0 ? new Error(
        `SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${c.join(",")}`
      ) : new Error(`SYNC_DB_CACHE_APPLY_FAILED:${s.join(",") || "none"}`);
    }
  }
  async buildProjectPackagePayload(t, e, r, o) {
    const a = t.projects.find((E) => E.id === e);
    if (!a || a.deletedAt) return null;
    const s = t.chapters.filter((E) => E.projectId === e && !E.deletedAt).sort((E, tt) => E.order - tt.order), c = t.characters.filter((E) => E.projectId === e && !E.deletedAt).map((E) => ({
      id: E.id,
      name: E.name,
      description: E.description ?? void 0,
      firstAppearance: E.firstAppearance ?? void 0,
      attributes: E.attributes ?? void 0
    })), p = t.terms.filter((E) => E.projectId === e && !E.deletedAt).sort((E, tt) => E.order - tt.order).map((E) => ({
      id: E.id,
      term: E.term,
      definition: E.definition ?? void 0,
      category: E.category ?? void 0,
      firstAppearance: E.firstAppearance ?? void 0
    })), d = /* @__PURE__ */ new Map();
    for (const E of Ti(t.worldDocuments))
      E.projectId !== e || E.deletedAt || d.has(E.docType) || d.set(E.docType, E.payload);
    await this.hydrateMissingWorldDocsFromPackage(d, r);
    const l = t.memos.filter((E) => E.projectId === e && !E.deletedAt).map((E) => ({
      id: E.id,
      title: E.title,
      content: E.content,
      tags: E.tags,
      updatedAt: E.updatedAt
    })), u = o.map((E) => ({
      id: E.id,
      chapterId: E.chapterId ?? void 0,
      content: E.content,
      description: E.description ?? void 0,
      createdAt: E.createdAt.toISOString()
    })), m = this.normalizeSynopsisPayload(
      e,
      d.get("synopsis")
    ), A = this.normalizePlotPayload(
      e,
      d.get("plot")
    ), h = this.normalizeDrawingPayload(
      e,
      d.get("drawing")
    ), f = this.normalizeMindmapPayload(
      e,
      d.get("mindmap")
    ), g = this.normalizeGraphPayload(
      e,
      d.get("graph")
    ), w = this.normalizeScrapPayload(
      e,
      d.get("scrap"),
      l,
      a.updatedAt
    ), L = s.map((E) => ({
      id: E.id,
      title: E.title,
      order: E.order,
      file: `${Tt}/${E.id}${Yt}`,
      updatedAt: E.updatedAt
    }));
    return {
      meta: {
        format: Gt,
        container: Ht,
        version: zt,
        projectId: a.id,
        title: a.title,
        description: a.description ?? void 0,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        chapters: L
      },
      chapters: s.map((E) => ({
        id: E.id,
        content: E.content
      })),
      characters: c,
      terms: p,
      synopsis: m,
      plot: A,
      drawing: h,
      mindmap: f,
      graph: g,
      memos: w,
      snapshots: u
    };
  }
  async persistBundleToLuiePackages(t) {
    const e = [], r = [];
    for (const o of t.projects) {
      const a = await N.getClient().project.findUnique({
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
      }), s = v(a?.projectPath);
      if (!s || !s.toLowerCase().endsWith(j))
        continue;
      let c;
      try {
        c = W(s, "projectPath");
      } catch (d) {
        $.warn("Skipping .luie persistence for invalid projectPath", {
          projectId: o.id,
          projectPath: s,
          error: d
        });
        continue;
      }
      const p = await this.buildProjectPackagePayload(
        t,
        o.id,
        c,
        a?.snapshots ?? []
      );
      if (p)
        try {
          await sr(c, p, $), r.push({
            projectId: o.id,
            projectPath: c
          });
        } catch (d) {
          e.push(o.id), $.error("Failed to persist merged bundle into .luie package", {
            projectId: o.id,
            projectPath: c,
            error: d
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
        await $n.openLuieProject(r.projectPath);
      } catch (o) {
        e.push(r.projectId), $.error("Failed to recover DB cache from persisted .luie package", {
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
    const t = V.getAllWindows();
    for (const e of t)
      if (!e.isDestroyed())
        try {
          e.webContents.send(k.SYNC_STATUS_CHANGED, this.status);
        } catch (r) {
          $.warn("Failed to broadcast sync status", { error: r });
        }
  }
}
const pe = new zn(), Ri = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SyncService: zn,
  syncService: pe
}, Symbol.toStringTag, { value: "Module" })), kt = x("DeepLink"), Ci = "luie://auth/callback", Ni = "luie://auth/return", Di = "luie://auth/", ne = () => {
  const n = B.getMainWindow();
  if (n) {
    n.isMinimized() && n.restore(), n.focus();
    return;
  }
  const t = B.getStartupWizardWindow();
  t && !t.isDestroyed() && (t.isMinimized() && t.restore(), t.focus());
}, je = (n) => {
  const t = V.getAllWindows();
  for (const e of t)
    if (!e.isDestroyed())
      try {
        e.webContents.send(k.SYNC_AUTH_RESULT, n);
      } catch (r) {
        kt.warn("Failed to broadcast OAuth result", { error: r });
      }
}, Li = (n) => {
  const t = n instanceof Error ? n.message : String(n);
  return t.includes("SYNC_AUTH_NO_PENDING_SESSION") ? "NO_PENDING" : t.includes("SYNC_AUTH_REQUEST_EXPIRED") ? "EXPIRED" : t.includes("SYNC_AUTH_STATE_MISMATCH") ? "STATE_MISMATCH" : "UNKNOWN";
}, Oi = (n) => n === "NO_PENDING" || n === "EXPIRED" || n === "STATE_MISMATCH", Kr = (n) => n === "NO_PENDING" ? "NO_PENDING" : n === "EXPIRED" ? "EXPIRED" : n === "STATE_MISMATCH" ? "STATE_MISMATCH" : "UNKNOWN", qe = (n) => {
  for (const t of n)
    if (typeof t == "string" && t.startsWith(Di))
      return t;
  return null;
}, Ve = async (n) => {
  if (n.startsWith(Ni))
    return ne(), kt.info("OAuth return deep link handled", { url: n }), !0;
  if (!n.startsWith(Ci))
    return !1;
  try {
    return await pe.handleOAuthCallback(n), ne(), je({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), kt.info("OAuth callback processed", { url: n }), !0;
  } catch (t) {
    const e = t instanceof Error ? t.message : String(t), r = Li(t), o = pe.getStatus();
    return o.connected && Oi(r) ? (ne(), je({
      status: "stale",
      reason: Kr(r),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), kt.warn("OAuth callback arrived after connection was already established", {
      url: n,
      reason: r,
      error: t
    }), !0) : (ne(), je({
      status: "error",
      reason: Kr(r),
      detail: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), kt.error(o.connected ? "Failed to process OAuth callback even though sync is connected" : "Failed to process OAuth callback", {
      url: n,
      reason: r,
      error: t
    }), !1);
  }
}, ot = (n, t, e) => {
  if (!(!n || n.isDestroyed()))
    try {
      n.webContents.send(k.APP_QUIT_PHASE, { phase: t, message: e });
    } catch {
    }
}, Fe = async (n, t) => n && !n.isDestroyed() ? ft.showMessageBox(n, t) : ft.showMessageBox(t), bi = (n) => {
  let t = !1;
  S.on("window-all-closed", () => {
    process.platform !== "darwin" && S.quit();
  }), S.on("before-quit", (e) => {
    t || (t = !0, e.preventDefault(), (async () => {
      n.info("App is quitting");
      const { autoSaveManager: r } = await import("./autoSaveManager-ClMJw6rl.js").then((h) => h.d), { snapshotService: o } = await import("./snapshotService-BU9Ma5Io.js").then((h) => h.a), { projectService: a } = await Promise.resolve().then(() => xn), s = B.getMainWindow();
      ot(s, "prepare", "데이터를 안전하게 정리하고 있습니다...");
      let c = !1, p = !1, d = !1;
      if (s && !s.isDestroyed() && s.webContents)
        try {
          c = await new Promise((h) => {
            const f = setTimeout(
              () => h(!1),
              So
            );
            Jr.once(k.APP_FLUSH_COMPLETE, (g, w) => {
              p = !!w?.hadQueuedAutoSaves, d = !!w?.rendererDirty, clearTimeout(f), h(!0);
            }), s.webContents.send(k.APP_BEFORE_QUIT);
          }), n.info("Renderer flush phase completed", {
            rendererFlushed: c,
            rendererHadQueued: p,
            rendererDirty: d
          });
        } catch (h) {
          n.warn("Renderer flush request failed", h);
        }
      ot(s, "mirror-durable", "크래시 대비 미러를 먼저 보존하고 있습니다...");
      try {
        const { mirrored: h } = await r.flushCritical();
        n.info("Pre-dialog mirror flush completed", { mirrored: h });
      } catch (h) {
        n.error("Pre-dialog mirror flush failed", h);
      }
      const l = r.getPendingSaveCount();
      if (l > 0 || p || d || !c)
        try {
          const h = l > 0 ? `${l}개의 변경사항이 저장되지 않았습니다.` : "저장되지 않은 변경사항이 있을 수 있습니다.", f = await Fe(s, {
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
            n.info("Quit cancelled by user"), t = !1, ot(s, "aborted", "종료가 취소되었습니다.");
            return;
          }
          if (f.response === 0) {
            n.info("User chose: save and quit");
            try {
              await Promise.race([
                r.flushAll(),
                new Promise((g) => setTimeout(g, yo))
              ]), await r.flushMirrorsToSnapshots("session-end");
            } catch (g) {
              n.error("Save during quit failed", g);
            }
          } else {
            n.info("User chose: quit without saving (mirrors already on disk)");
            try {
              await r.flushMirrorsToSnapshots("session-end-no-save");
            } catch (g) {
              n.warn("Mirror-to-snapshot conversion failed", g);
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
      ot(s, "export-flush", "프로젝트 파일(.luie)을 안전하게 저장 중입니다...");
      let m = "continue";
      if ((await a.flushPendingExports(_o)).timedOut) {
        const h = await Fe(s, {
          type: "question",
          title: "저장 지연 감지",
          message: "프로젝트 파일 저장이 지연되고 있습니다.",
          detail: "기본값은 종료 취소입니다. 계속 대기할지, 저장을 생략하고 종료할지 선택하세요.",
          buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
          defaultId: 1,
          cancelId: 1,
          noLink: !0
        });
        (h.response === 1 || h.response === 0 && (await a.flushPendingExports(wo)).timedOut && (await Fe(s, {
          type: "warning",
          title: "저장 지연 지속",
          message: "저장이 아직 완료되지 않았습니다.",
          detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
          buttons: ["종료 취소", "저장 생략 후 종료"],
          defaultId: 0,
          cancelId: 0,
          noLink: !0
        })).response === 0) && (m = "cancel");
      }
      if (m === "cancel") {
        n.info("Quit cancelled by user during export flush"), t = !1, ot(s, "aborted", "종료가 취소되었습니다.");
        return;
      }
      ot(s, "finalize", "마무리 정리 중입니다...");
      try {
        await o.pruneSnapshotsAllProjects();
      } catch (h) {
        n.warn("Snapshot pruning failed during quit", h);
      }
      try {
        const { db: h } = await Promise.resolve().then(() => wa);
        await h.disconnect();
      } catch (h) {
        n.warn("DB disconnect failed during quit", h);
      }
      ot(s, "completed", "안전하게 종료합니다."), S.exit(0);
    })().catch((r) => {
      n.error("Quit guard failed", r), t = !1;
      const o = B.getMainWindow();
      ot(o, "aborted", "종료 중 오류가 발생해 취소되었습니다.");
    }));
  }), process.on("SIGINT", () => {
    n.info("Received SIGINT"), S.quit();
  }), process.on("SIGTERM", () => {
    n.info("Received SIGTERM"), S.quit();
  }), process.on("uncaughtException", (e) => {
    n.error("Uncaught exception", e);
  }), process.on("unhandledRejection", (e) => {
    n.error("Unhandled rejection", e);
  });
}, ji = (n) => {
  if (!(process.env.E2E_DISABLE_SINGLE_INSTANCE === "1" ? !0 : S.requestSingleInstanceLock())) {
    const r = qe(process.argv);
    return n.info("Secondary instance detected; forwarding to primary instance and exiting", {
      hasCallbackUrl: !!r,
      argv: process.argv
    }), S.quit(), !1;
  }
  return S.on("second-instance", (r, o) => {
    const a = qe(o);
    n.info("Second instance event received", {
      hasCallbackUrl: !!a
    }), a && Ve(a);
    const s = B.getMainWindow();
    s && (s.isMinimized() && s.restore(), s.focus());
  }), !0;
};
process.env.NODE_ENV !== "production" && await import("./config-HSSbDImy.js").then((n) => n.c);
an({
  logToFile: !0,
  logFilePath: M.join(S.getPath("userData"), ko, Wo),
  minLevel: Je.INFO
});
const st = x("Main"), se = process.defaultApp === !0, Ke = Date.now();
st.info("Main process bootstrap", {
  execPath: process.execPath,
  argv: process.argv,
  isPackaged: S.isPackaged,
  defaultApp: se,
  startupStartedAtMs: Ke
});
const Fi = () => {
  const n = "luie";
  let t = !1;
  if (se) {
    const r = process.argv[1] ? M.resolve(process.argv[1]) : "";
    r && (t = S.setAsDefaultProtocolClient(n, process.execPath, [r]));
  } else
    t = S.setAsDefaultProtocolClient(n);
  if (!t) {
    const r = "SYNC_PROTOCOL_REGISTRATION_FAILED:luie:setAsDefaultProtocolClient returned false";
    T.getSyncSettings().connected || T.setSyncSettings({ lastError: r }), st.warn("Failed to register custom protocol for OAuth callback", {
      protocol: n,
      defaultApp: se,
      reason: r
    });
    return;
  }
  T.getSyncSettings().lastError?.startsWith("SYNC_PROTOCOL_REGISTRATION_FAILED:") && T.setSyncSettings({ lastError: void 0 }), st.info("Custom protocol registered", {
    protocol: n,
    defaultApp: se
  });
};
if (!ji(st))
  S.quit();
else {
  rs(st), ra(), S.disableHardwareAcceleration(), process.platform === "darwin" && S.on("open-url", (t, e) => {
    t.preventDefault(), Ve(e);
  }), Fi();
  const n = qe(process.argv);
  n && Ve(n), Va(st, {
    startupStartedAtMs: Ke,
    onFirstRendererReady: () => {
      const t = Date.now();
      pe.initialize(), st.info("Startup checkpoint: sync service initialized", {
        elapsedMs: Date.now() - t,
        startupElapsedMs: Date.now() - Ke
      });
    }
  }), bi(st);
}
export {
  Dc as $,
  Gc as A,
  Yc as B,
  Hc as C,
  zc as D,
  _ as E,
  pe as F,
  Wc as G,
  Bc as H,
  k as I,
  B as J,
  un as K,
  j as L,
  Yt as M,
  mc as N,
  ad as O,
  Ic as P,
  fs as Q,
  Pc as R,
  y as S,
  Lc as T,
  Es as U,
  Oc as V,
  Rc as W,
  bc as X,
  Cc as Y,
  Nc as Z,
  jc as _,
  mt as a,
  Zc as a0,
  Nn as a1,
  td as a2,
  ed as a3,
  rd as a4,
  nd as a5,
  Ds as a6,
  od as a7,
  vc as a8,
  Uc as a9,
  zt as aA,
  Ht as aB,
  Gt as aC,
  sr as aD,
  Xo as aE,
  mr as aF,
  tc as aG,
  Ec as aH,
  gc as aI,
  Ac as aJ,
  Fc as aa,
  kc as ab,
  $c as ac,
  St as ad,
  hc as ae,
  uc as af,
  tr as ag,
  ze as ah,
  ec as ai,
  Ao as aj,
  ca as ak,
  sc as al,
  dc as am,
  lc as an,
  pc as ao,
  oc as ap,
  ac as aq,
  ic as ar,
  fc as as,
  dn as at,
  cc as au,
  nc as av,
  rc as aw,
  go as ax,
  Lt as ay,
  ke as az,
  Tt as b,
  x as c,
  N as d,
  W as e,
  Bo as f,
  ds as g,
  _c as h,
  yt as i,
  lt as j,
  wc as k,
  Tc as l,
  Sc as m,
  yc as n,
  xc as o,
  $n as p,
  Xc as q,
  X as r,
  Mc as s,
  Vc as t,
  ia as u,
  Kc as v,
  Jc as w,
  qc as x,
  Qc as y,
  Pe as z
};

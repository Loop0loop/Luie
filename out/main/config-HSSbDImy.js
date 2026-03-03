import J from "fs";
import H from "path";
import z from "os";
import X from "crypto";
function Z(u, _) {
  for (var h = 0; h < _.length; h++) {
    const p = _[h];
    if (typeof p != "string" && !Array.isArray(p)) {
      for (const d in p)
        if (d !== "default" && !(d in u)) {
          const E = Object.getOwnPropertyDescriptor(p, d);
          E && Object.defineProperty(u, d, E.get ? E : {
            enumerable: !0,
            get: () => p[d]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(u, Symbol.toStringTag, { value: "Module" }));
}
var x = {}, v = { exports: {} };
const ee = "17.3.1", te = {
  version: ee
};
var A;
function re() {
  if (A) return v.exports;
  A = 1;
  const u = J, _ = H, h = z, p = X, E = te.version, N = [
    "🔐 encrypt with Dotenvx: https://dotenvx.com",
    "🔐 prevent committing .env to code: https://dotenvx.com/precommit",
    "🔐 prevent building .env in docker: https://dotenvx.com/prebuild",
    "🤖 agentic secret storage: https://dotenvx.com/as2",
    "⚡️ secrets for agents: https://dotenvx.com/as2",
    "🛡️ auth for agents: https://vestauth.com",
    "🛠️  run anywhere with `dotenvx run -- yourcommand`",
    "⚙️  specify custom .env file path with { path: '/custom/path/.env' }",
    "⚙️  enable debug logging with { debug: true }",
    "⚙️  override existing env vars with { override: true }",
    "⚙️  suppress all logs with { quiet: true }",
    "⚙️  write to custom object with { processEnv: myObject }",
    "⚙️  load multiple .env files with { path: ['.env.local', '.env'] }"
  ];
  function Y() {
    return N[Math.floor(Math.random() * N.length)];
  }
  function O(e) {
    return typeof e == "string" ? !["false", "0", "no", "off", ""].includes(e.toLowerCase()) : !!e;
  }
  function K() {
    return process.stdout.isTTY;
  }
  function k(e) {
    return K() ? `\x1B[2m${e}\x1B[0m` : e;
  }
  const U = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
  function q(e) {
    const r = {};
    let n = e.toString();
    n = n.replace(/\r\n?/mg, `
`);
    let o;
    for (; (o = U.exec(n)) != null; ) {
      const c = o[1];
      let s = o[2] || "";
      s = s.trim();
      const t = s[0];
      s = s.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), t === '"' && (s = s.replace(/\\n/g, `
`), s = s.replace(/\\r/g, "\r")), r[c] = s;
    }
    return r;
  }
  function L(e) {
    e = e || {};
    const r = b(e);
    e.path = r;
    const n = i.configDotenv(e);
    if (!n.parsed) {
      const t = new Error(`MISSING_DATA: Cannot parse ${r} for an unknown reason`);
      throw t.code = "MISSING_DATA", t;
    }
    const o = w(e).split(","), c = o.length;
    let s;
    for (let t = 0; t < c; t++)
      try {
        const a = o[t].trim(), l = B(n, a);
        s = i.decrypt(l.ciphertext, l.key);
        break;
      } catch (a) {
        if (t + 1 >= c)
          throw a;
      }
    return i.parse(s);
  }
  function P(e) {
    console.error(`[dotenv@${E}][WARN] ${e}`);
  }
  function D(e) {
    console.log(`[dotenv@${E}][DEBUG] ${e}`);
  }
  function I(e) {
    console.log(`[dotenv@${E}] ${e}`);
  }
  function w(e) {
    return e && e.DOTENV_KEY && e.DOTENV_KEY.length > 0 ? e.DOTENV_KEY : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0 ? process.env.DOTENV_KEY : "";
  }
  function B(e, r) {
    let n;
    try {
      n = new URL(r);
    } catch (a) {
      if (a.code === "ERR_INVALID_URL") {
        const l = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
        throw l.code = "INVALID_DOTENV_KEY", l;
      }
      throw a;
    }
    const o = n.password;
    if (!o) {
      const a = new Error("INVALID_DOTENV_KEY: Missing key part");
      throw a.code = "INVALID_DOTENV_KEY", a;
    }
    const c = n.searchParams.get("environment");
    if (!c) {
      const a = new Error("INVALID_DOTENV_KEY: Missing environment part");
      throw a.code = "INVALID_DOTENV_KEY", a;
    }
    const s = `DOTENV_VAULT_${c.toUpperCase()}`, t = e.parsed[s];
    if (!t) {
      const a = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${s} in your .env.vault file.`);
      throw a.code = "NOT_FOUND_DOTENV_ENVIRONMENT", a;
    }
    return { ciphertext: t, key: o };
  }
  function b(e) {
    let r = null;
    if (e && e.path && e.path.length > 0)
      if (Array.isArray(e.path))
        for (const n of e.path)
          u.existsSync(n) && (r = n.endsWith(".vault") ? n : `${n}.vault`);
      else
        r = e.path.endsWith(".vault") ? e.path : `${e.path}.vault`;
    else
      r = _.resolve(process.cwd(), ".env.vault");
    return u.existsSync(r) ? r : null;
  }
  function $(e) {
    return e[0] === "~" ? _.join(h.homedir(), e.slice(1)) : e;
  }
  function j(e) {
    const r = O(process.env.DOTENV_CONFIG_DEBUG || e && e.debug), n = O(process.env.DOTENV_CONFIG_QUIET || e && e.quiet);
    (r || !n) && I("Loading env from encrypted .env.vault");
    const o = i._parseVault(e);
    let c = process.env;
    return e && e.processEnv != null && (c = e.processEnv), i.populate(c, o, e), { parsed: o };
  }
  function M(e) {
    const r = _.resolve(process.cwd(), ".env");
    let n = "utf8", o = process.env;
    e && e.processEnv != null && (o = e.processEnv);
    let c = O(o.DOTENV_CONFIG_DEBUG || e && e.debug), s = O(o.DOTENV_CONFIG_QUIET || e && e.quiet);
    e && e.encoding ? n = e.encoding : c && D("No encoding is specified. UTF-8 is used by default");
    let t = [r];
    if (e && e.path)
      if (!Array.isArray(e.path))
        t = [$(e.path)];
      else {
        t = [];
        for (const f of e.path)
          t.push($(f));
      }
    let a;
    const l = {};
    for (const f of t)
      try {
        const g = i.parse(u.readFileSync(f, { encoding: n }));
        i.populate(l, g, e);
      } catch (g) {
        c && D(`Failed to load ${f} ${g.message}`), a = g;
      }
    const T = i.populate(o, l, e);
    if (c = O(o.DOTENV_CONFIG_DEBUG || c), s = O(o.DOTENV_CONFIG_QUIET || s), c || !s) {
      const f = Object.keys(T).length, g = [];
      for (const C of t)
        try {
          const m = _.relative(process.cwd(), C);
          g.push(m);
        } catch (m) {
          c && D(`Failed to load ${C} ${m.message}`), a = m;
        }
      I(`injecting env (${f}) from ${g.join(",")} ${k(`-- tip: ${Y()}`)}`);
    }
    return a ? { parsed: l, error: a } : { parsed: l };
  }
  function S(e) {
    if (w(e).length === 0)
      return i.configDotenv(e);
    const r = b(e);
    return r ? i._configVault(e) : (P(`You set DOTENV_KEY but you are missing a .env.vault file at ${r}. Did you forget to build it?`), i.configDotenv(e));
  }
  function Q(e, r) {
    const n = Buffer.from(r.slice(-64), "hex");
    let o = Buffer.from(e, "base64");
    const c = o.subarray(0, 12), s = o.subarray(-16);
    o = o.subarray(12, -16);
    try {
      const t = p.createDecipheriv("aes-256-gcm", n, c);
      return t.setAuthTag(s), `${t.update(o)}${t.final()}`;
    } catch (t) {
      const a = t instanceof RangeError, l = t.message === "Invalid key length", T = t.message === "Unsupported state or unable to authenticate data";
      if (a || l) {
        const f = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
        throw f.code = "INVALID_DOTENV_KEY", f;
      } else if (T) {
        const f = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
        throw f.code = "DECRYPTION_FAILED", f;
      } else
        throw t;
    }
  }
  function W(e, r, n = {}) {
    const o = !!(n && n.debug), c = !!(n && n.override), s = {};
    if (typeof r != "object") {
      const t = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
      throw t.code = "OBJECT_REQUIRED", t;
    }
    for (const t of Object.keys(r))
      Object.prototype.hasOwnProperty.call(e, t) ? (c === !0 && (e[t] = r[t], s[t] = r[t]), o && D(c === !0 ? `"${t}" is already defined and WAS overwritten` : `"${t}" is already defined and was NOT overwritten`)) : (e[t] = r[t], s[t] = r[t]);
    return s;
  }
  const i = {
    configDotenv: M,
    _configVault: j,
    _parseVault: L,
    config: S,
    decrypt: Q,
    parse: q,
    populate: W
  };
  return v.exports.configDotenv = i.configDotenv, v.exports._configVault = i._configVault, v.exports._parseVault = i._parseVault, v.exports.config = i.config, v.exports.decrypt = i.decrypt, v.exports.parse = i.parse, v.exports.populate = i.populate, v.exports = i, v.exports;
}
var V, G;
function ne() {
  if (G) return V;
  G = 1;
  const u = {};
  return process.env.DOTENV_CONFIG_ENCODING != null && (u.encoding = process.env.DOTENV_CONFIG_ENCODING), process.env.DOTENV_CONFIG_PATH != null && (u.path = process.env.DOTENV_CONFIG_PATH), process.env.DOTENV_CONFIG_QUIET != null && (u.quiet = process.env.DOTENV_CONFIG_QUIET), process.env.DOTENV_CONFIG_DEBUG != null && (u.debug = process.env.DOTENV_CONFIG_DEBUG), process.env.DOTENV_CONFIG_OVERRIDE != null && (u.override = process.env.DOTENV_CONFIG_OVERRIDE), process.env.DOTENV_CONFIG_DOTENV_KEY != null && (u.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY), V = u, V;
}
var y, F;
function oe() {
  if (F) return y;
  F = 1;
  const u = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/;
  return y = function(h) {
    const p = h.reduce(function(d, E) {
      const N = E.match(u);
      return N && (d[N[1]] = N[2]), d;
    }, {});
    return "quiet" in p || (p.quiet = "true"), p;
  }, y;
}
var R;
function se() {
  return R || (R = 1, (function() {
    re().config(
      Object.assign(
        {},
        ne(),
        oe()(process.argv)
      )
    );
  })()), x;
}
var ce = se();
const fe = /* @__PURE__ */ Z({
  __proto__: null
}, [ce]);
export {
  fe as c
};

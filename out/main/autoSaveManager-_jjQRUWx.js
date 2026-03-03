import { EventEmitter as W } from "events";
import { app as F } from "electron";
import { promises as y } from "fs";
import S from "path";
import * as L from "fs/promises";
import { c as D, d as c, p as T, S as h, E as p, a0 as Z, X as ee, a1 as te, a2 as x, a3 as R, x as re, f as ae, a4 as ne, a5 as se, i as oe, a6 as M, a7 as ie, a8 as ce, a9 as le, aa as he, ab as pe, ac as de, ad as b, ae as U, af as me, ag as ue, ah as fe } from "./index.js";
import "./config-HSSbDImy.js";
import { c as N } from "./characterService-CNN-DedU.js";
import { z as C } from "zod";
import { Type as v } from "@google/genai";
import { s as A, w as j, r as ge } from "./snapshotService-CkktZTOV.js";
const $ = D("KeywordExtractor");
class we {
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
  setKnownCharacters(e) {
    this.characterNames = new Set(e);
  }
  setKnownTerms(e) {
    this.termNames = new Set(e);
  }
  extractFromText(e) {
    const t = [], r = /* @__PURE__ */ new Set(), a = Array.from(e.matchAll(this.koreanRegex));
    for (const n of a) {
      const s = n[0], i = n.index ?? 0;
      this.shouldSkip(s) || r.has(s) || (this.characterNames.has(s) ? (t.push({
        text: s,
        position: i,
        type: "character"
      }), r.add(s)) : this.termNames.has(s) && (t.push({
        text: s,
        position: i,
        type: "term"
      }), r.add(s)));
    }
    return $.debug("Keywords extracted", {
      keywordCount: t.length,
      textLength: e.length
    }), t;
  }
  extractNewKeywords(e) {
    const t = [], r = /* @__PURE__ */ new Set(), a = Array.from(e.matchAll(this.koreanRegex));
    for (const n of a) {
      const s = n[0];
      this.shouldSkip(s) || r.has(s) || !this.characterNames.has(s) && !this.termNames.has(s) && (t.push(s), r.add(s));
    }
    return $.debug("New keywords extracted", {
      keywordCount: t.length
    }), t;
  }
  shouldSkip(e) {
    return !!(e.length < 2 || this.commonWords.has(e) || /^\d+$/.test(e));
  }
  extractNouns(e) {
    const t = [], r = /* @__PURE__ */ new Set(), a = Array.from(e.matchAll(this.koreanRegex));
    for (const n of a) {
      const s = n[0];
      this.shouldSkip(s) || r.has(s) || (t.push(s), r.add(s));
    }
    return t;
  }
  filterByFrequency(e, t = 2) {
    const r = /* @__PURE__ */ new Map();
    for (const a of e)
      r.set(a, (r.get(a) ?? 0) + 1);
    return e.filter((a) => (r.get(a) ?? 0) >= t);
  }
  reset() {
    this.characterNames.clear(), this.termNames.clear();
  }
}
const _ = new we(), g = D("TermService");
function ye(o) {
  return typeof o == "object" && o !== null && "code" in o && o.code === "P2025";
}
class Se {
  async createTerm(e) {
    try {
      g.info("Creating term", e);
      const t = await c.getClient().term.create({
        data: {
          projectId: e.projectId,
          term: e.term,
          definition: e.definition,
          category: e.category,
          order: e.order,
          firstAppearance: e.firstAppearance
        }
      });
      return g.info("Term created successfully", { termId: t.id }), T.schedulePackageExport(e.projectId, "term:create"), t;
    } catch (t) {
      throw g.error("Failed to create term", t), new h(
        p.TERM_CREATE_FAILED,
        "Failed to create term",
        { input: e },
        t
      );
    }
  }
  async getTerm(e) {
    try {
      const t = await c.getClient().term.findUnique({
        where: { id: e },
        include: {
          appearances: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
      if (!t)
        throw new h(p.TERM_NOT_FOUND, "Term not found", { id: e });
      return t;
    } catch (t) {
      throw g.error("Failed to get term", t), t;
    }
  }
  async getAllTerms(e) {
    try {
      return await c.getClient().term.findMany({
        where: { projectId: e },
        orderBy: { term: "asc" }
      });
    } catch (t) {
      throw g.error("Failed to get all terms", t), new h(
        p.DB_QUERY_FAILED,
        "Failed to get all terms",
        { projectId: e },
        t
      );
    }
  }
  async updateTerm(e) {
    try {
      const t = {};
      e.term !== void 0 && (t.term = e.term), e.definition !== void 0 && (t.definition = e.definition), e.category !== void 0 && (t.category = e.category), e.order !== void 0 && (t.order = e.order), e.firstAppearance !== void 0 && (t.firstAppearance = e.firstAppearance);
      const r = await c.getClient().term.update({
        where: { id: e.id },
        data: t
      });
      return g.info("Term updated successfully", { termId: r.id }), T.schedulePackageExport(String(r.projectId), "term:update"), r;
    } catch (t) {
      throw g.error("Failed to update term", t), ye(t) ? new h(
        p.TERM_NOT_FOUND,
        "Term not found",
        { id: e.id },
        t
      ) : new h(
        p.TERM_UPDATE_FAILED,
        "Failed to update term",
        { input: e },
        t
      );
    }
  }
  async deleteTerm(e) {
    try {
      const t = await c.getClient().term.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      }), r = t?.projectId ? String(t.projectId) : null;
      return await c.getClient().$transaction(async (a) => {
        r && await a.entityRelation.deleteMany({
          where: {
            projectId: r,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await a.term.deleteMany({ where: { id: e } });
      }), g.info("Term deleted successfully", { termId: e }), r && T.schedulePackageExport(r, "term:delete"), { success: !0 };
    } catch (t) {
      throw g.error("Failed to delete term", t), new h(
        p.TERM_DELETE_FAILED,
        "Failed to delete term",
        { id: e },
        t
      );
    }
  }
  async recordAppearance(e) {
    try {
      const t = await c.getClient().termAppearance.create({
        data: {
          termId: e.termId,
          chapterId: e.chapterId,
          position: e.position,
          context: e.context
        }
      });
      return g.info("Term appearance recorded", {
        termId: e.termId,
        chapterId: e.chapterId
      }), t;
    } catch (t) {
      throw g.error("Failed to record term appearance", t), new h(
        p.DB_QUERY_FAILED,
        "Failed to record term appearance",
        { input: e },
        t
      );
    }
  }
  async getAppearancesByChapter(e) {
    try {
      return await c.getClient().termAppearance.findMany({
        where: { chapterId: e },
        include: {
          term: !0
        },
        orderBy: { position: "asc" }
      });
    } catch (t) {
      throw g.error("Failed to get appearances by chapter", t), new h(
        p.DB_QUERY_FAILED,
        "Failed to get term appearances",
        { chapterId: e },
        t
      );
    }
  }
  async updateFirstAppearance(e, t) {
    try {
      const r = await c.getClient().term.findUnique({
        where: { id: e }
      });
      if (!r)
        throw new h(p.TERM_NOT_FOUND, "Term not found", { termId: e });
      r.firstAppearance || (await c.getClient().term.update({
        where: { id: e },
        data: { firstAppearance: t }
      }), g.info("First appearance updated", { termId: e, chapterId: t }));
    } catch (r) {
      throw g.error("Failed to update first appearance", r), new h(
        p.TERM_UPDATE_FAILED,
        "Failed to update first appearance",
        { termId: e, chapterId: t },
        r
      );
    }
  }
  async searchTerms(e, t) {
    try {
      return await c.getClient().term.findMany({
        where: {
          projectId: e,
          OR: [{ term: { contains: t } }, { definition: { contains: t } }]
        },
        orderBy: { term: "asc" }
      });
    } catch (r) {
      throw g.error("Failed to search terms", r), new h(
        p.SEARCH_QUERY_FAILED,
        "Failed to search terms",
        { projectId: e, query: t },
        r
      );
    }
  }
  async getTermsByCategory(e, t) {
    try {
      return await c.getClient().term.findMany({
        where: {
          projectId: e,
          category: t
        },
        orderBy: { term: "asc" }
      });
    } catch (r) {
      throw g.error("Failed to get terms by category", r), new h(
        p.DB_QUERY_FAILED,
        "Failed to get terms by category",
        { projectId: e, category: t },
        r
      );
    }
  }
}
const O = new Se(), k = D("GeminiProxyClient"), z = (o, e) => {
  const t = new Error(e);
  return t.status = o, t;
}, Ae = (o) => {
  const e = process.env.LUIE_GEMINI_PROXY_URL?.trim();
  return e && e.length > 0 ? e : `${o.url}/functions/v1/gemini-proxy`;
}, q = (o) => {
  if (typeof o == "string") {
    const e = o.trim();
    return e.length > 0 ? e : null;
  }
  return null;
}, V = (o) => {
  if (!Array.isArray(o))
    return null;
  const e = o[0];
  if (!e || typeof e != "object") return null;
  const t = e.content;
  if (!t || typeof t != "object") return null;
  const r = t.parts;
  if (!Array.isArray(r)) return null;
  const a = r.map(
    (n) => n && typeof n == "object" ? q(n.text) : null
  ).filter((n) => !!n);
  return a.length === 0 ? null : a.join(`
`).trim();
}, Ee = () => {
  const o = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GCP_API,
    process.env.GOOGLE_API_KEY
  ];
  for (const e of o) {
    if (typeof e != "string") continue;
    const t = e.trim();
    if (t.length > 0) return t;
  }
  return null;
}, Te = async (o, e) => {
  const t = await ee.getEdgeAccessToken(), r = Ae(e), a = await fetch(r, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: e.anonKey,
      Authorization: `Bearer ${t}`
    },
    body: JSON.stringify(o)
  });
  if (!a.ok) {
    const i = await a.text();
    throw k.warn("gemini-proxy request failed", {
      endpoint: r,
      status: a.status,
      body: i
    }), z(a.status, `GEMINI_PROXY_FAILED:${a.status}:${i}`);
  }
  const n = await a.json(), s = q(n.text) ?? V(n.candidates);
  if (!s)
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  return s;
}, Ce = async (o, e) => {
  const t = {};
  o.responseMimeType && (t.responseMimeType = o.responseMimeType), o.responseSchema && (t.responseSchema = o.responseSchema), typeof o.temperature == "number" && (t.temperature = o.temperature), typeof o.topP == "number" && (t.topP = o.topP), typeof o.topK == "number" && (t.topK = o.topK), typeof o.maxOutputTokens == "number" && (t.maxOutputTokens = o.maxOutputTokens);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      o.model
    )}:generateContent?key=${encodeURIComponent(e)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: o.prompt }] }],
        generationConfig: t
      })
    }
  ), a = await r.text();
  let n = null;
  try {
    n = JSON.parse(a);
  } catch {
    n = null;
  }
  if (!r.ok)
    throw z(
      r.status,
      `GEMINI_LOCAL_FAILED:${r.status}:${a}`
    );
  const s = V(
    n && typeof n == "object" ? n.candidates : null
  );
  if (!s)
    throw new Error("GEMINI_LOCAL_EMPTY_RESPONSE");
  return s;
}, ve = async (o) => {
  const e = Z(), t = Ee(), r = [];
  if (e)
    try {
      return await Te(o, e);
    } catch (a) {
      const n = a instanceof Error ? a.message : String(a);
      r.push(`edge:${n}`), k.warn("Edge Gemini path failed; falling back to local path", {
        message: n
      });
    }
  else
    r.push("edge:SUPABASE_NOT_CONFIGURED");
  if (t)
    try {
      return await Ce(o, t);
    } catch (a) {
      const n = a instanceof Error ? a.message : String(a);
      r.push(`local:${n}`), k.warn("Local Gemini path failed", { message: n });
    }
  else
    r.push("local:GEMINI_LOCAL_API_KEY_MISSING");
  throw new Error(`GEMINI_ALL_PATHS_FAILED:${r.join("|")}`);
}, J = (o) => o.replace(/\s+/g, " ").trim(), _e = (o, e = "본문 발췌") => {
  const t = J(o);
  return t ? t.slice(0, Math.min(120, t.length)) : e;
}, Ie = (o, e) => {
  const t = J(o);
  if (!t) return e;
  const r = Math.min(t.length - 1, e.length + 1);
  if (r <= 0 || r >= t.length) return e;
  const a = t.slice(r, Math.min(t.length, r + 120)).trim();
  return a.length > 0 ? a : e;
}, ze = (o) => {
  const e = o.manuscript.content, t = _e(e), r = Ie(e, t);
  return [
    {
      type: "intro",
      content: "지금은 AI 연결이 불안정하여 로컬 분석 모드로 요약했습니다. 핵심 흐름과 독자 체감 기준으로 빠르게 점검해드릴게요."
    },
    {
      type: "reaction",
      content: "이 구간은 장면 전환의 템포가 빠르게 이어져 몰입감이 유지됩니다. 특히 인용 구간이 분위기를 선명하게 잡아줍니다.",
      quote: t,
      contextId: "local-fallback-reaction"
    },
    {
      type: "suggestion",
      content: "핵심 정보가 연속으로 배치되어 독자가 한 번에 받아들이기 어려울 수 있습니다. 문단 경계나 연결 문장을 짧게 보강해 보세요.",
      quote: t,
      contextId: "local-fallback-suggestion-1"
    },
    {
      type: "suggestion",
      content: "다음 장면으로 넘어가기 전에 인물의 의도나 감정 변화를 한 줄 더 명시하면 흐름의 개연성이 더 또렷해집니다.",
      quote: r,
      contextId: "local-fallback-suggestion-2"
    },
    {
      type: "outro",
      content: "로컬 분석 기준으로는 전체 흐름이 안정적입니다. 위 두 지점을 다듬으면 독자 체감 완성도가 더 올라갈 수 있습니다."
    }
  ];
}, De = (o, e) => {
  const t = `${o} ${e.join(" ")}`;
  return /(길드|협회|조직|단체|학교|대학|회사|연맹)/.test(t) ? "organization" : /(성|탑|궁|마을|도시|숲|산|강|거리|던전)/.test(t) ? "location" : /(검|창|방패|반지|목걸이|무기|유물|artifact|아이템)/i.test(t) ? "item" : /(님|씨|군|양|왕|황제|공주|기사|마법사|선생|대장)/.test(t) ? "character" : "concept";
}, G = (o, e) => {
  const t = De(o, e), r = e.length >= 3 ? "main" : e.length >= 2 ? "supporting" : "minor";
  return {
    name: o,
    entityType: t,
    importance: r,
    summary: `${o}와(과) 관련된 ${t} 요소로 추정됩니다. 문맥 기반 로컬 분류 결과입니다.`,
    confidence: e.length >= 2 ? 0.58 : 0.42,
    reasoning: "Edge/원격 모델 호출 실패로 로컬 규칙 기반 추정치를 사용했습니다."
  };
}, Pe = C.object({
  name: C.string(),
  entityType: C.enum(["character", "location", "organization", "item", "concept"]),
  importance: C.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: C.string(),
  confidence: C.number().min(0).max(1).default(0.5),
  reasoning: C.string().optional()
}), Me = `
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
`.trim(), Fe = {
  type: v.OBJECT,
  properties: {
    name: { type: v.STRING },
    entityType: {
      type: v.STRING,
      enum: ["character", "location", "organization", "item", "concept"]
    },
    importance: {
      type: v.STRING,
      enum: ["main", "supporting", "minor", "unknown"]
    },
    summary: { type: v.STRING },
    confidence: { type: v.NUMBER },
    reasoning: { type: v.STRING }
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
}, P = D("AutoExtractService"), Ne = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
class Oe {
  timers = /* @__PURE__ */ new Map();
  paragraphCache = /* @__PURE__ */ new Map();
  scheduleAnalysis(e, t, r) {
    const a = `${t}:${e}`, n = this.timers.get(a);
    n && clearTimeout(n);
    const s = setTimeout(() => {
      this.analyzeChapter(e, t, r).catch((i) => {
        P.error("Auto extraction failed", { chapterId: e, projectId: t, error: i });
      });
    }, te);
    this.timers.set(a, s);
  }
  splitParagraphs(e) {
    return e.split(/\n{2,}/g).map((t) => t.trim()).filter(Boolean);
  }
  getDirtyParagraphs(e, t) {
    const r = this.splitParagraphs(t), a = this.paragraphCache.get(e) ?? [];
    if (this.paragraphCache.set(e, r), a.length === 0)
      return r;
    const n = [], s = Math.max(a.length, r.length);
    for (let i = 0; i < s; i += 1)
      a[i] !== r[i] && r[i] && n.push(r[i]);
    return n;
  }
  async analyzeChapter(e, t, r) {
    const a = this.getDirtyParagraphs(e, r);
    if (a.length === 0)
      return;
    const [n, s] = await Promise.all([
      c.getClient().character.findMany({
        where: { projectId: t },
        select: { id: !0, name: !0, description: !0 }
      }),
      c.getClient().term.findMany({
        where: { projectId: t },
        select: { id: !0, term: !0, definition: !0, category: !0 }
      })
    ]);
    _.setKnownCharacters(n.map((u) => u.name)), _.setKnownTerms(s.map((u) => u.term));
    const i = a.flatMap((u) => _.extractNouns(u)), l = _.filterByFrequency(i, 2).filter((u) => !n.some((w) => w.name === u)).filter((u) => !s.some((w) => w.term === u)), m = Array.from(new Set(l)).slice(0, 10);
    if (m.length !== 0) {
      for (const u of m) {
        const w = a.filter((X) => X.includes(u)).slice(0, 3), E = await this.classifyWithGemini(u, w);
        E && (E.entityType === "character" ? await N.createCharacter({
          projectId: t,
          name: E.name,
          description: E.summary,
          attributes: {
            importance: E.importance,
            confidence: E.confidence,
            source: "auto-extract"
          }
        }) : await O.createTerm({
          projectId: t,
          term: E.name,
          definition: E.summary,
          category: E.entityType
        }));
      }
      P.info("Auto extraction completed", {
        projectId: t,
        chapterId: e,
        candidateCount: m.length
      });
    }
  }
  async classifyWithGemini(e, t) {
    const r = t.map((n, s) => `문맥 ${s + 1}: ${n}`).join(`
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

${Me}

---

이제 아래 문맥에서 "${e}"를 분석하세요.

${r}

[고유명사]: ${e}

JSON 형식으로만 답하세요:`;
    try {
      const n = await ve({
        model: Ne,
        prompt: a,
        responseMimeType: "application/json",
        responseSchema: Fe
      }), s = Pe.safeParse(JSON.parse(n));
      return s.success ? s.data : (P.warn("Gemini response parse failed", s.error), G(e, t));
    } catch (n) {
      return P.warn("Gemini classification failed; using local deterministic fallback", {
        error: n
      }), G(e, t);
    }
  }
}
const ke = new Oe(), H = D("ChapterKeywords");
async function Le(o, e, t) {
  try {
    const r = await c.getClient().character.findMany({
      where: { projectId: t },
      select: { id: !0, name: !0 }
    }), a = await c.getClient().term.findMany({
      where: { projectId: t },
      select: { id: !0, term: !0 }
    }), n = r.map((l) => l.name), s = a.map((l) => l.term);
    _.setKnownCharacters(n), _.setKnownTerms(s);
    const i = _.extractFromText(e);
    for (const l of i.filter((m) => m.type === "character")) {
      const m = r.find((u) => u.name === l.text);
      m && (await N.recordAppearance({
        characterId: String(m.id),
        chapterId: o,
        position: l.position,
        context: B(e, l.position, x)
      }), await N.updateFirstAppearance(String(m.id), o));
    }
    for (const l of i.filter((m) => m.type === "term")) {
      const m = a.find((u) => u.term === l.text);
      m && (await O.recordAppearance({
        termId: String(m.id),
        chapterId: o,
        position: l.position,
        context: B(e, l.position, x)
      }), await O.updateFirstAppearance(String(m.id), o));
    }
    H.info("Keyword tracking completed", {
      chapterId: o,
      characterCount: i.filter((l) => l.type === "character").length,
      termCount: i.filter((l) => l.type === "term").length
    });
  } catch (r) {
    H.error("Failed to track keyword appearances", r);
  }
}
function B(o, e, t) {
  const r = Math.max(0, e - t), a = Math.min(o.length, e + t);
  return o.substring(r, a);
}
const f = D("ChapterService");
function K(o) {
  return typeof o == "object" && o !== null && "code" in o && o.code === "P2025";
}
class xe {
  async resolveProjectTitle(e) {
    if (!e) return "Unknown";
    const t = await c.getClient().project.findUnique({
      where: { id: e },
      select: { title: !0 }
    });
    return typeof t?.title == "string" ? String(t.title) : "Unknown";
  }
  async writeSuspiciousContentDump(e) {
    if (R()) return;
    const t = await this.resolveProjectTitle(e.projectId), r = re(t, "Unknown"), a = S.join(
      F.getPath("userData"),
      ae,
      r || "Unknown",
      "_suspicious"
    );
    await L.mkdir(a, { recursive: !0 });
    const n = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), s = S.join(a, `${e.filePrefix}-${e.chapterId}-${n}.txt`);
    return await L.writeFile(s, e.content, "utf8"), s;
  }
  async applyContentUpdate(e, t, r) {
    if (e.content === void 0) return;
    const a = typeof t?.content == "string" ? t.content : "", n = a.length, s = e.content.length, i = typeof t?.projectId == "string" ? t.projectId : void 0;
    if (n > 0 && s === 0) {
      const l = await this.writeSuspiciousContentDump({
        projectId: i,
        chapterId: e.id,
        filePrefix: "dump-empty",
        content: a
      });
      throw f.warn("Empty content save blocked.", { chapterId: e.id, oldLen: n, dumpPath: l }), new h(
        p.VALIDATION_FAILED,
        "Empty content save blocked",
        { chapterId: e.id, oldLen: n }
      );
    }
    if (!R() && n > 1e3 && s < n * 0.1) {
      const l = await this.writeSuspiciousContentDump({
        projectId: i,
        chapterId: e.id,
        filePrefix: "dump",
        content: e.content
      });
      throw f.warn("Suspicious large deletion detected. Save blocked.", {
        chapterId: e.id,
        oldLen: n,
        newLen: s,
        dumpPath: l
      }), new h(
        p.VALIDATION_FAILED,
        "Suspicious large deletion detected; save blocked",
        { chapterId: e.id, oldLen: n, newLen: s }
      );
    }
    r.content = e.content, r.wordCount = e.content.length, i && (await Le(e.id, e.content, i), ke.scheduleAnalysis(e.id, i, e.content));
  }
  async createChapter(e) {
    try {
      if (!e.title || e.title.trim().length === 0)
        throw new h(
          p.REQUIRED_FIELD_MISSING,
          "Chapter title is required",
          { input: e }
        );
      f.info("Creating chapter", e);
      const t = await c.getClient().chapter.findFirst({
        where: { projectId: e.projectId, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: !0 }
      }), r = typeof t?.order == "number" ? t.order : 0, a = e.order ?? r + 1, n = await c.getClient().chapter.create({
        data: {
          projectId: e.projectId,
          title: e.title,
          synopsis: e.synopsis,
          order: a,
          content: ""
        }
      });
      return f.info("Chapter created successfully", { chapterId: n.id }), T.schedulePackageExport(e.projectId, "chapter:create"), n;
    } catch (t) {
      throw f.error("Failed to create chapter", t), t instanceof h ? t : new h(
        p.CHAPTER_CREATE_FAILED,
        "Failed to create chapter",
        { input: e },
        t
      );
    }
  }
  async getChapter(e) {
    try {
      const t = await c.getClient().chapter.findFirst({
        where: { id: e, deletedAt: null }
      });
      if (!t)
        throw new h(
          p.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw f.error("Failed to get chapter", t), t;
    }
  }
  async getAllChapters(e) {
    try {
      return await c.getClient().chapter.findMany({
        where: { projectId: e, deletedAt: null },
        orderBy: { order: "asc" }
      });
    } catch (t) {
      throw f.error("Failed to get all chapters", t), new h(
        p.DB_QUERY_FAILED,
        "Failed to get all chapters",
        { projectId: e },
        t
      );
    }
  }
  async updateChapter(e) {
    try {
      const t = await c.getClient().chapter.findUnique({
        where: { id: e.id },
        select: { projectId: !0, content: !0, deletedAt: !0 }
      });
      if (t?.deletedAt)
        throw new h(
          p.VALIDATION_FAILED,
          "Cannot update a deleted chapter",
          { id: e.id }
        );
      const r = {};
      e.title !== void 0 && (r.title = e.title), await this.applyContentUpdate(
        e,
        t,
        r
      ), e.synopsis !== void 0 && (r.synopsis = e.synopsis);
      const a = await c.getClient().chapter.update({
        where: { id: e.id },
        data: r
      });
      return f.info("Chapter updated successfully", {
        chapterId: a.id
      }), T.schedulePackageExport(
        String(a.projectId),
        "chapter:update"
      ), a;
    } catch (t) {
      throw f.error("Failed to update chapter", t), t instanceof h ? t : K(t) ? new h(
        p.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: e.id },
        t
      ) : new h(
        p.CHAPTER_UPDATE_FAILED,
        "Failed to update chapter",
        { input: e },
        t
      );
    }
  }
  async deleteChapter(e) {
    try {
      const t = await c.getClient().chapter.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      }), r = await c.getClient().chapter.update({
        where: { id: e },
        data: { deletedAt: /* @__PURE__ */ new Date() }
      });
      if (t?.projectId) {
        const { autoSaveManager: a } = await Promise.resolve().then(() => Y);
        await a.forgetChapter(
          String(t.projectId),
          e
        );
      }
      return f.info("Chapter soft-deleted successfully", { chapterId: e }), t?.projectId && T.schedulePackageExport(
        String(t.projectId),
        "chapter:delete"
      ), r;
    } catch (t) {
      throw f.error("Failed to delete chapter", t), new h(
        p.CHAPTER_DELETE_FAILED,
        "Failed to delete chapter",
        { id: e },
        t
      );
    }
  }
  async getDeletedChapters(e) {
    try {
      return await c.getClient().chapter.findMany({
        where: { projectId: e, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    } catch (t) {
      throw f.error("Failed to get deleted chapters", t), new h(
        p.DB_QUERY_FAILED,
        "Failed to get deleted chapters",
        { projectId: e },
        t
      );
    }
  }
  async restoreChapter(e) {
    try {
      const t = await c.getClient().chapter.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      });
      if (!t?.projectId)
        throw new h(
          p.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: e }
        );
      const r = await c.getClient().chapter.update({
        where: { id: e },
        data: {
          deletedAt: null
        }
      });
      return f.info("Chapter restored successfully", { chapterId: e }), T.schedulePackageExport(String(t.projectId), "chapter:restore"), r;
    } catch (t) {
      throw f.error("Failed to restore chapter", t), K(t) ? new h(
        p.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: e },
        t
      ) : new h(
        p.CHAPTER_UPDATE_FAILED,
        "Failed to restore chapter",
        { id: e },
        t
      );
    }
  }
  async purgeChapter(e) {
    try {
      const t = await c.getClient().chapter.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      });
      if (await c.getClient().chapter.delete({ where: { id: e } }), t?.projectId) {
        const { autoSaveManager: r } = await Promise.resolve().then(() => Y);
        await r.forgetChapter(
          String(t.projectId),
          e
        );
      }
      return f.info("Chapter purged successfully", { chapterId: e }), t?.projectId && T.schedulePackageExport(
        String(t.projectId),
        "chapter:purge"
      ), { success: !0 };
    } catch (t) {
      throw f.error("Failed to purge chapter", t), new h(
        p.CHAPTER_DELETE_FAILED,
        "Failed to purge chapter",
        { id: e },
        t
      );
    }
  }
  async reorderChapters(e, t) {
    try {
      return await c.getClient().$transaction(
        t.map(
          (r, a) => c.getClient().chapter.update({
            where: { id: r },
            data: { order: a + 1 }
          })
        )
      ), f.info("Chapters reordered successfully", { projectId: e }), T.schedulePackageExport(e, "chapter:reorder"), { success: !0 };
    } catch (r) {
      throw f.error("Failed to reorder chapters", r), new h(
        p.DB_TRANSACTION_FAILED,
        "Failed to reorder chapters",
        { projectId: e },
        r
      );
    }
  }
}
const Q = new xe(), d = D("AutoSaveManager");
class I extends W {
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
  constructor() {
    super(), this.on("error", (e) => {
      d.warn("Auto-save error event", e);
    }), this.startCleanupInterval();
  }
  static getInstance() {
    return I.instance || (I.instance = new I()), I.instance;
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
  async forgetChapter(e, t) {
    const r = this.saveTimers.get(t);
    r && (clearTimeout(r), this.saveTimers.delete(t)), this.pendingSaves.delete(t), this.lastSaveAt.delete(t);
    const a = `${e}:${t}`;
    this.lastSnapshotAt.delete(a), this.lastSnapshotHash.delete(a), this.lastSnapshotLength.delete(a), this.lastEmergencySnapshotAt.delete(a), this.snapshotQueue = this.snapshotQueue.filter(
      (n) => !(n.projectId === e && n.chapterId === t)
    );
    try {
      const n = this.getMirrorBaseDir(e, t);
      await y.rm(n, { recursive: !0, force: !0 });
    } catch (n) {
      d.warn("Failed to purge chapter mirrors", { projectId: e, chapterId: t, error: n });
    }
  }
  setConfig(e, t) {
    this.configs.set(e, t), t.enabled ? (this.startAutoSave(e), this.startSnapshotSchedule(e)) : this.stopAutoSave(e);
  }
  getConfig(e) {
    return this.configs.get(e) || {
      enabled: !0,
      interval: se,
      debounceMs: ne
    };
  }
  // ─── Trigger Save (entry point from IPC) ─────────────────────────────────
  async triggerSave(e, t, r) {
    const a = this.getConfig(r);
    if (!a.enabled)
      return;
    const n = await c.getClient().chapter.findUnique({
      where: { id: e },
      select: { projectId: !0, deletedAt: !0 }
    });
    if (!n || String(n.projectId) !== r || n.deletedAt) {
      d.info("Skipping auto-save for missing/deleted chapter", {
        chapterId: e,
        projectId: r
      });
      return;
    }
    this.pendingSaves.set(e, { chapterId: e, content: t, projectId: r }), this.lastSaveAt.set(e, Date.now()), await this.writeLatestMirror(r, e, t), this.maybeCreateEmergencySnapshot(r, e, t);
    const s = this.saveTimers.get(e);
    s && clearTimeout(s);
    const i = setTimeout(async () => {
      await this.performSave(e);
    }, a.debounceMs);
    this.saveTimers.set(e, i);
  }
  // ─── Core Save Logic ─────────────────────────────────────────────────────
  async performSave(e) {
    const t = this.pendingSaves.get(e);
    if (t)
      try {
        await Q.updateChapter({
          id: t.chapterId,
          content: t.content
        }), this.pendingSaves.delete(e), this.saveTimers.delete(e), this.lastSaveAt.delete(e), this.emit("saved", { chapterId: e }), await this.writeLatestMirror(t.projectId, t.chapterId, t.content), this.maybeEnqueueSnapshot(t.projectId, t.chapterId, t.content), d.info("Auto-save completed", { chapterId: e });
      } catch (r) {
        if (oe(r) && r.code === p.VALIDATION_FAILED) {
          d.warn("Auto-save blocked by validation; writing safety snapshot", {
            chapterId: e,
            error: r
          });
          try {
            await this.writeLatestMirror(t.projectId, t.chapterId, t.content), await this.writeTimestampedMirror(t.projectId, t.chapterId, t.content), await A.createSnapshot({
              projectId: t.projectId,
              chapterId: t.chapterId,
              content: t.content,
              description: `Safety snapshot (블로킹된 저장) ${(/* @__PURE__ */ new Date()).toLocaleString()}`
            });
          } catch (a) {
            d.error("Failed to write safety snapshot after validation block", a);
          }
          this.pendingSaves.delete(e), this.saveTimers.delete(e), this.lastSaveAt.delete(e), this.emit("save-blocked", { chapterId: e, error: r });
          return;
        }
        d.error("Auto-save failed", r), this.listenerCount("error") > 0 && this.emit("error", { chapterId: e, error: r });
      }
  }
  // ─── Snapshot Scheduling (Time Machine style) ────────────────────────────
  maybeEnqueueSnapshot(e, t, r) {
    const a = `${e}:${t}`, n = Date.now(), s = this.lastSnapshotAt.get(a) ?? 0;
    if (n - s < M || r.length < ie) return;
    const i = this.hashContent(r);
    if (this.lastSnapshotHash.get(a) === i) return;
    const m = this.lastSnapshotLength.get(a) ?? 0;
    if (m > 0) {
      const u = Math.abs(r.length - m);
      if (u / m < ce && u < le) return;
    }
    this.lastSnapshotAt.set(a, n), this.lastSnapshotHash.set(a, i), this.lastSnapshotLength.set(a, r.length), this.snapshotQueue.push({ projectId: e, chapterId: t, content: r }), this.snapshotProcessing || (this.snapshotProcessing = !0, setImmediate(() => {
      this.processSnapshotQueue();
    }));
  }
  /**
   * Emergency micro snapshot for very short content (≤ EMERGENCY_SNAPSHOT_MAX_LENGTH chars).
   * Runs on a shorter interval than normal snapshots to ensure even tiny
   * amounts of text are captured.
   */
  async maybeCreateEmergencySnapshot(e, t, r) {
    if (r.length > he) return;
    const a = `${e}:${t}`, n = Date.now(), s = this.lastEmergencySnapshotAt.get(a) ?? 0;
    if (!(n - s < pe)) {
      this.lastEmergencySnapshotAt.set(a, n);
      try {
        await A.createSnapshot({
          projectId: e,
          chapterId: t,
          content: r,
          description: `긴급 마이크로 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        }), await this.writeTimestampedMirror(e, t, r);
      } catch (i) {
        d.warn("Failed to create emergency micro snapshot", { error: i, chapterId: t });
      }
    }
  }
  async processSnapshotQueue() {
    for (; this.snapshotQueue.length > 0; ) {
      const e = this.snapshotQueue.shift();
      if (e)
        try {
          await A.createSnapshot({
            projectId: e.projectId,
            chapterId: e.chapterId,
            content: e.content,
            description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
          }), await A.deleteOldSnapshots(e.projectId, de), await this.writeTimestampedMirror(e.projectId, e.chapterId, e.content);
        } catch (t) {
          d.error("Failed to create snapshot", t);
        }
    }
    this.snapshotProcessing = !1;
  }
  enqueueProjectTask(e, t) {
    const n = (this.projectTaskQueue.get(e) ?? Promise.resolve()).catch(() => {
    }).then(t).finally(() => {
      this.projectTaskQueue.get(e) === n && this.projectTaskQueue.delete(e);
    });
    return this.projectTaskQueue.set(e, n), n;
  }
  // ─── Mirror File I/O ─────────────────────────────────────────────────────
  getMirrorBaseDir(e, t) {
    return S.join(
      F.getPath("userData"),
      b,
      e,
      t
    );
  }
  /**
   * Write `latest.snap` – always reflects the most recent content.
   * This is the primary crash-safety mirror read at startup.
   */
  async writeLatestMirror(e, t, r) {
    try {
      const a = this.getMirrorBaseDir(e, t);
      await y.mkdir(a, { recursive: !0 });
      const n = S.join(a, "latest.snap"), s = JSON.stringify(
        { projectId: e, chapterId: t, content: r, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await j(n, s);
    } catch (a) {
      d.error("Failed to write latest mirror", a);
    }
  }
  /**
   * Write timestamped `.snap` file for point-in-time recovery.
   * Old files are pruned to SNAPSHOT_FILE_KEEP_COUNT.
   */
  async writeTimestampedMirror(e, t, r) {
    try {
      const a = this.getMirrorBaseDir(e, t);
      await y.mkdir(a, { recursive: !0 });
      const n = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), s = S.join(a, `${n}.snap`), i = JSON.stringify(
        { projectId: e, chapterId: t, content: r, createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await j(s, i);
      const l = (await y.readdir(a)).filter(
        (m) => m.endsWith(".snap") && m !== "latest.snap"
      );
      if (l.length > U) {
        const u = l.sort().slice(0, l.length - U);
        await Promise.all(
          u.map((w) => y.unlink(S.join(a, w)).catch(() => {
          }))
        );
      }
    } catch (a) {
      d.error("Failed to write timestamped mirror", a);
    }
  }
  // ─── Mirror Recovery (startup / shutdown) ─────────────────────────────────
  async listLatestMirrorFiles() {
    const e = S.join(F.getPath("userData"), b), t = [];
    try {
      const r = await y.readdir(e, { withFileTypes: !0 });
      for (const a of r) {
        if (!a.isDirectory() || a.name === "_emergency") continue;
        const n = S.join(e, a.name), s = await y.readdir(n, { withFileTypes: !0 });
        for (const i of s) {
          if (!i.isDirectory()) continue;
          const l = S.join(n, i.name, "latest.snap");
          try {
            await y.stat(l), t.push(l);
          } catch {
          }
        }
      }
    } catch (r) {
      if (r?.code === "ENOENT")
        return t;
      d.warn("Failed to list mirror files", r);
    }
    return t;
  }
  async readMirrorPayload(e) {
    try {
      const t = await ge(e), r = JSON.parse(t);
      return typeof r.projectId != "string" || typeof r.chapterId != "string" ? null : {
        projectId: r.projectId,
        chapterId: r.chapterId,
        content: typeof r.content == "string" ? r.content : "",
        updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : null
      };
    } catch (t) {
      return d.warn("Failed to read mirror payload", { filePath: e, error: t }), null;
    }
  }
  /**
   * Convert on-disk mirror files to DB snapshots.
   *
   * - Validates that the chapter still exists in DB (FK safety).
   * - Skips mirrors older than the latest DB snapshot.
   * - Deletes stale mirror files for missing chapters (disk cleanup).
   */
  async flushMirrorsToSnapshots(e) {
    const t = await this.listLatestMirrorFiles();
    let r = 0, a = 0;
    for (const n of t)
      try {
        const s = await this.readMirrorPayload(n);
        if (!s) continue;
        const i = await c.getClient().chapter.findUnique({
          where: { id: s.chapterId },
          select: { id: !0, projectId: !0, deletedAt: !0 }
        });
        if (!i) {
          d.warn("Mirror snapshot skipped (missing chapter), cleaning up stale mirror", {
            chapterId: s.chapterId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        const l = i.deletedAt;
        if (l != null) {
          d.info("Mirror snapshot skipped (chapter deleted), cleaning up", {
            chapterId: s.chapterId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        if (String(i.projectId) !== s.projectId) {
          d.warn("Mirror snapshot skipped (project mismatch), cleaning up", {
            chapterId: s.chapterId,
            projectId: s.projectId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        const m = await A.getLatestSnapshot(s.chapterId), u = m?.createdAt ? new Date(String(m.createdAt)).getTime() : 0, w = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
        if (w && w <= u)
          continue;
        await A.createSnapshot({
          projectId: s.projectId,
          chapterId: s.chapterId,
          content: s.content,
          description: `미러 복구 스냅샷 (${e}) ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
          type: "AUTO"
        }), r += 1;
      } catch (s) {
        d.warn("Failed to flush mirror snapshot", { error: s, filePath: n });
      }
    return d.info("Mirror snapshot flush completed", { created: r, cleaned: a, reason: e }), { created: r, cleaned: a };
  }
  /**
   * Remove stale mirror directory (for deleted chapters).
   * Deletes all .snap files and the directory itself.
   */
  async cleanStaleMirrorDir(e) {
    try {
      const t = S.dirname(e), r = await y.readdir(t);
      await Promise.all(
        r.map((a) => y.unlink(S.join(t, a)).catch(() => {
        }))
      ), await y.rmdir(t).catch(() => {
      });
    } catch (t) {
      d.warn("Failed to clean stale mirror directory", { mirrorFilePath: e, error: t });
    }
  }
  // ─── Auto Save Scheduling ────────────────────────────────────────────────
  startAutoSave(e) {
    const t = this.getConfig(e);
    if (!t.enabled) return;
    const r = this.intervalTimers.get(e);
    r && clearInterval(r);
    const a = setInterval(() => {
      this.enqueueProjectTask(e, async () => {
        const n = Array.from(this.pendingSaves.entries()).filter(
          ([, s]) => s.projectId === e
        );
        for (const [s] of n)
          await this.performSave(s);
      });
    }, t.interval);
    this.intervalTimers.set(e, a), d.info("Auto-save started", { projectId: e, interval: t.interval });
  }
  stopAutoSave(e) {
    const t = this.intervalTimers.get(e);
    t && (clearInterval(t), this.intervalTimers.delete(e), d.info("Auto-save stopped", { projectId: e }));
    const r = this.snapshotTimers.get(e);
    r && (clearInterval(r), this.snapshotTimers.delete(e), d.info("Snapshot schedule stopped", { projectId: e }));
  }
  startSnapshotSchedule(e) {
    const t = this.snapshotTimers.get(e);
    t && clearInterval(t), this.enqueueProjectTask(e, async () => {
      await this.createSnapshot(e);
    });
    const r = setInterval(() => {
      this.enqueueProjectTask(e, async () => {
        await this.createSnapshot(e);
      });
    }, M);
    this.snapshotTimers.set(e, r), d.info("Snapshot schedule started", {
      projectId: e,
      interval: M
    });
  }
  async createSnapshot(e, t) {
    try {
      if (t) {
        const a = await Q.getChapter(t);
        await A.createSnapshot({
          projectId: e,
          chapterId: String(a.id ?? t),
          content: String(a.content ?? ""),
          description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        });
      } else
        await A.createSnapshot({
          projectId: e,
          content: JSON.stringify({ timestamp: Date.now() }),
          description: `프로젝트 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        });
      await A.deleteOldSnapshots(e, me), d.info("Snapshot created", { projectId: e, chapterId: t });
    } catch (r) {
      d.error("Failed to create snapshot", r);
    }
  }
  // ─── Flush (quit / critical) ──────────────────────────────────────────────
  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    const e = Array.from(
      new Set(Array.from(this.pendingSaves.values()).map((t) => t.projectId))
    );
    for (const t of e)
      await this.enqueueProjectTask(t, async () => {
        const r = Array.from(this.pendingSaves.entries()).filter(
          ([, a]) => a.projectId === t
        );
        for (const [a] of r)
          await this.performSave(a);
      });
  }
  /**
   * Emergency flush: write mirrors + snapshots for all pending content.
   * Called when time is critical (app crashing, OS killing process).
   * Returns counts for diagnostics.
   */
  async flushCritical() {
    if (this.criticalFlushPromise)
      return this.criticalFlushPromise;
    this.criticalFlushPromise = (async () => {
      const e = Array.from(this.pendingSaves.values());
      if (e.length === 0)
        return { mirrored: 0, snapshots: 0 };
      let t = 0, r = 0;
      for (const a of e)
        try {
          await this.writeLatestMirror(a.projectId, a.chapterId, a.content), t += 1;
        } catch (n) {
          d.error("Emergency mirror write failed", n);
        }
      for (const a of e)
        try {
          await A.createSnapshot({
            projectId: a.projectId,
            chapterId: a.chapterId,
            content: a.content,
            description: `긴급 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
          }), r += 1;
        } catch (n) {
          d.error("Emergency snapshot failed", n);
        }
      return d.info("Emergency flush completed", { mirrored: t, snapshots: r }), { mirrored: t, snapshots: r };
    })();
    try {
      return await this.criticalFlushPromise;
    } finally {
      this.criticalFlushPromise = null;
    }
  }
  // ─── Utilities ────────────────────────────────────────────────────────────
  hashContent(e) {
    let t = 0;
    for (let r = 0; r < e.length; r += 1)
      t = t * 31 + e.charCodeAt(r) >>> 0;
    return t;
  }
  startCleanupInterval() {
    const e = setInterval(() => {
      this.cleanupOldEntries();
    }, ue);
    typeof e.unref == "function" && e.unref();
  }
  cleanupOldEntries() {
    const e = Date.now();
    for (const [t, r] of Array.from(this.lastSaveAt.entries()))
      if (e - r > fe) {
        const a = this.saveTimers.get(t);
        a && clearTimeout(a), this.saveTimers.delete(t), this.pendingSaves.delete(t), this.lastSaveAt.delete(t);
      }
  }
  clearProject(e) {
    this.stopAutoSave(e), this.configs.delete(e);
  }
}
const Re = I.getInstance(), Y = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AutoSaveManager: I,
  autoSaveManager: Re
}, Symbol.toStringTag, { value: "Module" }));
export {
  Re as a,
  ze as b,
  Q as c,
  Y as d,
  ve as i,
  _ as k,
  O as t
};

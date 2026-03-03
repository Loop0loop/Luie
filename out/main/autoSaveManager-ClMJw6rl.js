import { EventEmitter as ee } from "events";
import { app as P } from "electron";
import { promises as A } from "fs";
import S from "path";
import * as F from "fs/promises";
import { c as D, d as c, p as T, S as d, E as p, ad as te, F as re, ae, af as b, ag as ne, ah as U, f as j, ai as oe, aj as se, ak as ie, al as L, am as ce, an as le, ao as he, ap as de, aq as pe, ar as me, as as $, at as G, au as ue, av as fe, aw as ge } from "./index.js";
import "./config-HSSbDImy.js";
import { c as k } from "./characterService-CNN-DedU.js";
import { z as C } from "zod";
import { Type as _ } from "@google/genai";
import { s as E, w as H, r as we } from "./snapshotService-BU9Ma5Io.js";
const B = D("KeywordExtractor");
class ye {
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
      const o = n[0], i = n.index ?? 0;
      this.shouldSkip(o) || r.has(o) || (this.characterNames.has(o) ? (t.push({
        text: o,
        position: i,
        type: "character"
      }), r.add(o)) : this.termNames.has(o) && (t.push({
        text: o,
        position: i,
        type: "term"
      }), r.add(o)));
    }
    return B.debug("Keywords extracted", {
      keywordCount: t.length,
      textLength: e.length
    }), t;
  }
  extractNewKeywords(e) {
    const t = [], r = /* @__PURE__ */ new Set(), a = Array.from(e.matchAll(this.koreanRegex));
    for (const n of a) {
      const o = n[0];
      this.shouldSkip(o) || r.has(o) || !this.characterNames.has(o) && !this.termNames.has(o) && (t.push(o), r.add(o));
    }
    return B.debug("New keywords extracted", {
      keywordCount: t.length
    }), t;
  }
  shouldSkip(e) {
    return !!(e.length < 2 || this.commonWords.has(e) || /^\d+$/.test(e));
  }
  extractNouns(e) {
    const t = [], r = /* @__PURE__ */ new Set(), a = Array.from(e.matchAll(this.koreanRegex));
    for (const n of a) {
      const o = n[0];
      this.shouldSkip(o) || r.has(o) || (t.push(o), r.add(o));
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
const v = new ye(), g = D("TermService");
function Se(s) {
  return typeof s == "object" && s !== null && "code" in s && s.code === "P2025";
}
class Ae {
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
      throw g.error("Failed to create term", t), new d(
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
        throw new d(p.TERM_NOT_FOUND, "Term not found", { id: e });
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
      throw g.error("Failed to get all terms", t), new d(
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
      throw g.error("Failed to update term", t), Se(t) ? new d(
        p.TERM_NOT_FOUND,
        "Term not found",
        { id: e.id },
        t
      ) : new d(
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
      throw g.error("Failed to delete term", t), new d(
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
      throw g.error("Failed to record term appearance", t), new d(
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
      throw g.error("Failed to get appearances by chapter", t), new d(
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
        throw new d(p.TERM_NOT_FOUND, "Term not found", { termId: e });
      r.firstAppearance || (await c.getClient().term.update({
        where: { id: e },
        data: { firstAppearance: t }
      }), g.info("First appearance updated", { termId: e, chapterId: t }));
    } catch (r) {
      throw g.error("Failed to update first appearance", r), new d(
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
      throw g.error("Failed to search terms", r), new d(
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
      throw g.error("Failed to get terms by category", r), new d(
        p.DB_QUERY_FAILED,
        "Failed to get terms by category",
        { projectId: e, category: t },
        r
      );
    }
  }
}
const x = new Ae(), R = D("GeminiProxyClient"), q = (s, e) => {
  const t = new Error(e);
  return t.status = s, t;
}, Ee = (s) => {
  const e = process.env.LUIE_GEMINI_PROXY_URL?.trim();
  return e && e.length > 0 ? e : `${s.url}/functions/v1/gemini-proxy`;
}, X = (s) => {
  if (typeof s == "string") {
    const e = s.trim();
    return e.length > 0 ? e : null;
  }
  return null;
}, W = (s) => {
  if (!Array.isArray(s))
    return null;
  const e = s[0];
  if (!e || typeof e != "object") return null;
  const t = e.content;
  if (!t || typeof t != "object") return null;
  const r = t.parts;
  if (!Array.isArray(r)) return null;
  const a = r.map(
    (n) => n && typeof n == "object" ? X(n.text) : null
  ).filter((n) => !!n);
  return a.length === 0 ? null : a.join(`
`).trim();
}, Te = () => {
  const s = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GCP_API,
    process.env.GOOGLE_API_KEY
  ];
  for (const e of s) {
    if (typeof e != "string") continue;
    const t = e.trim();
    if (t.length > 0) return t;
  }
  return null;
}, Ce = async (s, e) => {
  const t = await re.getEdgeAccessToken(), r = Ee(e), a = await fetch(r, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: e.anonKey,
      Authorization: `Bearer ${t}`
    },
    body: JSON.stringify(s)
  });
  if (!a.ok) {
    const i = await a.text();
    throw R.warn("gemini-proxy request failed", {
      endpoint: r,
      status: a.status,
      body: i
    }), q(a.status, `GEMINI_PROXY_FAILED:${a.status}:${i}`);
  }
  const n = await a.json(), o = X(n.text) ?? W(n.candidates);
  if (!o)
    throw new Error("GEMINI_PROXY_EMPTY_RESPONSE");
  return o;
}, _e = async (s, e) => {
  const t = {};
  s.responseMimeType && (t.responseMimeType = s.responseMimeType), s.responseSchema && (t.responseSchema = s.responseSchema), typeof s.temperature == "number" && (t.temperature = s.temperature), typeof s.topP == "number" && (t.topP = s.topP), typeof s.topK == "number" && (t.topK = s.topK), typeof s.maxOutputTokens == "number" && (t.maxOutputTokens = s.maxOutputTokens);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      s.model
    )}:generateContent?key=${encodeURIComponent(e)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: s.prompt }] }],
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
    throw q(
      r.status,
      `GEMINI_LOCAL_FAILED:${r.status}:${a}`
    );
  const o = W(
    n && typeof n == "object" ? n.candidates : null
  );
  if (!o)
    throw new Error("GEMINI_LOCAL_EMPTY_RESPONSE");
  return o;
}, ve = async (s) => {
  const e = te(), t = Te(), r = [];
  if (e)
    try {
      return await Ce(s, e);
    } catch (a) {
      const n = a instanceof Error ? a.message : String(a);
      r.push(`edge:${n}`), R.warn("Edge Gemini path failed; falling back to local path", {
        message: n
      });
    }
  else
    r.push("edge:SUPABASE_NOT_CONFIGURED");
  if (t)
    try {
      return await _e(s, t);
    } catch (a) {
      const n = a instanceof Error ? a.message : String(a);
      r.push(`local:${n}`), R.warn("Local Gemini path failed", { message: n });
    }
  else
    r.push("local:GEMINI_LOCAL_API_KEY_MISSING");
  throw new Error(`GEMINI_ALL_PATHS_FAILED:${r.join("|")}`);
}, Z = (s) => s.replace(/\s+/g, " ").trim(), Ie = (s, e = "본문 발췌") => {
  const t = Z(s);
  return t ? t.slice(0, Math.min(120, t.length)) : e;
}, De = (s, e) => {
  const t = Z(s);
  if (!t) return e;
  const r = Math.min(t.length - 1, e.length + 1);
  if (r <= 0 || r >= t.length) return e;
  const a = t.slice(r, Math.min(t.length, r + 120)).trim();
  return a.length > 0 ? a : e;
}, Ve = (s) => {
  const e = s.manuscript.content, t = Ie(e), r = De(e, t);
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
}, Me = (s, e) => {
  const t = `${s} ${e.join(" ")}`;
  return /(길드|협회|조직|단체|학교|대학|회사|연맹)/.test(t) ? "organization" : /(성|탑|궁|마을|도시|숲|산|강|거리|던전)/.test(t) ? "location" : /(검|창|방패|반지|목걸이|무기|유물|artifact|아이템)/i.test(t) ? "item" : /(님|씨|군|양|왕|황제|공주|기사|마법사|선생|대장)/.test(t) ? "character" : "concept";
}, K = (s, e) => {
  const t = Me(s, e), r = e.length >= 3 ? "main" : e.length >= 2 ? "supporting" : "minor";
  return {
    name: s,
    entityType: t,
    importance: r,
    summary: `${s}와(과) 관련된 ${t} 요소로 추정됩니다. 문맥 기반 로컬 분류 결과입니다.`,
    confidence: e.length >= 2 ? 0.58 : 0.42,
    reasoning: "Edge/원격 모델 호출 실패로 로컬 규칙 기반 추정치를 사용했습니다."
  };
}, Ne = C.object({
  name: C.string(),
  entityType: C.enum(["character", "location", "organization", "item", "concept"]),
  importance: C.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: C.string(),
  confidence: C.number().min(0).max(1).default(0.5),
  reasoning: C.string().optional()
}), Fe = `
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
`.trim(), Oe = {
  type: _.OBJECT,
  properties: {
    name: { type: _.STRING },
    entityType: {
      type: _.STRING,
      enum: ["character", "location", "organization", "item", "concept"]
    },
    importance: {
      type: _.STRING,
      enum: ["main", "supporting", "minor", "unknown"]
    },
    summary: { type: _.STRING },
    confidence: { type: _.NUMBER },
    reasoning: { type: _.STRING }
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
}, O = D("AutoExtractService"), Pe = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
class Le {
  timers = /* @__PURE__ */ new Map();
  paragraphCache = /* @__PURE__ */ new Map();
  scheduleAnalysis(e, t, r) {
    const a = `${t}:${e}`, n = this.timers.get(a);
    n && clearTimeout(n);
    const o = setTimeout(() => {
      this.analyzeChapter(e, t, r).catch((i) => {
        O.error("Auto extraction failed", { chapterId: e, projectId: t, error: i });
      });
    }, ae);
    this.timers.set(a, o);
  }
  splitParagraphs(e) {
    return e.split(/\n{2,}/g).map((t) => t.trim()).filter(Boolean);
  }
  getDirtyParagraphs(e, t) {
    const r = this.splitParagraphs(t), a = this.paragraphCache.get(e) ?? [];
    if (this.paragraphCache.set(e, r), a.length === 0)
      return r;
    const n = [], o = Math.max(a.length, r.length);
    for (let i = 0; i < o; i += 1)
      a[i] !== r[i] && r[i] && n.push(r[i]);
    return n;
  }
  async analyzeChapter(e, t, r) {
    const a = this.getDirtyParagraphs(e, r);
    if (a.length === 0)
      return;
    const [n, o] = await Promise.all([
      c.getClient().character.findMany({
        where: { projectId: t },
        select: { id: !0, name: !0, description: !0 }
      }),
      c.getClient().term.findMany({
        where: { projectId: t },
        select: { id: !0, term: !0, definition: !0, category: !0 }
      })
    ]);
    v.setKnownCharacters(n.map((m) => m.name)), v.setKnownTerms(o.map((m) => m.term));
    const i = a.flatMap((m) => v.extractNouns(m)), l = v.filterByFrequency(i, 2).filter((m) => !n.some((w) => w.name === m)).filter((m) => !o.some((w) => w.term === m)), h = Array.from(new Set(l)).slice(0, 10);
    if (h.length !== 0) {
      for (const m of h) {
        const w = a.filter((M) => M.includes(m)).slice(0, 3), y = await this.classifyWithGemini(m, w);
        y && (y.entityType === "character" ? await k.createCharacter({
          projectId: t,
          name: y.name,
          description: y.summary,
          attributes: {
            importance: y.importance,
            confidence: y.confidence,
            source: "auto-extract"
          }
        }) : await x.createTerm({
          projectId: t,
          term: y.name,
          definition: y.summary,
          category: y.entityType
        }));
      }
      O.info("Auto extraction completed", {
        projectId: t,
        chapterId: e,
        candidateCount: h.length
      });
    }
  }
  async classifyWithGemini(e, t) {
    const r = t.map((n, o) => `문맥 ${o + 1}: ${n}`).join(`
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

${Fe}

---

이제 아래 문맥에서 "${e}"를 분석하세요.

${r}

[고유명사]: ${e}

JSON 형식으로만 답하세요:`;
    try {
      const n = await ve({
        model: Pe,
        prompt: a,
        responseMimeType: "application/json",
        responseSchema: Oe
      }), o = Ne.safeParse(JSON.parse(n));
      return o.success ? o.data : (O.warn("Gemini response parse failed", o.error), K(e, t));
    } catch (n) {
      return O.warn("Gemini classification failed; using local deterministic fallback", {
        error: n
      }), K(e, t);
    }
  }
}
const ke = new Le(), Q = D("ChapterKeywords");
async function xe(s, e, t) {
  try {
    const r = await c.getClient().character.findMany({
      where: { projectId: t },
      select: { id: !0, name: !0 }
    }), a = await c.getClient().term.findMany({
      where: { projectId: t },
      select: { id: !0, term: !0 }
    }), n = r.map((l) => l.name), o = a.map((l) => l.term);
    v.setKnownCharacters(n), v.setKnownTerms(o);
    const i = v.extractFromText(e);
    for (const l of i.filter((h) => h.type === "character")) {
      const h = r.find((m) => m.name === l.text);
      h && (await k.recordAppearance({
        characterId: String(h.id),
        chapterId: s,
        position: l.position,
        context: Y(e, l.position, b)
      }), await k.updateFirstAppearance(String(h.id), s));
    }
    for (const l of i.filter((h) => h.type === "term")) {
      const h = a.find((m) => m.term === l.text);
      h && (await x.recordAppearance({
        termId: String(h.id),
        chapterId: s,
        position: l.position,
        context: Y(e, l.position, b)
      }), await x.updateFirstAppearance(String(h.id), s));
    }
    Q.info("Keyword tracking completed", {
      chapterId: s,
      characterCount: i.filter((l) => l.type === "character").length,
      termCount: i.filter((l) => l.type === "term").length
    });
  } catch (r) {
    Q.error("Failed to track keyword appearances", r);
  }
}
function Y(s, e, t) {
  const r = Math.max(0, e - t), a = Math.min(s.length, e + t);
  return s.substring(r, a);
}
const f = D("ChapterService");
function z(s) {
  return typeof s == "object" && s !== null && "code" in s && s.code === "P2025";
}
class Re {
  async createChapter(e) {
    try {
      if (!e.title || e.title.trim().length === 0)
        throw new d(
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
      throw f.error("Failed to create chapter", t), t instanceof d ? t : new d(
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
        throw new d(
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
      throw f.error("Failed to get all chapters", t), new d(
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
        throw new d(
          p.VALIDATION_FAILED,
          "Cannot update a deleted chapter",
          { id: e.id }
        );
      const r = {};
      if (e.title !== void 0 && (r.title = e.title), e.content !== void 0) {
        const n = ne(), o = typeof t?.content == "string" ? t.content : "", i = o.length, l = e.content.length;
        if (i > 0 && l === 0) {
          let h;
          if (!n) {
            const m = t?.projectId ? await c.getClient().project.findUnique({
              where: { id: String(t.projectId) },
              select: { title: !0 }
            }) : null, w = typeof m?.title == "string" ? String(m.title) : "Unknown", y = U(w, "Unknown"), M = S.join(
              P.getPath("userData"),
              j,
              y || "Unknown",
              "_suspicious"
            );
            await F.mkdir(M, { recursive: !0 });
            const N = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
            h = S.join(M, `dump-empty-${e.id}-${N}.txt`), await F.writeFile(h, o, "utf8");
          }
          throw f.warn("Empty content save blocked.", {
            chapterId: e.id,
            oldLen: i,
            dumpPath: h
          }), new d(
            p.VALIDATION_FAILED,
            "Empty content save blocked",
            { chapterId: e.id, oldLen: i }
          );
        }
        if (!n && i > 1e3 && l < i * 0.1) {
          const h = t?.projectId ? await c.getClient().project.findUnique({
            where: { id: String(t.projectId) },
            select: { title: !0 }
          }) : null, m = typeof h?.title == "string" ? String(h.title) : "Unknown", w = U(m, "Unknown"), y = S.join(
            P.getPath("userData"),
            j,
            w || "Unknown",
            "_suspicious"
          );
          await F.mkdir(y, { recursive: !0 });
          const M = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), N = S.join(y, `dump-${e.id}-${M}.txt`);
          throw await F.writeFile(N, e.content, "utf8"), f.warn("Suspicious large deletion detected. Save blocked.", {
            chapterId: e.id,
            oldLen: i,
            newLen: l,
            dumpPath: N
          }), new d(
            p.VALIDATION_FAILED,
            "Suspicious large deletion detected; save blocked",
            { chapterId: e.id, oldLen: i, newLen: l }
          );
        }
        r.content = e.content, r.wordCount = e.content.length, t && (await xe(
          e.id,
          e.content,
          String(t.projectId)
        ), ke.scheduleAnalysis(
          e.id,
          String(t.projectId),
          e.content
        ));
      }
      e.synopsis !== void 0 && (r.synopsis = e.synopsis);
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
      throw f.error("Failed to update chapter", t), t instanceof d ? t : z(t) ? new d(
        p.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: e.id },
        t
      ) : new d(
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
        const { autoSaveManager: a } = await Promise.resolve().then(() => J);
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
      throw f.error("Failed to delete chapter", t), new d(
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
      throw f.error("Failed to get deleted chapters", t), new d(
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
        throw new d(
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
      throw f.error("Failed to restore chapter", t), z(t) ? new d(
        p.CHAPTER_NOT_FOUND,
        "Chapter not found",
        { id: e },
        t
      ) : new d(
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
        const { autoSaveManager: r } = await Promise.resolve().then(() => J);
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
      throw f.error("Failed to purge chapter", t), new d(
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
      throw f.error("Failed to reorder chapters", r), new d(
        p.DB_TRANSACTION_FAILED,
        "Failed to reorder chapters",
        { projectId: e },
        r
      );
    }
  }
}
const V = new Re(), u = D("AutoSaveManager");
class I extends ee {
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
  constructor() {
    super(), this.on("error", (e) => {
      u.warn("Auto-save error event", e);
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
      await A.rm(n, { recursive: !0, force: !0 });
    } catch (n) {
      u.warn("Failed to purge chapter mirrors", { projectId: e, chapterId: t, error: n });
    }
  }
  setConfig(e, t) {
    this.configs.set(e, t), t.enabled ? (this.startAutoSave(e), this.startSnapshotSchedule(e)) : this.stopAutoSave(e);
  }
  getConfig(e) {
    return this.configs.get(e) || {
      enabled: !0,
      interval: se,
      debounceMs: oe
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
      u.info("Skipping auto-save for missing/deleted chapter", {
        chapterId: e,
        projectId: r
      });
      return;
    }
    this.pendingSaves.set(e, { chapterId: e, content: t, projectId: r }), this.lastSaveAt.set(e, Date.now()), await this.writeLatestMirror(r, e, t), this.maybeCreateEmergencySnapshot(r, e, t);
    const o = this.saveTimers.get(e);
    o && clearTimeout(o);
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
        await V.updateChapter({
          id: t.chapterId,
          content: t.content
        }), this.pendingSaves.delete(e), this.saveTimers.delete(e), this.lastSaveAt.delete(e), this.emit("saved", { chapterId: e }), await this.writeLatestMirror(t.projectId, t.chapterId, t.content), this.maybeEnqueueSnapshot(t.projectId, t.chapterId, t.content), u.info("Auto-save completed", { chapterId: e });
      } catch (r) {
        if (ie(r) && r.code === p.VALIDATION_FAILED) {
          u.warn("Auto-save blocked by validation; writing safety snapshot", {
            chapterId: e,
            error: r
          });
          try {
            await this.writeLatestMirror(t.projectId, t.chapterId, t.content), await this.writeTimestampedMirror(t.projectId, t.chapterId, t.content), await E.createSnapshot({
              projectId: t.projectId,
              chapterId: t.chapterId,
              content: t.content,
              description: `Safety snapshot (블로킹된 저장) ${(/* @__PURE__ */ new Date()).toLocaleString()}`
            });
          } catch (a) {
            u.error("Failed to write safety snapshot after validation block", a);
          }
          this.pendingSaves.delete(e), this.saveTimers.delete(e), this.lastSaveAt.delete(e), this.emit("save-blocked", { chapterId: e, error: r });
          return;
        }
        u.error("Auto-save failed", r), this.listenerCount("error") > 0 && this.emit("error", { chapterId: e, error: r });
      }
  }
  // ─── Snapshot Scheduling (Time Machine style) ────────────────────────────
  maybeEnqueueSnapshot(e, t, r) {
    const a = `${e}:${t}`, n = Date.now(), o = this.lastSnapshotAt.get(a) ?? 0;
    if (n - o < L || r.length < ce) return;
    const i = this.hashContent(r);
    if (this.lastSnapshotHash.get(a) === i) return;
    const h = this.lastSnapshotLength.get(a) ?? 0;
    if (h > 0) {
      const m = Math.abs(r.length - h);
      if (m / h < le && m < he) return;
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
    if (r.length > de) return;
    const a = `${e}:${t}`, n = Date.now(), o = this.lastEmergencySnapshotAt.get(a) ?? 0;
    if (!(n - o < pe)) {
      this.lastEmergencySnapshotAt.set(a, n);
      try {
        await E.createSnapshot({
          projectId: e,
          chapterId: t,
          content: r,
          description: `긴급 마이크로 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        }), await this.writeTimestampedMirror(e, t, r);
      } catch (i) {
        u.warn("Failed to create emergency micro snapshot", { error: i, chapterId: t });
      }
    }
  }
  async processSnapshotQueue() {
    for (; this.snapshotQueue.length > 0; ) {
      const e = this.snapshotQueue.shift();
      if (e)
        try {
          await E.createSnapshot({
            projectId: e.projectId,
            chapterId: e.chapterId,
            content: e.content,
            description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
          }), await E.deleteOldSnapshots(e.projectId, me), await this.writeTimestampedMirror(e.projectId, e.chapterId, e.content);
        } catch (t) {
          u.error("Failed to create snapshot", t);
        }
    }
    this.snapshotProcessing = !1;
  }
  // ─── Mirror File I/O ─────────────────────────────────────────────────────
  getMirrorBaseDir(e, t) {
    return S.join(
      P.getPath("userData"),
      $,
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
      await A.mkdir(a, { recursive: !0 });
      const n = S.join(a, "latest.snap"), o = JSON.stringify(
        { projectId: e, chapterId: t, content: r, updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await H(n, o);
    } catch (a) {
      u.error("Failed to write latest mirror", a);
    }
  }
  /**
   * Write timestamped `.snap` file for point-in-time recovery.
   * Old files are pruned to SNAPSHOT_FILE_KEEP_COUNT.
   */
  async writeTimestampedMirror(e, t, r) {
    try {
      const a = this.getMirrorBaseDir(e, t);
      await A.mkdir(a, { recursive: !0 });
      const n = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), o = S.join(a, `${n}.snap`), i = JSON.stringify(
        { projectId: e, chapterId: t, content: r, createdAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        2
      );
      await H(o, i);
      const l = (await A.readdir(a)).filter(
        (h) => h.endsWith(".snap") && h !== "latest.snap"
      );
      if (l.length > G) {
        const m = l.sort().slice(0, l.length - G);
        await Promise.all(
          m.map((w) => A.unlink(S.join(a, w)).catch(() => {
          }))
        );
      }
    } catch (a) {
      u.error("Failed to write timestamped mirror", a);
    }
  }
  // ─── Mirror Recovery (startup / shutdown) ─────────────────────────────────
  async listLatestMirrorFiles() {
    const e = S.join(P.getPath("userData"), $), t = [];
    try {
      const r = await A.readdir(e, { withFileTypes: !0 });
      for (const a of r) {
        if (!a.isDirectory() || a.name === "_emergency") continue;
        const n = S.join(e, a.name), o = await A.readdir(n, { withFileTypes: !0 });
        for (const i of o) {
          if (!i.isDirectory()) continue;
          const l = S.join(n, i.name, "latest.snap");
          try {
            await A.stat(l), t.push(l);
          } catch {
          }
        }
      }
    } catch (r) {
      if (r?.code === "ENOENT")
        return t;
      u.warn("Failed to list mirror files", r);
    }
    return t;
  }
  async readMirrorPayload(e) {
    try {
      const t = await we(e), r = JSON.parse(t);
      return typeof r.projectId != "string" || typeof r.chapterId != "string" ? null : {
        projectId: r.projectId,
        chapterId: r.chapterId,
        content: typeof r.content == "string" ? r.content : "",
        updatedAt: typeof r.updatedAt == "string" ? r.updatedAt : null
      };
    } catch (t) {
      return u.warn("Failed to read mirror payload", { filePath: e, error: t }), null;
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
        const o = await this.readMirrorPayload(n);
        if (!o) continue;
        const i = await c.getClient().chapter.findUnique({
          where: { id: o.chapterId },
          select: { id: !0, projectId: !0, deletedAt: !0 }
        });
        if (!i) {
          u.warn("Mirror snapshot skipped (missing chapter), cleaning up stale mirror", {
            chapterId: o.chapterId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        const l = i.deletedAt;
        if (l != null) {
          u.info("Mirror snapshot skipped (chapter deleted), cleaning up", {
            chapterId: o.chapterId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        if (String(i.projectId) !== o.projectId) {
          u.warn("Mirror snapshot skipped (project mismatch), cleaning up", {
            chapterId: o.chapterId,
            projectId: o.projectId,
            filePath: n
          }), await this.cleanStaleMirrorDir(n), a += 1;
          continue;
        }
        const h = await E.getLatestSnapshot(o.chapterId), m = h?.createdAt ? new Date(String(h.createdAt)).getTime() : 0, w = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
        if (w && w <= m)
          continue;
        await E.createSnapshot({
          projectId: o.projectId,
          chapterId: o.chapterId,
          content: o.content,
          description: `미러 복구 스냅샷 (${e}) ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
          type: "AUTO"
        }), r += 1;
      } catch (o) {
        u.warn("Failed to flush mirror snapshot", { error: o, filePath: n });
      }
    return u.info("Mirror snapshot flush completed", { created: r, cleaned: a, reason: e }), { created: r, cleaned: a };
  }
  /**
   * Remove stale mirror directory (for deleted chapters).
   * Deletes all .snap files and the directory itself.
   */
  async cleanStaleMirrorDir(e) {
    try {
      const t = S.dirname(e), r = await A.readdir(t);
      await Promise.all(
        r.map((a) => A.unlink(S.join(t, a)).catch(() => {
        }))
      ), await A.rmdir(t).catch(() => {
      });
    } catch (t) {
      u.warn("Failed to clean stale mirror directory", { mirrorFilePath: e, error: t });
    }
  }
  // ─── Auto Save Scheduling ────────────────────────────────────────────────
  startAutoSave(e) {
    const t = this.getConfig(e);
    if (!t.enabled) return;
    const r = this.intervalTimers.get(e);
    r && clearInterval(r);
    const a = setInterval(async () => {
      const n = Array.from(this.pendingSaves.entries());
      for (const [o] of n)
        await this.performSave(o);
    }, t.interval);
    this.intervalTimers.set(e, a), u.info("Auto-save started", { projectId: e, interval: t.interval });
  }
  stopAutoSave(e) {
    const t = this.intervalTimers.get(e);
    t && (clearInterval(t), this.intervalTimers.delete(e), u.info("Auto-save stopped", { projectId: e }));
    const r = this.snapshotTimers.get(e);
    r && (clearInterval(r), this.snapshotTimers.delete(e), u.info("Snapshot schedule stopped", { projectId: e }));
  }
  startSnapshotSchedule(e) {
    const t = this.snapshotTimers.get(e);
    t && clearInterval(t), this.createSnapshot(e);
    const r = setInterval(() => {
      this.createSnapshot(e);
    }, L);
    this.snapshotTimers.set(e, r), u.info("Snapshot schedule started", {
      projectId: e,
      interval: L
    });
  }
  async createSnapshot(e, t) {
    try {
      if (t) {
        const a = await V.getChapter(t);
        await E.createSnapshot({
          projectId: e,
          chapterId: String(a.id ?? t),
          content: String(a.content ?? ""),
          description: `자동 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        });
      } else
        await E.createSnapshot({
          projectId: e,
          content: JSON.stringify({ timestamp: Date.now() }),
          description: `프로젝트 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        });
      await E.deleteOldSnapshots(e, ue), u.info("Snapshot created", { projectId: e, chapterId: t });
    } catch (r) {
      u.error("Failed to create snapshot", r);
    }
  }
  // ─── Flush (quit / critical) ──────────────────────────────────────────────
  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    const e = Array.from(this.pendingSaves.keys());
    for (const t of e)
      await this.performSave(t);
  }
  /**
   * Emergency flush: write mirrors + snapshots for all pending content.
   * Called when time is critical (app crashing, OS killing process).
   * Returns counts for diagnostics.
   */
  async flushCritical() {
    const e = Array.from(this.pendingSaves.values());
    if (e.length === 0)
      return { mirrored: 0, snapshots: 0 };
    let t = 0, r = 0;
    for (const a of e)
      try {
        await this.writeLatestMirror(a.projectId, a.chapterId, a.content), t += 1;
      } catch (n) {
        u.error("Emergency mirror write failed", n);
      }
    for (const a of e)
      try {
        await E.createSnapshot({
          projectId: a.projectId,
          chapterId: a.chapterId,
          content: a.content,
          description: `긴급 스냅샷 ${(/* @__PURE__ */ new Date()).toLocaleString()}`
        }), r += 1;
      } catch (n) {
        u.error("Emergency snapshot failed", n);
      }
    return u.info("Emergency flush completed", { mirrored: t, snapshots: r }), { mirrored: t, snapshots: r };
  }
  // ─── Utilities ────────────────────────────────────────────────────────────
  hashContent(e) {
    let t = 0;
    for (let r = 0; r < e.length; r += 1)
      t = t * 31 + e.charCodeAt(r) >>> 0;
    return t;
  }
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldEntries();
    }, fe);
  }
  cleanupOldEntries() {
    const e = Date.now();
    for (const [t, r] of Array.from(this.lastSaveAt.entries()))
      if (e - r > ge) {
        const a = this.saveTimers.get(t);
        a && clearTimeout(a), this.saveTimers.delete(t), this.pendingSaves.delete(t), this.lastSaveAt.delete(t);
      }
  }
  clearProject(e) {
    this.stopAutoSave(e), this.configs.delete(e);
  }
}
const be = I.getInstance(), J = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AutoSaveManager: I,
  autoSaveManager: be
}, Symbol.toStringTag, { value: "Module" }));
export {
  be as a,
  Ve as b,
  V as c,
  J as d,
  ve as i,
  v as k,
  x as t
};

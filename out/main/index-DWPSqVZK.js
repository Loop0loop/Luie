import { d as Se, p as at, S as ge, E as pe, c as nt, L as Ni, e as ki, r as ga, a as ma, b as Oi, M as Pi, I as U, f as Li, g as Ce, h as Fi, i as Ot, j as Ye, k as Mi, l as Ui, m as Bi, n as Wi, s as ji, o as Hi, q as zi, t as Gi, u as qi, v as Yi, w as Zi, x as Vi, y as Ki, z as _a, A as $i, B as Xi, C as Ji, D as Qi, F as It, G as eo, H as to, J as Tt, K as ro, N as ao, O as no, P as io, Q as va, R as oo, T as so, U as wa, V as lo, W as ho, X as ya, Y as fo, Z as co, _ as Ea, $ as uo, a0 as po, a1 as ba, a2 as go, a3 as mo, a4 as _o, a5 as vo, a6 as wo, a7 as yo, a8 as Eo, a9 as bo, aa as Ta, ab as To, ac as So } from "./index.js";
import { k as Sa, i as Ao, b as Ro, c as xo, t as Io, a as Co } from "./autoSaveManager-ClMJw6rl.js";
import { g as dt, c as Do } from "./characterService-CNN-DedU.js";
import { entityRelationService as No } from "./entityRelationService-CIZszZTO.js";
import { s as ko } from "./snapshotService-BU9Ma5Io.js";
import "./config-HSSbDImy.js";
import { z as K } from "zod";
import { Type as Ct } from "@google/genai";
import { promises as Ve } from "fs";
import xe from "path";
import { app as qe, BrowserWindow as oa, shell as Oo, dialog as Po } from "electron";
import Lo from "better-sqlite3";
import { createHash as Aa } from "node:crypto";
import "fs/promises";
import "yauzl";
import "yazl";
import * as je from "node:fs/promises";
import wt from "node:path";
import { Document as Fo, Packer as Mo, Paragraph as zt, AlignmentType as Uo, HeadingLevel as nr, TextRun as Bo } from "docx";
import ni from "stream";
import Wo from "events";
import ii from "buffer";
import fa from "util";
import jo from "sanitize-filename";
import Ho from "node:module";
const Ih = import.meta.filename, Ch = import.meta.dirname, zo = Ho.createRequire(import.meta.url);
var Ue = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Go(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
const ct = nt("EventService");
function qo(a) {
  return typeof a == "object" && a !== null && "code" in a && a.code === "P2025";
}
class Yo {
  async createEvent(e) {
    try {
      ct.info("Creating event", e);
      const t = await Se.getClient().event.create({
        data: {
          projectId: e.projectId,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null
        }
      });
      return ct.info("Event created successfully", {
        eventId: t.id
      }), at.schedulePackageExport(e.projectId, "event:create"), t;
    } catch (t) {
      throw ct.error("Failed to create event", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to create event",
        { input: e },
        t
      );
    }
  }
  async getEvent(e) {
    try {
      const t = await Se.getClient().event.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new ge(
          pe.DB_QUERY_FAILED,
          "Event not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw ct.error("Failed to get event", t), t;
    }
  }
  async getAllEvents(e) {
    try {
      return await Se.getClient().event.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw ct.error("Failed to get all events", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to get all events",
        { projectId: e },
        t
      );
    }
  }
  async updateEvent(e) {
    try {
      const t = {};
      e.name !== void 0 && (t.name = e.name), e.description !== void 0 && (t.description = e.description), e.firstAppearance !== void 0 && (t.firstAppearance = e.firstAppearance), e.attributes !== void 0 && (t.attributes = JSON.stringify(e.attributes));
      const n = await Se.getClient().event.update({
        where: { id: e.id },
        data: t
      });
      return ct.info("Event updated successfully", {
        eventId: n.id
      }), at.schedulePackageExport(String(n.projectId), "event:update"), n;
    } catch (t) {
      throw ct.error("Failed to update event", t), qo(t) ? new ge(
        pe.DB_QUERY_FAILED,
        "Event not found",
        { id: e.id },
        t
      ) : new ge(
        pe.DB_QUERY_FAILED,
        "Failed to update event",
        { input: e },
        t
      );
    }
  }
  async deleteEvent(e) {
    try {
      const t = await Se.getClient().event.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      }), n = t?.projectId ? String(t.projectId) : null;
      return await Se.getClient().$transaction(async (l) => {
        n && await l.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await l.event.deleteMany({ where: { id: e } });
      }), ct.info("Event deleted successfully", { eventId: e }), n && at.schedulePackageExport(
        n,
        "event:delete"
      ), { success: !0 };
    } catch (t) {
      throw ct.error("Failed to delete event", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to delete event",
        { id: e },
        t
      );
    }
  }
}
const Zo = new Yo(), ut = nt("FactionService");
function Vo(a) {
  return typeof a == "object" && a !== null && "code" in a && a.code === "P2025";
}
class Ko {
  async createFaction(e) {
    try {
      ut.info("Creating faction", e);
      const t = await Se.getClient().faction.create({
        data: {
          projectId: e.projectId,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null
        }
      });
      return ut.info("Faction created successfully", {
        factionId: t.id
      }), at.schedulePackageExport(e.projectId, "faction:create"), t;
    } catch (t) {
      throw ut.error("Failed to create faction", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to create faction",
        { input: e },
        t
      );
    }
  }
  async getFaction(e) {
    try {
      const t = await Se.getClient().faction.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new ge(
          pe.DB_QUERY_FAILED,
          "Faction not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw ut.error("Failed to get faction", t), t;
    }
  }
  async getAllFactions(e) {
    try {
      return await Se.getClient().faction.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw ut.error("Failed to get all factions", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to get all factions",
        { projectId: e },
        t
      );
    }
  }
  async updateFaction(e) {
    try {
      const t = {};
      e.name !== void 0 && (t.name = e.name), e.description !== void 0 && (t.description = e.description), e.firstAppearance !== void 0 && (t.firstAppearance = e.firstAppearance), e.attributes !== void 0 && (t.attributes = JSON.stringify(e.attributes));
      const n = await Se.getClient().faction.update({
        where: { id: e.id },
        data: t
      });
      return ut.info("Faction updated successfully", {
        factionId: n.id
      }), at.schedulePackageExport(String(n.projectId), "faction:update"), n;
    } catch (t) {
      throw ut.error("Failed to update faction", t), Vo(t) ? new ge(
        pe.DB_QUERY_FAILED,
        "Faction not found",
        { id: e.id },
        t
      ) : new ge(
        pe.DB_QUERY_FAILED,
        "Failed to update faction",
        { input: e },
        t
      );
    }
  }
  async deleteFaction(e) {
    try {
      const t = await Se.getClient().faction.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      }), n = t?.projectId ? String(t.projectId) : null;
      return await Se.getClient().$transaction(async (l) => {
        n && await l.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await l.faction.deleteMany({ where: { id: e } });
      }), ut.info("Faction deleted successfully", { factionId: e }), n && at.schedulePackageExport(
        n,
        "faction:delete"
      ), { success: !0 };
    } catch (t) {
      throw ut.error("Failed to delete faction", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to delete faction",
        { id: e },
        t
      );
    }
  }
}
const $o = new Ko(), lt = nt("WorldEntityService");
function Ra(a) {
  return typeof a == "object" && a !== null && "code" in a && a.code === "P2025";
}
class Xo {
  async createWorldEntity(e) {
    try {
      lt.info("Creating world entity", e);
      const t = await dt().worldEntity.create({
        data: {
          projectId: e.projectId,
          type: e.type,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null,
          positionX: e.positionX ?? 0,
          positionY: e.positionY ?? 0
        }
      });
      return lt.info("World entity created", { entityId: t.id }), at.schedulePackageExport(String(t.projectId), "world-entity:create"), t;
    } catch (t) {
      throw lt.error("Failed to create world entity", t), new ge(
        pe.WORLD_ENTITY_CREATE_FAILED,
        "Failed to create world entity",
        { input: e },
        t
      );
    }
  }
  async getWorldEntity(e) {
    try {
      const t = await dt().worldEntity.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new ge(
          pe.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw lt.error("Failed to get world entity", t), t;
    }
  }
  async getAllWorldEntities(e) {
    try {
      return await dt().worldEntity.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw lt.error("Failed to get all world entities", t), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to get all world entities",
        { projectId: e },
        t
      );
    }
  }
  async updateWorldEntity(e) {
    try {
      const t = {};
      e.type !== void 0 && (t.type = e.type), e.name !== void 0 && (t.name = e.name), e.description !== void 0 && (t.description = e.description), e.firstAppearance !== void 0 && (t.firstAppearance = e.firstAppearance), e.attributes !== void 0 && (t.attributes = JSON.stringify(e.attributes));
      const n = await dt().worldEntity.update({
        where: { id: e.id },
        data: t
      });
      return lt.info("World entity updated", { entityId: n.id }), at.schedulePackageExport(String(n.projectId), "world-entity:update"), n;
    } catch (t) {
      throw lt.error("Failed to update world entity", t), Ra(t) ? new ge(
        pe.WORLD_ENTITY_NOT_FOUND,
        "World entity not found",
        { id: e.id },
        t
      ) : new ge(
        pe.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update world entity",
        { input: e },
        t
      );
    }
  }
  async updateWorldEntityPosition(e) {
    try {
      const t = await dt().worldEntity.update({
        where: { id: e.id },
        data: { positionX: e.positionX, positionY: e.positionY }
      });
      return at.schedulePackageExport(String(t.projectId), "world-entity:update-position"), t;
    } catch (t) {
      throw lt.error("Failed to update world entity position", t), Ra(t) ? new ge(
        pe.WORLD_ENTITY_NOT_FOUND,
        "World entity not found",
        { id: e.id },
        t
      ) : new ge(
        pe.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update position",
        { input: e },
        t
      );
    }
  }
  async deleteWorldEntity(e) {
    try {
      const t = await dt().worldEntity.delete({ where: { id: e } });
      return lt.info("World entity deleted", { entityId: e }), at.schedulePackageExport(String(t.projectId), "world-entity:delete"), { success: !0 };
    } catch (t) {
      throw lt.error("Failed to delete world entity", t), new ge(
        pe.WORLD_ENTITY_DELETE_FAILED,
        "Failed to delete world entity",
        { id: e },
        t
      );
    }
  }
}
const Jo = new Xo();
function oi(a) {
  return typeof DOMParser < "u" ? new DOMParser().parseFromString(a, "text/html").body.textContent ?? "" : a.replace(/<[^>]*>/g, " ");
}
const Qo = nt("WorldMentionService"), xa = 48, ir = 100, es = (a, e) => {
  const t = Math.max(0, e - xa), n = Math.min(a.length, e + xa);
  return a.slice(t, n);
}, Ia = (a) => a.trim().toLowerCase(), ts = (a, e) => {
  const t = oi(a), n = Ia(e);
  if (!n) return null;
  const l = Ia(t).indexOf(n);
  return l >= 0 ? l : null;
};
class rs {
  async getEntityName(e, t) {
    const n = dt();
    switch (e) {
      case "Character": {
        const l = await n.character.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof l?.name == "string" ? l.name : null;
      }
      case "Faction": {
        const l = await n.faction.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof l?.name == "string" ? l.name : null;
      }
      case "Event": {
        const l = await n.event.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof l?.name == "string" ? l.name : null;
      }
      case "Term": {
        const l = await n.term.findUnique({
          where: { id: t },
          select: { term: !0 }
        });
        return typeof l?.term == "string" ? l.term : null;
      }
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity": {
        const l = await n.worldEntity.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof l?.name == "string" ? l.name : null;
      }
      default:
        return null;
    }
  }
  async getAppearanceMentions(e) {
    if (e.entityType !== "Character" && e.entityType !== "Term")
      return [];
    const t = dt(), n = e.entityType === "Character" ? await t.characterAppearance.findMany({
      where: { characterId: e.entityId },
      orderBy: { createdAt: "asc" },
      take: e.limit ?? ir
    }) : await t.termAppearance.findMany({
      where: { termId: e.entityId },
      orderBy: { createdAt: "asc" },
      take: e.limit ?? ir
    });
    if (n.length === 0)
      return [];
    const l = Array.from(new Set(n.map((p) => p.chapterId))), i = await t.chapter.findMany({
      where: {
        id: { in: l },
        projectId: e.projectId
      },
      select: { id: !0, title: !0 }
    }), o = new Map(i.map((p) => [p.id, p]));
    return n.map((p) => {
      const c = o.get(p.chapterId);
      return c ? {
        chapterId: p.chapterId,
        chapterTitle: c.title,
        position: typeof p.position == "number" ? p.position : null,
        context: typeof p.context == "string" ? p.context : void 0,
        source: "appearance"
      } : null;
    }).filter((p) => p !== null);
  }
  async getFallbackMentions(e, t) {
    const l = await dt().chapter.findMany({
      where: {
        projectId: e.projectId,
        deletedAt: null
      },
      select: {
        id: !0,
        title: !0,
        content: !0,
        order: !0
      },
      orderBy: { order: "asc" }
    }), i = [];
    for (const o of l) {
      const p = ts(o.content, t);
      if (p === null) continue;
      const c = oi(o.content);
      if (i.push({
        chapterId: o.id,
        chapterTitle: o.title,
        position: p,
        context: es(c, p),
        source: "content-match"
      }), i.length >= (e.limit ?? ir))
        break;
    }
    return i;
  }
  async getMentions(e) {
    try {
      const t = await this.getAppearanceMentions(e);
      if (t.length > 0)
        return t;
      const n = await this.getEntityName(e.entityType, e.entityId);
      return n ? this.getFallbackMentions(e, n) : [];
    } catch (t) {
      throw Qo.error("Failed to fetch world graph mentions", { query: e, error: t }), new ge(
        pe.DB_QUERY_FAILED,
        "Failed to fetch world graph mentions",
        { query: e },
        t
      );
    }
  }
}
const as = new rs(), Gt = nt("SearchService");
class ns {
  async search(e) {
    try {
      const t = [];
      return (e.type === "all" || e.type === "character") && (await Se.getClient().character.findMany({
        where: {
          projectId: e.projectId,
          OR: [
            { name: { contains: e.query } },
            { description: { contains: e.query } }
          ]
        },
        take: 10
      })).forEach((l) => {
        t.push({
          type: "character",
          id: l.id,
          title: l.name,
          description: l.description ?? void 0,
          metadata: {
            appearancesCount: 0
          }
        });
      }), (e.type === "all" || e.type === "term") && (await Se.getClient().term.findMany({
        where: {
          projectId: e.projectId,
          OR: [
            { term: { contains: e.query } },
            { definition: { contains: e.query } }
          ]
        },
        take: 10
      })).forEach((l) => {
        t.push({
          type: "term",
          id: l.id,
          title: l.term,
          description: l.definition ?? void 0,
          metadata: {
            category: l.category ?? void 0
          }
        });
      }), e.type === "all" && (await Se.getClient().chapter.findMany({
        where: {
          projectId: e.projectId,
          OR: [
            { title: { contains: e.query } },
            { content: { contains: e.query } },
            { synopsis: { contains: e.query } }
          ]
        },
        take: 5
      })).forEach((l) => {
        t.push({
          type: "chapter",
          id: l.id,
          title: l.title,
          description: l.synopsis ?? void 0,
          metadata: {
            wordCount: l.wordCount,
            order: l.order
          }
        });
      }), t.sort((n, l) => {
        const i = { term: 0, character: 1, chapter: 2 }, o = i[n.type] - i[l.type];
        return o !== 0 ? o : n.title.localeCompare(l.title);
      }), Gt.info("Search completed", {
        projectId: e.projectId,
        query: e.query,
        resultCount: t.length
      }), t;
    } catch (t) {
      throw Gt.error("Search failed", t), new ge(
        pe.SEARCH_QUERY_FAILED,
        "Search failed",
        { input: e },
        t
      );
    }
  }
  async searchCharacters(e, t) {
    return this.search({ projectId: e, query: t, type: "character" });
  }
  async searchTerms(e, t) {
    return this.search({ projectId: e, query: t, type: "term" });
  }
  async searchChapters(e, t) {
    return this.search({ projectId: e, query: t, type: "all" });
  }
  async getQuickAccess(e) {
    try {
      const t = await Se.getClient().term.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "desc" },
        take: 5
      }), n = await Se.getClient().character.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "desc" },
        take: 5
      }), l = [
        ...t.map((i) => ({
          type: "term",
          id: i.id,
          title: i.term,
          description: i.definition ?? void 0
        })),
        ...n.map((i) => ({
          type: "character",
          id: i.id,
          title: i.name,
          description: i.description ?? void 0
        }))
      ];
      return Gt.info("Quick access retrieved", {
        projectId: e,
        termCount: t.length,
        characterCount: n.length
      }), l;
    } catch (t) {
      throw Gt.error("Failed to get quick access", t), new ge(
        pe.SEARCH_QUERY_FAILED,
        "Failed to get quick access",
        { projectId: e },
        t
      );
    }
  }
}
const is = new ns(), os = nt("ManuscriptAnalyzer");
class ss {
  /**
   * 명사구 추출 (keywordExtractor 활용)
   */
  extractNounPhrases(e) {
    try {
      const t = Sa.extractNouns(e);
      return Sa.filterByFrequency(t, 1);
    } catch (t) {
      return os.error("Failed to extract noun phrases", { error: t }), [];
    }
  }
  /**
   * 분석 컨텍스트 구성
   * 캐릭터, Term, 원고 내용을 통합
   */
  buildAnalysisContext(e, t, n) {
    const l = this.extractNounPhrases(e.content);
    return {
      characters: t.map((i) => ({
        name: i.name,
        description: i.description ?? ""
      })),
      terms: n.map((i) => ({
        term: i.term,
        definition: i.definition ?? "",
        category: i.category ?? "기타"
      })),
      manuscript: {
        title: e.title,
        content: e.content,
        nounPhrases: l
      }
    };
  }
}
const ls = new ss(), hs = K.object({
  type: K.enum(["reaction", "suggestion", "intro", "outro"]),
  content: K.string(),
  quote: K.string().optional(),
  contextId: K.string().optional()
});
Ct.ARRAY, Ct.OBJECT, Ct.STRING, Ct.STRING, Ct.STRING, Ct.STRING;
const fs = `
예시 1 (독자 반응):
입력: "그는 천천히 고개를 들었고, 거울 속의 자신과 눈이 마주쳤다."
출력: {
  "type": "reaction",
  "content": "이 구간의 긴장감이 상당합니다. 주인공이 진실을 마주하는 순간의 호흡이 짧게 끊어지면서, 읽는 사람도 같이 숨을 참게 만드네요.",
  "quote": "그는 천천히 고개를 들었고, 거울 속의 자신과 눈이 마주쳤다.",
  "contextId": "ctx-1"
}

예시 2 (모순점 발견):
입력: "방패는 절대 깨지지 않는다고 믿었다. 하지만 다음 문장에서 그 방패가 바로 산산조각 났다."
출력: {
  "type": "suggestion",
  "content": "같은 본문 안에서 방패의 내구도 설정이 상충돼 독자가 설정을 헷갈릴 수 있습니다. 두 문장 사이의 조건이나 예외를 한 줄 보강하면 자연스러워집니다.",
  "quote": "방패는 절대 깨지지 않는다고 믿었다. 하지만 다음 문장에서 그 방패가 바로 산산조각 났다.",
  "contextId": "ctx-2"
}

예시 3 (인트로):
출력: {
  "type": "intro",
  "content": "작가님, 이번 챕터는 정말 흥미로웠습니다.\\n특히 인물의 내면 묘사가 이전보다 훨씬 깊어졌다는 인상을 받았습니다.\\n독자의 입장에서 몇 가지 눈에 띄는 지점들을 짚어보았습니다."
}

예시 4 (아웃트로):
출력: {
  "type": "outro",
  "content": "전반적으로 이번 챕터는 독자의 몰입을 잘 이끌어낸다고 생각합니다.\\n위에서 언급한 부분들만 살짝 다듬으시면 더욱 완성도 높은 챕터가 될 것 같습니다."
}
`.trim(), Ca = `
당신은 한국 문학 전문 편집자입니다.
작가가 작성한 원고를 독자의 관점에서 분석하고, 건설적인 피드백을 제공하는 것이 목표입니다.

## 역할
- 독자가 원고를 읽으며 느낄 감정, 몰입도, 혼란 지점을 예측
- 설정 모순, 캐릭터 일관성 문제, 플롯 구멍 등을 발견
- 비판적이되 존중하는 태도로 피드백 제공
- 구체적인 인용과 함께 문제점을 지적
- 개선 방향을 건설적으로 제안

## 제약 사항
1. 독자 관점에서 분석 (전지적 시점 X)
2. 구체적인 텍스트 인용 필수 (quote 필드 활용, 원고 본문의 정확한 부분 문자열만 허용)
3. 예의 바르고 존중하는 어조 유지
4. 문제점만이 아닌 잘된 점도 언급
5. JSONL 형식으로만 응답 (각 줄마다 JSON 객체 1개, 코드블록 금지)
6. 제공된 원고 본문 외 정보 사용 금지 (외부 지식, 추측, 기억, 세계관 DB/캐릭터 DB 가정 금지)
7. 본문에 없는 인물/설정/사건을 새로 만들어서 언급 금지

## 출력 형식
- JSONL만 허용: 각 줄마다 JSON 객체 1개
- 각 객체는 다음 필드를 포함
  - type: "reaction" (독자 반응), "suggestion" (개선 제안), "intro" (시작 인사), "outro" (마무리 멘트)
  - content: 분석 내용 (한글, 자연스러운 문장)
  - quote: 인용 텍스트 (reaction/suggestion에서 필수)
  - contextId: 원고 내 위치 식별자 (필요시)

## 중요
- 작가의 창작 의도를 존중하되, 독자가 혼란스러울 부분은 명확히 지적
- "이건 틀렸어요"가 아닌 "독자가 이렇게 느낄 수 있어요" 톤 유지
- 근거가 부족하면 단정하지 말고, "본문 근거 부족"으로 명시
`.trim();
function Da(a) {
  const { manuscript: e } = a;
  let t = `# 원고 분석 요청

`;
  return t += `## 원고
`, t += `**제목**: ${e.title}

`, t += `**내용**:
${e.content}

`, e.nounPhrases.length > 0 && (t += `## 주요 명사구
`, t += e.nounPhrases.slice(0, 20).join(", "), t += `

`), t += `## 분석 요청
`, t += `위 원고 본문만 근거로 독자 관점에서 분석해주세요.
`, t += `- 독자가 느낄 감정, 몰입도
`, t += `- 설정 모순, 캐릭터 일관성 문제
`, t += `- 플롯 구멍, 개연성 문제
`, t += `- 개선 제안

`, t += `중요: 본문에 없는 사실을 추가하지 마세요.
`, t += `reaction/suggestion의 quote는 반드시 본문에서 정확히 복사한 문장(또는 구절)이어야 합니다.
`, t += `JSONL 형식으로만 응답하세요.
`, t += `반드시 다음 구성으로 포함하세요 (각 줄 1개 JSON):
`, t += `- intro 1개
`, t += `- reaction 최소 1개 (quote 포함)
`, t += `- suggestion 최소 2개 (quote 포함)
`, t += `- outro 1개
`, t += "코드블록(```)과 배열 형식 출력 금지.\n", t;
}
const ve = nt("ManuscriptAnalysisService"), cs = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview", us = (a, e, t) => {
  if (!a) return e;
  try {
    return JSON.parse(a);
  } catch (n) {
    return ve.warn("Failed to parse .luie analysis payload; using fallback", {
      projectPath: t.projectPath,
      entryPath: t.entryPath,
      label: t.label,
      error: n
    }), e;
  }
};
class ds {
  isAnalyzing = !1;
  currentWindow = null;
  analysisCache = /* @__PURE__ */ new Map();
  /**
   * 분석 시작
   */
  async startAnalysis(e, t, n) {
    if (this.isAnalyzing)
      throw ve.warn("Analysis already in progress"), new Error("Analysis already in progress");
    this.isAnalyzing = !0, this.currentWindow = n, ve.info("Window assigned for analysis", {
      hasWindow: !!this.currentWindow,
      isDestroyed: this.currentWindow?.isDestroyed(),
      windowId: this.currentWindow?.id
    });
    try {
      const l = await Se.getClient().project.findUnique({
        where: { id: t },
        select: { projectPath: !0 }
      }), i = typeof l?.projectPath == "string" ? l.projectPath : "";
      if (!i || !i.toLowerCase().endsWith(Ni))
        throw new Error("Project .luie path not found");
      const o = ki(i, "projectPath"), [p, c] = await Promise.all([
        ga(o, ma, ve),
        ga(
          o,
          `${Oi}/${e}${Pi}`,
          ve
        )
      ]);
      if (!c)
        throw new Error(`Chapter content not found in .luie: ${e}`);
      const d = us(
        p,
        void 0,
        {
          projectPath: o,
          entryPath: ma,
          label: "meta"
        }
      )?.chapters?.find((S) => S.id === e)?.title ?? "Untitled", s = {
        id: e,
        title: d,
        content: c
      };
      ve.info("Loaded .luie analysis data", {
        chapterId: e,
        chapterTitle: d,
        contentLength: c.length
      });
      const g = ls.buildAnalysisContext(
        s,
        [],
        []
      ), v = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await this.streamAnalysisWithGemini(g, e, v), ve.info("Analysis completed", { chapterId: e, projectId: t });
    } catch (l) {
      throw ve.error("Analysis failed", { chapterId: e, projectId: t, error: l }), this.isAnalyzing = !1, l;
    } finally {
      this.isAnalyzing = !1;
    }
  }
  /**
   * 분석 중단
   */
  stopAnalysis() {
    if (!this.isAnalyzing) {
      ve.warn("No analysis in progress");
      return;
    }
    this.isAnalyzing = !1, ve.info("Analysis stopped by user");
  }
  /**
   * 분석 데이터 삭제 (보안)
   */
  clearAnalysisData() {
    ve.info("clearAnalysisData called", {
      hadWindow: !!this.currentWindow,
      windowId: this.currentWindow?.id,
      isAnalyzing: this.isAnalyzing,
      stackTrace: new Error().stack?.split(`
`).slice(1, 4).join(`
`)
    }), this.analysisCache.clear(), this.currentWindow = null, ve.info("Analysis data cleared");
  }
  /**
   * Gemini API 스트리밍 호출
   */
  async streamAnalysisWithGemini(e, t, n) {
    const l = `${Ca}

${fs}

---

${Da(e)}

# RunId
${n}

# Style
같은 요청이어도 표현을 바꿔서 답변하세요. 이전 응답과 동일 문장을 반복하지 마세요.
본문에 없는 사실은 절대 추가하지 마세요.
reaction/suggestion의 quote는 반드시 본문에 있는 문구를 그대로 사용하세요.`, i = [];
    let o = 0;
    const p = /* @__PURE__ */ new Set(), c = e.manuscript.content.replace(/\s+/g, " ").trim(), b = [
      cs,
      process.env.ALTERNATIVE_GEMINI_MODEL
    ].filter((E) => !!E);
    ve.info("Starting Gemini analysis", {
      chapterId: t,
      models: b,
      promptLength: l.length
    });
    try {
      let E = "";
      const d = [], s = (_) => {
        try {
          const T = hs.parse(_), C = (ee) => ee.replace(/\s+/g, " ").trim(), O = T.type === "reaction" || T.type === "suggestion", B = C(T.quote ?? "");
          if (O && !B) {
            ve.warn("Skipping analysis item without quote", {
              chapterId: t,
              type: T.type
            });
            return;
          }
          if (O && c && !c.includes(B)) {
            ve.warn("Skipping analysis item with quote outside manuscript", {
              chapterId: t,
              type: T.type,
              quotePreview: B.slice(0, 120)
            });
            return;
          }
          const F = `${T.type}|${C(T.content).toLowerCase()}|${B.toLowerCase()}`;
          if (p.has(F)) {
            ve.info("Skipping duplicate analysis item", {
              chapterId: t,
              type: T.type
            });
            return;
          }
          p.add(F);
          const q = {
            id: `analysis-${++o}`,
            type: T.type,
            content: T.content,
            quote: T.quote,
            contextId: T.contextId
          };
          i.push(q), d.push(T), ve.info("Attempting to send stream item", {
            itemId: q.id,
            type: q.type,
            hasCurrentWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id
          }), this.currentWindow && !this.currentWindow.isDestroyed() ? this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
            item: q,
            done: !1
          }) : ve.error("Window not available for streaming - CRITICAL", {
            hasWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id,
            itemId: q.id
          });
        } catch (T) {
          ve.warn("Invalid analysis item", { error: T, itemData: _ });
        }
      }, g = async (_, T, C) => {
        let B = await Ao({
          model: _,
          prompt: T,
          responseMimeType: "text/plain",
          temperature: 0.5,
          topP: 0.9,
          topK: 40
        });
        for (; B.length > 0; ) {
          const F = B.trimStart();
          if (!F) {
            B = "";
            break;
          }
          if (F.startsWith("```")) {
            const ce = F.indexOf(`
`);
            if (ce === -1) break;
            B = F.slice(ce + 1);
            continue;
          }
          if (!F.startsWith("{") && !F.startsWith("[")) {
            const ce = Math.min(
              F.indexOf("{") === -1 ? 1 / 0 : F.indexOf("{"),
              F.indexOf("[") === -1 ? 1 / 0 : F.indexOf("[")
            );
            if (ce === 1 / 0) {
              B = "";
              break;
            }
            B = F.slice(ce);
            continue;
          }
          let q = 0, ee = !1, te = !1, le = -1;
          const oe = F[0] === "[", Z = oe ? "[" : "{", he = oe ? "]" : "}";
          for (let ce = 0; ce < F.length; ce++) {
            const x = F[ce];
            if (te) {
              te = !1;
              continue;
            }
            if (x === "\\") {
              te = !0;
              continue;
            }
            if (x === '"') {
              ee = !ee;
              continue;
            }
            if (!ee) {
              if (x === Z)
                q++;
              else if (x === he && (q--, q === 0)) {
                le = ce + 1;
                break;
              }
            }
          }
          if (le === -1)
            break;
          const we = F.slice(0, le);
          B = F.slice(le);
          try {
            const ce = JSON.parse(we);
            Array.isArray(ce) ? ce.forEach((x) => s(x)) : s(ce);
          } catch (ce) {
            ve.warn("Failed to parse JSON", { error: ce, jsonStr: we.slice(0, 200), phase: C });
          }
        }
        if (B.trim()) {
          const F = B.trim();
          try {
            const q = JSON.parse(F);
            Array.isArray(q) ? q.forEach((ee) => s(ee)) : s(q);
          } catch (q) {
            ve.warn("Failed to parse remaining buffer", { error: q, buffer: F.slice(0, 200), phase: C });
          }
        }
      };
      for (const _ of b)
        try {
          ve.info("Trying Gemini model", { model: _ }), await g(_, l, "primary"), E = _, ve.info("Gemini model responded successfully", { model: _ });
          break;
        } catch (T) {
          const C = T && typeof T == "object" && "status" in T ? T.status : void 0, O = C === 404 || C === 429 || C === 503, B = _ !== b[b.length - 1];
          if (ve.warn("Gemini model failed", {
            model: _,
            status: C,
            isRetryable: O,
            hasNext: B,
            error: T instanceof Error ? T.message : String(T)
          }), O && B)
            continue;
          throw T;
        }
      if (!E)
        throw new Error("No available Gemini model responded");
      ve.info("Gemini response received", { usedModel: E });
      const v = d.filter((_) => _?.type === "suggestion").length, S = d.filter((_) => _?.type === "reaction").length, R = d.some((_) => _?.type === "intro"), u = d.some((_) => _?.type === "outro");
      if (v < 2 || S < 1 || !R || !u) {
        ve.warn("Gemini response missing required items", {
          suggestionCount: v,
          reactionCount: S,
          hasIntro: R,
          hasOutro: u
        });
        const _ = `${Ca}

${Da(e)}

# 추가 요청
부족한 항목만 JSONL로 추가 출력하세요.
- intro: ${R ? "이미 출력됨" : "필수"}
- reaction: ${S >= 1 ? "이미 출력됨" : "최소 1개 (quote 포함)"}
- suggestion: ${v >= 2 ? "이미 출력됨" : "최소 2개 (quote 포함)"}
- outro: ${u ? "이미 출력됨" : "필수"}
동일 문장 반복 금지. 코드블록 금지.`;
        await g(E, _, "followup");
      }
      ve.info("Attempting to send completion event", {
        hasCurrentWindow: !!this.currentWindow,
        isDestroyed: this.currentWindow?.isDestroyed(),
        windowId: this.currentWindow?.id
      }), this.currentWindow && !this.currentWindow.isDestroyed() ? (ve.info("Sending completion event to window"), this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
        item: null,
        done: !0
      }), ve.info("Completion event sent successfully")) : ve.error("Window not available for completion event - CRITICAL", {
        hasWindow: !!this.currentWindow,
        isDestroyed: this.currentWindow?.isDestroyed(),
        windowId: this.currentWindow?.id
      }), this.analysisCache.set(t, i), ve.info("Streaming analysis completed", {
        chapterId: t,
        itemCount: i.length
      });
    } catch (E) {
      ve.error("Gemini streaming failed", { error: E });
      const d = Ro(e);
      if (d.length > 0) {
        ve.warn("Using deterministic local fallback for analysis", {
          chapterId: t,
          fallbackCount: d.length,
          reason: E instanceof Error ? E.message : String(E)
        });
        const S = d.map((R, u) => ({
          id: `analysis-fallback-${u + 1}`,
          type: R.type,
          content: R.content,
          quote: R.quote,
          contextId: R.contextId
        }));
        if (this.currentWindow && !this.currentWindow.isDestroyed()) {
          for (const R of S)
            this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
              item: R,
              done: !1
            });
          this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
            item: null,
            done: !0
          });
        }
        this.analysisCache.set(t, S);
        return;
      }
      let s = "UNKNOWN", g = "분석 중 오류가 발생했습니다.";
      const v = E instanceof Error ? E.message : String(E);
      if (v.includes("SYNC_AUTH_REQUIRED_FOR_EDGE") ? (s = "INVALID_REQUEST", g = "분석을 실행하려면 Sync 로그인이 필요합니다.") : v.includes("SUPABASE_NOT_CONFIGURED") && (s = "INVALID_REQUEST", g = "Supabase 런타임 설정을 먼저 완료해주세요."), E && typeof E == "object" && "status" in E) {
        const S = E;
        S.status === 429 ? (s = "QUOTA_EXCEEDED", g = "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.") : S.status >= 500 ? (s = "NETWORK_ERROR", g = "Gemini API 서버 오류가 발생했습니다.") : S.status === 400 && (s = "INVALID_REQUEST", g = "잘못된 요청입니다. 원고 내용을 확인해주세요.");
      }
      throw this.currentWindow && !this.currentWindow.isDestroyed() && this.currentWindow.webContents.send(U.ANALYSIS_ERROR, {
        code: s,
        message: g,
        details: E instanceof Error ? E.message : String(E)
      }), E;
    }
  }
  /**
   * 분석 진행 여부 확인
   */
  isAnalysisInProgress() {
    return this.isAnalyzing;
  }
}
const er = new ds(), qt = nt("DbRecoveryService"), ps = (a) => {
  if (!Array.isArray(a)) return;
  const e = a.filter((t) => !!(t && typeof t == "object")).map((t) => ({
    busy: typeof t.busy == "number" && Number.isFinite(t.busy) ? t.busy : 0,
    log: typeof t.log == "number" && Number.isFinite(t.log) ? t.log : 0,
    checkpointed: typeof t.checkpointed == "number" && Number.isFinite(t.checkpointed) ? t.checkpointed : 0
  }));
  return e.length > 0 ? e : void 0;
}, gs = (a) => {
  if (!Array.isArray(a)) return;
  const e = a.map((t) => {
    if (typeof t == "string") return t;
    if (t && typeof t == "object") {
      const n = t.integrity_check;
      if (typeof n == "string") return n;
    }
    return null;
  }).filter((t) => typeof t == "string" && t.length > 0);
  return e.length > 0 ? e : void 0;
};
class ms {
  async recoverFromWal(e) {
    let t, n = null, l = !1;
    try {
      const i = Se.getDatabasePath();
      n = i;
      const o = `${i}-wal`, p = `${i}-shm`;
      if (!await this.exists(o))
        return {
          success: !1,
          message: "WAL file not found. Recovery is not available."
        };
      if (t = await this.createBackup(i, o, p), e?.dryRun)
        return {
          success: !0,
          message: "Backup created. Run recovery to apply WAL.",
          backupDir: t
        };
      await Se.disconnect(), l = !0;
      const b = new Lo(i, { fileMustExist: !0 });
      let E, d;
      try {
        E = b.pragma("wal_checkpoint(FULL)"), d = b.pragma("integrity_check");
      } finally {
        b.close();
      }
      const s = ps(E), g = gs(d), v = (s ?? []).filter((R) => R.busy > 0);
      if (v.length > 0)
        throw new Error(`DB_RECOVERY_WAL_BUSY:${v.map((R) => R.busy).join(",")}`);
      const S = (g ?? []).filter(
        (R) => R.trim().toLowerCase() !== "ok"
      );
      if (S.length > 0)
        throw new Error(`DB_RECOVERY_INTEGRITY_FAILED:${S[0]}`);
      return await Se.initialize(), l = !1, qt.info("DB recovery completed", { dbPath: n, backupDir: t }), {
        success: !0,
        message: "Recovery completed successfully.",
        backupDir: t,
        checkpoint: s,
        integrity: g
      };
    } catch (i) {
      if (qt.error("DB recovery failed", { error: i }), t && n && await this.restoreBackup(t, n), l)
        try {
          await Se.initialize();
        } catch (o) {
          qt.error("Failed to reinitialize database after recovery failure", {
            reinitializeError: o,
            dbPath: n
          });
        }
      return {
        success: !1,
        message: i instanceof Error ? i.message : String(i),
        backupDir: t
      };
    }
  }
  async createBackup(e, t, n) {
    const l = (/* @__PURE__ */ new Date()).toISOString().replace(/[^0-9]/g, ""), i = xe.join(qe.getPath("userData"), Li, "db-recovery", l);
    return await Ve.mkdir(i, { recursive: !0 }), await Ve.copyFile(e, xe.join(i, xe.basename(e))), await Ve.copyFile(t, xe.join(i, xe.basename(t))), await this.exists(n) && await Ve.copyFile(n, xe.join(i, xe.basename(n))), i;
  }
  async restoreBackup(e, t) {
    try {
      const n = xe.basename(t), l = xe.basename(`${t}-wal`), i = xe.basename(`${t}-shm`), o = xe.dirname(t), p = xe.join(e, n);
      if (!await this.exists(p))
        return;
      await Ve.copyFile(p, xe.join(o, n));
      const c = xe.join(e, l), b = xe.join(e, i);
      await this.exists(c) && await Ve.copyFile(c, xe.join(o, l)), await this.exists(b) && await Ve.copyFile(b, xe.join(o, i));
    } catch (n) {
      qt.warn("Failed to restore backup", { error: n });
    }
  }
  async exists(e) {
    try {
      return await Ve.access(e), !0;
    } catch {
      return !1;
    }
  }
}
const _s = new ms();
function vs(a, e) {
  Ce(a, [
    {
      channel: U.CHAPTER_CREATE,
      logTag: "CHAPTER_CREATE",
      failMessage: "Failed to create chapter",
      argsSchema: K.tuple([Fi]),
      handler: (t) => e.createChapter(t)
    },
    {
      channel: U.CHAPTER_GET,
      logTag: "CHAPTER_GET",
      failMessage: "Failed to get chapter",
      argsSchema: K.tuple([Ot]),
      handler: (t) => e.getChapter(t)
    },
    {
      channel: U.CHAPTER_GET_ALL,
      logTag: "CHAPTER_GET_ALL",
      failMessage: "Failed to get all chapters",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllChapters(t)
    },
    {
      channel: U.CHAPTER_GET_DELETED,
      logTag: "CHAPTER_GET_DELETED",
      failMessage: "Failed to get deleted chapters",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getDeletedChapters(t)
    },
    {
      channel: U.CHAPTER_UPDATE,
      logTag: "CHAPTER_UPDATE",
      failMessage: "Failed to update chapter",
      argsSchema: K.tuple([Mi]),
      handler: (t) => e.updateChapter(t)
    },
    {
      channel: U.CHAPTER_DELETE,
      logTag: "CHAPTER_DELETE",
      failMessage: "Failed to delete chapter",
      argsSchema: K.tuple([Ot]),
      handler: (t) => e.deleteChapter(t)
    },
    {
      channel: U.CHAPTER_RESTORE,
      logTag: "CHAPTER_RESTORE",
      failMessage: "Failed to restore chapter",
      argsSchema: K.tuple([Ot]),
      handler: (t) => e.restoreChapter(t)
    },
    {
      channel: U.CHAPTER_PURGE,
      logTag: "CHAPTER_PURGE",
      failMessage: "Failed to purge chapter",
      argsSchema: K.tuple([Ot]),
      handler: (t) => e.purgeChapter(t)
    },
    {
      channel: U.CHAPTER_REORDER,
      logTag: "CHAPTER_REORDER",
      failMessage: "Failed to reorder chapters",
      argsSchema: K.tuple([Ye, K.array(Ot)]),
      handler: (t, n) => e.reorderChapters(t, n)
    }
  ]);
}
function ws(a, e) {
  Ce(a, [
    {
      channel: U.PROJECT_CREATE,
      logTag: "PROJECT_CREATE",
      failMessage: "Failed to create project",
      argsSchema: K.tuple([Ui]),
      handler: (t) => e.createProject(t)
    },
    {
      channel: U.PROJECT_OPEN_LUIE,
      logTag: "PROJECT_OPEN_LUIE",
      failMessage: "Failed to open .luie package",
      argsSchema: K.tuple([K.string()]),
      handler: (t) => e.openLuieProject(t)
    },
    {
      channel: U.PROJECT_GET,
      logTag: "PROJECT_GET",
      failMessage: "Failed to get project",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getProject(t)
    },
    {
      channel: U.PROJECT_GET_ALL,
      logTag: "PROJECT_GET_ALL",
      failMessage: "Failed to get all projects",
      handler: () => e.getAllProjects()
    },
    {
      channel: U.PROJECT_UPDATE,
      logTag: "PROJECT_UPDATE",
      failMessage: "Failed to update project",
      argsSchema: K.tuple([Bi]),
      handler: (t) => e.updateProject(t)
    },
    {
      channel: U.PROJECT_DELETE,
      logTag: "PROJECT_DELETE",
      failMessage: "Failed to delete project",
      argsSchema: K.tuple([Wi]),
      handler: (t) => e.deleteProject(t)
    },
    {
      channel: U.PROJECT_REMOVE_LOCAL,
      logTag: "PROJECT_REMOVE_LOCAL",
      failMessage: "Failed to remove project from list",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.removeProjectFromList(t)
    }
  ]);
}
function ys(a) {
  ws(a.logger, a.projectService), vs(a.logger, a.chapterService);
}
function Es(a, e) {
  Ce(a, [
    {
      channel: U.SEARCH,
      logTag: "SEARCH",
      failMessage: "Failed to search",
      argsSchema: K.tuple([ji]),
      handler: (t) => e.search(t)
    }
  ]);
}
function bs(a) {
  Es(a.logger, a.searchService);
}
const Na = (a, e) => {
  switch (e.level) {
    case "debug":
      a.debug(e.message, e.data || void 0);
      break;
    case "info":
      a.info(e.message, e.data || void 0);
      break;
    case "warn":
      a.warn(e.message, e.data || void 0);
      break;
    case "error":
      a.error(e.message, e.data || void 0);
      break;
    default:
      a.info(e.message, e.data || void 0);
  }
};
function Ts(a) {
  Ce(a, [
    {
      channel: U.LOGGER_LOG,
      logTag: "LOGGER_LOG",
      failMessage: "Failed to log",
      handler: async ({ level: e, message: t, data: n }) => {
        const { createLogger: l } = await import("./index.js").then((o) => o.aG), i = l("IPCLogger");
        return Na(i, { level: e, message: t, data: n }), { success: !0 };
      }
    },
    {
      channel: U.LOGGER_LOG_BATCH,
      logTag: "LOGGER_LOG_BATCH",
      failMessage: "Failed to log batch",
      handler: async (e) => {
        const { createLogger: t } = await import("./index.js").then((l) => l.aG), n = t("IPCLogger");
        for (const l of e)
          Na(n, l);
        return { success: !0 };
      }
    }
  ]);
}
function Ss(a) {
  Ce(a, [
    {
      channel: U.RECOVERY_DB_RUN,
      logTag: "RECOVERY_DB_RUN",
      failMessage: "Failed to run DB recovery",
      argsSchema: Hi,
      handler: async (e) => (a.info("RECOVERY_DB_RUN", { options: e }), _s.recoverFromWal(e))
    }
  ]);
}
const ze = /* @__PURE__ */ (() => {
  let a = null;
  return async () => (a || (a = import("./index.js").then((t) => t.aH)), (await a).settingsManager);
})();
function As(a) {
  Ce(a, [
    {
      channel: U.SETTINGS_GET_ALL,
      logTag: "SETTINGS_GET_ALL",
      failMessage: "Failed to get settings",
      handler: async () => (await ze()).getAllForRenderer()
    },
    {
      channel: U.SETTINGS_GET_EDITOR,
      logTag: "SETTINGS_GET_EDITOR",
      failMessage: "Failed to get editor settings",
      handler: async () => (await ze()).getEditorSettings()
    },
    {
      channel: U.SETTINGS_SET_EDITOR,
      logTag: "SETTINGS_SET_EDITOR",
      failMessage: "Failed to set editor settings",
      argsSchema: K.tuple([zi]),
      handler: async (e) => {
        const t = await ze();
        return t.setEditorSettings(e), t.getEditorSettings();
      }
    },
    {
      channel: U.SETTINGS_GET_AUTO_SAVE,
      logTag: "SETTINGS_GET_AUTO_SAVE",
      failMessage: "Failed to get auto save settings",
      handler: async () => {
        const e = await ze();
        return {
          enabled: e.getAutoSaveEnabled(),
          interval: e.getAutoSaveInterval()
        };
      }
    },
    {
      channel: U.SETTINGS_GET_LANGUAGE,
      logTag: "SETTINGS_GET_LANGUAGE",
      failMessage: "Failed to get language setting",
      handler: async () => ({ language: (await ze()).getLanguage() ?? "ko" })
    },
    {
      channel: U.SETTINGS_SET_LANGUAGE,
      logTag: "SETTINGS_SET_LANGUAGE",
      failMessage: "Failed to set language setting",
      argsSchema: K.tuple([Gi]),
      handler: async (e) => {
        const t = await ze();
        return t.setLanguage(e.language), { language: t.getLanguage() ?? "ko" };
      }
    },
    {
      channel: U.SETTINGS_GET_MENU_BAR_MODE,
      logTag: "SETTINGS_GET_MENU_BAR_MODE",
      failMessage: "Failed to get menu bar mode",
      handler: async () => ({ mode: (await ze()).getMenuBarMode() })
    },
    {
      channel: U.SETTINGS_SET_MENU_BAR_MODE,
      logTag: "SETTINGS_SET_MENU_BAR_MODE",
      failMessage: "Failed to set menu bar mode",
      argsSchema: K.tuple([Yi]),
      handler: async (e) => {
        const t = await ze();
        t.setMenuBarMode(e.mode), qi(e.mode);
        const { windowManager: n } = await import("./index.js").then((l) => l.aI);
        return n.applyMenuBarModeToAllWindows(), { mode: t.getMenuBarMode() };
      }
    },
    {
      channel: U.SETTINGS_GET_SHORTCUTS,
      logTag: "SETTINGS_GET_SHORTCUTS",
      failMessage: "Failed to get shortcuts",
      handler: async () => (await ze()).getShortcuts()
    },
    {
      channel: U.SETTINGS_SET_SHORTCUTS,
      logTag: "SETTINGS_SET_SHORTCUTS",
      failMessage: "Failed to set shortcuts",
      argsSchema: K.tuple([Zi]),
      handler: async (e) => {
        const t = await ze(), n = t.setShortcuts(e.shortcuts), l = t.getShortcuts().defaults;
        return { shortcuts: n, defaults: l };
      }
    },
    {
      channel: U.SETTINGS_SET_AUTO_SAVE,
      logTag: "SETTINGS_SET_AUTO_SAVE",
      failMessage: "Failed to set auto save settings",
      argsSchema: K.tuple([Vi]),
      handler: async (e) => {
        const t = await ze();
        return e.enabled !== void 0 && t.setAutoSaveEnabled(e.enabled), e.interval !== void 0 && t.setAutoSaveInterval(e.interval), {
          enabled: t.getAutoSaveEnabled(),
          interval: t.getAutoSaveInterval()
        };
      }
    },
    {
      channel: U.SETTINGS_SET_WINDOW_BOUNDS,
      logTag: "SETTINGS_SET_WINDOW_BOUNDS",
      failMessage: "Failed to set window bounds",
      argsSchema: K.tuple([Ki]),
      handler: async (e) => ((await ze()).setWindowBounds(e), e)
    },
    {
      channel: U.SETTINGS_GET_WINDOW_BOUNDS,
      logTag: "SETTINGS_GET_WINDOW_BOUNDS",
      failMessage: "Failed to get window bounds",
      handler: async () => (await ze()).getWindowBounds()
    },
    {
      channel: U.SETTINGS_RESET,
      logTag: "SETTINGS_RESET",
      failMessage: "Failed to reset settings",
      handler: async () => {
        const e = await ze();
        return e.resetToDefaults(), e.getAllForRenderer();
      }
    }
  ]);
}
function Rs(a) {
  Ce(a, [
    {
      channel: U.STARTUP_GET_READINESS,
      logTag: "STARTUP_GET_READINESS",
      failMessage: "Failed to fetch startup readiness",
      handler: async () => _a.getReadiness()
    },
    {
      channel: U.STARTUP_COMPLETE_WIZARD,
      logTag: "STARTUP_COMPLETE_WIZARD",
      failMessage: "Failed to complete startup wizard",
      handler: async () => _a.completeWizard()
    }
  ]);
}
const ka = /* @__PURE__ */ (() => {
  let a = null;
  return async () => (a || (a = import("./index.js").then((e) => e.aH)), a);
})(), or = /* @__PURE__ */ (() => {
  let a = null;
  return async () => (a || (a = import("./index.js").then((e) => e.aJ)), a);
})();
function xs(a) {
  Ce(a, [
    {
      channel: U.SYNC_GET_STATUS,
      logTag: "SYNC_GET_STATUS",
      failMessage: "Failed to get sync status",
      handler: async () => It.getStatus()
    },
    {
      channel: U.SYNC_CONNECT_GOOGLE,
      logTag: "SYNC_CONNECT_GOOGLE",
      failMessage: "Failed to start Google sync connect",
      handler: async () => It.connectGoogle()
    },
    {
      channel: U.SYNC_DISCONNECT,
      logTag: "SYNC_DISCONNECT",
      failMessage: "Failed to disconnect sync account",
      handler: async () => It.disconnect()
    },
    {
      channel: U.SYNC_RUN_NOW,
      logTag: "SYNC_RUN_NOW",
      failMessage: "Failed to run sync",
      handler: async () => It.runNow()
    },
    {
      channel: U.SYNC_SET_AUTO,
      logTag: "SYNC_SET_AUTO",
      failMessage: "Failed to update auto sync setting",
      argsSchema: $i,
      handler: async (e) => It.setAutoSync(e.enabled)
    },
    {
      channel: U.SYNC_RESOLVE_CONFLICT,
      logTag: "SYNC_RESOLVE_CONFLICT",
      failMessage: "Failed to resolve sync conflict",
      argsSchema: Xi,
      handler: async (e) => It.resolveConflict(e)
    },
    {
      channel: U.SYNC_GET_RUNTIME_CONFIG,
      logTag: "SYNC_GET_RUNTIME_CONFIG",
      failMessage: "Failed to get runtime Supabase config",
      handler: async () => {
        const [{ settingsManager: e }, t] = await Promise.all([
          ka(),
          or()
        ]);
        return e.getRuntimeSupabaseConfigView({
          source: t.getSupabaseConfigSource() ?? void 0
        });
      }
    },
    {
      channel: U.SYNC_SET_RUNTIME_CONFIG,
      logTag: "SYNC_SET_RUNTIME_CONFIG",
      failMessage: "Failed to set runtime Supabase config",
      argsSchema: Ji,
      handler: async (e) => {
        const [{ settingsManager: t }, n] = await Promise.all([
          ka(),
          or()
        ]);
        return n.setRuntimeSupabaseConfig(e).valid ? t.getRuntimeSupabaseConfigView({
          source: "runtime"
        }) : {
          url: null,
          hasAnonKey: !1,
          source: "runtime"
        };
      }
    },
    {
      channel: U.SYNC_VALIDATE_RUNTIME_CONFIG,
      logTag: "SYNC_VALIDATE_RUNTIME_CONFIG",
      failMessage: "Failed to validate runtime Supabase config",
      argsSchema: Qi,
      handler: async (e) => (await or()).validateRuntimeSupabaseConfig(e)
    }
  ]);
}
const Yt = nt("AppUpdateService"), Oa = 5e3, Is = 512 * 1024, Pa = 1024 * 1024 * 1024, Cs = "updates", Ds = "pending.json", Ns = "current.json", ks = "rollback.json", Os = "https://api.github.com/repos/Loop0loop/Luie/releases/latest", Ps = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, Ls = /^(?:sha256:)?[a-fA-F0-9]{64}$/, At = (a) => {
  const e = a.trim();
  return Ps.test(e) ? e.startsWith("v") ? e.slice(1) : e : null;
}, La = (a) => {
  const e = At(a);
  if (!e) return null;
  const [t, n] = e.split("-", 2), [l, i, o] = t.split("."), p = Number(l), c = Number(i), b = Number(o);
  return [p, c, b].every((E) => Number.isInteger(E) && E >= 0) ? {
    major: p,
    minor: c,
    patch: b,
    prerelease: n ? n.split(".").filter((E) => E.length > 0) : []
  } : null;
}, Fs = (a, e) => {
  const t = /^\d+$/.test(a), n = /^\d+$/.test(e);
  if (t && n) {
    const l = Number(a), i = Number(e);
    return l === i ? 0 : l < i ? -1 : 1;
  }
  return t !== n ? t ? -1 : 1 : a === e ? 0 : a < e ? -1 : 1;
}, Ms = (a, e) => {
  const t = La(a), n = La(e);
  if (!t || !n) return a.localeCompare(e);
  if (t.major !== n.major) return t.major < n.major ? -1 : 1;
  if (t.minor !== n.minor) return t.minor < n.minor ? -1 : 1;
  if (t.patch !== n.patch) return t.patch < n.patch ? -1 : 1;
  const l = t.prerelease, i = n.prerelease;
  if (l.length === 0 && i.length === 0) return 0;
  if (l.length === 0) return 1;
  if (i.length === 0) return -1;
  const o = Math.max(l.length, i.length);
  for (let p = 0; p < o; p += 1) {
    const c = l[p], b = i[p];
    if (c === void 0) return -1;
    if (b === void 0) return 1;
    const E = Fs(c, b);
    if (E !== 0) return E;
  }
  return 0;
}, sa = (a) => {
  const e = a.trim();
  return Ls.test(e) ? e.toLowerCase().replace(/^sha256:/, "") : null;
}, Us = () => process.platform === "win32" ? ["web-setup", ".exe", "portable"] : process.platform === "darwin" ? [".dmg", ".zip"] : [".appimage", ".deb", ".rpm"], Fa = (a) => {
  const e = Us(), t = process.arch.toLowerCase(), n = ["x64", "arm64", "ia32"].filter((o) => o !== t), l = a.name.toLowerCase();
  let i = 0;
  for (const o of e)
    l.includes(o) && (i += 40);
  return l.includes(t) && (i += 30), n.some((o) => l.includes(o)) || (i += 5), i;
}, si = (a) => a.length === 0 ? null : [...a].sort((e, t) => Fa(t) - Fa(e))[0] ?? null, la = (a, e) => {
  try {
    const t = new URL(a, e);
    return t.protocol !== "https:" ? null : t;
  } catch {
    return null;
  }
}, Bs = (a) => {
  if (a.hostname !== "api.github.com") return null;
  const e = a.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/releases\/latest\/?$/i);
  return e ? {
    owner: decodeURIComponent(e[1]),
    repo: decodeURIComponent(e[2])
  } : null;
}, Ws = (a) => {
  const e = a.pathname.match(/\/releases\/tag\/([^/?#]+)$/i);
  return e ? At(decodeURIComponent(e[1])) : null;
}, sr = (a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), js = (a, e, t, n) => {
  const l = new RegExp(
    `/${sr(e)}/${sr(t)}/releases/download/${sr(n)}/([^"?#<]+)`,
    "gi"
  ), i = /* @__PURE__ */ new Set(), o = [];
  let p;
  for (; (p = l.exec(a)) !== null; ) {
    const c = p[0], b = decodeURIComponent(p[1]).trim();
    if (!b) continue;
    const E = c.replace(/&amp;/g, "&");
    i.has(E) || (i.add(E), o.push({
      name: b,
      url: `https://github.com${E}`
    }));
  }
  return o;
}, li = (a) => {
  if (typeof a == "string")
    return At(a);
  if (Array.isArray(a)) {
    for (const e of a) {
      const t = li(e);
      if (t) return t;
    }
    return null;
  }
  if (a && typeof a == "object") {
    const e = a, t = [
      e.version,
      e.latestVersion,
      e.tag_name,
      e.tagName,
      e.name
    ];
    for (const n of t) {
      if (typeof n != "string") continue;
      const l = At(n);
      if (l) return l;
    }
  }
  return null;
}, Hs = (a, e) => {
  if (!a || typeof a != "object" || Array.isArray(a))
    return null;
  const t = a, n = At(
    typeof t.version == "string" ? t.version : typeof t.latestVersion == "string" ? t.latestVersion : typeof t.tag_name == "string" ? t.tag_name : ""
  );
  if (!n) return null;
  const l = typeof t.url == "string" ? t.url : typeof t.downloadUrl == "string" ? t.downloadUrl : typeof t.assetUrl == "string" ? t.assetUrl : null, i = typeof t.sha256 == "string" ? t.sha256 : typeof t.checksum == "string" ? t.checksum : null;
  if (l) {
    let E;
    try {
      E = new URL(l, e);
    } catch {
      return null;
    }
    if (E.protocol !== "https:")
      return null;
    const d = typeof t.size == "number" && Number.isFinite(t.size) && t.size > 0 ? t.size : void 0, s = i ? sa(i) ?? void 0 : void 0;
    return {
      version: n,
      url: E.toString(),
      sha256: s,
      size: d
    };
  }
  const o = t.assets;
  if (!Array.isArray(o))
    return null;
  const p = o.map((E) => {
    if (!E || typeof E != "object" || Array.isArray(E)) return null;
    const d = E, s = typeof d.name == "string" ? d.name : "", g = typeof d.browser_download_url == "string" ? d.browser_download_url : "";
    if (!s || !g) return null;
    const v = typeof d.digest == "string" ? d.digest : typeof d.sha256 == "string" ? d.sha256 : typeof d.checksum == "string" ? d.checksum : void 0, S = v ? sa(v) ?? void 0 : void 0, R = typeof d.size == "number" && Number.isFinite(d.size) && d.size > 0 ? d.size : void 0;
    return {
      name: s,
      url: g,
      size: R,
      sha256: S
    };
  }).filter((E) => !!E);
  if (p.length === 0)
    return null;
  const c = si(p);
  if (!c) return null;
  const b = la(c.url, e);
  return b ? {
    version: n,
    url: b.toString(),
    sha256: c.sha256,
    size: c.size
  } : null;
}, zs = (a) => {
  const e = a.match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return e ? At(e[0]) : null;
}, Gs = (a) => {
  if (!a || typeof a != "object" || Array.isArray(a)) return !1;
  const e = a;
  return typeof e.version == "string" && e.version.length > 0 && typeof e.filePath == "string" && e.filePath.length > 0 && typeof e.sha256 == "string" && !!sa(e.sha256) && typeof e.size == "number" && Number.isFinite(e.size) && e.size >= 0 && typeof e.sourceUrl == "string" && e.sourceUrl.length > 0 && typeof e.downloadedAt == "string" && e.downloadedAt.length > 0;
}, ha = (a) => {
  const e = {
    Accept: "application/json, text/plain;q=0.9",
    "User-Agent": `Luie-Updater/${qe.getVersion()}`
  };
  return a.hostname === "api.github.com" && (e.Accept = "application/vnd.github+json", e["X-GitHub-Api-Version"] = "2022-11-28"), e;
}, qs = async (a) => {
  const e = Bs(a);
  if (!e) return null;
  const t = new URL(
    `https://github.com/${encodeURIComponent(e.owner)}/${encodeURIComponent(e.repo)}/releases/latest`
  ), n = await fetch(t, {
    method: "GET",
    headers: ha(t)
  });
  if (!n.ok)
    return null;
  const l = la(n.url, t);
  if (!l)
    return null;
  const i = l.pathname.split("/").pop();
  if (!i)
    return null;
  const o = decodeURIComponent(i), p = Ws(l) ?? At(o);
  if (!p)
    return null;
  const c = new URL(
    `https://github.com/${encodeURIComponent(e.owner)}/${encodeURIComponent(e.repo)}/releases/expanded_assets/${encodeURIComponent(
      o
    )}`
  ), b = await fetch(c, {
    method: "GET",
    headers: ha(c)
  });
  if (!b.ok)
    return {
      latestVersion: p,
      manifest: null
    };
  const E = await b.text(), d = js(E, e.owner, e.repo, o), s = si(d);
  if (!s)
    return {
      latestVersion: p,
      manifest: null
    };
  const g = la(s.url, c);
  return g ? {
    latestVersion: p,
    manifest: {
      version: p,
      url: g.toString(),
      size: s.size,
      sha256: s.sha256
    }
  } : {
    latestVersion: p,
    manifest: null
  };
}, Ze = async (a) => {
  try {
    return await je.access(a), !0;
  } catch {
    return !1;
  }
};
class Ys {
  state = {
    status: "idle",
    currentVersion: qe.getVersion(),
    rollbackAvailable: !1
  };
  cachedManifest = null;
  inFlightDownload = null;
  getUpdateDir() {
    return wt.join(qe.getPath("userData"), Cs);
  }
  getPendingMetaPath() {
    return wt.join(this.getUpdateDir(), Ds);
  }
  getCurrentMetaPath() {
    return wt.join(this.getUpdateDir(), Ns);
  }
  getRollbackMetaPath() {
    return wt.join(this.getUpdateDir(), ks);
  }
  broadcastState() {
    const t = oa?.getAllWindows?.() ?? [];
    for (const n of t)
      if (!n.isDestroyed())
        try {
          n.webContents.send(U.APP_UPDATE_STATE_CHANGED, this.state);
        } catch (l) {
          Yt.warn("Failed to broadcast update state", { error: l });
        }
  }
  setState(e) {
    this.state = {
      ...this.state,
      ...e,
      currentVersion: qe.getVersion()
    }, this.broadcastState();
  }
  async fetchFeed(e) {
    const t = new AbortController(), n = setTimeout(() => t.abort(), Oa);
    try {
      const l = await fetch(e, {
        method: "GET",
        headers: ha(e),
        signal: t.signal
      });
      if (!l.ok) {
        if (l.status === 403 && e.hostname === "api.github.com") {
          const b = await qs(e);
          if (b)
            return b;
        }
        throw new Error(`UPDATE_FEED_HTTP_${l.status}`);
      }
      const i = await l.text();
      if (Buffer.byteLength(i, "utf8") > Is)
        throw new Error("UPDATE_FEED_PAYLOAD_TOO_LARGE");
      if ((l.headers.get("content-type") ?? "").includes("json") || i.trim().startsWith("{") || i.trim().startsWith("[")) {
        const b = JSON.parse(i), E = li(b);
        if (!E) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
        return {
          latestVersion: E,
          manifest: Hs(b, e)
        };
      }
      const c = zs(i);
      if (!c) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
      return {
        latestVersion: c,
        manifest: null
      };
    } finally {
      clearTimeout(n);
    }
  }
  async checkForUpdate() {
    this.setState({
      status: "checking",
      message: void 0,
      latestVersion: void 0
    });
    const e = qe.getVersion();
    if (!qe.isPackaged)
      return this.cachedManifest = null, this.setState({
        status: "idle",
        latestVersion: void 0,
        message: "UPDATE_CHECK_DISABLED_IN_DEV"
      }), {
        supported: !1,
        available: !1,
        status: "disabled",
        currentVersion: e,
        message: "UPDATE_CHECK_DISABLED_IN_DEV"
      };
    const t = process.env.LUIE_UPDATE_FEED_URL?.trim() ?? Os;
    if (!t)
      return this.cachedManifest = null, this.setState({
        status: "idle",
        latestVersion: void 0,
        message: "UPDATE_FEED_URL_NOT_CONFIGURED"
      }), {
        supported: !1,
        available: !1,
        status: "unconfigured",
        currentVersion: e,
        message: "UPDATE_FEED_URL_NOT_CONFIGURED"
      };
    let n;
    try {
      n = new URL(t);
    } catch {
      return this.cachedManifest = null, this.setState({
        status: "error",
        latestVersion: void 0,
        message: "UPDATE_FEED_URL_INVALID"
      }), {
        supported: !0,
        available: !1,
        status: "error",
        currentVersion: e,
        message: "UPDATE_FEED_URL_INVALID"
      };
    }
    if (n.protocol !== "https:")
      return this.cachedManifest = null, this.setState({
        status: "error",
        latestVersion: void 0,
        message: "UPDATE_FEED_URL_INSECURE"
      }), {
        supported: !0,
        available: !1,
        status: "error",
        currentVersion: e,
        message: "UPDATE_FEED_URL_INSECURE"
      };
    try {
      const l = await this.fetchFeed(n), i = Ms(e, l.latestVersion) < 0;
      return this.cachedManifest = i ? l.manifest : null, this.setState({
        status: i ? "available" : "idle",
        latestVersion: l.latestVersion,
        message: i ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        supported: !0,
        available: i,
        status: i ? "available" : "up-to-date",
        currentVersion: e,
        latestVersion: l.latestVersion,
        message: i ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE"
      };
    } catch (l) {
      const i = l instanceof Error ? l.message : String(l);
      return this.cachedManifest = null, this.setState({
        status: "error",
        message: `UPDATE_CHECK_FAILED:${i}`
      }), {
        supported: !0,
        available: !1,
        status: "error",
        currentVersion: e,
        message: `UPDATE_CHECK_FAILED:${i}`
      };
    }
  }
  async readArtifactFromMeta(e) {
    if (!await Ze(e)) return null;
    try {
      const t = await je.readFile(e, "utf-8"), n = JSON.parse(t);
      return Gs(n) ? n : null;
    } catch {
      return null;
    }
  }
  async getState() {
    const e = await Ze(this.getRollbackMetaPath()), t = await this.readArtifactFromMeta(this.getPendingMetaPath()), n = await this.readArtifactFromMeta(this.getCurrentMetaPath()), l = t ?? n ?? this.state.artifact;
    return this.setState({
      rollbackAvailable: e,
      artifact: l ?? void 0,
      status: this.state.status === "checking" || this.state.status === "downloading" || this.state.status === "applying" ? this.state.status : l ? "downloaded" : this.state.status === "error" ? "error" : this.state.latestVersion ? "available" : "idle"
    }), this.state;
  }
  async computeFileSha256(e) {
    const t = await je.readFile(e);
    return Aa("sha256").update(t).digest("hex");
  }
  async tryLaunchInstaller(e) {
    const t = e.toLowerCase();
    if (![".exe", ".msi", ".dmg", ".pkg", ".appimage", ".deb", ".rpm"].some((i) => t.endsWith(i)))
      return !1;
    const l = await Oo.openPath(e);
    return l ? (Yt.warn("Failed to launch downloaded update artifact", {
      filePath: e,
      launchError: l
    }), !1) : (setTimeout(() => {
      try {
        qe.quit();
      } catch (i) {
        Yt.warn("Failed to quit app after launching installer", { error: i });
      }
    }, 180), !0);
  }
  async ensureManifestForDownload() {
    if (this.cachedManifest) return this.cachedManifest;
    if (!(await this.checkForUpdate()).available || !this.cachedManifest)
      throw new Error("UPDATE_NOT_AVAILABLE");
    return this.cachedManifest;
  }
  async downloadUpdate() {
    return this.inFlightDownload ? this.inFlightDownload : (this.inFlightDownload = this.downloadUpdateInternal().finally(() => {
      this.inFlightDownload = null;
    }), this.inFlightDownload);
  }
  async downloadUpdateInternal() {
    if (!qe.isPackaged)
      return {
        success: !1,
        message: "UPDATE_DOWNLOAD_DISABLED_IN_DEV"
      };
    let e;
    try {
      e = await this.ensureManifestForDownload();
    } catch (s) {
      const g = s instanceof Error ? s.message : String(s);
      return this.setState({ status: "error", message: `UPDATE_DOWNLOAD_FAILED:${g}` }), {
        success: !1,
        message: `UPDATE_DOWNLOAD_FAILED:${g}`
      };
    }
    this.setState({
      status: "downloading",
      latestVersion: e.version,
      message: "UPDATE_DOWNLOADING"
    });
    const t = this.getUpdateDir();
    await je.mkdir(t, { recursive: !0 });
    const n = `luie-${e.version}-${Date.now()}.bin`, l = wt.join(t, `${n}.part`), i = wt.join(t, n), o = new AbortController(), p = setTimeout(() => o.abort(), Oa * 4);
    let c = null;
    const b = await fetch(e.url, {
      method: "GET",
      signal: o.signal
    }).catch((s) => {
      throw new Error(`UPDATE_DOWNLOAD_REQUEST_FAILED:${String(s)}`);
    });
    if (!b.ok)
      throw clearTimeout(p), new Error(`UPDATE_DOWNLOAD_HTTP_${b.status}`);
    const E = b.headers.get("content-length"), d = E && Number.isFinite(Number(E)) ? Number(E) : void 0;
    if (d && d > Pa)
      throw clearTimeout(p), new Error("UPDATE_DOWNLOAD_TOO_LARGE");
    if (!b.body)
      throw clearTimeout(p), new Error("UPDATE_DOWNLOAD_BODY_MISSING");
    try {
      const s = b.body.getReader(), g = Aa("sha256");
      let v = 0;
      for (c = await je.open(l, "w"); ; ) {
        const { done: C, value: O } = await s.read();
        if (C) break;
        if (!O) continue;
        const B = Buffer.from(O);
        if (v += B.length, v > Pa)
          throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
        g.update(B), await c.write(B);
      }
      if (await c.close(), c = null, clearTimeout(p), e.size && e.size !== v)
        throw new Error(`UPDATE_DOWNLOAD_SIZE_MISMATCH:${e.size}:${v}`);
      const S = g.digest("hex");
      if (e.sha256 && S !== e.sha256)
        throw new Error("UPDATE_DOWNLOAD_HASH_MISMATCH");
      await je.rename(l, i);
      const R = {
        version: e.version,
        filePath: i,
        sha256: S,
        size: v,
        sourceUrl: e.url,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, u = await this.readArtifactFromMeta(this.getPendingMetaPath());
      u?.filePath && u.filePath !== R.filePath && await je.rm(u.filePath, { force: !0 }).catch(() => {
      });
      const _ = this.getPendingMetaPath(), T = `${_}.tmp`;
      return await je.writeFile(T, JSON.stringify(R, null, 2), "utf-8"), await je.rename(T, _), this.setState({
        status: "downloaded",
        latestVersion: R.version,
        artifact: R,
        message: "UPDATE_DOWNLOADED",
        rollbackAvailable: await Ze(this.getRollbackMetaPath())
      }), {
        success: !0,
        message: "UPDATE_DOWNLOAD_OK",
        artifact: R
      };
    } catch (s) {
      c && await c.close().catch(() => {
      }), clearTimeout(p), await je.rm(l, { force: !0 }).catch(() => {
      });
      const g = s instanceof Error ? s.message : String(s);
      return this.setState({
        status: "error",
        message: `UPDATE_DOWNLOAD_FAILED:${g}`
      }), {
        success: !1,
        message: `UPDATE_DOWNLOAD_FAILED:${g}`
      };
    }
  }
  async applyUpdate() {
    if (!qe.isPackaged)
      return {
        success: !1,
        message: "UPDATE_APPLY_DISABLED_IN_DEV",
        rollbackAvailable: await Ze(this.getRollbackMetaPath()),
        relaunched: !1
      };
    const e = await this.readArtifactFromMeta(this.getPendingMetaPath());
    if (!e)
      return {
        success: !1,
        message: "UPDATE_APPLY_NO_PENDING_ARTIFACT",
        rollbackAvailable: await Ze(this.getRollbackMetaPath()),
        relaunched: !1
      };
    if (!await Ze(e.filePath))
      return {
        success: !1,
        message: "UPDATE_APPLY_PENDING_FILE_MISSING",
        rollbackAvailable: await Ze(this.getRollbackMetaPath()),
        relaunched: !1
      };
    if (await this.computeFileSha256(e.filePath) !== e.sha256)
      return {
        success: !1,
        message: "UPDATE_APPLY_HASH_MISMATCH",
        rollbackAvailable: await Ze(this.getRollbackMetaPath()),
        relaunched: !1
      };
    const n = this.getRollbackMetaPath(), l = this.getCurrentMetaPath();
    await Ze(n) && await je.rm(n, { force: !0 }), await Ze(l) && await je.rename(l, n), await je.rename(this.getPendingMetaPath(), l);
    const i = await Ze(n);
    return this.setState({
      status: "applying",
      latestVersion: e.version,
      artifact: e,
      rollbackAvailable: i,
      message: "UPDATE_APPLY_RELAUNCH_SCHEDULED"
    }), process.env.LUIE_TEST_DISABLE_UPDATE_RELAUNCH === "1" ? (this.setState({
      status: "downloaded"
    }), {
      success: !0,
      message: "UPDATE_APPLY_OK_TEST_MODE",
      rollbackAvailable: i,
      relaunched: !1
    }) : await this.tryLaunchInstaller(e.filePath) ? {
      success: !0,
      message: "UPDATE_APPLY_INSTALLER_LAUNCHED",
      rollbackAvailable: i,
      relaunched: !1
    } : (setTimeout(() => {
      try {
        qe.relaunch(), qe.exit(0);
      } catch (p) {
        Yt.error("Failed to relaunch app for update apply", { error: p });
      }
    }, 150), {
      success: !0,
      message: "UPDATE_APPLY_OK",
      rollbackAvailable: i,
      relaunched: !0
    });
  }
  async rollbackUpdate() {
    const e = this.getRollbackMetaPath(), t = await this.readArtifactFromMeta(e);
    if (!t)
      return {
        success: !1,
        message: "UPDATE_ROLLBACK_NOT_AVAILABLE"
      };
    if (!await Ze(t.filePath))
      return {
        success: !1,
        message: "UPDATE_ROLLBACK_FILE_MISSING"
      };
    if (await this.computeFileSha256(t.filePath) !== t.sha256)
      return {
        success: !1,
        message: "UPDATE_ROLLBACK_HASH_MISMATCH"
      };
    const l = this.getCurrentMetaPath(), i = wt.join(this.getUpdateDir(), `stale-${Date.now()}.json`);
    return await Ze(l) && await je.rename(l, i), await je.rename(e, l), this.setState({
      status: "downloaded",
      latestVersion: t.version,
      artifact: t,
      rollbackAvailable: !1,
      message: "UPDATE_ROLLBACK_OK"
    }), {
      success: !0,
      message: "UPDATE_ROLLBACK_OK",
      restoredVersion: t.version
    };
  }
}
const Lt = new Ys();
function Zs(a) {
  Ce(a, [
    {
      channel: U.WINDOW_CLOSE,
      logTag: "WINDOW_CLOSE",
      failMessage: "Failed to close window",
      handler: () => {
        a.info("WINDOW_CLOSE requested from renderer");
        const e = Tt.getMainWindow();
        return e ? (e.close(), !0) : !1;
      }
    },
    {
      channel: U.APP_QUIT,
      logTag: "APP_QUIT",
      failMessage: "Failed to quit app",
      handler: () => (a.info("APP_QUIT requested from renderer"), qe.quit(), !0)
    },
    {
      channel: U.APP_GET_VERSION,
      logTag: "APP_GET_VERSION",
      failMessage: "Failed to get app version",
      handler: () => ({
        version: qe.getVersion()
      })
    },
    {
      channel: U.APP_CHECK_UPDATE,
      logTag: "APP_CHECK_UPDATE",
      failMessage: "Failed to check app update",
      handler: async () => Lt.checkForUpdate()
    },
    {
      channel: U.APP_GET_UPDATE_STATE,
      logTag: "APP_GET_UPDATE_STATE",
      failMessage: "Failed to get app update state",
      handler: async () => Lt.getState()
    },
    {
      channel: U.APP_DOWNLOAD_UPDATE,
      logTag: "APP_DOWNLOAD_UPDATE",
      failMessage: "Failed to download app update",
      handler: async () => Lt.downloadUpdate()
    },
    {
      channel: U.APP_APPLY_UPDATE,
      logTag: "APP_APPLY_UPDATE",
      failMessage: "Failed to apply app update",
      handler: async () => Lt.applyUpdate()
    },
    {
      channel: U.APP_ROLLBACK_UPDATE,
      logTag: "APP_ROLLBACK_UPDATE",
      failMessage: "Failed to rollback app update",
      handler: async () => Lt.rollbackUpdate()
    },
    {
      channel: U.APP_GET_BOOTSTRAP_STATUS,
      logTag: "APP_GET_BOOTSTRAP_STATUS",
      failMessage: "Failed to get bootstrap status",
      handler: () => (ro(), ao())
    },
    {
      channel: U.WINDOW_MAXIMIZE,
      logTag: "WINDOW_MAXIMIZE",
      failMessage: "Failed to maximize window",
      handler: () => {
        const e = Tt.getMainWindow();
        return e ? (e.isMaximized() || e.maximize(), e.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_TOGGLE_FULLSCREEN,
      logTag: "WINDOW_TOGGLE_FULLSCREEN",
      failMessage: "Failed to toggle fullscreen",
      handler: () => {
        const e = Tt.getMainWindow();
        return e ? (process.platform === "darwin" ? e.setSimpleFullScreen(!e.isSimpleFullScreen()) : e.setFullScreen(!e.isFullScreen()), e.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_SET_FULLSCREEN,
      logTag: "WINDOW_SET_FULLSCREEN",
      failMessage: "Failed to set fullscreen",
      argsSchema: eo,
      handler: (e) => {
        const t = Tt.getMainWindow();
        return t ? (process.platform === "darwin" ? t.setSimpleFullScreen(e) : t.setFullScreen(e), t.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_OPEN_EXPORT,
      logTag: "WINDOW_OPEN_EXPORT",
      failMessage: "Failed to open export window",
      argsSchema: to,
      handler: (e) => {
        if (a.info("WINDOW_OPEN_EXPORT received", { chapterId: e }), !e)
          throw a.error("Invalid chapterId for export", { chapterId: e, type: typeof e }), new ge(
            pe.REQUIRED_FIELD_MISSING,
            "Chapter ID is required to open export window",
            { chapterId: e, receivedType: typeof e }
          );
        return a.info("Creating export window", { chapterId: e }), Tt.createExportWindow(e), a.info("Export window created successfully", { chapterId: e }), !0;
      }
    },
    {
      channel: U.WINDOW_OPEN_WORLD_GRAPH,
      logTag: "WINDOW_OPEN_WORLD_GRAPH",
      failMessage: "Failed to open world graph window",
      handler: () => (a.info("WINDOW_OPEN_WORLD_GRAPH received"), a.info("Creating world graph window"), Tt.createWorldGraphWindow(), a.info("World graph window created successfully"), !0)
    }
  ]);
}
function Vs(a) {
  Ts(a.logger), no(a.logger), Zs(a.logger), As(a.logger), Rs(a.logger), Ss(a.logger), xs(a.logger);
}
function Ks(a, e) {
  Ce(a, [
    {
      channel: U.CHARACTER_CREATE,
      logTag: "CHARACTER_CREATE",
      failMessage: "Failed to create character",
      argsSchema: K.tuple([io]),
      handler: (t) => e.createCharacter(t)
    },
    {
      channel: U.CHARACTER_GET,
      logTag: "CHARACTER_GET",
      failMessage: "Failed to get character",
      argsSchema: K.tuple([va]),
      handler: (t) => e.getCharacter(t)
    },
    {
      channel: U.CHARACTER_GET_ALL,
      logTag: "CHARACTER_GET_ALL",
      failMessage: "Failed to get all characters",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllCharacters(t)
    },
    {
      channel: U.CHARACTER_UPDATE,
      logTag: "CHARACTER_UPDATE",
      failMessage: "Failed to update character",
      argsSchema: K.tuple([oo]),
      handler: (t) => e.updateCharacter(t)
    },
    {
      channel: U.CHARACTER_DELETE,
      logTag: "CHARACTER_DELETE",
      failMessage: "Failed to delete character",
      argsSchema: K.tuple([va]),
      handler: (t) => e.deleteCharacter(t)
    }
  ]);
}
function $s(a, e) {
  Ce(a, [
    {
      channel: U.TERM_CREATE,
      logTag: "TERM_CREATE",
      failMessage: "Failed to create term",
      argsSchema: K.tuple([so]),
      handler: (t) => e.createTerm(t)
    },
    {
      channel: U.TERM_GET,
      logTag: "TERM_GET",
      failMessage: "Failed to get term",
      argsSchema: K.tuple([wa]),
      handler: (t) => e.getTerm(t)
    },
    {
      channel: U.TERM_GET_ALL,
      logTag: "TERM_GET_ALL",
      failMessage: "Failed to get all terms",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllTerms(t)
    },
    {
      channel: U.TERM_UPDATE,
      logTag: "TERM_UPDATE",
      failMessage: "Failed to update term",
      argsSchema: K.tuple([lo]),
      handler: (t) => e.updateTerm(t)
    },
    {
      channel: U.TERM_DELETE,
      logTag: "TERM_DELETE",
      failMessage: "Failed to delete term",
      argsSchema: K.tuple([wa]),
      handler: (t) => e.deleteTerm(t)
    }
  ]);
}
function Xs(a, e) {
  Ce(a, [
    {
      channel: U.EVENT_CREATE,
      logTag: "EVENT_CREATE",
      failMessage: "Failed to create event",
      argsSchema: K.tuple([ho]),
      handler: (t) => e.createEvent(t)
    },
    {
      channel: U.EVENT_GET,
      logTag: "EVENT_GET",
      failMessage: "Failed to get event",
      argsSchema: K.tuple([ya]),
      handler: (t) => e.getEvent(t)
    },
    {
      channel: U.EVENT_GET_ALL,
      logTag: "EVENT_GET_ALL",
      failMessage: "Failed to get all events",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllEvents(t)
    },
    {
      channel: U.EVENT_UPDATE,
      logTag: "EVENT_UPDATE",
      failMessage: "Failed to update event",
      argsSchema: K.tuple([fo]),
      handler: (t) => e.updateEvent(t)
    },
    {
      channel: U.EVENT_DELETE,
      logTag: "EVENT_DELETE",
      failMessage: "Failed to delete event",
      argsSchema: K.tuple([ya]),
      handler: (t) => e.deleteEvent(t)
    }
  ]);
}
function Js(a, e) {
  Ce(a, [
    {
      channel: U.FACTION_CREATE,
      logTag: "FACTION_CREATE",
      failMessage: "Failed to create faction",
      argsSchema: K.tuple([co]),
      handler: (t) => e.createFaction(t)
    },
    {
      channel: U.FACTION_GET,
      logTag: "FACTION_GET",
      failMessage: "Failed to get faction",
      argsSchema: K.tuple([Ea]),
      handler: (t) => e.getFaction(t)
    },
    {
      channel: U.FACTION_GET_ALL,
      logTag: "FACTION_GET_ALL",
      failMessage: "Failed to get all factions",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllFactions(t)
    },
    {
      channel: U.FACTION_UPDATE,
      logTag: "FACTION_UPDATE",
      failMessage: "Failed to update faction",
      argsSchema: K.tuple([uo]),
      handler: (t) => e.updateFaction(t)
    },
    {
      channel: U.FACTION_DELETE,
      logTag: "FACTION_DELETE",
      failMessage: "Failed to delete faction",
      argsSchema: K.tuple([Ea]),
      handler: (t) => e.deleteFaction(t)
    }
  ]);
}
function Qs(a, e) {
  Ce(a, [
    {
      channel: U.WORLD_ENTITY_CREATE,
      logTag: "WORLD_ENTITY_CREATE",
      failMessage: "Failed to create world entity",
      argsSchema: K.tuple([po]),
      handler: (t) => e.createWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_GET,
      logTag: "WORLD_ENTITY_GET",
      failMessage: "Failed to get world entity",
      argsSchema: K.tuple([ba]),
      handler: (t) => e.getWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_GET_ALL,
      logTag: "WORLD_ENTITY_GET_ALL",
      failMessage: "Failed to get all world entities",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getAllWorldEntities(t)
    },
    {
      channel: U.WORLD_ENTITY_UPDATE,
      logTag: "WORLD_ENTITY_UPDATE",
      failMessage: "Failed to update world entity",
      argsSchema: K.tuple([go]),
      handler: (t) => e.updateWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_UPDATE_POSITION,
      logTag: "WORLD_ENTITY_UPDATE_POSITION",
      failMessage: "Failed to update world entity position",
      argsSchema: K.tuple([mo]),
      handler: (t) => e.updateWorldEntityPosition(t)
    },
    {
      channel: U.WORLD_ENTITY_DELETE,
      logTag: "WORLD_ENTITY_DELETE",
      failMessage: "Failed to delete world entity",
      argsSchema: K.tuple([ba]),
      handler: (t) => e.deleteWorldEntity(t)
    }
  ]);
}
function el(a, e, t) {
  Ce(a, [
    {
      channel: U.ENTITY_RELATION_CREATE,
      logTag: "ENTITY_RELATION_CREATE",
      failMessage: "Failed to create entity relation",
      argsSchema: K.tuple([_o]),
      handler: (n) => e.createRelation(n)
    },
    {
      channel: U.ENTITY_RELATION_GET_ALL,
      logTag: "ENTITY_RELATION_GET_ALL",
      failMessage: "Failed to get entity relations",
      argsSchema: K.tuple([Ye]),
      handler: (n) => e.getAllRelations(n)
    },
    {
      channel: U.ENTITY_RELATION_UPDATE,
      logTag: "ENTITY_RELATION_UPDATE",
      failMessage: "Failed to update entity relation",
      argsSchema: K.tuple([vo]),
      handler: (n) => e.updateRelation(n)
    },
    {
      channel: U.ENTITY_RELATION_DELETE,
      logTag: "ENTITY_RELATION_DELETE",
      failMessage: "Failed to delete entity relation",
      argsSchema: K.tuple([wo]),
      handler: (n) => e.deleteRelation(n)
    },
    {
      channel: U.WORLD_GRAPH_GET,
      logTag: "WORLD_GRAPH_GET",
      failMessage: "Failed to get world graph",
      argsSchema: K.tuple([Ye]),
      handler: (n) => e.getWorldGraph(n)
    },
    {
      channel: U.WORLD_GRAPH_GET_MENTIONS,
      logTag: "WORLD_GRAPH_GET_MENTIONS",
      failMessage: "Failed to get world graph mentions",
      argsSchema: K.tuple([yo]),
      handler: (n) => t.getMentions(n)
    }
  ]);
}
function tl(a) {
  Ks(a.logger, a.characterService), $s(a.logger, a.termService), Xs(a.logger, a.eventService), Js(a.logger, a.factionService), Qs(a.logger, a.worldEntityService), el(
    a.logger,
    a.entityRelationService,
    a.worldMentionService
  );
}
function rl(a, e) {
  Ce(a, [
    {
      channel: U.AUTO_SAVE,
      logTag: "AUTO_SAVE",
      failMessage: "Failed to auto save",
      argsSchema: Eo,
      handler: async (t, n, l) => (await e.triggerSave(t, n, l), { success: !0 })
    }
  ]);
}
function al(a, e) {
  Ce(a, [
    {
      channel: U.SNAPSHOT_CREATE,
      logTag: "SNAPSHOT_CREATE",
      failMessage: "Failed to create snapshot",
      argsSchema: K.tuple([bo]),
      handler: (t) => e.createSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_GET_BY_PROJECT,
      logTag: "SNAPSHOT_GET_BY_PROJECT",
      failMessage: "Failed to get snapshots by project",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getSnapshotsByProject(t)
    },
    {
      channel: U.SNAPSHOT_GET_ALL,
      logTag: "SNAPSHOT_GET_ALL",
      failMessage: "Failed to get snapshots",
      argsSchema: K.tuple([Ye]),
      handler: (t) => e.getSnapshotsByProject(t)
    },
    {
      channel: U.SNAPSHOT_GET_BY_CHAPTER,
      logTag: "SNAPSHOT_GET_BY_CHAPTER",
      failMessage: "Failed to get snapshots by chapter",
      argsSchema: K.tuple([Ot]),
      handler: (t) => e.getSnapshotsByChapter(t)
    },
    {
      channel: U.SNAPSHOT_DELETE,
      logTag: "SNAPSHOT_DELETE",
      failMessage: "Failed to delete snapshot",
      argsSchema: K.tuple([Ta]),
      handler: (t) => e.deleteSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_RESTORE,
      logTag: "SNAPSHOT_RESTORE",
      failMessage: "Failed to restore snapshot",
      argsSchema: K.tuple([Ta]),
      handler: (t) => e.restoreSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_IMPORT_FILE,
      logTag: "SNAPSHOT_IMPORT_FILE",
      failMessage: "Failed to import snapshot file",
      argsSchema: K.tuple([K.string()]),
      handler: (t) => e.importSnapshotFile(t)
    }
  ]);
}
var lr = {}, hr = {}, Ge = {}, Zt = { exports: {} }, Vt = { exports: {} }, Ma;
function tr() {
  if (Ma) return Vt.exports;
  Ma = 1, typeof process > "u" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0 ? Vt.exports = { nextTick: a } : Vt.exports = process;
  function a(e, t, n, l) {
    if (typeof e != "function")
      throw new TypeError('"callback" argument must be a function');
    var i = arguments.length, o, p;
    switch (i) {
      case 0:
      case 1:
        return process.nextTick(e);
      case 2:
        return process.nextTick(function() {
          e.call(null, t);
        });
      case 3:
        return process.nextTick(function() {
          e.call(null, t, n);
        });
      case 4:
        return process.nextTick(function() {
          e.call(null, t, n, l);
        });
      default:
        for (o = new Array(i - 1), p = 0; p < o.length; )
          o[p++] = arguments[p];
        return process.nextTick(function() {
          e.apply(null, o);
        });
    }
  }
  return Vt.exports;
}
var fr, Ua;
function nl() {
  if (Ua) return fr;
  Ua = 1;
  var a = {}.toString;
  return fr = Array.isArray || function(e) {
    return a.call(e) == "[object Array]";
  }, fr;
}
var cr, Ba;
function hi() {
  return Ba || (Ba = 1, cr = ni), cr;
}
var Kt = { exports: {} }, Wa;
function rr() {
  return Wa || (Wa = 1, (function(a, e) {
    var t = ii, n = t.Buffer;
    function l(o, p) {
      for (var c in o)
        p[c] = o[c];
    }
    n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow ? a.exports = t : (l(t, e), e.Buffer = i);
    function i(o, p, c) {
      return n(o, p, c);
    }
    l(n, i), i.from = function(o, p, c) {
      if (typeof o == "number")
        throw new TypeError("Argument must not be a number");
      return n(o, p, c);
    }, i.alloc = function(o, p, c) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      var b = n(o);
      return p !== void 0 ? typeof c == "string" ? b.fill(p, c) : b.fill(p) : b.fill(0), b;
    }, i.allocUnsafe = function(o) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      return n(o);
    }, i.allocUnsafeSlow = function(o) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      return t.SlowBuffer(o);
    };
  })(Kt, Kt.exports)), Kt.exports;
}
var ke = {}, ja;
function Mt() {
  if (ja) return ke;
  ja = 1;
  function a(S) {
    return Array.isArray ? Array.isArray(S) : v(S) === "[object Array]";
  }
  ke.isArray = a;
  function e(S) {
    return typeof S == "boolean";
  }
  ke.isBoolean = e;
  function t(S) {
    return S === null;
  }
  ke.isNull = t;
  function n(S) {
    return S == null;
  }
  ke.isNullOrUndefined = n;
  function l(S) {
    return typeof S == "number";
  }
  ke.isNumber = l;
  function i(S) {
    return typeof S == "string";
  }
  ke.isString = i;
  function o(S) {
    return typeof S == "symbol";
  }
  ke.isSymbol = o;
  function p(S) {
    return S === void 0;
  }
  ke.isUndefined = p;
  function c(S) {
    return v(S) === "[object RegExp]";
  }
  ke.isRegExp = c;
  function b(S) {
    return typeof S == "object" && S !== null;
  }
  ke.isObject = b;
  function E(S) {
    return v(S) === "[object Date]";
  }
  ke.isDate = E;
  function d(S) {
    return v(S) === "[object Error]" || S instanceof Error;
  }
  ke.isError = d;
  function s(S) {
    return typeof S == "function";
  }
  ke.isFunction = s;
  function g(S) {
    return S === null || typeof S == "boolean" || typeof S == "number" || typeof S == "string" || typeof S == "symbol" || // ES6 symbol
    typeof S > "u";
  }
  ke.isPrimitive = g, ke.isBuffer = ii.Buffer.isBuffer;
  function v(S) {
    return Object.prototype.toString.call(S);
  }
  return ke;
}
var $t = { exports: {} }, Xt = { exports: {} }, Ha;
function il() {
  return Ha || (Ha = 1, typeof Object.create == "function" ? Xt.exports = function(e, t) {
    t && (e.super_ = t, e.prototype = Object.create(t.prototype, {
      constructor: {
        value: e,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }));
  } : Xt.exports = function(e, t) {
    if (t) {
      e.super_ = t;
      var n = function() {
      };
      n.prototype = t.prototype, e.prototype = new n(), e.prototype.constructor = e;
    }
  }), Xt.exports;
}
var za;
function Ut() {
  if (za) return $t.exports;
  za = 1;
  try {
    var a = zo("util");
    if (typeof a.inherits != "function") throw "";
    $t.exports = a.inherits;
  } catch {
    $t.exports = il();
  }
  return $t.exports;
}
var ur = { exports: {} }, Ga;
function ol() {
  return Ga || (Ga = 1, (function(a) {
    function e(i, o) {
      if (!(i instanceof o))
        throw new TypeError("Cannot call a class as a function");
    }
    var t = rr().Buffer, n = fa;
    function l(i, o, p) {
      i.copy(o, p);
    }
    a.exports = (function() {
      function i() {
        e(this, i), this.head = null, this.tail = null, this.length = 0;
      }
      return i.prototype.push = function(p) {
        var c = { data: p, next: null };
        this.length > 0 ? this.tail.next = c : this.head = c, this.tail = c, ++this.length;
      }, i.prototype.unshift = function(p) {
        var c = { data: p, next: this.head };
        this.length === 0 && (this.tail = c), this.head = c, ++this.length;
      }, i.prototype.shift = function() {
        if (this.length !== 0) {
          var p = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, p;
        }
      }, i.prototype.clear = function() {
        this.head = this.tail = null, this.length = 0;
      }, i.prototype.join = function(p) {
        if (this.length === 0) return "";
        for (var c = this.head, b = "" + c.data; c = c.next; )
          b += p + c.data;
        return b;
      }, i.prototype.concat = function(p) {
        if (this.length === 0) return t.alloc(0);
        for (var c = t.allocUnsafe(p >>> 0), b = this.head, E = 0; b; )
          l(b.data, c, E), E += b.data.length, b = b.next;
        return c;
      }, i;
    })(), n && n.inspect && n.inspect.custom && (a.exports.prototype[n.inspect.custom] = function() {
      var i = n.inspect({ length: this.length });
      return this.constructor.name + " " + i;
    });
  })(ur)), ur.exports;
}
var dr, qa;
function fi() {
  if (qa) return dr;
  qa = 1;
  var a = tr();
  function e(l, i) {
    var o = this, p = this._readableState && this._readableState.destroyed, c = this._writableState && this._writableState.destroyed;
    return p || c ? (i ? i(l) : l && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, a.nextTick(n, this, l)) : a.nextTick(n, this, l)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(l || null, function(b) {
      !i && b ? o._writableState ? o._writableState.errorEmitted || (o._writableState.errorEmitted = !0, a.nextTick(n, o, b)) : a.nextTick(n, o, b) : i && i(b);
    }), this);
  }
  function t() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1);
  }
  function n(l, i) {
    l.emit("error", i);
  }
  return dr = {
    destroy: e,
    undestroy: t
  }, dr;
}
var pr, Ya;
function sl() {
  return Ya || (Ya = 1, pr = fa.deprecate), pr;
}
var gr, Za;
function ci() {
  if (Za) return gr;
  Za = 1;
  var a = tr();
  gr = S;
  function e(x) {
    var D = this;
    this.next = null, this.entry = null, this.finish = function() {
      ce(D, x);
    };
  }
  var t = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : a.nextTick, n;
  S.WritableState = g;
  var l = Object.create(Mt());
  l.inherits = Ut();
  var i = {
    deprecate: sl()
  }, o = hi(), p = rr().Buffer, c = (typeof Ue < "u" ? Ue : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function b(x) {
    return p.from(x);
  }
  function E(x) {
    return p.isBuffer(x) || x instanceof c;
  }
  var d = fi();
  l.inherits(S, o);
  function s() {
  }
  function g(x, D) {
    n = n || Pt(), x = x || {};
    var M = D instanceof n;
    this.objectMode = !!x.objectMode, M && (this.objectMode = this.objectMode || !!x.writableObjectMode);
    var J = x.highWaterMark, re = x.writableHighWaterMark, ae = this.objectMode ? 16 : 16 * 1024;
    J || J === 0 ? this.highWaterMark = J : M && (re || re === 0) ? this.highWaterMark = re : this.highWaterMark = ae, this.highWaterMark = Math.floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var se = x.decodeStrings === !1;
    this.decodeStrings = !se, this.defaultEncoding = x.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(ye) {
      F(D, ye);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new e(this);
  }
  g.prototype.getBuffer = function() {
    for (var D = this.bufferedRequest, M = []; D; )
      M.push(D), D = D.next;
    return M;
  }, (function() {
    try {
      Object.defineProperty(g.prototype, "buffer", {
        get: i.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var v;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (v = Function.prototype[Symbol.hasInstance], Object.defineProperty(S, Symbol.hasInstance, {
    value: function(x) {
      return v.call(this, x) ? !0 : this !== S ? !1 : x && x._writableState instanceof g;
    }
  })) : v = function(x) {
    return x instanceof this;
  };
  function S(x) {
    if (n = n || Pt(), !v.call(S, this) && !(this instanceof n))
      return new S(x);
    this._writableState = new g(x, this), this.writable = !0, x && (typeof x.write == "function" && (this._write = x.write), typeof x.writev == "function" && (this._writev = x.writev), typeof x.destroy == "function" && (this._destroy = x.destroy), typeof x.final == "function" && (this._final = x.final)), o.call(this);
  }
  S.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function R(x, D) {
    var M = new Error("write after end");
    x.emit("error", M), a.nextTick(D, M);
  }
  function u(x, D, M, J) {
    var re = !0, ae = !1;
    return M === null ? ae = new TypeError("May not write null values to stream") : typeof M != "string" && M !== void 0 && !D.objectMode && (ae = new TypeError("Invalid non-string/buffer chunk")), ae && (x.emit("error", ae), a.nextTick(J, ae), re = !1), re;
  }
  S.prototype.write = function(x, D, M) {
    var J = this._writableState, re = !1, ae = !J.objectMode && E(x);
    return ae && !p.isBuffer(x) && (x = b(x)), typeof D == "function" && (M = D, D = null), ae ? D = "buffer" : D || (D = J.defaultEncoding), typeof M != "function" && (M = s), J.ended ? R(this, M) : (ae || u(this, J, x, M)) && (J.pendingcb++, re = T(this, J, ae, x, D, M)), re;
  }, S.prototype.cork = function() {
    var x = this._writableState;
    x.corked++;
  }, S.prototype.uncork = function() {
    var x = this._writableState;
    x.corked && (x.corked--, !x.writing && !x.corked && !x.bufferProcessing && x.bufferedRequest && te(this, x));
  }, S.prototype.setDefaultEncoding = function(D) {
    if (typeof D == "string" && (D = D.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((D + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + D);
    return this._writableState.defaultEncoding = D, this;
  };
  function _(x, D, M) {
    return !x.objectMode && x.decodeStrings !== !1 && typeof D == "string" && (D = p.from(D, M)), D;
  }
  Object.defineProperty(S.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function T(x, D, M, J, re, ae) {
    if (!M) {
      var se = _(D, J, re);
      J !== se && (M = !0, re = "buffer", J = se);
    }
    var ye = D.objectMode ? 1 : J.length;
    D.length += ye;
    var Ee = D.length < D.highWaterMark;
    if (Ee || (D.needDrain = !0), D.writing || D.corked) {
      var de = D.lastBufferedRequest;
      D.lastBufferedRequest = {
        chunk: J,
        encoding: re,
        isBuf: M,
        callback: ae,
        next: null
      }, de ? de.next = D.lastBufferedRequest : D.bufferedRequest = D.lastBufferedRequest, D.bufferedRequestCount += 1;
    } else
      C(x, D, !1, ye, J, re, ae);
    return Ee;
  }
  function C(x, D, M, J, re, ae, se) {
    D.writelen = J, D.writecb = se, D.writing = !0, D.sync = !0, M ? x._writev(re, D.onwrite) : x._write(re, ae, D.onwrite), D.sync = !1;
  }
  function O(x, D, M, J, re) {
    --D.pendingcb, M ? (a.nextTick(re, J), a.nextTick(he, x, D), x._writableState.errorEmitted = !0, x.emit("error", J)) : (re(J), x._writableState.errorEmitted = !0, x.emit("error", J), he(x, D));
  }
  function B(x) {
    x.writing = !1, x.writecb = null, x.length -= x.writelen, x.writelen = 0;
  }
  function F(x, D) {
    var M = x._writableState, J = M.sync, re = M.writecb;
    if (B(M), D) O(x, M, J, D, re);
    else {
      var ae = le(M);
      !ae && !M.corked && !M.bufferProcessing && M.bufferedRequest && te(x, M), J ? t(q, x, M, ae, re) : q(x, M, ae, re);
    }
  }
  function q(x, D, M, J) {
    M || ee(x, D), D.pendingcb--, J(), he(x, D);
  }
  function ee(x, D) {
    D.length === 0 && D.needDrain && (D.needDrain = !1, x.emit("drain"));
  }
  function te(x, D) {
    D.bufferProcessing = !0;
    var M = D.bufferedRequest;
    if (x._writev && M && M.next) {
      var J = D.bufferedRequestCount, re = new Array(J), ae = D.corkedRequestsFree;
      ae.entry = M;
      for (var se = 0, ye = !0; M; )
        re[se] = M, M.isBuf || (ye = !1), M = M.next, se += 1;
      re.allBuffers = ye, C(x, D, !0, D.length, re, "", ae.finish), D.pendingcb++, D.lastBufferedRequest = null, ae.next ? (D.corkedRequestsFree = ae.next, ae.next = null) : D.corkedRequestsFree = new e(D), D.bufferedRequestCount = 0;
    } else {
      for (; M; ) {
        var Ee = M.chunk, de = M.encoding, w = M.callback, y = D.objectMode ? 1 : Ee.length;
        if (C(x, D, !1, y, Ee, de, w), M = M.next, D.bufferedRequestCount--, D.writing)
          break;
      }
      M === null && (D.lastBufferedRequest = null);
    }
    D.bufferedRequest = M, D.bufferProcessing = !1;
  }
  S.prototype._write = function(x, D, M) {
    M(new Error("_write() is not implemented"));
  }, S.prototype._writev = null, S.prototype.end = function(x, D, M) {
    var J = this._writableState;
    typeof x == "function" ? (M = x, x = null, D = null) : typeof D == "function" && (M = D, D = null), x != null && this.write(x, D), J.corked && (J.corked = 1, this.uncork()), J.ending || we(this, J, M);
  };
  function le(x) {
    return x.ending && x.length === 0 && x.bufferedRequest === null && !x.finished && !x.writing;
  }
  function oe(x, D) {
    x._final(function(M) {
      D.pendingcb--, M && x.emit("error", M), D.prefinished = !0, x.emit("prefinish"), he(x, D);
    });
  }
  function Z(x, D) {
    !D.prefinished && !D.finalCalled && (typeof x._final == "function" ? (D.pendingcb++, D.finalCalled = !0, a.nextTick(oe, x, D)) : (D.prefinished = !0, x.emit("prefinish")));
  }
  function he(x, D) {
    var M = le(D);
    return M && (Z(x, D), D.pendingcb === 0 && (D.finished = !0, x.emit("finish"))), M;
  }
  function we(x, D, M) {
    D.ending = !0, he(x, D), M && (D.finished ? a.nextTick(M) : x.once("finish", M)), D.ended = !0, x.writable = !1;
  }
  function ce(x, D, M) {
    var J = x.entry;
    for (x.entry = null; J; ) {
      var re = J.callback;
      D.pendingcb--, re(M), J = J.next;
    }
    D.corkedRequestsFree.next = x;
  }
  return Object.defineProperty(S.prototype, "destroyed", {
    get: function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    },
    set: function(x) {
      this._writableState && (this._writableState.destroyed = x);
    }
  }), S.prototype.destroy = d.destroy, S.prototype._undestroy = d.undestroy, S.prototype._destroy = function(x, D) {
    this.end(), D(x);
  }, gr;
}
var mr, Va;
function Pt() {
  if (Va) return mr;
  Va = 1;
  var a = tr(), e = Object.keys || function(d) {
    var s = [];
    for (var g in d)
      s.push(g);
    return s;
  };
  mr = c;
  var t = Object.create(Mt());
  t.inherits = Ut();
  var n = ui(), l = ci();
  t.inherits(c, n);
  for (var i = e(l.prototype), o = 0; o < i.length; o++) {
    var p = i[o];
    c.prototype[p] || (c.prototype[p] = l.prototype[p]);
  }
  function c(d) {
    if (!(this instanceof c)) return new c(d);
    n.call(this, d), l.call(this, d), d && d.readable === !1 && (this.readable = !1), d && d.writable === !1 && (this.writable = !1), this.allowHalfOpen = !0, d && d.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", b);
  }
  Object.defineProperty(c.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function b() {
    this.allowHalfOpen || this._writableState.ended || a.nextTick(E, this);
  }
  function E(d) {
    d.end();
  }
  return Object.defineProperty(c.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(d) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = d, this._writableState.destroyed = d);
    }
  }), c.prototype._destroy = function(d, s) {
    this.push(null), this.end(), a.nextTick(s, d);
  }, mr;
}
var _r = {}, Ka;
function $a() {
  if (Ka) return _r;
  Ka = 1;
  var a = rr().Buffer, e = a.isEncoding || function(u) {
    switch (u = "" + u, u && u.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return !0;
      default:
        return !1;
    }
  };
  function t(u) {
    if (!u) return "utf8";
    for (var _; ; )
      switch (u) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return u;
        default:
          if (_) return;
          u = ("" + u).toLowerCase(), _ = !0;
      }
  }
  function n(u) {
    var _ = t(u);
    if (typeof _ != "string" && (a.isEncoding === e || !e(u))) throw new Error("Unknown encoding: " + u);
    return _ || u;
  }
  _r.StringDecoder = l;
  function l(u) {
    this.encoding = n(u);
    var _;
    switch (this.encoding) {
      case "utf16le":
        this.text = d, this.end = s, _ = 4;
        break;
      case "utf8":
        this.fillLast = c, _ = 4;
        break;
      case "base64":
        this.text = g, this.end = v, _ = 3;
        break;
      default:
        this.write = S, this.end = R;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = a.allocUnsafe(_);
  }
  l.prototype.write = function(u) {
    if (u.length === 0) return "";
    var _, T;
    if (this.lastNeed) {
      if (_ = this.fillLast(u), _ === void 0) return "";
      T = this.lastNeed, this.lastNeed = 0;
    } else
      T = 0;
    return T < u.length ? _ ? _ + this.text(u, T) : this.text(u, T) : _ || "";
  }, l.prototype.end = E, l.prototype.text = b, l.prototype.fillLast = function(u) {
    if (this.lastNeed <= u.length)
      return u.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    u.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, u.length), this.lastNeed -= u.length;
  };
  function i(u) {
    return u <= 127 ? 0 : u >> 5 === 6 ? 2 : u >> 4 === 14 ? 3 : u >> 3 === 30 ? 4 : u >> 6 === 2 ? -1 : -2;
  }
  function o(u, _, T) {
    var C = _.length - 1;
    if (C < T) return 0;
    var O = i(_[C]);
    return O >= 0 ? (O > 0 && (u.lastNeed = O - 1), O) : --C < T || O === -2 ? 0 : (O = i(_[C]), O >= 0 ? (O > 0 && (u.lastNeed = O - 2), O) : --C < T || O === -2 ? 0 : (O = i(_[C]), O >= 0 ? (O > 0 && (O === 2 ? O = 0 : u.lastNeed = O - 3), O) : 0));
  }
  function p(u, _, T) {
    if ((_[0] & 192) !== 128)
      return u.lastNeed = 0, "�";
    if (u.lastNeed > 1 && _.length > 1) {
      if ((_[1] & 192) !== 128)
        return u.lastNeed = 1, "�";
      if (u.lastNeed > 2 && _.length > 2 && (_[2] & 192) !== 128)
        return u.lastNeed = 2, "�";
    }
  }
  function c(u) {
    var _ = this.lastTotal - this.lastNeed, T = p(this, u);
    if (T !== void 0) return T;
    if (this.lastNeed <= u.length)
      return u.copy(this.lastChar, _, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    u.copy(this.lastChar, _, 0, u.length), this.lastNeed -= u.length;
  }
  function b(u, _) {
    var T = o(this, u, _);
    if (!this.lastNeed) return u.toString("utf8", _);
    this.lastTotal = T;
    var C = u.length - (T - this.lastNeed);
    return u.copy(this.lastChar, 0, C), u.toString("utf8", _, C);
  }
  function E(u) {
    var _ = u && u.length ? this.write(u) : "";
    return this.lastNeed ? _ + "�" : _;
  }
  function d(u, _) {
    if ((u.length - _) % 2 === 0) {
      var T = u.toString("utf16le", _);
      if (T) {
        var C = T.charCodeAt(T.length - 1);
        if (C >= 55296 && C <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = u[u.length - 2], this.lastChar[1] = u[u.length - 1], T.slice(0, -1);
      }
      return T;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = u[u.length - 1], u.toString("utf16le", _, u.length - 1);
  }
  function s(u) {
    var _ = u && u.length ? this.write(u) : "";
    if (this.lastNeed) {
      var T = this.lastTotal - this.lastNeed;
      return _ + this.lastChar.toString("utf16le", 0, T);
    }
    return _;
  }
  function g(u, _) {
    var T = (u.length - _) % 3;
    return T === 0 ? u.toString("base64", _) : (this.lastNeed = 3 - T, this.lastTotal = 3, T === 1 ? this.lastChar[0] = u[u.length - 1] : (this.lastChar[0] = u[u.length - 2], this.lastChar[1] = u[u.length - 1]), u.toString("base64", _, u.length - T));
  }
  function v(u) {
    var _ = u && u.length ? this.write(u) : "";
    return this.lastNeed ? _ + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : _;
  }
  function S(u) {
    return u.toString(this.encoding);
  }
  function R(u) {
    return u && u.length ? this.write(u) : "";
  }
  return _r;
}
var vr, Xa;
function ui() {
  if (Xa) return vr;
  Xa = 1;
  var a = tr();
  vr = _;
  var e = nl(), t;
  _.ReadableState = u, Wo.EventEmitter;
  var n = function(w, y) {
    return w.listeners(y).length;
  }, l = hi(), i = rr().Buffer, o = (typeof Ue < "u" ? Ue : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function p(w) {
    return i.from(w);
  }
  function c(w) {
    return i.isBuffer(w) || w instanceof o;
  }
  var b = Object.create(Mt());
  b.inherits = Ut();
  var E = fa, d = void 0;
  E && E.debuglog ? d = E.debuglog("stream") : d = function() {
  };
  var s = ol(), g = fi(), v;
  b.inherits(_, l);
  var S = ["error", "close", "destroy", "pause", "resume"];
  function R(w, y, W) {
    if (typeof w.prependListener == "function") return w.prependListener(y, W);
    !w._events || !w._events[y] ? w.on(y, W) : e(w._events[y]) ? w._events[y].unshift(W) : w._events[y] = [W, w._events[y]];
  }
  function u(w, y) {
    t = t || Pt(), w = w || {};
    var W = y instanceof t;
    this.objectMode = !!w.objectMode, W && (this.objectMode = this.objectMode || !!w.readableObjectMode);
    var G = w.highWaterMark, fe = w.readableHighWaterMark, Y = this.objectMode ? 16 : 16 * 1024;
    G || G === 0 ? this.highWaterMark = G : W && (fe || fe === 0) ? this.highWaterMark = fe : this.highWaterMark = Y, this.highWaterMark = Math.floor(this.highWaterMark), this.buffer = new s(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = w.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, w.encoding && (v || (v = $a().StringDecoder), this.decoder = new v(w.encoding), this.encoding = w.encoding);
  }
  function _(w) {
    if (t = t || Pt(), !(this instanceof _)) return new _(w);
    this._readableState = new u(w, this), this.readable = !0, w && (typeof w.read == "function" && (this._read = w.read), typeof w.destroy == "function" && (this._destroy = w.destroy)), l.call(this);
  }
  Object.defineProperty(_.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    },
    set: function(w) {
      this._readableState && (this._readableState.destroyed = w);
    }
  }), _.prototype.destroy = g.destroy, _.prototype._undestroy = g.undestroy, _.prototype._destroy = function(w, y) {
    this.push(null), y(w);
  }, _.prototype.push = function(w, y) {
    var W = this._readableState, G;
    return W.objectMode ? G = !0 : typeof w == "string" && (y = y || W.defaultEncoding, y !== W.encoding && (w = i.from(w, y), y = ""), G = !0), T(this, w, y, !1, G);
  }, _.prototype.unshift = function(w) {
    return T(this, w, null, !0, !1);
  };
  function T(w, y, W, G, fe) {
    var Y = w._readableState;
    if (y === null)
      Y.reading = !1, te(w, Y);
    else {
      var ne;
      fe || (ne = O(Y, y)), ne ? w.emit("error", ne) : Y.objectMode || y && y.length > 0 ? (typeof y != "string" && !Y.objectMode && Object.getPrototypeOf(y) !== i.prototype && (y = p(y)), G ? Y.endEmitted ? w.emit("error", new Error("stream.unshift() after end event")) : C(w, Y, y, !0) : Y.ended ? w.emit("error", new Error("stream.push() after EOF")) : (Y.reading = !1, Y.decoder && !W ? (y = Y.decoder.write(y), Y.objectMode || y.length !== 0 ? C(w, Y, y, !1) : Z(w, Y)) : C(w, Y, y, !1))) : G || (Y.reading = !1);
    }
    return B(Y);
  }
  function C(w, y, W, G) {
    y.flowing && y.length === 0 && !y.sync ? (w.emit("data", W), w.read(0)) : (y.length += y.objectMode ? 1 : W.length, G ? y.buffer.unshift(W) : y.buffer.push(W), y.needReadable && le(w)), Z(w, y);
  }
  function O(w, y) {
    var W;
    return !c(y) && typeof y != "string" && y !== void 0 && !w.objectMode && (W = new TypeError("Invalid non-string/buffer chunk")), W;
  }
  function B(w) {
    return !w.ended && (w.needReadable || w.length < w.highWaterMark || w.length === 0);
  }
  _.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  }, _.prototype.setEncoding = function(w) {
    return v || (v = $a().StringDecoder), this._readableState.decoder = new v(w), this._readableState.encoding = w, this;
  };
  var F = 8388608;
  function q(w) {
    return w >= F ? w = F : (w--, w |= w >>> 1, w |= w >>> 2, w |= w >>> 4, w |= w >>> 8, w |= w >>> 16, w++), w;
  }
  function ee(w, y) {
    return w <= 0 || y.length === 0 && y.ended ? 0 : y.objectMode ? 1 : w !== w ? y.flowing && y.length ? y.buffer.head.data.length : y.length : (w > y.highWaterMark && (y.highWaterMark = q(w)), w <= y.length ? w : y.ended ? y.length : (y.needReadable = !0, 0));
  }
  _.prototype.read = function(w) {
    d("read", w), w = parseInt(w, 10);
    var y = this._readableState, W = w;
    if (w !== 0 && (y.emittedReadable = !1), w === 0 && y.needReadable && (y.length >= y.highWaterMark || y.ended))
      return d("read: emitReadable", y.length, y.ended), y.length === 0 && y.ended ? ye(this) : le(this), null;
    if (w = ee(w, y), w === 0 && y.ended)
      return y.length === 0 && ye(this), null;
    var G = y.needReadable;
    d("need readable", G), (y.length === 0 || y.length - w < y.highWaterMark) && (G = !0, d("length less than watermark", G)), y.ended || y.reading ? (G = !1, d("reading or ended", G)) : G && (d("do read"), y.reading = !0, y.sync = !0, y.length === 0 && (y.needReadable = !0), this._read(y.highWaterMark), y.sync = !1, y.reading || (w = ee(W, y)));
    var fe;
    return w > 0 ? fe = J(w, y) : fe = null, fe === null ? (y.needReadable = !0, w = 0) : y.length -= w, y.length === 0 && (y.ended || (y.needReadable = !0), W !== w && y.ended && ye(this)), fe !== null && this.emit("data", fe), fe;
  };
  function te(w, y) {
    if (!y.ended) {
      if (y.decoder) {
        var W = y.decoder.end();
        W && W.length && (y.buffer.push(W), y.length += y.objectMode ? 1 : W.length);
      }
      y.ended = !0, le(w);
    }
  }
  function le(w) {
    var y = w._readableState;
    y.needReadable = !1, y.emittedReadable || (d("emitReadable", y.flowing), y.emittedReadable = !0, y.sync ? a.nextTick(oe, w) : oe(w));
  }
  function oe(w) {
    d("emit readable"), w.emit("readable"), M(w);
  }
  function Z(w, y) {
    y.readingMore || (y.readingMore = !0, a.nextTick(he, w, y));
  }
  function he(w, y) {
    for (var W = y.length; !y.reading && !y.flowing && !y.ended && y.length < y.highWaterMark && (d("maybeReadMore read 0"), w.read(0), W !== y.length); )
      W = y.length;
    y.readingMore = !1;
  }
  _.prototype._read = function(w) {
    this.emit("error", new Error("_read() is not implemented"));
  }, _.prototype.pipe = function(w, y) {
    var W = this, G = this._readableState;
    switch (G.pipesCount) {
      case 0:
        G.pipes = w;
        break;
      case 1:
        G.pipes = [G.pipes, w];
        break;
      default:
        G.pipes.push(w);
        break;
    }
    G.pipesCount += 1, d("pipe count=%d opts=%j", G.pipesCount, y);
    var fe = (!y || y.end !== !1) && w !== process.stdout && w !== process.stderr, Y = fe ? Ke : Xe;
    G.endEmitted ? a.nextTick(Y) : W.once("end", Y), w.on("unpipe", ne);
    function ne(We, De) {
      d("onunpipe"), We === W && De && De.hasUnpiped === !1 && (De.hasUnpiped = !0, be());
    }
    function Ke() {
      d("onend"), w.end();
    }
    var Oe = we(W);
    w.on("drain", Oe);
    var Pe = !1;
    function be() {
      d("cleanup"), w.removeListener("close", $e), w.removeListener("finish", Le), w.removeListener("drain", Oe), w.removeListener("error", it), w.removeListener("unpipe", ne), W.removeListener("end", Ke), W.removeListener("end", Xe), W.removeListener("data", Be), Pe = !0, G.awaitDrain && (!w._writableState || w._writableState.needDrain) && Oe();
    }
    var ue = !1;
    W.on("data", Be);
    function Be(We) {
      d("ondata"), ue = !1;
      var De = w.write(We);
      De === !1 && !ue && ((G.pipesCount === 1 && G.pipes === w || G.pipesCount > 1 && de(G.pipes, w) !== -1) && !Pe && (d("false write response, pause", G.awaitDrain), G.awaitDrain++, ue = !0), W.pause());
    }
    function it(We) {
      d("onerror", We), Xe(), w.removeListener("error", it), n(w, "error") === 0 && w.emit("error", We);
    }
    R(w, "error", it);
    function $e() {
      w.removeListener("finish", Le), Xe();
    }
    w.once("close", $e);
    function Le() {
      d("onfinish"), w.removeListener("close", $e), Xe();
    }
    w.once("finish", Le);
    function Xe() {
      d("unpipe"), W.unpipe(w);
    }
    return w.emit("pipe", W), G.flowing || (d("pipe resume"), W.resume()), w;
  };
  function we(w) {
    return function() {
      var y = w._readableState;
      d("pipeOnDrain", y.awaitDrain), y.awaitDrain && y.awaitDrain--, y.awaitDrain === 0 && n(w, "data") && (y.flowing = !0, M(w));
    };
  }
  _.prototype.unpipe = function(w) {
    var y = this._readableState, W = { hasUnpiped: !1 };
    if (y.pipesCount === 0) return this;
    if (y.pipesCount === 1)
      return w && w !== y.pipes ? this : (w || (w = y.pipes), y.pipes = null, y.pipesCount = 0, y.flowing = !1, w && w.emit("unpipe", this, W), this);
    if (!w) {
      var G = y.pipes, fe = y.pipesCount;
      y.pipes = null, y.pipesCount = 0, y.flowing = !1;
      for (var Y = 0; Y < fe; Y++)
        G[Y].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var ne = de(y.pipes, w);
    return ne === -1 ? this : (y.pipes.splice(ne, 1), y.pipesCount -= 1, y.pipesCount === 1 && (y.pipes = y.pipes[0]), w.emit("unpipe", this, W), this);
  }, _.prototype.on = function(w, y) {
    var W = l.prototype.on.call(this, w, y);
    if (w === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (w === "readable") {
      var G = this._readableState;
      !G.endEmitted && !G.readableListening && (G.readableListening = G.needReadable = !0, G.emittedReadable = !1, G.reading ? G.length && le(this) : a.nextTick(ce, this));
    }
    return W;
  }, _.prototype.addListener = _.prototype.on;
  function ce(w) {
    d("readable nexttick read 0"), w.read(0);
  }
  _.prototype.resume = function() {
    var w = this._readableState;
    return w.flowing || (d("resume"), w.flowing = !0, x(this, w)), this;
  };
  function x(w, y) {
    y.resumeScheduled || (y.resumeScheduled = !0, a.nextTick(D, w, y));
  }
  function D(w, y) {
    y.reading || (d("resume read 0"), w.read(0)), y.resumeScheduled = !1, y.awaitDrain = 0, w.emit("resume"), M(w), y.flowing && !y.reading && w.read(0);
  }
  _.prototype.pause = function() {
    return d("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (d("pause"), this._readableState.flowing = !1, this.emit("pause")), this;
  };
  function M(w) {
    var y = w._readableState;
    for (d("flow", y.flowing); y.flowing && w.read() !== null; )
      ;
  }
  _.prototype.wrap = function(w) {
    var y = this, W = this._readableState, G = !1;
    w.on("end", function() {
      if (d("wrapped end"), W.decoder && !W.ended) {
        var ne = W.decoder.end();
        ne && ne.length && y.push(ne);
      }
      y.push(null);
    }), w.on("data", function(ne) {
      if (d("wrapped data"), W.decoder && (ne = W.decoder.write(ne)), !(W.objectMode && ne == null) && !(!W.objectMode && (!ne || !ne.length))) {
        var Ke = y.push(ne);
        Ke || (G = !0, w.pause());
      }
    });
    for (var fe in w)
      this[fe] === void 0 && typeof w[fe] == "function" && (this[fe] = /* @__PURE__ */ (function(ne) {
        return function() {
          return w[ne].apply(w, arguments);
        };
      })(fe));
    for (var Y = 0; Y < S.length; Y++)
      w.on(S[Y], this.emit.bind(this, S[Y]));
    return this._read = function(ne) {
      d("wrapped _read", ne), G && (G = !1, w.resume());
    }, this;
  }, Object.defineProperty(_.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), _._fromList = J;
  function J(w, y) {
    if (y.length === 0) return null;
    var W;
    return y.objectMode ? W = y.buffer.shift() : !w || w >= y.length ? (y.decoder ? W = y.buffer.join("") : y.buffer.length === 1 ? W = y.buffer.head.data : W = y.buffer.concat(y.length), y.buffer.clear()) : W = re(w, y.buffer, y.decoder), W;
  }
  function re(w, y, W) {
    var G;
    return w < y.head.data.length ? (G = y.head.data.slice(0, w), y.head.data = y.head.data.slice(w)) : w === y.head.data.length ? G = y.shift() : G = W ? ae(w, y) : se(w, y), G;
  }
  function ae(w, y) {
    var W = y.head, G = 1, fe = W.data;
    for (w -= fe.length; W = W.next; ) {
      var Y = W.data, ne = w > Y.length ? Y.length : w;
      if (ne === Y.length ? fe += Y : fe += Y.slice(0, w), w -= ne, w === 0) {
        ne === Y.length ? (++G, W.next ? y.head = W.next : y.head = y.tail = null) : (y.head = W, W.data = Y.slice(ne));
        break;
      }
      ++G;
    }
    return y.length -= G, fe;
  }
  function se(w, y) {
    var W = i.allocUnsafe(w), G = y.head, fe = 1;
    for (G.data.copy(W), w -= G.data.length; G = G.next; ) {
      var Y = G.data, ne = w > Y.length ? Y.length : w;
      if (Y.copy(W, W.length - w, 0, ne), w -= ne, w === 0) {
        ne === Y.length ? (++fe, G.next ? y.head = G.next : y.head = y.tail = null) : (y.head = G, G.data = Y.slice(ne));
        break;
      }
      ++fe;
    }
    return y.length -= fe, W;
  }
  function ye(w) {
    var y = w._readableState;
    if (y.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    y.endEmitted || (y.ended = !0, a.nextTick(Ee, y, w));
  }
  function Ee(w, y) {
    !w.endEmitted && w.length === 0 && (w.endEmitted = !0, y.readable = !1, y.emit("end"));
  }
  function de(w, y) {
    for (var W = 0, G = w.length; W < G; W++)
      if (w[W] === y) return W;
    return -1;
  }
  return vr;
}
var wr, Ja;
function di() {
  if (Ja) return wr;
  Ja = 1, wr = n;
  var a = Pt(), e = Object.create(Mt());
  e.inherits = Ut(), e.inherits(n, a);
  function t(o, p) {
    var c = this._transformState;
    c.transforming = !1;
    var b = c.writecb;
    if (!b)
      return this.emit("error", new Error("write callback called multiple times"));
    c.writechunk = null, c.writecb = null, p != null && this.push(p), b(o);
    var E = this._readableState;
    E.reading = !1, (E.needReadable || E.length < E.highWaterMark) && this._read(E.highWaterMark);
  }
  function n(o) {
    if (!(this instanceof n)) return new n(o);
    a.call(this, o), this._transformState = {
      afterTransform: t.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, o && (typeof o.transform == "function" && (this._transform = o.transform), typeof o.flush == "function" && (this._flush = o.flush)), this.on("prefinish", l);
  }
  function l() {
    var o = this;
    typeof this._flush == "function" ? this._flush(function(p, c) {
      i(o, p, c);
    }) : i(this, null, null);
  }
  n.prototype.push = function(o, p) {
    return this._transformState.needTransform = !1, a.prototype.push.call(this, o, p);
  }, n.prototype._transform = function(o, p, c) {
    throw new Error("_transform() is not implemented");
  }, n.prototype._write = function(o, p, c) {
    var b = this._transformState;
    if (b.writecb = c, b.writechunk = o, b.writeencoding = p, !b.transforming) {
      var E = this._readableState;
      (b.needTransform || E.needReadable || E.length < E.highWaterMark) && this._read(E.highWaterMark);
    }
  }, n.prototype._read = function(o) {
    var p = this._transformState;
    p.writechunk !== null && p.writecb && !p.transforming ? (p.transforming = !0, this._transform(p.writechunk, p.writeencoding, p.afterTransform)) : p.needTransform = !0;
  }, n.prototype._destroy = function(o, p) {
    var c = this;
    a.prototype._destroy.call(this, o, function(b) {
      p(b), c.emit("close");
    });
  };
  function i(o, p, c) {
    if (p) return o.emit("error", p);
    if (c != null && o.push(c), o._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (o._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return o.push(null);
  }
  return wr;
}
var yr, Qa;
function ll() {
  if (Qa) return yr;
  Qa = 1, yr = t;
  var a = di(), e = Object.create(Mt());
  e.inherits = Ut(), e.inherits(t, a);
  function t(n) {
    if (!(this instanceof t)) return new t(n);
    a.call(this, n);
  }
  return t.prototype._transform = function(n, l, i) {
    i(null, n);
  }, yr;
}
var en;
function pi() {
  return en || (en = 1, (function(a, e) {
    var t = ni;
    process.env.READABLE_STREAM === "disable" && t ? (a.exports = t, e = a.exports = t.Readable, e.Readable = t.Readable, e.Writable = t.Writable, e.Duplex = t.Duplex, e.Transform = t.Transform, e.PassThrough = t.PassThrough, e.Stream = t) : (e = a.exports = ui(), e.Stream = t || e, e.Readable = e, e.Writable = ci(), e.Duplex = Pt(), e.Transform = di(), e.PassThrough = ll());
  })(Zt, Zt.exports)), Zt.exports;
}
var tn;
function _t() {
  if (tn) return Ge;
  if (tn = 1, Ge.base64 = !0, Ge.array = !0, Ge.string = !0, Ge.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", Ge.nodebuffer = typeof Buffer < "u", Ge.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u")
    Ge.blob = !1;
  else {
    var a = new ArrayBuffer(0);
    try {
      Ge.blob = new Blob([a], {
        type: "application/zip"
      }).size === 0;
    } catch {
      try {
        var e = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder, t = new e();
        t.append(a), Ge.blob = t.getBlob("application/zip").size === 0;
      } catch {
        Ge.blob = !1;
      }
    }
  }
  try {
    Ge.nodestream = !!pi().Readable;
  } catch {
    Ge.nodestream = !1;
  }
  return Ge;
}
var Jt = {}, rn;
function gi() {
  if (rn) return Jt;
  rn = 1;
  var a = Ae(), e = _t(), t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  return Jt.encode = function(n) {
    for (var l = [], i, o, p, c, b, E, d, s = 0, g = n.length, v = g, S = a.getTypeOf(n) !== "string"; s < n.length; )
      v = g - s, S ? (i = n[s++], o = s < g ? n[s++] : 0, p = s < g ? n[s++] : 0) : (i = n.charCodeAt(s++), o = s < g ? n.charCodeAt(s++) : 0, p = s < g ? n.charCodeAt(s++) : 0), c = i >> 2, b = (i & 3) << 4 | o >> 4, E = v > 1 ? (o & 15) << 2 | p >> 6 : 64, d = v > 2 ? p & 63 : 64, l.push(t.charAt(c) + t.charAt(b) + t.charAt(E) + t.charAt(d));
    return l.join("");
  }, Jt.decode = function(n) {
    var l, i, o, p, c, b, E, d = 0, s = 0, g = "data:";
    if (n.substr(0, g.length) === g)
      throw new Error("Invalid base64 input, it looks like a data url.");
    n = n.replace(/[^A-Za-z0-9+/=]/g, "");
    var v = n.length * 3 / 4;
    if (n.charAt(n.length - 1) === t.charAt(64) && v--, n.charAt(n.length - 2) === t.charAt(64) && v--, v % 1 !== 0)
      throw new Error("Invalid base64 input, bad content length.");
    var S;
    for (e.uint8array ? S = new Uint8Array(v | 0) : S = new Array(v | 0); d < n.length; )
      p = t.indexOf(n.charAt(d++)), c = t.indexOf(n.charAt(d++)), b = t.indexOf(n.charAt(d++)), E = t.indexOf(n.charAt(d++)), l = p << 2 | c >> 4, i = (c & 15) << 4 | b >> 2, o = (b & 3) << 6 | E, S[s++] = l, b !== 64 && (S[s++] = i), E !== 64 && (S[s++] = o);
    return S;
  }, Jt;
}
var Er, an;
function ar() {
  return an || (an = 1, Er = {
    /**
     * True if this is running in Nodejs, will be undefined in a browser.
     * In a browser, browserify won't include this file and the whole module
     * will be resolved an empty object.
     */
    isNode: typeof Buffer < "u",
    /**
     * Create a new nodejs Buffer from an existing content.
     * @param {Object} data the data to pass to the constructor.
     * @param {String} encoding the encoding to use.
     * @return {Buffer} a new Buffer.
     */
    newBufferFrom: function(a, e) {
      if (Buffer.from && Buffer.from !== Uint8Array.from)
        return Buffer.from(a, e);
      if (typeof a == "number")
        throw new Error('The "data" argument must not be a number');
      return new Buffer(a, e);
    },
    /**
     * Create a new nodejs Buffer with the specified size.
     * @param {Integer} size the size of the buffer.
     * @return {Buffer} a new Buffer.
     */
    allocBuffer: function(a) {
      if (Buffer.alloc)
        return Buffer.alloc(a);
      var e = new Buffer(a);
      return e.fill(0), e;
    },
    /**
     * Find out if an object is a Buffer.
     * @param {Object} b the object to test.
     * @return {Boolean} true if the object is a Buffer, false otherwise.
     */
    isBuffer: function(a) {
      return Buffer.isBuffer(a);
    },
    isStream: function(a) {
      return a && typeof a.on == "function" && typeof a.pause == "function" && typeof a.resume == "function";
    }
  }), Er;
}
var br, nn;
function hl() {
  if (nn) return br;
  nn = 1;
  var a = Ue.MutationObserver || Ue.WebKitMutationObserver, e;
  if (process.browser)
    if (a) {
      var t = 0, n = new a(c), l = Ue.document.createTextNode("");
      n.observe(l, {
        characterData: !0
      }), e = function() {
        l.data = t = ++t % 2;
      };
    } else if (!Ue.setImmediate && typeof Ue.MessageChannel < "u") {
      var i = new Ue.MessageChannel();
      i.port1.onmessage = c, e = function() {
        i.port2.postMessage(0);
      };
    } else "document" in Ue && "onreadystatechange" in Ue.document.createElement("script") ? e = function() {
      var E = Ue.document.createElement("script");
      E.onreadystatechange = function() {
        c(), E.onreadystatechange = null, E.parentNode.removeChild(E), E = null;
      }, Ue.document.documentElement.appendChild(E);
    } : e = function() {
      setTimeout(c, 0);
    };
  else
    e = function() {
      process.nextTick(c);
    };
  var o, p = [];
  function c() {
    o = !0;
    for (var E, d, s = p.length; s; ) {
      for (d = p, p = [], E = -1; ++E < s; )
        d[E]();
      s = p.length;
    }
    o = !1;
  }
  br = b;
  function b(E) {
    p.push(E) === 1 && !o && e();
  }
  return br;
}
var Tr, on;
function fl() {
  if (on) return Tr;
  on = 1;
  var a = hl();
  function e() {
  }
  var t = {}, n = ["REJECTED"], l = ["FULFILLED"], i = ["PENDING"];
  if (!process.browser)
    var o = ["UNHANDLED"];
  Tr = p;
  function p(u) {
    if (typeof u != "function")
      throw new TypeError("resolver must be a function");
    this.state = i, this.queue = [], this.outcome = void 0, process.browser || (this.handled = o), u !== e && d(this, u);
  }
  p.prototype.finally = function(u) {
    if (typeof u != "function")
      return this;
    var _ = this.constructor;
    return this.then(T, C);
    function T(O) {
      function B() {
        return O;
      }
      return _.resolve(u()).then(B);
    }
    function C(O) {
      function B() {
        throw O;
      }
      return _.resolve(u()).then(B);
    }
  }, p.prototype.catch = function(u) {
    return this.then(null, u);
  }, p.prototype.then = function(u, _) {
    if (typeof u != "function" && this.state === l || typeof _ != "function" && this.state === n)
      return this;
    var T = new this.constructor(e);
    if (process.browser || this.handled === o && (this.handled = null), this.state !== i) {
      var C = this.state === l ? u : _;
      b(T, C, this.outcome);
    } else
      this.queue.push(new c(T, u, _));
    return T;
  };
  function c(u, _, T) {
    this.promise = u, typeof _ == "function" && (this.onFulfilled = _, this.callFulfilled = this.otherCallFulfilled), typeof T == "function" && (this.onRejected = T, this.callRejected = this.otherCallRejected);
  }
  c.prototype.callFulfilled = function(u) {
    t.resolve(this.promise, u);
  }, c.prototype.otherCallFulfilled = function(u) {
    b(this.promise, this.onFulfilled, u);
  }, c.prototype.callRejected = function(u) {
    t.reject(this.promise, u);
  }, c.prototype.otherCallRejected = function(u) {
    b(this.promise, this.onRejected, u);
  };
  function b(u, _, T) {
    a(function() {
      var C;
      try {
        C = _(T);
      } catch (O) {
        return t.reject(u, O);
      }
      C === u ? t.reject(u, new TypeError("Cannot resolve promise with itself")) : t.resolve(u, C);
    });
  }
  t.resolve = function(u, _) {
    var T = s(E, _);
    if (T.status === "error")
      return t.reject(u, T.value);
    var C = T.value;
    if (C)
      d(u, C);
    else {
      u.state = l, u.outcome = _;
      for (var O = -1, B = u.queue.length; ++O < B; )
        u.queue[O].callFulfilled(_);
    }
    return u;
  }, t.reject = function(u, _) {
    u.state = n, u.outcome = _, process.browser || u.handled === o && a(function() {
      u.handled === o && process.emit("unhandledRejection", _, u);
    });
    for (var T = -1, C = u.queue.length; ++T < C; )
      u.queue[T].callRejected(_);
    return u;
  };
  function E(u) {
    var _ = u && u.then;
    if (u && (typeof u == "object" || typeof u == "function") && typeof _ == "function")
      return function() {
        _.apply(u, arguments);
      };
  }
  function d(u, _) {
    var T = !1;
    function C(q) {
      T || (T = !0, t.reject(u, q));
    }
    function O(q) {
      T || (T = !0, t.resolve(u, q));
    }
    function B() {
      _(O, C);
    }
    var F = s(B);
    F.status === "error" && C(F.value);
  }
  function s(u, _) {
    var T = {};
    try {
      T.value = u(_), T.status = "success";
    } catch (C) {
      T.status = "error", T.value = C;
    }
    return T;
  }
  p.resolve = g;
  function g(u) {
    return u instanceof this ? u : t.resolve(new this(e), u);
  }
  p.reject = v;
  function v(u) {
    var _ = new this(e);
    return t.reject(_, u);
  }
  p.all = S;
  function S(u) {
    var _ = this;
    if (Object.prototype.toString.call(u) !== "[object Array]")
      return this.reject(new TypeError("must be an array"));
    var T = u.length, C = !1;
    if (!T)
      return this.resolve([]);
    for (var O = new Array(T), B = 0, F = -1, q = new this(e); ++F < T; )
      ee(u[F], F);
    return q;
    function ee(te, le) {
      _.resolve(te).then(oe, function(Z) {
        C || (C = !0, t.reject(q, Z));
      });
      function oe(Z) {
        O[le] = Z, ++B === T && !C && (C = !0, t.resolve(q, O));
      }
    }
  }
  p.race = R;
  function R(u) {
    var _ = this;
    if (Object.prototype.toString.call(u) !== "[object Array]")
      return this.reject(new TypeError("must be an array"));
    var T = u.length, C = !1;
    if (!T)
      return this.resolve([]);
    for (var O = -1, B = new this(e); ++O < T; )
      F(u[O]);
    return B;
    function F(q) {
      _.resolve(q).then(function(ee) {
        C || (C = !0, t.resolve(B, ee));
      }, function(ee) {
        C || (C = !0, t.reject(B, ee));
      });
    }
  }
  return Tr;
}
var Sr, sn;
function Bt() {
  if (sn) return Sr;
  sn = 1;
  var a = null;
  return typeof Promise < "u" ? a = Promise : a = fl(), Sr = {
    Promise: a
  }, Sr;
}
var Ar = {}, ln;
function cl() {
  return ln || (ln = 1, (function(a, e) {
    if (a.setImmediate)
      return;
    var t = 1, n = {}, l = !1, i = a.document, o;
    function p(_) {
      typeof _ != "function" && (_ = new Function("" + _));
      for (var T = new Array(arguments.length - 1), C = 0; C < T.length; C++)
        T[C] = arguments[C + 1];
      var O = { callback: _, args: T };
      return n[t] = O, o(t), t++;
    }
    function c(_) {
      delete n[_];
    }
    function b(_) {
      var T = _.callback, C = _.args;
      switch (C.length) {
        case 0:
          T();
          break;
        case 1:
          T(C[0]);
          break;
        case 2:
          T(C[0], C[1]);
          break;
        case 3:
          T(C[0], C[1], C[2]);
          break;
        default:
          T.apply(e, C);
          break;
      }
    }
    function E(_) {
      if (l)
        setTimeout(E, 0, _);
      else {
        var T = n[_];
        if (T) {
          l = !0;
          try {
            b(T);
          } finally {
            c(_), l = !1;
          }
        }
      }
    }
    function d() {
      o = function(_) {
        process.nextTick(function() {
          E(_);
        });
      };
    }
    function s() {
      if (a.postMessage && !a.importScripts) {
        var _ = !0, T = a.onmessage;
        return a.onmessage = function() {
          _ = !1;
        }, a.postMessage("", "*"), a.onmessage = T, _;
      }
    }
    function g() {
      var _ = "setImmediate$" + Math.random() + "$", T = function(C) {
        C.source === a && typeof C.data == "string" && C.data.indexOf(_) === 0 && E(+C.data.slice(_.length));
      };
      a.addEventListener ? a.addEventListener("message", T, !1) : a.attachEvent("onmessage", T), o = function(C) {
        a.postMessage(_ + C, "*");
      };
    }
    function v() {
      var _ = new MessageChannel();
      _.port1.onmessage = function(T) {
        var C = T.data;
        E(C);
      }, o = function(T) {
        _.port2.postMessage(T);
      };
    }
    function S() {
      var _ = i.documentElement;
      o = function(T) {
        var C = i.createElement("script");
        C.onreadystatechange = function() {
          E(T), C.onreadystatechange = null, _.removeChild(C), C = null;
        }, _.appendChild(C);
      };
    }
    function R() {
      o = function(_) {
        setTimeout(E, 0, _);
      };
    }
    var u = Object.getPrototypeOf && Object.getPrototypeOf(a);
    u = u && u.setTimeout ? u : a, {}.toString.call(a.process) === "[object process]" ? d() : s() ? g() : a.MessageChannel ? v() : i && "onreadystatechange" in i.createElement("script") ? S() : R(), u.setImmediate = p, u.clearImmediate = c;
  })(typeof self > "u" ? typeof Ue > "u" ? Ar : Ue : self)), Ar;
}
var hn;
function Ae() {
  return hn || (hn = 1, (function(a) {
    var e = _t(), t = gi(), n = ar(), l = Bt();
    cl();
    function i(s) {
      var g = null;
      return e.uint8array ? g = new Uint8Array(s.length) : g = new Array(s.length), p(s, g);
    }
    a.newBlob = function(s, g) {
      a.checkSupport("blob");
      try {
        return new Blob([s], {
          type: g
        });
      } catch {
        try {
          var v = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder, S = new v();
          return S.append(s), S.getBlob(g);
        } catch {
          throw new Error("Bug : can't construct the Blob.");
        }
      }
    };
    function o(s) {
      return s;
    }
    function p(s, g) {
      for (var v = 0; v < s.length; ++v)
        g[v] = s.charCodeAt(v) & 255;
      return g;
    }
    var c = {
      /**
       * Transform an array of int into a string, chunk by chunk.
       * See the performances notes on arrayLikeToString.
       * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
       * @param {String} type the type of the array.
       * @param {Integer} chunk the chunk size.
       * @return {String} the resulting string.
       * @throws Error if the chunk is too big for the stack.
       */
      stringifyByChunk: function(s, g, v) {
        var S = [], R = 0, u = s.length;
        if (u <= v)
          return String.fromCharCode.apply(null, s);
        for (; R < u; )
          g === "array" || g === "nodebuffer" ? S.push(String.fromCharCode.apply(null, s.slice(R, Math.min(R + v, u)))) : S.push(String.fromCharCode.apply(null, s.subarray(R, Math.min(R + v, u)))), R += v;
        return S.join("");
      },
      /**
       * Call String.fromCharCode on every item in the array.
       * This is the naive implementation, which generate A LOT of intermediate string.
       * This should be used when everything else fail.
       * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
       * @return {String} the result.
       */
      stringifyByChar: function(s) {
        for (var g = "", v = 0; v < s.length; v++)
          g += String.fromCharCode(s[v]);
        return g;
      },
      applyCanBeUsed: {
        /**
         * true if the browser accepts to use String.fromCharCode on Uint8Array
         */
        uint8array: (function() {
          try {
            return e.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
          } catch {
            return !1;
          }
        })(),
        /**
         * true if the browser accepts to use String.fromCharCode on nodejs Buffer.
         */
        nodebuffer: (function() {
          try {
            return e.nodebuffer && String.fromCharCode.apply(null, n.allocBuffer(1)).length === 1;
          } catch {
            return !1;
          }
        })()
      }
    };
    function b(s) {
      var g = 65536, v = a.getTypeOf(s), S = !0;
      if (v === "uint8array" ? S = c.applyCanBeUsed.uint8array : v === "nodebuffer" && (S = c.applyCanBeUsed.nodebuffer), S)
        for (; g > 1; )
          try {
            return c.stringifyByChunk(s, v, g);
          } catch {
            g = Math.floor(g / 2);
          }
      return c.stringifyByChar(s);
    }
    a.applyFromCharCode = b;
    function E(s, g) {
      for (var v = 0; v < s.length; v++)
        g[v] = s[v];
      return g;
    }
    var d = {};
    d.string = {
      string: o,
      array: function(s) {
        return p(s, new Array(s.length));
      },
      arraybuffer: function(s) {
        return d.string.uint8array(s).buffer;
      },
      uint8array: function(s) {
        return p(s, new Uint8Array(s.length));
      },
      nodebuffer: function(s) {
        return p(s, n.allocBuffer(s.length));
      }
    }, d.array = {
      string: b,
      array: o,
      arraybuffer: function(s) {
        return new Uint8Array(s).buffer;
      },
      uint8array: function(s) {
        return new Uint8Array(s);
      },
      nodebuffer: function(s) {
        return n.newBufferFrom(s);
      }
    }, d.arraybuffer = {
      string: function(s) {
        return b(new Uint8Array(s));
      },
      array: function(s) {
        return E(new Uint8Array(s), new Array(s.byteLength));
      },
      arraybuffer: o,
      uint8array: function(s) {
        return new Uint8Array(s);
      },
      nodebuffer: function(s) {
        return n.newBufferFrom(new Uint8Array(s));
      }
    }, d.uint8array = {
      string: b,
      array: function(s) {
        return E(s, new Array(s.length));
      },
      arraybuffer: function(s) {
        return s.buffer;
      },
      uint8array: o,
      nodebuffer: function(s) {
        return n.newBufferFrom(s);
      }
    }, d.nodebuffer = {
      string: b,
      array: function(s) {
        return E(s, new Array(s.length));
      },
      arraybuffer: function(s) {
        return d.nodebuffer.uint8array(s).buffer;
      },
      uint8array: function(s) {
        return E(s, new Uint8Array(s.length));
      },
      nodebuffer: o
    }, a.transformTo = function(s, g) {
      if (g || (g = ""), !s)
        return g;
      a.checkSupport(s);
      var v = a.getTypeOf(g), S = d[v][s](g);
      return S;
    }, a.resolve = function(s) {
      for (var g = s.split("/"), v = [], S = 0; S < g.length; S++) {
        var R = g[S];
        R === "." || R === "" && S !== 0 && S !== g.length - 1 || (R === ".." ? v.pop() : v.push(R));
      }
      return v.join("/");
    }, a.getTypeOf = function(s) {
      if (typeof s == "string")
        return "string";
      if (Object.prototype.toString.call(s) === "[object Array]")
        return "array";
      if (e.nodebuffer && n.isBuffer(s))
        return "nodebuffer";
      if (e.uint8array && s instanceof Uint8Array)
        return "uint8array";
      if (e.arraybuffer && s instanceof ArrayBuffer)
        return "arraybuffer";
    }, a.checkSupport = function(s) {
      var g = e[s.toLowerCase()];
      if (!g)
        throw new Error(s + " is not supported by this platform");
    }, a.MAX_VALUE_16BITS = 65535, a.MAX_VALUE_32BITS = -1, a.pretty = function(s) {
      var g = "", v, S;
      for (S = 0; S < (s || "").length; S++)
        v = s.charCodeAt(S), g += "\\x" + (v < 16 ? "0" : "") + v.toString(16).toUpperCase();
      return g;
    }, a.delay = function(s, g, v) {
      setImmediate(function() {
        s.apply(v || null, g || []);
      });
    }, a.inherits = function(s, g) {
      var v = function() {
      };
      v.prototype = g.prototype, s.prototype = new v();
    }, a.extend = function() {
      var s = {}, g, v;
      for (g = 0; g < arguments.length; g++)
        for (v in arguments[g])
          Object.prototype.hasOwnProperty.call(arguments[g], v) && typeof s[v] > "u" && (s[v] = arguments[g][v]);
      return s;
    }, a.prepareContent = function(s, g, v, S, R) {
      var u = l.Promise.resolve(g).then(function(_) {
        var T = e.blob && (_ instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(_)) !== -1);
        return T && typeof FileReader < "u" ? new l.Promise(function(C, O) {
          var B = new FileReader();
          B.onload = function(F) {
            C(F.target.result);
          }, B.onerror = function(F) {
            O(F.target.error);
          }, B.readAsArrayBuffer(_);
        }) : _;
      });
      return u.then(function(_) {
        var T = a.getTypeOf(_);
        return T ? (T === "arraybuffer" ? _ = a.transformTo("uint8array", _) : T === "string" && (R ? _ = t.decode(_) : v && S !== !0 && (_ = i(_))), _) : l.Promise.reject(
          new Error("Can't read the data of '" + s + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
        );
      });
    };
  })(hr)), hr;
}
var Rr, fn;
function tt() {
  if (fn) return Rr;
  fn = 1;
  function a(e) {
    this.name = e || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
      data: [],
      end: [],
      error: []
    }, this.previous = null;
  }
  return a.prototype = {
    /**
     * Push a chunk to the next workers.
     * @param {Object} chunk the chunk to push
     */
    push: function(e) {
      this.emit("data", e);
    },
    /**
     * End the stream.
     * @return {Boolean} true if this call ended the worker, false otherwise.
     */
    end: function() {
      if (this.isFinished)
        return !1;
      this.flush();
      try {
        this.emit("end"), this.cleanUp(), this.isFinished = !0;
      } catch (e) {
        this.emit("error", e);
      }
      return !0;
    },
    /**
     * End the stream with an error.
     * @param {Error} e the error which caused the premature end.
     * @return {Boolean} true if this call ended the worker with an error, false otherwise.
     */
    error: function(e) {
      return this.isFinished ? !1 : (this.isPaused ? this.generatedError = e : (this.isFinished = !0, this.emit("error", e), this.previous && this.previous.error(e), this.cleanUp()), !0);
    },
    /**
     * Add a callback on an event.
     * @param {String} name the name of the event (data, end, error)
     * @param {Function} listener the function to call when the event is triggered
     * @return {GenericWorker} the current object for chainability
     */
    on: function(e, t) {
      return this._listeners[e].push(t), this;
    },
    /**
     * Clean any references when a worker is ending.
     */
    cleanUp: function() {
      this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
    },
    /**
     * Trigger an event. This will call registered callback with the provided arg.
     * @param {String} name the name of the event (data, end, error)
     * @param {Object} arg the argument to call the callback with.
     */
    emit: function(e, t) {
      if (this._listeners[e])
        for (var n = 0; n < this._listeners[e].length; n++)
          this._listeners[e][n].call(this, t);
    },
    /**
     * Chain a worker with an other.
     * @param {Worker} next the worker receiving events from the current one.
     * @return {worker} the next worker for chainability
     */
    pipe: function(e) {
      return e.registerPrevious(this);
    },
    /**
     * Same as `pipe` in the other direction.
     * Using an API with `pipe(next)` is very easy.
     * Implementing the API with the point of view of the next one registering
     * a source is easier, see the ZipFileWorker.
     * @param {Worker} previous the previous worker, sending events to this one
     * @return {Worker} the current worker for chainability
     */
    registerPrevious: function(e) {
      if (this.isLocked)
        throw new Error("The stream '" + this + "' has already been used.");
      this.streamInfo = e.streamInfo, this.mergeStreamInfo(), this.previous = e;
      var t = this;
      return e.on("data", function(n) {
        t.processChunk(n);
      }), e.on("end", function() {
        t.end();
      }), e.on("error", function(n) {
        t.error(n);
      }), this;
    },
    /**
     * Pause the stream so it doesn't send events anymore.
     * @return {Boolean} true if this call paused the worker, false otherwise.
     */
    pause: function() {
      return this.isPaused || this.isFinished ? !1 : (this.isPaused = !0, this.previous && this.previous.pause(), !0);
    },
    /**
     * Resume a paused stream.
     * @return {Boolean} true if this call resumed the worker, false otherwise.
     */
    resume: function() {
      if (!this.isPaused || this.isFinished)
        return !1;
      this.isPaused = !1;
      var e = !1;
      return this.generatedError && (this.error(this.generatedError), e = !0), this.previous && this.previous.resume(), !e;
    },
    /**
     * Flush any remaining bytes as the stream is ending.
     */
    flush: function() {
    },
    /**
     * Process a chunk. This is usually the method overridden.
     * @param {Object} chunk the chunk to process.
     */
    processChunk: function(e) {
      this.push(e);
    },
    /**
     * Add a key/value to be added in the workers chain streamInfo once activated.
     * @param {String} key the key to use
     * @param {Object} value the associated value
     * @return {Worker} the current worker for chainability
     */
    withStreamInfo: function(e, t) {
      return this.extraStreamInfo[e] = t, this.mergeStreamInfo(), this;
    },
    /**
     * Merge this worker's streamInfo into the chain's streamInfo.
     */
    mergeStreamInfo: function() {
      for (var e in this.extraStreamInfo)
        Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e) && (this.streamInfo[e] = this.extraStreamInfo[e]);
    },
    /**
     * Lock the stream to prevent further updates on the workers chain.
     * After calling this method, all calls to pipe will fail.
     */
    lock: function() {
      if (this.isLocked)
        throw new Error("The stream '" + this + "' has already been used.");
      this.isLocked = !0, this.previous && this.previous.lock();
    },
    /**
     *
     * Pretty print the workers chain.
     */
    toString: function() {
      var e = "Worker " + this.name;
      return this.previous ? this.previous + " -> " + e : e;
    }
  }, Rr = a, Rr;
}
var cn;
function Wt() {
  return cn || (cn = 1, (function(a) {
    for (var e = Ae(), t = _t(), n = ar(), l = tt(), i = new Array(256), o = 0; o < 256; o++)
      i[o] = o >= 252 ? 6 : o >= 248 ? 5 : o >= 240 ? 4 : o >= 224 ? 3 : o >= 192 ? 2 : 1;
    i[254] = i[254] = 1;
    var p = function(s) {
      var g, v, S, R, u, _ = s.length, T = 0;
      for (R = 0; R < _; R++)
        v = s.charCodeAt(R), (v & 64512) === 55296 && R + 1 < _ && (S = s.charCodeAt(R + 1), (S & 64512) === 56320 && (v = 65536 + (v - 55296 << 10) + (S - 56320), R++)), T += v < 128 ? 1 : v < 2048 ? 2 : v < 65536 ? 3 : 4;
      for (t.uint8array ? g = new Uint8Array(T) : g = new Array(T), u = 0, R = 0; u < T; R++)
        v = s.charCodeAt(R), (v & 64512) === 55296 && R + 1 < _ && (S = s.charCodeAt(R + 1), (S & 64512) === 56320 && (v = 65536 + (v - 55296 << 10) + (S - 56320), R++)), v < 128 ? g[u++] = v : v < 2048 ? (g[u++] = 192 | v >>> 6, g[u++] = 128 | v & 63) : v < 65536 ? (g[u++] = 224 | v >>> 12, g[u++] = 128 | v >>> 6 & 63, g[u++] = 128 | v & 63) : (g[u++] = 240 | v >>> 18, g[u++] = 128 | v >>> 12 & 63, g[u++] = 128 | v >>> 6 & 63, g[u++] = 128 | v & 63);
      return g;
    }, c = function(s, g) {
      var v;
      for (g = g || s.length, g > s.length && (g = s.length), v = g - 1; v >= 0 && (s[v] & 192) === 128; )
        v--;
      return v < 0 || v === 0 ? g : v + i[s[v]] > g ? v : g;
    }, b = function(s) {
      var g, v, S, R, u = s.length, _ = new Array(u * 2);
      for (v = 0, g = 0; g < u; ) {
        if (S = s[g++], S < 128) {
          _[v++] = S;
          continue;
        }
        if (R = i[S], R > 4) {
          _[v++] = 65533, g += R - 1;
          continue;
        }
        for (S &= R === 2 ? 31 : R === 3 ? 15 : 7; R > 1 && g < u; )
          S = S << 6 | s[g++] & 63, R--;
        if (R > 1) {
          _[v++] = 65533;
          continue;
        }
        S < 65536 ? _[v++] = S : (S -= 65536, _[v++] = 55296 | S >> 10 & 1023, _[v++] = 56320 | S & 1023);
      }
      return _.length !== v && (_.subarray ? _ = _.subarray(0, v) : _.length = v), e.applyFromCharCode(_);
    };
    a.utf8encode = function(g) {
      return t.nodebuffer ? n.newBufferFrom(g, "utf-8") : p(g);
    }, a.utf8decode = function(g) {
      return t.nodebuffer ? e.transformTo("nodebuffer", g).toString("utf-8") : (g = e.transformTo(t.uint8array ? "uint8array" : "array", g), b(g));
    };
    function E() {
      l.call(this, "utf-8 decode"), this.leftOver = null;
    }
    e.inherits(E, l), E.prototype.processChunk = function(s) {
      var g = e.transformTo(t.uint8array ? "uint8array" : "array", s.data);
      if (this.leftOver && this.leftOver.length) {
        if (t.uint8array) {
          var v = g;
          g = new Uint8Array(v.length + this.leftOver.length), g.set(this.leftOver, 0), g.set(v, this.leftOver.length);
        } else
          g = this.leftOver.concat(g);
        this.leftOver = null;
      }
      var S = c(g), R = g;
      S !== g.length && (t.uint8array ? (R = g.subarray(0, S), this.leftOver = g.subarray(S, g.length)) : (R = g.slice(0, S), this.leftOver = g.slice(S, g.length))), this.push({
        data: a.utf8decode(R),
        meta: s.meta
      });
    }, E.prototype.flush = function() {
      this.leftOver && this.leftOver.length && (this.push({
        data: a.utf8decode(this.leftOver),
        meta: {}
      }), this.leftOver = null);
    }, a.Utf8DecodeWorker = E;
    function d() {
      l.call(this, "utf-8 encode");
    }
    e.inherits(d, l), d.prototype.processChunk = function(s) {
      this.push({
        data: a.utf8encode(s.data),
        meta: s.meta
      });
    }, a.Utf8EncodeWorker = d;
  })(lr)), lr;
}
var xr, un;
function ul() {
  if (un) return xr;
  un = 1;
  var a = tt(), e = Ae();
  function t(n) {
    a.call(this, "ConvertWorker to " + n), this.destType = n;
  }
  return e.inherits(t, a), t.prototype.processChunk = function(n) {
    this.push({
      data: e.transformTo(this.destType, n.data),
      meta: n.meta
    });
  }, xr = t, xr;
}
var Ir, dn;
function dl() {
  if (dn) return Ir;
  dn = 1;
  var a = pi().Readable, e = Ae();
  e.inherits(t, a);
  function t(n, l, i) {
    a.call(this, l), this._helper = n;
    var o = this;
    n.on("data", function(p, c) {
      o.push(p) || o._helper.pause(), i && i(c);
    }).on("error", function(p) {
      o.emit("error", p);
    }).on("end", function() {
      o.push(null);
    });
  }
  return t.prototype._read = function() {
    this._helper.resume();
  }, Ir = t, Ir;
}
var Cr, pn;
function mi() {
  if (pn) return Cr;
  pn = 1;
  var a = Ae(), e = ul(), t = tt(), n = gi(), l = _t(), i = Bt(), o = null;
  if (l.nodestream)
    try {
      o = dl();
    } catch {
    }
  function p(d, s, g) {
    switch (d) {
      case "blob":
        return a.newBlob(a.transformTo("arraybuffer", s), g);
      case "base64":
        return n.encode(s);
      default:
        return a.transformTo(d, s);
    }
  }
  function c(d, s) {
    var g, v = 0, S = null, R = 0;
    for (g = 0; g < s.length; g++)
      R += s[g].length;
    switch (d) {
      case "string":
        return s.join("");
      case "array":
        return Array.prototype.concat.apply([], s);
      case "uint8array":
        for (S = new Uint8Array(R), g = 0; g < s.length; g++)
          S.set(s[g], v), v += s[g].length;
        return S;
      case "nodebuffer":
        return Buffer.concat(s);
      default:
        throw new Error("concat : unsupported type '" + d + "'");
    }
  }
  function b(d, s) {
    return new i.Promise(function(g, v) {
      var S = [], R = d._internalType, u = d._outputType, _ = d._mimeType;
      d.on("data", function(T, C) {
        S.push(T), s && s(C);
      }).on("error", function(T) {
        S = [], v(T);
      }).on("end", function() {
        try {
          var T = p(u, c(R, S), _);
          g(T);
        } catch (C) {
          v(C);
        }
        S = [];
      }).resume();
    });
  }
  function E(d, s, g) {
    var v = s;
    switch (s) {
      case "blob":
      case "arraybuffer":
        v = "uint8array";
        break;
      case "base64":
        v = "string";
        break;
    }
    try {
      this._internalType = v, this._outputType = s, this._mimeType = g, a.checkSupport(v), this._worker = d.pipe(new e(v)), d.lock();
    } catch (S) {
      this._worker = new t("error"), this._worker.error(S);
    }
  }
  return E.prototype = {
    /**
     * Listen a StreamHelper, accumulate its content and concatenate it into a
     * complete block.
     * @param {Function} updateCb the update callback.
     * @return Promise the promise for the accumulation.
     */
    accumulate: function(d) {
      return b(this, d);
    },
    /**
     * Add a listener on an event triggered on a stream.
     * @param {String} evt the name of the event
     * @param {Function} fn the listener
     * @return {StreamHelper} the current helper.
     */
    on: function(d, s) {
      var g = this;
      return d === "data" ? this._worker.on(d, function(v) {
        s.call(g, v.data, v.meta);
      }) : this._worker.on(d, function() {
        a.delay(s, arguments, g);
      }), this;
    },
    /**
     * Resume the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    resume: function() {
      return a.delay(this._worker.resume, [], this._worker), this;
    },
    /**
     * Pause the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    pause: function() {
      return this._worker.pause(), this;
    },
    /**
     * Return a nodejs stream for this helper.
     * @param {Function} updateCb the update callback.
     * @return {NodejsStreamOutputAdapter} the nodejs stream.
     */
    toNodejsStream: function(d) {
      if (a.checkSupport("nodestream"), this._outputType !== "nodebuffer")
        throw new Error(this._outputType + " is not supported by this method");
      return new o(this, {
        objectMode: this._outputType !== "nodebuffer"
      }, d);
    }
  }, Cr = E, Cr;
}
var Qe = {}, gn;
function _i() {
  return gn || (gn = 1, Qe.base64 = !1, Qe.binary = !1, Qe.dir = !1, Qe.createFolders = !0, Qe.date = null, Qe.compression = null, Qe.compressionOptions = null, Qe.comment = null, Qe.unixPermissions = null, Qe.dosPermissions = null), Qe;
}
var Dr, mn;
function vi() {
  if (mn) return Dr;
  mn = 1;
  var a = Ae(), e = tt(), t = 16 * 1024;
  function n(l) {
    e.call(this, "DataWorker");
    var i = this;
    this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, l.then(function(o) {
      i.dataIsReady = !0, i.data = o, i.max = o && o.length || 0, i.type = a.getTypeOf(o), i.isPaused || i._tickAndRepeat();
    }, function(o) {
      i.error(o);
    });
  }
  return a.inherits(n, e), n.prototype.cleanUp = function() {
    e.prototype.cleanUp.call(this), this.data = null;
  }, n.prototype.resume = function() {
    return e.prototype.resume.call(this) ? (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, a.delay(this._tickAndRepeat, [], this)), !0) : !1;
  }, n.prototype._tickAndRepeat = function() {
    this._tickScheduled = !1, !(this.isPaused || this.isFinished) && (this._tick(), this.isFinished || (a.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
  }, n.prototype._tick = function() {
    if (this.isPaused || this.isFinished)
      return !1;
    var l = t, i = null, o = Math.min(this.max, this.index + l);
    if (this.index >= this.max)
      return this.end();
    switch (this.type) {
      case "string":
        i = this.data.substring(this.index, o);
        break;
      case "uint8array":
        i = this.data.subarray(this.index, o);
        break;
      case "array":
      case "nodebuffer":
        i = this.data.slice(this.index, o);
        break;
    }
    return this.index = o, this.push({
      data: i,
      meta: {
        percent: this.max ? this.index / this.max * 100 : 0
      }
    });
  }, Dr = n, Dr;
}
var Nr, _n;
function ca() {
  if (_n) return Nr;
  _n = 1;
  var a = Ae();
  function e() {
    for (var i, o = [], p = 0; p < 256; p++) {
      i = p;
      for (var c = 0; c < 8; c++)
        i = i & 1 ? 3988292384 ^ i >>> 1 : i >>> 1;
      o[p] = i;
    }
    return o;
  }
  var t = e();
  function n(i, o, p, c) {
    var b = t, E = c + p;
    i = i ^ -1;
    for (var d = c; d < E; d++)
      i = i >>> 8 ^ b[(i ^ o[d]) & 255];
    return i ^ -1;
  }
  function l(i, o, p, c) {
    var b = t, E = c + p;
    i = i ^ -1;
    for (var d = c; d < E; d++)
      i = i >>> 8 ^ b[(i ^ o.charCodeAt(d)) & 255];
    return i ^ -1;
  }
  return Nr = function(o, p) {
    if (typeof o > "u" || !o.length)
      return 0;
    var c = a.getTypeOf(o) !== "string";
    return c ? n(p | 0, o, o.length, 0) : l(p | 0, o, o.length, 0);
  }, Nr;
}
var kr, vn;
function wi() {
  if (vn) return kr;
  vn = 1;
  var a = tt(), e = ca(), t = Ae();
  function n() {
    a.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
  }
  return t.inherits(n, a), n.prototype.processChunk = function(l) {
    this.streamInfo.crc32 = e(l.data, this.streamInfo.crc32 || 0), this.push(l);
  }, kr = n, kr;
}
var Or, wn;
function pl() {
  if (wn) return Or;
  wn = 1;
  var a = Ae(), e = tt();
  function t(n) {
    e.call(this, "DataLengthProbe for " + n), this.propName = n, this.withStreamInfo(n, 0);
  }
  return a.inherits(t, e), t.prototype.processChunk = function(n) {
    if (n) {
      var l = this.streamInfo[this.propName] || 0;
      this.streamInfo[this.propName] = l + n.data.length;
    }
    e.prototype.processChunk.call(this, n);
  }, Or = t, Or;
}
var Pr, yn;
function ua() {
  if (yn) return Pr;
  yn = 1;
  var a = Bt(), e = vi(), t = wi(), n = pl();
  function l(i, o, p, c, b) {
    this.compressedSize = i, this.uncompressedSize = o, this.crc32 = p, this.compression = c, this.compressedContent = b;
  }
  return l.prototype = {
    /**
     * Create a worker to get the uncompressed content.
     * @return {GenericWorker} the worker.
     */
    getContentWorker: function() {
      var i = new e(a.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new n("data_length")), o = this;
      return i.on("end", function() {
        if (this.streamInfo.data_length !== o.uncompressedSize)
          throw new Error("Bug : uncompressed data size mismatch");
      }), i;
    },
    /**
     * Create a worker to get the compressed content.
     * @return {GenericWorker} the worker.
     */
    getCompressedWorker: function() {
      return new e(a.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
    }
  }, l.createWorkerFrom = function(i, o, p) {
    return i.pipe(new t()).pipe(new n("uncompressedSize")).pipe(o.compressWorker(p)).pipe(new n("compressedSize")).withStreamInfo("compression", o);
  }, Pr = l, Pr;
}
var Lr, En;
function gl() {
  if (En) return Lr;
  En = 1;
  var a = mi(), e = vi(), t = Wt(), n = ua(), l = tt(), i = function(b, E, d) {
    this.name = b, this.dir = d.dir, this.date = d.date, this.comment = d.comment, this.unixPermissions = d.unixPermissions, this.dosPermissions = d.dosPermissions, this._data = E, this._dataBinary = d.binary, this.options = {
      compression: d.compression,
      compressionOptions: d.compressionOptions
    };
  };
  i.prototype = {
    /**
     * Create an internal stream for the content of this object.
     * @param {String} type the type of each chunk.
     * @return StreamHelper the stream.
     */
    internalStream: function(b) {
      var E = null, d = "string";
      try {
        if (!b)
          throw new Error("No output type specified.");
        d = b.toLowerCase();
        var s = d === "string" || d === "text";
        (d === "binarystring" || d === "text") && (d = "string"), E = this._decompressWorker();
        var g = !this._dataBinary;
        g && !s && (E = E.pipe(new t.Utf8EncodeWorker())), !g && s && (E = E.pipe(new t.Utf8DecodeWorker()));
      } catch (v) {
        E = new l("error"), E.error(v);
      }
      return new a(E, d, "");
    },
    /**
     * Prepare the content in the asked type.
     * @param {String} type the type of the result.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Promise the promise of the result.
     */
    async: function(b, E) {
      return this.internalStream(b).accumulate(E);
    },
    /**
     * Prepare the content as a nodejs stream.
     * @param {String} type the type of each chunk.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Stream the stream.
     */
    nodeStream: function(b, E) {
      return this.internalStream(b || "nodebuffer").toNodejsStream(E);
    },
    /**
     * Return a worker for the compressed content.
     * @private
     * @param {Object} compression the compression object to use.
     * @param {Object} compressionOptions the options to use when compressing.
     * @return Worker the worker.
     */
    _compressWorker: function(b, E) {
      if (this._data instanceof n && this._data.compression.magic === b.magic)
        return this._data.getCompressedWorker();
      var d = this._decompressWorker();
      return this._dataBinary || (d = d.pipe(new t.Utf8EncodeWorker())), n.createWorkerFrom(d, b, E);
    },
    /**
     * Return a worker for the decompressed content.
     * @private
     * @return Worker the worker.
     */
    _decompressWorker: function() {
      return this._data instanceof n ? this._data.getContentWorker() : this._data instanceof l ? this._data : new e(this._data);
    }
  };
  for (var o = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], p = function() {
    throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
  }, c = 0; c < o.length; c++)
    i.prototype[o[c]] = p;
  return Lr = i, Lr;
}
var Fr = {}, Qt = {}, Ft = {}, Mr = {}, bn;
function vt() {
  return bn || (bn = 1, (function(a) {
    var e = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
    function t(i, o) {
      return Object.prototype.hasOwnProperty.call(i, o);
    }
    a.assign = function(i) {
      for (var o = Array.prototype.slice.call(arguments, 1); o.length; ) {
        var p = o.shift();
        if (p) {
          if (typeof p != "object")
            throw new TypeError(p + "must be non-object");
          for (var c in p)
            t(p, c) && (i[c] = p[c]);
        }
      }
      return i;
    }, a.shrinkBuf = function(i, o) {
      return i.length === o ? i : i.subarray ? i.subarray(0, o) : (i.length = o, i);
    };
    var n = {
      arraySet: function(i, o, p, c, b) {
        if (o.subarray && i.subarray) {
          i.set(o.subarray(p, p + c), b);
          return;
        }
        for (var E = 0; E < c; E++)
          i[b + E] = o[p + E];
      },
      // Join array of chunks to single array.
      flattenChunks: function(i) {
        var o, p, c, b, E, d;
        for (c = 0, o = 0, p = i.length; o < p; o++)
          c += i[o].length;
        for (d = new Uint8Array(c), b = 0, o = 0, p = i.length; o < p; o++)
          E = i[o], d.set(E, b), b += E.length;
        return d;
      }
    }, l = {
      arraySet: function(i, o, p, c, b) {
        for (var E = 0; E < c; E++)
          i[b + E] = o[p + E];
      },
      // Join array of chunks to single array.
      flattenChunks: function(i) {
        return [].concat.apply([], i);
      }
    };
    a.setTyped = function(i) {
      i ? (a.Buf8 = Uint8Array, a.Buf16 = Uint16Array, a.Buf32 = Int32Array, a.assign(a, n)) : (a.Buf8 = Array, a.Buf16 = Array, a.Buf32 = Array, a.assign(a, l));
    }, a.setTyped(e);
  })(Mr)), Mr;
}
var Dt = {}, rt = {}, yt = {}, Tn;
function ml() {
  if (Tn) return yt;
  Tn = 1;
  var a = vt(), e = 4, t = 0, n = 1, l = 2;
  function i(m) {
    for (var j = m.length; --j >= 0; )
      m[j] = 0;
  }
  var o = 0, p = 1, c = 2, b = 3, E = 258, d = 29, s = 256, g = s + 1 + d, v = 30, S = 19, R = 2 * g + 1, u = 15, _ = 16, T = 7, C = 256, O = 16, B = 17, F = 18, q = (
    /* extra bits for each length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  ), ee = (
    /* extra bits for each distance code */
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
  ), te = (
    /* extra bits for each bit length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
  ), le = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], oe = 512, Z = new Array((g + 2) * 2);
  i(Z);
  var he = new Array(v * 2);
  i(he);
  var we = new Array(oe);
  i(we);
  var ce = new Array(E - b + 1);
  i(ce);
  var x = new Array(d);
  i(x);
  var D = new Array(v);
  i(D);
  function M(m, j, z, X, I) {
    this.static_tree = m, this.extra_bits = j, this.extra_base = z, this.elems = X, this.max_length = I, this.has_stree = m && m.length;
  }
  var J, re, ae;
  function se(m, j) {
    this.dyn_tree = m, this.max_code = 0, this.stat_desc = j;
  }
  function ye(m) {
    return m < 256 ? we[m] : we[256 + (m >>> 7)];
  }
  function Ee(m, j) {
    m.pending_buf[m.pending++] = j & 255, m.pending_buf[m.pending++] = j >>> 8 & 255;
  }
  function de(m, j, z) {
    m.bi_valid > _ - z ? (m.bi_buf |= j << m.bi_valid & 65535, Ee(m, m.bi_buf), m.bi_buf = j >> _ - m.bi_valid, m.bi_valid += z - _) : (m.bi_buf |= j << m.bi_valid & 65535, m.bi_valid += z);
  }
  function w(m, j, z) {
    de(
      m,
      z[j * 2],
      z[j * 2 + 1]
      /*.Len*/
    );
  }
  function y(m, j) {
    var z = 0;
    do
      z |= m & 1, m >>>= 1, z <<= 1;
    while (--j > 0);
    return z >>> 1;
  }
  function W(m) {
    m.bi_valid === 16 ? (Ee(m, m.bi_buf), m.bi_buf = 0, m.bi_valid = 0) : m.bi_valid >= 8 && (m.pending_buf[m.pending++] = m.bi_buf & 255, m.bi_buf >>= 8, m.bi_valid -= 8);
  }
  function G(m, j) {
    var z = j.dyn_tree, X = j.max_code, I = j.stat_desc.static_tree, L = j.stat_desc.has_stree, h = j.stat_desc.extra_bits, H = j.stat_desc.extra_base, ie = j.stat_desc.max_length, r, k, P, f, A, N, Q = 0;
    for (f = 0; f <= u; f++)
      m.bl_count[f] = 0;
    for (z[m.heap[m.heap_max] * 2 + 1] = 0, r = m.heap_max + 1; r < R; r++)
      k = m.heap[r], f = z[z[k * 2 + 1] * 2 + 1] + 1, f > ie && (f = ie, Q++), z[k * 2 + 1] = f, !(k > X) && (m.bl_count[f]++, A = 0, k >= H && (A = h[k - H]), N = z[k * 2], m.opt_len += N * (f + A), L && (m.static_len += N * (I[k * 2 + 1] + A)));
    if (Q !== 0) {
      do {
        for (f = ie - 1; m.bl_count[f] === 0; )
          f--;
        m.bl_count[f]--, m.bl_count[f + 1] += 2, m.bl_count[ie]--, Q -= 2;
      } while (Q > 0);
      for (f = ie; f !== 0; f--)
        for (k = m.bl_count[f]; k !== 0; )
          P = m.heap[--r], !(P > X) && (z[P * 2 + 1] !== f && (m.opt_len += (f - z[P * 2 + 1]) * z[P * 2], z[P * 2 + 1] = f), k--);
    }
  }
  function fe(m, j, z) {
    var X = new Array(u + 1), I = 0, L, h;
    for (L = 1; L <= u; L++)
      X[L] = I = I + z[L - 1] << 1;
    for (h = 0; h <= j; h++) {
      var H = m[h * 2 + 1];
      H !== 0 && (m[h * 2] = y(X[H]++, H));
    }
  }
  function Y() {
    var m, j, z, X, I, L = new Array(u + 1);
    for (z = 0, X = 0; X < d - 1; X++)
      for (x[X] = z, m = 0; m < 1 << q[X]; m++)
        ce[z++] = X;
    for (ce[z - 1] = X, I = 0, X = 0; X < 16; X++)
      for (D[X] = I, m = 0; m < 1 << ee[X]; m++)
        we[I++] = X;
    for (I >>= 7; X < v; X++)
      for (D[X] = I << 7, m = 0; m < 1 << ee[X] - 7; m++)
        we[256 + I++] = X;
    for (j = 0; j <= u; j++)
      L[j] = 0;
    for (m = 0; m <= 143; )
      Z[m * 2 + 1] = 8, m++, L[8]++;
    for (; m <= 255; )
      Z[m * 2 + 1] = 9, m++, L[9]++;
    for (; m <= 279; )
      Z[m * 2 + 1] = 7, m++, L[7]++;
    for (; m <= 287; )
      Z[m * 2 + 1] = 8, m++, L[8]++;
    for (fe(Z, g + 1, L), m = 0; m < v; m++)
      he[m * 2 + 1] = 5, he[m * 2] = y(m, 5);
    J = new M(Z, q, s + 1, g, u), re = new M(he, ee, 0, v, u), ae = new M(new Array(0), te, 0, S, T);
  }
  function ne(m) {
    var j;
    for (j = 0; j < g; j++)
      m.dyn_ltree[j * 2] = 0;
    for (j = 0; j < v; j++)
      m.dyn_dtree[j * 2] = 0;
    for (j = 0; j < S; j++)
      m.bl_tree[j * 2] = 0;
    m.dyn_ltree[C * 2] = 1, m.opt_len = m.static_len = 0, m.last_lit = m.matches = 0;
  }
  function Ke(m) {
    m.bi_valid > 8 ? Ee(m, m.bi_buf) : m.bi_valid > 0 && (m.pending_buf[m.pending++] = m.bi_buf), m.bi_buf = 0, m.bi_valid = 0;
  }
  function Oe(m, j, z, X) {
    Ke(m), Ee(m, z), Ee(m, ~z), a.arraySet(m.pending_buf, m.window, j, z, m.pending), m.pending += z;
  }
  function Pe(m, j, z, X) {
    var I = j * 2, L = z * 2;
    return m[I] < m[L] || m[I] === m[L] && X[j] <= X[z];
  }
  function be(m, j, z) {
    for (var X = m.heap[z], I = z << 1; I <= m.heap_len && (I < m.heap_len && Pe(j, m.heap[I + 1], m.heap[I], m.depth) && I++, !Pe(j, X, m.heap[I], m.depth)); )
      m.heap[z] = m.heap[I], z = I, I <<= 1;
    m.heap[z] = X;
  }
  function ue(m, j, z) {
    var X, I, L = 0, h, H;
    if (m.last_lit !== 0)
      do
        X = m.pending_buf[m.d_buf + L * 2] << 8 | m.pending_buf[m.d_buf + L * 2 + 1], I = m.pending_buf[m.l_buf + L], L++, X === 0 ? w(m, I, j) : (h = ce[I], w(m, h + s + 1, j), H = q[h], H !== 0 && (I -= x[h], de(m, I, H)), X--, h = ye(X), w(m, h, z), H = ee[h], H !== 0 && (X -= D[h], de(m, X, H)));
      while (L < m.last_lit);
    w(m, C, j);
  }
  function Be(m, j) {
    var z = j.dyn_tree, X = j.stat_desc.static_tree, I = j.stat_desc.has_stree, L = j.stat_desc.elems, h, H, ie = -1, r;
    for (m.heap_len = 0, m.heap_max = R, h = 0; h < L; h++)
      z[h * 2] !== 0 ? (m.heap[++m.heap_len] = ie = h, m.depth[h] = 0) : z[h * 2 + 1] = 0;
    for (; m.heap_len < 2; )
      r = m.heap[++m.heap_len] = ie < 2 ? ++ie : 0, z[r * 2] = 1, m.depth[r] = 0, m.opt_len--, I && (m.static_len -= X[r * 2 + 1]);
    for (j.max_code = ie, h = m.heap_len >> 1; h >= 1; h--)
      be(m, z, h);
    r = L;
    do
      h = m.heap[
        1
        /*SMALLEST*/
      ], m.heap[
        1
        /*SMALLEST*/
      ] = m.heap[m.heap_len--], be(
        m,
        z,
        1
        /*SMALLEST*/
      ), H = m.heap[
        1
        /*SMALLEST*/
      ], m.heap[--m.heap_max] = h, m.heap[--m.heap_max] = H, z[r * 2] = z[h * 2] + z[H * 2], m.depth[r] = (m.depth[h] >= m.depth[H] ? m.depth[h] : m.depth[H]) + 1, z[h * 2 + 1] = z[H * 2 + 1] = r, m.heap[
        1
        /*SMALLEST*/
      ] = r++, be(
        m,
        z,
        1
        /*SMALLEST*/
      );
    while (m.heap_len >= 2);
    m.heap[--m.heap_max] = m.heap[
      1
      /*SMALLEST*/
    ], G(m, j), fe(z, ie, m.bl_count);
  }
  function it(m, j, z) {
    var X, I = -1, L, h = j[1], H = 0, ie = 7, r = 4;
    for (h === 0 && (ie = 138, r = 3), j[(z + 1) * 2 + 1] = 65535, X = 0; X <= z; X++)
      L = h, h = j[(X + 1) * 2 + 1], !(++H < ie && L === h) && (H < r ? m.bl_tree[L * 2] += H : L !== 0 ? (L !== I && m.bl_tree[L * 2]++, m.bl_tree[O * 2]++) : H <= 10 ? m.bl_tree[B * 2]++ : m.bl_tree[F * 2]++, H = 0, I = L, h === 0 ? (ie = 138, r = 3) : L === h ? (ie = 6, r = 3) : (ie = 7, r = 4));
  }
  function $e(m, j, z) {
    var X, I = -1, L, h = j[1], H = 0, ie = 7, r = 4;
    for (h === 0 && (ie = 138, r = 3), X = 0; X <= z; X++)
      if (L = h, h = j[(X + 1) * 2 + 1], !(++H < ie && L === h)) {
        if (H < r)
          do
            w(m, L, m.bl_tree);
          while (--H !== 0);
        else L !== 0 ? (L !== I && (w(m, L, m.bl_tree), H--), w(m, O, m.bl_tree), de(m, H - 3, 2)) : H <= 10 ? (w(m, B, m.bl_tree), de(m, H - 3, 3)) : (w(m, F, m.bl_tree), de(m, H - 11, 7));
        H = 0, I = L, h === 0 ? (ie = 138, r = 3) : L === h ? (ie = 6, r = 3) : (ie = 7, r = 4);
      }
  }
  function Le(m) {
    var j;
    for (it(m, m.dyn_ltree, m.l_desc.max_code), it(m, m.dyn_dtree, m.d_desc.max_code), Be(m, m.bl_desc), j = S - 1; j >= 3 && m.bl_tree[le[j] * 2 + 1] === 0; j--)
      ;
    return m.opt_len += 3 * (j + 1) + 5 + 5 + 4, j;
  }
  function Xe(m, j, z, X) {
    var I;
    for (de(m, j - 257, 5), de(m, z - 1, 5), de(m, X - 4, 4), I = 0; I < X; I++)
      de(m, m.bl_tree[le[I] * 2 + 1], 3);
    $e(m, m.dyn_ltree, j - 1), $e(m, m.dyn_dtree, z - 1);
  }
  function We(m) {
    var j = 4093624447, z;
    for (z = 0; z <= 31; z++, j >>>= 1)
      if (j & 1 && m.dyn_ltree[z * 2] !== 0)
        return t;
    if (m.dyn_ltree[18] !== 0 || m.dyn_ltree[20] !== 0 || m.dyn_ltree[26] !== 0)
      return n;
    for (z = 32; z < s; z++)
      if (m.dyn_ltree[z * 2] !== 0)
        return n;
    return t;
  }
  var De = !1;
  function Rt(m) {
    De || (Y(), De = !0), m.l_desc = new se(m.dyn_ltree, J), m.d_desc = new se(m.dyn_dtree, re), m.bl_desc = new se(m.bl_tree, ae), m.bi_buf = 0, m.bi_valid = 0, ne(m);
  }
  function pt(m, j, z, X) {
    de(m, (o << 1) + (X ? 1 : 0), 3), Oe(m, j, z);
  }
  function Fe(m) {
    de(m, p << 1, 3), w(m, C, Z), W(m);
  }
  function ot(m, j, z, X) {
    var I, L, h = 0;
    m.level > 0 ? (m.strm.data_type === l && (m.strm.data_type = We(m)), Be(m, m.l_desc), Be(m, m.d_desc), h = Le(m), I = m.opt_len + 3 + 7 >>> 3, L = m.static_len + 3 + 7 >>> 3, L <= I && (I = L)) : I = L = z + 5, z + 4 <= I && j !== -1 ? pt(m, j, z, X) : m.strategy === e || L === I ? (de(m, (p << 1) + (X ? 1 : 0), 3), ue(m, Z, he)) : (de(m, (c << 1) + (X ? 1 : 0), 3), Xe(m, m.l_desc.max_code + 1, m.d_desc.max_code + 1, h + 1), ue(m, m.dyn_ltree, m.dyn_dtree)), ne(m), X && Ke(m);
  }
  function xt(m, j, z) {
    return m.pending_buf[m.d_buf + m.last_lit * 2] = j >>> 8 & 255, m.pending_buf[m.d_buf + m.last_lit * 2 + 1] = j & 255, m.pending_buf[m.l_buf + m.last_lit] = z & 255, m.last_lit++, j === 0 ? m.dyn_ltree[z * 2]++ : (m.matches++, j--, m.dyn_ltree[(ce[z] + s + 1) * 2]++, m.dyn_dtree[ye(j) * 2]++), m.last_lit === m.lit_bufsize - 1;
  }
  return yt._tr_init = Rt, yt._tr_stored_block = pt, yt._tr_flush_block = ot, yt._tr_tally = xt, yt._tr_align = Fe, yt;
}
var Ur, Sn;
function yi() {
  if (Sn) return Ur;
  Sn = 1;
  function a(e, t, n, l) {
    for (var i = e & 65535 | 0, o = e >>> 16 & 65535 | 0, p = 0; n !== 0; ) {
      p = n > 2e3 ? 2e3 : n, n -= p;
      do
        i = i + t[l++] | 0, o = o + i | 0;
      while (--p);
      i %= 65521, o %= 65521;
    }
    return i | o << 16 | 0;
  }
  return Ur = a, Ur;
}
var Br, An;
function Ei() {
  if (An) return Br;
  An = 1;
  function a() {
    for (var n, l = [], i = 0; i < 256; i++) {
      n = i;
      for (var o = 0; o < 8; o++)
        n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
      l[i] = n;
    }
    return l;
  }
  var e = a();
  function t(n, l, i, o) {
    var p = e, c = o + i;
    n ^= -1;
    for (var b = o; b < c; b++)
      n = n >>> 8 ^ p[(n ^ l[b]) & 255];
    return n ^ -1;
  }
  return Br = t, Br;
}
var Wr, Rn;
function da() {
  return Rn || (Rn = 1, Wr = {
    2: "need dictionary",
    /* Z_NEED_DICT       2  */
    1: "stream end",
    /* Z_STREAM_END      1  */
    0: "",
    /* Z_OK              0  */
    "-1": "file error",
    /* Z_ERRNO         (-1) */
    "-2": "stream error",
    /* Z_STREAM_ERROR  (-2) */
    "-3": "data error",
    /* Z_DATA_ERROR    (-3) */
    "-4": "insufficient memory",
    /* Z_MEM_ERROR     (-4) */
    "-5": "buffer error",
    /* Z_BUF_ERROR     (-5) */
    "-6": "incompatible version"
    /* Z_VERSION_ERROR (-6) */
  }), Wr;
}
var xn;
function _l() {
  if (xn) return rt;
  xn = 1;
  var a = vt(), e = ml(), t = yi(), n = Ei(), l = da(), i = 0, o = 1, p = 3, c = 4, b = 5, E = 0, d = 1, s = -2, g = -3, v = -5, S = -1, R = 1, u = 2, _ = 3, T = 4, C = 0, O = 2, B = 8, F = 9, q = 15, ee = 8, te = 29, le = 256, oe = le + 1 + te, Z = 30, he = 19, we = 2 * oe + 1, ce = 15, x = 3, D = 258, M = D + x + 1, J = 32, re = 42, ae = 69, se = 73, ye = 91, Ee = 103, de = 113, w = 666, y = 1, W = 2, G = 3, fe = 4, Y = 3;
  function ne(r, k) {
    return r.msg = l[k], k;
  }
  function Ke(r) {
    return (r << 1) - (r > 4 ? 9 : 0);
  }
  function Oe(r) {
    for (var k = r.length; --k >= 0; )
      r[k] = 0;
  }
  function Pe(r) {
    var k = r.state, P = k.pending;
    P > r.avail_out && (P = r.avail_out), P !== 0 && (a.arraySet(r.output, k.pending_buf, k.pending_out, P, r.next_out), r.next_out += P, k.pending_out += P, r.total_out += P, r.avail_out -= P, k.pending -= P, k.pending === 0 && (k.pending_out = 0));
  }
  function be(r, k) {
    e._tr_flush_block(r, r.block_start >= 0 ? r.block_start : -1, r.strstart - r.block_start, k), r.block_start = r.strstart, Pe(r.strm);
  }
  function ue(r, k) {
    r.pending_buf[r.pending++] = k;
  }
  function Be(r, k) {
    r.pending_buf[r.pending++] = k >>> 8 & 255, r.pending_buf[r.pending++] = k & 255;
  }
  function it(r, k, P, f) {
    var A = r.avail_in;
    return A > f && (A = f), A === 0 ? 0 : (r.avail_in -= A, a.arraySet(k, r.input, r.next_in, A, P), r.state.wrap === 1 ? r.adler = t(r.adler, k, A, P) : r.state.wrap === 2 && (r.adler = n(r.adler, k, A, P)), r.next_in += A, r.total_in += A, A);
  }
  function $e(r, k) {
    var P = r.max_chain_length, f = r.strstart, A, N, Q = r.prev_length, V = r.nice_match, $ = r.strstart > r.w_size - M ? r.strstart - (r.w_size - M) : 0, me = r.window, ht = r.w_mask, Te = r.prev, _e = r.strstart + D, Ie = me[f + Q - 1], Me = me[f + Q];
    r.prev_length >= r.good_match && (P >>= 2), V > r.lookahead && (V = r.lookahead);
    do
      if (A = k, !(me[A + Q] !== Me || me[A + Q - 1] !== Ie || me[A] !== me[f] || me[++A] !== me[f + 1])) {
        f += 2, A++;
        do
          ;
        while (me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && me[++f] === me[++A] && f < _e);
        if (N = D - (_e - f), f = _e - D, N > Q) {
          if (r.match_start = k, Q = N, N >= V)
            break;
          Ie = me[f + Q - 1], Me = me[f + Q];
        }
      }
    while ((k = Te[k & ht]) > $ && --P !== 0);
    return Q <= r.lookahead ? Q : r.lookahead;
  }
  function Le(r) {
    var k = r.w_size, P, f, A, N, Q;
    do {
      if (N = r.window_size - r.lookahead - r.strstart, r.strstart >= k + (k - M)) {
        a.arraySet(r.window, r.window, k, k, 0), r.match_start -= k, r.strstart -= k, r.block_start -= k, f = r.hash_size, P = f;
        do
          A = r.head[--P], r.head[P] = A >= k ? A - k : 0;
        while (--f);
        f = k, P = f;
        do
          A = r.prev[--P], r.prev[P] = A >= k ? A - k : 0;
        while (--f);
        N += k;
      }
      if (r.strm.avail_in === 0)
        break;
      if (f = it(r.strm, r.window, r.strstart + r.lookahead, N), r.lookahead += f, r.lookahead + r.insert >= x)
        for (Q = r.strstart - r.insert, r.ins_h = r.window[Q], r.ins_h = (r.ins_h << r.hash_shift ^ r.window[Q + 1]) & r.hash_mask; r.insert && (r.ins_h = (r.ins_h << r.hash_shift ^ r.window[Q + x - 1]) & r.hash_mask, r.prev[Q & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = Q, Q++, r.insert--, !(r.lookahead + r.insert < x)); )
          ;
    } while (r.lookahead < M && r.strm.avail_in !== 0);
  }
  function Xe(r, k) {
    var P = 65535;
    for (P > r.pending_buf_size - 5 && (P = r.pending_buf_size - 5); ; ) {
      if (r.lookahead <= 1) {
        if (Le(r), r.lookahead === 0 && k === i)
          return y;
        if (r.lookahead === 0)
          break;
      }
      r.strstart += r.lookahead, r.lookahead = 0;
      var f = r.block_start + P;
      if ((r.strstart === 0 || r.strstart >= f) && (r.lookahead = r.strstart - f, r.strstart = f, be(r, !1), r.strm.avail_out === 0) || r.strstart - r.block_start >= r.w_size - M && (be(r, !1), r.strm.avail_out === 0))
        return y;
    }
    return r.insert = 0, k === c ? (be(r, !0), r.strm.avail_out === 0 ? G : fe) : (r.strstart > r.block_start && (be(r, !1), r.strm.avail_out === 0), y);
  }
  function We(r, k) {
    for (var P, f; ; ) {
      if (r.lookahead < M) {
        if (Le(r), r.lookahead < M && k === i)
          return y;
        if (r.lookahead === 0)
          break;
      }
      if (P = 0, r.lookahead >= x && (r.ins_h = (r.ins_h << r.hash_shift ^ r.window[r.strstart + x - 1]) & r.hash_mask, P = r.prev[r.strstart & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = r.strstart), P !== 0 && r.strstart - P <= r.w_size - M && (r.match_length = $e(r, P)), r.match_length >= x)
        if (f = e._tr_tally(r, r.strstart - r.match_start, r.match_length - x), r.lookahead -= r.match_length, r.match_length <= r.max_lazy_match && r.lookahead >= x) {
          r.match_length--;
          do
            r.strstart++, r.ins_h = (r.ins_h << r.hash_shift ^ r.window[r.strstart + x - 1]) & r.hash_mask, P = r.prev[r.strstart & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = r.strstart;
          while (--r.match_length !== 0);
          r.strstart++;
        } else
          r.strstart += r.match_length, r.match_length = 0, r.ins_h = r.window[r.strstart], r.ins_h = (r.ins_h << r.hash_shift ^ r.window[r.strstart + 1]) & r.hash_mask;
      else
        f = e._tr_tally(r, 0, r.window[r.strstart]), r.lookahead--, r.strstart++;
      if (f && (be(r, !1), r.strm.avail_out === 0))
        return y;
    }
    return r.insert = r.strstart < x - 1 ? r.strstart : x - 1, k === c ? (be(r, !0), r.strm.avail_out === 0 ? G : fe) : r.last_lit && (be(r, !1), r.strm.avail_out === 0) ? y : W;
  }
  function De(r, k) {
    for (var P, f, A; ; ) {
      if (r.lookahead < M) {
        if (Le(r), r.lookahead < M && k === i)
          return y;
        if (r.lookahead === 0)
          break;
      }
      if (P = 0, r.lookahead >= x && (r.ins_h = (r.ins_h << r.hash_shift ^ r.window[r.strstart + x - 1]) & r.hash_mask, P = r.prev[r.strstart & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = r.strstart), r.prev_length = r.match_length, r.prev_match = r.match_start, r.match_length = x - 1, P !== 0 && r.prev_length < r.max_lazy_match && r.strstart - P <= r.w_size - M && (r.match_length = $e(r, P), r.match_length <= 5 && (r.strategy === R || r.match_length === x && r.strstart - r.match_start > 4096) && (r.match_length = x - 1)), r.prev_length >= x && r.match_length <= r.prev_length) {
        A = r.strstart + r.lookahead - x, f = e._tr_tally(r, r.strstart - 1 - r.prev_match, r.prev_length - x), r.lookahead -= r.prev_length - 1, r.prev_length -= 2;
        do
          ++r.strstart <= A && (r.ins_h = (r.ins_h << r.hash_shift ^ r.window[r.strstart + x - 1]) & r.hash_mask, P = r.prev[r.strstart & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = r.strstart);
        while (--r.prev_length !== 0);
        if (r.match_available = 0, r.match_length = x - 1, r.strstart++, f && (be(r, !1), r.strm.avail_out === 0))
          return y;
      } else if (r.match_available) {
        if (f = e._tr_tally(r, 0, r.window[r.strstart - 1]), f && be(r, !1), r.strstart++, r.lookahead--, r.strm.avail_out === 0)
          return y;
      } else
        r.match_available = 1, r.strstart++, r.lookahead--;
    }
    return r.match_available && (f = e._tr_tally(r, 0, r.window[r.strstart - 1]), r.match_available = 0), r.insert = r.strstart < x - 1 ? r.strstart : x - 1, k === c ? (be(r, !0), r.strm.avail_out === 0 ? G : fe) : r.last_lit && (be(r, !1), r.strm.avail_out === 0) ? y : W;
  }
  function Rt(r, k) {
    for (var P, f, A, N, Q = r.window; ; ) {
      if (r.lookahead <= D) {
        if (Le(r), r.lookahead <= D && k === i)
          return y;
        if (r.lookahead === 0)
          break;
      }
      if (r.match_length = 0, r.lookahead >= x && r.strstart > 0 && (A = r.strstart - 1, f = Q[A], f === Q[++A] && f === Q[++A] && f === Q[++A])) {
        N = r.strstart + D;
        do
          ;
        while (f === Q[++A] && f === Q[++A] && f === Q[++A] && f === Q[++A] && f === Q[++A] && f === Q[++A] && f === Q[++A] && f === Q[++A] && A < N);
        r.match_length = D - (N - A), r.match_length > r.lookahead && (r.match_length = r.lookahead);
      }
      if (r.match_length >= x ? (P = e._tr_tally(r, 1, r.match_length - x), r.lookahead -= r.match_length, r.strstart += r.match_length, r.match_length = 0) : (P = e._tr_tally(r, 0, r.window[r.strstart]), r.lookahead--, r.strstart++), P && (be(r, !1), r.strm.avail_out === 0))
        return y;
    }
    return r.insert = 0, k === c ? (be(r, !0), r.strm.avail_out === 0 ? G : fe) : r.last_lit && (be(r, !1), r.strm.avail_out === 0) ? y : W;
  }
  function pt(r, k) {
    for (var P; ; ) {
      if (r.lookahead === 0 && (Le(r), r.lookahead === 0)) {
        if (k === i)
          return y;
        break;
      }
      if (r.match_length = 0, P = e._tr_tally(r, 0, r.window[r.strstart]), r.lookahead--, r.strstart++, P && (be(r, !1), r.strm.avail_out === 0))
        return y;
    }
    return r.insert = 0, k === c ? (be(r, !0), r.strm.avail_out === 0 ? G : fe) : r.last_lit && (be(r, !1), r.strm.avail_out === 0) ? y : W;
  }
  function Fe(r, k, P, f, A) {
    this.good_length = r, this.max_lazy = k, this.nice_length = P, this.max_chain = f, this.func = A;
  }
  var ot;
  ot = [
    /*      good lazy nice chain */
    new Fe(0, 0, 0, 0, Xe),
    /* 0 store only */
    new Fe(4, 4, 8, 4, We),
    /* 1 max speed, no lazy matches */
    new Fe(4, 5, 16, 8, We),
    /* 2 */
    new Fe(4, 6, 32, 32, We),
    /* 3 */
    new Fe(4, 4, 16, 16, De),
    /* 4 lazy matches */
    new Fe(8, 16, 32, 32, De),
    /* 5 */
    new Fe(8, 16, 128, 128, De),
    /* 6 */
    new Fe(8, 32, 128, 256, De),
    /* 7 */
    new Fe(32, 128, 258, 1024, De),
    /* 8 */
    new Fe(32, 258, 258, 4096, De)
    /* 9 max compression */
  ];
  function xt(r) {
    r.window_size = 2 * r.w_size, Oe(r.head), r.max_lazy_match = ot[r.level].max_lazy, r.good_match = ot[r.level].good_length, r.nice_match = ot[r.level].nice_length, r.max_chain_length = ot[r.level].max_chain, r.strstart = 0, r.block_start = 0, r.lookahead = 0, r.insert = 0, r.match_length = r.prev_length = x - 1, r.match_available = 0, r.ins_h = 0;
  }
  function m() {
    this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = B, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new a.Buf16(we * 2), this.dyn_dtree = new a.Buf16((2 * Z + 1) * 2), this.bl_tree = new a.Buf16((2 * he + 1) * 2), Oe(this.dyn_ltree), Oe(this.dyn_dtree), Oe(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new a.Buf16(ce + 1), this.heap = new a.Buf16(2 * oe + 1), Oe(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new a.Buf16(2 * oe + 1), Oe(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
  }
  function j(r) {
    var k;
    return !r || !r.state ? ne(r, s) : (r.total_in = r.total_out = 0, r.data_type = O, k = r.state, k.pending = 0, k.pending_out = 0, k.wrap < 0 && (k.wrap = -k.wrap), k.status = k.wrap ? re : de, r.adler = k.wrap === 2 ? 0 : 1, k.last_flush = i, e._tr_init(k), E);
  }
  function z(r) {
    var k = j(r);
    return k === E && xt(r.state), k;
  }
  function X(r, k) {
    return !r || !r.state || r.state.wrap !== 2 ? s : (r.state.gzhead = k, E);
  }
  function I(r, k, P, f, A, N) {
    if (!r)
      return s;
    var Q = 1;
    if (k === S && (k = 6), f < 0 ? (Q = 0, f = -f) : f > 15 && (Q = 2, f -= 16), A < 1 || A > F || P !== B || f < 8 || f > 15 || k < 0 || k > 9 || N < 0 || N > T)
      return ne(r, s);
    f === 8 && (f = 9);
    var V = new m();
    return r.state = V, V.strm = r, V.wrap = Q, V.gzhead = null, V.w_bits = f, V.w_size = 1 << V.w_bits, V.w_mask = V.w_size - 1, V.hash_bits = A + 7, V.hash_size = 1 << V.hash_bits, V.hash_mask = V.hash_size - 1, V.hash_shift = ~~((V.hash_bits + x - 1) / x), V.window = new a.Buf8(V.w_size * 2), V.head = new a.Buf16(V.hash_size), V.prev = new a.Buf16(V.w_size), V.lit_bufsize = 1 << A + 6, V.pending_buf_size = V.lit_bufsize * 4, V.pending_buf = new a.Buf8(V.pending_buf_size), V.d_buf = 1 * V.lit_bufsize, V.l_buf = 3 * V.lit_bufsize, V.level = k, V.strategy = N, V.method = P, z(r);
  }
  function L(r, k) {
    return I(r, k, B, q, ee, C);
  }
  function h(r, k) {
    var P, f, A, N;
    if (!r || !r.state || k > b || k < 0)
      return r ? ne(r, s) : s;
    if (f = r.state, !r.output || !r.input && r.avail_in !== 0 || f.status === w && k !== c)
      return ne(r, r.avail_out === 0 ? v : s);
    if (f.strm = r, P = f.last_flush, f.last_flush = k, f.status === re)
      if (f.wrap === 2)
        r.adler = 0, ue(f, 31), ue(f, 139), ue(f, 8), f.gzhead ? (ue(
          f,
          (f.gzhead.text ? 1 : 0) + (f.gzhead.hcrc ? 2 : 0) + (f.gzhead.extra ? 4 : 0) + (f.gzhead.name ? 8 : 0) + (f.gzhead.comment ? 16 : 0)
        ), ue(f, f.gzhead.time & 255), ue(f, f.gzhead.time >> 8 & 255), ue(f, f.gzhead.time >> 16 & 255), ue(f, f.gzhead.time >> 24 & 255), ue(f, f.level === 9 ? 2 : f.strategy >= u || f.level < 2 ? 4 : 0), ue(f, f.gzhead.os & 255), f.gzhead.extra && f.gzhead.extra.length && (ue(f, f.gzhead.extra.length & 255), ue(f, f.gzhead.extra.length >> 8 & 255)), f.gzhead.hcrc && (r.adler = n(r.adler, f.pending_buf, f.pending, 0)), f.gzindex = 0, f.status = ae) : (ue(f, 0), ue(f, 0), ue(f, 0), ue(f, 0), ue(f, 0), ue(f, f.level === 9 ? 2 : f.strategy >= u || f.level < 2 ? 4 : 0), ue(f, Y), f.status = de);
      else {
        var Q = B + (f.w_bits - 8 << 4) << 8, V = -1;
        f.strategy >= u || f.level < 2 ? V = 0 : f.level < 6 ? V = 1 : f.level === 6 ? V = 2 : V = 3, Q |= V << 6, f.strstart !== 0 && (Q |= J), Q += 31 - Q % 31, f.status = de, Be(f, Q), f.strstart !== 0 && (Be(f, r.adler >>> 16), Be(f, r.adler & 65535)), r.adler = 1;
      }
    if (f.status === ae)
      if (f.gzhead.extra) {
        for (A = f.pending; f.gzindex < (f.gzhead.extra.length & 65535) && !(f.pending === f.pending_buf_size && (f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), Pe(r), A = f.pending, f.pending === f.pending_buf_size)); )
          ue(f, f.gzhead.extra[f.gzindex] & 255), f.gzindex++;
        f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), f.gzindex === f.gzhead.extra.length && (f.gzindex = 0, f.status = se);
      } else
        f.status = se;
    if (f.status === se)
      if (f.gzhead.name) {
        A = f.pending;
        do {
          if (f.pending === f.pending_buf_size && (f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), Pe(r), A = f.pending, f.pending === f.pending_buf_size)) {
            N = 1;
            break;
          }
          f.gzindex < f.gzhead.name.length ? N = f.gzhead.name.charCodeAt(f.gzindex++) & 255 : N = 0, ue(f, N);
        } while (N !== 0);
        f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), N === 0 && (f.gzindex = 0, f.status = ye);
      } else
        f.status = ye;
    if (f.status === ye)
      if (f.gzhead.comment) {
        A = f.pending;
        do {
          if (f.pending === f.pending_buf_size && (f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), Pe(r), A = f.pending, f.pending === f.pending_buf_size)) {
            N = 1;
            break;
          }
          f.gzindex < f.gzhead.comment.length ? N = f.gzhead.comment.charCodeAt(f.gzindex++) & 255 : N = 0, ue(f, N);
        } while (N !== 0);
        f.gzhead.hcrc && f.pending > A && (r.adler = n(r.adler, f.pending_buf, f.pending - A, A)), N === 0 && (f.status = Ee);
      } else
        f.status = Ee;
    if (f.status === Ee && (f.gzhead.hcrc ? (f.pending + 2 > f.pending_buf_size && Pe(r), f.pending + 2 <= f.pending_buf_size && (ue(f, r.adler & 255), ue(f, r.adler >> 8 & 255), r.adler = 0, f.status = de)) : f.status = de), f.pending !== 0) {
      if (Pe(r), r.avail_out === 0)
        return f.last_flush = -1, E;
    } else if (r.avail_in === 0 && Ke(k) <= Ke(P) && k !== c)
      return ne(r, v);
    if (f.status === w && r.avail_in !== 0)
      return ne(r, v);
    if (r.avail_in !== 0 || f.lookahead !== 0 || k !== i && f.status !== w) {
      var $ = f.strategy === u ? pt(f, k) : f.strategy === _ ? Rt(f, k) : ot[f.level].func(f, k);
      if (($ === G || $ === fe) && (f.status = w), $ === y || $ === G)
        return r.avail_out === 0 && (f.last_flush = -1), E;
      if ($ === W && (k === o ? e._tr_align(f) : k !== b && (e._tr_stored_block(f, 0, 0, !1), k === p && (Oe(f.head), f.lookahead === 0 && (f.strstart = 0, f.block_start = 0, f.insert = 0))), Pe(r), r.avail_out === 0))
        return f.last_flush = -1, E;
    }
    return k !== c ? E : f.wrap <= 0 ? d : (f.wrap === 2 ? (ue(f, r.adler & 255), ue(f, r.adler >> 8 & 255), ue(f, r.adler >> 16 & 255), ue(f, r.adler >> 24 & 255), ue(f, r.total_in & 255), ue(f, r.total_in >> 8 & 255), ue(f, r.total_in >> 16 & 255), ue(f, r.total_in >> 24 & 255)) : (Be(f, r.adler >>> 16), Be(f, r.adler & 65535)), Pe(r), f.wrap > 0 && (f.wrap = -f.wrap), f.pending !== 0 ? E : d);
  }
  function H(r) {
    var k;
    return !r || !r.state ? s : (k = r.state.status, k !== re && k !== ae && k !== se && k !== ye && k !== Ee && k !== de && k !== w ? ne(r, s) : (r.state = null, k === de ? ne(r, g) : E));
  }
  function ie(r, k) {
    var P = k.length, f, A, N, Q, V, $, me, ht;
    if (!r || !r.state || (f = r.state, Q = f.wrap, Q === 2 || Q === 1 && f.status !== re || f.lookahead))
      return s;
    for (Q === 1 && (r.adler = t(r.adler, k, P, 0)), f.wrap = 0, P >= f.w_size && (Q === 0 && (Oe(f.head), f.strstart = 0, f.block_start = 0, f.insert = 0), ht = new a.Buf8(f.w_size), a.arraySet(ht, k, P - f.w_size, f.w_size, 0), k = ht, P = f.w_size), V = r.avail_in, $ = r.next_in, me = r.input, r.avail_in = P, r.next_in = 0, r.input = k, Le(f); f.lookahead >= x; ) {
      A = f.strstart, N = f.lookahead - (x - 1);
      do
        f.ins_h = (f.ins_h << f.hash_shift ^ f.window[A + x - 1]) & f.hash_mask, f.prev[A & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = A, A++;
      while (--N);
      f.strstart = A, f.lookahead = x - 1, Le(f);
    }
    return f.strstart += f.lookahead, f.block_start = f.strstart, f.insert = f.lookahead, f.lookahead = 0, f.match_length = f.prev_length = x - 1, f.match_available = 0, r.next_in = $, r.input = me, r.avail_in = V, f.wrap = Q, E;
  }
  return rt.deflateInit = L, rt.deflateInit2 = I, rt.deflateReset = z, rt.deflateResetKeep = j, rt.deflateSetHeader = X, rt.deflate = h, rt.deflateEnd = H, rt.deflateSetDictionary = ie, rt.deflateInfo = "pako deflate (from Nodeca project)", rt;
}
var Et = {}, In;
function bi() {
  if (In) return Et;
  In = 1;
  var a = vt(), e = !0, t = !0;
  try {
    String.fromCharCode.apply(null, [0]);
  } catch {
    e = !1;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch {
    t = !1;
  }
  for (var n = new a.Buf8(256), l = 0; l < 256; l++)
    n[l] = l >= 252 ? 6 : l >= 248 ? 5 : l >= 240 ? 4 : l >= 224 ? 3 : l >= 192 ? 2 : 1;
  n[254] = n[254] = 1, Et.string2buf = function(o) {
    var p, c, b, E, d, s = o.length, g = 0;
    for (E = 0; E < s; E++)
      c = o.charCodeAt(E), (c & 64512) === 55296 && E + 1 < s && (b = o.charCodeAt(E + 1), (b & 64512) === 56320 && (c = 65536 + (c - 55296 << 10) + (b - 56320), E++)), g += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
    for (p = new a.Buf8(g), d = 0, E = 0; d < g; E++)
      c = o.charCodeAt(E), (c & 64512) === 55296 && E + 1 < s && (b = o.charCodeAt(E + 1), (b & 64512) === 56320 && (c = 65536 + (c - 55296 << 10) + (b - 56320), E++)), c < 128 ? p[d++] = c : c < 2048 ? (p[d++] = 192 | c >>> 6, p[d++] = 128 | c & 63) : c < 65536 ? (p[d++] = 224 | c >>> 12, p[d++] = 128 | c >>> 6 & 63, p[d++] = 128 | c & 63) : (p[d++] = 240 | c >>> 18, p[d++] = 128 | c >>> 12 & 63, p[d++] = 128 | c >>> 6 & 63, p[d++] = 128 | c & 63);
    return p;
  };
  function i(o, p) {
    if (p < 65534 && (o.subarray && t || !o.subarray && e))
      return String.fromCharCode.apply(null, a.shrinkBuf(o, p));
    for (var c = "", b = 0; b < p; b++)
      c += String.fromCharCode(o[b]);
    return c;
  }
  return Et.buf2binstring = function(o) {
    return i(o, o.length);
  }, Et.binstring2buf = function(o) {
    for (var p = new a.Buf8(o.length), c = 0, b = p.length; c < b; c++)
      p[c] = o.charCodeAt(c);
    return p;
  }, Et.buf2string = function(o, p) {
    var c, b, E, d, s = p || o.length, g = new Array(s * 2);
    for (b = 0, c = 0; c < s; ) {
      if (E = o[c++], E < 128) {
        g[b++] = E;
        continue;
      }
      if (d = n[E], d > 4) {
        g[b++] = 65533, c += d - 1;
        continue;
      }
      for (E &= d === 2 ? 31 : d === 3 ? 15 : 7; d > 1 && c < s; )
        E = E << 6 | o[c++] & 63, d--;
      if (d > 1) {
        g[b++] = 65533;
        continue;
      }
      E < 65536 ? g[b++] = E : (E -= 65536, g[b++] = 55296 | E >> 10 & 1023, g[b++] = 56320 | E & 1023);
    }
    return i(g, b);
  }, Et.utf8border = function(o, p) {
    var c;
    for (p = p || o.length, p > o.length && (p = o.length), c = p - 1; c >= 0 && (o[c] & 192) === 128; )
      c--;
    return c < 0 || c === 0 ? p : c + n[o[c]] > p ? c : p;
  }, Et;
}
var jr, Cn;
function Ti() {
  if (Cn) return jr;
  Cn = 1;
  function a() {
    this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
  }
  return jr = a, jr;
}
var Dn;
function vl() {
  if (Dn) return Dt;
  Dn = 1;
  var a = _l(), e = vt(), t = bi(), n = da(), l = Ti(), i = Object.prototype.toString, o = 0, p = 4, c = 0, b = 1, E = 2, d = -1, s = 0, g = 8;
  function v(_) {
    if (!(this instanceof v)) return new v(_);
    this.options = e.assign({
      level: d,
      method: g,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: s,
      to: ""
    }, _ || {});
    var T = this.options;
    T.raw && T.windowBits > 0 ? T.windowBits = -T.windowBits : T.gzip && T.windowBits > 0 && T.windowBits < 16 && (T.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l(), this.strm.avail_out = 0;
    var C = a.deflateInit2(
      this.strm,
      T.level,
      T.method,
      T.windowBits,
      T.memLevel,
      T.strategy
    );
    if (C !== c)
      throw new Error(n[C]);
    if (T.header && a.deflateSetHeader(this.strm, T.header), T.dictionary) {
      var O;
      if (typeof T.dictionary == "string" ? O = t.string2buf(T.dictionary) : i.call(T.dictionary) === "[object ArrayBuffer]" ? O = new Uint8Array(T.dictionary) : O = T.dictionary, C = a.deflateSetDictionary(this.strm, O), C !== c)
        throw new Error(n[C]);
      this._dict_set = !0;
    }
  }
  v.prototype.push = function(_, T) {
    var C = this.strm, O = this.options.chunkSize, B, F;
    if (this.ended)
      return !1;
    F = T === ~~T ? T : T === !0 ? p : o, typeof _ == "string" ? C.input = t.string2buf(_) : i.call(_) === "[object ArrayBuffer]" ? C.input = new Uint8Array(_) : C.input = _, C.next_in = 0, C.avail_in = C.input.length;
    do {
      if (C.avail_out === 0 && (C.output = new e.Buf8(O), C.next_out = 0, C.avail_out = O), B = a.deflate(C, F), B !== b && B !== c)
        return this.onEnd(B), this.ended = !0, !1;
      (C.avail_out === 0 || C.avail_in === 0 && (F === p || F === E)) && (this.options.to === "string" ? this.onData(t.buf2binstring(e.shrinkBuf(C.output, C.next_out))) : this.onData(e.shrinkBuf(C.output, C.next_out)));
    } while ((C.avail_in > 0 || C.avail_out === 0) && B !== b);
    return F === p ? (B = a.deflateEnd(this.strm), this.onEnd(B), this.ended = !0, B === c) : (F === E && (this.onEnd(c), C.avail_out = 0), !0);
  }, v.prototype.onData = function(_) {
    this.chunks.push(_);
  }, v.prototype.onEnd = function(_) {
    _ === c && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = _, this.msg = this.strm.msg;
  };
  function S(_, T) {
    var C = new v(T);
    if (C.push(_, !0), C.err)
      throw C.msg || n[C.err];
    return C.result;
  }
  function R(_, T) {
    return T = T || {}, T.raw = !0, S(_, T);
  }
  function u(_, T) {
    return T = T || {}, T.gzip = !0, S(_, T);
  }
  return Dt.Deflate = v, Dt.deflate = S, Dt.deflateRaw = R, Dt.gzip = u, Dt;
}
var Nt = {}, et = {}, Hr, Nn;
function wl() {
  if (Nn) return Hr;
  Nn = 1;
  var a = 30, e = 12;
  return Hr = function(n, l) {
    var i, o, p, c, b, E, d, s, g, v, S, R, u, _, T, C, O, B, F, q, ee, te, le, oe, Z;
    i = n.state, o = n.next_in, oe = n.input, p = o + (n.avail_in - 5), c = n.next_out, Z = n.output, b = c - (l - n.avail_out), E = c + (n.avail_out - 257), d = i.dmax, s = i.wsize, g = i.whave, v = i.wnext, S = i.window, R = i.hold, u = i.bits, _ = i.lencode, T = i.distcode, C = (1 << i.lenbits) - 1, O = (1 << i.distbits) - 1;
    e:
      do {
        u < 15 && (R += oe[o++] << u, u += 8, R += oe[o++] << u, u += 8), B = _[R & C];
        t:
          for (; ; ) {
            if (F = B >>> 24, R >>>= F, u -= F, F = B >>> 16 & 255, F === 0)
              Z[c++] = B & 65535;
            else if (F & 16) {
              q = B & 65535, F &= 15, F && (u < F && (R += oe[o++] << u, u += 8), q += R & (1 << F) - 1, R >>>= F, u -= F), u < 15 && (R += oe[o++] << u, u += 8, R += oe[o++] << u, u += 8), B = T[R & O];
              r:
                for (; ; ) {
                  if (F = B >>> 24, R >>>= F, u -= F, F = B >>> 16 & 255, F & 16) {
                    if (ee = B & 65535, F &= 15, u < F && (R += oe[o++] << u, u += 8, u < F && (R += oe[o++] << u, u += 8)), ee += R & (1 << F) - 1, ee > d) {
                      n.msg = "invalid distance too far back", i.mode = a;
                      break e;
                    }
                    if (R >>>= F, u -= F, F = c - b, ee > F) {
                      if (F = ee - F, F > g && i.sane) {
                        n.msg = "invalid distance too far back", i.mode = a;
                        break e;
                      }
                      if (te = 0, le = S, v === 0) {
                        if (te += s - F, F < q) {
                          q -= F;
                          do
                            Z[c++] = S[te++];
                          while (--F);
                          te = c - ee, le = Z;
                        }
                      } else if (v < F) {
                        if (te += s + v - F, F -= v, F < q) {
                          q -= F;
                          do
                            Z[c++] = S[te++];
                          while (--F);
                          if (te = 0, v < q) {
                            F = v, q -= F;
                            do
                              Z[c++] = S[te++];
                            while (--F);
                            te = c - ee, le = Z;
                          }
                        }
                      } else if (te += v - F, F < q) {
                        q -= F;
                        do
                          Z[c++] = S[te++];
                        while (--F);
                        te = c - ee, le = Z;
                      }
                      for (; q > 2; )
                        Z[c++] = le[te++], Z[c++] = le[te++], Z[c++] = le[te++], q -= 3;
                      q && (Z[c++] = le[te++], q > 1 && (Z[c++] = le[te++]));
                    } else {
                      te = c - ee;
                      do
                        Z[c++] = Z[te++], Z[c++] = Z[te++], Z[c++] = Z[te++], q -= 3;
                      while (q > 2);
                      q && (Z[c++] = Z[te++], q > 1 && (Z[c++] = Z[te++]));
                    }
                  } else if ((F & 64) === 0) {
                    B = T[(B & 65535) + (R & (1 << F) - 1)];
                    continue r;
                  } else {
                    n.msg = "invalid distance code", i.mode = a;
                    break e;
                  }
                  break;
                }
            } else if ((F & 64) === 0) {
              B = _[(B & 65535) + (R & (1 << F) - 1)];
              continue t;
            } else if (F & 32) {
              i.mode = e;
              break e;
            } else {
              n.msg = "invalid literal/length code", i.mode = a;
              break e;
            }
            break;
          }
      } while (o < p && c < E);
    q = u >> 3, o -= q, u -= q << 3, R &= (1 << u) - 1, n.next_in = o, n.next_out = c, n.avail_in = o < p ? 5 + (p - o) : 5 - (o - p), n.avail_out = c < E ? 257 + (E - c) : 257 - (c - E), i.hold = R, i.bits = u;
  }, Hr;
}
var zr, kn;
function yl() {
  if (kn) return zr;
  kn = 1;
  var a = vt(), e = 15, t = 852, n = 592, l = 0, i = 1, o = 2, p = [
    /* Length codes 257..285 base */
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ], c = [
    /* Length codes 257..285 extra */
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ], b = [
    /* Distance codes 0..29 base */
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ], E = [
    /* Distance codes 0..29 extra */
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ];
  return zr = function(s, g, v, S, R, u, _, T) {
    var C = T.bits, O = 0, B = 0, F = 0, q = 0, ee = 0, te = 0, le = 0, oe = 0, Z = 0, he = 0, we, ce, x, D, M, J = null, re = 0, ae, se = new a.Buf16(e + 1), ye = new a.Buf16(e + 1), Ee = null, de = 0, w, y, W;
    for (O = 0; O <= e; O++)
      se[O] = 0;
    for (B = 0; B < S; B++)
      se[g[v + B]]++;
    for (ee = C, q = e; q >= 1 && se[q] === 0; q--)
      ;
    if (ee > q && (ee = q), q === 0)
      return R[u++] = 1 << 24 | 64 << 16 | 0, R[u++] = 1 << 24 | 64 << 16 | 0, T.bits = 1, 0;
    for (F = 1; F < q && se[F] === 0; F++)
      ;
    for (ee < F && (ee = F), oe = 1, O = 1; O <= e; O++)
      if (oe <<= 1, oe -= se[O], oe < 0)
        return -1;
    if (oe > 0 && (s === l || q !== 1))
      return -1;
    for (ye[1] = 0, O = 1; O < e; O++)
      ye[O + 1] = ye[O] + se[O];
    for (B = 0; B < S; B++)
      g[v + B] !== 0 && (_[ye[g[v + B]]++] = B);
    if (s === l ? (J = Ee = _, ae = 19) : s === i ? (J = p, re -= 257, Ee = c, de -= 257, ae = 256) : (J = b, Ee = E, ae = -1), he = 0, B = 0, O = F, M = u, te = ee, le = 0, x = -1, Z = 1 << ee, D = Z - 1, s === i && Z > t || s === o && Z > n)
      return 1;
    for (; ; ) {
      w = O - le, _[B] < ae ? (y = 0, W = _[B]) : _[B] > ae ? (y = Ee[de + _[B]], W = J[re + _[B]]) : (y = 96, W = 0), we = 1 << O - le, ce = 1 << te, F = ce;
      do
        ce -= we, R[M + (he >> le) + ce] = w << 24 | y << 16 | W | 0;
      while (ce !== 0);
      for (we = 1 << O - 1; he & we; )
        we >>= 1;
      if (we !== 0 ? (he &= we - 1, he += we) : he = 0, B++, --se[O] === 0) {
        if (O === q)
          break;
        O = g[v + _[B]];
      }
      if (O > ee && (he & D) !== x) {
        for (le === 0 && (le = ee), M += F, te = O - le, oe = 1 << te; te + le < q && (oe -= se[te + le], !(oe <= 0)); )
          te++, oe <<= 1;
        if (Z += 1 << te, s === i && Z > t || s === o && Z > n)
          return 1;
        x = he & D, R[x] = ee << 24 | te << 16 | M - u | 0;
      }
    }
    return he !== 0 && (R[M + he] = O - le << 24 | 64 << 16 | 0), T.bits = ee, 0;
  }, zr;
}
var On;
function El() {
  if (On) return et;
  On = 1;
  var a = vt(), e = yi(), t = Ei(), n = wl(), l = yl(), i = 0, o = 1, p = 2, c = 4, b = 5, E = 6, d = 0, s = 1, g = 2, v = -2, S = -3, R = -4, u = -5, _ = 8, T = 1, C = 2, O = 3, B = 4, F = 5, q = 6, ee = 7, te = 8, le = 9, oe = 10, Z = 11, he = 12, we = 13, ce = 14, x = 15, D = 16, M = 17, J = 18, re = 19, ae = 20, se = 21, ye = 22, Ee = 23, de = 24, w = 25, y = 26, W = 27, G = 28, fe = 29, Y = 30, ne = 31, Ke = 32, Oe = 852, Pe = 592, be = 15, ue = be;
  function Be(I) {
    return (I >>> 24 & 255) + (I >>> 8 & 65280) + ((I & 65280) << 8) + ((I & 255) << 24);
  }
  function it() {
    this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new a.Buf16(320), this.work = new a.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
  }
  function $e(I) {
    var L;
    return !I || !I.state ? v : (L = I.state, I.total_in = I.total_out = L.total = 0, I.msg = "", L.wrap && (I.adler = L.wrap & 1), L.mode = T, L.last = 0, L.havedict = 0, L.dmax = 32768, L.head = null, L.hold = 0, L.bits = 0, L.lencode = L.lendyn = new a.Buf32(Oe), L.distcode = L.distdyn = new a.Buf32(Pe), L.sane = 1, L.back = -1, d);
  }
  function Le(I) {
    var L;
    return !I || !I.state ? v : (L = I.state, L.wsize = 0, L.whave = 0, L.wnext = 0, $e(I));
  }
  function Xe(I, L) {
    var h, H;
    return !I || !I.state || (H = I.state, L < 0 ? (h = 0, L = -L) : (h = (L >> 4) + 1, L < 48 && (L &= 15)), L && (L < 8 || L > 15)) ? v : (H.window !== null && H.wbits !== L && (H.window = null), H.wrap = h, H.wbits = L, Le(I));
  }
  function We(I, L) {
    var h, H;
    return I ? (H = new it(), I.state = H, H.window = null, h = Xe(I, L), h !== d && (I.state = null), h) : v;
  }
  function De(I) {
    return We(I, ue);
  }
  var Rt = !0, pt, Fe;
  function ot(I) {
    if (Rt) {
      var L;
      for (pt = new a.Buf32(512), Fe = new a.Buf32(32), L = 0; L < 144; )
        I.lens[L++] = 8;
      for (; L < 256; )
        I.lens[L++] = 9;
      for (; L < 280; )
        I.lens[L++] = 7;
      for (; L < 288; )
        I.lens[L++] = 8;
      for (l(o, I.lens, 0, 288, pt, 0, I.work, { bits: 9 }), L = 0; L < 32; )
        I.lens[L++] = 5;
      l(p, I.lens, 0, 32, Fe, 0, I.work, { bits: 5 }), Rt = !1;
    }
    I.lencode = pt, I.lenbits = 9, I.distcode = Fe, I.distbits = 5;
  }
  function xt(I, L, h, H) {
    var ie, r = I.state;
    return r.window === null && (r.wsize = 1 << r.wbits, r.wnext = 0, r.whave = 0, r.window = new a.Buf8(r.wsize)), H >= r.wsize ? (a.arraySet(r.window, L, h - r.wsize, r.wsize, 0), r.wnext = 0, r.whave = r.wsize) : (ie = r.wsize - r.wnext, ie > H && (ie = H), a.arraySet(r.window, L, h - H, ie, r.wnext), H -= ie, H ? (a.arraySet(r.window, L, h - H, H, 0), r.wnext = H, r.whave = r.wsize) : (r.wnext += ie, r.wnext === r.wsize && (r.wnext = 0), r.whave < r.wsize && (r.whave += ie))), 0;
  }
  function m(I, L) {
    var h, H, ie, r, k, P, f, A, N, Q, V, $, me, ht, Te = 0, _e, Ie, Me, He, jt, Ht, Re, Je, Ne = new a.Buf8(4), ft, st, pa = (
      /* permutation of code lengths */
      [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    );
    if (!I || !I.state || !I.output || !I.input && I.avail_in !== 0)
      return v;
    h = I.state, h.mode === he && (h.mode = we), k = I.next_out, ie = I.output, f = I.avail_out, r = I.next_in, H = I.input, P = I.avail_in, A = h.hold, N = h.bits, Q = P, V = f, Je = d;
    e:
      for (; ; )
        switch (h.mode) {
          case T:
            if (h.wrap === 0) {
              h.mode = we;
              break;
            }
            for (; N < 16; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if (h.wrap & 2 && A === 35615) {
              h.check = 0, Ne[0] = A & 255, Ne[1] = A >>> 8 & 255, h.check = t(h.check, Ne, 2, 0), A = 0, N = 0, h.mode = C;
              break;
            }
            if (h.flags = 0, h.head && (h.head.done = !1), !(h.wrap & 1) || /* check if zlib header allowed */
            (((A & 255) << 8) + (A >> 8)) % 31) {
              I.msg = "incorrect header check", h.mode = Y;
              break;
            }
            if ((A & 15) !== _) {
              I.msg = "unknown compression method", h.mode = Y;
              break;
            }
            if (A >>>= 4, N -= 4, Re = (A & 15) + 8, h.wbits === 0)
              h.wbits = Re;
            else if (Re > h.wbits) {
              I.msg = "invalid window size", h.mode = Y;
              break;
            }
            h.dmax = 1 << Re, I.adler = h.check = 1, h.mode = A & 512 ? oe : he, A = 0, N = 0;
            break;
          case C:
            for (; N < 16; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if (h.flags = A, (h.flags & 255) !== _) {
              I.msg = "unknown compression method", h.mode = Y;
              break;
            }
            if (h.flags & 57344) {
              I.msg = "unknown header flags set", h.mode = Y;
              break;
            }
            h.head && (h.head.text = A >> 8 & 1), h.flags & 512 && (Ne[0] = A & 255, Ne[1] = A >>> 8 & 255, h.check = t(h.check, Ne, 2, 0)), A = 0, N = 0, h.mode = O;
          /* falls through */
          case O:
            for (; N < 32; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            h.head && (h.head.time = A), h.flags & 512 && (Ne[0] = A & 255, Ne[1] = A >>> 8 & 255, Ne[2] = A >>> 16 & 255, Ne[3] = A >>> 24 & 255, h.check = t(h.check, Ne, 4, 0)), A = 0, N = 0, h.mode = B;
          /* falls through */
          case B:
            for (; N < 16; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            h.head && (h.head.xflags = A & 255, h.head.os = A >> 8), h.flags & 512 && (Ne[0] = A & 255, Ne[1] = A >>> 8 & 255, h.check = t(h.check, Ne, 2, 0)), A = 0, N = 0, h.mode = F;
          /* falls through */
          case F:
            if (h.flags & 1024) {
              for (; N < 16; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              h.length = A, h.head && (h.head.extra_len = A), h.flags & 512 && (Ne[0] = A & 255, Ne[1] = A >>> 8 & 255, h.check = t(h.check, Ne, 2, 0)), A = 0, N = 0;
            } else h.head && (h.head.extra = null);
            h.mode = q;
          /* falls through */
          case q:
            if (h.flags & 1024 && ($ = h.length, $ > P && ($ = P), $ && (h.head && (Re = h.head.extra_len - h.length, h.head.extra || (h.head.extra = new Array(h.head.extra_len)), a.arraySet(
              h.head.extra,
              H,
              r,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              $,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              Re
            )), h.flags & 512 && (h.check = t(h.check, H, $, r)), P -= $, r += $, h.length -= $), h.length))
              break e;
            h.length = 0, h.mode = ee;
          /* falls through */
          case ee:
            if (h.flags & 2048) {
              if (P === 0)
                break e;
              $ = 0;
              do
                Re = H[r + $++], h.head && Re && h.length < 65536 && (h.head.name += String.fromCharCode(Re));
              while (Re && $ < P);
              if (h.flags & 512 && (h.check = t(h.check, H, $, r)), P -= $, r += $, Re)
                break e;
            } else h.head && (h.head.name = null);
            h.length = 0, h.mode = te;
          /* falls through */
          case te:
            if (h.flags & 4096) {
              if (P === 0)
                break e;
              $ = 0;
              do
                Re = H[r + $++], h.head && Re && h.length < 65536 && (h.head.comment += String.fromCharCode(Re));
              while (Re && $ < P);
              if (h.flags & 512 && (h.check = t(h.check, H, $, r)), P -= $, r += $, Re)
                break e;
            } else h.head && (h.head.comment = null);
            h.mode = le;
          /* falls through */
          case le:
            if (h.flags & 512) {
              for (; N < 16; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              if (A !== (h.check & 65535)) {
                I.msg = "header crc mismatch", h.mode = Y;
                break;
              }
              A = 0, N = 0;
            }
            h.head && (h.head.hcrc = h.flags >> 9 & 1, h.head.done = !0), I.adler = h.check = 0, h.mode = he;
            break;
          case oe:
            for (; N < 32; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            I.adler = h.check = Be(A), A = 0, N = 0, h.mode = Z;
          /* falls through */
          case Z:
            if (h.havedict === 0)
              return I.next_out = k, I.avail_out = f, I.next_in = r, I.avail_in = P, h.hold = A, h.bits = N, g;
            I.adler = h.check = 1, h.mode = he;
          /* falls through */
          case he:
            if (L === b || L === E)
              break e;
          /* falls through */
          case we:
            if (h.last) {
              A >>>= N & 7, N -= N & 7, h.mode = W;
              break;
            }
            for (; N < 3; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            switch (h.last = A & 1, A >>>= 1, N -= 1, A & 3) {
              case 0:
                h.mode = ce;
                break;
              case 1:
                if (ot(h), h.mode = ae, L === E) {
                  A >>>= 2, N -= 2;
                  break e;
                }
                break;
              case 2:
                h.mode = M;
                break;
              case 3:
                I.msg = "invalid block type", h.mode = Y;
            }
            A >>>= 2, N -= 2;
            break;
          case ce:
            for (A >>>= N & 7, N -= N & 7; N < 32; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if ((A & 65535) !== (A >>> 16 ^ 65535)) {
              I.msg = "invalid stored block lengths", h.mode = Y;
              break;
            }
            if (h.length = A & 65535, A = 0, N = 0, h.mode = x, L === E)
              break e;
          /* falls through */
          case x:
            h.mode = D;
          /* falls through */
          case D:
            if ($ = h.length, $) {
              if ($ > P && ($ = P), $ > f && ($ = f), $ === 0)
                break e;
              a.arraySet(ie, H, r, $, k), P -= $, r += $, f -= $, k += $, h.length -= $;
              break;
            }
            h.mode = he;
            break;
          case M:
            for (; N < 14; ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if (h.nlen = (A & 31) + 257, A >>>= 5, N -= 5, h.ndist = (A & 31) + 1, A >>>= 5, N -= 5, h.ncode = (A & 15) + 4, A >>>= 4, N -= 4, h.nlen > 286 || h.ndist > 30) {
              I.msg = "too many length or distance symbols", h.mode = Y;
              break;
            }
            h.have = 0, h.mode = J;
          /* falls through */
          case J:
            for (; h.have < h.ncode; ) {
              for (; N < 3; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              h.lens[pa[h.have++]] = A & 7, A >>>= 3, N -= 3;
            }
            for (; h.have < 19; )
              h.lens[pa[h.have++]] = 0;
            if (h.lencode = h.lendyn, h.lenbits = 7, ft = { bits: h.lenbits }, Je = l(i, h.lens, 0, 19, h.lencode, 0, h.work, ft), h.lenbits = ft.bits, Je) {
              I.msg = "invalid code lengths set", h.mode = Y;
              break;
            }
            h.have = 0, h.mode = re;
          /* falls through */
          case re:
            for (; h.have < h.nlen + h.ndist; ) {
              for (; Te = h.lencode[A & (1 << h.lenbits) - 1], _e = Te >>> 24, Ie = Te >>> 16 & 255, Me = Te & 65535, !(_e <= N); ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              if (Me < 16)
                A >>>= _e, N -= _e, h.lens[h.have++] = Me;
              else {
                if (Me === 16) {
                  for (st = _e + 2; N < st; ) {
                    if (P === 0)
                      break e;
                    P--, A += H[r++] << N, N += 8;
                  }
                  if (A >>>= _e, N -= _e, h.have === 0) {
                    I.msg = "invalid bit length repeat", h.mode = Y;
                    break;
                  }
                  Re = h.lens[h.have - 1], $ = 3 + (A & 3), A >>>= 2, N -= 2;
                } else if (Me === 17) {
                  for (st = _e + 3; N < st; ) {
                    if (P === 0)
                      break e;
                    P--, A += H[r++] << N, N += 8;
                  }
                  A >>>= _e, N -= _e, Re = 0, $ = 3 + (A & 7), A >>>= 3, N -= 3;
                } else {
                  for (st = _e + 7; N < st; ) {
                    if (P === 0)
                      break e;
                    P--, A += H[r++] << N, N += 8;
                  }
                  A >>>= _e, N -= _e, Re = 0, $ = 11 + (A & 127), A >>>= 7, N -= 7;
                }
                if (h.have + $ > h.nlen + h.ndist) {
                  I.msg = "invalid bit length repeat", h.mode = Y;
                  break;
                }
                for (; $--; )
                  h.lens[h.have++] = Re;
              }
            }
            if (h.mode === Y)
              break;
            if (h.lens[256] === 0) {
              I.msg = "invalid code -- missing end-of-block", h.mode = Y;
              break;
            }
            if (h.lenbits = 9, ft = { bits: h.lenbits }, Je = l(o, h.lens, 0, h.nlen, h.lencode, 0, h.work, ft), h.lenbits = ft.bits, Je) {
              I.msg = "invalid literal/lengths set", h.mode = Y;
              break;
            }
            if (h.distbits = 6, h.distcode = h.distdyn, ft = { bits: h.distbits }, Je = l(p, h.lens, h.nlen, h.ndist, h.distcode, 0, h.work, ft), h.distbits = ft.bits, Je) {
              I.msg = "invalid distances set", h.mode = Y;
              break;
            }
            if (h.mode = ae, L === E)
              break e;
          /* falls through */
          case ae:
            h.mode = se;
          /* falls through */
          case se:
            if (P >= 6 && f >= 258) {
              I.next_out = k, I.avail_out = f, I.next_in = r, I.avail_in = P, h.hold = A, h.bits = N, n(I, V), k = I.next_out, ie = I.output, f = I.avail_out, r = I.next_in, H = I.input, P = I.avail_in, A = h.hold, N = h.bits, h.mode === he && (h.back = -1);
              break;
            }
            for (h.back = 0; Te = h.lencode[A & (1 << h.lenbits) - 1], _e = Te >>> 24, Ie = Te >>> 16 & 255, Me = Te & 65535, !(_e <= N); ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if (Ie && (Ie & 240) === 0) {
              for (He = _e, jt = Ie, Ht = Me; Te = h.lencode[Ht + ((A & (1 << He + jt) - 1) >> He)], _e = Te >>> 24, Ie = Te >>> 16 & 255, Me = Te & 65535, !(He + _e <= N); ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              A >>>= He, N -= He, h.back += He;
            }
            if (A >>>= _e, N -= _e, h.back += _e, h.length = Me, Ie === 0) {
              h.mode = y;
              break;
            }
            if (Ie & 32) {
              h.back = -1, h.mode = he;
              break;
            }
            if (Ie & 64) {
              I.msg = "invalid literal/length code", h.mode = Y;
              break;
            }
            h.extra = Ie & 15, h.mode = ye;
          /* falls through */
          case ye:
            if (h.extra) {
              for (st = h.extra; N < st; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              h.length += A & (1 << h.extra) - 1, A >>>= h.extra, N -= h.extra, h.back += h.extra;
            }
            h.was = h.length, h.mode = Ee;
          /* falls through */
          case Ee:
            for (; Te = h.distcode[A & (1 << h.distbits) - 1], _e = Te >>> 24, Ie = Te >>> 16 & 255, Me = Te & 65535, !(_e <= N); ) {
              if (P === 0)
                break e;
              P--, A += H[r++] << N, N += 8;
            }
            if ((Ie & 240) === 0) {
              for (He = _e, jt = Ie, Ht = Me; Te = h.distcode[Ht + ((A & (1 << He + jt) - 1) >> He)], _e = Te >>> 24, Ie = Te >>> 16 & 255, Me = Te & 65535, !(He + _e <= N); ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              A >>>= He, N -= He, h.back += He;
            }
            if (A >>>= _e, N -= _e, h.back += _e, Ie & 64) {
              I.msg = "invalid distance code", h.mode = Y;
              break;
            }
            h.offset = Me, h.extra = Ie & 15, h.mode = de;
          /* falls through */
          case de:
            if (h.extra) {
              for (st = h.extra; N < st; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              h.offset += A & (1 << h.extra) - 1, A >>>= h.extra, N -= h.extra, h.back += h.extra;
            }
            if (h.offset > h.dmax) {
              I.msg = "invalid distance too far back", h.mode = Y;
              break;
            }
            h.mode = w;
          /* falls through */
          case w:
            if (f === 0)
              break e;
            if ($ = V - f, h.offset > $) {
              if ($ = h.offset - $, $ > h.whave && h.sane) {
                I.msg = "invalid distance too far back", h.mode = Y;
                break;
              }
              $ > h.wnext ? ($ -= h.wnext, me = h.wsize - $) : me = h.wnext - $, $ > h.length && ($ = h.length), ht = h.window;
            } else
              ht = ie, me = k - h.offset, $ = h.length;
            $ > f && ($ = f), f -= $, h.length -= $;
            do
              ie[k++] = ht[me++];
            while (--$);
            h.length === 0 && (h.mode = se);
            break;
          case y:
            if (f === 0)
              break e;
            ie[k++] = h.length, f--, h.mode = se;
            break;
          case W:
            if (h.wrap) {
              for (; N < 32; ) {
                if (P === 0)
                  break e;
                P--, A |= H[r++] << N, N += 8;
              }
              if (V -= f, I.total_out += V, h.total += V, V && (I.adler = h.check = /*UPDATE(state.check, put - _out, _out);*/
              h.flags ? t(h.check, ie, V, k - V) : e(h.check, ie, V, k - V)), V = f, (h.flags ? A : Be(A)) !== h.check) {
                I.msg = "incorrect data check", h.mode = Y;
                break;
              }
              A = 0, N = 0;
            }
            h.mode = G;
          /* falls through */
          case G:
            if (h.wrap && h.flags) {
              for (; N < 32; ) {
                if (P === 0)
                  break e;
                P--, A += H[r++] << N, N += 8;
              }
              if (A !== (h.total & 4294967295)) {
                I.msg = "incorrect length check", h.mode = Y;
                break;
              }
              A = 0, N = 0;
            }
            h.mode = fe;
          /* falls through */
          case fe:
            Je = s;
            break e;
          case Y:
            Je = S;
            break e;
          case ne:
            return R;
          case Ke:
          /* falls through */
          default:
            return v;
        }
    return I.next_out = k, I.avail_out = f, I.next_in = r, I.avail_in = P, h.hold = A, h.bits = N, (h.wsize || V !== I.avail_out && h.mode < Y && (h.mode < W || L !== c)) && xt(I, I.output, I.next_out, V - I.avail_out), Q -= I.avail_in, V -= I.avail_out, I.total_in += Q, I.total_out += V, h.total += V, h.wrap && V && (I.adler = h.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
    h.flags ? t(h.check, ie, V, I.next_out - V) : e(h.check, ie, V, I.next_out - V)), I.data_type = h.bits + (h.last ? 64 : 0) + (h.mode === he ? 128 : 0) + (h.mode === ae || h.mode === x ? 256 : 0), (Q === 0 && V === 0 || L === c) && Je === d && (Je = u), Je;
  }
  function j(I) {
    if (!I || !I.state)
      return v;
    var L = I.state;
    return L.window && (L.window = null), I.state = null, d;
  }
  function z(I, L) {
    var h;
    return !I || !I.state || (h = I.state, (h.wrap & 2) === 0) ? v : (h.head = L, L.done = !1, d);
  }
  function X(I, L) {
    var h = L.length, H, ie, r;
    return !I || !I.state || (H = I.state, H.wrap !== 0 && H.mode !== Z) ? v : H.mode === Z && (ie = 1, ie = e(ie, L, h, 0), ie !== H.check) ? S : (r = xt(I, L, h, h), r ? (H.mode = ne, R) : (H.havedict = 1, d));
  }
  return et.inflateReset = Le, et.inflateReset2 = Xe, et.inflateResetKeep = $e, et.inflateInit = De, et.inflateInit2 = We, et.inflate = m, et.inflateEnd = j, et.inflateGetHeader = z, et.inflateSetDictionary = X, et.inflateInfo = "pako inflate (from Nodeca project)", et;
}
var Gr, Pn;
function Si() {
  return Pn || (Pn = 1, Gr = {
    /* Allowed flush values; see deflate() and inflate() below for details */
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    /* Return codes for the compression/decompression functions. Negative values
    * are errors, positive values are used for special but normal events.
    */
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    //Z_MEM_ERROR:     -4,
    Z_BUF_ERROR: -5,
    //Z_VERSION_ERROR: -6,
    /* compression levels */
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    /* Possible values of the data_type field (though see inflate()) */
    Z_BINARY: 0,
    Z_TEXT: 1,
    //Z_ASCII:                1, // = Z_TEXT (deprecated)
    Z_UNKNOWN: 2,
    /* The deflate compression method */
    Z_DEFLATED: 8
    //Z_NULL:                 null // Use -1 or null inline, depending on var type
  }), Gr;
}
var qr, Ln;
function bl() {
  if (Ln) return qr;
  Ln = 1;
  function a() {
    this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
  }
  return qr = a, qr;
}
var Fn;
function Tl() {
  if (Fn) return Nt;
  Fn = 1;
  var a = El(), e = vt(), t = bi(), n = Si(), l = da(), i = Ti(), o = bl(), p = Object.prototype.toString;
  function c(d) {
    if (!(this instanceof c)) return new c(d);
    this.options = e.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, d || {});
    var s = this.options;
    s.raw && s.windowBits >= 0 && s.windowBits < 16 && (s.windowBits = -s.windowBits, s.windowBits === 0 && (s.windowBits = -15)), s.windowBits >= 0 && s.windowBits < 16 && !(d && d.windowBits) && (s.windowBits += 32), s.windowBits > 15 && s.windowBits < 48 && (s.windowBits & 15) === 0 && (s.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
    var g = a.inflateInit2(
      this.strm,
      s.windowBits
    );
    if (g !== n.Z_OK)
      throw new Error(l[g]);
    if (this.header = new o(), a.inflateGetHeader(this.strm, this.header), s.dictionary && (typeof s.dictionary == "string" ? s.dictionary = t.string2buf(s.dictionary) : p.call(s.dictionary) === "[object ArrayBuffer]" && (s.dictionary = new Uint8Array(s.dictionary)), s.raw && (g = a.inflateSetDictionary(this.strm, s.dictionary), g !== n.Z_OK)))
      throw new Error(l[g]);
  }
  c.prototype.push = function(d, s) {
    var g = this.strm, v = this.options.chunkSize, S = this.options.dictionary, R, u, _, T, C, O = !1;
    if (this.ended)
      return !1;
    u = s === ~~s ? s : s === !0 ? n.Z_FINISH : n.Z_NO_FLUSH, typeof d == "string" ? g.input = t.binstring2buf(d) : p.call(d) === "[object ArrayBuffer]" ? g.input = new Uint8Array(d) : g.input = d, g.next_in = 0, g.avail_in = g.input.length;
    do {
      if (g.avail_out === 0 && (g.output = new e.Buf8(v), g.next_out = 0, g.avail_out = v), R = a.inflate(g, n.Z_NO_FLUSH), R === n.Z_NEED_DICT && S && (R = a.inflateSetDictionary(this.strm, S)), R === n.Z_BUF_ERROR && O === !0 && (R = n.Z_OK, O = !1), R !== n.Z_STREAM_END && R !== n.Z_OK)
        return this.onEnd(R), this.ended = !0, !1;
      g.next_out && (g.avail_out === 0 || R === n.Z_STREAM_END || g.avail_in === 0 && (u === n.Z_FINISH || u === n.Z_SYNC_FLUSH)) && (this.options.to === "string" ? (_ = t.utf8border(g.output, g.next_out), T = g.next_out - _, C = t.buf2string(g.output, _), g.next_out = T, g.avail_out = v - T, T && e.arraySet(g.output, g.output, _, T, 0), this.onData(C)) : this.onData(e.shrinkBuf(g.output, g.next_out))), g.avail_in === 0 && g.avail_out === 0 && (O = !0);
    } while ((g.avail_in > 0 || g.avail_out === 0) && R !== n.Z_STREAM_END);
    return R === n.Z_STREAM_END && (u = n.Z_FINISH), u === n.Z_FINISH ? (R = a.inflateEnd(this.strm), this.onEnd(R), this.ended = !0, R === n.Z_OK) : (u === n.Z_SYNC_FLUSH && (this.onEnd(n.Z_OK), g.avail_out = 0), !0);
  }, c.prototype.onData = function(d) {
    this.chunks.push(d);
  }, c.prototype.onEnd = function(d) {
    d === n.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = d, this.msg = this.strm.msg;
  };
  function b(d, s) {
    var g = new c(s);
    if (g.push(d, !0), g.err)
      throw g.msg || l[g.err];
    return g.result;
  }
  function E(d, s) {
    return s = s || {}, s.raw = !0, b(d, s);
  }
  return Nt.Inflate = c, Nt.inflate = b, Nt.inflateRaw = E, Nt.ungzip = b, Nt;
}
var Yr, Mn;
function Sl() {
  if (Mn) return Yr;
  Mn = 1;
  var a = vt().assign, e = vl(), t = Tl(), n = Si(), l = {};
  return a(l, e, t, n), Yr = l, Yr;
}
var Un;
function Al() {
  if (Un) return Ft;
  Un = 1;
  var a = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", e = Sl(), t = Ae(), n = tt(), l = a ? "uint8array" : "array";
  Ft.magic = "\b\0";
  function i(o, p) {
    n.call(this, "FlateWorker/" + o), this._pako = null, this._pakoAction = o, this._pakoOptions = p, this.meta = {};
  }
  return t.inherits(i, n), i.prototype.processChunk = function(o) {
    this.meta = o.meta, this._pako === null && this._createPako(), this._pako.push(t.transformTo(l, o.data), !1);
  }, i.prototype.flush = function() {
    n.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
  }, i.prototype.cleanUp = function() {
    n.prototype.cleanUp.call(this), this._pako = null;
  }, i.prototype._createPako = function() {
    this._pako = new e[this._pakoAction]({
      raw: !0,
      level: this._pakoOptions.level || -1
      // default compression
    });
    var o = this;
    this._pako.onData = function(p) {
      o.push({
        data: p,
        meta: o.meta
      });
    };
  }, Ft.compressWorker = function(o) {
    return new i("Deflate", o);
  }, Ft.uncompressWorker = function() {
    return new i("Inflate", {});
  }, Ft;
}
var Bn;
function Ai() {
  if (Bn) return Qt;
  Bn = 1;
  var a = tt();
  return Qt.STORE = {
    magic: "\0\0",
    compressWorker: function() {
      return new a("STORE compression");
    },
    uncompressWorker: function() {
      return new a("STORE decompression");
    }
  }, Qt.DEFLATE = Al(), Qt;
}
var gt = {}, Wn;
function Ri() {
  return Wn || (Wn = 1, gt.LOCAL_FILE_HEADER = "PK", gt.CENTRAL_FILE_HEADER = "PK", gt.CENTRAL_DIRECTORY_END = "PK", gt.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", gt.ZIP64_CENTRAL_DIRECTORY_END = "PK", gt.DATA_DESCRIPTOR = "PK\x07\b"), gt;
}
var Zr, jn;
function Rl() {
  if (jn) return Zr;
  jn = 1;
  var a = Ae(), e = tt(), t = Wt(), n = ca(), l = Ri(), i = function(s, g) {
    var v = "", S;
    for (S = 0; S < g; S++)
      v += String.fromCharCode(s & 255), s = s >>> 8;
    return v;
  }, o = function(s, g) {
    var v = s;
    return s || (v = g ? 16893 : 33204), (v & 65535) << 16;
  }, p = function(s) {
    return (s || 0) & 63;
  }, c = function(s, g, v, S, R, u) {
    var _ = s.file, T = s.compression, C = u !== t.utf8encode, O = a.transformTo("string", u(_.name)), B = a.transformTo("string", t.utf8encode(_.name)), F = _.comment, q = a.transformTo("string", u(F)), ee = a.transformTo("string", t.utf8encode(F)), te = B.length !== _.name.length, le = ee.length !== F.length, oe, Z, he = "", we = "", ce = "", x = _.dir, D = _.date, M = {
      crc32: 0,
      compressedSize: 0,
      uncompressedSize: 0
    };
    (!g || v) && (M.crc32 = s.crc32, M.compressedSize = s.compressedSize, M.uncompressedSize = s.uncompressedSize);
    var J = 0;
    g && (J |= 8), !C && (te || le) && (J |= 2048);
    var re = 0, ae = 0;
    x && (re |= 16), R === "UNIX" ? (ae = 798, re |= o(_.unixPermissions, x)) : (ae = 20, re |= p(_.dosPermissions)), oe = D.getUTCHours(), oe = oe << 6, oe = oe | D.getUTCMinutes(), oe = oe << 5, oe = oe | D.getUTCSeconds() / 2, Z = D.getUTCFullYear() - 1980, Z = Z << 4, Z = Z | D.getUTCMonth() + 1, Z = Z << 5, Z = Z | D.getUTCDate(), te && (we = // Version
    i(1, 1) + // NameCRC32
    i(n(O), 4) + // UnicodeName
    B, he += // Info-ZIP Unicode Path Extra Field
    "up" + // size
    i(we.length, 2) + // content
    we), le && (ce = // Version
    i(1, 1) + // CommentCRC32
    i(n(q), 4) + // UnicodeName
    ee, he += // Info-ZIP Unicode Path Extra Field
    "uc" + // size
    i(ce.length, 2) + // content
    ce);
    var se = "";
    se += `
\0`, se += i(J, 2), se += T.magic, se += i(oe, 2), se += i(Z, 2), se += i(M.crc32, 4), se += i(M.compressedSize, 4), se += i(M.uncompressedSize, 4), se += i(O.length, 2), se += i(he.length, 2);
    var ye = l.LOCAL_FILE_HEADER + se + O + he, Ee = l.CENTRAL_FILE_HEADER + // version made by (00: DOS)
    i(ae, 2) + // file header (common to file and central directory)
    se + // file comment length
    i(q.length, 2) + // disk number start
    "\0\0\0\0" + // external file attributes
    i(re, 4) + // relative offset of local header
    i(S, 4) + // file name
    O + // extra field
    he + // file comment
    q;
    return {
      fileRecord: ye,
      dirRecord: Ee
    };
  }, b = function(s, g, v, S, R) {
    var u = "", _ = a.transformTo("string", R(S));
    return u = l.CENTRAL_DIRECTORY_END + // number of this disk
    "\0\0\0\0" + // total number of entries in the central directory on this disk
    i(s, 2) + // total number of entries in the central directory
    i(s, 2) + // size of the central directory   4 bytes
    i(g, 4) + // offset of start of central directory with respect to the starting disk number
    i(v, 4) + // .ZIP file comment length
    i(_.length, 2) + // .ZIP file comment
    _, u;
  }, E = function(s) {
    var g = "";
    return g = l.DATA_DESCRIPTOR + // crc-32                          4 bytes
    i(s.crc32, 4) + // compressed size                 4 bytes
    i(s.compressedSize, 4) + // uncompressed size               4 bytes
    i(s.uncompressedSize, 4), g;
  };
  function d(s, g, v, S) {
    e.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = g, this.zipPlatform = v, this.encodeFileName = S, this.streamFiles = s, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
  }
  return a.inherits(d, e), d.prototype.push = function(s) {
    var g = s.meta.percent || 0, v = this.entriesCount, S = this._sources.length;
    this.accumulate ? this.contentBuffer.push(s) : (this.bytesWritten += s.data.length, e.prototype.push.call(this, {
      data: s.data,
      meta: {
        currentFile: this.currentFile,
        percent: v ? (g + 100 * (v - S - 1)) / v : 100
      }
    }));
  }, d.prototype.openedSource = function(s) {
    this.currentSourceOffset = this.bytesWritten, this.currentFile = s.file.name;
    var g = this.streamFiles && !s.file.dir;
    if (g) {
      var v = c(s, g, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
      this.push({
        data: v.fileRecord,
        meta: { percent: 0 }
      });
    } else
      this.accumulate = !0;
  }, d.prototype.closedSource = function(s) {
    this.accumulate = !1;
    var g = this.streamFiles && !s.file.dir, v = c(s, g, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
    if (this.dirRecords.push(v.dirRecord), g)
      this.push({
        data: E(s),
        meta: { percent: 100 }
      });
    else
      for (this.push({
        data: v.fileRecord,
        meta: { percent: 0 }
      }); this.contentBuffer.length; )
        this.push(this.contentBuffer.shift());
    this.currentFile = null;
  }, d.prototype.flush = function() {
    for (var s = this.bytesWritten, g = 0; g < this.dirRecords.length; g++)
      this.push({
        data: this.dirRecords[g],
        meta: { percent: 100 }
      });
    var v = this.bytesWritten - s, S = b(this.dirRecords.length, v, s, this.zipComment, this.encodeFileName);
    this.push({
      data: S,
      meta: { percent: 100 }
    });
  }, d.prototype.prepareNextSource = function() {
    this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
  }, d.prototype.registerPrevious = function(s) {
    this._sources.push(s);
    var g = this;
    return s.on("data", function(v) {
      g.processChunk(v);
    }), s.on("end", function() {
      g.closedSource(g.previous.streamInfo), g._sources.length ? g.prepareNextSource() : g.end();
    }), s.on("error", function(v) {
      g.error(v);
    }), this;
  }, d.prototype.resume = function() {
    if (!e.prototype.resume.call(this))
      return !1;
    if (!this.previous && this._sources.length)
      return this.prepareNextSource(), !0;
    if (!this.previous && !this._sources.length && !this.generatedError)
      return this.end(), !0;
  }, d.prototype.error = function(s) {
    var g = this._sources;
    if (!e.prototype.error.call(this, s))
      return !1;
    for (var v = 0; v < g.length; v++)
      try {
        g[v].error(s);
      } catch {
      }
    return !0;
  }, d.prototype.lock = function() {
    e.prototype.lock.call(this);
    for (var s = this._sources, g = 0; g < s.length; g++)
      s[g].lock();
  }, Zr = d, Zr;
}
var Hn;
function xl() {
  if (Hn) return Fr;
  Hn = 1;
  var a = Ai(), e = Rl(), t = function(n, l) {
    var i = n || l, o = a[i];
    if (!o)
      throw new Error(i + " is not a valid compression method !");
    return o;
  };
  return Fr.generateWorker = function(n, l, i) {
    var o = new e(l.streamFiles, i, l.platform, l.encodeFileName), p = 0;
    try {
      n.forEach(function(c, b) {
        p++;
        var E = t(b.options.compression, l.compression), d = b.options.compressionOptions || l.compressionOptions || {}, s = b.dir, g = b.date;
        b._compressWorker(E, d).withStreamInfo("file", {
          name: c,
          dir: s,
          date: g,
          comment: b.comment || "",
          unixPermissions: b.unixPermissions,
          dosPermissions: b.dosPermissions
        }).pipe(o);
      }), o.entriesCount = p;
    } catch (c) {
      o.error(c);
    }
    return o;
  }, Fr;
}
var Vr, zn;
function Il() {
  if (zn) return Vr;
  zn = 1;
  var a = Ae(), e = tt();
  function t(n, l) {
    e.call(this, "Nodejs stream input adapter for " + n), this._upstreamEnded = !1, this._bindStream(l);
  }
  return a.inherits(t, e), t.prototype._bindStream = function(n) {
    var l = this;
    this._stream = n, n.pause(), n.on("data", function(i) {
      l.push({
        data: i,
        meta: {
          percent: 0
        }
      });
    }).on("error", function(i) {
      l.isPaused ? this.generatedError = i : l.error(i);
    }).on("end", function() {
      l.isPaused ? l._upstreamEnded = !0 : l.end();
    });
  }, t.prototype.pause = function() {
    return e.prototype.pause.call(this) ? (this._stream.pause(), !0) : !1;
  }, t.prototype.resume = function() {
    return e.prototype.resume.call(this) ? (this._upstreamEnded ? this.end() : this._stream.resume(), !0) : !1;
  }, Vr = t, Vr;
}
var Kr, Gn;
function Cl() {
  if (Gn) return Kr;
  Gn = 1;
  var a = Wt(), e = Ae(), t = tt(), n = mi(), l = _i(), i = ua(), o = gl(), p = xl(), c = ar(), b = Il(), E = function(R, u, _) {
    var T = e.getTypeOf(u), C, O = e.extend(_ || {}, l);
    O.date = O.date || /* @__PURE__ */ new Date(), O.compression !== null && (O.compression = O.compression.toUpperCase()), typeof O.unixPermissions == "string" && (O.unixPermissions = parseInt(O.unixPermissions, 8)), O.unixPermissions && O.unixPermissions & 16384 && (O.dir = !0), O.dosPermissions && O.dosPermissions & 16 && (O.dir = !0), O.dir && (R = s(R)), O.createFolders && (C = d(R)) && g.call(this, C, !0);
    var B = T === "string" && O.binary === !1 && O.base64 === !1;
    (!_ || typeof _.binary > "u") && (O.binary = !B);
    var F = u instanceof i && u.uncompressedSize === 0;
    (F || O.dir || !u || u.length === 0) && (O.base64 = !1, O.binary = !0, u = "", O.compression = "STORE", T = "string");
    var q = null;
    u instanceof i || u instanceof t ? q = u : c.isNode && c.isStream(u) ? q = new b(R, u) : q = e.prepareContent(R, u, O.binary, O.optimizedBinaryString, O.base64);
    var ee = new o(R, q, O);
    this.files[R] = ee;
  }, d = function(R) {
    R.slice(-1) === "/" && (R = R.substring(0, R.length - 1));
    var u = R.lastIndexOf("/");
    return u > 0 ? R.substring(0, u) : "";
  }, s = function(R) {
    return R.slice(-1) !== "/" && (R += "/"), R;
  }, g = function(R, u) {
    return u = typeof u < "u" ? u : l.createFolders, R = s(R), this.files[R] || E.call(this, R, null, {
      dir: !0,
      createFolders: u
    }), this.files[R];
  };
  function v(R) {
    return Object.prototype.toString.call(R) === "[object RegExp]";
  }
  var S = {
    /**
     * @see loadAsync
     */
    load: function() {
      throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },
    /**
     * Call a callback function for each entry at this folder level.
     * @param {Function} cb the callback function:
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     */
    forEach: function(R) {
      var u, _, T;
      for (u in this.files)
        T = this.files[u], _ = u.slice(this.root.length, u.length), _ && u.slice(0, this.root.length) === this.root && R(_, T);
    },
    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function(R) {
      var u = [];
      return this.forEach(function(_, T) {
        R(_, T) && u.push(T);
      }), u;
    },
    /**
     * Add a file to the zip file, or search a file.
     * @param   {string|RegExp} name The name of the file to add (if data is defined),
     * the name of the file to find (if no data) or a regex to match files.
     * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
     * @param   {Object} o     File options
     * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
     * a file (when searching by string) or an array of files (when searching by regex).
     */
    file: function(R, u, _) {
      if (arguments.length === 1)
        if (v(R)) {
          var T = R;
          return this.filter(function(O, B) {
            return !B.dir && T.test(O);
          });
        } else {
          var C = this.files[this.root + R];
          return C && !C.dir ? C : null;
        }
      else
        R = this.root + R, E.call(this, R, u, _);
      return this;
    },
    /**
     * Add a directory to the zip file, or search.
     * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
     * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
     */
    folder: function(R) {
      if (!R)
        return this;
      if (v(R))
        return this.filter(function(C, O) {
          return O.dir && R.test(C);
        });
      var u = this.root + R, _ = g.call(this, u), T = this.clone();
      return T.root = _.name, T;
    },
    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function(R) {
      R = this.root + R;
      var u = this.files[R];
      if (u || (R.slice(-1) !== "/" && (R += "/"), u = this.files[R]), u && !u.dir)
        delete this.files[R];
      else
        for (var _ = this.filter(function(C, O) {
          return O.name.slice(0, R.length) === R;
        }), T = 0; T < _.length; T++)
          delete this.files[_[T].name];
      return this;
    },
    /**
     * @deprecated This method has been removed in JSZip 3.0, please check the upgrade guide.
     */
    generate: function() {
      throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },
    /**
     * Generate the complete zip file as an internal stream.
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {StreamHelper} the streamed zip file.
     */
    generateInternalStream: function(R) {
      var u, _ = {};
      try {
        if (_ = e.extend(R || {}, {
          streamFiles: !1,
          compression: "STORE",
          compressionOptions: null,
          type: "",
          platform: "DOS",
          comment: null,
          mimeType: "application/zip",
          encodeFileName: a.utf8encode
        }), _.type = _.type.toLowerCase(), _.compression = _.compression.toUpperCase(), _.type === "binarystring" && (_.type = "string"), !_.type)
          throw new Error("No output type specified.");
        e.checkSupport(_.type), (_.platform === "darwin" || _.platform === "freebsd" || _.platform === "linux" || _.platform === "sunos") && (_.platform = "UNIX"), _.platform === "win32" && (_.platform = "DOS");
        var T = _.comment || this.comment || "";
        u = p.generateWorker(this, _, T);
      } catch (C) {
        u = new t("error"), u.error(C);
      }
      return new n(u, _.type || "string", _.mimeType);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateAsync: function(R, u) {
      return this.generateInternalStream(R).accumulate(u);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateNodeStream: function(R, u) {
      return R = R || {}, R.type || (R.type = "nodebuffer"), this.generateInternalStream(R).toNodejsStream(u);
    }
  };
  return Kr = S, Kr;
}
var $r, qn;
function xi() {
  if (qn) return $r;
  qn = 1;
  var a = Ae();
  function e(t) {
    this.data = t, this.length = t.length, this.index = 0, this.zero = 0;
  }
  return e.prototype = {
    /**
     * Check that the offset will not go too far.
     * @param {string} offset the additional offset to check.
     * @throws {Error} an Error if the offset is out of bounds.
     */
    checkOffset: function(t) {
      this.checkIndex(this.index + t);
    },
    /**
     * Check that the specified index will not be too far.
     * @param {string} newIndex the index to check.
     * @throws {Error} an Error if the index is out of bounds.
     */
    checkIndex: function(t) {
      if (this.length < this.zero + t || t < 0)
        throw new Error("End of data reached (data length = " + this.length + ", asked index = " + t + "). Corrupted zip ?");
    },
    /**
     * Change the index.
     * @param {number} newIndex The new index.
     * @throws {Error} if the new index is out of the data.
     */
    setIndex: function(t) {
      this.checkIndex(t), this.index = t;
    },
    /**
     * Skip the next n bytes.
     * @param {number} n the number of bytes to skip.
     * @throws {Error} if the new index is out of the data.
     */
    skip: function(t) {
      this.setIndex(this.index + t);
    },
    /**
     * Get the byte at the specified index.
     * @param {number} i the index to use.
     * @return {number} a byte.
     */
    byteAt: function() {
    },
    /**
     * Get the next number with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {number} the corresponding number.
     */
    readInt: function(t) {
      var n = 0, l;
      for (this.checkOffset(t), l = this.index + t - 1; l >= this.index; l--)
        n = (n << 8) + this.byteAt(l);
      return this.index += t, n;
    },
    /**
     * Get the next string with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {string} the corresponding string.
     */
    readString: function(t) {
      return a.transformTo("string", this.readData(t));
    },
    /**
     * Get raw data without conversion, <size> bytes.
     * @param {number} size the number of bytes to read.
     * @return {Object} the raw data, implementation specific.
     */
    readData: function() {
    },
    /**
     * Find the last occurrence of a zip signature (4 bytes).
     * @param {string} sig the signature to find.
     * @return {number} the index of the last occurrence, -1 if not found.
     */
    lastIndexOfSignature: function() {
    },
    /**
     * Read the signature (4 bytes) at the current position and compare it with sig.
     * @param {string} sig the expected signature
     * @return {boolean} true if the signature matches, false otherwise.
     */
    readAndCheckSignature: function() {
    },
    /**
     * Get the next date.
     * @return {Date} the date.
     */
    readDate: function() {
      var t = this.readInt(4);
      return new Date(Date.UTC(
        (t >> 25 & 127) + 1980,
        // year
        (t >> 21 & 15) - 1,
        // month
        t >> 16 & 31,
        // day
        t >> 11 & 31,
        // hour
        t >> 5 & 63,
        // minute
        (t & 31) << 1
      ));
    }
  }, $r = e, $r;
}
var Xr, Yn;
function Ii() {
  if (Yn) return Xr;
  Yn = 1;
  var a = xi(), e = Ae();
  function t(n) {
    a.call(this, n);
    for (var l = 0; l < this.data.length; l++)
      n[l] = n[l] & 255;
  }
  return e.inherits(t, a), t.prototype.byteAt = function(n) {
    return this.data[this.zero + n];
  }, t.prototype.lastIndexOfSignature = function(n) {
    for (var l = n.charCodeAt(0), i = n.charCodeAt(1), o = n.charCodeAt(2), p = n.charCodeAt(3), c = this.length - 4; c >= 0; --c)
      if (this.data[c] === l && this.data[c + 1] === i && this.data[c + 2] === o && this.data[c + 3] === p)
        return c - this.zero;
    return -1;
  }, t.prototype.readAndCheckSignature = function(n) {
    var l = n.charCodeAt(0), i = n.charCodeAt(1), o = n.charCodeAt(2), p = n.charCodeAt(3), c = this.readData(4);
    return l === c[0] && i === c[1] && o === c[2] && p === c[3];
  }, t.prototype.readData = function(n) {
    if (this.checkOffset(n), n === 0)
      return [];
    var l = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, l;
  }, Xr = t, Xr;
}
var Jr, Zn;
function Dl() {
  if (Zn) return Jr;
  Zn = 1;
  var a = xi(), e = Ae();
  function t(n) {
    a.call(this, n);
  }
  return e.inherits(t, a), t.prototype.byteAt = function(n) {
    return this.data.charCodeAt(this.zero + n);
  }, t.prototype.lastIndexOfSignature = function(n) {
    return this.data.lastIndexOf(n) - this.zero;
  }, t.prototype.readAndCheckSignature = function(n) {
    var l = this.readData(4);
    return n === l;
  }, t.prototype.readData = function(n) {
    this.checkOffset(n);
    var l = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, l;
  }, Jr = t, Jr;
}
var Qr, Vn;
function Ci() {
  if (Vn) return Qr;
  Vn = 1;
  var a = Ii(), e = Ae();
  function t(n) {
    a.call(this, n);
  }
  return e.inherits(t, a), t.prototype.readData = function(n) {
    if (this.checkOffset(n), n === 0)
      return new Uint8Array(0);
    var l = this.data.subarray(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, l;
  }, Qr = t, Qr;
}
var ea, Kn;
function Nl() {
  if (Kn) return ea;
  Kn = 1;
  var a = Ci(), e = Ae();
  function t(n) {
    a.call(this, n);
  }
  return e.inherits(t, a), t.prototype.readData = function(n) {
    this.checkOffset(n);
    var l = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, l;
  }, ea = t, ea;
}
var ta, $n;
function Di() {
  if ($n) return ta;
  $n = 1;
  var a = Ae(), e = _t(), t = Ii(), n = Dl(), l = Nl(), i = Ci();
  return ta = function(o) {
    var p = a.getTypeOf(o);
    return a.checkSupport(p), p === "string" && !e.uint8array ? new n(o) : p === "nodebuffer" ? new l(o) : e.uint8array ? new i(a.transformTo("uint8array", o)) : new t(a.transformTo("array", o));
  }, ta;
}
var ra, Xn;
function kl() {
  if (Xn) return ra;
  Xn = 1;
  var a = Di(), e = Ae(), t = ua(), n = ca(), l = Wt(), i = Ai(), o = _t(), p = 0, c = 3, b = function(d) {
    for (var s in i)
      if (Object.prototype.hasOwnProperty.call(i, s) && i[s].magic === d)
        return i[s];
    return null;
  };
  function E(d, s) {
    this.options = d, this.loadOptions = s;
  }
  return E.prototype = {
    /**
     * say if the file is encrypted.
     * @return {boolean} true if the file is encrypted, false otherwise.
     */
    isEncrypted: function() {
      return (this.bitFlag & 1) === 1;
    },
    /**
     * say if the file has utf-8 filename/comment.
     * @return {boolean} true if the filename/comment is in utf-8, false otherwise.
     */
    useUTF8: function() {
      return (this.bitFlag & 2048) === 2048;
    },
    /**
     * Read the local part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readLocalPart: function(d) {
      var s, g;
      if (d.skip(22), this.fileNameLength = d.readInt(2), g = d.readInt(2), this.fileName = d.readData(this.fileNameLength), d.skip(g), this.compressedSize === -1 || this.uncompressedSize === -1)
        throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
      if (s = b(this.compressionMethod), s === null)
        throw new Error("Corrupted zip : compression " + e.pretty(this.compressionMethod) + " unknown (inner file : " + e.transformTo("string", this.fileName) + ")");
      this.decompressed = new t(this.compressedSize, this.uncompressedSize, this.crc32, s, d.readData(this.compressedSize));
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readCentralPart: function(d) {
      this.versionMadeBy = d.readInt(2), d.skip(2), this.bitFlag = d.readInt(2), this.compressionMethod = d.readString(2), this.date = d.readDate(), this.crc32 = d.readInt(4), this.compressedSize = d.readInt(4), this.uncompressedSize = d.readInt(4);
      var s = d.readInt(2);
      if (this.extraFieldsLength = d.readInt(2), this.fileCommentLength = d.readInt(2), this.diskNumberStart = d.readInt(2), this.internalFileAttributes = d.readInt(2), this.externalFileAttributes = d.readInt(4), this.localHeaderOffset = d.readInt(4), this.isEncrypted())
        throw new Error("Encrypted zip are not supported");
      d.skip(s), this.readExtraFields(d), this.parseZIP64ExtraField(d), this.fileComment = d.readData(this.fileCommentLength);
    },
    /**
     * Parse the external file attributes and get the unix/dos permissions.
     */
    processAttributes: function() {
      this.unixPermissions = null, this.dosPermissions = null;
      var d = this.versionMadeBy >> 8;
      this.dir = !!(this.externalFileAttributes & 16), d === p && (this.dosPermissions = this.externalFileAttributes & 63), d === c && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), !this.dir && this.fileNameStr.slice(-1) === "/" && (this.dir = !0);
    },
    /**
     * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
     * @param {DataReader} reader the reader to use.
     */
    parseZIP64ExtraField: function() {
      if (this.extraFields[1]) {
        var d = a(this.extraFields[1].value);
        this.uncompressedSize === e.MAX_VALUE_32BITS && (this.uncompressedSize = d.readInt(8)), this.compressedSize === e.MAX_VALUE_32BITS && (this.compressedSize = d.readInt(8)), this.localHeaderOffset === e.MAX_VALUE_32BITS && (this.localHeaderOffset = d.readInt(8)), this.diskNumberStart === e.MAX_VALUE_32BITS && (this.diskNumberStart = d.readInt(4));
      }
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readExtraFields: function(d) {
      var s = d.index + this.extraFieldsLength, g, v, S;
      for (this.extraFields || (this.extraFields = {}); d.index + 4 < s; )
        g = d.readInt(2), v = d.readInt(2), S = d.readData(v), this.extraFields[g] = {
          id: g,
          length: v,
          value: S
        };
      d.setIndex(s);
    },
    /**
     * Apply an UTF8 transformation if needed.
     */
    handleUTF8: function() {
      var d = o.uint8array ? "uint8array" : "array";
      if (this.useUTF8())
        this.fileNameStr = l.utf8decode(this.fileName), this.fileCommentStr = l.utf8decode(this.fileComment);
      else {
        var s = this.findExtraFieldUnicodePath();
        if (s !== null)
          this.fileNameStr = s;
        else {
          var g = e.transformTo(d, this.fileName);
          this.fileNameStr = this.loadOptions.decodeFileName(g);
        }
        var v = this.findExtraFieldUnicodeComment();
        if (v !== null)
          this.fileCommentStr = v;
        else {
          var S = e.transformTo(d, this.fileComment);
          this.fileCommentStr = this.loadOptions.decodeFileName(S);
        }
      }
    },
    /**
     * Find the unicode path declared in the extra field, if any.
     * @return {String} the unicode path, null otherwise.
     */
    findExtraFieldUnicodePath: function() {
      var d = this.extraFields[28789];
      if (d) {
        var s = a(d.value);
        return s.readInt(1) !== 1 || n(this.fileName) !== s.readInt(4) ? null : l.utf8decode(s.readData(d.length - 5));
      }
      return null;
    },
    /**
     * Find the unicode comment declared in the extra field, if any.
     * @return {String} the unicode comment, null otherwise.
     */
    findExtraFieldUnicodeComment: function() {
      var d = this.extraFields[25461];
      if (d) {
        var s = a(d.value);
        return s.readInt(1) !== 1 || n(this.fileComment) !== s.readInt(4) ? null : l.utf8decode(s.readData(d.length - 5));
      }
      return null;
    }
  }, ra = E, ra;
}
var aa, Jn;
function Ol() {
  if (Jn) return aa;
  Jn = 1;
  var a = Di(), e = Ae(), t = Ri(), n = kl(), l = _t();
  function i(o) {
    this.files = [], this.loadOptions = o;
  }
  return i.prototype = {
    /**
     * Check that the reader is on the specified signature.
     * @param {string} expectedSignature the expected signature.
     * @throws {Error} if it is an other signature.
     */
    checkSignature: function(o) {
      if (!this.reader.readAndCheckSignature(o)) {
        this.reader.index -= 4;
        var p = this.reader.readString(4);
        throw new Error("Corrupted zip or bug: unexpected signature (" + e.pretty(p) + ", expected " + e.pretty(o) + ")");
      }
    },
    /**
     * Check if the given signature is at the given index.
     * @param {number} askedIndex the index to check.
     * @param {string} expectedSignature the signature to expect.
     * @return {boolean} true if the signature is here, false otherwise.
     */
    isSignature: function(o, p) {
      var c = this.reader.index;
      this.reader.setIndex(o);
      var b = this.reader.readString(4), E = b === p;
      return this.reader.setIndex(c), E;
    },
    /**
     * Read the end of the central directory.
     */
    readBlockEndOfCentral: function() {
      this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
      var o = this.reader.readData(this.zipCommentLength), p = l.uint8array ? "uint8array" : "array", c = e.transformTo(p, o);
      this.zipComment = this.loadOptions.decodeFileName(c);
    },
    /**
     * Read the end of the Zip 64 central directory.
     * Not merged with the method readEndOfCentral :
     * The end of central can coexist with its Zip64 brother,
     * I don't want to read the wrong number of bytes !
     */
    readBlockZip64EndOfCentral: function() {
      this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
      for (var o = this.zip64EndOfCentralSize - 44, p = 0, c, b, E; p < o; )
        c = this.reader.readInt(2), b = this.reader.readInt(4), E = this.reader.readData(b), this.zip64ExtensibleData[c] = {
          id: c,
          length: b,
          value: E
        };
    },
    /**
     * Read the end of the Zip 64 central directory locator.
     */
    readBlockZip64EndOfCentralLocator: function() {
      if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), this.disksCount > 1)
        throw new Error("Multi-volumes zip are not supported");
    },
    /**
     * Read the local files, based on the offset read in the central part.
     */
    readLocalFiles: function() {
      var o, p;
      for (o = 0; o < this.files.length; o++)
        p = this.files[o], this.reader.setIndex(p.localHeaderOffset), this.checkSignature(t.LOCAL_FILE_HEADER), p.readLocalPart(this.reader), p.handleUTF8(), p.processAttributes();
    },
    /**
     * Read the central directory.
     */
    readCentralDir: function() {
      var o;
      for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(t.CENTRAL_FILE_HEADER); )
        o = new n({
          zip64: this.zip64
        }, this.loadOptions), o.readCentralPart(this.reader), this.files.push(o);
      if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0)
        throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
    },
    /**
     * Read the end of central directory.
     */
    readEndOfCentral: function() {
      var o = this.reader.lastIndexOfSignature(t.CENTRAL_DIRECTORY_END);
      if (o < 0) {
        var p = !this.isSignature(0, t.LOCAL_FILE_HEADER);
        throw p ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
      }
      this.reader.setIndex(o);
      var c = o;
      if (this.checkSignature(t.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === e.MAX_VALUE_16BITS || this.diskWithCentralDirStart === e.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === e.MAX_VALUE_16BITS || this.centralDirRecords === e.MAX_VALUE_16BITS || this.centralDirSize === e.MAX_VALUE_32BITS || this.centralDirOffset === e.MAX_VALUE_32BITS) {
        if (this.zip64 = !0, o = this.reader.lastIndexOfSignature(t.ZIP64_CENTRAL_DIRECTORY_LOCATOR), o < 0)
          throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
        if (this.reader.setIndex(o), this.checkSignature(t.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, t.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(t.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0))
          throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
        this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(t.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
      }
      var b = this.centralDirOffset + this.centralDirSize;
      this.zip64 && (b += 20, b += 12 + this.zip64EndOfCentralSize);
      var E = c - b;
      if (E > 0)
        this.isSignature(c, t.CENTRAL_FILE_HEADER) || (this.reader.zero = E);
      else if (E < 0)
        throw new Error("Corrupted zip: missing " + Math.abs(E) + " bytes.");
    },
    prepareReader: function(o) {
      this.reader = a(o);
    },
    /**
     * Read a zip file and create ZipEntries.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
     */
    load: function(o) {
      this.prepareReader(o), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
    }
  }, aa = i, aa;
}
var na, Qn;
function Pl() {
  if (Qn) return na;
  Qn = 1;
  var a = Ae(), e = Bt(), t = Wt(), n = Ol(), l = wi(), i = ar();
  function o(p) {
    return new e.Promise(function(c, b) {
      var E = p.decompressed.getContentWorker().pipe(new l());
      E.on("error", function(d) {
        b(d);
      }).on("end", function() {
        E.streamInfo.crc32 !== p.decompressed.crc32 ? b(new Error("Corrupted zip : CRC32 mismatch")) : c();
      }).resume();
    });
  }
  return na = function(p, c) {
    var b = this;
    return c = a.extend(c || {}, {
      base64: !1,
      checkCRC32: !1,
      optimizedBinaryString: !1,
      createFolders: !1,
      decodeFileName: t.utf8decode
    }), i.isNode && i.isStream(p) ? e.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : a.prepareContent("the loaded zip file", p, !0, c.optimizedBinaryString, c.base64).then(function(E) {
      var d = new n(c);
      return d.load(E), d;
    }).then(function(d) {
      var s = [e.Promise.resolve(d)], g = d.files;
      if (c.checkCRC32)
        for (var v = 0; v < g.length; v++)
          s.push(o(g[v]));
      return e.Promise.all(s);
    }).then(function(d) {
      for (var s = d.shift(), g = s.files, v = 0; v < g.length; v++) {
        var S = g[v], R = S.fileNameStr, u = a.resolve(S.fileNameStr);
        b.file(u, S.decompressed, {
          binary: !0,
          optimizedBinaryString: !0,
          date: S.date,
          dir: S.dir,
          comment: S.fileCommentStr.length ? S.fileCommentStr : null,
          unixPermissions: S.unixPermissions,
          dosPermissions: S.dosPermissions,
          createFolders: c.createFolders
        }), S.dir || (b.file(u).unsafeOriginalName = R);
      }
      return s.zipComment.length && (b.comment = s.zipComment), b;
    });
  }, na;
}
var ia, ei;
function Ll() {
  if (ei) return ia;
  ei = 1;
  function a() {
    if (!(this instanceof a))
      return new a();
    if (arguments.length)
      throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
    this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
      var e = new a();
      for (var t in this)
        typeof this[t] != "function" && (e[t] = this[t]);
      return e;
    };
  }
  return a.prototype = Cl(), a.prototype.loadAsync = Pl(), a.support = _t(), a.defaults = _i(), a.version = "3.10.1", a.loadAsync = function(e, t) {
    return new a().loadAsync(e, t);
  }, a.external = Bt(), ia = a, ia;
}
var Fl = Ll();
const ti = /* @__PURE__ */ Go(Fl), mt = 283.465, Ml = {
  A4: { width: 59528, height: 84188 },
  // 210mm x 297mm
  Letter: { width: 61200, height: 79200 },
  // 216mm x 280mm
  B5: { width: 49937, height: 70866 }
  // 176mm x 250mm
}, Ul = [
  xe.join(process.cwd(), "resources", "blank.hwpx"),
  xe.join(process.cwd(), "assets", "blank.hwpx"),
  xe.join(process.cwd(), "static", "blank.hwpx")
];
class Bl {
  /**
   * HWPX 내보내기 (원클릭 생성)
   */
  async exportHwpx(e) {
    try {
      const t = Ml[e.paperSize], n = this.ensureHwpxExtension(e.outputPath), l = await this.resolveTemplatePath(e.referenceHwpxPath);
      let i, o;
      return l ? (i = await this.buildFromTemplate(e, t, l), o = "HWPX 파일이 생성되었습니다. (템플릿 기반)") : (i = await this.buildFromScratch(e, t), o = "HWPX 파일이 생성되었습니다."), await Ve.writeFile(n, i), {
        success: !0,
        filePath: n,
        message: o
      };
    } catch (t) {
      throw new ge(
        pe.FS_WRITE_FAILED,
        `HWPX export failed: ${t instanceof Error ? t.message : "Unknown error"}`
      );
    }
  }
  ensureHwpxExtension(e) {
    if (!e)
      throw new ge(pe.VALIDATION_FAILED, "Output path is required");
    return e.endsWith(".hwpx") ? e : e.replace(/\.[^.]*$/, "") + ".hwpx";
  }
  async resolveTemplatePath(e) {
    if (e && e.trim().length > 0)
      try {
        return await Ve.access(e), e;
      } catch {
        throw new ge(
          pe.FS_READ_FAILED,
          `Reference HWPX not found: ${e}`
        );
      }
    for (const t of Ul)
      try {
        return await Ve.access(t), t;
      } catch {
      }
    return null;
  }
  async buildFromTemplate(e, t, n) {
    const l = await Ve.readFile(n), i = await ti.loadAsync(l), o = await i.file("Contents/header.xml")?.async("string"), p = await i.file("Contents/section0.xml")?.async("string"), c = await i.file("Contents/content.hpf")?.async("string");
    if (!o || !p || !c)
      throw new ge(
        pe.FS_READ_FAILED,
        "Template is missing required HWPX files (header.xml, section0.xml, content.hpf)."
      );
    return i.file("Contents/header.xml", this.updateHeaderXml(o, e)), i.file(
      "Contents/section0.xml",
      this.updateSectionXml(p, e, t)
    ), i.file("Contents/content.hpf", this.updateContentHpf(c, e)), await i.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }
  updateHeaderXml(e, t) {
    const n = this.escapeXml(t.title), l = (/* @__PURE__ */ new Date()).toISOString();
    return e.replace(/<hh:title>[\s\S]*?<\/hh:title>/, `<hh:title>${n}</hh:title>`).replace(/<hh:date>[\s\S]*?<\/hh:date>/, `<hh:date>${l}</hh:date>`);
  }
  updateContentHpf(e, t) {
    const n = this.escapeXml(t.title), l = (/* @__PURE__ */ new Date()).toISOString();
    return e.replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${n}</dc:title>`).replace(/<dc:date>[\s\S]*?<\/dc:date>/, `<dc:date>${l}</dc:date>`);
  }
  updateSectionXml(e, t, n) {
    const l = Math.round(t.marginLeft * mt), i = Math.round(t.marginRight * mt), o = Math.round(t.marginTop * mt), p = Math.round(t.marginBottom * mt), c = this.convertHtmlToParagraphs(t.content, t.title);
    let b = e;
    b = b.replace(
      /<hc:width>\d+<\/hc:width>/,
      `<hc:width>${n.width}</hc:width>`
    ), b = b.replace(
      /<hc:height>\d+<\/hc:height>/,
      `<hc:height>${n.height}</hc:height>`
    );
    const E = b.match(/<hc:pageMargin\b[^>]*\/>/);
    if (E) {
      const s = this.parseXmlAttributes(E[0]), g = s.header ?? "4252", v = s.footer ?? "4252", S = s.gutter ?? "0", R = `<hc:pageMargin left="${l}" right="${i}" top="${o}" bottom="${p}" header="${g}" footer="${v}" gutter="${S}"/>`;
      b = b.replace(E[0], R);
    }
    return /<\/hs:secPr>/.test(b) && (b = b.replace(
      /(<\/hs:secPr>)([\s\S]*?)(<\/hs:sec>)/,
      `$1
${c}
$3`
    )), b;
  }
  /**
   * 템플릿 없이 HWPX를 직접 생성 (원클릭)
   */
  async buildFromScratch(e, t) {
    const n = new ti();
    return n.file("mimetype", "application/hwp+zip", { compression: "STORE" }), n.file("version.xml", this.generateVersion(), { compression: "DEFLATE" }), n.file("META-INF/manifest.xml", this.generateManifestXml(), { compression: "DEFLATE" }), n.file("META-INF/container.xml", this.generateContainerXml(), { compression: "DEFLATE" }), n.file("META-INF/container.rdf", this.generateContainerRdf(), { compression: "DEFLATE" }), n.file("settings.xml", this.generateSettings(), { compression: "DEFLATE" }), n.file("Preview/PrvText.txt", this.generatePreviewText(e), { compression: "DEFLATE" }), n.file("Contents/header.xml", this.generateHeader(e), { compression: "DEFLATE" }), n.file("Contents/section0.xml", this.generateSection(e, t), { compression: "DEFLATE" }), n.file("Contents/content.hpf", this.generateContentHpf(e), { compression: "DEFLATE" }), await n.generateAsync({
      type: "nodebuffer"
      // Don't set global compression - use per-file settings above
    });
  }
  generateVersion() {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Luie" appVersion="1.0.0"/>`);
  }
  compressXml(e) {
    return e.replace(/>\s+</g, "><").replace(/\?>\s+</g, "?><").trim();
  }
  generateManifestXml() {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`);
  }
  generateContainerXml() {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
    <ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/>
    <ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/>
  </ocf:rootfiles>
</ocf:container>`);
  }
  generateContainerRdf() {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/header.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/section0.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>
  </rdf:Description>
</rdf:RDF>`);
  }
  generatePreviewText(e) {
    const t = this.htmlToText(e.content);
    return `${e.title}

${t.substring(0, 500)}`;
  }
  generateSettings() {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
  <ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>
</ha:HWPApplicationSetting>`);
  }
  generateHeader(e) {
    return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" 
         xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
         xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" 
         xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
         xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
         xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" 
         xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" 
         xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" 
         xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" 
         xmlns:dc="http://purl.org/dc/elements/1.1/" 
         xmlns:opf="http://www.idpf.org/2007/opf/" 
         xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" 
         xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" 
         xmlns:epub="http://www.idpf.org/2007/ops" 
         xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" 
         version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  
  <hh:refList>
    <hh:fontfaces itemCnt="7">
      <hh:fontface lang="HANGUL" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="LATIN" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="HANJA" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="JAPANESE" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="OTHER" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="SYMBOL" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="USER" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
    </hh:fontfaces>
    <hh:borderFills itemCnt="3">
      <hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
      <hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
        <hc:fillBrush><hc:winBrush faceColor="none" hatchColor="#999999" alpha="0"/></hc:fillBrush>
      </hh:borderFill>
      <hh:borderFill id="3" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties itemCnt="10">
      <hh:charPr id="0" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="1" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="2" height="900" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="3" height="900" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="4" height="1600" textColor="#2E74B5" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="5" height="1100" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="6" height="1700" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="7" height="1100" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="8" height="1600" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/><hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="9" height="1400" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
    </hh:charProperties>
    <hh:tabProperties itemCnt="3">
      <hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/>
      <hh:tabPr id="1" autoTabLeft="1" autoTabRight="0"/>
      <hh:tabPr id="2" autoTabLeft="0" autoTabRight="1"/>
    </hh:tabProperties>
    <hh:numberings itemCnt="1">
      <hh:numbering id="1" start="0">
        <hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^1.</hh:paraHead>
        <hh:paraHead start="1" level="2" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^2.</hh:paraHead>
        <hh:paraHead start="1" level="3" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^3)</hh:paraHead>
        <hh:paraHead start="1" level="4" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^4)</hh:paraHead>
        <hh:paraHead start="1" level="5" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">(^5)</hh:paraHead>
        <hh:paraHead start="1" level="6" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">(^6)</hh:paraHead>
        <hh:paraHead start="1" level="7" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="CIRCLED_DIGIT" charPrIDRef="4294967295" checkable="1">^7</hh:paraHead>
        <hh:paraHead start="1" level="8" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="CIRCLED_HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="1">^8</hh:paraHead>
        <hh:paraHead start="1" level="9" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_JAMO" charPrIDRef="4294967295" checkable="0"/>
        <hh:paraHead start="1" level="10" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="ROMAN_SMALL" charPrIDRef="4294967295" checkable="1"/>
      </hh:numbering>
    </hh:numberings>
    <hh:paraProperties itemCnt="10">
      <hh:paraPr id="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="1" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="3000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="2" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="2000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="3" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="1"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="4000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="4" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="2"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="6000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="5" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="3"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="8000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="6" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="150" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="7" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="LEFT" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="130" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="8" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="LEFT" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="2400" bottom="600" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="9" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="CENTER" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
    </hh:paraProperties>
    <hh:styles itemCnt="10">
      <hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/>
      <hh:style id="1" type="PARA" name="본문" engName="Body" paraPrIDRef="1" charPrIDRef="0" nextStyleIDRef="1" langID="1042" lockForm="0"/>
      <hh:style id="2" type="PARA" name="개요 1" engName="Outline 1" paraPrIDRef="2" charPrIDRef="0" nextStyleIDRef="2" langID="1042" lockForm="0"/>
      <hh:style id="3" type="PARA" name="개요 2" engName="Outline 2" paraPrIDRef="3" charPrIDRef="0" nextStyleIDRef="3" langID="1042" lockForm="0"/>
      <hh:style id="4" type="PARA" name="개요 3" engName="Outline 3" paraPrIDRef="4" charPrIDRef="0" nextStyleIDRef="4" langID="1042" lockForm="0"/>
      <hh:style id="5" type="PARA" name="개요 4" engName="Outline 4" paraPrIDRef="5" charPrIDRef="0" nextStyleIDRef="5" langID="1042" lockForm="0"/>
      <hh:style id="6" type="CHAR" name="쪽 번호" engName="Page Number" paraPrIDRef="0" charPrIDRef="1" nextStyleIDRef="0" langID="1042" lockForm="0"/>
      <hh:style id="7" type="PARA" name="머리말" engName="Header" paraPrIDRef="6" charPrIDRef="2" nextStyleIDRef="7" langID="1042" lockForm="0"/>
      <hh:style id="8" type="PARA" name="각주" engName="Footnote" paraPrIDRef="7" charPrIDRef="3" nextStyleIDRef="8" langID="1042" lockForm="0"/>
      <hh:style id="9" type="PARA" name="캡션" engName="Caption" paraPrIDRef="9" charPrIDRef="0" nextStyleIDRef="9" langID="1042" lockForm="0"/>
    </hh:styles>
    <hh:memoProperties itemCnt="1">
      <hh:memoPr id="1" width="15591" lineWidth="1" lineType="SOLID" lineColor="#B6D7AE" fillColor="#F0FFE9" activeColor="#CFF1C7" memoType="NOMAL"/>
    </hh:memoProperties>
  </hh:refList>
  <hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>
  <hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>
  <hh:trackchageConfig flags="56"/>
</hh:head>`);
  }
  generateSection(e, t) {
    const n = Math.round(e.marginLeft * mt), l = Math.round(e.marginRight * mt), i = Math.round(e.marginTop * mt), o = Math.round(e.marginBottom * mt), p = `<hp:secPr id="" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
      <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
      <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
      <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="0" fill="0" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
      <hp:lineNumberShape restartType="0" countBy="0" distance="0"/>
      <hp:pagePr landscape="NARROWLY" width="${t.width}" height="${t.height}" gutterType="LEFT_ONLY">
        <hp:margin header="4252" footer="4252" gutter="0" left="${n}" right="${l}" top="${i}" bottom="${o}"/>
      </hp:pagePr>
      <hp:footNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:footNotePr>
      <hp:endNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:endNotePr>
      <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="0" headerInside="0" footerInside="0">
        <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
      </hp:pageBorderFill>
    </hp:secPr>`, b = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
        id="0" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
${this.convertHtmlToParagraphs(e.content, e.title, p)}
</hs:sec>`;
    return this.compressXml(b);
  }
  generateContentHpf(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), n = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" 
             xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
             xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" 
             xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
             xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
             xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" 
             xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" 
             xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" 
             xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" 
             xmlns:dc="http://purl.org/dc/elements/1.1/" 
             xmlns:opf="http://www.idpf.org/2007/opf" 
             xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" 
             xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" 
             xmlns:epub="http://www.idpf.org/2007/ops" 
             xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" 
             version="" unique-identifier="" id="">
  <opf:metadata>
    <opf:title/>
    <opf:language>ko</opf:language>
    <opf:meta name="creator" content="text">Luie</opf:meta>
    <opf:meta name="CreatedDate" content="text">${t}</opf:meta>
    <opf:meta name="ModifiedDate" content="text">${t}</opf:meta>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="header" linear="yes"/>
    <opf:itemref idref="section0" linear="yes"/>
  </opf:spine>
</opf:package>`;
    return this.compressXml(n);
  }
  parseXmlAttributes(e) {
    const t = {}, n = e.matchAll(/(\w+)="([^"]*)"/g);
    for (const l of n)
      t[l[1]] = l[2];
    return t;
  }
  /**
   * HTML을 HWPX paragraph XML로 변환
   */
  convertHtmlToParagraphs(e, t, n) {
    const l = [];
    let i = Math.floor(Math.random() * 4e9);
    const o = i++;
    n ? l.push(`  <hp:p id="${o}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      ${n}
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(t)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`) : l.push(`  <hp:p id="${o}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(t)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`), l.push(`  <hp:p id="${i++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t></hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    const c = this.htmlToText(e).split(`
`).filter((b) => b.trim());
    for (const b of c)
      b.trim() && l.push(`  <hp:p id="${i++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(b)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    return l.join(`
`);
  }
  /**
   * HTML을 플레인 텍스트로 변환
   */
  htmlToText(e) {
    return e.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, `
$1
`).replace(/<p[^>]*>(.*?)<\/p>/gi, `$1
`).replace(/<br\s*\/?>/gi, `
`).replace(/<li[^>]*>(.*?)<\/li>/gi, `• $1
`).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\n\n+/g, `

`).trim();
  }
  /**
   * XML 특수문자 이스케이프
   */
  escapeXml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
}
const Wl = new Bl(), jl = 56.7, Hl = 2, zl = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  B5: { width: 176, height: 250 }
}, ri = {
  paperSize: "A4",
  marginTop: 20,
  // mm
  marginBottom: 15,
  // mm
  marginLeft: 20,
  // mm
  marginRight: 20,
  // mm
  fontFamily: "Batang",
  fontSize: 10,
  // pt
  lineHeight: "160%",
  showPageNumbers: !0,
  startPageNumber: 1
};
function St(a) {
  return Math.round(a * jl);
}
function Gl(a) {
  return a * Hl;
}
function ql(a) {
  const e = parseInt(a.replace("%", ""));
  return Math.round(e / 100 * 240);
}
function Yl(a, e) {
  const t = [], l = a.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "HEADING1:::$1:::").replace(/<h2[^>]*>(.*?)<\/h2>/gi, "HEADING2:::$1:::").replace(/<h3[^>]*>(.*?)<\/h3>/gi, "HEADING3:::$1:::").replace(/<p[^>]*>(.*?)<\/p>/gi, "PARAGRAPH:::$1:::").replace(/<br\s*\/?>/gi, `
`).replace(/<strong>(.*?)<\/strong>/gi, "BOLD:::$1:::").replace(/<em>(.*?)<\/em>/gi, "ITALIC:::$1:::").replace(/<u>(.*?)<\/u>/gi, "UNDERLINE:::$1:::").replace(/<[^>]+>/g, "").split(":::");
  for (let i = 0; i < l.length; i++) {
    const o = l[i].trim();
    if (o) {
      if (o === "HEADING1" && l[i + 1])
        t.push(
          new zt({
            text: l[i + 1],
            heading: nr.HEADING_1,
            alignment: Uo.CENTER,
            spacing: { before: 240, after: 120 }
          })
        ), i++;
      else if (o === "HEADING2" && l[i + 1])
        t.push(
          new zt({
            text: l[i + 1],
            heading: nr.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        ), i++;
      else if (o === "HEADING3" && l[i + 1])
        t.push(
          new zt({
            text: l[i + 1],
            heading: nr.HEADING_3,
            spacing: { before: 160, after: 80 }
          })
        ), i++;
      else if (o === "PARAGRAPH" && l[i + 1]) {
        const p = l[i + 1], c = [];
        c.push(
          new Bo({
            text: p,
            font: e.fontFamily,
            size: Gl(e.fontSize)
          })
        ), t.push(
          new zt({
            children: c,
            spacing: {
              before: 0,
              after: 0,
              line: ql(e.lineHeight)
            },
            indent: {
              firstLine: St(3.5)
              // 10pt ≈ 3.5mm
            }
          })
        ), i++;
      }
    }
  }
  return t;
}
class Zl {
  /**
   * 문서를 DOCX 또는 HWPX로 내보내기
   */
  async export(e) {
    try {
      const t = {
        ...ri,
        ...e,
        marginRight: e.marginRight ?? e.marginLeft ?? ri.marginLeft,
        outputPath: e.outputPath ?? "",
        referenceHwpxPath: e.referenceHwpxPath ?? ""
      };
      if (!t.title || !t.content)
        throw new ge(pe.VALIDATION_FAILED, "Title and content are required");
      if (t.format === "DOCX")
        return await this.exportDocx(t);
      if (t.format === "HWPX")
        return await this.exportHwpx(t);
      throw new ge(pe.VALIDATION_FAILED, `Unsupported format: ${t.format}`);
    } catch (t) {
      return {
        success: !1,
        error: t instanceof Error ? t.message : "Unknown export error"
      };
    }
  }
  /**
   * DOCX 내보내기
   */
  async exportDocx(e) {
    try {
      const t = zl[e.paperSize], n = Yl(e.content, e), l = new Fo({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: St(t.width),
                  height: St(t.height)
                },
                margin: {
                  top: St(e.marginTop),
                  bottom: St(e.marginBottom),
                  left: St(e.marginLeft),
                  right: St(e.marginRight)
                }
              }
            },
            children: n
          }
        ]
      }), i = await Mo.toBuffer(l);
      let o = e.outputPath;
      if (!o)
        throw new ge(pe.VALIDATION_FAILED, "Output path is required");
      return o.endsWith(".docx") || (o = o.replace(/\.[^.]*$/, "") + ".docx"), await Ve.writeFile(o, i), {
        success: !0,
        filePath: o
      };
    } catch (t) {
      throw new ge(
        pe.FS_WRITE_FAILED,
        `DOCX export failed: ${t instanceof Error ? t.message : "Unknown error"}`
      );
    }
  }
  /**
   * HWPX 내보내기 (BETA)
   * 별도의 HWPX 전용 서비스 사용
   */
  async exportHwpx(e) {
    return await Wl.exportHwpx(e);
  }
}
const Vl = new Zl(), Kl = (a) => {
  const e = a.format === "DOCX" ? "docx" : "hwpx";
  return `${jo(a.title || "Untitled")}.${e}`;
}, $l = (a) => [
  {
    name: a === "DOCX" ? "Word Document" : "Hangul Document",
    extensions: [a === "DOCX" ? "docx" : "hwpx"]
  },
  { name: "All Files", extensions: ["*"] }
];
async function Xl(a) {
  const e = await Po.showSaveDialog({
    title: "문서 내보내기",
    defaultPath: Kl(a),
    filters: $l(a.format),
    properties: ["createDirectory", "showOverwriteConfirmation"]
  });
  if (e.canceled || !e.filePath)
    return {
      success: !1,
      error: "Export cancelled by user"
    };
  const t = {
    ...a,
    outputPath: e.filePath
  }, n = await Vl.export(t);
  if (!n.success && n.error)
    throw new ge(
      pe.FS_WRITE_FAILED,
      n.error,
      { format: a.format, chapterId: a.chapterId }
    );
  return n;
}
function Jl(a) {
  Ce(a, [
    {
      channel: U.EXPORT_CREATE,
      logTag: "EXPORT_CREATE",
      failMessage: "Failed to export document",
      argsSchema: To,
      handler: (e) => Xl(e)
    }
  ]);
}
function Ql(a) {
  rl(a.logger, a.autoSaveManager), al(a.logger, a.snapshotService), Jl(a.logger);
}
const kt = nt("AnalysisSecurity");
class eh {
  registeredWindowIds = /* @__PURE__ */ new Set();
  /**
   * 보안 리스너 등록
   * 윈도우 close 시 분석 데이터 자동 삭제
   */
  registerSecurityListeners(e) {
    if (e.isDestroyed()) {
      kt.warn("Security listener registration skipped for destroyed window");
      return;
    }
    this.registeredWindowIds.has(e.id) || (this.registeredWindowIds.add(e.id), e.once("close", () => {
      kt.info("Window close detected, clearing analysis data"), er.stopAnalysis(), er.clearAnalysisData(), this.registeredWindowIds.delete(e.id);
    }), e.once("closed", () => {
      this.registeredWindowIds.delete(e.id);
    }), kt.info("Security listeners registered", { windowId: e.id }));
  }
  /**
   * 민감 데이터 정리
   * 메모리에서 분석 결과 완전 삭제
   */
  clearSensitiveData() {
    try {
      er.clearAnalysisData(), global.gc && (global.gc(), kt.info("Forced garbage collection")), kt.info("Sensitive data cleared");
    } catch (e) {
      kt.error("Failed to clear sensitive data", { error: e });
    }
  }
  /**
   * Gemini API 키 검증
   */
  validateAPIKey() {
    const e = process.env.GEMINI_API_KEY;
    return e ? e.length < 20 ? {
      valid: !1,
      message: "GEMINI_API_KEY가 유효하지 않습니다 (너무 짧음)."
    } : {
      valid: !0,
      message: "API 키가 유효합니다."
    } : {
      valid: !1,
      message: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
    };
  }
  /**
   * 네트워크 요청 제한 확인
   * Gemini API 외 외부 전송 차단
   */
  isAllowedRequest(e) {
    const t = [
      "generativelanguage.googleapis.com",
      "googleapis.com"
    ];
    try {
      const n = new URL(e);
      return t.some((l) => n.hostname.includes(l));
    } catch {
      return !1;
    }
  }
}
const ai = new eh();
function th(a, e) {
  const t = () => {
    const i = Tt.getMainWindow();
    if (i && !i.isDestroyed())
      return i;
    const o = oa.getFocusedWindow();
    return o && !o.isDestroyed() ? o : oa.getAllWindows().find((p) => !p.isDestroyed()) ?? null;
  }, n = (i, o, p) => {
    throw new ge(i, o, p);
  }, l = () => {
    const i = t();
    if (!i)
      throw new ge(
        pe.ANALYSIS_INVALID_REQUEST,
        "윈도우를 찾을 수 없습니다."
      );
    return i;
  };
  Ce(a, [
    {
      channel: U.ANALYSIS_START,
      logTag: "ANALYSIS_START",
      failMessage: "분석을 시작하는 중 오류가 발생했습니다.",
      argsSchema: So,
      handler: async (i) => {
        a.info("ANALYSIS_START", { request: i });
        const o = l();
        ai.registerSecurityListeners(o);
        try {
          await e.startAnalysis(i.chapterId, i.projectId, o);
        } catch (p) {
          const c = p instanceof Error ? p.message : String(p);
          throw c.includes("SYNC_AUTH_REQUIRED_FOR_EDGE") && n(
            pe.SYNC_AUTH_REQUIRED_FOR_EDGE,
            "Edge AI 호출에는 Sync 로그인이 필요합니다."
          ), c.includes("SUPABASE_NOT_CONFIGURED") && n(
            pe.ANALYSIS_INVALID_REQUEST,
            "Supabase 런타임 설정이 완료되지 않았습니다."
          ), p;
        }
        return !0;
      }
    },
    {
      channel: U.ANALYSIS_STOP,
      logTag: "ANALYSIS_STOP",
      failMessage: "분석 중단 중 오류가 발생했습니다.",
      handler: () => (a.info("ANALYSIS_STOP"), e.stopAnalysis(), !0)
    },
    {
      channel: U.ANALYSIS_CLEAR,
      logTag: "ANALYSIS_CLEAR",
      failMessage: "분석 데이터 삭제 중 오류가 발생했습니다.",
      handler: () => (a.info("ANALYSIS_CLEAR"), e.clearAnalysisData(), ai.clearSensitiveData(), !0)
    }
  ]), a.info("Analysis IPC handlers registered");
}
function rh(a) {
  th(a.logger, a.manuscriptAnalysisService);
}
const bt = nt("IPCHandler");
function ah() {
  ys({
    logger: bt,
    projectService: at,
    chapterService: xo
  }), tl({
    logger: bt,
    characterService: Do,
    termService: Io,
    eventService: Zo,
    factionService: $o,
    worldEntityService: Jo,
    entityRelationService: No,
    worldMentionService: as
  }), Ql({
    logger: bt,
    autoSaveManager: Co,
    snapshotService: ko
  }), bs({
    logger: bt,
    searchService: is
  }), Vs({ logger: bt }), rh({
    logger: bt,
    manuscriptAnalysisService: er
  }), bt.info("IPC handlers registered successfully");
}
const Dh = ah;
export {
  ah as registerAllIPCHandlers,
  Dh as registerIPCHandlers
};

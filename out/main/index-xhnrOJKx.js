import { d as Se, p as st, S as pe, E as he, c as lt, L as ot, e as _r, r as Ra, a as Zt, b as Do, M as Wi, I as U, f as ji, A as Co, w as Ga, i as No, g as Po, n as Ht, h as gr, j as Ma, k as Bi, l as xa, m as Hi, Z as fr, o as zi, v as ur, q as dr, s as Gi, t as ko, u as Oo, x as Lo, D as qa, y as Fo, z as Mo, B as br, C as Da, F as Uo, G as Et, H as Wo, J as jo, K as Bo, N as Ho, O as zo, P as Go, Q as qo, R as Yo, T as Zo, U as $o, V as Vo, W as Ya, X as Lt, Y as Ct, _ as Ko, $ as Xo } from "./index.js";
import { k as Za, i as Jo, b as Qo, c as es, t as ts, a as rs } from "./autoSaveManager-_jjQRUWx.js";
import { g as _t, c as as } from "./characterService-CNN-DedU.js";
import { entityRelationService as ns } from "./entityRelationService-CkAl1PzR.js";
import { s as is } from "./snapshotService-CkktZTOV.js";
import "./config-HSSbDImy.js";
import { z as h } from "zod";
import { Type as Ft } from "@google/genai";
import { promises as Ke } from "fs";
import * as Pe from "path";
import De from "path";
import { app as qe, ipcMain as os, dialog as Yt, BrowserWindow as Ca, shell as ss } from "electron";
import ls from "better-sqlite3";
import { randomUUID as hs, createHash as $a } from "node:crypto";
import * as Re from "fs/promises";
import "yazl";
import cs from "yauzl";
import * as Ge from "node:fs/promises";
import It from "node:path";
import { Document as fs, Packer as us, Paragraph as er, AlignmentType as ds, HeadingLevel as Tr, TextRun as ps } from "docx";
import qi from "stream";
import gs from "events";
import Yi from "buffer";
import Ua from "util";
import ms from "sanitize-filename";
import _s from "node:module";
const mf = import.meta.filename, _f = import.meta.dirname, ws = _s.createRequire(import.meta.url);
var Be = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function vs(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
const gt = lt("EventService");
function Es(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class ys {
  async createEvent(e) {
    try {
      gt.info("Creating event", e);
      const t = await Se.getClient().event.create({
        data: {
          projectId: e.projectId,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null
        }
      });
      return gt.info("Event created successfully", {
        eventId: t.id
      }), st.schedulePackageExport(e.projectId, "event:create"), t;
    } catch (t) {
      throw gt.error("Failed to create event", t), new pe(
        he.DB_QUERY_FAILED,
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
        throw new pe(
          he.DB_QUERY_FAILED,
          "Event not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw gt.error("Failed to get event", t), t;
    }
  }
  async getAllEvents(e) {
    try {
      return await Se.getClient().event.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw gt.error("Failed to get all events", t), new pe(
        he.DB_QUERY_FAILED,
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
      return gt.info("Event updated successfully", {
        eventId: n.id
      }), st.schedulePackageExport(String(n.projectId), "event:update"), n;
    } catch (t) {
      throw gt.error("Failed to update event", t), Es(t) ? new pe(
        he.DB_QUERY_FAILED,
        "Event not found",
        { id: e.id },
        t
      ) : new pe(
        he.DB_QUERY_FAILED,
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
      return await Se.getClient().$transaction(async (s) => {
        n && await s.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await s.event.deleteMany({ where: { id: e } });
      }), gt.info("Event deleted successfully", { eventId: e }), n && st.schedulePackageExport(
        n,
        "event:delete"
      ), { success: !0 };
    } catch (t) {
      throw gt.error("Failed to delete event", t), new pe(
        he.DB_QUERY_FAILED,
        "Failed to delete event",
        { id: e },
        t
      );
    }
  }
}
const bs = new ys(), mt = lt("FactionService");
function Ts(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class Ss {
  async createFaction(e) {
    try {
      mt.info("Creating faction", e);
      const t = await Se.getClient().faction.create({
        data: {
          projectId: e.projectId,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null
        }
      });
      return mt.info("Faction created successfully", {
        factionId: t.id
      }), st.schedulePackageExport(e.projectId, "faction:create"), t;
    } catch (t) {
      throw mt.error("Failed to create faction", t), new pe(
        he.DB_QUERY_FAILED,
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
        throw new pe(
          he.DB_QUERY_FAILED,
          "Faction not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw mt.error("Failed to get faction", t), t;
    }
  }
  async getAllFactions(e) {
    try {
      return await Se.getClient().faction.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw mt.error("Failed to get all factions", t), new pe(
        he.DB_QUERY_FAILED,
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
      return mt.info("Faction updated successfully", {
        factionId: n.id
      }), st.schedulePackageExport(String(n.projectId), "faction:update"), n;
    } catch (t) {
      throw mt.error("Failed to update faction", t), Ts(t) ? new pe(
        he.DB_QUERY_FAILED,
        "Faction not found",
        { id: e.id },
        t
      ) : new pe(
        he.DB_QUERY_FAILED,
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
      return await Se.getClient().$transaction(async (s) => {
        n && await s.entityRelation.deleteMany({
          where: {
            projectId: n,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await s.faction.deleteMany({ where: { id: e } });
      }), mt.info("Faction deleted successfully", { factionId: e }), n && st.schedulePackageExport(
        n,
        "faction:delete"
      ), { success: !0 };
    } catch (t) {
      throw mt.error("Failed to delete faction", t), new pe(
        he.DB_QUERY_FAILED,
        "Failed to delete faction",
        { id: e },
        t
      );
    }
  }
}
const As = new Ss(), ut = lt("WorldEntityService");
function Va(r) {
  return typeof r == "object" && r !== null && "code" in r && r.code === "P2025";
}
class Is {
  async createWorldEntity(e) {
    try {
      ut.info("Creating world entity", e);
      const t = await _t().worldEntity.create({
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
      return ut.info("World entity created", { entityId: t.id }), st.schedulePackageExport(String(t.projectId), "world-entity:create"), t;
    } catch (t) {
      throw ut.error("Failed to create world entity", t), new pe(
        he.WORLD_ENTITY_CREATE_FAILED,
        "Failed to create world entity",
        { input: e },
        t
      );
    }
  }
  async getWorldEntity(e) {
    try {
      const t = await _t().worldEntity.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new pe(
          he.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw ut.error("Failed to get world entity", t), t;
    }
  }
  async getAllWorldEntities(e) {
    try {
      return await _t().worldEntity.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (t) {
      throw ut.error("Failed to get all world entities", t), new pe(
        he.DB_QUERY_FAILED,
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
      const n = await _t().worldEntity.update({
        where: { id: e.id },
        data: t
      });
      return ut.info("World entity updated", { entityId: n.id }), st.schedulePackageExport(String(n.projectId), "world-entity:update"), n;
    } catch (t) {
      throw ut.error("Failed to update world entity", t), Va(t) ? new pe(
        he.WORLD_ENTITY_NOT_FOUND,
        "World entity not found",
        { id: e.id },
        t
      ) : new pe(
        he.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update world entity",
        { input: e },
        t
      );
    }
  }
  async updateWorldEntityPosition(e) {
    try {
      const t = await _t().worldEntity.update({
        where: { id: e.id },
        data: { positionX: e.positionX, positionY: e.positionY }
      });
      return st.schedulePackageExport(String(t.projectId), "world-entity:update-position"), t;
    } catch (t) {
      throw ut.error("Failed to update world entity position", t), Va(t) ? new pe(
        he.WORLD_ENTITY_NOT_FOUND,
        "World entity not found",
        { id: e.id },
        t
      ) : new pe(
        he.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update position",
        { input: e },
        t
      );
    }
  }
  async deleteWorldEntity(e) {
    try {
      const t = await _t().worldEntity.delete({ where: { id: e } });
      return ut.info("World entity deleted", { entityId: e }), st.schedulePackageExport(String(t.projectId), "world-entity:delete"), { success: !0 };
    } catch (t) {
      throw ut.error("Failed to delete world entity", t), new pe(
        he.WORLD_ENTITY_DELETE_FAILED,
        "Failed to delete world entity",
        { id: e },
        t
      );
    }
  }
}
const Rs = new Is();
function Zi(r) {
  return typeof DOMParser < "u" ? new DOMParser().parseFromString(r, "text/html").body.textContent ?? "" : r.replace(/<[^>]*>/g, " ");
}
const xs = lt("WorldMentionService"), Ka = 48, Sr = 100, Ds = (r, e) => {
  const t = Math.max(0, e - Ka), n = Math.min(r.length, e + Ka);
  return r.slice(t, n);
}, Xa = (r) => r.trim().toLowerCase(), Cs = (r, e) => {
  const t = Zi(r), n = Xa(e);
  if (!n) return null;
  const s = Xa(t).indexOf(n);
  return s >= 0 ? s : null;
};
class Ns {
  async getEntityName(e, t) {
    const n = _t();
    switch (e) {
      case "Character": {
        const s = await n.character.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof s?.name == "string" ? s.name : null;
      }
      case "Faction": {
        const s = await n.faction.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof s?.name == "string" ? s.name : null;
      }
      case "Event": {
        const s = await n.event.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof s?.name == "string" ? s.name : null;
      }
      case "Term": {
        const s = await n.term.findUnique({
          where: { id: t },
          select: { term: !0 }
        });
        return typeof s?.term == "string" ? s.term : null;
      }
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity": {
        const s = await n.worldEntity.findUnique({
          where: { id: t },
          select: { name: !0 }
        });
        return typeof s?.name == "string" ? s.name : null;
      }
      default:
        return null;
    }
  }
  async getAppearanceMentions(e) {
    if (e.entityType !== "Character" && e.entityType !== "Term")
      return [];
    const t = _t(), n = e.entityType === "Character" ? await t.characterAppearance.findMany({
      where: { characterId: e.entityId },
      orderBy: { createdAt: "asc" },
      take: e.limit ?? Sr
    }) : await t.termAppearance.findMany({
      where: { termId: e.entityId },
      orderBy: { createdAt: "asc" },
      take: e.limit ?? Sr
    });
    if (n.length === 0)
      return [];
    const s = Array.from(new Set(n.map((u) => u.chapterId))), i = await t.chapter.findMany({
      where: {
        id: { in: s },
        projectId: e.projectId
      },
      select: { id: !0, title: !0 }
    }), o = new Map(i.map((u) => [u.id, u]));
    return n.map((u) => {
      const f = o.get(u.chapterId);
      return f ? {
        chapterId: u.chapterId,
        chapterTitle: f.title,
        position: typeof u.position == "number" ? u.position : null,
        context: typeof u.context == "string" ? u.context : void 0,
        source: "appearance"
      } : null;
    }).filter((u) => u !== null);
  }
  async getFallbackMentions(e, t) {
    const s = await _t().chapter.findMany({
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
    for (const o of s) {
      const u = Cs(o.content, t);
      if (u === null) continue;
      const f = Zi(o.content);
      if (i.push({
        chapterId: o.id,
        chapterTitle: o.title,
        position: u,
        context: Ds(f, u),
        source: "content-match"
      }), i.length >= (e.limit ?? Sr))
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
      throw xs.error("Failed to fetch world graph mentions", { query: e, error: t }), new pe(
        he.DB_QUERY_FAILED,
        "Failed to fetch world graph mentions",
        { query: e },
        t
      );
    }
  }
}
const Ps = new Ns(), tr = lt("SearchService");
class ks {
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
      })).forEach((s) => {
        t.push({
          type: "character",
          id: s.id,
          title: s.name,
          description: s.description ?? void 0,
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
      })).forEach((s) => {
        t.push({
          type: "term",
          id: s.id,
          title: s.term,
          description: s.definition ?? void 0,
          metadata: {
            category: s.category ?? void 0
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
      })).forEach((s) => {
        t.push({
          type: "chapter",
          id: s.id,
          title: s.title,
          description: s.synopsis ?? void 0,
          metadata: {
            wordCount: s.wordCount,
            order: s.order
          }
        });
      }), t.sort((n, s) => {
        const i = { term: 0, character: 1, chapter: 2 }, o = i[n.type] - i[s.type];
        return o !== 0 ? o : n.title.localeCompare(s.title);
      }), tr.info("Search completed", {
        projectId: e.projectId,
        query: e.query,
        resultCount: t.length
      }), t;
    } catch (t) {
      throw tr.error("Search failed", t), new pe(
        he.SEARCH_QUERY_FAILED,
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
      }), s = [
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
      return tr.info("Quick access retrieved", {
        projectId: e,
        termCount: t.length,
        characterCount: n.length
      }), s;
    } catch (t) {
      throw tr.error("Failed to get quick access", t), new pe(
        he.SEARCH_QUERY_FAILED,
        "Failed to get quick access",
        { projectId: e },
        t
      );
    }
  }
}
const Os = new ks(), Ls = lt("ManuscriptAnalyzer");
class Fs {
  /**
   * 명사구 추출 (keywordExtractor 활용)
   */
  extractNounPhrases(e) {
    try {
      const t = Za.extractNouns(e);
      return Za.filterByFrequency(t, 1);
    } catch (t) {
      return Ls.error("Failed to extract noun phrases", { error: t }), [];
    }
  }
  /**
   * 분석 컨텍스트 구성
   * 캐릭터, Term, 원고 내용을 통합
   */
  buildAnalysisContext(e, t, n) {
    const s = this.extractNounPhrases(e.content);
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
        nounPhrases: s
      }
    };
  }
}
const Ms = new Fs(), Us = h.object({
  type: h.enum(["reaction", "suggestion", "intro", "outro"]),
  content: h.string(),
  quote: h.string().optional(),
  contextId: h.string().optional()
});
Ft.ARRAY, Ft.OBJECT, Ft.STRING, Ft.STRING, Ft.STRING, Ft.STRING;
const Ws = `
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
`.trim(), Ja = `
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
function Qa(r) {
  const { manuscript: e } = r;
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
const we = lt("ManuscriptAnalysisService"), js = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview", Bs = (r, e, t) => {
  if (!r) return e;
  try {
    return JSON.parse(r);
  } catch (n) {
    return we.warn("Failed to parse .luie analysis payload; using fallback", {
      projectPath: t.projectPath,
      entryPath: t.entryPath,
      label: t.label,
      error: n
    }), e;
  }
};
class Hs {
  isAnalyzing = !1;
  currentWindow = null;
  analysisCache = /* @__PURE__ */ new Map();
  /**
   * 분석 시작
   */
  async startAnalysis(e, t, n) {
    if (this.isAnalyzing)
      throw we.warn("Analysis already in progress"), new Error("Analysis already in progress");
    this.isAnalyzing = !0, this.currentWindow = n, we.info("Window assigned for analysis", {
      hasWindow: !!this.currentWindow,
      isDestroyed: this.currentWindow?.isDestroyed(),
      windowId: this.currentWindow?.id
    });
    try {
      const s = await Se.getClient().project.findUnique({
        where: { id: t },
        select: { projectPath: !0 }
      }), i = typeof s?.projectPath == "string" ? s.projectPath : "";
      if (!i || !i.toLowerCase().endsWith(ot))
        throw new Error("Project .luie path not found");
      const o = _r(i, "projectPath"), [u, f] = await Promise.all([
        Ra(o, Zt, we),
        Ra(
          o,
          `${Do}/${e}${Wi}`,
          we
        )
      ]);
      if (!f)
        throw new Error(`Chapter content not found in .luie: ${e}`);
      const p = Bs(
        u,
        void 0,
        {
          projectPath: o,
          entryPath: Zt,
          label: "meta"
        }
      )?.chapters?.find((S) => S.id === e)?.title ?? "Untitled", l = {
        id: e,
        title: p,
        content: f
      };
      we.info("Loaded .luie analysis data", {
        chapterId: e,
        chapterTitle: p,
        contentLength: f.length
      });
      const g = Ms.buildAnalysisContext(
        l,
        [],
        []
      ), E = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await this.streamAnalysisWithGemini(g, e, E), we.info("Analysis completed", { chapterId: e, projectId: t });
    } catch (s) {
      throw we.error("Analysis failed", { chapterId: e, projectId: t, error: s }), this.isAnalyzing = !1, s;
    } finally {
      this.isAnalyzing = !1;
    }
  }
  /**
   * 분석 중단
   */
  stopAnalysis() {
    if (!this.isAnalyzing) {
      we.warn("No analysis in progress");
      return;
    }
    this.isAnalyzing = !1, we.info("Analysis stopped by user");
  }
  /**
   * 분석 데이터 삭제 (보안)
   */
  clearAnalysisData() {
    we.info("clearAnalysisData called", {
      hadWindow: !!this.currentWindow,
      windowId: this.currentWindow?.id,
      isAnalyzing: this.isAnalyzing,
      stackTrace: new Error().stack?.split(`
`).slice(1, 4).join(`
`)
    }), this.analysisCache.clear(), this.currentWindow = null, we.info("Analysis data cleared");
  }
  /**
   * Gemini API 스트리밍 호출
   */
  async streamAnalysisWithGemini(e, t, n) {
    const s = `${Ja}

${Ws}

---

${Qa(e)}

# RunId
${n}

# Style
같은 요청이어도 표현을 바꿔서 답변하세요. 이전 응답과 동일 문장을 반복하지 마세요.
본문에 없는 사실은 절대 추가하지 마세요.
reaction/suggestion의 quote는 반드시 본문에 있는 문구를 그대로 사용하세요.`, i = [];
    let o = 0;
    const u = /* @__PURE__ */ new Set(), f = e.manuscript.content.replace(/\s+/g, " ").trim(), T = [
      js,
      process.env.ALTERNATIVE_GEMINI_MODEL
    ].filter((v) => !!v);
    we.info("Starting Gemini analysis", {
      chapterId: t,
      models: T,
      promptLength: s.length
    });
    try {
      let v = "";
      const p = [], l = (w) => {
        try {
          const A = Us.parse(w), C = (ee) => ee.replace(/\s+/g, " ").trim(), O = A.type === "reaction" || A.type === "suggestion", j = C(A.quote ?? "");
          if (O && !j) {
            we.warn("Skipping analysis item without quote", {
              chapterId: t,
              type: A.type
            });
            return;
          }
          if (O && f && !f.includes(j)) {
            we.warn("Skipping analysis item with quote outside manuscript", {
              chapterId: t,
              type: A.type,
              quotePreview: j.slice(0, 120)
            });
            return;
          }
          const M = `${A.type}|${C(A.content).toLowerCase()}|${j.toLowerCase()}`;
          if (u.has(M)) {
            we.info("Skipping duplicate analysis item", {
              chapterId: t,
              type: A.type
            });
            return;
          }
          u.add(M);
          const Y = {
            id: `analysis-${++o}`,
            type: A.type,
            content: A.content,
            quote: A.quote,
            contextId: A.contextId
          };
          i.push(Y), p.push(A), we.info("Attempting to send stream item", {
            itemId: Y.id,
            type: Y.type,
            hasCurrentWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id
          }), this.currentWindow && !this.currentWindow.isDestroyed() ? this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
            item: Y,
            done: !1
          }) : we.error("Window not available for streaming - CRITICAL", {
            hasWindow: !!this.currentWindow,
            isDestroyed: this.currentWindow?.isDestroyed(),
            windowId: this.currentWindow?.id,
            itemId: Y.id
          });
        } catch (A) {
          we.warn("Invalid analysis item", { error: A, itemData: w });
        }
      }, g = async (w, A, C) => {
        let j = await Jo({
          model: w,
          prompt: A,
          responseMimeType: "text/plain",
          temperature: 0.5,
          topP: 0.9,
          topK: 40
        });
        for (; j.length > 0; ) {
          const M = j.trimStart();
          if (!M) {
            j = "";
            break;
          }
          if (M.startsWith("```")) {
            const ue = M.indexOf(`
`);
            if (ue === -1) break;
            j = M.slice(ue + 1);
            continue;
          }
          if (!M.startsWith("{") && !M.startsWith("[")) {
            const ue = Math.min(
              M.indexOf("{") === -1 ? 1 / 0 : M.indexOf("{"),
              M.indexOf("[") === -1 ? 1 / 0 : M.indexOf("[")
            );
            if (ue === 1 / 0) {
              j = "";
              break;
            }
            j = M.slice(ue);
            continue;
          }
          let Y = 0, ee = !1, te = !1, le = -1;
          const oe = M[0] === "[", $ = oe ? "[" : "{", ce = oe ? "]" : "}";
          for (let ue = 0; ue < M.length; ue++) {
            const x = M[ue];
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
              if (x === $)
                Y++;
              else if (x === ce && (Y--, Y === 0)) {
                le = ue + 1;
                break;
              }
            }
          }
          if (le === -1)
            break;
          const ve = M.slice(0, le);
          j = M.slice(le);
          try {
            const ue = JSON.parse(ve);
            Array.isArray(ue) ? ue.forEach((x) => l(x)) : l(ue);
          } catch (ue) {
            we.warn("Failed to parse JSON", { error: ue, jsonStr: ve.slice(0, 200), phase: C });
          }
        }
        if (j.trim()) {
          const M = j.trim();
          try {
            const Y = JSON.parse(M);
            Array.isArray(Y) ? Y.forEach((ee) => l(ee)) : l(Y);
          } catch (Y) {
            we.warn("Failed to parse remaining buffer", { error: Y, buffer: M.slice(0, 200), phase: C });
          }
        }
      };
      for (const w of T)
        try {
          we.info("Trying Gemini model", { model: w }), await g(w, s, "primary"), v = w, we.info("Gemini model responded successfully", { model: w });
          break;
        } catch (A) {
          const C = A && typeof A == "object" && "status" in A ? A.status : void 0, O = C === 404 || C === 429 || C === 503, j = w !== T[T.length - 1];
          if (we.warn("Gemini model failed", {
            model: w,
            status: C,
            isRetryable: O,
            hasNext: j,
            error: A instanceof Error ? A.message : String(A)
          }), O && j)
            continue;
          throw A;
        }
      if (!v)
        throw new Error("No available Gemini model responded");
      we.info("Gemini response received", { usedModel: v });
      const E = p.filter((w) => w?.type === "suggestion").length, S = p.filter((w) => w?.type === "reaction").length, R = p.some((w) => w?.type === "intro"), m = p.some((w) => w?.type === "outro");
      if (E < 2 || S < 1 || !R || !m) {
        we.warn("Gemini response missing required items", {
          suggestionCount: E,
          reactionCount: S,
          hasIntro: R,
          hasOutro: m
        });
        const w = `${Ja}

${Qa(e)}

# 추가 요청
부족한 항목만 JSONL로 추가 출력하세요.
- intro: ${R ? "이미 출력됨" : "필수"}
- reaction: ${S >= 1 ? "이미 출력됨" : "최소 1개 (quote 포함)"}
- suggestion: ${E >= 2 ? "이미 출력됨" : "최소 2개 (quote 포함)"}
- outro: ${m ? "이미 출력됨" : "필수"}
동일 문장 반복 금지. 코드블록 금지.`;
        await g(v, w, "followup");
      }
      we.info("Attempting to send completion event", {
        hasCurrentWindow: !!this.currentWindow,
        isDestroyed: this.currentWindow?.isDestroyed(),
        windowId: this.currentWindow?.id
      }), this.currentWindow && !this.currentWindow.isDestroyed() ? (we.info("Sending completion event to window"), this.currentWindow.webContents.send(U.ANALYSIS_STREAM, {
        item: null,
        done: !0
      }), we.info("Completion event sent successfully")) : we.error("Window not available for completion event - CRITICAL", {
        hasWindow: !!this.currentWindow,
        isDestroyed: this.currentWindow?.isDestroyed(),
        windowId: this.currentWindow?.id
      }), this.analysisCache.set(t, i), we.info("Streaming analysis completed", {
        chapterId: t,
        itemCount: i.length
      });
    } catch (v) {
      we.error("Gemini streaming failed", { error: v });
      const p = Qo(e);
      if (p.length > 0) {
        we.warn("Using deterministic local fallback for analysis", {
          chapterId: t,
          fallbackCount: p.length,
          reason: v instanceof Error ? v.message : String(v)
        });
        const S = p.map((R, m) => ({
          id: `analysis-fallback-${m + 1}`,
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
      let l = "UNKNOWN", g = "분석 중 오류가 발생했습니다.";
      const E = v instanceof Error ? v.message : String(v);
      if (E.includes("SYNC_AUTH_REQUIRED_FOR_EDGE") ? (l = "INVALID_REQUEST", g = "분석을 실행하려면 Sync 로그인이 필요합니다.") : E.includes("SUPABASE_NOT_CONFIGURED") && (l = "INVALID_REQUEST", g = "Supabase 런타임 설정을 먼저 완료해주세요."), v && typeof v == "object" && "status" in v) {
        const S = v;
        S.status === 429 ? (l = "QUOTA_EXCEEDED", g = "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.") : S.status >= 500 ? (l = "NETWORK_ERROR", g = "Gemini API 서버 오류가 발생했습니다.") : S.status === 400 && (l = "INVALID_REQUEST", g = "잘못된 요청입니다. 원고 내용을 확인해주세요.");
      }
      throw this.currentWindow && !this.currentWindow.isDestroyed() && this.currentWindow.webContents.send(U.ANALYSIS_ERROR, {
        code: l,
        message: g,
        details: v instanceof Error ? v.message : String(v)
      }), v;
    }
  }
  /**
   * 분석 진행 여부 확인
   */
  isAnalysisInProgress() {
    return this.isAnalyzing;
  }
}
const pr = new Hs(), rr = lt("DbRecoveryService"), zs = (r) => {
  if (!Array.isArray(r)) return;
  const e = r.filter((t) => !!(t && typeof t == "object")).map((t) => ({
    busy: typeof t.busy == "number" && Number.isFinite(t.busy) ? t.busy : 0,
    log: typeof t.log == "number" && Number.isFinite(t.log) ? t.log : 0,
    checkpointed: typeof t.checkpointed == "number" && Number.isFinite(t.checkpointed) ? t.checkpointed : 0
  }));
  return e.length > 0 ? e : void 0;
}, Gs = (r) => {
  if (!Array.isArray(r)) return;
  const e = r.map((t) => {
    if (typeof t == "string") return t;
    if (t && typeof t == "object") {
      const n = t.integrity_check;
      if (typeof n == "string") return n;
    }
    return null;
  }).filter((t) => typeof t == "string" && t.length > 0);
  return e.length > 0 ? e : void 0;
};
class qs {
  async recoverFromWal(e) {
    let t, n = null, s = !1;
    try {
      const i = Se.getDatabasePath();
      n = i;
      const o = `${i}-wal`, u = `${i}-shm`;
      if (!await this.exists(o))
        return {
          success: !1,
          message: "WAL file not found. Recovery is not available."
        };
      if (t = await this.createBackup(i, o, u), e?.dryRun)
        return {
          success: !0,
          message: "Backup created. Run recovery to apply WAL.",
          backupDir: t
        };
      await Se.disconnect(), s = !0;
      const T = new ls(i, { fileMustExist: !0 });
      let v, p;
      try {
        v = T.pragma("wal_checkpoint(FULL)"), p = T.pragma("integrity_check");
      } finally {
        T.close();
      }
      const l = zs(v), g = Gs(p), E = (l ?? []).filter((R) => R.busy > 0);
      if (E.length > 0)
        throw new Error(`DB_RECOVERY_WAL_BUSY:${E.map((R) => R.busy).join(",")}`);
      const S = (g ?? []).filter(
        (R) => R.trim().toLowerCase() !== "ok"
      );
      if (S.length > 0)
        throw new Error(`DB_RECOVERY_INTEGRITY_FAILED:${S[0]}`);
      return await Se.initialize(), s = !1, rr.info("DB recovery completed", { dbPath: n, backupDir: t }), {
        success: !0,
        message: "Recovery completed successfully.",
        backupDir: t,
        checkpoint: l,
        integrity: g
      };
    } catch (i) {
      if (rr.error("DB recovery failed", { error: i }), t && n && await this.restoreBackup(t, n), s)
        try {
          await Se.initialize();
        } catch (o) {
          rr.error("Failed to reinitialize database after recovery failure", {
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
    const s = (/* @__PURE__ */ new Date()).toISOString().replace(/[^0-9]/g, ""), i = De.join(qe.getPath("userData"), ji, "db-recovery", s);
    return await Ke.mkdir(i, { recursive: !0 }), await Ke.copyFile(e, De.join(i, De.basename(e))), await Ke.copyFile(t, De.join(i, De.basename(t))), await this.exists(n) && await Ke.copyFile(n, De.join(i, De.basename(n))), i;
  }
  async restoreBackup(e, t) {
    try {
      const n = De.basename(t), s = De.basename(`${t}-wal`), i = De.basename(`${t}-shm`), o = De.dirname(t), u = De.join(e, n);
      if (!await this.exists(u))
        return;
      await Ke.copyFile(u, De.join(o, n));
      const f = De.join(e, s), T = De.join(e, i);
      await this.exists(f) && await Ke.copyFile(f, De.join(o, s)), await this.exists(T) && await Ke.copyFile(T, De.join(o, i));
    } catch (n) {
      rr.warn("Failed to restore backup", { error: n });
    }
  }
  async exists(e) {
    try {
      return await Ke.access(e), !0;
    } catch {
      return !1;
    }
  }
}
const Ys = new qs();
function $i(r) {
  const e = r?.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...r,
    timestamp: e,
    version: r?.version ?? Co
  };
}
function Zs(r, e) {
  return {
    success: !0,
    data: r,
    meta: $i(e)
  };
}
function Ar(r, e, t, n) {
  return {
    success: !1,
    error: {
      code: r,
      message: e,
      details: t,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    meta: $i(n)
  };
}
const $s = [
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
], Vs = [
  "sync:",
  "settings:",
  "window:",
  "logger:",
  "app:",
  "recovery:"
], Ks = (r) => !Vs.some((e) => r.startsWith(e)) && $s.some((e) => r.includes(e));
function Xs(r) {
  os.handle(r.channel, async (e, ...t) => {
    const n = Date.now(), s = hs();
    let i = t;
    if (r.argsSchema) {
      const o = r.argsSchema.safeParse(t);
      if (!o.success) {
        const u = {
          issues: o.error.issues
        };
        return Ar(
          he.INVALID_INPUT,
          "Invalid input",
          u,
          {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            duration: Date.now() - n,
            requestId: s,
            channel: r.channel
          }
        );
      }
      i = o.data;
    }
    try {
      const o = await r.handler(...i);
      return Ks(r.channel) && import("./index.js").then((u) => u.as).then(({ syncService: u }) => {
        u.onLocalMutation(r.channel);
      }).catch((u) => {
        r.logger.error(
          "Failed to trigger auto sync after local mutation",
          Ga({ error: u }, { requestId: s, channel: r.channel })
        );
      }), Zs(o, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        duration: Date.now() - n,
        requestId: s,
        channel: r.channel
      });
    } catch (o) {
      const u = r.logTag ?? r.channel;
      r.logger.error(
        `${u} failed`,
        Ga({ error: o }, { requestId: s, channel: r.channel })
      );
      const f = o;
      if (No(f))
        return Ar(
          f.code,
          f.message,
          f.details,
          {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            duration: Date.now() - n,
            requestId: s,
            channel: r.channel
          }
        );
      const T = f?.message ?? r.failMessage, p = Object.values(he).includes(T);
      return Ar(
        p ? T : he.UNKNOWN_ERROR,
        r.failMessage,
        void 0,
        {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          duration: Date.now() - n,
          requestId: s,
          channel: r.channel
        }
      );
    }
  });
}
function Ce(r, e) {
  e.forEach((t) => {
    Xs({
      logger: r,
      channel: t.channel,
      logTag: t.logTag,
      failMessage: t.failMessage,
      argsSchema: t.argsSchema,
      handler: t.handler
    });
  });
}
const Wa = 4096, Vi = 255, Js = 1e7, Tt = h.string().min(1, "Path is required").max(Wa, "Path is too long").refine((r) => !r.includes("\0"), "Path must not contain null bytes"), wr = h.string().max(Js, "Content is too large"), Qs = h.object({
  name: h.string().min(1).max(100),
  extensions: h.array(h.string().min(1).max(20)).max(20)
}), el = h.object({
  filters: h.array(Qs).max(20).optional(),
  defaultPath: Tt.optional(),
  title: h.string().min(1).max(200).optional()
}), tl = h.object({
  title: h.string().min(1, "Title is required"),
  description: h.string().optional(),
  projectPath: h.string().optional()
}), rl = h.object({
  id: h.string().uuid("Invalid project ID"),
  title: h.string().min(1, "Title is required").optional(),
  description: h.string().optional(),
  projectPath: h.string().optional()
}), al = h.object({
  id: h.string().uuid("Invalid project ID"),
  deleteFile: h.boolean().optional()
}), nl = h.union([
  h.string().uuid("Invalid project ID"),
  al
]), il = h.object({
  projectId: h.string().uuid("Invalid project ID"),
  title: h.string().min(1, "Title is required"),
  synopsis: h.string().optional()
}), ol = h.object({
  id: h.string().uuid("Invalid chapter ID"),
  title: h.string().min(1, "Title is required").optional(),
  content: h.string().optional(),
  synopsis: h.string().optional()
}), sl = h.object({
  projectId: h.string().uuid("Invalid project ID"),
  name: h.string().min(1, "Name is required"),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), ll = h.object({
  id: h.string().uuid("Invalid character ID"),
  name: h.string().min(1, "Name is required").optional(),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), hl = h.object({
  projectId: h.string().uuid("Invalid project ID"),
  name: h.string().min(1, "Name is required"),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), cl = h.object({
  id: h.string().uuid("Invalid event ID"),
  name: h.string().min(1, "Name is required").optional(),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), fl = h.object({
  projectId: h.string().uuid("Invalid project ID"),
  name: h.string().min(1, "Name is required"),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), ul = h.object({
  id: h.string().uuid("Invalid faction ID"),
  name: h.string().min(1, "Name is required").optional(),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), dl = h.object({
  projectId: h.string().uuid("Invalid project ID"),
  term: h.string().min(1, "Term is required"),
  definition: h.string().optional(),
  category: h.string().optional(),
  firstAppearance: h.string().optional()
}), pl = h.object({
  id: h.string().uuid("Invalid term ID"),
  term: h.string().min(1, "Term is required").optional(),
  definition: h.string().optional(),
  category: h.string().optional(),
  firstAppearance: h.string().optional()
}), Ae = h.string().uuid("Invalid project ID"), Xe = h.string().uuid("Invalid chapter ID"), Na = h.string().uuid("Invalid character ID"), en = h.string().uuid("Invalid event ID"), tn = h.string().uuid("Invalid faction ID"), Pa = h.string().uuid("Invalid term ID"), rn = h.string().uuid("Invalid snapshot ID"), gl = h.tuple([
  Xe,
  h.string(),
  Ae
]);
h.object({
  characterId: Na,
  chapterId: Xe,
  position: h.number().int().nonnegative(),
  context: h.string().optional()
});
h.object({
  termId: Pa,
  chapterId: Xe,
  position: h.number().int().nonnegative(),
  context: h.string().optional()
});
const ml = h.object({
  projectId: Ae,
  chapterId: Xe.optional(),
  content: h.string(),
  description: h.string().optional(),
  type: h.enum(["AUTO", "MANUAL"]).optional()
}), _l = h.object({
  projectId: Ae,
  query: h.string().min(1, "Query is required"),
  type: h.enum(["all", "character", "term"]).optional()
}), wl = h.object({
  projectId: Ae,
  chapterId: Xe,
  title: h.string().min(1).max(Vi),
  content: wr.min(1),
  format: h.enum(["DOCX", "HWPX"]),
  paperSize: h.enum(["A4", "Letter", "B5"]).optional(),
  marginTop: h.number().nonnegative().max(100).optional(),
  marginBottom: h.number().nonnegative().max(100).optional(),
  marginLeft: h.number().nonnegative().max(100).optional(),
  marginRight: h.number().nonnegative().max(100).optional(),
  fontFamily: h.string().min(1).max(100).optional(),
  fontSize: h.number().positive().max(96).optional(),
  lineHeight: h.string().min(1).max(20).optional(),
  showPageNumbers: h.boolean().optional(),
  startPageNumber: h.number().int().min(1).max(1e5).optional()
}), vl = h.tuple([wl]), an = h.tuple([el.optional()]), El = h.tuple([
  h.string().min(1).max(Vi),
  Tt,
  wr
]), yl = h.tuple([Tt]), bl = h.tuple([
  Tt,
  h.string().min(1).max(Wa)
]), Tl = h.tuple([Tt, wr]), Sl = h.tuple([Tt, h.unknown()]), Al = h.tuple([
  Tt,
  h.string().min(1).max(Wa),
  wr
]), Il = h.tuple([Tt]), Rl = h.tuple([h.boolean()]), xl = h.tuple([Xe]), Dl = h.tuple([
  h.object({
    chapterId: Xe,
    projectId: Ae
  })
]), Cl = h.tuple([
  h.object({
    dryRun: h.boolean().optional()
  }).optional()
]), Nl = h.object({
  busy: h.number(),
  log: h.number(),
  checkpointed: h.number()
});
h.object({
  success: h.boolean(),
  message: h.string(),
  backupDir: h.string().optional(),
  checkpoint: h.array(Nl).optional(),
  integrity: h.array(h.string()).optional()
});
h.object({
  isReady: h.boolean(),
  error: h.string().optional()
});
const Ki = h.enum([
  "osPermission",
  "dataDirRW",
  "defaultLuiePath",
  "sqliteConnect",
  "sqliteWal",
  "supabaseRuntimeConfig",
  "supabaseSession"
]), Pl = h.object({
  key: Ki,
  ok: h.boolean(),
  blocking: h.boolean(),
  detail: h.string().optional(),
  checkedAt: h.string()
});
h.object({
  mustRunWizard: h.boolean(),
  checks: h.array(Pl),
  reasons: h.array(Ki),
  completedAt: h.string().optional()
});
const Xi = h.object({
  chapters: h.number().int().nonnegative(),
  memos: h.number().int().nonnegative(),
  total: h.number().int().nonnegative(),
  items: h.array(
    h.object({
      type: h.enum(["chapter", "memo"]),
      id: h.string().min(1),
      projectId: h.string().min(1),
      title: h.string(),
      localUpdatedAt: h.string(),
      remoteUpdatedAt: h.string(),
      localPreview: h.string(),
      remotePreview: h.string()
    })
  ).optional()
});
h.object({
  connected: h.boolean(),
  provider: h.enum(["google"]).optional(),
  email: h.string().email().optional(),
  userId: h.string().uuid().optional(),
  expiresAt: h.string().optional(),
  autoSync: h.boolean(),
  lastSyncedAt: h.string().optional(),
  lastError: h.string().optional(),
  mode: h.enum(["idle", "connecting", "syncing", "error"]),
  health: h.enum(["connected", "degraded", "disconnected"]),
  degradedReason: h.string().optional(),
  inFlight: h.boolean(),
  queued: h.boolean(),
  conflicts: Xi,
  projectLastSyncedAtByProjectId: h.record(h.string(), h.string()).optional(),
  projectStateById: h.record(
    h.string(),
    h.object({
      state: h.enum(["synced", "pending", "error"]),
      lastSyncedAt: h.string().optional(),
      reason: h.string().optional()
    })
  ).optional(),
  lastRun: h.object({
    at: h.string(),
    pulled: h.number().int().nonnegative(),
    pushed: h.number().int().nonnegative(),
    conflicts: h.number().int().nonnegative(),
    success: h.boolean(),
    message: h.string()
  }).optional()
});
h.object({
  success: h.boolean(),
  message: h.string(),
  pulled: h.number().int().nonnegative(),
  pushed: h.number().int().nonnegative(),
  conflicts: Xi,
  syncedAt: h.string().optional()
});
const kl = h.object({
  enabled: h.boolean()
}), Ol = h.tuple([kl]), Ji = h.object({
  url: h.string().min(1).max(1024).refine((r) => {
    try {
      const e = new URL(r);
      return e.protocol === "http:" || e.protocol === "https:";
    } catch {
      return !1;
    }
  }, "Supabase URL must be a valid http(s) URL"),
  anonKey: h.string().min(16).max(8096)
}), Ll = h.object({
  url: h.string().max(1024).optional(),
  anonKey: h.string().max(8096).optional()
});
h.object({
  url: h.string().nullable(),
  hasAnonKey: h.boolean(),
  source: h.enum(["env", "runtime", "legacy"]).optional()
});
h.object({
  valid: h.boolean(),
  issues: h.array(h.string()),
  normalized: Ji.optional()
});
const Fl = h.tuple([Ji]), Ml = h.tuple([Ll]), Ul = h.object({
  type: h.enum(["chapter", "memo"]),
  id: h.string().min(1),
  resolution: h.enum(["local", "remote"])
}), Wl = h.tuple([Ul]), jl = h.object({
  fontFamily: h.enum(["serif", "sans", "mono"]),
  fontPreset: h.enum([
    "inter",
    "lora",
    "bitter",
    "source-serif",
    "montserrat",
    "nunito-sans",
    "victor-mono"
  ]).optional(),
  fontSize: h.number().int().positive(),
  lineHeight: h.number().positive(),
  maxWidth: h.number().int().positive(),
  theme: h.enum(["light", "dark", "sepia"]),
  themeTemp: h.enum(["neutral", "warm", "cool"]).optional().default("neutral"),
  themeContrast: h.enum(["soft", "high"]).optional().default("soft"),
  themeAccent: h.enum(["blue", "violet", "green", "amber", "rose", "slate"]).optional().default("blue"),
  themeTexture: h.boolean().optional().default(!0),
  uiMode: h.enum(["default", "docs", "editor", "word", "scrivener"]).transform((r) => r === "word" ? "editor" : r).pipe(h.enum(["default", "docs", "editor", "scrivener"])).catch("default")
}), Bl = h.object({
  enabled: h.boolean().optional(),
  interval: h.number().int().positive().optional()
}), Hl = h.object({
  language: h.enum(["ko", "en", "ja"])
}), zl = h.object({
  mode: h.enum(["hidden", "visible"])
}), Gl = h.object({
  shortcuts: h.record(h.string(), h.string())
}), ql = h.object({
  width: h.number().int().positive(),
  height: h.number().int().positive(),
  x: h.number().int(),
  y: h.number().int()
}), Qi = h.enum(["Place", "Concept", "Rule", "Item"]), ka = h.enum([
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity"
]), eo = h.enum([
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates"
]), mr = h.string().uuid("Invalid world entity ID"), to = h.string().uuid("Invalid entity relation ID"), Yl = h.object({
  projectId: Ae,
  type: Qi,
  name: h.string().min(1, "Name is required"),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional(),
  positionX: h.number().optional(),
  positionY: h.number().optional()
}), Zl = h.object({
  id: mr,
  type: Qi.optional(),
  name: h.string().min(1, "Name is required").optional(),
  description: h.string().optional(),
  firstAppearance: h.string().optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), $l = h.object({
  id: mr,
  positionX: h.number(),
  positionY: h.number()
}), Vl = h.object({
  projectId: Ae,
  sourceId: h.string().uuid("Invalid source ID"),
  sourceType: ka,
  targetId: h.string().uuid("Invalid target ID"),
  targetType: ka,
  relation: eo,
  attributes: h.record(h.string(), h.unknown()).optional()
}).superRefine((r, e) => {
  Po(r.relation, r.sourceType, r.targetType);
}), Kl = h.object({
  id: to,
  relation: eo.optional(),
  attributes: h.record(h.string(), h.unknown()).optional()
}), Xl = h.object({
  projectId: Ae,
  entityId: h.string().uuid("Invalid entity ID"),
  entityType: ka,
  limit: h.number().int().positive().max(500).optional()
});
function Jl(r, e) {
  Ce(r, [
    {
      channel: U.CHAPTER_CREATE,
      logTag: "CHAPTER_CREATE",
      failMessage: "Failed to create chapter",
      argsSchema: h.tuple([il]),
      handler: (t) => e.createChapter(t)
    },
    {
      channel: U.CHAPTER_GET,
      logTag: "CHAPTER_GET",
      failMessage: "Failed to get chapter",
      argsSchema: h.tuple([Xe]),
      handler: (t) => e.getChapter(t)
    },
    {
      channel: U.CHAPTER_GET_ALL,
      logTag: "CHAPTER_GET_ALL",
      failMessage: "Failed to get all chapters",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllChapters(t)
    },
    {
      channel: U.CHAPTER_GET_DELETED,
      logTag: "CHAPTER_GET_DELETED",
      failMessage: "Failed to get deleted chapters",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getDeletedChapters(t)
    },
    {
      channel: U.CHAPTER_UPDATE,
      logTag: "CHAPTER_UPDATE",
      failMessage: "Failed to update chapter",
      argsSchema: h.tuple([ol]),
      handler: (t) => e.updateChapter(t)
    },
    {
      channel: U.CHAPTER_DELETE,
      logTag: "CHAPTER_DELETE",
      failMessage: "Failed to delete chapter",
      argsSchema: h.tuple([Xe]),
      handler: (t) => e.deleteChapter(t)
    },
    {
      channel: U.CHAPTER_RESTORE,
      logTag: "CHAPTER_RESTORE",
      failMessage: "Failed to restore chapter",
      argsSchema: h.tuple([Xe]),
      handler: (t) => e.restoreChapter(t)
    },
    {
      channel: U.CHAPTER_PURGE,
      logTag: "CHAPTER_PURGE",
      failMessage: "Failed to purge chapter",
      argsSchema: h.tuple([Xe]),
      handler: (t) => e.purgeChapter(t)
    },
    {
      channel: U.CHAPTER_REORDER,
      logTag: "CHAPTER_REORDER",
      failMessage: "Failed to reorder chapters",
      argsSchema: h.tuple([Ae, h.array(Xe)]),
      handler: (t, n) => e.reorderChapters(t, n)
    }
  ]);
}
function Ql(r, e) {
  Ce(r, [
    {
      channel: U.PROJECT_CREATE,
      logTag: "PROJECT_CREATE",
      failMessage: "Failed to create project",
      argsSchema: h.tuple([tl]),
      handler: (t) => e.createProject(t)
    },
    {
      channel: U.PROJECT_OPEN_LUIE,
      logTag: "PROJECT_OPEN_LUIE",
      failMessage: "Failed to open .luie package",
      argsSchema: h.tuple([h.string()]),
      handler: (t) => e.openLuieProject(t)
    },
    {
      channel: U.PROJECT_GET,
      logTag: "PROJECT_GET",
      failMessage: "Failed to get project",
      argsSchema: h.tuple([Ae]),
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
      argsSchema: h.tuple([rl]),
      handler: (t) => e.updateProject(t)
    },
    {
      channel: U.PROJECT_DELETE,
      logTag: "PROJECT_DELETE",
      failMessage: "Failed to delete project",
      argsSchema: h.tuple([nl]),
      handler: (t) => e.deleteProject(t)
    },
    {
      channel: U.PROJECT_REMOVE_LOCAL,
      logTag: "PROJECT_REMOVE_LOCAL",
      failMessage: "Failed to remove project from list",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.removeProjectFromList(t)
    }
  ]);
}
function eh(r) {
  Ql(r.logger, r.projectService), Jl(r.logger, r.chapterService);
}
function th(r, e) {
  Ce(r, [
    {
      channel: U.SEARCH,
      logTag: "SEARCH",
      failMessage: "Failed to search",
      argsSchema: h.tuple([_l]),
      handler: (t) => e.search(t)
    }
  ]);
}
function rh(r) {
  th(r.logger, r.searchService);
}
const ro = async (r, e = r) => {
  const t = [], n = await Re.readdir(r, { withFileTypes: !0 });
  for (const s of n) {
    const i = `${r}${Pe.sep}${s.name}`, o = Ht(Pe.relative(e, i));
    if (!(!o || !gr(o)) && !s.isSymbolicLink()) {
      if (s.isDirectory()) {
        t.push({ name: `${o}/`, isDirectory: !0 }), t.push(...await ro(i, e));
        continue;
      }
      s.isFile() && t.push({ name: o, fromFilePath: i });
    }
  }
  return t;
}, nn = async (r, e, t) => {
  const n = `${r}.dir-legacy-${Date.now()}`;
  await Re.rename(r, n);
  const s = `${e}${fr}-${Date.now()}`;
  try {
    const i = await ro(n), o = i.some(
      (p) => Ht(p.name) === Zt
    ), u = (/* @__PURE__ */ new Date()).toISOString();
    let f = {};
    if (o)
      try {
        const p = await Re.readFile(
          Pe.join(n, Zt),
          "utf-8"
        );
        f = Bi(p) ?? {};
      } catch {
        f = {};
      }
    const T = xa(f, {
      titleFallback: Pe.basename(e, ot),
      nowIso: u,
      createdAtFallback: u
    }), v = i.filter(
      (p) => Ht(p.name) !== Zt
    );
    return v.push(Hi(T)), await Ma(s, (p) => zi(p, v)), await ur(s, t), await dr(s, e, t), n;
  } catch (i) {
    t.error("Failed to migrate legacy directory package", {
      legacyDir: r,
      targetZip: e,
      backupPath: n,
      error: i
    });
    try {
      await Re.rm(s, { force: !0 });
    } catch {
    }
    try {
      if (await Gi(r)) {
        const o = `${r}.migration-failed-${Date.now()}`;
        await Re.rename(r, o), t.info?.("Moved partial migration output before restore", {
          legacyDir: r,
          collidedPath: o
        });
      }
      await Re.rename(n, r), t.info?.("Restored legacy directory package after migration failure", {
        legacyDir: r,
        backupPath: n
      });
    } catch (o) {
      t.error("Failed to restore legacy directory package", {
        legacyDir: r,
        backupPath: n,
        restoreError: o
      });
    }
    throw i;
  }
}, on = async (r, e, t, n, s) => {
  const i = Ht(t);
  if (!i || !gr(i))
    throw new Error("INVALID_RELATIVE_PATH");
  await Ma(e, async (o) => {
    await new Promise((u, f) => {
      cs.open(r, { lazyEntries: !0 }, (T, v) => {
        if (T || !v) {
          f(T ?? new Error("FAILED_TO_OPEN_ZIP"));
          return;
        }
        const p = (l) => {
          const g = Ht(l.fileName);
          if (!g || !gr(g)) {
            s.error("Unsafe zip entry skipped", { entry: l.fileName, sourceZip: r }), v.readEntry();
            return;
          }
          if (g === i) {
            v.readEntry();
            return;
          }
          if (l.fileName.endsWith("/")) {
            o.addEmptyDirectory(g.endsWith("/") ? g : `${g}/`), v.readEntry();
            return;
          }
          v.openReadStream(l, (E, S) => {
            if (E || !S) {
              f(E ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
              return;
            }
            o.addReadStream(S, g), S.on("end", () => v.readEntry()), S.on("error", f);
          });
        };
        v.on("entry", p), v.on("error", f), v.on("end", u), v.readEntry();
      });
    }), o.addBuffer(Buffer.from(n, "utf-8"), i);
  });
}, sn = 720 * 60 * 1e3, ln = 128, hn = 16 * 1024 * 1024, cn = /* @__PURE__ */ new Set([
  Wi,
  ".txt"
]), wt = /* @__PURE__ */ new Map(), fn = (r) => process.platform === "win32" ? r.toLowerCase() : r, ah = (r, e) => {
  const t = fn(Pe.resolve(r)), n = fn(Pe.resolve(e));
  return t === n || t.startsWith(`${n}${Pe.sep}`);
}, nh = () => {
  const r = Date.now();
  for (const [e, t] of wt.entries())
    t.expiresAt <= r && wt.delete(e);
}, ih = () => {
  if (wt.size <= ln) return;
  const r = Array.from(wt.entries()).sort(
    (t, n) => t[1].lastAccessedAt - n[1].lastAccessedAt
  ), e = wt.size - ln;
  for (const [t] of r.slice(0, e))
    wt.delete(t);
}, oh = (r, e) => {
  const t = Pe.resolve(r), n = wt.get(t), s = Date.now();
  if (n) {
    e.forEach((i) => n.permissions.add(i)), n.expiresAt = s + sn, n.lastAccessedAt = s;
    return;
  }
  wt.set(t, {
    permissions: new Set(e),
    expiresAt: s + sn,
    lastAccessedAt: s
  }), ih();
}, ao = async (r, e) => {
  const t = Pe.resolve(r);
  if (e === "read")
    try {
      return await Re.realpath(t);
    } catch (s) {
      if (s?.code === "ENOENT")
        return t;
      throw s;
    }
  let n = t;
  for (; ; )
    try {
      await Re.access(n);
      const s = await Re.realpath(n);
      if (n === t)
        return s;
      const i = Pe.relative(n, t);
      return Pe.resolve(s, i);
    } catch (s) {
      if (s?.code === "ENOENT") {
        const o = Pe.dirname(n);
        if (o === n)
          return t;
        n = o;
        continue;
      }
      throw s;
    }
}, Mt = async (r, e, t = "file") => {
  const n = _r(r, "path"), s = t === "directory" ? n : Pe.dirname(n), i = await ao(s, "write");
  oh(i, e);
}, sh = async (r) => {
  const e = _r(r, "projectPath");
  if (e.toLowerCase().endsWith(ot))
    return Da(e);
  const t = Da(e);
  if (t === e)
    return e;
  try {
    return await Re.access(t), t;
  } catch {
    return e;
  }
}, Ut = async (r, e) => {
  const t = _r(r, e.fieldName), n = await ao(t, e.mode);
  nh();
  for (const [s, i] of wt.entries())
    if (i.permissions.has(e.permission) && ah(n, s))
      return i.lastAccessedAt = Date.now(), t;
  throw new pe(
    he.FS_PERMISSION_DENIED,
    `${e.fieldName} is outside approved roots`,
    {
      fieldName: e.fieldName,
      path: t,
      permission: e.permission
    }
  );
}, un = (r, e) => {
  if (!r.toLowerCase().endsWith(ot))
    throw new pe(
      he.INVALID_INPUT,
      `${e} must point to a ${ot} package`,
      { fieldName: e, packagePath: r }
    );
}, lh = (r) => {
  const e = Pe.extname(r).toLowerCase();
  if (e === ot)
    throw new pe(
      he.INVALID_INPUT,
      "Direct .luie writes are blocked. Use fs.createLuiePackage or fs.writeProjectFile.",
      { filePath: r, extension: e }
    );
  if (!cn.has(e))
    throw new pe(
      he.INVALID_INPUT,
      "Unsupported file extension for fs.writeFile",
      { filePath: r, extension: e, allowed: Array.from(cn) }
    );
}, Ir = (r) => r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0], hh = (r) => r.canceled || !r.filePath ? null : r.filePath;
function ch(r) {
  Ce(r, [
    {
      channel: U.FS_APPROVE_PROJECT_PATH,
      logTag: "FS_APPROVE_PROJECT_PATH",
      failMessage: "Failed to approve project path",
      argsSchema: Il,
      handler: async (e) => {
        const t = await sh(e), n = t.toLowerCase().endsWith(ot);
        return await Mt(
          t,
          n ? ["read", "package"] : ["read"],
          "file"
        ), {
          approved: !0,
          normalizedPath: t
        };
      }
    },
    {
      channel: U.FS_SELECT_DIRECTORY,
      logTag: "FS_SELECT_DIRECTORY",
      failMessage: "Failed to select directory",
      handler: async () => {
        const e = await Yt.showOpenDialog({
          properties: ["openDirectory", "createDirectory"]
        }), t = Ir(e);
        return t ? (await Mt(t, ["read", "write", "package"], "directory"), t) : null;
      }
    },
    {
      channel: U.FS_SELECT_SAVE_LOCATION,
      logTag: "FS_SELECT_SAVE_LOCATION",
      failMessage: "Failed to select save location",
      argsSchema: an,
      handler: async (e) => {
        const t = await Yt.showSaveDialog({
          title: e?.title,
          defaultPath: e?.defaultPath,
          filters: e?.filters ?? [
            { name: Oo, extensions: [ko] }
          ]
        }), n = hh(t);
        if (!n) return null;
        const i = n.toLowerCase().endsWith(ot) ? ["read", "write", "package"] : ["read", "write"];
        return await Mt(n, i, "file"), n;
      }
    },
    {
      channel: U.FS_SELECT_FILE,
      logTag: "FS_SELECT_FILE",
      failMessage: "Failed to select file",
      argsSchema: an,
      handler: async (e) => {
        const t = await Yt.showOpenDialog({
          title: e?.title,
          defaultPath: e?.defaultPath,
          filters: e?.filters,
          properties: ["openFile"]
        }), n = Ir(t);
        if (!n) return null;
        const i = n.toLowerCase().endsWith(ot) ? ["read", "package"] : ["read"];
        return await Mt(n, i, "file"), n;
      }
    },
    {
      channel: U.FS_SELECT_SNAPSHOT_BACKUP,
      logTag: "FS_SELECT_SNAPSHOT_BACKUP",
      failMessage: "Failed to select snapshot backup",
      handler: async () => {
        const e = Pe.join(qe.getPath("userData"), ji), t = await Yt.showOpenDialog({
          title: "스냅샷 복원하기",
          defaultPath: e,
          filters: [{ name: "Snapshot", extensions: ["snap"] }],
          properties: ["openFile"]
        }), n = Ir(t);
        return n ? (await Mt(n, ["read"], "file"), n) : null;
      }
    },
    {
      channel: U.FS_SAVE_PROJECT,
      logTag: "FS_SAVE_PROJECT",
      failMessage: "Failed to save project",
      argsSchema: El,
      handler: async (e, t, n) => {
        const s = Lo(e), i = await Ut(t, {
          fieldName: "projectPath",
          mode: "write",
          permission: "write"
        }), o = Pe.join(
          i,
          s || qa
        );
        await Re.mkdir(o, { recursive: !0 });
        const u = Pe.join(
          o,
          `${s || Fo}${ot}`
        ), f = Bi(n.trim()), T = s || qa, v = (/* @__PURE__ */ new Date()).toISOString(), p = xa(f ?? {}, {
          titleFallback: T,
          nowIso: v,
          createdAtFallback: v
        }), l = !f && n.trim().length > 0;
        return await Mo(
          u,
          {
            meta: p,
            chapters: l ? [
              {
                id: "legacy-import",
                content: n
              }
            ] : [],
            characters: [],
            terms: [],
            snapshots: []
          },
          r
        ), l && await br(u, async () => {
          const g = `${u}${fr}-${Date.now()}`;
          await on(
            u,
            g,
            $o,
            `# Imported Legacy Content

Legacy project content was migrated into this package.`,
            r
          ), await ur(g, r), await dr(g, u, r);
        }), { path: u, projectDir: o };
      }
    },
    {
      channel: U.FS_READ_FILE,
      logTag: "FS_READ_FILE",
      failMessage: "Failed to read file",
      argsSchema: yl,
      handler: async (e) => {
        const t = await Ut(e, {
          fieldName: "filePath",
          mode: "read",
          permission: "read"
        }), n = await Re.stat(t);
        if (n.isDirectory())
          return null;
        if (n.size > hn)
          throw new pe(
            he.INVALID_INPUT,
            "File is too large to read through IPC",
            {
              filePath: t,
              size: n.size,
              maxSize: hn
            }
          );
        return await Re.readFile(t, "utf-8");
      }
    },
    {
      channel: U.FS_READ_LUIE_ENTRY,
      logTag: "FS_READ_LUIE_ENTRY",
      failMessage: "Failed to read Luie package entry",
      argsSchema: bl,
      handler: async (e, t) => {
        const n = await Ut(e, {
          fieldName: "packagePath",
          mode: "read",
          permission: "package"
        });
        return un(n, "packagePath"), Ra(
          n,
          t,
          r
        );
      }
    },
    {
      channel: U.FS_WRITE_FILE,
      logTag: "FS_WRITE_FILE",
      failMessage: "Failed to write file",
      argsSchema: Tl,
      handler: async (e, t) => {
        const n = await Ut(e, {
          fieldName: "filePath",
          mode: "write",
          permission: "write"
        });
        lh(n);
        const s = Pe.dirname(n);
        return await Re.mkdir(s, { recursive: !0 }), await Re.writeFile(n, t, "utf-8"), { path: n };
      }
    },
    {
      channel: U.FS_CREATE_LUIE_PACKAGE,
      logTag: "FS_CREATE_LUIE_PACKAGE",
      failMessage: "Failed to create Luie package",
      argsSchema: Sl,
      handler: async (e, t) => {
        const n = await Ut(e, {
          fieldName: "packagePath",
          mode: "write",
          permission: "package"
        }), s = Da(n), i = (/* @__PURE__ */ new Date()).toISOString(), o = xa(t, {
          titleFallback: Pe.basename(s, ot),
          nowIso: i,
          createdAtFallback: i
        });
        return await br(s, async () => {
          await Uo(s);
          const u = `${s}${fr}-${Date.now()}`;
          let f = null;
          try {
            const T = await Re.stat(s);
            if (T.isDirectory())
              await nn(s, s, r);
            else if (T.isFile()) {
              const v = `${s}.legacy-${Date.now()}`;
              await Re.rename(s, v), f = v;
            }
          } catch (T) {
            if (T?.code !== "ENOENT") throw T;
          }
          try {
            await Ma(
              u,
              (T) => zi(T, [
                ...Zo(),
                Hi(o),
                {
                  name: `${Et}/${Wo}`,
                  content: JSON.stringify({ characters: [] }, null, 2)
                },
                {
                  name: `${Et}/${jo}`,
                  content: JSON.stringify({ terms: [] }, null, 2)
                },
                {
                  name: `${Et}/${Bo}`,
                  content: JSON.stringify({ synopsis: "", status: "draft" }, null, 2)
                },
                {
                  name: `${Et}/${Ho}`,
                  content: JSON.stringify({ columns: [] }, null, 2)
                },
                {
                  name: `${Et}/${zo}`,
                  content: JSON.stringify({ paths: [] }, null, 2)
                },
                {
                  name: `${Et}/${Go}`,
                  content: JSON.stringify({ nodes: [], edges: [] }, null, 2)
                },
                {
                  name: `${Et}/${qo}`,
                  content: JSON.stringify({ memos: [] }, null, 2)
                },
                {
                  name: `${Et}/${Yo}`,
                  content: JSON.stringify({ nodes: [], edges: [] }, null, 2)
                }
              ])
            ), await ur(u, r), await dr(u, s, r);
          } catch (T) {
            try {
              await Re.rm(u, { force: !0 });
            } catch {
            }
            if (f)
              try {
                if (await Gi(s)) {
                  const v = `${s}.create-failed-${Date.now()}`;
                  await Re.rename(s, v), r.info("Moved failed create output before restore", {
                    targetPath: s,
                    collidedPath: v
                  });
                }
                await Re.rename(f, s), r.info("Restored existing .luie package after create failure", {
                  targetPath: s,
                  backupPath: f
                });
              } catch (v) {
                r.error("Failed to restore existing .luie package after create failure", {
                  targetPath: s,
                  backupPath: f,
                  restoreError: v
                });
              }
            throw T;
          }
        }), await Mt(s, ["read", "write", "package"], "file"), { path: s };
      }
    },
    {
      channel: U.FS_WRITE_PROJECT_FILE,
      logTag: "FS_WRITE_PROJECT_FILE",
      failMessage: "Failed to write project file",
      argsSchema: Al,
      handler: async (e, t, n) => {
        const s = Ht(t);
        if (!s || !gr(s))
          throw new Error("INVALID_RELATIVE_PATH");
        const i = await Ut(e, {
          fieldName: "projectRoot",
          mode: "write",
          permission: "package"
        });
        return un(i, "projectRoot"), await br(i, async () => {
          try {
            (await Re.stat(i)).isDirectory() && await nn(
              i,
              i,
              r
            );
          } catch (u) {
            throw u?.code === "ENOENT" ? new pe(
              he.FS_WRITE_FAILED,
              "Project package does not exist. Create the .luie package first.",
              {
                projectRoot: i,
                relativePath: s
              }
            ) : u;
          }
          const o = `${i}${fr}-${Date.now()}`;
          await on(
            i,
            o,
            s,
            n,
            r
          ), await ur(o, r), await dr(o, i, r);
        }), { path: `${i}:${s}` };
      }
    }
  ]);
}
const dn = (r, e) => {
  switch (e.level) {
    case "debug":
      r.debug(e.message, e.data || void 0);
      break;
    case "info":
      r.info(e.message, e.data || void 0);
      break;
    case "warn":
      r.warn(e.message, e.data || void 0);
      break;
    case "error":
      r.error(e.message, e.data || void 0);
      break;
    default:
      r.info(e.message, e.data || void 0);
  }
};
function fh(r) {
  Ce(r, [
    {
      channel: U.LOGGER_LOG,
      logTag: "LOGGER_LOG",
      failMessage: "Failed to log",
      handler: async ({ level: e, message: t, data: n }) => {
        const { createLogger: s } = await import("./index.js").then((o) => o.ao), i = s("IPCLogger");
        return dn(i, { level: e, message: t, data: n }), { success: !0 };
      }
    },
    {
      channel: U.LOGGER_LOG_BATCH,
      logTag: "LOGGER_LOG_BATCH",
      failMessage: "Failed to log batch",
      handler: async (e) => {
        const { createLogger: t } = await import("./index.js").then((s) => s.ao), n = t("IPCLogger");
        for (const s of e)
          dn(n, s);
        return { success: !0 };
      }
    }
  ]);
}
function uh(r) {
  Ce(r, [
    {
      channel: U.RECOVERY_DB_RUN,
      logTag: "RECOVERY_DB_RUN",
      failMessage: "Failed to run DB recovery",
      argsSchema: Cl,
      handler: async (e) => (r.info("RECOVERY_DB_RUN", { options: e }), Ys.recoverFromWal(e))
    }
  ]);
}
const Ze = /* @__PURE__ */ (() => {
  let r = null;
  return async () => (r || (r = import("./index.js").then((t) => t.ap)), (await r).settingsManager);
})();
function dh(r) {
  Ce(r, [
    {
      channel: U.SETTINGS_GET_ALL,
      logTag: "SETTINGS_GET_ALL",
      failMessage: "Failed to get settings",
      handler: async () => (await Ze()).getAllForRenderer()
    },
    {
      channel: U.SETTINGS_GET_EDITOR,
      logTag: "SETTINGS_GET_EDITOR",
      failMessage: "Failed to get editor settings",
      handler: async () => (await Ze()).getEditorSettings()
    },
    {
      channel: U.SETTINGS_SET_EDITOR,
      logTag: "SETTINGS_SET_EDITOR",
      failMessage: "Failed to set editor settings",
      argsSchema: h.tuple([jl]),
      handler: async (e) => {
        const t = await Ze();
        return t.setEditorSettings(e), t.getEditorSettings();
      }
    },
    {
      channel: U.SETTINGS_GET_AUTO_SAVE,
      logTag: "SETTINGS_GET_AUTO_SAVE",
      failMessage: "Failed to get auto save settings",
      handler: async () => {
        const e = await Ze();
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
      handler: async () => ({ language: (await Ze()).getLanguage() ?? "ko" })
    },
    {
      channel: U.SETTINGS_SET_LANGUAGE,
      logTag: "SETTINGS_SET_LANGUAGE",
      failMessage: "Failed to set language setting",
      argsSchema: h.tuple([Hl]),
      handler: async (e) => {
        const t = await Ze();
        return t.setLanguage(e.language), { language: t.getLanguage() ?? "ko" };
      }
    },
    {
      channel: U.SETTINGS_GET_MENU_BAR_MODE,
      logTag: "SETTINGS_GET_MENU_BAR_MODE",
      failMessage: "Failed to get menu bar mode",
      handler: async () => ({ mode: (await Ze()).getMenuBarMode() })
    },
    {
      channel: U.SETTINGS_SET_MENU_BAR_MODE,
      logTag: "SETTINGS_SET_MENU_BAR_MODE",
      failMessage: "Failed to set menu bar mode",
      argsSchema: h.tuple([zl]),
      handler: async (e) => {
        const t = await Ze();
        t.setMenuBarMode(e.mode), Vo(e.mode);
        const { windowManager: n } = await import("./index.js").then((s) => s.aq);
        return n.applyMenuBarModeToAllWindows(), { mode: t.getMenuBarMode() };
      }
    },
    {
      channel: U.SETTINGS_GET_SHORTCUTS,
      logTag: "SETTINGS_GET_SHORTCUTS",
      failMessage: "Failed to get shortcuts",
      handler: async () => (await Ze()).getShortcuts()
    },
    {
      channel: U.SETTINGS_SET_SHORTCUTS,
      logTag: "SETTINGS_SET_SHORTCUTS",
      failMessage: "Failed to set shortcuts",
      argsSchema: h.tuple([Gl]),
      handler: async (e) => {
        const t = await Ze(), n = t.setShortcuts(e.shortcuts), s = t.getShortcuts().defaults;
        return { shortcuts: n, defaults: s };
      }
    },
    {
      channel: U.SETTINGS_SET_AUTO_SAVE,
      logTag: "SETTINGS_SET_AUTO_SAVE",
      failMessage: "Failed to set auto save settings",
      argsSchema: h.tuple([Bl]),
      handler: async (e) => {
        const t = await Ze();
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
      argsSchema: h.tuple([ql]),
      handler: async (e) => ((await Ze()).setWindowBounds(e), e)
    },
    {
      channel: U.SETTINGS_GET_WINDOW_BOUNDS,
      logTag: "SETTINGS_GET_WINDOW_BOUNDS",
      failMessage: "Failed to get window bounds",
      handler: async () => (await Ze()).getWindowBounds()
    },
    {
      channel: U.SETTINGS_RESET,
      logTag: "SETTINGS_RESET",
      failMessage: "Failed to reset settings",
      handler: async () => {
        const e = await Ze();
        return e.resetToDefaults(), e.getAllForRenderer();
      }
    }
  ]);
}
function ph(r) {
  Ce(r, [
    {
      channel: U.STARTUP_GET_READINESS,
      logTag: "STARTUP_GET_READINESS",
      failMessage: "Failed to fetch startup readiness",
      handler: async () => Ya.getReadiness()
    },
    {
      channel: U.STARTUP_COMPLETE_WIZARD,
      logTag: "STARTUP_COMPLETE_WIZARD",
      failMessage: "Failed to complete startup wizard",
      handler: async () => Ya.completeWizard()
    }
  ]);
}
const pn = /* @__PURE__ */ (() => {
  let r = null;
  return async () => (r || (r = import("./index.js").then((e) => e.ap)), r);
})(), Rr = /* @__PURE__ */ (() => {
  let r = null;
  return async () => (r || (r = import("./index.js").then((e) => e.ar)), r);
})();
function gh(r) {
  Ce(r, [
    {
      channel: U.SYNC_GET_STATUS,
      logTag: "SYNC_GET_STATUS",
      failMessage: "Failed to get sync status",
      handler: async () => Lt.getStatus()
    },
    {
      channel: U.SYNC_CONNECT_GOOGLE,
      logTag: "SYNC_CONNECT_GOOGLE",
      failMessage: "Failed to start Google sync connect",
      handler: async () => Lt.connectGoogle()
    },
    {
      channel: U.SYNC_DISCONNECT,
      logTag: "SYNC_DISCONNECT",
      failMessage: "Failed to disconnect sync account",
      handler: async () => Lt.disconnect()
    },
    {
      channel: U.SYNC_RUN_NOW,
      logTag: "SYNC_RUN_NOW",
      failMessage: "Failed to run sync",
      handler: async () => Lt.runNow()
    },
    {
      channel: U.SYNC_SET_AUTO,
      logTag: "SYNC_SET_AUTO",
      failMessage: "Failed to update auto sync setting",
      argsSchema: Ol,
      handler: async (e) => Lt.setAutoSync(e.enabled)
    },
    {
      channel: U.SYNC_RESOLVE_CONFLICT,
      logTag: "SYNC_RESOLVE_CONFLICT",
      failMessage: "Failed to resolve sync conflict",
      argsSchema: Wl,
      handler: async (e) => Lt.resolveConflict(e)
    },
    {
      channel: U.SYNC_GET_RUNTIME_CONFIG,
      logTag: "SYNC_GET_RUNTIME_CONFIG",
      failMessage: "Failed to get runtime Supabase config",
      handler: async () => {
        const [{ settingsManager: e }, t] = await Promise.all([
          pn(),
          Rr()
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
      argsSchema: Fl,
      handler: async (e) => {
        const [{ settingsManager: t }, n] = await Promise.all([
          pn(),
          Rr()
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
      argsSchema: Ml,
      handler: async (e) => (await Rr()).validateRuntimeSupabaseConfig(e)
    }
  ]);
}
const ar = lt("AppUpdateService"), gn = 5e3, mh = 512 * 1024, mn = 1024 * 1024 * 1024, _h = "updates", wh = "pending.json", vh = "current.json", Eh = "rollback.json", yh = "https://api.github.com/repos/Loop0loop/Luie/releases/latest", bh = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, Th = /^(?:sha256:)?[a-fA-F0-9]{64}$/, Pt = (r) => {
  const e = r.trim();
  return bh.test(e) ? e.startsWith("v") ? e.slice(1) : e : null;
}, _n = (r) => {
  const e = Pt(r);
  if (!e) return null;
  const [t, n] = e.split("-", 2), [s, i, o] = t.split("."), u = Number(s), f = Number(i), T = Number(o);
  return [u, f, T].every((v) => Number.isInteger(v) && v >= 0) ? {
    major: u,
    minor: f,
    patch: T,
    prerelease: n ? n.split(".").filter((v) => v.length > 0) : []
  } : null;
}, Sh = (r, e) => {
  const t = /^\d+$/.test(r), n = /^\d+$/.test(e);
  if (t && n) {
    const s = Number(r), i = Number(e);
    return s === i ? 0 : s < i ? -1 : 1;
  }
  return t !== n ? t ? -1 : 1 : r === e ? 0 : r < e ? -1 : 1;
}, Ah = (r, e) => {
  const t = _n(r), n = _n(e);
  if (!t || !n) return r.localeCompare(e);
  if (t.major !== n.major) return t.major < n.major ? -1 : 1;
  if (t.minor !== n.minor) return t.minor < n.minor ? -1 : 1;
  if (t.patch !== n.patch) return t.patch < n.patch ? -1 : 1;
  const s = t.prerelease, i = n.prerelease;
  if (s.length === 0 && i.length === 0) return 0;
  if (s.length === 0) return 1;
  if (i.length === 0) return -1;
  const o = Math.max(s.length, i.length);
  for (let u = 0; u < o; u += 1) {
    const f = s[u], T = i[u];
    if (f === void 0) return -1;
    if (T === void 0) return 1;
    const v = Sh(f, T);
    if (v !== 0) return v;
  }
  return 0;
}, Oa = (r) => {
  const e = r.trim();
  return Th.test(e) ? e.toLowerCase().replace(/^sha256:/, "") : null;
}, Ih = () => process.platform === "win32" ? ["web-setup", ".exe", "portable"] : process.platform === "darwin" ? [".dmg", ".zip"] : [".appimage", ".deb", ".rpm"], wn = (r) => {
  const e = Ih(), t = process.arch.toLowerCase(), n = ["x64", "arm64", "ia32"].filter((o) => o !== t), s = r.name.toLowerCase();
  let i = 0;
  for (const o of e)
    s.includes(o) && (i += 40);
  return s.includes(t) && (i += 30), n.some((o) => s.includes(o)) || (i += 5), i;
}, no = (r) => r.length === 0 ? null : [...r].sort((e, t) => wn(t) - wn(e))[0] ?? null, La = (r, e) => {
  try {
    const t = new URL(r, e);
    return t.protocol !== "https:" ? null : t;
  } catch {
    return null;
  }
}, Rh = (r) => {
  if (r.hostname !== "api.github.com") return null;
  const e = r.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/releases\/latest\/?$/i);
  return e ? {
    owner: decodeURIComponent(e[1]),
    repo: decodeURIComponent(e[2])
  } : null;
}, xh = (r) => {
  const e = r.pathname.match(/\/releases\/tag\/([^/?#]+)$/i);
  return e ? Pt(decodeURIComponent(e[1])) : null;
}, xr = (r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), Dh = (r, e, t, n) => {
  const s = new RegExp(
    `/${xr(e)}/${xr(t)}/releases/download/${xr(n)}/([^"?#<]+)`,
    "gi"
  ), i = /* @__PURE__ */ new Set(), o = [];
  let u;
  for (; (u = s.exec(r)) !== null; ) {
    const f = u[0], T = decodeURIComponent(u[1]).trim();
    if (!T) continue;
    const v = f.replace(/&amp;/g, "&");
    i.has(v) || (i.add(v), o.push({
      name: T,
      url: `https://github.com${v}`
    }));
  }
  return o;
}, io = (r) => {
  if (typeof r == "string")
    return Pt(r);
  if (Array.isArray(r)) {
    for (const e of r) {
      const t = io(e);
      if (t) return t;
    }
    return null;
  }
  if (r && typeof r == "object") {
    const e = r, t = [
      e.version,
      e.latestVersion,
      e.tag_name,
      e.tagName,
      e.name
    ];
    for (const n of t) {
      if (typeof n != "string") continue;
      const s = Pt(n);
      if (s) return s;
    }
  }
  return null;
}, Ch = (r, e) => {
  if (!r || typeof r != "object" || Array.isArray(r))
    return null;
  const t = r, n = Pt(
    typeof t.version == "string" ? t.version : typeof t.latestVersion == "string" ? t.latestVersion : typeof t.tag_name == "string" ? t.tag_name : ""
  );
  if (!n) return null;
  const s = typeof t.url == "string" ? t.url : typeof t.downloadUrl == "string" ? t.downloadUrl : typeof t.assetUrl == "string" ? t.assetUrl : null, i = typeof t.sha256 == "string" ? t.sha256 : typeof t.checksum == "string" ? t.checksum : null;
  if (s) {
    let v;
    try {
      v = new URL(s, e);
    } catch {
      return null;
    }
    if (v.protocol !== "https:")
      return null;
    const p = typeof t.size == "number" && Number.isFinite(t.size) && t.size > 0 ? t.size : void 0, l = i ? Oa(i) ?? void 0 : void 0;
    return {
      version: n,
      url: v.toString(),
      sha256: l,
      size: p
    };
  }
  const o = t.assets;
  if (!Array.isArray(o))
    return null;
  const u = o.map((v) => {
    if (!v || typeof v != "object" || Array.isArray(v)) return null;
    const p = v, l = typeof p.name == "string" ? p.name : "", g = typeof p.browser_download_url == "string" ? p.browser_download_url : "";
    if (!l || !g) return null;
    const E = typeof p.digest == "string" ? p.digest : typeof p.sha256 == "string" ? p.sha256 : typeof p.checksum == "string" ? p.checksum : void 0, S = E ? Oa(E) ?? void 0 : void 0, R = typeof p.size == "number" && Number.isFinite(p.size) && p.size > 0 ? p.size : void 0;
    return {
      name: l,
      url: g,
      size: R,
      sha256: S
    };
  }).filter((v) => !!v);
  if (u.length === 0)
    return null;
  const f = no(u);
  if (!f) return null;
  const T = La(f.url, e);
  return T ? {
    version: n,
    url: T.toString(),
    sha256: f.sha256,
    size: f.size
  } : null;
}, Nh = (r) => {
  const e = r.match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return e ? Pt(e[0]) : null;
}, Ph = (r) => {
  if (!r || typeof r != "object" || Array.isArray(r)) return !1;
  const e = r;
  return typeof e.version == "string" && e.version.length > 0 && typeof e.filePath == "string" && e.filePath.length > 0 && typeof e.sha256 == "string" && !!Oa(e.sha256) && typeof e.size == "number" && Number.isFinite(e.size) && e.size >= 0 && typeof e.sourceUrl == "string" && e.sourceUrl.length > 0 && typeof e.downloadedAt == "string" && e.downloadedAt.length > 0;
}, Fa = (r) => {
  const e = {
    Accept: "application/json, text/plain;q=0.9",
    "User-Agent": `Luie-Updater/${qe.getVersion()}`
  };
  return r.hostname === "api.github.com" && (e.Accept = "application/vnd.github+json", e["X-GitHub-Api-Version"] = "2022-11-28"), e;
}, kh = async (r) => {
  const e = Rh(r);
  if (!e) return null;
  const t = new URL(
    `https://github.com/${encodeURIComponent(e.owner)}/${encodeURIComponent(e.repo)}/releases/latest`
  ), n = await fetch(t, {
    method: "GET",
    headers: Fa(t)
  });
  if (!n.ok)
    return null;
  const s = La(n.url, t);
  if (!s)
    return null;
  const i = s.pathname.split("/").pop();
  if (!i)
    return null;
  const o = decodeURIComponent(i), u = xh(s) ?? Pt(o);
  if (!u)
    return null;
  const f = new URL(
    `https://github.com/${encodeURIComponent(e.owner)}/${encodeURIComponent(e.repo)}/releases/expanded_assets/${encodeURIComponent(
      o
    )}`
  ), T = await fetch(f, {
    method: "GET",
    headers: Fa(f)
  });
  if (!T.ok)
    return {
      latestVersion: u,
      manifest: null
    };
  const v = await T.text(), p = Dh(v, e.owner, e.repo, o), l = no(p);
  if (!l)
    return {
      latestVersion: u,
      manifest: null
    };
  const g = La(l.url, f);
  return g ? {
    latestVersion: u,
    manifest: {
      version: u,
      url: g.toString(),
      size: l.size,
      sha256: l.sha256
    }
  } : {
    latestVersion: u,
    manifest: null
  };
}, Ve = async (r) => {
  try {
    return await Ge.access(r), !0;
  } catch {
    return !1;
  }
};
class Oh {
  state = {
    status: "idle",
    currentVersion: qe.getVersion(),
    rollbackAvailable: !1
  };
  cachedManifest = null;
  inFlightDownload = null;
  getUpdateDir() {
    return It.join(qe.getPath("userData"), _h);
  }
  getPendingMetaPath() {
    return It.join(this.getUpdateDir(), wh);
  }
  getCurrentMetaPath() {
    return It.join(this.getUpdateDir(), vh);
  }
  getRollbackMetaPath() {
    return It.join(this.getUpdateDir(), Eh);
  }
  broadcastState() {
    const t = Ca?.getAllWindows?.() ?? [];
    for (const n of t)
      if (!n.isDestroyed())
        try {
          n.webContents.send(U.APP_UPDATE_STATE_CHANGED, this.state);
        } catch (s) {
          ar.warn("Failed to broadcast update state", { error: s });
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
    const t = new AbortController(), n = setTimeout(() => t.abort(), gn);
    try {
      const s = await fetch(e, {
        method: "GET",
        headers: Fa(e),
        signal: t.signal
      });
      if (!s.ok) {
        if (s.status === 403 && e.hostname === "api.github.com") {
          const T = await kh(e);
          if (T)
            return T;
        }
        throw new Error(`UPDATE_FEED_HTTP_${s.status}`);
      }
      const i = await s.text();
      if (Buffer.byteLength(i, "utf8") > mh)
        throw new Error("UPDATE_FEED_PAYLOAD_TOO_LARGE");
      if ((s.headers.get("content-type") ?? "").includes("json") || i.trim().startsWith("{") || i.trim().startsWith("[")) {
        const T = JSON.parse(i), v = io(T);
        if (!v) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
        return {
          latestVersion: v,
          manifest: Ch(T, e)
        };
      }
      const f = Nh(i);
      if (!f) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
      return {
        latestVersion: f,
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
    const t = process.env.LUIE_UPDATE_FEED_URL?.trim() ?? yh;
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
      const s = await this.fetchFeed(n), i = Ah(e, s.latestVersion) < 0;
      return this.cachedManifest = i ? s.manifest : null, this.setState({
        status: i ? "available" : "idle",
        latestVersion: s.latestVersion,
        message: i ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        supported: !0,
        available: i,
        status: i ? "available" : "up-to-date",
        currentVersion: e,
        latestVersion: s.latestVersion,
        message: i ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE"
      };
    } catch (s) {
      const i = s instanceof Error ? s.message : String(s);
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
    if (!await Ve(e)) return null;
    try {
      const t = await Ge.readFile(e, "utf-8"), n = JSON.parse(t);
      return Ph(n) ? n : null;
    } catch {
      return null;
    }
  }
  async getState() {
    const e = await Ve(this.getRollbackMetaPath()), t = await this.readArtifactFromMeta(this.getPendingMetaPath()), n = await this.readArtifactFromMeta(this.getCurrentMetaPath()), s = t ?? n ?? this.state.artifact;
    return this.setState({
      rollbackAvailable: e,
      artifact: s ?? void 0,
      status: this.state.status === "checking" || this.state.status === "downloading" || this.state.status === "applying" ? this.state.status : s ? "downloaded" : this.state.status === "error" ? "error" : this.state.latestVersion ? "available" : "idle"
    }), this.state;
  }
  async computeFileSha256(e) {
    const t = await Ge.readFile(e);
    return $a("sha256").update(t).digest("hex");
  }
  async tryLaunchInstaller(e) {
    const t = e.toLowerCase();
    if (![".exe", ".msi", ".dmg", ".pkg", ".appimage", ".deb", ".rpm"].some((i) => t.endsWith(i)))
      return !1;
    const s = await ss.openPath(e);
    return s ? (ar.warn("Failed to launch downloaded update artifact", {
      filePath: e,
      launchError: s
    }), !1) : (setTimeout(() => {
      try {
        qe.quit();
      } catch (i) {
        ar.warn("Failed to quit app after launching installer", { error: i });
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
    } catch (l) {
      const g = l instanceof Error ? l.message : String(l);
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
    await Ge.mkdir(t, { recursive: !0 });
    const n = `luie-${e.version}-${Date.now()}.bin`, s = It.join(t, `${n}.part`), i = It.join(t, n), o = new AbortController(), u = setTimeout(() => o.abort(), gn * 4);
    let f = null;
    const T = await fetch(e.url, {
      method: "GET",
      signal: o.signal
    }).catch((l) => {
      throw new Error(`UPDATE_DOWNLOAD_REQUEST_FAILED:${String(l)}`);
    });
    if (!T.ok)
      throw clearTimeout(u), new Error(`UPDATE_DOWNLOAD_HTTP_${T.status}`);
    const v = T.headers.get("content-length"), p = v && Number.isFinite(Number(v)) ? Number(v) : void 0;
    if (p && p > mn)
      throw clearTimeout(u), new Error("UPDATE_DOWNLOAD_TOO_LARGE");
    if (!T.body)
      throw clearTimeout(u), new Error("UPDATE_DOWNLOAD_BODY_MISSING");
    try {
      const l = T.body.getReader(), g = $a("sha256");
      let E = 0;
      for (f = await Ge.open(s, "w"); ; ) {
        const { done: C, value: O } = await l.read();
        if (C) break;
        if (!O) continue;
        const j = Buffer.from(O);
        if (E += j.length, E > mn)
          throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
        g.update(j), await f.write(j);
      }
      if (await f.close(), f = null, clearTimeout(u), e.size && e.size !== E)
        throw new Error(`UPDATE_DOWNLOAD_SIZE_MISMATCH:${e.size}:${E}`);
      const S = g.digest("hex");
      if (e.sha256 && S !== e.sha256)
        throw new Error("UPDATE_DOWNLOAD_HASH_MISMATCH");
      await Ge.rename(s, i);
      const R = {
        version: e.version,
        filePath: i,
        sha256: S,
        size: E,
        sourceUrl: e.url,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, m = await this.readArtifactFromMeta(this.getPendingMetaPath());
      m?.filePath && m.filePath !== R.filePath && await Ge.rm(m.filePath, { force: !0 }).catch(() => {
      });
      const w = this.getPendingMetaPath(), A = `${w}.tmp`;
      return await Ge.writeFile(A, JSON.stringify(R, null, 2), "utf-8"), await Ge.rename(A, w), this.setState({
        status: "downloaded",
        latestVersion: R.version,
        artifact: R,
        message: "UPDATE_DOWNLOADED",
        rollbackAvailable: await Ve(this.getRollbackMetaPath())
      }), {
        success: !0,
        message: "UPDATE_DOWNLOAD_OK",
        artifact: R
      };
    } catch (l) {
      f && await f.close().catch(() => {
      }), clearTimeout(u), await Ge.rm(s, { force: !0 }).catch(() => {
      });
      const g = l instanceof Error ? l.message : String(l);
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
        rollbackAvailable: await Ve(this.getRollbackMetaPath()),
        relaunched: !1
      };
    const e = await this.readArtifactFromMeta(this.getPendingMetaPath());
    if (!e)
      return {
        success: !1,
        message: "UPDATE_APPLY_NO_PENDING_ARTIFACT",
        rollbackAvailable: await Ve(this.getRollbackMetaPath()),
        relaunched: !1
      };
    if (!await Ve(e.filePath))
      return {
        success: !1,
        message: "UPDATE_APPLY_PENDING_FILE_MISSING",
        rollbackAvailable: await Ve(this.getRollbackMetaPath()),
        relaunched: !1
      };
    if (await this.computeFileSha256(e.filePath) !== e.sha256)
      return {
        success: !1,
        message: "UPDATE_APPLY_HASH_MISMATCH",
        rollbackAvailable: await Ve(this.getRollbackMetaPath()),
        relaunched: !1
      };
    const n = this.getRollbackMetaPath(), s = this.getCurrentMetaPath();
    await Ve(n) && await Ge.rm(n, { force: !0 }), await Ve(s) && await Ge.rename(s, n), await Ge.rename(this.getPendingMetaPath(), s);
    const i = await Ve(n);
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
      } catch (u) {
        ar.error("Failed to relaunch app for update apply", { error: u });
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
    if (!await Ve(t.filePath))
      return {
        success: !1,
        message: "UPDATE_ROLLBACK_FILE_MISSING"
      };
    if (await this.computeFileSha256(t.filePath) !== t.sha256)
      return {
        success: !1,
        message: "UPDATE_ROLLBACK_HASH_MISMATCH"
      };
    const s = this.getCurrentMetaPath(), i = It.join(this.getUpdateDir(), `stale-${Date.now()}.json`);
    return await Ve(s) && await Ge.rename(s, i), await Ge.rename(e, s), this.setState({
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
const Gt = new Oh();
function Lh(r) {
  Ce(r, [
    {
      channel: U.WINDOW_CLOSE,
      logTag: "WINDOW_CLOSE",
      failMessage: "Failed to close window",
      handler: () => {
        r.info("WINDOW_CLOSE requested from renderer");
        const e = Ct.getMainWindow();
        return e ? (e.close(), !0) : !1;
      }
    },
    {
      channel: U.APP_QUIT,
      logTag: "APP_QUIT",
      failMessage: "Failed to quit app",
      handler: () => (r.info("APP_QUIT requested from renderer"), qe.quit(), !0)
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
      handler: async () => Gt.checkForUpdate()
    },
    {
      channel: U.APP_GET_UPDATE_STATE,
      logTag: "APP_GET_UPDATE_STATE",
      failMessage: "Failed to get app update state",
      handler: async () => Gt.getState()
    },
    {
      channel: U.APP_DOWNLOAD_UPDATE,
      logTag: "APP_DOWNLOAD_UPDATE",
      failMessage: "Failed to download app update",
      handler: async () => Gt.downloadUpdate()
    },
    {
      channel: U.APP_APPLY_UPDATE,
      logTag: "APP_APPLY_UPDATE",
      failMessage: "Failed to apply app update",
      handler: async () => Gt.applyUpdate()
    },
    {
      channel: U.APP_ROLLBACK_UPDATE,
      logTag: "APP_ROLLBACK_UPDATE",
      failMessage: "Failed to rollback app update",
      handler: async () => Gt.rollbackUpdate()
    },
    {
      channel: U.APP_GET_BOOTSTRAP_STATUS,
      logTag: "APP_GET_BOOTSTRAP_STATUS",
      failMessage: "Failed to get bootstrap status",
      handler: () => (Ko(), Xo())
    },
    {
      channel: U.WINDOW_MAXIMIZE,
      logTag: "WINDOW_MAXIMIZE",
      failMessage: "Failed to maximize window",
      handler: () => {
        const e = Ct.getMainWindow();
        return e ? (e.isMaximized() || e.maximize(), e.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_TOGGLE_FULLSCREEN,
      logTag: "WINDOW_TOGGLE_FULLSCREEN",
      failMessage: "Failed to toggle fullscreen",
      handler: () => {
        const e = Ct.getMainWindow();
        return e ? (process.platform === "darwin" ? e.setSimpleFullScreen(!e.isSimpleFullScreen()) : e.setFullScreen(!e.isFullScreen()), e.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_SET_FULLSCREEN,
      logTag: "WINDOW_SET_FULLSCREEN",
      failMessage: "Failed to set fullscreen",
      argsSchema: Rl,
      handler: (e) => {
        const t = Ct.getMainWindow();
        return t ? (process.platform === "darwin" ? t.setSimpleFullScreen(e) : t.setFullScreen(e), t.focus(), !0) : !1;
      }
    },
    {
      channel: U.WINDOW_OPEN_EXPORT,
      logTag: "WINDOW_OPEN_EXPORT",
      failMessage: "Failed to open export window",
      argsSchema: xl,
      handler: (e) => {
        if (r.info("WINDOW_OPEN_EXPORT received", { chapterId: e }), !e)
          throw r.error("Invalid chapterId for export", { chapterId: e, type: typeof e }), new pe(
            he.REQUIRED_FIELD_MISSING,
            "Chapter ID is required to open export window",
            { chapterId: e, receivedType: typeof e }
          );
        return r.info("Creating export window", { chapterId: e }), Ct.createExportWindow(e), r.info("Export window created successfully", { chapterId: e }), !0;
      }
    },
    {
      channel: U.WINDOW_OPEN_WORLD_GRAPH,
      logTag: "WINDOW_OPEN_WORLD_GRAPH",
      failMessage: "Failed to open world graph window",
      handler: () => (r.info("WINDOW_OPEN_WORLD_GRAPH received"), r.info("Creating world graph window"), Ct.createWorldGraphWindow(), r.info("World graph window created successfully"), !0)
    }
  ]);
}
function Fh(r) {
  fh(r.logger), ch(r.logger), Lh(r.logger), dh(r.logger), ph(r.logger), uh(r.logger), gh(r.logger);
}
function Mh(r, e) {
  Ce(r, [
    {
      channel: U.CHARACTER_CREATE,
      logTag: "CHARACTER_CREATE",
      failMessage: "Failed to create character",
      argsSchema: h.tuple([sl]),
      handler: (t) => e.createCharacter(t)
    },
    {
      channel: U.CHARACTER_GET,
      logTag: "CHARACTER_GET",
      failMessage: "Failed to get character",
      argsSchema: h.tuple([Na]),
      handler: (t) => e.getCharacter(t)
    },
    {
      channel: U.CHARACTER_GET_ALL,
      logTag: "CHARACTER_GET_ALL",
      failMessage: "Failed to get all characters",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllCharacters(t)
    },
    {
      channel: U.CHARACTER_UPDATE,
      logTag: "CHARACTER_UPDATE",
      failMessage: "Failed to update character",
      argsSchema: h.tuple([ll]),
      handler: (t) => e.updateCharacter(t)
    },
    {
      channel: U.CHARACTER_DELETE,
      logTag: "CHARACTER_DELETE",
      failMessage: "Failed to delete character",
      argsSchema: h.tuple([Na]),
      handler: (t) => e.deleteCharacter(t)
    }
  ]);
}
function Uh(r, e) {
  Ce(r, [
    {
      channel: U.TERM_CREATE,
      logTag: "TERM_CREATE",
      failMessage: "Failed to create term",
      argsSchema: h.tuple([dl]),
      handler: (t) => e.createTerm(t)
    },
    {
      channel: U.TERM_GET,
      logTag: "TERM_GET",
      failMessage: "Failed to get term",
      argsSchema: h.tuple([Pa]),
      handler: (t) => e.getTerm(t)
    },
    {
      channel: U.TERM_GET_ALL,
      logTag: "TERM_GET_ALL",
      failMessage: "Failed to get all terms",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllTerms(t)
    },
    {
      channel: U.TERM_UPDATE,
      logTag: "TERM_UPDATE",
      failMessage: "Failed to update term",
      argsSchema: h.tuple([pl]),
      handler: (t) => e.updateTerm(t)
    },
    {
      channel: U.TERM_DELETE,
      logTag: "TERM_DELETE",
      failMessage: "Failed to delete term",
      argsSchema: h.tuple([Pa]),
      handler: (t) => e.deleteTerm(t)
    }
  ]);
}
function Wh(r, e) {
  Ce(r, [
    {
      channel: U.EVENT_CREATE,
      logTag: "EVENT_CREATE",
      failMessage: "Failed to create event",
      argsSchema: h.tuple([hl]),
      handler: (t) => e.createEvent(t)
    },
    {
      channel: U.EVENT_GET,
      logTag: "EVENT_GET",
      failMessage: "Failed to get event",
      argsSchema: h.tuple([en]),
      handler: (t) => e.getEvent(t)
    },
    {
      channel: U.EVENT_GET_ALL,
      logTag: "EVENT_GET_ALL",
      failMessage: "Failed to get all events",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllEvents(t)
    },
    {
      channel: U.EVENT_UPDATE,
      logTag: "EVENT_UPDATE",
      failMessage: "Failed to update event",
      argsSchema: h.tuple([cl]),
      handler: (t) => e.updateEvent(t)
    },
    {
      channel: U.EVENT_DELETE,
      logTag: "EVENT_DELETE",
      failMessage: "Failed to delete event",
      argsSchema: h.tuple([en]),
      handler: (t) => e.deleteEvent(t)
    }
  ]);
}
function jh(r, e) {
  Ce(r, [
    {
      channel: U.FACTION_CREATE,
      logTag: "FACTION_CREATE",
      failMessage: "Failed to create faction",
      argsSchema: h.tuple([fl]),
      handler: (t) => e.createFaction(t)
    },
    {
      channel: U.FACTION_GET,
      logTag: "FACTION_GET",
      failMessage: "Failed to get faction",
      argsSchema: h.tuple([tn]),
      handler: (t) => e.getFaction(t)
    },
    {
      channel: U.FACTION_GET_ALL,
      logTag: "FACTION_GET_ALL",
      failMessage: "Failed to get all factions",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllFactions(t)
    },
    {
      channel: U.FACTION_UPDATE,
      logTag: "FACTION_UPDATE",
      failMessage: "Failed to update faction",
      argsSchema: h.tuple([ul]),
      handler: (t) => e.updateFaction(t)
    },
    {
      channel: U.FACTION_DELETE,
      logTag: "FACTION_DELETE",
      failMessage: "Failed to delete faction",
      argsSchema: h.tuple([tn]),
      handler: (t) => e.deleteFaction(t)
    }
  ]);
}
function Bh(r, e) {
  Ce(r, [
    {
      channel: U.WORLD_ENTITY_CREATE,
      logTag: "WORLD_ENTITY_CREATE",
      failMessage: "Failed to create world entity",
      argsSchema: h.tuple([Yl]),
      handler: (t) => e.createWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_GET,
      logTag: "WORLD_ENTITY_GET",
      failMessage: "Failed to get world entity",
      argsSchema: h.tuple([mr]),
      handler: (t) => e.getWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_GET_ALL,
      logTag: "WORLD_ENTITY_GET_ALL",
      failMessage: "Failed to get all world entities",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getAllWorldEntities(t)
    },
    {
      channel: U.WORLD_ENTITY_UPDATE,
      logTag: "WORLD_ENTITY_UPDATE",
      failMessage: "Failed to update world entity",
      argsSchema: h.tuple([Zl]),
      handler: (t) => e.updateWorldEntity(t)
    },
    {
      channel: U.WORLD_ENTITY_UPDATE_POSITION,
      logTag: "WORLD_ENTITY_UPDATE_POSITION",
      failMessage: "Failed to update world entity position",
      argsSchema: h.tuple([$l]),
      handler: (t) => e.updateWorldEntityPosition(t)
    },
    {
      channel: U.WORLD_ENTITY_DELETE,
      logTag: "WORLD_ENTITY_DELETE",
      failMessage: "Failed to delete world entity",
      argsSchema: h.tuple([mr]),
      handler: (t) => e.deleteWorldEntity(t)
    }
  ]);
}
function Hh(r, e, t) {
  Ce(r, [
    {
      channel: U.ENTITY_RELATION_CREATE,
      logTag: "ENTITY_RELATION_CREATE",
      failMessage: "Failed to create entity relation",
      argsSchema: h.tuple([Vl]),
      handler: (n) => e.createRelation(n)
    },
    {
      channel: U.ENTITY_RELATION_GET_ALL,
      logTag: "ENTITY_RELATION_GET_ALL",
      failMessage: "Failed to get entity relations",
      argsSchema: h.tuple([Ae]),
      handler: (n) => e.getAllRelations(n)
    },
    {
      channel: U.ENTITY_RELATION_UPDATE,
      logTag: "ENTITY_RELATION_UPDATE",
      failMessage: "Failed to update entity relation",
      argsSchema: h.tuple([Kl]),
      handler: (n) => e.updateRelation(n)
    },
    {
      channel: U.ENTITY_RELATION_DELETE,
      logTag: "ENTITY_RELATION_DELETE",
      failMessage: "Failed to delete entity relation",
      argsSchema: h.tuple([to]),
      handler: (n) => e.deleteRelation(n)
    },
    {
      channel: U.WORLD_GRAPH_GET,
      logTag: "WORLD_GRAPH_GET",
      failMessage: "Failed to get world graph",
      argsSchema: h.tuple([Ae]),
      handler: (n) => e.getWorldGraph(n)
    },
    {
      channel: U.WORLD_GRAPH_GET_MENTIONS,
      logTag: "WORLD_GRAPH_GET_MENTIONS",
      failMessage: "Failed to get world graph mentions",
      argsSchema: h.tuple([Xl]),
      handler: (n) => t.getMentions(n)
    }
  ]);
}
function zh(r) {
  Mh(r.logger, r.characterService), Uh(r.logger, r.termService), Wh(r.logger, r.eventService), jh(r.logger, r.factionService), Bh(r.logger, r.worldEntityService), Hh(
    r.logger,
    r.entityRelationService,
    r.worldMentionService
  );
}
function Gh(r, e) {
  Ce(r, [
    {
      channel: U.AUTO_SAVE,
      logTag: "AUTO_SAVE",
      failMessage: "Failed to auto save",
      argsSchema: gl,
      handler: async (t, n, s) => (await e.triggerSave(t, n, s), { success: !0 })
    }
  ]);
}
function qh(r, e) {
  Ce(r, [
    {
      channel: U.SNAPSHOT_CREATE,
      logTag: "SNAPSHOT_CREATE",
      failMessage: "Failed to create snapshot",
      argsSchema: h.tuple([ml]),
      handler: (t) => e.createSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_GET_BY_PROJECT,
      logTag: "SNAPSHOT_GET_BY_PROJECT",
      failMessage: "Failed to get snapshots by project",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getSnapshotsByProject(t)
    },
    {
      channel: U.SNAPSHOT_GET_ALL,
      logTag: "SNAPSHOT_GET_ALL",
      failMessage: "Failed to get snapshots",
      argsSchema: h.tuple([Ae]),
      handler: (t) => e.getSnapshotsByProject(t)
    },
    {
      channel: U.SNAPSHOT_GET_BY_CHAPTER,
      logTag: "SNAPSHOT_GET_BY_CHAPTER",
      failMessage: "Failed to get snapshots by chapter",
      argsSchema: h.tuple([Xe]),
      handler: (t) => e.getSnapshotsByChapter(t)
    },
    {
      channel: U.SNAPSHOT_DELETE,
      logTag: "SNAPSHOT_DELETE",
      failMessage: "Failed to delete snapshot",
      argsSchema: h.tuple([rn]),
      handler: (t) => e.deleteSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_RESTORE,
      logTag: "SNAPSHOT_RESTORE",
      failMessage: "Failed to restore snapshot",
      argsSchema: h.tuple([rn]),
      handler: (t) => e.restoreSnapshot(t)
    },
    {
      channel: U.SNAPSHOT_IMPORT_FILE,
      logTag: "SNAPSHOT_IMPORT_FILE",
      failMessage: "Failed to import snapshot file",
      argsSchema: h.tuple([h.string()]),
      handler: (t) => e.importSnapshotFile(t)
    }
  ]);
}
var Dr = {}, Cr = {}, $e = {}, nr = { exports: {} }, ir = { exports: {} }, vn;
function vr() {
  if (vn) return ir.exports;
  vn = 1, typeof process > "u" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0 ? ir.exports = { nextTick: r } : ir.exports = process;
  function r(e, t, n, s) {
    if (typeof e != "function")
      throw new TypeError('"callback" argument must be a function');
    var i = arguments.length, o, u;
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
          e.call(null, t, n, s);
        });
      default:
        for (o = new Array(i - 1), u = 0; u < o.length; )
          o[u++] = arguments[u];
        return process.nextTick(function() {
          e.apply(null, o);
        });
    }
  }
  return ir.exports;
}
var Nr, En;
function Yh() {
  if (En) return Nr;
  En = 1;
  var r = {}.toString;
  return Nr = Array.isArray || function(e) {
    return r.call(e) == "[object Array]";
  }, Nr;
}
var Pr, yn;
function oo() {
  return yn || (yn = 1, Pr = qi), Pr;
}
var or = { exports: {} }, bn;
function Er() {
  return bn || (bn = 1, (function(r, e) {
    var t = Yi, n = t.Buffer;
    function s(o, u) {
      for (var f in o)
        u[f] = o[f];
    }
    n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow ? r.exports = t : (s(t, e), e.Buffer = i);
    function i(o, u, f) {
      return n(o, u, f);
    }
    s(n, i), i.from = function(o, u, f) {
      if (typeof o == "number")
        throw new TypeError("Argument must not be a number");
      return n(o, u, f);
    }, i.alloc = function(o, u, f) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      var T = n(o);
      return u !== void 0 ? typeof f == "string" ? T.fill(u, f) : T.fill(u) : T.fill(0), T;
    }, i.allocUnsafe = function(o) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      return n(o);
    }, i.allocUnsafeSlow = function(o) {
      if (typeof o != "number")
        throw new TypeError("Argument must be a number");
      return t.SlowBuffer(o);
    };
  })(or, or.exports)), or.exports;
}
var Le = {}, Tn;
function $t() {
  if (Tn) return Le;
  Tn = 1;
  function r(S) {
    return Array.isArray ? Array.isArray(S) : E(S) === "[object Array]";
  }
  Le.isArray = r;
  function e(S) {
    return typeof S == "boolean";
  }
  Le.isBoolean = e;
  function t(S) {
    return S === null;
  }
  Le.isNull = t;
  function n(S) {
    return S == null;
  }
  Le.isNullOrUndefined = n;
  function s(S) {
    return typeof S == "number";
  }
  Le.isNumber = s;
  function i(S) {
    return typeof S == "string";
  }
  Le.isString = i;
  function o(S) {
    return typeof S == "symbol";
  }
  Le.isSymbol = o;
  function u(S) {
    return S === void 0;
  }
  Le.isUndefined = u;
  function f(S) {
    return E(S) === "[object RegExp]";
  }
  Le.isRegExp = f;
  function T(S) {
    return typeof S == "object" && S !== null;
  }
  Le.isObject = T;
  function v(S) {
    return E(S) === "[object Date]";
  }
  Le.isDate = v;
  function p(S) {
    return E(S) === "[object Error]" || S instanceof Error;
  }
  Le.isError = p;
  function l(S) {
    return typeof S == "function";
  }
  Le.isFunction = l;
  function g(S) {
    return S === null || typeof S == "boolean" || typeof S == "number" || typeof S == "string" || typeof S == "symbol" || // ES6 symbol
    typeof S > "u";
  }
  Le.isPrimitive = g, Le.isBuffer = Yi.Buffer.isBuffer;
  function E(S) {
    return Object.prototype.toString.call(S);
  }
  return Le;
}
var sr = { exports: {} }, lr = { exports: {} }, Sn;
function Zh() {
  return Sn || (Sn = 1, typeof Object.create == "function" ? lr.exports = function(e, t) {
    t && (e.super_ = t, e.prototype = Object.create(t.prototype, {
      constructor: {
        value: e,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }));
  } : lr.exports = function(e, t) {
    if (t) {
      e.super_ = t;
      var n = function() {
      };
      n.prototype = t.prototype, e.prototype = new n(), e.prototype.constructor = e;
    }
  }), lr.exports;
}
var An;
function Vt() {
  if (An) return sr.exports;
  An = 1;
  try {
    var r = ws("util");
    if (typeof r.inherits != "function") throw "";
    sr.exports = r.inherits;
  } catch {
    sr.exports = Zh();
  }
  return sr.exports;
}
var kr = { exports: {} }, In;
function $h() {
  return In || (In = 1, (function(r) {
    function e(i, o) {
      if (!(i instanceof o))
        throw new TypeError("Cannot call a class as a function");
    }
    var t = Er().Buffer, n = Ua;
    function s(i, o, u) {
      i.copy(o, u);
    }
    r.exports = (function() {
      function i() {
        e(this, i), this.head = null, this.tail = null, this.length = 0;
      }
      return i.prototype.push = function(u) {
        var f = { data: u, next: null };
        this.length > 0 ? this.tail.next = f : this.head = f, this.tail = f, ++this.length;
      }, i.prototype.unshift = function(u) {
        var f = { data: u, next: this.head };
        this.length === 0 && (this.tail = f), this.head = f, ++this.length;
      }, i.prototype.shift = function() {
        if (this.length !== 0) {
          var u = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, u;
        }
      }, i.prototype.clear = function() {
        this.head = this.tail = null, this.length = 0;
      }, i.prototype.join = function(u) {
        if (this.length === 0) return "";
        for (var f = this.head, T = "" + f.data; f = f.next; )
          T += u + f.data;
        return T;
      }, i.prototype.concat = function(u) {
        if (this.length === 0) return t.alloc(0);
        for (var f = t.allocUnsafe(u >>> 0), T = this.head, v = 0; T; )
          s(T.data, f, v), v += T.data.length, T = T.next;
        return f;
      }, i;
    })(), n && n.inspect && n.inspect.custom && (r.exports.prototype[n.inspect.custom] = function() {
      var i = n.inspect({ length: this.length });
      return this.constructor.name + " " + i;
    });
  })(kr)), kr.exports;
}
var Or, Rn;
function so() {
  if (Rn) return Or;
  Rn = 1;
  var r = vr();
  function e(s, i) {
    var o = this, u = this._readableState && this._readableState.destroyed, f = this._writableState && this._writableState.destroyed;
    return u || f ? (i ? i(s) : s && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, r.nextTick(n, this, s)) : r.nextTick(n, this, s)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(s || null, function(T) {
      !i && T ? o._writableState ? o._writableState.errorEmitted || (o._writableState.errorEmitted = !0, r.nextTick(n, o, T)) : r.nextTick(n, o, T) : i && i(T);
    }), this);
  }
  function t() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1);
  }
  function n(s, i) {
    s.emit("error", i);
  }
  return Or = {
    destroy: e,
    undestroy: t
  }, Or;
}
var Lr, xn;
function Vh() {
  return xn || (xn = 1, Lr = Ua.deprecate), Lr;
}
var Fr, Dn;
function lo() {
  if (Dn) return Fr;
  Dn = 1;
  var r = vr();
  Fr = S;
  function e(x) {
    var N = this;
    this.next = null, this.entry = null, this.finish = function() {
      ue(N, x);
    };
  }
  var t = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : r.nextTick, n;
  S.WritableState = g;
  var s = Object.create($t());
  s.inherits = Vt();
  var i = {
    deprecate: Vh()
  }, o = oo(), u = Er().Buffer, f = (typeof Be < "u" ? Be : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function T(x) {
    return u.from(x);
  }
  function v(x) {
    return u.isBuffer(x) || x instanceof f;
  }
  var p = so();
  s.inherits(S, o);
  function l() {
  }
  function g(x, N) {
    n = n || zt(), x = x || {};
    var W = N instanceof n;
    this.objectMode = !!x.objectMode, W && (this.objectMode = this.objectMode || !!x.writableObjectMode);
    var J = x.highWaterMark, re = x.writableHighWaterMark, ae = this.objectMode ? 16 : 16 * 1024;
    J || J === 0 ? this.highWaterMark = J : W && (re || re === 0) ? this.highWaterMark = re : this.highWaterMark = ae, this.highWaterMark = Math.floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var se = x.decodeStrings === !1;
    this.decodeStrings = !se, this.defaultEncoding = x.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(Ee) {
      M(N, Ee);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new e(this);
  }
  g.prototype.getBuffer = function() {
    for (var N = this.bufferedRequest, W = []; N; )
      W.push(N), N = N.next;
    return W;
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
  var E;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (E = Function.prototype[Symbol.hasInstance], Object.defineProperty(S, Symbol.hasInstance, {
    value: function(x) {
      return E.call(this, x) ? !0 : this !== S ? !1 : x && x._writableState instanceof g;
    }
  })) : E = function(x) {
    return x instanceof this;
  };
  function S(x) {
    if (n = n || zt(), !E.call(S, this) && !(this instanceof n))
      return new S(x);
    this._writableState = new g(x, this), this.writable = !0, x && (typeof x.write == "function" && (this._write = x.write), typeof x.writev == "function" && (this._writev = x.writev), typeof x.destroy == "function" && (this._destroy = x.destroy), typeof x.final == "function" && (this._final = x.final)), o.call(this);
  }
  S.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function R(x, N) {
    var W = new Error("write after end");
    x.emit("error", W), r.nextTick(N, W);
  }
  function m(x, N, W, J) {
    var re = !0, ae = !1;
    return W === null ? ae = new TypeError("May not write null values to stream") : typeof W != "string" && W !== void 0 && !N.objectMode && (ae = new TypeError("Invalid non-string/buffer chunk")), ae && (x.emit("error", ae), r.nextTick(J, ae), re = !1), re;
  }
  S.prototype.write = function(x, N, W) {
    var J = this._writableState, re = !1, ae = !J.objectMode && v(x);
    return ae && !u.isBuffer(x) && (x = T(x)), typeof N == "function" && (W = N, N = null), ae ? N = "buffer" : N || (N = J.defaultEncoding), typeof W != "function" && (W = l), J.ended ? R(this, W) : (ae || m(this, J, x, W)) && (J.pendingcb++, re = A(this, J, ae, x, N, W)), re;
  }, S.prototype.cork = function() {
    var x = this._writableState;
    x.corked++;
  }, S.prototype.uncork = function() {
    var x = this._writableState;
    x.corked && (x.corked--, !x.writing && !x.corked && !x.bufferProcessing && x.bufferedRequest && te(this, x));
  }, S.prototype.setDefaultEncoding = function(N) {
    if (typeof N == "string" && (N = N.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((N + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + N);
    return this._writableState.defaultEncoding = N, this;
  };
  function w(x, N, W) {
    return !x.objectMode && x.decodeStrings !== !1 && typeof N == "string" && (N = u.from(N, W)), N;
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
  function A(x, N, W, J, re, ae) {
    if (!W) {
      var se = w(N, J, re);
      J !== se && (W = !0, re = "buffer", J = se);
    }
    var Ee = N.objectMode ? 1 : J.length;
    N.length += Ee;
    var ye = N.length < N.highWaterMark;
    if (ye || (N.needDrain = !0), N.writing || N.corked) {
      var ge = N.lastBufferedRequest;
      N.lastBufferedRequest = {
        chunk: J,
        encoding: re,
        isBuf: W,
        callback: ae,
        next: null
      }, ge ? ge.next = N.lastBufferedRequest : N.bufferedRequest = N.lastBufferedRequest, N.bufferedRequestCount += 1;
    } else
      C(x, N, !1, Ee, J, re, ae);
    return ye;
  }
  function C(x, N, W, J, re, ae, se) {
    N.writelen = J, N.writecb = se, N.writing = !0, N.sync = !0, W ? x._writev(re, N.onwrite) : x._write(re, ae, N.onwrite), N.sync = !1;
  }
  function O(x, N, W, J, re) {
    --N.pendingcb, W ? (r.nextTick(re, J), r.nextTick(ce, x, N), x._writableState.errorEmitted = !0, x.emit("error", J)) : (re(J), x._writableState.errorEmitted = !0, x.emit("error", J), ce(x, N));
  }
  function j(x) {
    x.writing = !1, x.writecb = null, x.length -= x.writelen, x.writelen = 0;
  }
  function M(x, N) {
    var W = x._writableState, J = W.sync, re = W.writecb;
    if (j(W), N) O(x, W, J, N, re);
    else {
      var ae = le(W);
      !ae && !W.corked && !W.bufferProcessing && W.bufferedRequest && te(x, W), J ? t(Y, x, W, ae, re) : Y(x, W, ae, re);
    }
  }
  function Y(x, N, W, J) {
    W || ee(x, N), N.pendingcb--, J(), ce(x, N);
  }
  function ee(x, N) {
    N.length === 0 && N.needDrain && (N.needDrain = !1, x.emit("drain"));
  }
  function te(x, N) {
    N.bufferProcessing = !0;
    var W = N.bufferedRequest;
    if (x._writev && W && W.next) {
      var J = N.bufferedRequestCount, re = new Array(J), ae = N.corkedRequestsFree;
      ae.entry = W;
      for (var se = 0, Ee = !0; W; )
        re[se] = W, W.isBuf || (Ee = !1), W = W.next, se += 1;
      re.allBuffers = Ee, C(x, N, !0, N.length, re, "", ae.finish), N.pendingcb++, N.lastBufferedRequest = null, ae.next ? (N.corkedRequestsFree = ae.next, ae.next = null) : N.corkedRequestsFree = new e(N), N.bufferedRequestCount = 0;
    } else {
      for (; W; ) {
        var ye = W.chunk, ge = W.encoding, y = W.callback, b = N.objectMode ? 1 : ye.length;
        if (C(x, N, !1, b, ye, ge, y), W = W.next, N.bufferedRequestCount--, N.writing)
          break;
      }
      W === null && (N.lastBufferedRequest = null);
    }
    N.bufferedRequest = W, N.bufferProcessing = !1;
  }
  S.prototype._write = function(x, N, W) {
    W(new Error("_write() is not implemented"));
  }, S.prototype._writev = null, S.prototype.end = function(x, N, W) {
    var J = this._writableState;
    typeof x == "function" ? (W = x, x = null, N = null) : typeof N == "function" && (W = N, N = null), x != null && this.write(x, N), J.corked && (J.corked = 1, this.uncork()), J.ending || ve(this, J, W);
  };
  function le(x) {
    return x.ending && x.length === 0 && x.bufferedRequest === null && !x.finished && !x.writing;
  }
  function oe(x, N) {
    x._final(function(W) {
      N.pendingcb--, W && x.emit("error", W), N.prefinished = !0, x.emit("prefinish"), ce(x, N);
    });
  }
  function $(x, N) {
    !N.prefinished && !N.finalCalled && (typeof x._final == "function" ? (N.pendingcb++, N.finalCalled = !0, r.nextTick(oe, x, N)) : (N.prefinished = !0, x.emit("prefinish")));
  }
  function ce(x, N) {
    var W = le(N);
    return W && ($(x, N), N.pendingcb === 0 && (N.finished = !0, x.emit("finish"))), W;
  }
  function ve(x, N, W) {
    N.ending = !0, ce(x, N), W && (N.finished ? r.nextTick(W) : x.once("finish", W)), N.ended = !0, x.writable = !1;
  }
  function ue(x, N, W) {
    var J = x.entry;
    for (x.entry = null; J; ) {
      var re = J.callback;
      N.pendingcb--, re(W), J = J.next;
    }
    N.corkedRequestsFree.next = x;
  }
  return Object.defineProperty(S.prototype, "destroyed", {
    get: function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    },
    set: function(x) {
      this._writableState && (this._writableState.destroyed = x);
    }
  }), S.prototype.destroy = p.destroy, S.prototype._undestroy = p.undestroy, S.prototype._destroy = function(x, N) {
    this.end(), N(x);
  }, Fr;
}
var Mr, Cn;
function zt() {
  if (Cn) return Mr;
  Cn = 1;
  var r = vr(), e = Object.keys || function(p) {
    var l = [];
    for (var g in p)
      l.push(g);
    return l;
  };
  Mr = f;
  var t = Object.create($t());
  t.inherits = Vt();
  var n = ho(), s = lo();
  t.inherits(f, n);
  for (var i = e(s.prototype), o = 0; o < i.length; o++) {
    var u = i[o];
    f.prototype[u] || (f.prototype[u] = s.prototype[u]);
  }
  function f(p) {
    if (!(this instanceof f)) return new f(p);
    n.call(this, p), s.call(this, p), p && p.readable === !1 && (this.readable = !1), p && p.writable === !1 && (this.writable = !1), this.allowHalfOpen = !0, p && p.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", T);
  }
  Object.defineProperty(f.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function T() {
    this.allowHalfOpen || this._writableState.ended || r.nextTick(v, this);
  }
  function v(p) {
    p.end();
  }
  return Object.defineProperty(f.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(p) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = p, this._writableState.destroyed = p);
    }
  }), f.prototype._destroy = function(p, l) {
    this.push(null), this.end(), r.nextTick(l, p);
  }, Mr;
}
var Ur = {}, Nn;
function Pn() {
  if (Nn) return Ur;
  Nn = 1;
  var r = Er().Buffer, e = r.isEncoding || function(m) {
    switch (m = "" + m, m && m.toLowerCase()) {
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
  function t(m) {
    if (!m) return "utf8";
    for (var w; ; )
      switch (m) {
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
          return m;
        default:
          if (w) return;
          m = ("" + m).toLowerCase(), w = !0;
      }
  }
  function n(m) {
    var w = t(m);
    if (typeof w != "string" && (r.isEncoding === e || !e(m))) throw new Error("Unknown encoding: " + m);
    return w || m;
  }
  Ur.StringDecoder = s;
  function s(m) {
    this.encoding = n(m);
    var w;
    switch (this.encoding) {
      case "utf16le":
        this.text = p, this.end = l, w = 4;
        break;
      case "utf8":
        this.fillLast = f, w = 4;
        break;
      case "base64":
        this.text = g, this.end = E, w = 3;
        break;
      default:
        this.write = S, this.end = R;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = r.allocUnsafe(w);
  }
  s.prototype.write = function(m) {
    if (m.length === 0) return "";
    var w, A;
    if (this.lastNeed) {
      if (w = this.fillLast(m), w === void 0) return "";
      A = this.lastNeed, this.lastNeed = 0;
    } else
      A = 0;
    return A < m.length ? w ? w + this.text(m, A) : this.text(m, A) : w || "";
  }, s.prototype.end = v, s.prototype.text = T, s.prototype.fillLast = function(m) {
    if (this.lastNeed <= m.length)
      return m.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    m.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, m.length), this.lastNeed -= m.length;
  };
  function i(m) {
    return m <= 127 ? 0 : m >> 5 === 6 ? 2 : m >> 4 === 14 ? 3 : m >> 3 === 30 ? 4 : m >> 6 === 2 ? -1 : -2;
  }
  function o(m, w, A) {
    var C = w.length - 1;
    if (C < A) return 0;
    var O = i(w[C]);
    return O >= 0 ? (O > 0 && (m.lastNeed = O - 1), O) : --C < A || O === -2 ? 0 : (O = i(w[C]), O >= 0 ? (O > 0 && (m.lastNeed = O - 2), O) : --C < A || O === -2 ? 0 : (O = i(w[C]), O >= 0 ? (O > 0 && (O === 2 ? O = 0 : m.lastNeed = O - 3), O) : 0));
  }
  function u(m, w, A) {
    if ((w[0] & 192) !== 128)
      return m.lastNeed = 0, "�";
    if (m.lastNeed > 1 && w.length > 1) {
      if ((w[1] & 192) !== 128)
        return m.lastNeed = 1, "�";
      if (m.lastNeed > 2 && w.length > 2 && (w[2] & 192) !== 128)
        return m.lastNeed = 2, "�";
    }
  }
  function f(m) {
    var w = this.lastTotal - this.lastNeed, A = u(this, m);
    if (A !== void 0) return A;
    if (this.lastNeed <= m.length)
      return m.copy(this.lastChar, w, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    m.copy(this.lastChar, w, 0, m.length), this.lastNeed -= m.length;
  }
  function T(m, w) {
    var A = o(this, m, w);
    if (!this.lastNeed) return m.toString("utf8", w);
    this.lastTotal = A;
    var C = m.length - (A - this.lastNeed);
    return m.copy(this.lastChar, 0, C), m.toString("utf8", w, C);
  }
  function v(m) {
    var w = m && m.length ? this.write(m) : "";
    return this.lastNeed ? w + "�" : w;
  }
  function p(m, w) {
    if ((m.length - w) % 2 === 0) {
      var A = m.toString("utf16le", w);
      if (A) {
        var C = A.charCodeAt(A.length - 1);
        if (C >= 55296 && C <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = m[m.length - 2], this.lastChar[1] = m[m.length - 1], A.slice(0, -1);
      }
      return A;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = m[m.length - 1], m.toString("utf16le", w, m.length - 1);
  }
  function l(m) {
    var w = m && m.length ? this.write(m) : "";
    if (this.lastNeed) {
      var A = this.lastTotal - this.lastNeed;
      return w + this.lastChar.toString("utf16le", 0, A);
    }
    return w;
  }
  function g(m, w) {
    var A = (m.length - w) % 3;
    return A === 0 ? m.toString("base64", w) : (this.lastNeed = 3 - A, this.lastTotal = 3, A === 1 ? this.lastChar[0] = m[m.length - 1] : (this.lastChar[0] = m[m.length - 2], this.lastChar[1] = m[m.length - 1]), m.toString("base64", w, m.length - A));
  }
  function E(m) {
    var w = m && m.length ? this.write(m) : "";
    return this.lastNeed ? w + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : w;
  }
  function S(m) {
    return m.toString(this.encoding);
  }
  function R(m) {
    return m && m.length ? this.write(m) : "";
  }
  return Ur;
}
var Wr, kn;
function ho() {
  if (kn) return Wr;
  kn = 1;
  var r = vr();
  Wr = w;
  var e = Yh(), t;
  w.ReadableState = m, gs.EventEmitter;
  var n = function(y, b) {
    return y.listeners(b).length;
  }, s = oo(), i = Er().Buffer, o = (typeof Be < "u" ? Be : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function u(y) {
    return i.from(y);
  }
  function f(y) {
    return i.isBuffer(y) || y instanceof o;
  }
  var T = Object.create($t());
  T.inherits = Vt();
  var v = Ua, p = void 0;
  v && v.debuglog ? p = v.debuglog("stream") : p = function() {
  };
  var l = $h(), g = so(), E;
  T.inherits(w, s);
  var S = ["error", "close", "destroy", "pause", "resume"];
  function R(y, b, B) {
    if (typeof y.prependListener == "function") return y.prependListener(b, B);
    !y._events || !y._events[b] ? y.on(b, B) : e(y._events[b]) ? y._events[b].unshift(B) : y._events[b] = [B, y._events[b]];
  }
  function m(y, b) {
    t = t || zt(), y = y || {};
    var B = b instanceof t;
    this.objectMode = !!y.objectMode, B && (this.objectMode = this.objectMode || !!y.readableObjectMode);
    var q = y.highWaterMark, fe = y.readableHighWaterMark, Z = this.objectMode ? 16 : 16 * 1024;
    q || q === 0 ? this.highWaterMark = q : B && (fe || fe === 0) ? this.highWaterMark = fe : this.highWaterMark = Z, this.highWaterMark = Math.floor(this.highWaterMark), this.buffer = new l(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = y.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, y.encoding && (E || (E = Pn().StringDecoder), this.decoder = new E(y.encoding), this.encoding = y.encoding);
  }
  function w(y) {
    if (t = t || zt(), !(this instanceof w)) return new w(y);
    this._readableState = new m(y, this), this.readable = !0, y && (typeof y.read == "function" && (this._read = y.read), typeof y.destroy == "function" && (this._destroy = y.destroy)), s.call(this);
  }
  Object.defineProperty(w.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    },
    set: function(y) {
      this._readableState && (this._readableState.destroyed = y);
    }
  }), w.prototype.destroy = g.destroy, w.prototype._undestroy = g.undestroy, w.prototype._destroy = function(y, b) {
    this.push(null), b(y);
  }, w.prototype.push = function(y, b) {
    var B = this._readableState, q;
    return B.objectMode ? q = !0 : typeof y == "string" && (b = b || B.defaultEncoding, b !== B.encoding && (y = i.from(y, b), b = ""), q = !0), A(this, y, b, !1, q);
  }, w.prototype.unshift = function(y) {
    return A(this, y, null, !0, !1);
  };
  function A(y, b, B, q, fe) {
    var Z = y._readableState;
    if (b === null)
      Z.reading = !1, te(y, Z);
    else {
      var ne;
      fe || (ne = O(Z, b)), ne ? y.emit("error", ne) : Z.objectMode || b && b.length > 0 ? (typeof b != "string" && !Z.objectMode && Object.getPrototypeOf(b) !== i.prototype && (b = u(b)), q ? Z.endEmitted ? y.emit("error", new Error("stream.unshift() after end event")) : C(y, Z, b, !0) : Z.ended ? y.emit("error", new Error("stream.push() after EOF")) : (Z.reading = !1, Z.decoder && !B ? (b = Z.decoder.write(b), Z.objectMode || b.length !== 0 ? C(y, Z, b, !1) : $(y, Z)) : C(y, Z, b, !1))) : q || (Z.reading = !1);
    }
    return j(Z);
  }
  function C(y, b, B, q) {
    b.flowing && b.length === 0 && !b.sync ? (y.emit("data", B), y.read(0)) : (b.length += b.objectMode ? 1 : B.length, q ? b.buffer.unshift(B) : b.buffer.push(B), b.needReadable && le(y)), $(y, b);
  }
  function O(y, b) {
    var B;
    return !f(b) && typeof b != "string" && b !== void 0 && !y.objectMode && (B = new TypeError("Invalid non-string/buffer chunk")), B;
  }
  function j(y) {
    return !y.ended && (y.needReadable || y.length < y.highWaterMark || y.length === 0);
  }
  w.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  }, w.prototype.setEncoding = function(y) {
    return E || (E = Pn().StringDecoder), this._readableState.decoder = new E(y), this._readableState.encoding = y, this;
  };
  var M = 8388608;
  function Y(y) {
    return y >= M ? y = M : (y--, y |= y >>> 1, y |= y >>> 2, y |= y >>> 4, y |= y >>> 8, y |= y >>> 16, y++), y;
  }
  function ee(y, b) {
    return y <= 0 || b.length === 0 && b.ended ? 0 : b.objectMode ? 1 : y !== y ? b.flowing && b.length ? b.buffer.head.data.length : b.length : (y > b.highWaterMark && (b.highWaterMark = Y(y)), y <= b.length ? y : b.ended ? b.length : (b.needReadable = !0, 0));
  }
  w.prototype.read = function(y) {
    p("read", y), y = parseInt(y, 10);
    var b = this._readableState, B = y;
    if (y !== 0 && (b.emittedReadable = !1), y === 0 && b.needReadable && (b.length >= b.highWaterMark || b.ended))
      return p("read: emitReadable", b.length, b.ended), b.length === 0 && b.ended ? Ee(this) : le(this), null;
    if (y = ee(y, b), y === 0 && b.ended)
      return b.length === 0 && Ee(this), null;
    var q = b.needReadable;
    p("need readable", q), (b.length === 0 || b.length - y < b.highWaterMark) && (q = !0, p("length less than watermark", q)), b.ended || b.reading ? (q = !1, p("reading or ended", q)) : q && (p("do read"), b.reading = !0, b.sync = !0, b.length === 0 && (b.needReadable = !0), this._read(b.highWaterMark), b.sync = !1, b.reading || (y = ee(B, b)));
    var fe;
    return y > 0 ? fe = J(y, b) : fe = null, fe === null ? (b.needReadable = !0, y = 0) : b.length -= y, b.length === 0 && (b.ended || (b.needReadable = !0), B !== y && b.ended && Ee(this)), fe !== null && this.emit("data", fe), fe;
  };
  function te(y, b) {
    if (!b.ended) {
      if (b.decoder) {
        var B = b.decoder.end();
        B && B.length && (b.buffer.push(B), b.length += b.objectMode ? 1 : B.length);
      }
      b.ended = !0, le(y);
    }
  }
  function le(y) {
    var b = y._readableState;
    b.needReadable = !1, b.emittedReadable || (p("emitReadable", b.flowing), b.emittedReadable = !0, b.sync ? r.nextTick(oe, y) : oe(y));
  }
  function oe(y) {
    p("emit readable"), y.emit("readable"), W(y);
  }
  function $(y, b) {
    b.readingMore || (b.readingMore = !0, r.nextTick(ce, y, b));
  }
  function ce(y, b) {
    for (var B = b.length; !b.reading && !b.flowing && !b.ended && b.length < b.highWaterMark && (p("maybeReadMore read 0"), y.read(0), B !== b.length); )
      B = b.length;
    b.readingMore = !1;
  }
  w.prototype._read = function(y) {
    this.emit("error", new Error("_read() is not implemented"));
  }, w.prototype.pipe = function(y, b) {
    var B = this, q = this._readableState;
    switch (q.pipesCount) {
      case 0:
        q.pipes = y;
        break;
      case 1:
        q.pipes = [q.pipes, y];
        break;
      default:
        q.pipes.push(y);
        break;
    }
    q.pipesCount += 1, p("pipe count=%d opts=%j", q.pipesCount, b);
    var fe = (!b || b.end !== !1) && y !== process.stdout && y !== process.stderr, Z = fe ? Je : et;
    q.endEmitted ? r.nextTick(Z) : B.once("end", Z), y.on("unpipe", ne);
    function ne(ze, ke) {
      p("onunpipe"), ze === B && ke && ke.hasUnpiped === !1 && (ke.hasUnpiped = !0, be());
    }
    function Je() {
      p("onend"), y.end();
    }
    var Fe = ve(B);
    y.on("drain", Fe);
    var Me = !1;
    function be() {
      p("cleanup"), y.removeListener("close", Qe), y.removeListener("finish", Ue), y.removeListener("drain", Fe), y.removeListener("error", ht), y.removeListener("unpipe", ne), B.removeListener("end", Je), B.removeListener("end", et), B.removeListener("data", He), Me = !0, q.awaitDrain && (!y._writableState || y._writableState.needDrain) && Fe();
    }
    var de = !1;
    B.on("data", He);
    function He(ze) {
      p("ondata"), de = !1;
      var ke = y.write(ze);
      ke === !1 && !de && ((q.pipesCount === 1 && q.pipes === y || q.pipesCount > 1 && ge(q.pipes, y) !== -1) && !Me && (p("false write response, pause", q.awaitDrain), q.awaitDrain++, de = !0), B.pause());
    }
    function ht(ze) {
      p("onerror", ze), et(), y.removeListener("error", ht), n(y, "error") === 0 && y.emit("error", ze);
    }
    R(y, "error", ht);
    function Qe() {
      y.removeListener("finish", Ue), et();
    }
    y.once("close", Qe);
    function Ue() {
      p("onfinish"), y.removeListener("close", Qe), et();
    }
    y.once("finish", Ue);
    function et() {
      p("unpipe"), B.unpipe(y);
    }
    return y.emit("pipe", B), q.flowing || (p("pipe resume"), B.resume()), y;
  };
  function ve(y) {
    return function() {
      var b = y._readableState;
      p("pipeOnDrain", b.awaitDrain), b.awaitDrain && b.awaitDrain--, b.awaitDrain === 0 && n(y, "data") && (b.flowing = !0, W(y));
    };
  }
  w.prototype.unpipe = function(y) {
    var b = this._readableState, B = { hasUnpiped: !1 };
    if (b.pipesCount === 0) return this;
    if (b.pipesCount === 1)
      return y && y !== b.pipes ? this : (y || (y = b.pipes), b.pipes = null, b.pipesCount = 0, b.flowing = !1, y && y.emit("unpipe", this, B), this);
    if (!y) {
      var q = b.pipes, fe = b.pipesCount;
      b.pipes = null, b.pipesCount = 0, b.flowing = !1;
      for (var Z = 0; Z < fe; Z++)
        q[Z].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var ne = ge(b.pipes, y);
    return ne === -1 ? this : (b.pipes.splice(ne, 1), b.pipesCount -= 1, b.pipesCount === 1 && (b.pipes = b.pipes[0]), y.emit("unpipe", this, B), this);
  }, w.prototype.on = function(y, b) {
    var B = s.prototype.on.call(this, y, b);
    if (y === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (y === "readable") {
      var q = this._readableState;
      !q.endEmitted && !q.readableListening && (q.readableListening = q.needReadable = !0, q.emittedReadable = !1, q.reading ? q.length && le(this) : r.nextTick(ue, this));
    }
    return B;
  }, w.prototype.addListener = w.prototype.on;
  function ue(y) {
    p("readable nexttick read 0"), y.read(0);
  }
  w.prototype.resume = function() {
    var y = this._readableState;
    return y.flowing || (p("resume"), y.flowing = !0, x(this, y)), this;
  };
  function x(y, b) {
    b.resumeScheduled || (b.resumeScheduled = !0, r.nextTick(N, y, b));
  }
  function N(y, b) {
    b.reading || (p("resume read 0"), y.read(0)), b.resumeScheduled = !1, b.awaitDrain = 0, y.emit("resume"), W(y), b.flowing && !b.reading && y.read(0);
  }
  w.prototype.pause = function() {
    return p("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (p("pause"), this._readableState.flowing = !1, this.emit("pause")), this;
  };
  function W(y) {
    var b = y._readableState;
    for (p("flow", b.flowing); b.flowing && y.read() !== null; )
      ;
  }
  w.prototype.wrap = function(y) {
    var b = this, B = this._readableState, q = !1;
    y.on("end", function() {
      if (p("wrapped end"), B.decoder && !B.ended) {
        var ne = B.decoder.end();
        ne && ne.length && b.push(ne);
      }
      b.push(null);
    }), y.on("data", function(ne) {
      if (p("wrapped data"), B.decoder && (ne = B.decoder.write(ne)), !(B.objectMode && ne == null) && !(!B.objectMode && (!ne || !ne.length))) {
        var Je = b.push(ne);
        Je || (q = !0, y.pause());
      }
    });
    for (var fe in y)
      this[fe] === void 0 && typeof y[fe] == "function" && (this[fe] = /* @__PURE__ */ (function(ne) {
        return function() {
          return y[ne].apply(y, arguments);
        };
      })(fe));
    for (var Z = 0; Z < S.length; Z++)
      y.on(S[Z], this.emit.bind(this, S[Z]));
    return this._read = function(ne) {
      p("wrapped _read", ne), q && (q = !1, y.resume());
    }, this;
  }, Object.defineProperty(w.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), w._fromList = J;
  function J(y, b) {
    if (b.length === 0) return null;
    var B;
    return b.objectMode ? B = b.buffer.shift() : !y || y >= b.length ? (b.decoder ? B = b.buffer.join("") : b.buffer.length === 1 ? B = b.buffer.head.data : B = b.buffer.concat(b.length), b.buffer.clear()) : B = re(y, b.buffer, b.decoder), B;
  }
  function re(y, b, B) {
    var q;
    return y < b.head.data.length ? (q = b.head.data.slice(0, y), b.head.data = b.head.data.slice(y)) : y === b.head.data.length ? q = b.shift() : q = B ? ae(y, b) : se(y, b), q;
  }
  function ae(y, b) {
    var B = b.head, q = 1, fe = B.data;
    for (y -= fe.length; B = B.next; ) {
      var Z = B.data, ne = y > Z.length ? Z.length : y;
      if (ne === Z.length ? fe += Z : fe += Z.slice(0, y), y -= ne, y === 0) {
        ne === Z.length ? (++q, B.next ? b.head = B.next : b.head = b.tail = null) : (b.head = B, B.data = Z.slice(ne));
        break;
      }
      ++q;
    }
    return b.length -= q, fe;
  }
  function se(y, b) {
    var B = i.allocUnsafe(y), q = b.head, fe = 1;
    for (q.data.copy(B), y -= q.data.length; q = q.next; ) {
      var Z = q.data, ne = y > Z.length ? Z.length : y;
      if (Z.copy(B, B.length - y, 0, ne), y -= ne, y === 0) {
        ne === Z.length ? (++fe, q.next ? b.head = q.next : b.head = b.tail = null) : (b.head = q, q.data = Z.slice(ne));
        break;
      }
      ++fe;
    }
    return b.length -= fe, B;
  }
  function Ee(y) {
    var b = y._readableState;
    if (b.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    b.endEmitted || (b.ended = !0, r.nextTick(ye, b, y));
  }
  function ye(y, b) {
    !y.endEmitted && y.length === 0 && (y.endEmitted = !0, b.readable = !1, b.emit("end"));
  }
  function ge(y, b) {
    for (var B = 0, q = y.length; B < q; B++)
      if (y[B] === b) return B;
    return -1;
  }
  return Wr;
}
var jr, On;
function co() {
  if (On) return jr;
  On = 1, jr = n;
  var r = zt(), e = Object.create($t());
  e.inherits = Vt(), e.inherits(n, r);
  function t(o, u) {
    var f = this._transformState;
    f.transforming = !1;
    var T = f.writecb;
    if (!T)
      return this.emit("error", new Error("write callback called multiple times"));
    f.writechunk = null, f.writecb = null, u != null && this.push(u), T(o);
    var v = this._readableState;
    v.reading = !1, (v.needReadable || v.length < v.highWaterMark) && this._read(v.highWaterMark);
  }
  function n(o) {
    if (!(this instanceof n)) return new n(o);
    r.call(this, o), this._transformState = {
      afterTransform: t.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, o && (typeof o.transform == "function" && (this._transform = o.transform), typeof o.flush == "function" && (this._flush = o.flush)), this.on("prefinish", s);
  }
  function s() {
    var o = this;
    typeof this._flush == "function" ? this._flush(function(u, f) {
      i(o, u, f);
    }) : i(this, null, null);
  }
  n.prototype.push = function(o, u) {
    return this._transformState.needTransform = !1, r.prototype.push.call(this, o, u);
  }, n.prototype._transform = function(o, u, f) {
    throw new Error("_transform() is not implemented");
  }, n.prototype._write = function(o, u, f) {
    var T = this._transformState;
    if (T.writecb = f, T.writechunk = o, T.writeencoding = u, !T.transforming) {
      var v = this._readableState;
      (T.needTransform || v.needReadable || v.length < v.highWaterMark) && this._read(v.highWaterMark);
    }
  }, n.prototype._read = function(o) {
    var u = this._transformState;
    u.writechunk !== null && u.writecb && !u.transforming ? (u.transforming = !0, this._transform(u.writechunk, u.writeencoding, u.afterTransform)) : u.needTransform = !0;
  }, n.prototype._destroy = function(o, u) {
    var f = this;
    r.prototype._destroy.call(this, o, function(T) {
      u(T), f.emit("close");
    });
  };
  function i(o, u, f) {
    if (u) return o.emit("error", u);
    if (f != null && o.push(f), o._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (o._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return o.push(null);
  }
  return jr;
}
var Br, Ln;
function Kh() {
  if (Ln) return Br;
  Ln = 1, Br = t;
  var r = co(), e = Object.create($t());
  e.inherits = Vt(), e.inherits(t, r);
  function t(n) {
    if (!(this instanceof t)) return new t(n);
    r.call(this, n);
  }
  return t.prototype._transform = function(n, s, i) {
    i(null, n);
  }, Br;
}
var Fn;
function fo() {
  return Fn || (Fn = 1, (function(r, e) {
    var t = qi;
    process.env.READABLE_STREAM === "disable" && t ? (r.exports = t, e = r.exports = t.Readable, e.Readable = t.Readable, e.Writable = t.Writable, e.Duplex = t.Duplex, e.Transform = t.Transform, e.PassThrough = t.PassThrough, e.Stream = t) : (e = r.exports = ho(), e.Stream = t || e, e.Readable = e, e.Writable = lo(), e.Duplex = zt(), e.Transform = co(), e.PassThrough = Kh());
  })(nr, nr.exports)), nr.exports;
}
var Mn;
function St() {
  if (Mn) return $e;
  if (Mn = 1, $e.base64 = !0, $e.array = !0, $e.string = !0, $e.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", $e.nodebuffer = typeof Buffer < "u", $e.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u")
    $e.blob = !1;
  else {
    var r = new ArrayBuffer(0);
    try {
      $e.blob = new Blob([r], {
        type: "application/zip"
      }).size === 0;
    } catch {
      try {
        var e = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder, t = new e();
        t.append(r), $e.blob = t.getBlob("application/zip").size === 0;
      } catch {
        $e.blob = !1;
      }
    }
  }
  try {
    $e.nodestream = !!fo().Readable;
  } catch {
    $e.nodestream = !1;
  }
  return $e;
}
var hr = {}, Un;
function uo() {
  if (Un) return hr;
  Un = 1;
  var r = Ie(), e = St(), t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  return hr.encode = function(n) {
    for (var s = [], i, o, u, f, T, v, p, l = 0, g = n.length, E = g, S = r.getTypeOf(n) !== "string"; l < n.length; )
      E = g - l, S ? (i = n[l++], o = l < g ? n[l++] : 0, u = l < g ? n[l++] : 0) : (i = n.charCodeAt(l++), o = l < g ? n.charCodeAt(l++) : 0, u = l < g ? n.charCodeAt(l++) : 0), f = i >> 2, T = (i & 3) << 4 | o >> 4, v = E > 1 ? (o & 15) << 2 | u >> 6 : 64, p = E > 2 ? u & 63 : 64, s.push(t.charAt(f) + t.charAt(T) + t.charAt(v) + t.charAt(p));
    return s.join("");
  }, hr.decode = function(n) {
    var s, i, o, u, f, T, v, p = 0, l = 0, g = "data:";
    if (n.substr(0, g.length) === g)
      throw new Error("Invalid base64 input, it looks like a data url.");
    n = n.replace(/[^A-Za-z0-9+/=]/g, "");
    var E = n.length * 3 / 4;
    if (n.charAt(n.length - 1) === t.charAt(64) && E--, n.charAt(n.length - 2) === t.charAt(64) && E--, E % 1 !== 0)
      throw new Error("Invalid base64 input, bad content length.");
    var S;
    for (e.uint8array ? S = new Uint8Array(E | 0) : S = new Array(E | 0); p < n.length; )
      u = t.indexOf(n.charAt(p++)), f = t.indexOf(n.charAt(p++)), T = t.indexOf(n.charAt(p++)), v = t.indexOf(n.charAt(p++)), s = u << 2 | f >> 4, i = (f & 15) << 4 | T >> 2, o = (T & 3) << 6 | v, S[l++] = s, T !== 64 && (S[l++] = i), v !== 64 && (S[l++] = o);
    return S;
  }, hr;
}
var Hr, Wn;
function yr() {
  return Wn || (Wn = 1, Hr = {
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
    newBufferFrom: function(r, e) {
      if (Buffer.from && Buffer.from !== Uint8Array.from)
        return Buffer.from(r, e);
      if (typeof r == "number")
        throw new Error('The "data" argument must not be a number');
      return new Buffer(r, e);
    },
    /**
     * Create a new nodejs Buffer with the specified size.
     * @param {Integer} size the size of the buffer.
     * @return {Buffer} a new Buffer.
     */
    allocBuffer: function(r) {
      if (Buffer.alloc)
        return Buffer.alloc(r);
      var e = new Buffer(r);
      return e.fill(0), e;
    },
    /**
     * Find out if an object is a Buffer.
     * @param {Object} b the object to test.
     * @return {Boolean} true if the object is a Buffer, false otherwise.
     */
    isBuffer: function(r) {
      return Buffer.isBuffer(r);
    },
    isStream: function(r) {
      return r && typeof r.on == "function" && typeof r.pause == "function" && typeof r.resume == "function";
    }
  }), Hr;
}
var zr, jn;
function Xh() {
  if (jn) return zr;
  jn = 1;
  var r = Be.MutationObserver || Be.WebKitMutationObserver, e;
  if (process.browser)
    if (r) {
      var t = 0, n = new r(f), s = Be.document.createTextNode("");
      n.observe(s, {
        characterData: !0
      }), e = function() {
        s.data = t = ++t % 2;
      };
    } else if (!Be.setImmediate && typeof Be.MessageChannel < "u") {
      var i = new Be.MessageChannel();
      i.port1.onmessage = f, e = function() {
        i.port2.postMessage(0);
      };
    } else "document" in Be && "onreadystatechange" in Be.document.createElement("script") ? e = function() {
      var v = Be.document.createElement("script");
      v.onreadystatechange = function() {
        f(), v.onreadystatechange = null, v.parentNode.removeChild(v), v = null;
      }, Be.document.documentElement.appendChild(v);
    } : e = function() {
      setTimeout(f, 0);
    };
  else
    e = function() {
      process.nextTick(f);
    };
  var o, u = [];
  function f() {
    o = !0;
    for (var v, p, l = u.length; l; ) {
      for (p = u, u = [], v = -1; ++v < l; )
        p[v]();
      l = u.length;
    }
    o = !1;
  }
  zr = T;
  function T(v) {
    u.push(v) === 1 && !o && e();
  }
  return zr;
}
var Gr, Bn;
function Jh() {
  if (Bn) return Gr;
  Bn = 1;
  var r = Xh();
  function e() {
  }
  var t = {}, n = ["REJECTED"], s = ["FULFILLED"], i = ["PENDING"];
  if (!process.browser)
    var o = ["UNHANDLED"];
  Gr = u;
  function u(m) {
    if (typeof m != "function")
      throw new TypeError("resolver must be a function");
    this.state = i, this.queue = [], this.outcome = void 0, process.browser || (this.handled = o), m !== e && p(this, m);
  }
  u.prototype.finally = function(m) {
    if (typeof m != "function")
      return this;
    var w = this.constructor;
    return this.then(A, C);
    function A(O) {
      function j() {
        return O;
      }
      return w.resolve(m()).then(j);
    }
    function C(O) {
      function j() {
        throw O;
      }
      return w.resolve(m()).then(j);
    }
  }, u.prototype.catch = function(m) {
    return this.then(null, m);
  }, u.prototype.then = function(m, w) {
    if (typeof m != "function" && this.state === s || typeof w != "function" && this.state === n)
      return this;
    var A = new this.constructor(e);
    if (process.browser || this.handled === o && (this.handled = null), this.state !== i) {
      var C = this.state === s ? m : w;
      T(A, C, this.outcome);
    } else
      this.queue.push(new f(A, m, w));
    return A;
  };
  function f(m, w, A) {
    this.promise = m, typeof w == "function" && (this.onFulfilled = w, this.callFulfilled = this.otherCallFulfilled), typeof A == "function" && (this.onRejected = A, this.callRejected = this.otherCallRejected);
  }
  f.prototype.callFulfilled = function(m) {
    t.resolve(this.promise, m);
  }, f.prototype.otherCallFulfilled = function(m) {
    T(this.promise, this.onFulfilled, m);
  }, f.prototype.callRejected = function(m) {
    t.reject(this.promise, m);
  }, f.prototype.otherCallRejected = function(m) {
    T(this.promise, this.onRejected, m);
  };
  function T(m, w, A) {
    r(function() {
      var C;
      try {
        C = w(A);
      } catch (O) {
        return t.reject(m, O);
      }
      C === m ? t.reject(m, new TypeError("Cannot resolve promise with itself")) : t.resolve(m, C);
    });
  }
  t.resolve = function(m, w) {
    var A = l(v, w);
    if (A.status === "error")
      return t.reject(m, A.value);
    var C = A.value;
    if (C)
      p(m, C);
    else {
      m.state = s, m.outcome = w;
      for (var O = -1, j = m.queue.length; ++O < j; )
        m.queue[O].callFulfilled(w);
    }
    return m;
  }, t.reject = function(m, w) {
    m.state = n, m.outcome = w, process.browser || m.handled === o && r(function() {
      m.handled === o && process.emit("unhandledRejection", w, m);
    });
    for (var A = -1, C = m.queue.length; ++A < C; )
      m.queue[A].callRejected(w);
    return m;
  };
  function v(m) {
    var w = m && m.then;
    if (m && (typeof m == "object" || typeof m == "function") && typeof w == "function")
      return function() {
        w.apply(m, arguments);
      };
  }
  function p(m, w) {
    var A = !1;
    function C(Y) {
      A || (A = !0, t.reject(m, Y));
    }
    function O(Y) {
      A || (A = !0, t.resolve(m, Y));
    }
    function j() {
      w(O, C);
    }
    var M = l(j);
    M.status === "error" && C(M.value);
  }
  function l(m, w) {
    var A = {};
    try {
      A.value = m(w), A.status = "success";
    } catch (C) {
      A.status = "error", A.value = C;
    }
    return A;
  }
  u.resolve = g;
  function g(m) {
    return m instanceof this ? m : t.resolve(new this(e), m);
  }
  u.reject = E;
  function E(m) {
    var w = new this(e);
    return t.reject(w, m);
  }
  u.all = S;
  function S(m) {
    var w = this;
    if (Object.prototype.toString.call(m) !== "[object Array]")
      return this.reject(new TypeError("must be an array"));
    var A = m.length, C = !1;
    if (!A)
      return this.resolve([]);
    for (var O = new Array(A), j = 0, M = -1, Y = new this(e); ++M < A; )
      ee(m[M], M);
    return Y;
    function ee(te, le) {
      w.resolve(te).then(oe, function($) {
        C || (C = !0, t.reject(Y, $));
      });
      function oe($) {
        O[le] = $, ++j === A && !C && (C = !0, t.resolve(Y, O));
      }
    }
  }
  u.race = R;
  function R(m) {
    var w = this;
    if (Object.prototype.toString.call(m) !== "[object Array]")
      return this.reject(new TypeError("must be an array"));
    var A = m.length, C = !1;
    if (!A)
      return this.resolve([]);
    for (var O = -1, j = new this(e); ++O < A; )
      M(m[O]);
    return j;
    function M(Y) {
      w.resolve(Y).then(function(ee) {
        C || (C = !0, t.resolve(j, ee));
      }, function(ee) {
        C || (C = !0, t.reject(j, ee));
      });
    }
  }
  return Gr;
}
var qr, Hn;
function Kt() {
  if (Hn) return qr;
  Hn = 1;
  var r = null;
  return typeof Promise < "u" ? r = Promise : r = Jh(), qr = {
    Promise: r
  }, qr;
}
var Yr = {}, zn;
function Qh() {
  return zn || (zn = 1, (function(r, e) {
    if (r.setImmediate)
      return;
    var t = 1, n = {}, s = !1, i = r.document, o;
    function u(w) {
      typeof w != "function" && (w = new Function("" + w));
      for (var A = new Array(arguments.length - 1), C = 0; C < A.length; C++)
        A[C] = arguments[C + 1];
      var O = { callback: w, args: A };
      return n[t] = O, o(t), t++;
    }
    function f(w) {
      delete n[w];
    }
    function T(w) {
      var A = w.callback, C = w.args;
      switch (C.length) {
        case 0:
          A();
          break;
        case 1:
          A(C[0]);
          break;
        case 2:
          A(C[0], C[1]);
          break;
        case 3:
          A(C[0], C[1], C[2]);
          break;
        default:
          A.apply(e, C);
          break;
      }
    }
    function v(w) {
      if (s)
        setTimeout(v, 0, w);
      else {
        var A = n[w];
        if (A) {
          s = !0;
          try {
            T(A);
          } finally {
            f(w), s = !1;
          }
        }
      }
    }
    function p() {
      o = function(w) {
        process.nextTick(function() {
          v(w);
        });
      };
    }
    function l() {
      if (r.postMessage && !r.importScripts) {
        var w = !0, A = r.onmessage;
        return r.onmessage = function() {
          w = !1;
        }, r.postMessage("", "*"), r.onmessage = A, w;
      }
    }
    function g() {
      var w = "setImmediate$" + Math.random() + "$", A = function(C) {
        C.source === r && typeof C.data == "string" && C.data.indexOf(w) === 0 && v(+C.data.slice(w.length));
      };
      r.addEventListener ? r.addEventListener("message", A, !1) : r.attachEvent("onmessage", A), o = function(C) {
        r.postMessage(w + C, "*");
      };
    }
    function E() {
      var w = new MessageChannel();
      w.port1.onmessage = function(A) {
        var C = A.data;
        v(C);
      }, o = function(A) {
        w.port2.postMessage(A);
      };
    }
    function S() {
      var w = i.documentElement;
      o = function(A) {
        var C = i.createElement("script");
        C.onreadystatechange = function() {
          v(A), C.onreadystatechange = null, w.removeChild(C), C = null;
        }, w.appendChild(C);
      };
    }
    function R() {
      o = function(w) {
        setTimeout(v, 0, w);
      };
    }
    var m = Object.getPrototypeOf && Object.getPrototypeOf(r);
    m = m && m.setTimeout ? m : r, {}.toString.call(r.process) === "[object process]" ? p() : l() ? g() : r.MessageChannel ? E() : i && "onreadystatechange" in i.createElement("script") ? S() : R(), m.setImmediate = u, m.clearImmediate = f;
  })(typeof self > "u" ? typeof Be > "u" ? Yr : Be : self)), Yr;
}
var Gn;
function Ie() {
  return Gn || (Gn = 1, (function(r) {
    var e = St(), t = uo(), n = yr(), s = Kt();
    Qh();
    function i(l) {
      var g = null;
      return e.uint8array ? g = new Uint8Array(l.length) : g = new Array(l.length), u(l, g);
    }
    r.newBlob = function(l, g) {
      r.checkSupport("blob");
      try {
        return new Blob([l], {
          type: g
        });
      } catch {
        try {
          var E = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder, S = new E();
          return S.append(l), S.getBlob(g);
        } catch {
          throw new Error("Bug : can't construct the Blob.");
        }
      }
    };
    function o(l) {
      return l;
    }
    function u(l, g) {
      for (var E = 0; E < l.length; ++E)
        g[E] = l.charCodeAt(E) & 255;
      return g;
    }
    var f = {
      /**
       * Transform an array of int into a string, chunk by chunk.
       * See the performances notes on arrayLikeToString.
       * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
       * @param {String} type the type of the array.
       * @param {Integer} chunk the chunk size.
       * @return {String} the resulting string.
       * @throws Error if the chunk is too big for the stack.
       */
      stringifyByChunk: function(l, g, E) {
        var S = [], R = 0, m = l.length;
        if (m <= E)
          return String.fromCharCode.apply(null, l);
        for (; R < m; )
          g === "array" || g === "nodebuffer" ? S.push(String.fromCharCode.apply(null, l.slice(R, Math.min(R + E, m)))) : S.push(String.fromCharCode.apply(null, l.subarray(R, Math.min(R + E, m)))), R += E;
        return S.join("");
      },
      /**
       * Call String.fromCharCode on every item in the array.
       * This is the naive implementation, which generate A LOT of intermediate string.
       * This should be used when everything else fail.
       * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
       * @return {String} the result.
       */
      stringifyByChar: function(l) {
        for (var g = "", E = 0; E < l.length; E++)
          g += String.fromCharCode(l[E]);
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
    function T(l) {
      var g = 65536, E = r.getTypeOf(l), S = !0;
      if (E === "uint8array" ? S = f.applyCanBeUsed.uint8array : E === "nodebuffer" && (S = f.applyCanBeUsed.nodebuffer), S)
        for (; g > 1; )
          try {
            return f.stringifyByChunk(l, E, g);
          } catch {
            g = Math.floor(g / 2);
          }
      return f.stringifyByChar(l);
    }
    r.applyFromCharCode = T;
    function v(l, g) {
      for (var E = 0; E < l.length; E++)
        g[E] = l[E];
      return g;
    }
    var p = {};
    p.string = {
      string: o,
      array: function(l) {
        return u(l, new Array(l.length));
      },
      arraybuffer: function(l) {
        return p.string.uint8array(l).buffer;
      },
      uint8array: function(l) {
        return u(l, new Uint8Array(l.length));
      },
      nodebuffer: function(l) {
        return u(l, n.allocBuffer(l.length));
      }
    }, p.array = {
      string: T,
      array: o,
      arraybuffer: function(l) {
        return new Uint8Array(l).buffer;
      },
      uint8array: function(l) {
        return new Uint8Array(l);
      },
      nodebuffer: function(l) {
        return n.newBufferFrom(l);
      }
    }, p.arraybuffer = {
      string: function(l) {
        return T(new Uint8Array(l));
      },
      array: function(l) {
        return v(new Uint8Array(l), new Array(l.byteLength));
      },
      arraybuffer: o,
      uint8array: function(l) {
        return new Uint8Array(l);
      },
      nodebuffer: function(l) {
        return n.newBufferFrom(new Uint8Array(l));
      }
    }, p.uint8array = {
      string: T,
      array: function(l) {
        return v(l, new Array(l.length));
      },
      arraybuffer: function(l) {
        return l.buffer;
      },
      uint8array: o,
      nodebuffer: function(l) {
        return n.newBufferFrom(l);
      }
    }, p.nodebuffer = {
      string: T,
      array: function(l) {
        return v(l, new Array(l.length));
      },
      arraybuffer: function(l) {
        return p.nodebuffer.uint8array(l).buffer;
      },
      uint8array: function(l) {
        return v(l, new Uint8Array(l.length));
      },
      nodebuffer: o
    }, r.transformTo = function(l, g) {
      if (g || (g = ""), !l)
        return g;
      r.checkSupport(l);
      var E = r.getTypeOf(g), S = p[E][l](g);
      return S;
    }, r.resolve = function(l) {
      for (var g = l.split("/"), E = [], S = 0; S < g.length; S++) {
        var R = g[S];
        R === "." || R === "" && S !== 0 && S !== g.length - 1 || (R === ".." ? E.pop() : E.push(R));
      }
      return E.join("/");
    }, r.getTypeOf = function(l) {
      if (typeof l == "string")
        return "string";
      if (Object.prototype.toString.call(l) === "[object Array]")
        return "array";
      if (e.nodebuffer && n.isBuffer(l))
        return "nodebuffer";
      if (e.uint8array && l instanceof Uint8Array)
        return "uint8array";
      if (e.arraybuffer && l instanceof ArrayBuffer)
        return "arraybuffer";
    }, r.checkSupport = function(l) {
      var g = e[l.toLowerCase()];
      if (!g)
        throw new Error(l + " is not supported by this platform");
    }, r.MAX_VALUE_16BITS = 65535, r.MAX_VALUE_32BITS = -1, r.pretty = function(l) {
      var g = "", E, S;
      for (S = 0; S < (l || "").length; S++)
        E = l.charCodeAt(S), g += "\\x" + (E < 16 ? "0" : "") + E.toString(16).toUpperCase();
      return g;
    }, r.delay = function(l, g, E) {
      setImmediate(function() {
        l.apply(E || null, g || []);
      });
    }, r.inherits = function(l, g) {
      var E = function() {
      };
      E.prototype = g.prototype, l.prototype = new E();
    }, r.extend = function() {
      var l = {}, g, E;
      for (g = 0; g < arguments.length; g++)
        for (E in arguments[g])
          Object.prototype.hasOwnProperty.call(arguments[g], E) && typeof l[E] > "u" && (l[E] = arguments[g][E]);
      return l;
    }, r.prepareContent = function(l, g, E, S, R) {
      var m = s.Promise.resolve(g).then(function(w) {
        var A = e.blob && (w instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(w)) !== -1);
        return A && typeof FileReader < "u" ? new s.Promise(function(C, O) {
          var j = new FileReader();
          j.onload = function(M) {
            C(M.target.result);
          }, j.onerror = function(M) {
            O(M.target.error);
          }, j.readAsArrayBuffer(w);
        }) : w;
      });
      return m.then(function(w) {
        var A = r.getTypeOf(w);
        return A ? (A === "arraybuffer" ? w = r.transformTo("uint8array", w) : A === "string" && (R ? w = t.decode(w) : E && S !== !0 && (w = i(w))), w) : s.Promise.reject(
          new Error("Can't read the data of '" + l + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
        );
      });
    };
  })(Cr)), Cr;
}
var Zr, qn;
function nt() {
  if (qn) return Zr;
  qn = 1;
  function r(e) {
    this.name = e || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
      data: [],
      end: [],
      error: []
    }, this.previous = null;
  }
  return r.prototype = {
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
  }, Zr = r, Zr;
}
var Yn;
function Xt() {
  return Yn || (Yn = 1, (function(r) {
    for (var e = Ie(), t = St(), n = yr(), s = nt(), i = new Array(256), o = 0; o < 256; o++)
      i[o] = o >= 252 ? 6 : o >= 248 ? 5 : o >= 240 ? 4 : o >= 224 ? 3 : o >= 192 ? 2 : 1;
    i[254] = i[254] = 1;
    var u = function(l) {
      var g, E, S, R, m, w = l.length, A = 0;
      for (R = 0; R < w; R++)
        E = l.charCodeAt(R), (E & 64512) === 55296 && R + 1 < w && (S = l.charCodeAt(R + 1), (S & 64512) === 56320 && (E = 65536 + (E - 55296 << 10) + (S - 56320), R++)), A += E < 128 ? 1 : E < 2048 ? 2 : E < 65536 ? 3 : 4;
      for (t.uint8array ? g = new Uint8Array(A) : g = new Array(A), m = 0, R = 0; m < A; R++)
        E = l.charCodeAt(R), (E & 64512) === 55296 && R + 1 < w && (S = l.charCodeAt(R + 1), (S & 64512) === 56320 && (E = 65536 + (E - 55296 << 10) + (S - 56320), R++)), E < 128 ? g[m++] = E : E < 2048 ? (g[m++] = 192 | E >>> 6, g[m++] = 128 | E & 63) : E < 65536 ? (g[m++] = 224 | E >>> 12, g[m++] = 128 | E >>> 6 & 63, g[m++] = 128 | E & 63) : (g[m++] = 240 | E >>> 18, g[m++] = 128 | E >>> 12 & 63, g[m++] = 128 | E >>> 6 & 63, g[m++] = 128 | E & 63);
      return g;
    }, f = function(l, g) {
      var E;
      for (g = g || l.length, g > l.length && (g = l.length), E = g - 1; E >= 0 && (l[E] & 192) === 128; )
        E--;
      return E < 0 || E === 0 ? g : E + i[l[E]] > g ? E : g;
    }, T = function(l) {
      var g, E, S, R, m = l.length, w = new Array(m * 2);
      for (E = 0, g = 0; g < m; ) {
        if (S = l[g++], S < 128) {
          w[E++] = S;
          continue;
        }
        if (R = i[S], R > 4) {
          w[E++] = 65533, g += R - 1;
          continue;
        }
        for (S &= R === 2 ? 31 : R === 3 ? 15 : 7; R > 1 && g < m; )
          S = S << 6 | l[g++] & 63, R--;
        if (R > 1) {
          w[E++] = 65533;
          continue;
        }
        S < 65536 ? w[E++] = S : (S -= 65536, w[E++] = 55296 | S >> 10 & 1023, w[E++] = 56320 | S & 1023);
      }
      return w.length !== E && (w.subarray ? w = w.subarray(0, E) : w.length = E), e.applyFromCharCode(w);
    };
    r.utf8encode = function(g) {
      return t.nodebuffer ? n.newBufferFrom(g, "utf-8") : u(g);
    }, r.utf8decode = function(g) {
      return t.nodebuffer ? e.transformTo("nodebuffer", g).toString("utf-8") : (g = e.transformTo(t.uint8array ? "uint8array" : "array", g), T(g));
    };
    function v() {
      s.call(this, "utf-8 decode"), this.leftOver = null;
    }
    e.inherits(v, s), v.prototype.processChunk = function(l) {
      var g = e.transformTo(t.uint8array ? "uint8array" : "array", l.data);
      if (this.leftOver && this.leftOver.length) {
        if (t.uint8array) {
          var E = g;
          g = new Uint8Array(E.length + this.leftOver.length), g.set(this.leftOver, 0), g.set(E, this.leftOver.length);
        } else
          g = this.leftOver.concat(g);
        this.leftOver = null;
      }
      var S = f(g), R = g;
      S !== g.length && (t.uint8array ? (R = g.subarray(0, S), this.leftOver = g.subarray(S, g.length)) : (R = g.slice(0, S), this.leftOver = g.slice(S, g.length))), this.push({
        data: r.utf8decode(R),
        meta: l.meta
      });
    }, v.prototype.flush = function() {
      this.leftOver && this.leftOver.length && (this.push({
        data: r.utf8decode(this.leftOver),
        meta: {}
      }), this.leftOver = null);
    }, r.Utf8DecodeWorker = v;
    function p() {
      s.call(this, "utf-8 encode");
    }
    e.inherits(p, s), p.prototype.processChunk = function(l) {
      this.push({
        data: r.utf8encode(l.data),
        meta: l.meta
      });
    }, r.Utf8EncodeWorker = p;
  })(Dr)), Dr;
}
var $r, Zn;
function ec() {
  if (Zn) return $r;
  Zn = 1;
  var r = nt(), e = Ie();
  function t(n) {
    r.call(this, "ConvertWorker to " + n), this.destType = n;
  }
  return e.inherits(t, r), t.prototype.processChunk = function(n) {
    this.push({
      data: e.transformTo(this.destType, n.data),
      meta: n.meta
    });
  }, $r = t, $r;
}
var Vr, $n;
function tc() {
  if ($n) return Vr;
  $n = 1;
  var r = fo().Readable, e = Ie();
  e.inherits(t, r);
  function t(n, s, i) {
    r.call(this, s), this._helper = n;
    var o = this;
    n.on("data", function(u, f) {
      o.push(u) || o._helper.pause(), i && i(f);
    }).on("error", function(u) {
      o.emit("error", u);
    }).on("end", function() {
      o.push(null);
    });
  }
  return t.prototype._read = function() {
    this._helper.resume();
  }, Vr = t, Vr;
}
var Kr, Vn;
function po() {
  if (Vn) return Kr;
  Vn = 1;
  var r = Ie(), e = ec(), t = nt(), n = uo(), s = St(), i = Kt(), o = null;
  if (s.nodestream)
    try {
      o = tc();
    } catch {
    }
  function u(p, l, g) {
    switch (p) {
      case "blob":
        return r.newBlob(r.transformTo("arraybuffer", l), g);
      case "base64":
        return n.encode(l);
      default:
        return r.transformTo(p, l);
    }
  }
  function f(p, l) {
    var g, E = 0, S = null, R = 0;
    for (g = 0; g < l.length; g++)
      R += l[g].length;
    switch (p) {
      case "string":
        return l.join("");
      case "array":
        return Array.prototype.concat.apply([], l);
      case "uint8array":
        for (S = new Uint8Array(R), g = 0; g < l.length; g++)
          S.set(l[g], E), E += l[g].length;
        return S;
      case "nodebuffer":
        return Buffer.concat(l);
      default:
        throw new Error("concat : unsupported type '" + p + "'");
    }
  }
  function T(p, l) {
    return new i.Promise(function(g, E) {
      var S = [], R = p._internalType, m = p._outputType, w = p._mimeType;
      p.on("data", function(A, C) {
        S.push(A), l && l(C);
      }).on("error", function(A) {
        S = [], E(A);
      }).on("end", function() {
        try {
          var A = u(m, f(R, S), w);
          g(A);
        } catch (C) {
          E(C);
        }
        S = [];
      }).resume();
    });
  }
  function v(p, l, g) {
    var E = l;
    switch (l) {
      case "blob":
      case "arraybuffer":
        E = "uint8array";
        break;
      case "base64":
        E = "string";
        break;
    }
    try {
      this._internalType = E, this._outputType = l, this._mimeType = g, r.checkSupport(E), this._worker = p.pipe(new e(E)), p.lock();
    } catch (S) {
      this._worker = new t("error"), this._worker.error(S);
    }
  }
  return v.prototype = {
    /**
     * Listen a StreamHelper, accumulate its content and concatenate it into a
     * complete block.
     * @param {Function} updateCb the update callback.
     * @return Promise the promise for the accumulation.
     */
    accumulate: function(p) {
      return T(this, p);
    },
    /**
     * Add a listener on an event triggered on a stream.
     * @param {String} evt the name of the event
     * @param {Function} fn the listener
     * @return {StreamHelper} the current helper.
     */
    on: function(p, l) {
      var g = this;
      return p === "data" ? this._worker.on(p, function(E) {
        l.call(g, E.data, E.meta);
      }) : this._worker.on(p, function() {
        r.delay(l, arguments, g);
      }), this;
    },
    /**
     * Resume the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    resume: function() {
      return r.delay(this._worker.resume, [], this._worker), this;
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
    toNodejsStream: function(p) {
      if (r.checkSupport("nodestream"), this._outputType !== "nodebuffer")
        throw new Error(this._outputType + " is not supported by this method");
      return new o(this, {
        objectMode: this._outputType !== "nodebuffer"
      }, p);
    }
  }, Kr = v, Kr;
}
var rt = {}, Kn;
function go() {
  return Kn || (Kn = 1, rt.base64 = !1, rt.binary = !1, rt.dir = !1, rt.createFolders = !0, rt.date = null, rt.compression = null, rt.compressionOptions = null, rt.comment = null, rt.unixPermissions = null, rt.dosPermissions = null), rt;
}
var Xr, Xn;
function mo() {
  if (Xn) return Xr;
  Xn = 1;
  var r = Ie(), e = nt(), t = 16 * 1024;
  function n(s) {
    e.call(this, "DataWorker");
    var i = this;
    this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, s.then(function(o) {
      i.dataIsReady = !0, i.data = o, i.max = o && o.length || 0, i.type = r.getTypeOf(o), i.isPaused || i._tickAndRepeat();
    }, function(o) {
      i.error(o);
    });
  }
  return r.inherits(n, e), n.prototype.cleanUp = function() {
    e.prototype.cleanUp.call(this), this.data = null;
  }, n.prototype.resume = function() {
    return e.prototype.resume.call(this) ? (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, r.delay(this._tickAndRepeat, [], this)), !0) : !1;
  }, n.prototype._tickAndRepeat = function() {
    this._tickScheduled = !1, !(this.isPaused || this.isFinished) && (this._tick(), this.isFinished || (r.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
  }, n.prototype._tick = function() {
    if (this.isPaused || this.isFinished)
      return !1;
    var s = t, i = null, o = Math.min(this.max, this.index + s);
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
  }, Xr = n, Xr;
}
var Jr, Jn;
function ja() {
  if (Jn) return Jr;
  Jn = 1;
  var r = Ie();
  function e() {
    for (var i, o = [], u = 0; u < 256; u++) {
      i = u;
      for (var f = 0; f < 8; f++)
        i = i & 1 ? 3988292384 ^ i >>> 1 : i >>> 1;
      o[u] = i;
    }
    return o;
  }
  var t = e();
  function n(i, o, u, f) {
    var T = t, v = f + u;
    i = i ^ -1;
    for (var p = f; p < v; p++)
      i = i >>> 8 ^ T[(i ^ o[p]) & 255];
    return i ^ -1;
  }
  function s(i, o, u, f) {
    var T = t, v = f + u;
    i = i ^ -1;
    for (var p = f; p < v; p++)
      i = i >>> 8 ^ T[(i ^ o.charCodeAt(p)) & 255];
    return i ^ -1;
  }
  return Jr = function(o, u) {
    if (typeof o > "u" || !o.length)
      return 0;
    var f = r.getTypeOf(o) !== "string";
    return f ? n(u | 0, o, o.length, 0) : s(u | 0, o, o.length, 0);
  }, Jr;
}
var Qr, Qn;
function _o() {
  if (Qn) return Qr;
  Qn = 1;
  var r = nt(), e = ja(), t = Ie();
  function n() {
    r.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
  }
  return t.inherits(n, r), n.prototype.processChunk = function(s) {
    this.streamInfo.crc32 = e(s.data, this.streamInfo.crc32 || 0), this.push(s);
  }, Qr = n, Qr;
}
var ea, ei;
function rc() {
  if (ei) return ea;
  ei = 1;
  var r = Ie(), e = nt();
  function t(n) {
    e.call(this, "DataLengthProbe for " + n), this.propName = n, this.withStreamInfo(n, 0);
  }
  return r.inherits(t, e), t.prototype.processChunk = function(n) {
    if (n) {
      var s = this.streamInfo[this.propName] || 0;
      this.streamInfo[this.propName] = s + n.data.length;
    }
    e.prototype.processChunk.call(this, n);
  }, ea = t, ea;
}
var ta, ti;
function Ba() {
  if (ti) return ta;
  ti = 1;
  var r = Kt(), e = mo(), t = _o(), n = rc();
  function s(i, o, u, f, T) {
    this.compressedSize = i, this.uncompressedSize = o, this.crc32 = u, this.compression = f, this.compressedContent = T;
  }
  return s.prototype = {
    /**
     * Create a worker to get the uncompressed content.
     * @return {GenericWorker} the worker.
     */
    getContentWorker: function() {
      var i = new e(r.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new n("data_length")), o = this;
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
      return new e(r.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
    }
  }, s.createWorkerFrom = function(i, o, u) {
    return i.pipe(new t()).pipe(new n("uncompressedSize")).pipe(o.compressWorker(u)).pipe(new n("compressedSize")).withStreamInfo("compression", o);
  }, ta = s, ta;
}
var ra, ri;
function ac() {
  if (ri) return ra;
  ri = 1;
  var r = po(), e = mo(), t = Xt(), n = Ba(), s = nt(), i = function(T, v, p) {
    this.name = T, this.dir = p.dir, this.date = p.date, this.comment = p.comment, this.unixPermissions = p.unixPermissions, this.dosPermissions = p.dosPermissions, this._data = v, this._dataBinary = p.binary, this.options = {
      compression: p.compression,
      compressionOptions: p.compressionOptions
    };
  };
  i.prototype = {
    /**
     * Create an internal stream for the content of this object.
     * @param {String} type the type of each chunk.
     * @return StreamHelper the stream.
     */
    internalStream: function(T) {
      var v = null, p = "string";
      try {
        if (!T)
          throw new Error("No output type specified.");
        p = T.toLowerCase();
        var l = p === "string" || p === "text";
        (p === "binarystring" || p === "text") && (p = "string"), v = this._decompressWorker();
        var g = !this._dataBinary;
        g && !l && (v = v.pipe(new t.Utf8EncodeWorker())), !g && l && (v = v.pipe(new t.Utf8DecodeWorker()));
      } catch (E) {
        v = new s("error"), v.error(E);
      }
      return new r(v, p, "");
    },
    /**
     * Prepare the content in the asked type.
     * @param {String} type the type of the result.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Promise the promise of the result.
     */
    async: function(T, v) {
      return this.internalStream(T).accumulate(v);
    },
    /**
     * Prepare the content as a nodejs stream.
     * @param {String} type the type of each chunk.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Stream the stream.
     */
    nodeStream: function(T, v) {
      return this.internalStream(T || "nodebuffer").toNodejsStream(v);
    },
    /**
     * Return a worker for the compressed content.
     * @private
     * @param {Object} compression the compression object to use.
     * @param {Object} compressionOptions the options to use when compressing.
     * @return Worker the worker.
     */
    _compressWorker: function(T, v) {
      if (this._data instanceof n && this._data.compression.magic === T.magic)
        return this._data.getCompressedWorker();
      var p = this._decompressWorker();
      return this._dataBinary || (p = p.pipe(new t.Utf8EncodeWorker())), n.createWorkerFrom(p, T, v);
    },
    /**
     * Return a worker for the decompressed content.
     * @private
     * @return Worker the worker.
     */
    _decompressWorker: function() {
      return this._data instanceof n ? this._data.getContentWorker() : this._data instanceof s ? this._data : new e(this._data);
    }
  };
  for (var o = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], u = function() {
    throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
  }, f = 0; f < o.length; f++)
    i.prototype[o[f]] = u;
  return ra = i, ra;
}
var aa = {}, cr = {}, qt = {}, na = {}, ai;
function At() {
  return ai || (ai = 1, (function(r) {
    var e = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
    function t(i, o) {
      return Object.prototype.hasOwnProperty.call(i, o);
    }
    r.assign = function(i) {
      for (var o = Array.prototype.slice.call(arguments, 1); o.length; ) {
        var u = o.shift();
        if (u) {
          if (typeof u != "object")
            throw new TypeError(u + "must be non-object");
          for (var f in u)
            t(u, f) && (i[f] = u[f]);
        }
      }
      return i;
    }, r.shrinkBuf = function(i, o) {
      return i.length === o ? i : i.subarray ? i.subarray(0, o) : (i.length = o, i);
    };
    var n = {
      arraySet: function(i, o, u, f, T) {
        if (o.subarray && i.subarray) {
          i.set(o.subarray(u, u + f), T);
          return;
        }
        for (var v = 0; v < f; v++)
          i[T + v] = o[u + v];
      },
      // Join array of chunks to single array.
      flattenChunks: function(i) {
        var o, u, f, T, v, p;
        for (f = 0, o = 0, u = i.length; o < u; o++)
          f += i[o].length;
        for (p = new Uint8Array(f), T = 0, o = 0, u = i.length; o < u; o++)
          v = i[o], p.set(v, T), T += v.length;
        return p;
      }
    }, s = {
      arraySet: function(i, o, u, f, T) {
        for (var v = 0; v < f; v++)
          i[T + v] = o[u + v];
      },
      // Join array of chunks to single array.
      flattenChunks: function(i) {
        return [].concat.apply([], i);
      }
    };
    r.setTyped = function(i) {
      i ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, n)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, s));
    }, r.setTyped(e);
  })(na)), na;
}
var Wt = {}, it = {}, Rt = {}, ni;
function nc() {
  if (ni) return Rt;
  ni = 1;
  var r = At(), e = 4, t = 0, n = 1, s = 2;
  function i(_) {
    for (var H = _.length; --H >= 0; )
      _[H] = 0;
  }
  var o = 0, u = 1, f = 2, T = 3, v = 258, p = 29, l = 256, g = l + 1 + p, E = 30, S = 19, R = 2 * g + 1, m = 15, w = 16, A = 7, C = 256, O = 16, j = 17, M = 18, Y = (
    /* extra bits for each length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  ), ee = (
    /* extra bits for each distance code */
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
  ), te = (
    /* extra bits for each bit length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
  ), le = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], oe = 512, $ = new Array((g + 2) * 2);
  i($);
  var ce = new Array(E * 2);
  i(ce);
  var ve = new Array(oe);
  i(ve);
  var ue = new Array(v - T + 1);
  i(ue);
  var x = new Array(p);
  i(x);
  var N = new Array(E);
  i(N);
  function W(_, H, G, X, D) {
    this.static_tree = _, this.extra_bits = H, this.extra_base = G, this.elems = X, this.max_length = D, this.has_stree = _ && _.length;
  }
  var J, re, ae;
  function se(_, H) {
    this.dyn_tree = _, this.max_code = 0, this.stat_desc = H;
  }
  function Ee(_) {
    return _ < 256 ? ve[_] : ve[256 + (_ >>> 7)];
  }
  function ye(_, H) {
    _.pending_buf[_.pending++] = H & 255, _.pending_buf[_.pending++] = H >>> 8 & 255;
  }
  function ge(_, H, G) {
    _.bi_valid > w - G ? (_.bi_buf |= H << _.bi_valid & 65535, ye(_, _.bi_buf), _.bi_buf = H >> w - _.bi_valid, _.bi_valid += G - w) : (_.bi_buf |= H << _.bi_valid & 65535, _.bi_valid += G);
  }
  function y(_, H, G) {
    ge(
      _,
      G[H * 2],
      G[H * 2 + 1]
      /*.Len*/
    );
  }
  function b(_, H) {
    var G = 0;
    do
      G |= _ & 1, _ >>>= 1, G <<= 1;
    while (--H > 0);
    return G >>> 1;
  }
  function B(_) {
    _.bi_valid === 16 ? (ye(_, _.bi_buf), _.bi_buf = 0, _.bi_valid = 0) : _.bi_valid >= 8 && (_.pending_buf[_.pending++] = _.bi_buf & 255, _.bi_buf >>= 8, _.bi_valid -= 8);
  }
  function q(_, H) {
    var G = H.dyn_tree, X = H.max_code, D = H.stat_desc.static_tree, F = H.stat_desc.has_stree, c = H.stat_desc.extra_bits, z = H.stat_desc.extra_base, ie = H.stat_desc.max_length, a, k, L, d, I, P, Q = 0;
    for (d = 0; d <= m; d++)
      _.bl_count[d] = 0;
    for (G[_.heap[_.heap_max] * 2 + 1] = 0, a = _.heap_max + 1; a < R; a++)
      k = _.heap[a], d = G[G[k * 2 + 1] * 2 + 1] + 1, d > ie && (d = ie, Q++), G[k * 2 + 1] = d, !(k > X) && (_.bl_count[d]++, I = 0, k >= z && (I = c[k - z]), P = G[k * 2], _.opt_len += P * (d + I), F && (_.static_len += P * (D[k * 2 + 1] + I)));
    if (Q !== 0) {
      do {
        for (d = ie - 1; _.bl_count[d] === 0; )
          d--;
        _.bl_count[d]--, _.bl_count[d + 1] += 2, _.bl_count[ie]--, Q -= 2;
      } while (Q > 0);
      for (d = ie; d !== 0; d--)
        for (k = _.bl_count[d]; k !== 0; )
          L = _.heap[--a], !(L > X) && (G[L * 2 + 1] !== d && (_.opt_len += (d - G[L * 2 + 1]) * G[L * 2], G[L * 2 + 1] = d), k--);
    }
  }
  function fe(_, H, G) {
    var X = new Array(m + 1), D = 0, F, c;
    for (F = 1; F <= m; F++)
      X[F] = D = D + G[F - 1] << 1;
    for (c = 0; c <= H; c++) {
      var z = _[c * 2 + 1];
      z !== 0 && (_[c * 2] = b(X[z]++, z));
    }
  }
  function Z() {
    var _, H, G, X, D, F = new Array(m + 1);
    for (G = 0, X = 0; X < p - 1; X++)
      for (x[X] = G, _ = 0; _ < 1 << Y[X]; _++)
        ue[G++] = X;
    for (ue[G - 1] = X, D = 0, X = 0; X < 16; X++)
      for (N[X] = D, _ = 0; _ < 1 << ee[X]; _++)
        ve[D++] = X;
    for (D >>= 7; X < E; X++)
      for (N[X] = D << 7, _ = 0; _ < 1 << ee[X] - 7; _++)
        ve[256 + D++] = X;
    for (H = 0; H <= m; H++)
      F[H] = 0;
    for (_ = 0; _ <= 143; )
      $[_ * 2 + 1] = 8, _++, F[8]++;
    for (; _ <= 255; )
      $[_ * 2 + 1] = 9, _++, F[9]++;
    for (; _ <= 279; )
      $[_ * 2 + 1] = 7, _++, F[7]++;
    for (; _ <= 287; )
      $[_ * 2 + 1] = 8, _++, F[8]++;
    for (fe($, g + 1, F), _ = 0; _ < E; _++)
      ce[_ * 2 + 1] = 5, ce[_ * 2] = b(_, 5);
    J = new W($, Y, l + 1, g, m), re = new W(ce, ee, 0, E, m), ae = new W(new Array(0), te, 0, S, A);
  }
  function ne(_) {
    var H;
    for (H = 0; H < g; H++)
      _.dyn_ltree[H * 2] = 0;
    for (H = 0; H < E; H++)
      _.dyn_dtree[H * 2] = 0;
    for (H = 0; H < S; H++)
      _.bl_tree[H * 2] = 0;
    _.dyn_ltree[C * 2] = 1, _.opt_len = _.static_len = 0, _.last_lit = _.matches = 0;
  }
  function Je(_) {
    _.bi_valid > 8 ? ye(_, _.bi_buf) : _.bi_valid > 0 && (_.pending_buf[_.pending++] = _.bi_buf), _.bi_buf = 0, _.bi_valid = 0;
  }
  function Fe(_, H, G, X) {
    Je(_), ye(_, G), ye(_, ~G), r.arraySet(_.pending_buf, _.window, H, G, _.pending), _.pending += G;
  }
  function Me(_, H, G, X) {
    var D = H * 2, F = G * 2;
    return _[D] < _[F] || _[D] === _[F] && X[H] <= X[G];
  }
  function be(_, H, G) {
    for (var X = _.heap[G], D = G << 1; D <= _.heap_len && (D < _.heap_len && Me(H, _.heap[D + 1], _.heap[D], _.depth) && D++, !Me(H, X, _.heap[D], _.depth)); )
      _.heap[G] = _.heap[D], G = D, D <<= 1;
    _.heap[G] = X;
  }
  function de(_, H, G) {
    var X, D, F = 0, c, z;
    if (_.last_lit !== 0)
      do
        X = _.pending_buf[_.d_buf + F * 2] << 8 | _.pending_buf[_.d_buf + F * 2 + 1], D = _.pending_buf[_.l_buf + F], F++, X === 0 ? y(_, D, H) : (c = ue[D], y(_, c + l + 1, H), z = Y[c], z !== 0 && (D -= x[c], ge(_, D, z)), X--, c = Ee(X), y(_, c, G), z = ee[c], z !== 0 && (X -= N[c], ge(_, X, z)));
      while (F < _.last_lit);
    y(_, C, H);
  }
  function He(_, H) {
    var G = H.dyn_tree, X = H.stat_desc.static_tree, D = H.stat_desc.has_stree, F = H.stat_desc.elems, c, z, ie = -1, a;
    for (_.heap_len = 0, _.heap_max = R, c = 0; c < F; c++)
      G[c * 2] !== 0 ? (_.heap[++_.heap_len] = ie = c, _.depth[c] = 0) : G[c * 2 + 1] = 0;
    for (; _.heap_len < 2; )
      a = _.heap[++_.heap_len] = ie < 2 ? ++ie : 0, G[a * 2] = 1, _.depth[a] = 0, _.opt_len--, D && (_.static_len -= X[a * 2 + 1]);
    for (H.max_code = ie, c = _.heap_len >> 1; c >= 1; c--)
      be(_, G, c);
    a = F;
    do
      c = _.heap[
        1
        /*SMALLEST*/
      ], _.heap[
        1
        /*SMALLEST*/
      ] = _.heap[_.heap_len--], be(
        _,
        G,
        1
        /*SMALLEST*/
      ), z = _.heap[
        1
        /*SMALLEST*/
      ], _.heap[--_.heap_max] = c, _.heap[--_.heap_max] = z, G[a * 2] = G[c * 2] + G[z * 2], _.depth[a] = (_.depth[c] >= _.depth[z] ? _.depth[c] : _.depth[z]) + 1, G[c * 2 + 1] = G[z * 2 + 1] = a, _.heap[
        1
        /*SMALLEST*/
      ] = a++, be(
        _,
        G,
        1
        /*SMALLEST*/
      );
    while (_.heap_len >= 2);
    _.heap[--_.heap_max] = _.heap[
      1
      /*SMALLEST*/
    ], q(_, H), fe(G, ie, _.bl_count);
  }
  function ht(_, H, G) {
    var X, D = -1, F, c = H[1], z = 0, ie = 7, a = 4;
    for (c === 0 && (ie = 138, a = 3), H[(G + 1) * 2 + 1] = 65535, X = 0; X <= G; X++)
      F = c, c = H[(X + 1) * 2 + 1], !(++z < ie && F === c) && (z < a ? _.bl_tree[F * 2] += z : F !== 0 ? (F !== D && _.bl_tree[F * 2]++, _.bl_tree[O * 2]++) : z <= 10 ? _.bl_tree[j * 2]++ : _.bl_tree[M * 2]++, z = 0, D = F, c === 0 ? (ie = 138, a = 3) : F === c ? (ie = 6, a = 3) : (ie = 7, a = 4));
  }
  function Qe(_, H, G) {
    var X, D = -1, F, c = H[1], z = 0, ie = 7, a = 4;
    for (c === 0 && (ie = 138, a = 3), X = 0; X <= G; X++)
      if (F = c, c = H[(X + 1) * 2 + 1], !(++z < ie && F === c)) {
        if (z < a)
          do
            y(_, F, _.bl_tree);
          while (--z !== 0);
        else F !== 0 ? (F !== D && (y(_, F, _.bl_tree), z--), y(_, O, _.bl_tree), ge(_, z - 3, 2)) : z <= 10 ? (y(_, j, _.bl_tree), ge(_, z - 3, 3)) : (y(_, M, _.bl_tree), ge(_, z - 11, 7));
        z = 0, D = F, c === 0 ? (ie = 138, a = 3) : F === c ? (ie = 6, a = 3) : (ie = 7, a = 4);
      }
  }
  function Ue(_) {
    var H;
    for (ht(_, _.dyn_ltree, _.l_desc.max_code), ht(_, _.dyn_dtree, _.d_desc.max_code), He(_, _.bl_desc), H = S - 1; H >= 3 && _.bl_tree[le[H] * 2 + 1] === 0; H--)
      ;
    return _.opt_len += 3 * (H + 1) + 5 + 5 + 4, H;
  }
  function et(_, H, G, X) {
    var D;
    for (ge(_, H - 257, 5), ge(_, G - 1, 5), ge(_, X - 4, 4), D = 0; D < X; D++)
      ge(_, _.bl_tree[le[D] * 2 + 1], 3);
    Qe(_, _.dyn_ltree, H - 1), Qe(_, _.dyn_dtree, G - 1);
  }
  function ze(_) {
    var H = 4093624447, G;
    for (G = 0; G <= 31; G++, H >>>= 1)
      if (H & 1 && _.dyn_ltree[G * 2] !== 0)
        return t;
    if (_.dyn_ltree[18] !== 0 || _.dyn_ltree[20] !== 0 || _.dyn_ltree[26] !== 0)
      return n;
    for (G = 32; G < l; G++)
      if (_.dyn_ltree[G * 2] !== 0)
        return n;
    return t;
  }
  var ke = !1;
  function kt(_) {
    ke || (Z(), ke = !0), _.l_desc = new se(_.dyn_ltree, J), _.d_desc = new se(_.dyn_dtree, re), _.bl_desc = new se(_.bl_tree, ae), _.bi_buf = 0, _.bi_valid = 0, ne(_);
  }
  function vt(_, H, G, X) {
    ge(_, (o << 1) + (X ? 1 : 0), 3), Fe(_, H, G);
  }
  function We(_) {
    ge(_, u << 1, 3), y(_, C, $), B(_);
  }
  function ct(_, H, G, X) {
    var D, F, c = 0;
    _.level > 0 ? (_.strm.data_type === s && (_.strm.data_type = ze(_)), He(_, _.l_desc), He(_, _.d_desc), c = Ue(_), D = _.opt_len + 3 + 7 >>> 3, F = _.static_len + 3 + 7 >>> 3, F <= D && (D = F)) : D = F = G + 5, G + 4 <= D && H !== -1 ? vt(_, H, G, X) : _.strategy === e || F === D ? (ge(_, (u << 1) + (X ? 1 : 0), 3), de(_, $, ce)) : (ge(_, (f << 1) + (X ? 1 : 0), 3), et(_, _.l_desc.max_code + 1, _.d_desc.max_code + 1, c + 1), de(_, _.dyn_ltree, _.dyn_dtree)), ne(_), X && Je(_);
  }
  function Ot(_, H, G) {
    return _.pending_buf[_.d_buf + _.last_lit * 2] = H >>> 8 & 255, _.pending_buf[_.d_buf + _.last_lit * 2 + 1] = H & 255, _.pending_buf[_.l_buf + _.last_lit] = G & 255, _.last_lit++, H === 0 ? _.dyn_ltree[G * 2]++ : (_.matches++, H--, _.dyn_ltree[(ue[G] + l + 1) * 2]++, _.dyn_dtree[Ee(H) * 2]++), _.last_lit === _.lit_bufsize - 1;
  }
  return Rt._tr_init = kt, Rt._tr_stored_block = vt, Rt._tr_flush_block = ct, Rt._tr_tally = Ot, Rt._tr_align = We, Rt;
}
var ia, ii;
function wo() {
  if (ii) return ia;
  ii = 1;
  function r(e, t, n, s) {
    for (var i = e & 65535 | 0, o = e >>> 16 & 65535 | 0, u = 0; n !== 0; ) {
      u = n > 2e3 ? 2e3 : n, n -= u;
      do
        i = i + t[s++] | 0, o = o + i | 0;
      while (--u);
      i %= 65521, o %= 65521;
    }
    return i | o << 16 | 0;
  }
  return ia = r, ia;
}
var oa, oi;
function vo() {
  if (oi) return oa;
  oi = 1;
  function r() {
    for (var n, s = [], i = 0; i < 256; i++) {
      n = i;
      for (var o = 0; o < 8; o++)
        n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
      s[i] = n;
    }
    return s;
  }
  var e = r();
  function t(n, s, i, o) {
    var u = e, f = o + i;
    n ^= -1;
    for (var T = o; T < f; T++)
      n = n >>> 8 ^ u[(n ^ s[T]) & 255];
    return n ^ -1;
  }
  return oa = t, oa;
}
var sa, si;
function Ha() {
  return si || (si = 1, sa = {
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
  }), sa;
}
var li;
function ic() {
  if (li) return it;
  li = 1;
  var r = At(), e = nc(), t = wo(), n = vo(), s = Ha(), i = 0, o = 1, u = 3, f = 4, T = 5, v = 0, p = 1, l = -2, g = -3, E = -5, S = -1, R = 1, m = 2, w = 3, A = 4, C = 0, O = 2, j = 8, M = 9, Y = 15, ee = 8, te = 29, le = 256, oe = le + 1 + te, $ = 30, ce = 19, ve = 2 * oe + 1, ue = 15, x = 3, N = 258, W = N + x + 1, J = 32, re = 42, ae = 69, se = 73, Ee = 91, ye = 103, ge = 113, y = 666, b = 1, B = 2, q = 3, fe = 4, Z = 3;
  function ne(a, k) {
    return a.msg = s[k], k;
  }
  function Je(a) {
    return (a << 1) - (a > 4 ? 9 : 0);
  }
  function Fe(a) {
    for (var k = a.length; --k >= 0; )
      a[k] = 0;
  }
  function Me(a) {
    var k = a.state, L = k.pending;
    L > a.avail_out && (L = a.avail_out), L !== 0 && (r.arraySet(a.output, k.pending_buf, k.pending_out, L, a.next_out), a.next_out += L, k.pending_out += L, a.total_out += L, a.avail_out -= L, k.pending -= L, k.pending === 0 && (k.pending_out = 0));
  }
  function be(a, k) {
    e._tr_flush_block(a, a.block_start >= 0 ? a.block_start : -1, a.strstart - a.block_start, k), a.block_start = a.strstart, Me(a.strm);
  }
  function de(a, k) {
    a.pending_buf[a.pending++] = k;
  }
  function He(a, k) {
    a.pending_buf[a.pending++] = k >>> 8 & 255, a.pending_buf[a.pending++] = k & 255;
  }
  function ht(a, k, L, d) {
    var I = a.avail_in;
    return I > d && (I = d), I === 0 ? 0 : (a.avail_in -= I, r.arraySet(k, a.input, a.next_in, I, L), a.state.wrap === 1 ? a.adler = t(a.adler, k, I, L) : a.state.wrap === 2 && (a.adler = n(a.adler, k, I, L)), a.next_in += I, a.total_in += I, I);
  }
  function Qe(a, k) {
    var L = a.max_chain_length, d = a.strstart, I, P, Q = a.prev_length, V = a.nice_match, K = a.strstart > a.w_size - W ? a.strstart - (a.w_size - W) : 0, me = a.window, dt = a.w_mask, Te = a.prev, _e = a.strstart + N, Ne = me[d + Q - 1], je = me[d + Q];
    a.prev_length >= a.good_match && (L >>= 2), V > a.lookahead && (V = a.lookahead);
    do
      if (I = k, !(me[I + Q] !== je || me[I + Q - 1] !== Ne || me[I] !== me[d] || me[++I] !== me[d + 1])) {
        d += 2, I++;
        do
          ;
        while (me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && me[++d] === me[++I] && d < _e);
        if (P = N - (_e - d), d = _e - N, P > Q) {
          if (a.match_start = k, Q = P, P >= V)
            break;
          Ne = me[d + Q - 1], je = me[d + Q];
        }
      }
    while ((k = Te[k & dt]) > K && --L !== 0);
    return Q <= a.lookahead ? Q : a.lookahead;
  }
  function Ue(a) {
    var k = a.w_size, L, d, I, P, Q;
    do {
      if (P = a.window_size - a.lookahead - a.strstart, a.strstart >= k + (k - W)) {
        r.arraySet(a.window, a.window, k, k, 0), a.match_start -= k, a.strstart -= k, a.block_start -= k, d = a.hash_size, L = d;
        do
          I = a.head[--L], a.head[L] = I >= k ? I - k : 0;
        while (--d);
        d = k, L = d;
        do
          I = a.prev[--L], a.prev[L] = I >= k ? I - k : 0;
        while (--d);
        P += k;
      }
      if (a.strm.avail_in === 0)
        break;
      if (d = ht(a.strm, a.window, a.strstart + a.lookahead, P), a.lookahead += d, a.lookahead + a.insert >= x)
        for (Q = a.strstart - a.insert, a.ins_h = a.window[Q], a.ins_h = (a.ins_h << a.hash_shift ^ a.window[Q + 1]) & a.hash_mask; a.insert && (a.ins_h = (a.ins_h << a.hash_shift ^ a.window[Q + x - 1]) & a.hash_mask, a.prev[Q & a.w_mask] = a.head[a.ins_h], a.head[a.ins_h] = Q, Q++, a.insert--, !(a.lookahead + a.insert < x)); )
          ;
    } while (a.lookahead < W && a.strm.avail_in !== 0);
  }
  function et(a, k) {
    var L = 65535;
    for (L > a.pending_buf_size - 5 && (L = a.pending_buf_size - 5); ; ) {
      if (a.lookahead <= 1) {
        if (Ue(a), a.lookahead === 0 && k === i)
          return b;
        if (a.lookahead === 0)
          break;
      }
      a.strstart += a.lookahead, a.lookahead = 0;
      var d = a.block_start + L;
      if ((a.strstart === 0 || a.strstart >= d) && (a.lookahead = a.strstart - d, a.strstart = d, be(a, !1), a.strm.avail_out === 0) || a.strstart - a.block_start >= a.w_size - W && (be(a, !1), a.strm.avail_out === 0))
        return b;
    }
    return a.insert = 0, k === f ? (be(a, !0), a.strm.avail_out === 0 ? q : fe) : (a.strstart > a.block_start && (be(a, !1), a.strm.avail_out === 0), b);
  }
  function ze(a, k) {
    for (var L, d; ; ) {
      if (a.lookahead < W) {
        if (Ue(a), a.lookahead < W && k === i)
          return b;
        if (a.lookahead === 0)
          break;
      }
      if (L = 0, a.lookahead >= x && (a.ins_h = (a.ins_h << a.hash_shift ^ a.window[a.strstart + x - 1]) & a.hash_mask, L = a.prev[a.strstart & a.w_mask] = a.head[a.ins_h], a.head[a.ins_h] = a.strstart), L !== 0 && a.strstart - L <= a.w_size - W && (a.match_length = Qe(a, L)), a.match_length >= x)
        if (d = e._tr_tally(a, a.strstart - a.match_start, a.match_length - x), a.lookahead -= a.match_length, a.match_length <= a.max_lazy_match && a.lookahead >= x) {
          a.match_length--;
          do
            a.strstart++, a.ins_h = (a.ins_h << a.hash_shift ^ a.window[a.strstart + x - 1]) & a.hash_mask, L = a.prev[a.strstart & a.w_mask] = a.head[a.ins_h], a.head[a.ins_h] = a.strstart;
          while (--a.match_length !== 0);
          a.strstart++;
        } else
          a.strstart += a.match_length, a.match_length = 0, a.ins_h = a.window[a.strstart], a.ins_h = (a.ins_h << a.hash_shift ^ a.window[a.strstart + 1]) & a.hash_mask;
      else
        d = e._tr_tally(a, 0, a.window[a.strstart]), a.lookahead--, a.strstart++;
      if (d && (be(a, !1), a.strm.avail_out === 0))
        return b;
    }
    return a.insert = a.strstart < x - 1 ? a.strstart : x - 1, k === f ? (be(a, !0), a.strm.avail_out === 0 ? q : fe) : a.last_lit && (be(a, !1), a.strm.avail_out === 0) ? b : B;
  }
  function ke(a, k) {
    for (var L, d, I; ; ) {
      if (a.lookahead < W) {
        if (Ue(a), a.lookahead < W && k === i)
          return b;
        if (a.lookahead === 0)
          break;
      }
      if (L = 0, a.lookahead >= x && (a.ins_h = (a.ins_h << a.hash_shift ^ a.window[a.strstart + x - 1]) & a.hash_mask, L = a.prev[a.strstart & a.w_mask] = a.head[a.ins_h], a.head[a.ins_h] = a.strstart), a.prev_length = a.match_length, a.prev_match = a.match_start, a.match_length = x - 1, L !== 0 && a.prev_length < a.max_lazy_match && a.strstart - L <= a.w_size - W && (a.match_length = Qe(a, L), a.match_length <= 5 && (a.strategy === R || a.match_length === x && a.strstart - a.match_start > 4096) && (a.match_length = x - 1)), a.prev_length >= x && a.match_length <= a.prev_length) {
        I = a.strstart + a.lookahead - x, d = e._tr_tally(a, a.strstart - 1 - a.prev_match, a.prev_length - x), a.lookahead -= a.prev_length - 1, a.prev_length -= 2;
        do
          ++a.strstart <= I && (a.ins_h = (a.ins_h << a.hash_shift ^ a.window[a.strstart + x - 1]) & a.hash_mask, L = a.prev[a.strstart & a.w_mask] = a.head[a.ins_h], a.head[a.ins_h] = a.strstart);
        while (--a.prev_length !== 0);
        if (a.match_available = 0, a.match_length = x - 1, a.strstart++, d && (be(a, !1), a.strm.avail_out === 0))
          return b;
      } else if (a.match_available) {
        if (d = e._tr_tally(a, 0, a.window[a.strstart - 1]), d && be(a, !1), a.strstart++, a.lookahead--, a.strm.avail_out === 0)
          return b;
      } else
        a.match_available = 1, a.strstart++, a.lookahead--;
    }
    return a.match_available && (d = e._tr_tally(a, 0, a.window[a.strstart - 1]), a.match_available = 0), a.insert = a.strstart < x - 1 ? a.strstart : x - 1, k === f ? (be(a, !0), a.strm.avail_out === 0 ? q : fe) : a.last_lit && (be(a, !1), a.strm.avail_out === 0) ? b : B;
  }
  function kt(a, k) {
    for (var L, d, I, P, Q = a.window; ; ) {
      if (a.lookahead <= N) {
        if (Ue(a), a.lookahead <= N && k === i)
          return b;
        if (a.lookahead === 0)
          break;
      }
      if (a.match_length = 0, a.lookahead >= x && a.strstart > 0 && (I = a.strstart - 1, d = Q[I], d === Q[++I] && d === Q[++I] && d === Q[++I])) {
        P = a.strstart + N;
        do
          ;
        while (d === Q[++I] && d === Q[++I] && d === Q[++I] && d === Q[++I] && d === Q[++I] && d === Q[++I] && d === Q[++I] && d === Q[++I] && I < P);
        a.match_length = N - (P - I), a.match_length > a.lookahead && (a.match_length = a.lookahead);
      }
      if (a.match_length >= x ? (L = e._tr_tally(a, 1, a.match_length - x), a.lookahead -= a.match_length, a.strstart += a.match_length, a.match_length = 0) : (L = e._tr_tally(a, 0, a.window[a.strstart]), a.lookahead--, a.strstart++), L && (be(a, !1), a.strm.avail_out === 0))
        return b;
    }
    return a.insert = 0, k === f ? (be(a, !0), a.strm.avail_out === 0 ? q : fe) : a.last_lit && (be(a, !1), a.strm.avail_out === 0) ? b : B;
  }
  function vt(a, k) {
    for (var L; ; ) {
      if (a.lookahead === 0 && (Ue(a), a.lookahead === 0)) {
        if (k === i)
          return b;
        break;
      }
      if (a.match_length = 0, L = e._tr_tally(a, 0, a.window[a.strstart]), a.lookahead--, a.strstart++, L && (be(a, !1), a.strm.avail_out === 0))
        return b;
    }
    return a.insert = 0, k === f ? (be(a, !0), a.strm.avail_out === 0 ? q : fe) : a.last_lit && (be(a, !1), a.strm.avail_out === 0) ? b : B;
  }
  function We(a, k, L, d, I) {
    this.good_length = a, this.max_lazy = k, this.nice_length = L, this.max_chain = d, this.func = I;
  }
  var ct;
  ct = [
    /*      good lazy nice chain */
    new We(0, 0, 0, 0, et),
    /* 0 store only */
    new We(4, 4, 8, 4, ze),
    /* 1 max speed, no lazy matches */
    new We(4, 5, 16, 8, ze),
    /* 2 */
    new We(4, 6, 32, 32, ze),
    /* 3 */
    new We(4, 4, 16, 16, ke),
    /* 4 lazy matches */
    new We(8, 16, 32, 32, ke),
    /* 5 */
    new We(8, 16, 128, 128, ke),
    /* 6 */
    new We(8, 32, 128, 256, ke),
    /* 7 */
    new We(32, 128, 258, 1024, ke),
    /* 8 */
    new We(32, 258, 258, 4096, ke)
    /* 9 max compression */
  ];
  function Ot(a) {
    a.window_size = 2 * a.w_size, Fe(a.head), a.max_lazy_match = ct[a.level].max_lazy, a.good_match = ct[a.level].good_length, a.nice_match = ct[a.level].nice_length, a.max_chain_length = ct[a.level].max_chain, a.strstart = 0, a.block_start = 0, a.lookahead = 0, a.insert = 0, a.match_length = a.prev_length = x - 1, a.match_available = 0, a.ins_h = 0;
  }
  function _() {
    this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = j, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new r.Buf16(ve * 2), this.dyn_dtree = new r.Buf16((2 * $ + 1) * 2), this.bl_tree = new r.Buf16((2 * ce + 1) * 2), Fe(this.dyn_ltree), Fe(this.dyn_dtree), Fe(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new r.Buf16(ue + 1), this.heap = new r.Buf16(2 * oe + 1), Fe(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new r.Buf16(2 * oe + 1), Fe(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
  }
  function H(a) {
    var k;
    return !a || !a.state ? ne(a, l) : (a.total_in = a.total_out = 0, a.data_type = O, k = a.state, k.pending = 0, k.pending_out = 0, k.wrap < 0 && (k.wrap = -k.wrap), k.status = k.wrap ? re : ge, a.adler = k.wrap === 2 ? 0 : 1, k.last_flush = i, e._tr_init(k), v);
  }
  function G(a) {
    var k = H(a);
    return k === v && Ot(a.state), k;
  }
  function X(a, k) {
    return !a || !a.state || a.state.wrap !== 2 ? l : (a.state.gzhead = k, v);
  }
  function D(a, k, L, d, I, P) {
    if (!a)
      return l;
    var Q = 1;
    if (k === S && (k = 6), d < 0 ? (Q = 0, d = -d) : d > 15 && (Q = 2, d -= 16), I < 1 || I > M || L !== j || d < 8 || d > 15 || k < 0 || k > 9 || P < 0 || P > A)
      return ne(a, l);
    d === 8 && (d = 9);
    var V = new _();
    return a.state = V, V.strm = a, V.wrap = Q, V.gzhead = null, V.w_bits = d, V.w_size = 1 << V.w_bits, V.w_mask = V.w_size - 1, V.hash_bits = I + 7, V.hash_size = 1 << V.hash_bits, V.hash_mask = V.hash_size - 1, V.hash_shift = ~~((V.hash_bits + x - 1) / x), V.window = new r.Buf8(V.w_size * 2), V.head = new r.Buf16(V.hash_size), V.prev = new r.Buf16(V.w_size), V.lit_bufsize = 1 << I + 6, V.pending_buf_size = V.lit_bufsize * 4, V.pending_buf = new r.Buf8(V.pending_buf_size), V.d_buf = 1 * V.lit_bufsize, V.l_buf = 3 * V.lit_bufsize, V.level = k, V.strategy = P, V.method = L, G(a);
  }
  function F(a, k) {
    return D(a, k, j, Y, ee, C);
  }
  function c(a, k) {
    var L, d, I, P;
    if (!a || !a.state || k > T || k < 0)
      return a ? ne(a, l) : l;
    if (d = a.state, !a.output || !a.input && a.avail_in !== 0 || d.status === y && k !== f)
      return ne(a, a.avail_out === 0 ? E : l);
    if (d.strm = a, L = d.last_flush, d.last_flush = k, d.status === re)
      if (d.wrap === 2)
        a.adler = 0, de(d, 31), de(d, 139), de(d, 8), d.gzhead ? (de(
          d,
          (d.gzhead.text ? 1 : 0) + (d.gzhead.hcrc ? 2 : 0) + (d.gzhead.extra ? 4 : 0) + (d.gzhead.name ? 8 : 0) + (d.gzhead.comment ? 16 : 0)
        ), de(d, d.gzhead.time & 255), de(d, d.gzhead.time >> 8 & 255), de(d, d.gzhead.time >> 16 & 255), de(d, d.gzhead.time >> 24 & 255), de(d, d.level === 9 ? 2 : d.strategy >= m || d.level < 2 ? 4 : 0), de(d, d.gzhead.os & 255), d.gzhead.extra && d.gzhead.extra.length && (de(d, d.gzhead.extra.length & 255), de(d, d.gzhead.extra.length >> 8 & 255)), d.gzhead.hcrc && (a.adler = n(a.adler, d.pending_buf, d.pending, 0)), d.gzindex = 0, d.status = ae) : (de(d, 0), de(d, 0), de(d, 0), de(d, 0), de(d, 0), de(d, d.level === 9 ? 2 : d.strategy >= m || d.level < 2 ? 4 : 0), de(d, Z), d.status = ge);
      else {
        var Q = j + (d.w_bits - 8 << 4) << 8, V = -1;
        d.strategy >= m || d.level < 2 ? V = 0 : d.level < 6 ? V = 1 : d.level === 6 ? V = 2 : V = 3, Q |= V << 6, d.strstart !== 0 && (Q |= J), Q += 31 - Q % 31, d.status = ge, He(d, Q), d.strstart !== 0 && (He(d, a.adler >>> 16), He(d, a.adler & 65535)), a.adler = 1;
      }
    if (d.status === ae)
      if (d.gzhead.extra) {
        for (I = d.pending; d.gzindex < (d.gzhead.extra.length & 65535) && !(d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), Me(a), I = d.pending, d.pending === d.pending_buf_size)); )
          de(d, d.gzhead.extra[d.gzindex] & 255), d.gzindex++;
        d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), d.gzindex === d.gzhead.extra.length && (d.gzindex = 0, d.status = se);
      } else
        d.status = se;
    if (d.status === se)
      if (d.gzhead.name) {
        I = d.pending;
        do {
          if (d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), Me(a), I = d.pending, d.pending === d.pending_buf_size)) {
            P = 1;
            break;
          }
          d.gzindex < d.gzhead.name.length ? P = d.gzhead.name.charCodeAt(d.gzindex++) & 255 : P = 0, de(d, P);
        } while (P !== 0);
        d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), P === 0 && (d.gzindex = 0, d.status = Ee);
      } else
        d.status = Ee;
    if (d.status === Ee)
      if (d.gzhead.comment) {
        I = d.pending;
        do {
          if (d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), Me(a), I = d.pending, d.pending === d.pending_buf_size)) {
            P = 1;
            break;
          }
          d.gzindex < d.gzhead.comment.length ? P = d.gzhead.comment.charCodeAt(d.gzindex++) & 255 : P = 0, de(d, P);
        } while (P !== 0);
        d.gzhead.hcrc && d.pending > I && (a.adler = n(a.adler, d.pending_buf, d.pending - I, I)), P === 0 && (d.status = ye);
      } else
        d.status = ye;
    if (d.status === ye && (d.gzhead.hcrc ? (d.pending + 2 > d.pending_buf_size && Me(a), d.pending + 2 <= d.pending_buf_size && (de(d, a.adler & 255), de(d, a.adler >> 8 & 255), a.adler = 0, d.status = ge)) : d.status = ge), d.pending !== 0) {
      if (Me(a), a.avail_out === 0)
        return d.last_flush = -1, v;
    } else if (a.avail_in === 0 && Je(k) <= Je(L) && k !== f)
      return ne(a, E);
    if (d.status === y && a.avail_in !== 0)
      return ne(a, E);
    if (a.avail_in !== 0 || d.lookahead !== 0 || k !== i && d.status !== y) {
      var K = d.strategy === m ? vt(d, k) : d.strategy === w ? kt(d, k) : ct[d.level].func(d, k);
      if ((K === q || K === fe) && (d.status = y), K === b || K === q)
        return a.avail_out === 0 && (d.last_flush = -1), v;
      if (K === B && (k === o ? e._tr_align(d) : k !== T && (e._tr_stored_block(d, 0, 0, !1), k === u && (Fe(d.head), d.lookahead === 0 && (d.strstart = 0, d.block_start = 0, d.insert = 0))), Me(a), a.avail_out === 0))
        return d.last_flush = -1, v;
    }
    return k !== f ? v : d.wrap <= 0 ? p : (d.wrap === 2 ? (de(d, a.adler & 255), de(d, a.adler >> 8 & 255), de(d, a.adler >> 16 & 255), de(d, a.adler >> 24 & 255), de(d, a.total_in & 255), de(d, a.total_in >> 8 & 255), de(d, a.total_in >> 16 & 255), de(d, a.total_in >> 24 & 255)) : (He(d, a.adler >>> 16), He(d, a.adler & 65535)), Me(a), d.wrap > 0 && (d.wrap = -d.wrap), d.pending !== 0 ? v : p);
  }
  function z(a) {
    var k;
    return !a || !a.state ? l : (k = a.state.status, k !== re && k !== ae && k !== se && k !== Ee && k !== ye && k !== ge && k !== y ? ne(a, l) : (a.state = null, k === ge ? ne(a, g) : v));
  }
  function ie(a, k) {
    var L = k.length, d, I, P, Q, V, K, me, dt;
    if (!a || !a.state || (d = a.state, Q = d.wrap, Q === 2 || Q === 1 && d.status !== re || d.lookahead))
      return l;
    for (Q === 1 && (a.adler = t(a.adler, k, L, 0)), d.wrap = 0, L >= d.w_size && (Q === 0 && (Fe(d.head), d.strstart = 0, d.block_start = 0, d.insert = 0), dt = new r.Buf8(d.w_size), r.arraySet(dt, k, L - d.w_size, d.w_size, 0), k = dt, L = d.w_size), V = a.avail_in, K = a.next_in, me = a.input, a.avail_in = L, a.next_in = 0, a.input = k, Ue(d); d.lookahead >= x; ) {
      I = d.strstart, P = d.lookahead - (x - 1);
      do
        d.ins_h = (d.ins_h << d.hash_shift ^ d.window[I + x - 1]) & d.hash_mask, d.prev[I & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = I, I++;
      while (--P);
      d.strstart = I, d.lookahead = x - 1, Ue(d);
    }
    return d.strstart += d.lookahead, d.block_start = d.strstart, d.insert = d.lookahead, d.lookahead = 0, d.match_length = d.prev_length = x - 1, d.match_available = 0, a.next_in = K, a.input = me, a.avail_in = V, d.wrap = Q, v;
  }
  return it.deflateInit = F, it.deflateInit2 = D, it.deflateReset = G, it.deflateResetKeep = H, it.deflateSetHeader = X, it.deflate = c, it.deflateEnd = z, it.deflateSetDictionary = ie, it.deflateInfo = "pako deflate (from Nodeca project)", it;
}
var xt = {}, hi;
function Eo() {
  if (hi) return xt;
  hi = 1;
  var r = At(), e = !0, t = !0;
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
  for (var n = new r.Buf8(256), s = 0; s < 256; s++)
    n[s] = s >= 252 ? 6 : s >= 248 ? 5 : s >= 240 ? 4 : s >= 224 ? 3 : s >= 192 ? 2 : 1;
  n[254] = n[254] = 1, xt.string2buf = function(o) {
    var u, f, T, v, p, l = o.length, g = 0;
    for (v = 0; v < l; v++)
      f = o.charCodeAt(v), (f & 64512) === 55296 && v + 1 < l && (T = o.charCodeAt(v + 1), (T & 64512) === 56320 && (f = 65536 + (f - 55296 << 10) + (T - 56320), v++)), g += f < 128 ? 1 : f < 2048 ? 2 : f < 65536 ? 3 : 4;
    for (u = new r.Buf8(g), p = 0, v = 0; p < g; v++)
      f = o.charCodeAt(v), (f & 64512) === 55296 && v + 1 < l && (T = o.charCodeAt(v + 1), (T & 64512) === 56320 && (f = 65536 + (f - 55296 << 10) + (T - 56320), v++)), f < 128 ? u[p++] = f : f < 2048 ? (u[p++] = 192 | f >>> 6, u[p++] = 128 | f & 63) : f < 65536 ? (u[p++] = 224 | f >>> 12, u[p++] = 128 | f >>> 6 & 63, u[p++] = 128 | f & 63) : (u[p++] = 240 | f >>> 18, u[p++] = 128 | f >>> 12 & 63, u[p++] = 128 | f >>> 6 & 63, u[p++] = 128 | f & 63);
    return u;
  };
  function i(o, u) {
    if (u < 65534 && (o.subarray && t || !o.subarray && e))
      return String.fromCharCode.apply(null, r.shrinkBuf(o, u));
    for (var f = "", T = 0; T < u; T++)
      f += String.fromCharCode(o[T]);
    return f;
  }
  return xt.buf2binstring = function(o) {
    return i(o, o.length);
  }, xt.binstring2buf = function(o) {
    for (var u = new r.Buf8(o.length), f = 0, T = u.length; f < T; f++)
      u[f] = o.charCodeAt(f);
    return u;
  }, xt.buf2string = function(o, u) {
    var f, T, v, p, l = u || o.length, g = new Array(l * 2);
    for (T = 0, f = 0; f < l; ) {
      if (v = o[f++], v < 128) {
        g[T++] = v;
        continue;
      }
      if (p = n[v], p > 4) {
        g[T++] = 65533, f += p - 1;
        continue;
      }
      for (v &= p === 2 ? 31 : p === 3 ? 15 : 7; p > 1 && f < l; )
        v = v << 6 | o[f++] & 63, p--;
      if (p > 1) {
        g[T++] = 65533;
        continue;
      }
      v < 65536 ? g[T++] = v : (v -= 65536, g[T++] = 55296 | v >> 10 & 1023, g[T++] = 56320 | v & 1023);
    }
    return i(g, T);
  }, xt.utf8border = function(o, u) {
    var f;
    for (u = u || o.length, u > o.length && (u = o.length), f = u - 1; f >= 0 && (o[f] & 192) === 128; )
      f--;
    return f < 0 || f === 0 ? u : f + n[o[f]] > u ? f : u;
  }, xt;
}
var la, ci;
function yo() {
  if (ci) return la;
  ci = 1;
  function r() {
    this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
  }
  return la = r, la;
}
var fi;
function oc() {
  if (fi) return Wt;
  fi = 1;
  var r = ic(), e = At(), t = Eo(), n = Ha(), s = yo(), i = Object.prototype.toString, o = 0, u = 4, f = 0, T = 1, v = 2, p = -1, l = 0, g = 8;
  function E(w) {
    if (!(this instanceof E)) return new E(w);
    this.options = e.assign({
      level: p,
      method: g,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: l,
      to: ""
    }, w || {});
    var A = this.options;
    A.raw && A.windowBits > 0 ? A.windowBits = -A.windowBits : A.gzip && A.windowBits > 0 && A.windowBits < 16 && (A.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
    var C = r.deflateInit2(
      this.strm,
      A.level,
      A.method,
      A.windowBits,
      A.memLevel,
      A.strategy
    );
    if (C !== f)
      throw new Error(n[C]);
    if (A.header && r.deflateSetHeader(this.strm, A.header), A.dictionary) {
      var O;
      if (typeof A.dictionary == "string" ? O = t.string2buf(A.dictionary) : i.call(A.dictionary) === "[object ArrayBuffer]" ? O = new Uint8Array(A.dictionary) : O = A.dictionary, C = r.deflateSetDictionary(this.strm, O), C !== f)
        throw new Error(n[C]);
      this._dict_set = !0;
    }
  }
  E.prototype.push = function(w, A) {
    var C = this.strm, O = this.options.chunkSize, j, M;
    if (this.ended)
      return !1;
    M = A === ~~A ? A : A === !0 ? u : o, typeof w == "string" ? C.input = t.string2buf(w) : i.call(w) === "[object ArrayBuffer]" ? C.input = new Uint8Array(w) : C.input = w, C.next_in = 0, C.avail_in = C.input.length;
    do {
      if (C.avail_out === 0 && (C.output = new e.Buf8(O), C.next_out = 0, C.avail_out = O), j = r.deflate(C, M), j !== T && j !== f)
        return this.onEnd(j), this.ended = !0, !1;
      (C.avail_out === 0 || C.avail_in === 0 && (M === u || M === v)) && (this.options.to === "string" ? this.onData(t.buf2binstring(e.shrinkBuf(C.output, C.next_out))) : this.onData(e.shrinkBuf(C.output, C.next_out)));
    } while ((C.avail_in > 0 || C.avail_out === 0) && j !== T);
    return M === u ? (j = r.deflateEnd(this.strm), this.onEnd(j), this.ended = !0, j === f) : (M === v && (this.onEnd(f), C.avail_out = 0), !0);
  }, E.prototype.onData = function(w) {
    this.chunks.push(w);
  }, E.prototype.onEnd = function(w) {
    w === f && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = w, this.msg = this.strm.msg;
  };
  function S(w, A) {
    var C = new E(A);
    if (C.push(w, !0), C.err)
      throw C.msg || n[C.err];
    return C.result;
  }
  function R(w, A) {
    return A = A || {}, A.raw = !0, S(w, A);
  }
  function m(w, A) {
    return A = A || {}, A.gzip = !0, S(w, A);
  }
  return Wt.Deflate = E, Wt.deflate = S, Wt.deflateRaw = R, Wt.gzip = m, Wt;
}
var jt = {}, at = {}, ha, ui;
function sc() {
  if (ui) return ha;
  ui = 1;
  var r = 30, e = 12;
  return ha = function(n, s) {
    var i, o, u, f, T, v, p, l, g, E, S, R, m, w, A, C, O, j, M, Y, ee, te, le, oe, $;
    i = n.state, o = n.next_in, oe = n.input, u = o + (n.avail_in - 5), f = n.next_out, $ = n.output, T = f - (s - n.avail_out), v = f + (n.avail_out - 257), p = i.dmax, l = i.wsize, g = i.whave, E = i.wnext, S = i.window, R = i.hold, m = i.bits, w = i.lencode, A = i.distcode, C = (1 << i.lenbits) - 1, O = (1 << i.distbits) - 1;
    e:
      do {
        m < 15 && (R += oe[o++] << m, m += 8, R += oe[o++] << m, m += 8), j = w[R & C];
        t:
          for (; ; ) {
            if (M = j >>> 24, R >>>= M, m -= M, M = j >>> 16 & 255, M === 0)
              $[f++] = j & 65535;
            else if (M & 16) {
              Y = j & 65535, M &= 15, M && (m < M && (R += oe[o++] << m, m += 8), Y += R & (1 << M) - 1, R >>>= M, m -= M), m < 15 && (R += oe[o++] << m, m += 8, R += oe[o++] << m, m += 8), j = A[R & O];
              r:
                for (; ; ) {
                  if (M = j >>> 24, R >>>= M, m -= M, M = j >>> 16 & 255, M & 16) {
                    if (ee = j & 65535, M &= 15, m < M && (R += oe[o++] << m, m += 8, m < M && (R += oe[o++] << m, m += 8)), ee += R & (1 << M) - 1, ee > p) {
                      n.msg = "invalid distance too far back", i.mode = r;
                      break e;
                    }
                    if (R >>>= M, m -= M, M = f - T, ee > M) {
                      if (M = ee - M, M > g && i.sane) {
                        n.msg = "invalid distance too far back", i.mode = r;
                        break e;
                      }
                      if (te = 0, le = S, E === 0) {
                        if (te += l - M, M < Y) {
                          Y -= M;
                          do
                            $[f++] = S[te++];
                          while (--M);
                          te = f - ee, le = $;
                        }
                      } else if (E < M) {
                        if (te += l + E - M, M -= E, M < Y) {
                          Y -= M;
                          do
                            $[f++] = S[te++];
                          while (--M);
                          if (te = 0, E < Y) {
                            M = E, Y -= M;
                            do
                              $[f++] = S[te++];
                            while (--M);
                            te = f - ee, le = $;
                          }
                        }
                      } else if (te += E - M, M < Y) {
                        Y -= M;
                        do
                          $[f++] = S[te++];
                        while (--M);
                        te = f - ee, le = $;
                      }
                      for (; Y > 2; )
                        $[f++] = le[te++], $[f++] = le[te++], $[f++] = le[te++], Y -= 3;
                      Y && ($[f++] = le[te++], Y > 1 && ($[f++] = le[te++]));
                    } else {
                      te = f - ee;
                      do
                        $[f++] = $[te++], $[f++] = $[te++], $[f++] = $[te++], Y -= 3;
                      while (Y > 2);
                      Y && ($[f++] = $[te++], Y > 1 && ($[f++] = $[te++]));
                    }
                  } else if ((M & 64) === 0) {
                    j = A[(j & 65535) + (R & (1 << M) - 1)];
                    continue r;
                  } else {
                    n.msg = "invalid distance code", i.mode = r;
                    break e;
                  }
                  break;
                }
            } else if ((M & 64) === 0) {
              j = w[(j & 65535) + (R & (1 << M) - 1)];
              continue t;
            } else if (M & 32) {
              i.mode = e;
              break e;
            } else {
              n.msg = "invalid literal/length code", i.mode = r;
              break e;
            }
            break;
          }
      } while (o < u && f < v);
    Y = m >> 3, o -= Y, m -= Y << 3, R &= (1 << m) - 1, n.next_in = o, n.next_out = f, n.avail_in = o < u ? 5 + (u - o) : 5 - (o - u), n.avail_out = f < v ? 257 + (v - f) : 257 - (f - v), i.hold = R, i.bits = m;
  }, ha;
}
var ca, di;
function lc() {
  if (di) return ca;
  di = 1;
  var r = At(), e = 15, t = 852, n = 592, s = 0, i = 1, o = 2, u = [
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
  ], f = [
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
  ], T = [
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
  ], v = [
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
  return ca = function(l, g, E, S, R, m, w, A) {
    var C = A.bits, O = 0, j = 0, M = 0, Y = 0, ee = 0, te = 0, le = 0, oe = 0, $ = 0, ce = 0, ve, ue, x, N, W, J = null, re = 0, ae, se = new r.Buf16(e + 1), Ee = new r.Buf16(e + 1), ye = null, ge = 0, y, b, B;
    for (O = 0; O <= e; O++)
      se[O] = 0;
    for (j = 0; j < S; j++)
      se[g[E + j]]++;
    for (ee = C, Y = e; Y >= 1 && se[Y] === 0; Y--)
      ;
    if (ee > Y && (ee = Y), Y === 0)
      return R[m++] = 1 << 24 | 64 << 16 | 0, R[m++] = 1 << 24 | 64 << 16 | 0, A.bits = 1, 0;
    for (M = 1; M < Y && se[M] === 0; M++)
      ;
    for (ee < M && (ee = M), oe = 1, O = 1; O <= e; O++)
      if (oe <<= 1, oe -= se[O], oe < 0)
        return -1;
    if (oe > 0 && (l === s || Y !== 1))
      return -1;
    for (Ee[1] = 0, O = 1; O < e; O++)
      Ee[O + 1] = Ee[O] + se[O];
    for (j = 0; j < S; j++)
      g[E + j] !== 0 && (w[Ee[g[E + j]]++] = j);
    if (l === s ? (J = ye = w, ae = 19) : l === i ? (J = u, re -= 257, ye = f, ge -= 257, ae = 256) : (J = T, ye = v, ae = -1), ce = 0, j = 0, O = M, W = m, te = ee, le = 0, x = -1, $ = 1 << ee, N = $ - 1, l === i && $ > t || l === o && $ > n)
      return 1;
    for (; ; ) {
      y = O - le, w[j] < ae ? (b = 0, B = w[j]) : w[j] > ae ? (b = ye[ge + w[j]], B = J[re + w[j]]) : (b = 96, B = 0), ve = 1 << O - le, ue = 1 << te, M = ue;
      do
        ue -= ve, R[W + (ce >> le) + ue] = y << 24 | b << 16 | B | 0;
      while (ue !== 0);
      for (ve = 1 << O - 1; ce & ve; )
        ve >>= 1;
      if (ve !== 0 ? (ce &= ve - 1, ce += ve) : ce = 0, j++, --se[O] === 0) {
        if (O === Y)
          break;
        O = g[E + w[j]];
      }
      if (O > ee && (ce & N) !== x) {
        for (le === 0 && (le = ee), W += M, te = O - le, oe = 1 << te; te + le < Y && (oe -= se[te + le], !(oe <= 0)); )
          te++, oe <<= 1;
        if ($ += 1 << te, l === i && $ > t || l === o && $ > n)
          return 1;
        x = ce & N, R[x] = ee << 24 | te << 16 | W - m | 0;
      }
    }
    return ce !== 0 && (R[W + ce] = O - le << 24 | 64 << 16 | 0), A.bits = ee, 0;
  }, ca;
}
var pi;
function hc() {
  if (pi) return at;
  pi = 1;
  var r = At(), e = wo(), t = vo(), n = sc(), s = lc(), i = 0, o = 1, u = 2, f = 4, T = 5, v = 6, p = 0, l = 1, g = 2, E = -2, S = -3, R = -4, m = -5, w = 8, A = 1, C = 2, O = 3, j = 4, M = 5, Y = 6, ee = 7, te = 8, le = 9, oe = 10, $ = 11, ce = 12, ve = 13, ue = 14, x = 15, N = 16, W = 17, J = 18, re = 19, ae = 20, se = 21, Ee = 22, ye = 23, ge = 24, y = 25, b = 26, B = 27, q = 28, fe = 29, Z = 30, ne = 31, Je = 32, Fe = 852, Me = 592, be = 15, de = be;
  function He(D) {
    return (D >>> 24 & 255) + (D >>> 8 & 65280) + ((D & 65280) << 8) + ((D & 255) << 24);
  }
  function ht() {
    this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new r.Buf16(320), this.work = new r.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
  }
  function Qe(D) {
    var F;
    return !D || !D.state ? E : (F = D.state, D.total_in = D.total_out = F.total = 0, D.msg = "", F.wrap && (D.adler = F.wrap & 1), F.mode = A, F.last = 0, F.havedict = 0, F.dmax = 32768, F.head = null, F.hold = 0, F.bits = 0, F.lencode = F.lendyn = new r.Buf32(Fe), F.distcode = F.distdyn = new r.Buf32(Me), F.sane = 1, F.back = -1, p);
  }
  function Ue(D) {
    var F;
    return !D || !D.state ? E : (F = D.state, F.wsize = 0, F.whave = 0, F.wnext = 0, Qe(D));
  }
  function et(D, F) {
    var c, z;
    return !D || !D.state || (z = D.state, F < 0 ? (c = 0, F = -F) : (c = (F >> 4) + 1, F < 48 && (F &= 15)), F && (F < 8 || F > 15)) ? E : (z.window !== null && z.wbits !== F && (z.window = null), z.wrap = c, z.wbits = F, Ue(D));
  }
  function ze(D, F) {
    var c, z;
    return D ? (z = new ht(), D.state = z, z.window = null, c = et(D, F), c !== p && (D.state = null), c) : E;
  }
  function ke(D) {
    return ze(D, de);
  }
  var kt = !0, vt, We;
  function ct(D) {
    if (kt) {
      var F;
      for (vt = new r.Buf32(512), We = new r.Buf32(32), F = 0; F < 144; )
        D.lens[F++] = 8;
      for (; F < 256; )
        D.lens[F++] = 9;
      for (; F < 280; )
        D.lens[F++] = 7;
      for (; F < 288; )
        D.lens[F++] = 8;
      for (s(o, D.lens, 0, 288, vt, 0, D.work, { bits: 9 }), F = 0; F < 32; )
        D.lens[F++] = 5;
      s(u, D.lens, 0, 32, We, 0, D.work, { bits: 5 }), kt = !1;
    }
    D.lencode = vt, D.lenbits = 9, D.distcode = We, D.distbits = 5;
  }
  function Ot(D, F, c, z) {
    var ie, a = D.state;
    return a.window === null && (a.wsize = 1 << a.wbits, a.wnext = 0, a.whave = 0, a.window = new r.Buf8(a.wsize)), z >= a.wsize ? (r.arraySet(a.window, F, c - a.wsize, a.wsize, 0), a.wnext = 0, a.whave = a.wsize) : (ie = a.wsize - a.wnext, ie > z && (ie = z), r.arraySet(a.window, F, c - z, ie, a.wnext), z -= ie, z ? (r.arraySet(a.window, F, c - z, z, 0), a.wnext = z, a.whave = a.wsize) : (a.wnext += ie, a.wnext === a.wsize && (a.wnext = 0), a.whave < a.wsize && (a.whave += ie))), 0;
  }
  function _(D, F) {
    var c, z, ie, a, k, L, d, I, P, Q, V, K, me, dt, Te = 0, _e, Ne, je, Ye, Jt, Qt, xe, tt, Oe = new r.Buf8(4), pt, ft, za = (
      /* permutation of code lengths */
      [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    );
    if (!D || !D.state || !D.output || !D.input && D.avail_in !== 0)
      return E;
    c = D.state, c.mode === ce && (c.mode = ve), k = D.next_out, ie = D.output, d = D.avail_out, a = D.next_in, z = D.input, L = D.avail_in, I = c.hold, P = c.bits, Q = L, V = d, tt = p;
    e:
      for (; ; )
        switch (c.mode) {
          case A:
            if (c.wrap === 0) {
              c.mode = ve;
              break;
            }
            for (; P < 16; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if (c.wrap & 2 && I === 35615) {
              c.check = 0, Oe[0] = I & 255, Oe[1] = I >>> 8 & 255, c.check = t(c.check, Oe, 2, 0), I = 0, P = 0, c.mode = C;
              break;
            }
            if (c.flags = 0, c.head && (c.head.done = !1), !(c.wrap & 1) || /* check if zlib header allowed */
            (((I & 255) << 8) + (I >> 8)) % 31) {
              D.msg = "incorrect header check", c.mode = Z;
              break;
            }
            if ((I & 15) !== w) {
              D.msg = "unknown compression method", c.mode = Z;
              break;
            }
            if (I >>>= 4, P -= 4, xe = (I & 15) + 8, c.wbits === 0)
              c.wbits = xe;
            else if (xe > c.wbits) {
              D.msg = "invalid window size", c.mode = Z;
              break;
            }
            c.dmax = 1 << xe, D.adler = c.check = 1, c.mode = I & 512 ? oe : ce, I = 0, P = 0;
            break;
          case C:
            for (; P < 16; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if (c.flags = I, (c.flags & 255) !== w) {
              D.msg = "unknown compression method", c.mode = Z;
              break;
            }
            if (c.flags & 57344) {
              D.msg = "unknown header flags set", c.mode = Z;
              break;
            }
            c.head && (c.head.text = I >> 8 & 1), c.flags & 512 && (Oe[0] = I & 255, Oe[1] = I >>> 8 & 255, c.check = t(c.check, Oe, 2, 0)), I = 0, P = 0, c.mode = O;
          /* falls through */
          case O:
            for (; P < 32; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            c.head && (c.head.time = I), c.flags & 512 && (Oe[0] = I & 255, Oe[1] = I >>> 8 & 255, Oe[2] = I >>> 16 & 255, Oe[3] = I >>> 24 & 255, c.check = t(c.check, Oe, 4, 0)), I = 0, P = 0, c.mode = j;
          /* falls through */
          case j:
            for (; P < 16; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            c.head && (c.head.xflags = I & 255, c.head.os = I >> 8), c.flags & 512 && (Oe[0] = I & 255, Oe[1] = I >>> 8 & 255, c.check = t(c.check, Oe, 2, 0)), I = 0, P = 0, c.mode = M;
          /* falls through */
          case M:
            if (c.flags & 1024) {
              for (; P < 16; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              c.length = I, c.head && (c.head.extra_len = I), c.flags & 512 && (Oe[0] = I & 255, Oe[1] = I >>> 8 & 255, c.check = t(c.check, Oe, 2, 0)), I = 0, P = 0;
            } else c.head && (c.head.extra = null);
            c.mode = Y;
          /* falls through */
          case Y:
            if (c.flags & 1024 && (K = c.length, K > L && (K = L), K && (c.head && (xe = c.head.extra_len - c.length, c.head.extra || (c.head.extra = new Array(c.head.extra_len)), r.arraySet(
              c.head.extra,
              z,
              a,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              K,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              xe
            )), c.flags & 512 && (c.check = t(c.check, z, K, a)), L -= K, a += K, c.length -= K), c.length))
              break e;
            c.length = 0, c.mode = ee;
          /* falls through */
          case ee:
            if (c.flags & 2048) {
              if (L === 0)
                break e;
              K = 0;
              do
                xe = z[a + K++], c.head && xe && c.length < 65536 && (c.head.name += String.fromCharCode(xe));
              while (xe && K < L);
              if (c.flags & 512 && (c.check = t(c.check, z, K, a)), L -= K, a += K, xe)
                break e;
            } else c.head && (c.head.name = null);
            c.length = 0, c.mode = te;
          /* falls through */
          case te:
            if (c.flags & 4096) {
              if (L === 0)
                break e;
              K = 0;
              do
                xe = z[a + K++], c.head && xe && c.length < 65536 && (c.head.comment += String.fromCharCode(xe));
              while (xe && K < L);
              if (c.flags & 512 && (c.check = t(c.check, z, K, a)), L -= K, a += K, xe)
                break e;
            } else c.head && (c.head.comment = null);
            c.mode = le;
          /* falls through */
          case le:
            if (c.flags & 512) {
              for (; P < 16; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              if (I !== (c.check & 65535)) {
                D.msg = "header crc mismatch", c.mode = Z;
                break;
              }
              I = 0, P = 0;
            }
            c.head && (c.head.hcrc = c.flags >> 9 & 1, c.head.done = !0), D.adler = c.check = 0, c.mode = ce;
            break;
          case oe:
            for (; P < 32; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            D.adler = c.check = He(I), I = 0, P = 0, c.mode = $;
          /* falls through */
          case $:
            if (c.havedict === 0)
              return D.next_out = k, D.avail_out = d, D.next_in = a, D.avail_in = L, c.hold = I, c.bits = P, g;
            D.adler = c.check = 1, c.mode = ce;
          /* falls through */
          case ce:
            if (F === T || F === v)
              break e;
          /* falls through */
          case ve:
            if (c.last) {
              I >>>= P & 7, P -= P & 7, c.mode = B;
              break;
            }
            for (; P < 3; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            switch (c.last = I & 1, I >>>= 1, P -= 1, I & 3) {
              case 0:
                c.mode = ue;
                break;
              case 1:
                if (ct(c), c.mode = ae, F === v) {
                  I >>>= 2, P -= 2;
                  break e;
                }
                break;
              case 2:
                c.mode = W;
                break;
              case 3:
                D.msg = "invalid block type", c.mode = Z;
            }
            I >>>= 2, P -= 2;
            break;
          case ue:
            for (I >>>= P & 7, P -= P & 7; P < 32; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if ((I & 65535) !== (I >>> 16 ^ 65535)) {
              D.msg = "invalid stored block lengths", c.mode = Z;
              break;
            }
            if (c.length = I & 65535, I = 0, P = 0, c.mode = x, F === v)
              break e;
          /* falls through */
          case x:
            c.mode = N;
          /* falls through */
          case N:
            if (K = c.length, K) {
              if (K > L && (K = L), K > d && (K = d), K === 0)
                break e;
              r.arraySet(ie, z, a, K, k), L -= K, a += K, d -= K, k += K, c.length -= K;
              break;
            }
            c.mode = ce;
            break;
          case W:
            for (; P < 14; ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if (c.nlen = (I & 31) + 257, I >>>= 5, P -= 5, c.ndist = (I & 31) + 1, I >>>= 5, P -= 5, c.ncode = (I & 15) + 4, I >>>= 4, P -= 4, c.nlen > 286 || c.ndist > 30) {
              D.msg = "too many length or distance symbols", c.mode = Z;
              break;
            }
            c.have = 0, c.mode = J;
          /* falls through */
          case J:
            for (; c.have < c.ncode; ) {
              for (; P < 3; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              c.lens[za[c.have++]] = I & 7, I >>>= 3, P -= 3;
            }
            for (; c.have < 19; )
              c.lens[za[c.have++]] = 0;
            if (c.lencode = c.lendyn, c.lenbits = 7, pt = { bits: c.lenbits }, tt = s(i, c.lens, 0, 19, c.lencode, 0, c.work, pt), c.lenbits = pt.bits, tt) {
              D.msg = "invalid code lengths set", c.mode = Z;
              break;
            }
            c.have = 0, c.mode = re;
          /* falls through */
          case re:
            for (; c.have < c.nlen + c.ndist; ) {
              for (; Te = c.lencode[I & (1 << c.lenbits) - 1], _e = Te >>> 24, Ne = Te >>> 16 & 255, je = Te & 65535, !(_e <= P); ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              if (je < 16)
                I >>>= _e, P -= _e, c.lens[c.have++] = je;
              else {
                if (je === 16) {
                  for (ft = _e + 2; P < ft; ) {
                    if (L === 0)
                      break e;
                    L--, I += z[a++] << P, P += 8;
                  }
                  if (I >>>= _e, P -= _e, c.have === 0) {
                    D.msg = "invalid bit length repeat", c.mode = Z;
                    break;
                  }
                  xe = c.lens[c.have - 1], K = 3 + (I & 3), I >>>= 2, P -= 2;
                } else if (je === 17) {
                  for (ft = _e + 3; P < ft; ) {
                    if (L === 0)
                      break e;
                    L--, I += z[a++] << P, P += 8;
                  }
                  I >>>= _e, P -= _e, xe = 0, K = 3 + (I & 7), I >>>= 3, P -= 3;
                } else {
                  for (ft = _e + 7; P < ft; ) {
                    if (L === 0)
                      break e;
                    L--, I += z[a++] << P, P += 8;
                  }
                  I >>>= _e, P -= _e, xe = 0, K = 11 + (I & 127), I >>>= 7, P -= 7;
                }
                if (c.have + K > c.nlen + c.ndist) {
                  D.msg = "invalid bit length repeat", c.mode = Z;
                  break;
                }
                for (; K--; )
                  c.lens[c.have++] = xe;
              }
            }
            if (c.mode === Z)
              break;
            if (c.lens[256] === 0) {
              D.msg = "invalid code -- missing end-of-block", c.mode = Z;
              break;
            }
            if (c.lenbits = 9, pt = { bits: c.lenbits }, tt = s(o, c.lens, 0, c.nlen, c.lencode, 0, c.work, pt), c.lenbits = pt.bits, tt) {
              D.msg = "invalid literal/lengths set", c.mode = Z;
              break;
            }
            if (c.distbits = 6, c.distcode = c.distdyn, pt = { bits: c.distbits }, tt = s(u, c.lens, c.nlen, c.ndist, c.distcode, 0, c.work, pt), c.distbits = pt.bits, tt) {
              D.msg = "invalid distances set", c.mode = Z;
              break;
            }
            if (c.mode = ae, F === v)
              break e;
          /* falls through */
          case ae:
            c.mode = se;
          /* falls through */
          case se:
            if (L >= 6 && d >= 258) {
              D.next_out = k, D.avail_out = d, D.next_in = a, D.avail_in = L, c.hold = I, c.bits = P, n(D, V), k = D.next_out, ie = D.output, d = D.avail_out, a = D.next_in, z = D.input, L = D.avail_in, I = c.hold, P = c.bits, c.mode === ce && (c.back = -1);
              break;
            }
            for (c.back = 0; Te = c.lencode[I & (1 << c.lenbits) - 1], _e = Te >>> 24, Ne = Te >>> 16 & 255, je = Te & 65535, !(_e <= P); ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if (Ne && (Ne & 240) === 0) {
              for (Ye = _e, Jt = Ne, Qt = je; Te = c.lencode[Qt + ((I & (1 << Ye + Jt) - 1) >> Ye)], _e = Te >>> 24, Ne = Te >>> 16 & 255, je = Te & 65535, !(Ye + _e <= P); ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              I >>>= Ye, P -= Ye, c.back += Ye;
            }
            if (I >>>= _e, P -= _e, c.back += _e, c.length = je, Ne === 0) {
              c.mode = b;
              break;
            }
            if (Ne & 32) {
              c.back = -1, c.mode = ce;
              break;
            }
            if (Ne & 64) {
              D.msg = "invalid literal/length code", c.mode = Z;
              break;
            }
            c.extra = Ne & 15, c.mode = Ee;
          /* falls through */
          case Ee:
            if (c.extra) {
              for (ft = c.extra; P < ft; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              c.length += I & (1 << c.extra) - 1, I >>>= c.extra, P -= c.extra, c.back += c.extra;
            }
            c.was = c.length, c.mode = ye;
          /* falls through */
          case ye:
            for (; Te = c.distcode[I & (1 << c.distbits) - 1], _e = Te >>> 24, Ne = Te >>> 16 & 255, je = Te & 65535, !(_e <= P); ) {
              if (L === 0)
                break e;
              L--, I += z[a++] << P, P += 8;
            }
            if ((Ne & 240) === 0) {
              for (Ye = _e, Jt = Ne, Qt = je; Te = c.distcode[Qt + ((I & (1 << Ye + Jt) - 1) >> Ye)], _e = Te >>> 24, Ne = Te >>> 16 & 255, je = Te & 65535, !(Ye + _e <= P); ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              I >>>= Ye, P -= Ye, c.back += Ye;
            }
            if (I >>>= _e, P -= _e, c.back += _e, Ne & 64) {
              D.msg = "invalid distance code", c.mode = Z;
              break;
            }
            c.offset = je, c.extra = Ne & 15, c.mode = ge;
          /* falls through */
          case ge:
            if (c.extra) {
              for (ft = c.extra; P < ft; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              c.offset += I & (1 << c.extra) - 1, I >>>= c.extra, P -= c.extra, c.back += c.extra;
            }
            if (c.offset > c.dmax) {
              D.msg = "invalid distance too far back", c.mode = Z;
              break;
            }
            c.mode = y;
          /* falls through */
          case y:
            if (d === 0)
              break e;
            if (K = V - d, c.offset > K) {
              if (K = c.offset - K, K > c.whave && c.sane) {
                D.msg = "invalid distance too far back", c.mode = Z;
                break;
              }
              K > c.wnext ? (K -= c.wnext, me = c.wsize - K) : me = c.wnext - K, K > c.length && (K = c.length), dt = c.window;
            } else
              dt = ie, me = k - c.offset, K = c.length;
            K > d && (K = d), d -= K, c.length -= K;
            do
              ie[k++] = dt[me++];
            while (--K);
            c.length === 0 && (c.mode = se);
            break;
          case b:
            if (d === 0)
              break e;
            ie[k++] = c.length, d--, c.mode = se;
            break;
          case B:
            if (c.wrap) {
              for (; P < 32; ) {
                if (L === 0)
                  break e;
                L--, I |= z[a++] << P, P += 8;
              }
              if (V -= d, D.total_out += V, c.total += V, V && (D.adler = c.check = /*UPDATE(state.check, put - _out, _out);*/
              c.flags ? t(c.check, ie, V, k - V) : e(c.check, ie, V, k - V)), V = d, (c.flags ? I : He(I)) !== c.check) {
                D.msg = "incorrect data check", c.mode = Z;
                break;
              }
              I = 0, P = 0;
            }
            c.mode = q;
          /* falls through */
          case q:
            if (c.wrap && c.flags) {
              for (; P < 32; ) {
                if (L === 0)
                  break e;
                L--, I += z[a++] << P, P += 8;
              }
              if (I !== (c.total & 4294967295)) {
                D.msg = "incorrect length check", c.mode = Z;
                break;
              }
              I = 0, P = 0;
            }
            c.mode = fe;
          /* falls through */
          case fe:
            tt = l;
            break e;
          case Z:
            tt = S;
            break e;
          case ne:
            return R;
          case Je:
          /* falls through */
          default:
            return E;
        }
    return D.next_out = k, D.avail_out = d, D.next_in = a, D.avail_in = L, c.hold = I, c.bits = P, (c.wsize || V !== D.avail_out && c.mode < Z && (c.mode < B || F !== f)) && Ot(D, D.output, D.next_out, V - D.avail_out), Q -= D.avail_in, V -= D.avail_out, D.total_in += Q, D.total_out += V, c.total += V, c.wrap && V && (D.adler = c.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
    c.flags ? t(c.check, ie, V, D.next_out - V) : e(c.check, ie, V, D.next_out - V)), D.data_type = c.bits + (c.last ? 64 : 0) + (c.mode === ce ? 128 : 0) + (c.mode === ae || c.mode === x ? 256 : 0), (Q === 0 && V === 0 || F === f) && tt === p && (tt = m), tt;
  }
  function H(D) {
    if (!D || !D.state)
      return E;
    var F = D.state;
    return F.window && (F.window = null), D.state = null, p;
  }
  function G(D, F) {
    var c;
    return !D || !D.state || (c = D.state, (c.wrap & 2) === 0) ? E : (c.head = F, F.done = !1, p);
  }
  function X(D, F) {
    var c = F.length, z, ie, a;
    return !D || !D.state || (z = D.state, z.wrap !== 0 && z.mode !== $) ? E : z.mode === $ && (ie = 1, ie = e(ie, F, c, 0), ie !== z.check) ? S : (a = Ot(D, F, c, c), a ? (z.mode = ne, R) : (z.havedict = 1, p));
  }
  return at.inflateReset = Ue, at.inflateReset2 = et, at.inflateResetKeep = Qe, at.inflateInit = ke, at.inflateInit2 = ze, at.inflate = _, at.inflateEnd = H, at.inflateGetHeader = G, at.inflateSetDictionary = X, at.inflateInfo = "pako inflate (from Nodeca project)", at;
}
var fa, gi;
function bo() {
  return gi || (gi = 1, fa = {
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
  }), fa;
}
var ua, mi;
function cc() {
  if (mi) return ua;
  mi = 1;
  function r() {
    this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
  }
  return ua = r, ua;
}
var _i;
function fc() {
  if (_i) return jt;
  _i = 1;
  var r = hc(), e = At(), t = Eo(), n = bo(), s = Ha(), i = yo(), o = cc(), u = Object.prototype.toString;
  function f(p) {
    if (!(this instanceof f)) return new f(p);
    this.options = e.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, p || {});
    var l = this.options;
    l.raw && l.windowBits >= 0 && l.windowBits < 16 && (l.windowBits = -l.windowBits, l.windowBits === 0 && (l.windowBits = -15)), l.windowBits >= 0 && l.windowBits < 16 && !(p && p.windowBits) && (l.windowBits += 32), l.windowBits > 15 && l.windowBits < 48 && (l.windowBits & 15) === 0 && (l.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
    var g = r.inflateInit2(
      this.strm,
      l.windowBits
    );
    if (g !== n.Z_OK)
      throw new Error(s[g]);
    if (this.header = new o(), r.inflateGetHeader(this.strm, this.header), l.dictionary && (typeof l.dictionary == "string" ? l.dictionary = t.string2buf(l.dictionary) : u.call(l.dictionary) === "[object ArrayBuffer]" && (l.dictionary = new Uint8Array(l.dictionary)), l.raw && (g = r.inflateSetDictionary(this.strm, l.dictionary), g !== n.Z_OK)))
      throw new Error(s[g]);
  }
  f.prototype.push = function(p, l) {
    var g = this.strm, E = this.options.chunkSize, S = this.options.dictionary, R, m, w, A, C, O = !1;
    if (this.ended)
      return !1;
    m = l === ~~l ? l : l === !0 ? n.Z_FINISH : n.Z_NO_FLUSH, typeof p == "string" ? g.input = t.binstring2buf(p) : u.call(p) === "[object ArrayBuffer]" ? g.input = new Uint8Array(p) : g.input = p, g.next_in = 0, g.avail_in = g.input.length;
    do {
      if (g.avail_out === 0 && (g.output = new e.Buf8(E), g.next_out = 0, g.avail_out = E), R = r.inflate(g, n.Z_NO_FLUSH), R === n.Z_NEED_DICT && S && (R = r.inflateSetDictionary(this.strm, S)), R === n.Z_BUF_ERROR && O === !0 && (R = n.Z_OK, O = !1), R !== n.Z_STREAM_END && R !== n.Z_OK)
        return this.onEnd(R), this.ended = !0, !1;
      g.next_out && (g.avail_out === 0 || R === n.Z_STREAM_END || g.avail_in === 0 && (m === n.Z_FINISH || m === n.Z_SYNC_FLUSH)) && (this.options.to === "string" ? (w = t.utf8border(g.output, g.next_out), A = g.next_out - w, C = t.buf2string(g.output, w), g.next_out = A, g.avail_out = E - A, A && e.arraySet(g.output, g.output, w, A, 0), this.onData(C)) : this.onData(e.shrinkBuf(g.output, g.next_out))), g.avail_in === 0 && g.avail_out === 0 && (O = !0);
    } while ((g.avail_in > 0 || g.avail_out === 0) && R !== n.Z_STREAM_END);
    return R === n.Z_STREAM_END && (m = n.Z_FINISH), m === n.Z_FINISH ? (R = r.inflateEnd(this.strm), this.onEnd(R), this.ended = !0, R === n.Z_OK) : (m === n.Z_SYNC_FLUSH && (this.onEnd(n.Z_OK), g.avail_out = 0), !0);
  }, f.prototype.onData = function(p) {
    this.chunks.push(p);
  }, f.prototype.onEnd = function(p) {
    p === n.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = p, this.msg = this.strm.msg;
  };
  function T(p, l) {
    var g = new f(l);
    if (g.push(p, !0), g.err)
      throw g.msg || s[g.err];
    return g.result;
  }
  function v(p, l) {
    return l = l || {}, l.raw = !0, T(p, l);
  }
  return jt.Inflate = f, jt.inflate = T, jt.inflateRaw = v, jt.ungzip = T, jt;
}
var da, wi;
function uc() {
  if (wi) return da;
  wi = 1;
  var r = At().assign, e = oc(), t = fc(), n = bo(), s = {};
  return r(s, e, t, n), da = s, da;
}
var vi;
function dc() {
  if (vi) return qt;
  vi = 1;
  var r = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", e = uc(), t = Ie(), n = nt(), s = r ? "uint8array" : "array";
  qt.magic = "\b\0";
  function i(o, u) {
    n.call(this, "FlateWorker/" + o), this._pako = null, this._pakoAction = o, this._pakoOptions = u, this.meta = {};
  }
  return t.inherits(i, n), i.prototype.processChunk = function(o) {
    this.meta = o.meta, this._pako === null && this._createPako(), this._pako.push(t.transformTo(s, o.data), !1);
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
    this._pako.onData = function(u) {
      o.push({
        data: u,
        meta: o.meta
      });
    };
  }, qt.compressWorker = function(o) {
    return new i("Deflate", o);
  }, qt.uncompressWorker = function() {
    return new i("Inflate", {});
  }, qt;
}
var Ei;
function To() {
  if (Ei) return cr;
  Ei = 1;
  var r = nt();
  return cr.STORE = {
    magic: "\0\0",
    compressWorker: function() {
      return new r("STORE compression");
    },
    uncompressWorker: function() {
      return new r("STORE decompression");
    }
  }, cr.DEFLATE = dc(), cr;
}
var yt = {}, yi;
function So() {
  return yi || (yi = 1, yt.LOCAL_FILE_HEADER = "PK", yt.CENTRAL_FILE_HEADER = "PK", yt.CENTRAL_DIRECTORY_END = "PK", yt.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", yt.ZIP64_CENTRAL_DIRECTORY_END = "PK", yt.DATA_DESCRIPTOR = "PK\x07\b"), yt;
}
var pa, bi;
function pc() {
  if (bi) return pa;
  bi = 1;
  var r = Ie(), e = nt(), t = Xt(), n = ja(), s = So(), i = function(l, g) {
    var E = "", S;
    for (S = 0; S < g; S++)
      E += String.fromCharCode(l & 255), l = l >>> 8;
    return E;
  }, o = function(l, g) {
    var E = l;
    return l || (E = g ? 16893 : 33204), (E & 65535) << 16;
  }, u = function(l) {
    return (l || 0) & 63;
  }, f = function(l, g, E, S, R, m) {
    var w = l.file, A = l.compression, C = m !== t.utf8encode, O = r.transformTo("string", m(w.name)), j = r.transformTo("string", t.utf8encode(w.name)), M = w.comment, Y = r.transformTo("string", m(M)), ee = r.transformTo("string", t.utf8encode(M)), te = j.length !== w.name.length, le = ee.length !== M.length, oe, $, ce = "", ve = "", ue = "", x = w.dir, N = w.date, W = {
      crc32: 0,
      compressedSize: 0,
      uncompressedSize: 0
    };
    (!g || E) && (W.crc32 = l.crc32, W.compressedSize = l.compressedSize, W.uncompressedSize = l.uncompressedSize);
    var J = 0;
    g && (J |= 8), !C && (te || le) && (J |= 2048);
    var re = 0, ae = 0;
    x && (re |= 16), R === "UNIX" ? (ae = 798, re |= o(w.unixPermissions, x)) : (ae = 20, re |= u(w.dosPermissions)), oe = N.getUTCHours(), oe = oe << 6, oe = oe | N.getUTCMinutes(), oe = oe << 5, oe = oe | N.getUTCSeconds() / 2, $ = N.getUTCFullYear() - 1980, $ = $ << 4, $ = $ | N.getUTCMonth() + 1, $ = $ << 5, $ = $ | N.getUTCDate(), te && (ve = // Version
    i(1, 1) + // NameCRC32
    i(n(O), 4) + // UnicodeName
    j, ce += // Info-ZIP Unicode Path Extra Field
    "up" + // size
    i(ve.length, 2) + // content
    ve), le && (ue = // Version
    i(1, 1) + // CommentCRC32
    i(n(Y), 4) + // UnicodeName
    ee, ce += // Info-ZIP Unicode Path Extra Field
    "uc" + // size
    i(ue.length, 2) + // content
    ue);
    var se = "";
    se += `
\0`, se += i(J, 2), se += A.magic, se += i(oe, 2), se += i($, 2), se += i(W.crc32, 4), se += i(W.compressedSize, 4), se += i(W.uncompressedSize, 4), se += i(O.length, 2), se += i(ce.length, 2);
    var Ee = s.LOCAL_FILE_HEADER + se + O + ce, ye = s.CENTRAL_FILE_HEADER + // version made by (00: DOS)
    i(ae, 2) + // file header (common to file and central directory)
    se + // file comment length
    i(Y.length, 2) + // disk number start
    "\0\0\0\0" + // external file attributes
    i(re, 4) + // relative offset of local header
    i(S, 4) + // file name
    O + // extra field
    ce + // file comment
    Y;
    return {
      fileRecord: Ee,
      dirRecord: ye
    };
  }, T = function(l, g, E, S, R) {
    var m = "", w = r.transformTo("string", R(S));
    return m = s.CENTRAL_DIRECTORY_END + // number of this disk
    "\0\0\0\0" + // total number of entries in the central directory on this disk
    i(l, 2) + // total number of entries in the central directory
    i(l, 2) + // size of the central directory   4 bytes
    i(g, 4) + // offset of start of central directory with respect to the starting disk number
    i(E, 4) + // .ZIP file comment length
    i(w.length, 2) + // .ZIP file comment
    w, m;
  }, v = function(l) {
    var g = "";
    return g = s.DATA_DESCRIPTOR + // crc-32                          4 bytes
    i(l.crc32, 4) + // compressed size                 4 bytes
    i(l.compressedSize, 4) + // uncompressed size               4 bytes
    i(l.uncompressedSize, 4), g;
  };
  function p(l, g, E, S) {
    e.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = g, this.zipPlatform = E, this.encodeFileName = S, this.streamFiles = l, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
  }
  return r.inherits(p, e), p.prototype.push = function(l) {
    var g = l.meta.percent || 0, E = this.entriesCount, S = this._sources.length;
    this.accumulate ? this.contentBuffer.push(l) : (this.bytesWritten += l.data.length, e.prototype.push.call(this, {
      data: l.data,
      meta: {
        currentFile: this.currentFile,
        percent: E ? (g + 100 * (E - S - 1)) / E : 100
      }
    }));
  }, p.prototype.openedSource = function(l) {
    this.currentSourceOffset = this.bytesWritten, this.currentFile = l.file.name;
    var g = this.streamFiles && !l.file.dir;
    if (g) {
      var E = f(l, g, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
      this.push({
        data: E.fileRecord,
        meta: { percent: 0 }
      });
    } else
      this.accumulate = !0;
  }, p.prototype.closedSource = function(l) {
    this.accumulate = !1;
    var g = this.streamFiles && !l.file.dir, E = f(l, g, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
    if (this.dirRecords.push(E.dirRecord), g)
      this.push({
        data: v(l),
        meta: { percent: 100 }
      });
    else
      for (this.push({
        data: E.fileRecord,
        meta: { percent: 0 }
      }); this.contentBuffer.length; )
        this.push(this.contentBuffer.shift());
    this.currentFile = null;
  }, p.prototype.flush = function() {
    for (var l = this.bytesWritten, g = 0; g < this.dirRecords.length; g++)
      this.push({
        data: this.dirRecords[g],
        meta: { percent: 100 }
      });
    var E = this.bytesWritten - l, S = T(this.dirRecords.length, E, l, this.zipComment, this.encodeFileName);
    this.push({
      data: S,
      meta: { percent: 100 }
    });
  }, p.prototype.prepareNextSource = function() {
    this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
  }, p.prototype.registerPrevious = function(l) {
    this._sources.push(l);
    var g = this;
    return l.on("data", function(E) {
      g.processChunk(E);
    }), l.on("end", function() {
      g.closedSource(g.previous.streamInfo), g._sources.length ? g.prepareNextSource() : g.end();
    }), l.on("error", function(E) {
      g.error(E);
    }), this;
  }, p.prototype.resume = function() {
    if (!e.prototype.resume.call(this))
      return !1;
    if (!this.previous && this._sources.length)
      return this.prepareNextSource(), !0;
    if (!this.previous && !this._sources.length && !this.generatedError)
      return this.end(), !0;
  }, p.prototype.error = function(l) {
    var g = this._sources;
    if (!e.prototype.error.call(this, l))
      return !1;
    for (var E = 0; E < g.length; E++)
      try {
        g[E].error(l);
      } catch {
      }
    return !0;
  }, p.prototype.lock = function() {
    e.prototype.lock.call(this);
    for (var l = this._sources, g = 0; g < l.length; g++)
      l[g].lock();
  }, pa = p, pa;
}
var Ti;
function gc() {
  if (Ti) return aa;
  Ti = 1;
  var r = To(), e = pc(), t = function(n, s) {
    var i = n || s, o = r[i];
    if (!o)
      throw new Error(i + " is not a valid compression method !");
    return o;
  };
  return aa.generateWorker = function(n, s, i) {
    var o = new e(s.streamFiles, i, s.platform, s.encodeFileName), u = 0;
    try {
      n.forEach(function(f, T) {
        u++;
        var v = t(T.options.compression, s.compression), p = T.options.compressionOptions || s.compressionOptions || {}, l = T.dir, g = T.date;
        T._compressWorker(v, p).withStreamInfo("file", {
          name: f,
          dir: l,
          date: g,
          comment: T.comment || "",
          unixPermissions: T.unixPermissions,
          dosPermissions: T.dosPermissions
        }).pipe(o);
      }), o.entriesCount = u;
    } catch (f) {
      o.error(f);
    }
    return o;
  }, aa;
}
var ga, Si;
function mc() {
  if (Si) return ga;
  Si = 1;
  var r = Ie(), e = nt();
  function t(n, s) {
    e.call(this, "Nodejs stream input adapter for " + n), this._upstreamEnded = !1, this._bindStream(s);
  }
  return r.inherits(t, e), t.prototype._bindStream = function(n) {
    var s = this;
    this._stream = n, n.pause(), n.on("data", function(i) {
      s.push({
        data: i,
        meta: {
          percent: 0
        }
      });
    }).on("error", function(i) {
      s.isPaused ? this.generatedError = i : s.error(i);
    }).on("end", function() {
      s.isPaused ? s._upstreamEnded = !0 : s.end();
    });
  }, t.prototype.pause = function() {
    return e.prototype.pause.call(this) ? (this._stream.pause(), !0) : !1;
  }, t.prototype.resume = function() {
    return e.prototype.resume.call(this) ? (this._upstreamEnded ? this.end() : this._stream.resume(), !0) : !1;
  }, ga = t, ga;
}
var ma, Ai;
function _c() {
  if (Ai) return ma;
  Ai = 1;
  var r = Xt(), e = Ie(), t = nt(), n = po(), s = go(), i = Ba(), o = ac(), u = gc(), f = yr(), T = mc(), v = function(R, m, w) {
    var A = e.getTypeOf(m), C, O = e.extend(w || {}, s);
    O.date = O.date || /* @__PURE__ */ new Date(), O.compression !== null && (O.compression = O.compression.toUpperCase()), typeof O.unixPermissions == "string" && (O.unixPermissions = parseInt(O.unixPermissions, 8)), O.unixPermissions && O.unixPermissions & 16384 && (O.dir = !0), O.dosPermissions && O.dosPermissions & 16 && (O.dir = !0), O.dir && (R = l(R)), O.createFolders && (C = p(R)) && g.call(this, C, !0);
    var j = A === "string" && O.binary === !1 && O.base64 === !1;
    (!w || typeof w.binary > "u") && (O.binary = !j);
    var M = m instanceof i && m.uncompressedSize === 0;
    (M || O.dir || !m || m.length === 0) && (O.base64 = !1, O.binary = !0, m = "", O.compression = "STORE", A = "string");
    var Y = null;
    m instanceof i || m instanceof t ? Y = m : f.isNode && f.isStream(m) ? Y = new T(R, m) : Y = e.prepareContent(R, m, O.binary, O.optimizedBinaryString, O.base64);
    var ee = new o(R, Y, O);
    this.files[R] = ee;
  }, p = function(R) {
    R.slice(-1) === "/" && (R = R.substring(0, R.length - 1));
    var m = R.lastIndexOf("/");
    return m > 0 ? R.substring(0, m) : "";
  }, l = function(R) {
    return R.slice(-1) !== "/" && (R += "/"), R;
  }, g = function(R, m) {
    return m = typeof m < "u" ? m : s.createFolders, R = l(R), this.files[R] || v.call(this, R, null, {
      dir: !0,
      createFolders: m
    }), this.files[R];
  };
  function E(R) {
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
      var m, w, A;
      for (m in this.files)
        A = this.files[m], w = m.slice(this.root.length, m.length), w && m.slice(0, this.root.length) === this.root && R(w, A);
    },
    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function(R) {
      var m = [];
      return this.forEach(function(w, A) {
        R(w, A) && m.push(A);
      }), m;
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
    file: function(R, m, w) {
      if (arguments.length === 1)
        if (E(R)) {
          var A = R;
          return this.filter(function(O, j) {
            return !j.dir && A.test(O);
          });
        } else {
          var C = this.files[this.root + R];
          return C && !C.dir ? C : null;
        }
      else
        R = this.root + R, v.call(this, R, m, w);
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
      if (E(R))
        return this.filter(function(C, O) {
          return O.dir && R.test(C);
        });
      var m = this.root + R, w = g.call(this, m), A = this.clone();
      return A.root = w.name, A;
    },
    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function(R) {
      R = this.root + R;
      var m = this.files[R];
      if (m || (R.slice(-1) !== "/" && (R += "/"), m = this.files[R]), m && !m.dir)
        delete this.files[R];
      else
        for (var w = this.filter(function(C, O) {
          return O.name.slice(0, R.length) === R;
        }), A = 0; A < w.length; A++)
          delete this.files[w[A].name];
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
      var m, w = {};
      try {
        if (w = e.extend(R || {}, {
          streamFiles: !1,
          compression: "STORE",
          compressionOptions: null,
          type: "",
          platform: "DOS",
          comment: null,
          mimeType: "application/zip",
          encodeFileName: r.utf8encode
        }), w.type = w.type.toLowerCase(), w.compression = w.compression.toUpperCase(), w.type === "binarystring" && (w.type = "string"), !w.type)
          throw new Error("No output type specified.");
        e.checkSupport(w.type), (w.platform === "darwin" || w.platform === "freebsd" || w.platform === "linux" || w.platform === "sunos") && (w.platform = "UNIX"), w.platform === "win32" && (w.platform = "DOS");
        var A = w.comment || this.comment || "";
        m = u.generateWorker(this, w, A);
      } catch (C) {
        m = new t("error"), m.error(C);
      }
      return new n(m, w.type || "string", w.mimeType);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateAsync: function(R, m) {
      return this.generateInternalStream(R).accumulate(m);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateNodeStream: function(R, m) {
      return R = R || {}, R.type || (R.type = "nodebuffer"), this.generateInternalStream(R).toNodejsStream(m);
    }
  };
  return ma = S, ma;
}
var _a, Ii;
function Ao() {
  if (Ii) return _a;
  Ii = 1;
  var r = Ie();
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
      var n = 0, s;
      for (this.checkOffset(t), s = this.index + t - 1; s >= this.index; s--)
        n = (n << 8) + this.byteAt(s);
      return this.index += t, n;
    },
    /**
     * Get the next string with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {string} the corresponding string.
     */
    readString: function(t) {
      return r.transformTo("string", this.readData(t));
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
  }, _a = e, _a;
}
var wa, Ri;
function Io() {
  if (Ri) return wa;
  Ri = 1;
  var r = Ao(), e = Ie();
  function t(n) {
    r.call(this, n);
    for (var s = 0; s < this.data.length; s++)
      n[s] = n[s] & 255;
  }
  return e.inherits(t, r), t.prototype.byteAt = function(n) {
    return this.data[this.zero + n];
  }, t.prototype.lastIndexOfSignature = function(n) {
    for (var s = n.charCodeAt(0), i = n.charCodeAt(1), o = n.charCodeAt(2), u = n.charCodeAt(3), f = this.length - 4; f >= 0; --f)
      if (this.data[f] === s && this.data[f + 1] === i && this.data[f + 2] === o && this.data[f + 3] === u)
        return f - this.zero;
    return -1;
  }, t.prototype.readAndCheckSignature = function(n) {
    var s = n.charCodeAt(0), i = n.charCodeAt(1), o = n.charCodeAt(2), u = n.charCodeAt(3), f = this.readData(4);
    return s === f[0] && i === f[1] && o === f[2] && u === f[3];
  }, t.prototype.readData = function(n) {
    if (this.checkOffset(n), n === 0)
      return [];
    var s = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, s;
  }, wa = t, wa;
}
var va, xi;
function wc() {
  if (xi) return va;
  xi = 1;
  var r = Ao(), e = Ie();
  function t(n) {
    r.call(this, n);
  }
  return e.inherits(t, r), t.prototype.byteAt = function(n) {
    return this.data.charCodeAt(this.zero + n);
  }, t.prototype.lastIndexOfSignature = function(n) {
    return this.data.lastIndexOf(n) - this.zero;
  }, t.prototype.readAndCheckSignature = function(n) {
    var s = this.readData(4);
    return n === s;
  }, t.prototype.readData = function(n) {
    this.checkOffset(n);
    var s = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, s;
  }, va = t, va;
}
var Ea, Di;
function Ro() {
  if (Di) return Ea;
  Di = 1;
  var r = Io(), e = Ie();
  function t(n) {
    r.call(this, n);
  }
  return e.inherits(t, r), t.prototype.readData = function(n) {
    if (this.checkOffset(n), n === 0)
      return new Uint8Array(0);
    var s = this.data.subarray(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, s;
  }, Ea = t, Ea;
}
var ya, Ci;
function vc() {
  if (Ci) return ya;
  Ci = 1;
  var r = Ro(), e = Ie();
  function t(n) {
    r.call(this, n);
  }
  return e.inherits(t, r), t.prototype.readData = function(n) {
    this.checkOffset(n);
    var s = this.data.slice(this.zero + this.index, this.zero + this.index + n);
    return this.index += n, s;
  }, ya = t, ya;
}
var ba, Ni;
function xo() {
  if (Ni) return ba;
  Ni = 1;
  var r = Ie(), e = St(), t = Io(), n = wc(), s = vc(), i = Ro();
  return ba = function(o) {
    var u = r.getTypeOf(o);
    return r.checkSupport(u), u === "string" && !e.uint8array ? new n(o) : u === "nodebuffer" ? new s(o) : e.uint8array ? new i(r.transformTo("uint8array", o)) : new t(r.transformTo("array", o));
  }, ba;
}
var Ta, Pi;
function Ec() {
  if (Pi) return Ta;
  Pi = 1;
  var r = xo(), e = Ie(), t = Ba(), n = ja(), s = Xt(), i = To(), o = St(), u = 0, f = 3, T = function(p) {
    for (var l in i)
      if (Object.prototype.hasOwnProperty.call(i, l) && i[l].magic === p)
        return i[l];
    return null;
  };
  function v(p, l) {
    this.options = p, this.loadOptions = l;
  }
  return v.prototype = {
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
    readLocalPart: function(p) {
      var l, g;
      if (p.skip(22), this.fileNameLength = p.readInt(2), g = p.readInt(2), this.fileName = p.readData(this.fileNameLength), p.skip(g), this.compressedSize === -1 || this.uncompressedSize === -1)
        throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
      if (l = T(this.compressionMethod), l === null)
        throw new Error("Corrupted zip : compression " + e.pretty(this.compressionMethod) + " unknown (inner file : " + e.transformTo("string", this.fileName) + ")");
      this.decompressed = new t(this.compressedSize, this.uncompressedSize, this.crc32, l, p.readData(this.compressedSize));
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readCentralPart: function(p) {
      this.versionMadeBy = p.readInt(2), p.skip(2), this.bitFlag = p.readInt(2), this.compressionMethod = p.readString(2), this.date = p.readDate(), this.crc32 = p.readInt(4), this.compressedSize = p.readInt(4), this.uncompressedSize = p.readInt(4);
      var l = p.readInt(2);
      if (this.extraFieldsLength = p.readInt(2), this.fileCommentLength = p.readInt(2), this.diskNumberStart = p.readInt(2), this.internalFileAttributes = p.readInt(2), this.externalFileAttributes = p.readInt(4), this.localHeaderOffset = p.readInt(4), this.isEncrypted())
        throw new Error("Encrypted zip are not supported");
      p.skip(l), this.readExtraFields(p), this.parseZIP64ExtraField(p), this.fileComment = p.readData(this.fileCommentLength);
    },
    /**
     * Parse the external file attributes and get the unix/dos permissions.
     */
    processAttributes: function() {
      this.unixPermissions = null, this.dosPermissions = null;
      var p = this.versionMadeBy >> 8;
      this.dir = !!(this.externalFileAttributes & 16), p === u && (this.dosPermissions = this.externalFileAttributes & 63), p === f && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), !this.dir && this.fileNameStr.slice(-1) === "/" && (this.dir = !0);
    },
    /**
     * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
     * @param {DataReader} reader the reader to use.
     */
    parseZIP64ExtraField: function() {
      if (this.extraFields[1]) {
        var p = r(this.extraFields[1].value);
        this.uncompressedSize === e.MAX_VALUE_32BITS && (this.uncompressedSize = p.readInt(8)), this.compressedSize === e.MAX_VALUE_32BITS && (this.compressedSize = p.readInt(8)), this.localHeaderOffset === e.MAX_VALUE_32BITS && (this.localHeaderOffset = p.readInt(8)), this.diskNumberStart === e.MAX_VALUE_32BITS && (this.diskNumberStart = p.readInt(4));
      }
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readExtraFields: function(p) {
      var l = p.index + this.extraFieldsLength, g, E, S;
      for (this.extraFields || (this.extraFields = {}); p.index + 4 < l; )
        g = p.readInt(2), E = p.readInt(2), S = p.readData(E), this.extraFields[g] = {
          id: g,
          length: E,
          value: S
        };
      p.setIndex(l);
    },
    /**
     * Apply an UTF8 transformation if needed.
     */
    handleUTF8: function() {
      var p = o.uint8array ? "uint8array" : "array";
      if (this.useUTF8())
        this.fileNameStr = s.utf8decode(this.fileName), this.fileCommentStr = s.utf8decode(this.fileComment);
      else {
        var l = this.findExtraFieldUnicodePath();
        if (l !== null)
          this.fileNameStr = l;
        else {
          var g = e.transformTo(p, this.fileName);
          this.fileNameStr = this.loadOptions.decodeFileName(g);
        }
        var E = this.findExtraFieldUnicodeComment();
        if (E !== null)
          this.fileCommentStr = E;
        else {
          var S = e.transformTo(p, this.fileComment);
          this.fileCommentStr = this.loadOptions.decodeFileName(S);
        }
      }
    },
    /**
     * Find the unicode path declared in the extra field, if any.
     * @return {String} the unicode path, null otherwise.
     */
    findExtraFieldUnicodePath: function() {
      var p = this.extraFields[28789];
      if (p) {
        var l = r(p.value);
        return l.readInt(1) !== 1 || n(this.fileName) !== l.readInt(4) ? null : s.utf8decode(l.readData(p.length - 5));
      }
      return null;
    },
    /**
     * Find the unicode comment declared in the extra field, if any.
     * @return {String} the unicode comment, null otherwise.
     */
    findExtraFieldUnicodeComment: function() {
      var p = this.extraFields[25461];
      if (p) {
        var l = r(p.value);
        return l.readInt(1) !== 1 || n(this.fileComment) !== l.readInt(4) ? null : s.utf8decode(l.readData(p.length - 5));
      }
      return null;
    }
  }, Ta = v, Ta;
}
var Sa, ki;
function yc() {
  if (ki) return Sa;
  ki = 1;
  var r = xo(), e = Ie(), t = So(), n = Ec(), s = St();
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
        var u = this.reader.readString(4);
        throw new Error("Corrupted zip or bug: unexpected signature (" + e.pretty(u) + ", expected " + e.pretty(o) + ")");
      }
    },
    /**
     * Check if the given signature is at the given index.
     * @param {number} askedIndex the index to check.
     * @param {string} expectedSignature the signature to expect.
     * @return {boolean} true if the signature is here, false otherwise.
     */
    isSignature: function(o, u) {
      var f = this.reader.index;
      this.reader.setIndex(o);
      var T = this.reader.readString(4), v = T === u;
      return this.reader.setIndex(f), v;
    },
    /**
     * Read the end of the central directory.
     */
    readBlockEndOfCentral: function() {
      this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
      var o = this.reader.readData(this.zipCommentLength), u = s.uint8array ? "uint8array" : "array", f = e.transformTo(u, o);
      this.zipComment = this.loadOptions.decodeFileName(f);
    },
    /**
     * Read the end of the Zip 64 central directory.
     * Not merged with the method readEndOfCentral :
     * The end of central can coexist with its Zip64 brother,
     * I don't want to read the wrong number of bytes !
     */
    readBlockZip64EndOfCentral: function() {
      this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
      for (var o = this.zip64EndOfCentralSize - 44, u = 0, f, T, v; u < o; )
        f = this.reader.readInt(2), T = this.reader.readInt(4), v = this.reader.readData(T), this.zip64ExtensibleData[f] = {
          id: f,
          length: T,
          value: v
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
      var o, u;
      for (o = 0; o < this.files.length; o++)
        u = this.files[o], this.reader.setIndex(u.localHeaderOffset), this.checkSignature(t.LOCAL_FILE_HEADER), u.readLocalPart(this.reader), u.handleUTF8(), u.processAttributes();
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
        var u = !this.isSignature(0, t.LOCAL_FILE_HEADER);
        throw u ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
      }
      this.reader.setIndex(o);
      var f = o;
      if (this.checkSignature(t.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === e.MAX_VALUE_16BITS || this.diskWithCentralDirStart === e.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === e.MAX_VALUE_16BITS || this.centralDirRecords === e.MAX_VALUE_16BITS || this.centralDirSize === e.MAX_VALUE_32BITS || this.centralDirOffset === e.MAX_VALUE_32BITS) {
        if (this.zip64 = !0, o = this.reader.lastIndexOfSignature(t.ZIP64_CENTRAL_DIRECTORY_LOCATOR), o < 0)
          throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
        if (this.reader.setIndex(o), this.checkSignature(t.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, t.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(t.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0))
          throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
        this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(t.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
      }
      var T = this.centralDirOffset + this.centralDirSize;
      this.zip64 && (T += 20, T += 12 + this.zip64EndOfCentralSize);
      var v = f - T;
      if (v > 0)
        this.isSignature(f, t.CENTRAL_FILE_HEADER) || (this.reader.zero = v);
      else if (v < 0)
        throw new Error("Corrupted zip: missing " + Math.abs(v) + " bytes.");
    },
    prepareReader: function(o) {
      this.reader = r(o);
    },
    /**
     * Read a zip file and create ZipEntries.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
     */
    load: function(o) {
      this.prepareReader(o), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
    }
  }, Sa = i, Sa;
}
var Aa, Oi;
function bc() {
  if (Oi) return Aa;
  Oi = 1;
  var r = Ie(), e = Kt(), t = Xt(), n = yc(), s = _o(), i = yr();
  function o(u) {
    return new e.Promise(function(f, T) {
      var v = u.decompressed.getContentWorker().pipe(new s());
      v.on("error", function(p) {
        T(p);
      }).on("end", function() {
        v.streamInfo.crc32 !== u.decompressed.crc32 ? T(new Error("Corrupted zip : CRC32 mismatch")) : f();
      }).resume();
    });
  }
  return Aa = function(u, f) {
    var T = this;
    return f = r.extend(f || {}, {
      base64: !1,
      checkCRC32: !1,
      optimizedBinaryString: !1,
      createFolders: !1,
      decodeFileName: t.utf8decode
    }), i.isNode && i.isStream(u) ? e.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : r.prepareContent("the loaded zip file", u, !0, f.optimizedBinaryString, f.base64).then(function(v) {
      var p = new n(f);
      return p.load(v), p;
    }).then(function(p) {
      var l = [e.Promise.resolve(p)], g = p.files;
      if (f.checkCRC32)
        for (var E = 0; E < g.length; E++)
          l.push(o(g[E]));
      return e.Promise.all(l);
    }).then(function(p) {
      for (var l = p.shift(), g = l.files, E = 0; E < g.length; E++) {
        var S = g[E], R = S.fileNameStr, m = r.resolve(S.fileNameStr);
        T.file(m, S.decompressed, {
          binary: !0,
          optimizedBinaryString: !0,
          date: S.date,
          dir: S.dir,
          comment: S.fileCommentStr.length ? S.fileCommentStr : null,
          unixPermissions: S.unixPermissions,
          dosPermissions: S.dosPermissions,
          createFolders: f.createFolders
        }), S.dir || (T.file(m).unsafeOriginalName = R);
      }
      return l.zipComment.length && (T.comment = l.zipComment), T;
    });
  }, Aa;
}
var Ia, Li;
function Tc() {
  if (Li) return Ia;
  Li = 1;
  function r() {
    if (!(this instanceof r))
      return new r();
    if (arguments.length)
      throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
    this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
      var e = new r();
      for (var t in this)
        typeof this[t] != "function" && (e[t] = this[t]);
      return e;
    };
  }
  return r.prototype = _c(), r.prototype.loadAsync = bc(), r.support = St(), r.defaults = go(), r.version = "3.10.1", r.loadAsync = function(e, t) {
    return new r().loadAsync(e, t);
  }, r.external = Kt(), Ia = r, Ia;
}
var Sc = Tc();
const Fi = /* @__PURE__ */ vs(Sc), bt = 283.465, Ac = {
  A4: { width: 59528, height: 84188 },
  // 210mm x 297mm
  Letter: { width: 61200, height: 79200 },
  // 216mm x 280mm
  B5: { width: 49937, height: 70866 }
  // 176mm x 250mm
}, Ic = [
  De.join(process.cwd(), "resources", "blank.hwpx"),
  De.join(process.cwd(), "assets", "blank.hwpx"),
  De.join(process.cwd(), "static", "blank.hwpx")
];
class Rc {
  /**
   * HWPX 내보내기 (원클릭 생성)
   */
  async exportHwpx(e) {
    try {
      const t = Ac[e.paperSize], n = this.ensureHwpxExtension(e.outputPath), s = await this.resolveTemplatePath(e.referenceHwpxPath);
      let i, o;
      return s ? (i = await this.buildFromTemplate(e, t, s), o = "HWPX 파일이 생성되었습니다. (템플릿 기반)") : (i = await this.buildFromScratch(e, t), o = "HWPX 파일이 생성되었습니다."), await Ke.writeFile(n, i), {
        success: !0,
        filePath: n,
        message: o
      };
    } catch (t) {
      throw new pe(
        he.FS_WRITE_FAILED,
        `HWPX export failed: ${t instanceof Error ? t.message : "Unknown error"}`
      );
    }
  }
  ensureHwpxExtension(e) {
    if (!e)
      throw new pe(he.VALIDATION_FAILED, "Output path is required");
    return e.endsWith(".hwpx") ? e : e.replace(/\.[^.]*$/, "") + ".hwpx";
  }
  async resolveTemplatePath(e) {
    if (e && e.trim().length > 0)
      try {
        return await Ke.access(e), e;
      } catch {
        throw new pe(
          he.FS_READ_FAILED,
          `Reference HWPX not found: ${e}`
        );
      }
    for (const t of Ic)
      try {
        return await Ke.access(t), t;
      } catch {
      }
    return null;
  }
  async buildFromTemplate(e, t, n) {
    const s = await Ke.readFile(n), i = await Fi.loadAsync(s), o = await i.file("Contents/header.xml")?.async("string"), u = await i.file("Contents/section0.xml")?.async("string"), f = await i.file("Contents/content.hpf")?.async("string");
    if (!o || !u || !f)
      throw new pe(
        he.FS_READ_FAILED,
        "Template is missing required HWPX files (header.xml, section0.xml, content.hpf)."
      );
    return i.file("Contents/header.xml", this.updateHeaderXml(o, e)), i.file(
      "Contents/section0.xml",
      this.updateSectionXml(u, e, t)
    ), i.file("Contents/content.hpf", this.updateContentHpf(f, e)), await i.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }
  updateHeaderXml(e, t) {
    const n = this.escapeXml(t.title), s = (/* @__PURE__ */ new Date()).toISOString();
    return e.replace(/<hh:title>[\s\S]*?<\/hh:title>/, `<hh:title>${n}</hh:title>`).replace(/<hh:date>[\s\S]*?<\/hh:date>/, `<hh:date>${s}</hh:date>`);
  }
  updateContentHpf(e, t) {
    const n = this.escapeXml(t.title), s = (/* @__PURE__ */ new Date()).toISOString();
    return e.replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${n}</dc:title>`).replace(/<dc:date>[\s\S]*?<\/dc:date>/, `<dc:date>${s}</dc:date>`);
  }
  updateSectionXml(e, t, n) {
    const s = Math.round(t.marginLeft * bt), i = Math.round(t.marginRight * bt), o = Math.round(t.marginTop * bt), u = Math.round(t.marginBottom * bt), f = this.convertHtmlToParagraphs(t.content, t.title);
    let T = e;
    T = T.replace(
      /<hc:width>\d+<\/hc:width>/,
      `<hc:width>${n.width}</hc:width>`
    ), T = T.replace(
      /<hc:height>\d+<\/hc:height>/,
      `<hc:height>${n.height}</hc:height>`
    );
    const v = T.match(/<hc:pageMargin\b[^>]*\/>/);
    if (v) {
      const l = this.parseXmlAttributes(v[0]), g = l.header ?? "4252", E = l.footer ?? "4252", S = l.gutter ?? "0", R = `<hc:pageMargin left="${s}" right="${i}" top="${o}" bottom="${u}" header="${g}" footer="${E}" gutter="${S}"/>`;
      T = T.replace(v[0], R);
    }
    return /<\/hs:secPr>/.test(T) && (T = T.replace(
      /(<\/hs:secPr>)([\s\S]*?)(<\/hs:sec>)/,
      `$1
${f}
$3`
    )), T;
  }
  /**
   * 템플릿 없이 HWPX를 직접 생성 (원클릭)
   */
  async buildFromScratch(e, t) {
    const n = new Fi();
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
    const n = Math.round(e.marginLeft * bt), s = Math.round(e.marginRight * bt), i = Math.round(e.marginTop * bt), o = Math.round(e.marginBottom * bt), u = `<hp:secPr id="" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
      <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
      <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
      <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="0" fill="0" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
      <hp:lineNumberShape restartType="0" countBy="0" distance="0"/>
      <hp:pagePr landscape="NARROWLY" width="${t.width}" height="${t.height}" gutterType="LEFT_ONLY">
        <hp:margin header="4252" footer="4252" gutter="0" left="${n}" right="${s}" top="${i}" bottom="${o}"/>
      </hp:pagePr>
      <hp:footNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:footNotePr>
      <hp:endNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:endNotePr>
      <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="0" headerInside="0" footerInside="0">
        <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
      </hp:pageBorderFill>
    </hp:secPr>`, T = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
        id="0" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
${this.convertHtmlToParagraphs(e.content, e.title, u)}
</hs:sec>`;
    return this.compressXml(T);
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
    for (const s of n)
      t[s[1]] = s[2];
    return t;
  }
  /**
   * HTML을 HWPX paragraph XML로 변환
   */
  convertHtmlToParagraphs(e, t, n) {
    const s = [];
    let i = Math.floor(Math.random() * 4e9);
    const o = i++;
    n ? s.push(`  <hp:p id="${o}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
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
  </hp:p>`) : s.push(`  <hp:p id="${o}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(t)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`), s.push(`  <hp:p id="${i++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t></hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    const f = this.htmlToText(e).split(`
`).filter((T) => T.trim());
    for (const T of f)
      T.trim() && s.push(`  <hp:p id="${i++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(T)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    return s.join(`
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
const xc = new Rc(), Dc = 56.7, Cc = 2, Nc = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  B5: { width: 176, height: 250 }
}, Mi = {
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
function Nt(r) {
  return Math.round(r * Dc);
}
function Pc(r) {
  return r * Cc;
}
function kc(r) {
  const e = parseInt(r.replace("%", ""));
  return Math.round(e / 100 * 240);
}
function Oc(r, e) {
  const t = [], s = r.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "HEADING1:::$1:::").replace(/<h2[^>]*>(.*?)<\/h2>/gi, "HEADING2:::$1:::").replace(/<h3[^>]*>(.*?)<\/h3>/gi, "HEADING3:::$1:::").replace(/<p[^>]*>(.*?)<\/p>/gi, "PARAGRAPH:::$1:::").replace(/<br\s*\/?>/gi, `
`).replace(/<strong>(.*?)<\/strong>/gi, "BOLD:::$1:::").replace(/<em>(.*?)<\/em>/gi, "ITALIC:::$1:::").replace(/<u>(.*?)<\/u>/gi, "UNDERLINE:::$1:::").replace(/<[^>]+>/g, "").split(":::");
  for (let i = 0; i < s.length; i++) {
    const o = s[i].trim();
    if (o) {
      if (o === "HEADING1" && s[i + 1])
        t.push(
          new er({
            text: s[i + 1],
            heading: Tr.HEADING_1,
            alignment: ds.CENTER,
            spacing: { before: 240, after: 120 }
          })
        ), i++;
      else if (o === "HEADING2" && s[i + 1])
        t.push(
          new er({
            text: s[i + 1],
            heading: Tr.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        ), i++;
      else if (o === "HEADING3" && s[i + 1])
        t.push(
          new er({
            text: s[i + 1],
            heading: Tr.HEADING_3,
            spacing: { before: 160, after: 80 }
          })
        ), i++;
      else if (o === "PARAGRAPH" && s[i + 1]) {
        const u = s[i + 1], f = [];
        f.push(
          new ps({
            text: u,
            font: e.fontFamily,
            size: Pc(e.fontSize)
          })
        ), t.push(
          new er({
            children: f,
            spacing: {
              before: 0,
              after: 0,
              line: kc(e.lineHeight)
            },
            indent: {
              firstLine: Nt(3.5)
              // 10pt ≈ 3.5mm
            }
          })
        ), i++;
      }
    }
  }
  return t;
}
class Lc {
  /**
   * 문서를 DOCX 또는 HWPX로 내보내기
   */
  async export(e) {
    try {
      const t = {
        ...Mi,
        ...e,
        marginRight: e.marginRight ?? e.marginLeft ?? Mi.marginLeft,
        outputPath: e.outputPath ?? "",
        referenceHwpxPath: e.referenceHwpxPath ?? ""
      };
      if (!t.title || !t.content)
        throw new pe(he.VALIDATION_FAILED, "Title and content are required");
      if (t.format === "DOCX")
        return await this.exportDocx(t);
      if (t.format === "HWPX")
        return await this.exportHwpx(t);
      throw new pe(he.VALIDATION_FAILED, `Unsupported format: ${t.format}`);
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
      const t = Nc[e.paperSize], n = Oc(e.content, e), s = new fs({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: Nt(t.width),
                  height: Nt(t.height)
                },
                margin: {
                  top: Nt(e.marginTop),
                  bottom: Nt(e.marginBottom),
                  left: Nt(e.marginLeft),
                  right: Nt(e.marginRight)
                }
              }
            },
            children: n
          }
        ]
      }), i = await us.toBuffer(s);
      let o = e.outputPath;
      if (!o)
        throw new pe(he.VALIDATION_FAILED, "Output path is required");
      return o.endsWith(".docx") || (o = o.replace(/\.[^.]*$/, "") + ".docx"), await Ke.writeFile(o, i), {
        success: !0,
        filePath: o
      };
    } catch (t) {
      throw new pe(
        he.FS_WRITE_FAILED,
        `DOCX export failed: ${t instanceof Error ? t.message : "Unknown error"}`
      );
    }
  }
  /**
   * HWPX 내보내기 (BETA)
   * 별도의 HWPX 전용 서비스 사용
   */
  async exportHwpx(e) {
    return await xc.exportHwpx(e);
  }
}
const Fc = new Lc(), Mc = (r) => {
  const e = r.format === "DOCX" ? "docx" : "hwpx";
  return `${ms(r.title || "Untitled")}.${e}`;
}, Uc = (r) => [
  {
    name: r === "DOCX" ? "Word Document" : "Hangul Document",
    extensions: [r === "DOCX" ? "docx" : "hwpx"]
  },
  { name: "All Files", extensions: ["*"] }
];
async function Wc(r) {
  const e = await Yt.showSaveDialog({
    title: "문서 내보내기",
    defaultPath: Mc(r),
    filters: Uc(r.format),
    properties: ["createDirectory", "showOverwriteConfirmation"]
  });
  if (e.canceled || !e.filePath)
    return {
      success: !1,
      error: "Export cancelled by user"
    };
  const t = {
    ...r,
    outputPath: e.filePath
  }, n = await Fc.export(t);
  if (!n.success && n.error)
    throw new pe(
      he.FS_WRITE_FAILED,
      n.error,
      { format: r.format, chapterId: r.chapterId }
    );
  return n;
}
function jc(r) {
  Ce(r, [
    {
      channel: U.EXPORT_CREATE,
      logTag: "EXPORT_CREATE",
      failMessage: "Failed to export document",
      argsSchema: vl,
      handler: (e) => Wc(e)
    }
  ]);
}
function Bc(r) {
  Gh(r.logger, r.autoSaveManager), qh(r.logger, r.snapshotService), jc(r.logger);
}
const Bt = lt("AnalysisSecurity");
class Hc {
  registeredWindowIds = /* @__PURE__ */ new Set();
  /**
   * 보안 리스너 등록
   * 윈도우 close 시 분석 데이터 자동 삭제
   */
  registerSecurityListeners(e) {
    if (e.isDestroyed()) {
      Bt.warn("Security listener registration skipped for destroyed window");
      return;
    }
    this.registeredWindowIds.has(e.id) || (this.registeredWindowIds.add(e.id), e.once("close", () => {
      Bt.info("Window close detected, clearing analysis data"), pr.stopAnalysis(), pr.clearAnalysisData(), this.registeredWindowIds.delete(e.id);
    }), e.once("closed", () => {
      this.registeredWindowIds.delete(e.id);
    }), Bt.info("Security listeners registered", { windowId: e.id }));
  }
  /**
   * 민감 데이터 정리
   * 메모리에서 분석 결과 완전 삭제
   */
  clearSensitiveData() {
    try {
      pr.clearAnalysisData(), global.gc && (global.gc(), Bt.info("Forced garbage collection")), Bt.info("Sensitive data cleared");
    } catch (e) {
      Bt.error("Failed to clear sensitive data", { error: e });
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
      return t.some((s) => n.hostname.includes(s));
    } catch {
      return !1;
    }
  }
}
const Ui = new Hc();
function zc(r, e) {
  const t = () => {
    const i = Ct.getMainWindow();
    if (i && !i.isDestroyed())
      return i;
    const o = Ca.getFocusedWindow();
    return o && !o.isDestroyed() ? o : Ca.getAllWindows().find((u) => !u.isDestroyed()) ?? null;
  }, n = (i, o, u) => {
    throw new pe(i, o, u);
  }, s = () => {
    const i = t();
    if (!i)
      throw new pe(
        he.ANALYSIS_INVALID_REQUEST,
        "윈도우를 찾을 수 없습니다."
      );
    return i;
  };
  Ce(r, [
    {
      channel: U.ANALYSIS_START,
      logTag: "ANALYSIS_START",
      failMessage: "분석을 시작하는 중 오류가 발생했습니다.",
      argsSchema: Dl,
      handler: async (i) => {
        r.info("ANALYSIS_START", { request: i });
        const o = s();
        Ui.registerSecurityListeners(o);
        try {
          await e.startAnalysis(i.chapterId, i.projectId, o);
        } catch (u) {
          const f = u instanceof Error ? u.message : String(u);
          throw f.includes("SYNC_AUTH_REQUIRED_FOR_EDGE") && n(
            he.SYNC_AUTH_REQUIRED_FOR_EDGE,
            "Edge AI 호출에는 Sync 로그인이 필요합니다."
          ), f.includes("SUPABASE_NOT_CONFIGURED") && n(
            he.ANALYSIS_INVALID_REQUEST,
            "Supabase 런타임 설정이 완료되지 않았습니다."
          ), u;
        }
        return !0;
      }
    },
    {
      channel: U.ANALYSIS_STOP,
      logTag: "ANALYSIS_STOP",
      failMessage: "분석 중단 중 오류가 발생했습니다.",
      handler: () => (r.info("ANALYSIS_STOP"), e.stopAnalysis(), !0)
    },
    {
      channel: U.ANALYSIS_CLEAR,
      logTag: "ANALYSIS_CLEAR",
      failMessage: "분석 데이터 삭제 중 오류가 발생했습니다.",
      handler: () => (r.info("ANALYSIS_CLEAR"), e.clearAnalysisData(), Ui.clearSensitiveData(), !0)
    }
  ]), r.info("Analysis IPC handlers registered");
}
function Gc(r) {
  zc(r.logger, r.manuscriptAnalysisService);
}
const Dt = lt("IPCHandler");
function qc() {
  eh({
    logger: Dt,
    projectService: st,
    chapterService: es
  }), zh({
    logger: Dt,
    characterService: as,
    termService: ts,
    eventService: bs,
    factionService: As,
    worldEntityService: Rs,
    entityRelationService: ns,
    worldMentionService: Ps
  }), Bc({
    logger: Dt,
    autoSaveManager: rs,
    snapshotService: is
  }), rh({
    logger: Dt,
    searchService: Os
  }), Fh({ logger: Dt }), Gc({
    logger: Dt,
    manuscriptAnalysisService: pr
  }), Dt.info("IPC handlers registered successfully");
}
const wf = qc;
export {
  qc as registerAllIPCHandlers,
  wf as registerIPCHandlers
};

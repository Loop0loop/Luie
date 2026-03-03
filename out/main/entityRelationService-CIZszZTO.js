import { aE as S, S as l, E as y, aF as _, p as E, c as N } from "./index.js";
import { g as i } from "./characterService-CNN-DedU.js";
const s = N("EntityRelationService");
function D(a) {
  return typeof a == "object" && a !== null && "code" in a && a.code === "P2025";
}
function p(a) {
  if (!a) return null;
  try {
    return JSON.parse(a);
  } catch {
    return null;
  }
}
function A(a) {
  return {
    id: a.id,
    projectId: String(a.projectId ?? ""),
    sourceId: String(a.sourceId ?? ""),
    sourceType: a.sourceType ?? "Character",
    targetId: String(a.targetId ?? ""),
    targetType: a.targetType ?? "Character",
    relation: a.relation ?? "belongs_to",
    attributes: p(a.attributes),
    sourceWorldEntityId: a.sourceWorldEntityId ?? null,
    targetWorldEntityId: a.targetWorldEntityId ?? null,
    createdAt: a.createdAt ?? /* @__PURE__ */ new Date(),
    updatedAt: a.updatedAt ?? /* @__PURE__ */ new Date()
  };
}
class M {
  async createRelation(e) {
    try {
      s.info("Creating entity relation", e), S(e.relation, e.sourceType, e.targetType);
      const r = {
        projectId: e.projectId,
        sourceId: e.sourceId,
        sourceType: e.sourceType,
        targetId: e.targetId,
        targetType: e.targetType,
        relation: e.relation,
        attributes: e.attributes ? JSON.stringify(e.attributes) : null
      };
      _(e.sourceType) && (r.sourceWorldEntityId = e.sourceId), _(e.targetType) && (r.targetWorldEntityId = e.targetId);
      const n = await i().entityRelation.create({ data: r });
      return s.info("Entity relation created", { relationId: n.id }), E.schedulePackageExport(e.projectId, "entity-relation:create"), A(n);
    } catch (r) {
      throw s.error("Failed to create entity relation", r), new l(
        y.ENTITY_RELATION_CREATE_FAILED,
        "Failed to create entity relation",
        { input: e },
        r
      );
    }
  }
  async getAllRelations(e) {
    try {
      return (await i().entityRelation.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      })).map((n) => A(n));
    } catch (r) {
      throw s.error("Failed to get all entity relations", r), new l(
        y.DB_QUERY_FAILED,
        "Failed to get entity relations",
        { projectId: e },
        r
      );
    }
  }
  async updateRelation(e) {
    try {
      const r = await i().entityRelation.findUnique({
        where: { id: e.id }
      });
      if (!r)
        throw new l(
          y.ENTITY_RELATION_NOT_FOUND,
          "Entity relation not found",
          { id: e.id }
        );
      e.relation && S(
        e.relation,
        r.sourceType,
        r.targetType
      );
      const n = {};
      e.relation !== void 0 && (n.relation = e.relation), e.attributes !== void 0 && (n.attributes = JSON.stringify(e.attributes));
      const c = await i().entityRelation.update({
        where: { id: e.id },
        data: n
      });
      return s.info("Entity relation updated", { relationId: c.id }), E.schedulePackageExport(String(r.projectId), "entity-relation:update"), A(c);
    } catch (r) {
      throw s.error("Failed to update entity relation", r), D(r) ? new l(
        y.ENTITY_RELATION_NOT_FOUND,
        "Entity relation not found",
        { id: e.id },
        r
      ) : new l(
        y.ENTITY_RELATION_UPDATE_FAILED,
        "Failed to update entity relation",
        { input: e },
        r
      );
    }
  }
  async deleteRelation(e) {
    try {
      const r = await i().entityRelation.delete({ where: { id: e } });
      return s.info("Entity relation deleted", { relationId: e }), E.schedulePackageExport(String(r.projectId), "entity-relation:delete"), { success: !0 };
    } catch (r) {
      throw s.error("Failed to delete entity relation", r), new l(
        y.ENTITY_RELATION_DELETE_FAILED,
        "Failed to delete entity relation",
        { id: e },
        r
      );
    }
  }
  /**
   * 프로젝트 전체 세계관 그래프 데이터 조회
   * Character / Faction / Event / Term / WorldEntity 를 한꺼번에 모아 WorldGraphNode 배열로 변환
   */
  async getWorldGraph(e) {
    try {
      const [r, n, c, u, g, f] = await Promise.all([
        i().character.findMany({ where: { projectId: e } }),
        i().faction.findMany({ where: { projectId: e } }),
        i().event.findMany({ where: { projectId: e } }),
        i().term.findMany({ where: { projectId: e } }),
        i().worldEntity.findMany({ where: { projectId: e } }),
        i().entityRelation.findMany({ where: { projectId: e } })
      ]), d = [
        ...r.map((t) => ({
          id: t.id,
          entityType: "Character",
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: p(t.attributes),
          positionX: 0,
          positionY: 0
        })),
        ...n.map((t) => ({
          id: t.id,
          entityType: "Faction",
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: p(t.attributes),
          positionX: 0,
          positionY: 0
        })),
        ...c.map((t) => ({
          id: t.id,
          entityType: "Event",
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: p(t.attributes),
          positionX: 0,
          positionY: 0
        })),
        ...u.map((t) => ({
          id: t.id,
          entityType: "Term",
          name: t.term ?? t.name,
          description: t.definition ?? null,
          firstAppearance: t.firstAppearance,
          attributes: t.category ? { tags: [t.category] } : null,
          positionX: 0,
          positionY: 0
        })),
        ...g.map((t) => ({
          id: t.id,
          entityType: t.type ?? "Place",
          subType: t.type ?? "Place",
          name: t.name,
          description: t.description,
          firstAppearance: t.firstAppearance,
          attributes: p(t.attributes),
          positionX: t.positionX ?? 0,
          positionY: t.positionY ?? 0
        }))
      ], I = f.map((t) => ({
        id: t.id,
        projectId: t.projectId ?? e,
        sourceId: t.sourceId ?? "",
        sourceType: t.sourceType ?? "Character",
        targetId: t.targetId ?? "",
        targetType: t.targetType ?? "Character",
        relation: t.relation ?? "belongs_to",
        attributes: t.attributes ? p(t.attributes) : null,
        sourceWorldEntityId: t.sourceWorldEntityId ?? null,
        targetWorldEntityId: t.targetWorldEntityId ?? null,
        createdAt: t.createdAt ?? /* @__PURE__ */ new Date(),
        updatedAt: t.updatedAt ?? /* @__PURE__ */ new Date()
      })), h = new Set(d.map((t) => t.id)), T = I.filter(
        (t) => h.has(t.sourceId) && h.has(t.targetId)
      );
      return { nodes: d, edges: T };
    } catch (r) {
      throw s.error("Failed to get world graph", r), new l(
        y.DB_QUERY_FAILED,
        "Failed to get world graph",
        { projectId: e },
        r
      );
    }
  }
  async cleanupOrphanRelationsAcrossProjects(e) {
    const r = e?.dryRun ?? !1, n = await i().project.findMany({
      select: { id: !0 }
    });
    let c = 0, u = 0, g = 0;
    for (const f of n) {
      const d = String(f.id), [I, h, T, t, F, w] = await Promise.all([
        i().character.findMany({ where: { projectId: d }, select: { id: !0 } }),
        i().faction.findMany({ where: { projectId: d }, select: { id: !0 } }),
        i().event.findMany({ where: { projectId: d }, select: { id: !0 } }),
        i().term.findMany({ where: { projectId: d }, select: { id: !0 } }),
        i().worldEntity.findMany({ where: { projectId: d }, select: { id: !0 } }),
        i().entityRelation.findMany({
          where: { projectId: d },
          select: { id: !0, sourceId: !0, targetId: !0 }
        })
      ]), R = /* @__PURE__ */ new Set([
        ...I.map((o) => String(o.id)),
        ...h.map((o) => String(o.id)),
        ...T.map((o) => String(o.id)),
        ...t.map((o) => String(o.id)),
        ...F.map((o) => String(o.id))
      ]), m = w.filter((o) => !R.has(String(o.sourceId)) || !R.has(String(o.targetId))).map((o) => String(o.id));
      if (c += w.length, u += m.length, m.length === 0 || r)
        continue;
      const b = await i().entityRelation.deleteMany({
        where: {
          projectId: d,
          id: { in: m }
        }
      });
      g += b.count, b.count > 0 && E.schedulePackageExport(d, "entity-relation:cleanup-orphans");
    }
    return s.info("Entity relation orphan cleanup completed", {
      dryRun: r,
      scannedProjects: n.length,
      scannedRelations: c,
      orphanRelations: u,
      removedRelations: g
    }), {
      scannedProjects: n.length,
      scannedRelations: c,
      orphanRelations: u,
      removedRelations: g
    };
  }
}
const O = new M();
export {
  M as EntityRelationService,
  O as entityRelationService
};

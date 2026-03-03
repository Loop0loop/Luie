import { d as c, p as s, S as o, E as n, c as h } from "./index.js";
const t = h("CharacterService"), C = () => c.getClient();
function l(i) {
  return typeof i == "object" && i !== null && "code" in i && i.code === "P2025";
}
class p {
  async createCharacter(e) {
    try {
      t.info("Creating character", e);
      const r = await c.getClient().character.create({
        data: {
          projectId: e.projectId,
          name: e.name,
          description: e.description,
          firstAppearance: e.firstAppearance,
          attributes: e.attributes ? JSON.stringify(e.attributes) : null
        }
      });
      return t.info("Character created successfully", {
        characterId: r.id
      }), s.schedulePackageExport(e.projectId, "character:create"), r;
    } catch (r) {
      throw t.error("Failed to create character", r), new o(
        n.CHARACTER_CREATE_FAILED,
        "Failed to create character",
        { input: e },
        r
      );
    }
  }
  async getCharacter(e) {
    try {
      const r = await c.getClient().character.findUnique({
        where: { id: e },
        include: {
          appearances: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
      if (!r)
        throw new o(
          n.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: e }
        );
      return r;
    } catch (r) {
      throw t.error("Failed to get character", r), r;
    }
  }
  async getAllCharacters(e) {
    try {
      return await c.getClient().character.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "asc" }
      });
    } catch (r) {
      throw t.error("Failed to get all characters", r), new o(
        n.DB_QUERY_FAILED,
        "Failed to get all characters",
        { projectId: e },
        r
      );
    }
  }
  async updateCharacter(e) {
    try {
      const r = {};
      e.name !== void 0 && (r.name = e.name), e.description !== void 0 && (r.description = e.description), e.firstAppearance !== void 0 && (r.firstAppearance = e.firstAppearance), e.attributes !== void 0 && (r.attributes = JSON.stringify(e.attributes));
      const a = await c.getClient().character.update({
        where: { id: e.id },
        data: r
      });
      return t.info("Character updated successfully", {
        characterId: a.id
      }), s.schedulePackageExport(String(a.projectId), "character:update"), a;
    } catch (r) {
      throw t.error("Failed to update character", r), l(r) ? new o(
        n.CHARACTER_NOT_FOUND,
        "Character not found",
        { id: e.id },
        r
      ) : new o(
        n.CHARACTER_UPDATE_FAILED,
        "Failed to update character",
        { input: e },
        r
      );
    }
  }
  async deleteCharacter(e) {
    try {
      const r = await c.getClient().character.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      }), a = r?.projectId ? String(r.projectId) : null;
      return await c.getClient().$transaction(async (d) => {
        a && await d.entityRelation.deleteMany({
          where: {
            projectId: a,
            OR: [{ sourceId: e }, { targetId: e }]
          }
        }), await d.character.deleteMany({ where: { id: e } });
      }), t.info("Character deleted successfully", { characterId: e }), a && s.schedulePackageExport(
        a,
        "character:delete"
      ), { success: !0 };
    } catch (r) {
      throw t.error("Failed to delete character", r), new o(
        n.CHARACTER_DELETE_FAILED,
        "Failed to delete character",
        { id: e },
        r
      );
    }
  }
  async recordAppearance(e) {
    try {
      const r = await c.getClient().characterAppearance.create({
        data: {
          characterId: e.characterId,
          chapterId: e.chapterId,
          position: e.position,
          context: e.context
        }
      });
      return t.info("Character appearance recorded", {
        characterId: e.characterId,
        chapterId: e.chapterId
      }), r;
    } catch (r) {
      throw t.error("Failed to record character appearance", r), new o(
        n.DB_QUERY_FAILED,
        "Failed to record character appearance",
        { input: e },
        r
      );
    }
  }
  async getAppearancesByChapter(e) {
    try {
      return await c.getClient().characterAppearance.findMany({
        where: { chapterId: e },
        include: {
          character: !0
        },
        orderBy: { position: "asc" }
      });
    } catch (r) {
      throw t.error("Failed to get appearances by chapter", r), new o(
        n.DB_QUERY_FAILED,
        "Failed to get character appearances",
        { chapterId: e },
        r
      );
    }
  }
  async updateFirstAppearance(e, r) {
    try {
      const a = await c.getClient().character.findUnique({
        where: { id: e }
      });
      if (!a)
        throw new o(
          n.CHARACTER_NOT_FOUND,
          "Character not found",
          { characterId: e }
        );
      a.firstAppearance || (await c.getClient().character.update({
        where: { id: e },
        data: { firstAppearance: r }
      }), t.info("First appearance updated", { characterId: e, chapterId: r }));
    } catch (a) {
      throw t.error("Failed to update first appearance", a), new o(
        n.CHARACTER_UPDATE_FAILED,
        "Failed to update first appearance",
        { characterId: e, chapterId: r },
        a
      );
    }
  }
  async searchCharacters(e, r) {
    try {
      return await c.getClient().character.findMany({
        where: {
          projectId: e,
          OR: [{ name: { contains: r } }, { description: { contains: r } }]
        },
        orderBy: { name: "asc" }
      });
    } catch (a) {
      throw t.error("Failed to search characters", a), new o(
        n.SEARCH_QUERY_FAILED,
        "Failed to search characters",
        { projectId: e, query: r },
        a
      );
    }
  }
}
const f = new p();
export {
  f as c,
  C as g
};

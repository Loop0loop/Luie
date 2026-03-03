import { promises as S } from "fs";
import w from "path";
import { randomUUID as C } from "node:crypto";
import { app as D } from "electron";
import { c as N, d as u, S as y, E as m, A as W, x as v, f as q, e as X, ai as Z, L as R, p as T, aj as tt, ak as et, al as at, am as rt, z as nt, af as ot, ad as st } from "./index.js";
import { promisify as b } from "node:util";
import { gzip as G, gunzip as it } from "node:zlib";
const ct = N("AtomicWrite"), dt = b(G), pt = b(it);
async function P(r, e) {
  const t = w.dirname(r), a = w.join(t, `${w.basename(r)}.tmp-${Date.now()}`);
  await S.writeFile(a, e);
  const n = await S.open(a, "r+");
  try {
    await n.sync();
  } finally {
    await n.close();
  }
  await S.rename(a, r);
  try {
    const c = await S.open(t, "r");
    try {
      await c.sync();
    } finally {
      await c.close();
    }
  } catch (c) {
    ct.warn("Failed to fsync directory", { dir: t, error: c });
  }
}
async function Ft(r, e) {
  const t = await dt(Buffer.from(e, "utf8"));
  await P(r, t);
}
async function lt(r) {
  const e = await S.readFile(r);
  return (e.length >= 2 && e[0] === 31 && e[1] === 139 ? await pt(e) : e).toString("utf8");
}
const O = N("SnapshotArtifacts"), ht = b(G), ut = /-([0-9a-fA-F-]{36})\.snap$/;
async function ft(r) {
  const e = await lt(r);
  return JSON.parse(e);
}
function J(r) {
  const e = X(r, "projectPath"), t = e.toLowerCase(), a = R.toLowerCase();
  return t.endsWith(a) ? w.dirname(e) : e;
}
function Y(r, e) {
  return w.join(r, ".luie", Z, e);
}
const wt = (r) => w.basename(r).match(ut)?.[1] ?? null, x = async (r, e) => {
  let t;
  try {
    t = await S.readdir(r, { withFileTypes: !0 });
  } catch (a) {
    if (a?.code === "ENOENT") return;
    O.warn("Failed to read snapshot artifact directory", { rootDir: r, error: a });
    return;
  }
  for (const a of t) {
    const n = w.join(r, a.name);
    if (a.isDirectory()) {
      await x(n, e);
      continue;
    }
    !a.isFile() || !a.name.endsWith(".snap") || e.push(n);
  }
}, gt = async () => {
  const r = /* @__PURE__ */ new Set([w.join(D.getPath("userData"), q)]), e = await u.getClient().project.findMany({
    select: { id: !0, title: !0, projectPath: !0 }
  });
  for (const t of e) {
    if (!t.projectPath) continue;
    const a = v(t.title ?? "", String(t.id));
    try {
      const n = J(t.projectPath);
      r.add(Y(n, a)), r.add(w.join(n, `backup${a}`));
    } catch (n) {
      O.warn("Skipping snapshot artifact roots for invalid projectPath", {
        projectId: t.id,
        projectPath: t.projectPath,
        error: n
      });
    }
  }
  return Array.from(r);
};
async function z(r) {
  const e = r?.snapshotIds && r.snapshotIds.length > 0 ? new Set(r.snapshotIds) : null, t = typeof r?.minAgeMs == "number" && r.minAgeMs > 0 ? r.minAgeMs : 0, a = Date.now(), n = e ? await u.getClient().snapshot.findMany({
    where: { id: { in: Array.from(e) } },
    select: { id: !0 }
  }) : await u.getClient().snapshot.findMany({
    select: { id: !0 }
  }), c = new Set(n.map((d) => d.id)), f = await gt(), l = [];
  for (const d of f)
    await x(d, l);
  let g = 0, I = 0;
  for (const d of l) {
    const A = wt(d);
    if (A && !(e && !e.has(A)) && (g += 1, !c.has(A))) {
      if (t > 0)
        try {
          const h = await S.stat(d);
          if (a - h.mtimeMs < t)
            continue;
        } catch {
          continue;
        }
      try {
        await S.unlink(d), I += 1;
      } catch (h) {
        O.warn("Failed to delete orphan snapshot artifact", {
          artifactPath: d,
          snapshotId: A,
          error: h
        });
      }
    }
  }
  return { scanned: g, deleted: I };
}
async function St(r, e) {
  O.info("Preparing snapshot artifact", {
    snapshotId: r,
    projectId: e.projectId,
    chapterId: e.chapterId
  });
  const t = await u.getClient().project.findUnique({
    where: { id: e.projectId },
    include: {
      settings: !0,
      chapters: { orderBy: { order: "asc" } },
      characters: !0,
      terms: !0
    }
  });
  if (!t)
    throw new y(m.PROJECT_NOT_FOUND, "Project not found", {
      projectId: e.projectId
    });
  t.projectPath || O.warn("Project path missing for snapshot; skipping local package snapshot", {
    snapshotId: r,
    projectId: e.projectId
  });
  const a = {
    meta: {
      version: W,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      snapshotId: r,
      projectId: String(t.id)
    },
    data: {
      project: {
        id: String(t.id),
        title: t.title,
        description: t.description,
        projectPath: t.projectPath,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      },
      settings: t.settings ?? void 0,
      chapters: t.chapters.map((o) => ({
        id: o.id,
        title: o.title,
        content: o.content,
        synopsis: o.synopsis,
        order: o.order,
        wordCount: o.wordCount,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString()
      })),
      characters: t.characters.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        firstAppearance: o.firstAppearance,
        attributes: o.attributes,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString()
      })),
      terms: t.terms.map((o) => ({
        id: o.id,
        term: o.term,
        definition: o.definition,
        category: o.category,
        firstAppearance: o.firstAppearance,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString()
      })),
      focus: {
        chapterId: e.chapterId ?? null,
        content: e.content ?? null
      }
    }
  }, n = JSON.stringify(a), c = await ht(Buffer.from(n, "utf8")), l = `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${r}.snap`;
  let g, I;
  const d = v(t.title ?? "", String(t.id));
  let A = null;
  if (t.projectPath)
    try {
      A = J(t.projectPath);
      const o = Y(A, d);
      await S.mkdir(o, { recursive: !0 }), g = w.join(o, l), await P(g, c);
    } catch (o) {
      O.warn("Skipping project-local snapshot artifact write for invalid projectPath", {
        snapshotId: r,
        projectId: t.id,
        projectPath: t.projectPath,
        error: o
      });
    }
  const h = w.join(D.getPath("userData"), q, d);
  await S.mkdir(h, { recursive: !0 });
  const j = w.join(h, l);
  if (await P(j, c), A) {
    const o = w.join(A, `backup${d}`);
    await S.mkdir(o, { recursive: !0 }), I = w.join(o, l), await P(I, c);
  }
  O.info("Full snapshot saved", {
    snapshotId: r,
    projectId: t.id,
    projectPath: t.projectPath,
    localPath: g,
    backupPath: j,
    projectBackupPath: I
  });
}
const i = N("SnapshotService"), At = 3e4, yt = 1e4;
async function mt(r, e) {
  try {
    const t = w.join(
      D.getPath("userData"),
      st,
      "_emergency"
    );
    await S.mkdir(t, { recursive: !0 });
    const a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), n = w.join(
      t,
      `emergency-${r.projectId}-${r.chapterId ?? "project"}-${a}.json`
    ), c = JSON.stringify(
      {
        projectId: r.projectId,
        chapterId: r.chapterId ?? null,
        content: r.content,
        description: r.description ?? null,
        type: r.type ?? "AUTO",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        error: e instanceof Error ? { message: e.message, name: e.name } : void 0
      },
      null,
      2
    ), f = `${n}.tmp`;
    await S.writeFile(f, c, "utf8");
    const l = await S.open(f, "r+");
    try {
      await l.sync();
    } finally {
      await l.close();
    }
    await S.rename(f, n);
    try {
      const g = await S.open(t, "r");
      try {
        await g.sync();
      } finally {
        await g.close();
      }
    } catch (g) {
      i.warn("Failed to fsync emergency snapshot directory", g);
    }
    i.warn("Emergency snapshot file written", { filePath: n });
  } catch (t) {
    i.error("Failed to write emergency snapshot file", t);
  }
}
class K {
  orphanArtifactIds = /* @__PURE__ */ new Set();
  orphanCleanupTimer = null;
  scheduleOrphanArtifactCleanup() {
    this.orphanCleanupTimer || (this.orphanCleanupTimer = setTimeout(() => {
      this.orphanCleanupTimer = null, this.cleanupOrphanArtifacts("idle").catch((e) => {
        i.warn("Idle orphan artifact cleanup failed", { error: e });
      });
    }, At), typeof this.orphanCleanupTimer.unref == "function" && this.orphanCleanupTimer.unref());
  }
  queueOrphanArtifactCleanup(e) {
    this.orphanArtifactIds.add(e), this.scheduleOrphanArtifactCleanup();
  }
  async cleanupOrphanArtifacts(e = "idle") {
    if (e === "startup") {
      const a = await z();
      return i.info("Startup orphan artifact cleanup completed", a), a;
    }
    const t = Array.from(this.orphanArtifactIds);
    if (t.length === 0)
      return { scanned: 0, deleted: 0 };
    for (const a of t)
      this.orphanArtifactIds.delete(a);
    try {
      const a = await z({
        snapshotIds: t,
        minAgeMs: yt
      });
      return i.info("Queued orphan artifact cleanup completed", {
        queued: t.length,
        ...a
      }), a;
    } catch (a) {
      for (const n of t)
        this.orphanArtifactIds.add(n);
      throw a;
    }
  }
  async createSnapshot(e) {
    const t = C();
    try {
      const a = e.type ?? "AUTO", n = e.content.length;
      i.info("Creating snapshot", {
        snapshotId: t,
        projectId: e.projectId,
        chapterId: e.chapterId,
        hasContent: !!e.content,
        descriptionLength: e.description?.length ?? 0,
        type: a
      }), await St(t, e);
      const c = await u.getClient().snapshot.create({
        data: {
          id: t,
          projectId: e.projectId,
          chapterId: e.chapterId,
          content: e.content,
          contentLength: n,
          type: a,
          description: e.description
        }
      });
      return i.info("Snapshot created successfully", { snapshotId: c.id }), T.schedulePackageExport(e.projectId, "snapshot:create"), this.scheduleOrphanArtifactCleanup(), c;
    } catch (a) {
      throw this.queueOrphanArtifactCleanup(t), await mt(e, a), i.error("Failed to create snapshot", {
        error: a,
        snapshotId: t,
        projectId: e.projectId,
        chapterId: e.chapterId
      }), new y(
        m.SNAPSHOT_CREATE_FAILED,
        "Failed to create snapshot",
        { input: e },
        a
      );
    }
  }
  async getSnapshot(e) {
    try {
      const t = await u.getClient().snapshot.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new y(
          m.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { id: e }
        );
      return t;
    } catch (t) {
      throw i.error("Failed to get snapshot", t), new y(
        m.DB_QUERY_FAILED,
        "Failed to get snapshot",
        { id: e },
        t
      );
    }
  }
  async getSnapshotsByProject(e) {
    try {
      return await u.getClient().snapshot.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "desc" }
      });
    } catch (t) {
      throw i.error("Failed to get snapshots by project", t), new y(
        m.DB_QUERY_FAILED,
        "Failed to get snapshots by project",
        { projectId: e },
        t
      );
    }
  }
  async getSnapshotsByChapter(e) {
    try {
      return await u.getClient().snapshot.findMany({
        where: { chapterId: e },
        orderBy: { createdAt: "desc" }
      });
    } catch (t) {
      throw i.error("Failed to get snapshots by chapter", t), new y(
        m.DB_QUERY_FAILED,
        "Failed to get snapshots by chapter",
        { chapterId: e },
        t
      );
    }
  }
  async deleteSnapshot(e) {
    try {
      const t = await u.getClient().snapshot.findUnique({
        where: { id: e },
        select: { projectId: !0 }
      });
      return await u.getClient().snapshot.delete({
        where: { id: e }
      }), this.queueOrphanArtifactCleanup(e), i.info("Snapshot deleted successfully", { snapshotId: e }), t?.projectId && T.schedulePackageExport(
        String(t.projectId),
        "snapshot:delete"
      ), { success: !0 };
    } catch (t) {
      throw i.error("Failed to delete snapshot", t), new y(
        m.SNAPSHOT_DELETE_FAILED,
        "Failed to delete snapshot",
        { id: e },
        t
      );
    }
  }
  async restoreSnapshot(e) {
    try {
      const t = await u.getClient().snapshot.findUnique({
        where: { id: e }
      });
      if (!t)
        throw new y(
          m.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { snapshotId: e }
        );
      if (!t.chapterId)
        throw new y(
          m.SNAPSHOT_RESTORE_FAILED,
          "Cannot restore project-level snapshot",
          { snapshotId: e }
        );
      const a = typeof t.content == "string" ? t.content : "";
      return await u.getClient().chapter.update({
        where: { id: t.chapterId },
        data: {
          content: a,
          wordCount: a.length
        }
      }), i.info("Snapshot restored successfully", {
        snapshotId: e,
        chapterId: t.chapterId
      }), T.schedulePackageExport(String(t.projectId), "snapshot:restore"), {
        success: !0,
        chapterId: t.chapterId
      };
    } catch (t) {
      throw i.error("Failed to restore snapshot", t), t instanceof y ? t : new y(
        m.SNAPSHOT_RESTORE_FAILED,
        "Failed to restore snapshot",
        { snapshotId: e },
        t
      );
    }
  }
  async importSnapshotFile(e) {
    try {
      i.info("Importing snapshot file", { filePath: e });
      const t = await ft(e), a = t.data.project, n = t.data.settings, c = v(
        a.title || "Recovered Snapshot",
        "Recovered Snapshot"
      ), f = D.getPath("documents");
      let l = w.join(
        f,
        `${c || "Recovered Snapshot"}${R}`
      );
      try {
        await S.access(l);
        const s = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        l = w.join(
          f,
          `${c || "Recovered Snapshot"}-${s}${R}`
        );
      } catch {
      }
      const g = l, I = typeof n?.autoSave == "boolean" ? n.autoSave : !0, d = typeof n?.autoSaveInterval == "number" ? n.autoSaveInterval : tt, A = await u.getClient().$transaction(
        async (s) => {
          const _ = await s.project.create({
            data: {
              title: a.title || "Recovered Snapshot",
              description: a.description ?? void 0,
              projectPath: g,
              settings: {
                create: {
                  autoSave: I,
                  autoSaveInterval: d
                }
              }
            },
            include: {
              settings: !0
            }
          }), F = _.id, L = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map(), U = /* @__PURE__ */ new Map(), B = t.data.chapters.map((p, E) => {
            const H = C();
            return L.set(p.id, H), {
              id: H,
              projectId: F,
              title: p.title,
              content: p.content ?? "",
              synopsis: p.synopsis ?? null,
              order: typeof p.order == "number" ? p.order : E,
              wordCount: p.wordCount ?? 0
            };
          }), $ = t.data.characters.map((p) => {
            const E = C();
            return M.set(p.id, E), {
              id: E,
              projectId: F,
              name: p.name,
              description: p.description ?? null,
              firstAppearance: p.firstAppearance ?? null,
              attributes: typeof p.attributes == "string" ? p.attributes : p.attributes ? JSON.stringify(p.attributes) : null
            };
          }), k = t.data.terms.map((p) => {
            const E = C();
            return U.set(p.id, E), {
              id: E,
              projectId: F,
              term: p.term,
              definition: p.definition ?? null,
              category: p.category ?? null,
              firstAppearance: p.firstAppearance ?? null
            };
          });
          return B.length > 0 && await s.chapter.createMany({
            data: B
          }), $.length > 0 && await s.character.createMany({
            data: $
          }), k.length > 0 && await s.term.createMany({
            data: k
          }), {
            created: _,
            chapterIdMap: L,
            characterIdMap: M,
            termIdMap: U
          };
        }
      ), { created: h, chapterIdMap: j, characterIdMap: o, termIdMap: Q } = A, V = {
        format: rt,
        container: at,
        version: et,
        projectId: h.id,
        title: h.title,
        description: h.description ?? void 0,
        createdAt: h.createdAt?.toISOString?.() ?? String(h.createdAt),
        updatedAt: h.updatedAt?.toISOString?.() ?? String(h.updatedAt)
      };
      try {
        await nt(
          g,
          {
            meta: V,
            chapters: t.data.chapters.map((s) => ({
              id: j.get(s.id) ?? s.id,
              content: s.content ?? ""
            })),
            characters: t.data.characters.map((s) => ({
              id: o.get(s.id) ?? s.id,
              name: s.name,
              description: s.description ?? null,
              firstAppearance: s.firstAppearance ?? null,
              attributes: typeof s.attributes == "string" ? s.attributes : s.attributes ? JSON.stringify(s.attributes) : null,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt)
            })),
            terms: t.data.terms.map((s) => ({
              id: Q.get(s.id) ?? s.id,
              term: s.term,
              definition: s.definition ?? null,
              category: s.category ?? null,
              firstAppearance: s.firstAppearance ?? null,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt)
            })),
            snapshots: []
          },
          i
        );
      } catch (s) {
        try {
          await u.getClient().project.delete({ where: { id: h.id } });
        } catch (_) {
          i.error("Failed to rollback project after snapshot .luie import failure", {
            projectId: h.id,
            filePath: e,
            error: _
          });
        }
        throw s;
      }
      return i.info("Snapshot imported successfully", {
        projectId: h.id,
        filePath: e
      }), h;
    } catch (t) {
      throw i.error("Failed to import snapshot file", t), new y(
        m.SNAPSHOT_RESTORE_FAILED,
        "Failed to import snapshot file",
        { filePath: e },
        t
      );
    }
  }
  async deleteOldSnapshots(e, t = ot) {
    try {
      const a = await u.getClient().snapshot.findMany({
        where: { projectId: e },
        orderBy: { createdAt: "desc" }
      });
      if (a.length <= t)
        return { success: !0, deletedCount: 0 };
      const n = a.slice(t), c = n.map(
        (f) => u.getClient().snapshot.delete({
          where: { id: f.id }
        })
      );
      await Promise.all(c);
      for (const f of n)
        this.queueOrphanArtifactCleanup(f.id);
      return i.info("Old snapshots deleted successfully", {
        projectId: e,
        deletedCount: n.length
      }), { success: !0, deletedCount: n.length };
    } catch (a) {
      throw i.error("Failed to delete old snapshots", a), new y(
        m.DB_QUERY_FAILED,
        "Failed to delete old snapshots",
        { projectId: e, keepCount: t },
        a
      );
    }
  }
  async pruneSnapshots(e) {
    const t = Date.now(), n = 24 * (3600 * 1e3), c = 7 * n;
    try {
      const f = await u.getClient().snapshot.findMany({
        where: { projectId: e, type: "AUTO" },
        orderBy: { createdAt: "desc" },
        select: { id: !0, createdAt: !0 }
      });
      if (f.length === 0)
        return { success: !0, deletedCount: 0 };
      const l = [], g = /* @__PURE__ */ new Set(), I = /* @__PURE__ */ new Set();
      for (const d of f) {
        const A = d.createdAt instanceof Date ? d.createdAt : new Date(String(d.createdAt)), h = t - A.getTime();
        if (h < n)
          continue;
        if (h < c) {
          const o = A.toISOString().slice(0, 13);
          g.has(o) ? l.push(d.id) : g.add(o);
          continue;
        }
        const j = A.toISOString().slice(0, 10);
        I.has(j) ? l.push(d.id) : I.add(j);
      }
      if (l.length === 0)
        return { success: !0, deletedCount: 0 };
      await u.getClient().snapshot.deleteMany({
        where: { id: { in: l } }
      });
      for (const d of l)
        this.queueOrphanArtifactCleanup(d);
      return i.info("Snapshots pruned", {
        projectId: e,
        deletedCount: l.length
      }), { success: !0, deletedCount: l.length };
    } catch (f) {
      throw i.error("Failed to prune snapshots", f), new y(
        m.DB_QUERY_FAILED,
        "Failed to prune snapshots",
        { projectId: e },
        f
      );
    }
  }
  async pruneSnapshotsAllProjects() {
    const e = await u.getClient().project.findMany({
      select: { id: !0 }
    });
    return { success: !0, deletedCount: (await Promise.all(
      e.map((n) => this.pruneSnapshots(String(n.id)))
    )).reduce(
      (n, c) => n + (c.deletedCount ?? 0),
      0
    ) };
  }
  async getLatestSnapshot(e) {
    try {
      return await u.getClient().snapshot.findFirst({
        where: { chapterId: e },
        orderBy: { createdAt: "desc" }
      });
    } catch (t) {
      throw i.error("Failed to get latest snapshot", t), new y(
        m.DB_QUERY_FAILED,
        "Failed to get latest snapshot",
        { chapterId: e },
        t
      );
    }
  }
}
const It = new K(), Tt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SnapshotService: K,
  snapshotService: It
}, Symbol.toStringTag, { value: "Module" }));
export {
  Tt as a,
  lt as r,
  It as s,
  Ft as w
};

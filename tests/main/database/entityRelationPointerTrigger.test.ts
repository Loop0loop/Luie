import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ENTITY_RELATION_POINTER_NORMALIZE_INSERT_TRIGGER_SQL,
  ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL,
  ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_TRIGGER_SQL,
} from "../../../src/main/database/entityRelationPointerSql.js";
import { ensurePackagedSqliteSchema } from "../../../src/main/database/databaseSchemaBootstrap.js";

const logger = { info: () => {}, warn: () => {} };

const WORLD_BACKED = ["Place", "Concept", "Rule", "Item", "WorldEntity"] as const;
const NON_BACKED = ["Character", "Faction", "Event", "Term"] as const;

type DbRow = Record<string, unknown>;

let tempDirs: string[] = [];

async function createBootstrappedDb(): Promise<{ dbPath: string; db: InstanceType<typeof Database> }> {
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "luie-er-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "test.sqlite");
  ensurePackagedSqliteSchema(dbPath, logger);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = OFF"); // triggers handle consistency; FK off avoids project/worldEntity deps
  return { dbPath, db };
}

function insertRelation(
  db: InstanceType<typeof Database>,
  opts: {
    id: string;
    projectId?: string;
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    sourceWorldEntityId?: string | null;
    targetWorldEntityId?: string | null;
  },
): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO "EntityRelation"
      ("id","projectId","sourceId","sourceType","targetId","targetType","relation","updatedAt","createdAt",
       "sourceWorldEntityId","targetWorldEntityId")
    VALUES (?,?,?,?,?,?,'related',?,?,?,?)
  `).run(
    opts.id,
    opts.projectId ?? "proj-1",
    opts.sourceId,
    opts.sourceType,
    opts.targetId,
    opts.targetType,
    now,
    now,
    opts.sourceWorldEntityId ?? null,
    opts.targetWorldEntityId ?? null,
  );
}

function getPointers(db: InstanceType<typeof Database>, id: string): { sourceWorldEntityId: string | null; targetWorldEntityId: string | null } {
  return db.prepare(`SELECT "sourceWorldEntityId","targetWorldEntityId" FROM "EntityRelation" WHERE "id" = ?`).get(id) as { sourceWorldEntityId: string | null; targetWorldEntityId: string | null };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fsPromises.rm(d, { recursive: true, force: true })),
  );
});

// ─── Backfill (NORMALIZE_UPDATE_SQL) ─────────────────────────────────────────

describe("ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL (backfill)", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    ({ db } = await createBootstrappedDb());
  });

  afterEach(() => { db.close(); });

  it("sets sourceWorldEntityId for world-backed sourceType", () => {
    for (const type of WORLD_BACKED) {
      insertRelation(db, {
        id: `er-${type}`,
        sourceId: `src-${type}`,
        sourceType: type,
        targetId: "tgt-char",
        targetType: "Character",
        sourceWorldEntityId: null,
        targetWorldEntityId: null,
      });
    }

    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL);

    for (const type of WORLD_BACKED) {
      const row = getPointers(db, `er-${type}`);
      expect(row.sourceWorldEntityId, `sourceWorldEntityId for ${type}`).toBe(`src-${type}`);
      expect(row.targetWorldEntityId, `targetWorldEntityId for ${type} (Character target)`).toBeNull();
    }
  });

  it("sets targetWorldEntityId for world-backed targetType", () => {
    for (const type of WORLD_BACKED) {
      insertRelation(db, {
        id: `er-tgt-${type}`,
        sourceId: "src-char",
        sourceType: "Character",
        targetId: `tgt-${type}`,
        targetType: type,
        sourceWorldEntityId: null,
        targetWorldEntityId: null,
      });
    }

    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL);

    for (const type of WORLD_BACKED) {
      const row = getPointers(db, `er-tgt-${type}`);
      expect(row.sourceWorldEntityId, `sourceWorldEntityId (Character source) for ${type}`).toBeNull();
      expect(row.targetWorldEntityId, `targetWorldEntityId for ${type}`).toBe(`tgt-${type}`);
    }
  });

  it("keeps both pointers null for non-backed types", () => {
    for (const sourceType of NON_BACKED) {
      for (const targetType of NON_BACKED) {
        const id = `er-nb-${sourceType}-${targetType}`;
        insertRelation(db, {
          id,
          sourceId: `src-${sourceType}`,
          sourceType,
          targetId: `tgt-${targetType}`,
          targetType,
          sourceWorldEntityId: null,
          targetWorldEntityId: null,
        });
      }
    }

    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL);

    for (const sourceType of NON_BACKED) {
      for (const targetType of NON_BACKED) {
        const row = getPointers(db, `er-nb-${sourceType}-${targetType}`);
        expect(row.sourceWorldEntityId, `sourceWorldEntityId ${sourceType}->${targetType}`).toBeNull();
        expect(row.targetWorldEntityId, `targetWorldEntityId ${sourceType}->${targetType}`).toBeNull();
      }
    }
  });

  it("clears stale pointers for non-backed types (corrupted existing rows)", () => {
    // Simulate corrupt rows that have pointers set for non-backed types
    insertRelation(db, {
      id: "er-stale-char",
      sourceId: "src-char",
      sourceType: "Character",
      targetId: "tgt-faction",
      targetType: "Faction",
      sourceWorldEntityId: "stale-src-id",
      targetWorldEntityId: "stale-tgt-id",
    });

    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL);

    const row = getPointers(db, "er-stale-char");
    expect(row.sourceWorldEntityId).toBeNull();
    expect(row.targetWorldEntityId).toBeNull();
  });

  it("skips already-correct rows (idempotent)", () => {
    insertRelation(db, {
      id: "er-correct",
      sourceId: "src-place",
      sourceType: "Place",
      targetId: "tgt-char",
      targetType: "Character",
      sourceWorldEntityId: "src-place", // already correct
      targetWorldEntityId: null,
    });

    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL);
    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL); // run twice

    const row = getPointers(db, "er-correct");
    expect(row.sourceWorldEntityId).toBe("src-place");
    expect(row.targetWorldEntityId).toBeNull();
  });
});

// ─── INSERT trigger ───────────────────────────────────────────────────────────

describe("EntityRelation_pointer_normalize_insert trigger", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    ({ db } = await createBootstrappedDb());
    // Bootstrap already installed triggers via enforceEntityRelationPointerConsistency;
    // re-exec is idempotent (CREATE TRIGGER IF NOT EXISTS).
    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_INSERT_TRIGGER_SQL);
  });

  afterEach(() => { db.close(); });

  it.each(WORLD_BACKED)("sets sourceWorldEntityId for %s source on INSERT", (type) => {
    insertRelation(db, {
      id: `er-ins-src-${type}`,
      sourceId: `src-${type}`,
      sourceType: type,
      targetId: "tgt-char",
      targetType: "Character",
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
    });

    const row = getPointers(db, `er-ins-src-${type}`);
    expect(row.sourceWorldEntityId).toBe(`src-${type}`);
    expect(row.targetWorldEntityId).toBeNull();
  });

  it.each(WORLD_BACKED)("sets targetWorldEntityId for %s target on INSERT", (type) => {
    insertRelation(db, {
      id: `er-ins-tgt-${type}`,
      sourceId: "src-char",
      sourceType: "Character",
      targetId: `tgt-${type}`,
      targetType: type,
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
    });

    const row = getPointers(db, `er-ins-tgt-${type}`);
    expect(row.sourceWorldEntityId).toBeNull();
    expect(row.targetWorldEntityId).toBe(`tgt-${type}`);
  });

  it.each(NON_BACKED)("does NOT set any pointer for %s (non-backed) on INSERT", (type) => {
    insertRelation(db, {
      id: `er-ins-nb-${type}`,
      sourceId: `src-${type}`,
      sourceType: type,
      targetId: `tgt-${type}`,
      targetType: type,
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
    });

    const row = getPointers(db, `er-ins-nb-${type}`);
    expect(row.sourceWorldEntityId).toBeNull();
    expect(row.targetWorldEntityId).toBeNull();
  });

  it("handles both source and target world-backed on INSERT", () => {
    insertRelation(db, {
      id: "er-ins-both",
      sourceId: "src-place-id",
      sourceType: "Place",
      targetId: "tgt-concept-id",
      targetType: "Concept",
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
    });

    const row = getPointers(db, "er-ins-both");
    expect(row.sourceWorldEntityId).toBe("src-place-id");
    expect(row.targetWorldEntityId).toBe("tgt-concept-id");
  });

  it("corrects wrong pointer value supplied at INSERT time", () => {
    // Caller passes wrong sourceWorldEntityId — trigger must overwrite it
    insertRelation(db, {
      id: "er-ins-wrong-ptr",
      sourceId: "real-place-id",
      sourceType: "Place",
      targetId: "tgt-char",
      targetType: "Character",
      sourceWorldEntityId: "wrong-id",
      targetWorldEntityId: null,
    });

    const row = getPointers(db, "er-ins-wrong-ptr");
    expect(row.sourceWorldEntityId).toBe("real-place-id");
  });
});

// ─── UPDATE trigger ───────────────────────────────────────────────────────────

describe("EntityRelation_pointer_normalize_update trigger", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    ({ db } = await createBootstrappedDb());
    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_INSERT_TRIGGER_SQL);
    db.exec(ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_TRIGGER_SQL);
  });

  afterEach(() => { db.close(); });

  it("updates sourceWorldEntityId when sourceType changes to world-backed", () => {
    insertRelation(db, {
      id: "er-upd-1",
      sourceId: "src-id",
      sourceType: "Character", // non-backed initially
      targetId: "tgt-char",
      targetType: "Character",
    });

    expect(getPointers(db, "er-upd-1").sourceWorldEntityId).toBeNull();

    db.prepare(`UPDATE "EntityRelation" SET "sourceType" = 'Place' WHERE "id" = ?`).run("er-upd-1");

    expect(getPointers(db, "er-upd-1").sourceWorldEntityId).toBe("src-id");
  });

  it("clears sourceWorldEntityId when sourceType changes to non-backed", () => {
    insertRelation(db, {
      id: "er-upd-2",
      sourceId: "src-place-id",
      sourceType: "Place", // world-backed initially
      targetId: "tgt-char",
      targetType: "Character",
    });

    expect(getPointers(db, "er-upd-2").sourceWorldEntityId).toBe("src-place-id");

    db.prepare(`UPDATE "EntityRelation" SET "sourceType" = 'Character' WHERE "id" = ?`).run("er-upd-2");

    expect(getPointers(db, "er-upd-2").sourceWorldEntityId).toBeNull();
  });

  it("updates pointer when sourceId changes for world-backed type", () => {
    insertRelation(db, {
      id: "er-upd-3",
      sourceId: "old-place-id",
      sourceType: "Place",
      targetId: "tgt-char",
      targetType: "Character",
    });

    expect(getPointers(db, "er-upd-3").sourceWorldEntityId).toBe("old-place-id");

    db.prepare(`UPDATE "EntityRelation" SET "sourceId" = 'new-place-id' WHERE "id" = ?`).run("er-upd-3");

    expect(getPointers(db, "er-upd-3").sourceWorldEntityId).toBe("new-place-id");
  });

  it("clears targetWorldEntityId when targetType changes to non-backed", () => {
    insertRelation(db, {
      id: "er-upd-4",
      sourceId: "src-char",
      sourceType: "Character",
      targetId: "tgt-concept-id",
      targetType: "Concept",
    });

    expect(getPointers(db, "er-upd-4").targetWorldEntityId).toBe("tgt-concept-id");

    db.prepare(`UPDATE "EntityRelation" SET "targetType" = 'Faction' WHERE "id" = ?`).run("er-upd-4");

    expect(getPointers(db, "er-upd-4").targetWorldEntityId).toBeNull();
  });

  it("does not fire on unrelated column UPDATE (no infinite trigger loop)", () => {
    insertRelation(db, {
      id: "er-upd-5",
      sourceId: "src-place-id",
      sourceType: "Place",
      targetId: "tgt-char",
      targetType: "Character",
    });

    // UPDATE "relation" column — trigger only fires on sourceId/sourceType/targetId/targetType
    // This verifies the trigger's AFTER UPDATE OF clause is scoped correctly.
    expect(() => {
      db.prepare(`UPDATE "EntityRelation" SET "relation" = 'mentions' WHERE "id" = ?`).run("er-upd-5");
    }).not.toThrow();

    expect(getPointers(db, "er-upd-5").sourceWorldEntityId).toBe("src-place-id");
  });
});

// ─── enforceEntityRelationPointerConsistency integration ─────────────────────

describe("enforceEntityRelationPointerConsistency (bootstrap integration)", () => {
  it("triggers are installed after ensurePackagedSqliteSchema", async () => {
    const { db } = await createBootstrappedDb();

    try {
      const insertTrigger = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='EntityRelation_pointer_normalize_insert' LIMIT 1`)
        .get();
      const updateTrigger = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='EntityRelation_pointer_normalize_update' LIMIT 1`)
        .get();

      expect(insertTrigger).toBeTruthy();
      expect(updateTrigger).toBeTruthy();
    } finally {
      db.close();
    }
  });

  it("backfills mismatched rows in existing DB on bootstrap", async () => {
    // Simulate an existing DB with bad pointer values (pre-trigger era)
    const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "luie-er-bf-"));
    tempDirs.push(tempDir);
    const dbPath = path.join(tempDir, "backfill.sqlite");

    // Bootstrap once (creates tables/triggers)
    ensurePackagedSqliteSchema(dbPath, logger);

    // Directly insert corrupt rows bypassing triggers via raw SQL
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF");
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO "EntityRelation"
        ("id","projectId","sourceId","sourceType","targetId","targetType","relation","updatedAt","createdAt",
         "sourceWorldEntityId","targetWorldEntityId")
      VALUES
        ('er-corrupt-1','proj','src-place','Place','tgt-char','Character','related',?,?,NULL,NULL),
        ('er-corrupt-2','proj','src-char','Character','tgt-rule','Rule','related',?,?,NULL,NULL)
    `).run(now, now, now, now);
    db.close();

    // Bootstrap again — enforceEntityRelationPointerConsistency should backfill
    ensurePackagedSqliteSchema(dbPath, logger);

    const db2 = new Database(dbPath);
    db2.pragma("foreign_keys = OFF");
    try {
      const r1 = db2.prepare(`SELECT "sourceWorldEntityId","targetWorldEntityId" FROM "EntityRelation" WHERE "id"='er-corrupt-1'`).get() as DbRow;
      expect(r1.sourceWorldEntityId).toBe("src-place");
      expect(r1.targetWorldEntityId).toBeNull();

      const r2 = db2.prepare(`SELECT "sourceWorldEntityId","targetWorldEntityId" FROM "EntityRelation" WHERE "id"='er-corrupt-2'`).get() as DbRow;
      expect(r2.sourceWorldEntityId).toBeNull();
      expect(r2.targetWorldEntityId).toBe("tgt-rule");
    } finally {
      db2.close();
    }
  });
});

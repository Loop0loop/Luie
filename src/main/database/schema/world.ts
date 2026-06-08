import { sql } from "drizzle-orm";
import { foreignKey, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { project } from "./foundation.js";
import { memoryEntity } from "./memoryIdentity.js";

const createWorldEntryColumns = () => ({
  id: text("id").primaryKey().notNull(),
  projectId: text("projectId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  firstAppearance: text("firstAppearance"),
  attributes: text("attributes"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull(),
  deletedAt: text("deletedAt"),
});

export const character = sqliteTable(
  "Character",
  createWorldEntryColumns(),
  (table) => [
    index("Character_projectId_name_idx").on(table.projectId, table.name),
    index("Character_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "Character_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const event = sqliteTable("Event", createWorldEntryColumns(), (table) => [
  index("Event_projectId_name_idx").on(table.projectId, table.name),
  index("Event_projectId_createdAt_idx").on(
    table.projectId,
    table.createdAt,
  ),
  foreignKey({
    name: "Event_projectId_fkey",
    columns: [table.projectId],
    foreignColumns: [project.id],
  }).onDelete("cascade").onUpdate("cascade"),
]);

export const faction = sqliteTable("Faction", createWorldEntryColumns(), (table) => [
  index("Faction_projectId_name_idx").on(table.projectId, table.name),
  index("Faction_projectId_createdAt_idx").on(
    table.projectId,
    table.createdAt,
  ),
  foreignKey({
    name: "Faction_projectId_fkey",
    columns: [table.projectId],
    foreignColumns: [project.id],
  }).onDelete("cascade").onUpdate("cascade"),
]);

export const worldDocument = sqliteTable(
  "WorldDocument",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    docType: text("docType").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("WorldDocument_projectId_docType_key").on(table.projectId, table.docType),
    index("WorldDocument_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "WorldDocument_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const scrapMemo = sqliteTable(
  "ScrapMemo",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: text("tags").notNull().default("[]"),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("ScrapMemo_projectId_sortOrder_idx").on(table.projectId, table.sortOrder),
    index("ScrapMemo_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    index("ScrapMemo_projectId_sortOrder_updatedAt_idx").on(
      table.projectId,
      table.sortOrder,
      table.updatedAt,
    ),
    foreignKey({
      name: "ScrapMemo_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const term = sqliteTable(
  "Term",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    term: text("term").notNull(),
    definition: text("definition"),
    category: text("category"),
    order: integer("order").notNull().default(0),
    firstAppearance: text("firstAppearance"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("Term_projectId_term_idx").on(table.projectId, table.term),
    index("Term_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "Term_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const worldEntity = sqliteTable(
  "WorldEntity",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    firstAppearance: text("firstAppearance"),
    attributes: text("attributes"),
    memoryEntityId: text("memoryEntityId"),
    positionX: real("positionX").notNull().default(0),
    positionY: real("positionY").notNull().default(0),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
    deletedAt: text("deletedAt"),
  },
  (table) => [
    index("WorldEntity_projectId_type_idx").on(table.projectId, table.type),
    index("WorldEntity_projectId_name_idx").on(table.projectId, table.name),
    index("WorldEntity_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt,
    ),
    foreignKey({
      name: "WorldEntity_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "WorldEntity_memoryEntityId_fkey",
      columns: [table.memoryEntityId, table.projectId],
      foreignColumns: [memoryEntity.id, memoryEntity.projectId],
    }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const entityRelation = sqliteTable(
  "EntityRelation",
  {
    id: text("id").primaryKey().notNull(),
    projectId: text("projectId").notNull(),
    sourceId: text("sourceId").notNull(),
    sourceType: text("sourceType").notNull(),
    targetId: text("targetId").notNull(),
    targetType: text("targetType").notNull(),
    relation: text("relation").notNull(),
    attributes: text("attributes"),
    sourceWorldEntityId: text("sourceWorldEntityId"),
    targetWorldEntityId: text("targetWorldEntityId"),
    createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    index("EntityRelation_projectId_sourceId_idx").on(table.projectId, table.sourceId),
    index("EntityRelation_projectId_targetId_idx").on(table.projectId, table.targetId),
    index("EntityRelation_projectId_relation_idx").on(table.projectId, table.relation),
    foreignKey({
      name: "EntityRelation_projectId_fkey",
      columns: [table.projectId],
      foreignColumns: [project.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "EntityRelation_sourceWorldEntityId_fkey",
      columns: [table.sourceWorldEntityId],
      foreignColumns: [worldEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({
      name: "EntityRelation_targetWorldEntityId_fkey",
      columns: [table.targetWorldEntityId],
      foreignColumns: [worldEntity.id],
    }).onDelete("cascade").onUpdate("cascade"),
  ],
);

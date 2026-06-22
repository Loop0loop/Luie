export const ENTITY_RELATION_WORLD_TYPES = [
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity",
] as const;

export const ENTITY_RELATION_WORLD_TYPES_SQL = ENTITY_RELATION_WORLD_TYPES.map(
  (value) => `'${value}'`,
).join(",");

export const ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_SQL = `
UPDATE "EntityRelation"
SET
  "sourceWorldEntityId" = CASE
    WHEN "sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
    THEN "sourceId"
    ELSE NULL
  END,
  "targetWorldEntityId" = CASE
    WHEN "targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
    THEN "targetId"
    ELSE NULL
  END
WHERE
  COALESCE("sourceWorldEntityId", '') != COALESCE(
    CASE
      WHEN "sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN "sourceId"
      ELSE NULL
    END,
    ''
  )
  OR
  COALESCE("targetWorldEntityId", '') != COALESCE(
    CASE
      WHEN "targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN "targetId"
      ELSE NULL
    END,
    ''
  );
`;

export const ENTITY_RELATION_POINTER_NORMALIZE_INSERT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS "EntityRelation_pointer_normalize_insert"
AFTER INSERT ON "EntityRelation"
WHEN
  COALESCE(NEW."sourceWorldEntityId", '') != COALESCE(
    CASE
      WHEN NEW."sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."sourceId"
      ELSE NULL
    END,
    ''
  )
  OR
  COALESCE(NEW."targetWorldEntityId", '') != COALESCE(
    CASE
      WHEN NEW."targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."targetId"
      ELSE NULL
    END,
    ''
  )
BEGIN
  UPDATE "EntityRelation"
  SET
    "sourceWorldEntityId" = CASE
      WHEN NEW."sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."sourceId"
      ELSE NULL
    END,
    "targetWorldEntityId" = CASE
      WHEN NEW."targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."targetId"
      ELSE NULL
    END
  WHERE "id" = NEW."id";
END;
`;

export const ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS "EntityRelation_pointer_normalize_update"
AFTER UPDATE OF "sourceId", "sourceType", "targetId", "targetType" ON "EntityRelation"
WHEN
  COALESCE(NEW."sourceWorldEntityId", '') != COALESCE(
    CASE
      WHEN NEW."sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."sourceId"
      ELSE NULL
    END,
    ''
  )
  OR
  COALESCE(NEW."targetWorldEntityId", '') != COALESCE(
    CASE
      WHEN NEW."targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."targetId"
      ELSE NULL
    END,
    ''
  )
BEGIN
  UPDATE "EntityRelation"
  SET
    "sourceWorldEntityId" = CASE
      WHEN NEW."sourceType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."sourceId"
      ELSE NULL
    END,
    "targetWorldEntityId" = CASE
      WHEN NEW."targetType" IN (${ENTITY_RELATION_WORLD_TYPES_SQL})
      THEN NEW."targetId"
      ELSE NULL
    END
  WHERE "id" = NEW."id";
END;
`;

export const ENTITY_RELATION_POINTER_TRIGGER_SQL = `
${ENTITY_RELATION_POINTER_NORMALIZE_INSERT_TRIGGER_SQL}
${ENTITY_RELATION_POINTER_NORMALIZE_UPDATE_TRIGGER_SQL}
`;

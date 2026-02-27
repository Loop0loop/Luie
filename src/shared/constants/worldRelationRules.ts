import type { RelationKind, WorldEntitySourceType } from "@shared/types";

type CanonicalEntityType =
  | "Character"
  | "Faction"
  | "Event"
  | "Place"
  | "Concept"
  | "Rule"
  | "Item";

type RelationRule = {
  sources: CanonicalEntityType[];
  targets: CanonicalEntityType[];
};

const RELATION_RULES: Record<RelationKind, RelationRule> = {
  belongs_to: {
    sources: ["Character", "Item"],
    targets: ["Character", "Faction"],
  },
  enemy_of: {
    sources: ["Character", "Faction"],
    targets: ["Character", "Faction"],
  },
  causes: {
    sources: ["Event", "Item", "Concept", "Rule"],
    targets: ["Event"],
  },
  controls: {
    sources: ["Character", "Faction"],
    targets: ["Place", "Faction", "Concept", "Item"],
  },
  located_in: {
    sources: ["Place", "Character", "Item", "Event"],
    targets: ["Place"],
  },
  violates: {
    sources: ["Character", "Faction", "Event"],
    targets: ["Rule"],
  },
};

const WORLD_ENTITY_BACKED_TYPES = new Set<WorldEntitySourceType>([
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity",
]);

const normalizeEntityType = (
  entityType: WorldEntitySourceType,
): CanonicalEntityType | "legacy" => {
  if (entityType === "WorldEntity") return "legacy";
  if (entityType === "Term") return "Concept";
  return entityType as CanonicalEntityType;
};

export const isWorldEntityBackedType = (entityType: WorldEntitySourceType): boolean =>
  WORLD_ENTITY_BACKED_TYPES.has(entityType);

export const isRelationAllowed = (
  relation: RelationKind,
  sourceType: WorldEntitySourceType,
  targetType: WorldEntitySourceType,
): boolean => {
  const source = normalizeEntityType(sourceType);
  const target = normalizeEntityType(targetType);

  // Keep backward compatibility for legacy records.
  if (source === "legacy" || target === "legacy") {
    return true;
  }

  const rule = RELATION_RULES[relation];
  return rule.sources.includes(source) && rule.targets.includes(target);
};

export const getDefaultRelationForPair = (
  sourceType: WorldEntitySourceType,
  targetType: WorldEntitySourceType,
): RelationKind | null => {
  const relationKinds = Object.keys(RELATION_RULES) as RelationKind[];
  for (const kind of relationKinds) {
    if (isRelationAllowed(kind, sourceType, targetType)) {
      return kind;
    }
  }
  return null;
};

export const WORLD_RELATION_RULES = RELATION_RULES;

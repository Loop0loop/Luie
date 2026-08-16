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
  _relation: RelationKind,
  _sourceType: WorldEntitySourceType,
  _targetType: WorldEntitySourceType,
): boolean => {
  // NOTE: 편집 흐름을 막지 않도록 정의되지 않은 관계도 허용한다.
  return true;
};

export const getDefaultRelationForPair = (
  sourceType: WorldEntitySourceType,
  targetType: WorldEntitySourceType,
): RelationKind => {
  const source = normalizeEntityType(sourceType);
  const target = normalizeEntityType(targetType);

  const relationKinds = Object.keys(RELATION_RULES) as RelationKind[];
  for (const kind of relationKinds) {
    const rule = RELATION_RULES[kind];
    if (
      (source === "legacy" || rule.sources.includes(source as CanonicalEntityType)) &&
      (target === "legacy" || rule.targets.includes(target as CanonicalEntityType))
    ) {
      return kind;
    }
  }
  // NOTE: 호출부의 null 분기를 피하려고 기본 관계를 반환한다.
  return "belongs_to";
};

export const WORLD_RELATION_RULES = RELATION_RULES;

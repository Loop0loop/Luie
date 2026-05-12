/**
 * Shared types for the read-only entity visualization (Character / Event / Faction).
 */

export type EntityKind = "character" | "event" | "faction";

export type RelatedItem = {
  kind: EntityKind;
  name: string;
  role: string;
};

export type EntityVisualBundle = {
  identityLine: string;
  related: RelatedItem[];
};

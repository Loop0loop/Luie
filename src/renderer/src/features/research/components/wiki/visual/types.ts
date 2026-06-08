/**
 * Shared types for the read-only entity visualization (Character / Event / Faction).
 */

export type EntityKind = "character" | "event" | "faction";

export type RelatedItem = {
  kind: EntityKind;
  name: string;
  role: string;
};

export type EntityVisualProfileSummary = {
  canonicalName: string;
  status: string;
  aliases: string[];
  aliasCount: number;
  mentionCount: number;
  firstMentionChapterOrder: number | null;
  lastMentionChapterOrder: number | null;
};

export type EntityVisualBundle = {
  identityLine: string;
  profile?: EntityVisualProfileSummary;
  related: RelatedItem[];
};

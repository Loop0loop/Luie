import type { WorldGraphNode } from "@shared/types";

export type TimelineEntry = {
  id: string;
  title: string;
  description?: string | null;
  dateLabel: string;
  searchText: string;
  sortTokens: number[];
};

export type EntityCatalogEntry = {
  id: string;
  name: string;
  entityType: WorldGraphNode["entityType"];
  subType?: WorldGraphNode["subType"];
  description?: string | null;
  tags: string[];
  searchText: string;
};

export type LibrarySummaryEntryId =
  | "graph"
  | "timeline"
  | "notes"
  | "entity";

const FALLBACK_TIMELINE_LABEL = "시점 미정";

const extractSortTokens = (value: string | null | undefined): number[] => {
  if (!value) return [];
  return Array.from(value.matchAll(/\d+/g))
    .map((match) => Number.parseInt(match[0], 10))
    .filter((token) => Number.isFinite(token));
};

const compareSortTokens = (left: number[], right: number[]): number => {
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];

    if (leftValue === undefined && rightValue === undefined) {
      return 0;
    }
    if (leftValue === undefined) {
      return 1;
    }
    if (rightValue === undefined) {
      return -1;
    }
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
};

export const collectWorldGraphNodeTags = (node: WorldGraphNode): string[] => {
  const tags = Array.isArray(node.attributes?.tags)
    ? node.attributes.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const fallbackType = node.subType ?? node.entityType;
  return Array.from(new Set([fallbackType, ...tags]));
};

export const buildTimelineEntries = (
  nodes: WorldGraphNode[],
  query: string,
): TimelineEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();

  return nodes
    .filter((node) => node.entityType === "Event")
    .map((node) => {
      const dateLabel = node.firstAppearance?.trim() || FALLBACK_TIMELINE_LABEL;
      return {
        id: node.id,
        title: node.name,
        description: node.description,
        dateLabel,
        searchText: `${node.name} ${node.description ?? ""} ${dateLabel}`.toLowerCase(),
        sortTokens: extractSortTokens(node.firstAppearance),
      };
    })
    .filter((entry) =>
      normalizedQuery.length === 0
        ? true
        : entry.searchText.includes(normalizedQuery),
    )
    .sort((left, right) => {
      const tokenCompare = compareSortTokens(left.sortTokens, right.sortTokens);
      if (tokenCompare !== 0) {
        return tokenCompare;
      }
      if (left.dateLabel !== right.dateLabel) {
        return left.dateLabel.localeCompare(right.dateLabel, "ko");
      }
      return left.title.localeCompare(right.title, "ko");
    });
};

export const buildEntityCatalogEntries = (
  nodes: WorldGraphNode[],
  query: string,
): EntityCatalogEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();

  return nodes
    .map((node) => {
      const tags = collectWorldGraphNodeTags(node);
      return {
        id: node.id,
        name: node.name,
        entityType: node.entityType,
        subType: node.subType,
        description: node.description,
        tags,
        searchText: `${node.name} ${node.description ?? ""} ${tags.join(" ")}`.toLowerCase(),
      };
    })
    .filter((entry) =>
      normalizedQuery.length === 0
        ? true
        : entry.searchText.includes(normalizedQuery),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
};

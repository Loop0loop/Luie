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
  | "entity"
  | "plot";

export type LibrarySummaryEntry = {
  id: LibrarySummaryEntryId;
  title: string;
  badge: string;
  description: string;
};

type LibrarySummaryInput = {
  drawing?: {
    paths?: Array<unknown>;
  } | null;
  graphNodes?: WorldGraphNode[];
  graphEdgesCount?: number;
  mindmap?: {
    nodes?: Array<unknown>;
    edges?: Array<unknown>;
  } | null;
  plot?: {
    columns?: Array<{
      cards?: Array<unknown>;
    }>;
  } | null;
  scrap?: {
    memos?: Array<unknown>;
  } | null;
  synopsis?: {
    synopsis?: string | null;
  } | null;
};

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

export const buildLibrarySummaryEntries = (
  input: LibrarySummaryInput,
): LibrarySummaryEntry[] => {
  const graphNodes = input.graphNodes ?? [];
  const memoCount = input.scrap?.memos?.length ?? 0;
  const plotBeatCount =
    input.plot?.columns?.reduce(
      (count, column) => count + (column.cards?.length ?? 0),
      0,
    ) ?? 0;
  const timelineCount = graphNodes.filter(
    (node) => node.entityType === "Event",
  ).length;
  const entityCount = graphNodes.filter(
    (node) => node.entityType !== "Event",
  ).length;
  const graphEdgeCount = input.graphEdgesCount ?? 0;
  const graphDescription =
    graphNodes.length > 0 || graphEdgeCount > 0
      ? `${graphNodes.length}개 노드, ${graphEdgeCount}개 관계`
      : "저장된 그래프가 없습니다";
  const timelineDescription =
    timelineCount > 0
      ? `${timelineCount}개 사건이 정렬 가능합니다`
      : "아직 사건 노드가 없습니다";
  const notesDescription =
    memoCount > 0
      ? `${memoCount}개 노트가 저장되어 있습니다`
      : "아직 저장된 노트가 없습니다";
  const entityDescription =
    entityCount > 0
      ? `${entityCount}개 엔티티가 정리되어 있습니다`
      : "아직 저장된 엔티티가 없습니다";
  const plotDescription =
    plotBeatCount > 0
      ? `${plotBeatCount}개 비트가 플롯 보드에 있습니다`
      : "플롯 보드가 비어 있습니다";

  return [
    {
      id: "graph",
      title: "그래프",
      badge: `${graphNodes.length}개`,
      description: graphDescription,
    },
    {
      id: "timeline",
      title: "타임라인",
      badge: `${timelineCount}개`,
      description: timelineDescription,
    },
    {
      id: "notes",
      title: "노트",
      badge: `${memoCount}개`,
      description: notesDescription,
    },
    {
      id: "entity",
      title: "엔티티",
      badge: `${entityCount}개`,
      description: entityDescription,
    },
    {
      id: "plot",
      title: "플롯",
      badge: `${plotBeatCount}개`,
      description: plotDescription,
    },
  ];
};

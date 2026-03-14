import type {
  WorldDrawingData,
  WorldGraphNode,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
} from "@shared/types";

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
  | "synopsis"
  | "plot"
  | "drawing"
  | "mindmap";

export type LibrarySummaryEntry = {
  id: LibrarySummaryEntryId;
  title: string;
  description: string;
  badge: string;
  updatedAt?: string;
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

export const buildLibrarySummaryEntries = (input: {
  drawing: WorldDrawingData;
  graphNodes: WorldGraphNode[];
  graphEdgesCount: number;
  mindmap: WorldMindmapData;
  plot: WorldPlotData;
  scrap: WorldScrapMemosData;
  synopsis: WorldSynopsisData;
}): LibrarySummaryEntry[] => {
  const timelineEvents = input.graphNodes.filter(
    (node) => node.entityType === "Event",
  ).length;
  const plotCardCount = input.plot.columns.reduce(
    (count, column) => count + column.cards.length,
    0,
  );
  const synopsisLength = input.synopsis.synopsis.trim().length;

  return [
    {
      id: "graph",
      title: "그래프",
      description: `${input.graphNodes.length}개 노드와 ${input.graphEdgesCount}개 연결`,
      badge: `${input.graphNodes.length}개`,
    },
    {
      id: "timeline",
      title: "타임라인",
      description: `${timelineEvents}개 사건이 시간축에 연결됩니다`,
      badge: `${timelineEvents}건`,
    },
    {
      id: "notes",
      title: "노트",
      description: `${input.scrap.memos.length}개의 메모가 저장되어 있습니다`,
      badge: `${input.scrap.memos.length}개`,
      updatedAt: input.scrap.updatedAt,
    },
    {
      id: "entity",
      title: "엔티티 사전",
      description: `캐릭터, 세력, 용어를 포함해 ${input.graphNodes.length}개 항목`,
      badge: `${input.graphNodes.length}개`,
    },
    {
      id: "synopsis",
      title: "시놉시스",
      description:
        synopsisLength > 0
          ? `${synopsisLength.toLocaleString()}자, 상태 ${input.synopsis.status}`
          : "아직 시놉시스가 비어 있습니다",
      badge: input.synopsis.status,
      updatedAt: input.synopsis.updatedAt,
    },
    {
      id: "plot",
      title: "플롯 보드",
      description: `${input.plot.columns.length}개 열, ${plotCardCount}개 비트`,
      badge: `${plotCardCount}개`,
      updatedAt: input.plot.updatedAt,
    },
    {
      id: "drawing",
      title: "드로잉",
      description: `${input.drawing.paths.length}개의 경로와 아이콘`,
      badge: `${input.drawing.paths.length}개`,
      updatedAt: input.drawing.updatedAt,
    },
    {
      id: "mindmap",
      title: "마인드맵",
      description: `${input.mindmap.nodes.length}개 노드, ${input.mindmap.edges.length}개 링크`,
      badge: `${input.mindmap.nodes.length}개`,
      updatedAt: input.mindmap.updatedAt,
    },
  ];
};

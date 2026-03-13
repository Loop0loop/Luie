import { describe, expect, it } from "vitest";
import type { WorldGraphNode } from "../../src/shared/types/index.js";
import {
  buildEntityCatalogEntries,
  buildLibrarySummaryEntries,
  buildTimelineEntries,
  collectWorldGraphNodeTags,
} from "../../src/renderer/src/features/research/components/world/graph/utils/worldGraphIdeViewModels.js";

const buildNode = (overrides: Partial<WorldGraphNode>): WorldGraphNode => ({
  id: overrides.id ?? "node-1",
  entityType: overrides.entityType ?? "Concept",
  subType: overrides.subType,
  name: overrides.name ?? "Node",
  description: overrides.description ?? null,
  firstAppearance: overrides.firstAppearance ?? null,
  attributes: overrides.attributes ?? null,
  positionX: overrides.positionX ?? 0,
  positionY: overrides.positionY ?? 0,
});

describe("worldGraphIdeViewModels", () => {
  it("collects subtype and tag metadata for graph nodes", () => {
    expect(
      collectWorldGraphNodeTags(
        buildNode({
          entityType: "Place",
          subType: "Place",
          attributes: { tags: ["수도", "시작점"] },
        }),
      ),
    ).toEqual(["Place", "수도", "시작점"]);
  });

  it("builds timeline entries from saved event nodes and sorts by parsed time tokens", () => {
    const entries = buildTimelineEntries(
      [
        buildNode({
          id: "event-2",
          entityType: "Event",
          name: "붉은 밤",
          firstAppearance: "왕국력 125년 12월",
        }),
        buildNode({
          id: "event-1",
          entityType: "Event",
          name: "제1차 방어선 붕괴",
          firstAppearance: "왕국력 123년",
        }),
        buildNode({
          id: "concept-1",
          entityType: "Concept",
          subType: "Concept",
          name: "왕국력",
        }),
      ],
      "",
    );

    expect(entries.map((entry) => entry.id)).toEqual(["event-1", "event-2"]);
    expect(entries[0]?.dateLabel).toBe("왕국력 123년");
  });

  it("filters entity catalog entries with names, descriptions, and tags", () => {
    const entries = buildEntityCatalogEntries(
      [
        buildNode({
          id: "place-1",
          entityType: "Place",
          subType: "Place",
          name: "왕도",
          attributes: { tags: ["수도"] },
        }),
        buildNode({
          id: "character-1",
          entityType: "Character",
          name: "아르웬",
          description: "주인공",
        }),
      ],
      "수도",
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("place-1");
  });

  it("builds library summary entries from saved world documents", () => {
    const entries = buildLibrarySummaryEntries({
      drawing: { paths: [{ id: "path-1", type: "path", color: "#000000" }] },
      graphNodes: [
        buildNode({ entityType: "Event", name: "붉은 밤" }),
        buildNode({ entityType: "Character", name: "아르웬" }),
      ],
      graphEdgesCount: 3,
      mindmap: {
        nodes: [{ id: "root", position: { x: 0, y: 0 }, data: { label: "세계" } }],
        edges: [{ id: "edge-1", source: "root", target: "node-1" }],
      },
      plot: {
        columns: [{ id: "act-1", title: "Act 1", cards: [{ id: "beat-1", content: "Hook" }] }],
      },
      scrap: {
        memos: [{ id: "memo-1", title: "떡밥", content: "내용", tags: [], updatedAt: "2026-03-14T00:00:00.000Z" }],
      },
      synopsis: {
        synopsis: "마왕이 부활한다.",
        status: "working",
      },
    });

    expect(entries.find((entry) => entry.id === "graph")?.badge).toBe("2개");
    expect(entries.find((entry) => entry.id === "notes")?.badge).toBe("1개");
    expect(entries.find((entry) => entry.id === "plot")?.description).toContain("1개 비트");
  });
});

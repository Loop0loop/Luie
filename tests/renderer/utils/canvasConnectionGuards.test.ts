import { describe, expect, it } from "vitest";
import type { Connection } from "reactflow";
import type { WorldGraphData } from "../../../src/shared/types";
import { resolveRelationConnection } from "../../../src/renderer/src/features/canvas/utils/connectionGuards";

const graphData: WorldGraphData = {
  nodes: [
    {
      id: "character-1",
      entityType: "Character",
      name: "Hero",
      description: null,
      positionX: 0,
      positionY: 0,
    },
    {
      id: "event-1",
      entityType: "Event",
      name: "Incident",
      description: null,
      positionX: 0,
      positionY: 0,
    },
    {
      id: "faction-1",
      entityType: "Faction",
      name: "Guild",
      description: null,
      positionX: 0,
      positionY: 0,
    },
  ],
  edges: [
    {
      id: "rel-1",
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "involved_in",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const connection = (source: string | null, target: string | null): Connection => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
});

describe("resolveRelationConnection", () => {
  it("연결 가능한 쌍은 실제 graph node를 그대로 돌려준다", () => {
    const result = resolveRelationConnection(
      connection("character-1", "faction-1"),
      graphData,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // entityType을 문자열 변환 없이 그대로 전달해야 신규 타입이 추가돼도 깨지지 않는다.
    expect(result.source.entityType).toBe("Character");
    expect(result.target.entityType).toBe("Faction");
  });

  it("source/target이 비면 거부한다", () => {
    expect(resolveRelationConnection(connection(null, "faction-1"), graphData)).toEqual({
      ok: false,
      reason: "incomplete",
    });
    expect(resolveRelationConnection(connection("character-1", null), graphData)).toEqual({
      ok: false,
      reason: "incomplete",
    });
  });

  it("자기 자신과의 연결을 거부한다", () => {
    expect(
      resolveRelationConnection(connection("character-1", "character-1"), graphData),
    ).toEqual({ ok: false, reason: "self-loop" });
  });

  it("graph에 없는 node는 거부한다", () => {
    expect(
      resolveRelationConnection(connection("character-1", "ghost"), graphData),
    ).toEqual({ ok: false, reason: "unknown-node" });
  });

  it("이미 존재하는 쌍은 방향이 반대여도 거부한다", () => {
    expect(
      resolveRelationConnection(connection("character-1", "event-1"), graphData),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(
      resolveRelationConnection(connection("event-1", "character-1"), graphData),
    ).toEqual({ ok: false, reason: "duplicate" });
  });

  it("graphData가 없으면 거부한다", () => {
    expect(
      resolveRelationConnection(connection("character-1", "event-1"), null),
    ).toEqual({ ok: false, reason: "unknown-node" });
  });
});

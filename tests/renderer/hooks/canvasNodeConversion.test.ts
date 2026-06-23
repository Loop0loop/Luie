import { describe, expect, it } from "vitest";
import type { EntityRelation, WorldGraphNode } from "../../../src/shared/types";
import {
  buildMigratedRelationInputs,
  findDuplicateTargetNode,
} from "../../../src/renderer/src/features/research/components/world/graph/tabs/canvasNodeConversion";

const buildNode = (
  input: Partial<WorldGraphNode> & { id: string; name: string },
): WorldGraphNode => ({
  id: input.id,
  name: input.name,
  entityType: input.entityType ?? "WorldEntity",
  subType: input.subType,
  description: null,
  firstAppearance: null,
  attributes: null,
  positionX: 0,
  positionY: 0,
});

const buildEdge = (input: {
  id: string;
  sourceId: string;
  sourceType: EntityRelation["sourceType"];
  targetId: string;
  targetType: EntityRelation["targetType"];
  relation: EntityRelation["relation"];
}): EntityRelation => ({
  ...input,
  projectId: "p-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("canvasNodeConversion", () => {
  it("finds duplicate target node by normalized name and type", () => {
    const duplicate = findDuplicateTargetNode({
      nodes: [
        buildNode({ id: "selected", name: "임세훈", entityType: "Event" }),
        buildNode({
          id: "existing",
          name: "  임세훈  ",
          entityType: "Character",
        }),
      ],
      selectedNodeId: "selected",
      selectedNodeName: "임세훈",
      nextEntityType: "Character",
      nextSubType: undefined,
    });

    expect(duplicate?.id).toBe("existing");
  });

  it("skips duplicate relations when migrating to existing node", () => {
    const selectedNodeId = "temp-node";
    const existingNodeId = "existing-char";

    const inputs = buildMigratedRelationInputs({
      projectId: "p-1",
      selectedNodeId,
      targetNode: { id: existingNodeId, entityType: "Character" },
      graphEdges: [
        buildEdge({
          id: "edge-selected",
          sourceId: selectedNodeId,
          sourceType: "Event",
          targetId: "villain",
          targetType: "Character",
          relation: "belongs_to",
        }),
        buildEdge({
          id: "edge-existing",
          sourceId: existingNodeId,
          sourceType: "Character",
          targetId: "villain",
          targetType: "Character",
          relation: "belongs_to",
        }),
      ],
    });

    expect(inputs).toHaveLength(0);
  });
});

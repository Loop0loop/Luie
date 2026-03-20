import { api } from "@shared/api";
import type { WorldGraphNode } from "@shared/types";
import {
  toCharacterNode,
  toEventNode,
  toFactionNode,
  toTermNode,
  toWorldEntityNode,
  resolveWorldEntityType,
  withNodePosition,
} from "./worldBuildingStore.graph";
import type {
  CreateGraphNodeInput,
  UpdateGraphNodeInput,
} from "./worldBuildingStore.types";

export async function createGraphNodeFromInput(
  projectId: string,
  input: CreateGraphNodeInput,
): Promise<WorldGraphNode | null> {
  const name = input.name.trim() || "Untitled";
  const positionX = input.positionX ?? 0;
  const positionY = input.positionY ?? 0;

  switch (input.entityType) {
    case "Character": {
      const response = await api.character.create({
        projectId,
        name,
        description: input.description,
        attributes:
          input.attributes && typeof input.attributes === "object"
            ? { templateId: "basic", ...input.attributes }
            : { templateId: "basic" },
      });
      return response.success && response.data
        ? withNodePosition(toCharacterNode(response.data), positionX, positionY)
        : null;
    }
    case "Faction": {
      const response = await api.faction.create({
        projectId,
        name,
        description: input.description,
      });
      return response.success && response.data
        ? withNodePosition(toFactionNode(response.data), positionX, positionY)
        : null;
    }
    case "Event": {
      const response = await api.event.create({
        projectId,
        name,
        description: input.description,
      });
      return response.success && response.data
        ? withNodePosition(toEventNode(response.data), positionX, positionY)
        : null;
    }
    case "Term": {
      const response = await api.term.create({
        projectId,
        term: name,
        definition: input.description,
      });
      return response.success && response.data
        ? withNodePosition(toTermNode(response.data), positionX, positionY)
        : null;
    }
    default: {
      const response = await api.worldEntity.create({
        projectId,
        type: resolveWorldEntityType(input.entityType, input.subType),
        name,
        description: input.description,
        attributes: input.attributes,
        positionX,
        positionY,
      });
      return response.success && response.data
        ? withNodePosition(
            toWorldEntityNode(response.data),
            positionX,
            positionY,
          )
        : null;
    }
  }
}

export async function updateGraphNodeFromInput(
  input: UpdateGraphNodeInput,
  current: WorldGraphNode,
): Promise<WorldGraphNode | null> {
  switch (input.entityType) {
    case "Character": {
      const response = await api.character.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data
        ? withNodePosition(
            toCharacterNode(response.data),
            current.positionX,
            current.positionY,
          )
        : null;
    }
    case "Faction": {
      const response = await api.faction.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data
        ? withNodePosition(
            toFactionNode(response.data),
            current.positionX,
            current.positionY,
          )
        : null;
    }
    case "Event": {
      const response = await api.event.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data
        ? withNodePosition(
            toEventNode(response.data),
            current.positionX,
            current.positionY,
          )
        : null;
    }
    case "Term": {
      const response = await api.term.update({
        id: input.id,
        term: input.name,
        definition: input.description,
        category:
          Array.isArray(input.attributes?.tags) &&
          input.attributes.tags.length > 0
            ? String(input.attributes.tags[0])
            : undefined,
      });
      return response.success && response.data
        ? withNodePosition(
            toTermNode(response.data),
            current.positionX,
            current.positionY,
          )
        : null;
    }
    default: {
      const response = await api.worldEntity.update({
        id: input.id,
        type: resolveWorldEntityType(
          input.entityType,
          input.subType ?? current.subType,
        ),
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data
        ? toWorldEntityNode(response.data)
        : null;
    }
  }
}

export async function deleteGraphNodeByType(
  node: WorldGraphNode,
): Promise<boolean> {
  switch (node.entityType) {
    case "Character": {
      const response = await api.character.delete(node.id);
      return response.success;
    }
    case "Faction": {
      const response = await api.faction.delete(node.id);
      return response.success;
    }
    case "Event": {
      const response = await api.event.delete(node.id);
      return response.success;
    }
    case "Term": {
      const response = await api.term.delete(node.id);
      return response.success;
    }
    default: {
      const response = await api.worldEntity.delete(node.id);
      return response.success;
    }
  }
}

import { api } from "@shared/api";
import type { WorldGraphNode } from "@shared/types";
import {
  toCharacterNode,
  toEventNode,
  toFactionNode,
  toTermNode,
  toWorldEntityNode,
  resolveWorldEntityType,
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

  switch (input.entityType) {
    case "Character": {
      const response = await api.character.create({
        projectId,
        name,
        description: input.description,
      });
      return response.success && response.data ? toCharacterNode(response.data) : null;
    }
    case "Faction": {
      const response = await api.faction.create({
        projectId,
        name,
        description: input.description,
      });
      return response.success && response.data ? toFactionNode(response.data) : null;
    }
    case "Event": {
      const response = await api.event.create({
        projectId,
        name,
        description: input.description,
      });
      return response.success && response.data ? toEventNode(response.data) : null;
    }
    case "Term": {
      const response = await api.term.create({
        projectId,
        term: name,
        definition: input.description,
      });
      return response.success && response.data ? toTermNode(response.data) : null;
    }
    default: {
      const response = await api.worldEntity.create({
        projectId,
        type: resolveWorldEntityType(input.entityType, input.subType),
        name,
        description: input.description,
        positionX: input.positionX ?? 0,
        positionY: input.positionY ?? 0,
      });
      return response.success && response.data
        ? toWorldEntityNode(response.data)
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
      return response.success && response.data ? toCharacterNode(response.data) : null;
    }
    case "Faction": {
      const response = await api.faction.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data ? toFactionNode(response.data) : null;
    }
    case "Event": {
      const response = await api.event.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      return response.success && response.data ? toEventNode(response.data) : null;
    }
    case "Term": {
      const response = await api.term.update({
        id: input.id,
        term: input.name,
        definition: input.description,
        category:
          Array.isArray(input.attributes?.tags) && input.attributes.tags.length > 0
            ? String(input.attributes.tags[0])
            : undefined,
      });
      return response.success && response.data ? toTermNode(response.data) : null;
    }
    default: {
      const response = await api.worldEntity.update({
        id: input.id,
        type: resolveWorldEntityType(input.entityType, input.subType ?? current.subType),
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

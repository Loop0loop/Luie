import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { WorldEntitySourceType, WorldGraphNode } from "@shared/types";

export async function syncGraphBackedStore(
  entityType: WorldEntitySourceType,
  projectId: string,
): Promise<void> {
  switch (entityType) {
    case "Character":
      await useCharacterStore.getState().loadCharacters(projectId);
      return;
    case "Event":
      await useEventStore.getState().loadEvents(projectId);
      return;
    case "Faction":
      await useFactionStore.getState().loadFactions(projectId);
      return;
    case "Term":
      await useTermStore.getState().loadTerms(projectId);
      return;
    default:
      return;
  }
}

export function clearGraphBackedSelection(
  entityType: WorldEntitySourceType,
  id: string,
): void {
  const uiStore = useUIStore.getState();

  switch (entityType) {
    case "Character": {
      const store = useCharacterStore.getState();
      if (store.currentCharacter?.id === id) {
        store.setCurrentCharacter(null);
      }
      if (uiStore.mainView.type === "character" && uiStore.mainView.id === id) {
        uiStore.setMainView({ type: "editor" });
      }
      return;
    }
    case "Event": {
      const store = useEventStore.getState();
      if (store.currentEvent?.id === id) {
        store.setCurrentEvent(null);
      }
      if (uiStore.mainView.type === "event" && uiStore.mainView.id === id) {
        uiStore.setMainView({ type: "editor" });
      }
      return;
    }
    case "Faction": {
      const store = useFactionStore.getState();
      if (store.currentFaction?.id === id) {
        store.setCurrentFaction(null);
      }
      if (uiStore.mainView.type === "faction" && uiStore.mainView.id === id) {
        uiStore.setMainView({ type: "editor" });
      }
      return;
    }
    case "Term": {
      const store = useTermStore.getState();
      if (store.currentTerm?.id === id) {
        store.setCurrentTerm(null);
      }
      if (uiStore.mainView.type === "world" && uiStore.mainView.id === id) {
        uiStore.setMainView({ type: "world" });
      }
      return;
    }
    default:
      return;
  }
}

export function syncGraphEntitySelectionToWorkspace(node: Pick<
  WorldGraphNode,
  "id" | "entityType" | "name"
>): void {
  const uiStore = useUIStore.getState();

  switch (node.entityType) {
    case "Character": {
      const character = useCharacterStore
        .getState()
        .items.find((item) => item.id === node.id);
      if (character) {
        useCharacterStore.getState().setCurrentCharacter(character);
        uiStore.setMainView({ type: "character", id: node.id });
      }
      return;
    }
    case "Event": {
      const event = useEventStore
        .getState()
        .items.find((item) => item.id === node.id);
      if (event) {
        useEventStore.getState().setCurrentEvent(event);
        uiStore.setMainView({ type: "event", id: node.id });
      }
      return;
    }
    case "Faction": {
      const faction = useFactionStore
        .getState()
        .items.find((item) => item.id === node.id);
      if (faction) {
        useFactionStore.getState().setCurrentFaction(faction);
        uiStore.setMainView({ type: "faction", id: node.id });
      }
      return;
    }
    case "Term": {
      const term = useTermStore
        .getState()
        .items.find((item) => item.id === node.id);
      if (term) {
        useTermStore.getState().setCurrentTerm(term);
        uiStore.setWorldTab("terms");
        uiStore.setMainView({ type: "world", id: node.id });
      }
      return;
    }
    default:
      return;
  }
}

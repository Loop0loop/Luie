import { beforeEach, describe, expect, it } from "vitest";
import { useCharacterStore } from "../../src/renderer/src/features/research/stores/characterStore.js";
import { useEventStore } from "../../src/renderer/src/features/research/stores/eventStore.js";
import { useFactionStore } from "../../src/renderer/src/features/research/stores/factionStore.js";
import { useTermStore } from "../../src/renderer/src/features/research/stores/termStore.js";
import {
  clearGraphBackedSelection,
  syncGraphEntitySelectionToWorkspace,
} from "../../src/renderer/src/features/research/utils/graphEntitySync.js";
import { useUIStore } from "../../src/renderer/src/features/workspace/stores/uiStore.js";

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

describe("graphEntitySync", () => {
  beforeEach(() => {
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useEventStore as unknown as ResettableStore);
    resetStore(useFactionStore as unknown as ResettableStore);
    resetStore(useTermStore as unknown as ResettableStore);
    resetStore(useUIStore as unknown as ResettableStore);
  });

  it("syncs character selections into workspace state", () => {
    useCharacterStore.setState({
      items: [
        {
          id: "char-1",
          projectId: "project-1",
          name: "Hero",
          description: "Lead",
          firstAppearance: null,
          attributes: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      characters: [
        {
          id: "char-1",
          projectId: "project-1",
          name: "Hero",
          description: "Lead",
          firstAppearance: null,
          attributes: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    syncGraphEntitySelectionToWorkspace({
      id: "char-1",
      entityType: "Character",
      name: "Hero",
      positionX: 0,
      positionY: 0,
    });

    expect(useUIStore.getState().mainView).toEqual({
      type: "character",
      id: "char-1",
    });
    expect(useCharacterStore.getState().currentCharacter?.id).toBe("char-1");
  });

  it("syncs terms into world tab selection and clears deleted selections", () => {
    useTermStore.setState({
      items: [
        {
          id: "term-1",
          projectId: "project-1",
          term: "Mana",
          definition: "Energy",
          category: "System",
          order: 0,
          firstAppearance: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      terms: [
        {
          id: "term-1",
          projectId: "project-1",
          term: "Mana",
          definition: "Energy",
          category: "System",
          order: 0,
          firstAppearance: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      currentTerm: {
        id: "term-1",
        projectId: "project-1",
        term: "Mana",
        definition: "Energy",
        category: "System",
        order: 0,
        firstAppearance: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    syncGraphEntitySelectionToWorkspace({
      id: "term-1",
      entityType: "Term",
      name: "Mana",
      description: "Energy",
      positionX: 0,
      positionY: 0,
    });

    expect(useUIStore.getState().worldTab).toBe("terms");
    expect(useUIStore.getState().mainView).toEqual({
      type: "world",
      id: "term-1",
    });
    expect(useTermStore.getState().currentTerm?.id).toBe("term-1");

    clearGraphBackedSelection("Term", "term-1");
    expect(useTermStore.getState().currentTerm).toBeNull();
  });

  it("clears stale character mainView when a graph-backed character is deleted", () => {
    useUIStore.setState({
      mainView: {
        type: "character",
        id: "char-1",
      },
    });

    clearGraphBackedSelection("Character", "char-1");

    expect(useUIStore.getState().mainView).toEqual({
      type: "editor",
    });
  });
});

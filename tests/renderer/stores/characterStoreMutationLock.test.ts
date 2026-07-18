import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterStore } from "../../../src/renderer/src/features/research/stores/characterStore.js";
import { useProjectStore } from "../../../src/renderer/src/features/project/stores/projectStore.js";
import { useWorldBuildingStore } from "../../../src/renderer/src/features/research/stores/worldBuildingStore.js";
import {
  flushWorldEntityMutations,
  getPendingWorldEntityMutationCount,
} from "../../../src/renderer/src/shared/store/worldEntityMutationQueue.js";
import type { Character } from "../../../src/shared/types";

type IPCResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

const mockedApi = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  character: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedRefresh = vi.hoisted(() => ({
  refreshWorldGraph: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  api: mockedApi,
}));

vi.mock("@renderer/features/research/utils/worldGraphRefresh", () => ({
  refreshWorldGraph: mockedRefresh.refreshWorldGraph,
}));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

describe("characterStore mutation locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useProjectStore as unknown as ResettableStore);
    resetStore(useWorldBuildingStore as unknown as ResettableStore);

    mockedApi.character.getAll.mockResolvedValue({ success: true, data: [] });
    mockedApi.character.get.mockResolvedValue({
      success: true,
      data: null,
    });
    mockedApi.character.update.mockResolvedValue({
      success: true,
      data: null,
    });
    mockedApi.character.delete.mockResolvedValue({ success: true });
  });

  it("persists an update queued while another update is in flight", async () => {
    const firstUpdate = deferred<IPCResponse<Character>>();
    const character: Character = {
      id: "char-1",
      projectId: "project-1",
      name: "Original",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    };

    mockedApi.character.update
      .mockReturnValueOnce(firstUpdate.promise)
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Hero", description: "Lead" },
      });

    useProjectStore.setState({
      currentItem: {
        id: "project-1",
        title: "Novel",
        description: "",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
      currentProject: {
        id: "project-1",
        title: "Novel",
        description: "",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    });

    useCharacterStore.setState({
      items: [character],
      characters: [character],
      currentItem: character,
      currentCharacter: character,
    });
    useWorldBuildingStore.setState({
      graphData: {
        nodes: [
          {
            id: character.id,
            entityType: "Character",
            name: character.name,
            attributes: null,
            positionX: 10,
            positionY: 20,
          },
        ],
        edges: [],
      },
    });

    const nameSave = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Hero",
    });
    const descriptionSave = useCharacterStore.getState().updateCharacter({
      id: character.id,
      description: "Lead",
    });

    expect(mockedApi.character.update).toHaveBeenCalledOnce();

    firstUpdate.resolve({
      success: true,
      data: { ...character, name: "Hero" },
    });
    await Promise.all([nameSave, descriptionSave]);

    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    expect(mockedApi.character.update).toHaveBeenLastCalledWith({
      id: character.id,
      description: "Lead",
    });
    expect(mockedRefresh.refreshWorldGraph).not.toHaveBeenCalled();
    expect(useWorldBuildingStore.getState().graphData?.nodes[0]).toMatchObject({
      name: "Hero",
      description: "Lead",
      positionX: 10,
      positionY: 20,
    });
  });

  it("merges attribute keys waiting behind an in-flight update", async () => {
    const firstUpdate = deferred<IPCResponse<Character>>();
    const character: Character = {
      id: "char-attributes",
      projectId: "project-1",
      name: "Hero",
      attributes: {},
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    };
    mockedApi.character.update
      .mockReturnValueOnce(firstUpdate.promise)
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...character,
          attributes: { color: "red", tagline: "Lead" },
        },
      });
    useCharacterStore.setState({
      items: [character],
      characters: [character],
      currentItem: character,
      currentCharacter: character,
    });

    const first = useCharacterStore.getState().updateCharacter({
      id: character.id,
      attributesPatch: { role: "lead" },
    });
    const second = useCharacterStore.getState().updateCharacter({
      id: character.id,
      attributesPatch: { color: "red" },
    });
    const third = useCharacterStore.getState().updateCharacter({
      id: character.id,
      attributesPatch: { tagline: "Lead" },
    });

    expect(useCharacterStore.getState().currentItem).toMatchObject({
      attributes: { role: "lead", color: "red", tagline: "Lead" },
    });
    expect(useCharacterStore.getState().currentItem).not.toHaveProperty(
      "attributesPatch",
    );

    firstUpdate.resolve({
      success: true,
      data: { ...character, attributes: { role: "lead" } },
    });
    await Promise.all([first, second, third]);

    expect(mockedApi.character.update).toHaveBeenLastCalledWith({
      id: character.id,
      attributesPatch: { color: "red", tagline: "Lead" },
    });
  });

  it("rejects a null update ACK and applies the retained retry to the graph", async () => {
    const character: Character = {
      id: "char-retry",
      projectId: "project-1",
      name: "Original",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    };
    mockedApi.character.update
      .mockResolvedValueOnce({
        success: false,
        data: null,
        error: { message: "write failed" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Retried" },
      });
    useCharacterStore.setState({
      items: [character],
      characters: [character],
      currentItem: character,
      currentCharacter: character,
    });
    useWorldBuildingStore.setState({
      graphData: {
        nodes: [
          {
            id: character.id,
            entityType: "Character",
            name: character.name,
            attributes: null,
            positionX: 10,
            positionY: 20,
          },
        ],
        edges: [],
      },
    });

    await expect(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        name: "Retried",
      }),
    ).rejects.toThrow("write failed");
    expect(getPendingWorldEntityMutationCount()).toBe(1);

    await flushWorldEntityMutations();

    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    expect(mockedApi.character.update).toHaveBeenLastCalledWith({
      id: character.id,
      name: "Retried",
    });
    expect(useWorldBuildingStore.getState().graphData?.nodes[0]).toMatchObject({
      name: "Retried",
      positionX: 10,
      positionY: 20,
    });
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("skips graph refresh when delete fails", async () => {
    mockedApi.character.delete.mockResolvedValue({
      success: false,
      error: {
        message: "Character was not found",
      },
    });

    useProjectStore.setState({
      currentItem: {
        id: "project-1",
        title: "Novel",
        description: "",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
      currentProject: {
        id: "project-1",
        title: "Novel",
        description: "",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    });
    const character: Character = {
      id: "char-1",
      projectId: "project-1",
      name: "Hero",
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    };
    useCharacterStore.setState({
      items: [character],
      characters: [character],
    });

    await expect(
      useCharacterStore.getState().deleteCharacter("char-1"),
    ).resolves.toBe(false);
    expect(mockedApi.character.delete).toHaveBeenCalledWith("char-1");
    expect(mockedRefresh.refreshWorldGraph).not.toHaveBeenCalled();
  });
});

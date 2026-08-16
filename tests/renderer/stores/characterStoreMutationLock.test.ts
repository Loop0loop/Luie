import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

const createCharacter = (id: string, name = "Original"): Character => ({
  id,
  projectId: "project-1",
  name,
  createdAt: new Date("2026-03-10T00:00:00.000Z"),
  updatedAt: new Date("2026-03-10T00:00:00.000Z"),
});

const seedCharacters = (characters: Character[]): void => {
  const current = characters[0] ?? null;
  useCharacterStore.setState({
    items: characters,
    characters,
    currentItem: current,
    currentCharacter: current,
  });
  useWorldBuildingStore.setState({
    graphData: {
      nodes: characters.map((character) => ({
        id: character.id,
        entityType: "Character" as const,
        name: character.name,
        attributes: null,
        positionX: 10,
        positionY: 20,
      })),
      edges: [],
    },
  });
};

describe("characterStore mutation locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useProjectStore as unknown as ResettableStore);
    resetStore(useWorldBuildingStore as unknown as ResettableStore);

    mockedApi.character.getAll
      .mockReset()
      .mockResolvedValue({ success: true, data: [] });
    mockedApi.character.get.mockReset().mockResolvedValue({
      success: true,
      data: null,
    });
    mockedApi.character.update.mockReset().mockResolvedValue({
      success: true,
      data: null,
    });
    mockedApi.character.delete
      .mockReset()
      .mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("reconciles a waiter-less background retry ACK and clears the queue", async () => {
    vi.useFakeTimers();
    const character = createCharacter("char-background-retry");
    const retryAck = deferred<IPCResponse<Character>>();
    seedCharacters([character]);
    mockedApi.character.update
      .mockResolvedValueOnce({
        success: false,
        error: { message: "temporary failure" },
      })
      .mockReturnValueOnce(retryAck.promise)
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Latest", description: "Newest" },
      });

    await expect(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        name: "Retry A",
      }),
    ).rejects.toThrow("temporary failure");
    expect(getPendingWorldEntityMutationCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(250);
    const newerSave = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Latest",
      description: "Newest",
    });
    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    expect(useCharacterStore.getState().currentItem).toMatchObject({
      name: "Latest",
      description: "Newest",
    });

    retryAck.resolve({
      success: true,
      data: { ...character, name: "Retry A" },
    });
    await newerSave;

    expect(mockedApi.character.update).toHaveBeenCalledTimes(3);
    expect(useCharacterStore.getState().currentItem).toMatchObject({
      name: "Latest",
      description: "Newest",
    });
    expect(useWorldBuildingStore.getState().graphData?.nodes[0]).toMatchObject({
      name: "Latest",
      description: "Newest",
      positionX: 10,
      positionY: 20,
    });
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("preserves a newer optimistic entity when an older retry ACK becomes stale", async () => {
    const retryAck = deferred<IPCResponse<Character>>();
    const character: Character = {
      id: "char-optimistic-race",
      projectId: "project-1",
      name: "Original",
      attributes: { role: "support", color: "gray" },
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    };
    mockedApi.character.update
      .mockResolvedValueOnce({
        success: false,
        error: { message: "initial failed" },
      })
      .mockReturnValueOnce(retryAck.promise)
      .mockResolvedValueOnce({
        success: false,
        error: { message: "newer failed" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...character,
          name: "Latest B",
          attributes: { role: "lead", color: "red", tagline: "Hero" },
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
            attributes: character.attributes,
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
        name: "Retry A",
        attributesPatch: { role: "lead", color: "blue" },
      }),
    ).rejects.toThrow("initial failed");

    const retryFlush = flushWorldEntityMutations();
    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    const newerSave = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Latest B",
      attributesPatch: { color: "red", tagline: "Hero" },
    });
    const retryFailure = expect(retryFlush).rejects.toThrow("newer failed");
    const newerFailure = expect(newerSave).rejects.toThrow("newer failed");

    retryAck.resolve({
      success: true,
      data: {
        ...character,
        name: "Retry A",
        attributes: { role: "lead", color: "blue" },
      },
    });
    await Promise.all([retryFailure, newerFailure]);

    expect(mockedApi.character.update).toHaveBeenCalledTimes(3);
    expect(mockedApi.character.update).toHaveBeenLastCalledWith({
      id: character.id,
      name: "Latest B",
      attributesPatch: { color: "red", tagline: "Hero" },
    });
    expect(useCharacterStore.getState().items[0]).toMatchObject({
      name: "Latest B",
      attributes: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(useCharacterStore.getState().currentItem).toMatchObject({
      name: "Latest B",
      attributes: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(useWorldBuildingStore.getState().graphData?.nodes[0]).toMatchObject({
      name: "Latest B",
      attributes: { role: "lead", color: "red", tagline: "Hero" },
      positionX: 10,
      positionY: 20,
    });
    expect(getPendingWorldEntityMutationCount()).toBe(1);

    await flushWorldEntityMutations();

    expect(mockedApi.character.update).toHaveBeenCalledTimes(4);
    expect(useCharacterStore.getState().currentItem).toMatchObject({
      name: "Latest B",
      attributes: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(useWorldBuildingStore.getState().graphData?.nodes[0]).toMatchObject({
      name: "Latest B",
      attributes: { role: "lead", color: "red", tagline: "Hero" },
    });
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("waits for an in-flight entity update before deleting it", async () => {
    const updateAck = deferred<IPCResponse<Character>>();
    const character = createCharacter("char-delete-drain");
    seedCharacters([character]);
    mockedApi.character.update.mockReturnValueOnce(updateAck.promise);

    const update = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Saved first",
    });
    const deletion = useCharacterStore.getState().deleteCharacter(character.id);
    const deleteCallsBeforeAck = mockedApi.character.delete.mock.calls.length;

    updateAck.resolve({
      success: true,
      data: { ...character, name: "Saved first" },
    });
    await expect(update).resolves.toBeUndefined();
    await expect(deletion).resolves.toBe(true);

    expect(deleteCallsBeforeAck).toBe(0);
    expect(mockedApi.character.delete).toHaveBeenCalledOnce();
    expect(useCharacterStore.getState().items).toEqual([]);
    expect(useCharacterStore.getState().currentItem).toBeNull();
    expect(
      useWorldBuildingStore
        .getState()
        .graphData?.nodes.some((node) => node.id === character.id),
    ).toBe(false);
  });

  it("retries a retained update once and aborts delete when the retry has no ACK", async () => {
    const retryAck = deferred<IPCResponse<Character>>();
    const character = createCharacter("char-delete-retry");
    seedCharacters([character]);
    mockedApi.character.update
      .mockResolvedValueOnce({
        success: false,
        error: { message: "initial failed" },
      })
      .mockReturnValueOnce(retryAck.promise)
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Retained" },
      });

    await expect(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        name: "Retained",
      }),
    ).rejects.toThrow("initial failed");

    const failedDeletion = useCharacterStore
      .getState()
      .deleteCharacter(character.id);
    await Promise.resolve();
    const updateCallsBeforeRetryAck =
      mockedApi.character.update.mock.calls.length;
    const deleteCallsBeforeRetryAck =
      mockedApi.character.delete.mock.calls.length;

    retryAck.resolve({ success: true, data: null });
    const failedDeleteResult = await failedDeletion;
    const pendingAfterFailedDelete = getPendingWorldEntityMutationCount();
    const retainedItemAfterFailedDelete =
      useCharacterStore.getState().currentItem;
    const nextDeleteResult = await useCharacterStore
      .getState()
      .deleteCharacter(character.id);

    expect(updateCallsBeforeRetryAck).toBe(2);
    expect(deleteCallsBeforeRetryAck).toBe(0);
    expect(failedDeleteResult).toBe(false);
    expect(pendingAfterFailedDelete).toBe(1);
    expect(retainedItemAfterFailedDelete).toMatchObject({
      id: character.id,
      name: "Retained",
    });
    expect(nextDeleteResult).toBe(true);
    expect(mockedApi.character.update).toHaveBeenCalledTimes(3);
    expect(mockedApi.character.delete).toHaveBeenCalledOnce();
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("cancels a stale update retry timer before delete drains", async () => {
    vi.useFakeTimers();
    const character = createCharacter("char-delete-timer");
    seedCharacters([character]);
    mockedApi.character.update
      .mockResolvedValueOnce({
        success: false,
        error: { message: "initial failed" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Saved before delete" },
      });

    await expect(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        name: "Saved before delete",
      }),
    ).rejects.toThrow("initial failed");
    await expect(
      useCharacterStore.getState().deleteCharacter(character.id),
    ).resolves.toBe(true);

    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    expect(mockedApi.character.delete).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockedApi.character.update).toHaveBeenCalledTimes(2);
    expect(getPendingWorldEntityMutationCount()).toBe(0);
  });

  it("rejects a newer update without applying it while delete drains the entity", async () => {
    const updateAck = deferred<IPCResponse<Character>>();
    const character = createCharacter("char-delete-guard");
    seedCharacters([character]);
    mockedApi.character.update
      .mockReturnValueOnce(updateAck.promise)
      .mockResolvedValueOnce({
        success: true,
        data: { ...character, name: "Blocked B" },
      });

    const firstUpdate = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Drain A",
    });
    const deletion = useCharacterStore.getState().deleteCharacter(character.id);
    const rejectedUpdate = useCharacterStore.getState().updateCharacter({
      id: character.id,
      name: "Blocked B",
    });
    const itemDuringDrain = useCharacterStore.getState().currentItem;
    const graphDuringDrain =
      useWorldBuildingStore.getState().graphData?.nodes[0];

    updateAck.resolve({
      success: true,
      data: { ...character, name: "Drain A" },
    });
    const [firstResult, deletionResult, rejectedResult] =
      await Promise.allSettled([firstUpdate, deletion, rejectedUpdate]);

    expect(rejectedResult).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining("being deleted"),
      }),
    });
    expect(itemDuringDrain).toMatchObject({
      name: "Drain A",
    });
    expect(graphDuringDrain).toMatchObject({
      name: "Original",
    });
    expect(mockedApi.character.update).toHaveBeenCalledOnce();
    expect(firstResult.status).toBe("fulfilled");
    expect(deletionResult).toMatchObject({ status: "fulfilled", value: true });
  });

  it("releases the entity guard after delete failure", async () => {
    const character = createCharacter("char-delete-failure");
    seedCharacters([character]);
    mockedApi.character.delete.mockResolvedValueOnce({
      success: false,
      error: { message: "delete failed" },
    });
    mockedApi.character.update.mockResolvedValueOnce({
      success: true,
      data: { ...character, name: "Retry allowed" },
    });

    await expect(
      useCharacterStore.getState().deleteCharacter(character.id),
    ).resolves.toBe(false);
    await expect(
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        name: "Retry allowed",
      }),
    ).resolves.toBeUndefined();

    expect(mockedApi.character.update).toHaveBeenCalledOnce();
    expect(useCharacterStore.getState().currentItem).toMatchObject({
      name: "Retry allowed",
    });
  });

  it("deletes one entity without waiting for another entity update", async () => {
    const otherUpdateAck = deferred<IPCResponse<Character>>();
    const deletedCharacter = createCharacter("char-delete-independent");
    const updatingCharacter = createCharacter("char-update-independent");
    seedCharacters([deletedCharacter, updatingCharacter]);
    mockedApi.character.update.mockReturnValueOnce(otherUpdateAck.promise);

    const otherUpdate = useCharacterStore.getState().updateCharacter({
      id: updatingCharacter.id,
      name: "Still saving",
    });
    const deletion = useCharacterStore
      .getState()
      .deleteCharacter(deletedCharacter.id);

    await expect(deletion).resolves.toBe(true);
    expect(mockedApi.character.delete).toHaveBeenCalledOnce();

    otherUpdateAck.resolve({
      success: true,
      data: { ...updatingCharacter, name: "Still saving" },
    });
    await otherUpdate;
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

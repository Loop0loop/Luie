import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterStore } from "../../../src/renderer/src/features/research/stores/characterStore.js";
import { useProjectStore } from "../../../src/renderer/src/features/project/stores/projectStore.js";
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

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("characterStore mutation locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore(useCharacterStore as unknown as ResettableStore);
    resetStore(useProjectStore as unknown as ResettableStore);

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

  it("keeps the project lock until the graph refresh finishes", async () => {
    const createDeferred = deferred<IPCResponse<Character>>();
    const refreshDeferred = deferred<void>();

    mockedApi.character.create.mockReturnValue(createDeferred.promise);
    mockedRefresh.refreshWorldGraph.mockReturnValue(refreshDeferred.promise);

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

    const firstCreate = useCharacterStore.getState().create({
      projectId: "project-1",
      name: "Hero",
    });

    createDeferred.resolve({
      success: true,
      data: {
        id: "char-1",
        projectId: "project-1",
        name: "Hero",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    });
    await flushMicrotasks();

    const secondCreate = useCharacterStore.getState().create({
      projectId: "project-1",
      name: "Rival",
    });

    expect(mockedApi.character.create).toHaveBeenCalledTimes(1);
    await expect(secondCreate).resolves.toBeNull();

    refreshDeferred.resolve();
    await expect(firstCreate).resolves.toMatchObject({
      id: "char-1",
      name: "Hero",
    });
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

    await expect(
      useCharacterStore.getState().deleteCharacter("char-1"),
    ).resolves.toBe(false);
    expect(mockedApi.character.delete).toHaveBeenCalledWith("char-1");
    expect(mockedRefresh.refreshWorldGraph).not.toHaveBeenCalled();
  });
});

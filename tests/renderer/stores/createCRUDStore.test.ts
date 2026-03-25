import { create } from "zustand";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIClient } from "../../../src/renderer/src/shared/store/createCRUDStore.js";
import { createCRUDSlice } from "../../../src/renderer/src/shared/store/createCRUDStore.js";

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
}));

vi.mock("@shared/api", () => ({
  api: mockedApi,
}));

type Item = {
  id: string;
  name: string;
};

type CreateInput = {
  name: string;
};

type UpdateInput = {
  id: string;
  name?: string;
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

const createApiClient = (
  createResponse: Promise<IPCResponse<Item>>,
  loadResponse: Promise<IPCResponse<Item[]>>,
): APIClient<Item, CreateInput, UpdateInput> => ({
  getAll: vi.fn(() => loadResponse),
  get: vi.fn(async (id: string) => ({
    success: true,
    data: {
      id,
      name: "Loaded",
    },
  })),
  create: vi.fn(() => createResponse),
  update: vi.fn(async (input: UpdateInput) => ({
    success: true,
    data: {
      id: input.id,
      name: input.name ?? "Updated",
    },
  })),
  delete: vi.fn(async () => ({
    success: true,
  })),
});

describe("createCRUDStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows create while loadAll is in flight", async () => {
    const loadDeferred = deferred<IPCResponse<Item[]>>();
    const createDeferred = deferred<IPCResponse<Item>>();
    const apiClient = createApiClient(
      createDeferred.promise,
      loadDeferred.promise,
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    const loadPromise = store.getState().loadAll("project-1");
    const createPromise = store.getState().create({ name: "Hero" });

    expect(apiClient.create).toHaveBeenCalledTimes(1);

    createDeferred.resolve({
      success: true,
      data: {
        id: "item-1",
        name: "Hero",
      },
    });
    await expect(createPromise).resolves.toMatchObject({
      id: "item-1",
      name: "Hero",
    });

    loadDeferred.resolve({
      success: true,
      data: [
        {
          id: "item-0",
          name: "Loaded",
        },
      ],
    });
    await loadPromise;
  });

  it("blocks concurrent create calls until the first create finishes", async () => {
    const loadDeferred = deferred<IPCResponse<Item[]>>();
    const createDeferred = deferred<IPCResponse<Item>>();
    const apiClient = createApiClient(
      createDeferred.promise,
      loadDeferred.promise,
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    const firstCreate = store.getState().create({ name: "Hero" });
    const secondCreate = store.getState().create({ name: "Rival" });

    expect(apiClient.create).toHaveBeenCalledTimes(1);

    await expect(secondCreate).resolves.toBeNull();

    createDeferred.resolve({
      success: true,
      data: {
        id: "item-1",
        name: "Hero",
      },
    });
    loadDeferred.resolve({
      success: true,
      data: [],
    });

    await expect(firstCreate).resolves.toMatchObject({
      id: "item-1",
      name: "Hero",
    });
    await store.getState().loadAll("project-1");
  });
});

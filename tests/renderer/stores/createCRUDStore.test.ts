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
  projectId?: string;
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
    expect(store.getState().error).toContain("already in flight");

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

  it("allows concurrent create calls for different projects", async () => {
    const projectOneCreate = deferred<IPCResponse<Item>>();
    const projectTwoCreate = deferred<IPCResponse<Item>>();
    const apiClient = createApiClient(
      Promise.resolve({
        success: true,
        data: {
          id: "fallback",
          name: "Fallback",
        },
      }),
      Promise.resolve({
        success: true,
        data: [],
      }),
    );
    apiClient.create.mockImplementation((input: CreateInput) =>
      input.projectId === "project-1"
        ? projectOneCreate.promise
        : projectTwoCreate.promise,
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    const firstCreate = store
      .getState()
      .create({ name: "Hero", projectId: "project-1" });
    const secondCreate = store
      .getState()
      .create({ name: "Rival", projectId: "project-2" });

    expect(apiClient.create).toHaveBeenCalledTimes(2);

    projectOneCreate.resolve({
      success: true,
      data: { id: "item-1", name: "Hero" },
    });
    projectTwoCreate.resolve({
      success: true,
      data: { id: "item-2", name: "Rival" },
    });

    await expect(firstCreate).resolves.toMatchObject({ id: "item-1" });
    await expect(secondCreate).resolves.toMatchObject({ id: "item-2" });
  });

  it("returns false and surfaces an error when delete fails", async () => {
    const loadDeferred = deferred<IPCResponse<Item[]>>();
    const apiClient = createApiClient(
      Promise.resolve({
        success: true,
        data: {
          id: "item-1",
          name: "Hero",
        },
      }),
      loadDeferred.promise,
    );
    apiClient.delete.mockResolvedValue({
      success: false,
      error: {
        message: "Item was not found",
      },
    });

    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await expect(store.getState().delete("item-1")).resolves.toBe(false);
    expect(store.getState().error).toBe("Item was not found");
    expect(apiClient.delete).toHaveBeenCalledWith("item-1");
  });

  it("returns the item acknowledged by update", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await expect(
      store.getState().update({ id: "item-1", name: "Updated" }),
    ).resolves.toEqual({ id: "item-1", name: "Updated" });
  });

  it("ignores stale loadAll responses when a newer project load finishes first", async () => {
    const firstLoad = deferred<IPCResponse<Item[]>>();
    const secondLoad = deferred<IPCResponse<Item[]>>();
    const apiClient = createApiClient(
      Promise.resolve({
        success: true,
        data: {
          id: "item-1",
          name: "Created",
        },
      }),
      Promise.resolve({
        success: true,
        data: [],
      }),
    );
    apiClient.getAll.mockImplementationOnce(() => firstLoad.promise);
    apiClient.getAll.mockImplementationOnce(() => secondLoad.promise);
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    const stalePromise = store.getState().loadAll("project-1");
    const freshPromise = store.getState().loadAll("project-2");

    secondLoad.resolve({
      success: true,
      data: [{ id: "fresh", name: "Fresh" }],
    });
    await freshPromise;
    expect(store.getState().items).toEqual([{ id: "fresh", name: "Fresh" }]);
    expect(store.getState().isLoading).toBe(false);

    firstLoad.resolve({
      success: true,
      data: [{ id: "stale", name: "Stale" }],
    });
    await stalePromise;

    expect(store.getState().items).toEqual([{ id: "fresh", name: "Fresh" }]);
    expect(store.getState().isLoading).toBe(false);
  });
});

// ISTQB 관점 설명:
// 대상 = ensureLoaded의 프로젝트 스코프 캐시. 리스크 = 패널/사이드바가 열릴 때마다
// 전체 목록 IPC가 재실행되어 클릭~표시 지연이 발생하는 것(성능)과, 캐시 도입으로
// 낡은 목록을 보여주는 것(정확성)의 양면.
// 근거값(evidence) = apiClient.getAll의 호출 횟수와 store.items의 실제 내용.
describe("createCRUDStore ensureLoaded project-scope cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the IPC round-trip when the same project scope was already loaded successfully", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [{ id: "item-0", name: "A" }] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("project-1");
    await store.getState().ensureLoaded("project-1");

    // 근거: 첫 로드 1회 이후 재요청이 없어야 패널 재오픈이 즉시 렌더된다.
    expect(apiClient.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().items).toEqual([{ id: "item-0", name: "A" }]);
  });

  it("refetches when the project scope changes", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [{ id: "item-0", name: "A" }] }),
    );
    apiClient.getAll.mockImplementationOnce(() =>
      Promise.resolve({ success: true, data: [{ id: "a-1", name: "FromA" }] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("project-1");
    await store.getState().ensureLoaded("project-2");

    expect(apiClient.getAll).toHaveBeenCalledTimes(2);
    expect(store.getState().items).toEqual([{ id: "item-0", name: "A" }]);
  });

  it("does not cache a failed load, so the next ensureLoaded retries the IPC", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [] as Item[] }),
    );
    apiClient.getAll.mockImplementationOnce(() =>
      Promise.reject(new Error("ipc down")),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("project-1");
    expect(store.getState().error).toBe("ipc down");

    apiClient.getAll.mockImplementationOnce(() =>
      Promise.resolve({ success: true, data: [{ id: "ok-1", name: "Ok" }] }),
    );
    await store.getState().ensureLoaded("project-1");

    // 근거: 실패 직후 재요청이 일어나야 "영구 빈 목록"이 되지 않는다.
    expect(apiClient.getAll).toHaveBeenCalledTimes(2);
    expect(store.getState().items).toEqual([{ id: "ok-1", name: "Ok" }]);
    expect(store.getState().error).toBeNull();
  });

  it("keeps the cache valid after create so panel reopen serves incrementally updated items without IPC", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [{ id: "item-0", name: "A" }] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("project-1");
    await store.getState().create({ name: "Newcomer" });
    await store.getState().ensureLoaded("project-1");

    expect(apiClient.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().items).toEqual([
      { id: "item-0", name: "A" },
      { id: "item-1", name: "Hero" },
    ]);
  });

  it("deduplicates concurrent ensureLoaded calls for the same scope into one IPC", async () => {
    const loadDeferred = deferred<IPCResponse<Item[]>>();
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      loadDeferred.promise,
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    const first = store.getState().ensureLoaded("project-1");
    const second = store.getState().ensureLoaded("project-1");
    loadDeferred.resolve({
      success: true,
      data: [{ id: "item-0", name: "A" }],
    });
    await Promise.all([first, second]);

    // 근거: 매니저 패널과 사이드바 리스트가 동시에 마운트돼도 IPC는 1회여야 한다.
    expect(apiClient.getAll).toHaveBeenCalledTimes(1);
  });

  it("always refetches via loadAll even when the scope is already cached", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [{ id: "item-0", name: "A" }] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("project-1");
    await store.getState().loadAll("project-1");

    // loadAll은 프로젝트 전환/복원/임포트가 지나는 "재조회 신호"라는 기존 시맨스를 유지한다.
    expect(apiClient.getAll).toHaveBeenCalledTimes(2);
  });

  it("preserves the wizard-preview in-memory seeding guard", async () => {
    const apiClient = createApiClient(
      Promise.resolve({ success: true, data: { id: "item-1", name: "Hero" } }),
      Promise.resolve({ success: true, data: [] }),
    );
    const store = create(
      createCRUDSlice<Item, CreateInput, UpdateInput>(apiClient, "Item"),
    );

    await store.getState().ensureLoaded("wizard-preview-project");

    expect(apiClient.getAll).not.toHaveBeenCalled();
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBeNull();
  });
});

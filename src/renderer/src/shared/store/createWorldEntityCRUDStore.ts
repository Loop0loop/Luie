import type { StateCreator } from "zustand";
import type { Character, Event, Faction, Term } from "@shared/types";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
  type APIClient,
} from "./createCRUDStore";
import { useProjectStore } from "@renderer/domains/project";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";
import { createLatestMutationQueue } from "./worldEntityMutationQueue";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuilding/worldBuildingStore";
import {
  removeNodeFromGraph,
  replaceEntityNodePreservingPosition,
} from "@renderer/features/research/stores/worldBuilding/worldBuildingStore.graph";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";

interface BaseItem {
  id: string;
  projectId: string;
}

export interface WorldEntityCRUDBase<
  T extends BaseItem,
  CreateInput,
  UpdateInput,
> {
  items: T[];
  currentItem: T | null;
  isLoading: boolean;
  error: string | null;

  loadAll: (parentId?: string) => Promise<void>;
  ensureLoaded: (parentId?: string) => Promise<void>;
  loadOne: (id: string) => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (input: UpdateInput) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
  setCurrent: (item: T | null) => void;
}

export interface CreateWorldEntityCRUDStoreOptions<
  T extends BaseItem,
  CreateInput extends { projectId?: string },
  UpdateInput extends {
    id: string;
    attributesPatch?: Record<string, unknown>;
  },
  AliasesT,
> {
  apiClient: APIClient<T, CreateInput, UpdateInput>;
  entityName: "Character" | "Event" | "Faction" | "Term";
  methodPrefix: string;
  aliasItemsKey: keyof AliasesT;
  aliasCurrentKey: keyof AliasesT;
}

export function createWorldEntityCRUDStore<
  T extends BaseItem,
  CreateInput extends { projectId?: string },
  UpdateInput extends {
    id: string;
    attributesPatch?: Record<string, unknown>;
  },
  AliasesT,
>(
  options: CreateWorldEntityCRUDStoreOptions<
    T,
    CreateInput,
    UpdateInput,
    AliasesT
  >,
): StateCreator<
  WorldEntityCRUDBase<T, CreateInput, UpdateInput> & AliasesT,
  [],
  [],
  WorldEntityCRUDBase<T, CreateInput, UpdateInput> & AliasesT
> {
  const {
    apiClient,
    entityName,
    methodPrefix,
    aliasItemsKey,
    aliasCurrentKey,
  } = options;

  return (set, get, store) => {
    const setWithAlias = createAliasSetter<
      WorldEntityCRUDBase<T, CreateInput, UpdateInput> & AliasesT,
      T
    >(set, aliasItemsKey, aliasCurrentKey);

    const mutationLocks = new Set<string>();
    const deletingEntities = new Set<string>();
    const updateQueues = new Map<
      string,
      ReturnType<typeof createLatestMutationQueue<UpdateInput, T>>
    >();
    const optimisticUpdates = new Map<
      string,
      Array<{ generation: number; patch: UpdateInput }>
    >();
    let optimisticGeneration = 0;

    const mergeUpdateInputs = (
      left: UpdateInput | null,
      right: UpdateInput,
    ): UpdateInput => ({
      ...left,
      ...right,
      ...(left?.attributesPatch || right.attributesPatch
        ? {
            attributesPatch: {
              ...(left?.attributesPatch ?? {}),
              ...(right.attributesPatch ?? {}),
            },
          }
        : {}),
    });

    const applyOptimisticPatch = (item: T, patch: UpdateInput): T => {
      const { attributesPatch, ...scalarInput } = patch;
      return {
        ...item,
        ...scalarInput,
        ...(attributesPatch
          ? {
              attributes: {
                ...parseStructuredAttributes(
                  (item as T & { attributes?: unknown }).attributes,
                ),
                ...attributesPatch,
              },
            }
          : {}),
      };
    };

    const applyOptimisticState = (id: string, patch: UpdateInput): void => {
      setWithAlias(
        (state) =>
          ({
            items: state.items.map((item) =>
              item.id === id ? applyOptimisticPatch(item, patch) : item,
            ),
            currentItem:
              state.currentItem?.id === id
                ? applyOptimisticPatch(state.currentItem, patch)
                : state.currentItem,
          }) as Partial<
            WorldEntityCRUDBase<T, CreateInput, UpdateInput> & AliasesT
          >,
      );
    };

    const scopedApiClient = withProjectScopedGetAll(apiClient);

    const crudSlice = createCRUDSlice<T, CreateInput, UpdateInput>(
      scopedApiClient,
      entityName,
    )(
      setWithAlias as (
        partial:
          | Partial<WorldEntityCRUDBase<T, CreateInput, UpdateInput>>
          | ((
              state: WorldEntityCRUDBase<T, CreateInput, UpdateInput>,
            ) => Partial<WorldEntityCRUDBase<T, CreateInput, UpdateInput>>),
      ) => void,
      get,
      store,
    );

    const reloadCurrentGraph = async (projectId?: string | null) => {
      await refreshWorldGraph(
        projectId ?? useProjectStore.getState().currentItem?.id,
      );
    };

    const getProjectIdForItem = (id: string): string | null =>
      get().items.find((item) => item.id === id)?.projectId ??
      (get().currentItem?.id === id ? get().currentItem?.projectId : null) ??
      null;

    const createWithSync = async (input: CreateInput): Promise<T | null> => {
      const projectId =
        input.projectId ?? useProjectStore.getState().currentItem?.id;
      if (!projectId) {
        return null;
      }

      return runWithProjectLock(mutationLocks, projectId, async () => {
        const created = await crudSlice.create({
          ...input,
          projectId,
        } as CreateInput);
        if (!created) {
          return null;
        }
        await reloadCurrentGraph(projectId);
        return created;
      });
    };

    const updateWithSync = async (input: UpdateInput): Promise<T | null> => {
      if (deletingEntities.has(input.id)) {
        throw new Error(`${entityName} ${input.id} is being deleted.`);
      }

      const projectId = getProjectIdForItem(input.id);
      if (!projectId) {
        return null;
      }

      optimisticGeneration += 1;
      const trackedUpdates = optimisticUpdates.get(input.id) ?? [];
      trackedUpdates.push({
        generation: optimisticGeneration,
        patch: input,
      });
      optimisticUpdates.set(input.id, trackedUpdates);
      applyOptimisticState(input.id, input);

      let queue = updateQueues.get(input.id);
      if (!queue) {
        const createdQueue = createLatestMutationQueue<UpdateInput, T>({
          merge: mergeUpdateInputs,
          retryDelaysMs: [250, 500, 1000],
          execute: async (patch) => {
            const updatesAtStart = optimisticUpdates.get(patch.id) ?? [];
            const coveredGeneration =
              updatesAtStart[updatesAtStart.length - 1]?.generation ?? 0;
            const updated = await crudSlice.update(patch);
            if (!updated) {
              throw new Error(
                get().error || `Failed to persist ${entityName} update.`,
              );
            }
            const newerUpdates = (optimisticUpdates.get(patch.id) ?? []).filter(
              (update) => update.generation > coveredGeneration,
            );
            const newerPatch = newerUpdates.reduce<UpdateInput | null>(
              (merged, update) => mergeUpdateInputs(merged, update.patch),
              null,
            );
            if (newerPatch) {
              optimisticUpdates.set(patch.id, newerUpdates);
              applyOptimisticState(patch.id, newerPatch);
            } else {
              optimisticUpdates.delete(patch.id);
            }
            const projected = newerPatch
              ? applyOptimisticPatch(updated, newerPatch)
              : updated;
            useWorldBuildingStore.setState((state) => ({
              graphData: replaceEntityNodePreservingPosition(
                state.graphData,
                entityName,
                projected as unknown as Character | Event | Faction | Term,
              ),
            }));
            return updated;
          },
          onIdle: () => {
            if (updateQueues.get(input.id) === createdQueue) {
              updateQueues.delete(input.id);
            }
            optimisticUpdates.delete(input.id);
          },
        });
        queue = createdQueue;
        updateQueues.set(input.id, queue);
      }

      return queue.enqueue(input);
    };

    const deleteWithSync = async (id: string): Promise<boolean> => {
      const projectId = getProjectIdForItem(id);
      if (!projectId || deletingEntities.has(id)) {
        return false;
      }

      deletingEntities.add(id);
      try {
        const queue = updateQueues.get(id);
        if (queue) {
          try {
            await queue.flush();
          } catch {
            return false;
          }
        }

        return (
          (await runWithProjectLock(mutationLocks, projectId, async () => {
            const deleted = await crudSlice.delete(id);
            if (!deleted) {
              return false;
            }
            updateQueues.delete(id);
            optimisticUpdates.delete(id);
            useWorldBuildingStore.setState((state) => ({
              graphData: removeNodeFromGraph(state.graphData, id),
            }));
            await reloadCurrentGraph(projectId);
            return true;
          })) ?? false
        );
      } finally {
        deletingEntities.delete(id);
      }
    };

    return {
      ...crudSlice,
      [aliasItemsKey]: crudSlice.items,
      [aliasCurrentKey]: crudSlice.currentItem,
      create: createWithSync,
      update: updateWithSync,
      delete: deleteWithSync,
      [`load${methodPrefix}s`]: (projectId: string) =>
        crudSlice.loadAll(projectId),
      [`load${methodPrefix}`]: (id: string) => crudSlice.loadOne(id),
      [`create${methodPrefix}`]: async (input: CreateInput) => {
        await createWithSync(input);
      },
      [`update${methodPrefix}`]: async (input: UpdateInput) => {
        await updateWithSync(input);
      },
      [`delete${methodPrefix}`]: async (id: string) => deleteWithSync(id),
      [`setCurrent${methodPrefix}`]: (item: T | null) =>
        crudSlice.setCurrent(item),
    } as unknown as WorldEntityCRUDBase<T, CreateInput, UpdateInput> & AliasesT;
  };
}

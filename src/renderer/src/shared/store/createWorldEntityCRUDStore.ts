import type { StateCreator } from "zustand";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
  type APIClient,
} from "./createCRUDStore";
import { useProjectStore } from "@renderer/domains/project";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";

interface BaseItem {
  id: string;
}

/**
 * 월드 엔티티(캐릭터/용어/사건/세력) CRUD 스토어의 공통 베이스 인터페이스.
 * createCRUDSlice가 제공하는 기본 CRUD 필드 + 메서드를 정의.
 */
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
  loadOne: (id: string) => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (input: UpdateInput) => Promise<void>;
  delete: (id: string) => Promise<boolean>;
  setCurrent: (item: T | null) => void;
}

export interface CreateWorldEntityCRUDStoreOptions<
  T extends BaseItem,
  CreateInput extends { projectId?: string },
  UpdateInput,
  AliasesT,
> {
  /** API 클라이언트 (예: api.character, api.term 등) */
  apiClient: APIClient<T, CreateInput, UpdateInput>;
  /** 엔티티 이름 (로깅용, 예: "Character", "Term") */
  entityName: string;
  /** 별칭 메서드 접두사 (예: "Character", "Term") */
  methodPrefix: string;
  /** items 별칭 키 (예: "characters", "terms") */
  aliasItemsKey: keyof AliasesT;
  /** currentItem 별칭 키 (예: "currentCharacter", "currentTerm") */
  aliasCurrentKey: keyof AliasesT;
}

/**
 * 월드 엔티티 CRUD 스토어 팩토리.
 *
 * character/term/event/factionStore의 중복된 패턴(프로젝트 락, 그래프 동기화,
 * 별칭 메서드, 호환성 필드)을 단일 팩토리로 통합.
 */
export function createWorldEntityCRUDStore<
  T extends BaseItem,
  CreateInput extends { projectId?: string },
  UpdateInput,
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

    const updateWithSync = async (input: UpdateInput): Promise<void> => {
      const projectId = useProjectStore.getState().currentItem?.id;
      if (!projectId) {
        return;
      }

      await runWithProjectLock(mutationLocks, projectId, async () => {
        await crudSlice.update(input);
        await reloadCurrentGraph(projectId);
      });
    };

    const deleteWithSync = async (id: string): Promise<boolean> => {
      const projectId = useProjectStore.getState().currentItem?.id;
      if (!projectId) {
        return false;
      }

      return (
        (await runWithProjectLock(mutationLocks, projectId, async () => {
          const deleted = await crudSlice.delete(id);
          if (!deleted) {
            return false;
          }
          await reloadCurrentGraph(projectId);
          return true;
        })) ?? false
      );
    };

    return {
      ...crudSlice,
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

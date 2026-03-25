import { create } from "zustand";
import type { Faction } from "@shared/types";
import {
    createAliasSetter,
    createCRUDSlice,
    withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type { CRUDStore } from "@renderer/shared/store/createCRUDStore";
import {
    type FactionCreateInput,
    type FactionUpdateInput,
} from "@shared/types";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";

type BaseFactionStore = CRUDStore<
    Faction,
    FactionCreateInput,
    FactionUpdateInput
>;

interface FactionStore extends BaseFactionStore {
    loadFactions: (projectId: string) => Promise<void>;
    loadFaction: (id: string) => Promise<void>;
    createFaction: (input: FactionCreateInput) => Promise<void>;
    updateFaction: (input: FactionUpdateInput) => Promise<void>;
    deleteFaction: (id: string) => Promise<void>;
    setCurrentFaction: (faction: Faction | null) => void;

    factions: Faction[];
    currentFaction: Faction | null;
}

export const useFactionStore = create<FactionStore>((set, _get, store) => {
    const setWithAlias = createAliasSetter<FactionStore, Faction>(
        set,
        "factions",
        "currentFaction",
    );
    const mutationLocks = new Set<string>();

    const apiClient = withProjectScopedGetAll(api.faction);

    const crudSlice = createCRUDSlice<
        Faction,
        FactionCreateInput,
        FactionUpdateInput
    >(apiClient, "Faction")(setWithAlias, _get, store);

    const reloadCurrentGraph = async (projectId?: string | null) => {
        await refreshWorldGraph(
            projectId ?? useProjectStore.getState().currentItem?.id,
        );
    };

    const createFactionWithSync = async (input: FactionCreateInput) => {
        const projectId =
            input.projectId ?? useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return null;
        }

        return await runWithProjectLock(mutationLocks, projectId, async () => {
            const created = await crudSlice.create({
                ...input,
                projectId,
            });
            if (!created) {
                return null;
            }
            await reloadCurrentGraph(projectId);
            return created;
        });
    };

    const updateFactionWithSync = async (input: FactionUpdateInput) => {
        const projectId = useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return;
        }

        await runWithProjectLock(mutationLocks, projectId, async () => {
            await crudSlice.update(input);
            await reloadCurrentGraph(projectId);
        });
    };

    const deleteFactionWithSync = async (id: string) => {
        const projectId = useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return;
        }

        await runWithProjectLock(mutationLocks, projectId, async () => {
            await crudSlice.delete(id);
            await reloadCurrentGraph(projectId);
        });
    };

    return {
        ...crudSlice,
        create: createFactionWithSync,
        update: updateFactionWithSync,
        delete: deleteFactionWithSync,
        loadFactions: (projectId: string) => crudSlice.loadAll(projectId),
        loadFaction: (id: string) => crudSlice.loadOne(id),
        createFaction: async (input: FactionCreateInput) => {
            await createFactionWithSync(input);
        },
        updateFaction: async (input: FactionUpdateInput) => {
            await updateFactionWithSync(input);
        },
        deleteFaction: async (id: string) => {
            await deleteFactionWithSync(id);
        },
        setCurrentFaction: (faction: Faction | null) =>
            crudSlice.setCurrent(faction),

        factions: crudSlice.items,
        currentFaction: crudSlice.currentItem,
    };
});

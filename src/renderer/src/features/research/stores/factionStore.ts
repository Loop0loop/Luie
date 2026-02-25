import { create } from "zustand";
import type { Faction } from "@shared/types";
import {
    createAliasSetter,
    createCRUDSlice,
    withProjectScopedGetAll,
} from "@shared/utils/createCRUDStore";
import type { CRUDStore } from "@shared/utils/createCRUDStore";
import {
    type FactionCreateInput,
    type FactionUpdateInput,
} from "@shared/types";
import { api } from "@shared/api";

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

    const apiClient = withProjectScopedGetAll(api.faction);

    const crudSlice = createCRUDSlice<
        Faction,
        FactionCreateInput,
        FactionUpdateInput
    >(apiClient, "Faction")(setWithAlias, _get, store);

    return {
        ...crudSlice,
        loadFactions: (projectId: string) => crudSlice.loadAll(projectId),
        loadFaction: (id: string) => crudSlice.loadOne(id),
        createFaction: async (input: FactionCreateInput) => {
            await crudSlice.create(input);
        },
        updateFaction: async (input: FactionUpdateInput) => {
            await crudSlice.update(input);
        },
        deleteFaction: (id: string) => crudSlice.delete(id),
        setCurrentFaction: (faction: Faction | null) =>
            crudSlice.setCurrent(faction),

        factions: crudSlice.items,
        currentFaction: crudSlice.currentItem,
    };
});

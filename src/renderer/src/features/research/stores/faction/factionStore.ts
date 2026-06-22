import { create } from "zustand";
import type {
  Faction,
  FactionCreateInput,
  FactionUpdateInput,
} from "@shared/types";
import { withProjectScopedGetAll } from "@renderer/shared/store/createCRUDStore";
import { createWorldEntityCRUDStore } from "@renderer/shared/store/createWorldEntityCRUDStore";
import { api } from "@shared/api";

interface FactionAliases {
  loadFactions: (projectId: string) => Promise<void>;
  loadFaction: (id: string) => Promise<void>;
  createFaction: (input: FactionCreateInput) => Promise<void>;
  updateFaction: (input: FactionUpdateInput) => Promise<void>;
  deleteFaction: (id: string) => Promise<boolean>;
  setCurrentFaction: (faction: Faction | null) => void;
  factions: Faction[];
  currentFaction: Faction | null;
}

export const useFactionStore = create(
  createWorldEntityCRUDStore<Faction, FactionCreateInput, FactionUpdateInput, FactionAliases>({
    apiClient: withProjectScopedGetAll(api.faction),
    entityName: "Faction",
    methodPrefix: "Faction",
    aliasItemsKey: "factions",
    aliasCurrentKey: "currentFaction",
  }),
);

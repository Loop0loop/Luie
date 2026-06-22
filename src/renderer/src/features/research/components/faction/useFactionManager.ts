import { useCallback } from "react";
import { type TFunction } from "i18next";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useShallow } from "zustand/react/shallow";
import { useEntityManager } from "@renderer/features/research/hooks/useEntityManager";

export type FactionLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useFactionManager(t: TFunction) {
  const { items, currentItem, loadAll, create, update, setCurrent } =
    useFactionStore(
      useShallow((state) => ({
        items: state.items as FactionLike[],
        currentItem: state.currentItem,
        loadAll: state.loadAll,
        create: state.create,
        update: state.update,
        setCurrent: state.setCurrent,
      })),
    );

  const {
    currentProject,
    selectedId: selectedFactionId,
    setSelectedId: setSelectedFactionId,
    selectedItem: selectedFaction,
    grouped: groupedFactions,
    handleViewAll,
  } = useEntityManager<FactionLike>({
    store: {
      items,
      currentItem,
      loadAll,
      setCurrent: setCurrent as (item: FactionLike | null) => void,
    },
    uncategorizedKey: "faction.uncategorized",
    t,
  });

  const handleAddFaction = useCallback(async () => {
    if (!currentProject) return;
    const newFac = await create({
      projectId: currentProject.id,
      name: t("faction.defaults.name", "New Faction"),
      description: t("faction.uncategorized", "Uncategorized"),
      attributes: {},
    });
    if (newFac) {
      setSelectedFactionId(newFac.id);
    }
  }, [create, currentProject, setSelectedFactionId, t]);

  return {
    selectedFactionId,
    setSelectedFactionId,
    handleAddFaction,
    handleViewAll,
    groupedFactions,
    selectedFaction,
    updateFaction: update,
  };
}

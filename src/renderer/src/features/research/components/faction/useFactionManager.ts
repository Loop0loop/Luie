import { useState, useEffect, useMemo } from "react";
import { type TFunction } from "i18next";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";

export type FactionLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useFactionManager(t: TFunction) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: factions,
    currentItem: currentFactionFromStore,
    loadAll: loadFactions,
    create: createFaction,
    update: updateFaction,
    setCurrent: setCurrentFaction,
  } = useFactionStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      loadAll: state.loadAll,
      create: state.create,
      update: state.update,
      setCurrent: state.setCurrent,
    })),
  );

  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(
    null,
  );

  // Sync with global store selection
  useEffect(() => {
    if (
      currentFactionFromStore?.id &&
      currentFactionFromStore.id !== selectedFactionId
    ) {
      const syncTimer = window.setTimeout(() => {
        setSelectedFactionId(currentFactionFromStore.id);
      }, 0);
      return () => window.clearTimeout(syncTimer);
    }
    return undefined;
  }, [currentFactionFromStore, selectedFactionId]);

  useEffect(() => {
    if (currentProject) {
      loadFactions(currentProject.id);
    }
  }, [currentProject, loadFactions]);

  useEffect(() => {
    if (!selectedFactionId) {
      return;
    }
    if (
      (factions as FactionLike[]).some((item) => item.id === selectedFactionId)
    ) {
      return;
    }
    const clearTimer = window.setTimeout(() => {
      setSelectedFactionId(null);
    }, 0);
    return () => window.clearTimeout(clearTimer);
  }, [factions, selectedFactionId]);

  const handleAddFaction = async () => {
    if (currentProject) {
      const newFac = await createFaction({
        projectId: currentProject.id,
        name: t("faction.defaults.name", "New Faction"),
        description: t("faction.uncategorized", "Uncategorized"),
        attributes: {},
      });
      if (newFac) {
        setSelectedFactionId(newFac.id);
      }
    }
  };

  const handleViewAll = () => {
    setCurrentFaction(null);
    setSelectedFactionId(null);
  };

  // Grouping Logic
  const groupedFactions = useMemo(() => {
    const groups: Record<string, FactionLike[]> = {};
    const list = factions as FactionLike[];

    list.forEach((fac) => {
      const group =
        fac.description?.trim() || t("faction.uncategorized", "Uncategorized");
      if (!groups[group]) groups[group] = [];
      groups[group].push(fac);
    });

    return groups;
  }, [factions, t]);

  // Selected Faction Data
  const selectedFaction = useMemo(
    () => (factions as FactionLike[]).find((e) => e.id === selectedFactionId),
    [factions, selectedFactionId],
  );

  return {
    selectedFactionId,
    setSelectedFactionId,
    handleAddFaction,
    handleViewAll,
    groupedFactions,
    selectedFaction,
    updateFaction,
  };
}

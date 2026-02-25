import { useState, useEffect, useMemo } from "react";
import { type TFunction } from "i18next";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

export type FactionLike = {
    id: string;
    name: string;
    description?: string | null;
    attributes?: unknown;
};

export function useFactionManager(t: TFunction) {
    const { currentItem: currentProject } = useProjectStore();
    const {
        items: factions,
        currentItem: currentFactionFromStore,
        loadAll: loadFactions,
        create: createFaction,
        update: updateFaction,
    } = useFactionStore();

    const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);

    // Sync with global store selection
    useEffect(() => {
        if (currentFactionFromStore?.id && currentFactionFromStore.id !== selectedFactionId) {
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

    const handleAddFaction = async () => {
        if (currentProject) {
            const newFac = await createFaction({
                projectId: currentProject.id,
                name: t("faction.defaults.name", "New Faction"),
                description: t("faction.uncategorized", "Uncategorized"),
                attributes: {}
            });
            if (newFac) {
                setSelectedFactionId(newFac.id);
            }
        }
    };

    // Grouping Logic
    const groupedFactions = useMemo(() => {
        const groups: Record<string, FactionLike[]> = {};
        const list = factions as FactionLike[];

        list.forEach(fac => {
            const group = fac.description?.trim() || t("faction.uncategorized", "Uncategorized");
            if (!groups[group]) groups[group] = [];
            groups[group].push(fac);
        });

        return groups;
    }, [factions, t]);

    // Selected Faction Data
    const selectedFaction = useMemo(() =>
        (factions as FactionLike[]).find(e => e.id === selectedFactionId),
        [factions, selectedFactionId]
    );

    return {
        selectedFactionId,
        setSelectedFactionId,
        handleAddFaction,
        groupedFactions,
        selectedFaction,
        updateFaction,
    };
}

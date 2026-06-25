import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import FactionDetailView from "@renderer/features/research/components/faction/FactionDetailView";
import { FactionSidebarList } from "@renderer/features/research/components/faction/FactionSidebarList";
import { useFactionManager } from "@renderer/features/research/components/faction/useFactionManager";
import { EntityGallery } from "@renderer/features/research/components/wiki/EntityGallery";
import { EntityManagerShell } from "@renderer/features/research/components/wiki/EntityManagerShell";

export default function FactionManager() {
  const { t } = useTranslation();
  const {
    selectedFactionId,
    setSelectedFactionId,
    handleAddFaction,
    handleViewAll,
    groupedFactions,
    selectedFaction,
  } = useFactionManager(t);

  return (
    <EntityManagerShell
      sidebarFeature="factionSidebar"
      peekGroups={Object.entries(groupedFactions).map(([name, factions]) => ({
        name,
        items: factions.map((faction) => ({
          id: faction.id,
          label: faction.name,
          sublabel: faction.description ?? undefined,
        })),
      }))}
      selectedId={selectedFactionId}
      onSelect={setSelectedFactionId}
      addLabel="세력 추가"
      onAdd={handleAddFaction}
      sidebar={
        <FactionSidebarList
          t={t}
          selectedFactionId={selectedFactionId}
          setSelectedFactionId={setSelectedFactionId}
          onViewAll={handleViewAll}
          handleAddFaction={handleAddFaction}
          groupedFactions={groupedFactions}
        />
      }
    >
      {selectedFaction ? (
        <FactionDetailView
          key={selectedFaction.id}
          factionId={selectedFaction.id}
        />
      ) : (
        <EntityGallery
          groups={groupedFactions}
          onSelect={setSelectedFactionId}
          title={t("faction.galleryTitle", "Faction Overview")}
          noDescriptionLabel={t("faction.noRole", "No Type")}
          icon={Shield}
        />
      )}
    </EntityManagerShell>
  );
}

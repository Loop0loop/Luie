import { type TFunction } from "i18next";

import {
  EntitySidebarList,
  type EntitySidebarGroup,
} from "@renderer/features/research/components/shared/EntitySidebarList";
import type { FactionLike } from "@renderer/features/research/components/faction/useFactionManager";

interface FactionSidebarListProps {
  t: TFunction;
  selectedFactionId: string | null;
  setSelectedFactionId: (id: string | null) => void;
  onViewAll: () => void;
  handleAddFaction: () => void;
  groupedFactions: Record<string, FactionLike[]>;
}

export function FactionSidebarList({
  t,
  selectedFactionId,
  setSelectedFactionId,
  onViewAll,
  handleAddFaction,
  groupedFactions,
}: FactionSidebarListProps) {
  const groups: EntitySidebarGroup[] = Object.entries(groupedFactions).map(
    ([key, facs]) => ({
      key,
      title: key,
      items: facs.map((fac) => ({
        id: fac.id,
        name: fac.name,
        description: fac.description,
      })),
    }),
  );

  return (
    <EntitySidebarList
      title={t("faction.sectionTitle", "Factions")}
      onViewAll={onViewAll}
      viewAllLabel={t("faction.viewAllTitle", "View All")}
      onAdd={handleAddFaction}
      addLabel={t("faction.addTitle", "Add Faction")}
      groups={groups}
      selectedId={selectedFactionId}
      onSelect={setSelectedFactionId}
      emptyDescriptionLabel={t("faction.noRole", "No Type")}
    />
  );
}

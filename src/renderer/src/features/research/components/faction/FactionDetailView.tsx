import { Shield } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { EntityDetailView } from "@renderer/features/research/components/wiki/EntityDetailView";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";

const FACTION_SECTIONS = [
  { id: "overview", labelKey: "overview", fallback: "Overview" },
  { id: "history", labelKey: "history", fallback: "History" },
  { id: "organization", labelKey: "organization", fallback: "Organization" },
  { id: "relationships", labelKey: "relationships", fallback: "Relationships" },
  { id: "notes", labelKey: "notes", fallback: "Notes" },
];

interface FactionDetailViewProps {
  factionId?: string;
}

export default function FactionDetailView({ factionId }: FactionDetailViewProps) {
  const { currentItem, updateFaction, loadFaction } = useFactionStore(
    useShallow((state) => ({
      currentItem: state.currentItem,
      updateFaction: state.updateFaction,
      loadFaction: state.loadFaction,
    })),
  );

  return (
    <EntityDetailView
      entity={currentItem}
      entityId={factionId}
      entityKind="faction"
      icon={<Shield size={80} color="var(--border-active)" />}
      loadEntity={loadFaction}
      updateEntity={updateFaction}
      prefix="faction"
      sections={FACTION_SECTIONS}
      storagePrefix="faction-view-mode"
      noSelectionFallback="No Faction Selected"
      templateFallback="Basic Faction"
    />
  );
}

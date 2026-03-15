import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Shield } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";

type FactionLike = {
  id: string;
  name: string;
  description?: string | null;
};

export default function SidebarFactionList() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: factions,
    loadAll: loadFactions,
    create: createFaction,
  } = useFactionStore(
    useShallow((state) => ({
      items: state.items,
      loadAll: state.loadAll,
      create: state.create,
    })),
  );
  const mainView = useUIStore((state) => state.mainView);
  const setMainView = useUIStore((state) => state.setMainView);
  const selectedFactionId =
    mainView.type === "faction" && mainView.id ? mainView.id : null;

  useEffect(() => {
    if (currentProject) {
      void loadFactions(currentProject.id);
    }
  }, [currentProject, loadFactions]);

  const handleAddFaction = async () => {
    if (!currentProject) return;
    const created = await createFaction({
      projectId: currentProject.id,
      name: t("faction.defaults.name", "New Faction"),
      description: t("faction.uncategorized", "Uncategorized"),
      attributes: {},
    });
    if (created?.id) {
      setMainView({ type: "faction", id: created.id });
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      <div className="flex items-center justify-end px-2 py-1 gap-1 border-b border-border/20">
        <button
          className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => void handleAddFaction()}
          title={t("faction.addTitle", "Add Faction")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {factions.length === 0 && (
          <div className="p-4 text-xs text-muted text-center italic">
            {t("faction.noSelection", "No Faction Selected")}
          </div>
        )}

        {(factions as FactionLike[]).map((faction) => (
          <DraggableItem
            key={faction.id}
            id={`faction-${faction.id}`}
            data={{ type: "faction", id: faction.id, title: faction.name }}
          >
            <div
              className={cn(
                "pl-4 pr-3 py-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors border-l-2 border-transparent",
                selectedFactionId === faction.id &&
                  "bg-accent/10 text-accent border-accent",
              )}
              onClick={() => setMainView({ type: "faction", id: faction.id })}
            >
              <Shield className="w-3.5 h-3.5 opacity-70" />
              <span className="truncate">{faction.name}</span>
            </div>
          </DraggableItem>
        ))}
      </div>
    </div>
  );
}

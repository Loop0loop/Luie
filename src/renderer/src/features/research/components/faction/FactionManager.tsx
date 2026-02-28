import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Shield } from "lucide-react";
import FactionDetailView from "@renderer/features/research/components/faction/FactionDetailView";
import { useTranslation } from "react-i18next";
import { FACTION_GROUP_COLORS } from "@shared/constants";
import { useFactionManager, type FactionLike } from "@renderer/features/research/components/faction/useFactionManager";
import { FactionSidebarList } from "@renderer/features/research/components/faction/FactionSidebarList";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import {
    clampSidebarWidth,
    getSidebarDefaultWidth,
    getSidebarWidthConfig,
    toPercentSize,
    toPxSize,
} from "@shared/constants/sidebarSizing";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";

export default function FactionManager() {
    const { t } = useTranslation();
    const { sidebarWidths, setSidebarWidth } = useUIStore(
        useShallow((state) => ({
            sidebarWidths: state.sidebarWidths,
            setSidebarWidth: state.setSidebarWidth,
        }))
    );
    const sidebarFeature = "factionSidebar" as const;
    const sidebarConfig = getSidebarWidthConfig(sidebarFeature);
    const sidebarWidth = clampSidebarWidth(
        sidebarFeature,
        sidebarWidths[sidebarFeature] || getSidebarDefaultWidth(sidebarFeature),
    );
    const handleSidebarResize = useSidebarResizeCommit(sidebarFeature, setSidebarWidth);

    const {
        selectedFactionId,
        setSelectedFactionId,
        handleAddFaction,
        groupedFactions,
        selectedFaction,
    } = useFactionManager(t);

    return (
        <div className="flex w-full h-full bg-canvas overflow-hidden">
            <PanelGroup
                orientation="horizontal"
                className="h-full! w-full!"
            >
                {/* LEFT SIDEBAR - Faction List */}
                <Panel
                    id="sidebar"
                    defaultSize={toPxSize(sidebarWidth)}
                    minSize={toPxSize(sidebarConfig.minPx)}
                    maxSize={toPxSize(sidebarConfig.maxPx)}
                    onResize={handleSidebarResize}
                    className="bg-sidebar border-r border-border flex flex-col overflow-y-auto"
                >
                    <FactionSidebarList
                        t={t}
                        selectedFactionId={selectedFactionId}
                        setSelectedFactionId={setSelectedFactionId}
                        handleAddFaction={handleAddFaction}
                        groupedFactions={groupedFactions}
                    />
                </Panel>

                {/* Resizer Handle */}
                <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
                </PanelResizeHandle>

                {/* RIGHT MAIN - Wiki View */}
                <Panel id="main" minSize={toPercentSize(40)}>
                    <div className="h-full w-full overflow-hidden flex flex-col">
                        {selectedFaction ? (
                            <FactionDetailView
                                key={selectedFaction.id}
                                factionId={selectedFaction.id}
                            />
                        ) : (
                            <FactionGallery
                                groupedFactions={groupedFactions}
                                onSelect={setSelectedFactionId}
                            />
                        )}
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}

// Sub-component: Gallery View
function FactionGallery({
    groupedFactions,
    onSelect
}: {
    groupedFactions: Record<string, FactionLike[]>;
    onSelect: (id: string) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="border-b-2 border-border mb-6 pb-4">
                <div className="text-2xl font-extrabold text-fg leading-tight">
                    {t("faction.galleryTitle", "Faction Overview")}
                </div>
            </div>

            {Object.entries(groupedFactions).map(([group, factions]) => {
                const themeColor = FACTION_GROUP_COLORS[group] || FACTION_GROUP_COLORS["Uncategorized"];
                return (
                    <div key={group} className="mb-8">
                        <div className="text-lg font-bold mb-4 pb-2 border-b-2 border-border" style={{ borderColor: themeColor, color: themeColor }}>
                            {group}
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
                            {factions.map(faction => (
                                <div
                                    key={faction.id}
                                    className="flex flex-col cursor-pointer hover:bg-surface-hover p-2 rounded transition-colors"
                                    onClick={() => onSelect(faction.id)}
                                >
                                    <div className="w-full h-32 bg-surface flex items-center justify-center border-b border-border mb-2 rounded" style={{ borderColor: themeColor }}>
                                        <Shield size={40} color={themeColor} />
                                    </div>
                                    <div className="font-semibold text-sm mb-0.5">{faction.name}</div>
                                    <div className="text-xs text-subtle">{faction.description || t("faction.noRole", "No Type")}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

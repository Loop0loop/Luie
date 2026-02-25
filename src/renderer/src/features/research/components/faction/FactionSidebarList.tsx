import { useState } from "react";
import { type TFunction } from "i18next";
import { Home, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { FACTION_GROUP_COLORS } from "@shared/constants";
import { cn } from "@shared/types/utils";
import type { FactionLike } from "@renderer/features/research/components/faction/useFactionManager";

interface FactionSidebarListProps {
    t: TFunction;
    selectedFactionId: string | null;
    setSelectedFactionId: (id: string | null) => void;
    handleAddFaction: () => void;
    groupedFactions: Record<string, FactionLike[]>;
}

export function FactionSidebarList({
    t,
    selectedFactionId,
    setSelectedFactionId,
    handleAddFaction,
    groupedFactions,
}: FactionSidebarListProps) {
    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-y-auto">
            <div className="px-4 py-3 bg-(--namu-blue) text-white font-bold flex justify-between items-center shrink-0">
                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => setSelectedFactionId(null)}
                    title={t("faction.viewAllTitle", "View All")}
                >
                    <Home size={18} />
                    <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>
                        {t("faction.sectionTitle", "Factions")}
                    </span>
                </button>

                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => handleAddFaction()}
                    title={t("faction.addTitle", "Add Faction")}
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex flex-col w-full overflow-y-auto">
                {Object.entries(groupedFactions).map(([group, facs]) => (
                    <FactionGroup
                        key={group}
                        t={t}
                        title={group}
                        color={FACTION_GROUP_COLORS[group] || FACTION_GROUP_COLORS["Uncategorized"]}
                        factions={facs}
                        selectedId={selectedFactionId}
                        onSelect={setSelectedFactionId}
                    />
                ))}
            </div>
        </div>
    );
}

function FactionGroup({
    t,
    title,
    color,
    factions,
    selectedId,
    onSelect
}: {
    t: TFunction;
    title: string;
    color: string;
    factions: FactionLike[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div>
            <div
                className="px-4 py-2 text-xs font-bold text-muted bg-surface border-b border-border cursor-pointer flex items-center gap-2 select-none"
                onClick={() => setIsOpen(!isOpen)}
                style={{ borderLeft: `4px solid ${color}` }}
            >
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>{title} ({factions.length})</span>
            </div>

            {isOpen && (
                <div className="flex flex-col">
                    {factions.map(fac => (
                        <div
                            key={fac.id}
                            className={cn(
                                "px-4 py-2.5 border-b border-border cursor-pointer text-sm text-fg flex flex-col transition-colors hover:bg-surface-hover",
                                selectedId === fac.id && "bg-(--namu-hover-bg) border-l-[3px] text-(--namu-blue)"
                            )}
                            onClick={() => onSelect(fac.id)}
                            style={selectedId === fac.id ? { borderLeftColor: color } : {}}
                        >
                            <span className="font-semibold mb-0.5">{fac.name}</span>
                            <span className="text-[11px] text-subtle">{fac.description || t("faction.noRole", "No Type")}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

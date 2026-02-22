import { useState } from "react";
import { type TFunction } from "i18next";
import { Home, Plus, LayoutTemplate, ChevronDown, ChevronRight } from "lucide-react";
import { CHARACTER_TEMPLATES, CHARACTER_GROUP_COLORS } from "../../../../../shared/constants";
import { cn } from "../../../../../shared/types/utils";
import { Modal } from "../../common/Modal";
import type { CharacterLike } from "./useCharacterManager";

interface CharacterSidebarListProps {
    t: TFunction;
    selectedCharacterId: string | null;
    setSelectedCharacterId: (id: string | null) => void;
    isTemplateModalOpen: boolean;
    setIsTemplateModalOpen: (val: boolean) => void;
    handleAddCharacter: (templateId: string) => void;
    groupedCharacters: Record<string, CharacterLike[]>;
}

export function CharacterSidebarList({
    t,
    selectedCharacterId,
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    groupedCharacters,
}: CharacterSidebarListProps) {
    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-y-auto">
            <div className="px-4 py-3 bg-(--namu-blue) text-white font-bold flex justify-between items-center shrink-0">
                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => setSelectedCharacterId(null)}
                    title={t("character.viewAllTitle")}
                >
                    <Home size={18} />
                    <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>{t("character.sectionTitle")}</span>
                </button>

                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => setIsTemplateModalOpen(true)}
                    title={t("character.addTitle")}
                >
                    <Plus size={18} />
                </button>
            </div>

            <Modal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                title={t("character.templateTitle")}
                width="500px"
            >
                <div className="grid grid-cols-2 gap-4 p-4">
                    {CHARACTER_TEMPLATES.map((template) => (
                        <div
                            key={template.id}
                            className="flex flex-col items-center justify-center p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors gap-2"
                            onClick={() => handleAddCharacter(template.id)}
                        >
                            <div className="p-3 bg-surface rounded-full shadow-sm">
                                <LayoutTemplate size={24} />
                            </div>
                            <div className="font-semibold text-sm">{t(template.nameKey)}</div>
                        </div>
                    ))}
                </div>
            </Modal>

            <div className="flex flex-col w-full overflow-y-auto">
                {Object.entries(groupedCharacters).map(([group, chars]) => (
                    <CharacterGroup
                        key={group}
                        t={t}
                        title={group}
                        color={CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"]}
                        characters={chars}
                        selectedId={selectedCharacterId}
                        onSelect={setSelectedCharacterId}
                    />
                ))}
            </div>
        </div>
    );
}

function CharacterGroup({
    t,
    title,
    color,
    characters,
    selectedId,
    onSelect
}: {
    t: TFunction;
    title: string;
    color: string;
    characters: CharacterLike[];
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
                <span>{title} ({characters.length})</span>
            </div>

            {isOpen && (
                <div className="flex flex-col">
                    {characters.map(char => (
                        <div
                            key={char.id}
                            className={cn(
                                "px-4 py-2.5 border-b border-border cursor-pointer text-sm text-fg flex flex-col transition-colors hover:bg-surface-hover",
                                selectedId === char.id && "bg-(--namu-hover-bg) border-l-[3px] text-(--namu-blue)"
                            )}
                            onClick={() => onSelect(char.id)}
                            style={selectedId === char.id ? { borderLeftColor: color } : {}}
                        >
                            <span className="font-semibold mb-0.5">{char.name}</span>
                            <span className="text-[11px] text-subtle">{char.description || t("character.noRole")}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

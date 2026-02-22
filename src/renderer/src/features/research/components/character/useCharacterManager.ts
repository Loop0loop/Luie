import { useState, useEffect, useMemo } from "react";
import { type TFunction } from "i18next";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { CHARACTER_TEMPLATES } from "@shared/constants";

export type CharacterLike = {
    id: string;
    name: string;
    description?: string | null;
    attributes?: unknown;
};

export function useCharacterManager(t: TFunction) {
    const { currentItem: currentProject } = useProjectStore();
    const {
        items: characters,
        currentItem: currentCharacterFromStore,
        loadAll: loadCharacters,
        create: createCharacter,
        update: updateCharacter,
    } = useCharacterStore();

    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    // Sync with global store selection (e.g. from SmartLinkService)
    useEffect(() => {
        if (currentCharacterFromStore?.id && currentCharacterFromStore.id !== selectedCharacterId) {
            const syncTimer = window.setTimeout(() => {
                setSelectedCharacterId(currentCharacterFromStore.id);
            }, 0);
            return () => window.clearTimeout(syncTimer);
        }
        return undefined;
    }, [currentCharacterFromStore, selectedCharacterId]);

    useEffect(() => {
        if (currentProject) {
            loadCharacters(currentProject.id);
        }
    }, [currentProject, loadCharacters]);

    const handleAddCharacter = async (templateId: string = "basic") => {
        if (currentProject) {
            const template = CHARACTER_TEMPLATES.find((t) => t.id === templateId) || CHARACTER_TEMPLATES[0];

            const newChar = await createCharacter({
                projectId: currentProject.id,
                name: t("character.defaults.name"),
                description: t("character.uncategorized"),
                attributes: { templateId: template.id } as Record<string, unknown>
            });
            if (newChar) {
                setSelectedCharacterId(newChar.id);
                setIsTemplateModalOpen(false);
            }
        }
    };

    // Grouping Logic
    const groupedCharacters = useMemo(() => {
        const groups: Record<string, CharacterLike[]> = {};
        const list = characters as CharacterLike[];

        list.forEach(char => {
            const group = char.description?.trim() || t("character.uncategorized");
            if (!groups[group]) groups[group] = [];
            groups[group].push(char);
        });

        return groups;
    }, [characters, t]);

    // Selected Character Data
    const selectedChar = useMemo(() =>
        (characters as CharacterLike[]).find(c => c.id === selectedCharacterId),
        [characters, selectedCharacterId]
    );

    return {
        selectedCharacterId,
        setSelectedCharacterId,
        isTemplateModalOpen,
        setIsTemplateModalOpen,
        handleAddCharacter,
        groupedCharacters,
        selectedChar,
        updateCharacter,
    };
}

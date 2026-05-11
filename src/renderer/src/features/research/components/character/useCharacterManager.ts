import { useState, useCallback } from "react";
import { type TFunction } from "i18next";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { CHARACTER_TEMPLATES } from "@shared/constants";
import { useShallow } from "zustand/react/shallow";
import { useEntityManager } from "@renderer/features/research/hooks/useEntityManager";

export type CharacterLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useCharacterManager(t: TFunction) {
  const { items, currentItem, loadAll, create, update, setCurrent } =
    useCharacterStore(
      useShallow((state) => ({
        items: state.items as CharacterLike[],
        currentItem: state.currentItem,
        loadAll: state.loadAll,
        create: state.create,
        update: state.update,
        setCurrent: state.setCurrent,
      })),
    );

  const {
    currentProject,
    selectedId: selectedCharacterId,
    setSelectedId: setSelectedCharacterId,
    selectedItem: selectedChar,
    grouped: groupedCharacters,
    handleViewAll,
  } = useEntityManager<CharacterLike>({
    store: {
      items,
      currentItem,
      loadAll,
      // setCurrent은 handleViewAll 내부에서 null만 전달하므로 캐스팅 안전
      setCurrent: setCurrent as (item: CharacterLike | null) => void,
    },
    uncategorizedKey: "character.uncategorized",
    t,
  });

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleAddCharacter = useCallback(
    async (templateId = "basic") => {
      if (!currentProject) return;
      const template =
        CHARACTER_TEMPLATES.find((tmpl) => tmpl.id === templateId) ??
        CHARACTER_TEMPLATES[0];
      const newChar = await create({
        projectId: currentProject.id,
        name: t("character.defaults.name"),
        description: t("character.uncategorized"),
        attributes: { templateId: template.id } as Record<string, unknown>,
      });
      if (newChar) {
        setSelectedCharacterId(newChar.id);
        setIsTemplateModalOpen(false);
      }
    },
    [create, currentProject, setSelectedCharacterId, t],
  );

  return {
    selectedCharacterId,
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    handleViewAll,
    groupedCharacters,
    selectedChar,
    updateCharacter: update,
  };
}

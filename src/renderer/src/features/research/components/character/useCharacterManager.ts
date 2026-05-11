import { useState, useEffect, useRef, useMemo } from "react";
import { type TFunction } from "i18next";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { CHARACTER_TEMPLATES } from "@shared/constants";
import { useShallow } from "zustand/react/shallow";

export type CharacterLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useCharacterManager(t: TFunction) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: characters,
    currentItem: currentCharacterFromStore,
    loadAll: loadCharacters,
    create: createCharacter,
    update: updateCharacter,
    setCurrent: setCurrentCharacter,
  } = useCharacterStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      loadAll: state.loadAll,
      create: state.create,
      update: state.update,
      setCurrent: state.setCurrent,
    })),
  );

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // ref로 현재 로컬 선택값을 추적 — sync effect가 로컬 클릭에 반응하지 않도록
  const selectedCharacterIdRef = useRef(selectedCharacterId);
  useEffect(() => {
    selectedCharacterIdRef.current = selectedCharacterId;
  }, [selectedCharacterId]);

  // Sync with global store selection (e.g. from SmartLinkService)
  // selectedCharacterId를 deps에서 제거: store가 바뀔 때만 실행
  useEffect(() => {
    if (
      currentCharacterFromStore?.id &&
      currentCharacterFromStore.id !== selectedCharacterIdRef.current
    ) {
      setSelectedCharacterId(currentCharacterFromStore.id);
    }
  }, [currentCharacterFromStore]);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
    }
  }, [currentProject, loadCharacters]);

  useEffect(() => {
    if (!selectedCharacterId) {
      return;
    }
    if (
      (characters as CharacterLike[]).some(
        (item) => item.id === selectedCharacterId,
      )
    ) {
      return;
    }
    const clearTimer = window.setTimeout(() => {
      setSelectedCharacterId(null);
    }, 0);
    return () => window.clearTimeout(clearTimer);
  }, [characters, selectedCharacterId]);

  const handleAddCharacter = async (templateId: string = "basic") => {
    if (currentProject) {
      const template =
        CHARACTER_TEMPLATES.find((t) => t.id === templateId) ||
        CHARACTER_TEMPLATES[0];

      const newChar = await createCharacter({
        projectId: currentProject.id,
        name: t("character.defaults.name"),
        description: t("character.uncategorized"),
        attributes: { templateId: template.id } as Record<string, unknown>,
      });
      if (newChar) {
        setSelectedCharacterId(newChar.id);
        setIsTemplateModalOpen(false);
      }
    }
  };

  const handleViewAll = () => {
    setCurrentCharacter(null);
    setSelectedCharacterId(null);
  };

  // Grouping Logic
  const groupedCharacters = useMemo(() => {
    const groups: Record<string, CharacterLike[]> = {};
    const list = characters as CharacterLike[];

    list.forEach((char) => {
      const group = char.description?.trim() || t("character.uncategorized");
      if (!groups[group]) groups[group] = [];
      groups[group].push(char);
    });

    return groups;
  }, [characters, t]);

  // Selected Character Data
  const selectedChar = useMemo(
    () =>
      (characters as CharacterLike[]).find((c) => c.id === selectedCharacterId),
    [characters, selectedCharacterId],
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
    updateCharacter,
  };
}

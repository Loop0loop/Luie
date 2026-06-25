import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import { CharacterSidebarList } from "@renderer/features/research/components/character/CharacterSidebarList";
import { useCharacterManager } from "@renderer/features/research/components/character/useCharacterManager";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { EntityGallery } from "@renderer/features/research/components/wiki/EntityGallery";
import { EntityManagerShell } from "@renderer/features/research/components/wiki/EntityManagerShell";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

export default function CharacterManager() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const {
    selectedCharacterId,
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    handleViewAll,
    groupedCharacters,
    selectedChar,
  } = useCharacterManager(t);

  const allTerms = useTermStore((state) => state.terms);
  const projectTerms = allTerms.filter(
    (term) => term.projectId === currentProjectId,
  );

  const peekGroups = [
    ...Object.entries(groupedCharacters).map(([name, chars]) => ({
      name,
      items: chars.map((char) => ({
        id: char.id,
        label: char.name,
        sublabel: char.description ?? undefined,
      })),
    })),
    ...(projectTerms.length > 0
      ? [
          {
            name: t("world.term.label", "고유명사"),
            items: projectTerms.map((term) => ({
              id: term.id,
              label: term.term,
              sublabel: term.definition ?? undefined,
            })),
          },
        ]
      : []),
  ];

  return (
    <EntityManagerShell
      sidebarFeature="characterSidebar"
      peekGroups={peekGroups}
      selectedId={selectedCharacterId}
      onSelect={setSelectedCharacterId}
      addLabel="캐릭터 추가"
      onAdd={handleAddCharacter}
      sidebar={
        <CharacterSidebarList
          t={t}
          selectedCharacterId={selectedCharacterId}
          setSelectedCharacterId={setSelectedCharacterId}
          onViewAll={handleViewAll}
          isTemplateModalOpen={isTemplateModalOpen}
          setIsTemplateModalOpen={setIsTemplateModalOpen}
          handleAddCharacter={handleAddCharacter}
          groupedCharacters={groupedCharacters}
        />
      }
    >
      {selectedChar ? (
        <WikiDetailView key={selectedChar.id} characterId={selectedChar.id} />
      ) : (
        <EntityGallery
          groups={groupedCharacters}
          onSelect={setSelectedCharacterId}
          title={t("character.galleryTitle")}
          noDescriptionLabel={t("character.noRole")}
          icon={User}
        />
      )}
    </EntityManagerShell>
  );
}

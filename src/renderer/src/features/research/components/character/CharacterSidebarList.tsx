import { type TFunction } from "i18next";
import { LayoutTemplate } from "lucide-react";

import { CHARACTER_TEMPLATES } from "../../constants/characterTemplates";
import { Modal } from "@shared/ui/Modal";
import {
  EntitySidebarList,
  type EntitySidebarGroup,
} from "@renderer/features/research/components/shared/EntitySidebarList";
import type { CharacterLike } from "@renderer/features/research/components/character/useCharacterManager";

interface CharacterSidebarListProps {
  t: TFunction;
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
  onViewAll: () => void;
  isTemplateModalOpen: boolean;
  setIsTemplateModalOpen: (val: boolean) => void;
  handleAddCharacter: (templateId: string) => void;
  groupedCharacters: Record<string, CharacterLike[]>;
}

export function CharacterSidebarList({
  t,
  selectedCharacterId,
  setSelectedCharacterId,
  onViewAll,
  isTemplateModalOpen,
  setIsTemplateModalOpen,
  handleAddCharacter,
  groupedCharacters,
}: CharacterSidebarListProps) {
  const groups: EntitySidebarGroup[] = Object.entries(groupedCharacters).map(
    ([key, chars]) => ({
      key,
      title: key,
      items: chars.map((char) => ({
        id: char.id,
        name: char.name,
        description: char.description,
      })),
    }),
  );

  return (
    <>
      <EntitySidebarList
        title={t("character.sectionTitle")}
        onViewAll={onViewAll}
        viewAllLabel={t("character.viewAllTitle")}
        onAdd={() => setIsTemplateModalOpen(true)}
        addLabel={t("character.addTitle")}
        groups={groups}
        selectedId={selectedCharacterId}
        onSelect={setSelectedCharacterId}
        emptyDescriptionLabel={t("character.noRole")}
      />

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={t("character.templateTitle")}
        width="500px"
      >
        <div className="grid grid-cols-2 gap-4 p-4">
          {CHARACTER_TEMPLATES.map((template) => (
            <button
              type="button"
              key={template.id}
              className="flex flex-col items-center justify-center p-4 border border-border rounded-panel cursor-pointer hover:bg-surface-hover transition-colors gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => handleAddCharacter(template.id)}
            >
              <div className="p-3 bg-surface rounded-full shadow-sm">
                <LayoutTemplate size={24} aria-hidden="true" />
              </div>
              <div className="font-semibold text-sm">{t(template.nameKey)}</div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

import { LayoutTemplate, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import { useCharacterManager } from "@renderer/features/research/components/character/useCharacterManager";
import {
  EntityGallery,
  type EntityGallerySortMode,
  type EntityGalleryViewMode,
} from "@renderer/features/research/components/wiki/EntityGallery";
import { CHARACTER_TEMPLATES } from "@renderer/features/research/constants/characterTemplates";
import { Modal } from "@shared/ui/Modal";

type CharacterManagerProps = {
  query?: string;
  onQueryChange?: (query: string) => void;
  viewMode?: EntityGalleryViewMode;
  onViewModeChange?: (viewMode: EntityGalleryViewMode) => void;
  sortMode?: EntityGallerySortMode;
  onSortModeChange?: (sortMode: EntityGallerySortMode) => void;
};

export default function CharacterManager({
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
}: CharacterManagerProps) {
  const { t } = useTranslation();
  const {
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    handleViewAll,
    groupedCharacters,
    selectedChar,
  } = useCharacterManager(t);

  return (
    <>
      {selectedChar ? (
        <WikiDetailView
          key={selectedChar.id}
          characterId={selectedChar.id}
          onBack={handleViewAll}
        />
      ) : (
        <EntityGallery
          groups={groupedCharacters}
          onSelect={setSelectedCharacterId}
          title={t("character.galleryTitle")}
          noDescriptionLabel={t("character.noRole")}
          icon={User}
          onAdd={() => setIsTemplateModalOpen(true)}
          query={query}
          onQueryChange={onQueryChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
        />
      )}
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
              className="flex flex-col items-center justify-center gap-2 rounded-panel border border-border p-4 text-sm font-semibold transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => handleAddCharacter(template.id)}
            >
              <LayoutTemplate className="icon-md text-muted" aria-hidden="true" />
              {t(template.nameKey)}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

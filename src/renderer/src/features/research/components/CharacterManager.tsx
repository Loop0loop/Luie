import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { User } from "lucide-react";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import { useTranslation } from "react-i18next";
import { CHARACTER_GROUP_COLORS } from "@shared/constants";
import { useCharacterManager, type CharacterLike } from "@renderer/features/research/components/character/useCharacterManager";
import { CharacterSidebarList } from "@renderer/features/research/components/character/CharacterSidebarList";
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

export default function CharacterManager() {
  const { t } = useTranslation();
  const { sidebarWidths, setSidebarWidth } = useUIStore(
    useShallow((state) => ({
      sidebarWidths: state.sidebarWidths,
      setSidebarWidth: state.setSidebarWidth,
    }))
  );
  const sidebarFeature = "characterSidebar" as const;
  const sidebarConfig = getSidebarWidthConfig(sidebarFeature);
  const sidebarWidth = clampSidebarWidth(
    sidebarFeature,
    sidebarWidths[sidebarFeature] || getSidebarDefaultWidth(sidebarFeature),
  );
  const handleSidebarResize = useSidebarResizeCommit(sidebarFeature, setSidebarWidth);

  const {
    selectedCharacterId,
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    groupedCharacters,
    selectedChar,
  } = useCharacterManager(t);

  return (
    <div className="flex w-full h-full bg-canvas overflow-hidden">
      <PanelGroup
        orientation="horizontal"
        className="h-full! w-full!"
      >
        {/* LEFT SIDEBAR - Character List */}
        <Panel
          id="sidebar"
          defaultSize={toPxSize(sidebarWidth)}
          minSize={toPxSize(sidebarConfig.minPx)}
          maxSize={toPxSize(sidebarConfig.maxPx)}
          onResize={handleSidebarResize}
          className="bg-sidebar border-r border-border flex flex-col overflow-y-auto"
        >
          <CharacterSidebarList
            t={t}
            selectedCharacterId={selectedCharacterId}
            setSelectedCharacterId={setSelectedCharacterId}
            isTemplateModalOpen={isTemplateModalOpen}
            setIsTemplateModalOpen={setIsTemplateModalOpen}
            handleAddCharacter={handleAddCharacter}
            groupedCharacters={groupedCharacters}
          />
        </Panel>

        {/* Resizer Handle */}
        <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
        </PanelResizeHandle>

        {/* RIGHT MAIN - Wiki View */}
        <Panel id="main" minSize={toPercentSize(40)}>
          <div className="h-full w-full overflow-hidden flex flex-col">
            {selectedChar ? (
              <WikiDetailView
                key={selectedChar.id} // Force re-mount when switching char to avoid stale state
                characterId={selectedChar.id}
              />
            ) : (
              <CharacterGallery
                groupedCharacters={groupedCharacters}
                onSelect={setSelectedCharacterId}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

// Sub-component: Gallery View
function CharacterGallery({
  groupedCharacters,
  onSelect
}: {
  groupedCharacters: Record<string, CharacterLike[]>;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="border-b-2 border-border mb-6 pb-4">
        <div className="text-2xl font-extrabold text-fg leading-tight">
          {t("character.galleryTitle")}
        </div>
      </div>

      {Object.entries(groupedCharacters).map(([group, chars]) => {
        const themeColor = CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"];
        return (
          <div key={group} className="mb-8">
            <div className="text-lg font-bold mb-4 pb-2 border-b-2 border-border" style={{ borderColor: themeColor, color: themeColor }}>
              {group}
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {chars.map(char => (
                <div
                  key={char.id}
                  className="flex flex-col cursor-pointer hover:bg-surface-hover p-2 rounded transition-colors"
                  onClick={() => onSelect(char.id)}
                >
                  <div className="w-full h-32 bg-surface flex items-center justify-center border-b border-border mb-2 rounded" style={{ borderColor: themeColor }}>
                    <User size={40} color={themeColor} />
                  </div>
                  <div className="font-semibold text-sm mb-0.5">{char.name}</div>
                  <div className="text-xs text-subtle">{char.description || t("character.noRole")}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

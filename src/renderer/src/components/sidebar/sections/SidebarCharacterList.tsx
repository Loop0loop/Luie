import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ChevronDown, ChevronRight, LayoutTemplate, User } from "lucide-react";
import { useCharacterStore } from "../../../stores/characterStore";
import { useProjectStore } from "../../../stores/projectStore";
import { useUIStore } from "../../../stores/uiStore";
import { cn } from "../../../../../shared/types/utils";
import { CHARACTER_GROUP_COLORS, CHARACTER_TEMPLATES } from "../../../../../shared/constants";
import { Modal } from "../../common/Modal";

interface SidebarCharacterListProps {
  onSelectCharacter?: (id: string) => void;
}

type CharacterLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export default function SidebarCharacterList({ onSelectCharacter }: SidebarCharacterListProps) {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const {
    items: characters,
    currentItem: currentCharacterFromStore,
    loadAll: loadCharacters,
    create: createCharacter,
    setCurrentCharacter
  } = useCharacterStore();
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  useEffect(() => {
    if (currentCharacterFromStore?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync selection
      setSelectedCharacterId(currentCharacterFromStore.id);
    }
  }, [currentCharacterFromStore]);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
    }
  }, [currentProject, loadCharacters]);

  const handleSelect = (id: string) => {
    setSelectedCharacterId(id);
    const char = characters.find((c) => c.id === id);
    if (char) setCurrentCharacter(char);
    useUIStore.getState().setMainView({ type: "character", id });
    onSelectCharacter?.(id);
  };

  const handleAddCharacter = async (templateId: string = "basic") => {
    if (currentProject) {
      const template = CHARACTER_TEMPLATES.find((t) => t.id === templateId) || CHARACTER_TEMPLATES[0];
      
      await createCharacter({
        projectId: currentProject.id,
        name: t("character.defaults.name"),
        description: t("character.uncategorized"),
        attributes: { templateId: template.id } as Record<string, unknown> 
      });
      // createCharacter returns Promise<void> in interface but might return object in implementation?
      // Actually checking store definition: 
      // createCharacter: async (input) => { await crudSlice.create(input); }
      // crudSlice.create usually updates state but might not return the item.
      // We rely on store update.
      setIsTemplateModalOpen(false);
    }
  };

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

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
        <div className="flex items-center justify-end px-2 py-1 gap-1 border-b border-border/20">
             <button 
                className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsTemplateModalOpen(true)}
                title={t("character.addTitle")}
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
             {Object.entries(groupedCharacters).map(([group, chars]) => (
                <CharacterGroup 
                  key={group} 
                  title={group} 
                  color={CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"]}
                  characters={chars}
                  selectedId={selectedCharacterId}
                  onSelect={handleSelect}
                />
              ))}
              
              {characters.length === 0 && (
                  <div className="p-4 text-xs text-muted text-center italic">
                      {t("character.noCharacters")}
                  </div>
              )}
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
    </div>
  );
}

function CharacterGroup({ 
  title, 
  color, 
  characters, 
  selectedId, 
  onSelect 
}: { 
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
        className="px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none transition-colors" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{title}</span>
        <span className="ml-auto text-[10px] opacity-70">{characters.length}</span>
      </div>
      
      {isOpen && (
        <div className="flex flex-col">
          {characters.map(char => (
            <div 
              key={char.id}
              className={cn(
                  "pl-8 pr-3 py-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors border-l-2 border-transparent",
                  selectedId === char.id && "bg-accent/10 text-accent border-accent"
              )}
              onClick={() => onSelect(char.id)}
            >
              <User className="w-3.5 h-3.5 opacity-70" />
              <span className="truncate">{char.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

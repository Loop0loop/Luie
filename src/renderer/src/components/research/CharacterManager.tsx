import { useEffect, useState, useMemo } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { Layout } from "react-resizable-panels";
import { Plus, User, ChevronDown, ChevronRight, Home, LayoutTemplate } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { BufferedInput } from "../common/BufferedInput";
import { Modal } from "../common/Modal"; 
import { Infobox } from "./wiki/Infobox"; 
import { WikiSection } from "./wiki/WikiSection"; 
import { cn } from "../../../../shared/types/utils";
import { useTranslation } from "react-i18next";
import { useShortcutCommand } from "../../hooks/useShortcutCommand";
import { i18n, SUPPORTED_LANGUAGES } from "../../i18n";
import {
  CHARACTER_GROUP_COLORS,
  CHARACTER_TEMPLATES,
} from "../../../../shared/constants";

type CharacterLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export default function CharacterManager() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const {
    items: characters,
    currentItem: currentCharacterFromStore,
    loadAll: loadCharacters,
    create: createCharacter,
    update: updateCharacter
  } = useCharacterStore();
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Sync with global store selection (e.g. from SmartLinkService)
  useEffect(() => {
    if (currentCharacterFromStore?.id && currentCharacterFromStore.id !== selectedCharacterId) {
        // eslint-disable-next-line
        setSelectedCharacterId(currentCharacterFromStore.id);
    }
  }, [currentCharacterFromStore, selectedCharacterId]);

  const handleLayoutChange = (layout: Layout) => {
    localStorage.setItem("character-sidebar-layout-v2", JSON.stringify(layout));
  };
  
  const initialLayout = useMemo(() => {
     const saved = localStorage.getItem("character-sidebar-layout-v2");
     if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // ignore
        }
     }
     return undefined;
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
    }
  }, [currentProject, loadCharacters]);

  useShortcutCommand((command) => {
    if (command.type === "character.openTemplate") {
      setIsTemplateModalOpen(true);
    }
  });

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

  return (
    <div className="flex w-full h-full bg-canvas overflow-hidden">
      <PanelGroup 
        orientation="horizontal" 
        onLayoutChanged={handleLayoutChange} 
        defaultLayout={initialLayout} 
        className="h-full! w-full!"
      >
        {/* LEFT SIDEBAR - Character List */}
        <Panel 
           id="sidebar"
           defaultSize={240} 
           minSize={150}     
           maxSize={500}     
           className="bg-sidebar border-r border-border flex flex-col overflow-y-auto"
        >
          <div className="flex flex-col h-full"> {/* Inner container for flex-col flow */}
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

            {/* Iterate Groups */}
            <div className="flex flex-col w-full overflow-y-auto">
              {Object.entries(groupedCharacters).map(([group, chars]) => (
                <CharacterGroup 
                  key={group} 
                  title={group} 
                  color={CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"]}
                  characters={chars}
                  selectedId={selectedCharacterId}
                  onSelect={setSelectedCharacterId}
                />
              ))}
            </div>
          </div>
        </Panel>

        {/* Resizer Handle */}
          <PanelResizeHandle className="w-1 -ml-0.5 bg-transparent hover:bg-primary/50 active:bg-primary z-50 transition-colors flex items-center justify-center group cursor-col-resize focus:outline-none relative">
            <div className="w-0.5 h-full bg-transparent group-hover:bg-primary/20" />
        </PanelResizeHandle>

        {/* RIGHT MAIN - Wiki View */}
        <Panel id="main" minSize={300}>
           <div className="h-full w-full overflow-hidden flex flex-col">
            {selectedChar ? (
              <WikiDetailView 
                key={selectedChar.id} // Force re-mount when switching char to avoid stale state
                character={selectedChar} 
                updateCharacter={updateCharacter}
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

// Sub-component: Character Group in Sidebar
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
  const { t } = useTranslation();
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

// Types for Dynamic Customization
type WikiSectionData = {
  id: string;
  label: string;
};

type CustomField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

// Sub-component: Main Wiki View
function WikiDetailView({ 
  character, 
  updateCharacter 
}: { 
  character: CharacterLike; 
  updateCharacter: (input: { id: string; [key: string]: unknown }) => void; 
}) {
  const { t } = useTranslation();
  const attributes = useMemo(() => 
    typeof character.attributes === "string" 
      ? JSON.parse(character.attributes) 
      : (character.attributes || {}),
  [character.attributes]);
  
  const currentTemplate = useMemo(() => {
    const templateId = attributes.templateId || "basic";
    return CHARACTER_TEMPLATES.find(t => t.id === templateId) || CHARACTER_TEMPLATES[0];
  }, [attributes.templateId]);

  const defaultSectionLabels = useMemo(() => {
    return t("character.defaultSections", { returnObjects: true }) as string[];
  }, [t]);

  const defaultLabelById = useMemo(() => {
    return {
      overview: defaultSectionLabels[0],
      appearance: defaultSectionLabels[1],
      personality: defaultSectionLabels[2],
      background: defaultSectionLabels[3],
      relations: defaultSectionLabels[4],
      notes: defaultSectionLabels[5],
    } as Record<string, string | undefined>;
  }, [defaultSectionLabels]);

  const defaultLabelSet = useMemo(() => {
    const labels = new Set<string>();
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const bundle = i18n.getResourceBundle(lang, "common") as {
        character?: { defaultSections?: string[] };
      } | undefined;
      bundle?.character?.defaultSections?.forEach((label) => labels.add(label));
    });
    return labels;
  }, []);
  
  const sections: WikiSectionData[] = useMemo(() => {
    if (attributes.sections) {
      return (attributes.sections as WikiSectionData[]).map((section) => {
        const defaultLabel = defaultLabelById[section.id];
        if (!defaultLabel) return section;
        if (!defaultLabelSet.has(section.label)) return section;
        return { ...section, label: defaultLabel };
      });
    }
    return [
      { id: "overview", label: defaultSectionLabels[0] ?? "1" },
      { id: "appearance", label: defaultSectionLabels[1] ?? "2" },
      { id: "personality", label: defaultSectionLabels[2] ?? "3" },
      { id: "background", label: defaultSectionLabels[3] ?? "4" },
      { id: "relations", label: defaultSectionLabels[4] ?? "5" },
      { id: "notes", label: defaultSectionLabels[5] ?? "6" },
    ];
  }, [attributes.sections, defaultLabelById, defaultLabelSet, defaultSectionLabels]);

  const customFields: CustomField[] = useMemo(() => {
    return attributes.customFields || [];
  }, [attributes.customFields]);

  const handleUpdate = (field: string, value: string) => {
    updateCharacter({ id: character.id, [field]: value });
  };

  const handleAttrUpdate = (key: string, value: unknown) => {
    const newAttrs = { ...attributes, [key]: value };
    updateCharacter({ id: character.id, attributes: newAttrs });
  };

  // Section Management
  const addSection = () => {
    const newId = `section_${Date.now()}`;
    const newSections = [
      ...sections,
      { id: newId, label: `${sections.length + 1}. ${t("character.newSection")}` },
    ];
    handleAttrUpdate("sections", newSections);
  };
  
  const renameSection = (id: string, newLabel: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, label: newLabel } : s);
    handleAttrUpdate("sections", newSections);
  };

  const deleteSection = (id: string) => {
    if (confirm(t("character.deleteSectionConfirm"))) {
       const newSections = sections.filter(s => s.id !== id);
       handleAttrUpdate("sections", newSections);
    }
  };

  // Custom Field Management
  const addCustomField = () => {
    const newKey = `custom_${Date.now()}`;
    const newField: CustomField = {
      key: newKey,
      label: t("character.newFieldLabel"),
      type: "text"
    };
    const newFields = [...customFields, newField];
    handleAttrUpdate("customFields", newFields);
  };

  const updateCustomFieldLabel = (key: string, newLabel: string) => {
    const newFields = customFields.map(f => f.key === key ? { ...f, label: newLabel } : f);
    handleAttrUpdate("customFields", newFields);
  };

  const deleteCustomField = (key: string) => {
    if (confirm(t("character.deleteFieldConfirm"))) {
      const newFields = customFields.filter(f => f.key !== key);
      handleAttrUpdate("customFields", newFields);
    }
  };

  // Merge Base Fields + Custom Fields
  const allInfoboxFields = [
    ...currentTemplate.fields,
    ...customFields
  ];

  return (
    <div className="flex-1 overflow-auto p-8 sm:p-6 flex flex-col gap-6 bg-panel text-fg min-w-0">
      {/* 1. AUTHENTIC NAMUWIKI HEADER */}
      <div className="border-b-2 border-(--namu-border) pb-4 mb-6 flex flex-col gap-3">
        <BufferedInput 
          className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent w-full focus:outline-none"
          value={character.name} 
          onSave={(val) => handleUpdate("name", val)}
        />
        <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
          <span className="font-bold">{t("character.classificationLabel")}</span>
          <span className="text-(--namu-link) cursor-pointer hover:underline">{t(currentTemplate.nameKey)}</span>
           <span className="text-border">|</span>
          <BufferedInput 
              className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm" 
              value={character.description || ""}
              placeholder={t("character.uncategorized")}
              onSave={(val) => handleUpdate("description", val)} 
           />
        </div>
      </div>

      {/* 2. BODY CONTENT (Wiki Layout) */}
      <div className="@container">
        <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
          {/* LEFT: Content & TOC */}
          <div className="flex-1 flex flex-col gap-8 min-w-75 w-full @min-[700px]:order-1 order-2">
          
          {/* TOC (Inline) */}
          <div className="bg-(--namu-table-bg) border border-(--namu-border) p-4 inline-block min-w-50 rounded">
            <div className="font-bold text-center mb-3 text-fg text-sm">{t("character.tocLabel")}</div>
            <div className="flex flex-col gap-1.5 text-sm">
               {sections.map(sec => (
                 <a key={sec.id} className="text-(--namu-link) no-underline cursor-pointer hover:underline" href={`#${sec.id}`}>
                   {sec.label}
                 </a>
               ))}
            </div>
          </div>

          {/* Sections */}
          {sections.map(sec => (
            <WikiSection 
                key={sec.id}
                id={sec.id}
                label={sec.label}
                content={attributes[sec.id]}
                onRename={(val) => renameSection(sec.id, val)}
                onUpdateContent={(val) => handleAttrUpdate(sec.id, val)}
                onDelete={() => deleteSection(sec.id)}
            />
          ))}

          {/* Add Section Button */}
          <button 
             type="button"
             onClick={addSection}
             className="p-3 border-2 border-dashed border-border rounded-lg text-center text-subtle cursor-pointer mt-4 w-full bg-transparent hover:text-fg hover:border-fg transition-colors"
          >
             {t("character.addSection")}
          </button>

        </div>


        {/* RIGHT: Authentic Infobox */}
        {/* Use order-first on mobile (default) to put it on top, order-last on Desktop to put it on right */}
        <div className="w-full @min-[700px]:w-[320px] shrink-0 @min-[700px]:order-2 order-1">
            <Infobox 
                title={character.name}
                image={<User size={80} color="var(--border-active)" />}
                rows={allInfoboxFields.map(field => {
                    const isCustom = customFields.some(cf => cf.key === field.key);
                  const isTemplateField = "labelKey" in field;
                  const label = isTemplateField ? t(field.labelKey) : field.label;
                  const placeholder =
                    isTemplateField && field.placeholderKey
                      ? t(field.placeholderKey)
                      : "placeholder" in field
                        ? field.placeholder
                        : undefined;
                  const options =
                    isTemplateField && field.optionKeys
                      ? field.optionKeys.map((key) => t(key))
                      : "options" in field
                        ? field.options
                        : undefined;
                    return {
                    label,
                        value: attributes[field.key],
                    placeholder,
                        type: field.type,
                    options,
                        isCustom,
                        onSave: (v) => handleAttrUpdate(field.key, v),
                        onLabelSave: isCustom ? (v) => updateCustomFieldLabel(field.key, v) : undefined,
                        onDelete: isCustom ? () => deleteCustomField(field.key) : undefined
                    };
                })}
                onAddField={addCustomField}
            />
        </div>
      </div>
    </div>


    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { Plus, User, ChevronDown, ChevronRight, Home, LayoutTemplate } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { BufferedInput } from "../common/BufferedInput";
import { Modal } from "../common/Modal"; 
import { Infobox } from "./wiki/Infobox"; 
import { WikiSection } from "./wiki/WikiSection"; 
import { cn } from "../../../../shared/types/utils";
import {
  DEFAULT_CHARACTER_NAME,
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
  const { currentItem: currentProject } = useProjectStore();
  const {
    items: characters,
    loadAll: loadCharacters,
    create: createCharacter,
    update: updateCharacter
  } = useCharacterStore();
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

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
        name: DEFAULT_CHARACTER_NAME,
        description: "Uncategorized", 
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
      const group = char.description?.trim() || "Uncategorized";
      if (!groups[group]) groups[group] = [];
      groups[group].push(char);
    });

    return groups;
  }, [characters]);

  // Selected Character Data
  const selectedChar = useMemo(() => 
    (characters as CharacterLike[]).find(c => c.id === selectedCharacterId),
    [characters, selectedCharacterId]
  );

  return (
    <div className="flex w-full h-full bg-canvas overflow-hidden">
      {/* LEFT SIDEBAR - Character List */}
      <div className="w-[260px] bg-sidebar border-r border-border flex flex-col overflow-y-auto shrink-0">
        <div className="px-4 py-3 bg-[var(--namu-blue)] text-white font-bold flex justify-between items-center">
           <button 
             className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer" 
             onClick={() => setSelectedCharacterId(null)}
             title="전체 보기 (Gallery View)"
           >
             <Home size={18} />
             <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>등장인물</span>
           </button>
           
           <button 
             className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer" 
             onClick={() => setIsTemplateModalOpen(true)}
             title="캐릭터 추가"
           >
             <Plus size={18} />
           </button>
        </div>
        
        <Modal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            title="템플릿 선택"
            width="500px"
        >
            <div className="grid grid-cols-2 gap-4 p-4">
                {CHARACTER_TEMPLATES.map((t) => (
                    <div 
                    key={t.id} 
                    className="flex flex-col items-center justify-center p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors gap-2"
                    onClick={() => handleAddCharacter(t.id)}
                    >
                    <div className="p-3 bg-surface rounded-full shadow-sm">
                        <LayoutTemplate size={24} /> 
                    </div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    </div>
                ))}
            </div>
        </Modal>

        {/* Iterate Groups */}
        <div className="flex flex-col w-full">
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

      {/* RIGHT MAIN - Wiki View */}
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
  return (
    <div className="flex-1 overflow-y-auto p-8">
       <div className="border-b-2 border-border mb-6 pb-4">
         <div className="text-2xl font-extrabold text-fg leading-tight">
            등장인물 (Characters)
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
                    <div className="text-xs text-subtle">{char.description || "No Role"}</div>
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
                  selectedId === char.id && "bg-[var(--namu-hover-bg)] border-l-[3px] text-[var(--namu-blue)]"
              )}
              onClick={() => onSelect(char.id)}
              style={selectedId === char.id ? { borderLeftColor: color } : {}}
            >
              <span className="font-semibold mb-0.5">{char.name}</span>
              <span className="text-[11px] text-subtle">{char.description || "No Role"}</span>
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
  
  const attributes = useMemo(() => 
    typeof character.attributes === "string" 
      ? JSON.parse(character.attributes) 
      : (character.attributes || {}),
  [character.attributes]);
  
  const currentTemplate = useMemo(() => {
    const templateId = attributes.templateId || "basic";
    return CHARACTER_TEMPLATES.find(t => t.id === templateId) || CHARACTER_TEMPLATES[0];
  }, [attributes.templateId]);
  
  const sections: WikiSectionData[] = useMemo(() => {
    return attributes.sections || [
      { id: "overview", label: "1. 개요" },
      { id: "appearance", label: "2. 외관" },
      { id: "personality", label: "3. 성격" },
      { id: "background", label: "4. 배경/과거" },
      { id: "relations", label: "5. 인간관계" },
      { id: "notes", label: "6. 작가의 말" },
    ];
  }, [attributes.sections]);

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
    const newSections = [...sections, { id: newId, label: `${sections.length + 1}. 새로운 섹션` }];
    handleAttrUpdate("sections", newSections);
  };
  
  const renameSection = (id: string, newLabel: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, label: newLabel } : s);
    handleAttrUpdate("sections", newSections);
  };

  const deleteSection = (id: string) => {
    if (confirm("정말 이 섹션을 삭제하시겠습니까? (내용은 보존됩니다)")) {
       const newSections = sections.filter(s => s.id !== id);
       handleAttrUpdate("sections", newSections);
    }
  };

  // Custom Field Management
  const addCustomField = () => {
    const newKey = `custom_${Date.now()}`;
    const newField: CustomField = {
      key: newKey,
      label: "새 항목",
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
    if (confirm("정말 이 항목을 삭제하시겠습니까?")) {
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
      <div className="border-b-2 border-[var(--namu-border)] pb-4 mb-6 flex flex-col gap-3">
        <BufferedInput 
          className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent w-full focus:outline-none"
          value={character.name} 
          onSave={(val) => handleUpdate("name", val)}
        />
        <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
          <span className="font-bold">분류:</span>
          <span className="text-[var(--namu-link)] cursor-pointer hover:underline">{currentTemplate.name}</span>
           <span className="text-border">|</span>
          <BufferedInput 
              className="inline w-auto font-semibold text-[var(--namu-link)] bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm" 
              value={character.description || ""}
              placeholder="미분류"
              onSave={(val) => handleUpdate("description", val)} 
           />
        </div>
      </div>

      {/* 2. BODY CONTENT (Wiki Layout) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start min-h-0">
        {/* LEFT: Content & TOC */}
        <div className="flex-1 flex flex-col gap-8 min-w-0 w-full lg:order-1 order-2">
          
          {/* TOC (Inline) */}
          <div className="bg-[var(--namu-table-bg)] border border-[var(--namu-border)] p-4 inline-block min-w-[200px] rounded">
            <div className="font-bold text-center mb-3 text-fg text-sm">목차</div>
            <div className="flex flex-col gap-1.5 text-sm">
               {sections.map(sec => (
                 <a key={sec.id} className="text-[var(--namu-link)] no-underline cursor-pointer hover:underline" href={`#${sec.id}`}>
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
             + 섹션 추가 (Add Section)
          </button>

        </div>

        {/* RIGHT: Authentic Infobox */}
        {/* Use order-first on mobile (default) to put it on top, order-last on Desktop to put it on right */}
        <div className="w-full lg:w-[320px] shrink-0 lg:order-2 order-1">
            <Infobox 
                title={character.name}
                image={<User size={80} color="var(--border-active)" />}
                rows={allInfoboxFields.map(field => {
                    const isCustom = customFields.some(cf => cf.key === field.key);
                    return {
                        label: field.label,
                        value: attributes[field.key],
                        placeholder: field.placeholder,
                        type: field.type,
                        options: field.options,
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
  );
}

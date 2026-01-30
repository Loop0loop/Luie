import { useEffect, useState, useMemo } from "react";
import { Plus, User, ChevronDown, ChevronRight, Home, LayoutTemplate } from "lucide-react";
import styles from "../../styles/components/CharacterWiki.module.css";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { BufferedInput } from "../common/BufferedInput";
import { Modal } from "../common/Modal"; // Shared Modal
import { Infobox } from "./wiki/Infobox"; // New Component
import { WikiSection } from "./wiki/WikiSection"; // New Component
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
    <div className={styles.container}>
      {/* LEFT SIDEBAR - Character List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
           <button 
             className={styles.homeButton} 
             onClick={() => setSelectedCharacterId(null)}
             title="전체 보기 (Gallery View)"
           >
             <Home size={18} />
             <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>등장인물</span>
           </button>
           
           <button 
             className={styles.addButton} 
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
            <div className={styles.templateGrid}>
                {CHARACTER_TEMPLATES.map((t) => (
                    <div 
                    key={t.id} 
                    className={styles.templateCard}
                    onClick={() => handleAddCharacter(t.id)}
                    >
                    <div className={styles.templateIcon}>
                        <LayoutTemplate size={24} /> 
                    </div>
                    <div className={styles.templateName}>{t.name}</div>
                    </div>
                ))}
            </div>
        </Modal>

        {/* Iterate Groups */}
        <div className={styles.sidebarList}>
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
    <div className={styles.galleryContainer}>
       <div className={styles.titleSection}>
         <div className={styles.wikiTitleInput} style={{ fontSize: '24px' }}>
            등장인물 (Characters)
         </div>
       </div>
       
       {Object.entries(groupedCharacters).map(([group, chars]) => {
         const themeColor = CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"];
         return (
          <div key={group} className={styles.galleryGroup}>
            <div className={styles.galleryGroupTitle} style={{ borderColor: themeColor, color: themeColor }}>
              {group}
            </div>
            
            <div className={styles.galleryGrid}>
              {chars.map(char => (
                 <div key={char.id} className={styles.galleryItem} onClick={() => onSelect(char.id)}>
                    <div className={styles.galleryPortrait} style={{ borderColor: themeColor }}>
                       <User size={40} color={themeColor} />
                    </div>
                    <div className={styles.galleryName}>{char.name}</div>
                    <div className={styles.galleryRole}>{char.description || "No Role"}</div>
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
        className={styles.groupHeader} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{title} ({characters.length})</span>
      </div>
      
      {isOpen && (
        <div>
          {characters.map(char => (
            <div 
              key={char.id}
              className={`${styles.characterItem} ${selectedId === char.id ? styles.active : ""}`}
              onClick={() => onSelect(char.id)}
              style={selectedId === char.id ? { borderLeftColor: color } : {}}
            >
              <span className={styles.charName}>{char.name}</span>
              <span className={styles.charRole}>{char.description || "No Role"}</span>
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
    <div className={styles.main}>
      {/* 1. AUTHENTIC NAMUWIKI HEADER */}
      <div className={styles.titleSection}>
        <BufferedInput 
          className={styles.wikiTitleInput}
          value={character.name} 
          onSave={(val) => handleUpdate("name", val)}
        />
        <div className={styles.wikiSubtitle}>
          <span style={{fontWeight: 700}}>분류:</span>
          <span className={styles.tagLink}>{currentTemplate.name}</span>
           <span style={{color: 'var(--border-default)'}}>|</span>
          <BufferedInput 
              className={styles.cleanInput} 
              style={{display: 'inline', width: 'auto', fontWeight: 600, color: 'var(--namu-link)' }}
              value={character.description || ""}
              placeholder="미분류"
              onSave={(val) => handleUpdate("description", val)} 
           />
        </div>
      </div>

      {/* 2. BODY CONTENT (Wiki Layout) */}
      <div className={styles.pageBody}>
        {/* LEFT: Content & TOC */}
        <div className={styles.contentArea}>
          
          {/* TOC (Inline) */}
          <div className={styles.toc}>
            <div className={styles.tocHeader}>목차</div>
            <div className={styles.tocList}>
               {sections.map(sec => (
                 <a key={sec.id} className={styles.tocItem} href={`#${sec.id}`}>
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
             style={{ 
               padding: '12px', 
               border: '2px dashed var(--border-default)', 
               borderRadius: '8px', 
               textAlign: 'center', 
               color: 'var(--text-tertiary)', 
               cursor: 'pointer',
               marginTop: '16px',
               width: '100%',
               background: 'transparent'
             }}
          >
             + 섹션 추가 (Add Section)
          </button>

        </div>

        {/* RIGHT: Authentic Infobox */}
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
  );
}

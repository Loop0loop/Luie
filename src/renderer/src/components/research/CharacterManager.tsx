import { useEffect, useState, useMemo } from "react";
import { Plus, User, ChevronDown, ChevronRight, Home, LayoutTemplate } from "lucide-react";
import styles from "../../styles/components/CharacterWiki.module.css";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { BufferedInput, BufferedTextArea } from "../common/BufferedInput";
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
      // Find template
      const template = CHARACTER_TEMPLATES.find((t) => t.id === templateId) || CHARACTER_TEMPLATES[0];
      
      const newChar = await createCharacter({
        projectId: currentProject.id,
        name: DEFAULT_CHARACTER_NAME,
        description: "Uncategorized", 
        // We might want to store templateId in attributes for persistence
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
           {/* Home / Gallery Button */}
           <div 
             className={styles.homeButton} 
             onClick={() => setSelectedCharacterId(null)}
             title="전체 보기 (Gallery View)"
             style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
           >
             <Home size={18} />
             <span>등장인물</span>
           </div>
           
           <div 
             className={styles.addButton} 
             onClick={() => setIsTemplateModalOpen(true)}
             title="캐릭터 추가"
           >
             <Plus size={18} />
           </div>
        </div>
        
        {/* Template Selection Modal (Simple Overlay) */}
        {isTemplateModalOpen && (
          <div className={styles.templateModalOverlay} onClick={() => setIsTemplateModalOpen(false)}>
            <div className={styles.templateModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.templateModalTitle}>템플릿 선택</div>
              <div className={styles.templateGrid}>
                {CHARACTER_TEMPLATES.map((t) => (
                  <div 
                    key={t.id} 
                    className={styles.templateCard}
                    onClick={() => handleAddCharacter(t.id)}
                  >
                    <div className={styles.templateIcon}>
                      <LayoutTemplate size={24} /> 
                      {/* Ideally dynamic icon but using default for now */}
                    </div>
                    <div className={styles.templateName}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
      <div className={styles.main} style={{ padding: selectedChar ? undefined : 0, overflow: 'hidden' }}>
        {selectedChar ? (
          <WikiDetailView 
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
    </div>
  );
}

// Sub-component: Gallery View (Default)
function CharacterGallery({ 
  groupedCharacters, 
  onSelect 
}: { 
  groupedCharacters: Record<string, CharacterLike[]>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.galleryContainer}>
       <div style={{fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)'}}>
         등장인물 (Characters)
       </div>
       
       {Object.entries(groupedCharacters).map(([group, chars]) => {
         const themeColor = CHARACTER_GROUP_COLORS[group] || CHARACTER_GROUP_COLORS["Uncategorized"];
         return (
          <div key={group} className={styles.galleryGroup}>
            <div className={styles.galleryHeader} style={{ backgroundColor: themeColor }}>
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

// Sub-component: Main Wiki View - Authentic Namuwiki Style
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
  
  // Resolve Template
  const currentTemplate = useMemo(() => {
    const templateId = attributes.templateId || "basic";
    return CHARACTER_TEMPLATES.find(t => t.id === templateId) || CHARACTER_TEMPLATES[0];
  }, [attributes.templateId]);
  
  const handleUpdate = (field: string, value: string) => {
    updateCharacter({ id: character.id, [field]: value });
  };

  const handleAttrUpdate = (key: string, value: string) => {
    const newAttrs = { ...attributes, [key]: value };
    updateCharacter({ id: character.id, attributes: newAttrs });
  };

  const sections = [
    { id: "overview", label: "1. 개요" },
    { id: "appearance", label: "2. 외관" },
    { id: "personality", label: "3. 성격" },
    { id: "background", label: "4. 배경/과거" },
    { id: "relations", label: "5. 인간관계" },
    { id: "notes", label: "6. 작가의 말" },
  ];

  return (
    <div className={styles.main}>
      {/* 1. AUTHENTIC NAMUWIKI HEADER */}
      <div className={styles.titleSection}>
        <BufferedInput 
          className={styles.cleanInput}
          style={{ fontSize: '32px', fontWeight: 800, borderBottom: 'none' }} 
          value={character.name} 
          onSave={(val) => handleUpdate("name", val)}
        />
        <div className={styles.wikiSubtitle}>
          <span>분류:</span>
          <span className={styles.tagLink}>{currentTemplate.name}</span>
           <span style={{color: '#ccc'}}>|</span>
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
            <div key={sec.id} id={sec.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                {sec.label}
                <span className={styles.editLink}>[편집]</span>
              </div>
              <BufferedTextArea 
                className={styles.textArea}
                style={{ width: '100%', minHeight: '100px', lineHeight: '1.6' }}
                value={attributes[sec.id] || ""}
                placeholder={`${sec.label.split('.')[1].trim()}...`}
                onSave={(val) => handleAttrUpdate(sec.id, val)}
              />
            </div>
          ))}
        </div>

        {/* RIGHT: Authentic Infobox */}
        <div className={styles.infobox}>
          <div className={styles.infoboxHeader}>
            {character.name}
          </div>
          <div className={styles.infoboxImage}>
             <User size={80} color="#ccc" />
          </div>
          
          {/* Dynamic Template Fields (All) */}
          {currentTemplate.fields.map(field => (
             <InfoboxRow 
               key={field.key} 
               label={field.label} 
               value={attributes[field.key]} 
               placeholder={field.placeholder}
               onSave={(v) => handleAttrUpdate(field.key, v)} 
               type={field.type}
               options={field.options}
             />
          ))}
          
        </div>
      </div>
    </div>
  );
}

function InfoboxRow({ 
  label, 
  value, 
  onSave, 
  placeholder,
  type = "text",
  options = []
}: { 
  label: string; 
  value?: string; 
  onSave?: (v: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
}) {
  return (
    <div className={styles.infoboxRow}>
      <div className={styles.infoboxLabel}>{label}</div>
      <div className={styles.infoboxValue}>
        {type === "select" ? (
           <select 
             className={styles.cleanInput} 
             value={value || ""}
             onChange={(e) => onSave?.(e.target.value)}
             style={{ cursor: 'pointer' }}
           >
             <option value="">- 선택 -</option>
             {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
           </select>
        ) : (
          <BufferedInput 
            className={styles.cleanInput} 
            value={value || ""} 
            placeholder={placeholder || "-"}
            onSave={onSave || (() => {})}
          />
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/components/Sidebar.module.css';
import { 
  Settings, Plus, ChevronDown, ChevronRight, 
  FileText, BookOpen, Trash2, FolderOpen, MoreVertical, Edit2
} from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface SidebarProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onOpenSettings: () => void;
  onSelectResearchItem: (type: 'character' | 'world' | 'scrap') => void;
}

export default function Sidebar({ 
  chapters, 
  activeChapterId, 
  onSelectChapter,
  onAddChapter,
  onOpenSettings,
  onSelectResearchItem
}: SidebarProps) {
  // Section collapse states
  const [isManuscriptOpen, setManuscriptOpen] = useState(true);
  const [isResearchOpen, setResearchOpen] = useState(true);
  const [isTrashOpen, setTrashOpen] = useState(false);

  // Context Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.right + 4, y: rect.top });
    setMenuOpenId(id === menuOpenId ? null : id);
  };

  const handleAction = (action: 'edit' | 'delete', id: string) => {
    console.log(`Action: ${action} on ${id}`);
    setMenuOpenId(null);
    // Placeholder: Real implementation would verify store actions
  };

  return (
    <div className={styles.container}>
      {/* Context Menu Popup */}
      {menuOpenId && (
        <div 
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <div className={styles.contextMenuItem} onClick={() => handleAction('edit', menuOpenId)}>
            <Edit2 size={14} /> 이름 변경
          </div>
          <div className={styles.contextMenuItem} onClick={() => handleAction('delete', menuOpenId)} style={{color: '#ef4444'}}>
            <Trash2 size={14} /> 삭제
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h2 className={styles.projectName}>폭군을 길들이는 법</h2>
        <div className={styles.metaInfo}>PROJECT BINDER</div>
      </div>
      
      <div className={styles.binderArea}>
        {/* MANUSCRIPT SECTION */}
        <div 
          className={styles.sectionHeader}
          onClick={() => setManuscriptOpen(!isManuscriptOpen)}
        >
          {isManuscriptOpen ? <ChevronDown size={12} className={styles.sectionIcon} /> : <ChevronRight size={12} className={styles.sectionIcon} />}
          <span>원고 (Manuscript)</span>
        </div>
        
        {isManuscriptOpen && (
          <div className={styles.sectionContent}>
            {chapters.map((chapter) => (
              <div 
                key={chapter.id}
                className={activeChapterId === chapter.id ? styles.itemActive : styles.item}
                onClick={() => onSelectChapter(chapter.id)}
              >
                <FileText size={14} className={styles.itemIcon} />
                <span className={styles.itemTitle}>{chapter.order}. {chapter.title}</span>
                
                {/* More Action Button */}
                <div 
                  className={styles.moreButton}
                  onClick={(e) => handleMenuClick(e, chapter.id)}
                >
                  <MoreVertical size={14} />
                </div>
              </div>
            ))}
            {/* Inline Add Button */}
            <div className={styles.item} onClick={onAddChapter} style={{ color: 'var(--text-tertiary)' }}>
              <Plus size={14} className={styles.itemIcon} />
              <span>새 회차 추가...</span>
            </div>
          </div>
        )}

        {/* RESEARCH SECTION */}
        <div 
          className={styles.sectionHeader}
          onClick={() => setResearchOpen(!isResearchOpen)}
        >
          {isResearchOpen ? <ChevronDown size={12} className={styles.sectionIcon} /> : <ChevronRight size={12} className={styles.sectionIcon} />}
          <span>연구 (Research)</span>
        </div>

        {isResearchOpen && (
          <div className={styles.sectionContent}>
            <div className={styles.item} onClick={() => onSelectResearchItem('character')}>
              <FolderOpen size={14} className={styles.itemIcon} />
              <span>등장인물 (Characters)</span>
            </div>
            <div className={styles.item} onClick={() => onSelectResearchItem('world')}>
              <FolderOpen size={14} className={styles.itemIcon} />
              <span>세계관 (World)</span>
            </div>
            <div className={styles.item} onClick={() => onSelectResearchItem('scrap')}>
              <BookOpen size={14} className={styles.itemIcon} />
              <span>자료 스크랩</span>
            </div>
          </div>
        )}

        {/* TRASH SECTION */}
        <div 
          className={styles.sectionHeader}
          onClick={() => setTrashOpen(!isTrashOpen)}
        >
          {isTrashOpen ? <ChevronDown size={12} className={styles.sectionIcon} /> : <ChevronRight size={12} className={styles.sectionIcon} />}
          <span>휴지통 (Trash)</span>
        </div>

        {isTrashOpen && (
           <div className={styles.sectionContent}>
             <div className={styles.item} style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                <Trash2 size={14} className={styles.itemIcon} />
                <span>비어 있음</span>
             </div>
           </div>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.settingsButton} onClick={onOpenSettings}>
          <Settings size={16} />
          <span>설정 (Settings)</span>
        </button>
      </div>
    </div>
  );
}

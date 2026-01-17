import { useState } from 'react';
import styles from '../../styles/components/Sidebar.module.css';
import { 
  Settings, Plus, ChevronDown, ChevronRight, 
  FileText, BookOpen, Trash2, FolderOpen 
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

  return (
    <div className={styles.container}>
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
              </div>
            ))}
            {/* Inline Add Button for Manuscript */}
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

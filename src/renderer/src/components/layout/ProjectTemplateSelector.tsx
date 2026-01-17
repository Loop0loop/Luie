import { useState } from 'react';
import styles from '../../styles/components/ProjectTemplateSelector.module.css';
import WindowBar from './WindowBar';
import { Plus, Book, FileText, FileType } from 'lucide-react';

interface ProjectTemplateSelectorProps {
  onSelectProject: (templateId: string) => void;
}

export default function ProjectTemplateSelector({ onSelectProject }: ProjectTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Templates', icon: <Book size={16} /> },
    { id: 'novel', label: 'Novel (소설)', icon: <Book size={16} /> },
    { id: 'script', label: 'Script (대본)', icon: <FileText size={16} /> },
    { id: 'misc', label: 'General', icon: <FileType size={16} /> },
  ];

  const templates = [
    { id: 'blank', title: '빈 프로젝트 (Blank)', category: 'all', type: 'blank' },
    { id: 'novel_basic', title: '웹소설 표준 (Web Novel)', category: 'novel', type: 'novel' },
    { id: 'script_basic', title: '드라마 대본 (Screenplay)', category: 'script', type: 'script' },
    { id: 'essay', title: '에세이/수필 (Essay)', category: 'misc', type: 'doc' },
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory || t.category === 'all');

  return (
    <div className={styles.container}>
      {/* 1. Window Bar for "Window Border" requirement */}
      <WindowBar />

      <div className={styles.body}>
        {/* Sidebar Menu */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Start New Project</div>
          {categories.map(cat => (
            <div 
              key={cat.id}
              className={activeCategory === cat.id ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.label}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          <div className={styles.grid}>
            {filteredTemplates.map(template => (
              <div key={template.id} className={styles.card} onClick={() => onSelectProject(template.id)}>
                <div className={styles.cardPreview}>
                  
                  {/* VISUALS: BLANK */}
                  {template.type === 'blank' && (
                    <div className={styles.coverBlank}>
                      <div className={styles.dashed}>
                         <Plus size={32} color="#a1a1aa" />
                         <span style={{fontSize: 12, fontWeight: 500, color: '#a1a1aa'}}>NEW PROJECT</span>
                      </div>
                    </div>
                  )}

                  {/* VISUALS: NOVEL (Premium Book Cover) */}
                  {template.type === 'novel' && (
                     <div className={`${styles.coverNovel} ${styles.coverContent}`}>
                        <div className={styles.subtitle}>THE STANDARD</div>
                        <div className={styles.title}>NOVEL</div>
                        <div style={{fontSize: 32, opacity: 0.2, marginTop: 16}}>❦</div>
                     </div>
                  )}

                  {/* VISUALS: SCRIPT */}
                  {template.type === 'script' && (
                    <div className={`${styles.coverScript} ${styles.coverContent}`}>
                       <div className={styles.title}>SCREEN<br/>PLAY</div>
                       <div className={styles.line} />
                       <div className={styles.line} style={{width:'60%'}} />
                       <div style={{marginTop: 'auto', fontSize: 10, color:'#64748b'}}>INT. COFFEE SHOP - DAY</div>
                    </div>
                  )}

                  {/* VISUALS: DOC */}
                  {template.type === 'doc' && (
                    <div className={styles.coverBlank} style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
                       <div style={{textAlign:'center'}}>
                          <div style={{fontSize: 24, fontFamily:'serif', color:'#333'}}>Essay</div>
                          <div style={{width: 40, height: 1, background:'#333', margin:'8px auto'}} />
                       </div>
                    </div>
                  )}

                </div>
                <span className={styles.cardTitle}>{template.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import styles from '../../styles/components/ProjectTemplateSelector.module.css';
import { Play } from 'lucide-react';

interface ProjectTemplateSelectorProps {
  onSelectProject: (templateId: string) => void;
}

export default function ProjectTemplateSelector({ onSelectProject }: ProjectTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: '전체' },
    { id: 'blank', label: '공백' },
    { id: 'script', label: '대본 작성' },
    { id: 'novel', label: '소설' },
    { id: 'nonfiction', label: '비소설' },
    { id: 'misc', label: '기타' },
  ];

  const templates = [
    { id: 'blank', title: '빈 프로젝트', category: 'blank', type: 'doc' },
    { id: 'tutorial', title: '대화식 튜토리얼', category: 'misc', type: 'doc-purple' },
    { id: 'manual', title: '스크리브너 사용설명서', category: 'misc', type: 'manual' },
    { id: 'novel_basic', title: '기본 소설', category: 'novel', type: 'novel' },
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  return (
    <div className={styles.container}>
      {/* Sidebar Menu */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarTitle}>시작하기</div>
        {categories.map(cat => (
          <div 
            key={cat.id}
            className={activeCategory === cat.id ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem}
            onClick={() => setActiveCategory(cat.id)}
          >
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
                {/* Visuals based on type */}
                {template.type === 'doc' && (
                  <div className={styles.mockDoc}>
                    <div className={styles.mockLine} style={{width:'40%'}}/>
                  </div>
                )}
                {template.type === 'doc-purple' && (
                  <div className={styles.mockDoc} style={{borderTop: '4px solid #8b5cf6'}}>
                     <div style={{fontSize:16, fontWeight:'bold', marginTop:10}}>TUTORIAL</div>
                  </div>
                )}
                {template.type === 'manual' && (
                  <div className={styles.mockDoc} style={{backgroundColor:'#fffbeb'}}>
                     <div style={{fontSize:24, fontWeight:'bold', marginTop:10, color:'#d97706'}}>S</div>
                     <div style={{fontSize:10, color:'#333'}}>USER MANUAL</div>
                  </div>
                )}
                {template.type === 'novel' && (
                  <div className={styles.mockDoc}>
                     <div className={styles.mockTitle}/>
                     <div className={styles.mockLine}/>
                     <div className={styles.mockLine}/>
                     <div className={styles.mockLine}/>
                  </div>
                )}
              </div>
              <span className={styles.cardTitle}>{template.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

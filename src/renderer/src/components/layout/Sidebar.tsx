import styles from './Sidebar.module.css';

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
}

export default function Sidebar({ 
  chapters, 
  activeChapterId, 
  onSelectChapter,
  onAddChapter 
}: SidebarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.projectName}>폭군을 길들이는 법</h2>
        <div className={styles.metaInfo}>판타지 • 연재중</div>
      </div>
      
      <div className={styles.list}>
        {chapters.map((chapter) => (
          <div 
            key={chapter.id}
            className={activeChapterId === chapter.id ? styles.itemActive : styles.item}
            onClick={() => onSelectChapter(chapter.id)}
          >
            <span className={styles.itemOrder}>{chapter.order}.</span>
            <span>{chapter.title}</span>
          </div>
        ))}
      </div>

      <button className={styles.addButton} onClick={onAddChapter}>
        + 새 회차 추가
      </button>
    </div>
  );
}

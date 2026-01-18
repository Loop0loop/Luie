import { Chapter } from "@prisma/client";
import styles from "../../styles/components/CorkboardView.module.css";

interface CorkboardViewProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
}

export default function CorkboardView({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
}: CorkboardViewProps) {
  return (
    <div className={styles.container}>
      {chapters.map((chapter) => (
        <div
          key={chapter.id}
          className={`${styles.card} ${activeChapterId === chapter.id ? styles.cardActive : ""}`}
          onClick={() => onSelectChapter(chapter.id)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardOrder}>{chapter.order}</span>
            <span className={styles.cardWordCount}>
              {chapter.wordCount} 단어
            </span>
          </div>
          <h3 className={styles.cardTitle}>{chapter.title}</h3>
          {chapter.synopsis && (
            <p className={styles.cardSynopsis}>{chapter.synopsis}</p>
          )}
        </div>
      ))}

      <div
        className={styles.card}
        onClick={onAddChapter}
        style={{ borderStyle: "dashed", cursor: "pointer" }}
      >
        <div className={styles.addCard}>
          <span>+</span>
          <span>새 챕터 추가</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Chapter } from "@prisma/client";
import { ChevronRight, ChevronDown, FileText } from "lucide-react";
import styles from "../../styles/components/OutlinerView.module.css";

interface OutlinerViewProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
}

export default function OutlinerView({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
}: OutlinerViewProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(activeChapterId ? [activeChapterId] : []),
  );

  const toggleExpand = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  return (
    <div className={styles.container}>
      {chapters.map((chapter) => (
        <div key={chapter.id} className={styles.chapterItem}>
          <div
            className={`${styles.chapterHeader} ${
              activeChapterId === chapter.id ? styles.chapterHeaderActive : ""
            }`}
            onClick={() => {
              onSelectChapter(chapter.id);
              toggleExpand(chapter.id);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(chapter.id);
              }}
              className={styles.expandButton}
            >
              {expandedChapters.has(chapter.id) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            <FileText size={16} className={styles.chapterIcon} />
            <span className={styles.chapterTitle}>{chapter.title}</span>
            <span className={styles.chapterMeta}>
              {chapter.order} • {chapter.wordCount} 단어
            </span>
          </div>

          {expandedChapters.has(chapter.id) && (
            <div className={styles.chapterDetails}>
              {chapter.synopsis && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>시놉시스:</span>
                  <span className={styles.detailValue}>{chapter.synopsis}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>생성일:</span>
                <span className={styles.detailValue}>
                  {new Date(chapter.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      <div
        className={styles.chapterItem}
        onClick={onAddChapter}
        style={{
          borderStyle: "dashed",
          cursor: "pointer",
        }}
      >
        <button className={styles.expandButton}>
          <ChevronRight size={14} />
        </button>
        <FileText size={16} className={styles.chapterIcon} />
        <span className={styles.chapterTitle}>새 챕터 추가...</span>
      </div>
    </div>
  );
}

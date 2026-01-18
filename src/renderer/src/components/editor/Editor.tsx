import { useState, useEffect } from "react";
import styles from "../../styles/components/Editor.module.css";
import EditorToolbar from "./EditorToolbar";
import { useEditorStore } from "../../stores/editorStore";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
}

export default function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  const { fontFamily, fontSize, lineHeight, theme } = useEditorStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSave?.(title, content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, onSave]);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  const getFontFamily = () => {
    switch (fontFamily) {
      case "serif":
        return "var(--font-serif)";
      case "sans":
        return "var(--font-sans)";
      case "mono":
        return "var(--font-mono)";
      default:
        return "var(--font-serif)";
    }
  };

  const [isMobileView, setIsMobileView] = useState(false);

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbarArea}>
        <EditorToolbar
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
        />
      </div>

      <div className={styles.editorWrapper}>
        <div className={styles.mobileFrame} data-mobile={isMobileView}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder=""
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontFamily: getFontFamily() }}
          />

          <textarea
            className={styles.editorArea}
            placeholder=""
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          />
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusText}>
          글자 {content.length} · 단어 {wordCount}
        </span>
      </div>
    </div>
  );
}

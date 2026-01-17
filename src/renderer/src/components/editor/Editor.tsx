import { useState, useEffect } from "react";
import styles from '../../styles/components/Editor.module.css';
import EditorToolbar from './EditorToolbar';
import { useEditorStore } from "../../stores/editorStore";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
}

export default function Editor({ initialTitle = "", initialContent = "", onSave }: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  // Subscribe to editor settings
  const { fontFamily, fontSize, lineHeight, theme } = useEditorStore();

  useEffect(() => {
    // Apply theme to body (or a global wrapper if we had one, but effectively for the app)
    // Since this is the main editor, we can control the app theme here or in MainLayout.
    // Ideally MainLayout handles this, but for now let's apply to document.
    document.documentElement.setAttribute('data-theme', theme);
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

  // Handle Tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = content.substring(0, start) + "  " + content.substring(end);
      setContent(newValue);
      // Need timeout to set selection after render
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const getFontFamily = () => {
    switch(fontFamily) {
      case 'serif': return 'var(--font-serif)';
      case 'sans': return 'var(--font-sans)';
      case 'mono': return 'var(--font-mono)';
      default: return 'var(--font-serif)';
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
            placeholder="회차 제목 없음"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontFamily: getFontFamily() }}
          />
          
          <textarea
            className={styles.editorArea}
            placeholder="이곳에 글을 작성하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          />
        </div>
      </div>

      <div className={styles.statusBar}>
        <span>공백 포함 {content.length}자 (공백 제외 {content.replace(/\s/g, '').length}자)</span>
        <span>{wordCount} 단어</span>
      </div>
    </div>
  );
}

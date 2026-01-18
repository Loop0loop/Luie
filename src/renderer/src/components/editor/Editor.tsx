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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Basic Markdown insertion handler
  const handleFormat = (type: string) => {
    const textarea = document.querySelector(`.${styles.editorArea}`) as HTMLTextAreaElement;
    if (!textarea) return;

    if (type === 'undo') {
      document.execCommand('undo');
      return;
    }
    if (type === 'redo') {
      document.execCommand('redo');
      return;
    }
    if (type === 'size-up') {
      useEditorStore.getState().setFontSize(fontSize + 1);
      return;
    }
    if (type === 'size-down') {
      useEditorStore.getState().setFontSize(Math.max(10, fontSize - 1));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = content;
    let newCursorPos = end;

    switch (type) {
      case 'bold':
        newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
        newCursorPos = end + 4;
        break;
      case 'italic':
        newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'underline':
        newText = content.substring(0, start) + `<u>${selectedText}</u>` + content.substring(end);
        newCursorPos = end + 7;
        break;
      case 'strikethrough':
        newText = content.substring(0, start) + `~~${selectedText}~~` + content.substring(end);
        newCursorPos = end + 4;
        break;
      case 'align-center':
        newText = content.substring(0, start) + `<div align="center">\n${selectedText}\n</div>` + content.substring(end);
        newCursorPos = end + 22;
        break;
      case 'align-right':
        newText = content.substring(0, start) + `<div align="right">\n${selectedText}\n</div>` + content.substring(end);
        newCursorPos = end + 21;
        break;
    }

    handleContentChange({ target: { value: newText } } as any);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbarArea}>
        <EditorToolbar
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
          onFormat={handleFormat}
        />
      </div>

      <div className={styles.editorWrapper}>
        <div className={styles.mobileFrame} data-mobile={isMobileView}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder="제목 없음"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontFamily: getFontFamily() }}
          />

          <textarea
            className={styles.editorArea}
            placeholder="내용을 입력하세요..."
            value={content}
            onChange={handleContentChange}
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

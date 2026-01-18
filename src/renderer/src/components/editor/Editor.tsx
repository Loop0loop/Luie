import { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
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
  // We use content state only for save trigger tracking if needed, 
  // but TipTap manages its own state. 
  // We'll sync local state for the save timer.
  const [contentHtml, setContentHtml] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  const { fontFamily, fontSize, lineHeight, theme } = useEditorStore();
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextStyle,
      Placeholder.configure({
        placeholder: "내용을 입력하세요... ('/'를 입력하여 명령어 확인)",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      setContentHtml(html);
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    },
    editorProps: {
      attributes: {
        class: styles.editorContent, // We will map this class in CSS
      },
    },
  });

  // Sync font settings to editor container
  useEffect(() => {
    // TipTap doesn't natively handle font-size as a mark easily without extension-text-style
    // But we can apply it to the container or use a global style.
    // The previous implementation utilized inline styles on the textarea.
    // We will apply these styles to the editorContent class or wrapper.
  }, [fontSize, lineHeight, fontFamily]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave?.(title, contentHtml);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, contentHtml, onSave]);

  const getFontFamily = () => {
    switch (fontFamily) {
      case "serif": return "var(--font-serif)";
      case "sans": return "var(--font-sans)";
      case "mono": return "var(--font-mono)";
      default: return "var(--font-serif)";
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbarArea}>
        <EditorToolbar
          editor={editor}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
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

          <div 
            className={styles.editorContainer}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
             <EditorContent editor={editor} className={styles.tiptapEditor} />
          </div>
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusText}>
          글자 {editor.getText().length} · 단어 {wordCount}
        </span>
      </div>
    </div>
  );
}

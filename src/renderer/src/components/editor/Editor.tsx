import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import Suggestion from "@tiptap/suggestion";
import styles from "../../styles/components/Editor.module.css";
import EditorToolbar from "./EditorToolbar";
import { useEditorStore } from "../../stores/editorStore";
import { slashSuggestion } from "./suggestion";

// Simple Callout Extension (inline to avoid dependencies)
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "callout",
      }),
      0,
    ];
  },
});

const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...slashSuggestion,
      }),
    ];
  },
});

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void | Promise<void>;
}

function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [contentHtml, setContentHtml] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  const lastSavedRef = useRef<{ title: string; content: string } | null>(null);

  const SAVE_DEBOUNCE_MS = 4000;

  const { fontFamily, fontSize, lineHeight } = useEditorStore();
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // TipTap Editor Setup
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        underline: false,
      }),
      Highlight,
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Callout,
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: "toggle",
        },
      }),
      DetailsSummary,
      DetailsContent,
      Placeholder.configure({
        placeholder: "내용을 입력하세요... ('/'를 입력하여 명령어 확인)",
      }),
      SlashCommand,
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        setContentHtml(html);
        setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
      },
      editorProps: {
        attributes: {
          class: styles.editorContent,
          style: `font-family: ${
            fontFamily === "serif"
              ? '"Merriweather", serif'
              : fontFamily === "sans"
                ? '"Inter", sans-serif'
                : '"JetBrains Mono", monospace'
          }; font-size: ${fontSize}px; line-height: ${lineHeight};`,
        },
      },
    },
    [extensions],
  );

  // Auto-save
  useEffect(() => {
    if (!onSave) {
      return;
    }

    const timer = setTimeout(() => {
      const last = lastSavedRef.current;
      if (last && last.title === title && last.content === contentHtml) {
        return;
      }

      lastSavedRef.current = { title, content: contentHtml };
      void Promise.resolve(onSave(title, contentHtml)).catch(() => {
        // best-effort autosave; errors are surfaced via IPC response/logger
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [title, contentHtml, onSave]);

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

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container}>
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
              lineHeight,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative", // Ensure absolute positioning of menu works relative to this
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

export default memo(Editor);

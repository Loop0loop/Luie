import { useState, useMemo, useRef, memo, useCallback, useTransition } from "react";
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
import {
  EDITOR_AUTOSAVE_DEBOUNCE_MS,
  EDITOR_STYLE_APPLY_DEBOUNCE_MS,
  PLACEHOLDER_EDITOR_BODY,
  PLACEHOLDER_EDITOR_TITLE,
  TEXT_EDITOR_STATUS_CHAR_LABEL,
  TEXT_EDITOR_STATUS_WORD_LABEL,
  TEXT_EDITOR_STATUS_SEPARATOR,
} from "../../../../shared/constants";

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
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [, startTransition] = useTransition();

  const lastSavedRef = useRef<{ title: string; content: string } | null>(null);
  const contentHtmlRef = useRef(initialContent);
  const titleRef = useRef(initialTitle);
  const statsTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  const SAVE_DEBOUNCE_MS = EDITOR_AUTOSAVE_DEBOUNCE_MS;

  const { fontFamily, fontPreset, fontSize, lineHeight } = useEditorStore();
  const [isMobileView, setIsMobileView] = useState(false);

  const fontPresetMap: Record<string, string> = {
    default:
      fontFamily === "serif"
        ? "var(--font-serif)"
        : fontFamily === "sans"
          ? "var(--font-sans)"
          : "var(--font-mono)",
    lora: '"Lora Variable", "Lora", var(--font-serif)',
    bitter: '"Bitter Variable", "Bitter", var(--font-serif)',
    "source-serif":
      '"Source Serif 4 Variable", "Source Serif 4", var(--font-serif)',
    montserrat: '"Montserrat Variable", "Montserrat", var(--font-sans)',
    "nunito-sans": '"Nunito Sans Variable", "Nunito Sans", var(--font-sans)',
    "victor-mono":
      '"Victor Mono Variable", "Victor Mono", var(--font-mono)',
  };

  const fontFamilyCss = fontPresetMap[fontPreset ?? "default"];

  const countWords = useCallback((text: string) => {
    let count = 0;
    let inWord = false;
    for (let i = 0; i < text.length; i += 1) {
      const isWhitespace = text[i] <= " ";
      if (!isWhitespace && !inWord) {
        count += 1;
        inWord = true;
      } else if (isWhitespace) {
        inWord = false;
      }
    }
    return count;
  }, []);

  const scheduleStatsUpdate = useCallback(
    (text: string) => {
      if (statsTimerRef.current) {
        window.clearTimeout(statsTimerRef.current);
      }
      statsTimerRef.current = window.setTimeout(() => {
        const nextWordCount = countWords(text);
        const nextCharCount = text.length;
        startTransition(() => {
          setWordCount(nextWordCount);
          setCharCount(nextCharCount);
        });
      }, EDITOR_STYLE_APPLY_DEBOUNCE_MS);
    },
    [countWords, startTransition],
  );

  const scheduleAutosave = useCallback(() => {
    if (!onSave) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      const last = lastSavedRef.current;
      const currentTitle = titleRef.current;
      const currentContent = contentHtmlRef.current;
      if (last && last.title === currentTitle && last.content === currentContent) {
        return;
      }

      lastSavedRef.current = { title: currentTitle, content: currentContent };
      void Promise.resolve(onSave(currentTitle, currentContent)).catch(() => {
        // best-effort autosave; errors are surfaced via IPC response/logger
      });
    }, SAVE_DEBOUNCE_MS);
  }, [onSave, SAVE_DEBOUNCE_MS]);


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
        placeholder: PLACEHOLDER_EDITOR_BODY,
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
        contentHtmlRef.current = html;
        scheduleStatsUpdate(text);
        scheduleAutosave();
      },
      editorProps: {
        attributes: {
          class: styles.editorContent,
          style: `font-family: ${fontFamilyCss}; font-size: ${fontSize}px; line-height: ${lineHeight};`,
        },
      },
    },
    [extensions],
  );

  const getFontFamily = () => fontFamilyCss;

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
            placeholder={PLACEHOLDER_EDITOR_TITLE}
            value={title}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              titleRef.current = nextTitle;
              scheduleAutosave();
            }}
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
          {TEXT_EDITOR_STATUS_CHAR_LABEL} {charCount}
          {TEXT_EDITOR_STATUS_SEPARATOR}
          {TEXT_EDITOR_STATUS_WORD_LABEL} {wordCount}
        </span>
      </div>
    </div>
  );
}

export default memo(Editor);

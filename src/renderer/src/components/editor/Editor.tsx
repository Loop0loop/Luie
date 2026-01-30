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
// import styles from "../../styles/components/Editor.module.css"; // Removed
import "../../styles/components/editor.css";
import { cn } from "../../../../shared/types/utils";
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
          class: "tiptap flex-1 flex flex-col outline-none h-full",
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
    <div className="flex flex-col h-full w-full bg-app text-fg relative box-border overflow-hidden">
      <div className="shrink-0 border-b border-border z-10">
        <EditorToolbar
          editor={editor}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
        />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col px-10 py-5 bg-app min-h-0">
        <div 
          className={cn(
            "w-full h-full flex flex-col flex-1 min-h-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent border-none shadow-none m-0",
            isMobileView && "w-[430px] max-w-[430px] h-[95%] mx-auto my-5 border-[8px] border-[#2c2c2e] rounded-[48px] bg-editor-bg shadow-[0_0_0_2px_rgba(69,69,69,0.9),0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden relative"
          )}
          data-mobile={isMobileView}
        >
          {/* Mobile Notch Simulation */}
          {isMobileView && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-8 bg-[#2c2c2e] rounded-b-2xl z-[100] pointer-events-none" />
          )}

          <input
            type="text"
            className={cn(
              "w-full border-none bg-transparent pb-4 text-2xl font-bold text-fg outline-none shrink-0 placeholder:text-muted",
              isMobileView && "px-6"
            )}
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
            className={cn(
              "flex flex-col relative", 
              isMobileView && "pt-8 h-full overflow-hidden px-6"
            )}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight,
              height: isMobileView ? "100%" : undefined, // Height handled differently in mobile
              minHeight: !isMobileView ? "var(--text-editor-min-height)" : undefined,
            }}
          >
            <EditorContent editor={editor} className="tiptap flex-1 flex flex-col outline-none h-full" />
          </div>
        </div>
      </div>

      <div className="h-7 border-t border-border flex items-center justify-end gap-4 px-5 text-xs text-muted bg-bg-primary shrink-0 select-none">
        <span className="mr-auto font-medium">
          {TEXT_EDITOR_STATUS_CHAR_LABEL} {charCount}
          {TEXT_EDITOR_STATUS_SEPARATOR}
          {TEXT_EDITOR_STATUS_WORD_LABEL} {wordCount}
        </span>
      </div>
    </div>
  );
}

export default memo(Editor);

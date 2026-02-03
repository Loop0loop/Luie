import { memo, useEffect, useMemo, useState } from "react";
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

import "../../styles/components/editor.css";
import { cn } from "../../../../shared/types/utils";
import EditorToolbar from "./EditorToolbar";
import { slashSuggestion } from "./suggestion";
import { useBufferedInput } from "../../hooks/useBufferedInput";
import { useEditorAutosave } from "../../hooks/useEditorAutosave";
import { useEditorStats } from "../../hooks/useEditorStats";
import { useEditorConfig } from "../../hooks/useEditorConfig";
import { SmartLink } from "./extensions/SmartLink";
import { SmartLinkTooltip } from "./SmartLinkTooltip";
import { Loader2, Check } from "lucide-react";
import {
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
  readOnly?: boolean;
}

function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
  readOnly = false,
}: EditorProps) {
  const { fontFamilyCss, fontSize, lineHeight, getFontFamily } = useEditorConfig();
  const { wordCount, charCount, updateStats } = useEditorStats();
  const [isMobileView, setIsMobileView] = useState(false);

  const { value: title, onChange: handleTitleChange } = useBufferedInput(
    initialTitle,
    () => {
      // autosave hook tracks title state
    },
  );

  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const { saveStatus } = useEditorAutosave({
    onSave: readOnly ? undefined : onSave,
    title,
    content,
  });

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
      SmartLink, 
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      content: initialContent,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        
        // Update local content state for autosave hook to pick up
        setContent(html); 
        
        updateStats(text);
      },
      editorProps: {
        attributes: {
          class: "tiptap flex-1 flex flex-col outline-none h-full",
          style: `font-family: ${fontFamilyCss}; font-size: ${fontSize}px; line-height: ${lineHeight};`,
        },
      },
    },
    [extensions, fontFamilyCss, fontSize, lineHeight, updateStats],
  );


  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-app text-fg relative box-border overflow-hidden"
      data-testid="editor"
    >
      <div className="shrink-0 border-b border-border z-10">
        {!readOnly && (
          <EditorToolbar
            editor={editor}
            isMobileView={isMobileView}
            onToggleMobileView={() => setIsMobileView(!isMobileView)}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col px-10 py-5 bg-app min-h-0">
        <div 
          className={cn(
            "w-full h-full flex flex-col flex-1 min-h-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent border-none shadow-none m-0",
            isMobileView && "w-107.5 max-w-107.5 h-[95%] mx-auto my-5 border-8 border-[#2c2c2e] rounded-[48px] bg-editor-bg shadow-[0_0_0_2px_rgba(69,69,69,0.9),0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden relative"
          )}
          data-mobile={isMobileView}
        >
          {/* Mobile Notch Simulation */}
          {isMobileView && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-30 h-8 bg-[#2c2c2e] rounded-b-2xl z-100 pointer-events-none" />
          )}

          <input
            type="text"
            className={cn(
              "w-full border-none bg-transparent pb-4 text-2xl font-bold text-fg outline-none shrink-0 placeholder:text-muted",
              isMobileView && "px-6",
              readOnly && "pointer-events-none opacity-80"
            )}
            placeholder={PLACEHOLDER_EDITOR_TITLE}
            value={title}
            onChange={(e) => !readOnly && handleTitleChange(e.target.value)}
            readOnly={readOnly}
            style={{ fontFamily: getFontFamily() }}
            data-testid="editor-title"
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
            data-testid="editor-content"
          >
            <EditorContent editor={editor} className="tiptap flex-1 flex flex-col outline-none h-full" />
          </div>
        </div>
      </div>

      <div className="h-7 border-t border-border flex items-center justify-end gap-4 px-5 text-xs text-muted bg-bg-primary shrink-0 select-none">
        {/* Save Status Indicator */}
        <span className="flex items-center gap-1.5 min-w-15">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="w-3 h-3 text-success-fg" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <span className="text-danger-fg">Not Saved</span>
          )}
        </span>

        <span className="mr-auto font-medium">
          {TEXT_EDITOR_STATUS_CHAR_LABEL} {charCount}
          {TEXT_EDITOR_STATUS_SEPARATOR}
          {TEXT_EDITOR_STATUS_WORD_LABEL} {wordCount}
        </span>
      </div>

      <SmartLinkTooltip />
    </div>
  );
}


export default memo(Editor);

import { memo, useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
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
import { DiffHighlight } from "./extensions/DiffExtension";
import { SmartLinkTooltip } from "./SmartLinkTooltip";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";

import StatusFooter from "../common/StatusFooter";

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
  comparisonContent?: string;
  diffMode?: "current" | "snapshot";
  chapterId?: string;
  hideToolbar?: boolean;
  hideFooter?: boolean;
  onEditorReady?: (editor: TiptapEditor | null) => void;
}

function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
  readOnly = false,
  comparisonContent,
  diffMode,
  chapterId,
  hideToolbar = false,
  hideFooter = false,
  onEditorReady,
}: EditorProps) {
  const { t } = useTranslation();
  const { fontFamilyCss, fontSize, lineHeight, getFontFamily } = useEditorConfig();
  const { updateStats } = useEditorStats();
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

  useEditorAutosave({
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
        placeholder: t("editor.placeholder.body"),
      }),
      SlashCommand,
      SmartLink, 
      DiffHighlight.configure({
        comparisonContent,
        mode: diffMode,
      }),
    ],
    [comparisonContent, diffMode, t],
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
        if (!readOnly) {
          api.lifecycle?.setDirty?.(true);
        }
        
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
    if (onEditorReady) {
        onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    
    // Update diff state commands if props change
    // Since we configured it initially with memo [], we need to update it via command if it changes
    // But check if command exists first
    if (editor.commands.setDiff) {
       editor.commands.setDiff({
         comparisonContent,
         mode: diffMode
       });
    }
  }, [editor, comparisonContent, diffMode]);

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

  const handleOpenExport = async () => {
    // Strict validation
    if (!chapterId || chapterId === "undefined" || chapterId === "null") {
      api.logger.warn("No valid chapterId available for export", { chapterId });
      alert(t("editor.errors.exportNoChapter"));
      return;
    }

    api.logger.info("Opening export window", { chapterId });
    const response = await api.window.openExport(chapterId);
    
    if (!response.success || response.data !== true) {
      const message = response.error?.message || t("editor.errors.exportOpenFailed");
      api.logger.error("Failed to open export window", { 
        chapterId, 
        error: response.error,
        data: response.data 
      });
      alert(message);
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-transparent text-foreground relative box-border overflow-hidden"
      data-testid="editor"
    >
      {!hideToolbar && (
      <div className="shrink-0 border-b border-border z-10">
        {!readOnly && (
          <EditorToolbar
            editor={editor}
            isMobileView={isMobileView}
            onToggleMobileView={() => setIsMobileView(!isMobileView)}
          />
        )}
      </div>
      )}

      {/* Title */}
      <input
        type="text"
        className={cn(
          "w-full border-none bg-transparent pb-4 text-2xl font-bold text-foreground outline-none shrink-0 placeholder:text-muted-foreground",
          isMobileView && "px-6",
          readOnly && "pointer-events-none opacity-80"
        )}
        placeholder={t("editor.placeholder.title")}
        value={title}
        onChange={(e) => !readOnly && handleTitleChange(e.target.value)}
        readOnly={readOnly}
        style={{ fontFamily: getFontFamily() }}
        data-testid="editor-title"
      />

      {/* Content */}
      <div
        className={cn(
          "flex flex-col relative flex-1", 
          isMobileView && "pt-8 h-full overflow-hidden px-6"
        )}
        style={{
          fontFamily: getFontFamily(),
          fontSize: `${fontSize}px`,
          lineHeight,
          height: isMobileView ? "100%" : undefined,
          minHeight: !isMobileView ? "var(--text-editor-min-height)" : undefined,
        }}
        data-testid="editor-content"
      >
        <EditorContent editor={editor} className="tiptap flex-1 flex flex-col outline-none h-full" />
      </div>

      {!hideFooter && (
        <StatusFooter onOpenExport={handleOpenExport} />
      )}

      <SmartLinkTooltip />
    </div>
  );
}


export default memo(Editor);

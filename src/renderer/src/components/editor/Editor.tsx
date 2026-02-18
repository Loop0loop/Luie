import { memo, useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import Suggestion from "@tiptap/suggestion";
import Focus from "@tiptap/extension-focus";

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
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import { useDialog } from "../common/DialogProvider";
import { smartLinkService } from "../../../../main/services/core/SmartLinkService";

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

import StatusFooter from "../common/StatusFooter";

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
  hideTitle?: boolean; // New prop
  scrollable?: boolean; // New prop
  focusMode?: boolean; // New prop for Focus Mode features
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
  hideTitle = false, // Default false
  scrollable = true, // Default true (for Default/Split layout)
  focusMode = false,
  onEditorReady,
}: EditorProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { fontFamilyCss, fontSize, lineHeight, getFontFamily } = useEditorConfig();
  const { updateStats } = useEditorStats();
  const [isMobileView, setIsMobileView] = useState(false);

  const { value: title, onChange: handleTitleChange } = useBufferedInput(
    initialTitle,
    () => {
      // autosave hook tracks title state
    },
  );
  
  // ... (Hooks omitted for brevity, logic unchanged) ...

  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEditorAutosave({
    onSave: readOnly ? undefined : onSave,
    title,
    content,
  });

  // ... (Tiptap setup omitted) ...

  // ... (Tiptap setup omitted) ...

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        underline: false,
      }),
      // ... (extensions) ...
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
      ...(focusMode ? [
        Focus.configure({
          className: "has-focus",
          mode: "shallowest",
        }) 
      ] : []),
    ],
    [comparisonContent, diffMode, t, focusMode],
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      content: initialContent,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        
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
        handleClick: (view, pos, _event) => {
             const { state } = view;
             // Check if node has marks and specifically underline
             // nodeAt(pos) might return the node *after* pos. Tiptap often works better with `state.selection`.
             // But for click, let's check the range or node at pos.
             
             // Better strategy: Check if the clickable range has 'underline' mark
             const $pos = state.doc.resolve(pos);
             const marks = $pos.marks();
             const hasUnderline = marks.some(m => m.type.name === 'underline');

             if (hasUnderline) {
                // Get the text of the word/node at this position
                // This is a naive extraction; ideally we want the full marked range.
                // For now, let's grab the text node's content or the word around it.
                // Simple approach: Get the full text of the node at this position if it's a text node
                const node = $pos.nodeAfter || $pos.nodeBefore; // Click might be at boundary
                if (node && node.isText) {
                    const text = node.text || "";
                    // Attempt to find in stores
                    const charStore = useCharacterStore.getState();
                    const termStore = useTermStore.getState();

                    // Search Character
                    const char = charStore.characters.find(c => c.name === text || c.name.includes(text) || text.includes(c.name));
                    if (char) {
                        smartLinkService.openItem(char.id, "character");
                        return true; // handled
                    }

                    // Search Term
                    const term = termStore.terms.find(t => t.term === text || t.term.includes(text) || text.includes(t.term));
                    if (term) {
                        smartLinkService.openItem(term.id, "term");
                        return true;
                    }
                }
             }
             return false;
          }
        },
    },
    [extensions, fontFamilyCss, fontSize, lineHeight, updateStats],
  );

  // Typewriter Scrolling Logic
  useEffect(() => {
    if (!focusMode || !editor) return;

    const handleSelectionUpdate = () => {
      const { selection } = editor.state;
      const { empty } = selection;
      
      // Only scroll on carets to avoid jumping during selection
      if (!empty) return;

      const dom = editor.view.dom;
      if (document.activeElement !== dom) return;

      const coords = editor.view.coordsAtPos(selection.from);
      const viewportHeight = window.innerHeight; // FocusLayout uses full screen
      
      // Target: 40% from top
      const targetTop = viewportHeight * 0.4; 
      
      // Current cursor top relative to viewport
      const currentTop = coords.top;
      
      // Diff
      const diff = currentTop - targetTop;
      
      if (Math.abs(diff) > 20) { // Threshold
          window.scrollBy({ top: diff, behavior: "smooth" });
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, focusMode]);

  useEffect(() => {
    if (onEditorReady) {
        onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // ... (Diff effect) ...
  useEffect(() => {
    if (!editor) return;
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
     // ... (export logic) ...
    if (!chapterId || chapterId === "undefined" || chapterId === "null") {
      api.logger.warn("No valid chapterId available for export", { chapterId });
      dialog.toast(t("editor.errors.exportNoChapter"), "error");
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
      dialog.toast(message, "error");
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

      {/* Conditionally Scrollable Wrapper */}
      <div className={cn("flex-1 flex flex-col min-h-0", scrollable ? "overflow-y-auto px-10 py-5" : "")}>
          <div 
            className={cn(
                "w-full flex flex-col flex-1 min-h-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent border-none shadow-none m-0",
                isMobileView && "w-107.5 max-w-107.5 h-[95%] mx-auto my-5 border-8 border-[#2c2c2e] rounded-[48px] bg-editor-bg shadow-[0_0_0_2px_rgba(69,69,69,0.9),0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden relative",
                // If not scrollable (Docs mode), we don't want h-full constraining it, we want it to check mobile view or just flow
                !scrollable && "h-auto" 
            )}
            data-mobile={isMobileView}
          >
            {/* Mobile Notch Simulation */}
            {isMobileView && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-30 h-8 bg-[#2c2c2e] rounded-b-2xl z-100 pointer-events-none" />
            )}

            {/* Title - Conditionally Rendered */}
            {!hideTitle && (
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
            )}

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
          </div>
      </div>

      {!hideFooter && (
        <StatusFooter onOpenExport={handleOpenExport} />
      )}

      <SmartLinkTooltip />
    </div>
  );
}




export default memo(Editor);

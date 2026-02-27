import { memo, useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import "@renderer/styles/components/editor.css";
import { cn } from "@shared/types/utils";
import EditorToolbar from "@renderer/features/editor/components/EditorToolbar";
import { useBufferedInput } from "@renderer/features/editor/hooks/useBufferedInput";
import { useEditorAutosave } from "@renderer/features/editor/hooks/useEditorAutosave";
import { useEditorStats } from "@renderer/features/editor/hooks/useEditorStats";
import { useEditorConfig } from "@renderer/features/editor/hooks/useEditorConfig";
import { api } from "@shared/api";
import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { openQuickExportEntry } from "@renderer/features/workspace/services/exportEntryService";
import { consumePendingEditorFocusQuery } from "@renderer/features/workspace/services/chapterNavigation";

import { useEditorExtensions } from "@renderer/features/editor/components/hooks/useEditorExtensions";
import { useSmartLinkClickHandler } from "@renderer/features/editor/components/hooks/useSmartLinkClickHandler";
import { useTypewriterScroll } from "@renderer/features/editor/components/hooks/useTypewriterScroll";
import StatusFooter from "@shared/ui/StatusFooter";

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
  onOpenWorldGraph?: () => void;
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
  onOpenWorldGraph,
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

  const handleSmartLinkClick = useSmartLinkClickHandler();
  const extensions = useEditorExtensions({
    comparisonContent,
    diffMode,
    focusMode,
  });

  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEditorAutosave({
    onSave: readOnly ? undefined : onSave,
    title,
    content,
  });

  // Tiptap Extensions imported remotely

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
        handleClick: handleSmartLinkClick,
      },
    },
    [extensions, fontFamilyCss, fontSize, lineHeight, updateStats],
  );

  useTypewriterScroll(editor, focusMode);

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

  useEffect(() => {
    if (!editor || !chapterId) return;
    const pendingQuery = consumePendingEditorFocusQuery(chapterId);
    if (!pendingQuery) return;

    const timer = window.setTimeout(() => {
      const text = editor.getText();
      const normalizedText = text.toLowerCase();
      const normalizedQuery = pendingQuery.toLowerCase().trim();
      const index = normalizedQuery.length > 0 ? normalizedText.indexOf(normalizedQuery) : -1;

      try {
        editor.commands.focus();
        if (index >= 0) {
          editor.commands.setTextSelection({
            from: index + 1,
            to: index + normalizedQuery.length + 1,
          });
        } else {
          editor.commands.setTextSelection({ from: 1, to: 1 });
        }
      } catch {
        editor.commands.focus();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [editor, chapterId, initialContent]);

  if (!editor) {
    return null;
  }

  const handleOpenExport = async () => {
    await openQuickExportEntry({
      chapterId,
      t,
      toast: dialog.toast,
    });
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
              onOpenWorldGraph={onOpenWorldGraph}
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
    </div>
  );
}




export default memo(Editor);

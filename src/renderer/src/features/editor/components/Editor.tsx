import { memo, useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import "@renderer/styles/components/editor.css";
import { cn } from "@shared/types/utils";
import EditorToolbar from "@renderer/features/editor/components/EditorToolbar";
import EditorBubbleMenu from "@renderer/features/editor/components/EditorBubbleMenu";
import { useBufferedInput } from "@renderer/features/editor/hooks/useBufferedInput";
import { useEditorAutosave } from "@renderer/features/editor/hooks/useEditorAutosave";
import { useEditorStats } from "@renderer/features/editor/hooks/useEditorStats";
import { useEditorConfig } from "@renderer/features/editor/hooks/useEditorConfig";
import { useEditorScrollRestoration } from "@renderer/features/editor/hooks/useEditorScrollRestoration";
import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { openQuickExportEntry } from "@renderer/features/workspace/services/exportEntryService";
import { consumePendingEditorFocusQuery } from "@renderer/features/workspace/services/chapterNavigation";

import { useEditorExtensions } from "@renderer/features/editor/components/hooks/useEditorExtensions";
import { useSmartLinkClickHandler } from "@renderer/features/editor/components/hooks/useSmartLinkClickHandler";
import { useTypewriterScroll } from "@renderer/features/editor/components/hooks/useTypewriterScroll";
import { isUsableEditor } from "@renderer/features/editor/components/toolbar";
import StatusFooter from "@shared/ui/StatusFooter";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import type { Character, Term } from "@shared/types";

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
  const { fontFamilyCss, fontSize, lineHeight, letterSpacing, wordSpacing, paragraphSpacing, getFontFamily } =
    useEditorConfig();
  const entityColors = useEditorStore((state) => state.entityColors);
  const maxWidth = useEditorStore((state) => state.maxWidth);
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
  const updateStatsRef = useRef(updateStats);
  const selectionAnalyzeTimerRef = useRef<number | null>(null);
  const lastSelectionSampleRef = useRef("");
  const lastSelectionEmitAtRef = useRef(0);

  useEffect(() => {
    updateStatsRef.current = updateStats;
  }, [updateStats]);

  useEditorAutosave({
    onSave: readOnly ? undefined : onSave,
    title,
    content,
  });

  useEditorScrollRestoration(chapterId);

  // Tiptap Extensions imported remotely

  const updateContentRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (updateContentRef.current) {
        window.clearTimeout(updateContentRef.current);
      }
      if (selectionAnalyzeTimerRef.current) {
        window.clearTimeout(selectionAnalyzeTimerRef.current);
      }
    };
  }, []);

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      content: initialContent,
      onUpdate: ({ editor }) => {
        if (updateContentRef.current) {
          window.clearTimeout(updateContentRef.current);
        }

        updateContentRef.current = window.setTimeout(() => {
          const html = editor.getHTML();
          const text = editor.getText();

          setContent((previous) => (previous === html ? previous : html));
          updateStatsRef.current(text);
          updateContentRef.current = null;
        }, 900);
      },
      onSelectionUpdate: ({ editor }) => {
        if (selectionAnalyzeTimerRef.current) {
          window.clearTimeout(selectionAnalyzeTimerRef.current);
        }
        selectionAnalyzeTimerRef.current = window.setTimeout(() => {
          const { from } = editor.state.selection;
          const $pos = editor.state.doc.resolve(from);
          const node = $pos.nodeAfter || $pos.nodeBefore || $pos.parent;
          if (!(node && (node.isText || node.textContent))) {
            return;
          }

          const text = node.textContent || "";
          if (text.length < 2) {
            return;
          }
          const now = Date.now();
          if (
            text === lastSelectionSampleRef.current &&
            now - lastSelectionEmitAtRef.current < 800
          ) {
            return;
          }
          lastSelectionSampleRef.current = text;
          lastSelectionEmitAtRef.current = now;

          const charStore = useCharacterStore.getState();
          const termStore = useTermStore.getState();

          const char = charStore.characters.find((c: Character) =>
            text.includes(c.name),
          );
          if (char) {
            EditorSyncBus.emit("FOCUS_ENTITY", { entityId: char.id });
            return;
          }
          const term = termStore.terms.find((termItem: Term) =>
            text.includes(termItem.term),
          );
          if (term) {
            EditorSyncBus.emit("FOCUS_ENTITY", { entityId: term.id });
          }
        }, 120);
      },
      editorProps: {
        attributes: {
          class: "tiptap flex-1 flex flex-col outline-none h-full",
          style: `font-family: ${fontFamilyCss}; font-size: ${fontSize}px; line-height: ${lineHeight};`,
        },
        handleClick: handleSmartLinkClick,
      },
    },
    [extensions, fontFamilyCss, fontSize, lineHeight],
  );

  useTypewriterScroll(editor, !readOnly);

  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(isUsableEditor(editor) ? editor : null);
    }
    return () => {
      if (onEditorReady) {
        onEditorReady(null);
      }
    };
  }, [editor, onEditorReady]);

  // Handle JUMP_TO_MENTION from World Graph
  useEffect(() => {
    if (!editor) return undefined;
    const handleJump = (payload: { entityId: string }) => {
      const charStore = useCharacterStore.getState();
      const termStore = useTermStore.getState();
      const char = charStore.characters.find(
        (item: Character) => item.id === payload.entityId,
      );
      const term = termStore.terms.find(
        (item: Term) => item.id === payload.entityId,
      );
      // Note: Factions/Events/Places etc might need to be resolved via worldEntity store
      // but for now characters and terms are the main searchable entities.
      const name = char?.name || term?.term;

      if (name) {
        const docText = editor.getText();
        const normalizedText = docText.toLowerCase();
        const normalizedQuery = name.toLowerCase().trim();
        const index =
          normalizedQuery.length > 0
            ? normalizedText.indexOf(normalizedQuery)
            : -1;

        if (index >= 0) {
          editor.commands.focus();
          editor.commands.setTextSelection({
            from: index + 1, // Tiptap ranges generally start around 1 for text depending on node structure, but we do our best estimate here.
            to: index + normalizedQuery.length + 1,
          });
          setTimeout(() => {
            if (editor.view) {
              editor.view.dispatch(editor.state.tr.scrollIntoView());
            }
          }, 50);
        }
      }
    };
    EditorSyncBus.on("JUMP_TO_MENTION", handleJump);
    return () => EditorSyncBus.off("JUMP_TO_MENTION", handleJump);
  }, [editor]);

  // ... (Diff effect) ...
  useEffect(() => {
    if (!editor) return;
    if (editor.commands.setDiff) {
      editor.commands.setDiff({
        comparisonContent,
        mode: diffMode,
      });
    }
  }, [editor, comparisonContent, diffMode]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== initialContent) {
      let cancelled = false;
      editor.commands.setContent(initialContent);
      queueMicrotask(() => {
        if (cancelled) return;
        setContent(initialContent);
      });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, chapterId]);

  useEffect(() => {
    if (!editor || !chapterId) return;
    const pendingQuery = consumePendingEditorFocusQuery(chapterId);
    if (!pendingQuery) return;

    const timer = window.setTimeout(() => {
      const text = editor.getText();
      const normalizedText = text.toLowerCase();
      const normalizedQuery = pendingQuery.toLowerCase().trim();
      const index =
        normalizedQuery.length > 0
          ? normalizedText.indexOf(normalizedQuery)
          : -1;

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
      style={{
        "--entity-character-color": entityColors?.character ?? "#2563eb",
        "--entity-event-color": entityColors?.event ?? "#d97706",
        "--entity-faction-color": entityColors?.faction ?? "#059669",
        "--entity-term-color": entityColors?.term ?? "#7c3aed",
        // 자간/어간: CSS custom property로 주입 → editorProps dep array 무관하게 reactive
        "--editor-letter-spacing": `${letterSpacing}em`,
        "--editor-word-spacing": `${wordSpacing}em`,
        "--editor-line-height": String(lineHeight),
        "--editor-paragraph-spacing": `${paragraphSpacing}em`,
        "--editor-page-width": `${maxWidth ?? 800}px`,
      } as React.CSSProperties}
    >
      {!hideToolbar && (
        <div className="shrink-0 border-b border-border z-10">
          {!readOnly && (
            <EditorToolbar
              editor={editor}
              isMobileView={isMobileView}
              onToggleMobileView={() => setIsMobileView(!isMobileView)}
              onOpenPreview={handleOpenExport}
              onOpenExport={handleOpenExport}
              canOpenExport={Boolean(chapterId)}
              onOpenWorldGraph={onOpenWorldGraph}
            />
          )}
        </div>
      )}

      {/* Conditionally Scrollable Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center min-h-0",
          scrollable ? "overflow-y-scroll px-10 py-5" : "",
        )}
        data-editor-scroll-container={scrollable ? "true" : undefined}
      >
        <div
          className={cn(
            "w-full mx-auto flex flex-col flex-1 min-h-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent border-none shadow-none m-0",
            isMobileView &&
              "h-[95%] mx-auto my-5 border-8 border-[#2c2c2e] rounded-[48px] bg-editor-bg shadow-[0_0_0_2px_rgba(69,69,69,0.9),0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden relative",
            // If not scrollable (Docs mode), we don't want h-full constraining it, we want it to check mobile view or just flow
            !scrollable && "h-auto",
          )}
          data-mobile={isMobileView}
          style={{
            width: isMobileView ? "450px" : "min(100%, var(--editor-page-width))",
            maxWidth: isMobileView ? "450px" : "var(--editor-page-width)",
          }}
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
                readOnly && "pointer-events-none opacity-80",
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
              isMobileView && "pt-8 h-full overflow-hidden px-6",
            )}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight,
              "--editor-font-size": `${fontSize}px`,
              height: isMobileView ? "100%" : undefined,
              minHeight: !isMobileView
                ? "var(--text-editor-min-height)"
                : undefined,
            } as React.CSSProperties}
            data-testid="editor-content"
          >
            <EditorContent
              editor={editor}
              className={cn(
                "tiptap w-full outline-none",
                scrollable || isMobileView
                  ? "flex h-full flex-1 flex-col"
                  : "block h-auto",
              )}
            />
            {editor && <EditorBubbleMenu editor={editor} />}
          </div>
        </div>
      </div>

      {!hideFooter && <StatusFooter onOpenExport={handleOpenExport} />}
    </div>
  );
}

export default memo(Editor);

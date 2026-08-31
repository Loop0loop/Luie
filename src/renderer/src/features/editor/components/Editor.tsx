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
  hideTitle?: boolean;
  scrollable?: boolean;
  autoHeight?: boolean;
  focusMode?: boolean;
  mobileView?: boolean;
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
  hideTitle = false,
  scrollable = true,
  autoHeight = false,
  focusMode = false,
  mobileView,
  onEditorReady,
  onOpenWorldGraph,
}: EditorProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { fontFamilyCss, fontSize, lineHeight, letterSpacing, wordSpacing, paragraphSpacing, getFontFamily } =
    useEditorConfig();
  const entityColors = useEditorStore((state) => state.entityColors);
  const maxWidth = useEditorStore((state) => state.maxWidth);
  const typewriterMode = useEditorStore(
    (state) => state.typewriterMode ?? false,
  );
  const { updateStats } = useEditorStats();
  const [localMobileView, setLocalMobileView] = useState(false);
  const isMobileView = mobileView ?? localMobileView;

  const { value: title, onChange: handleTitleChange } = useBufferedInput(
    initialTitle,
    () => {
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
          class: "tiptap outline-hidden",
          style: `font-family: ${fontFamilyCss}; font-size: ${fontSize}px; line-height: ${lineHeight};`,
        },
        handleClick: handleSmartLinkClick,
      },
    },
    [extensions, fontFamilyCss, fontSize, lineHeight],
  );

  useTypewriterScroll(editor, !readOnly && typewriterMode);

  // NOTE: ready 리포트는 "새 인스턴스 확정" 시점에만 수행하고 언마운트 시 무효화를
  // 되돌려주지 않는다. 캔버스 진입처럼 라우트 교체로 언마운트 → 마운트가 이어질 때
  // 이전 Editor의 null 되돌려주기가 새 Editor의 ready보다 나중에 커밋되면
  // EditorRoot.docEditor가 영구 stale/null로 남는다(hover 시 빈 막대만 뜨던 증상).
  // 유효성은 소비자(EditorToolbar의 isUsableEditor)가 항상 검사하므로 여기서는
  // 절대 파괴적 write-back을 하지 않는다.
  useEffect(() => {
    if (!onEditorReady) return undefined;
    onEditorReady(isUsableEditor(editor) ? editor : null);
    return undefined;
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!isUsableEditor(editor)) return undefined;
    const handleJump = (payload: { entityId: string }) => {
      const charStore = useCharacterStore.getState();
      const termStore = useTermStore.getState();
      const char = charStore.characters.find(
        (item: Character) => item.id === payload.entityId,
      );
      const term = termStore.terms.find(
        (item: Term) => item.id === payload.entityId,
      );
      // TODO: worldEntity store를 연결해 Character/Term 외 entity mention도 이동시킨다.
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
            from: index + 1,
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

  useEffect(() => {
    if (!isUsableEditor(editor)) return;
    if (editor.commands.setDiff) {
      editor.commands.setDiff({
        comparisonContent,
        mode: diffMode,
      });
    }
  }, [editor, comparisonContent, diffMode]);

  useEffect(() => {
    if (!isUsableEditor(editor)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chapter 전환 때만 외부 content를 반영해 local edit 덮어쓰기를 막는다.
  }, [editor, chapterId]);

  useEffect(() => {
    if (!isUsableEditor(editor) || !chapterId) return;
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
      className={cn(
        "relative box-border flex w-full flex-col bg-app text-fg",
        autoHeight ? "h-auto overflow-visible" : "h-full overflow-hidden",
        !hideToolbar && !hideFooter && "rounded-editor-shell border border-l-0 border-border",
      )}
      data-testid="editor"
      style={{
        "--entity-character-color": entityColors?.character ?? "#2563eb",
        "--entity-event-color": entityColors?.event ?? "#d97706",
        "--entity-faction-color": entityColors?.faction ?? "#059669",
        "--entity-term-color": entityColors?.term ?? "#7c3aed",
        // NOTE: letter/word spacing은 editor 재생성 없이 반영하도록 CSS variable로 전달한다.
        "--editor-letter-spacing": `${letterSpacing}em`,
        "--editor-word-spacing": `${wordSpacing}em`,
        "--editor-line-height": String(lineHeight),
        "--editor-paragraph-spacing": `${paragraphSpacing}em`,
        "--editor-page-width": `${maxWidth ?? 800}px`,
        "--editor-scroll-padding": typewriterMode ? "25vh" : "120px",
        "--editor-typewriter-tail-space": typewriterMode ? "25vh" : "0px",
      } as React.CSSProperties}
    >
      {!hideToolbar && (
        <div className="shrink-0 z-10">
          {!readOnly && (
            <EditorToolbar
              editor={editor}
              isMobileView={isMobileView}
              onToggleMobileView={() => setLocalMobileView((current) => !current)}
              onOpenPreview={handleOpenExport}
              onOpenExport={handleOpenExport}
              canOpenExport={Boolean(chapterId)}
              onOpenWorldGraph={onOpenWorldGraph}
            />
          )}
        </div>
      )}

      <div
        className={cn(
          autoHeight
            ? "flex w-full flex-col items-center"
            : "flex-1 flex min-h-0 flex-col items-center",
          scrollable ? "overflow-y-scroll px-10 py-5" : "",
        )}
        data-editor-scroll-container={scrollable ? "true" : undefined}
      >
        <div
          className={cn(
            "mx-auto flex w-full flex-col bg-transparent m-0 border-none shadow-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
            !autoHeight && "flex-1 min-h-0",
            isMobileView &&
              "h-[95%] mx-auto my-5 border-8 border-[#2c2c2e] rounded-[48px] bg-editor-bg shadow-[0_0_0_2px_rgba(69,69,69,0.9),0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden relative",
            // NOTE: Docs desktop만 자연 높이를 사용한다. 모바일 프레임은 내부 스크롤을 위해 고정 높이가 필요하다.
            !scrollable && !isMobileView && "h-auto",
          )}
          data-mobile={isMobileView}
          style={{
            width: isMobileView ? "450px" : "min(100%, var(--editor-page-width))",
            maxWidth: isMobileView ? "450px" : "var(--editor-page-width)",
          }}
        >
          {isMobileView && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-30 h-8 bg-[#2c2c2e] rounded-b-2xl z-100 pointer-events-none" />
          )}

          {!hideTitle && (
            <input
              type="text"
              className={cn(
                "w-full border-none bg-transparent pb-4 text-2xl font-bold text-fg outline-hidden shrink-0 placeholder:text-muted",
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

          <div
            className={cn(
              autoHeight ? "relative flex flex-none flex-col" : "relative flex flex-1 flex-col",
              isMobileView && "h-full overflow-y-auto px-6 pt-8",
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
                "tiptap w-full outline-hidden",
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

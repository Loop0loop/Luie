import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import UnderlineExtension from "@tiptap/extension-underline";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import { Markdown } from "tiptap-markdown";
import { Callout, SlashCommand } from "@renderer/features/editor/components/hooks/useEditorExtensions";
import { useEditorConfig } from "@renderer/features/editor/hooks/useEditorConfig";
import EditorToolbar from "@renderer/features/editor/components/EditorToolbar";
import { Bold, Italic, Underline, Strikethrough, Highlighter } from "lucide-react";
import { cn } from "@shared/types/utils";

type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

const AUTOSAVE_DELAY_MS = 500;

export function CanvasMarkdownEditor({
  initialMarkdown,
  onSave,
  children,
}: {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
  children?: React.ReactNode;
}) {


  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const [, forceUpdate] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      UnderlineExtension,
      Callout,
      Details.configure({ persist: true, HTMLAttributes: { class: "toggle" } }),
      DetailsSummary,
      DetailsContent,
      SlashCommand,
      Markdown.configure({ html: false }),
    ],
    content: initialMarkdown,
    editorProps: { attributes: { class: "ProseMirror" } },
    onUpdate: ({ editor }) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        onSaveRef.current(getMarkdown(editor.storage, editor.getText()));
      }, AUTOSAVE_DELAY_MS);
      forceUpdate({});
    },
    onSelectionUpdate: () => {
      forceUpdate({});
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current === null) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (editor) onSaveRef.current(getMarkdown(editor.storage, editor.getText()));
    };
  }, [editor]);

  const { fontFamilyCss } = useEditorConfig();

  return (
    <div
      className="canvas-document-editor text-fg flex flex-col"
      style={{ fontFamily: fontFamilyCss }}
    >
      {/* Notion-style Floating Bubble Menu */}
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top" }}
          className="flex items-center gap-0.5 rounded-control border border-border bg-panel p-0.5 shadow-md z-dropdown animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-control transition-colors",
              editor.isActive("bold") ? "bg-active text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            )}
            title="굵게"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-control transition-colors",
              editor.isActive("italic") ? "bg-active text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            )}
            title="기울임"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-control transition-colors",
              editor.isActive("underline") ? "bg-active text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            )}
            title="밑줄"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-control transition-colors",
              editor.isActive("strike") ? "bg-active text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            )}
            title="취소선"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-3.5 bg-border/80 mx-0.5" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-control transition-colors",
              editor.isActive("highlight") ? "bg-active text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            )}
            title="형광펜"
          >
            <Highlighter className="h-4 w-4" />
          </button>
        </BubbleMenu>
      )}

      {/* 에디터 툴바 (맨 위에 노출 - 노션 스타일) */}
      {editor && (
        <div className="sticky top-0 z-20 w-full bg-panel border-b border-border/40">
          <EditorToolbar
            editor={editor}
            hideCanvasToggle={true}
            className="bg-transparent px-4 py-1.5 justify-start"
          />
        </div>
      )}

      {/* 제목 및 속성 등의 상단 메타데이터 영역 */}
      {children}

      {/* 에디터 본문 영역 */}
      <div className="mt-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function getMarkdown(storage: unknown, fallback: string): string {
  return (storage as MarkdownStorage).markdown?.getMarkdown?.() ?? fallback;
}

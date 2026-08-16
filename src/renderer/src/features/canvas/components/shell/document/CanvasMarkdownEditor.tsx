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
import { registerSaveBufferFlush } from "@shared/ui/saveBufferRegistry";

type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

const AUTOSAVE_DELAY_MS = 500;

const consumeBackgroundSave = (result: void | Promise<unknown>): void => {
  void Promise.resolve(result).catch(() => undefined);
};

const preserveUnmountSave = (
  initial: void | Promise<unknown>,
  retry: () => void | Promise<unknown>,
): void => {
  let current: Promise<unknown> | null = Promise.resolve(initial);
  let unregister: () => void = () => undefined;
  const flush = async (): Promise<void> => {
    if (!current) current = Promise.resolve().then(retry);
    try {
      await current;
      unregister();
    } catch (error) {
      current = null;
      throw error;
    }
  };
  unregister = registerSaveBufferFlush(flush);
  consumeBackgroundSave(flush());
};

export function CanvasMarkdownEditor({
  initialMarkdown,
  onSave,
  children,
}: {
  initialMarkdown: string;
  onSave: (markdown: string) => void | Promise<unknown>;
  children?: React.ReactNode;
}) {
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const latestMarkdown = useRef(initialMarkdown);
  const lastSavedMarkdown = useRef(initialMarkdown);
  const inFlightSave = useRef<{
    markdown: string;
    promise: Promise<void>;
  } | null>(null);
  const flushRef = useRef<() => void | Promise<void>>(() => undefined);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const [, forceUpdate] = useState({});

  const cancelScheduledSave = () => {
    if (saveTimer.current === null) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
  };

  const flush = (markdown = latestMarkdown.current): void | Promise<void> => {
    cancelScheduledSave();
    const inFlight = inFlightSave.current;
    if (inFlight) {
      if (markdown === inFlight.markdown) return inFlight.promise;
      return inFlight.promise.then(async () => {
        await flushRef.current();
      });
    }
    if (markdown === lastSavedMarkdown.current) return;

    let result: void | Promise<unknown>;
    try {
      result = onSaveRef.current(markdown);
    } catch (error) {
      result = Promise.reject(error);
    }
    const promise = Promise.resolve(result)
      .then(() => {
        lastSavedMarkdown.current = markdown;
      })
      .finally(() => {
        if (inFlightSave.current?.promise === promise) {
          inFlightSave.current = null;
        }
      });
    inFlightSave.current = { markdown, promise };
    return promise;
  };

  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(
    () =>
      registerSaveBufferFlush(async () => {
        await flushRef.current();
      }),
    [],
  );

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
      const markdown = getMarkdown(editor.storage, editor.getText());
      latestMarkdown.current = markdown;
      cancelScheduledSave();
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        consumeBackgroundSave(flushRef.current());
      }, AUTOSAVE_DELAY_MS);
      forceUpdate({});
    },
    onSelectionUpdate: () => {
      forceUpdate({});
    },
  });

  useEffect(() => {
    return () => {
      cancelScheduledSave();
      const markdown = latestMarkdown.current;
      if (markdown === lastSavedMarkdown.current && !inFlightSave.current)
        return;
      preserveUnmountSave(flushRef.current(), () =>
        onSaveRef.current(markdown),
      );
    };
  }, []);

  const { fontFamilyCss } = useEditorConfig();

  return (
    <div
      className="canvas-document-editor text-fg flex flex-col"
      style={{ fontFamily: fontFamilyCss }}
    >
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
            onClick={() => editor.chain().focus().toggleHighlight({ color: "var(--highlight-default)" }).run()}
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

      {editor && (
        <div className="sticky top-0 z-20 w-full bg-panel border-b border-border/40">
          <EditorToolbar
            editor={editor}
            hideCanvasToggle={true}
            className="bg-transparent px-4 py-1.5 justify-start"
          />
        </div>
      )}

      {children}

      <div className="mt-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function getMarkdown(storage: unknown, fallback: string): string {
  return (storage as MarkdownStorage).markdown?.getMarkdown?.() ?? fallback;
}

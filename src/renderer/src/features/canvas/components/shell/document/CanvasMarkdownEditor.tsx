import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import { Markdown } from "tiptap-markdown";
import { Callout, SlashCommand } from "@renderer/features/editor/components/hooks/useEditorExtensions";
import { useEditorConfig } from "@renderer/features/editor/hooks/useEditorConfig";

type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

const AUTOSAVE_DELAY_MS = 500;

export function CanvasMarkdownEditor({
  initialMarkdown,
  onSave,
}: {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
}) {
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
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
      className="canvas-document-editor mt-12 text-fg"
      style={{ fontFamily: fontFamilyCss }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

function getMarkdown(storage: unknown, fallback: string): string {
  return (storage as MarkdownStorage).markdown?.getMarkdown?.() ?? fallback;
}

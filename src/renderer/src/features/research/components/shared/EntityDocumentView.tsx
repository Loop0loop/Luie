import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface EntityDocumentViewProps {
  /** Stored document HTML. */
  value: string;
  /** Autosaved (debounced) document HTML. */
  onSave: (html: string) => void;
  placeholder: string;
}

const AUTOSAVE_DELAY_MS = 600;

/**
 * Free-form writing surface for an entity ("문서" mode) — a quiet alternative to
 * the structured wiki view for writers unfamiliar with the infobox/section format.
 * A minimal TipTap instance; the owning view keys it by entity id so content
 * initialises once per entity.
 */
export function EntityDocumentView({
  value,
  onSave,
  placeholder,
}: EntityDocumentViewProps) {
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: value || "",
    editorProps: {
      attributes: { class: "ProseMirror focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        onSaveRef.current(editor.getHTML());
      }, AUTOSAVE_DELAY_MS);
    },
  });

  // Flush any pending save when leaving the document.
  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        if (editor) onSaveRef.current(editor.getHTML());
      }
    };
  }, [editor]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="tiptap entity-document mx-auto w-full max-w-[680px] px-2 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

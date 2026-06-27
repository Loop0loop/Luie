import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { BufferedInput } from "@shared/ui/BufferedInput";
import type { WikiSectionData } from "@renderer/features/research/components/wiki/types";

/** tiptap-markdown augments editor.storage at runtime; type it locally. */
type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

/** A property row shown in the document header. */
export type DocumentPropertyRow = {
  label: string;
  value?: string;
  placeholder?: string;
  onSave?: (value: string) => void;
  readonlyValue?: string;
};

type NotionDocumentViewProps = {
  properties: DocumentPropertyRow[];
  sections: WikiSectionData[];
  getSectionContent: (id: string) => string;
  setSections: (sections: WikiSectionData[]) => void;
  setSectionContent: (id: string, value: string) => void;
  bodyPlaceholder: string;
};

const AUTOSAVE_DELAY_MS = 500;

/**
 * Notion-style document view shared by all entity types. The header is a list
 * of property rows; the body is ONE Markdown document where each wiki section
 * is an `# h1` heading. h1 headings map 1:1 to wiki sections, so editing here
 * (rename/add/remove a heading, edit body) writes straight back to `sections`
 * + their content strings — the exact data the wiki view reads.
 */
export default function NotionDocumentView({
  properties,
  sections,
  getSectionContent,
  setSections,
  setSectionContent,
  bodyPlaceholder,
}: NotionDocumentViewProps) {
  // Compose into one markdown document — once per mount; the parent keys this
  // view by entity id (re-mount on switch).
  const [initialBody] = useState(() =>
    sections
      .map((s) => `# ${s.label}\n\n${getSectionContent(s.id)}`.trim())
      .join("\n\n"),
  );

  const saveBody = (markdown: string) => {
    const { sections: nextSections, contentById } = decomposeBody(markdown, sections);
    setSections(nextSections);
    for (const [id, content] of Object.entries(contentById)) {
      setSectionContent(id, content);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-2 py-2 flex flex-col gap-8">
        {/* ── Properties ─────────────────────────────────────────────── */}
        <div className="flex flex-col">
          {properties.map((row) => (
            <PropertyRow key={row.label} label={row.label} readonlyValue={row.readonlyValue}>
              {row.onSave ? (
                <BufferedInput
                  className="w-full bg-transparent border-none p-0 text-[14px] text-fg focus:outline-none placeholder:text-muted/40"
                  value={row.value ?? ""}
                  placeholder={row.placeholder ?? ""}
                  onSave={row.onSave}
                />
              ) : null}
            </PropertyRow>
          ))}
        </div>

        {/* ── Body: one Markdown document; # headings = wiki sections ── */}
        <MarkdownDocumentEditor
          initialMarkdown={initialBody}
          placeholder={bodyPlaceholder}
          onSave={saveBody}
        />
      </div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
  readonlyValue,
}: {
  label: string;
  children?: React.ReactNode;
  readonlyValue?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-b-0">
      <span className="w-24 shrink-0 text-[12px] text-muted/80 pt-1">{label}</span>
      <div className="flex-1 min-w-0">
        {readonlyValue !== undefined ? (
          <span className="text-[14px] text-fg">{readonlyValue}</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function MarkdownDocumentEditor({
  initialMarkdown,
  placeholder,
  onSave,
}: {
  initialMarkdown: string;
  placeholder: string;
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
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false }),
    ],
    content: initialMarkdown,
    editorProps: { attributes: { class: "ProseMirror focus:outline-none" } },
    onUpdate: ({ editor }) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const md =
          (editor.storage as MarkdownStorage).markdown?.getMarkdown?.() ??
          editor.getText();
        onSaveRef.current(md);
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        if (editor) {
          const md =
            (editor.storage as MarkdownStorage).markdown?.getMarkdown?.() ??
            editor.getText();
          onSaveRef.current(md);
        }
      }
    };
  }, [editor]);

  return (
    <div className="tiptap entity-document">
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Split a markdown document into wiki sections by top-level `#` headings.
 * Section ids are matched to the existing sections by order so wiki references
 * (and per-section content keys) are preserved across edits.
 */
function decomposeBody(
  markdown: string,
  oldSections: WikiSectionData[],
): { sections: WikiSectionData[]; contentById: Record<string, string> } {
  const lines = markdown.split("\n");
  const parsed: Array<{ label: string; content: string[] }> = [];
  let current: { label: string; content: string[] } | null = null;

  for (const line of lines) {
    const heading = /^#\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { label: heading[1], content: [] };
      parsed.push(current);
    } else if (current) {
      current.content.push(line);
    }
    // Text before the first heading has no section and is dropped.
  }

  const sections: WikiSectionData[] = parsed.map((p, index) => ({
    id: oldSections[index]?.id ?? `section_${Date.now()}_${index}`,
    label: p.label,
  }));

  const contentById: Record<string, string> = {};
  parsed.forEach((p, index) => {
    contentById[sections[index].id] = p.content.join("\n").trim();
  });

  return { sections, contentById };
}

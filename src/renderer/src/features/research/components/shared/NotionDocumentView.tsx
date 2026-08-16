import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { BufferedInput } from "@shared/ui/BufferedInput";
import {
  preserveUnmountSave,
  registerSaveBufferFlush,
} from "@shared/ui/saveBufferRegistry";
import type { WikiSectionData } from "@renderer/features/research/components/wiki/types";

// NOTE: tiptap-markdown이 runtime에 확장하는 storage만 local type으로 제한한다.
type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

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
  setSections: (sections: WikiSectionData[]) => void | Promise<unknown>;
  setSectionContent: (id: string, value: string) => void | Promise<unknown>;
  bodyPlaceholder: string;
  header?: ReactNode;
};

const AUTOSAVE_DELAY_MS = 500;

const consumeBackgroundSave = (result: void | Promise<unknown>): void => {
  void Promise.resolve(result).catch(() => undefined);
};

/** 최상위 `#` heading과 wiki section을 1:1로 동기화하는 document editor. */
export default function NotionDocumentView({
  properties,
  sections,
  getSectionContent,
  setSections,
  setSectionContent,
  bodyPlaceholder,
  header,
}: NotionDocumentViewProps) {
  // NOTE: parent가 entity id로 remount하므로 초기 문서는 mount당 한 번만 조합한다.
  // 빈 섹션이라도 헤딩 아래에 플레이스홀더 문단이 렌더링되도록 공백 문단을 유지한다.
  const [initialBody] = useState(() =>
    sections
      .map((s) => {
        const content = getSectionContent(s.id);
        return content && content.trim().length > 0
          ? `# ${s.label}\n\n${content}`
          : `# ${s.label}\n\n`;
      })
      .join("\n\n"),
  );

  const saveBody = async (markdown: string): Promise<void> => {
    const { sections: nextSections, contentById } = decomposeBody(markdown, sections);
    const saves: Promise<unknown>[] = [];
    const collectSave = (save: () => void | Promise<unknown>): void => {
      try {
        saves.push(Promise.resolve(save()));
      } catch (error) {
        saves.push(Promise.reject(error));
      }
    };
    collectSave(() => setSections(nextSections));
    for (const [id, content] of Object.entries(contentById)) {
      collectSave(() => setSectionContent(id, content));
    }
    const results = await Promise.allSettled(saves);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] px-3 py-3 flex flex-col gap-6">
        {header}
        
        {/* Notion Style Properties Table */}
        <div className="flex flex-col rounded-panel border border-border/60 bg-surface/40 p-2 shadow-2xs">
          {properties.map((row) => (
            <PropertyRow key={row.label} label={row.label} readonlyValue={row.readonlyValue}>
              {row.onSave ? (
                <BufferedInput
                  className="w-full bg-transparent border-none p-0 text-xs text-fg focus:outline-none placeholder:text-subtle/50"
                  value={row.value ?? ""}
                  placeholder={row.placeholder ?? "비어 있음"}
                  onSave={row.onSave}
                />
              ) : null}
            </PropertyRow>
          ))}
        </div>

        {/* Document Markdown Body */}
        <div className="pt-2">
          <MarkdownDocumentEditor
            initialMarkdown={initialBody}
            placeholder={bodyPlaceholder}
            onSave={saveBody}
          />
        </div>
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
    <div className="grid grid-cols-[110px_1fr] items-center gap-2 px-2.5 py-1.5 rounded-control transition-colors hover:bg-surface-hover/80 border-b border-border/20 last:border-b-0">
      <span className="text-xs font-medium text-muted truncate select-none">{label}</span>
      <div className="min-w-0 flex items-center">
        {readonlyValue !== undefined ? (
          <span className="text-xs text-fg font-medium">{readonlyValue || "—"}</span>
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
  onSave: (markdown: string) => void | Promise<unknown>;
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
    () => registerSaveBufferFlush(() => flushRef.current()),
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        showOnlyCurrent: true,
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "" : placeholder,
      }),
      Markdown.configure({ html: false }),
    ],
    content: initialMarkdown,
    editorProps: { attributes: { class: "ProseMirror focus:outline-none" } },
    onUpdate: ({ editor }) => {
      const markdown =
        (editor.storage as MarkdownStorage).markdown?.getMarkdown?.() ??
        editor.getText();
      latestMarkdown.current = markdown;
      cancelScheduledSave();
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        consumeBackgroundSave(flushRef.current());
      }, AUTOSAVE_DELAY_MS);
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

  return (
    <div className="tiptap entity-document">
      <EditorContent editor={editor} />
    </div>
  );
}

/** 최상위 `#` heading 기준으로 분리하며 기존 section id는 순서대로 보존한다. */
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

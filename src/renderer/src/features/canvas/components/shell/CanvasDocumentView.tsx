import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { AlignLeft, FileText, GitBranch, Tag, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import { Markdown } from "tiptap-markdown";
import "@renderer/styles/components/canvas.css";
import { BufferedInput } from "@shared/ui/BufferedInput";
import {
  Callout,
  SlashCommand,
} from "@renderer/features/editor/components/hooks/useEditorExtensions";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import type { CanvasEntityPreview } from "../../types";

type EntityKind = Exclude<CanvasEntityPreview["kind"], "memo">;
type CanvasSection = { id: string; label: string };
type MarkdownStorage = { markdown?: { getMarkdown?: () => string } };

const CANVAS_DOCUMENT_MARKDOWN_KEY = "canvasDocumentMarkdown";
const AUTOSAVE_DELAY_MS = 500;

const DEFAULT_SECTIONS: Record<EntityKind, CanvasSection[]> = {
  character: [
    { id: "overview", label: "기본 정보" },
    { id: "physical", label: "외적 특징 (Physical Traits)" },
    { id: "personality", label: "성격적 특징 (Personality)" },
    { id: "arc", label: "성장의 여정 (Character Arc)" },
    { id: "speech", label: "대사 / 말투 특징 (Speech Pattern)" },
  ],
  event: [
    { id: "overview", label: "기본 정보" },
    { id: "timeline", label: "진행 흐름 (Timeline)" },
    { id: "participants", label: "참여 인물 (Participants)" },
    { id: "notes", label: "메모 (Notes)" },
  ],
  faction: [
    { id: "overview", label: "기본 정보" },
    { id: "organization", label: "조직 구조 (Organization)" },
    { id: "relations", label: "관계 (Relations)" },
    { id: "notes", label: "메모 (Notes)" },
  ],
};

interface CanvasDocumentViewProps {
  preview: CanvasEntityPreview;
  onClose: () => void;
}

export default function CanvasDocumentView({
  preview,
  onClose,
}: CanvasDocumentViewProps) {
  if (preview.kind === "memo") {
    return <MemoDocumentView memoId={preview.id} onClose={onClose} />;
  }

  return <EntityDocumentView preview={preview} onClose={onClose} />;
}

function EntityDocumentView({
  preview,
  onClose,
}: {
  preview: Extract<CanvasEntityPreview, { kind: EntityKind }>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const entityState = useCanvasEntity(preview);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  useEffect(() => {
    void entityState.load(preview.id);
  }, [entityState.load, preview.id]);

  useEffect(() => {
    setDescriptionDraft(entityState.entity?.description ?? "");
  }, [entityState.entity?.description, entityState.entity?.id]);

  if (!entityState.entity) {
    return (
      <DocumentShell
        kindLabel={getKindLabel(preview.kind, t)}
        title={getKindLabel(preview.kind, t)}
        onClose={onClose}
      >
        <div className="flex h-full items-center justify-center text-sm text-muted">
          {t("canvas.preview.entityNotFound", "문서를 찾을 수 없습니다.")}
        </div>
      </DocumentShell>
    );
  }

  const entity = entityState.entity;
  const attrs = parseStructuredAttributes(entity.attributes);
  const sections = getSections(preview.kind, attrs);
  const initialMarkdown =
    getString(attrs[CANVAS_DOCUMENT_MARKDOWN_KEY]) ||
    composeMarkdown(sections, attrs);
  const updateAttributes = (updates: Record<string, unknown>) => {
    void entityState.update({
      id: entity.id,
      attributes: { ...attrs, ...updates },
    });
  };

  return (
    <DocumentShell
      kindLabel={getKindLabel(preview.kind, t)}
      title={entity.name}
      onClose={onClose}
    >
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasContextBar
          kindLabel={getKindLabel(preview.kind, t)}
          firstAppearance={entity.firstAppearance}
          updatedAt={entity.updatedAt}
        />
        <BufferedInput
          className="mt-5 w-full border-none bg-transparent p-0 text-[40px] font-bold leading-tight tracking-normal text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
          value={entity.name}
          placeholder={t("canvas.document.titlePlaceholder", "제목 없음")}
          onSave={(name) => void entityState.update({ id: entity.id, name })}
        />

        <ReferenceStrip
          attrs={attrs}
          description={entity.description}
          firstAppearance={entity.firstAppearance}
        />

        <div className="mt-8 flex flex-col gap-4">
          <PropertyLine
            icon={<AlignLeft className="h-4 w-4" />}
            label={t("canvas.document.description", "집필 요약")}
          >
            <textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={() =>
                void entityState.update({
                  id: entity.id,
                  description: descriptionDraft,
                })
              }
              className="min-h-7 w-full resize-none border-none bg-transparent p-0 text-[15px] leading-7 text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
              placeholder={t(
                "canvas.document.descriptionPlaceholder",
                "짧은 설명을 입력하세요.",
              )}
            />
          </PropertyLine>

          <PropertyLine
            icon={<Tag className="h-4 w-4" />}
            label={t("canvas.document.tags", "검색 태그")}
          >
            <TagList value={getTagValues(attrs)} />
          </PropertyLine>
        </div>

        <CanvasMarkdownEditor
          key={`${preview.kind}:${entity.id}`}
          initialMarkdown={initialMarkdown}
          placeholder={t(
            "canvas.document.blockPlaceholder",
            "내용을 입력하세요. Markdown을 사용할 수 있습니다.",
          )}
          onSave={(markdown) =>
            updateAttributes({
              [CANVAS_DOCUMENT_MARKDOWN_KEY]: markdown,
              ...decomposeMarkdown(markdown, sections),
            })
          }
        />
      </article>
    </DocumentShell>
  );
}

function MemoDocumentView({
  memoId,
  onClose,
}: {
  memoId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const note = useMemoStore(
    (state) => state.notes.find((candidate) => candidate.id === memoId) ?? null,
  );
  const updateNote = useMemoStore((state) => state.updateNote);

  if (!note) {
    return (
      <DocumentShell
        kindLabel={t("research.title.scrap", "Scrap")}
        title={t("research.title.scrap", "Scrap")}
        onClose={onClose}
      >
        <div className="flex h-full items-center justify-center text-sm text-muted">
          {t("canvas.preview.memoNotFound", "메모를 찾을 수 없습니다.")}
        </div>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell
      kindLabel={t("research.title.scrap", "Scrap")}
      title={note.title}
      onClose={onClose}
    >
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasContextBar
          kindLabel={t("research.title.scrap", "Scrap")}
          updatedAt={note.updatedAt}
        />
        <BufferedInput
          className="mt-5 w-full border-none bg-transparent p-0 text-[40px] font-bold leading-tight tracking-normal text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
          value={note.title}
          placeholder={t("project.defaults.noteTitle")}
          onSave={(title) => updateNote(note.id, { title })}
        />
        <div className="mt-12 flex flex-col gap-4">
          <PropertyLine
            icon={<FileText className="h-4 w-4" />}
            label={t("research.title.scrap", "Scrap")}
          >
            <span>{t("canvas.document.synced", "동기화됨")}</span>
          </PropertyLine>
          <PropertyLine
            icon={<Tag className="h-4 w-4" />}
            label={t("memo.tags", "Tags")}
          >
            <TagList value={note.tags} />
          </PropertyLine>
        </div>
        <CanvasMarkdownEditor
          key={`memo:${note.id}`}
          initialMarkdown={note.content}
          placeholder={t(
            "canvas.preview.memoPlaceholder",
            "메모를 작성하세요. Markdown을 사용할 수 있습니다.",
          )}
          onSave={(content) => updateNote(note.id, { content })}
        />
      </article>
    </DocumentShell>
  );
}

function DocumentShell({
  children,
  kindLabel,
  title,
  onClose,
}: {
  children: React.ReactNode;
  kindLabel: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col bg-app text-fg"
      data-testid="canvas-document-view"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/30 bg-sidebar px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="text-muted">{t("canvas.activity.canvas")}</span>
          <span className="text-subtle">/</span>
          <span className="text-muted">{kindLabel}</span>
          <span className="text-subtle">/</span>
          <span className="truncate font-medium text-fg">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-control border-none bg-transparent text-muted transition-colors hover:bg-active hover:text-fg focus-visible:bg-active focus-visible:outline-none"
          title={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
          aria-label={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-panel">{children}</div>
    </div>
  );
}

function CanvasContextBar({
  firstAppearance,
  kindLabel,
  updatedAt,
}: {
  firstAppearance?: string | null;
  kindLabel: string;
  updatedAt?: string | Date | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5 font-medium text-fg">
        <GitBranch className="h-3.5 w-3.5 text-subtle" />
        캔버스 자료
      </span>
      <span className="text-subtle">/</span>
      <span>{kindLabel}</span>
      {firstAppearance ? (
        <>
          <span className="text-subtle">/</span>
          <span>첫 등장 {firstAppearance}</span>
        </>
      ) : null}
      {updatedAt ? (
        <>
          <span className="text-subtle">/</span>
          <span>수정 {formatDate(updatedAt)}</span>
        </>
      ) : null}
    </div>
  );
}

function ReferenceStrip({
  attrs,
  description,
  firstAppearance,
}: {
  attrs: Record<string, unknown>;
  description?: string | null;
  firstAppearance?: string | null;
}) {
  const summary = getString(attrs.tagline) || description || "";
  const roles = getStringArray(attrs.roles);
  const keywords = getStringArray(attrs.keywords);
  const tags = getTagValues(attrs);
  const chips = [...roles, ...keywords, ...tags].slice(0, 8);

  if (!summary && !firstAppearance && chips.length === 0) {
    return (
      <div className="mt-7 border-y border-border/50 py-4 text-sm text-subtle">
        캔버스와 동기화된 자료입니다. 필요한 집필 메모를 아래에 바로 정리하세요.
      </div>
    );
  }

  return (
    <div className="mt-7 flex flex-col gap-3 border-y border-border/50 py-4 text-sm">
      {summary ? <p className="m-0 leading-7 text-fg">{summary}</p> : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {firstAppearance ? (
          <MetaChip label={`첫 등장 ${firstAppearance}`} />
        ) : null}
        {chips.map((chip) => (
          <MetaChip key={chip} label={chip} />
        ))}
      </div>
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-control border border-border/50 bg-surface px-2.5 py-1 text-muted">
      {label}
    </span>
  );
}

function PropertyLine({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start gap-6 text-[15px] leading-7">
      <div className="flex w-[190px] shrink-0 items-center gap-4 text-muted">
        <span className="text-subtle">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-fg">{children}</div>
    </div>
  );
}

function TagList({ value }: { value: string[] }) {
  const tags = value.filter(Boolean);
  if (tags.length === 0) {
    return <span className="text-subtle">태그 없음</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-control border border-border/60 bg-surface px-2.5 py-1 text-sm text-fg"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CanvasMarkdownEditor({
  initialMarkdown,
  onSave,
  placeholder,
}: {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
  placeholder: string;
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
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: "toggle",
        },
      }),
      DetailsSummary,
      DetailsContent,
      Placeholder.configure({
        showOnlyCurrent: true,
        includeChildren: false,
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "" : placeholder,
      }),
      SlashCommand,
      Markdown.configure({ html: false }),
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: {
        class: "ProseMirror focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        onSaveRef.current(getMarkdown(editor.storage, editor.getText()));
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (editor) {
          onSaveRef.current(getMarkdown(editor.storage, editor.getText()));
        }
      }
    };
  }, [editor]);

  return (
    <div className="canvas-document-editor mt-16 text-fg">
      <EditorContent editor={editor} />
    </div>
  );
}

function getMarkdown(storage: unknown, fallback: string): string {
  return (storage as MarkdownStorage).markdown?.getMarkdown?.() ?? fallback;
}

function composeMarkdown(
  sections: CanvasSection[],
  attrs: Record<string, unknown>,
): string {
  return sections
    .map((section) => {
      const content = getString(attrs[section.id]).trim();
      return `# ${section.label}\n\n${content || getSectionPrompt(section.id)}`;
    })
    .join("\n\n");
}

function decomposeMarkdown(
  markdown: string,
  oldSections: CanvasSection[],
): Record<string, unknown> {
  const lines = markdown.split("\n");
  const parsed: Array<{ label: string; content: string[] }> = [];
  let current: { label: string; content: string[] } | null = null;

  for (const line of lines) {
    const heading = /^#\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { label: heading[1], content: [] };
      parsed.push(current);
      continue;
    }
    if (current) {
      current.content.push(line);
    }
  }

  if (parsed.length === 0) {
    return {};
  }

  const sections = parsed.map((section, index) => ({
    id: oldSections[index]?.id ?? `section_${Date.now()}_${index}`,
    label: section.label,
  }));
  const contentById: Record<string, string> = {};
  parsed.forEach((section, index) => {
    contentById[sections[index].id] = section.content.join("\n").trim();
  });

  return { sections, ...contentById };
}

function useCanvasEntity(
  preview: Extract<CanvasEntityPreview, { kind: EntityKind }>,
) {
  const character = useCharacterStore((state) =>
    preview.kind === "character"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const event = useEventStore((state) =>
    preview.kind === "event"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const faction = useFactionStore((state) =>
    preview.kind === "faction"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const characterIsLoading = useCharacterStore((state) => state.isLoading);
  const loadCharacter = useCharacterStore((state) => state.loadCharacter);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const eventIsLoading = useEventStore((state) => state.isLoading);
  const loadEvent = useEventStore((state) => state.loadEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const factionIsLoading = useFactionStore((state) => state.isLoading);
  const loadFaction = useFactionStore((state) => state.loadFaction);
  const updateFaction = useFactionStore((state) => state.updateFaction);

  if (preview.kind === "character") {
    return {
      entity: character,
      isLoading: characterIsLoading,
      load: loadCharacter,
      update: updateCharacter,
    };
  }
  if (preview.kind === "event") {
    return {
      entity: event,
      isLoading: eventIsLoading,
      load: loadEvent,
      update: updateEvent,
    };
  }
  return {
    entity: faction,
    isLoading: factionIsLoading,
    load: loadFaction,
    update: updateFaction,
  };
}

function getSections(
  kind: EntityKind,
  attrs: Record<string, unknown>,
): CanvasSection[] {
  const sections = attrs.sections;
  if (Array.isArray(sections)) {
    const parsed = sections
      .map((section) => {
        if (!section || typeof section !== "object") return null;
        const record = section as Record<string, unknown>;
        if (typeof record.id !== "string" || typeof record.label !== "string") {
          return null;
        }
        return { id: record.id, label: record.label };
      })
      .filter((section): section is CanvasSection => section !== null);
    if (parsed.length > 0) return parsed;
  }
  return DEFAULT_SECTIONS[kind];
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function getTagValues(attrs: Record<string, unknown>): string[] {
  return [...getStringArray(attrs.tags), ...getStringArray(attrs.keywords)];
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function getSectionPrompt(sectionId: string): string {
  const prompts: Record<string, string> = {
    overview:
      "- 집필 중 반드시 유지해야 할 사실\n- 장면에서 드러나는 역할\n- 독자가 기억해야 할 한 줄",
    physical: "- 장면에서 반복해서 보일 외형 단서\n- 복장, 소품, 몸짓",
    personality:
      "- 선택을 밀어붙이는 성향\n- 약점과 금기\n- 관계에서 드러나는 말투",
    arc: "- 처음 상태\n- 흔들리는 사건\n- 바뀌거나 끝까지 바뀌지 않는 지점",
    speech: "- 자주 쓰는 표현\n- 문장 길이와 리듬\n- 감정이 올라왔을 때의 변화",
    timeline: "- 원인\n- 전개\n- 결과",
    participants: "- 직접 관여한 인물\n- 영향을 받은 세력",
    organization: "- 구조\n- 권한\n- 외부에서 보이는 얼굴",
    relations: "- 우호\n- 적대\n- 거래 또는 약점",
    notes: "- 집필 중 확인할 메모",
  };
  return prompts[sectionId] ?? "- 집필 중 확인할 내용";
}

function getKindLabel(kind: EntityKind, t: TFunction): string {
  switch (kind) {
    case "character":
      return t("research.title.characters", "Characters");
    case "event":
      return t("research.title.events", "Events");
    case "faction":
      return t("research.title.factions", "Factions");
  }
}

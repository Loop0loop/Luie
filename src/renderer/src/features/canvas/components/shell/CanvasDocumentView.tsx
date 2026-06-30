import { useEffect, useState } from "react";
import { AlignLeft, FileText, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@renderer/styles/components/canvas.css";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import { useEditorConfig } from "@renderer/features/editor/hooks/useEditorConfig";
import type { CanvasEntityPreview } from "../../types";
import {
  CANVAS_DOCUMENT_MARKDOWN_KEY,
  composeMarkdown,
  decomposeMarkdown,
  getKindLabel,
  getSections,
  getString,
  getTagValues,
  type EntityKind,
} from "./document/canvasDocumentModel";
import {
  CanvasContextBar,
  DocumentShell,
  PropertyLine,
  TagList,
} from "./document/CanvasDocumentChrome";
import { CanvasMarkdownEditor } from "./document/CanvasMarkdownEditor";
import { useCanvasEntity } from "./document/useCanvasEntity";

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
  const kindLabel = getKindLabel(preview.kind, t);
  const { fontFamilyCss } = useEditorConfig();

  useEffect(() => {
    void entityState.load(preview.id);
  }, [entityState.load, preview.id]);

  useEffect(() => {
    // eslint-disable-next-line
    setDescriptionDraft(entityState.entity?.description ?? "");
  }, [entityState.entity?.description, entityState.entity?.id]);

  if (!entityState.entity) {
    return (
      <DocumentShell kindLabel={kindLabel} title={kindLabel} onClose={onClose}>
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
    getString(attrs[CANVAS_DOCUMENT_MARKDOWN_KEY]) || composeMarkdown(sections, attrs);

  return (
    <DocumentShell kindLabel={kindLabel} title={entity.name} onClose={onClose}>
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasMarkdownEditor
          key={`${preview.kind}:${entity.id}`}
          initialMarkdown={initialMarkdown}
          onSave={(markdown) =>
            void entityState.update({
              id: entity.id,
              attributes: {
                ...attrs,
                [CANVAS_DOCUMENT_MARKDOWN_KEY]: markdown,
                ...decomposeMarkdown(markdown, sections),
              },
            })
          }
        >
          <div className="mt-4">
            <CanvasContextBar
              kindLabel={kindLabel}
              firstAppearance={entity.firstAppearance}
              updatedAt={entity.updatedAt}
            />
            <BufferedInput
              className="mt-5 w-full border-none bg-transparent p-0 text-[36px] font-extrabold leading-tight tracking-tight text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
              style={{ fontFamily: fontFamilyCss }}
              value={entity.name}
              placeholder={t("canvas.document.titlePlaceholder", "제목 없음")}
              onSave={(name) => void entityState.update({ id: entity.id, name })}
            />

            <div className="mt-6 flex flex-col gap-3 border-b border-border/40 pb-6 text-sm">
              <PropertyLine
                icon={<AlignLeft className="h-4 w-4" />}
                label={t("canvas.document.description", "집필 요약")}
              >
                <textarea
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                  onBlur={() =>
                    void entityState.update({ id: entity.id, description: descriptionDraft })
                  }
                  style={{ fontFamily: fontFamilyCss }}
                  className="min-h-7 w-full resize-none border-none bg-transparent p-0 text-[15px] leading-7 text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
                  placeholder={t("canvas.document.descriptionPlaceholder", "짧은 설명을 입력하세요.")}
                />
              </PropertyLine>
              <PropertyLine
                icon={<Tag className="h-4 w-4" />}
                label={t("canvas.document.tags", "검색 태그")}
              >
                <TagList value={getTagValues(attrs)} />
              </PropertyLine>
            </div>
          </div>
        </CanvasMarkdownEditor>
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
  const { fontFamilyCss } = useEditorConfig();
  const note = useMemoStore(
    (state) => state.notes.find((candidate) => candidate.id === memoId) ?? null,
  );
  const updateNote = useMemoStore((state) => state.updateNote);
  const scrapLabel = t("research.title.scrap", "Scrap");

  if (!note) {
    return (
      <DocumentShell kindLabel={scrapLabel} title={scrapLabel} onClose={onClose}>
        <div className="flex h-full items-center justify-center text-sm text-muted">
          {t("canvas.preview.memoNotFound", "메모를 찾을 수 없습니다.")}
        </div>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell kindLabel={scrapLabel} title={note.title} onClose={onClose}>
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasMarkdownEditor
          key={`memo:${note.id}`}
          initialMarkdown={note.content}
          onSave={(content) => updateNote(note.id, { content })}
        >
          <div className="mt-4">
            <CanvasContextBar kindLabel={scrapLabel} updatedAt={note.updatedAt} />
            <BufferedInput
              className="mt-5 w-full border-none bg-transparent p-0 text-[36px] font-extrabold leading-tight tracking-tight text-fg outline-none placeholder:text-subtle focus-visible:bg-surface-hover"
              style={{ fontFamily: fontFamilyCss }}
              value={note.title}
              placeholder={t("project.defaults.noteTitle")}
              onSave={(title) => updateNote(note.id, { title })}
            />
            <div className="mt-6 flex flex-col gap-3 border-b border-border/40 pb-6 text-sm">
              <PropertyLine icon={<FileText className="h-4 w-4" />} label={scrapLabel}>
                <span>{t("canvas.document.synced", "동기화됨")}</span>
              </PropertyLine>
              <PropertyLine icon={<Tag className="h-4 w-4" />} label={t("memo.tags", "Tags")}>
                <TagList value={note.tags} />
              </PropertyLine>
            </div>
          </div>
        </CanvasMarkdownEditor>
      </article>
    </DocumentShell>
  );
}

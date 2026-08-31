import { useEffect } from "react";
import { AlignLeft, FileText, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@renderer/styles/components/canvas.css";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";
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
  DocumentShell,
  PropertyLine,
  TagList,
} from "./document/CanvasDocumentChrome";
import { CanvasMarkdownEditor } from "./document/CanvasMarkdownEditor";
import { useCanvasEntity } from "./document/useCanvasEntity";

interface CanvasDocumentViewProps {
  preview: CanvasEntityPreview;
}

export default function CanvasDocumentView({
  preview,
}: CanvasDocumentViewProps) {
  if (preview.kind === "memo") {
    return <MemoDocumentView memoId={preview.id} />;
  }
  return <EntityDocumentView preview={preview} />;
}

function EntityDocumentView({
  preview,
}: {
  preview: Extract<CanvasEntityPreview, { kind: EntityKind }>;
}) {
  const { t } = useTranslation();
  const { entity, load, update } = useCanvasEntity(preview);
  const kindLabel = getKindLabel(preview.kind, t);
  const { fontFamilyCss } = useEditorConfig();

  useEffect(() => {
    void load(preview.id);
  }, [load, preview.id]);

  if (!entity) {
    return (
      <DocumentShell kindLabel={kindLabel} title={kindLabel}>
        <div className="flex h-full items-center justify-center text-sm text-muted">
          {t("canvas.preview.entityNotFound", "문서를 찾을 수 없습니다.")}
        </div>
      </DocumentShell>
    );
  }

  const attrs = parseStructuredAttributes(entity.attributes);
  const sections = getSections(preview.kind, attrs);
  const initialMarkdown =
    getString(attrs[CANVAS_DOCUMENT_MARKDOWN_KEY]) || composeMarkdown(sections, attrs);

  return (
    <DocumentShell kindLabel={kindLabel} title={entity.name}>
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasMarkdownEditor
          key={`${preview.kind}:${entity.id}`}
          initialMarkdown={initialMarkdown}
          onSave={(markdown) =>
            update({
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
            <BufferedInput
              className="mt-5 w-full border-none bg-transparent p-0 text-[36px] font-extrabold leading-tight tracking-tight text-fg outline-hidden placeholder:text-subtle focus-visible:bg-surface-hover"
              style={{ fontFamily: fontFamilyCss }}
              value={entity.name}
              placeholder={t("canvas.document.titlePlaceholder", "제목 없음")}
              onSave={(name) => update({ id: entity.id, name })}
            />

            <div className="mt-6 flex flex-col gap-3 border-b border-border pb-6 text-sm">
              <PropertyLine
                icon={<AlignLeft className="h-4 w-4" />}
                label={t("canvas.document.description", "집필 요약")}
              >
                <BufferedTextArea
                  value={entity.description ?? ""}
                  onSave={(description) =>
                    update({ id: entity.id, description })
                  }
                  style={{ fontFamily: fontFamilyCss }}
                  className="min-h-7 w-full resize-none border-none bg-transparent p-0 text-[15px] leading-7 text-fg outline-hidden placeholder:text-subtle focus-visible:bg-surface-hover"
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
}: {
  memoId: string;
}) {
  const { t } = useTranslation();
  const { fontFamilyCss } = useEditorConfig();
  const note = useMemoStore(
    (state) => state.notes.find((candidate) => candidate.id === memoId) ?? null,
  );
  const updateNote = useMemoStore((state) => state.updateNote);
  const flushSave = useMemoStore((state) => state.flushSave);
  const scrapLabel = t("research.title.scrap", "Scrap");

  if (!note) {
    return (
      <DocumentShell kindLabel={scrapLabel} title={scrapLabel}>
        <div className="flex h-full items-center justify-center text-sm text-muted">
          {t("canvas.preview.memoNotFound", "메모를 찾을 수 없습니다.")}
        </div>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell kindLabel={scrapLabel} title={note.title}>
      <article className="mx-auto flex w-full max-w-[900px] flex-col px-10 py-12">
        <CanvasMarkdownEditor
          key={`memo:${note.id}`}
          initialMarkdown={note.content}
          onSave={(content) => {
            updateNote(note.id, { content });
            return flushSave();
          }}
        >
          <div className="mt-4">
            <BufferedInput
              className="mt-5 w-full border-none bg-transparent p-0 text-[36px] font-extrabold leading-tight tracking-tight text-fg outline-hidden placeholder:text-subtle focus-visible:bg-surface-hover"
              style={{ fontFamily: fontFamilyCss }}
              value={note.title}
              placeholder={t("project.defaults.noteTitle")}
              onSave={(title) => {
                updateNote(note.id, { title });
                return flushSave();
              }}
            />
            <div className="mt-6 flex flex-col gap-3 border-b border-border pb-6 text-sm">
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

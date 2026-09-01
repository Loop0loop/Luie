import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronLeft, FileText } from "lucide-react";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useDialog } from "@shared/ui/useDialog";
import { cn } from "@shared/types/utils";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import NotionDocumentView, {
  type DocumentPropertyRow,
} from "@renderer/features/research/components/shared/NotionDocumentView";
import { Infobox } from "./Infobox";
import { WikiContentPanel, type WikiContentModel } from "./WikiContentPanel";
import {
  readInfoboxOpen,
  readWikiViewMode,
  writeInfoboxOpen,
  writeWikiViewMode,
  type WikiViewMode,
} from "./wikiViewPreferences";

type WikiSectionData = {
  id: string;
  label: string;
};

type CustomField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

type DetailEntity = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: Record<string, unknown> | string | null;
};

type SectionConfig = {
  id: string;
  labelKey: string;
  fallback: string;
};

type UpdateInput = {
  id: string;
  name?: string;
  description?: string;
  attributesPatch?: Record<string, unknown>;
};

type EntityDetailViewProps = {
  entity: DetailEntity | null;
  entityId?: string;
  icon: ReactNode;
  loadEntity: (id: string) => Promise<void>;
  updateEntity: (input: UpdateInput) => void | Promise<void>;
  prefix: "event" | "faction";
  sections: SectionConfig[];
  storagePrefix: string;
  noSelectionFallback: string;
  templateFallback: string;
  onBack?: () => void;
};

export function EntityDetailView({
  entity,
  entityId,
  icon,
  loadEntity,
  updateEntity,
  prefix,
  sections: sectionConfig,
  storagePrefix,
  noSelectionFallback,
  templateFallback,
  onBack,
}: EntityDetailViewProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  // 선택 항목이 비동기로 로드돼도 모든 render에서 Hook 순서를 고정한다.
  /**
   * 프로필 요약 열림 상태의 저장 슬롯.
   *
   * WHY viewMode 키에서 파생하는가: 호출부(`FactionDetailView`·`EventDetailView`)가 이미
   * `storagePrefix`를 넘기고 있어 prop을 추가하지 않아도 된다. 접미사로 슬롯만 분리한다.
   */
  /** 뷰 전환 시 스크롤을 되돌리기 위한 스크롤 컨테이너 참조. */
  const surfaceRef = useRef<HTMLDivElement>(null);
  const infoboxStorageKey = `${storagePrefix}-infobox`;
  const [isInfoboxOpen, setIsInfoboxOpen] = useState(() =>
    readInfoboxOpen(infoboxStorageKey, entityId),
  );
  /** 상태와 저장을 함께 옮긴다. 저장을 빼먹으면 재방문 시 초기화된다. */
  const applyInfoboxOpen = (isOpen: boolean) => {
    setIsInfoboxOpen(isOpen);
    writeInfoboxOpen(infoboxStorageKey, entityId, isOpen);
  };

  useEffect(() => {
    if (entityId) {
      void loadEntity(entityId);
    }
  }, [entityId, loadEntity]);

  const attributes = useMemo(() => {
    if (!entity) return {};
    return parseStructuredAttributes(entity.attributes);
  }, [entity]);

  const defaultSectionLabels = useMemo(
    () =>
      sectionConfig.map(({ labelKey, fallback }) =>
        t(`${prefix}.section.${labelKey}`, fallback),
      ),
    [prefix, sectionConfig, t],
  );

  const sections: WikiSectionData[] = useMemo(() => {
    if (attributes.sections) {
      return attributes.sections as WikiSectionData[];
    }
    return sectionConfig.map(({ id }, index) => ({
      id,
      label: defaultSectionLabels[index] ?? String(index + 1),
    }));
  }, [attributes.sections, defaultSectionLabels, sectionConfig]);

  const contentModel: WikiContentModel = {
    sections,
    getSectionContent: (id) => (attributes[id] as string) || "",
    setSectionContent: (id, value) => handleAttrUpdate(id, value),
    setSections: (next) => handleAttrUpdate("sections", next),
  };

  const customFields: CustomField[] = useMemo(() => {
    return (attributes.customFields as CustomField[]) || [];
  }, [attributes.customFields]);

  const [viewMode, setViewMode] = useState<WikiViewMode>(() =>
    readWikiViewMode(storagePrefix, entityId),
  );
  const switchViewMode = (mode: WikiViewMode) => {
    setViewMode(mode);
    writeWikiViewMode(storagePrefix, entityId, mode);
    /**
     * WHY 스크롤을 되돌리는가: 전환 버튼이 이 스크롤 컨테이너 안에 있고 두 뷰의 콘텐츠
     * 높이가 크게 다르다. 스크롤한 상태로 전환하면 브라우저가 무효해진 스크롤 위치를
     * 보정하면서 본문이 튀어 보인다. 맨 위로 고정하면 착지 지점이 예측 가능해진다.
     */
    surfaceRef.current?.scrollTo({ top: 0 });
  };

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        {t(`${prefix}.noSelection`, noSelectionFallback)}
      </div>
    );
  }

  const handleUpdate = (field: "name" | "description", value: string) => {
    void updateEntity({ id: entity.id, [field]: value });
  };

  const handleAttrUpdate = (key: string, value: unknown) => {
    void updateEntity({ id: entity.id, attributesPatch: { [key]: value } });
  };

  const addCustomField = () => {
    let nextIndex = customFields.length;
    while (customFields.some((field) => field.key === `custom_${nextIndex}`)) {
      nextIndex += 1;
    }
    const newKey = `custom_${nextIndex}`;
    handleAttrUpdate("customFields", [
      ...customFields,
      {
        key: newKey,
        label: t(`${prefix}.newFieldLabel`, "New Field"),
        type: "text",
      },
    ]);
  };

  const updateCustomFieldLabel = (key: string, newLabel: string) => {
    handleAttrUpdate(
      "customFields",
      customFields.map((field) =>
        field.key === key ? { ...field, label: newLabel } : field,
      ),
    );
  };

  const deleteCustomField = (key: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t(`${prefix}.wiki.fieldDeleteTitle`, "Delete Field"),
        message: t(
          `${prefix}.deleteFieldConfirm`,
          "Are you sure you want to delete this field?",
        ),
        isDestructive: true,
      });
      if (!confirmed) return;
      handleAttrUpdate(
        "customFields",
        customFields.filter((field) => field.key !== key),
      );
    })();
  };

  return (
    <div
      ref={surfaceRef}
      className="flex flex-1 min-w-0 flex-col gap-5 overflow-auto bg-research px-5 py-5 text-fg sm:px-6"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-control px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              title={t("back", "뒤로가기")}
              aria-label={t("back", "뒤로가기")}
            >
              <ChevronLeft className="icon-sm" aria-hidden="true" />
              {t("back", "목록")}
            </button>
          ) : null}
          <BufferedInput
            className="min-w-0 flex-1 border-none bg-transparent text-xl font-semibold leading-tight text-fg focus:outline-hidden"
            value={entity.name}
            onSave={(val) => handleUpdate("name", val)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
            <span className="font-medium">{t(`${prefix}.classificationLabel`, "Classification")}</span>
            <span className="text-border/60">·</span>
            <span className="text-fg/70">{t(`${prefix}.template.basic`, templateFallback)}</span>
            <span className="text-border/60">·</span>
            <BufferedInput
              className="inline min-w-[60px] bg-transparent p-0 text-fg/70 focus:rounded-xs focus:bg-active focus:px-1 focus:outline-hidden"
              value={entity.description || ""}
              placeholder={t(`${prefix}.uncategorized`, "Uncategorized")}
              onSave={(val) => handleUpdate("description", val)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-panel bg-element/80 p-0.5 border border-border shadow-xs">
            <button
              type="button"
              onClick={() => switchViewMode("wiki")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium transition-all",
                viewMode === "wiki"
                  ? "bg-surface text-fg shadow-xs border border-border"
                  : "text-muted hover:text-fg hover:bg-surface-hover",
              )}
            >
              <BookOpen size={13} className={viewMode === "wiki" ? "text-accent" : undefined} /> {t("entityVisual.toggle.wiki")}
            </button>
            <button
              type="button"
              onClick={() => switchViewMode("document")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium transition-all",
                viewMode === "document"
                  ? "bg-surface text-fg shadow-xs border border-border"
                  : "text-muted hover:text-fg hover:bg-surface-hover",
              )}
            >
              <FileText size={13} className={viewMode === "document" ? "text-accent" : undefined} /> {t("entityVisual.toggle.document", "문서")}
            </button>
          </div>
        </div>
      </div>

      {viewMode === "document" ? (
        <NotionDocumentView
          properties={[
            {
              label: t(`${prefix}.classificationLabel`, "Classification"),
              readonlyValue: t(`${prefix}.template.basic`, templateFallback),
            },
            {
              label: t(`${prefix}.wiki.descriptionLabel`, "설명"),
              value: entity.description || "",
              placeholder: t(`${prefix}.uncategorized`, "Uncategorized"),
              onSave: (val) => handleUpdate("description", val),
            },
            ...customFields.map<DocumentPropertyRow>((field) => ({
              label: field.label,
              value: (attributes[field.key] as string) || undefined,
              placeholder: field.placeholder,
              onSave: (value) => handleAttrUpdate(field.key, value),
            })),
          ]}
          sections={sections}
          getSectionContent={(id) => (attributes[id] as string) || ""}
          setSections={(next) => handleAttrUpdate("sections", next)}
          setSectionContent={(id, value) => handleAttrUpdate(id, value)}
          bodyPlaceholder={t(
            `${prefix}.document.bodyPlaceholder`,
            "# 제목 으로 섹션을 만들고 자유롭게 써보세요. 마크다운(##, -, **굵게**)을 사용할 수 있어요.",
          )}
        />
      ) : (
        <div className="@container relative">
          <div className="flex flex-col @min-[700px]:flex-row gap-6 items-start min-h-0">
            <div className="flex-1 min-w-0 w-full @min-[700px]:order-1 order-2">
              <WikiContentPanel attrs={contentModel} i18nPrefix={prefix} />
            </div>

            {/* Right Infobox Slide Panel */}
            <div
              className={cn(
                "@min-[700px]:order-2 order-1 shrink-0 transition-[opacity,width] duration-300 ease-in-out",
                isInfoboxOpen
                  ? "w-full @min-[700px]:w-[280px] opacity-100 max-h-[2000px]"
                  : "w-0 @min-[700px]:w-0 max-h-0 overflow-hidden opacity-0 pointer-events-none",
              )}
            >
              <div className="w-full @min-[700px]:w-[280px]">
                <Infobox
                  title={entity.name}
                  image={icon}
                  rows={customFields.map((field) => ({
                    label: field.label,
                    value: attributes[field.key] as string | undefined,
                    placeholder: field.placeholder,
                    type: field.type,
                    options: field.options,
                    isCustom: true,
                    onSave: (value) => handleAttrUpdate(field.key, value),
                    onLabelSave: (value) => updateCustomFieldLabel(field.key, value),
                    onDelete: () => deleteCustomField(field.key),
                  }))}
                  onAddField={addCustomField}
                  onClose={() => applyInfoboxOpen(false)}
                />
              </div>
            </div>

            {/* Collapsed side drawer toggle handle */}
            {!isInfoboxOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  applyInfoboxOpen(true);
                }}
                onPointerDown={(e) => {
                  // NOTE: ReactFlow panOnDrag/selectionOnDrag가 포인터 이벤트를 캡처하는 것을
                  // 방지한다. stopPropagation만으로는 DnD 시작을 막을 수 없어 pointer-events를
                  // 명시적으로 auto로 설정하고, 불필요한 이벤트 전파를 차단한다.
                  e.stopPropagation();
                }}
                title={t(`${prefix}.wiki.infoboxTitle`, "프로필 요약 펼치기")}
                aria-label={t(`${prefix}.wiki.infoboxTitle`, "프로필 요약 펼치기")}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center gap-1.5 rounded-l-panel border border-r-0 border-border bg-surface/95 px-1 py-3.5 shadow-md backdrop-blur-xs transition-all hover:bg-surface hover:border-accent/60 hover:text-accent group [touch-action:manipulation] cursor-pointer"
              >
                <ChevronLeft size={14} className="text-muted group-hover:text-accent transition-colors" />
                <span className="text-[10px] font-medium text-muted [writing-mode:vertical-lr] select-none tracking-tight group-hover:text-accent transition-colors">
                  {t(`${prefix}.wiki.infoboxTitle`, "프로필 요약")}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

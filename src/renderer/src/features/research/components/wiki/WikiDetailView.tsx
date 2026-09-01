import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronLeft, FileText, Trash2, User, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { CHARACTER_TEMPLATES } from "../../constants/characterTemplates";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useDialog } from "@shared/ui/useDialog";
import { cn } from "@shared/types/utils";
import { Infobox } from "./Infobox";
import { WikiContentPanel } from "./WikiContentPanel";
import { CharacterDocumentView } from "./CharacterDocumentView";
import { useCharacterWikiAttrs } from "./hooks/useCharacterWikiAttrs";
import { useEffectiveCharacterSections } from "./hooks/useEffectiveCharacterSections";
import {
  type CharacterViewMode,
  CHARACTER_VIEW_MODE_KEY,
  CHARACTER_INFOBOX_KEY,
} from "./types";
import {
  readInfoboxOpen,
  readWikiViewMode,
  writeInfoboxOpen,
  writeWikiViewMode,
} from "./wikiViewPreferences";

type AddTagInlineProps = {
  onAdd: (tag: string) => void;
  placeholder: string;
};

function AddTagInline({ onAdd, placeholder }: AddTagInlineProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12px] text-muted/50 hover:text-fg transition-colors px-1 bg-transparent border-none cursor-pointer"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setValue(""); setEditing(false); }
      }}
      onBlur={commit}
      className="text-[12px] w-20 border-b border-border-active bg-transparent pb-0.5 text-fg outline-hidden placeholder:text-muted/40 focus:border-accent"
      placeholder="입력 후 Enter"
    />
  );
}

interface WikiDetailViewProps {
  characterId?: string;
  onBack?: () => void;
  /** canvas 위키뷰(CharacterInspectorView)에서 렌더링될 때 true.
   *  ReactFlow의 capture phase pointerdown 이벤트로 인한 DnD 간섭을 방지한다. */
  inCanvas?: boolean;
}

export default function WikiDetailView({ characterId, onBack, inCanvas }: WikiDetailViewProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const [isInfoboxOpen, setIsInfoboxOpen] = useState(() =>
    readInfoboxOpen(CHARACTER_INFOBOX_KEY, characterId),
  );
  /** 상태와 저장을 함께 옮긴다. 저장을 빼먹으면 재방문 시 초기화된다. */
  const applyInfoboxOpen = (isOpen: boolean) => {
    setIsInfoboxOpen(isOpen);
    writeInfoboxOpen(CHARACTER_INFOBOX_KEY, character?.id ?? characterId, isOpen);
  };

  const toggleRef = useRef<HTMLButtonElement>(null);

  // NOTE: ReactFlow는 capture phase로 pointerdown을 잡아 panOnDrag를 시작한다.
  // capture phase 리스너로 먼저 가로채서 ReactFlow에 이벤트가 도달하지 않게 한다.
  useEffect(() => {
    const el = toggleRef.current;
    if (!el || !inCanvas) return;
    const handler = (e: PointerEvent) => {
      e.stopPropagation();
    };
    el.addEventListener("pointerdown", handler, { capture: true });
    return () => el.removeEventListener("pointerdown", handler, { capture: true });
  }, [inCanvas]);

  const { character, loadCharacter, updateCharacter, deleteCharacter, setCurrent } =
    useCharacterStore(
      useShallow((s) => ({
        character:       s.currentItem,
        loadCharacter:   s.loadCharacter,
        updateCharacter: s.updateCharacter,
        deleteCharacter: s.deleteCharacter,
        setCurrent:      s.setCurrent,
      })),
    );

  const { mainView, setMainView } = useUIStore(
    useShallow((s) => ({ mainView: s.mainView, setMainView: s.setMainView })),
  );

  const attrs = useCharacterWikiAttrs();

  const effectiveSections = useEffectiveCharacterSections(attrs.sections);

  /** 뷰 전환 시 스크롤을 되돌리기 위한 스크롤 컨테이너 참조. */
  const surfaceRef = useRef<HTMLDivElement>(null);
  const currentViewModeId = character?.id ?? characterId;
  const [viewModeState, setViewModeState] = useState<{
    entityId?: string;
    mode: CharacterViewMode;
  }>(() => ({
    entityId: characterId,
    mode: readWikiViewMode(CHARACTER_VIEW_MODE_KEY, characterId),
  }));
  const viewMode =
    viewModeState.entityId === currentViewModeId
      ? viewModeState.mode
      : readWikiViewMode(CHARACTER_VIEW_MODE_KEY, currentViewModeId);

  const switchViewMode = (mode: CharacterViewMode) => {
    setViewModeState({ entityId: currentViewModeId, mode });
    writeWikiViewMode(CHARACTER_VIEW_MODE_KEY, currentViewModeId, mode);
    /**
     * WHY 스크롤을 되돌리는가: 전환 버튼이 이 스크롤 컨테이너 안에 있고 두 뷰의 콘텐츠
     * 높이가 크게 다르다. 스크롤한 상태로 전환하면 브라우저가 무효해진 스크롤 위치를
     * 보정하면서 본문이 튀어 보인다. 맨 위로 고정하면 착지 지점이 예측 가능해진다.
     */
    surfaceRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (characterId) void loadCharacter(characterId);
  }, [characterId, loadCharacter]);

  const currentTemplate = useMemo(() => {
    const templateId = attrs.getSectionContent("templateId") || "basic";
    return CHARACTER_TEMPLATES.find((tmpl) => tmpl.id === templateId) ?? CHARACTER_TEMPLATES[0];
  }, [attrs]);

  const addCustomField = () => {
    const key = `custom_${Date.now()}`;
    attrs.setCustomFields([
      ...attrs.customFields,
      { key, label: t("character.newFieldLabel"), type: "text" },
    ]);
  };

  const updateCustomFieldLabel = (key: string, newLabel: string) =>
    attrs.setCustomFields(
      attrs.customFields.map((f) => (f.key === key ? { ...f, label: newLabel } : f)),
    );

  const deleteCustomField = (key: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.fieldDeleteTitle"),
        message: t("character.deleteFieldConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      attrs.setCustomFields(attrs.customFields.filter((f) => f.key !== key));
    })();
  };

  const handleDeleteCharacter = () => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.deleteCharacterTitle"),
        message: t("character.deleteCharacterConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      await deleteCharacter(character!.id);
      setCurrent(null);
      if (mainView.type === "character" && mainView.id === character!.id) {
        setMainView({ type: "editor" });
      }
    })();
  };

  if (!character) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        {t("character.noSelection")}
      </div>
    );
  }

  const allFields = [...currentTemplate.fields, ...attrs.customFields];
  const infoboxRows = allFields.map((field) => {
    const isCustom = attrs.customFields.some((cf) => cf.key === field.key);
    const isTemplateField = "labelKey" in field;
    return {
      label:       isTemplateField ? t(field.labelKey) : field.label,
      value:       attrs.getSectionContent(field.key) || undefined,
      placeholder: isTemplateField && field.placeholderKey
        ? t(field.placeholderKey)
        : "placeholder" in field ? field.placeholder : undefined,
      type:    field.type,
      options: isTemplateField && field.optionKeys
        ? field.optionKeys.map((k) => t(k))
        : "options" in field ? field.options : undefined,
      isCustom,
      onSave:      (v: string) => attrs.setAttr(field.key, v),
      onLabelSave: isCustom ? (v: string) => updateCustomFieldLabel(field.key, v) : undefined,
      onDelete:    isCustom ? () => deleteCustomField(field.key) : undefined,
    };
  });


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
              title={t("back", "뒤로가기")}
              aria-label={t("back", "뒤로가기")}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-control px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="icon-sm" aria-hidden="true" />
              {t("back", "목록")}
            </button>
          ) : null}
          <BufferedInput
            className="min-w-0 flex-1 border-none bg-transparent text-xl font-semibold leading-tight text-fg focus:outline-hidden"
            value={character.name}
            onSave={(val) => updateCharacter({ id: character.id, name: val })}
          />

          <button
            type="button"
            onClick={handleDeleteCharacter}
            title={t("character.wiki.deleteCharacterTitle")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted/70 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-danger-fg"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
            <span>{t("character.classificationLabel")}</span>
            <span className="text-border/60">·</span>
            <span className="text-fg/70">{t(currentTemplate.nameKey)}</span>
            <span className="text-border/60">·</span>
            <BufferedInput
              className="inline min-w-[60px] bg-transparent p-0 text-fg/70 focus:rounded-xs focus:bg-active focus:px-1 focus:outline-hidden"
              value={character.description || ""}
              placeholder={t("character.uncategorized")}
              onSave={(val) => updateCharacter({ id: character.id, description: val })}
            />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-panel bg-element/80 p-0.5 border border-border shadow-xs">
            <button
              type="button"
              onClick={() => switchViewMode("wiki")}
              title="위키 뷰"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium transition-all",
                viewMode === "wiki"
                  ? "bg-surface text-fg shadow-xs border border-border"
                  : "text-muted hover:text-fg hover:bg-surface-hover",
              )}
            >
              <BookOpen size={13} className={viewMode === "wiki" ? "text-accent" : undefined} />
              위키
            </button>
            <button
              type="button"
              onClick={() => switchViewMode("document")}
              title="문서 뷰"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium transition-all",
                viewMode === "document"
                  ? "bg-surface text-fg shadow-xs border border-border"
                  : "text-muted hover:text-fg hover:bg-surface-hover",
              )}
            >
              <FileText size={13} className={viewMode === "document" ? "text-accent" : undefined} />
              문서
            </button>
          </div>
        </div>
      </div>

      {viewMode === "wiki" ? (
        <>
          <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface/40 p-4 shadow-xs">
            <BufferedInput
              className="text-[15px] italic text-fg/85 bg-transparent border-none w-full p-0 focus:outline-hidden placeholder:text-muted/40 leading-relaxed font-serif"
              value={attrs.tagline}
              placeholder="이 인물을 한 마디로 표현한다면..."
              onSave={attrs.setTagline}
            />
            <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-border min-h-[24px]">
              <span className="text-[11px] text-muted/80 font-semibold w-7 shrink-0">역할</span>
              {attrs.roles.map((role) => (
                <span
                  key={role}
                  className="group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-element border border-border text-xs font-medium text-fg/80 shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {role}
                  <button
                    type="button"
                    onClick={() => attrs.removeRole(role)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-danger ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <AddTagInline onAdd={attrs.addRole} placeholder="+ 역할" />
            </div>
            <div className="flex items-center flex-wrap gap-2 min-h-[24px]">
              <span className="text-[11px] text-muted/80 font-semibold w-7 shrink-0">태그</span>
              {attrs.keywords.map((kw) => (
                <span
                  key={kw}
                  className="group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-hover border border-border text-xs text-muted"
                >
                  #{kw}
                  <button
                    type="button"
                    onClick={() => attrs.removeKeyword(kw)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-danger ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <AddTagInline onAdd={attrs.addKeyword} placeholder="+ 태그" />
            </div>
          </div>
          <div className="@container relative">
            <div className="flex flex-col @min-[700px]:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0 w-full @min-[700px]:order-1 order-2">
                <WikiContentPanel
                  attrs={{
                    sections: effectiveSections,
                    getSectionContent: attrs.getSectionContent,
                    setSectionContent: attrs.setSectionContent,
                    setSections: attrs.setSections,
                  }}
                  i18nPrefix="character"
                />
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
                    title={character.name}
                    image={<User size={48} />}
                    imageUrl={attrs.generatedImage}
                    rows={infoboxRows}
                    onAddField={addCustomField}
                    onClose={() => applyInfoboxOpen(false)}
                  />
                </div>
              </div>

              {/* Collapsed side drawer toggle handle */}
              {!isInfoboxOpen && (
                <button
                  ref={toggleRef}
                  type="button"
                  onClick={() => applyInfoboxOpen(true)}
                  title={t("character.wiki.infoboxTitle", "프로필 요약 펼치기")}
                  aria-label={t("character.wiki.infoboxTitle", "프로필 요약 펼치기")}
                  className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center gap-1.5 rounded-l-panel border border-r-0 border-border bg-surface/95 px-1 py-3.5 shadow-md backdrop-blur-xs transition-all hover:bg-surface hover:border-accent/60 hover:text-accent group cursor-pointer"
                >
                  <ChevronLeft size={14} className="text-muted group-hover:text-accent transition-colors" />
                  <span className="text-2xs font-medium text-muted [writing-mode:vertical-lr] select-none tracking-tight group-hover:text-accent transition-colors">
                    {t("character.wiki.infoboxTitle", "프로필 요약")}
                  </span>
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <CharacterDocumentView
          classification={t(currentTemplate.nameKey)}
          description={character.description || ""}
          onDescriptionSave={(val) =>
            updateCharacter({ id: character.id, description: val })
          }
          properties={infoboxRows.map((row) => ({
            label: row.label,
            value: row.value,
            placeholder: row.placeholder,
            onSave: row.onSave,
          }))}
          attrs={attrs}
        />
      )}
    </div>
  );
}

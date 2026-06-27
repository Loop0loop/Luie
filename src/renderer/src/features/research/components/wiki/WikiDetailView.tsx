import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, FileText, Trash2, User, X } from "lucide-react";
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
import { type CharacterViewMode, CHARACTER_VIEW_MODE_KEY } from "./types";

const getViewModeStorageKey = (id?: string) =>
  id ? `${CHARACTER_VIEW_MODE_KEY}:${id}` : CHARACTER_VIEW_MODE_KEY;

const readViewMode = (id?: string): CharacterViewMode => {
  const stored = localStorage.getItem(getViewModeStorageKey(id));
  return stored === "document" ? "document" : "wiki";
};

// ── AddTagInline ──────────────────────────────────────────────────────────

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
        className="text-[12px] text-muted/50 hover:text-accent transition-colors px-1 bg-transparent border-none cursor-pointer"
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
      className="text-[12px] bg-transparent border-b border-accent/60 outline-none w-20 text-fg pb-0.5 placeholder:text-muted/40"
      placeholder="입력 후 Enter"
    />
  );
}

// ── WikiDetailView ────────────────────────────────────────────────────────

interface WikiDetailViewProps {
  characterId?: string;
}

export default function WikiDetailView({ characterId }: WikiDetailViewProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

  // ── Store ───────────────────────────────────────────────────────────────
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

  // ── Attribute hook ──────────────────────────────────────────────────────
  const attrs = useCharacterWikiAttrs();

  const effectiveSections = useEffectiveCharacterSections(attrs.sections);

  // ── View mode (persisted per character) ────────────────────────────────
  const currentViewModeStorageKey = getViewModeStorageKey(character?.id ?? characterId);
  const [viewModeState, setViewModeState] = useState<{
    storageKey: string;
    mode: CharacterViewMode;
  }>(() => ({
    storageKey: getViewModeStorageKey(characterId),
    mode: readViewMode(characterId),
  }));
  const viewMode =
    viewModeState.storageKey === currentViewModeStorageKey
      ? viewModeState.mode
      : readViewMode(character?.id ?? characterId);

  const switchViewMode = (mode: CharacterViewMode) => {
    setViewModeState({ storageKey: currentViewModeStorageKey, mode });
    localStorage.setItem(currentViewModeStorageKey, mode);
  };

  // ── Character load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (characterId) void loadCharacter(characterId);
  }, [characterId, loadCharacter]);

  // ── Template resolution ─────────────────────────────────────────────────
  const currentTemplate = useMemo(() => {
    const templateId = attrs.getSectionContent("templateId") || "basic";
    return CHARACTER_TEMPLATES.find((tmpl) => tmpl.id === templateId) ?? CHARACTER_TEMPLATES[0];
  }, [attrs]);

  // ── Custom field handlers ───────────────────────────────────────────────
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

  // ── Character delete ────────────────────────────────────────────────────
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

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!character) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        {t("character.noSelection")}
      </div>
    );
  }

  // ── Infobox rows ────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto px-8 py-7 sm:px-6 sm:py-6 flex flex-col gap-5 bg-panel text-fg min-w-0">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <BufferedInput
            className="text-[22px] font-semibold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
            value={character.name}
            onSave={(val) => updateCharacter({ id: character.id, name: val })}
          />

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => switchViewMode("wiki")}
              title="위키 뷰"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
                viewMode === "wiki"
                  ? "bg-surface-hover text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              <BookOpen size={12} />
              위키
            </button>
            <button
              type="button"
              onClick={() => switchViewMode("document")}
              title="문서 뷰"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
                viewMode === "document"
                  ? "bg-surface-hover text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              <FileText size={12} />
              문서
            </button>
          </div>

          <button
            type="button"
            onClick={handleDeleteCharacter}
            title={t("character.wiki.deleteCharacterTitle")}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-muted/70 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span>{t("character.classificationLabel")}</span>
          <span className="text-border/60">·</span>
          <span className="text-fg/70">{t(currentTemplate.nameKey)}</span>
          <span className="text-border/60">·</span>
          <BufferedInput
            className="inline min-w-[60px] text-fg/70 bg-transparent border-none p-0 focus:outline-none focus:bg-active focus:rounded-sm focus:px-1 transition-all"
            value={character.description || ""}
            placeholder={t("character.uncategorized")}
            onSave={(val) => updateCharacter({ id: character.id, description: val })}
          />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {viewMode === "wiki" ? (
        <>
          {/* Identity anchor — wiki only */}
          <div className="flex flex-col gap-3">
            <BufferedInput
              className="text-[15px] italic text-fg/70 bg-transparent border-none w-full p-0 focus:outline-none placeholder:text-muted/35 leading-relaxed"
              value={attrs.tagline}
              placeholder="이 인물을 한 마디로 표현한다면..."
              onSave={attrs.setTagline}
            />
            {/* Roles */}
            <div className="flex items-center flex-wrap gap-1.5 min-h-[22px]">
              <span className="text-[11px] text-muted/60 font-medium w-6 shrink-0">역할</span>
              {attrs.roles.map((role) => (
                <span
                  key={role}
                  className="group/tag inline-flex items-center gap-1 text-[12px] text-fg/70"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: attrs.characterColor }}
                  />
                  {role}
                  <button
                    type="button"
                    onClick={() => attrs.removeRole(role)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-danger"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <AddTagInline onAdd={attrs.addRole} placeholder="+ 역할" />
            </div>
            {/* Keywords */}
            <div className="flex items-center flex-wrap gap-1.5 min-h-[22px]">
              <span className="text-[11px] text-muted/60 font-medium w-6 shrink-0">태그</span>
              {attrs.keywords.map((kw) => (
                <span
                  key={kw}
                  className="group/tag inline-flex items-center gap-0.5 text-[12px] text-muted"
                >
                  #{kw}
                  <button
                    type="button"
                    onClick={() => attrs.removeKeyword(kw)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-danger"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <AddTagInline onAdd={attrs.addKeyword} placeholder="+ 태그" />
            </div>
          </div>
          <div className="h-px bg-border/30" />
          {/* Two-column — sections left, Infobox right */}
          <div className="@container">
            <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start">
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
              <div className="w-full @min-[700px]:w-[280px] shrink-0 @min-[700px]:order-2 order-1">
                <Infobox
                  title={character.name}
                  image={<User size={80} color="var(--border-active)" />}
                  rows={infoboxRows}
                  onAddField={addCustomField}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Document: Notion-style view synced with the wiki data */
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

import { useMemo, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, User, LayoutTemplate, BookOpen, X } from "lucide-react";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { Infobox } from "@renderer/features/research/components/wiki/Infobox";
import {
  WikiSection,
  type WikiViewMode,
} from "@renderer/features/research/components/wiki/WikiSection";
import { useDialog } from "@shared/ui/useDialog";
import { SUPPORTED_LANGUAGES, i18n } from "@renderer/i18n";
import { CHARACTER_TEMPLATES } from "@shared/constants";
import { useShallow } from "zustand/react/shallow";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";

type WikiSectionData = { id: string; label: string };
type CustomField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

interface WikiDetailViewProps {
  characterId?: string;
}

const VIEW_MODE_KEY = "wiki-view-mode";

function AddTagInline({
  onAdd,
  placeholder,
}: {
  onAdd: (tag: string) => void;
  placeholder: string;
}) {
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
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setValue("");
          setEditing(false);
        }
      }}
      onBlur={commit}
      className="text-[12px] bg-transparent border-b border-accent/60 outline-none w-20 text-fg pb-0.5 placeholder:text-muted/40"
      placeholder="입력 후 Enter"
    />
  );
}

export default function WikiDetailView({ characterId }: WikiDetailViewProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const {
    currentItem: character,
    updateCharacter,
    loadCharacter,
    deleteCharacter,
    setCurrent,
  } = useCharacterStore(
    useShallow((state) => ({
      currentItem: state.currentItem,
      updateCharacter: state.updateCharacter,
      loadCharacter: state.loadCharacter,
      deleteCharacter: state.deleteCharacter,
      setCurrent: state.setCurrent,
    })),
  );
  const mainView = useUIStore((state) => state.mainView);
  const setMainView = useUIStore((state) => state.setMainView);

  const [viewMode, setViewMode] = useState<WikiViewMode>(() => {
    return (localStorage.getItem(VIEW_MODE_KEY) as WikiViewMode) || "notebook";
  });

  const handleViewMode = (mode: WikiViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  useEffect(() => {
    if (characterId) void loadCharacter(characterId);
  }, [characterId, loadCharacter]);

  const attributes = useMemo(() => {
    if (!character) return {};
    return parseStructuredAttributes(character.attributes);
  }, [character]);

  const currentTemplate = useMemo(() => {
    const templateId = attributes.templateId || "basic";
    return (
      CHARACTER_TEMPLATES.find((t) => t.id === templateId) ||
      CHARACTER_TEMPLATES[0]
    );
  }, [attributes.templateId]);

  const defaultSectionLabels = useMemo(() => {
    return t("character.defaultSections", { returnObjects: true }) as string[];
  }, [t]);

  const defaultLabelById = useMemo(
    () =>
      ({
        overview: defaultSectionLabels[0],
        appearance: defaultSectionLabels[1],
        personality: defaultSectionLabels[2],
        background: defaultSectionLabels[3],
        relations: defaultSectionLabels[4],
        notes: defaultSectionLabels[5],
      }) as Record<string, string | undefined>,
    [defaultSectionLabels],
  );

  const defaultLabelSet = useMemo(() => {
    const labels = new Set<string>();
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const bundle = i18n.getResourceBundle(lang, "common") as
        | { character?: { defaultSections?: string[] } }
        | undefined;
      bundle?.character?.defaultSections?.forEach((label) => labels.add(label));
    });
    return labels;
  }, []);

  const sections: WikiSectionData[] = useMemo(() => {
    if (attributes.sections) {
      return (attributes.sections as WikiSectionData[]).map((section) => {
        const defaultLabel = defaultLabelById[section.id];
        if (!defaultLabel) return section;
        if (!defaultLabelSet.has(section.label)) return section;
        return { ...section, label: defaultLabel };
      });
    }
    return [
      { id: "overview", label: defaultSectionLabels[0] ?? "1" },
      { id: "appearance", label: defaultSectionLabels[1] ?? "2" },
      { id: "personality", label: defaultSectionLabels[2] ?? "3" },
      { id: "background", label: defaultSectionLabels[3] ?? "4" },
      { id: "relations", label: defaultSectionLabels[4] ?? "5" },
      { id: "notes", label: defaultSectionLabels[5] ?? "6" },
    ];
  }, [
    attributes.sections,
    defaultLabelById,
    defaultLabelSet,
    defaultSectionLabels,
  ]);

  const customFields: CustomField[] = useMemo(
    () => (attributes.customFields as CustomField[]) || [],
    [attributes.customFields],
  );

  const roles = useMemo(
    () => (attributes.roles as string[]) || [],
    [attributes.roles],
  );

  const keywords = useMemo(
    () => (attributes.keywords as string[]) || [],
    [attributes.keywords],
  );

  if (!character) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        {t("character.noSelection")}
      </div>
    );
  }

  const handleUpdate = (field: string, value: string) =>
    updateCharacter({ id: character.id, [field]: value });

  const handleAttrUpdate = (key: string, value: unknown) => {
    const newAttrs = { ...attributes, [key]: value };
    updateCharacter({ id: character.id, attributes: newAttrs });
  };

  // Roles
  const addRole = (role: string) => {
    if (!roles.includes(role)) handleAttrUpdate("roles", [...roles, role]);
  };
  const removeRole = (role: string) =>
    handleAttrUpdate("roles", roles.filter((r) => r !== role));

  // Keywords
  const addKeyword = (kw: string) => {
    if (!keywords.includes(kw))
      handleAttrUpdate("keywords", [...keywords, kw]);
  };
  const removeKeyword = (kw: string) =>
    handleAttrUpdate("keywords", keywords.filter((k) => k !== kw));

  // Sections
  const addSection = () => {
    const newId = `section_${Date.now()}`;
    handleAttrUpdate("sections", [
      ...sections,
      { id: newId, label: `${sections.length + 1}. ${t("character.newSection")}` },
    ]);
  };

  const renameSection = (id: string, newLabel: string) =>
    handleAttrUpdate(
      "sections",
      sections.map((s) => (s.id === id ? { ...s, label: newLabel } : s)),
    );

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.sectionDeleteTitle"),
        message: t("character.deleteSectionConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      handleAttrUpdate(
        "sections",
        sections.filter((s) => s.id !== id),
      );
    })();
  };

  // Custom fields
  const addCustomField = () => {
    const newKey = `custom_${Date.now()}`;
    handleAttrUpdate("customFields", [
      ...customFields,
      { key: newKey, label: t("character.newFieldLabel"), type: "text" },
    ]);
  };

  const updateCustomFieldLabel = (key: string, newLabel: string) =>
    handleAttrUpdate(
      "customFields",
      customFields.map((f) => (f.key === key ? { ...f, label: newLabel } : f)),
    );

  const deleteCustomField = (key: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.fieldDeleteTitle"),
        message: t("character.deleteFieldConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      handleAttrUpdate(
        "customFields",
        customFields.filter((f) => f.key !== key),
      );
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
      await deleteCharacter(character.id);
      setCurrent(null);
      if (mainView.type === "character" && mainView.id === character.id) {
        setMainView({ type: "editor" });
      }
    })();
  };

  const allInfoboxFields = [...currentTemplate.fields, ...customFields];
  const isNotebook = viewMode === "notebook";

  return (
    <div className="flex-1 overflow-auto px-8 py-7 sm:px-6 sm:py-6 flex flex-col gap-5 bg-panel text-fg min-w-0">

      {/* HEADER */}
      <div className="flex flex-col gap-2 pb-4 border-b border-(--namu-border)">
        <div className="flex items-center gap-2">
          <BufferedInput
            className="text-[26px] font-extrabold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
            value={character.name}
            onSave={(val) => handleUpdate("name", val)}
          />
          <div className="flex items-center bg-surface border border-border rounded-md p-0.5 gap-0.5 shrink-0">
            <button
              type="button"
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "editorial"
                  ? "bg-panel text-accent shadow-sm"
                  : "text-muted hover:text-fg",
              )}
              onClick={() => handleViewMode("editorial")}
              title="에디터리얼"
            >
              <LayoutTemplate size={13} />
            </button>
            <button
              type="button"
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "notebook"
                  ? "bg-panel text-accent shadow-sm"
                  : "text-muted hover:text-fg",
              )}
              onClick={() => handleViewMode("notebook")}
              title="노트북"
            >
              <BookOpen size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleDeleteCharacter}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
            title={t("character.wiki.deleteCharacterTitle")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="font-medium">{t("character.classificationLabel")}</span>
          <span className="text-border/60">·</span>
          <span className="text-(--namu-link)">{t(currentTemplate.nameKey)}</span>
          <span className="text-border/60">·</span>
          <BufferedInput
            className="inline min-w-[60px] font-medium text-(--namu-link) bg-transparent border-none p-0 focus:outline-none focus:bg-active focus:rounded-sm focus:px-1 transition-all"
            value={character.description || ""}
            placeholder={t("character.uncategorized")}
            onSave={(val) => handleUpdate("description", val)}
          />
        </div>
      </div>

      {/* IDENTITY ANCHOR */}
      <div className="flex flex-col gap-3">
        <BufferedInput
          className="text-[15px] italic text-fg/70 bg-transparent border-none w-full p-0 focus:outline-none placeholder:text-muted/35 leading-relaxed"
          value={(attributes.tagline as string) || ""}
          placeholder="이 인물을 한 마디로 표현한다면..."
          onSave={(val) => handleAttrUpdate("tagline", val)}
        />

        {/* Roles */}
        <div className="flex items-center flex-wrap gap-1.5 min-h-[22px]">
          <span className="text-[11px] text-muted/60 font-medium w-6 shrink-0">역할</span>
          {roles.map((role) => (
            <span
              key={role}
              className="group/tag flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[12px] font-medium"
            >
              {role}
              <button
                type="button"
                onClick={() => removeRole(role)}
                className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-destructive ml-0.5"
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <AddTagInline onAdd={addRole} placeholder="+ 역할" />
        </div>

        {/* Keywords */}
        <div className="flex items-center flex-wrap gap-1.5 min-h-[22px]">
          <span className="text-[11px] text-muted/60 font-medium w-6 shrink-0">태그</span>
          {keywords.map((kw) => (
            <span
              key={kw}
              className="group/tag flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-border/60 text-muted text-[12px]"
            >
              #{kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-destructive ml-0.5"
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <AddTagInline onAdd={addKeyword} placeholder="+ 태그" />
        </div>
      </div>

      <div className="h-px bg-border/30" />

      {/* BODY */}
      <div className="@container">
        <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">

          {/* LEFT: TOC + Sections */}
          <div
            className={cn(
              "flex-1 flex flex-col min-w-75 w-full @min-[700px]:order-1 order-2",
              isNotebook ? "gap-9" : "gap-6",
            )}
          >
            {/* TOC */}
            {isNotebook ? (
              <div className="self-start">
                <div className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wider">
                  {t("character.tocLabel")}
                </div>
                <div className="flex flex-col gap-0.5 text-[13px] pl-3 border-l border-border/50">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      className="text-(--namu-link) no-underline cursor-pointer hover:underline leading-snug py-0.5"
                      href={`#${sec.id}`}
                    >
                      {sec.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-(--namu-table-bg) border border-(--namu-border) rounded-lg p-4 inline-block self-start min-w-48">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5">
                  {t("character.tocLabel")}
                </div>
                <div className="flex flex-col gap-1 text-[13px]">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      className="text-(--namu-link) no-underline cursor-pointer hover:underline leading-snug py-0.5"
                      href={`#${sec.id}`}
                    >
                      {sec.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {sections.map((sec) => (
              <WikiSection
                key={sec.id}
                id={sec.id}
                label={sec.label}
                content={(attributes[sec.id] as string) || ""}
                viewMode={viewMode}
                onRename={(val) => renameSection(sec.id, val)}
                onUpdateContent={(val) => handleAttrUpdate(sec.id, val)}
                onDelete={() => deleteSection(sec.id)}
              />
            ))}

            {/* Add Section */}
            {isNotebook ? (
              <button
                type="button"
                onClick={addSection}
                className="self-start flex items-center gap-1.5 text-[13px] text-muted/50 bg-transparent border-none cursor-pointer hover:text-accent transition-colors duration-150 pl-1"
              >
                <span className="text-[16px] leading-none">+</span>
                {t("character.addSection")}
              </button>
            ) : (
              <button
                type="button"
                onClick={addSection}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-border text-[13px] text-muted bg-transparent cursor-pointer hover:border-accent/40 hover:text-accent transition-colors duration-150"
              >
                <span className="text-base leading-none">+</span>
                {t("character.addSection")}
              </button>
            )}
          </div>

          {/* RIGHT: Infobox */}
          <div className="w-full @min-[700px]:w-[300px] shrink-0 @min-[700px]:order-2 order-1">
            <Infobox
              title={character.name}
              image={<User size={80} color="var(--border-active)" />}
              rows={allInfoboxFields.map((field) => {
                const isCustom = customFields.some((cf) => cf.key === field.key);
                const isTemplateField = "labelKey" in field;
                const label = isTemplateField ? t(field.labelKey) : field.label;
                const placeholder =
                  isTemplateField && field.placeholderKey
                    ? t(field.placeholderKey)
                    : "placeholder" in field
                      ? field.placeholder
                      : undefined;
                const options =
                  isTemplateField && field.optionKeys
                    ? field.optionKeys.map((key) => t(key))
                    : "options" in field
                      ? field.options
                      : undefined;
                return {
                  label,
                  value: attributes[field.key] as string | undefined,
                  placeholder,
                  type: field.type,
                  options,
                  isCustom,
                  onSave: (v) => handleAttrUpdate(field.key, v),
                  onLabelSave: isCustom
                    ? (v) => updateCustomFieldLabel(field.key, v)
                    : undefined,
                  onDelete: isCustom ? () => deleteCustomField(field.key) : undefined,
                };
              })}
              onAddField={addCustomField}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Sparkles } from "lucide-react";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useDialog } from "@shared/ui/useDialog";
import { cn } from "@shared/types/utils";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import { EntityVisualPanel, type EntityKind } from "@renderer/features/research/components/wiki/visual";
import { Infobox } from "./Infobox";
import { WikiSection } from "./WikiSection";

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
  attributes?: Record<string, unknown>;
};

type EntityDetailViewProps = {
  entity: DetailEntity | null;
  entityId?: string;
  entityKind: Extract<EntityKind, "event" | "faction">;
  icon: ReactNode;
  loadEntity: (id: string) => Promise<void>;
  updateEntity: (input: UpdateInput) => void | Promise<void>;
  prefix: "event" | "faction";
  sections: SectionConfig[];
  storagePrefix: string;
  noSelectionFallback: string;
  templateFallback: string;
};

export function EntityDetailView({
  entity,
  entityId,
  entityKind,
  icon,
  loadEntity,
  updateEntity,
  prefix,
  sections: sectionConfig,
  storagePrefix,
  noSelectionFallback,
  templateFallback,
}: EntityDetailViewProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

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

  const customFields: CustomField[] = useMemo(() => {
    return (attributes.customFields as CustomField[]) || [];
  }, [attributes.customFields]);

  const storageKey = `${storagePrefix}:${entityId ?? ""}`;
  const [viewMode, setViewMode] = useState<"wiki" | "visual">(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === "visual" ? "visual" : "wiki";
  });
  const switchViewMode = (mode: "wiki" | "visual") => {
    setViewMode(mode);
    localStorage.setItem(storageKey, mode);
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
    void updateEntity({ id: entity.id, attributes: { ...attributes, [key]: value } });
  };

  const addSection = () => {
    const newId = `section_${Date.now()}`;
    handleAttrUpdate("sections", [
      ...sections,
      {
        id: newId,
        label: `${sections.length + 1}. ${t(`${prefix}.newSection`, "New Section")}`,
      },
    ]);
  };

  const renameSection = (id: string, newLabel: string) => {
    handleAttrUpdate(
      "sections",
      sections.map((section) =>
        section.id === id ? { ...section, label: newLabel } : section,
      ),
    );
  };

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t(`${prefix}.wiki.sectionDeleteTitle`, "Delete Section"),
        message: t(
          `${prefix}.deleteSectionConfirm`,
          "Are you sure you want to delete this section?",
        ),
        isDestructive: true,
      });
      if (!confirmed) return;
      handleAttrUpdate(
        "sections",
        sections.filter((section) => section.id !== id),
      );
    })();
  };

  const addCustomField = () => {
    const newKey = `custom_${Date.now()}`;
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
    <div className="flex-1 overflow-auto p-8 sm:p-6 flex flex-col gap-6 bg-panel text-fg min-w-0">
      <div className="border-b-2 border-(--namu-border) pb-4 mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BufferedInput
            className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
            value={entity.name}
            onSave={(val) => handleUpdate("name", val)}
          />
          <div className="flex items-center gap-1 p-0.5 rounded-panel bg-surface-hover border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => switchViewMode("wiki")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
                viewMode === "wiki" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              <BookOpen size={12} /> {t("entityVisual.toggle.wiki")}
            </button>
            <button
              type="button"
              onClick={() => switchViewMode("visual")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
                viewMode === "visual" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              <Sparkles size={12} /> {t("entityVisual.toggle.visual")}
            </button>
          </div>
        </div>
        <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
          <span className="font-bold">{t(`${prefix}.classificationLabel`, "Classification")}</span>
          <span className="text-(--namu-link) cursor-pointer hover:underline">
            {t(`${prefix}.template.basic`, templateFallback)}
          </span>
          <span className="text-border">|</span>
          <BufferedInput
            className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm"
            value={entity.description || ""}
            placeholder={t(`${prefix}.uncategorized`, "Uncategorized")}
            onSave={(val) => handleUpdate("description", val)}
          />
        </div>
      </div>

      {viewMode === "visual" ? (
        <EntityVisualPanel kind={entityKind} id={entity.id} name={entity.name} />
      ) : (
        <div className="@container">
          <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
            <div className="flex-1 flex flex-col gap-8 min-w-75 w-full @min-[700px]:order-1 order-2">
              <div className="bg-(--namu-table-bg) border border-(--namu-border) p-4 inline-block min-w-50 rounded">
                <div className="font-bold text-center mb-3 text-fg text-sm">
                  {t(`${prefix}.tocLabel`, "Contents")}
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      className="text-(--namu-link) no-underline cursor-pointer hover:underline"
                      href={`#${section.id}`}
                    >
                      {section.label}
                    </a>
                  ))}
                </div>
              </div>

              {sections.map((section) => (
                <WikiSection
                  key={section.id}
                  id={section.id}
                  label={section.label}
                  content={(attributes[section.id] as string) || ""}
                  onRename={(val) => renameSection(section.id, val)}
                  onUpdateContent={(val) => handleAttrUpdate(section.id, val)}
                  onDelete={() => deleteSection(section.id)}
                />
              ))}

              <button
                type="button"
                onClick={addSection}
                className="p-3 border-2 border-dashed border-border rounded-panel text-center text-subtle cursor-pointer mt-4 w-full bg-transparent hover:text-fg hover:border-fg transition-colors"
              >
                {t(`${prefix}.addSection`, "+ Add Section")}
              </button>
            </div>

            <div className="w-full @min-[700px]:w-[320px] shrink-0 @min-[700px]:order-2 order-1">
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, FileText } from "lucide-react";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useDialog } from "@shared/ui/useDialog";
import { cn } from "@shared/types/utils";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import { EntityDocumentView } from "@renderer/features/research/components/shared/EntityDocumentView";
import { Infobox } from "./Infobox";
import { WikiContentPanel, type WikiContentModel } from "./WikiContentPanel";

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

  const contentModel: WikiContentModel = {
    sections,
    getSectionContent: (id) => (attributes[id] as string) || "",
    setSectionContent: (id, value) => handleAttrUpdate(id, value),
    setSections: (next) => handleAttrUpdate("sections", next),
  };

  const customFields: CustomField[] = useMemo(() => {
    return (attributes.customFields as CustomField[]) || [];
  }, [attributes.customFields]);

  const storageKey = `${storagePrefix}:${entityId ?? ""}`;
  const [viewMode, setViewMode] = useState<"wiki" | "document">(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === "document" ? "document" : "wiki";
  });
  const switchViewMode = (mode: "wiki" | "document") => {
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
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BufferedInput
            className="text-[26px] font-extrabold text-fg leading-tight border-none bg-transparent flex-1 focus:outline-none min-w-0"
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
              onClick={() => switchViewMode("document")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-[12px] font-medium transition-colors",
                viewMode === "document" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              <FileText size={12} /> {t("entityVisual.toggle.document", "문서")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="font-medium">{t(`${prefix}.classificationLabel`, "Classification")}</span>
          <span className="text-border/60">·</span>
          <span className="text-accent/80">{t(`${prefix}.template.basic`, templateFallback)}</span>
          <span className="text-border/60">·</span>
          <BufferedInput
            className="inline min-w-[60px] font-medium text-accent/80 bg-transparent border-none p-0 focus:outline-none focus:bg-active focus:rounded-sm focus:px-1 transition-all"
            value={entity.description || ""}
            placeholder={t(`${prefix}.uncategorized`, "Uncategorized")}
            onSave={(val) => handleUpdate("description", val)}
          />
        </div>
      </div>

      {viewMode === "document" ? (
        <EntityDocumentView
          value={(attributes.document as string) || ""}
          onSave={(html) => handleAttrUpdate("document", html)}
          placeholder={t(`${prefix}.document.placeholder`, "자유롭게 써보세요...")}
        />
      ) : (
        <div className="@container">
          <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
            <div className="flex-1 min-w-0 w-full @min-[700px]:order-1 order-2">
              <WikiContentPanel attrs={contentModel} i18nPrefix={prefix} />
            </div>
            <div className="w-full @min-[700px]:w-[280px] shrink-0 @min-[700px]:order-2 order-1">
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

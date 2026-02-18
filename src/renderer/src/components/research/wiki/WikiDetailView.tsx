import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { useCharacterStore } from "../../../stores/characterStore";
import { BufferedInput } from "../../common/BufferedInput";
import { Infobox } from "./Infobox"; 
import { WikiSection } from "./WikiSection"; 
import { useDialog } from "../../common/DialogProvider";
import { SUPPORTED_LANGUAGES, i18n } from "../../../i18n";
import { CHARACTER_TEMPLATES } from "../../../../../shared/constants";


// Types for Dynamic Customization
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

export default function WikiDetailView() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { currentItem: character, updateCharacter } = useCharacterStore();

  const attributes = useMemo(() => {
    if (!character) return {};
    return typeof character.attributes === "string" 
      ? JSON.parse(character.attributes) 
      : (character.attributes || {});
  }, [character]);
  
  const currentTemplate = useMemo(() => {
    const templateId = attributes.templateId || "basic";
    return CHARACTER_TEMPLATES.find(t => t.id === templateId) || CHARACTER_TEMPLATES[0];
  }, [attributes.templateId]);

  const defaultSectionLabels = useMemo(() => {
    return t("character.defaultSections", { returnObjects: true }) as string[];
  }, [t]);

  const defaultLabelById = useMemo(() => {
    return {
      overview: defaultSectionLabels[0],
      appearance: defaultSectionLabels[1],
      personality: defaultSectionLabels[2],
      background: defaultSectionLabels[3],
      relations: defaultSectionLabels[4],
      notes: defaultSectionLabels[5],
    } as Record<string, string | undefined>;
  }, [defaultSectionLabels]);

  const defaultLabelSet = useMemo(() => {
    const labels = new Set<string>();
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const bundle = i18n.getResourceBundle(lang, "common") as {
        character?: { defaultSections?: string[] };
      } | undefined;
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
  }, [attributes.sections, defaultLabelById, defaultLabelSet, defaultSectionLabels]);

  const customFields: CustomField[] = useMemo(() => {
    return attributes.customFields || [];
  }, [attributes.customFields]);

  if (!character) {
      return (
          <div className="flex items-center justify-center h-full text-muted">
              {t("character.noSelection")}
          </div>
      );
  }

  const handleUpdate = (field: string, value: string) => {
    updateCharacter({ id: character.id, [field]: value });
  };

  const handleAttrUpdate = (key: string, value: unknown) => {
    const newAttrs = { ...attributes, [key]: value };
    updateCharacter({ id: character.id, attributes: newAttrs });
  };

  // Section Management
  const addSection = () => {
    const newId = `section_${Date.now()}`;
    const newSections = [
      ...sections,
      { id: newId, label: `${sections.length + 1}. ${t("character.newSection")}` },
    ];
    handleAttrUpdate("sections", newSections);
  };
  
  const renameSection = (id: string, newLabel: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, label: newLabel } : s);
    handleAttrUpdate("sections", newSections);
  };

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.sectionDeleteTitle"),
        message: t("character.deleteSectionConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      const newSections = sections.filter((section) => section.id !== id);
      handleAttrUpdate("sections", newSections);
    })();
  };

  // Custom Field Management
  const addCustomField = () => {
    const newKey = `custom_${Date.now()}`;
    const newField: CustomField = {
      key: newKey,
      label: t("character.newFieldLabel"),
      type: "text"
    };
    const newFields = [...customFields, newField];
    handleAttrUpdate("customFields", newFields);
  };

  const updateCustomFieldLabel = (key: string, newLabel: string) => {
    const newFields = customFields.map(f => f.key === key ? { ...f, label: newLabel } : f);
    handleAttrUpdate("customFields", newFields);
  };

  const deleteCustomField = (key: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.fieldDeleteTitle"),
        message: t("character.deleteFieldConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      const newFields = customFields.filter((field) => field.key !== key);
      handleAttrUpdate("customFields", newFields);
    })();
  };

  // Merge Base Fields + Custom Fields
  const allInfoboxFields = [
    ...currentTemplate.fields,
    ...customFields
  ];

  return (
    <div className="flex-1 overflow-auto p-8 sm:p-6 flex flex-col gap-6 bg-panel text-fg min-w-0">
      {/* 1. AUTHENTIC NAMUWIKI HEADER */}
      <div className="border-b-2 border-(--namu-border) pb-4 mb-6 flex flex-col gap-3">
        <BufferedInput 
          className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent w-full focus:outline-none"
          value={character.name} 
          onSave={(val) => handleUpdate("name", val)}
        />
        <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
          <span className="font-bold">{t("character.classificationLabel")}</span>
          <span className="text-(--namu-link) cursor-pointer hover:underline">{t(currentTemplate.nameKey)}</span>
           <span className="text-border">|</span>
          <BufferedInput 
              className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm" 
              value={character.description || ""}
              placeholder={t("character.uncategorized")}
              onSave={(val) => handleUpdate("description", val)} 
           />
        </div>
      </div>

      {/* 2. BODY CONTENT (Wiki Layout) */}
      <div className="@container">
        <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
          {/* LEFT: Content & TOC */}
          <div className="flex-1 flex flex-col gap-8 min-w-75 w-full @min-[700px]:order-1 order-2">
          
          {/* TOC (Inline) */}
          <div className="bg-(--namu-table-bg) border border-(--namu-border) p-4 inline-block min-w-50 rounded">
            <div className="font-bold text-center mb-3 text-fg text-sm">{t("character.tocLabel")}</div>
            <div className="flex flex-col gap-1.5 text-sm">
               {sections.map(sec => (
                 <a key={sec.id} className="text-(--namu-link) no-underline cursor-pointer hover:underline" href={`#${sec.id}`}>
                   {sec.label}
                 </a>
               ))}
            </div>
          </div>

          {/* Sections */}
          {sections.map(sec => (
            <WikiSection 
                key={sec.id}
                id={sec.id}
                label={sec.label}
                content={attributes[sec.id]}
                onRename={(val) => renameSection(sec.id, val)}
                onUpdateContent={(val) => handleAttrUpdate(sec.id, val)}
                onDelete={() => deleteSection(sec.id)}
            />
          ))}

          {/* Add Section Button */}
          <button 
             type="button"
             onClick={addSection}
             className="p-3 border-2 border-dashed border-border rounded-lg text-center text-subtle cursor-pointer mt-4 w-full bg-transparent hover:text-fg hover:border-fg transition-colors"
          >
             {t("character.addSection")}
          </button>

        </div>


        {/* RIGHT: Authentic Infobox */}
        {/* Use order-first on mobile (default) to put it on top, order-last on Desktop to put it on right */}
        <div className="w-full @min-[700px]:w-[320px] shrink-0 @min-[700px]:order-2 order-1">
            <Infobox 
                title={character.name}
                image={<User size={80} color="var(--border-active)" />}
                rows={allInfoboxFields.map(field => {
                    const isCustom = customFields.some(cf => cf.key === field.key);
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
                        value: attributes[field.key],
                    placeholder,
                        type: field.type,
                    options,
                        isCustom,
                        onSave: (v) => handleAttrUpdate(field.key, v),
                        onLabelSave: isCustom ? (v) => updateCustomFieldLabel(field.key, v) : undefined,
                        onDelete: isCustom ? () => deleteCustomField(field.key) : undefined
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

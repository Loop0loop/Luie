import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { Infobox } from "@renderer/features/research/components/wiki/Infobox";
import { WikiSection } from "@renderer/features/research/components/wiki/WikiSection";
import { useDialog } from "@shared/ui/useDialog";

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

interface FactionDetailViewProps {
    factionId?: string;
}

export default function FactionDetailView({ factionId }: FactionDetailViewProps) {
    const { t } = useTranslation();
    const dialog = useDialog();
    const { currentItem: factionObj, updateFaction, loadFaction } = useFactionStore();

    useEffect(() => {
        if (factionId) {
            void loadFaction(factionId);
        }
    }, [factionId, loadFaction]);

    const attributes = useMemo(() => {
        if (!factionObj) return {};
        return typeof factionObj.attributes === "string"
            ? JSON.parse(factionObj.attributes)
            : (factionObj.attributes || {});
    }, [factionObj]);

    const defaultSectionLabels = useMemo(() => {
        return [
            t("faction.section.overview", "Overview"),
            t("faction.section.history", "History"),
            t("faction.section.organization", "Organization"),
            t("faction.section.relationships", "Relationships"),
            t("faction.section.notes", "Notes"),
        ];
    }, [t]);

    const sections: WikiSectionData[] = useMemo(() => {
        if (attributes.sections) {
            return attributes.sections as WikiSectionData[];
        }
        return [
            { id: "overview", label: defaultSectionLabels[0] ?? "1" },
            { id: "history", label: defaultSectionLabels[1] ?? "2" },
            { id: "organization", label: defaultSectionLabels[2] ?? "3" },
            { id: "relationships", label: defaultSectionLabels[3] ?? "4" },
            { id: "notes", label: defaultSectionLabels[4] ?? "5" },
        ];
    }, [attributes.sections, defaultSectionLabels]);

    const customFields: CustomField[] = useMemo(() => {
        return attributes.customFields || [];
    }, [attributes.customFields]);

    if (!factionObj) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                {t("faction.noSelection", "No Faction Selected")}
            </div>
        );
    }

    const handleUpdate = (field: string, value: string) => {
        updateFaction({ id: factionObj.id, [field]: value });
    };

    const handleAttrUpdate = (key: string, value: unknown) => {
        const newAttrs = { ...attributes, [key]: value };
        updateFaction({ id: factionObj.id, attributes: newAttrs });
    };

    // Section Management
    const addSection = () => {
        const newId = `section_${Date.now()}`;
        const newSections = [
            ...sections,
            { id: newId, label: `${sections.length + 1}. ${t("faction.newSection", "New Section")}` },
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
                title: t("faction.wiki.sectionDeleteTitle", "Delete Section"),
                message: t("faction.deleteSectionConfirm", "Are you sure you want to delete this section?"),
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
            label: t("faction.newFieldLabel", "New Field"),
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
                title: t("faction.wiki.fieldDeleteTitle", "Delete Field"),
                message: t("faction.deleteFieldConfirm", "Are you sure you want to delete this field?"),
                isDestructive: true,
            });
            if (!confirmed) return;
            const newFields = customFields.filter((field) => field.key !== key);
            handleAttrUpdate("customFields", newFields);
        })();
    };

    return (
        <div className="flex-1 overflow-auto p-8 sm:p-6 flex flex-col gap-6 bg-panel text-fg min-w-0">
            <div className="border-b-2 border-(--namu-border) pb-4 mb-6 flex flex-col gap-3">
                <BufferedInput
                    className="text-3xl font-extrabold text-fg leading-tight border-none bg-transparent w-full focus:outline-none"
                    value={factionObj.name}
                    onSave={(val) => handleUpdate("name", val)}
                />
                <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
                    <span className="font-bold">{t("faction.classificationLabel", "Classification")}</span>
                    <span className="text-(--namu-link) cursor-pointer hover:underline">{t("faction.template.basic", "Basic Faction")}</span>
                    <span className="text-border">|</span>
                    <BufferedInput
                        className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm"
                        value={factionObj.description || ""}
                        placeholder={t("faction.uncategorized", "Uncategorized")}
                        onSave={(val) => handleUpdate("description", val)}
                    />
                </div>
            </div>

            <div className="@container">
                <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
                    <div className="flex-1 flex flex-col gap-8 min-w-75 w-full @min-[700px]:order-1 order-2">

                        <div className="bg-(--namu-table-bg) border border-(--namu-border) p-4 inline-block min-w-50 rounded">
                            <div className="font-bold text-center mb-3 text-fg text-sm">{t("faction.tocLabel", "Contents")}</div>
                            <div className="flex flex-col gap-1.5 text-sm">
                                {sections.map(sec => (
                                    <a key={sec.id} className="text-(--namu-link) no-underline cursor-pointer hover:underline" href={`#${sec.id}`}>
                                        {sec.label}
                                    </a>
                                ))}
                            </div>
                        </div>

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

                        <button
                            type="button"
                            onClick={addSection}
                            className="p-3 border-2 border-dashed border-border rounded-lg text-center text-subtle cursor-pointer mt-4 w-full bg-transparent hover:text-fg hover:border-fg transition-colors"
                        >
                            {t("faction.addSection", "+ Add Section")}
                        </button>

                    </div>

                    <div className="w-full @min-[700px]:w-[320px] shrink-0 @min-[700px]:order-2 order-1">
                        <Infobox
                            title={factionObj.name}
                            image={<Shield size={80} color="var(--border-active)" />}
                            rows={customFields.map(field => {
                                return {
                                    label: field.label,
                                    value: attributes[field.key],
                                    placeholder: field.placeholder,
                                    type: field.type,
                                    options: field.options,
                                    isCustom: true,
                                    onSave: (v) => handleAttrUpdate(field.key, v),
                                    onLabelSave: (v) => updateCustomFieldLabel(field.key, v),
                                    onDelete: () => deleteCustomField(field.key)
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

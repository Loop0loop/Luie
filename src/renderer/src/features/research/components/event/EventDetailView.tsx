import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
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

interface EventDetailViewProps {
    eventId?: string;
}

export default function EventDetailView({ eventId }: EventDetailViewProps) {
    const { t } = useTranslation();
    const dialog = useDialog();
    const { currentItem: eventObj, updateEvent, loadEvent } = useEventStore();

    useEffect(() => {
        if (eventId) {
            void loadEvent(eventId);
        }
    }, [eventId, loadEvent]);

    const attributes = useMemo(() => {
        if (!eventObj) return {};
        return typeof eventObj.attributes === "string"
            ? JSON.parse(eventObj.attributes)
            : (eventObj.attributes || {});
    }, [eventObj]);

    const defaultSectionLabels = useMemo(() => {
        return [
            t("event.section.overview", "Overview"),
            t("event.section.timeline", "Timeline"),
            t("event.section.locations", "Locations"),
            t("event.section.participants", "Participants"),
            t("event.section.notes", "Notes"),
        ];
    }, [t]);

    const sections: WikiSectionData[] = useMemo(() => {
        if (attributes.sections) {
            return attributes.sections as WikiSectionData[];
        }
        return [
            { id: "overview", label: defaultSectionLabels[0] ?? "1" },
            { id: "timeline", label: defaultSectionLabels[1] ?? "2" },
            { id: "locations", label: defaultSectionLabels[2] ?? "3" },
            { id: "participants", label: defaultSectionLabels[3] ?? "4" },
            { id: "notes", label: defaultSectionLabels[4] ?? "5" },
        ];
    }, [attributes.sections, defaultSectionLabels]);

    const customFields: CustomField[] = useMemo(() => {
        return attributes.customFields || [];
    }, [attributes.customFields]);

    if (!eventObj) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                {t("event.noSelection", "No Event Selected")}
            </div>
        );
    }

    const handleUpdate = (field: string, value: string) => {
        updateEvent({ id: eventObj.id, [field]: value });
    };

    const handleAttrUpdate = (key: string, value: unknown) => {
        const newAttrs = { ...attributes, [key]: value };
        updateEvent({ id: eventObj.id, attributes: newAttrs });
    };

    // Section Management
    const addSection = () => {
        const newId = `section_${Date.now()}`;
        const newSections = [
            ...sections,
            { id: newId, label: `${sections.length + 1}. ${t("event.newSection", "New Section")}` },
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
                title: t("event.wiki.sectionDeleteTitle", "Delete Section"),
                message: t("event.deleteSectionConfirm", "Are you sure you want to delete this section?"),
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
            label: t("event.newFieldLabel", "New Field"),
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
                title: t("event.wiki.fieldDeleteTitle", "Delete Field"),
                message: t("event.deleteFieldConfirm", "Are you sure you want to delete this field?"),
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
                    value={eventObj.name}
                    onSave={(val) => handleUpdate("name", val)}
                />
                <div className="text-[13px] text-muted bg-surface border border-border px-3 py-1.5 rounded self-start flex items-center gap-2">
                    <span className="font-bold">{t("event.classificationLabel", "Classification")}</span>
                    <span className="text-(--namu-link) cursor-pointer hover:underline">{t("event.template.basic", "Basic Event")}</span>
                    <span className="text-border">|</span>
                    <BufferedInput
                        className="inline w-auto font-semibold text-(--namu-link) bg-transparent border-none p-1 focus:outline-none focus:bg-active rounded-sm"
                        value={eventObj.description || ""}
                        placeholder={t("event.uncategorized", "Uncategorized")}
                        onSave={(val) => handleUpdate("description", val)}
                    />
                </div>
            </div>

            <div className="@container">
                <div className="flex flex-col @min-[700px]:flex-row gap-8 items-start min-h-0">
                    <div className="flex-1 flex flex-col gap-8 min-w-75 w-full @min-[700px]:order-1 order-2">

                        <div className="bg-(--namu-table-bg) border border-(--namu-border) p-4 inline-block min-w-50 rounded">
                            <div className="font-bold text-center mb-3 text-fg text-sm">{t("event.tocLabel", "Contents")}</div>
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
                            {t("event.addSection", "+ Add Section")}
                        </button>

                    </div>

                    <div className="w-full @min-[700px]:w-[320px] shrink-0 @min-[700px]:order-2 order-1">
                        <Infobox
                            title={eventObj.name}
                            image={<Calendar size={80} color="var(--border-active)" />}
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

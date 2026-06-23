import { Plus, X } from "lucide-react";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { useTranslation } from "react-i18next";

type InfoboxRowProps = {
  label: string;
  value?: string;
  onSave?: (v: string) => void;
  onLabelSave?: (v: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  isCustom?: boolean;
  onDelete?: () => void;
};

export function InfoboxRow({
  label,
  value,
  onSave,
  onLabelSave,
  placeholder,
  type = "text",
  options = [],
  isCustom = false,
  onDelete,
}: InfoboxRowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex border-b border-(--namu-border) last:border-b-0 min-h-[40px] group/row hover:bg-(--namu-hover-bg) transition-colors">
      <div className="w-[100px] bg-(--namu-table-bg) px-2 py-2 font-semibold text-(--namu-table-label) border-r border-(--namu-border) flex items-center justify-center text-center leading-tight shrink-0 relative text-[12px]">
        {isCustom ? (
          <div className="flex items-center relative w-full justify-center">
            <BufferedInput
              className="border-none bg-transparent w-full color-inherit font-inherit p-1 text-center focus:outline-none focus:bg-active focus:rounded-sm text-[12px]"
              value={label}
              onSave={onLabelSave || (() => {})}
            />
            {onDelete && (
              <button
                type="button"
                className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity border-none bg-transparent text-muted cursor-pointer p-0.5 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title={t("character.wiki.fieldDeleteTitle")}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : (
          label
        )}
      </div>
      <div className="flex-1 px-2.5 py-1.5 flex items-center bg-surface text-fg text-[13px]">
        {type === "select" ? (
          <select
            className="border-none bg-transparent w-full text-fg text-[13px] p-0.5 focus:outline-none cursor-pointer"
            value={value || ""}
            onChange={(e) => onSave?.(e.target.value)}
          >
            <option value="">{t("character.wiki.selectPlaceholder")}</option>
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <BufferedInput
            className="border-none bg-transparent w-full text-fg text-[13px] p-0.5 focus:outline-none focus:bg-active focus:rounded-sm placeholder:text-muted/40"
            value={value || ""}
            placeholder={placeholder || t("character.wiki.valuePlaceholder")}
            onSave={onSave || (() => {})}
          />
        )}
      </div>
    </div>
  );
}

export function Infobox({
  title,
  image,
  rows,
  onAddField,
}: {
  title: string;
  image?: React.ReactNode;
  rows: InfoboxRowProps[];
  onAddField: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full border border-(--namu-border) bg-surface rounded-lg overflow-hidden shrink-0 shadow-sm text-[13px]">
      <div className="bg-accent text-white text-center px-3 py-2.5 font-bold text-[14px]">
        {title}
      </div>
      {image && (
        <div className="w-full bg-(--namu-table-bg) flex items-center justify-center border-b border-(--namu-border) py-6">
          {image}
        </div>
      )}
      <div className="flex flex-col">
        {rows.map((row) => (
          <InfoboxRow key={row.label + (row.isCustom ? "cust" : "fixed")} {...row} />
        ))}
      </div>
      <button
        type="button"
        className="w-full px-3 py-2.5 bg-surface border-none border-t border-(--namu-border) text-muted text-[12px] cursor-pointer flex items-center justify-center gap-1.5 hover:bg-(--namu-hover-bg) hover:text-fg transition-colors"
        onClick={onAddField}
      >
        <Plus size={11} />
        <span>{t("character.wiki.addField")}</span>
      </button>
    </div>
  );
}

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
    <div className="flex flex-col gap-1 py-2 border-b border-border/40 last:border-b-0 group/row">
      <div className="flex items-center justify-between gap-1">
        {isCustom ? (
          <BufferedInput
            className="border-none bg-transparent w-full text-[11px] font-medium text-muted p-0 focus:outline-none focus:text-fg/80"
            value={label}
            onSave={onLabelSave || (() => {})}
          />
        ) : (
          <span className="text-[11px] font-medium text-muted">{label}</span>
        )}
        {onDelete && (
          <button
            type="button"
            className="opacity-0 group-hover/row:opacity-100 transition-opacity border-none bg-transparent text-muted cursor-pointer p-0.5 hover:text-danger shrink-0"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title={t("character.wiki.fieldDeleteTitle")}
          >
            <X size={10} />
          </button>
        )}
      </div>
      <div className="flex items-center text-fg text-[13px]">
        {type === "select" ? (
          <select
            className="border-none bg-transparent w-full text-fg text-[13px] p-0 focus:outline-none cursor-pointer"
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
            className="border-none bg-transparent w-full text-fg text-[13px] p-0 focus:outline-none placeholder:text-muted/35"
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
  imageUrl,
  rows,
  onAddField,
}: {
  title: string;
  image?: React.ReactNode;
  imageUrl?: string | null;
  rows: InfoboxRowProps[];
  onAddField: () => void;
}) {
  const { t } = useTranslation();

  const portrait = imageUrl ? (
    <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
  ) : (
    image
  );

  return (
    <div className="w-full shrink-0 overflow-hidden rounded-panel border border-border/70 bg-surface text-[13px] shadow-sm">
      {/* Infobox Header */}
      <div className="border-b border-border/50 bg-element/40 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {t("character.wiki.infoboxTitle", "프로필 요약")}
        </span>
        <span className="text-[11px] font-medium text-fg truncate max-w-[140px]">
          {title}
        </span>
      </div>

      <div className="p-4">
        {portrait && (
          <div className="flex items-center justify-center pb-3.5 mb-2 border-b border-border/30">
            <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-element text-subtle border-2 border-border/60 shadow-xs ring-4 ring-element/50">
              {portrait}
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {rows.map((row) => (
            <InfoboxRow key={row.label + (row.isCustom ? "cust" : "fixed")} {...row} />
          ))}
        </div>

        <button
          type="button"
          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-border/80 py-1.5 text-xs font-medium text-subtle hover:border-accent hover:text-accent hover:bg-accent/5 transition-all cursor-pointer"
          onClick={onAddField}
        >
          <Plus size={12} />
          <span>{t("character.wiki.addField", "속성 추가")}</span>
        </button>
      </div>
    </div>
  );
}

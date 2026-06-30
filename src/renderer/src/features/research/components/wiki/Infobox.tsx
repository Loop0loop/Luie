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
  color,
  rows,
  onAddField,
}: {
  title: string;
  image?: React.ReactNode;
  /** Generated portrait URL; falls back to `image` node when absent. */
  imageUrl?: string | null;
  /** Character signature colour (hex). When set, the box renders as a tinted identity card. */
  color?: string;
  rows: InfoboxRowProps[];
  onAddField: () => void;
}) {
  const { t } = useTranslation();
  // ponytail: title is now shown in the page header; prop kept to avoid caller churn.
  void title;

  const portrait = imageUrl ? (
    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    image
  );

  const body = (
    <>
      {(portrait || color) && (
        <div className="flex items-center justify-center pb-3">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full"
            style={
              color
                ? { backgroundColor: `${color}1a`, border: `1px solid ${color}33` }
                : undefined
            }
          >
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
        className="mt-2 flex items-center gap-1 bg-transparent border-none text-[12px] text-subtle hover:text-accent transition-colors cursor-pointer p-0"
        onClick={onAddField}
      >
        <Plus size={11} />
        <span>{t("character.wiki.addField")}</span>
      </button>
    </>
  );

  // Character identity card (colour present); event/faction keep the plain box.
  if (color) {
    return (
      <div className="w-full shrink-0 overflow-hidden rounded-panel border border-border bg-surface text-[13px] shadow-panel">
        <div className="h-1" style={{ backgroundColor: color }} />
        <div className="p-4">{body}</div>
      </div>
    );
  }

  return <div className="w-full shrink-0 text-[13px]">{body}</div>;
}

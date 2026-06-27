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
  rows,
  onAddField,
  isEditing = true,
}: {
  title: string;
  image?: React.ReactNode;
  rows: InfoboxRowProps[];
  onAddField: () => void;
  /** When false, render as a read-only profile card (text only). */
  isEditing?: boolean;
}) {
  const { t } = useTranslation();
  // ponytail: title is now shown in the page header; prop kept to avoid caller churn.
  void title;

  // ── Read mode: profile card with text rows, empty values hidden ─────────
  if (!isEditing) {
    const filled = rows.filter((r) => r.value && r.value.trim().length > 0);
    return (
      <div className="w-full shrink-0 rounded-panel border border-border/60 bg-surface/40 p-4">
        {image && (
          <div className="flex items-center justify-center pb-3 mb-1">{image}</div>
        )}
        {filled.length > 0 ? (
          <dl className="flex flex-col">
            {filled.map((row) => (
              <div
                key={row.label + (row.isCustom ? "cust" : "fixed")}
                className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/30 last:border-b-0"
              >
                <dt className="text-[11px] text-muted shrink-0">{row.label}</dt>
                <dd className="text-[13px] text-fg text-right break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-center text-[12px] text-muted/60 py-2">
            {t("character.wiki.profileEmpty", "프로필 정보 없음")}
          </p>
        )}
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────
  return (
    <div className="w-full shrink-0 text-[13px]">
      {image && (
        <div className="flex items-center justify-center pb-3">{image}</div>
      )}
      <div className="flex flex-col">
        {rows.map((row) => (
          <InfoboxRow key={row.label + (row.isCustom ? "cust" : "fixed")} {...row} />
        ))}
      </div>
      <button
        type="button"
        className="mt-2 flex items-center gap-1 bg-transparent border-none text-[12px] text-muted/60 hover:text-accent transition-colors cursor-pointer p-0"
        onClick={onAddField}
      >
        <Plus size={11} />
        <span>{t("character.wiki.addField")}</span>
      </button>
    </div>
  );
}

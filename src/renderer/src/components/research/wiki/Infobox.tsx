import { Plus, X } from "lucide-react";
import { BufferedInput } from "../../common/BufferedInput";

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
  return (
    <div className="flex border-b border-[var(--namu-border)] min-h-[40px] last:border-b-0">
      <div className="w-[100px] bg-[var(--namu-table-bg)] p-2 font-bold text-[var(--namu-table-label)] border-r border-[var(--namu-border)] flex items-center justify-center text-center leading-tight shrink-0 relative text-[13px]">
        {isCustom ? (
          <div className="flex items-center relative w-full justify-center">
             <BufferedInput
              className="border-none bg-transparent w-full color-inherit font-inherit p-1 text-center focus:outline-none focus:bg-active focus:rounded-sm"
              value={label}
              onSave={onLabelSave || (() => {})}
            />
            {onDelete && (
                <button 
                    type="button"
                    className="absolute left-[-4px] top-1/2 -translate-y-1/2 bg-none border-none text-subtle cursor-pointer p-1 opacity-50 hover:text-danger hover:opacity-100" 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="항목 삭제"
                >
                    <X size={10} />
                </button>
            )}
          </div>
        ) : (
          label
        )}
      </div>
      <div className="flex-1 p-1 px-2 flex items-center bg-surface text-fg leading-relaxed text-[13px]">
        {type === "select" ? (
          <select
            className="border-none bg-transparent w-full color-inherit font-inherit p-1 focus:outline-none focus:bg-active focus:rounded-sm"
            value={value || ""}
            onChange={(e) => onSave?.(e.target.value)}
          >
            <option value="">- 선택 -</option>
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <BufferedInput
            className="border-none bg-transparent w-full color-inherit font-inherit p-1 focus:outline-none focus:bg-active focus:rounded-sm"
            value={value || ""}
            placeholder={placeholder || "-"}
            onSave={onSave || (() => {})}
          />
        )}
      </div>
    </div>
  );
}

export function Infobox({
  title,
  image, // Placeholder for future
  rows,
  onAddField,
}: {
  title: string;
  image?: React.ReactNode;
  rows: InfoboxRowProps[];
  onAddField: () => void;
}) {
  return (
    <div className="w-full lg:w-[320px] border-2 border-[var(--namu-blue)] bg-surface shadow-md rounded overflow-hidden shrink-0 text-[13px]">
      <div className="bg-[var(--namu-blue)] text-white text-center p-2.5 font-bold text-[15px] border-b border-[var(--namu-blue)]">{title}</div>
      {image && <div className="w-full bg-surface flex items-center justify-center border-b border-[var(--namu-border)] p-5">{image}</div>}

      <div className="flex flex-col">
        {rows.map((row) => (
            <InfoboxRow key={row.label + (row.isCustom ? 'cust' : 'fixed')} {...row} />
        ))}
      </div>

       <button type="button" className="w-full p-2.5 bg-surface-hover border-none border-t border-[var(--namu-border)] text-muted text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-active hover:text-fg" onClick={onAddField}>
        <Plus size={12} />
        <span>필드 추가</span>
      </button>
    </div>
  );
}

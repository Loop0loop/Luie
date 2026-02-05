import type { ChangeEvent } from "react";
import { Search } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant: "context" | "memo";
};

export default function SearchInput({
  value,
  onChange,
  placeholder,
  variant,
}: SearchInputProps) {
  if (variant === "memo") {
    return (
      <div className="flex items-center gap-2 bg-element px-2 py-1.5 rounded">
        <Search
          style={{ width: "var(--memo-search-icon-size)", height: "var(--memo-search-icon-size)" }}
          color="var(--text-tertiary)"
        />
        <input
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "var(--memo-search-font-size)",
            width: "100%",
            color: "var(--text-primary)",
          }}
          placeholder={placeholder}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none icon-sm" />
      <input
        className="w-full bg-element border border-border rounded-md py-2 px-3 pl-8 text-[13px] text-fg outline-none transition-all focus:border-active focus:ring-1 focus:ring-active"
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

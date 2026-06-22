import { useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@shared/types/utils";
import { ToolbarButton } from "./primitives";
import { useClickOutside } from "./useClickOutside";

export function CompactDropdown<T extends string | number>({
  className,
  getLabel,
  onChange,
  options,
  value,
  "aria-label": ariaLabel,
}: {
  className?: string;
  getLabel?: (v: T) => string;
  onChange: (v: T) => void;
  options: readonly T[];
  value: T;
  "aria-label": string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const displayLabel = getLabel ? getLabel(value) : String(value);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        className="flex h-8 w-full items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-xs text-fg transition-colors hover:bg-hover"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex-1 truncate text-left">{displayLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-y-auto rounded-md border border-border bg-panel py-1 shadow-xl" style={{ maxHeight: "13rem" }}>
          {options.map((option) => {
            const label = getLabel ? getLabel(option) : String(option);
            return (
              <button
                key={String(option)}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-hover",
                  option === value ? "font-medium text-accent" : "text-fg",
                )}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ColorPickerMenu({
  colors,
  icon,
  label,
  onChange,
  value,
  columns = 5,
}: {
  colors: readonly { label: string; hex: string }[];
  icon: React.ReactNode;
  label: string;
  onChange: (hex: string) => void;
  value: string;
  columns?: number;
}) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const normalizedValue = value.toLowerCase();
  const isValidHex = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h);

  const handleHexCommit = () => {
    const normalized = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (isValidHex(normalized)) {
      onChange(normalized);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn(
          "flex h-8 min-w-8 flex-col items-center justify-center gap-px rounded-md px-2 transition-colors hover:bg-hover",
          open && "bg-accent/15",
        )}
        title={label}
        onClick={() => {
          setHexInput(value);
          setOpen((v) => !v);
        }}
      >
        <span className="text-muted">{icon}</span>
        <span
          className="h-[3px] w-4 rounded-full"
          style={{
            backgroundColor:
              normalizedValue === "#ffffff" ? "var(--text-secondary)" : value,
          }}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded-xl border border-border bg-panel p-3.5 shadow-2xl" style={{ minWidth: "11rem" }}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {label}
          </p>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {colors.map(({ label: colorLabel, hex }) => {
              const isSelected = normalizedValue === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  title={colorLabel}
                  className={cn(
                    "h-6 w-6 rounded-md shadow-sm transition-all duration-100",
                    isSelected
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-panel scale-110"
                      : "ring-1 ring-black/10 hover:scale-110 hover:ring-border",
                  )}
                  style={{ backgroundColor: hex }}
                  onClick={() => {
                    onChange(hex);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
            <div
              className="h-4 w-4 shrink-0 rounded-sm ring-1 ring-black/10"
              style={{
                backgroundColor: isValidHex(
                  hexInput.startsWith("#") ? hexInput : `#${hexInput}`,
                )
                  ? hexInput.startsWith("#")
                    ? hexInput
                    : `#${hexInput}`
                  : value,
              }}
            />
            <input
              type="text"
              maxLength={7}
              placeholder="#000000"
              className="w-full bg-transparent text-[11px] text-fg outline-none placeholder:text-muted/50"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleHexCommit();
                if (e.key === "Escape") setOpen(false);
              }}
              onBlur={handleHexCommit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TypographyMenu({
  letterSpacing,
  lineHeight,
  onLetterSpacingChange,
  onLineHeightChange,
  onParagraphSpacingChange,
  paragraphSpacing,
}: {
  letterSpacing: number;
  lineHeight: number;
  onLetterSpacingChange: (v: number) => void;
  onLineHeightChange: (v: number) => void;
  onParagraphSpacingChange: (v: number) => void;
  paragraphSpacing: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const sliders = [
    {
      label: t("toolbar.tooltip.letterSpacing", "자간"),
      min: 0, max: 0.3, step: 0.01,
      value: letterSpacing,
      onChange: onLetterSpacingChange,
      display: letterSpacing.toFixed(2),
    },
    {
      label: t("toolbar.tooltip.lineHeight", "줄간격"),
      min: 1, max: 2.4, step: 0.05,
      value: lineHeight,
      onChange: onLineHeightChange,
      display: lineHeight.toFixed(2),
    },
    {
      label: t("toolbar.tooltip.paragraphSpacing", "문단간격"),
      min: 0, max: 3, step: 0.1,
      value: paragraphSpacing,
      onChange: onParagraphSpacingChange,
      display: paragraphSpacing.toFixed(1),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton
        active={open}
        label={t("toolbar.typography", "타이포그래피")}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </ToolbarButton>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1 w-56 -translate-x-1/2 rounded-lg border border-border bg-panel p-3.5 shadow-xl">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("toolbar.typography", "타이포그래피")}
          </p>
          {sliders.map(({ label, min, max, step, value, onChange, display }) => (
            <div key={label} className="mb-3.5 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted">{label}</span>
                <span className="min-w-[2.75rem] rounded-md bg-hover px-1.5 py-0.5 text-right text-[11px] font-medium tabular-nums text-fg">
                  {display}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                className="w-full accent-[var(--accent-bg)]"
                aria-label={label}
                onChange={(e) => onChange(Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

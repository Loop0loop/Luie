import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@shared/types/utils";
import { ToolbarButton } from "./primitives";
import { useClickOutside } from "./useClickOutside";

type HsvColor = { h: number; s: number; v: number };

const isHexColor = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

const hexToHsv = (hex: string): HsvColor => {
  if (!isHexColor(hex)) return { h: 220, s: 75, v: 90 };
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const hue = delta === 0
    ? 0
    : ((max === red ? (green - blue) / delta : max === green ? 2 + (blue - red) / delta : 4 + (red - green) / delta) * 60 + 360) % 360;
  return { h: hue, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
};

const hsvToHex = ({ h, s, v }: HsvColor): string => {
  const chroma = (v / 100) * (s / 100);
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0] : segment < 2 ? [secondary, chroma, 0] : segment < 3 ? [0, chroma, secondary] : segment < 4 ? [0, secondary, chroma] : segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  const match = v / 100 - chroma;
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`;
};

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
        className="flex h-8 w-full items-center gap-1 rounded-control border border-border bg-app px-2 text-xs text-fg transition-colors hover:bg-hover"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex-1 truncate text-left">{displayLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-y-auto rounded-control border border-border bg-panel py-1 shadow-panel" style={{ maxHeight: "13rem" }}>
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
  clearLabel,
  onClear,
  onChange,
  value,
  columns = 5,
}: {
  colors: readonly { label: string; hex: string }[];
  icon: React.ReactNode;
  label: string;
  clearLabel?: string;
  onClear?: () => void;
  onChange: (hex: string) => void;
  value: string;
  columns?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState<HsvColor>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);
  const customColorRef = useRef(customColor);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const normalizedValue = value.toLowerCase();
  const customHex = hsvToHex(customColor);

  const updateCustomColor = (next: HsvColor, commit = false) => {
    const hex = hsvToHex(next);
    customColorRef.current = next;
    setCustomColor(next);
    setHexInput(hex);
    if (commit) onChange(hex);
  };

  const updatePlane = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    updateCustomColor({
      ...customColor,
      s: Math.round(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) * 100),
      v: Math.round((1 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))) * 100),
    });
  };

  const commitCustomColor = () => onChange(hsvToHex(customColorRef.current));

  const toggleMenu = () => {
    if (!open) {
      const next = hexToHsv(value);
      customColorRef.current = next;
      setCustomColor(next);
      setHexInput(value);
    }
    setOpen((isOpen) => !isOpen);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn(
          "flex h-8 min-w-8 flex-col items-center justify-center gap-px rounded-control px-2 transition-colors hover:bg-hover",
          open && "bg-active text-accent",
        )}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={toggleMenu}
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
        <div
          className="absolute left-1/2 top-full z-50 mt-2 min-w-48 -translate-x-1/2 rounded-panel border border-border bg-panel p-3.5 shadow-panel"
          onWheelCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <p className="mb-3 text-xs font-medium text-fg">
            {label}
          </p>

          {onClear && clearLabel && (
            <button
              type="button"
              className="mb-3 flex h-8 w-full items-center rounded-control bg-app px-2.5 text-left text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              {clearLabel}
            </button>
          )}

          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {colors.map(({ label: colorLabel, hex }) => {
              const isSelected = normalizedValue === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  title={colorLabel}
                  aria-label={colorLabel}
                  aria-pressed={isSelected}
                  className={cn(
                    "h-8 w-8 rounded-control border transition-[filter,border-color,box-shadow] hover:brightness-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-accent shadow-[inset_0_0_0_1px_var(--accent-bg)]"
                      : "border-border",
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

          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{t("toolbar.customColor", "사용자 지정 색상")}</span>
              <span className="h-5 w-5 rounded-md border border-border" style={{ backgroundColor: customHex }} />
            </div>
            <div
              className="relative h-24 cursor-crosshair overflow-hidden rounded-control"
              style={{ backgroundColor: `hsl(${customColor.h} 100% 50%)` }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updatePlane(event);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePlane(event);
              }}
              onPointerUp={commitCustomColor}
            >
              <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black to-transparent" />
              <span
                className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-control"
                style={{ left: `${customColor.s}%`, top: `${100 - customColor.v}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={customColor.h}
              className="editor-color-hue-slider mt-3 w-full"
              aria-label={t("toolbar.customColor", "사용자 지정 색상")}
              onChange={(event) => updateCustomColor({ ...customColor, h: Number(event.currentTarget.value) })}
              onPointerUp={commitCustomColor}
              onKeyUp={commitCustomColor}
            />
            <div className="mt-3 flex h-8 items-center gap-2 rounded-control border border-border bg-app px-2.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-ring">
              <span className="text-[10px] font-medium text-muted">HEX</span>
              <input
                value={hexInput}
                maxLength={7}
                className="min-w-0 flex-1 bg-transparent text-xs text-fg outline-hidden"
                onChange={(event) => setHexInput(event.currentTarget.value)}
                onBlur={() => {
                  if (isHexColor(hexInput)) updateCustomColor(hexToHsv(hexInput), true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && isHexColor(hexInput)) {
                    updateCustomColor(hexToHsv(hexInput), true);
                  }
                }}
              />
            </div>
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
        <div className="absolute left-1/2 top-full z-50 mt-1 w-56 -translate-x-1/2 rounded-panel border border-border bg-panel p-3.5 shadow-panel">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("toolbar.typography", "타이포그래피")}
          </p>
          {sliders.map(({ label, min, max, step, value, onChange, display }) => (
            <div key={label} className="mb-3.5 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted">{label}</span>
                <span className="min-w-[2.75rem] rounded-control bg-hover px-1.5 py-0.5 text-right text-[11px] font-medium tabular-nums text-fg">
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

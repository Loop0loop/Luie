import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eraser,
  FileOutput,
  Highlighter,
  Italic,
  Minus,
  Monitor,
  MoreHorizontal,
  Palette,
  Pilcrow,
  Redo2,
  SlidersHorizontal,
  Smartphone,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";

import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { FontSelector } from "./FontSelector";

interface EditorToolbarProps {
  editor: Editor | null;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
  onOpenWorldGraph?: () => void;
  onOpenPreview?: () => void;
  onOpenExport?: () => void;
  canOpenExport?: boolean;
}

type ParagraphStyle = "paragraph" | "heading1" | "heading2" | "heading3";

const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32] as const;

const TEXT_COLORS = [
  { label: "검정", hex: "#111827" },
  { label: "진회색", hex: "#374151" },
  { label: "회색", hex: "#6B7280" },
  { label: "연회색", hex: "#D1D5DB" },
  { label: "흰색", hex: "#FFFFFF" },
  { label: "빨강", hex: "#EF4444" },
  { label: "분홍", hex: "#EC4899" },
  { label: "주황", hex: "#F97316" },
  { label: "노랑", hex: "#CA8A04" },
  { label: "갈색", hex: "#92400E" },
  { label: "파랑", hex: "#2563EB" },
  { label: "남색", hex: "#4F46E5" },
  { label: "보라", hex: "#9333EA" },
  { label: "청록", hex: "#0D9488" },
  { label: "초록", hex: "#16A34A" },
] as const;

const HIGHLIGHT_COLORS = [
  { label: "노랑", hex: "#FEF08A" },
  { label: "초록", hex: "#BBF7D0" },
  { label: "하늘", hex: "#BAE6FD" },
  { label: "분홍", hex: "#FBCFE8" },
  { label: "주황", hex: "#FED7AA" },
  { label: "보라", hex: "#E9D5FF" },
  { label: "빨강", hex: "#FCA5A5" },
  { label: "민트", hex: "#A7F3D0" },
] as const;

const getParagraphStyle = (editor: Editor): ParagraphStyle => {
  if (editor.isActive("heading", { level: 1 })) return "heading1";
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  return "paragraph";
};

// ── Primitives ──────────────────────────────────────────────────────────────

const ToolbarButton = ({
  active,
  children,
  className,
  disabled,
  label,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    className={cn(
      "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-45",
      active && "bg-accent/15 text-accent",
      className,
    )}
    title={title ?? label}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Divider = () => <div className="mx-1 h-5 w-px shrink-0 bg-border/70" />;

function useClickOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  const savedHandler = useRef(onClose);
  savedHandler.current = onClose;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) savedHandler.current();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref]);
}

// ── Custom Dropdown ──────────────────────────────────────────────────────────

function CompactDropdown<T extends string | number>({
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

// ── Color Picker ─────────────────────────────────────────────────────────────

function ColorPickerMenu({
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

          {/* Swatch grid */}
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

          {/* Hex input */}
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

// ── Typography Popover ────────────────────────────────────────────────────────

function TypographyMenu({
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

// ── Main Toolbar ──────────────────────────────────────────────────────────────

export default function EditorToolbar({
  editor,
  isMobileView,
  onToggleMobileView,
  onOpenWorldGraph,
  onOpenExport,
  canOpenExport = true,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreRef, () => setMoreOpen(false));

  const worldTab = useUIStore((s) => s.worldTab);
  const setWorldTab = useUIStore((s) => s.setWorldTab);
  const isCanvasOpen = worldTab === "graph";

  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const letterSpacing = useEditorStore((state) => state.letterSpacing ?? 0.05);
  const paragraphSpacing = useEditorStore((state) => state.paragraphSpacing ?? 1);
  const setFontSize = useEditorStore((state) => state.setFontSize);
  const updateSettings = useEditorStore((state) => state.updateSettings);

  if (!editor) return null;

  const paragraphStyle = getParagraphStyle(editor);
  const textColor = (editor.getAttributes("textStyle").color as string) || "#111827";
  const highlightColor = (editor.getAttributes("highlight").color as string) || "#FEF08A";

  const applyParagraphStyle = (style: ParagraphStyle) => {
    const chain = editor.chain().focus();
    if (style === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    const level = style === "heading1" ? 1 : style === "heading2" ? 2 : 3;
    chain.toggleHeading({ level }).run();
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().setTextAlign("left").run();
    setMoreOpen(false);
  };

  const selectAll = () => {
    editor.chain().focus().selectAll().run();
    setMoreOpen(false);
  };

  const styleLabel = (v: ParagraphStyle) => {
    const map: Record<ParagraphStyle, string> = {
      paragraph: t("toolbar.paragraph.paragraph", "문단"),
      heading1: t("toolbar.paragraph.heading1", "제목 1"),
      heading2: t("toolbar.paragraph.heading2", "제목 2"),
      heading3: t("toolbar.paragraph.heading3", "제목 3"),
    };
    return map[v];
  };

  if (isCanvasOpen) {
    return (
      <div className="flex w-full select-none items-center justify-end border-b border-border bg-panel px-2 py-1.5">
        <div className="flex h-7 items-center rounded-md border border-border bg-muted/20 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setWorldTab("terms")}
            className="flex h-full items-center rounded px-2.5 text-muted transition-colors hover:text-fg"
          >
            {t("toolbar.editor", "에디터")}
          </button>
          <button
            type="button"
            className="flex h-full items-center rounded bg-panel px-2.5 text-fg shadow-sm"
          >
            {t("toolbar.canvas", "캔버스")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full select-none items-center justify-center border-b border-border bg-panel px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        {/* Undo / Redo */}
        <ToolbarButton
          label={t("toolbar.tooltip.undo", "실행 취소")}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("toolbar.tooltip.redo", "다시 실행")}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Paragraph style / Font / Size */}
        <CompactDropdown<ParagraphStyle>
          options={["paragraph", "heading1", "heading2", "heading3"]}
          value={paragraphStyle}
          onChange={applyParagraphStyle}
          getLabel={styleLabel}
          aria-label={t("toolbar.paragraphStyle", "문단 스타일")}
          className="w-20"
        />
        <div className="mx-0.5">
          <FontSelector />
        </div>
        <CompactDropdown<number>
          options={FONT_SIZE_OPTIONS}
          value={fontSize}
          onChange={(v) => void setFontSize(v)}
          getLabel={(v) => `${v}pt`}
          aria-label={t("toolbar.fontSize", "크기")}
          className="w-[4.5rem]"
        />

        <Divider />

        {/* B / I / U / S */}
        <ToolbarButton
          active={editor.isActive("bold")}
          label={t("toolbar.tooltip.bold", "굵게")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          label={t("toolbar.tooltip.italic", "기울임꼴")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          label={t("toolbar.tooltip.underline", "밑줄")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          label={t("toolbar.tooltip.strikethrough", "취소선")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Text color + Highlight */}
        <ColorPickerMenu
          colors={TEXT_COLORS}
          value={textColor}
          onChange={(hex) => editor.chain().focus().setColor(hex).run()}
          icon={<Palette className="h-4 w-4" />}
          label={t("toolbar.tooltip.textColor", "글자 색")}
        />
        <ColorPickerMenu
          colors={HIGHLIGHT_COLORS}
          value={highlightColor}
          onChange={(hex) =>
            editor.chain().focus().setHighlight({ color: hex }).run()
          }
          icon={<Highlighter className="h-4 w-4" />}
          label={t("toolbar.tooltip.highlight", "형광펜")}
          columns={4}
        />

        <Divider />

        {/* Typography */}
        <TypographyMenu
          letterSpacing={letterSpacing}
          lineHeight={lineHeight}
          paragraphSpacing={paragraphSpacing}
          onLetterSpacingChange={(v) =>
            void updateSettings({ letterSpacing: Number(v.toFixed(2)) })
          }
          onLineHeightChange={(v) =>
            void updateSettings({ lineHeight: Number(v.toFixed(2)) })
          }
          onParagraphSpacingChange={(v) =>
            void updateSettings({ paragraphSpacing: Number(v.toFixed(1)) })
          }
        />

        <Divider />

        {/* Scene divider */}
        <ToolbarButton
          label={t("toolbar.sceneDivider", "장면 구분")}
          className="gap-1.5"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
          <span>{t("toolbar.sceneDivider", "장면 구분")}</span>
        </ToolbarButton>

        {/* View toggle */}
        {onToggleMobileView && (
          <ToolbarButton
            active={isMobileView}
            label={t("toolbar.tooltip.toggleMobileView", "화면 보기 전환")}
            className="gap-1.5"
            onClick={onToggleMobileView}
          >
            {isMobileView ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            <span>
              {isMobileView
                ? t("toolbar.view.mobile", "모바일")
                : t("toolbar.view.desktop", "PC")}
            </span>
          </ToolbarButton>
        )}

        {/* Editor / Canvas segment toggle */}
        <div className="flex h-7 items-center rounded-md border border-border bg-muted/20 p-0.5 text-xs font-medium">
          <button
            type="button"
            className="flex h-full items-center rounded bg-panel px-2.5 text-fg shadow-sm"
          >
            {t("toolbar.editor", "에디터")}
          </button>
          <button
            type="button"
            onClick={() => onOpenWorldGraph?.()}
            disabled={!onOpenWorldGraph}
            className={cn(
              "flex h-full items-center rounded px-2.5 text-muted transition-colors hover:text-fg",
              !onOpenWorldGraph && "opacity-40",
            )}
          >
            {t("toolbar.canvas", "캔버스")}
          </button>
        </div>

        <Divider />

        {/* More: alignment / select-all / clear formatting */}
        <div className="relative" ref={moreRef}>
          <ToolbarButton
            active={moreOpen}
            label={t("toolbar.more", "더보기")}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </ToolbarButton>
          {moreOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-panel p-1 shadow-xl">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover disabled:opacity-40"
                disabled={!canOpenExport || !onOpenExport}
                onClick={() => { onOpenExport?.(); setMoreOpen(false); }}
              >
                <FileOutput className="h-3.5 w-3.5 text-muted" />
                <span>{t("toolbar.export", "내보내기")}</span>
              </button>
              <div className="my-1 h-px bg-border/60" />
              {(
                [
                  { icon: AlignLeft, label: t("toolbar.tooltip.alignLeft", "왼쪽 정렬"), value: "left" },
                  { icon: AlignCenter, label: t("toolbar.tooltip.alignCenter", "가운데 정렬"), value: "center" },
                  { icon: AlignRight, label: t("toolbar.tooltip.alignRight", "오른쪽 정렬"), value: "right" },
                  { icon: AlignJustify, label: t("toolbar.tooltip.alignJustify", "양쪽 정렬"), value: "justify" },
                ] as const
              ).map(({ icon: Icon, label, value }) => (
                <button
                  key={value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
                  onClick={() => {
                    editor.chain().focus().setTextAlign(value).run();
                    setMoreOpen(false);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 text-muted" />
                  <span>{label}</span>
                </button>
              ))}
              <div className="my-1 h-px bg-border/60" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
                onClick={selectAll}
              >
                <Pilcrow className="h-3.5 w-3.5 text-muted" />
                <span>{t("toolbar.selectAll", "전체 선택")}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
                onClick={clearFormatting}
              >
                <Eraser className="h-3.5 w-3.5 text-muted" />
                <span>{t("toolbar.clearFormatting", "서식 초기화")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

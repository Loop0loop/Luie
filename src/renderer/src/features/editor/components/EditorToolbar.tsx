import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
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

const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

const getParagraphStyle = (editor: Editor): ParagraphStyle => {
  if (editor.isActive("heading", { level: 1 })) return "heading1";
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  return "paragraph";
};

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

function TypographyMenu({
  letterSpacing,
  lineHeight,
  paragraphSpacing,
  onLetterSpacingChange,
  onLineHeightChange,
  onParagraphSpacingChange,
}: {
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  onLetterSpacingChange: (v: number) => void;
  onLineHeightChange: (v: number) => void;
  onParagraphSpacingChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        <div className="absolute left-1/2 top-full z-50 mt-1 w-52 -translate-x-1/2 rounded-md border border-border bg-panel p-3 shadow-xl">
          <p className="mb-3 text-xs font-medium text-fg">{t("toolbar.typography", "타이포그래피")}</p>
          {sliders.map(({ label, min, max, step, value, onChange, display }) => (
            <div key={label} className="mb-3 last:mb-0">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted">{label}</span>
                <span className="font-medium tabular-nums text-fg">{display}</span>
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

export default function EditorToolbar({
  editor,
  isMobileView,
  onToggleMobileView,
  onOpenExport,
  canOpenExport = true,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const letterSpacing = useEditorStore((state) => state.letterSpacing ?? 0.05);
  const paragraphSpacing = useEditorStore((state) => state.paragraphSpacing ?? 1);
  const setFontSize = useEditorStore((state) => state.setFontSize);
  const updateSettings = useEditorStore((state) => state.updateSettings);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;

  const paragraphStyle = getParagraphStyle(editor);

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
  };

  const selectAll = () => {
    editor.chain().focus().selectAll().run();
    setMoreOpen(false);
  };

  return (
    <div className="flex w-full select-none items-center justify-center border-b border-border bg-panel px-2 py-1.5">
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <ToolbarButton
          label={t("toolbar.tooltip.undo", "되돌리기")}
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
        <select
          className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-fg outline-none hover:bg-hover"
          value={paragraphStyle}
          aria-label={t("toolbar.paragraphStyle", "문단 스타일")}
          onChange={(event) => applyParagraphStyle(event.target.value as ParagraphStyle)}
        >
          <option value="paragraph">{t("toolbar.paragraph.paragraph", "문단 스타일")}</option>
          <option value="heading1">{t("toolbar.paragraph.heading1", "제목 1")}</option>
          <option value="heading2">{t("toolbar.paragraph.heading2", "제목 2")}</option>
          <option value="heading3">{t("toolbar.paragraph.heading3", "제목 3")}</option>
        </select>

        <FontSelector />
        <select
          className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-fg outline-none hover:bg-hover"
          value={fontSize}
          aria-label={t("toolbar.fontSize", "크기")}
          onChange={(event) => void setFontSize(Number(event.target.value))}
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}pt</option>
          ))}
        </select>

        <Divider />

        {/* Inline formatting: B / I / U / S */}
        <ToolbarButton
          active={editor.isActive("bold")}
          label={t("toolbar.tooltip.bold", "굵게")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          label={t("toolbar.tooltip.italic", "기울임")}
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

        {/* Color + Highlight */}
        <label
          className="flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-muted transition-colors hover:bg-hover hover:text-fg"
          title={t("toolbar.tooltip.textColor", "글자 색")}
        >
          <Palette className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            value={editor.getAttributes("textStyle").color || "#000000"}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            aria-label={t("toolbar.tooltip.textColor", "글자 색")}
          />
        </label>
        <ToolbarButton
          active={editor.isActive("highlight")}
          label={t("toolbar.tooltip.highlight", "형광펜")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Typography: letter-spacing / line-height / paragraph-spacing in one popover */}
        <TypographyMenu
          letterSpacing={letterSpacing}
          lineHeight={lineHeight}
          paragraphSpacing={paragraphSpacing}
          onLetterSpacingChange={(v) => void updateSettings({ letterSpacing: Number(v.toFixed(2)) })}
          onLineHeightChange={(v) => void updateSettings({ lineHeight: Number(v.toFixed(2)) })}
          onParagraphSpacingChange={(v) => void updateSettings({ paragraphSpacing: Number(v.toFixed(1)) })}
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
            label={t("toolbar.tooltip.toggleMobileView", "PC / 모바일")}
            className="gap-1.5"
            onClick={onToggleMobileView}
          >
            {isMobileView ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            <span>{isMobileView ? t("toolbar.view.mobile", "모바일") : t("toolbar.view.desktop", "PC")}</span>
          </ToolbarButton>
        )}

        {/* Export */}
        <ToolbarButton
          label={t("toolbar.export", "내보내기")}
          className="gap-1.5"
          onClick={() => onOpenExport?.()}
          disabled={!canOpenExport || !onOpenExport}
        >
          <FileOutput className="h-4 w-4" />
          <span>{t("toolbar.export", "내보내기")}</span>
        </ToolbarButton>

        <Divider />

        {/* More: alignment, select all, clear formatting (destructive → safely hidden) */}
        <div className="relative" ref={moreRef}>
          <ToolbarButton
            active={moreOpen}
            label={t("toolbar.more", "더보기")}
            onClick={() => setMoreOpen((current) => !current)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </ToolbarButton>
          {moreOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border border-border bg-panel p-1 shadow-xl">
              {[
                { icon: AlignLeft, label: t("toolbar.tooltip.alignLeft", "왼쪽 정렬"), value: "left" },
                { icon: AlignCenter, label: t("toolbar.tooltip.alignCenter", "가운데 정렬"), value: "center" },
                { icon: AlignRight, label: t("toolbar.tooltip.alignRight", "오른쪽 정렬"), value: "right" },
                { icon: AlignJustify, label: t("toolbar.tooltip.alignJustify", "양쪽 정렬"), value: "justify" },
              ].map(({ icon: Icon, label, value }) => (
                <button
                  key={value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-fg hover:bg-hover"
                  onClick={() => editor.chain().focus().setTextAlign(value).run()}
                >
                  <Icon className="h-4 w-4 text-muted" />
                  <span>{label}</span>
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-fg hover:bg-hover"
                onClick={selectAll}
              >
                <Pilcrow className="h-4 w-4 text-muted" />
                <span>{t("toolbar.selectAll", "전체 선택")}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-fg hover:bg-hover"
                onClick={clearFormatting}
              >
                <Eraser className="h-4 w-4 text-muted" />
                <span>{t("toolbar.clearFormatting", "서식 초기화")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

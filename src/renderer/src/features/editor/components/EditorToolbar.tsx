import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Highlighter,
  Italic,
  Minus,
  Monitor,
  Palette,
  Redo2,
  Smartphone,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { FontSelector } from "./FontSelector";
import {
  ColorPickerMenu,
  CompactDropdown,
  createToolbarGhostEditor,
  Divider,
  FONT_SIZE_OPTIONS,
  getParagraphStyle,
  HIGHLIGHT_COLORS,
  isUsableEditor,
  MoreMenu,
  TEXT_COLORS,
  ToolbarButton,
  TypographyMenu,
} from "./toolbar";
import type { EditorToolbarProps, ParagraphStyle } from "./toolbar";

export default function EditorToolbar({
  editor,
  canvasToggleOnly = false,
  isMobileView,
  onToggleMobileView,
  onOpenWorldGraph,
  onOpenCanvas,
  onCloseCanvas,
  isCanvasMode = false,
  onOpenExport,
  canOpenExport = true,
  hideCanvasToggle = false,
  className,
}: EditorToolbarProps) {
  const { t } = useTranslation();

  const worldTab = useUIStore((s) => s.worldTab);
  const setWorldTab = useUIStore((s) => s.setWorldTab);
  const isCanvasOpen = worldTab === "graph";

  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const letterSpacing = useEditorStore((state) => state.letterSpacing ?? 0.02);
  const paragraphSpacing = useEditorStore(
    (state) => state.paragraphSpacing ?? 1,
  );
  const setFontSize = useEditorStore((state) => state.setFontSize);
  const updateSettings = useEditorStore((state) => state.updateSettings);
  const ghostEditor = useMemo(() => createToolbarGhostEditor(), []);
  const toolbarEditor = isUsableEditor(editor)
    ? editor
    : canvasToggleOnly
      ? ghostEditor
      : null;
  const hideNonToggleControls = canvasToggleOnly;
  const anchorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(44);
  const [toolbarBounds, setToolbarBounds] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const isCompactToolbar = (toolbarBounds?.width ?? Infinity) < 1080;

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const syncBounds = () => {
      const { left, top, width } = anchor.getBoundingClientRect();
      setToolbarBounds({ left, top, width });
    };

    syncBounds();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncBounds);
    observer?.observe(anchor);
    window.addEventListener("resize", syncBounds);
    window.addEventListener("scroll", syncBounds, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncBounds);
      window.removeEventListener("scroll", syncBounds, true);
    };
  }, []);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const syncHeight = () => {
      const nextHeight = Math.ceil(toolbar.getBoundingClientRect().height);
      setToolbarHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };

    syncHeight();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncHeight);
    observer?.observe(toolbar);
    return () => observer?.disconnect();
  }, [toolbarBounds?.width]);

  if (!toolbarEditor) return null;

  const paragraphStyle = getParagraphStyle(toolbarEditor);
  const textColor =
    (toolbarEditor.getAttributes("textStyle").color as string) || "#111827";
  const highlightColor =
    (toolbarEditor.getAttributes("highlight").color as string) || "#FEF08A";

  const applyParagraphStyle = (style: ParagraphStyle) => {
    const chain = toolbarEditor.chain().focus();
    if (style === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    const level = style === "heading1" ? 1 : style === "heading2" ? 2 : 3;
    chain.toggleHeading({ level }).run();
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

  const renderEditorCanvasToggle = () => (
    <div className="flex h-7 items-center rounded-control border border-border bg-muted/20 p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => {
          if (isCanvasMode) {
            onCloseCanvas?.();
          } else if (isCanvasOpen) {
            setWorldTab("terms");
            window.location.hash = "";
          }
        }}
        className={cn(
          "flex h-full items-center rounded px-2.5 transition-colors",
          !isCanvasOpen && !isCanvasMode
            ? "bg-panel text-fg shadow-sm"
            : "text-muted hover:text-fg",
        )}
      >
        {t("toolbar.editor", "에디터")}
      </button>
      <button
        type="button"
        onClick={() => {
          if (onOpenCanvas) {
            onOpenCanvas();
          } else {
            onOpenWorldGraph?.();
          }
        }}
        className={cn(
          "flex h-full items-center rounded px-2.5 transition-colors",
          isCanvasOpen || isCanvasMode
            ? "bg-panel text-fg shadow-sm"
            : "text-muted hover:text-fg",
        )}
      >
        {t("toolbar.canvas", "캔버스")}
      </button>
    </div>
  );

  const overflowControls = (
    <>
      <ColorPickerMenu
        colors={TEXT_COLORS}
        value={textColor}
        onChange={(hex) => toolbarEditor.chain().focus().setColor(hex).run()}
        icon={<Palette className="h-4 w-4" />}
        label={t("toolbar.tooltip.textColor", "글자 색")}
      />
      <ColorPickerMenu
        colors={HIGHLIGHT_COLORS}
        value={highlightColor}
        onChange={(hex) =>
          toolbarEditor.chain().focus().setHighlight({ color: hex }).run()
        }
        icon={<Highlighter className="h-4 w-4" />}
        label={t("toolbar.tooltip.highlight", "형광펜")}
        columns={4}
      />
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
      <ToolbarButton
        label={t("toolbar.sceneDivider", "장면 구분")}
        className="gap-1.5"
        onClick={() => toolbarEditor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
        <span>{t("toolbar.sceneDivider", "장면 구분")}</span>
      </ToolbarButton>
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
    </>
  );

  const toolbar = (
    <div
      ref={toolbarRef}
      className={cn(
        "pointer-events-none flex w-full min-w-0 flex-nowrap select-none items-center justify-center overflow-visible bg-transparent px-2 py-1.5",
        className,
      )}
    >
      <div
        className="pointer-events-auto flex w-max max-w-full shrink-0 flex-nowrap items-center justify-center gap-0.5"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <div
          className={cn(
            "flex flex-nowrap items-center justify-center gap-0.5",
            hideNonToggleControls && "invisible pointer-events-none",
          )}
          aria-hidden={hideNonToggleControls}
        >
          <ToolbarButton
            label={t("toolbar.tooltip.undo", "실행 취소")}
            onClick={() => toolbarEditor.chain().focus().undo().run()}
            disabled={!toolbarEditor.can().undo()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label={t("toolbar.tooltip.redo", "다시 실행")}
            onClick={() => toolbarEditor.chain().focus().redo().run()}
            disabled={!toolbarEditor.can().redo()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <Divider />

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

          <ToolbarButton
            active={toolbarEditor.isActive("bold")}
            label={t("toolbar.tooltip.bold", "굵게")}
            onClick={() => toolbarEditor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={toolbarEditor.isActive("italic")}
            label={t("toolbar.tooltip.italic", "기울임꼴")}
            onClick={() => toolbarEditor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={toolbarEditor.isActive("underline")}
            label={t("toolbar.tooltip.underline", "밑줄")}
            onClick={() =>
              toolbarEditor.chain().focus().toggleUnderline().run()
            }
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={toolbarEditor.isActive("strike")}
            label={t("toolbar.tooltip.strikethrough", "취소선")}
            onClick={() => toolbarEditor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          {!isCompactToolbar && (
            <>
              <Divider />
              {overflowControls}
            </>
          )}
        </div>

        {!hideCanvasToggle && renderEditorCanvasToggle()}

        <div
          className={cn(
            "flex items-center gap-0.5",
            hideNonToggleControls && "invisible pointer-events-none",
          )}
          aria-hidden={hideNonToggleControls}
        >
          <Divider />
          <MoreMenu
            canOpenExport={canOpenExport}
            compactContent={isCompactToolbar ? overflowControls : undefined}
            editor={toolbarEditor}
            onOpenExport={onOpenExport}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={anchorRef}
        className="w-full shrink-0"
        style={{ height: toolbarHeight }}
      />
      {toolbarBounds &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100]"
            style={
              {
                left: toolbarBounds.left,
                top: toolbarBounds.top,
                width: toolbarBounds.width,
              } as CSSProperties
            }
          >
            {toolbar}
          </div>,
          document.body,
        )}
    </>
  );
}

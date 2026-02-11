import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Type,
  MoreVertical,
  Smartphone,
  Monitor,
  ChevronDown,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "../../../../shared/types/utils";
import { api } from "../../services/api";
import { useEditorStore } from "../../stores/editorStore";
import { useTranslation } from "react-i18next";
import {
  EDITOR_TOOLBAR_FONT_MIN,
  EDITOR_TOOLBAR_FONT_STEP,
} from "../../../../shared/constants";

interface EditorToolbarProps {
  editor: Editor | null;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
}

export default function EditorToolbar({
  editor,
  isMobileView,
  onToggleMobileView,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const { fontSize, setFontSize } = useEditorStore();
  const toggleButtonClass = (active: boolean) =>
    cn(
      "flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors",
      active && "bg-active text-accent",
    );

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col bg-bg-primary select-none px-2 py-1 gap-1">
      {/* Row 1: Common Formatting */}
      <div className="flex items-center justify-between h-9">
        {/* Left: History & Font */}
        <div className="flex items-center gap-0.5">
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title={t("toolbar.tooltip.undo")}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
              <Undo2 className="icon-md" />
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title={t("toolbar.tooltip.redo")}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
              <Redo2 className="icon-md" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {/* Font Picker Fake */}
          <button className="flex items-center gap-1 px-2 h-7 rounded bg-transparent text-muted text-xs cursor-pointer hover:bg-hover hover:text-fg">
              <span>{t("toolbar.font.defaultLabel")}</span>
              <ChevronDown className="icon-xs" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {/* Size Picker */}
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors"
            onClick={() =>
              setFontSize(
                Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP),
              )
            }
          >
            <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>-</span>
          </button>
          <input 
            className="w-10 h-7 border-none bg-transparent text-center text-xs text-fg hover:bg-hover hover:rounded" 
            value={fontSize} 
            readOnly 
          />
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors"
            onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)}
          >
            <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>+</span>
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          <button
            className={toggleButtonClass(editor.isActive("bold"))}
            title={t("toolbar.tooltip.bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
              <Bold className="icon-md" />
          </button>
          <button
            className={toggleButtonClass(editor.isActive("italic"))}
            title={t("toolbar.tooltip.italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
              <Italic className="icon-md" />
          </button>
          <button
            className={toggleButtonClass(editor.isActive("underline"))}
            title={t("toolbar.tooltip.underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
              <Underline className="icon-md" />
          </button>
          <button
            className={toggleButtonClass(editor.isActive("strike"))}
            title={t("toolbar.tooltip.strikethrough")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
              <Strikethrough className="icon-md" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {/* Color Picker */}
          <div className="relative w-7 h-7 flex items-center justify-center" title={t("toolbar.tooltip.textColor")}>
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
              value={editor.getAttributes("textStyle").color || "#000000"}
            />
            <button className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors">
              <Type
                className="icon-md"
                style={{
                  color:
                    editor.getAttributes("textStyle").color || "currentColor",
                }}
              />
            </button>
          </div>

          <button
            className={toggleButtonClass(editor.isActive("highlight"))}
            title={t("toolbar.tooltip.highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="icon-md" />
          </button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className="flex items-center gap-0.5">
          {/* Alignment */}
          <button
            className={toggleButtonClass(editor.isActive({ textAlign: "left" }))}
            title={t("toolbar.tooltip.alignLeft")}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="icon-md" />
          </button>
          <button
            className={toggleButtonClass(editor.isActive({ textAlign: "center" }))}
            title={t("toolbar.tooltip.alignCenter")}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="icon-md" />
          </button>
          <button
            className={toggleButtonClass(editor.isActive({ textAlign: "right" }))}
            title={t("toolbar.tooltip.alignRight")}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="icon-md" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          <button
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] bg-element text-[11px] text-muted border border-transparent cursor-pointer transition-colors",
                isMobileView && "bg-active text-accent font-semibold border-active"
            )}
            onClick={onToggleMobileView}
            title={t("toolbar.tooltip.toggleMobileView")}
          >
            {isMobileView ? (
              <Smartphone className="icon-sm" />
            ) : (
              <Monitor className="icon-sm" />
            )}
            <span>
              {isMobileView ? t("toolbar.view.mobile") : t("toolbar.view.desktop")}
            </span>
          </button>

          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors"
            onClick={() => api.logger.info("Editor toolbar menu opened")}
          >
            <MoreVertical className="icon-md" />
          </button>
        </div>
      </div>
    </div>
  );
}

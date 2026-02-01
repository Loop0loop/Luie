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
import { useEditorStore } from "../../stores/editorStore";
import {
  EDITOR_TOOLBAR_DEFAULT_FONT_LABEL,
  EDITOR_TOOLBAR_FONT_MIN,
  EDITOR_TOOLBAR_FONT_STEP,
  TOOLTIP_ALIGN_CENTER,
  TOOLTIP_ALIGN_LEFT,
  TOOLTIP_ALIGN_RIGHT,
  TOOLTIP_BOLD,
  TOOLTIP_HIGHLIGHT,
  TOOLTIP_ITALIC,
  TOOLTIP_REDO,
  TOOLTIP_STRIKETHROUGH,
  TOOLTIP_TEXT_COLOR,
  TOOLTIP_TOGGLE_MOBILE_VIEW,
  TOOLTIP_UNDERLINE,
  TOOLTIP_UNDO,
  LABEL_VIEW_MOBILE,
  LABEL_VIEW_PC,
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
  const { fontSize, setFontSize } = useEditorStore();

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
            title={TOOLTIP_UNDO}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
              <Undo2 className="icon-md" />
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title={TOOLTIP_REDO}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
              <Redo2 className="icon-md" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {/* Font Picker Fake */}
          <button className="flex items-center gap-1 px-2 h-7 rounded bg-transparent text-muted text-xs cursor-pointer hover:bg-hover hover:text-fg">
              <span>{EDITOR_TOOLBAR_DEFAULT_FONT_LABEL}</span>
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
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive("bold") && "bg-active text-accent")}
            title={TOOLTIP_BOLD}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
              <Bold className="icon-md" />
          </button>
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive("italic") && "bg-active text-accent")}
            title={TOOLTIP_ITALIC}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
              <Italic className="icon-md" />
          </button>
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive("underline") && "bg-active text-accent")}
            title={TOOLTIP_UNDERLINE}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
              <Underline className="icon-md" />
          </button>
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive("strike") && "bg-active text-accent")}
            title={TOOLTIP_STRIKETHROUGH}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
              <Strikethrough className="icon-md" />
          </button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {/* Color Picker */}
          <div className="relative w-7 h-7 flex items-center justify-center" title={TOOLTIP_TEXT_COLOR}>
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
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive("highlight") && "bg-active text-accent")}
            title={TOOLTIP_HIGHLIGHT}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="icon-md" />
          </button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className="flex items-center gap-0.5">
          {/* Alignment */}
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive({ textAlign: "left" }) && "bg-active text-accent")}
            title={TOOLTIP_ALIGN_LEFT}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="icon-md" />
          </button>
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive({ textAlign: "center" }) && "bg-active text-accent")}
            title={TOOLTIP_ALIGN_CENTER}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="icon-md" />
          </button>
          <button
            className={cn("flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors", editor.isActive({ textAlign: "right" }) && "bg-active text-accent")}
            title={TOOLTIP_ALIGN_RIGHT}
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
            title={TOOLTIP_TOGGLE_MOBILE_VIEW}
          >
            {isMobileView ? (
              <Smartphone className="icon-sm" />
            ) : (
              <Monitor className="icon-sm" />
            )}
            <span>{isMobileView ? LABEL_VIEW_MOBILE : LABEL_VIEW_PC}</span>
          </button>

          <button
            className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors"
            onClick={() => window.api.logger.info("Editor toolbar menu opened")}
          >
            <MoreVertical className="icon-md" />
          </button>
        </div>
      </div>
    </div>
  );
}

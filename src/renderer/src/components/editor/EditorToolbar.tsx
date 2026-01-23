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
import styles from "../../styles/components/EditorToolbar.module.css";
import type { Editor } from "@tiptap/react";
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
    <div className={styles.toolbar}>
      {/* Row 1: Common Formatting */}
      <div className={styles.row}>
        {/* Left: History & Font */}
        <div className={styles.tgroup}>
          <button
            className={styles.iconBtn}
            title={TOOLTIP_UNDO}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
              <Undo2 className="icon-md" />
          </button>
          <button
            className={styles.iconBtn}
            title={TOOLTIP_REDO}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
              <Redo2 className="icon-md" />
          </button>

          <div className={styles.separator} />

          {/* Font Picker Fake */}
          <button className={styles.selectBtn}>
              <span>{EDITOR_TOOLBAR_DEFAULT_FONT_LABEL}</span>
              <ChevronDown className="icon-xs" />
          </button>

          <div className={styles.separator} />

          {/* Size Picker */}
          <button
            className={styles.iconBtn}
            onClick={() =>
              setFontSize(
                Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP),
              )
            }
          >
            <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>-</span>
          </button>
          <input className={styles.numberInput} value={fontSize} readOnly />
          <button
            className={styles.iconBtn}
            onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)}
          >
            <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>+</span>
          </button>

          <div className={styles.separator} />

          <button
            className={`${styles.iconBtn} ${editor.isActive("bold") ? styles.active : ""}`}
            title={TOOLTIP_BOLD}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
              <Bold className="icon-md" />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("italic") ? styles.active : ""}`}
            title={TOOLTIP_ITALIC}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
              <Italic className="icon-md" />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("underline") ? styles.active : ""}`}
            title={TOOLTIP_UNDERLINE}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
              <Underline className="icon-md" />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("strike") ? styles.active : ""}`}
            title={TOOLTIP_STRIKETHROUGH}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
              <Strikethrough className="icon-md" />
          </button>

          <div className={styles.separator} />

          {/* Color Picker */}
          <div className={styles.colorPickerWrapper} title={TOOLTIP_TEXT_COLOR}>
            <input
              type="color"
              className={styles.colorInput}
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
              value={editor.getAttributes("textStyle").color || "#000000"}
            />
            <button className={styles.iconBtn}>
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
            className={`${styles.iconBtn} ${editor.isActive("highlight") ? styles.active : ""}`}
            title={TOOLTIP_HIGHLIGHT}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="icon-md" />
          </button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className={styles.tgroup}>
          {/* Alignment is not in StarterKit default, so leaving as placeholders or implementing textAlign extension if requested later.
              For now focusing on text styling. */}
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
            title={TOOLTIP_ALIGN_LEFT}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="icon-md" />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
            title={TOOLTIP_ALIGN_CENTER}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="icon-md" />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
            title={TOOLTIP_ALIGN_RIGHT}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="icon-md" />
          </button>

          <div className={styles.separator} />

          <button
            className={styles.mobileToggle}
            data-active={isMobileView}
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
            className={styles.iconBtn}
            onClick={() => window.api.logger.info("Editor toolbar menu opened")}
          >
            <MoreVertical className="icon-md" />
          </button>
        </div>
      </div>
    </div>
  );
}

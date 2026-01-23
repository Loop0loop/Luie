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

interface EditorToolbarProps {
  editor: Editor | null;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
}
  import {
    EDITOR_TOOLBAR_DEFAULT_FONT_LABEL,
    EDITOR_TOOLBAR_DROPDOWN_ICON_SIZE,
    EDITOR_TOOLBAR_FONT_MIN,
    EDITOR_TOOLBAR_FONT_STEP,
    EDITOR_TOOLBAR_ICON_SIZE,
    EDITOR_TOOLBAR_MOBILE_ICON_SIZE,
    EDITOR_TOOLBAR_PLUS_MINUS_FONT_SIZE,
  } from "../../../../shared/constants";

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
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
              <Undo2 size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={styles.iconBtn}
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
              <Redo2 size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>

          <div className={styles.separator} />

          {/* Font Picker Fake */}
          <button className={styles.selectBtn}>
              <span>{EDITOR_TOOLBAR_DEFAULT_FONT_LABEL}</span>
              <ChevronDown size={EDITOR_TOOLBAR_DROPDOWN_ICON_SIZE} />
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
            <span style={{ fontSize: EDITOR_TOOLBAR_PLUS_MINUS_FONT_SIZE }}>-</span>
          </button>
          <input className={styles.numberInput} value={fontSize} readOnly />
          <button
            className={styles.iconBtn}
            onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)}
          >
            <span style={{ fontSize: EDITOR_TOOLBAR_PLUS_MINUS_FONT_SIZE }}>+</span>
          </button>

          <div className={styles.separator} />

          <button
            className={`${styles.iconBtn} ${editor.isActive("bold") ? styles.active : ""}`}
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
              <Bold size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("italic") ? styles.active : ""}`}
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
              <Italic size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("underline") ? styles.active : ""}`}
            title="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
              <Underline size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("strike") ? styles.active : ""}`}
            title="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
              <Strikethrough size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>

          <div className={styles.separator} />

          {/* Color Picker */}
          <div className={styles.colorPickerWrapper} title="Text Color">
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
                size={EDITOR_TOOLBAR_ICON_SIZE}
                style={{
                  color:
                    editor.getAttributes("textStyle").color || "currentColor",
                }}
              />
            </button>
          </div>

          <button
            className={`${styles.iconBtn} ${editor.isActive("highlight") ? styles.active : ""}`}
            title="Highlight"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className={styles.tgroup}>
          {/* Alignment is not in StarterKit default, so leaving as placeholders or implementing textAlign extension if requested later.
              For now focusing on text styling. */}
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
            title="Align Left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
            title="Align Center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
            title="Align Right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>

          <div className={styles.separator} />

          <button
            className={styles.mobileToggle}
            data-active={isMobileView}
            onClick={onToggleMobileView}
            title="모바일 뷰 전환"
          >
            {isMobileView ? (
              <Smartphone size={EDITOR_TOOLBAR_MOBILE_ICON_SIZE} />
            ) : (
              <Monitor size={EDITOR_TOOLBAR_MOBILE_ICON_SIZE} />
            )}
            <span>{isMobileView ? "Mobile" : "PC"}</span>
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => window.api.logger.info("Editor toolbar menu opened")}
          >
            <MoreVertical size={EDITOR_TOOLBAR_ICON_SIZE} />
          </button>
        </div>
      </div>
    </div>
  );
}

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
import { Editor } from "@tiptap/react";
import { useEditorStore } from "../../stores/editorStore";

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
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo2 size={16} />
          </button>
          <button
            className={styles.iconBtn}
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo2 size={16} />
          </button>

          <div className={styles.separator} />

          {/* Font Picker Fake */}
          <button className={styles.selectBtn}>
            <span>나눔고딕</span>
            <ChevronDown size={12} />
          </button>

          <div className={styles.separator} />

          {/* Size Picker */}
          <button
            className={styles.iconBtn}
            onClick={() => setFontSize(Math.max(10, fontSize - 1))}
          >
            <span style={{ fontSize: 14 }}>-</span>
          </button>
          <input className={styles.numberInput} value={fontSize} readOnly />
          <button
            className={styles.iconBtn}
            onClick={() => setFontSize(fontSize + 1)}
          >
            <span style={{ fontSize: 14 }}>+</span>
          </button>

          <div className={styles.separator} />

          <button
            className={`${styles.iconBtn} ${editor.isActive("bold") ? styles.active : ""}`}
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("italic") ? styles.active : ""}`}
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("underline") ? styles.active : ""}`}
            title="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive("strike") ? styles.active : ""}`}
            title="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={16} />
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
                size={16}
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
            <Highlighter size={16} />
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
            <AlignLeft size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
            title="Align Center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
            title="Align Right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight size={16} />
          </button>

          <div className={styles.separator} />

          <button
            className={styles.mobileToggle}
            data-active={isMobileView}
            onClick={onToggleMobileView}
            title="모바일 뷰 전환"
          >
            {isMobileView ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span>{isMobileView ? "Mobile" : "PC"}</span>
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => window.api.logger.info("Editor toolbar menu opened")}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Quote,
  BookPlus,
} from "lucide-react";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useToast } from "@shared/ui/ToastContext";
import { useTranslation } from "react-i18next";
import { TEXT_COLORS } from "./toolbar/constants";
import { ColorPickerMenu } from "./toolbar/menus";

interface EditorBubbleMenuProps {
  editor: Editor;
}

export default function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleAddTerm = async () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();

    if (!text) {
      showToast(t("editor.bubbleMenu.emptySelection"), "error");
      return;
    }

    const projectId = useProjectStore.getState().currentItem?.id;
    if (!projectId) return;

    await useTermStore.getState().createTerm({
      term: text,
      definition: "",
      category: "일반",
      projectId,
    });

    showToast(t("editor.bubbleMenu.addTermSuccess", { text }), "success");
  };

  const handleDialogue = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();

    if (!text) return;

    editor.chain().focus().insertContent(`"${text}"`).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      // NOTE: 선택한 텍스트 바로 위에 두되, 상단 여백이 부족한 경우에만 아래로 반전한다.
      options={{ placement: "top", offset: 8, flip: true }}
      className="z-toolbar flex items-center gap-1 rounded-control border border-border bg-surface p-1.5 text-fg shadow-panel"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded p-1.5 transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          editor.isActive("bold") ? "bg-active text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.bold")}
        aria-label={t("editor.bubbleMenu.bold")}
        aria-pressed={editor.isActive("bold")}
      >
        <Bold size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded p-1.5 transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          editor.isActive("italic") ? "bg-active text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.italic")}
        aria-label={t("editor.bubbleMenu.italic")}
        aria-pressed={editor.isActive("italic")}
      >
        <Italic size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`rounded p-1.5 transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          editor.isActive("underline") ? "bg-active text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.underline")}
        aria-label={t("editor.bubbleMenu.underline")}
        aria-pressed={editor.isActive("underline")}
      >
        <Underline size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`rounded p-1.5 transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          editor.isActive("strike") ? "bg-active text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.strikethrough")}
        aria-label={t("editor.bubbleMenu.strikethrough")}
        aria-pressed={editor.isActive("strike")}
      >
        <Strikethrough size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`rounded p-1.5 transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          editor.isActive("highlight") ? "bg-active text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.highlight")}
        aria-label={t("editor.bubbleMenu.highlight")}
        aria-pressed={editor.isActive("highlight")}
      >
        <Highlighter size={16} />
      </button>

      <ColorPickerMenu
        colors={TEXT_COLORS}
        icon={<Palette size={16} />}
        label={t("editor.bubbleMenu.textColor")}
        value={editor.getAttributes("textStyle").color || "#111827"}
        onChange={(hex) => editor.chain().focus().setColor(hex).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
        clearLabel={t("toolbar.resetTextColor", "기본 글자색")}
      />

      <div className="mx-1 h-4 w-px bg-border" />

      <button
        onClick={handleDialogue}
        className="rounded p-1.5 text-muted transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={t("editor.bubbleMenu.quote")}
        aria-label={t("editor.bubbleMenu.quote")}
      >
        <Quote size={16} />
      </button>

      <button
        onClick={handleAddTerm}
        className="rounded p-1.5 text-muted transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={t("editor.bubbleMenu.addTerm")}
        aria-label={t("editor.bubbleMenu.addTerm")}
      >
        <BookPlus size={16} />
      </button>
    </BubbleMenu>
  );
}

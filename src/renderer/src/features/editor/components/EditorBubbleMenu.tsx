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

interface EditorBubbleMenuProps {
  editor: Editor;
}

export default function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const { showToast } = useToast();
  const { t } = useTranslation("workspace");

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

    // 선택된 텍스트를 웹소설 표준 대사 따옴표(" ")로 감쌈
    editor.chain().focus().insertContent(`"${text}"`).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      className="flex items-center gap-1 bg-app text-fg shadow-lg border border-border rounded-panel p-1.5"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-muted transition-colors ${
          editor.isActive("bold") ? "bg-muted text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.bold")}
        aria-label={t("editor.bubbleMenu.bold")}
      >
        <Bold size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-muted transition-colors ${
          editor.isActive("italic") ? "bg-muted text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.italic")}
        aria-label={t("editor.bubbleMenu.italic")}
      >
        <Italic size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded hover:bg-muted transition-colors ${
          editor.isActive("underline") ? "bg-muted text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.underline")}
        aria-label={t("editor.bubbleMenu.underline")}
      >
        <Underline size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded hover:bg-muted transition-colors ${
          editor.isActive("strike") ? "bg-muted text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.strikethrough")}
        aria-label={t("editor.bubbleMenu.strikethrough")}
      >
        <Strikethrough size={16} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-1.5 rounded hover:bg-muted transition-colors ${
          editor.isActive("highlight") ? "bg-muted text-fg" : "text-muted"
        }`}
        title={t("editor.bubbleMenu.highlight")}
        aria-label={t("editor.bubbleMenu.highlight")}
      >
        <Highlighter size={16} />
      </button>

      <label
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted cursor-pointer flex items-center justify-center relative"
        title={t("editor.bubbleMenu.textColor")}
        aria-label={t("editor.bubbleMenu.textColor")}
      >
        <Palette size={16} />
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
          value={editor.getAttributes("textStyle").color || "#000000"}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={handleDialogue}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted"
        title={t("editor.bubbleMenu.quote")}
        aria-label={t("editor.bubbleMenu.quote")}
      >
        <Quote size={16} />
      </button>

      <button
        onClick={handleAddTerm}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted"
        title={t("editor.bubbleMenu.addTerm")}
        aria-label={t("editor.bubbleMenu.addTerm")}
      >
        <BookPlus size={16} />
      </button>
    </BubbleMenu>
  );
}

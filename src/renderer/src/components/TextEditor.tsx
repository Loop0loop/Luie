import { useState, useRef, useEffect } from "react";
import { useAutoSaveStore } from "../stores/autoSaveStore";
import { useTranslation } from "react-i18next";

interface TextEditorProps {
  chapterId: string;
  projectId: string;
  initialContent: string;
  onSave?: (content: string) => void;
}

export default function TextEditor({
  chapterId,
  projectId,
  initialContent,
  onSave,
}: TextEditorProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { triggerSave, saveStatus } = useAutoSaveStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (value: string) => {
    setContent(value);
    void triggerSave(chapterId, value, projectId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        content.substring(0, start) + "  " + content.substring(end);
      setContent(newValue);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 w-full p-6 text-base leading-relaxed text-fg bg-surface border-none resize-none focus:outline-none"
          placeholder={t("textEditor.placeholder.body")}
          spellCheck={false}
          style={{
            minHeight: "var(--text-editor-min-height)",
          }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 bg-surface-hover border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>
            {charCount}
            {t("textEditor.suffix.char")}
          </span>
          <span>•</span>
          <span>
            {wordCount}
            {t("textEditor.suffix.word")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-sm text-accent">{t("textEditor.status.saving")}</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-sm text-success">{t("textEditor.status.saved")}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("textEditor.actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

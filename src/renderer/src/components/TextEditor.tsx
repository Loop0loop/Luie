import { useState, useRef, useEffect, useTransition } from "react";
import { useAutoSaveStore } from "../stores/autoSaveStore";
import {
  PLACEHOLDER_TEXT_EDITOR,
  TEXT_EDITOR_SAVE_BUTTON,
  TEXT_EDITOR_SAVE_DONE,
  TEXT_EDITOR_SAVE_SAVING,
  TEXT_EDITOR_CHAR_SUFFIX,
  TEXT_EDITOR_WORD_SUFFIX,
} from "../../../shared/constants";

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
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
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

    startTransition(() => {
      triggerSave(chapterId, value, projectId);
    });
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
          placeholder={PLACEHOLDER_TEXT_EDITOR}
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
            {TEXT_EDITOR_CHAR_SUFFIX}
          </span>
          <span>•</span>
          <span>
            {wordCount}
            {TEXT_EDITOR_WORD_SUFFIX}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-sm text-accent">{TEXT_EDITOR_SAVE_SAVING}</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-sm text-success">{TEXT_EDITOR_SAVE_DONE}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {TEXT_EDITOR_SAVE_BUTTON}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useTransition } from "react";
import { useAutoSaveStore } from "../stores/autoSaveStore";

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

      setTimeout(() => {

      }, 0);
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
          className="flex-1 w-full p-6 text-base leading-relaxed text-gray-900 bg-white border-none resize-none focus:outline-none"
          placeholder="글을 쓰세요..."
          spellCheck={false}
          style={{
            minHeight: "400px",
            fontFamily: "'Noto Sans KR', sans-serif",
            lineHeight: "1.8",
            fontSize: "16px",
          }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{charCount}자</span>
          <span>•</span>
          <span>{wordCount}단어</span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-sm text-blue-600">저장 중...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600">저장 완료</span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

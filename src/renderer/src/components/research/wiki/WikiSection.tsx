import { Trash2 } from "lucide-react";
import { BufferedInput, BufferedTextArea } from "../../common/BufferedInput";

type WikiSectionProps = {
  id: string;
  label: string;
  content: string;
  onRename: (newLabel: string) => void;
  onUpdateContent: (newContent: string) => void;
  onDelete: () => void;
};

export function WikiSection({
  id,
  label,
  content,
  onRename,
  onUpdateContent,
  onDelete,
}: WikiSectionProps) {
  return (
    <div id={id} className="mb-8">
      <div className="border-b border-[var(--namu-border)] pb-2 mb-3 flex items-center justify-between">
        <div className="flex-1">
            <BufferedInput
            value={label}
            className="border-none bg-transparent w-full text-[22px] font-bold text-fg p-1 focus:outline-none focus:bg-surface-hover focus:rounded"
            onSave={onRename}
            />
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            className="bg-none border-none text-subtle cursor-pointer p-1 rounded transition-all hover:bg-surface-hover hover:text-danger" 
            onClick={onDelete}
            title="섹션 삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <BufferedTextArea
        className="w-full min-h-[120px] leading-relaxed p-3 border border-border rounded bg-surface text-fg resize-y focus:outline-2 focus:outline-[var(--namu-blue)] focus:border-transparent font-sans"
        value={content || ""}
        placeholder="내용을 입력하세요..."
        onSave={onUpdateContent}
      />
    </div>
  );
}

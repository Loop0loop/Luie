import { Trash2 } from "lucide-react";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";
import { useTranslation } from "react-i18next";

export type WikiViewMode = "editorial" | "notebook";

const SECTION_PROMPTS: Record<string, string> = {
  overview:
    "이 인물을 한 문장으로 소개한다면? 작가로서 이 캐릭터에게 끌린 이유는?",
  appearance:
    "독자가 처음 이 인물을 봤을 때 어떤 인상을 받을까? 가장 먼저 눈에 띄는 것은?",
  personality:
    "이 캐릭터의 핵심 동기는 무엇인가? 무엇이 그들을 움직이는가?",
  background:
    "현재 이야기에 가장 큰 영향을 미친 과거의 사건은?",
  relations:
    "이 인물이 가장 중요하게 생각하는 관계는? 그 관계가 이야기에 미치는 영향은?",
  notes:
    "작가로서 이 캐릭터에 대해 기록해두고 싶은 것들...",
};

type WikiSectionProps = {
  id: string;
  label: string;
  content: string;
  viewMode?: WikiViewMode;
  onRename: (newLabel: string) => void;
  onUpdateContent: (newContent: string) => void;
  onDelete: () => void;
};

export function WikiSection({
  id,
  label,
  content,
  viewMode = "notebook",
  onRename,
  onUpdateContent,
  onDelete,
}: WikiSectionProps) {
  const { t } = useTranslation();
  const prompt = SECTION_PROMPTS[id] ?? t("character.wiki.sectionPlaceholder");

  if (viewMode === "notebook") {
    return (
      <div id={id} className="group/section">
        <div className="flex items-center justify-between mb-2">
          <BufferedInput
            value={label}
            className="flex-1 border-none bg-transparent text-[15px] font-semibold text-fg/80 p-0 focus:outline-none leading-snug"
            onSave={onRename}
          />
          <button
            type="button"
            className="opacity-0 group-hover/section:opacity-100 transition-opacity p-1 rounded text-muted hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title={t("character.wiki.sectionDeleteTitle")}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="h-px bg-border/40 mb-4" />
        <div className="pl-4 border-l-2 border-accent/25">
          <BufferedTextArea
            className="w-full min-h-[100px] bg-transparent border-none text-fg text-[14px] leading-[2.1] resize-y placeholder:text-muted/35 focus:outline-none p-0"
            value={content || ""}
            placeholder={prompt}
            onSave={onUpdateContent}
          />
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="group/section rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-4 bg-accent rounded-full shrink-0" />
          <BufferedInput
            value={label}
            className="flex-1 border-none bg-transparent text-[14.5px] font-semibold text-fg p-0 leading-snug focus:outline-none"
            onSave={onRename}
          />
        </div>
        <button
          type="button"
          className="opacity-0 group-hover/section:opacity-100 transition-opacity p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          title={t("character.wiki.sectionDeleteTitle")}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <BufferedTextArea
        className="w-full min-h-[110px] p-4 bg-surface/50 border-none text-fg text-[13.5px] leading-[1.85] resize-y placeholder:text-muted/40 focus:outline-none"
        value={content || ""}
        placeholder={prompt}
        onSave={onUpdateContent}
      />
    </div>
  );
}

import { Trash2 } from "lucide-react";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";
import { useTranslation } from "react-i18next";

/**
 * Section-specific writing prompts shown as placeholder text.
 * Guides the writer with targeted questions instead of a blank slate.
 */
const SECTION_PROMPTS: Readonly<Record<string, string>> = {
  overview: "이 인물을 한 문장으로 소개한다면? 작가로서 이 캐릭터에게 끌린 이유는?",
  appearance:
    "독자가 처음 이 인물을 봤을 때 어떤 인상을 받을까? 가장 먼저 눈에 띄는 것은?",
  personality: "이 캐릭터의 핵심 동기는 무엇인가? 무엇이 그들을 움직이는가?",
  background: "현재 이야기에 가장 큰 영향을 미친 과거의 사건은?",
  relations:
    "이 인물이 가장 중요하게 생각하는 관계는? 그 관계가 이야기에 미치는 영향은?",
  notes: "작가로서 이 캐릭터에 대해 기록해두고 싶은 것들...",
} as const;

type WikiSectionProps = {
  id: string;
  label: string;
  content: string;
  /** Character signature colour (hex) for the section marker. */
  accentColor?: string;
  onRename: (next: string) => void;
  onUpdateContent: (next: string) => void;
  onDelete: () => void;
};

export function WikiSection({
  id,
  label,
  content,
  accentColor,
  onRename,
  onUpdateContent,
  onDelete,
}: WikiSectionProps) {
  const { t } = useTranslation();
  const placeholder =
    SECTION_PROMPTS[id] ?? t("character.wiki.sectionPlaceholder");

  return (
    <div id={id} className="group/section flex flex-col gap-3 scroll-mt-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {accentColor && (
            <span
              className="h-4 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          )}
          <BufferedInput
            value={label}
            className="flex-1 border-none bg-transparent text-[16px] font-semibold text-fg p-0 focus:outline-none leading-snug min-w-0"
            onSave={onRename}
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          title={t("character.wiki.sectionDeleteTitle")}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity p-1 rounded text-muted hover:text-danger hover:bg-danger/10 shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Writing area — borderless, document-like */}
      <BufferedTextArea
        value={content}
        placeholder={placeholder}
        className="w-full min-h-[80px] bg-transparent border-none text-fg/90 text-[14px] leading-[1.9] resize-y placeholder:text-subtle focus:outline-none p-0"
        onSave={onUpdateContent}
      />
    </div>
  );
}

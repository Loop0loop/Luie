import { Trash2 } from "lucide-react";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <div id={id} className="group/section flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-5 bg-accent rounded-full shrink-0" />
        <BufferedInput
          value={label}
          className="flex-1 border-none bg-transparent text-[17px] font-bold text-fg p-0 leading-snug focus:outline-none"
          onSave={onRename}
        />
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
        className="w-full min-h-[120px] px-4 py-3.5 rounded-lg border border-border bg-surface text-fg text-[13.5px] leading-[1.85] resize-y placeholder:text-muted/50 hover:border-accent/30 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/10 transition-colors duration-150"
        value={content || ""}
        placeholder={t("character.wiki.sectionPlaceholder")}
        onSave={onUpdateContent}
      />
    </div>
  );
}

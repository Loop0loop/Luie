
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../../stores/projectStore";
import { BufferedTextArea } from "../../common/BufferedInput";
import { cn } from "../../../../../shared/types/utils";
import { Lock, Unlock, PenLine, FileText } from "lucide-react";

export function SynopsisEditor() {
  const { t } = useTranslation();
  const { currentItem: currentProject, updateProject } = useProjectStore();
  const [status, setStatus] = useState<"draft" | "working" | "locked">("draft");
  const [isFocused, setIsFocused] = useState(false);

  if (!currentProject) return null;

  return (
    <div className="h-full flex flex-col bg-app overflow-hidden">
        {/* Header - Minimalist */}
        <div className={cn(
            "flex items-center justify-between px-8 py-4 shrink-0 transition-opacity duration-300",
            isFocused ? "opacity-30 hover:opacity-100" : "opacity-100 border-b border-border bg-panel/30"
        )}>
            <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-serif font-bold text-fg tracking-tight">{t("world.synopsis.title")}</h2>
            </div>
            
            <div className="flex items-center gap-2 bg-element rounded-full p-1 border border-border">
                {(["draft", "working", "locked"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                            status === s 
                                ? "bg-accent text-accent-foreground shadow-sm" 
                                : "text-muted hover:text-fg hover:bg-element-hover"
                        )}
                    >
                        {s === "locked" && <Lock className="w-3 h-3" />}
                        {s === "working" && <PenLine className="w-3 h-3" />}
                        {s === "draft" && <Unlock className="w-3 h-3" />}
                        {t(`world.synopsis.status.${s}`)}
                    </button>
                ))}
            </div>
        </div>

        {/* Editor Area - Centered, Writer Friendly */}
        <div className="flex-1 overflow-y-auto bg-app relative group">
            <div className="max-w-3xl mx-auto px-8 py-12 min-h-full flex flex-col">
                 <BufferedTextArea
                    className={cn(
                        "w-full flex-1 bg-transparent border-none outline-none resize-none transition-all placeholder:text-muted/30 focus:placeholder:text-muted/50",
                        "text-lg leading-loose font-serif text-fg", // Writer friendly typography
                        status === "locked" && "opacity-70 cursor-not-allowed select-none"
                    )}
                    placeholder={t("world.synopsis.placeholder")}
                    value={currentProject.description || ""}
                    readOnly={status === "locked"}
                    onSave={(val) => updateProject(currentProject.id, undefined, val)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    spellCheck={false}
                />
                
                <div className="mt-8 pt-6 border-t border-border/30 text-center">
                    <p className="text-xs text-muted italic font-serif opacity-60">
                        {t("world.synopsis.hint")}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}

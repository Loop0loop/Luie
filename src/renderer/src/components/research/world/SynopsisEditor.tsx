
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../../stores/projectStore";
import { BufferedTextArea, BufferedInput } from "../../common/BufferedInput";
import { cn } from "../../../../../shared/types/utils";
import { Lock, Unlock, PenLine, FileText, Sparkles, Target, BookOpen } from "lucide-react";

export function SynopsisEditor() {
  const { t } = useTranslation();
  const { currentItem: currentProject, updateProject } = useProjectStore();
  const [status, setStatus] = useState<"draft" | "working" | "locked">("draft");
  const [isFocused, setIsFocused] = useState(false);

  // Local state for metadata (in a real app, this should be in the project store structure)
  // For now, we'll store it but it won't persist deeply if the Project type doesn't support it yet.
  // Assuming generic 'info' field or similar, but simplified for UI demo.
  const [genre, setGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [logline, setLogline] = useState("");

  if (!currentProject) return null;

  return (
    <div className="h-full flex flex-col bg-[#faf9f6]/50 dark:bg-app overflow-hidden">
        {/* Header - Minimalist */}
        <div className={cn(
            "flex items-center justify-between px-8 py-4 shrink-0 transition-opacity duration-300 border-b border-border/40",
            isFocused ? "opacity-30 hover:opacity-100" : "opacity-100 bg-panel/30"
        )}>
            <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-serif font-bold text-fg tracking-tight">{t("world.synopsis.title")}</h2>
            </div>
            
            <div className="flex items-center gap-2 bg-element/50 rounded-full p-1 border border-border/50 backdrop-blur-sm">
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
        <div className="flex-1 overflow-y-auto relative group custom-scrollbar">
            <div className="max-w-3xl mx-auto px-8 py-12 min-h-full flex flex-col gap-8">
                 
                 {/* Metadata Section - New */}
                 <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 bg-panel/40 border border-border/40 rounded-xl hover:border-accent/30 transition-colors">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-2">
                            <BookOpen className="w-3 h-3" /> {t("world.synopsis.genre", "Genre")}
                        </div>
                        <BufferedInput 
                            className="w-full bg-transparent border-none text-sm font-medium text-fg placeholder:text-muted/30"
                            placeholder={t("world.synopsis.genrePlaceholder", "e.g. Dark Fantasy")}
                            value={genre}
                            onSave={setGenre}
                        />
                    </div>
                    <div className="p-4 bg-panel/40 border border-border/40 rounded-xl hover:border-accent/30 transition-colors">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-2">
                            <Target className="w-3 h-3" /> {t("world.synopsis.audience", "Target Audience")}
                        </div>
                        <BufferedInput 
                            className="w-full bg-transparent border-none text-sm font-medium text-fg placeholder:text-muted/30"
                            placeholder={t("world.synopsis.audiencePlaceholder", "e.g. Young Adult")}
                            value={targetAudience}
                            onSave={setTargetAudience}
                        />
                    </div>
                    <div className="col-span-2 p-4 bg-panel/40 border border-border/40 rounded-xl hover:border-accent/30 transition-colors">
                         <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-2">
                            <Sparkles className="w-3 h-3" /> {t("world.synopsis.logline", "Logline")}
                        </div>
                         <BufferedTextArea
                            className="w-full bg-transparent border-none resize-none text-lg font-serif italic text-fg/80 placeholder:text-muted/30 leading-relaxed"
                            placeholder={t("world.synopsis.loglinePlaceholder", "One sentence summary of your story...")}
                            value={logline}
                            onSave={setLogline}
                            rows={2}
                        />
                    </div>
                 </div>

                 <div className="w-full h-px bg-border/30 my-2" />

                 {/* Main Content */}
                 <div className="relative min-h-[500px]">
                    <BufferedTextArea
                        className={cn(
                            "w-full h-full bg-transparent border-none outline-none resize-none transition-all placeholder:text-muted/20 focus:placeholder:text-muted/40",
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
                 </div>
                
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

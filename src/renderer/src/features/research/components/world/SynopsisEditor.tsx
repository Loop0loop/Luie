import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { BufferedTextArea, BufferedInput } from "@shared/ui/BufferedInput";
import { cn } from "@shared/types/utils";
import { Lock, Unlock, PenLine, FileText, Sparkles } from "lucide-react";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";
import type { WorldSynopsisData, WorldSynopsisStatus } from "@shared/types";

export function SynopsisEditor() {
  const { t } = useTranslation();
  const { currentItem: currentProject, updateProject } = useProjectStore();
  const [status, setStatus] = useState<WorldSynopsisStatus>("draft");
  const [isFocused, setIsFocused] = useState(false);
  const [genre, setGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [logline, setLogline] = useState("");

  useEffect(() => {
    if (!currentProject?.id) return;
    let cancelled = false;

    void (async () => {
      const loaded = await worldPackageStorage.loadSynopsis(
        currentProject.id,
        currentProject.projectPath,
        currentProject.description ?? "",
      );
      if (cancelled) return;
      setStatus(loaded.status ?? "draft");
      setGenre(loaded.genre ?? "");
      setTargetAudience(loaded.targetAudience ?? "");
      setLogline(loaded.logline ?? "");
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, currentProject?.projectPath, currentProject?.description]);

  const persistSynopsis = (overrides: Partial<WorldSynopsisData>) => {
    if (!currentProject?.id) return;
    const payload: WorldSynopsisData = {
      synopsis: currentProject.description ?? "",
      status,
      genre,
      targetAudience,
      logline,
      ...overrides,
    };
    void worldPackageStorage.saveSynopsis(currentProject.id, currentProject.projectPath, payload);
  };

  if (!currentProject) return null;

  return (
    <div className="h-full flex flex-col bg-[#faf9f6]/50 dark:bg-zinc-900 overflow-hidden transition-colors duration-500">
        {/* Header - Minimalist */}
        <div className={cn(
            "flex items-center justify-between px-8 py-4 shrink-0 transition-opacity duration-300",
            isFocused ? "opacity-30 hover:opacity-100" : "opacity-100"
        )}>
            <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted" />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{t("world.synopsis.title")}</h2>
            </div>
            
            <div className="flex items-center gap-2">
                {(["draft", "working", "locked"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => {
                          setStatus(s);
                          persistSynopsis({ status: s });
                        }}
                        className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border hover:border-fg",
                            status === s 
                                ? "bg-fg text-bg border-fg" 
                                : "text-muted-foreground border-transparent hover:text-fg"
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

        {/* Editor Area - Document Style */}
        <div className="flex-1 overflow-y-auto relative group custom-scrollbar">
            <div className="max-w-3xl mx-auto px-12 py-16 min-h-full flex flex-col gap-12">
                 
                 {/* Metadata Section - Clean, Field-like */}
                 <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Top Row: Genre & Audience */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="group/field">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 group-focus-within/field:text-accent transition-colors">
                                {t("world.synopsis.genre", "Genre")}
                            </label>
                            <BufferedInput 
                                className="w-full bg-transparent border-b border-border/50 py-1 text-base font-serif text-fg placeholder:text-muted/20 focus:border-accent focus:outline-none transition-colors rounded-none"
                                placeholder={t("world.synopsis.genrePlaceholder", "e.g. Dark Fantasy")}
                                value={genre}
                                onSave={(val) => {
                                  setGenre(val);
                                  persistSynopsis({ genre: val });
                                }}
                            />
                        </div>
                        <div className="group/field">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 group-focus-within/field:text-accent transition-colors">
                                {t("world.synopsis.audience", "Target Audience")}
                            </label>
                            <BufferedInput 
                                className="w-full bg-transparent border-b border-border/50 py-1 text-base font-serif text-fg placeholder:text-muted/20 focus:border-accent focus:outline-none transition-colors rounded-none"
                                placeholder={t("world.synopsis.audiencePlaceholder", "e.g. Young Adult")}
                                value={targetAudience}
                                onSave={(val) => {
                                  setTargetAudience(val);
                                  persistSynopsis({ targetAudience: val });
                                }}
                            />
                        </div>
                    </div>

                    {/* Logline - Featured */}
                    <div className="group/field">
                         <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 group-focus-within/field:text-accent transition-colors">
                            <Sparkles className="w-3 h-3" /> {t("world.synopsis.logline", "Logline")}
                        </label>
                         <BufferedTextArea
                            className="w-full bg-transparent border-none p-0 resize-none text-2xl font-serif italic text-fg placeholder:text-muted/10 leading-relaxed focus:outline-none"
                            placeholder={t("world.synopsis.loglinePlaceholder", "One sentence summary of your story...")}
                            value={logline}
                            onSave={(val) => {
                              setLogline(val);
                              persistSynopsis({ logline: val });
                            }}
                            rows={2}
                        />
                    </div>
                 </div>

                 {/* Divider */}
                 <div className="w-16 h-1 bg-border/30 rounded-full mx-auto" />

                 {/* Main Content */}
                 <div className="relative flex-1">
                    <BufferedTextArea
                        className={cn(
                            "w-full h-full bg-transparent border-none outline-none resize-none transition-all placeholder:text-muted/10 focus:placeholder:text-muted/20",
                            "text-lg leading-loose font-serif text-fg focus:ring-0",
                            status === "locked" && "opacity-70 cursor-not-allowed select-none"
                        )}
                        style={{ boxShadow: "none" }}
                        placeholder={t("world.synopsis.placeholder")}
                        value={currentProject.description || ""}
                        readOnly={status === "locked"}
                        onSave={(val) => {
                          void updateProject(currentProject.id, undefined, val);
                          persistSynopsis({ synopsis: val });
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        spellCheck={false}
                    />
                 </div>
            </div>
        </div>
    </div>
  );
}

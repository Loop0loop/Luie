import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "../../../stores/projectStore";
import { useMemoStore } from "../../../stores/memoStore";
import { useUIStore } from "../../../stores/uiStore";
import { cn } from "../../../../../shared/types/utils";

export default function SidebarMemoList() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { notes, activeNoteId, setActiveNoteId, addNote } = useMemoStore();
  const { setMainView } = useUIStore();

  const currentProjectId = currentProject?.id ?? null;

  // Filter notes by project if needed, or assume store is cleared/loaded per project.
  // For now, filtering is safer.
  const projectNotes = useMemo(() => 
    currentProjectId ? notes.filter(n => n.projectId === currentProjectId) : [], 
    [notes, currentProjectId]
  );

  const handleAddNote = () => {
    if (!currentProjectId) return;
    addNote(currentProjectId, {
        title: t("project.defaults.noteTitle"),
        content: "",
        tags: [],
    });
    setMainView({ type: "memo" });
  };

  const handleSelect = (id: string) => {
    setActiveNoteId(id);
    setMainView({ type: "memo", id });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
        <div className="flex items-center justify-end px-2 py-1 gap-1 border-b border-border/20">
             <button 
                className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleAddNote}
                title={t("memo.title")}
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
             {projectNotes.length === 0 && (
                  <div className="p-4 text-xs text-muted text-center italic">
                      {t("memo.empty")}
                  </div>
              )}
             {projectNotes.map(note => (
                 <div 
                    key={note.id}
                    className={cn(
                        "px-3 py-2 border-b border-border/20 cursor-pointer hover:bg-white/5 transition-colors",
                         note.id === activeNoteId && "bg-white/10 text-accent font-medium"
                    )}
                    onClick={() => handleSelect(note.id)}
                 >
                     <div className="font-medium text-sm truncate">{note.title || t("project.defaults.untitled")}</div>
                     <div className="text-xs text-muted-foreground truncate opacity-70">
                        {new Date(note.updatedAt).toLocaleDateString()}
                     </div>
                 </div>
             ))}
        </div>
    </div>
  );
}

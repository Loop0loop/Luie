import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";

export default function SidebarMemoList() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { notes, addNote, loadNotes } = useMemoStore();
  const mainView = useUIStore((state) => state.mainView);
  const activeNoteId = mainView.type === "memo" && mainView.id ? mainView.id : null;

  const currentProjectId = currentProject?.id ?? null;

  useEffect(() => {
    if (currentProjectId) {
      loadNotes(currentProjectId);
    }
  }, [currentProjectId, loadNotes]);

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
    useUIStore.getState().setMainView({ type: "memo" });
  };

  const handleSelect = (id: string) => {
    useUIStore.getState().setMainView({ type: "memo", id });
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
          <DraggableItem
            key={note.id}
            id={`memo-${note.id}`}
            data={{ type: "memo", id: note.id, title: note.title || t("project.defaults.untitled") }}
          >
            <div
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
          </DraggableItem>
        ))}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";

export default function SidebarMemoList() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const notes = useMemoStore((state) => state.notes);
  const addNote = useMemoStore((state) => state.addNote);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const flushSave = useMemoStore((state) => state.flushSave);
  const setMainView = useUIStore((state) => state.setMainView);
  const mainView = useUIStore((state) => state.mainView);
  const activeNoteId =
    mainView.type === "memo" && mainView.id ? mainView.id : null;

  const currentProjectId = currentProject?.id ?? null;
  const currentProjectPath = currentProject?.projectPath ?? null;

  useEffect(() => {
    if (currentProjectId) {
      void loadNotes(currentProjectId, currentProjectPath);
    }
    return () => {
      void flushSave();
    };
  }, [currentProjectId, currentProjectPath, flushSave, loadNotes]);

  const projectNotes = currentProjectId ? notes : [];

  const handleAddNote = () => {
    if (!currentProjectId) return;
    const created = addNote(currentProjectId, {
      title: t("project.defaults.noteTitle"),
      content: "",
      tags: [],
    });
    if (created?.id) {
      setMainView({ type: "memo", id: created.id });
    }
  };

  const handleSelect = (id: string) => {
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
        {projectNotes.map((note) => (
          <DraggableItem
            key={note.id}
            id={`memo-${note.id}`}
            data={{
              type: "memo",
              id: note.id,
              title: note.title || t("project.defaults.untitled"),
            }}
          >
            <div
              className={cn(
                "px-3 py-2 border-b border-border/20 cursor-pointer hover:bg-white/5 transition-colors",
                note.id === activeNoteId &&
                  "bg-white/10 text-accent font-medium",
              )}
              onClick={() => handleSelect(note.id)}
            >
              <div className="font-medium text-sm truncate">
                {note.title || t("project.defaults.untitled")}
              </div>
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

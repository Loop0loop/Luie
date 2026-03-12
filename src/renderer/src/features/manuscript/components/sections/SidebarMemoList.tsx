import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { useProjectMemoNotes } from "@renderer/features/research/components/memo/useProjectMemoNotes";

export default function SidebarMemoList() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const setMainView = useUIStore((state) => state.setMainView);
  const mainView = useUIStore((state) => state.mainView);
  const activeNoteId =
    mainView.type === "memo" && mainView.id ? mainView.id : null;

  const currentProjectId = currentProject?.id ?? null;
  const currentProjectPath = getReadableLuieAttachmentPath(currentProject);
  const { addNote, notes } = useProjectMemoNotes({
    flushOnCleanup: true,
    projectId: currentProjectId ?? undefined,
    projectPath: currentProjectPath,
  });

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

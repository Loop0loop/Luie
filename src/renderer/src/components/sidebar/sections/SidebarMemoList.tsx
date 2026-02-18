import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "../../../stores/projectStore";
import { 
    STORAGE_KEY_MEMOS_PREFIX, 
    // STORAGE_KEY_MEMOS_NONE 
} from "../../../../../shared/constants";
import { readLocalStorageJson, writeLocalStorageJson } from "../../../utils/localStorage";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

export default function SidebarMemoList() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const currentProjectId = currentProject?.id ?? null;

  const storageKey = useMemo(() => {
    if (!currentProjectId) return null;
    return `${STORAGE_KEY_MEMOS_PREFIX}${currentProjectId}`;
  }, [currentProjectId]);

  // Load notes
  const [notes, setNotes] = useState<Note[]>([]);
  
  useEffect(() => {
    if (!storageKey) return;
    const parsed = readLocalStorageJson<{ notes?: Note[] }>(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    if (parsed && Array.isArray(parsed.notes)) {
        setNotes(parsed.notes);
    }
  }, [storageKey]);

  const handleAddNote = () => {
    const newId = String(Date.now());
    const newNote: Note = {
      id: newId,
      title: t("project.defaults.noteTitle"),
      content: "",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    const nextNotes = [...notes, newNote];
    setNotes(nextNotes);
    if (storageKey) {
        writeLocalStorageJson(storageKey, { notes: nextNotes });
    }
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
             {notes.length === 0 && (
                  <div className="p-4 text-xs text-muted text-center italic">
                      {t("memo.empty")}
                  </div>
              )}
             {notes.map(note => (
                 <div 
                    key={note.id}
                    className="px-3 py-2 border-b border-border/20 cursor-pointer hover:bg-white/5 transition-colors"
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

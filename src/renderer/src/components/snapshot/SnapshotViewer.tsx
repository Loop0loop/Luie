import { memo } from "react";
import { RotateCcw, Calendar } from "lucide-react";
import { api } from "../../services/api";
import { useChapterStore } from "../../stores/chapterStore";
import type { Snapshot } from "../../../../shared/types";
import Editor from "../editor/Editor";

interface SnapshotViewerProps {
  snapshot: Snapshot;
}

function SnapshotViewer({ snapshot }: SnapshotViewerProps) {
  const { loadAll: reloadChapters } = useChapterStore();

  const handleRestore = async () => {
    const confirmed = window.confirm("Restore this snapshot? Current content will be overwritten.");
    if (!confirmed) return;

    try {
      const response = await api.snapshot.restore(snapshot.id);
      if (response.success) {
        if (snapshot.projectId) {
          await reloadChapters(snapshot.projectId);
          // Force reload of main editor? The store update should trigger re-render if connected.
          // Changing key of Editor in App.tsx might be needed if content doesn't update.
          window.location.reload(); // Brute force simple reload for safety for now, or use better state management
        }
      } else {
        api.logger.error("Snapshot restore failed", response.error);
      }
    } catch (error) {
      api.logger.error("Snapshot restore failed", error);
    }
  };

  const formattedDate = snapshot.createdAt 
    ? new Date(snapshot.createdAt).toLocaleString() 
    : "Unknown Date";

  return (
    <div className="flex flex-col h-full w-full bg-panel border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface text-sm">
        <div className="flex items-center gap-2 text-muted-fg">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">Snapshot: {formattedDate}</span>
        </div>
        <button
          onClick={handleRestore}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </button>
      </div>

      {/* Read-Only Editor */}
      <div className="flex-1 min-h-0 bg-yellow-50/5 dark:bg-yellow-900/10"> 
        {/* Subtle background tint to distinguish from main editor */}
        <Editor
          key={snapshot.id} // Re-mount on snapshot change
          initialTitle={snapshot.description || ""}
          initialContent={snapshot.content}
          readOnly={true}
        />
      </div>
    </div>
  );
}

export default memo(SnapshotViewer);

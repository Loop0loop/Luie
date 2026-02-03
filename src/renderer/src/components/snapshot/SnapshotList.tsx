import { useEffect, useState, useMemo } from "react";
import { Clock, RotateCcw, GitCompare } from "lucide-react";
import { api } from "../../services/api";
import { useChapterStore } from "../../stores/chapterStore";
import type { Snapshot } from "../../../../shared/types";
import { SnapshotDiffModal } from "./SnapshotDiffModal";

interface SnapshotListProps {
  chapterId: string;
}

export function SnapshotList({ chapterId }: SnapshotListProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  const { items: chapters } = useChapterStore();
  const currentChapter = useMemo(() => chapters.find(c => c.id === chapterId), [chapters, chapterId]);

  useEffect(() => {
    async function loadSnapshots() {
      if (!chapterId) return;
      setLoading(true);
      try {
        const res = await api.snapshot.getByChapter(chapterId);
        if (res.success && res.data) {
          setSnapshots(res.data);
        }
      } catch (e) {
        api.logger.error("Failed to load snapshots", e);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshots();
  }, [chapterId]);

  const handleCompare = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setIsDiffOpen(true);
  };

  const handleRestore = async (snapshot: Snapshot) => {
      // Restore logic can be handled here or delegated.
      // Sidebar has logic for global restore.
      // For now, I'll focus on Compare. 
      // User might expect Restore button here too.
      if (!window.confirm("이 스냅샷으로 복구하시겠습니까? 현재 변경사항이 덮어씌워집니다.")) return;
      
      try {
          await api.snapshot.restore(snapshot.id);
          alert("복구되었습니다.");
          // Trigger reload if needed
      } catch (e) {
          alert("복구 실패");
      }
  };

  if (loading) {
    return <div className="p-4 text-xs text-muted">Loading snapshots...</div>;
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-xs text-muted flex flex-col items-center justify-center h-full opacity-60">
        <Clock className="mb-2 w-8 h-8 opacity-20" />
        No snapshots found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {snapshots.map((snap) => (
        <div
          key={snap.id}
          className="p-3 border-b border-border hover:bg-surface-hover transition-colors group relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-fg">
              {new Date(snap.createdAt).toLocaleString()}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleCompare(snap)}
                  className="p-1 hover:bg-active rounded text-accent"
                  title="Compare"
                >
                    <GitCompare className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleRestore(snap)}
                  className="p-1 hover:bg-active rounded text-muted hover:text-fg"
                  title="Restore"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
          <div className="text-[11px] text-muted line-clamp-2">
            {snap.description || "Auto Saved Snapshot"}
          </div>
        </div>
      ))}

      {selectedSnapshot && currentChapter && (
        <SnapshotDiffModal
          isOpen={isDiffOpen}
          onClose={() => setIsDiffOpen(false)}
          originalContent={currentChapter.content || ""}
          snapshotContent={selectedSnapshot.content || ""}
          snapshotDate={new Date(selectedSnapshot.createdAt)}
        />
      )}
    </div>
  );
}

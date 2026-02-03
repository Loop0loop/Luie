import { useEffect, useState } from "react";
import { Clock, RotateCcw, GitCompare } from "lucide-react";
import { api } from "../../services/api";
import type { Snapshot } from "../../../../shared/types";
import { useSplitView } from "../../hooks/useSplitView";

interface SnapshotListProps {
  chapterId: string;
}

export function SnapshotList({ chapterId }: SnapshotListProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { handleOpenSnapshot } = useSplitView();

  useEffect(() => {
    async function loadSnapshots() {
      if (!chapterId) return;
      setLoading(true);
      try {
        const res = await api.snapshot.getByChapter(chapterId);
        if (res.success && res.data) {
          setSnapshots(res.data);
        }
      } catch (error) {
        api.logger.error("Failed to load snapshots", error);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshots();
  }, [chapterId]);

  const handleCompare = (snapshot: Snapshot) => {
    handleOpenSnapshot(snapshot);
  };

  const handleRestore = async (snapshot: Snapshot) => {
      if (!window.confirm("이 스냅샷으로 복구하시겠습니까? 현재 변경사항이 덮어씌워집니다.")) return;
      
      try {
          await api.snapshot.restore(snapshot.id);
          alert("복구되었습니다.");
          // Trigger reload if needed
      } catch (error) {
          api.logger.error("Snapshot restore failed", error);
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


    </div>
  );
}

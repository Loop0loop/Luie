import { memo, useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { useWorldBuildingStore, useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { WORLD_GRAPH_ICON_MAP } from "@shared/constants/worldGraphUI";

export const EntityInspectorPanel = memo(() => {
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);
  const { nodes } = useFilteredGraph();
  
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const [descEdit, setDescEdit] = useState(selectedNode?.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  useEffect(() => {
    setDescEdit(selectedNode?.description || "");
    setIsEditingDesc(false);
  }, [selectedNode?.id, selectedNode?.description]);

  if (!selectedNode) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-panel/50 text-sm text-muted-foreground">
        <BookOpen size={24} className="mb-2 opacity-50" />
        <p>엔티티를 선택하면 위키 정보가 표시됩니다.</p>
      </div>
    );
  }

  const { id, name, entityType, subType } = selectedNode;
  const typeLabel = subType || entityType || "Entity";
  const Icon = WORLD_GRAPH_ICON_MAP[typeLabel] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

  const [nameEdit, setNameEdit] = useState(name);
  const [typeEdit, setTypeEdit] = useState<string>(typeLabel);

  useEffect(() => {
    setNameEdit(name);
    setTypeEdit(typeLabel);
  }, [id, name, typeLabel]);

  const handleNameSave = () => {
    if (nameEdit !== name) {
      void updateGraphNode({ id, entityType: entityType as any, name: nameEdit });
    }
  };

  const handleTypeSave = () => {
    if (typeEdit !== typeLabel) {
      void updateGraphNode({ id, entityType: entityType as any, subType: typeEdit as any });
    }
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    if (descEdit !== selectedNode.description) {
      void updateGraphNode({
        id,
        entityType: entityType as any,
        description: descEdit
      });
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-card border-l border-border/40 overflow-hidden font-sans">
      <div className="flex flex-col gap-1 px-5 pt-6 pb-4 shrink-0 bg-card border-b border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon size={14} className="text-accent" />
          <input
            value={typeEdit}
            onChange={(e) => setTypeEdit(e.target.value)}
            onBlur={handleTypeSave}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            className="text-[10px] font-bold tracking-widest uppercase text-accent/80 bg-transparent outline-none border-none p-0 w-32 focus:ring-1 focus:ring-accent-foreground/20 rounded"
            placeholder="분류 타입"
          />
        </div>
        <input
          value={nameEdit}
          onChange={(e) => setNameEdit(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          className="text-2xl font-extrabold text-foreground leading-tight tracking-tight break-keep bg-transparent outline-none border-none p-0 w-full focus:ring-1 focus:ring-accent-foreground/20 rounded"
          placeholder="엔티티 이름"
        />
      </div>

      <ScrollArea className="flex-1 px-5 py-6 bg-background/30">
        <div className="flex flex-col gap-6 pb-8 max-w-prose">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">개요</h2>
              {!isEditingDesc && (
                <button 
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  편집
                </button>
              )}
            </div>
            
            <div className="text-[14px] leading-relaxed">
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={descEdit}
                    onChange={(e) => setDescEdit(e.target.value)}
                    className="w-full min-h-[120px] rounded-md border border-accent/50 bg-background p-2.5 outline-none focus:border-accent resize-y"
                    placeholder="위키 내용을 작성하세요..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsEditingDesc(false)}
                      className="text-xs px-2 py-1 rounded hover:bg-muted"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleDescSave}
                      className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : descEdit ? (
                <div 
                  className="whitespace-pre-wrap text-foreground/90 font-serif"
                  onDoubleClick={() => setIsEditingDesc(true)}
                >
                  {descEdit}
                </div>
              ) : (
                <p 
                  className="italic text-muted-foreground/50 cursor-pointer hover:text-muted-foreground/80 transition-colors"
                  onClick={() => setIsEditingDesc(true)}
                >
                  위키 내용이 없습니다. 클릭하여 작성하세요.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 mt-4">
            <h2 className="text-lg font-semibold text-foreground tracking-tight border-b border-border/60 pb-1.5">속성 정보</h2>
            <div className="rounded-lg border border-border/40 bg-card p-4 text-sm flex flex-col gap-3 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0 pt-0.5">고유 ID</span>
                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded break-all">{id}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">분류</span>
                <input
                  value={typeEdit}
                  onChange={(e) => setTypeEdit(e.target.value)}
                  onBlur={handleTypeSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                  className="font-medium text-foreground text-[13px] bg-transparent outline-none border-b border-transparent focus:border-accent w-full p-0"
                  placeholder="분류 타입"
                />
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
});

EntityInspectorPanel.displayName = "EntityInspectorPanel";

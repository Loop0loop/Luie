import { memo, useState } from "react";
import { BookOpen } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WORLD_GRAPH_ICON_MAP } from "@shared/constants/worldGraphUI";
import { useWorldGraphScene } from "../scene/useWorldGraphScene";

type InspectorContentProps = {
  node: WorldGraphNode;
  onUpdate: ReturnType<typeof useWorldBuildingStore.getState>["updateGraphNode"];
};

function InspectorContent({ node, onUpdate }: InspectorContentProps) {
  const { id, name, entityType, subType } = node;
  const typeLabel = subType || entityType || "Entity";
  const displayTypeLabel = entityType === "Event" ? "사건" : typeLabel;
  const isTypeEditable = WORLD_SUBTYPES.includes(typeLabel as (typeof WORLD_SUBTYPES)[number]);
  const Icon = WORLD_GRAPH_ICON_MAP[typeLabel] ?? WORLD_GRAPH_ICON_MAP.WorldEntity;
  const [descEdit, setDescEdit] = useState(node.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [nameEdit, setNameEdit] = useState(name);
  const [typeEdit, setTypeEdit] = useState<string>(typeLabel);

  const handleNameSave = () => {
    if (nameEdit !== name) {
      void onUpdate({ id, entityType, name: nameEdit });
    }
  };

  const handleTypeSave = () => {
    if (!isTypeEditable || typeEdit === typeLabel) {
      return;
    }
    if (WORLD_SUBTYPES.includes(typeEdit as (typeof WORLD_SUBTYPES)[number])) {
      void onUpdate({
        id,
        entityType,
        subType: typeEdit as (typeof WORLD_SUBTYPES)[number],
      });
    }
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    if (descEdit !== (node.description || "")) {
      void onUpdate({ id, entityType, description: descEdit });
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-card border-l border-border/40 overflow-hidden font-sans">
      <div className="flex flex-col gap-1 px-5 pt-6 pb-4 shrink-0 bg-card border-b border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon size={14} className="text-accent" />
          {isTypeEditable ? (
            <input
              value={typeEdit}
              onChange={(e) => setTypeEdit(e.target.value)}
              onBlur={handleTypeSave}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="text-[10px] font-bold tracking-widest uppercase text-accent/80 bg-transparent outline-none border-none p-0 w-32 focus:ring-1 focus:ring-accent-foreground/20 rounded"
              placeholder="분류 타입"
            />
          ) : (
            <span className="text-[10px] font-bold tracking-widest uppercase text-accent/80">
              {displayTypeLabel}
            </span>
          )}
        </div>
        <input
          value={nameEdit}
          onChange={(e) => setNameEdit(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="text-2xl font-extrabold text-foreground leading-tight tracking-tight break-keep bg-transparent outline-none border-none p-0 w-full focus:ring-1 focus:ring-accent-foreground/20 rounded"
          placeholder="엔티티 이름"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-background/30 px-5 py-6">
        <div className="flex max-w-prose flex-col gap-6 pb-8">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">개요</h2>
              {!isEditingDesc ? (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  편집
                </button>
              ) : null}
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
                      onClick={() => {
                        setDescEdit(node.description || "");
                        setIsEditingDesc(false);
                      }}
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
                {isTypeEditable ? (
                  <input
                    value={typeEdit}
                    onChange={(e) => setTypeEdit(e.target.value)}
                    onBlur={handleTypeSave}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    className="font-medium text-foreground text-[13px] bg-transparent outline-none border-b border-transparent focus:border-accent w-full p-0"
                    placeholder="분류 타입"
                  />
                ) : (
                  <span className="font-medium text-foreground text-[13px]">
                    {displayTypeLabel}
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const EntityInspectorPanel = memo(() => {
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);
  const scene = useWorldGraphScene();
  const selectedNode = scene.selectedNode;

  if (!selectedNode) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-panel/50 text-sm text-muted-foreground">
        <BookOpen size={24} className="mb-2 opacity-50" />
        <p>엔티티를 선택하면 위키 정보가 표시됩니다.</p>
      </div>
    );
  }

  return <InspectorContent key={selectedNode.id} node={selectedNode} onUpdate={updateGraphNode} />;
});

EntityInspectorPanel.displayName = "EntityInspectorPanel";
const WORLD_SUBTYPES = ["Place", "Concept", "Rule", "Item"] as const;

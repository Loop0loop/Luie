import { useState, useMemo } from "react";
import type { Node, NodeProps } from "reactflow";
import ReactFlow, { Background, Handle, Position, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";
import { User, Image as ImageIcon } from "lucide-react";
import { useMindMapBoard } from "./useMindMapBoard";
import type { MindMapNodeData } from "./MindMapNodeData";

// Custom Node for MindMap - Character Card Style
const CharacterNode = ({ id, data }: NodeProps<MindMapNodeData>) => {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const commitLabel = () => {
    const nextLabel = (draft ?? data.label).trim() || t("world.mindmap.newTopic");
    setNodes((nds: Node<MindMapNodeData>[]) =>
      nds.map((node: Node<MindMapNodeData>) =>
        node.id === id
          ? { ...node, data: { ...node.data, label: nextLabel } }
          : node,
      ),
    );
    setDraft(null);
    setIsEditingLabel(false);
  };

  const handleImageUpload = (url: string) => {
    setNodes((nds: Node<MindMapNodeData>[]) =>
      nds.map((node: Node<MindMapNodeData>) =>
        node.id === id
          ? { ...node, data: { ...node.data, image: url } }
          : node,
      ),
    );
  };

  return (
    <div
      className="group bg-panel border-2 border-border hover:border-accent rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col items-center min-w-[120px]"
      style={{
        width: (data.image || isEditingImage) ? 160 : "auto",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.label);
        setIsEditingLabel(true);
      }}
    >
      <Handle type="target" position={Position.Top} className="bg-accent! w-3 h-3" />

      {/* Image Area */}
      <div
        className="w-full aspect-square bg-element flex items-center justify-center relative overflow-hidden"
        style={{ display: (data.image || isEditingImage) ? "flex" : "block", height: (data.image || isEditingImage) ? "auto" : 40 }}
      >
        {isEditingImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-panel">
            <input
              className="w-full text-xs p-1 border border-border rounded mb-1 bg-element text-fg"
              placeholder={t("world.mindmap.urlPlaceholder")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val) handleImageUpload(val);
                  setIsEditingImage(false);
                }
                if (e.key === 'Escape') setIsEditingImage(false);
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val) handleImageUpload(val);
                setIsEditingImage(false);
              }}
            />
            <span className="text-[10px] text-muted">{t("world.mindmap.enterUrl")}</span>
          </div>
        ) : data.image ? (
          <img src={data.image} alt={data.label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted/30">
            <User className="w-6 h-6" />
          </div>
        )}

        {/* Hover Image Edit Button */}
        {!isEditingImage && (
          <button
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingImage(true);
            }}
            title={t("world.mindmap.uploadImage")}
          >
            <ImageIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Label Area */}
      <div className="p-2 w-full bg-panel border-t border-border/50">
        {isEditingLabel ? (
          <input
            className="w-full text-center border-none bg-transparent outline-none font-bold text-sm text-fg p-0"
            value={draft ?? data.label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLabel();
              if (e.key === "Escape") {
                setDraft(null);
                setIsEditingLabel(false);
              }
            }}
            autoFocus
          />
        ) : (
          <div className="font-bold text-sm text-fg text-center wrap-break-word leading-tight">{data.label}</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-accent! w-3 h-3" />
    </div>
  );
};

export function MindMapBoard() {
  const nodeTypes = useMemo(() => ({ character: CharacterNode }), []);

  const {
    t,
    flowRef,
    nodes,
    edges,
    onNodesChangeBatched,
    onEdgesChangeBatched,
    onConnect,
    onNodeClick,
    onPaneDoubleClick,
    handleKeyDown,
    setSelectedNodeId,
  } = useMindMapBoard();

  return (
    <div
      className="w-full h-full bg-app overflow-hidden outline-none relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDoubleClick={onPaneDoubleClick}
      style={{ outline: "none" }}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-panel/90 px-6 py-2 rounded-full text-xs font-medium text-fg shadow-lg pointer-events-none z-10 backdrop-blur-md border border-border flex items-center gap-4"
      >
        <div className="flex items-center gap-1.5">
          <span className="p-1 bg-border rounded">{t("world.mindmap.shortcut.clickKey")}</span>
          {t("world.mindmap.shortcut.select")}
        </div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 bg-border rounded">{t("world.mindmap.shortcut.enterKey")}</span>
          {t("world.mindmap.shortcut.sibling")}
        </div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 bg-border rounded">{t("world.mindmap.shortcut.tabKey")}</span>
          {t("world.mindmap.shortcut.child")}
        </div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 bg-border rounded">{t("world.mindmap.shortcut.deleteKey")}</span>
          {t("world.mindmap.shortcut.delete")}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeBatched}
        onEdgesChange={onEdgesChangeBatched}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        fitView
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--grid-line)" gap={24} size={1} />

        {/* Custom Controls */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-panel/90 backdrop-blur border border-border p-1.5 rounded-xl shadow-lg">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.zoomIn()} title={t("world.mindmap.controls.zoomIn")}>+</button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.zoomOut()} title={t("world.mindmap.controls.zoomOut")}>-</button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.fitView()} title={t("world.mindmap.controls.fitView")}>⛶</button>
        </div>
      </ReactFlow>
    </div>
  );
}

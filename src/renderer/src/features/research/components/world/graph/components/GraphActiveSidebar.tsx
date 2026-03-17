import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Link2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { EntityRelation, ScrapMemo, WorldGraphNode } from "@shared/types";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";
import { ENTITY_TYPE_COLORS, GRAPH_TAB_ITEMS } from "../constants";
import type { GraphSurfaceTab } from "../types";

type GraphActiveSidebarProps = {
  activeTab: GraphSurfaceTab;
  currentProjectTitle: string;
  nodes: WorldGraphNode[];
  timelineNodes: WorldGraphNode[];
  notes: ScrapMemo[];
  edges: EntityRelation[];
  selectedNode: WorldGraphNode | null;
  selectedNoteId: string | null;
  onClose: () => void;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
  onSelectNode: (nodeId: string) => void;
  onSaveNode: (input: { name: string; description: string }) => void;
  onDeleteNode: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onAutoLayout: () => void;
  pluginSummary: {
    catalogCount: number;
    installedCount: number;
    templateCount: number;
    isLoading: boolean;
    error: string | null;
    onReload: () => void;
  };
};

function AccordionSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/3 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-fg/55">{icon}</span>
          <span className="text-[13px] font-medium text-fg/85">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg/40" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg/40" />
        )}
      </button>
      {open ? (
        <div className="border-t border-white/6 px-4 py-4">{children}</div>
      ) : null}
    </div>
  );
}

function EntityEditor({
  node,
  onSave,
  onDelete,
}: {
  node: WorldGraphNode | null;
  onSave: (input: { name: string; description: string }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(node?.name ?? "");
  const [description, setDescription] = useState(node?.description ?? "");

  if (!node) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
        캔버스에서 카드를 선택하면 여기서 수정할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
            선택된 엔티티
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-fg">
            {node.entityType}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="rounded-full text-fg/50 hover:bg-white/8 hover:text-red-200"
          onClick={onDelete}
          title="엔티티 삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs text-fg/55">이름</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="border-border/60 bg-[#0d1015]"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-fg/55">설명</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-[100px] w-full rounded-xl border border-border/60 bg-[#0d1015] px-3 py-2 text-sm text-fg outline-none ring-0"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => onSave({ name, description })}
      >
        <Save className="h-4 w-4" />
        저장
      </Button>
    </div>
  );
}

function RelationCards({
  node,
  nodes,
  edges,
  onSelectNode,
}: {
  node: WorldGraphNode | null;
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  onSelectNode: (nodeId: string) => void;
}) {
  if (!node) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
        노드를 선택하면 연결된 관계를 볼 수 있습니다.
      </div>
    );
  }

  const relatedEdges = edges.filter(
    (edge) => edge.sourceId === node.id || edge.targetId === node.id,
  );

  if (relatedEdges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
        연결된 관계가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {relatedEdges.map((edge) => {
        const isSource = edge.sourceId === node.id;
        const otherId = isSource ? edge.targetId : edge.sourceId;
        const otherNode = nodes.find((n) => n.id === otherId);
        if (!otherNode) return null;

        const tone =
          ENTITY_TYPE_COLORS[
            otherNode.entityType as keyof typeof ENTITY_TYPE_COLORS
          ] ?? ENTITY_TYPE_COLORS.WorldEntity;

        return (
          <button
            key={edge.id}
            type="button"
            onClick={() => onSelectNode(otherNode.id)}
            className="w-full rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-left transition hover:border-white/16 hover:bg-white/8"
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-3 w-3 shrink-0 text-fg/40" />
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  tone.chip,
                ].join(" ")}
              >
                {otherNode.entityType}
              </span>
              <span className="truncate text-xs text-fg/45">
                {isSource ? "→" : "←"} {edge.relation || "연결됨"}
              </span>
            </div>
            <p className="mt-1.5 truncate text-[13px] font-medium text-fg">
              {otherNode.name}
            </p>
          </button>
        );
      })}
    </div>
  );
}

type CanvasAccordionState = {
  entities: boolean;
  current: boolean;
  search: boolean;
  layout: boolean;
};

function CanvasTabContent({
  nodes,
  edges,
  selectedNode,
  onCreatePreset,
  onSelectNode,
  onSaveNode,
  onDeleteNode,
  onAutoLayout,
}: {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNode: WorldGraphNode | null;
  onCreatePreset: GraphActiveSidebarProps["onCreatePreset"];
  onSelectNode: GraphActiveSidebarProps["onSelectNode"];
  onSaveNode: GraphActiveSidebarProps["onSaveNode"];
  onDeleteNode: GraphActiveSidebarProps["onDeleteNode"];
  onAutoLayout: GraphActiveSidebarProps["onAutoLayout"];
}) {
  const [open, setOpen] = useState<CanvasAccordionState>({
    entities: true,
    current: false,
    search: false,
    layout: false,
  });
  const [searchQuery, setSearchQuery] = useState("");

  const toggle = (key: keyof CanvasAccordionState) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredNodes =
    searchQuery.trim().length === 0
      ? nodes
      : nodes.filter((node) => {
          const q = searchQuery.trim().toLowerCase();
          return (
            node.name.toLowerCase().includes(q) ||
            (node.description ?? "").toLowerCase().includes(q)
          );
        });

  return (
    <div className="space-y-2">
      <AccordionSection
        title="저장된 엔티티"
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        open={open.entities}
        onToggle={() => toggle("entities")}
      >
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onCreatePreset("Character")}
          >
            <Plus className="h-3.5 w-3.5" />새 엔티티 추가
          </Button>
          <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto">
            {nodes.map((node) => {
              const tone =
                ENTITY_TYPE_COLORS[
                  node.entityType as keyof typeof ENTITY_TYPE_COLORS
                ] ?? ENTITY_TYPE_COLORS.WorldEntity;
              const active = node.id === selectedNode?.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className={[
                    "w-full rounded-2xl border px-3 py-2.5 text-left transition",
                    active
                      ? `${tone.card} ring-1 ring-white/20`
                      : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/6",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-full border px-1.5 py-0.5 text-[10px]",
                        tone.chip,
                      ].join(" ")}
                    >
                      {node.entityType}
                    </span>
                    <p className="truncate text-[13px] font-medium text-fg">
                      {node.name}
                    </p>
                  </div>
                </button>
              );
            })}
            {nodes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
                아직 엔티티가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="현재 엔티티 + 관계"
        icon={<Link2 className="h-3.5 w-3.5" />}
        open={open.current}
        onToggle={() => toggle("current")}
      >
        <div className="space-y-5">
          <EntityEditor
            key={selectedNode?.id ?? "empty-node-editor"}
            node={selectedNode}
            onSave={onSaveNode}
            onDelete={onDeleteNode}
          />
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-fg/45">
              연결된 관계
            </p>
            <RelationCards
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              onSelectNode={onSelectNode}
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="검색"
        icon={<Search className="h-3.5 w-3.5" />}
        open={open.search}
        onToggle={() => toggle("search")}
      >
        <div className="space-y-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 설명 검색..."
            className="border-border/60 bg-[#0d1015]"
          />
          <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
            {filteredNodes.map((node) => {
              const tone =
                ENTITY_TYPE_COLORS[
                  node.entityType as keyof typeof ENTITY_TYPE_COLORS
                ] ?? ENTITY_TYPE_COLORS.WorldEntity;
              const active = node.id === selectedNode?.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className={[
                    "w-full rounded-2xl border px-3 py-2.5 text-left transition",
                    active
                      ? `${tone.card} ring-1 ring-white/20`
                      : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/6",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-full border px-1.5 py-0.5 text-[10px]",
                        tone.chip,
                      ].join(" ")}
                    >
                      {node.entityType}
                    </span>
                    <p className="truncate text-[13px] font-medium text-fg">
                      {node.name}
                    </p>
                  </div>
                  {node.description?.trim() ? (
                    <p className="mt-1 truncate text-xs text-fg/45">
                      {node.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
            {searchQuery.trim().length > 0 && filteredNodes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
                검색 결과가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="자동 정렬"
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        open={open.layout}
        onToggle={() => toggle("layout")}
      >
        <div className="space-y-3">
          <p className="text-xs text-fg/55">
            모든 노드를 그리드 레이아웃으로 자동 배치합니다.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={onAutoLayout}
          >
            <LayoutGrid className="h-4 w-4" />
            그리드 정렬 실행
          </Button>
        </div>
      </AccordionSection>
    </div>
  );
}

export function GraphActiveSidebar({
  activeTab,
  currentProjectTitle,
  nodes,
  timelineNodes,
  notes,
  edges,
  selectedNode,
  selectedNoteId,
  onClose,
  onCreatePreset,
  onSelectNode,
  onSaveNode,
  onDeleteNode,
  onSelectNote,
  onCreateNote,
  onAutoLayout,
  pluginSummary,
}: GraphActiveSidebarProps) {
  const activeMeta = GRAPH_TAB_ITEMS.find((item) => item.id === activeTab);

  return (
    <aside className="flex h-full flex-col border-r border-border/60 bg-[#161a21]">
      <div className="flex shrink-0 items-start justify-between border-b border-border/60 px-4 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
            {activeMeta?.label}
          </p>
          <h2 className="mt-1 text-base font-semibold text-fg">
            {currentProjectTitle}
          </h2>
          <p className="mt-1.5 text-sm text-fg/60">{activeMeta?.description}</p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 rounded-full text-fg/45 hover:bg-white/8 hover:text-fg"
          onClick={onClose}
          title="사이드바 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 py-4">
          {activeTab === "canvas" ? (
            <CanvasTabContent
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              onCreatePreset={onCreatePreset}
              onSelectNode={onSelectNode}
              onSaveNode={onSaveNode}
              onDeleteNode={onDeleteNode}
              onAutoLayout={onAutoLayout}
            />
          ) : null}

          {activeTab === "timeline" ? (
            <div className="space-y-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onCreatePreset("Event")}
              >
                <Plus className="h-4 w-4" />새 사건
              </Button>
              <div className="space-y-2">
                {timelineNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectNode(node.id)}
                    className={[
                      "w-full rounded-[22px] border px-4 py-3 text-left transition",
                      selectedNode?.id === node.id
                        ? "border-amber-300/40 bg-amber-500/10 text-fg shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
                        : "border-white/8 bg-white/5 text-fg/80 hover:border-white/16 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <p className="text-sm font-medium">{node.name}</p>
                    <p className="mt-1 text-xs text-fg/55">
                      {node.description?.trim() || "설명 없음"}
                    </p>
                  </button>
                ))}
                {timelineNodes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
                    아직 사건이 없습니다.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="space-y-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onCreateNote}
              >
                <Plus className="h-4 w-4" />새 노트
              </Button>
              <div className="space-y-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className={[
                      "w-full rounded-[22px] border px-4 py-3 text-left transition",
                      selectedNoteId === note.id
                        ? "border-orange-300/40 bg-orange-500/10 text-fg shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
                        : "border-white/8 bg-white/5 text-fg/80 hover:border-white/16 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <p className="truncate text-sm font-medium">
                      {note.title || "제목 없음"}
                    </p>
                    <p className="mt-1 truncate text-xs text-fg/55">
                      {note.content.trim() || "내용 없음"}
                    </p>
                  </button>
                ))}
                {notes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
                    아직 노트가 없습니다.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "entity" ? (
            <div className="space-y-2">
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className={[
                    "w-full rounded-[22px] border px-4 py-3 text-left transition",
                    selectedNode?.id === node.id
                      ? "border-cyan-300/40 bg-cyan-500/10 text-fg shadow-[0_14px_28px_rgba(0,0,0,0.22)]"
                      : "border-white/8 bg-white/5 text-fg/80 hover:border-white/16 hover:bg-white/8",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{node.name}</p>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-fg/38">
                      linked
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-fg/55">
                    {node.description?.trim() || "설명 없음"}
                  </p>
                </button>
              ))}
              {nodes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-5 text-sm text-fg/60">
                  캔버스 엔티티가 비어 있습니다.
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "library" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="px-3 pt-4">
                    <p className="text-[11px] text-fg/45">설치</p>
                    <p className="mt-1 text-lg font-semibold text-fg">
                      {pluginSummary.installedCount}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="px-3 pt-4">
                    <p className="text-[11px] text-fg/45">카탈로그</p>
                    <p className="mt-1 text-lg font-semibold text-fg">
                      {pluginSummary.catalogCount}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="px-3 pt-4">
                    <p className="text-[11px] text-fg/45">템플릿</p>
                    <p className="mt-1 text-lg font-semibold text-fg">
                      {pluginSummary.templateCount}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={pluginSummary.onReload}
              >
                {pluginSummary.isLoading
                  ? "불러오는 중..."
                  : "플러그인 새로고침"}
              </Button>
              {pluginSummary.error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-200">
                  {pluginSummary.error}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

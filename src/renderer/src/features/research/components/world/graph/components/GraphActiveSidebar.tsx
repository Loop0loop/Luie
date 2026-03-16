import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { ScrapMemo, WorldGraphNode } from "@shared/types";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";
import { GRAPH_CREATE_PRESETS, GRAPH_TAB_ITEMS } from "../constants";
import type { GraphSurfaceTab } from "../types";

type GraphActiveSidebarProps = {
  activeTab: GraphSurfaceTab;
  currentProjectTitle: string;
  nodes: WorldGraphNode[];
  timelineNodes: WorldGraphNode[];
  notes: ScrapMemo[];
  selectedNode: WorldGraphNode | null;
  selectedNoteId: string | null;
  onCreatePreset: (entityType: WorldGraphNode["entityType"], subType?: WorldGraphNode["subType"]) => void;
  onSelectNode: (nodeId: string) => void;
  onSaveNode: (input: { name: string; description: string }) => void;
  onDeleteNode: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  pluginSummary: {
    catalogCount: number;
    installedCount: number;
    templateCount: number;
    isLoading: boolean;
    error: string | null;
    onReload: () => void;
  };
};

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
        캔버스에서 카드를 선택하면 여기서 이름과 설명을 바로 수정할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,31,0.96)_0%,rgba(14,17,23,0.98)_100%)] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-fg/45">
          선택된 엔티티
          </p>
          <p className="text-sm text-fg/65">
            캔버스와 에디터에 동일하게 반영됩니다.
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
        <span className="mb-2 block text-xs text-fg/55">이름</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="border-border/60 bg-[#0d1015]"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs text-fg/55">설명</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-[120px] w-full rounded-xl border border-border/60 bg-[#0d1015] px-3 py-2 text-sm text-fg outline-none ring-0"
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

export function GraphActiveSidebar({
  activeTab,
  currentProjectTitle,
  nodes,
  timelineNodes,
  notes,
  selectedNode,
  selectedNoteId,
  onCreatePreset,
  onSelectNode,
  onSaveNode,
  onDeleteNode,
  onSelectNote,
  onCreateNote,
  pluginSummary,
}: GraphActiveSidebarProps) {
  const activeMeta = GRAPH_TAB_ITEMS.find((item) => item.id === activeTab);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-border/60 bg-[#161a21]">
      <div className="border-b border-border/60 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-fg/45">
          {activeMeta?.label}
        </p>
        <h2 className="mt-1 text-base font-semibold text-fg">{currentProjectTitle}</h2>
        <p className="mt-2 text-sm text-fg/60">{activeMeta?.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="space-y-4 px-4 py-4">
        {activeTab === "canvas" ? (
          <div className="space-y-5">
            <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(20,24,31,0.94)_0%,rgba(14,17,23,0.96)_100%)]">
              <CardHeader>
                <CardTitle className="text-sm">빠른 생성</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {GRAPH_CREATE_PRESETS.map((preset) => (
                  <Button
                    key={`${preset.entityType}:${preset.subType ?? "base"}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onCreatePreset(preset.entityType, preset.subType)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <EntityEditor
              key={selectedNode?.id ?? "empty-node-editor"}
              node={selectedNode}
              onSave={onSaveNode}
              onDelete={onDeleteNode}
            />
          </div>
        ) : null}

        {activeTab === "timeline" ? (
          <div className="space-y-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onCreatePreset("Event")}
            >
              <Plus className="h-4 w-4" />
              새 사건
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
              <Plus className="h-4 w-4" />
              새 노트
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
                  <p className="truncate text-sm font-medium">{note.title || "제목 없음"}</p>
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
              {pluginSummary.isLoading ? "불러오는 중..." : "플러그인 새로고침"}
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

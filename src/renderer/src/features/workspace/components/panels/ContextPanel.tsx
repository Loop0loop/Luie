import { useState, useEffect, useMemo, useDeferredValue, useTransition, useCallback, memo, useRef } from "react";
import { ArrowLeft, MousePointerClick } from "lucide-react";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import TabButton from "@shared/ui/TabButton";
import SearchInput from "@shared/ui/SearchInput";
import type { Character, Term } from "@shared/types";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import CanvasNodeInspector from "@renderer/features/canvas/components/binder/CanvasNodeInspector";
import GraphNodeInspector from "@renderer/features/canvas/components/binder/GraphNodeInspector";
import { useGraphStore } from "@renderer/features/canvas/stores/graph/graphStore";
import { cn } from "@shared/types/utils";

// ScrivenerLayout as never 제거를 위해 Tab 타입을 명시적으로 export 노출
export type Tab = "synopsis" | "characters" | "terms" | "elements";

type ContextItem = Character | Term;

type CharacterAttributes = Record<string, unknown>;

function isCharacter(item: ContextItem): item is Character {
  return "name" in item;
}

function isTerm(item: ContextItem): item is Term {
  return "term" in item;
}

function parseCharacterAttributes(value: Character["attributes"]): CharacterAttributes {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as CharacterAttributes;
      }
    } catch {
      return {};
    }
    return {};
  }

  if (typeof value === "object") {
    return value as CharacterAttributes;
  }

  return {};
}

function pickFirstText(attributes: CharacterAttributes, keys: string[]): string | null {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function buildCharacterHeadline(character: Character): string | null {
  const attributes = parseCharacterAttributes(character.attributes);
  return pickFirstText(attributes, [
    "jobTitle",
    "job",
    "rank",
    "class",
    "status",
    "title",
    "race",
  ]);
}

function buildCharacterSummary(character: Character): string | null {
  const attributes = parseCharacterAttributes(character.attributes);
  const parts = [
    pickFirstText(attributes, ["affiliation", "affiliationGuild", "family"]),
    pickFirstText(attributes, ["ability", "element", "weapon"]),
    typeof character.description === "string" ? character.description.trim() : "",
  ].filter((part): part is string => Boolean(part && part.length > 0));

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/* ─────────────────────────────────────────── CanvasSelectionWatcher Component */

interface CanvasSelectionWatcherProps {
  handleTabChange: (tab: Tab) => void;
}

const CanvasSelectionWatcher = memo(({
  handleTabChange,
}: CanvasSelectionWatcherProps) => {
  const selection = useCanvasViewStore((state) => state.selection);
  const focusId = useGraphStore((state) => state.focusId);
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";

  // useRef를 사용하여 setState 호출로 인한 Cascading render 경고를 완전히 원천 회피
  const prevFocusIdRef = useRef<string | null>(null);
  const prevSelectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isGraphMode) {
      if (focusId && focusId !== prevFocusIdRef.current) {
        handleTabChange("elements");
        prevFocusIdRef.current = focusId;
      } else if (!focusId) {
        prevFocusIdRef.current = null;
      }
    } else {
      // selection 유니온 타입 { kind: "none" } 의 id 부재로 인한 TS 에러를 삼항 연산자 타입 가드로 깔끔하게 해결
      const nodeId = selection.kind === "node" ? selection.id : null;
      if (nodeId && nodeId !== prevSelectionIdRef.current) {
        handleTabChange("elements");
        prevSelectionIdRef.current = nodeId;
      } else if (!nodeId) {
        prevSelectionIdRef.current = null;
      }
    }
  }, [selection.kind, selection, focusId, isGraphMode, handleTabChange]);

  return null;
});

CanvasSelectionWatcher.displayName = "CanvasSelectionWatcher";

/* ─────────────────────────────────────────── CanvasElementsTab Component */

const CanvasElementsTab = memo(() => {
  // prop 드릴링 제거: useTranslation 직접 사용
  const { t } = useTranslation();
  const selection = useCanvasViewStore((state) => state.selection);
  const focusId = useGraphStore((state) => state.focusId);
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isGraphMode = activePanel === "graph";
  
  if (isGraphMode) {
    return focusId ? (
      <GraphNodeInspector nodeId={focusId} />
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center py-20 select-none">
        <MousePointerClick className="h-7 w-7 text-muted opacity-30 mx-auto" aria-hidden />
        <div className="space-y-1 mt-3">
          <p className="text-xs font-semibold text-fg/60">
            {t("canvas.graph.details.emptyTitle", "설정 수사 정보")}
          </p>
          <p className="text-[11px] text-muted-foreground leading-normal">
            {t("canvas.graph.details.emptyDescription", "월드 그래프에서 인물이나 사건 노드를 클릭하면 큼직한 상세 설정 수사 메모가 이 바인더 패널에 활성화됩니다.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {selection.kind === "node" ? (
        <CanvasNodeInspector nodeId={selection.id} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center py-20 select-none">
          <MousePointerClick className="h-7 w-7 text-muted opacity-30 mx-auto" aria-hidden />
          <div className="space-y-1 mt-3">
            <p className="text-xs font-semibold text-fg/60">
              {t("canvas.inspector.emptyTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t("canvas.inspector.emptyDescription")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

CanvasElementsTab.displayName = "CanvasElementsTab";

/* ─────────────────────────────────────────── ContextPanel Component */

interface ContextPanelProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  isCanvasMode?: boolean;
}

function ContextPanel({
  activeTab = "synopsis",
  onTabChange,
  isCanvasMode = false,
}: ContextPanelProps) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<Tab>("synopsis");
  const [isPending, startTransition] = useTransition();

  const currentTab = onTabChange ? activeTab : internalTab;
  const handleTabChange = useCallback((tab: Tab) => {
    if (onTabChange) onTabChange(tab);
    else {
      startTransition(() => {
        setInternalTab(tab);
      });
    }
  }, [onTabChange]);

  const currentProject = useProjectStore((state) => state.currentProject);
  const characters = useCharacterStore((state) => state.characters);
  const terms = useTermStore((state) => state.terms);

  const [searchText, setSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const isStale = searchText !== deferredSearchText;

  const activePanel = useCanvasViewStore((state) => state.activePanel);

  useEffect(() => {
    if (!currentProject?.id) return;
    const projectId = currentProject.id;
    void useCharacterStore.getState().loadCharacters(projectId).catch((err: unknown) => {
      api.logger.error("ContextPanel: failed to load characters", err);
    });
    void useTermStore.getState().loadTerms(projectId).catch((err: unknown) => {
      api.logger.error("ContextPanel: failed to load terms", err);
    });
  }, [currentProject?.id]);

  const filteredCharacters = useMemo(() => {
    if (!deferredSearchText) return characters;
    return characters.filter((character) =>
      character.name.includes(deferredSearchText) ||
      (character.description || "").includes(deferredSearchText),
    );
  }, [characters, deferredSearchText]);

  const filteredTerms = useMemo(() => {
    if (!deferredSearchText) return terms;
    return terms.filter((term) =>
      term.term.includes(deferredSearchText) ||
      (term.definition || "").includes(deferredSearchText),
    );
  }, [terms, deferredSearchText]);

  const handleItemClick = (item: ContextItem) => {
    startTransition(() => {
      setSelectedItem(item);
    });
  };

  const handleBack = () => {
    startTransition(() => {
      setSelectedItem(null);
    });
  };

  // elements 탭에서는 검색이 불필요하므로 검색창 조건부 노출
  const showSearch = !(isCanvasMode && currentTab === "elements");

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Canvas 모드일 때만 비동기 감시 컴포넌트 마운트하여 ContextPanel의 구독 오버헤드 0% 완수 */}
      {isCanvasMode && (
        <CanvasSelectionWatcher
          handleTabChange={handleTabChange}
        />
      )}

      {selectedItem && (
        <div className="absolute inset-0 bg-panel z-10 flex flex-col animate-in slide-in-from-right-5 duration-200">
          <div className="flex items-center gap-3 p-4">
            <button className="flex items-center justify-center p-1 rounded hover:bg-hover text-muted hover:text-fg transition-colors" onClick={handleBack}>
              <ArrowLeft className="icon-md" />
            </button>
            <div className="text-base font-bold text-fg">
              {isCharacter(selectedItem) ? selectedItem.name : selectedItem.term}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="text-[11px] font-semibold text-muted uppercase mb-2">{t("context.detail.description")}</div>
              <div className="text-sm leading-relaxed text-fg whitespace-pre-wrap">
                {isCharacter(selectedItem)
                  ? (selectedItem.description ?? "")
                  : (selectedItem.definition ?? "")}
              </div>
            </div>

            {isTerm(selectedItem) && selectedItem.category && (
              <div className="mb-6">
                <div className="text-[11px] font-semibold text-muted uppercase mb-2">{t("context.detail.category")}</div>
                <div className="text-sm text-fg">{selectedItem.category}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center px-4 pt-3 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {isCanvasMode
            ? activePanel === "graph"
              ? t("canvas.binder.graphHeader", "인물 관계 수사망")
              : t("canvas.binder.canvasHeader")
            : t("canvas.binder.synopsisHeader")}
        </span>
      </div>

      {showSearch && (
        <div className="flex flex-col gap-3 px-4 pt-1.5">
          <SearchInput
            variant="context"
            placeholder={t("context.placeholder.search")}
            value={searchText}
            onChange={setSearchText}
          />
        </div>
      )}

      {!(isCanvasMode && activePanel === "graph") && (
        <div className="flex px-4 mt-3 border-b border-border/30 overflow-x-auto gap-1">
          <TabButton
            label={t("context.tab.synopsis")}
            active={currentTab === "synopsis"}
            onClick={() => {
              handleTabChange("synopsis");
              setSelectedItem(null);
            }}
            className="flex-1 py-2 text-[12px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center whitespace-nowrap"
            activeClassName="text-accent border-accent font-semibold"
            inactiveClassName="text-muted hover:text-fg"
          />
          <TabButton
            label={t("context.tab.characters")}
            active={currentTab === "characters"}
            onClick={() => {
              handleTabChange("characters");
              setSelectedItem(null);
            }}
            className="flex-1 py-2 text-[12px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center whitespace-nowrap"
            activeClassName="text-accent border-accent font-semibold"
            inactiveClassName="text-muted hover:text-fg"
          />
          <TabButton
            label={t("context.tab.terms")}
            active={currentTab === "terms"}
            onClick={() => {
              handleTabChange("terms");
              setSelectedItem(null);
            }}
            className="flex-1 py-2 text-[12px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center whitespace-nowrap"
            activeClassName="text-accent border-accent font-semibold"
            inactiveClassName="text-muted hover:text-fg"
          />
          {isCanvasMode && (
            <TabButton
              label={t("canvas.binder.tab.elements")}
              active={currentTab === "elements"}
              onClick={() => {
                handleTabChange("elements");
                setSelectedItem(null);
              }}
              className="flex-1 py-2 text-[12px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center whitespace-nowrap"
              activeClassName="text-accent border-accent font-semibold"
              inactiveClassName="text-muted hover:text-fg"
            />
          )}
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 transition-opacity duration-200",
          (isStale || isPending) && "opacity-60"
        )}
      >
        {isCanvasMode && activePanel === "graph" ? (
          <CanvasElementsTab />
        ) : (
          <>
            {currentTab === "synopsis" && (
              <div style={{ padding: "var(--context-panel-section-padding)" }}>
                <div
                  style={{
                    fontSize: "var(--context-panel-header-font-size)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--context-panel-section-margin-bottom)",
                  }}
                >
                  {t("context.synopsisHeader")}
                </div>
                <textarea
                  className="w-full border border-border rounded-lg p-3 text-sm text-fg bg-element resize-none font-sans leading-relaxed min-h-50"
                  placeholder={t("context.placeholder.synopsis")}
                  value={currentProject?.description || ""}
                  readOnly
                />
              </div>
            )}

            {currentTab === "characters" && (
              <>
                {filteredCharacters.map((item) => {
                  const headline = buildCharacterHeadline(item);
                  const summary = buildCharacterSummary(item);
                  return (
                    <div
                      key={item.id}
                      className="bg-element border border-border rounded-lg p-3 mb-2 cursor-pointer transition-all hover:border-active hover:bg-element-hover"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-fg">{item.name}</div>
                        {headline && <div className="text-xs font-medium text-accent">{headline}</div>}
                      </div>
                      {summary && <div className="text-[13px] text-muted mt-2 leading-relaxed">{summary}</div>}
                    </div>
                  );
                })}
              </>
            )}

            {currentTab === "terms" && (
              <>
                {filteredTerms.map((item) => (
                  <div
                    key={item.id}
                    className="bg-element border border-border rounded-lg p-3 mb-2 cursor-pointer transition-all hover:border-active hover:bg-element-hover"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-semibold text-fg">{item.term}</div>
                    </div>
                    {item.definition && (
                      <div
                        style={{
                          fontSize: "var(--context-panel-body-font-size)",
                          color: "var(--text-secondary)",
                          marginBottom: "var(--context-panel-section-margin-bottom)",
                        }}
                      >
                        {item.definition}
                      </div>
                    )}
                    {item.category && (
                      <div
                        style={{
                          fontSize: "var(--context-panel-tag-font-size)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        #{item.category}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {currentTab === "elements" && isCanvasMode && (
              <CanvasElementsTab />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(ContextPanel);

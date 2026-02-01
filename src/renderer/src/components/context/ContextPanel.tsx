import { useState, useEffect, useMemo, useDeferredValue, memo } from "react";
import { cn } from "../../../../shared/types/utils";
import { Search, ArrowLeft } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Character, Term } from "../../../../shared/types";
import {
  LABEL_CONTEXT_DETAIL_DESCRIPTION,
  LABEL_CONTEXT_DETAIL_CATEGORY,
  LABEL_CONTEXT_SYNOPSIS_HEADER,
  LABEL_CONTEXT_TAB_CHARACTERS,
  LABEL_CONTEXT_TAB_SYNOPSIS,
  LABEL_CONTEXT_TAB_TERMS,
  PLACEHOLDER_CONTEXT_SEARCH,
  PLACEHOLDER_CONTEXT_SYNOPSIS,
} from "../../../../shared/constants";

type Tab = "synopsis" | "characters" | "terms";

type ContextItem = Character | Term;

function isCharacter(item: ContextItem): item is Character {
  return "name" in item;
}

function isTerm(item: ContextItem): item is Term {
  return "term" in item;
}

interface ContextPanelProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

function ContextPanel({
  activeTab = "synopsis",
  onTabChange,
}: ContextPanelProps) {
  const [internalTab, setInternalTab] = useState<Tab>("synopsis");

  const currentTab = onTabChange ? activeTab : internalTab;
  const handleTabChange = (tab: Tab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  const { currentProject } = useProjectStore();
  const { characters } = useCharacterStore();
  const { terms } = useTermStore();

  const [searchText, setSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const isStale = searchText !== deferredSearchText;

  useEffect(() => {
    if (currentProject?.id) {
      useCharacterStore.getState().loadCharacters(currentProject.id);
      useTermStore.getState().loadTerms(currentProject.id);
    }
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
    setSelectedItem(item);
  };

  const handleBack = () => {
    setSelectedItem(null);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
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
                            <div className="text-[11px] font-semibold text-muted uppercase mb-2">{LABEL_CONTEXT_DETAIL_DESCRIPTION}</div>
              <div className="text-sm leading-relaxed text-fg whitespace-pre-wrap">
                {isCharacter(selectedItem)
                  ? (selectedItem.description ?? "")
                  : (selectedItem.definition ?? "")}
              </div>
            </div>

            {isTerm(selectedItem) && selectedItem.category && (
              <div className="mb-6">
                <div className="text-[11px] font-semibold text-muted uppercase mb-2">{LABEL_CONTEXT_DETAIL_CATEGORY}</div>
                <div className="text-sm text-fg">{selectedItem.category}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none icon-sm" />
          <input
            className="w-full bg-element border border-border rounded-md py-2 px-3 pl-8 text-[13px] text-fg outline-none transition-all focus:border-active focus:ring-1 focus:ring-active"
            placeholder={PLACEHOLDER_CONTEXT_SEARCH}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex px-4 mt-3">
        <div
          className={cn(
            "flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center",
            currentTab === "synopsis" ? "text-accent border-accent font-semibold" : "text-muted hover:text-fg"
          )}
          onClick={() => {
            handleTabChange("synopsis");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_SYNOPSIS}
        </div>
        <div
          className={cn(
            "flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center",
            currentTab === "characters" ? "text-accent border-accent font-semibold" : "text-muted hover:text-fg"
          )}
          onClick={() => {
            handleTabChange("characters");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_CHARACTERS}
        </div>
        <div
          className={cn(
            "flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center",
            currentTab === "terms" ? "text-accent border-accent font-semibold" : "text-muted hover:text-fg"
          )}
          onClick={() => {
            handleTabChange("terms");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_TERMS}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 transition-opacity"
        style={{ opacity: isStale ? 0.6 : 1 }}
      >
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
              {LABEL_CONTEXT_SYNOPSIS_HEADER}
            </div>
            <textarea
              className="w-full border border-border rounded-lg p-3 text-sm text-fg bg-element resize-none font-sans leading-relaxed min-h-[200px]"
              placeholder={PLACEHOLDER_CONTEXT_SYNOPSIS}
              value={currentProject?.description || ""}
              readOnly
            />
          </div>
        )}

        {currentTab === "characters" && (
          <>
            {filteredCharacters.map((item) => (
              <div
                key={item.id}
                className="bg-element border border-border rounded-lg p-3 mb-2 cursor-pointer transition-all hover:border-active hover:bg-element-hover"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-sm font-semibold text-fg">{item.name}</div>
                </div>
                {item.description && (
                  <div
                    style={{
                      fontSize: "var(--context-panel-body-font-size)",
                      color: "var(--text-secondary)",
                      marginBottom: "var(--context-panel-section-margin-bottom)",
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
            ))}
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
      </div>
    </div>
  );
}

export default memo(ContextPanel);

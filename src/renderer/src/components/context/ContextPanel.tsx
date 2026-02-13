import { useState, useEffect, useMemo, useDeferredValue, useTransition, memo } from "react";
import { ArrowLeft } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import { useProjectStore } from "../../stores/projectStore";
import TabButton from "../common/TabButton";
import SearchInput from "../common/SearchInput";
import type { Character, Term } from "../../../../shared/types";
import { useTranslation } from "react-i18next";

type Tab = "synopsis" | "characters" | "terms";

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

interface ContextPanelProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

function ContextPanel({
  activeTab = "synopsis",
  onTabChange,
}: ContextPanelProps) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<Tab>("synopsis");

  const currentTab = onTabChange ? activeTab : internalTab;
  const handleTabChange = (tab: Tab) => {
    if (onTabChange) onTabChange(tab);
    else {
      startTransition(() => {
        setInternalTab(tab);
      });
    }
  };

  const { currentProject } = useProjectStore();
  const { characters } = useCharacterStore();
  const { terms } = useTermStore();

  const [searchText, setSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [isPending, startTransition] = useTransition();
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
    startTransition(() => {
      setSelectedItem(item);
    });
  };

  const handleBack = () => {
    startTransition(() => {
      setSelectedItem(null);
    });
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

      <div className="flex flex-col gap-3 px-4 pt-3">
        <SearchInput
          variant="context"
          placeholder={t("context.placeholder.search")}
          value={searchText}
          onChange={setSearchText}
        />
      </div>

      <div className="flex px-4 mt-3">
        <TabButton
          label={t("context.tab.synopsis")}
          active={currentTab === "synopsis"}
          onClick={() => {
            handleTabChange("synopsis");
            setSelectedItem(null);
          }}
          className="flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center"
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
          className="flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center"
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
          className="flex-1 py-3 text-[13px] font-medium cursor-pointer border-b-2 border-transparent transition-all text-center"
          activeClassName="text-accent border-accent font-semibold"
          inactiveClassName="text-muted hover:text-fg"
        />
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 transition-opacity"
        style={{ opacity: isStale || isPending ? 0.6 : 1 }}
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
      </div>
    </div>
  );
}

export default memo(ContextPanel);

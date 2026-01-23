import { useState, useEffect, useMemo, useDeferredValue, memo } from "react";
import styles from "../../styles/components/ContextPanel.module.css";
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
    <div className={styles.container}>
      {selectedItem && (
        <div className={styles.detailView}>
          <div className={styles.detailHeader}>
            <button className={styles.backButton} onClick={handleBack}>
              <ArrowLeft className="icon-md" />
            </button>
            <div className={styles.detailTitle}>
              {isCharacter(selectedItem) ? selectedItem.name : selectedItem.term}
            </div>
          </div>
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
                            <div className={styles.detailLabel}>{LABEL_CONTEXT_DETAIL_DESCRIPTION}</div>
              <div className={styles.detailText}>
                {isCharacter(selectedItem)
                  ? (selectedItem.description ?? "")
                  : (selectedItem.definition ?? "")}
              </div>
            </div>

            {isTerm(selectedItem) && selectedItem.category && (
              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Category</div>
                <div className={styles.detailLabel}>{LABEL_CONTEXT_DETAIL_CATEGORY}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchBarWrapper}>
          <Search className={`${styles.searchIcon} icon-sm`} />
          <input
            className={styles.searchBar}
            placeholder={PLACEHOLDER_CONTEXT_SEARCH}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        <div
          className={currentTab === "synopsis" ? styles.tabActive : styles.tab}
          onClick={() => {
            handleTabChange("synopsis");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_SYNOPSIS}
        </div>
        <div
          className={currentTab === "characters" ? styles.tabActive : styles.tab}
          onClick={() => {
            handleTabChange("characters");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_CHARACTERS}
        </div>
        <div
          className={currentTab === "terms" ? styles.tabActive : styles.tab}
          onClick={() => {
            handleTabChange("terms");
            setSelectedItem(null);
          }}
        >
          {LABEL_CONTEXT_TAB_TERMS}
        </div>
      </div>

      <div className={styles.content}>
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
              className={styles.synopsisArea}
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
                className={styles.card}
                onClick={() => handleItemClick(item)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.name}</div>
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
                className={styles.card}
                onClick={() => handleItemClick(item)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>{item.term}</div>
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

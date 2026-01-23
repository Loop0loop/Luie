import { useState, useEffect, useMemo, useDeferredValue, memo } from "react";
import styles from "../../styles/components/ContextPanel.module.css";
import { Search, ArrowLeft } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Character, Term } from "../../../../shared/types";
import {
  CONTEXT_PANEL_BODY_FONT_SIZE,
  CONTEXT_PANEL_HEADER_FONT_SIZE,
  CONTEXT_PANEL_SECTION_MARGIN_BOTTOM,
  CONTEXT_PANEL_SECTION_PADDING,
  CONTEXT_PANEL_TAG_FONT_SIZE,
  FONT_WEIGHT_SEMIBOLD,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
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
              <ArrowLeft size={ICON_SIZE_MD} />
            </button>
            <div className={styles.detailTitle}>
              {isCharacter(selectedItem) ? selectedItem.name : selectedItem.term}
            </div>
          </div>
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Description</div>
              <div className={styles.detailText}>
                {isCharacter(selectedItem)
                  ? (selectedItem.description ?? "")
                  : (selectedItem.definition ?? "")}
              </div>
            </div>

            {isTerm(selectedItem) && selectedItem.category && (
              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Category</div>
                <div className={styles.detailText}>{selectedItem.category}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchBarWrapper}>
          <Search size={ICON_SIZE_SM} className={styles.searchIcon} />
          <input
            className={styles.searchBar}
            placeholder="통합 검색..."
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
          시놉시스
        </div>
        <div
          className={
            currentTab === "characters" ? styles.tabActive : styles.tab
          }
          onClick={() => {
            handleTabChange("characters");
            setSelectedItem(null);
          }}
        >
          캐릭터
        </div>
        <div
          className={currentTab === "terms" ? styles.tabActive : styles.tab}
          onClick={() => {
            handleTabChange("terms");
            setSelectedItem(null);
          }}
        >
          고유명사
        </div>
      </div>

      <div className={styles.content}>
        {currentTab === "synopsis" && (
          <div style={{ padding: CONTEXT_PANEL_SECTION_PADDING }}>
            <div
              style={{
                fontSize: CONTEXT_PANEL_HEADER_FONT_SIZE,
                fontWeight: FONT_WEIGHT_SEMIBOLD,
                color: "var(--text-secondary)",
                marginBottom: CONTEXT_PANEL_SECTION_MARGIN_BOTTOM,
              }}
            >
              작품 개요 (Synopsis)
            </div>
            <textarea
              className={styles.synopsisArea}
              placeholder="여기에 시놉시스를 작성하세요..."
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
                      fontSize: CONTEXT_PANEL_BODY_FONT_SIZE,
                      color: "var(--text-secondary)",
                      marginBottom: CONTEXT_PANEL_SECTION_MARGIN_BOTTOM,
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
                      fontSize: CONTEXT_PANEL_BODY_FONT_SIZE,
                      color: "var(--text-secondary)",
                      marginBottom: CONTEXT_PANEL_SECTION_MARGIN_BOTTOM,
                    }}
                  >
                    {item.definition}
                  </div>
                )}
                {item.category && (
                  <div
                    style={{
                      fontSize: CONTEXT_PANEL_TAG_FONT_SIZE,
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

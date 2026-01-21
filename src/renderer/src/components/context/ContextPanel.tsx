import { useState, useEffect, memo } from "react";
import styles from "../../styles/components/ContextPanel.module.css";
import { Search, ArrowLeft } from "lucide-react";
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Character, Term } from "../../../../shared/types";

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

  useEffect(() => {
    if (currentProject?.id) {
      useCharacterStore.getState().loadCharacters(currentProject.id);
      useTermStore.getState().loadTerms(currentProject.id);
    }
  }, [currentProject?.id]);

  const filterList = <T extends ContextItem>(list: T[], isCharacter: boolean): T[] => {
    if (!searchText) return list;
    return list.filter((item) => {
      if (isCharacter) {
        const character = item as Character;
        return (
          character.name.includes(searchText) ||
          (character.description || "").includes(searchText)
        );
      } else {
        const term = item as Term;
        return (
          term.term.includes(searchText) ||
          (term.definition || "").includes(searchText)
        );
      }
    });
  };

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
              <ArrowLeft size={16} />
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
          <Search size={14} className={styles.searchIcon} />
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
          <div style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 8,
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
            {filterList(characters, true).map((item) => (
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
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginBottom: 8,
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
            {filterList(terms, false).map((item) => (
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
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginBottom: 8,
                    }}
                  >
                    {item.definition}
                  </div>
                )}
                {item.category && (
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
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

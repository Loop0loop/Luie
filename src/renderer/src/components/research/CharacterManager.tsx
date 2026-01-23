import { useEffect, useState } from "react";
import { ArrowLeft, Plus, User } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  DEFAULT_CHARACTER_FALLBACK_NAME,
  DEFAULT_CHARACTER_DESCRIPTION_LABEL,
  DEFAULT_CHARACTER_NAME,
  DEFAULT_CHARACTER_ADD_LABEL,
  LABEL_CHARACTER_SECTION_PROFILE,
  LABEL_CHARACTER_SECTION_APPEARANCE,
  LABEL_CHARACTER_SECTION_RELATION,
  LABEL_CHARACTER_TAB_BASIC,
  LABEL_CHARACTER_TAB_APPEARANCE,
  LABEL_CHARACTER_TAB_PERSONALITY,
  LABEL_CHARACTER_TAB_RELATION,
  LABEL_CHARACTER_NAME,
  LABEL_CHARACTER_ROLE,
  LABEL_CHARACTER_GENDER,
  LABEL_CHARACTER_AGE,
  LABEL_CHARACTER_JOB,
  LABEL_CHARACTER_ONE_LINER,
  LABEL_CHARACTER_MBti,
  LABEL_CHARACTER_STRENGTH,
  LABEL_CHARACTER_WEAKNESS,
  LABEL_CHARACTER_BACKSTORY,
  LABEL_CHARACTER_RELATION_HINT,
  PLACEHOLDER_CHARACTER_ROLE,
  PLACEHOLDER_CHARACTER_ONE_LINER,
  PLACEHOLDER_CHARACTER_APPEARANCE,
  PLACEHOLDER_CHARACTER_RELATION,
} from "../../../../shared/constants";

type CharacterLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export default function CharacterManager() {
  const { currentItem: currentProject } = useProjectStore();
  const {
    items: characters,
    loadAll: loadCharacters,
    create: createCharacter,
  } = useCharacterStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
    }
  }, [currentProject, loadCharacters]);

  const handleAddCharacter = async () => {
    if (currentProject) {
      await createCharacter({
        projectId: currentProject.id,
        name: DEFAULT_CHARACTER_NAME,
        description: "",
      });
    }
  };

  if (selectedCharacterId) {
    const selectedChar = (characters as CharacterLike[]).find(
      (c) => c.id === selectedCharacterId,
    );
    return (
      <div>
        <div className={styles.detailHeader}>
          <div
            className={styles.backButton}
            onClick={() => setSelectedCharacterId(null)}
          >
            <ArrowLeft
              style={{
                width: "var(--character-icon-back-size)",
                height: "var(--character-icon-back-size)",
              }}
            />
          </div>
          <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
            {selectedChar?.name || DEFAULT_CHARACTER_FALLBACK_NAME}
          </span>
        </div>
        {selectedChar && <CharacterProfile character={selectedChar} />}
      </div>
    );
  }

  return (
    <div className={styles.characterListContainer}>
      {(characters as CharacterLike[]).map((char) => (
        <div
          key={char.id}
          className={styles.characterCard}
          onClick={() => setSelectedCharacterId(char.id)}
        >
          <div
            className={styles.characterImagePlaceholder}
            style={{
              borderBottom: `4px solid ${
                typeof char.attributes === "string"
                  ? (JSON.parse(char.attributes as string) as { color?: string })
                      .color || "var(--character-color-fallback)"
                  : "var(--character-color-fallback)"
              }`,
            }}
          >
            <User className="icon-xxxl" opacity={0.5} />
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{char.name}</div>
            <div className={styles.characterRole}>
              {char.description || DEFAULT_CHARACTER_DESCRIPTION_LABEL}
            </div>
          </div>
        </div>
      ))}
      <div className={styles.addCharacterCard} onClick={handleAddCharacter}>
        <Plus className="icon-xxl" />
        <span>{DEFAULT_CHARACTER_ADD_LABEL}</span>
      </div>
    </div>
  );
}

import { BufferedInput, BufferedTextArea } from "../common/BufferedInput";

function CharacterProfile({ character }: { character: CharacterLike }) {
  const { update: updateCharacter } = useCharacterStore();
  const [activeTab, setActiveTab] = useState<
    "basic" | "appearance" | "personality" | "relation"
  >("basic");

  const attributes =
    typeof character.attributes === "string"
      ? JSON.parse(character.attributes)
      : {};

  const handleUpdate = (field: string, value: string) => {
    updateCharacter({
      id: character.id,
      [field]: value,
    });
  };

  const handleAttributeUpdate = (key: string, value: string) => {
    const newAttributes = { ...attributes, [key]: value };
    updateCharacter({
      id: character.id,
      attributes: newAttributes,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div className={styles.sectionTitle}>{LABEL_CHARACTER_SECTION_PROFILE}</div>

      {/* Quick Access Fields */}
      <div className={styles.tableGrid}>
        <div className={styles.cellLabel}>{LABEL_CHARACTER_NAME}</div>
        <div className={styles.cellValue}>
          <BufferedInput
            className={styles.cellValueInput}
            value={character.name}
            onSave={(val) => handleUpdate("name", val)}
          />
        </div>
        <div className={styles.cellLabel}>{LABEL_CHARACTER_ROLE}</div>
        <div className={styles.cellValue}>
          <BufferedInput
            className={styles.cellValueInput}
            value={character.description || ""}
            placeholder={PLACEHOLDER_CHARACTER_ROLE}
            onSave={(val) => handleUpdate("description", val)}
          />
        </div>
      </div>

      {/* Tabs for Deeper Design */}
      <div
        className={styles.subNavBar}
        style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}
      >
        <div
          className={`${styles.subTab} ${activeTab === "basic" ? styles.active : ""}`}
          onClick={() => setActiveTab("basic")}
        >
          {LABEL_CHARACTER_TAB_BASIC}
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "appearance" ? styles.active : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          {LABEL_CHARACTER_TAB_APPEARANCE}
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "personality" ? styles.active : ""}`}
          onClick={() => setActiveTab("personality")}
        >
          {LABEL_CHARACTER_TAB_PERSONALITY}
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "relation" ? styles.active : ""}`}
          onClick={() => setActiveTab("relation")}
        >
          {LABEL_CHARACTER_TAB_RELATION}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        {activeTab === "basic" && (
          <div className={styles.tableGrid}>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_GENDER}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.gender || ""}
                onSave={(val) => handleAttributeUpdate("gender", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_AGE}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.age || ""}
                onSave={(val) => handleAttributeUpdate("age", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_JOB}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.job || ""}
                onSave={(val) => handleAttributeUpdate("job", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_ONE_LINER}</div>
            <div className={styles.cellValue} style={{ gridColumn: "span 3" }}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.oneLiner || ""}
                placeholder={PLACEHOLDER_CHARACTER_ONE_LINER}
                onSave={(val) => handleAttributeUpdate("oneLiner", val)}
              />
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <>
            <div className={styles.sectionTitle}>{LABEL_CHARACTER_SECTION_APPEARANCE}</div>
            <BufferedTextArea
              className={styles.cellValueInput}
              style={{
                minHeight: "150px",
                border: "1px solid var(--border-default)",
                borderRadius: "4px",
              }}
              value={attributes.appearance || ""}
              placeholder={PLACEHOLDER_CHARACTER_APPEARANCE}
              onSave={(val) => handleAttributeUpdate("appearance", val)}
            />
          </>
        )}

        {activeTab === "personality" && (
          <div
            className={styles.tableGrid}
            style={{ gridTemplateColumns: "100px 1fr" }}
          >
            <div className={styles.cellLabel}>{LABEL_CHARACTER_MBti}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.mbti || ""}
                onSave={(val) => handleAttributeUpdate("mbti", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_STRENGTH}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.strength || ""}
                onSave={(val) => handleAttributeUpdate("strength", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_WEAKNESS}</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.weakness || ""}
                onSave={(val) => handleAttributeUpdate("weakness", val)}
              />
            </div>
            <div className={styles.cellLabel}>{LABEL_CHARACTER_BACKSTORY}</div>
            <div className={styles.cellValue}>
              <BufferedTextArea
                className={styles.cellValueInput}
                value={attributes.backstory || ""}
                style={{ minHeight: "var(--character-backstory-min-height)" }}
                onSave={(val) => handleAttributeUpdate("backstory", val)}
              />
            </div>
          </div>
        )}

        {activeTab === "relation" && (
          <div>
            <div className={styles.sectionTitle}>{LABEL_CHARACTER_SECTION_RELATION}</div>
            <p
              style={{
                fontSize: "var(--character-relation-font-size)",
                color: "var(--text-tertiary)",
                marginBottom: "var(--character-relation-margin-bottom)",
              }}
            >
              {LABEL_CHARACTER_RELATION_HINT}
            </p>
            <BufferedTextArea
              className={styles.cellValueInput}
              style={{
                minHeight: "var(--character-relation-min-height)",
                border: "1px solid var(--border-default)",
                borderRadius: "4px",
              }}
              value={attributes.relationships || ""}
              placeholder={PLACEHOLDER_CHARACTER_RELATION}
              onSave={(val) => handleAttributeUpdate("relationships", val)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

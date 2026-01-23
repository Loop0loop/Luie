import { useEffect, useState } from "react";
import { ArrowLeft, Plus, User } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  CHARACTER_BACKSTORY_MIN_HEIGHT,
  CHARACTER_COLOR_FALLBACK,
  CHARACTER_ADD_ICON_SIZE,
  CHARACTER_AVATAR_ICON_SIZE,
  CHARACTER_ICON_BACK_SIZE,
  CHARACTER_RELATION_FONT_SIZE,
  CHARACTER_RELATION_MARGIN_BOTTOM,
  CHARACTER_RELATION_MIN_HEIGHT,
  DEFAULT_CHARACTER_FALLBACK_NAME,
  DEFAULT_CHARACTER_DESCRIPTION_LABEL,
  DEFAULT_CHARACTER_NAME,
  DEFAULT_CHARACTER_ADD_LABEL,
  FONT_WEIGHT_SEMIBOLD,
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
            <ArrowLeft size={CHARACTER_ICON_BACK_SIZE} />
          </div>
          <span style={{ fontWeight: FONT_WEIGHT_SEMIBOLD }}>
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
                      .color || CHARACTER_COLOR_FALLBACK
                  : CHARACTER_COLOR_FALLBACK
              }`,
            }}
          >
            <User size={CHARACTER_AVATAR_ICON_SIZE} opacity={0.5} />
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
        <Plus size={CHARACTER_ADD_ICON_SIZE} />
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
      <div className={styles.sectionTitle}>기본 프로필 (Basic Profile)</div>

      {/* Quick Access Fields */}
      <div className={styles.tableGrid}>
        <div className={styles.cellLabel}>이름</div>
        <div className={styles.cellValue}>
          <BufferedInput
            className={styles.cellValueInput}
            value={character.name}
            onSave={(val) => handleUpdate("name", val)}
          />
        </div>
        <div className={styles.cellLabel}>역할</div>
        <div className={styles.cellValue}>
          <BufferedInput
            className={styles.cellValueInput}
            value={character.description || ""}
            placeholder="주인공, 조력자, 빌런..."
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
          기본 정보
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "appearance" ? styles.active : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          외모
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "personality" ? styles.active : ""}`}
          onClick={() => setActiveTab("personality")}
        >
          성격/내면
        </div>
        <div
          className={`${styles.subTab} ${activeTab === "relation" ? styles.active : ""}`}
          onClick={() => setActiveTab("relation")}
        >
          관계
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
            <div className={styles.cellLabel}>성별</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.gender || ""}
                onSave={(val) => handleAttributeUpdate("gender", val)}
              />
            </div>
            <div className={styles.cellLabel}>나이</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.age || ""}
                onSave={(val) => handleAttributeUpdate("age", val)}
              />
            </div>
            <div className={styles.cellLabel}>직업/신분</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.job || ""}
                onSave={(val) => handleAttributeUpdate("job", val)}
              />
            </div>
            <div className={styles.cellLabel}>한 줄 요약</div>
            <div className={styles.cellValue} style={{ gridColumn: "span 3" }}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.oneLiner || ""}
                placeholder="이 캐릭터를 한 문장으로 정의한다면?"
                onSave={(val) => handleAttributeUpdate("oneLiner", val)}
              />
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <>
            <div className={styles.sectionTitle}>외모 묘사 (Appearance)</div>
            <BufferedTextArea
              className={styles.cellValueInput}
              style={{
                minHeight: "150px",
                border: "1px solid var(--border-default)",
                borderRadius: "4px",
              }}
              value={attributes.appearance || ""}
              placeholder="눈동자 색, 머리카락, 체격, 흉터, 옷차림 등..."
              onSave={(val) => handleAttributeUpdate("appearance", val)}
            />
          </>
        )}

        {activeTab === "personality" && (
          <div
            className={styles.tableGrid}
            style={{ gridTemplateColumns: "100px 1fr" }}
          >
            <div className={styles.cellLabel}>MBTI/성향</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.mbti || ""}
                onSave={(val) => handleAttributeUpdate("mbti", val)}
              />
            </div>
            <div className={styles.cellLabel}>장점</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.strength || ""}
                onSave={(val) => handleAttributeUpdate("strength", val)}
              />
            </div>
            <div className={styles.cellLabel}>단점/결핍</div>
            <div className={styles.cellValue}>
              <BufferedInput
                className={styles.cellValueInput}
                value={attributes.weakness || ""}
                onSave={(val) => handleAttributeUpdate("weakness", val)}
              />
            </div>
            <div className={styles.cellLabel}>서사/과거</div>
            <div className={styles.cellValue}>
              <BufferedTextArea
                className={styles.cellValueInput}
                value={attributes.backstory || ""}
                style={{ minHeight: `${CHARACTER_BACKSTORY_MIN_HEIGHT}px` }}
                onSave={(val) => handleAttributeUpdate("backstory", val)}
              />
            </div>
          </div>
        )}

        {activeTab === "relation" && (
          <div>
            <div className={styles.sectionTitle}>주요 인물과의 관계</div>
            <p
              style={{
                fontSize: CHARACTER_RELATION_FONT_SIZE,
                color: "var(--text-tertiary)",
                marginBottom: CHARACTER_RELATION_MARGIN_BOTTOM,
              }}
            >
              * 마인드맵 탭에서 시각적으로 편집할 수 있습니다. 여기서는 텍스트로
              정리하세요.
            </p>
            <BufferedTextArea
              className={styles.cellValueInput}
              style={{
                minHeight: `${CHARACTER_RELATION_MIN_HEIGHT}px`,
                border: "1px solid var(--border-default)",
                borderRadius: "4px",
              }}
              value={attributes.relationships || ""}
              placeholder="A와는 적대 관계, B와는 과거의 연인..."
              onSave={(val) => handleAttributeUpdate("relationships", val)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

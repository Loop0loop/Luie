import { useEffect, useState } from "react";
import { ArrowLeft, Plus, User } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";

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
        name: "New Character",
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
            <ArrowLeft size={16} />
          </div>
          <span style={{ fontWeight: 600 }}>
            {selectedChar?.name || "Character"}
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
                      .color || "#ccc"
                  : "#ccc"
              }`,
            }}
          >
            <User size={32} opacity={0.5} />
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{char.name}</div>
            <div className={styles.characterRole}>
              {char.description || "No description"}
            </div>
          </div>
        </div>
      ))}
      <div className={styles.addCharacterCard} onClick={handleAddCharacter}>
        <Plus size={24} />
        <span>Add Character</span>
      </div>
    </div>
  );
}

function CharacterProfile({ character }: { character: CharacterLike }) {
  const { update: updateCharacter } = useCharacterStore();
  const attributes =
    typeof character.attributes === "string" ? JSON.parse(character.attributes) : {};

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
    <div>
      <div className={styles.sectionTitle}>기본 프로필 (Basic Profile)</div>
      <div className={styles.tableGrid}>
        <div className={styles.cellLabel}>이름</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={character.name}
            onChange={(e) => handleUpdate("name", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>설명</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={character.description || ""}
            onChange={(e) => handleUpdate("description", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>성별</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={(attributes as { gender?: string }).gender || ""}
            onChange={(e) => handleAttributeUpdate("gender", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>나이</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={(attributes as { age?: string }).age || ""}
            onChange={(e) => handleAttributeUpdate("age", e.target.value)}
          />
        </div>
      </div>
      <div className={styles.sectionTitle}>상세 설정</div>
      <div
        className={styles.tableGrid}
        style={{ gridTemplateColumns: "100px 1fr" }}
      >
        <div className={styles.cellLabel}>성격</div>
        <div className={styles.cellValue}>
          <input className={styles.cellValueInput} defaultValue="냉철함" />
        </div>
        <div className={styles.cellLabel}>서사</div>
        <div className={styles.cellValue}>
          <textarea
            className={styles.cellValueInput}
            defaultValue="황위 계승 전쟁..."
          />
        </div>
      </div>
    </div>
  );
}

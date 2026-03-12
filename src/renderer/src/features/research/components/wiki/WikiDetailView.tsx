import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";
import { useShallow } from "zustand/react/shallow";

interface WikiDetailViewProps {
  characterId?: string;
}

export default function WikiDetailView({ characterId }: WikiDetailViewProps) {
  const { t } = useTranslation();
  const { currentItem: character, updateCharacter, loadCharacter } = useCharacterStore(
    useShallow((state) => ({
      currentItem: state.currentItem,
      updateCharacter: state.updateCharacter,
      loadCharacter: state.loadCharacter,
    })),
  );

  useEffect(() => {
    if (characterId) {
      void loadCharacter(characterId);
    }
  }, [characterId, loadCharacter]);

  const attributes = useMemo(() => {
    if (!character) return {};
    return typeof character.attributes === "string" 
      ? JSON.parse(character.attributes) 
      : (character.attributes || {});
  }, [character]);

  if (!character) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        {t("character.noSelection")}
      </div>
    );
  }

  const handleUpdate = (field: string, value: string) => {
    updateCharacter({ id: character.id, [field]: value });
  };

  const handleAttrUpdate = (key: string, value: unknown) => {
    const newAttrs = { ...attributes, [key]: value };
    updateCharacter({ id: character.id, attributes: newAttrs });
  };

  return (
    <div className="flex-1 overflow-auto p-8 sm:p-10 flex flex-col gap-10 bg-panel text-fg min-w-0">
      
      {/* 1. Header (이름, 직업/이명) */}
      <div className="flex flex-col gap-2 pb-6 border-b border-border/80">
        <BufferedInput 
          className="text-4xl font-extrabold text-fg bg-transparent border-none placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-lg px-3 py-1 -ml-3 transition-colors w-full"
          value={character.name} 
          placeholder={t("character.namePlaceholder", "캐릭터 이름")}
          onSave={(val) => handleUpdate("name", val)}
        />
        <BufferedInput 
          className="text-lg font-medium text-accent bg-transparent border-none placeholder-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-lg px-3 py-1 -ml-3 transition-colors w-full max-w-xl"
          value={character.description || ""} 
          placeholder={t("character.rolePlaceholder", "직업 / 이명 (예: 왕국 기사단장)")}
          onSave={(val) => handleUpdate("description", val)}
        />
      </div>

      {/* 2. Core Narrative (목표, 갈등, 비밀) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NarrativeCard 
          title={t("character.narrative.goal", "목표")} 
          content={attributes.goal} 
          placeholder={t("character.narrative.goalPlaceholder", "이 캐릭터가 이루고자 하는 것은 무엇인가요?")}
          onSave={(val) => handleAttrUpdate("goal", val)} 
        />
        <NarrativeCard 
          title={t("character.narrative.conflict", "갈등")} 
          content={attributes.conflict} 
          placeholder={t("character.narrative.conflictPlaceholder", "이 캐릭터를 막아서는 내적/외적 장애물은 무엇인가요?")}
          onSave={(val) => handleAttrUpdate("conflict", val)} 
        />
        <NarrativeCard 
          title={t("character.narrative.secret", "비밀 (떡밥)")} 
          content={attributes.secret} 
          placeholder={t("character.narrative.secretPlaceholder", "아직 밝혀지지 않은 서사적 비밀이나 떡밥")}
          onSave={(val) => handleAttrUpdate("secret", val)} 
        />
      </div>

      {/* 3. Relations Placeholder */}
      <div className="flex flex-col gap-5">
        <div className="text-xl font-bold flex items-center justify-between border-b border-border/60 pb-3">
          <span>{t("character.relations.title", "관계도")}</span>
          <button className="text-sm bg-accent/15 text-accent hover:bg-accent hover:text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm">
            + {t("character.relations.add", "관계 추가")}
          </button>
        </div>
        <div className="text-sm text-muted bg-element/50 border border-border/80 rounded-2xl p-10 text-center italic shadow-inner">
          {t("character.relations.empty", "그래프 연동이 완료되면, 이곳에 소속/적대/동맹 등의 관계 카드가 나타납니다.")}
        </div>
      </div>

      {/* 4. Events / Scenes Placeholder */}
      <div className="flex flex-col gap-5">
        <div className="text-xl font-bold flex items-center justify-between border-b border-border/60 pb-3">
          <span>{t("character.events.title", "사건 및 등장")}</span>
          <button className="text-sm bg-accent/15 text-accent hover:bg-accent hover:text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm">
            + {t("character.events.add", "사건 연결")}
          </button>
        </div>
        <div className="text-sm text-muted bg-element/50 border border-border/80 rounded-2xl p-10 text-center italic shadow-inner">
          {t("character.events.empty", "캐릭터가 얽힌 중요 사건과 원고 내 등장 챕터가 시계열로 표시될 영역입니다.")}
        </div>
      </div>

      {/* 5. Notes */}
      <div className="flex flex-col gap-4 mb-20">
        <div className="text-xl font-bold border-b border-border/60 pb-3">
          {t("character.notes.title", "작업 메모")}
        </div>
        <BufferedTextArea
          className="w-full min-h-[160px] leading-relaxed p-5 border border-border/80 rounded-2xl bg-element/30 hover:bg-element/50 focus:bg-element text-fg resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm shadow-sm"
          value={attributes.notes || ""}
          placeholder={t("character.notes.placeholder", "자유롭게 작업 메모를 남겨두세요.")}
          onSave={(val) => handleAttrUpdate("notes", val)}
        />
      </div>

    </div>
  );
}

function NarrativeCard({ 
  title, 
  content, 
  placeholder, 
  onSave 
}: { 
  title: string, 
  content?: string, 
  placeholder: string, 
  onSave: (val: string) => void 
}) {
  return (
    <div className="flex flex-col bg-element/30 border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="bg-element/80 border-b border-border/80 px-5 py-3 font-bold text-sm text-fg flex items-center justify-between">
        {title}
      </div>
      <BufferedTextArea
        className="w-full min-h-[140px] p-5 bg-transparent border-none text-[13px] leading-relaxed text-fg placeholder-muted/60 focus:outline-none focus:bg-element/50 transition-colors resize-none overflow-y-auto"
        value={content || ""}
        placeholder={placeholder}
        onSave={onSave}
      />
    </div>
  );
}

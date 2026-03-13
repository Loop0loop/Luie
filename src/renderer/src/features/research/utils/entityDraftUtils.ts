import type { WorldEntitySourceType } from "@shared/types";

export function parseEntityDraftText(text: string): { 
  name: string; 
  entityType: WorldEntitySourceType; 
  subType: "Place" | "Concept" | "Rule" | "Item" | undefined;
} {
  const normalized = text.trim();
  let entityType: WorldEntitySourceType = "Concept"; 
  
  if (normalized.includes("인물") || normalized.includes("캐릭터")) {
    entityType = "Character";
  } else if (normalized.includes("세력") || normalized.includes("조직")) {
    entityType = "Faction";
  } else if (normalized.includes("장소") || normalized.includes("지역")) {
    entityType = "Place";
  } else if (normalized.includes("아이템") || normalized.includes("물건")) {
    entityType = "Item";
  } else if (normalized.includes("사건") || normalized.includes("이벤트") || normalized.includes("타임") || normalized.includes("시간")) {
    entityType = "Event";
  } else if (normalized.includes("규칙") || normalized.includes("법칙")) {
    entityType = "Rule";
  } else if (normalized.includes("설정") || normalized.includes("아이디어")) {
    entityType = "Term";
  }
  
  const keywordRegex = /(인물|캐릭터|세력|조직|장소|지역|아이템|물건|사건|이벤트|규칙|법칙|설정|타임|시간|아이디어)/g;
  const cleanText = normalized.replace(keywordRegex, "").trim() || normalized;
  
  const subType = (entityType === "Place" || entityType === "Concept" || entityType === "Rule" || entityType === "Item") 
    ? entityType 
    : undefined;

  return { name: cleanText, entityType, subType };
}

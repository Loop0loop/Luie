export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[]; // For select type
  placeholder?: string;
};

export type CharacterTemplate = {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  fields: TemplateField[];
};

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "basic",
    name: "기본 (Basic)",
    icon: "User",
    fields: [
      { key: "age", label: "나이", type: "text", placeholder: "예: 24세" },
      { key: "gender", label: "성별", type: "select", options: ["남성", "여성", "기타", "불명"] },
      { key: "job", label: "직업", type: "text", placeholder: "예: 학생" },
      { key: "affiliation", label: "소속", type: "text", placeholder: "-" },
      { key: "mbti", label: "MBTI", type: "text", placeholder: "ENTP" },
    ],
  },
  {
    id: "fantasy",
    name: "판타지 (Fantasy)",
    icon: "Sword",
    fields: [
      { key: "age", label: "나이", type: "text", placeholder: "예: 150세 (엘프)" },
      { key: "gender", label: "성별", type: "select", options: ["남성", "여성", "기타", "불명"] },
      { key: "race", label: "종족", type: "text", placeholder: "예: 인간, 엘프, 드워프" },
      { key: "class", label: "클래스", type: "text", placeholder: "예: 마법사, 기사" },
      { key: "rank", label: "등급/랭크", type: "text", placeholder: "예: A급, 7서클" },
      { key: "element", label: "속성", type: "text", placeholder: "예: 화염, 신성" },
      { key: "affiliation", label: "소속 길드/국가", type: "text" },
      { key: "ability", label: "특수 능력", type: "textarea", placeholder: "보유 스킬이나 능력" },
    ],
  },
  {
    id: "romance",
    name: "로맨스 (Romance)",
    icon: "Heart",
    fields: [
      { key: "age", label: "나이", type: "text" },
      { key: "job", label: "직업/직위", type: "text", placeholder: "예: 본부장, 황태자" },
      { key: "status", label: "사회적 지위", type: "text", placeholder: "예: 재벌 3세, 평민" },
      { key: "style", label: "외모 스타일", type: "text", placeholder: "청순, 냉미남" },
      { key: "ideal", label: "이상형", type: "text" },
      { key: "rival", label: "라이벌/연적", type: "text" },
      { key: "family", label: "가족 관계", type: "textarea" },
    ],
  },
  {
    id: "murim",
    name: "무협 (Murim)",
    icon: "Scroll",
    fields: [
      { key: "age", label: "나이", type: "text" },
      { key: "sect", label: "소속 문파", type: "text", placeholder: "예: 화산파, 마교" },
      { key: "realm", label: "경지(무공)", type: "text", placeholder: "예: 화경, 절정" },
      { key: "title", label: "별호", type: "text", placeholder: "예: 검성, 매화검존" },
      { key: "martial_arts", label: "주요 무공", type: "textarea" },
      { key: "weapon", label: "사용 무기", type: "text" },
    ],
  },
  {
    id: "modern",
    name: "현대물 (Modern)",
    icon: "Briefcase",
    fields: [
      { key: "age", label: "나이", type: "text" },
      { key: "job", label: "직업", type: "text" },
      { key: "education", label: "학력", type: "text" },
      { key: "wealth", label: "경제력", type: "text", placeholder: "예: 상, 중, 하" },
      { key: "hobby", label: "취미", type: "text" },
      { key: "vehicle", label: "보유 차량", type: "text" },
    ],
  },
];

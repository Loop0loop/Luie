import type { CSSProperties } from "react";
import type {
  ChapterListItem,
  Character,
  Event,
  Faction,
  Project,
  Term,
} from "@shared/types";

// NOTE: macOS hiddenInset 타이틀바는 앱이 drag region을 그려줘야 창을 끌 수 있다.
// 헤더 밴드가 그 역할을 하고, 트래픽 라이트(16,16)에 가리지 않도록 좌측 여백을 둔다.
export const dragRegionStyle = {
  WebkitAppRegion: "drag",
} as CSSProperties;

export const SAMPLE_TITLE = "1장. 첫눈";

export const SAMPLE_CHAPTER_1_CONTENT = [
  "<p>겨울바다가 얼어붙은 항구 위로 첫눈이 내리고 있었다. <strong>백야 항해 길드</strong> 소속의 수석 항해사 <strong>강세연</strong>은 등불 아래에서 낡은 해도를 펼쳤다. 지도가 말해 주지 않는 북방 침묵 항로가 그녀를 기다리고 있었다.</p>",
  "<p>부두 저편에서는 <strong>북부 해빙제</strong>를 알리는 거대한 쇄빙선의 뱃고동 소리가 낮게 울려 퍼졌다. 기관실의 증기 사이로 <strong>서도진</strong>이 다가와 그녀의 어깨에 두꺼운 외투를 얹었다. 「오늘 밤에 출항합니다.」 그 말은 차가운 밤공기 속에서 하얗게 부서졌다.</p>",
  "<p>세연은 마지막으로 등불을 끄려다 멈췄고, 대신 불빛을 조금 더 높이 올렸다. 가라앉지 않는 것들을 지키는 방법이 그것뿐이었다.</p>",
  "<p>해도 위의 빈 바다를 손끝으로 더듬어 보았다. 아무것도 없는 자리가 오히려 뜨거웠다. 그녀는 길드의 문양이 새겨진 나침반을 쥐고 손톱으로 작게 표시를 남겼다.</p>",
].join("");

export const SAMPLE_CHAPTER_2_CONTENT = [
  "<p>쇄빙선 <strong>오로라호</strong>의 엔진이 깊은 저음을 토해내며 부두의 얼음을 가르기 시작했다. 선체 철판 너머로 전해지는 진동은 얼어붙은 심장을 깨우는 박동과도 같았다.</p>",
  "<p><strong>성운 관측청</strong>에서 보낸 기상 전보가 통신실 타자기를 통해 쉴 새 없이 흘러나왔다. '북위 68도, 오로라 지수 급상승, 침묵 해역 진입 주의.' <strong>서도진</strong>은 기름 묻은 장갑을 벗으며 관측 기록지를 훑어보았다.</p>",
  "<p>「관측청 녀석들은 여전히 안전한 서재에서 별만 세고 있군.」 도진이 낮게 투덜거리며 밸브를 조였다. 「하지만 오늘 밤 오로라호의 화력은 충분합니다.」</p>",
  "<p>세연은 조타실 창밖으로 멀어지는 항구의 불빛들을 바라보았다. 돌아올 수 없는 길이라는 걸 알면서도, 그들은 북쪽으로 뱃머리를 돌렸다.</p>",
].join("");

export const SAMPLE_CHAPTER_3_CONTENT = [
  "<p>칠흑 같은 어둠 속에서 마침내 하늘이 갈라지며 에메랄드빛 오로라가 바다 위로 쏟아져 내렸다. 세연의 손안에 쥐인 <strong>성도 나침반</strong>의 바늘이 미세하게 진동하며 남쪽이 아닌 하늘의 중심을 가리켰다.</p>",
  "<p>「이것이 10년 전 <strong>남방 침묵 항로 개척</strong> 당시 선단이 남긴 마지막 기록의 반응인가.」 <strong>강세연</strong>의 눈동자에 푸른빛이 일렁였다. 사라진 등대와 잃어버린 항로가 눈앞에 펼쳐지고 있었다.</p>",
  "<p>얼음산 너머로 과거의 잔해와 미지의 불빛이 서서히 모습을 드러냈다. 가라앉았던 모든 기억들이 북극광 아래에서 다시 깨어나고 있었다.</p>",
  "<p>「전속 전진.」 세연의 짧은 명령과 함께 오로라호는 빛의 바다 속으로 나아갔다.</p>",
].join("");

export const SAMPLE_CONTENT = SAMPLE_CHAPTER_1_CONTENT;

export const PREVIEW_CHAPTER_CONTENTS: Record<string, string> = {
  "wizard-preview-chapter-1": SAMPLE_CHAPTER_1_CONTENT,
  "wizard-preview-chapter-2": SAMPLE_CHAPTER_2_CONTENT,
  "wizard-preview-chapter-3": SAMPLE_CHAPTER_3_CONTENT,
};

export const PREVIEW_PROJECT_ID = "wizard-preview-project";
export const PREVIEW_ACTIVE_CHAPTER_ID = "wizard-preview-chapter-1";
export const PREVIEW_TIMESTAMP = "2026-09-01T00:00:00.000Z";

export const PREVIEW_PROJECT: Project = {
  id: PREVIEW_PROJECT_ID,
  title: "녹는 항구",
  createdAt: PREVIEW_TIMESTAMP,
  updatedAt: PREVIEW_TIMESTAMP,
};

export const PREVIEW_CHAPTER_ROWS = [
  [
    "wizard-preview-chapter-1",
    "1장. 첫눈",
    "겨울바다가 얼어붙은 항구 위로 첫눈이 내리고 있었다.",
  ],
  [
    "wizard-preview-chapter-2",
    "2장. 귀갓길",
    "쇄빙선 오로라호의 엔진이 부두의 얼음을 가르기 시작했다.",
  ],
  [
    "wizard-preview-chapter-3",
    "3장. 불빛 아래",
    "에메랄드빛 오로라 아래 성도 나침반이 새로운 길을 가리킨다.",
  ],
] as const;

export const PREVIEW_CHAPTERS: ChapterListItem[] = PREVIEW_CHAPTER_ROWS.map(
  ([id, title, synopsis], index) => ({
    id,
    projectId: PREVIEW_PROJECT_ID,
    title,
    synopsis,
    order: index + 1,
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  }),
);

export const PREVIEW_CHARACTERS: Character[] = [
  {
    id: "wizard-preview-character-1",
    projectId: PREVIEW_PROJECT_ID,
    name: "강세연",
    description:
      "백야 항해 길드의 수석 항해사. 옛 등대지기의 후계자로 북방 침묵 항로의 비밀을 쫓는다.",
    firstAppearance: "1장. 첫눈",
    attributes: { age: 26, role: "주인공 / 항해사", status: "생존" },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-character-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "서도진",
    description:
      "쇄빙선 '오로라호'의 수석 기관사. 세연의 과묵한 조력자이자 과거 해빙 사고의 생존자.",
    firstAppearance: "1장. 첫눈",
    attributes: { age: 29, role: "조력자 / 기관사", status: "생존" },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
];

export const PREVIEW_EVENTS: Event[] = [
  {
    id: "wizard-preview-event-1",
    projectId: PREVIEW_PROJECT_ID,
    name: "북부 해빙제",
    description:
      "얼어붙은 항로가 열리고 쇄빙 선단이 출항하는 북부 최대의 연례 의식.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      date: "11월 첫눈",
      significance: "중요",
      location: "녹는 항구 제1부두",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-event-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "남방 침묵 항로 개척",
    description:
      "10년 전 선단이 실종되었던 미지의 항로 탐사 및 북극광 감응 사건.",
    firstAppearance: "3장. 불빛 아래",
    attributes: {
      date: "10년 전",
      significance: "핵심 사건",
      location: "북위 72도 침묵 해역",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
];

export const PREVIEW_FACTIONS: Faction[] = [
  {
    id: "wizard-preview-faction-1",
    projectId: PREVIEW_PROJECT_ID,
    name: "백야 항해 길드",
    description: "북방 항로와 등대 네트워크를 총괄하는 자치 항해 연합.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      leader: "원로회",
      base: "백야 등대 요새",
      influence: "북부 전역",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-faction-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "성운 관측청",
    description: "항로의 기상과 밤하늘의 성도를 기록하는 국가 연구 기관.",
    firstAppearance: "2장. 귀갓길",
    attributes: {
      leader: "관측총감",
      base: "성운 천문대",
      influence: "제국 전역",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
];

export const PREVIEW_TERMS: Term[] = [
  {
    id: "wizard-preview-term-1",
    projectId: PREVIEW_PROJECT_ID,
    term: "오로라호",
    definition:
      "북방 침묵 항로 돌파를 위해 특수 설계된 최신형 증기 쇄빙선.",
    category: "선박/기계",
    order: 1,
    firstAppearance: "2장. 귀갓길",
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-term-2",
    projectId: PREVIEW_PROJECT_ID,
    term: "성도 나침반",
    definition:
      "자력이 아닌 오로라와 성운의 파장을 감응하여 진북을 가리키는 고대 유물.",
    category: "항해 도구",
    order: 2,
    firstAppearance: "3장. 불빛 아래",
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
];

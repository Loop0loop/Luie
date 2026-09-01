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
      "백야 항해 길드의 수석 항해사이자 오로라호의 인도자. 10년 전 실종된 등대선의 진실을 쫓아 얼어붙은 침묵 항로로 나아간다.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      templateId: "basic",
      // 1. 이 인물을 한마디로 표현한다면
      tagline: "얼어붙은 침묵 항로를 밝히는 유일한 인도자",
      // 2. 역할
      role: "주인공 / 백야 길드 수석 항해사",
      roles: ["주인공", "수석 항해사", "원정대장"],
      // 3. 태그
      keywords: ["백야 길드", "오로라호", "등대지기 후계자", "천문 항법", "생존자"],
      // 4. 성별
      gender: "여성",
      // 5. 직업
      job: "수석 항해사 (First Mate / 천문 관측관)",
      // 6. 소속
      affiliation: "백야 항해 길드 (White Night Guild)",
      // 7. MBTI
      mbti: "INTJ (용의주도한 전략가)",
      age: "26세",
      status: "활동 중 / 생존",
      // 8. 개요
      overview:
        "북방 침묵 항로를 개척하기 위해 결성된 오로라호 원정대의 수석 항해사. 옛 등대지기의 유산을 물려받아 별자리와 북극광의 파장을 해독할 수 있는 유일한 인물.",
      // 9. 외관
      appearance:
        "어깨까지 닿는 흑발에 오로라빛을 닮은 맑고 차가운 청록색 눈동자. 모피 안감의 짙은 남색 방한 장교 코트를 착용하며, 허리춤에는 황동제 천문 나침반 홀스터를 차고 있다.",
      personality:
        "침착하고 직관이 뛰어난 관측가. 말수가 적고 냉철해 보이지만, 빙해의 위험 속에서 선원들의 생명을 누구보다 우선시한다.",
      background:
        "북방 침묵 해역에서 조난당한 옛 등대지기의 양녀로 자람. 10년 전 선단 실종 사건 당시 유일하게 생존한 소녀로, 얼어붙은 해도에 없는 미지의 항로를 기억하고 있다.",
      // 10. 인간관계
      relations:
        "• 서도진 (오로라호 기관장): 목숨을 맡길 수 있는 오랜 항해 파트너이자 유일하게 진심을 털어놓는 상대.\n• 원로 항해사 아르케 (길드 원로): 세연의 능력을 인정하면서도 침묵 항로 출항을 극구 만류하는 스승.\n• 성운 관측청: 10년 전 사건의 진실을 은폐하려는 제국 관료 집단으로 경계의 대상.",
      notes:
        "성도 나침반과 접촉할 때마다 북극광의 파동과 공명하여 사라진 등대의 환영을 보는 특이 감응 체질.",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-character-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "서도진",
    description:
      "쇄빙선 오로라호의 수석 기관장. 제국 해군 공창 출신으로 기계와 증기압의 소리만으로 선체의 이상을 진단하는 베테랑 엔지니어.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      templateId: "basic",
      // 1. 이 인물을 한마디로 표현한다면
      tagline: "침묵의 극지에서도 꺼지지 않는 쇄빙선의 심장",
      // 2. 역할
      role: "조력자 / 오로라호 수석 기관장",
      roles: ["조력자", "수석 기관장", "기계 공학자"],
      // 3. 태그
      keywords: ["오로라호", "기관장", "해군 공창 출신", "증기 터빈", "현실주의자"],
      // 4. 성별
      gender: "남성",
      // 5. 직업
      job: "수석 기관장 (Chief Engineer)",
      // 6. 소속
      affiliation: "백야 항해 길드 / 쇄빙선 오로라호",
      // 7. MBTI
      mbti: "ISTP (만능 재주꾼 / 베테랑 기술자)",
      age: "29세",
      status: "활동 중 / 생존",
      // 8. 개요
      overview:
        "오로라호의 모든 배관과 증기 보일러, 쇄빙 충격 흡수 장치를 총괄하는 수석 기관장. 세연의 과감한 항로 결정을 공학적으로 완벽히 뒷받침한다.",
      // 9. 외관
      appearance:
        "기름때가 묻은 짙은 갈색 가죽 작업복에 렌즈 교체형 황동 고글을 머리에 얹고 다닌다. 다부진 체격에 왼쪽 뺨에는 과거 보일러 파열 사고로 인한 옅은 화상 흉터가 있다.",
      personality:
        "과묵하고 빈틈없는 현실주의자. 수다보다는 스패너의 토크와 압력계의 수치를 믿으며, 위기 상황일수록 침착해진다.",
      background:
        "제국 해군 공창의 수석 엔지니어였으나, 상관의 무리한 빙벽 충돌 돌파 명령을 거부하고 제명당함. 이후 세연의 신념에 반해 오로라호의 건조에 직접 참여함.",
      // 10. 인간관계
      relations:
        "• 강세연 (수석 항해사): 쇄빙선이라는 거대한 기계의 눈과 심장처럼 완벽한 호흡을 맞추는 동료.\n• 관측총감 발렌티누스 (성운 관측청): 도진을 해군에서 제명시킨 장본인이자 사상적 대립자.",
      notes:
        "특수 제작한 이중 보일러 밸브 제어 기술로 오로라호의 순간 쇄빙 출력을 정격 대비 140%까지 끌어올릴 수 있음.",
    },
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
      "얼어붙은 북방 12개 항로가 일시적으로 열리는 연례 최대 축제이자 쇄빙선단의 출항 의식.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      date: "제국력 742년 11월 첫눈",
      significance: "북방 항로 전체의 운명을 가르는 핵심 전환점",
      location: "녹는 항구 제1쇄빙 부두 및 외해 빙벽선",
      overview:
        "녹는 항구의 모든 등대와 선단이 집결하여 1년에 단 한 번 열리는 얼음 바닷길을 축복하는 대규모 의식. 이 기간 동안 오로라호가 첫 번째 선도선으로 지정되어 침묵 항로 개척 출항에 나선다.",
      timeline:
        "• 해빙 1일차: 첫눈 관측 및 항구 쇄빙 뱃고동 취명식\n• 해빙 2일차: 쇄빙 선단 빙로 개척 출항 및 성운 관측청 기상 통보\n• 해빙 3일차: 오로라호의 북방 침묵 해역 진입 개시",
      // 1. 관련 장소
      locations:
        "• 녹는 항구 제1쇄빙 부두: 쇄빙선들이 집결하는 출항지이자 축제의 중심 무대.\n• 북단 등대 요새: 출항 선단의 항로를 조망하고 신호를 보내는 관제탑.\n• 외해 빙벽선 (북위 65도): 축제 기간 동안에만 열리는 쇄빙 시작 지점.",
      // 2. 관련 인물 / 세력
      participants:
        "• 강세연 (선도선 오로라호 수석 항해사)\n• 서도진 (오로라호 수석 기관장)\n• 원로 항해사 아르케 (백야 길드 총괄 원로)\n• 백야 항해 길드 vs 제국 성운 관측청 (출항 승인권을 둘러싼 대립)",
      // 3. 작가의 말
      notes:
        "[집필 의도] 작품의 오프닝을 여는 화려하면서도 긴장감 넘치는 시각적 축제입니다. 혹독한 얼음 바다와 증기 쇄빙선의 거친 낭만이 교차하며, 세연과 도진의 신뢰 관계가 처음으로 독자에게 드러나는 핵심 무대입니다.",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-event-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "남방 침묵 항로 개척",
    description:
      "10년 전 선단 3척이 동시 실종되었던 미지의 항로 탐사 사건이자 세계관의 핵심 미스터리.",
    firstAppearance: "3장. 불빛 아래",
    attributes: {
      date: "제국력 732년 (10년 전)",
      significance: "최고 위험 등급 해난 사건 / 항해 금지 구역 지정 원인",
      location: "북위 72도 침묵 해역 (영구 빙벽 너머)",
      overview:
        "제국과 백야 길드가 합동으로 추진했던 사상 최대의 극지 탐사 프로젝트. 전자기 폭풍과 미지의 북극광 이상 반응으로 선단 3척이 전원 실종되었으며, 현재까지도 북위 70도 이상 해역이 금지 구역으로 묶이게 된 원인.",
      timeline:
        "• 개척 10일차: 북위 70도 영구 빙벽 통과\n• 개척 15일차: 성도 나침반 이상 진동 및 오로라 폭풍 조우\n• 개척 18일차: 선단 3척 무전 두절 및 전자기 폭풍 속 실종",
      // 1. 관련 장소
      locations:
        "• 북위 72도 침묵 해역: 나침반이 하늘을 가리키는 전자기 이상 해역.\n• 침몰선 에테르호 추정 좌표: 10년 전 마지막 조난 신호가 발신된 얼음산 협곡.\n• 사라진 고대 등대 0호기: 해도에 기록되지 않은 미지의 신호 발원지.",
      // 2. 관련 인물 / 세력
      participants:
        "• 강세연 (당시 조난 선단의 유일한 생존 소녀)\n• 강진우 (당시 수석 항해사 / 세연의 양부, 실종)\n• 관측총감 발렌티누스 (당시 작전 총지휘관)\n• 제국 해군 제3탐사함대 & 백야 등대선단",
      // 3. 작가의 말
      notes:
        "[복선 및 연출] 10년 전 사건은 단순한 자연재해가 아닌 '고대 등대 네트워크의 폭주'와 '제국의 진실 은폐'가 얽힌 복합 사건입니다. 3장에서 세연의 성도 나침반이 공명하며 이 사건의 잔해가 서서히 드러나도록 빌드업했습니다.",
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
    description:
      "북방 항로와 등대 네트워크를 총괄하는 자치 항해 연합. 혹독한 얼음 바다 위에서 살아가는 항해사들의 요람.",
    firstAppearance: "1장. 첫눈",
    attributes: {
      leader: "원로 항해사 아르케 & 길드 마스터 에블린",
      base: "백야 등대 요새 (녹는 항구 북단 곶)",
      influence: "북방 전역 12개 항구 및 민간 쇄빙 선단 40여 척 관제",
      ideology: "바다는 얼어붙어도, 등대의 불빛은 결코 꺼지지 않는다.",
      resources:
        "특수 증기 쇄빙선 8척, 고대 해도 원본 보관소, 극지 해양 구조대 네트워크.",
      // 1. 개요
      overview:
        "200년 전 북방 개척 시대부터 얼음 바다를 지켜온 항해사들이 결성한 유서 깊은 자치 길드. 혹독한 극지 항해의 노하우와 등대 네트워크를 독점 관리하고 있다.",
      history:
        "초대 등대지기 연맹에서 출발하여, 제국의 간섭 속에서도 북방 바다의 자치권을 지켜온 항해사들의 결사체.",
      // 2. 조직도
      organization:
        "• 최고 원로회 (의장: 아르케): 길드의 중대사 및 항로 개척 승인권 보유\n• 쇄빙 선단 총괄국 (선단장: 에블린): 오로라호를 포함한 쇄빙선 운용 및 보급\n• 등대 네트워크 관리국: 북방 12개 등대 보수 및 신호 유지\n• 현장 원정대: 강세연(수석 항해사), 서도진(수석 기관장) 소속",
      // 3. 외부 관계
      relationships:
        "• 성운 관측청: 북방 항로 자치권을 두고 첨예하게 대립하는 라이벌 관계.\n• 녹는 항구 상인 연합: 쇄빙 항로 개척에 따른 물류 이익을 공유하는 우호 협력 관계.\n• 제국 황실: 명목상 신속 관계이나 실질적으로는 완전 자치를 유지 중.",
      // 4. 작가의 말
      notes:
        "[세력 설계] 거칠지만 따뜻한 바다 사나이들과 장인들의 집단입니다. 현대적인 관료주의 제국에 맞서 전통과 인간적인 연대로 뭉친 주인공 측의 든든한 둥지 역할을 합니다.",
    },
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
  {
    id: "wizard-preview-faction-2",
    projectId: PREVIEW_PROJECT_ID,
    name: "성운 관측청",
    description:
      "항로의 기상과 밤하늘의 성도를 기록하는 제국 국가 연구 기관. 천문 기상 독점권을 쥔 관료 집단.",
    firstAppearance: "2장. 귀갓길",
    attributes: {
      leader: "관측총감 발렌티누스",
      base: "성운 천문대 (제국 수도 바벨린)",
      influence: "제국 해군 전함 기상 통제 및 제국 전역 전신망 독점",
      ideology: "천체의 질서가 제국의 국경이며, 미지의 해역은 관측되어야만 존재한다.",
      resources:
        "초장거리 기상 전보 타자기 망, 대형 굴절 천체 망원경 3기, 제국 해군 직속 호위 함대.",
      // 1. 개요
      overview:
        "제국 황실의 직속 인가를 받아 설립된 최고 권위의 천문·기상 관측 기관. 제국 내 모든 통신망과 해도 발행권을 독점하고 있으며, 북방 침묵 해역을 국가 통제 하에 두려 한다.",
      history:
        "제국 건국 초기 천문학자들에 의해 창설되었으나, 점차 군사 기상 정보를 독점하는 거대 권력 기관으로 변질됨.",
      // 2. 조직도
      organization:
        "• 총감부 (관측총감: 발렌티누스): 제국 황실 직속 기상 정책 결정\n• 천문 관측국: 별자리 및 오로라 파장 분석, 신성도(新星圖) 편찬\n• 전신 통신국: 극지 타자기 망 및 기상 전보 발송 통제\n• 특수 탐사 감시반: 백야 길드의 독자 항해를 감시하고 제재하는 군사 조직",
      // 3. 외부 관계
      relationships:
        "• 백야 항해 길드: 통제 불가능한 자치 세력으로 규정하고 해체를 유도 중.\n• 제국 해군: 긴밀한 협력 관계이나 정보 독점으로 인해 해군 내부에서도 불만 존재.\n• 서도진 (오로라호 기관장): 과거 명령 불복종으로 제명시킨 후 감시 대상에 등록함.",
      // 4. 작가의 말
      notes:
        "[세력 설계] 냉혹한 통제와 지식의 독점을 상징하는 안타고니스트 세력입니다. 악의적이라기보다는 '국가의 질서와 통제'를 절대선으로 믿는 엘리트 관료 집단으로 묘사하여 입체감을 부여했습니다.",
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
      "북방 침묵 항로의 극저온과 전자기 폭풍을 돌파하기 위해 특수 티타늄 합금 쇄빙 외벽과 이중 증기 터빈을 장착한 최신형 쇄빙선.",
    category: "선박 / 기계",
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
      "지자기(자력) 대신 밤하늘의 오로라 파장과 별자리의 상대적 위치를 감응하여 영구 침묵 해역에서도 진북을 정확히 가리키는 고대 항해 유물.",
    category: "항해 도구 / 고대 유물",
    order: 2,
    firstAppearance: "3장. 불빛 아래",
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  },
];

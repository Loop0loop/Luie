/**
 * Canvas i18n 한국어 트리. PRD §6/§7/§8 기반으로 phase별 추가.
 */
export const koCanvas = {
  workspace: {
    title: "캔버스",
  },
  activity: {
    explorer: "탐색기",
    canvas: "캔버스",
    entities: "엔티티",
    memory: "메모리",
    search: "검색",
  },
  panel: {
    views: "뷰",
    range: "범위",
    layers: "레이어",
  },
  mode: {
    flowMap: {
      label: "플로우 맵",
      description: "선택한 구간의 사건과 흐름을 노드로 표시합니다.",
    },
    sceneBoard: {
      label: "장면 보드",
      description: "회차/구간을 장면 카드 단위로 분해합니다.",
    },
    timeline: {
      label: "타임라인",
      description: "사건 순서를 시간축으로 표시합니다.",
    },
    characterMap: {
      label: "인물 관계도",
      description: "인물 사이의 관계와 등장 밀도를 표시합니다.",
    },
    memoryMap: {
      label: "메모리 맵",
      description: "Memory 엔진이 만든 chunk와 entity 관계를 표시합니다.",
    },
    comingSoon: "곧 제공",
  },
  range: {
    currentChapter: "현재 화",
    threeChapters: "±3화",
    currentPart: "현재 부",
    wholeProject: "전체 프로젝트",
  },
  layer: {
    scene: "장면",
    character: "인물",
    event: "사건",
    memo: "메모",
    aiHint: "AI 힌트",
  },
  empty: {
    title: "선택된 화가 없습니다",
    description: "화를 선택하면 캔버스가 표시됩니다.",
  },
  sidebar: {
    activity: "활동",
    expand: "사이드바 펼치기",
    collapse: "사이드바 접기",
  },
  binder: {
    title: "바인더",
    expand: "바인더 펼치기",
    collapse: "바인더 접기",
  },
  status: {
    empty: "표시할 내용이 없습니다.",
    loading: "불러오는 중...",
    error: "캔버스를 불러오지 못했습니다.",
    stale: "원본이 변경되어 새로 고침이 필요합니다.",
  },
  toolbar: {
    fitView: "화면 맞춤",
    zoomIn: "확대",
    zoomOut: "축소",
  },
} as const;

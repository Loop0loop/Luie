export const koCanvas = {
  sidebar: {
    scope: {
      title: "범위",
      currentLabel: "현재",
      preset: {
        all: "전체",
        currentEpisode: "현재 화",
        episodeRange: "범위",
      },
      describe: {
        currentEpisode: "{{episode}}화",
        episodeRange: "{{from}}~{{to}}화",
        all: "전체 작품",
        none: "범위",
      },
    },
    outline: {
      title: "아웃라인",
      empty: "노드가 없습니다.",
      groups: {
        episodes: "회차",
        characters: "인물",
        events: "사건",
        places: "장소",
        notes: "메모",
      },
    },
    layers: {
      title: "레이어",
      canonical: { label: "Canonical", hint: "확정된 구조" },
      derived: { label: "Derived 후보", hint: "자동 추출 후보" },
      timeline: { label: "타임라인 오버레이" },
      relationStrength: { label: "관계 강도" },
      conflict: { label: "충돌 마커" },
      foreshadowing: { label: "복선" },
    },
    filters: {
      title: "필터",
      episode: "회차",
      character: "인물",
      event: "사건",
      place: "장소",
      note: "메모",
      relation: "관계",
    },
  },
  toolbar: {
    addNode: "노드",
    addNote: "메모",
    connect: "연결",
    group: "그룹",
    autoLayout: "자동 정렬",
    fitView: "화면 맞춤",
    searchPlaceholder: "검색",
  },
  binder: {
    inspector: {
      title: "인스펙터",
      empty: "선택된 항목이 없습니다.",
      field: {
        type: "유형",
        id: "ID",
        firstAppearance: "최초 등장",
        subType: "분류",
        description: "설명",
      },
      type: {
        node: "노드",
        edge: "관계",
      },
    },
    related: {
      title: "연결된 항목",
      empty: "연결된 항목이 없습니다.",
    },
    suggestions: {
      title: "후보",
      empty: "처리할 후보가 없습니다.",
    },
    agent: {
      title: "에이전트",
      summarizeScope: "현재 범위 요약",
      processCandidates: "미확정 후보 정리",
      checkTimeline: "시간선 검사",
      edgeConflict: "관계 충돌 검사",
      summarizeNode: "이 노드 요약",
      findRelated: "관련 원고 찾기",
    },
  },
  empty: {
    error: "캔버스를 불러오지 못했습니다.",
    retry: "다시 시도",
  },
  node: {
    kind: {
      episode: "회차",
      character: "인물",
      event: "사건",
      place: "장소",
      note: "메모",
    },
    derived: "후보",
  },
} as const;

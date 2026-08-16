// NOTE: common에 누락된 component key를 deep merge로 보완한다.
export const koMissing = {
  common: {
    close: "닫기",
    dismiss: "닫기",
    saving: "저장 중...",
  },
  canvas: {
    activity: {
      namePrompt: "이름을 입력하세요.",
      toggleAll: "모두 펼치기/접기",
      untitledFile: "제목 없음",
      untitledFolder: "새 폴더",
    },
    graph: {
      aiSync: "AI 동기화",
      chapterUnit: "화",
      characterMode: "인물",
      empty: { title: "그래프 데이터가 없습니다" },
      startChapter: "시작 챕터",
      endChapter: "끝 챕터",
      eventMode: "사건",
    },
    node: {
      confirmDelete: "이 노드를 프로젝트에서 삭제하시겠습니까?",
      connectedNodes: "연결된 노드",
      delete: "노드 삭제",
      edges: "연결",
      nodes: "노드",
      openInspector: "상세 정보",
    },
    toolbar: {
      comingSoon: "곧 제공될 기능입니다",
      error: {
        noProject: "열린 프로젝트가 없습니다",
        syncFailed: "동기화에 실패했습니다",
      },
      success: { synced: "동기화되었습니다" },
    },
  },
  character: {
    noCharacters: "등장인물이 없습니다",
    noSelection: "선택된 인물이 없습니다",
    wiki: { descriptionLabel: "설명" },
  },
  event: { noSelection: "선택된 사건이 없습니다" },
  faction: { noSelection: "선택된 세력이 없습니다" },
  memo: {
    addTitle: "메모 추가",
    noSelection: "선택된 메모가 없습니다",
    tags: "태그",
    title: "메모",
  },
  world: { term: { noTerms: "등록된 용어가 없습니다" } },
  entityVisual: { toggle: { document: "문서" } },
  research: { title: { map: "지도", plot: "플롯" } },
  editor: {
    autosave: {
      failed: "자동 저장에 실패했습니다",
      retryingIn: "{{seconds}}초 후 다시 시도합니다",
    },
    errors: {
      exportNoChapter: "내보낼 챕터가 없습니다",
      exportOpenFailed: "내보낸 파일을 열지 못했습니다",
    },
    layoutTitle: "레이아웃",
  },
  toolbar: { canvas: "캔버스", editor: "에디터" },
  sidebar: {
    section: { settings: "설정" },
    toggle: { close: "사이드바 접기", open: "사이드바 펼치기" },
  },
  snapshot: {
    close: "닫기",
    list: { selectChapter: "챕터를 선택하세요" },
    noActiveChapter: "활성화된 챕터가 없습니다",
  },
  updater: {
    action: {
      download: "업데이트 다운로드",
      later: "나중에",
      restart: "지금 업데이트",
      retry: "다시 확인",
    },
    message: { available: "현재 {{current}} → 최신 {{latest}}" },
    status: {
      applying: "업데이트 적용 중...",
      available: "새 버전이 있습니다",
      checking: "업데이트 확인 중...",
      downloading: "업데이트 다운로드 중",
      error: "업데이트 실패",
      ready: "업데이트 설치 준비됨",
    },
  },
  workspace: {
    offline: {
      title: "오프라인 상태입니다",
      desc: "변경사항은 로컬에 저장되며 네트워크가 연결되면 자동으로 동기화됩니다.",
    },
    recovery: {
      bannerTitle: "저장되지 않은 변경사항을 복구했습니다",
      defaultDesc: "예기치 않은 종료 후 Luie가 최신 작업을 안전하게 복원했습니다.",
      corruptDesc: "원본 파일이 손상되어 Luie가 최신 백업을 사용했습니다.",
      missingDesc:
        "원본 .luie 파일이 없어 Luie가 로컬 데이터로 새 패키지를 다시 만들었습니다.",
      dismiss: "닫기",
    },
  },
  settings: {
    appearance: {
      animations: {
        title: "애니메이션 활성화",
        description: "패널 열고 닫기에 부드러운 애니메이션 효과를 적용합니다.",
        on: "켜짐",
        off: "꺼짐",
      },
      entityColors: {
        title: "세계관 요소 색상",
        description: "에디터 및 그래프에서 표시되는 요소들의 고유 색상을 지정합니다.",
      },
    },
    section: {
      letterSpacing: "자간",
      wordSpacing: "어간",
      paragraphSpacing: "문단 간격",
      systemFonts: "시스템 폰트",
    },
    letterSpacing: { description: "글자 사이 간격을 조절합니다" },
    wordSpacing: { description: "단어 사이 간격을 조절합니다" },
    paragraphSpacing: { description: "엔터 후 문단 사이 간격을 조절합니다" },
    systemFonts: {
      search: "폰트 검색…",
      noResults: "검색 결과가 없습니다",
      none: "사용 가능한 시스템 폰트가 없습니다",
    },
    preview: {
      body1:
        "그는 오래된 서재 한편에 앉아, 먼지 앉은 원고 뭉치를 펼쳤다. 창밖엔 비가 내리고 있었고, 등장인물들의 목소리가 점차 또렷해졌다.",
      body2:
        "글이란 결국 사람의 목소리를 담는 그릇이다. 오늘도 한 문장, 한 문장씩 써 내려간다.",
    },
    sync: {
      actions: {
        disconnectGoogle: "로그아웃",
        resolveConflicts: "충돌 해결",
        syncing: "동기화 중...",
      },
      conflicts: {
        summary:
          "충돌 {{total}}건 (챕터 {{chapters}} · 메모 {{memos}} · 메모리 {{memoryCanonical}})",
        allResolved: "모든 충돌이 해결되었습니다!",
        chapterCount: "챕터",
        chapterLabel: "챕터",
        keepLocal: "로컬 유지",
        memoCount: "메모",
        memoLabel: "메모",
        memoryLabel: "메모리",
        resolveLater: "나중에 해결",
        totalCount: "전체",
      },
      fields: { lastRun: "마지막 실행" },
      health: {
        connected: "연결됨",
        degraded: "불안정",
        disconnected: "연결 끊김",
      },
    },
  },
  ai: {
    sidePanel: {
      open: "AI 사이드 패널 열기",
      close: "AI 사이드 패널 닫기",
      view: "AI 뷰",
    },
  },
} as const;

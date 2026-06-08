export const koBaseEditor = {
  editor: {
    layoutTitle: "Luie Editor",
    selectTabPrompt: "← 탭을 선택하세요",
    placeholder: {
      title: "제목 없음",
      body: "내용을 입력하세요... ('/'를 입력하여 명령어 확인)",
    },
    status: {
      unsaved: "수정됨",
      saving: "저장 중...",
      saved: "저장 완료",
      error: "저장 실패",
      charLabel: "글자",
      wordLabel: "단어",
      separator: " · ",
    },
    actions: {
      quickExport: "빠른 내보내기",
      quickExportTitle: "빠른 내보내기",
    },
    errors: {
      exportNoChapter: "챕터를 선택한 뒤 내보내기를 실행하세요.",
      exportOpenFailed: "내보내기 창을 열 수 없습니다.",
    },
  },
  inspector: {
    noSelection: "선택된 챕터가 없습니다.",
    tab: {
      synopsis: "시놉시스",
      metadata: "메타데이터",
      notes: "노트",
      snapshots: "스냅샷",
    },
    synopsis: {
      placeholder: "해당 챕터의 주요 사건이나 요약을 작성하세요.",
    },
    section: {
      image: "대표 이미지",
    },
    image: {
      placeholder: "이미지 추가",
    },
    meta: {
      created: "생성 일시",
      modified: "수정 일시",
      words: "단어 수",
      label: "라벨",
      status: "상태",
    },
    label: {
      none: "없음",
      concept: "구상",
      draft: "초고",
    },
    status: {
      todo: "예정",
      inprogress: "작성 중",
      done: "완료",
    },
    notes: {
      document: "문서 노트",
      comingSoon: "준비 중입니다...",
    },
  },
  scrivener: {
    target: "목표: {{count}} 단어",
    inspector: {
      open: "인스펙터 열기",
      close: "인스펙터 닫기",
      title: "인스펙터 (INSPECTOR)",
      loading: "불러오는 중...",
    },
  },
} as const;

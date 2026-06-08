export const koBaseCore = {
  home: "홈",
  share: "공유",
  loading: "로딩 중...",
  back: "뒤로",
  delete: "삭제",
  undo: "실행 취소",
  clear: "지우기",
  exit: "나가기",
  menu: {
    file: "파일",
    edit: "편집",
    view: "보기",
    insert: "삽입",
    format: "서식",
    tools: "도구",
    extensions: "확장 프로그램",
    help: "도움말",
    link: "링크",
    image: "이미지",
  },
  ui: {
    modal: {
      confirm: "확인",
      cancel: "취소",
    },
  },
  bootstrap: {
    fetchFailed: "앱 시작 상태를 불러오지 못했습니다.",
    initializing: "작업 공간을 초기화하는 중입니다...",
    retry: "다시 시도",
    quit: "종료",
    deleteManuscriptConfirm: "이 원고를 삭제할까요?",
  },
  errorBoundary: {
    title: "앱 구동에 실패하였습니다.",
    description: "앱을 재실행 해주세요.",
    reload: "애플리케이션 다시 불러오기",
  },
  project: {
    defaults: {
      projectTitle: "제목 없는 프로젝트",
      newProjectTitle: "새 프로젝트",
      chapterTitle: "챕터 1",
      untitled: "제목 없음",
      noteTitle: "새로운 메모",
    },
    toast: {
      recoveredFromDb: "파일이 손상되어 로컬 캐시에서 복구했습니다.",
      recoveredMissingPackage:
        "원본 .luie 파일을 찾을 수 없어 로컬 데이터로 새 파일을 복구했습니다.",
      dbNewerSynced: "로컬 캐시가 최신이라 프로젝트 파일을 갱신했습니다.",
      pathMissing:
        "로컬 .luie 연결을 사용할 수 없어 로컬 데이터로 프로젝트를 엽니다.",
      missingAttachment:
        "연결된 .luie 파일을 찾을 수 없어 로컬 데이터로 프로젝트를 엽니다.",
      invalidAttachment:
        "연결된 .luie 경로가 유효하지 않아 로컬 데이터로 프로젝트를 엽니다.",
      legacyUnsupportedAttachment:
        "현재 앱은 구형 package .luie를 지원하지 않습니다.",
    },
    templateDescription: "",
  },
  sidebar: {
    explorerTitle: "탐색기",
    title: "프로젝트",
    menu: {
      openBelow: "아래에 열기",
      openRight: "오른쪽에 열기",
      rename: "이름 수정하기",
      duplicate: "복제하기",
      delete: "삭제하기",
    },
    defaultProjectTitle: "프로젝트",
    binderTitle: "프로젝트",
    section: {
      manuscript: "원고",
      research: "자료",
      trash: "휴지통",
      snapshot: "버전 기록",
    },
    item: {
      characters: "등장인물",
      world: "세계관",
      scrap: "자료 스크랩",
      synopsis: "작품 개요",
    },
    action: {
      new: "새 회차 추가",
    },
    addChapter: "새 회차 추가...",
    trashEmpty: "비어 있음",
    snapshotEmpty: "챕터를 선택해주세요.",
    settingsLabel: "설정 (Settings)",
    prompt: {
      renameTitle: "새 제목",
      renameProject: "프로젝트 이름을 입력해주세요.",
      deleteConfirm: "정말로 삭제하시겠습니까?",
    },
    tooltip: {
      renameProject: "프로젝트 이름 수정",
      refresh: "새로고침",
    },
    expand: "펼치기",
  },
  context: {
    tab: {
      synopsis: "시놉시스",
      characters: "캐릭터",
      terms: "고유명사",
    },
    synopsisHeader: "작품 개요 (Synopsis)",
    detail: {
      description: "Description",
      category: "Category",
    },
    placeholder: {
      search: "통합 검색...",
      synopsis: "여기에 시놉시스를 작성하세요...",
    },
  },
  memo: {
    sectionTitle: "MEMOS",
    empty: "Select a note to view",
    placeholder: {
      search: "Search...",
      tags: "Add tags (comma separated)...",
      title: "Title",
      body: "Start typing your memo...",
    },
    defaultNotes: [
      {
        id: "1",
        title: "참고자료: 중세 복식",
        content:
          "링크: https://wiki...\n\n중세 귀족들의 의상은 생각보다 화려했다...",
        tags: ["자료", "의상"],
      },
      {
        id: "2",
        title: "아이디어 파편",
        content:
          "- 주인공이 사실은 악역이었다면?\n- 회귀 전의 기억이 왜곡된 것이라면?",
        tags: ["아이디어", "플롯"],
      },
    ],
  },
  startupWizard: {
    title: "작업 공간을 초기화하는 중입니다...",
    subtitle: "필수 구성을 확인하고 있어요. 잠시만 기다려 주세요.",
    status: {
      configuring: "작업 공간을 초기화하는 중입니다...",
      launching: "작업 공간을 초기화하는 중입니다...",
      failed: "시작 구성에 실패했습니다.",
    },
    actions: {
      retry: "다시 시도",
    },
    onboarding: {
      introTitle: "Luie에 오신 것을 환영합니다",
      introBody:
        "Luie는 장편 집필을 위한 로컬 우선 글쓰기 앱입니다. AI 의미 검색·캔버스·관계 그래프로 원고를 돕습니다.",
      introNext: "시작하기",
      setupTitle: "로컬 AI 설치",
      setupBody:
        "내 PC에서 동작하는 의미 검색용 임베딩 모델을 설치하세요. 나중에 설정에서 설치할 수도 있습니다.",
      recommendTitle: "내 PC 맞춤 추천",
      skip: "건너뛰기",
      next: "다음",
      finishing: "설정을 마무리하는 중...",
    },
  },
  toolbar: {
    tooltip: {
      undo: "실행 취소",
      redo: "다시 실행",
      bold: "굵게",
      italic: "기울임꼴",
      underline: "밑줄",
      strikethrough: "취소선",
      textColor: "글자 색",
      highlight: "형광펜",
      alignLeft: "왼쪽 정렬",
      alignCenter: "가운데 정렬",
      alignRight: "오른쪽 정렬",
      bulletList: "글머리 기호",
      orderedList: "번호 매기기",
      toggleMobileView: "화면 보기 전환",
      openWorldGraph: "세계관 그래프 열기",
    },
    view: {
      mobile: "모바일 화면",
      desktop: "PC 화면",
      graph: "그래프",
    },
    ribbon: {
      home: "홈",
      insert: "삽입",
      draw: "그리기",
      view: "보기",
      paste: "붙여넣기",
    },
    editor: "에디터",
    canvas: "캔버스",
  },
  canvas: {
    tab: {
      canvas: "캔버스",
      timeline: "타임라인",
      notes: "노트",
      entity: "엔티티",
      plugins: "플러그인",
    },
    action: {
      refresh: "새로고침",
    },
    create: {
      characterDefaultName: "새 캐릭터",
      factionDefaultName: "새 세력",
      eventDefaultName: "새 사건",
      placeDefaultName: "새 장소",
      conceptDefaultName: "새 개념",
      ruleDefaultName: "새 규칙",
      itemDefaultName: "새 아이템",
      termDefaultName: "새 용어",
      worldentityDefaultName: "새 세계관 요소",
    },
  },
} as const;

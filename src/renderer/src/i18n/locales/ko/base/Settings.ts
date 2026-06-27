export const koBaseSettings = {
  settings: {
    title: "화면 설정",
    sidebar: {
      section: {
        manuscript: "원고",
        research: "연구",
        snapshot: "스냅샷",
        trash: "휴지통",
      },
      item: {
        characters: "인물",
        world: "세계관",
        scrap: "스크랩",
        analysis: "분석",
      },
      addChapter: "새 챕터 추가",
      snapshotEmpty: "선택된 챕터가 없거나 스냅샷이 없습니다.",
      trashEmpty: "휴지통이 비어있습니다.",
      tooltip: {
        refresh: "새로고침",
      },
      editor: "글꼴 (Editor)",
      appearance: "테마 (Appearance)",
      features: "기능 (Features)",
      shortcuts: "단축키 (Shortcuts)",
      recovery: "파일 복원 (File Recovery)",
      sync: "동기화 (Sync)",
      model: "모델 (Model)",
      language: "언어 (Language)",
    },
    section: {
      font: "글꼴 (Font)",
      optionalFont: "번들 폰트 (선택)",
      customFont: "사용자 폰트",
      spellcheck: "맞춤법 검사",
      fontSize: "글자 크기",
      lineHeight: "줄 간격",
      theme: "테마 (Theme)",
      uiMode: "UI 모드 (Laboratory)",
      language: "언어",
      menuBar: "메뉴바",
    },
    customFont: {
      description: "시스템에 설치된 폰트의 font-family 이름을 입력하세요.",
      placeholder: '예: "Noto Sans KR", "프리텐다드"',
      apply: "적용",
      active: "사용 중",
    },
    uiMode: {
      description:
        "에디터의 도구 모음과 레이아웃을 익숙한 스타일로 변경합니다.",
      default: "기본 (Default)",
      docs: "Google Docs 스타일",
      editor: "에디터 모드",
      scrivener: "Scrivener 스타일",
      focus: "집중 모드",
    },
    menuBar: {
      description:
        "macOS에서는 가리기를 선택하면 전체화면(immersive)으로 전환됩니다.",
      hide: "메뉴바 가리기",
      show: "메뉴바 보이기",
      applyHint:
        "변경 사항은 즉시 적용됩니다. (가리기: 전체화면, 보이기: 일반창)",
      applyFailed: "메뉴바 표시 방식을 적용하지 못했습니다. 다시 시도해주세요.",
    },
    appearance: {
      baseTheme: {
        title: "테마 모드 (Base Theme)",
        description: "기본적인 밝기를 선택합니다.",
      },
      contrast: {
        title: "대비 (Contrast)",
        description: "화면의 선명도를 조절합니다.",
        soft: "Soft",
        high: "High",
      },
      tone: {
        title: "톤 (Tone)",
        description: "테마의 색 온도를 선택합니다.",
        cool: "차가움",
        neutral: "기본",
        warm: "따뜻함",
      },
    },
    view: {
      pc: "PC",
      mobile: "모바일",
    },
    font: {
      systemUi: "고딕체 (기본)",
      serif: "명조체 (Serif)",
      mono: "고정폭 (Mono)",
      helper: {
        primary:
          "기본적으로 시스템 폰트를 사용합니다. Inter는 선택 가능한 내장 폰트입니다.",
        optional:
          "설치된 폰트만 적용됩니다. 설치하지 않으면 기본 폰트로 자동 폴백됩니다.",
      },
    },
    optionalFont: {
      inter: "Inter Variable",
      action: {
        installing: "로딩 중",
        install: "Inter 사용",
        apply: "적용",
        active: "사용 중",
      },
    },
    spellcheck: {
      description: "Electron 내장 맞춤법 검사 밑줄과 제안을 켜거나 끕니다.",
      on: "켜짐",
      off: "꺼짐",
    },
    theme: {
      light: "Light",
      sepia: "Sepia",
      dark: "Dark",
    },
    sampleText: "Ag",
    language: {
      helper: "앱 전체 언어를 변경합니다.",
      options: {
        ko: "한국어",
        en: "영어",
        ja: "일본어",
      },
    },
    placeholder: "준비 중인 기능입니다.",
  },
} as const;

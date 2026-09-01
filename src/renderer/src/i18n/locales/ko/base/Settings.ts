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
      model: "AI",
      language: "언어 (Language)",
    },
    section: {
      font: "글꼴 (Font)",
      optionalFont: "번들 폰트 (선택)",
      customFont: "사용자 폰트",
      spellcheck: "맞춤법 검사",
      fontSize: "글자 크기",
      lineHeight: "줄 간격",
      letterSpacing: "자간",
      wordSpacing: "어간",
      paragraphSpacing: "문단 간격",
      typography: "타이포그래피 조절",
      advancedTypography: "세부 조절 (자간, 어간, 문단 간격)",
      writingEnvironment: "집필 환경",
      typewriterMode: "타자기 모드",
      theme: "테마 (Theme)",
      uiMode: "UI 모드 (Laboratory)",
      language: "언어",
      menuBar: "메뉴바",
    },
    typewriterMode: {
      description: "입력 위치를 화면 중앙 부근에 유지합니다.",
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
      accent: {
        title: "강조색 (Accent Color)",
        description: "버튼, 링크, 활성 상태에 적용되는 강조 색상을 선택합니다.",
        blue: "블루",
        emerald: "에메랄드",
        violet: "바이올렛",
        rose: "로즈",
        amber: "앰버",
        custom: "직접 지정",
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
      group: {
        presets: "기본 추천 서체",
        popularKo: "자주 쓰는 한국어 서체",
        popularEn: "Popular English Fonts",
        popularJa: "よく使う日本語フォント",
        popularAll: "자주 쓰는 추천 시스템 서체",
        otherCount: "기타 시스템 서체 ({{count}}개)",
        expand: "확인하기",
        collapse: "접기",
      },
      lang: {
        all: "전체",
        ko: "한국어",
        en: "English",
        ja: "日本語",
      },
      searchPlaceholder: "폰트명 검색...",
      helper: {
        primary:
          "기본적으로 시스템 폰트를 사용합니다. Inter는 선택 가능한 내장 폰트입니다.",
        optional:
          "설치된 폰트만 적용됩니다. 설치하지 않으면 기본 폰트로 자동 폴백됩니다.",
      },
    },
    preview: {
      title: "미리보기",
      reset: "기본값으로 초기화",
      body1:
        "그는 오래된 서재 한편에 앉아, 먼지 앉은 원고 뭉치를 펼쳤다. 창밖엔 비가 내리고 있었고, 등장인물들의 목소리가 점차 또렷해졌다.",
      body2:
        "글이란 결국 사람의 목소리를 담는 그릇이다. 오늘도 한 문장, 한 문장씩 써 내려간다.",
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
      description: "작성 중인 텍스트의 맞춤법 오류를 밑줄로 표시하고, 우클릭 시 교정 제안을 제공합니다.",
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

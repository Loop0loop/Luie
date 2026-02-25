export const koExport = {
  "exportPreview": {
    "defaultTitle": "제목 없음",
    "alertExport": ".{ext} 형식으로 내보내기 (준비 중)",
    "format": {
      "hwpShort": "한",
      "hwp": "한글",
      "word": "Word"
    },
    "action": {
      "export": "내보내기"
    },
    "hwp": {
      "appTitle": "한글 2024",
      "menu": {
        "file": "파일",
        "edit": "편집",
        "view": "보기",
        "input": "입력",
        "format": "서식",
        "page": "쪽",
        "security": "보안",
        "review": "검토",
        "tools": "도구"
      },
      "toolbar": {
        "baseStyle": "바탕글",
        "fontName": "함초롬바탕",
        "fontSize": "10"
      },
      "previewNotice": "이 문서는 한글(HWP) 스타일 미리보기입니다.",
      "sampleText": "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세. 무궁화 삼천리 화려강산 대한사람 대한으로 길이 보전하세.",
      "status": {
        "pageCount": "1/1 쪽",
        "column": "1단",
        "layout": "배치: 글자",
        "insert": "삽입",
        "trackChanges": "변경 내용 추적",
        "zoom": "100%"
      }
    },
    "word": {
      "title": "Word",
      "searchPlaceholder": "검색",
      "premium": "PREMIUM",
      "tabs": {
        "file": "파일",
        "home": "홈",
        "insert": "삽입",
        "draw": "그리기",
        "layout": "레이아웃",
        "references": "참조",
        "review": "검토",
        "view": "보기",
        "help": "도움말"
      },
      "undo": "실행 취소",
      "styles": {
        "standard": "표준",
        "noSpacing": "간격 없음",
        "heading1": "제목 1"
      },
      "previewNotice": "Microsoft Word 스타일 내보내기 미리보기입니다.",
      "sampleText": "이 영역은 Word 미리보기용 샘플 텍스트입니다.",
      "status": {
        "pageInfo": "1페이지(전체 1)",
        "wordCount": "45 단어",
        "language": "한국어",
        "accessibility": "접근성: 검토 필요",
        "view": {
          "read": "읽기 모드",
          "print": "인쇄 모양",
          "web": "웹 모양"
        },
        "zoom": "100%"
      }
    }
  },
  "exportWindow": {
    "title": "내보내기 미리보기",
    "header": {
      "title": "내보내기 설정",
      "subtitle": "문서 형식을 선택하고 스타일을 조정하세요."
    },
    "sections": {
      "format": "파일 형식",
      "page": "용지 설정",
      "typography": "글꼴 및 줄 간격",
      "header": "머리말 / 꼬리말"
    },
    "format": {
      "hwp": "한글 문서",
      "word": "MS Word",
      "beta": "BETA",
      "hwp_label": "한글 문서 (.hwp)",
      "docx_label": "워드 문서 (.docx)",
      "txt_label": "텍스트 문서 (.txt)",
      "word_label": "워드 문서 (.docx)"
    },
    "page": {
      "paperSize": "용지 크기",
      "paperOptions": {
        "a4": "A4 (210 x 297 mm)",
        "letter": "Letter (216 x 279 mm)",
        "b5": "B5 (176 x 250 mm)"
      },
      "margins": "여백 (mm)",
      "marginTop": "위쪽",
      "marginBottom": "아래쪽",
      "marginLeft": "왼쪽",
      "marginRight": "오른쪽"
    },
    "typography": {
      "font": "글꼴",
      "fontOptions": {
        "batang": "바탕 (Batang)",
        "malgun": "맑은 고딕",
        "nanum": "나눔명조"
      },
      "fontHint": "OS에 해당 폰트가 없을 경우, 가장 유사한 명조/고딕체로 대체됩니다.",
      "lineHeight": "줄 간격"
    },
    "headerSettings": {
      "showPageNumbers": "쪽 번호 표시",
      "startPage": "시작 번호"
    },
    "button": {
      "export": "내보내기 ({format})",
      "exporting": "내보내는 중..."
    },
    "preview": {
      "label": "미리보기",
      "errorTitle": "오류",
      "loading": "챕터를 불러오는 중..."
    },
    "error": {
      "missingChapterId": "챕터 ID가 제공되지 않았습니다.",
      "loadFailed": "챕터를 불러오는데 실패했습니다.",
      "unknown": "알 수 없는 오류가 발생했습니다.",
      "noChapter": "챕터 정보를 불러올 수 없습니다."
    },
    "alert": {
      "success": "내보내기가 완료되었습니다!\n저장 위치: {path}",
      "failed": "내보내기에 실패했습니다.\n{reason}",
      "exception": "내보내기 중 오류가 발생했습니다.\n{reason}"
    }
  }
} as const;

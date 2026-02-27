export const koWorkspace = {
  "toolbar": {
    "ribbon": {
      "home": "홈",
      "insert": "삽입",
      "draw": "그리기",
      "view": "보기",
      "paste": "붙여넣기",
      "style": {
        "normalText": "기본 텍스트",
        "title": "제목",
        "heading1": "제목 1",
        "heading2": "제목 2"
      }
    },
    "font": {
      "defaultLabel": "나눔고딕",
      "options": {
        "arial": "Arial",
        "inter": "Inter",
        "roboto": "Roboto"
      }
    },
    "tooltip": {
      "undo": "Undo",
      "redo": "Redo",
      "bold": "Bold",
      "italic": "Italic",
      "underline": "Underline",
      "strikethrough": "Strikethrough",
      "textColor": "Text Color",
      "highlight": "Highlight",
      "alignLeft": "Align Left",
      "alignCenter": "Align Center",
      "alignRight": "Align Right",
      "bulletList": "글머리 기호 목록",
      "orderedList": "번호 매기기 목록",
      "addComment": "댓글 추가",
      "toggleMobileView": "모바일 뷰 전환",
      "openWorldGraph": "월드 그래프 열기",
      "view": {
        "mobile": "Mobile View",
        "desktop": "PC View"
      }
    },
    "view": {
      "mobile": "Mobile",
      "desktop": "PC",
      "graph": "그래프"
    }
  },
  "textEditor": {
    "placeholder": {
      "body": "글을 쓰세요..."
    },
    "status": {
      "saving": "저장 중...",
      "saved": "저장 완료"
    },
    "actions": {
      "save": "저장"
    },
    "suffix": {
      "char": "자",
      "word": "단어"
    },
    "ruler": {
      "firstLineIndent": "첫 줄 들여쓰기",
      "leftMargin": "왼쪽 여백",
      "rightMargin": "오른쪽 여백"
    }
  },
  "mainLayout": {
    "tooltip": {
      "sidebarCollapse": "사이드바 접기",
      "sidebarExpand": "사이드바 펼치기",
      "contextCollapse": "패널 접기",
      "contextExpand": "패널 펼치기"
    }
  },
  "analysis": {
    "title": "편집자의 책상",
    "selectChapter": "검토할 원고",
    "startButton": "피드백 받아보기",
    "analyzing": "원고를 읽고 있습니다...",
    "emptyState": "작가님, 안녕하세요.\n검토가 필요한 챕터를 책상 위에 올려주세요.\n천천히 읽어보고 제 생각을 말씀드릴게요.",
    "disclaimer": "작가님의 원고, 캐릭터, 고유명사 등을 소재로 분석하며,\n분석 내용은 저장되지 않고 종료 즉시 폐기됩니다.",
    "disclaimerLink": "자세히 알아보기",
    "disclaimerDetailTitle": "데이터 처리 방침 안내",
    "disclaimerDetailBody": "1. 데이터의 사용 목적\n- 제공해주신 원고 데이터는 오직 AI 분석 기능을 수행하기 위해서만 사용됩니다.\n- 분석 결과 도출 외의 목적으로는 사용되지 않습니다.\n\n2. 데이터의 저장 및 폐기\n- 분석을 위해 전송된 데이터는 서버에 영구 저장되지 않습니다.\n- 휘발성 메모리에서 처리되며, 분석 세션이 종료되는 즉시 파기됩니다.\n\n3. 제3자 제공 금지\n- 사용자 동의 없이 데이터를 제3자에게 제공하거나 AI 학습용으로 무단 사용하지 않습니다.\n\n안심하고 창작에만 집중하세요.",
    "result": {
      "reaction": "독자 노트",
      "contradiction": "검토 메모",
      "empty": "피드백이 없습니다."
    },
    "actions": {
      "reset": "초기화",
      "reanalyze": "다시 분석",
      "moveToContext": "문맥으로 이동하기"
    },
    "toast": {
      "start": "분석을 시작합니다...",
      "error": "분석 중 오류가 발생했습니다.",
      "apiKeyMissing": "Gemini API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.",
      "quotaExceeded": "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.",
      "networkError": "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
      "unknown": "알 수 없는 오류가 발생했습니다.",
      "navigateChapter": "\"{title}\" 원고로 이동합니다.",
      "navigateFallback": "원고의 해당 위치로 이동합니다. (context: {contextId})"
    }
  },
  "slashMenu": {
    "header": "기본 블록",
    "description": {
      "h1": "장(章) 또는 큰 섹션",
      "h2": "중간 섹션",
      "h3": "세부 섹션",
      "bullet": "단순 목록 만들기",
      "number": "순서가 있는 목록",
      "check": "체크박스로 진행 관리",
      "toggle": "접고 펼칠 수 있는 섹션",
      "quote": "대사/인용문 강조",
      "callout": "주석/메모 박스",
      "divider": "장면 전환 구분"
    },
    "label": {
      "h1": "제목 1",
      "h2": "제목 2",
      "h3": "제목 3",
      "bullet": "글머리 기호 목록",
      "number": "번호 매기기 목록",
      "check": "할 일 목록",
      "toggle": "토글 섹션",
      "quote": "인용",
      "callout": "메모(콜아웃)",
      "divider": "장면 구분선"
    },
    "toggleTitle": "토글 제목",
    "calloutContent": "메모 내용"
  },
  "event": {
    "viewAllTitle": "전체 보기",
    "sectionTitle": "사건",
    "addTitle": "사건 추가",
    "galleryTitle": "사건 개요 (Events)",
    "uncategorized": "미분류",
    "noRole": "종류 없음",
    "classificationLabel": "분류:",
    "tocLabel": "목차",
    "addSection": "+ 섹션 추가 (Add Section)",
    "newSection": "새로운 연대기/기록",
    "deleteSectionConfirm": "정말 이 섹션을 삭제하시겠습니까? (내용은 보존됩니다)",
    "newFieldLabel": "새 항목",
    "deleteFieldConfirm": "정말 이 항목을 삭제하시겠습니까?",
    "wiki": {
      "sectionDeleteTitle": "섹션 삭제",
      "fieldDeleteTitle": "항목 삭제"
    },
    "template": {
      "basic": "기본 사건"
    },
    "section": {
      "overview": "1. 개요",
      "timeline": "2. 연표/기록",
      "locations": "3. 관련 장소",
      "participants": "4. 관련 인물/세력",
      "notes": "5. 작가의 말"
    },
    "defaults": {
      "name": "새 사건"
    }
  },
  "faction": {
    "viewAllTitle": "전체 보기",
    "sectionTitle": "세력",
    "addTitle": "세력 추가",
    "galleryTitle": "세력 개요 (Factions)",
    "uncategorized": "미분류",
    "noRole": "종류 없음",
    "classificationLabel": "분류:",
    "tocLabel": "목차",
    "addSection": "+ 섹션 추가 (Add Section)",
    "newSection": "새로운 조직 정보",
    "deleteSectionConfirm": "정말 이 섹션을 삭제하시겠습니까? (내용은 보존됩니다)",
    "newFieldLabel": "새 항목",
    "deleteFieldConfirm": "정말 이 항목을 삭제하시겠습니까?",
    "wiki": {
      "sectionDeleteTitle": "섹션 삭제",
      "fieldDeleteTitle": "항목 삭제"
    },
    "template": {
      "basic": "기본 세력"
    },
    "section": {
      "overview": "1. 개요",
      "history": "2. 역사",
      "organization": "3. 조직도/구조",
      "relationships": "4. 외부 관계",
      "notes": "5. 작가의 말"
    },
    "defaults": {
      "name": "새 세력"
    }
  },
  "character": {
    "viewAllTitle": "전체 보기 (Gallery View)",
    "sectionTitle": "등장인물",
    "addTitle": "캐릭터 추가",
    "templateTitle": "템플릿 선택",
    "galleryTitle": "등장인물 (Characters)",
    "uncategorized": "미분류",
    "noRole": "No Role",
    "classificationLabel": "분류:",
    "tocLabel": "목차",
    "addSection": "+ 섹션 추가 (Add Section)",
    "newSection": "새로운 섹션",
    "deleteSectionConfirm": "정말 이 섹션을 삭제하시겠습니까? (내용은 보존됩니다)",
    "newFieldLabel": "새 항목",
    "deleteFieldConfirm": "정말 이 항목을 삭제하시겠습니까?",
    "wiki": {
      "sectionDeleteTitle": "섹션 삭제",
      "sectionPlaceholder": "내용을 입력하세요...",
      "fieldDeleteTitle": "항목 삭제",
      "selectPlaceholder": "- 선택 -",
      "valuePlaceholder": "-",
      "addField": "필드 추가"
    },
    "defaultSections": [
      "1. 개요",
      "2. 외관",
      "3. 성격",
      "4. 배경/과거",
      "5. 인간관계",
      "6. 작가의 말"
    ],
    "defaults": {
      "name": "여기를 클릭하여 이름을 입력하세요",
      "fallbackName": "Character",
      "descriptionLabel": "No description",
      "addCharacter": "Add Character",
      "addTerm": "Add Term"
    },
    "templates": {
      "basic": "기본 (Basic)",
      "fantasy": "판타지 (Fantasy)",
      "romance": "로맨스 (Romance)",
      "murim": "무협 (Murim)",
      "modern": "현대물 (Modern)"
    },
    "fields": {
      "age": "나이",
      "gender": "성별",
      "job": "직업",
      "affiliation": "소속",
      "mbti": "MBTI",
      "race": "종족",
      "class": "클래스",
      "rank": "등급/랭크",
      "element": "속성",
      "affiliationGuild": "소속 길드/국가",
      "ability": "특수 능력",
      "jobTitle": "직업/직위",
      "status": "사회적 지위",
      "style": "외모 스타일",
      "ideal": "이상형",
      "rival": "라이벌/연적",
      "family": "가족 관계",
      "sect": "소속 문파",
      "realm": "경지(무공)",
      "title": "별호",
      "martialArts": "주요 무공",
      "weapon": "사용 무기",
      "education": "학력",
      "wealth": "경제력",
      "hobby": "취미",
      "vehicle": "보유 차량"
    },
    "placeholders": {
      "age": {
        "basic": "예: 24세",
        "fantasy": "예: 150세 (엘프)"
      },
      "job": {
        "basic": "예: 학생",
        "romance": "예: 본부장, 황태자"
      },
      "affiliation": "-",
      "mbti": "ENTP",
      "race": "예: 인간, 엘프, 드워프",
      "class": "예: 마법사, 기사",
      "rank": "예: A급, 7서클",
      "element": "예: 화염, 신성",
      "ability": "보유 스킬이나 능력",
      "status": "예: 재벌 3세, 평민",
      "style": "청순, 냉미남",
      "sect": "예: 화산파, 마교",
      "realm": "예: 화경, 절정",
      "title": "예: 검성, 매화검존",
      "wealth": "예: 상, 중, 하"
    },
    "options": {
      "gender": {
        "male": "남성",
        "female": "여성",
        "other": "기타",
        "unknown": "불명"
      }
    }
  },
  "world": {
    "tab": {
      "terms": "Terms (용어)",
      "synopsis": "Synopsis",
      "mindmap": "Mindmap",
      "drawing": "Map Drawing",
      "plot": "Plot Board",
      "graph": "세계관 그래프"
    },
    "graph": {
      "loading": "세계관 그래프를 불러오는 중...",
      "errorPrefix": "오류",
      "suggestionPrefix": "추천",
      "suggestionApply": "적용",
      "mode": {
        "standard": "표준",
        "protagonist": "주인공",
        "eventChain": "사건 체인",
        "freeform": "자유형"
      },
      "entityTypes": {
        "Character": "인물",
        "Faction": "세력",
        "Event": "사건",
        "Place": "장소",
        "Concept": "개념",
        "Rule": "규칙",
        "Item": "사물",
        "Term": "기타 용어",
        "WorldEntity": "미분류 엔티티"
      },
      "relationTypes": {
        "belongs_to": "소속",
        "enemy_of": "적대",
        "causes": "원인",
        "controls": "통제",
        "located_in": "위치",
        "violates": "위반"
      },
      "inspector": {
        "emptySelection": "노드나 관계를 클릭하면\n세부 정보가 표시됩니다.",
        "deleteNodeConfirm": "\"{{name}}\"을 삭제할까요?",
        "untitled": "무명(無名)의 존재",
        "empty": "비어 있음",
        "tagsPlaceholder": "쉼표로 구분...",
        "descriptionPlaceholder": "여기에 상세 설정, 배경 이야기, 주요 특징 등을 작성하세요...",
        "relation": "관계 (Relation)",
        "changeRelation": "관계 유형 변경",
        "selectNewRelation": "새 관계 선택",
        "save": "저장",
        "cancel": "취소",
        "deleteRelation": "이 관계 삭제",
        "attributes": {
          "time": "시간/시기",
          "region": "위치/지역",
          "tags": "분류 태그",
          "importance": "중요도"
        }
      },
      "sidebar": {
        "entities": "요소",
        "relations": "관계",
        "searchPlaceholder": "검색 (이름, 내용...)",
        "entityType": "요소 유형",
        "active": "활성",
        "relationType": "관계 유형",
        "resetFilters": "필터 초기화",
        "library": "보관함",
        "items": "개",
        "noResults": "검색 결과가 없습니다",
        "noResultsHint": "다른 필터를 선택하거나\n검색어를 변경해보세요"
      }
    },
    "synopsis": {
      "title": "프로젝트 개요 (Synopsis)",
      "placeholder": "이야기의 핵심 로그라인, 기획의도, 줄거리를 자유롭게 작성하세요.",
      "hint": "* 시놉시스는 언제든 변할 수 있습니다. 'Locked' 상태로 설정하면 수정을 방지합니다.",
      "genre": "장르",
      "genrePlaceholder": "예: 다크 판타지, 로맨스",
      "audience": "타겟 독자",
      "audiencePlaceholder": "예: 20대 남성, 전연령",
      "logline": "로그라인",
      "loglinePlaceholder": "한 문장으로 요약된 이야기의 핵심",
      "status": {
        "draft": "작성 중",
        "working": "수정 중",
        "locked": "확정됨"
      }
    },
    "mindmap": {
      "rootLabel": "중심 사건/인물",
      "newTopic": "새 토픽",
      "subTopic": "하위 토픽",
      "uploadImage": "이미지 업로드",
      "urlPlaceholder": "https://...",
      "enterUrl": "URL 입력",
      "shortcut": {
        "clickKey": "클릭",
        "select": "선택",
        "enterKey": "Enter",
        "sibling": "형제 토픽",
        "tabKey": "Tab",
        "child": "하위 토픽",
        "deleteKey": "Del",
        "delete": "삭제"
      },
      "controls": {
        "zoomIn": "확대",
        "zoomOut": "축소",
        "fitView": "화면 맞춤"
      }
    },
    "term": {
      "addLabel": "용어 추가",
      "defaultName": "새 용어",
      "defaultCategory": "일반",
      "notFound": "용어를 찾을 수 없습니다",
      "reorderFailed": "용어 순서 저장에 실패했습니다",
      "label": "용어",
      "definitionLabel": "정의",
      "categoryLabel": "카테고리",
      "noDefinition": "정의 없음"
    },
    "drawing": {
      "toolPen": "펜",
      "toolIcon": "지도 아이콘",
      "toolText": "지명 (텍스트)",
      "clear": "전체 지우기",
      "confirmClear": "정말 지도를 초기화하시겠습니까?",
      "placePrompt": "지명 입력:",
      "mapMakerMode": "판타지 지도 제작 모드"
    },
    "plot": {
      "addAct": "새로운 막 추가",
      "deleteAct": "이 막을 삭제",
      "addBeat": "비트 추가",
      "newAct": "막",
      "newBeat": "새로운 비트",
      "act1Title": "1막: 발단 (Setup)",
      "act2Title": "2막: 전개 (Confrontation)",
      "act3Title": "3막: 결말 (Resolution)",
      "card": {
        "act1_1": "주인공의 일상",
        "act1_2": "사건의 시작",
        "act2_1": "첫 번째 시련",
        "act3_1": "최후의 대결"
      }
    }
  }
} as const;

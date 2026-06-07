export const koWorkspaceAnalysis = {
    title: "편집자의 책상",
    selectChapter: "검토할 원고",
    startButton: "피드백 받아보기",
    analyzing: "원고를 읽고 있습니다...",
    emptyState:
      "작가님, 안녕하세요.\n검토가 필요한 챕터를 책상 위에 올려주세요.\n천천히 읽어보고 제 생각을 말씀드릴게요.",
    disclaimer:
      "작가님의 원고, 캐릭터, 고유명사 등을 소재로 분석하며,\n분석 내용은 저장되지 않고 종료 즉시 폐기됩니다.",
    disclaimerLink: "자세히 알아보기",
    disclaimerDetailTitle: "데이터 처리 방침 안내",
    disclaimerDetailBody:
      "1. 데이터의 사용 목적\n- 제공해주신 원고 데이터는 오직 AI 분석 기능을 수행하기 위해서만 사용됩니다.\n- 분석 결과 도출 외의 목적으로는 사용되지 않습니다.\n\n2. 데이터의 저장 및 폐기\n- 분석을 위해 전송된 데이터는 서버에 영구 저장되지 않습니다.\n- 휘발성 메모리에서 처리되며, 분석 세션이 종료되는 즉시 파기됩니다.\n\n3. 제3자 제공 금지\n- 사용자 동의 없이 데이터를 제3자에게 제공하거나 AI 학습용으로 무단 사용하지 않습니다.\n\n안심하고 창작에만 집중하세요.",
    result: {
      reaction: "독자 노트",
      contradiction: "검토 메모",
      empty: "피드백이 없습니다.",
    },
    actions: {
      reset: "초기화",
      reanalyze: "다시 분석",
      moveToContext: "문맥으로 이동하기",
    },
    toast: {
      start: "분석을 시작합니다...",
      error: "분석 중 오류가 발생했습니다.",
      apiKeyMissing:
        "Gemini API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.",
      quotaExceeded:
        "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.",
      networkError: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
      unknown: "알 수 없는 오류가 발생했습니다.",
      navigateChapter: '"{title}" 원고로 이동합니다.',
      navigateFallback: "원고의 해당 위치로 이동합니다. (context: {contextId})",
    },
  };

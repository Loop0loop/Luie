export const writerFlowSyntheticNovel = {
  title: "회귀한 탑 관리자는 엔딩을 숨긴다",
  premise:
    "무너진 탑의 관리자가 12화 시점으로 회귀해, 아직 공개하면 안 되는 18화의 봉인 약 설정을 숨긴다.",
  chapters: [
    {
      id: "chapter-11",
      order: 11,
      title: "검은 등급표",
      canon:
        "서린은 검은 등급표를 읽지만, 붉은 인장 상자의 의미는 아직 모른다.",
    },
    {
      id: "chapter-12",
      order: 12,
      title: "푸른 병의 이름",
      canon:
        "서린은 푸른 병이 치료제라고만 믿고, 봉인 약의 정체는 알지 못한다.",
    },
    {
      id: "chapter-18",
      order: 18,
      title: "붉은 인장 상자",
      canon:
        "유란은 봉인 약을 붉은 인장 상자에 숨겼고, 푸른 병 설정은 폐기했다.",
    },
  ],
  flows: [
    {
      title: "설정 질문",
      writerQuestion: "12화 기준으로 서린이 봉인 약의 정체를 알아도 돼?",
      expectedCompanionBehavior:
        "12화 이전 근거만 보여주고, 서린이 아직 모른다고 표시한다.",
    },
    {
      title: "집필 중 충돌 자동 감지",
      writerQuestion: "12화 새 문단에서 서린이 붉은 인장 상자를 열었다고 쓰면?",
      expectedCompanionBehavior:
        "18화 근거와 충돌할 수 있으니 검토 필요로 올린다.",
    },
    {
      title: "과거 회차 수정",
      writerQuestion: "12화를 고치면 18화 근거 링크가 오래된 상태가 되는지 봐줘.",
      expectedCompanionBehavior:
        "수정된 원고 chunk로 evidence를 재연결하거나 backlog로 보낸다.",
    },
    {
      title: "초안 폐기",
      writerQuestion: "푸른 병에 약이 들어 있다는 초안은 버렸어.",
      expectedCompanionBehavior:
        "폐기 설정을 정사 답변에 섞지 않고 non-canonical로 낮춘다.",
    },
    {
      title: "인물명/별칭 변경",
      writerQuestion: "유란의 별칭을 회색 약사에서 탑의 약사로 바꿨어.",
      expectedCompanionBehavior:
        "이전 evidence와 새 별칭을 같은 인물 기억으로 이어준다.",
    },
    {
      title: "회차 순서 변경",
      writerQuestion: "18화를 14화 앞으로 옮기면 미래 정보 판단도 바뀌어야 해.",
      expectedCompanionBehavior:
        "chapter order 기준으로 temporal 판단을 다시 계산한다.",
    },
  ],
} as const;

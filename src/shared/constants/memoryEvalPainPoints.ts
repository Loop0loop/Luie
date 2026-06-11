import type {
  MemoryEvalCaseType,
  MemoryEvalSeverity,
} from "../types/memoryEval.js";

export type WriterPainPointTaxonomyKey =
  | "alias-confusion"
  | "knowledge-state"
  | "future-leakage"
  | "draft-contamination"
  | "relation-direction"
  | "unresolved-thread"
  | "continuity-state"
  | "motivation-drift"
  | "world-rule-conflict";

export type WriterPainPointTaxonomyItem = {
  key: WriterPainPointTaxonomyKey;
  labelKo: string;
  writerProblem: string;
  evalIntent: string;
  caseType: MemoryEvalCaseType;
  severity: MemoryEvalSeverity;
};

export const MEMORY_EVAL_PAIN_POINT_SEED_CASES_PER_CATEGORY = 10;

export const WRITER_PAIN_POINT_TAXONOMY: readonly WriterPainPointTaxonomyItem[] =
  [
    {
      key: "alias-confusion",
      labelKo: "인물/별칭/호칭 혼동",
      writerProblem:
        "작가가 같은 인물의 본명, 별명, 직함, 호칭을 서로 다른 인물처럼 쓰거나 반대로 다른 인물을 같은 인물처럼 쓰는 문제",
      evalIntent:
        "질문 시점의 원문 근거만으로 인물/별칭/호칭이 같은 대상을 가리키는지 확인한다.",
      caseType: "entity",
      severity: "p0",
    },
    {
      key: "knowledge-state",
      labelKo: "회차별 지식 상태",
      writerProblem:
        "캐릭터가 아직 모르는 정보를 알고 있는 것처럼 쓰는 문제",
      evalIntent:
        "기준 회차까지의 원문만 사용해 특정 캐릭터가 그 사실을 알고 있다고 말할 수 있는지 확인한다.",
      caseType: "temporal_state",
      severity: "p0",
    },
    {
      key: "future-leakage",
      labelKo: "미래 정보 누수",
      writerProblem:
        "뒤 회차에서 드러나는 정보를 앞 회차 시점 답변이나 집필 판단에 섞는 문제",
      evalIntent:
        "질문 기준 회차 이후 정보를 사용하지 않고 현재 시점에서 확정 가능한 설정인지 확인한다.",
      caseType: "temporal_state",
      severity: "p0",
    },
    {
      key: "draft-contamination",
      labelKo: "초안/폐기 설정 오염",
      writerProblem:
        "초안, 폐기 설정, 작가 메모를 실제 정사 원문처럼 섞는 문제",
      evalIntent:
        "해당 내용이 정사 원문 근거에 존재하는지 확인하고 초안/폐기 출처를 확정 사실로 쓰지 않는다.",
      caseType: "qa",
      severity: "p0",
    },
    {
      key: "relation-direction",
      labelKo: "관계 방향 뒤집힘",
      writerProblem:
        "누가 누구에게 감정, 행동, 적대, 호의를 갖는지 방향을 반대로 쓰는 문제",
      evalIntent:
        "원문 근거로 관계의 주체와 대상을 확인하고 방향이 뒤집히지 않았는지 평가한다.",
      caseType: "relation",
      severity: "p0",
    },
    {
      key: "unresolved-thread",
      labelKo: "미회수/회수 떡밥 혼동",
      writerProblem:
        "아직 회수하지 않은 복선을 이미 해결된 사실처럼 쓰거나 회수된 떡밥을 미회수로 착각하는 문제",
      evalIntent:
        "원문 근거를 통해 해당 대목이 미회수 떡밥인지, 회수된 사실인지 구분한다.",
      caseType: "qa",
      severity: "p1",
    },
    {
      key: "continuity-state",
      labelKo: "생존/위치/소속/능력/소유물 변화",
      writerProblem:
        "인물의 생존, 부상, 위치, 소속, 능력, 소유물이 이전 원문 상태와 충돌하는 문제",
      evalIntent:
        "현재 대목의 상태 변화가 이전 기억과 충돌할 수 있는지 먼저 원문 근거를 확인한다.",
      caseType: "temporal_state",
      severity: "p1",
    },
    {
      key: "motivation-drift",
      labelKo: "감정선/동기 변화",
      writerProblem:
        "인물의 감정선이나 행동 동기가 앞선 장면의 축적 없이 갑자기 바뀌는 문제",
      evalIntent:
        "현재 감정/동기 판단이 원문에서 누적된 근거로 뒷받침되는지 확인한다.",
      caseType: "qa",
      severity: "p1",
    },
    {
      key: "world-rule-conflict",
      labelKo: "세계관 규칙 충돌",
      writerProblem:
        "마법, 능력, 조직 규칙, 금기, 계약 조건 같은 세계관 규칙을 장면마다 다르게 쓰는 문제",
      evalIntent:
        "현재 장면의 세계관 규칙이 앞선 원문 근거와 충돌하지 않는지 확인한다.",
      caseType: "temporal_state",
      severity: "p0",
    },
  ] as const;

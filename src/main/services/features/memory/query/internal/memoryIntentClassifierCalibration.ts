import type {
  NarrativeMemoryQueryIntent,
  NarrativeMemorySource,
} from "../../../../../../shared/types/search.js";
import type { NarrativeMemoryQueryPlan } from "./plan.js";

export type NarrativeMemoryIntentClassifier = (input: {
  projectId: string;
  question: string;
}) => Promise<NarrativeMemoryQueryPlan>;

export type NarrativeMemoryIntentCalibrationCase = {
  id: string;
  name: string;
  question: string;
  expected: {
    intent: NarrativeMemoryQueryIntent;
    requiredSources: NarrativeMemorySource[];
  };
};

export type NarrativeMemoryIntentCalibrationFailure = {
  caseId: string;
  reason:
    | "EXPECTED_INTENT_MISMATCH"
    | "EXPECTED_SOURCE_MISSING"
    | "CLASSIFIER_ERROR";
  detail?: string;
};

export type NarrativeMemoryIntentCalibrationResult = {
  caseCount: number;
  passCount: number;
  failures: NarrativeMemoryIntentCalibrationFailure[];
};

export function createDefaultNarrativeMemoryIntentCalibrationCases(): NarrativeMemoryIntentCalibrationCase[] {
  return [
    {
      id: "evidence-trace",
      name: "raw evidence trace",
      question: "아린이 처음 백야회를 언급한 근거 원문을 찾아줘",
      expected: {
        intent: "evidence-trace",
        requiredSources: ["memory_chunk_evidence"],
      },
    },
    {
      id: "entity-profile",
      name: "entity profile",
      question: "검은 기사는 누구야? 별칭도 알려줘",
      expected: {
        intent: "entity-profile",
        requiredSources: ["memory_entity", "memory_entity_mention"],
      },
    },
    {
      id: "entity-state-at-chapter",
      name: "bounded entity state",
      question: "8화 기준 아린은 백야회의 정체를 아는가?",
      expected: {
        intent: "entity-state-at-chapter",
        requiredSources: ["memory_knowledge_state", "memory_fact_evidence"],
      },
    },
    {
      id: "relationship-at-chapter",
      name: "bounded relationship",
      question: "10화 기준 아린과 백야회는 어떤 관계인가?",
      expected: {
        intent: "relationship-at-chapter",
        requiredSources: ["memory_relation_state", "memory_fact_evidence"],
      },
    },
    {
      id: "event-causality",
      name: "event causality",
      question: "아린이 백야회를 떠난 원인은 왜인가?",
      expected: {
        intent: "event-causality",
        requiredSources: ["memory_episode", "memory_state_change_candidate"],
      },
    },
    {
      id: "contradiction-check",
      name: "contradiction check",
      question: "현재 설정 충돌 검사해줘",
      expected: {
        intent: "contradiction-check",
        requiredSources: ["memory_fact_invalidation", "memory_fact"],
      },
    },
    {
      id: "unresolved-thread-check",
      name: "unresolved narrative threads",
      question: "아직 미회수 떡밥은 뭐야?",
      expected: {
        intent: "unresolved-thread-check",
        requiredSources: ["memory_episode", "memory_fact"],
      },
    },
    {
      id: "global-summary",
      name: "global summary",
      question: "전체 흐름 요약해줘",
      expected: {
        intent: "global-summary",
        requiredSources: ["chapter_summary", "world_document"],
      },
    },
  ];
}

export async function runNarrativeMemoryIntentClassifierCalibration(input: {
  projectId: string;
  classifier: NarrativeMemoryIntentClassifier;
  cases: NarrativeMemoryIntentCalibrationCase[];
}): Promise<NarrativeMemoryIntentCalibrationResult> {
  const failures: NarrativeMemoryIntentCalibrationFailure[] = [];
  const failedCaseIds = new Set<string>();

  for (const calibrationCase of input.cases) {
    try {
      const plan = await input.classifier({
        projectId: input.projectId,
        question: calibrationCase.question,
      });

      if (plan.intent !== calibrationCase.expected.intent) {
        failures.push({
          caseId: calibrationCase.id,
          reason: "EXPECTED_INTENT_MISMATCH",
          detail: `expected=${calibrationCase.expected.intent} actual=${plan.intent}`,
        });
        failedCaseIds.add(calibrationCase.id);
      }

      const actualSources = new Set(plan.sources);
      const missingSources = calibrationCase.expected.requiredSources.filter(
        (source) => !actualSources.has(source),
      );
      if (missingSources.length > 0) {
        failures.push({
          caseId: calibrationCase.id,
          reason: "EXPECTED_SOURCE_MISSING",
          detail: missingSources.join(","),
        });
        failedCaseIds.add(calibrationCase.id);
      }
    } catch (error) {
      failures.push({
        caseId: calibrationCase.id,
        reason: "CLASSIFIER_ERROR",
        detail: error instanceof Error ? error.message : String(error),
      });
      failedCaseIds.add(calibrationCase.id);
    }
  }

  return {
    caseCount: input.cases.length,
    passCount: input.cases.length - failedCaseIds.size,
    failures,
  };
}

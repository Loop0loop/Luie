## Phase 2. 답변 검수자 강화

비유: Phase 1은 조수에게 시험지를 많이 푸는 단계다. Phase 2는 조수가 답을 말할 때 옆에서 편집자가 빨간펜으로 "근거 없음", "미래 정보", "관계 방향 반대"를 잡는 단계다.

목표:

- RAG가 근거를 찾는 것에서 끝나지 않고, 답변이 근거 안에서만 만들어졌는지 평가한다.

### Phase 2-1. deterministic guard 확장

작업:

- 현재 guard를 더 세분화한다.
- LLM 없이 잡을 수 있는 P0를 먼저 잡는다.

검출 항목:

- unsupported confirmed answer
- answer contains unsupported claim
- expected answer not supported by gold evidence
- deleted/draft fact confirmed
- future fact used in past answer
- relation direction reversed
- entity alias mismatch
- unresolved thread falsely marked resolved

완료 기준:

- 각 failure type별 단위 테스트
- false positive case도 별도 테스트
- eval result에 failure type별 count 저장

### Phase 2-2. LLM answer judge 추가

작업:

- 실제 LLM 답변을 judge가 다시 평가한다.
- judge는 반드시 evidence quote와 answer를 함께 본다.
- judge 결과는 canonical memory가 아니라 eval artifact로만 저장한다.

평가축:

- groundedness: 근거 안에서만 답했는가
- contradiction: 기존 memory와 모순되는가
- temporal leakage: 미래 정보를 섞었는가
- omission: 핵심 근거를 빠뜨렸는가
- writer usefulness: 작가가 바로 쓸 수 있는 답인가

완료 기준:

- judge prompt 버전 관리
- judge 결과 JSON schema 고정
- judge 자체가 근거 없이 판단하면 invalid 처리
- judge result 저장 위치가 eval run/result 계열로 제한됨
- judge 결과가 confirmed memory를 직접 생성하지 않음

### Phase 2-3. 답변 차단 정책

작업:

- 위험한 답변은 그대로 보여주지 않는다.
- 확정/추정/근거부족 라벨을 강제한다.
- 기존 RAG grounding은 evidence 상태 판단이고, Phase 2-3은 renderer에 전달되는 답변 표시/차단 정책이다.

정책:

```text
P0 failure 있음 → 확정 답변 차단
근거 0개 → "근거 부족" 표시
미래 정보 감지 → "현재 회차 기준 사용 불가" 표시
초안/폐기 출처 → "정사 아님" 표시
```

완료 기준:

- renderer에 전달되는 answer contract에 safety label 포함
- UI에서 확정 답변과 경고 답변이 구분됨
- 기존 `buildRagGrounding` 결과와 safety label mapping 테스트

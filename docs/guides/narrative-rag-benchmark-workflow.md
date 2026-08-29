# Narrative RAG Benchmark 쉬운 실행 가이드

> 상태: 실행 순서 기준  
> 기준일: 2026-08-27  
> 상세 설계: [Narrative RAG Benchmark SSOT](../architecture/narrative-rag-benchmark-ssot.md)

## 한 문장으로 설명

우리는 웹소설을 잘 쓰는 모델을 평가하는 것이 아니다.

> **긴 이야기에서 필요한 인물·사건·관계·시간 정보를 제대로 찾고, 찾은 근거로 올바르게 답하는지를 평가한다.**

원고는 작품이 아니라 시험 문제다. 다만 인물 행동과 사건이 부자연스러우면 시험 정답도 잘못되므로 사람이 검수한다.

## 1. 임베딩 모델과 RAG의 관계

임베딩 모델은 RAG의 부품 하나다.

```text
사용자 질문
  → 임베딩/문자 검색으로 관련 원문 후보 찾기
  → 시간·세계선·인물 관계로 후보 정리
  → 필요한 근거를 LLM에 전달
  → LLM이 근거를 조합해 답변
```

- **임베딩 모델**: 비슷한 의미의 원문 후보를 찾는다.
- **Retriever**: 임베딩, 문자 검색, metadata, graph 등을 합쳐 evidence 순위를 정한다.
- **RAG**: 검색된 evidence를 LLM에 제공해 답변을 만든다.
- **LLM**: 여러 evidence를 연결하고 답을 설명한다.

임베딩은 “한세연이 윤해준을 불신한 장면” 후보를 찾을 수 있지만, 관계가 언제 왜 변했는지 스스로 판정하지 않는다.

### 반드시 따로 측정한다

| 시험 | 확인할 것 | LLM 사용 |
| --- | --- | --- |
| Embedding Retrieval | BGE-M3가 필요한 원문을 Top-K에 넣는가? | 안 함 |
| Full Retrieval | lexical+dense+graph+time filter가 evidence를 찾는가? | 안 함 |
| Oracle Reasoning | 정답 evidence를 주면 LLM이 올바르게 추론하는가? | 함 |
| End-to-end RAG | 실제 검색부터 답변까지 전체가 성공하는가? | 함 |

이렇게 나눠야 검색 실패와 추론 실패를 구분할 수 있다.

## 2. 지금부터의 TODO

### 현재 상태

- 추가 120화 생성: **중지**
- 기존 120화: `legacy_stress_noise_fixture`
- 기존 120화의 허용 용도: 반복 noise, 대용량 ingestion, 성능·메모리 시험
- 기존 120화로 제품 정확도나 장르 지원을 주장하는 것: **금지**
- Narrative Benchmark v1 acceptance validator: canonical query revision, manuscript/timeline 정합성, review 충돌·stage-target, reasoning mode guardrail까지 구현·회귀 검증 완료
- 첫 S 작업 경로: `corpus/contemporary-romance-s-001/`
- blueprint revision: `a99c5ed0d76aa518e36a7d643f329fa71f83a7044f87a172239e8ca6e83e7cd2`
- blueprint 검수: 조건부 `GOOD`, `60/100`; schema와 Story Instance 분리 및 truth type 보강 반영 완료
- manifest: `humanReviewStatus: "approved"`, `benchmarkEligibility: false`
- 현재 미생성: 원고, 실제 evidence/query/gold, 평가 결과
- 구조화 완료: `narrative/`의 world/characters/goals/conflicts/propositions/events/causal_edges/relations/relationship_transitions/knowledge_states/timeline/chapter_plans/scenes/planned_evidence, plan revision digest `86cd74936e630f3a761b374940828ce28440e3b18dde1abacccf9d6ec12e9668`, 구조 validator 통과(72/72)
- 2026-08-29 재검증에서 `유건 → 서린` affection의 12~15화 구간 공백을 발견해 관계 상태를 신설하고, validator에 "전이 직전 구간 인접성" 검사를 추가했다. 이 때문에 plan digest가 갱신됐다.
- 다음 작업: plan 사람 검수(gate B) 뒤 통과 시에만 원고 생성

### Step 1. 평가 계약을 코드로 만든다

원고를 쓰기 전에 다음 타입과 schema를 만든다.

- 10개 taxonomy
- Retrieval query
- Reasoning query
- Gold answer
- Evidence와 offset/hash
- 미래 회차와 세계선 scope
- `GOOD/BAD/AMBIGUOUS/NOISE`
- Human review record

완료 조건:

- 원고가 없어도 작은 JSON fixture로 validator를 테스트할 수 있다.
- Retrieval 점수와 Reasoning 점수가 별도 결과로 나온다.

### Step 2. Narrative Schema를 만든다

먼저 이야기 구조를 만든 뒤 원고를 작성한다.

```text
World
→ Characters + Goals
→ Conflicts
→ Events
→ Cause / Effect
→ Relationship Changes
→ Character Knowledge
→ Timeline
→ Foreshadowing
→ Chapter Plan
→ Manuscript
```

첫 S pack에서 가장 중요한 축:

```text
원문 속 발화·행동·사실
→ Character Knowledge와 오해
→ Relationship State
→ Relationship Change
```

### Step 3. 첫 S 단계 Blueprint를 만든다

처음부터 20화를 모두 채우지 않는다. 필요한 만큼만 사용하고 20화를 상한으로 둔다.

- 장르: 현대 로맨스
- manifest: `genres: ["contemporary", "romance"]`
- 규모: 20화 이하
- 인물: 핵심 인물부터 시작하고 불필요한 인원 padding을 하지 않음
- 핵심 관계: 감정 관계와 공식 관계를 구분한 3~5개
- 주요 사건: 지식·오해·선택·관계 변화에 필요한 사건만 작성
- 세계선: `prime` 1개
- 핵심 taxonomy: `relationship_state`, `relationship_change`, `character_knowledge`
- 기본 retrieval: `entity_retrieval`, `fact_retrieval`

첫 S에서는 10개 taxonomy를 모두 채우지 않는다. `temporal_order`와 `event_causality`는 위 기본 흐름에서 자연스럽게 파생될 때만 추가하고, 복선·모순·세계선 분리는 후속 pack으로 미룬다.

이 단계에서는 원고가 아니라 다음 구조만 작성한다.

```text
누가 무엇을 말하거나 행동했는가
→ 각 인물은 무엇을 알고 무엇을 오해했는가
→ 그 시점의 감정 관계와 공식 관계는 무엇인가
→ 어떤 사건으로 관계가 어떻게 변했는가
```

### Step 4. Blueprint를 사람이 검수한다

통과하지 못하면 chapter/scene plan과 원고를 만들지 않는다. 조건부 승인은 허용 범위와 잔여 위험을 revision별로 기록한다.

첫 pack `contemporary-romance-s-001`은 revision `a99c5ed0d76aa518e36a7d643f329fa71f83a7044f87a172239e8ca6e83e7cd2`에서 조건부 `GOOD`을 받았다. 이 승인은 plan 작성까지만 허용하며 원고 생성 승인이 아니다.

### Step 5. 구조화된 Truth와 Chapter/Scene Plan을 만든다

승인된 blueprint를 다음 객체로 구조화한다.

```text
World / Characters / Goals / Conflicts
Events / Propositions / Causal Dependencies
Character Knowledge / Relationship States and Transitions
Timeline / Chapter Plans / Scenes
```

20화 이하에서 각 사건의 배치, 인물별 정보 취득 시점, 감정 관계와 공식 관계의 전이, 이후 evidence가 놓일 장면을 계획한다. Event, Canonical Fact/Proposition, Interpretation, Character Knowledge, Relationship State를 서로 대신 쓰지 않는다.

plan 검수에서 확인할 것:

- 16개 사건의 인과 spine이 회차 배치 후에도 유지되는가?
- `정당한 긴급 판단`과 `잘못된 후속 절차`가 서로 다른 evidence로 판정 가능한가?
- 인물이 아직 모르는 사실을 행동 근거로 사용하지 않는가?
- relationship transition마다 충분한 trigger event가 있는가?
- 20화 이하에서 padding 없이 완결되는가?

### Step 6. 통과한 Plan을 바탕으로 원고를 만든다

금지 예:

> 서윤은 민재가 자신을 피한 이유를 오해했기 때문에 그를 불신하게 됐다.

허용 예:

```text
2화: 민재가 약속 장소를 떠나는 장면을 서윤이 목격한다.
5화: 서윤은 답장이 없는 메시지를 보고 의도적인 회피라고 믿는다.
8화: 독자는 민재가 가족 문제로 자리를 비웠다는 근거를 확인한다.
12화: 서윤은 사실을 알게 되고 업무상 관계와 감정 상태가 각각 변한다.
```

정답을 한 문장에 노출하지 않는다. 발화·행동·사실과 인물별 지식 상태를 여러 장면에 분산하고, 감정 관계와 공식 관계를 따로 판정할 수 있게 한다.

### Step 7. Query와 Gold를 만든다

평가 taxonomy:

1. Entity Retrieval
2. Fact Retrieval
3. Relationship State
4. Relationship Change
5. Temporal Order
6. Event Causality
7. Character Knowledge
8. Foreshadowing
9. Contradiction
10. Worldline Isolation

### Step 8. 데이터를 분류한다

| Label | 의미 | 점수 계산 |
| --- | --- | --- |
| `GOOD` | 사람 검수까지 통과 | 포함 |
| `BAD` | 구조·원고·정답에 결함 | 제외 |
| `AMBIGUOUS` | 답이 여러 개일 수 있음 | 제외 후 재검수 |
| `NOISE` | 의도적 distractor·반복 자료 | 정답 evidence로 사용 금지 |

### Step 9. Benchmark를 순서대로 실행한다

1. Dense-only retrieval
2. Lexical-only retrieval
3. Hybrid/full retrieval
4. Oracle-context reasoning
5. End-to-end RAG
6. Taxonomy별 실패 분석

전체 평균만 보지 않는다. Character Knowledge가 실패했는데 쉬운 Fact Retrieval 점수로 가려지면 안 된다.

### Step 10. 장르를 하나씩 추가한다

```text
현대 로맨스(contemporary + romance)
→ 추리 → 회귀 → 판타지 → 스릴러
→ 무협 → SF
```

첫 현대 로맨스 pack부터 S 단계에서 검증한다. 어떤 장르도 S를 통과하기 전에 M 이상으로 키우지 않는다. 일반 혼합 장르는 각 baseline이 확보된 뒤에만 추가한다.

### Step 11. 크기를 한 단계씩 늘린다

```text
S  소량: 20화 이하
M  중량: 40화 이하
ML 중상: 60화 이하
L  대:   100화 이하
XL 한계: 120화 이상
```

앞 단계의 실패 원인을 고치고 검수를 완료한 뒤에만 다음 단계로 이동한다.

## 3. 사람 검수

사람 검수는 네 번 한다.

### A. Blueprint 검수 — 원고 작성 전

확인할 것:

- 인물의 행동이 목표와 일치하는가?
- 그 시점에 인물이 실제로 그 정보를 알고 있는가?
- 관계 변화의 원인이 충분한가?
- 사건의 원인과 결과가 연결되는가?
- 복선이 나중에 회수되는가?
- 질문에 필요한 evidence가 계획에 존재하는가?

하나라도 핵심 문제가 있으면 원고 생성을 중지하고 blueprint를 수정한다.

### B. Plan 검수 — 원고 작성 전

확인할 것:

- blueprint의 Event와 Proposition이 서로 다른 객체로 구조화됐는가?
- 각 인물의 Knowledge State가 실제 acquisition event 이후에만 바뀌는가?
- Relationship State와 Transition의 유효 구간·trigger가 겹치거나 누락되지 않는가?
- chapter와 scene의 event 배치가 timeline 및 first narrated chapter와 일치하는가?
- 핵심 판단 차원마다 이후 인용 가능한 evidence affordance가 있는가?
- 20화 이하에서 사건 밀도와 감정 변화가 충분한가?

하나라도 핵심 문제가 있으면 manuscript 생성을 중지하고 truth 또는 plan을 수정한 뒤 재검수한다.

### C. Manuscript 검수 — 원고 작성 후

확인할 것:

- 구조화된 정답을 문장으로 그대로 노출하지 않았는가?
- 대화와 행동으로 추론할 수 있는가?
- 반복 padding이 없는가?
- 등장인물이 모르는 정보를 사용하지 않는가?
- 장르 독자가 보기에 행동과 설정이 최소한 개연적인가?
- 특정 상업 작품의 표현이나 설정을 복제하지 않았는가?

### D. Query/Gold 검수 — Benchmark 실행 전

각 질문마다 확인할 것:

1. 원고만 읽고 답할 수 있는가?
2. 필요한 화와 장면이 정확한가?
3. evidence가 정답을 충분히 지지하는가?
4. 다른 답도 타당할 가능성이 있는가?
5. 미래 회차나 다른 세계선이 없으면 답할 수 없는 질문은 아닌가?
6. 단순 문장 복사가 아니라 의도한 수준의 추론이 필요한가?

### 검수 판정 흐름

```text
검수자 합의
  ├─ 통과 → GOOD
  ├─ 명백한 결함 → BAD
  ├─ 복수 해석/의견 불일치 → AMBIGUOUS → 재판정
  └─ 의도적 방해 자료 → NOISE
```

S 단계는 규모가 작으므로 scored query를 전수 검수한다. 원고 revision hash가 변경되면 기존 검수는 stale 처리하고 다시 검수한다.

### 권장 역할

- Narrative reviewer: 인물 행동, 관계, 사건 개연성
- Benchmark reviewer: 질문, 정답, evidence 정합성
- Adjudicator: 두 검수자의 의견이 다를 때 최종 판정

한 사람이 여러 역할을 맡을 수 있지만 어떤 관점으로 검수했는지는 기록해야 한다.

## 4. 다음 한 가지 작업

지금 바로 해야 할 일은 원고 작성이 아니다.

> **작성된 `contemporary-romance-s-001` chapter/scene plan(plan revision digest `86cd74936e630f3a761b374940828ce28440e3b18dde1abacccf9d6ec12e9668`)을 gate B 기준으로 사람이 검수한다.**

구조화된 truth와 16화 plan은 이미 작성돼 구조 validator(identity/world/causality/relationship/knowledge/manuscript)를 `structuralIssues=0`으로 통과했다. 이제 확인할 것은 자동 검증이 판정하지 못하는 개연성이다: `정당한 긴급 판단 + 잘못된 후속 절차`가 서로 다른 planned evidence로 분리 판정 가능한지, 각 인물의 정보 취득 시점(서린의 halt-cause/replacement 10화 취득)이 그 이전 행동의 근거로 오용되지 않는지, 관계 전이(9화 파열, 11~12화 회복)의 trigger가 충분한지, 16화에서 padding 없이 완결되는지.

함께 판단해야 할 항목이 하나 더 있다. `knowledge_states`의 취득 이전 baseline이 명제별로 일관되지 않다. `power-risk`, `sponsor-plan`은 `unknown`을 1화부터 명시하지만 `halt-cause`, `process-breach`는 사건 이후부터만 선언한다. 특히 `유건`의 `process-breach`는 7~11화가 비어 있어 그 구간의 `character_knowledge` 질문에 gold가 없다. 명시 baseline을 추가할지 "선언 없음 = unknown" 규칙을 문서화할지 결정해야 한다.

이 gate B 검수가 통과하기 전에는 `manuscript/chapter_*.txt`를 만들지 않는다. `benchmarkEligibility`도 계속 `false`로 유지한다.

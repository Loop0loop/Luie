# Narrative RAG Benchmark SSOT

> 상태: **설계 기준 / 데이터 생성 중지**  
> 기준일: 2026-08-27  
> 적용 범위: Luie Narrative Memory의 synthetic benchmark, retrieval 평가, RAG reasoning 평가  
> 관련 아키텍처: [Narrative Memory · RAG SSOT](./narrative-memory-rag-ssot.md)  
> 쉬운 실행 가이드: [Narrative RAG Benchmark 쉬운 실행 가이드](../guides/narrative-rag-benchmark-workflow.md)  
> 기존 120화 fixture: [한국어 장편 Synthetic Corpus](../plans/korean-synthetic-narrative-corpus.md)

## 1. 프로젝트 정의

이 프로젝트의 목적은 웹소설을 잘 쓰거나 웹소설 문체를 모방하는 것이 아니다.

> **긴 서사에서 발생하는 인물 기억, 사실, 관계 변화, 시간 순서, 인과, 지식 비대칭, 복선, 충돌, 세계선 정보를 검색 시스템이 얼마나 회수하고 RAG가 얼마나 근거 있게 추론하는지 측정한다.**

원고는 제품이 아니라 측정 도구다. 문학적 완성도 자체를 점수화하지 않지만, 인물 행동과 정보 공개가 비현실적이면 평가 정답도 무의미해지므로 서사적 개연성과 추론 가능성을 검수한다.

### 하지 않는 것

- synthetic 원고의 문체를 한국 웹소설 전체의 표준으로 주장하지 않는다.
- 한 번에 120화 이상을 생성한 뒤 benchmark 완성을 선언하지 않는다.
- embedding 검색 성공과 LLM 답변 성공을 하나의 점수로 합치지 않는다.
- 구조화된 정답 문장을 원고에 그대로 노출해 검색 문제를 trivial하게 만들지 않는다.
- 장르마다 별도 retrieval/router를 만들어 장르 태그로 정답을 우회하지 않는다.
- 사람 검수 전 synthetic 점수로 제품 정확도 임계값을 확정하지 않는다.

## 2. 두 개의 독립 평가 트랙

### 2.1 Retrieval Benchmark

측정 질문은 **“정답을 만드는 데 필요한 원문 evidence를 후보 집합에 포함했는가?”**다.

```text
query
  → lexical / embedding / graph / temporal retriever
  → ranked evidence candidates
  → retrieval scorer
```

LLM 답변을 생성하지 않는다. 다음 실행을 각각 분리 기록한다.

- dense-only: embedding 모델 자체의 후보 생성 성능
- lexical-only: 이름, 별칭, 고유 용어 exact 검색 기준선
- hybrid: dense + lexical
- full retrieval: hybrid + metadata/time/worldline filter + graph + optional reranker

필수 지표:

- Recall@K
- MRR
- nDCG@K
- Hit Rate
- forbidden evidence rate: 미래 회차·타 세계선 후보 비율
- taxonomy별, 장르별, 거리 구간별 성능

`K`와 chunk 정책은 실행 manifest에 기록한다. 서로 다른 chunk 크기나 index signature 결과를 같은 표에서 직접 비교하지 않는다.

### 2.2 RAG Reasoning Benchmark

측정 질문은 **“주어진 evidence로 정답을 구성하고, 불확실성을 보존하며, 금지 정보를 누출하지 않는가?”**다.

두 모드를 반드시 모두 실행한다.

1. `oracle_context`: gold evidence를 직접 주입한다. Reasoner/LLM의 추론 능력만 측정한다.
2. `end_to_end`: 실제 retriever 결과를 주입한다. 전체 RAG 시스템을 측정한다.

필수 지표:

- answer correctness
- evidence correctness
- faithfulness / unsupported claim rate
- required evidence coverage
- multi-hop completion rate
- uncertainty calibration
- future leakage count
- worldline leakage count

### 2.3 실패 원인 판정

| Retrieval | Oracle reasoning | End-to-end | 판정 |
| --- | --- | --- | --- |
| 실패 | 성공 가능 | 실패 | retriever 또는 embedding 문제 |
| 성공 | 실패 | 실패 | reasoner/prompt/model 문제 |
| 성공 | 성공 | 실패 | context 조립·rerank·budget 문제 |
| 성공 | 성공 | 성공 | 통과 |

한 행의 결과를 “RAG가 스토리를 이해한다”라는 단일 표현으로 요약하지 않는다.

## 3. Narrative Evaluation Taxonomy

모든 query는 아래 10개 중 정확히 하나를 primary taxonomy로 갖고, 필요하면 secondary taxonomy를 추가한다.

| ID | 측정 대상 | 최소 gold 구조 | 대표 질문 |
| --- | --- | --- | --- |
| `entity_retrieval` | 인물·별칭·동명이인 식별 | entity, alias, mention evidence | 이 호칭은 누구를 가리키는가? |
| `fact_retrieval` | 특정 시점의 단일 사실 회수 | fact, valid scope, evidence | 열쇠를 가진 사람은 누구인가? |
| `relationship_state` | 시점 T의 관계 상태 | relation state, direction, strength | 12화 시점 두 사람의 관계는? |
| `relationship_change` | 관계 변화 과정과 원인 | before/after state, trigger events | 협력에서 불신으로 변한 과정은? |
| `temporal_order` | 사건 발생·서술 순서 | event time, narrative time | A와 B 중 무엇이 먼저인가? |
| `event_causality` | 원인→중간 사건→결과 | directed causal edges | 왜 B 사건이 일어났는가? |
| `character_knowledge` | 인물별 앎·모름·오인 | knowledge state + acquisition event | 이 시점에 A는 비밀을 아는가? |
| `foreshadowing` | 단서의 제시·재해석·회수 | setup, reminder, payoff evidence | 과거 단서가 무엇을 예고했는가? |
| `contradiction` | 주장·기록·정본 간 충돌 | conflicting claims + resolution status | 어느 진술이 충돌하며 확정됐는가? |
| `worldline_isolation` | 분기별 독립 truth set | continuity, divergence, scoped state | return 세계선에서만 유효한 사실은? |

### 3.1 Cross-cutting invariant

다음은 taxonomy가 아니라 모든 query에 적용하는 불변조건이다.

- `future_leakage_guard`: `allowedUntilChapter` 이후 evidence와 사실은 명시적 허용 없이는 0건이어야 한다.
- `worldline_scope_guard`: 허용되지 않은 continuity의 evidence는 0건이어야 한다.
- `evidence_traceability`: 답변의 사실은 source ID, chapter, scene, code-point offset, source hash로 역추적돼야 한다.
- `revision_scope_guard`: draft/retracted claim을 canonical confirmed fact로 승격하지 않는다.

기존 `alias_disambiguation`은 `entity_retrieval`, `forecast_status`는 `foreshadowing`, `draft_canon_conflict`는 `contradiction`으로 흡수한다.

## 4. Narrative Schema: 구조 → 원고

### 4.1 생성 순서

```text
World Rules
  → Characters + Goals
  → Conflicts
  → Events + Causal Graph
  → Relationship State Transitions
  → Character Knowledge States
  → Timeline + Continuities
  → Foreshadowing Setup/Payoff
  → Chapter/Scene Plan
  → Manuscript
  → Evidence Alignment
  → Retrieval/Reasoning Queries
```

원고에서 임의의 구조를 사후 추출해 gold로 선언하지 않는다. 먼저 구조적 truth를 만들고, 원고가 그 truth를 자연스럽게 표현했는지 검증한다. 평가 대상 RAG에는 manuscript만 제공하고 구조 truth는 scorer만 사용한다.

### 4.2 권장 디렉터리

```text
corpus/<corpus_id>/
  manifest.json
  rights.json
  manuscript/
    chapter_001.txt
  narrative/
    world.json
    characters.jsonl
    goals.jsonl
    conflicts.jsonl
    events.jsonl
    causal_edges.jsonl
    relations.jsonl
    knowledge_states.jsonl
    timeline.jsonl
    foreshadowing.jsonl
    continuities.json
    chapter_plans.jsonl
    scenes.jsonl
  evaluation/
    retrieval_queries.jsonl
    reasoning_queries.jsonl
    answers.jsonl
    evidence.jsonl
    negative_cases.jsonl
  review/
    data_quality_labels.jsonl
    human_review.jsonl
  reports/
    structural_validation.json
    retrieval.json
    reasoning.json
    human_review.md
```

### 4.3 핵심 객체

#### Event

```json
{
  "eventId": "event-017",
  "continuityId": "prime",
  "eventTime": "day-007-evening",
  "narratedIn": [{ "chapter": 7, "sceneId": "scene-007-02" }],
  "participantIds": ["char-seyeon", "char-haejun"],
  "preconditions": ["event-012"],
  "causes": ["event-012"],
  "effects": ["event-023"],
  "canonicalStatus": "confirmed"
}
```

#### Relationship transition

```json
{
  "transitionId": "rel-transition-004",
  "sourceId": "char-seyeon",
  "targetId": "char-haejun",
  "dimension": "trust",
  "before": 0.2,
  "after": -0.6,
  "triggerEventIds": ["event-012", "event-017"],
  "validFromChapter": 12,
  "continuityId": "prime"
}
```

감정, 공식 관계, 정치적 동맹, 가족 관계는 서로 다른 dimension/type으로 저장한다.

#### Character knowledge state

```json
{
  "knowledgeStateId": "knowledge-031",
  "characterId": "char-seyeon",
  "propositionId": "prop-hidden-archive",
  "state": "known",
  "confidence": 0.9,
  "acquiredByEventId": "event-017",
  "validFromChapter": 7,
  "validToChapter": null,
  "continuityId": "prime"
}
```

`unknown`, `suspected`, `believed`, `known`, `misinformed`, `forgotten`을 구분한다. 독자가 아는 사실과 인물이 아는 사실을 합치지 않는다.

#### Foreshadowing

```json
{
  "foreshadowId": "foreshadow-ring-01",
  "setupEvidenceIds": ["evidence-ch003-ring"],
  "reminderEvidenceIds": ["evidence-ch010-ring"],
  "payoffEvidenceIds": ["evidence-ch019-ring"],
  "interpretationBefore": "unknown_artifact",
  "interpretationAfter": "worldline_anchor",
  "status": "resolved"
}
```

### 4.4 정보 분산 난이도

각 scored query는 evidence topology를 가진다.

- `single_hop`: 한 장면에서 직접 회수
- `multi_evidence`: 동일 사실을 2개 이상 evidence로 확인
- `multi_hop`: 사건 A → 인지 B → 결정 C → 관계 변화 D
- `long_range`: 첫 evidence와 마지막 evidence의 chapter distance가 기준 이상
- `cross_viewpoint`: 서로 다른 인물 시점의 evidence 결합
- `cross_worldline`: 명시적으로 허용된 비교 query만 사용

좋은 multi-hop 원고는 구조 라벨을 문장으로 그대로 쓰지 않는다.

```text
금지: “한세연은 윤해준이 정보를 숨겼기 때문에 그를 불신했다.”

허용 예:
3화: 윤해준이 출처를 거짓말한다.
7화: 한세연이 비공개 기록 번호를 발견한다.
12화: 한세연이 윤해준의 제안을 거절한다.
18화: 대화와 행동으로 신뢰 붕괴가 확인된다.
```

## 5. 데이터 품질 분류

`GOOD/BAD/AMBIGUOUS/NOISE`는 모델 답변 등급이 아니라 **데이터 및 평가 사례의 자격 분류**다.

| Label | 정의 | Scored benchmark 사용 |
| --- | --- | --- |
| `GOOD` | 구조 truth, 원고, 질문, 정답, evidence가 정합하고 사람이 한 가지 주된 해석에 합의 | 포함 |
| `BAD` | 구조 충돌, 직접 정답 노출, 잘못된 offset, 불가능한 행동, 근거 없는 정답 등 결함 | 제외·수정 대기 |
| `AMBIGUOUS` | 복수 해석이 가능하거나 evidence만으로 확정할 수 없어 사람 판정이 필요한 사례 | 별도 보고, 임계값 계산 제외 |
| `NOISE` | 의도적 distractor, 반복, 관련 없어 보이는 문장, obsolete draft 등 검색 강건성용 자료 | 원문 후보에는 포함 가능, gold positive로 금지 |

각 라벨은 `reasonCodes`, reviewer, reviewedAt, 대상 revision을 가진다. 자동 validator는 후보 라벨만 제안할 수 있고 `GOOD` 최종 승격은 사람 검수를 요구한다.

필수 reason code 예:

- `DIRECT_GOLD_LEAK`
- `REPEATED_TEMPLATE`
- `BROKEN_CAUSAL_CHAIN`
- `IMPOSSIBLE_CHARACTER_ACTION`
- `UNSUPPORTED_ANSWER`
- `MULTIPLE_VALID_ANSWERS`
- `INTENTIONAL_DISTRACTOR`
- `STALE_DRAFT`

## 6. 단계별 규모 Gate

규모와 장르를 같은 축으로 섞지 않는다. 아래 단계는 **한 작품의 길이·인물·관계 복잡도 축**이다. 이전 단계가 통과하기 전 다음 단계 원고를 만들지 않는다.

| 단계 | 규모 | 기본 범위 | 목적 |
| --- | --- | --- | --- |
| `S` | 소량 | 1작품, 20화, 10~15명, 핵심 관계 3~5개, 주요 사건 20~30개 | schema와 평가 루프 검증 |
| `M` | 중량 | 최대 40화, 15~25명, 장거리 evidence 확대 | 장기 관계·지식 변화 검증 |
| `ML` | 중상 | 최대 60화, 25~35명, 분기 또는 비선형 시간 1개 | 시간·인과·분기 안정성 검증 |
| `L` | 대 | 최대 100화, 40~50명, 복수 장기 arc | 장편 정확도와 운영 성능 검증 |
| `XL` | 한계 | 120화 이상, 60명 이상, 복수 세계선/고밀도 distractor | 성능·메모리·검색 한계 측정 |

범위 숫자는 생성 의무가 아니라 상한 가이드다. S 실측 전 M 이상의 정확도 임계값을 확정하지 않는다.

### 6.1 다음 단계 진입 조건

각 단계는 아래 조건을 모두 만족해야 통과한다.

1. 모든 ID, scope, offset, hash, graph edge가 구조 validator를 통과한다.
2. scored case는 `GOOD`만 포함하고 `AMBIGUOUS/BAD`는 0건이다.
3. `NOISE`는 gold positive evidence와 분리된다.
4. Retrieval 결과가 dense-only, lexical-only, hybrid/full로 각각 보고된다.
5. Reasoning 결과가 oracle-context와 end-to-end로 각각 보고된다.
6. 미래 회차·타 세계선 누출은 0건이다.
7. taxonomy별 실패 원인이 기록되고 aggregate 평균만으로 실패를 숨기지 않는다.
8. 사람 검수자가 질문의 답변 가능성, 행동 개연성, evidence 충분성을 확인한다.
9. 다음 단계의 provisional threshold는 직전 단계 실측과 사람 검수 결과로 작성한다.

Recall@K나 answer accuracy 숫자는 S benchmark와 human review가 완료된 뒤 calibration한다. 근거 없이 사전 고정한 85%·90%를 제품 기준으로 사용하지 않는다.

## 7. 장르 지원 정책

지원 목표 장르는 다음 8개다.

| Genre ID | 장르 | 핵심 narrative stress |
| --- | --- | --- |
| `romance` | 로맨스 | 감정과 공식 관계 분리, 관계 변화 |
| `fantasy` | 판타지 | 세계 규칙, 종족·마법·고유 용어 |
| `contemporary` | 현대물 | 암시적 관계, 사회적 맥락, 일상 대화 |
| `mystery` | 추리 | 단서, 지식 비대칭, 인과, 반전 |
| `regression` | 회귀 | 미래 지식, 분기점, 세계선 격리 |
| `murim` | 무협 | 호칭·별호·문파·사제 계보 |
| `scifi` | SF | 기술 규칙, 비선형 시간, 관측자 차이 |
| `thriller` | 스릴러 | 정보 은닉, 오인, 신뢰할 수 없는 증언 |

### 7.1 확장 순서

- 첫 baseline은 `contemporary` + `romance`를 함께 사용하는 **현대 로맨스 S pack**이다.
- manifest의 장르는 `genres: ["contemporary", "romance"]`로 기록한다. 새 `contemporary_romance` 장르 ID를 만들지 않는다.
- 현대 로맨스는 첫 baseline으로 명시한 조합이며, 임의의 혼합 장르 확장을 허용한다는 뜻이 아니다.
- 다음 장르는 현대 로맨스 S가 통과한 뒤 `mystery` → `regression` → `fantasy` → `thriller` 순으로 각각 S pack을 검증한다.
- 이후 `murim`, `scifi`를 S pack으로 검증한다.
- 어떤 장르도 S를 통과하기 전에 M 이상으로 확대하지 않는다.
- 일반 혼합 장르는 각 단일 장르 baseline이 확보된 뒤 교차 효과를 측정할 때만 추가한다.
- 모든 장르는 동일 taxonomy와 scorer를 사용한다. 장르별 예외 정답 규칙을 만들지 않는다.

### 7.2 장르 × taxonomy coverage

10개 taxonomy의 ID와 query 분류 계약은 공통으로 유지하지만, 첫 S pack에서 10개를 모두 억지로 채우지 않는다. 각 pack은 의도한 coverage와 제외 이유를 기록한다.

첫 현대 로맨스 S pack의 범위는 다음과 같다.

- 핵심 reasoning taxonomy: `relationship_state`, `relationship_change`, `character_knowledge`
- 기본 retrieval taxonomy: `entity_retrieval`, `fact_retrieval`
- 파생 검증 후보: `temporal_order`, `event_causality`
- 첫 S에서 강제하지 않음: `foreshadowing`, `contradiction`, `worldline_isolation`
- 세계선은 `prime` 하나만 사용한다. 첫 S의 목적은 분기 구조가 아니라 기본 관계·지식·근거 흐름 검증이다.

핵심 검증 축은 다음과 같다.

```text
원문 속 발화·행동·사실
  → 각 인물이 그 시점에 아는 것과 오해하는 것
  → 감정 관계와 공식 관계의 현재 상태
  → 사건 이후 관계 상태의 변화
```

이후 장르별 필수 taxonomy는 다음을 기본값으로 삼되, 실제 S blueprint 검수에서 확정한다.

- 추리: `character_knowledge`, `event_causality`, `foreshadowing`
- 회귀: `temporal_order`, `character_knowledge`, `worldline_isolation`
- 판타지: `entity_retrieval`, `fact_retrieval`, `contradiction`
- 스릴러: `character_knowledge`, `contradiction`, `event_causality`
- 무협: `entity_retrieval`, `relationship_state`, `relationship_change`
- SF: `temporal_order`, `fact_retrieval`, `worldline_isolation`

장르 지원은 “해당 장르 원고를 생성했다”가 아니라 해당 S pack의 필수 taxonomy가 retrieval·oracle reasoning·end-to-end 평가를 통과했음을 뜻한다.

## 8. Human Review 의무

우리는 웹소설 작가가 아니다. 따라서 synthetic 구조와 원고에 대해 다음을 직접 주장하지 않고 검수받는다.

- 인물의 행동이 목표·지식·관계 상태와 일치하는가?
- 질문에 답하려면 실제로 지정 evidence를 읽어야 하는가?
- gold가 복수의 타당한 해석을 부당하게 배제하지 않는가?
- 구조 라벨이 원고에 너무 직접 노출되지 않았는가?
- 장르 독자가 보기에 설정·호칭·행동이 최소한 개연적인가?
- 반복 문장이 retrieval을 왜곡하지 않는가?

S 단계는 scored case 전부를 사람 검수한다. 이후 단계의 검수 비율은 S 결과를 바탕으로 정하되, P0 안전 사례와 `AMBIGUOUS` 후보는 전수 검수한다.

## 9. 현재 120화 corpus의 지위

`luie-korean-narrative-gold-120-v1`은 정식 acceptance gold가 아니다.

- 역할: `legacy_stress_noise_fixture`
- 기본 품질 라벨: `NOISE` 또는 미분류
- 사용 가능: 반복 문장에 대한 retrieval 강건성, 대용량 ingestion, offset/hash, 성능·메모리·재현성 회귀
- 사용 금지: Narrative RAG 정확도 임계값 확정, 장르 지원 주장, human-reviewed gold 주장
- 현 validator 41/41 통과 의미: 파일·참조·scope의 구조적 무결성만 확인

이 fixture는 삭제하지 않는다. 실패 사례와 반복 noise가 어떤 검색 오류를 만드는지 비교하는 legacy baseline으로 보존한다.

## 10. 즉시 실행 순서

```text
DONE: 목적과 Retrieval/Reasoning 분리 확정
  → DONE: 10개 taxonomy와 query/evidence 기본 계약 구현
  → DONE: Narrative Benchmark v1 Zod schema와 validator 골격 구현
  → NOW: source hash·query 최소 조건·시간 의미 등 기본 무결성 보강
  → 현대 로맨스 S 단계 1작품 blueprint 작성
  → blueprint 사람 검수
  → 구조에서 20화 이하 원고 생성
  → GOOD/BAD/AMBIGUOUS/NOISE 분류
  → Retrieval benchmark
  → Oracle reasoning benchmark
  → End-to-end RAG benchmark
  → 실패 원인 수정
  → 같은 규모의 다음 장르
  → 모든 선행 gate 통과 후에만 규모 확장
```

첫 신규 benchmark는 `contemporary` + `romance` 현대 로맨스 S pack으로 고정한다. `원문 속 발화·행동·사실 → Character Knowledge State → Relationship State → Relationship Change`를 하나의 연결된 기본 축으로 검증한다. 첫 pack은 `prime` 단일 세계선과 20화 이하 범위만 사용하며, 실제 원고 생성은 기본 validator와 query 계약이 승인된 뒤에만 시작한다.

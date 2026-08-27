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

가장 중요한 세 축:

```text
Character Knowledge
→ Relationship Change
→ Long-range Causality
```

### Step 3. 첫 S 단계 Blueprint를 만든다

처음부터 20화를 모두 채우지 않는다. 필요한 만큼만 사용하고 20화를 상한으로 둔다.

- 장르: 추리
- 규모: 20화 이하
- 인물: 10~15명
- 핵심 관계: 3~5개
- 주요 사건: 20~30개
- 세계선: 1개

이 단계에서는 원고가 아니라 사건·관계·지식 변화 구조만 작성한다.

### Step 4. Blueprint를 사람이 검수한다

통과하지 못하면 원고를 만들지 않는다.

### Step 5. 구조를 바탕으로 원고를 만든다

금지 예:

> 한세연은 윤해준이 정보를 숨겼기 때문에 그를 불신했다.

허용 예:

```text
3화: 윤해준이 기록 출처를 거짓말한다.
7화: 한세연이 비공개 기록 번호를 발견한다.
12화: 한세연이 윤해준의 제안을 거절한다.
18화: 대화와 행동으로 신뢰 붕괴가 드러난다.
```

정답을 한 문장에 노출하지 않고 여러 장면에 분산한다.

### Step 6. Query와 Gold를 만든다

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

### Step 7. 데이터를 분류한다

| Label | 의미 | 점수 계산 |
| --- | --- | --- |
| `GOOD` | 사람 검수까지 통과 | 포함 |
| `BAD` | 구조·원고·정답에 결함 | 제외 |
| `AMBIGUOUS` | 답이 여러 개일 수 있음 | 제외 후 재검수 |
| `NOISE` | 의도적 distractor·반복 자료 | 정답 evidence로 사용 금지 |

### Step 8. Benchmark를 순서대로 실행한다

1. Dense-only retrieval
2. Lexical-only retrieval
3. Hybrid/full retrieval
4. Oracle-context reasoning
5. End-to-end RAG
6. Taxonomy별 실패 분석

전체 평균만 보지 않는다. Character Knowledge가 실패했는데 쉬운 Fact Retrieval 점수로 가려지면 안 된다.

### Step 9. 장르를 하나씩 추가한다

```text
추리 → 회귀 → 로맨스 → 판타지 → 스릴러
→ 현대물 → 무협 → SF
```

각 장르는 먼저 S 단계에서 검증한다. 해당 장르가 S를 통과하기 전에 M 이상으로 키우지 않는다.

### Step 10. 크기를 한 단계씩 늘린다

```text
S  소량: 20화 이하
M  중량: 40화 이하
ML 중상: 60화 이하
L  대:   100화 이하
XL 한계: 120화 이상
```

앞 단계의 실패 원인을 고치고 검수를 완료한 뒤에만 다음 단계로 이동한다.

## 3. 사람 검수

사람 검수는 세 번 한다.

### A. Blueprint 검수 — 원고 작성 전

확인할 것:

- 인물의 행동이 목표와 일치하는가?
- 그 시점에 인물이 실제로 그 정보를 알고 있는가?
- 관계 변화의 원인이 충분한가?
- 사건의 원인과 결과가 연결되는가?
- 복선이 나중에 회수되는가?
- 질문에 필요한 evidence가 계획에 존재하는가?

하나라도 핵심 문제가 있으면 원고 생성을 중지하고 blueprint를 수정한다.

### B. Manuscript 검수 — 원고 작성 후

확인할 것:

- 구조화된 정답을 문장으로 그대로 노출하지 않았는가?
- 대화와 행동으로 추론할 수 있는가?
- 반복 padding이 없는가?
- 등장인물이 모르는 정보를 사용하지 않는가?
- 장르 독자가 보기에 행동과 설정이 최소한 개연적인가?
- 특정 상업 작품의 표현이나 설정을 복제하지 않았는가?

### C. Query/Gold 검수 — Benchmark 실행 전

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

> **10개 taxonomy, Narrative Schema, Retrieval/Reasoning Query, Human Review Record를 JSON Schema 또는 Zod로 구현한다.**

이 schema와 validator가 통과한 뒤에만 첫 추리 S 단계 blueprint를 만든다.

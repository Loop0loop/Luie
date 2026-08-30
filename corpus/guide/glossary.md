# 어휘 사전

> 인수인계 가이드: [README.md](./README.md)

이 프로젝트 문서에 나오는 용어를 개발자 기준으로 정리한다. 문학 용어가 아니라 **테스트 데이터 용어**로 읽으면 된다.

## 저장소와 버전

| 용어 | 뜻 | 실제 위치 |
| --- | --- | --- |
| corpus | 시험 데이터 한 세트. 작품 하나 단위 | `corpus/contemporary-romance-s-001/` |
| manifest | corpus 메타데이터. 장르, 규모, 승인 상태 | `manifest.json` |
| blueprint | 사람이 읽는 기획서. 구조화 전 단계 | `narrative/blueprint.md` |
| revision | 레코드나 파일 내용의 SHA-256 | 각 JSONL의 `revision` 필드 |
| plan revision digest | truth 15개 파일을 이어붙인 SHA-256 | `85b04eaa…` |
| stale | 대상 revision이 바뀌어 기존 검수가 무효가 된 상태 | |
| gate | 다음 단계로 넘어가기 전 통과해야 하는 관문 | A(설계) → B(계획) → C(원고) → D(질문) |
| scaleTier | 규모 단계 | `S`(20화) `M`(40) `ML`(60) `L`(100) `XL`(120+) |
| `benchmarkEligibility` | 이 데이터로 정확도를 주장해도 되는지 | 현재 `false` |
| `humanReviewStatus` | 사람 검수 상태 | 현재 `approved` (blueprint 기준) |

## 스토리 데이터 (기대값 테이블)

| 용어 | 뜻 | 주의할 점 |
| --- | --- | --- |
| world rule | 세계 규칙 | |
| character | 인물. 별칭·호칭 포함 | 동명이인·별칭이 `entity_retrieval` 시험 대상 |
| goal | 인물의 목표 | 행동이 목표와 맞는지 검수 대상 |
| conflict | 갈등 축 | |
| **event** | 일어난 일. 시각·참여자·전제·결과를 가진다 | 사실(proposition)과 구분 |
| **proposition** | 참/거짓이 정해진 사실 명제 | 사건과 구분. "그 공지는 위반이다" |
| causal edge | 사건 간 인과. 방향이 있다 | 그래프는 비순환이어야 한다 |
| **relationship state** | 시점 구간별 관계 값 | 방향(A→B)과 차원(dimension)별로 따로 |
| dimension | 관계의 종류 | `trust`, `affection`, `official_status`, `mentorship` |
| **relationship transition** | 관계가 바뀌는 지점 | before/after 상태와 trigger 사건을 가진다 |
| **knowledge state** | 인물이 그 사실을 아는지 | 독자가 아는 것과 절대 합치지 않는다 |
| timeline | 사건 시각 ↔ 서술 회차 매핑 | |
| chapter plan | 화별 계획 | 클리프행어는 내부 메모. 원고에 그대로 쓰면 안 됨 |
| scene | 장면 | 현재 화당 2개 |
| continuity / worldline | 세계선. 분기된 평행 truth 집합 | 이 pack은 `prime` 하나뿐 |

### knowledge state의 6가지 값

| 값 | 뜻 |
| --- | --- |
| `unknown` | 모른다 |
| `suspected` | 의심한다 |
| `believed` | 믿는다 |
| `known` | 안다 |
| `misinformed` | 잘못 안다 |
| `forgotten` | 잊었다 |

`misinformed`가 이 pack의 핵심이다. 유건은 7~11화에 자기 절차 위반을 위반이 아니라고 오인한다.

### 구간 규칙

관계 상태와 지식 상태는 `validFromChapter` ~ `validToChapter` 구간을 가진다. `validToChapter: null`은 끝까지라는 뜻이다.

두 가지를 모두 만족해야 한다.

- **중첩 금지**: 같은 방향·차원에 두 상태가 겹치면 안 된다
- **공백 금지**: 그 사이 회차에 상태가 없으면 안 된다. 없으면 그 시점 질문에 정답이 없다

## 문제와 정답

현재 `evaluation/` 폴더는 비어 있다. 원고를 쓴 뒤(step 10) 만든다.

| 용어 | 뜻 |
| --- | --- |
| **evidence** | 원고의 실제 인용 구간. 파일 + 시작offset + 끝offset + 원본 해시 |
| planned evidence | 근거가 놓일 **자리**만 선언한 계획. 실제 evidence 아님 |
| evidence alignment | 원고에 실제 offset을 붙여 planned를 실물로 바꾸는 작업 |
| retrieval query | 검색만 시험하는 질문 |
| reasoning query | 추론까지 시험하는 질문 |
| gold answer | 기대 정답 |
| required evidence | 정답에 반드시 필요한 근거 목록 |
| forbidden evidence | 나오면 안 되는 근거 (미래 회차, 다른 세계선) |
| distractor | 의도적으로 섞는 방해 자료 |

## 질문 유형 (taxonomy) 10종

모든 질문은 정확히 하나를 primary로 갖는다.

| ID | 측정 대상 | 이 pack에서 |
| --- | --- | --- |
| `entity_retrieval` | 인물·별칭·동명이인 식별 | 사용 |
| `fact_retrieval` | 특정 시점의 단일 사실 | 사용 |
| `relationship_state` | 시점 T의 관계 상태 | 사용 (핵심) |
| `relationship_change` | 관계 변화 과정과 원인 | 사용 (핵심) |
| `character_knowledge` | 인물별 앎·모름·오인 | 사용 (핵심) |
| `temporal_order` | 사건 발생·서술 순서 | **제외** |
| `event_causality` | 원인 → 중간 → 결과 | 파생 후보 |
| `foreshadowing` | 단서의 제시·재해석·회수 | 제외 |
| `contradiction` | 주장·기록·정본 간 충돌 | 제외 |
| `worldline_isolation` | 분기별 독립 truth | 제외 (`prime` 하나) |

### temporal_order를 제외한 이유

시계가 두 개다. 사건이 실제 일어난 시각과 원고에 서술된 순서다. 소설은 회상·뒤늦은 폭로로 이 둘이 어긋난다. RAG가 그것을 구분하는지 보는 게 이 질문 유형이다.

그런데 이 pack은 16개 사건의 시각 순서와 회차 순서가 완전히 같고 timeline이 전부 `present`다. 그러면 "무엇이 먼저냐"는 회차 번호 비교로 끝난다. **이미 정렬된 배열로 정렬 함수를 시험하는 것**과 같아서 통과해도 아무것도 증명되지 않는다. 비선형 시간은 회귀·SF pack에서 검증한다.

## 정보 분산 난이도 (evidence topology)

각 질문은 근거가 어떻게 흩어져 있는지로 난이도가 정해진다.

| 유형 | 뜻 |
| --- | --- |
| `single_hop` | 한 장면에서 직접 회수 |
| `multi_evidence` | 같은 사실을 2개 이상 근거로 확인 |
| `multi_hop` | 사건 A → 인지 B → 결정 C → 관계 변화 D |
| `long_range` | 첫 근거와 마지막 근거의 회차 거리가 기준 이상 |
| `cross_viewpoint` | 서로 다른 인물 시점 근거 결합 |
| `cross_worldline` | 명시적으로 허용된 비교 질문만 |

전부 `single_hop`이면 단순 조회만 시험하는 셈이다. 그래서 근거를 여러 회차에 분산한다. 현재 27개 truth 그룹 중 19개(70%)가 근거 2건 이상이고, 10화 이상 떨어진 장거리가 3건이다.

## 평가 방식

**검색 실패와 LLM 실패를 절대 섞지 않는다.** 이게 이 프로젝트 설계의 핵심이다.

| 시험 | 뭘 재나 | LLM 사용 | 개발자 비유 |
| --- | --- | --- | --- |
| Retrieval | 필요한 원문을 Top-K에 넣었나 | 안 함 | 쿼리 레이어 단위 테스트 |
| Oracle Reasoning | 정답 근거를 직접 주입하고 추론만 시험 | 함 | 의존성 mock 후 로직만 테스트 |
| End-to-end | 검색부터 답변까지 전체 | 함 | 통합 테스트 |

Retrieval은 네 가지로 나눠 각각 기록한다.

| 실행 | 내용 |
| --- | --- |
| dense-only | 임베딩 모델 단독 |
| lexical-only | 이름·별칭·고유 용어 exact 검색 |
| hybrid | dense + lexical |
| full | hybrid + metadata/시간/세계선 필터 + graph + reranker |

### 실패 원인 판정표

| Retrieval | Oracle | E2E | 판정 |
| --- | --- | --- | --- |
| 실패 | 성공 가능 | 실패 | retriever 또는 임베딩 문제 |
| 성공 | 실패 | 실패 | reasoner/프롬프트/모델 문제 |
| 성공 | 성공 | 실패 | 컨텍스트 조립·rerank·budget 문제 |
| 성공 | 성공 | 성공 | 통과 |

### 지표

| 지표 | 대상 |
| --- | --- |
| Recall@K, MRR, nDCG@K, Hit Rate | Retrieval |
| forbidden evidence rate | Retrieval (미래 회차·타 세계선 비율) |
| answer correctness | Reasoning |
| evidence correctness | Reasoning |
| faithfulness / unsupported claim rate | Reasoning (근거 없는 주장) |
| required evidence coverage | Reasoning |
| multi-hop completion rate | Reasoning |
| uncertainty calibration | Reasoning (모른다고 말해야 할 때 말하는지) |
| future / worldline leakage count | 공통 (0이어야 함) |

전체 평균만 보지 않는다. `character_knowledge`가 실패했는데 쉬운 `fact_retrieval` 점수로 가려지면 안 된다.

## 데이터 품질 라벨

모델 성능 등급이 아니라 **데이터 자격 등급**이다.

| 라벨 | 뜻 | 점수 계산 |
| --- | --- | --- |
| `GOOD` | 구조·원고·질문·정답·근거가 정합하고 사람이 한 해석에 합의 | 포함 |
| `BAD` | 구조 충돌, 정답 노출, 잘못된 offset, 불가능한 행동 등 결함 | 제외 |
| `AMBIGUOUS` | 복수 해석 가능. 사람 판정 필요 | 별도 보고, 임계값 계산 제외 |
| `NOISE` | 의도적 방해·반복·obsolete draft | 검색 후보엔 포함 가능, 정답 근거로 금지 |

자동 validator는 후보 라벨만 제안할 수 있다. **`GOOD` 최종 승격은 사람 검수를 요구한다.**

### reason code

라벨에 붙이는 사유 코드다.

| 코드 | 뜻 |
| --- | --- |
| `DIRECT_GOLD_LEAK` | 정답이 원고에 그대로 노출됨 |
| `REPEATED_TEMPLATE` | 반복 문장 패턴 |
| `BROKEN_CAUSAL_CHAIN` | 인과 사슬이 끊김 |
| `IMPOSSIBLE_CHARACTER_ACTION` | 인물이 할 수 없는 행동 |
| `UNSUPPORTED_ANSWER` | 근거 없는 정답 |
| `MULTIPLE_VALID_ANSWERS` | 타당한 답이 여러 개 |
| `INTENTIONAL_DISTRACTOR` | 의도적 방해 자료 |
| `STALE_DRAFT` | 낡은 draft |

## 불변조건 (cross-cutting invariant)

taxonomy가 아니라 **모든 질문에 적용되는 조건**이다.

| 이름 | 내용 |
| --- | --- |
| `future_leakage_guard` | 허용 회차 이후의 근거·사실은 0건 |
| `worldline_scope_guard` | 허용되지 않은 세계선 근거는 0건 |
| `evidence_traceability` | 답변의 사실은 source ID, 회차, 장면, offset, 해시로 역추적 가능 |
| `revision_scope_guard` | draft·철회된 주장을 확정 사실로 승격하지 않음 |

## 사람 검수 4회

| gate | 시점 | 확인 대상 |
| --- | --- | --- |
| A | blueprint 작성 후 | 인물 행동, 관계 변화 원인, 인과 연결 |
| **B** | 계획 작성 후 ◀ 현재 | 사건 밀도, 지식 취득 시점, 관계 전이, 근거 배치 |
| C | 원고 작성 후 | 정답 노출, 추론 가능성, 반복 padding |
| D | 질문 작성 후 | 답변 가능성, 근거 충분성, 복수 해석 여부 |

### 역할

| 역할 | 담당 |
| --- | --- |
| Narrative reviewer | 인물 행동, 관계, 사건 개연성 |
| Benchmark reviewer | 질문, 정답, 근거 정합성 |
| Adjudicator | 두 검수자 의견이 다를 때 최종 판정 |

한 사람이 여러 역할을 맡아도 되지만 어떤 관점으로 검수했는지는 기록해야 한다.

## 장르 8종과 확장 순서

| Genre ID | 장르 | 핵심 시험 축 |
| --- | --- | --- |
| `contemporary` | 현대물 | 암시적 관계, 사회적 맥락, 일상 대화 |
| `romance` | 로맨스 | 감정과 공식 관계 분리, 관계 변화 |
| `mystery` | 추리 | 단서, 지식 비대칭, 인과, 반전 |
| `regression` | 회귀 | 미래 지식, 분기점, 세계선 격리 |
| `fantasy` | 판타지 | 세계 규칙, 종족·마법·고유 용어 |
| `thriller` | 스릴러 | 정보 은닉, 오인, 신뢰할 수 없는 증언 |
| `murim` | 무협 | 호칭·별호·문파·사제 계보 |
| `scifi` | SF | 기술 규칙, 비선형 시간, 관측자 차이 |

첫 baseline은 `contemporary` + `romance` 조합이다. 새 `contemporary_romance` 장르 ID를 만들지 않는다. 이후 `mystery` → `regression` → `fantasy` → `thriller` → `murim` → `scifi` 순으로 각각 S pack을 검증한다.

**어떤 장르도 S를 통과하기 전에 M 이상으로 키우지 않는다.** 모든 장르는 같은 taxonomy와 채점기를 쓴다. 장르별 예외 정답 규칙을 만들지 않는다.

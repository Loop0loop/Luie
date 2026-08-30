# Narrative RAG Benchmark 인수인계 가이드

> 대상: 이 작업을 처음 인수받는 개발자
> 기준일: 2026-08-30
> 어휘 사전: [glossary.md](./glossary.md)
> 설계 원본(SSOT): [../../docs/architecture/narrative-rag-benchmark-ssot.md](../../docs/architecture/narrative-rag-benchmark-ssot.md)
> 실행 순서 가이드: [../../docs/guides/narrative-rag-benchmark-workflow.md](../../docs/guides/narrative-rag-benchmark-workflow.md)

## 1. 이건 뭐 하는 작업인가

**RAG 시스템을 시험할 테스트 데이터를 만드는 작업이다.** 소설을 잘 쓰는 것이 목표가 아니다.

측정 대상은 하나다.

> 긴 이야기에서 인물 기억, 사실, 관계 변화, 시간 순서, 인과, 지식 비대칭, 복선, 충돌, 세계선 정보를 검색이 얼마나 회수하고 RAG가 얼마나 근거 있게 추론하는가.

개발자 용어로 매핑하면 이렇다.

```text
소설 원고        → 시험 대상 시스템에 넣는 입력 문서
구조화된 truth   → 기대값 테이블 (expected)
질문 + 정답      → 테스트 케이스
평가 실행        → 테스트 러너
```

"12화 시점 두 사람의 관계는?"에 RAG가 제대로 답하는지 재려면 정답을 우리가 먼저 알고 있어야 한다. 그래서 **정답 테이블을 먼저 만들고 원고를 나중에 쓴다.** 순서가 거꾸로처럼 보이지만, 원고를 먼저 쓰면 정답이 무엇인지 우리도 확정할 수 없다.

### 왜 문학적 완성도를 따지나

점수화하지는 않는다. 다만 인물이 그 시점에 모르는 정보로 행동하거나 관계 변화에 원인이 없으면 **정답 자체가 틀린 테스트 케이스**가 된다. 그래서 사람 검수를 넣는다.

## 2. 절대 규칙 다섯 개

이걸 어기면 결과 숫자가 무의미해진다.

1. **검색 점수와 LLM 점수를 하나로 합치지 않는다.** 검색 실패와 추론 실패를 구분할 수 없게 된다.
2. **정답을 원고에 문장으로 그대로 쓰지 않는다.** 검색이 그 한 문장만 찾으면 끝나서 시험이 무의미해진다.
3. **구조 truth를 평가 대상 RAG에 주지 않는다.** RAG에는 원고만 준다. truth는 채점기만 본다.
4. **원고에서 사후 추출한 구조를 정답으로 선언하지 않는다.** truth를 먼저 만들고 원고가 그것을 표현했는지 검증한다.
5. **사람 검수 전에 정확도 임계값을 확정하지 않는다.** 85%, 90% 같은 숫자를 근거 없이 제품 기준으로 쓰지 않는다.

## 3. 지금 어디까지 됐나

12단계 중 8단계가 끝났고 gate B 사람 검수에서 멈춰 있다.

```text
1~4  평가 계약을 코드로 (스키마 + validator + 테스트)   완료
5    디렉터리 구조                                      완료
6    blueprint 작성                                     완료
7    blueprint 사람 검수 (조건부 통과, 60/100)          완료
8    구조화된 truth + 화별 계획                         완료
───── gate B 사람 검수 ◀ 현재 여기서 대기
9    원고 16화 작성                                     미착수
10   evidence 좌표 + 질문/정답 작성                     미착수
11   원고·질문 사람 검수                                미착수
12   Retrieval → Oracle → End-to-end 평가               미착수
```

작업 중인 corpus는 하나다.

| 항목 | 값 |
| --- | --- |
| 경로 | `corpus/contemporary-romance-s-001/` |
| 제목 | 마감 뒤에 남는 사람 |
| 장르 | `["contemporary", "romance"]` (현대 로맨스) |
| 규모 | `S` 등급, 16화 (S는 20화 상한) |
| 세계선 | `prime` 하나 |
| blueprint revision | `a99c5ed0d76aa518e36a7d643f329fa71f83a7044f87a172239e8ca6e83e7cd2` |
| plan revision digest | `85b04eaa73a04e1c91ebe148c2e9d47da63fe8fde3afe91d517bd68e792e4c53` |
| `humanReviewStatus` | `approved` (blueprint 기준. plan 검수는 아직 `PENDING`) |
| `benchmarkEligibility` | `false` |

`benchmarkEligibility: false`는 **이 데이터로 어떤 정확도 주장도 하면 안 된다**는 뜻이다. 질문/정답 사람 검수까지 통과한 뒤에만 `true`가 될 수 있다.

## 4. 파일이 어디에 뭐가 있나

```text
corpus/
  guide/                          ← 이 문서
    README.md
    glossary.md
  AGENTS.md                       ← 에이전트/작업자 규칙
  contemporary-romance-s-001/
    manifest.json                 승인 상태와 메타데이터
    rights.json                   권리·비모방 경계
    research.md                   현대 로맨스 시장 조사 기록
    README.md                     이 corpus의 현재 상태
    narrative/
      blueprint.md                사람이 읽는 기획서 (검수 통과분)
      *.json / *.jsonl            구조화된 truth 15개 파일
    tools/
      generate-plan.mjs           truth를 만드는 결정적 생성기
    manuscript/                   원고 (아직 없음)
    evaluation/                   질문·정답·evidence (아직 없음)
    review/                       검수 레코드 (아직 없음)
    reports/
      human_review.md             blueprint + plan 검수 기록
```

평가 계약 코드는 corpus 밖에 있다.

| 위치 | 역할 |
| --- | --- |
| `src/shared/schemas/narrative-benchmark/` | 레코드 단위 Zod 스키마 (형태 검증) |
| `src/shared/validation/narrative-benchmark/` | 객체 간 정합성 validator (관계 검증) |
| `tests/shared/narrative-benchmark/` | 위 두 개의 회귀 테스트 + corpus 검증 |

## 5. 구조화된 truth 파일

전부 `corpus/contemporary-romance-s-001/narrative/`에 있다. JSONL은 한 줄이 한 레코드다.

| 파일 | 개수 | 내용 |
| --- | --- | --- |
| `world.json` | 규칙 6 | 세계 규칙 |
| `continuities.json` | 1 | 세계선 (`prime`만) |
| `characters.jsonl` | 5 | 인물과 별칭 |
| `goals.jsonl` | 7 | 인물별 목표 |
| `conflicts.jsonl` | 4 | 갈등 축 |
| `propositions.jsonl` | 9 | 참/거짓이 정해진 사실 명제 |
| `events.jsonl` | 16 | 사건 (시각·참여자·전제·결과) |
| `causal_edges.jsonl` | 16 | 사건 간 인과 (비순환) |
| `relations.jsonl` | 21 | 관계 상태 구간 |
| `relationship_transitions.jsonl` | 15 | 관계가 바뀌는 지점과 원인 |
| `knowledge_states.jsonl` | 22 | 인물별 지식 상태 구간 |
| `timeline.jsonl` | 16 | 사건 시각 ↔ 서술 회차 매핑 |
| `chapter_plans.jsonl` | 16 | 화별 계획 |
| `scenes.jsonl` | 32 | 장면 (화당 2개) |
| `planned_evidence.jsonl` | 86 | 근거가 놓일 자리 (계획, 실제 evidence 아님) |

### 헷갈리기 쉬운 네 가지 구분

이걸 섞으면 이 프로젝트의 의미가 사라진다. RAG가 틀리는 지점이 정확히 여기다.

| 타입 | 뜻 | 예시 |
| --- | --- | --- |
| event | 일어난 일 | 7화: 유건이 단독으로 중단 공지를 발송 |
| proposition | 참인 사실 | "그 공지는 합의 위반이다" |
| knowledge state | 각 인물이 그것을 아는지 | 서린은 7~8화에 모름, 9화에 의심, 12화에 확신 |
| relationship state | 시점별 관계 값 | 서린→유건 신뢰: 9~11화 -0.6, 12화부터 0.4 |

사실이 참인 것과 인물이 그것을 아는 것은 다르다. 독자가 아는 것과 인물이 아는 것도 다르다. LLM은 이 셋을 자주 합친다.

### 이 corpus의 핵심 평가 계약

수리·안전이라는 소재가 아니라 **부분 정합성**이 시험 대상이다.

```text
긴급 중단 판단은 정당함
+ 공동 확인 없는 후속 공지는 절차 위반임
+ 제한된 정보를 가진 상대의 의심은 설명 가능함
+ 확인 전 공개 단정은 과잉임
```

네 개가 동시에 참이다. "누가 나쁜가"로 환원되지 않는다. RAG가 하나만 회수하고 나머지를 부정하면 실패다.

## 6. 데이터를 어떻게 고치나

**JSONL을 직접 편집하지 않는다.** 생성기를 고치고 재실행한다.

```bash
node corpus/contemporary-romance-s-001/tools/generate-plan.mjs
```

생성기 안의 정의 테이블만 손대면 된다.

| 테이블 | 무엇을 정의하나 |
| --- | --- |
| `SPINE` | 화 번호, 제목, 사건, 시각, 클리프행어 |
| `eventDefs` | 사건 16개 |
| `causalDefs` | 인과 edge 16개 |
| `relStateDefs` | 관계 상태 구간 |
| `transitionDefs` | 관계 전이 |
| `knowledgeDefs` | 인물별 지식 상태 |
| `propositions` | 사실 명제와 근거 배치 |
| `planEvidence()` | 근거가 놓일 자리 등록 헬퍼 |

생성기는 결정적이다. 몇 번 돌려도 바이트 단위로 같은 결과가 나온다. 이게 깨지면 재현성이 없어지므로 랜덤·타임스탬프를 넣지 않는다.

### 고치면 digest가 바뀐다

`narrative/`의 15개 파일을 정해진 순서로 이어붙인 SHA-256이 plan revision digest다. 사람 검수는 이 digest에 묶인다. **데이터를 고치면 기존 검수는 무효(stale)가 되고 재검수가 필요하다.**

digest는 5곳에 적혀 있고 전부 같아야 한다.

1. `tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts` (자동 검증)
2. `docs/architecture/narrative-rag-benchmark-ssot.md`
3. `docs/guides/narrative-rag-benchmark-workflow.md`
4. `corpus/contemporary-romance-s-001/README.md`
5. `corpus/contemporary-romance-s-001/reports/human_review.md`

데이터를 고치면 테스트가 먼저 실패한다. 그때 문서 4곳을 같이 갱신한다. 새 값 계산은 이렇게 한다.

```bash
cd corpus/contemporary-romance-s-001/narrative
cat continuities.json world.json characters.jsonl goals.jsonl conflicts.jsonl \
    propositions.jsonl events.jsonl causal_edges.jsonl relations.jsonl \
    relationship_transitions.jsonl knowledge_states.jsonl timeline.jsonl \
    chapter_plans.jsonl scenes.jsonl planned_evidence.jsonl | shasum -a 256
```

## 7. 개발자가 확인할 것

### 매번 돌릴 명령

```bash
# 구조 검증 전체 (74개 테스트)
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/shared/narrative-benchmark

# 이 corpus만 (7개 테스트)
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts

# 타입
pnpm run typecheck

# 생성기 결정성 확인
cd corpus/contemporary-romance-s-001
cp -R narrative /tmp/before && node tools/generate-plan.mjs && diff -rq /tmp/before narrative
```

### 테스트 파일별 담당 범위

| 파일 | 검증 대상 |
| --- | --- |
| `schema.test.ts` | 레코드 형태 (Zod) |
| `acceptance.test.ts` | corpus 전체 정합성 |
| `narrative.test.ts` | 인과 비순환, 관계 전이, 지식 취득 시점 |
| `manuscript.test.ts` | 원고와 chapter/scene/timeline 정합 |
| `scope.test.ts` | 미래 회차·세계선 범위 |
| `gold.test.ts` | 정답 타입 계약 |
| `guardrails.test.ts` | 공통 불변조건 |
| `hash.test.ts` | SHA-256 / offset |
| `review.test.ts` | 검수 레코드 생애주기, 충돌, stage-target |
| `contracts.test.ts` | 단계 전이 계약 |
| `coverage.test.ts` | 현대 로맨스 필수 taxonomy 충족 |
| `plan-contemporary-romance-s-001.test.ts` | **실제 corpus 데이터** 검증 |

마지막 하나만 실제 corpus를 읽는다. 나머지는 작은 fixture로 validator 자체를 시험한다.

### 데이터를 고쳤을 때 확인 순서

1. 생성기 재실행 → 결정성 확인
2. `plan-…test.ts` 실행 → digest 실패는 정상, 그 외 실패는 결함
3. 전체 스위트 실행 → 다른 corpus/fixture 회귀 없는지
4. 새 digest 계산 → 문서 4곳 갱신
5. `reports/human_review.md`에 무엇을 왜 바꿨는지 기록
6. 검수 상태를 `PENDING`으로 되돌렸는지 확인

### 자동 검증이 잡지 못하는 것

validator는 "구조가 깨졌나"만 본다. 다음은 코드로 판정되지 않으므로 사람이 봐야 한다.

- 인물 행동이 목표·지식·관계 상태와 맞는지
- 질문에 답하려면 실제로 지정 evidence를 읽어야 하는지
- 정답이 다른 타당한 해석을 부당하게 배제하지 않는지
- 구조 라벨이 원고에 너무 직접 노출되지 않았는지
- 반복 문장이 검색 결과를 왜곡하지 않는지

### 과거에 실제로 놓쳤던 결함

같은 유형이 재발하기 쉬우니 참고한다.

| 결함 | 왜 안 잡혔나 | 지금은 |
| --- | --- | --- |
| 관계 상태 12~15화 공백 | validator가 구간 **중첩**만 검사하고 **공백**은 안 봤음 | `relationship.ts`에 인접성 검사 추가 |
| 지식 상태 구간 공백 | 명제 성립 시점 개념이 스키마에 없음 | plan 테스트에서 커버리지 검사 |
| 근거가 대부분 단일 회차 | 검사 항목 자체가 없었음 | plan 테스트에서 분산 하한 검사 |

공통 패턴은 **"어떤 회차에 대해 기대값이 없는데 통과한다"**다. 새 truth 타입을 추가할 때 구간 커버리지를 먼저 생각한다.

## 8. 다음에 할 일 (gate B)

원고를 만들기 전에 사람이 계획을 검수해야 한다. 확인 항목은 `corpus/contemporary-romance-s-001/reports/human_review.md`에 있고, 핵심은 세 가지다.

1. 유건이 7~11화 동안 자기 절차 위반을 위반으로 인식하지 못하는 것이 개연적인가. 12화 인정이 갑작스럽지 않은가.
2. 서린이 5~7화에 대체안 논의를 전혀 접하지 못하는 배치가 자연스러운가.
3. 추가된 확인 근거들이 원고에서 정답 문장 반복이 되지 않고 행동·발화로 표현 가능한가.

이 검수가 통과하기 전에 `manuscript/chapter_*.txt`를 만들지 않는다.

### 원고를 쓸 때의 제약

gate B가 통과하면 원고 작업이 시작된다. 미리 알아둘 제약은 두 개다.

`chapter_plans.jsonl`의 클리프행어 문장은 **내부 계획용이며 원고에 그대로 쓰면 안 된다.** 예를 들어 12화 계획에는 "유건은 안전을 변명으로 쓰지 않고 단독 공지의 책임을 먼저 인정했다"가 있는데, 이 문장이 원고에 들어가면 검색이 이 한 줄만 찾으면 끝난다. 대화와 행동으로 분산해야 한다.

현재 계획은 16화 전부 사건 1개, 장면 2개로 균일하다. 원고에서 분량과 장면 수를 다르게 해 반복 패턴을 줄인다.

## 9. 이 pack에서 다루지 않는 것

| 항목 | 이유 |
| --- | --- |
| `temporal_order` (시간 순서) | 사건 시각과 서술 회차가 완전히 같은 순서라 회차 번호 비교로 답이 나옴. 비선형 시간은 `regression`·`scifi` pack에서 검증 |
| `foreshadowing` (복선) | 첫 S에서 강제하지 않음 |
| `contradiction` (모순) | 첫 S에서 강제하지 않음 |
| `worldline_isolation` (세계선 격리) | `prime` 하나뿐이므로 해당 없음 |

이 pack이 실제로 시험하는 것은 5개다. `entity_retrieval`, `fact_retrieval`, `relationship_state`, `relationship_change`, `character_knowledge`.

## 10. 기존 120화 corpus의 지위

`luie-korean-narrative-gold-120-v1`은 **정식 gold가 아니다.**

- 역할: `legacy_stress_noise_fixture`
- 써도 되는 곳: 반복 문장에 대한 검색 강건성, 대용량 ingestion, offset/hash, 성능·메모리 회귀
- 쓰면 안 되는 곳: 정확도 임계값 확정, 장르 지원 주장, 사람 검수 gold 주장

삭제하지 않는다. 반복 noise가 어떤 검색 오류를 만드는지 비교하는 baseline으로 보존한다.

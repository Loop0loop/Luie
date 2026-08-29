# Human Review — Blueprint

- corpus ID: `contemporary-romance-s-001`
- review stage: `blueprint`
- reviewed at: `2026-08-28T13:58:59.260+09:00`
- reviewer type: `human-user`
- reviewed revision: `a99c5ed0d76aa518e36a7d643f329fa71f83a7044f87a172239e8ca6e83e7cd2`
- decision: `GOOD`
- confidence/completeness note: `60/100`
- gate result: chapter/scene plan 진입 허용, manuscript 생성은 아직 금지

## 유지하기로 한 구조

```text
premise
→ character goals / flaws
→ conflict
→ propositions
→ knowledge state
→ events
→ relationship state
→ evidence affordance
→ taxonomy
```

특히 `prop-halt-cause`가 참이어도 `prop-process-breach`가 거짓이 되지 않는 부분 정합성 설계를 핵심 평가 가치로 승인했다.

## 검수자가 요구한 보강

1. 독자 premise에서 과거 손상과 현재 반복 패턴의 정답을 노출하지 않는다.
2. blueprint schema와 개별 story instance를 분리한다.
3. Event, Canonical Fact, Interpretation, Character Knowledge, Relationship State의 책임을 엄격히 나눈다.
4. 기존 16개 사건의 인과 spine은 유지한다.
5. 수리·안전 소재가 아니라 `정당한 결정 + 잘못된 절차`가 재사용 추론 계약임을 명시한다.
6. 후속 pack은 같은 schema를 다른 story instance로 독립 구현할 수 있게 한다.
7. 사람 검수 전 chapter/scene 생성을 금지하는 gate를 유지한다.
8. `contract-close → mutual-choice`와 계약 종료 전 직무상 압박 금지 규칙을 유지한다.

## 반영 확인

- premise를 원인 비노출형으로 교체함
- `Narrative Schema`와 `Story Instance A` 절을 추가함
- truth type 책임 표와 핵심 연결 예를 추가함
- event-like `prop-yugeon-refusal`을 `event-sponsor-pressure`의 행동으로 이동함
- proposition은 `prop-permanent-replacement-status`라는 상태 truth로 재정의함
- 안전 판단, 절차, 의도, 결과, 관계 영향, 책임, 서린의 판단을 분리한 다차원 계약을 추가함
- 16개 사건 수와 기존 인과 spine을 유지함

## 비차단 잔여 위험

- 관계·지식 상태의 실제 chapter 구간은 아직 없으므로 60/100 평가는 구조 승인이지 완성 corpus 승인이 아니다.
- chapter/scene plan에서 사건 밀도, 관계 변화의 충분한 원인, 각 인물의 정보 취득 시점을 다시 검수해야 한다.
- 같은 schema의 Story B/C는 과적합 점검을 위한 후속 pack이며 첫 S에 억지로 추가하지 않는다.
- formal `human_review.jsonl` 레코드는 world/event/relationship/knowledge target ID와 canonical revision이 구조화된 뒤 validator 계약에 맞춰 생성한다.

## 다음 gate

1. world/character/event/proposition/knowledge/relationship 구조화 — 완료
2. 20화 이하 chapter/scene plan 작성 — 완료
3. plan에서 인과·지식·관계 전이와 evidence affordance 검수 — 대기 (아래 Plan 절)
4. 통과한 경우에만 manuscript 생성

---

# Human Review — Plan (Gate B)

- corpus ID: `contemporary-romance-s-001`
- review stage: `plan` (SSOT 워크플로 gate B)
- plan revision digest: `86cd74936e630f3a761b374940828ce28440e3b18dde1abacccf9d6ec12e9668`
- decision: `PENDING` — 자동 구조 검증은 통과했으나 사람 검수(gate B)는 미완료
- gate result: manuscript 생성은 계속 금지

## 2026-08-29 재검증에서 수정한 결함

plan을 다시 확인하면서 자동 검증이 잡지 못한 관계 구간 공백을 발견했다.

- 결함: `han-yugeon → jeong-seorin`의 `affection` 상태가 11화에서 끝나고 다음 상태가
  16화에서 시작해 12~15화에 정의된 상태가 없었다. 기존 validator는 구간 **중첩**만
  검사하고 **공백**은 검사하지 않았다.
- 영향: 13화 시점 `relationship_state` query에 gold 상태가 없다. 이 pack의 핵심
  taxonomy에 직접 해당하므로 gate B 이전에 수정했다.
- validator 보강: `src/shared/validation/narrative-benchmark/relationship.ts`에
  "전이의 before 상태는 전이 회차 직전 화에서 끝나야 한다"를 추가했다. 열린 구간을
  before 상태로 쓰는 것도 거부한다. negative 테스트는 `narrative.test.ts`에 있다.
- plan 수정: `rel-yugeon-seorin-aff-03`(12~15화, 0.3, "통제를 내려놓았으나 계약 중
  표현 보류")을 신설하고 기존 16화 상태를 `-04`로 이동했으며, 12화 전이
  `transition-yugeon-aff-undistort`(trigger `event-accountability`)를 추가했다.
- 검수자가 확인할 서사 판단: 12화 accountability 이후 유건의 감정이 "보호 명목의 통제"
  왜곡에서 벗어나되 계약 종료(15화) 전까지 표현을 보류한다는 해석이 타당한지.

## 자동 구조 검증 결과 (사람 검수 아님)

`tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts`가 실제
acceptance validator(identity/world/causality/relationship/knowledge/manuscript)를
plan-stage 입력에 적용했다. 결과: 5/5 통과, `structuralIssues=0`, `relaxedIssues=0`.
전체 narrative-benchmark 스위트 72/72 통과.

- 사건 16개, 인과 edge 16개, 인과 그래프 비순환.
- blueprint §8 필수 인과 spine 유지: `power-warning→unilateral-notice→public-rupture`,
  `record-review→past-meaning`, `contract-close→mutual-choice`.
- 관계 상태 21개, 전이 15개. 각 전이의 after 상태 시작 화 = 전이 화, before 상태 종료 화
  = 전이 화 − 1(구간 공백 없음), trigger event가 전이 화 이전에 서술됨, 동일 방향·dimension
  유지, 값 변화 존재, 구간 비중첩. 6개 방향×차원 모두 구간 연속.
- 지식 상태 15개. 비-unknown 상태는 acquisition event 이후에만 시작, unknown은
  acquisition event 없음. 서린 `prop-halt-cause` misinformed(7화)→known(10화),
  `prop-process-breach` suspected(9화)→known(12화)로 분리 유지.
- timeline 16개가 event/chapter와 정합, scene 32개의 event가 chapter plan에 포함.
- planned_evidence 61개가 모든 truth의 evidenceId 참조를 해소(오탈자·미선언 없음).
- plan revision digest 재현성이 테스트로 고정됨(무단 수정 시 실패).

## 사람 검수가 확인해야 할 항목 (gate B, 미완료)

1. 16개 사건의 인과 spine이 16화 배치 후에도 개연적인가.
2. `prop-halt-cause`(참)와 `prop-process-breach`(참)가 서로 다른 planned evidence로
   판정 가능한가 — 안전 판단과 절차 위반의 분리.
3. 인물이 아직 모르는 사실(서린의 halt-cause/replacement 10화 취득)을 그 이전 행동의
   근거로 쓰지 않는가.
4. relationship transition마다 trigger event가 충분한가 (특히 9화 파열, 12화 회복).
5. 16화에서 padding 없이 완결되는가.
6. 감정(affection)과 공식(official_status)·신뢰(trust) 관계를 각각 판정 가능한가.
7. **지식 baseline 규칙을 확정한다.** `power-risk`, `sponsor-plan`은 `unknown[1-…]`을
   명시하지만 `halt-cause`, `process-breach`는 사건 이후부터만 선언한다. 특히
   `han-yugeon`의 `process-breach`는 7~11화가 비어 있어 "본인이 절차 위반을 인지했는가"
   질문에 그 구간의 gold가 없다. 선택지는 (a) 명시 baseline 상태를 추가한다,
   (b) "선언 없음 = unknown"을 SSOT 규칙으로 명문화하고 그 구간 query를 만들지 않는다.
   어느 쪽이든 명제가 사건으로 생성되는 시점과 잠재 사실인 시점을 구분해 기술한다.

이 항목들에 사람 검수 합의가 기록되기 전에는 `manuscript/chapter_*.txt`를 만들지 않는다.

## 비차단 잔여 위험

- planned_evidence는 affordance 계획이지 실제 evidence가 아니다. step 10에서 각 planned
  ID를 실제 scene의 offset/hash evidence로 구현해야 하며, 그 전까지 gold로 쓸 수 없다.
- relationship/knowledge 값(-1..1, 0..1)은 상대적 방향만 표현하며 절대 척도가 아니다.
  원고 검수에서 실제 서술 강도와 재대조한다.
- formal `human_review.jsonl`(validator 계약)은 plan 사람 검수 합의가 기록된 뒤
  world/event/relationship/knowledge target ID와 plan revision에 맞춰 생성한다.

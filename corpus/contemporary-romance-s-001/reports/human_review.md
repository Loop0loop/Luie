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
- plan revision digest: `85b04eaa73a04e1c91ebe148c2e9d47da63fe8fde3afe91d517bd68e792e4c53`
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

## 2026-08-29 2차 보강 — 지식 커버리지와 근거 분산

승인된 사건 16개·인과 edge 16개·관계 구조는 변경하지 않았다. gate A 재검수 대상이 아니다.

지식 커버리지 규칙을 확정했다. 선언된 모든 (인물, 명제) 쌍은
`[proposition.validFromChapter … 마지막 화]`를 공백 없이 덮는다. 취득 이전 구간은 명시
`unknown`으로 선언하고, 이야기 시작 전부터 가진 믿음은 1화 사건을 취득 anchor로 삼는다
(기존 `knowledge-yugeon-exit-misinformed` 선례).

추가한 지식 상태 7개 (15개 → 22개, 선언된 13개 쌍 모두 공백 0):

- `yugeon|process-breach misinformed[7-11]` — 핵심. 긴급 중단은 정당하다고 믿으면서
  공동 확인 생략은 위반이 아니라고 오인하는 구간. 이제 `정당한 판단 + 잘못된 절차`
  계약을 유건 시점에서도 질문으로 만들 수 있다.
- `yugeon|halt-cause known[7-]`, `yugeon|permanent-replacement-status known[5-]`,
  `yugeon|sponsor-plan known[5-]` — 서린의 오인 구간과 대비되는 지식 비대칭.
- `seorin|process-breach unknown[7-8]`, `seorin|permanent-replacement-status unknown[5-7]`
  — 명제는 성립했으나 아직 접하지 못한 구간의 명시.
- `seorin|past-exit-reason known[1-]` — 기존 `yugeon|past-exit-reason misinformed[1-10]`과
  짝을 이루는 지식 비대칭.

근거 분산 (planned evidence 61개 → 86개):

- 명제 9개 중 8개를 2~3개 회차에 분산했다. `prop-process-breach`는 2·7·12화(span 10),
  `prop-past-exit-reason`과 `prop-past-edit`은 2·11화로 `long_range` 구간을 만든다.
- 핵심 지식 상태 5개에 확인 근거를 추가했다. 예: `seorin|process-breach known`은
  12화 취득과 13화 "정정하되 절차 문제는 접지 않음"으로 판정된다.
- truth 그룹 27개 중 19개(70%)가 근거 2건 이상이다.

`temporal_order`는 이 pack 범위에서 제외했다. 사건 `eventTime`과 서술 회차가 완전히 같은
순서이고 timeline이 전부 `present`이므로 시간 순서 질문은 회차 번호 비교로 답이 나온다.
SSOT 7.2가 첫 S에서 강제하지 않는 항목이며 비선형 시간은 `regression`·`scifi` pack에서
검증한다. 이 pack에서 `temporal_order` query를 만들지 않는다.

자동 검증 추가: plan 테스트가 지식 커버리지 공백과 근거 분산 하한(multi_evidence 60%
이상, long_range 3건 이상)을 검사한다. 공유 validator로 올리지 않은 이유는 명제 schema에
"언제부터 알 수 있는 사실인가" 필드가 없어서다. 이 필드 추가는 별도 결정 사항이다.

검수자가 확인할 서사 판단:

- 유건이 7~11화 동안 절차 위반을 위반으로 인식하지 못하는 것이 개연적인지, 12화 인정이
  갑작스럽지 않은지.
- 서린이 5~7화에 대체안 논의를 전혀 접하지 못하는 배치가 자연스러운지.
- 추가된 확인 근거들이 원고에서 정답 문장 반복이 되지 않고 행동·발화로 표현 가능한지.

## 자동 구조 검증 결과 (사람 검수 아님)

`tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts`가 실제
acceptance validator(identity/world/causality/relationship/knowledge/manuscript)를
plan-stage 입력에 적용했다. 결과: 7/7 통과, `structuralIssues=0`, `relaxedIssues=0`.
전체 narrative-benchmark 스위트 74/74 통과.

- 사건 16개, 인과 edge 16개, 인과 그래프 비순환.
- blueprint §8 필수 인과 spine 유지: `power-warning→unilateral-notice→public-rupture`,
  `record-review→past-meaning`, `contract-close→mutual-choice`.
- 관계 상태 21개, 전이 15개. 각 전이의 after 상태 시작 화 = 전이 화, before 상태 종료 화
  = 전이 화 − 1(구간 공백 없음), trigger event가 전이 화 이전에 서술됨, 동일 방향·dimension
  유지, 값 변화 존재, 구간 비중첩. 6개 방향×차원 모두 구간 연속.
- 지식 상태 22개. 비-unknown 상태는 acquisition event 이후에만 시작, unknown은
  acquisition event 없음. 선언된 (인물, 명제) 쌍 13개 모두 명제 성립 회차부터 끝까지
  구간 공백 0. 서린 `prop-halt-cause` misinformed(7화)→known(10화),
  `prop-process-breach` unknown(7~8화)→suspected(9화)→known(12화), 유건
  `prop-process-breach` misinformed(7~11화)→known(12화)로 분리 유지.
- timeline 16개가 event/chapter와 정합, scene 32개의 event가 chapter plan에 포함.
- planned_evidence 86개가 모든 truth의 evidenceId 참조를 해소(오탈자·미선언 없음).
  truth 그룹 27개 중 19개가 근거 2건 이상, long_range(span>=8) 3건.
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
7. 지식 baseline 규칙은 "선언된 (인물, 명제) 쌍은 명제 성립 회차부터 공백 없이 덮는다"로
   확정하고 상태 7개를 추가했다(위 2차 보강 절). 검수자는 규칙 자체가 아니라 추가된
   오인·미인지 구간이 개연적인지 판단한다.

이 항목들에 사람 검수 합의가 기록되기 전에는 `manuscript/chapter_*.txt`를 만들지 않는다.

## 비차단 잔여 위험

- planned_evidence는 affordance 계획이지 실제 evidence가 아니다. step 10에서 각 planned
  ID를 실제 scene의 offset/hash evidence로 구현해야 하며, 그 전까지 gold로 쓸 수 없다.
- relationship/knowledge 값(-1..1, 0..1)은 상대적 방향만 표현하며 절대 척도가 아니다.
  원고 검수에서 실제 서술 강도와 재대조한다.
- formal `human_review.jsonl`(validator 계약)은 plan 사람 검수 합의가 기록된 뒤
  world/event/relationship/knowledge target ID와 plan revision에 맞춰 생성한다.

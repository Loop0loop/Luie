# contemporary-romance-s-001

현대 로맨스 Narrative Benchmark의 첫 S blueprint 작업 디렉터리다.

## 현재 단계

```text
시장·작업 방식 조사 완료
→ blueprint 조건부 GOOD 사람 검수 완료
→ 구조화된 truth 및 chapter/scene plan 작성 완료 (plan 사람 검수 대기)
```

`manifest.json`의 `benchmarkEligibility`는 아직 `false`이고 `humanReviewStatus`는 `approved`다. 이 승인은 blueprint 조건부 GOOD 기준이며, chapter/scene plan 진입만 허용한다. plan 자체의 사람 검수(gate B)는 아직 통과하지 않았고, 원고 생성과 benchmark 편입은 여전히 금지다. `revision`은 검수 의견을 반영한 현재 `narrative/blueprint.md` 파일의 SHA-256이다.

- plan revision digest: `86cd74936e630f3a761b374940828ce28440e3b18dde1abacccf9d6ec12e9668`
  - `narrative/`의 구조화된 truth 15개 산출물을 `continuities → world → characters → goals → conflicts → propositions → events → causal_edges → relations → relationship_transitions → knowledge_states → timeline → chapter_plans → scenes → planned_evidence` 순서로 이어붙인 SHA-256.
  - 이 digest는 `tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts`에서 자동 검증한다. plan을 수정하면 테스트가 먼저 실패하므로 문서의 digest도 함께 갱신해야 한다.
- 재생성: `node tools/generate-plan.mjs`
- 구조 검증: `SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts` (5/5 통과, structuralIssues=0)

## SSOT 4.2 구조 상태

```text
corpus/contemporary-romance-s-001/
  manifest.json                     # blueprint 단계 manifest (benchmarkEligibility=false)
  rights.json                       # 권리·비모방 경계
  research.md                       # 순위/작업 행동 조사와 출처
  manuscript/.gitkeep               # plan 검수 전 원고 생성 금지
  narrative/
    blueprint.md                    # 승인된 blueprint
    world.json                      # 세계 규칙 6개
    continuities.json               # prime 단일 세계선
    characters.jsonl                # 5명 + 역할 alias
    goals.jsonl                     # 7개
    conflicts.jsonl                 # 4개
    propositions.jsonl              # 9개 canonical proposition
    events.jsonl                    # 16개 사건 (인과 spine 유지)
    causal_edges.jsonl              # 16개 인과 edge (비순환)
    relations.jsonl                 # 21개 관계 상태 구간 (방향×차원별 구간 연속)
    relationship_transitions.jsonl  # 15개 관계 전이
    knowledge_states.jsonl          # 15개 지식 상태
    timeline.jsonl                  # 16개 (present, event별 1개)
    chapter_plans.jsonl             # 16화 (S<=20)
    scenes.jsonl                    # 32개 (화당 2 scene)
    planned_evidence.jsonl          # 61개 evidence affordance 계획 (실제 evidence 아님)
  tools/generate-plan.mjs           # 결정적 truth/plan 생성기
  evaluation/.gitkeep               # evidence/query/gold는 원고 이후
  review/.gitkeep                   # formal target review는 plan 검수 뒤
  reports/
    human_review.md                 # blueprint(GOOD) + plan(대기) 사람 검수
```

`evaluation/`의 `evidence.jsonl`, `retrieval_queries.jsonl` 등은 원고 생성 뒤 step 10에서 만든다. `planned_evidence.jsonl`은 실제 evidence 행(offset/hash)이 아니라 각 truth가 어느 scene에 근거를 두어야 하는지 선언한 affordance 계획이며, step 10에서 실제 evidence로 구현된다.

## 다음 gate

1. plan의 인과·지식 취득·관계 전이·evidence affordance를 사람 검수한다 (gate B, 미완료).
2. plan이 통과한 경우에만 `manuscript/chapter_*.txt`를 만든다.
3. 원고 검수 뒤 evidence alignment와 query/gold를 작성한다 (step 10).
4. `benchmarkEligibility`는 query/gold 사람 검수까지 통과한 뒤에만 `true`가 될 수 있다.

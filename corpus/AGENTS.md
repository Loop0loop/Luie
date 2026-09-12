# Corpus 작업

RAG 평가용 테스트 데이터다. 수정 내용은 사람 검수와 revision digest에 묶인다. 구조·용어는 [가이드](guide/README.md), [어휘](guide/glossary.md), [SSOT](../docs/architecture/narrative-rag-benchmark-ssot.md)의 관련 절을 확인한다.

## 승인과 생성 순서

데이터를 생성·수정할 때 대상 corpus의 `manifest.json`, `README.md`, `reports/human_review.md`에서 현재 단계·승인 범위를 확인한다. blueprint 승인은 plan 검수나 원고 생성 승인과 다르다. 승인된 단계 안의 수정·재생성·자동 검증은 진행하되, 다음 단계 진입은 필요한 사람 검수를 통과해야 한다.

생성 순서: World Rules → Characters + Goals → Conflicts → Events + Causal Graph → Relationship Transitions → Knowledge States → Timeline + Continuities → Foreshadowing → Chapter/Scene Plan → Manuscript → Evidence Alignment → Queries.

구조 truth가 먼저다. 원고에서 사후 추출한 구조를 정답으로 선언하지 않는다. `GOOD`와 `benchmarkEligibility: true`는 사람의 검수 결정에 근거해야 하며 자동 검사로 승격하지 않는다.

## 데이터 불변 조건

- 생성된 `narrative/*.jsonl`은 손으로 편집하지 않고 대상 `tools/generate-plan.mjs`의 정의를 수정·재실행한다. 두 번 생성한 결과를 별도 임시 디렉터리에 보존해 바이트 단위 결정성을 확인한다.
- 변경된 plan digest는 대응 `tests/shared/narrative-benchmark/plan-<corpus_id>.test.ts`, SSOT, `docs/guides/narrative-rag-benchmark-workflow.md`, 대상 README·human_review 보고서에서 대조한다. 과거 검수 이력의 digest를 새 값으로 덮어쓰지 않는다.
- revision 변경으로 무효가 된 검수는 stale/재검수 대상으로 기록한다. 보고서의 `PENDING` 표기를 JSON enum으로 복사하지 말고 대상 스키마가 허용하는 상태를 사용한다.
- event(사건), proposition(사실), interpretation(해석), knowledge state(인물별 지식), relationship state(시점별 관계)를 구분한다. 독자 지식과 인물 지식을 합치지 않는다.
- 관계·지식 구간은 동일 방향·차원에서 중첩이나 의도하지 않은 공백이 없도록 확인한다.
- blueprint·chapter plan의 정답 요약을 원고에 그대로 노출하지 않는다(`DIRECT_GOLD_LEAK`). 행동·대화·관찰 가능한 증거로 표현하며 감정 관계와 공식 관계를 구분한다.
- `luie-korean-narrative-gold-120-v1`은 legacy stress/noise fixture다. 삭제하거나 정확도 증거로 사용하지 않는다.

## 검증과 확장

대상 plan 테스트는 `SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/shared/narrative-benchmark/plan-<corpus_id>.test.ts`로 실행한다. 생성·digest 갱신 후 이 테스트가 통과해야 하며 digest 실패를 최종 상태로 남기지 않는다.

공유 schema/validator 또는 여러 corpus에 영향을 주는 변경은 `tests/shared/narrative-benchmark` 전체와 typecheck로 검증한다. 새 거부 조건에는 negative 테스트를 포함한다. corpus 전용 규칙은 해당 plan 테스트에 둔다. 지침·설명만 변경할 때 생성기를 실행하거나 검수 상태를 바꾸지 않는다.

새 corpus 구조는 SSOT 4.2를 따른다. 기존 8개 장르 ID를 조합하고 임의 혼합 장르 ID를 만들지 않는다. 이전 장르 S pack 통과 전에 새 장르로, 해당 장르 S 통과 전에 M 이상으로 확장하지 않는다. taxonomy·채점기는 공통으로 유지하고 pack별 coverage·제외 이유를 기록한다.

자동 검증과 사람 검수 결과를 구분하고, 수치는 측정 명령·출력에 근거해 보고한다.

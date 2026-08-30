# AGENTS.md — corpus/

> 적용 범위: `corpus/` 이하 전체
> 인수인계 가이드: [guide/README.md](./guide/README.md)
> 어휘 사전: [guide/glossary.md](./guide/glossary.md)
> 설계 원본(SSOT): [../docs/architecture/narrative-rag-benchmark-ssot.md](../docs/architecture/narrative-rag-benchmark-ssot.md)

## 이 디렉터리는 뭔가

RAG 시스템을 시험할 **테스트 데이터**가 있는 곳이다. 제품 코드가 아니다. 소설을 잘 쓰는 것이 목적이 아니다.

여기의 데이터는 사람 검수와 revision digest에 묶여 있다. 그래서 일반 소스 파일과 다른 규칙이 적용된다.

## 작업 전 반드시 확인

1. `<corpus_id>/manifest.json`의 `humanReviewStatus`와 `benchmarkEligibility`
2. `<corpus_id>/README.md`의 현재 단계
3. `<corpus_id>/reports/human_review.md`의 마지막 검수 결정과 승인 범위

**승인 범위를 넘는 산출물을 만들지 않는다.** 예를 들어 blueprint 검수만 통과한 상태에서 원고를 만들면 안 된다. 각 검수는 다음 한 단계만 허용한다.

## 금지 사항

### 단계를 건너뛰지 않는다

생성 순서가 고정돼 있다. 이전 단계가 사람 검수를 통과하기 전에 다음 산출물을 만들지 않는다.

```text
World Rules → Characters + Goals → Conflicts → Events + Causal Graph
→ Relationship Transitions → Knowledge States → Timeline + Continuities
→ Foreshadowing → Chapter/Scene Plan → Manuscript
→ Evidence Alignment → Queries
```

원고에서 구조를 사후 추출해 정답으로 선언하는 것도 금지다. 구조 truth가 먼저다.

### JSONL을 손으로 편집하지 않는다

`<corpus_id>/narrative/*.jsonl`은 생성기 출력물이다. 생성기의 정의 테이블을 고치고 재실행한다.

```bash
node corpus/<corpus_id>/tools/generate-plan.mjs
```

생성기는 결정적이어야 한다. 랜덤, 타임스탬프, 실행 순서 의존 코드를 넣지 않는다. 재실행 결과가 바이트 단위로 같은지 확인한다.

### digest를 방치하지 않는다

데이터를 고치면 plan revision digest가 바뀐다. 사람 검수는 digest에 묶이므로 **기존 검수는 무효(stale)가 되고 재검수가 필요하다.**

digest는 5곳에 있고 전부 같아야 한다. 하나만 고치고 끝내지 않는다.

1. `tests/shared/narrative-benchmark/plan-<corpus_id>.test.ts`
2. `docs/architecture/narrative-rag-benchmark-ssot.md`
3. `docs/guides/narrative-rag-benchmark-workflow.md`
4. `corpus/<corpus_id>/README.md`
5. `corpus/<corpus_id>/reports/human_review.md`

### 검수 상태를 임의로 승격하지 않는다

`GOOD` 라벨과 `benchmarkEligibility: true`는 **사람만** 부여한다. 자동 검증 통과는 후보 라벨 제안까지다. 테스트가 전부 통과했다는 사실을 검수 통과로 서술하지 않는다.

### 정답을 원고에 노출하지 않는다

`chapter_plans.jsonl`의 클리프행어와 `blueprint.md`의 요약 문장은 **내부 계획**이다. 원고에 그대로 옮기면 `DIRECT_GOLD_LEAK` 결함이다.

```text
금지: "서린은 유건이 정보를 숨겼기 때문에 그를 불신했다."

허용: 3화 유건이 출처를 거짓말한다
      7화 서린이 비공개 기록 번호를 발견한다
      12화 서린이 유건의 제안을 거절한다
      18화 대화와 행동으로 신뢰 붕괴가 확인된다
```

발화·행동·사실을 여러 장면에 분산하고, 감정 관계와 공식 관계를 따로 판정할 수 있게 한다.

### 기존 120화 fixture로 정확도를 주장하지 않는다

`luie-korean-narrative-gold-120-v1`은 `legacy_stress_noise_fixture`다. 성능·메모리·ingestion 회귀에만 쓴다. 삭제하지도 않는다.

## truth 타입을 섞지 않는다

이 프로젝트의 존재 이유가 이 구분이다. 하나를 다른 것으로 대신 쓰면 평가가 무의미해진다.

| 타입 | 뜻 |
| --- | --- |
| event | 일어난 일 |
| proposition | 참인 사실 |
| interpretation | 그 사실의 해석 |
| knowledge state | 각 인물이 그것을 아는지 |
| relationship state | 시점별 관계 값 |

독자가 아는 사실과 인물이 아는 사실을 합치지 않는다.

## 구간 데이터를 추가할 때

관계 상태와 지식 상태는 회차 구간을 가진다. 새 레코드를 넣을 때 두 가지를 모두 확인한다.

- **중첩 금지**: 같은 방향·차원에 두 상태가 겹치지 않는다
- **공백 금지**: 그 사이 회차에 상태가 없으면 그 시점 질문에 정답이 없다

과거에 놓친 결함이 전부 이 유형이었다. 새 truth 타입을 추가할 때 구간 커버리지를 먼저 설계한다.

## 검증 명령

```bash
# 구조 검증 전체
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/shared/narrative-benchmark

# 특정 corpus만
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/shared/narrative-benchmark/plan-<corpus_id>.test.ts

# 타입
pnpm run typecheck

# 생성기 결정성
cd corpus/<corpus_id>
cp -R narrative /tmp/before && node tools/generate-plan.mjs && diff -rq /tmp/before narrative
```

데이터를 고쳤을 때 순서는 이렇다.

1. 생성기 재실행 → 결정성 확인
2. corpus 테스트 실행 → digest 실패는 정상, 그 외 실패는 결함
3. 전체 스위트 실행 → 다른 fixture 회귀 확인
4. 새 digest 계산 → 문서 4곳 갱신
5. `reports/human_review.md`에 무엇을 왜 바꿨는지 기록
6. 검수 상태를 `PENDING`으로 되돌림

## 평가 계약 코드를 고칠 때

`src/shared/schemas/narrative-benchmark/`와 `src/shared/validation/narrative-benchmark/`는 corpus 밖의 공유 코드다. 여기를 고치면 모든 corpus와 fixture에 영향이 간다.

- 새 검사를 추가하면 반드시 negative 테스트를 같이 넣는다
- 스키마 필드를 추가하는 것은 blast radius가 크므로 별도 결정 사항으로 다룬다
- 특정 corpus에만 필요한 규칙은 그 corpus의 plan 테스트에 둔다

## 새 corpus를 만들 때

디렉터리 구조는 SSOT 4.2를 따른다.

```text
corpus/<corpus_id>/
  manifest.json
  rights.json
  manuscript/
  narrative/
  evaluation/
  review/
  reports/
```

지켜야 할 것.

- 장르는 기존 8개 ID 조합으로 기록한다. 새 혼합 장르 ID를 만들지 않는다
- 이전 장르 S pack이 통과하기 전에 새 장르를 시작하지 않는다
- 어떤 장르도 S를 통과하기 전에 M 이상으로 키우지 않는다
- 장르별 예외 정답 규칙을 만들지 않는다. 모든 장르가 같은 taxonomy와 채점기를 쓴다
- 각 pack은 의도한 taxonomy coverage와 제외 이유를 기록한다

## 문서를 쓸 때

- 자동 검증 결과와 사람 검수 결과를 구분해 서술한다
- 검증하지 않은 것을 검증했다고 쓰지 않는다. 무엇을 확인했고 무엇을 못 했는지 명시한다
- 수치를 적을 때 실측 근거(명령과 출력)를 남긴다
- 주석 규약은 `docs/conventions/comments.md`를 따른다. 코드로 보이는 동작이 아니라 이유와 제약을 쓴다

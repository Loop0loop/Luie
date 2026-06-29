# Luie 작업 정리 - 2026-06-29

## 한 줄 요약

이번 작업은 Luie를 "편집자"가 아니라 "작품을 같이 기억하는 동반자"로 검증하기 위해, 상태관리 방침을 정리하고 Phase 문서를 재판정한 뒤, 합성 웹소설 기반 Phase 5 작가 플로우 테스트를 실제로 통과시키는 데 집중했다.

## 완료한 작업

### 1. 상태관리 점검과 정책 문서화

- `docs/quality/state-management-policy.md` 추가
  - Zustand를 기본 상태관리 기준으로 명시
  - store 소유권, persist 허용 범위, 파생 상태, IPC/API 경계 규칙 정리
  - 위험 지점과 변경 체크리스트 추가
- `docs/quality/release-readiness.md`에 상태관리 정책 링크 추가

### 2. phase 문서 재검증

- `docs/phase/00-overview.md`에 2026-06-28 기준 subagent 검증 결과 반영
- `docs/phase/phase-3-memory-policy.md`의 오래된 conflict ledger 문구 정리
- `docs/phase/phase-7-beta-validation.md`에 "실제 beta 데이터 대기" 상태 반영
- `src/main/services/features/memory/status/memoryPhaseStatusReport.ts`
  - Phase 7 상태에 `blocked-on-real-beta-data` 추가
- `tests/main/services/memory/status/memoryPhaseStatusReport.test.ts`
  - Phase 7 기대 상태 갱신

판정:

- Phase 1-6은 부분 완료 또는 근접 완료
- Phase 7은 인프라만 있고 실제 beta 작가 데이터가 부족함
- 전체 앱은 "작가 동반자 beta"에 가깝고, 아직 실사용 작가에게 완성품으로 말하기는 이르다

### 3. 합성 웹소설 fixture 추가

- `tests/fixtures/writerFlowSyntheticNovel.ts` 추가
- 제목: `회귀한 탑 관리자는 엔딩을 숨긴다`
- 실제 웹소설 플랫폼의 장르 관습만 참고하고, 특정 작품/문장/설정은 복제하지 않음
- 포함한 작가 플로우:
  - 설정 질문
  - 집필 중 충돌 자동 감지
  - 과거 회차 수정
  - 초안 폐기
  - 인물명/별칭 변경
  - 회차 순서 변경

### 4. Phase 5 작가 플로우 테스트 강화

- `docs/phase/phase-5-writer-workflow-coverage.md`
  - 합성 웹소설 fixture를 공식 테스트 근거로 추가
- `tests/scripts/phase5WriterWorkflowCoverage.test.ts`
  - 6개 writer workflow가 fixture와 coverage 문서에 모두 고정되도록 보강
- DOM 테스트 3개를 같은 합성 작품 데이터로 맞춤
  - `tests/dom/analysisMessageSafety.test.tsx`
  - `tests/dom/conflictQueuePanelWriterFlow.test.tsx`
  - `tests/dom/promptComposerTimelineScope.test.tsx`

### 5. Vitest 설정 복구

- `vitest.config.ts` 추가
  - `@renderer`, `@shared` alias 설정
  - `tests/setup.ts` 연결
  - `tests/dom/**/*.test.tsx`를 jsdom 환경으로 매핑
- 이 설정 누락 때문에 DOM 테스트 alias 해석과 DB service 테스트 setup이 깨지고 있었음

### 6. Phase 5 E2E 실패 수정

Phase 5 Electron E2E에서 실제 실패 2개를 잡았다.

1. Electron named export 문제
   - 실패: `electron` does not provide an export named `BrowserWindow`
   - 수정:
     - `src/main/services/features/utility/utilityProcessBridge/internal/core.ts`
     - `src/main/services/features/utility/utilityProcessBridge/internal/eventHandlers.ts`
   - Electron dynamic chunk에서 default import를 쓰도록 변경

2. 테스트 환경에서 외부 OpenAI 호출 문제
   - 실패: `GPT-5.4-nano` 모델 접근 불가
   - 원인: `LUIE_LLM_PROVIDER_HINT=none`을 runtime factory가 무시하고 OpenAI env를 사용함
   - 수정:
     - `src/main/services/llm/modelRuntimeFactory.ts`
     - `src/main/utility/rag/ragQaWorker.ts`
     - `tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts`
   - `none` 또는 `deterministic` provider hint면 deterministic runtime을 강제
   - RAG worker가 deterministic provider를 에러로 막지 않고 기존 generation path를 타게 변경

## 검증 결과

### 통과

```bash
pnpm vitest run \
  tests/scripts/phase5WriterWorkflowCoverage.test.ts \
  tests/dom/analysisMessageSafety.test.tsx \
  tests/dom/promptComposerTimelineScope.test.tsx \
  tests/dom/conflictQueuePanelWriterFlow.test.tsx \
  tests/main/services/ragGrounding.test.ts \
  tests/main/services/memory/memoryEvidenceChunkLinkRepair.test.ts \
  tests/main/services/memory/review/memoryReviewBacklogReport.test.ts \
  tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts \
  tests/main/services/memory/entity/memoryEntityReviewService.test.ts \
  tests/main/services/memory/eval/memoryEvalRunner.test.ts \
  tests/main/services/memory/eval/memoryEvalScoring.test.ts \
  tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts \
  --reporter=verbose --no-file-parallelism
```

결과:

- 12 files passed
- 63 tests passed

```bash
pnpm run typecheck
```

결과:

- passed

```bash
pnpm run build
```

결과:

- passed
- 기존 chunk size warning은 남아 있음

```bash
node node_modules/@playwright/test/cli.js test --project=stress tests/e2e/phase5WriterWorkflow.spec.ts
```

결과:

- 1 passed

### 실행 중 필요했던 조치

- DB/Vitest 실행 전 Node ABI용:

```bash
pnpm rebuild better-sqlite3
```

- Electron E2E 실행 전 Electron ABI용:

```bash
pnpm test:prepare
```

## 현재 리스크

- `qa:core` 전체는 아직 이번 작업 후 실행하지 않았다.
- `test:prepare`와 `pnpm rebuild better-sqlite3`가 ABI를 서로 바꾸므로, Vitest와 Electron E2E를 오갈 때 순서를 조심해야 한다.
- Phase 5 E2E는 여전히 preload API 기반 긴 흐름이다. 실제 에디터 타이핑/버튼 클릭만으로 재현하는 순수 UI E2E는 아직 없다.
- Phase 7은 실제 beta 작가 데이터가 없어서 완료로 볼 수 없다.
- `bencium-claude-code-design-skill` submodule/외부 경로가 modified로 표시되지만 이번 작업 내용은 아니다.

## 다음 추천 작업

1. 현재 diff를 커밋 단위로 나누기
   - 상태관리/phase 문서
   - Phase 5 fixture/test
   - Vitest 설정 복구
   - RAG/E2E runtime fix

2. `qa:core` 또는 최소 guard subset 실행

3. Phase 5 순수 UI E2E 추가 여부 결정
   - 실제 에디터 입력
   - composer 질문
   - evidence 표시
   - conflict/defer UI

4. Phase 7 beta 검증 준비
   - 실제 웹소설 작가 작업 샘플
   - 장편 원고 기준 latency/accuracy 측정
   - 작가 질문 로그 기반 eval case 확대

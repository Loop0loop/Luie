## Phase 3. Memory 저장 정책 강화

비유: 지금은 작가 노트에 메모를 적을 수 있다. Phase 3은 그 노트를 "정사", "초안", "폐기", "추정" 색깔 탭으로 나누는 단계다.

목표:

- Memory Engine이 오래 쓸수록 오염되는 문제를 막는다.

### Phase 3-1. provenance/canon 상태 분리

작업:

- memory entry가 "어디 위치에서 왔는지"와 "정사로 믿어도 되는지"를 분리한다.
- 기존 `sourceType`은 출처 위치 의미로 유지한다.
- 정사성은 새 `provenanceKind` 또는 `canonStatus`로 표현한다.

현재 완료 범위:

- `MemoryFact`에 `provenanceKind`, `canonStatus`를 추가했다.
- 신규 temporal fact 후보는 원문 근거에서 추출된 경우 `canon/canon`으로 저장된다.
- temporal fact confirm은 `provenanceKind=canon`, `canonStatus=canon`이 아니면 차단한다.
- draft/discarded/unknown fact는 confirmed canonical memory로 자동 승격되지 않는다.
- legacy confirmed fact는 chapter/scene evidence가 실제로 연결된 경우에만 `canon/canon`으로 보정한다.
- canonical package import는 새 필드를 보존하고, 오래된 package는 `unknown/unknown`으로 안전하게 읽는다.
- temporal fact review queue와 conflict queue는 renderer가 라벨을 붙일 수 있도록 provenance/canon 값을 반환한다.
- `MemoryEntity`에 `provenanceKind`, `canonStatus`를 추가했다.
- 원문 chunk에서 추출된 신규 entity 후보는 `canon/canon`으로 저장된다.
- entity review queue는 renderer가 라벨을 붙일 수 있도록 provenance/canon 값을 반환한다.
- canonical package import는 entity provenance/canon 필드를 보존하고, 오래된 package는 `unknown/unknown`으로 안전하게 읽는다.
- `MemoryEpisode`에 `provenanceKind`, `canonStatus`를 추가했다.
- 원문 evidence에서 생성되는 신규 episode 후보는 `canon/canon`으로 저장된다.
- episode review queue는 renderer가 라벨을 붙일 수 있도록 provenance/canon 값을 반환한다.
- canonical package import는 episode provenance/canon 필드를 보존하고, 오래된 package는 `unknown/unknown`으로 안전하게 읽는다.
- `MemoryEpisodeEvidence`에 `provenanceKind`, `canonStatus`를 추가했다.
- 원문 evidence span에서 생성되는 신규 episode evidence row는 `canon/canon`으로 저장된다.
- canonical package import는 episode evidence provenance/canon 필드를 보존하고, 오래된 package는 `unknown/unknown`으로 안전하게 읽는다.
- `MemoryEntityAlias`, `MemoryEntityMention`에 `provenanceKind`, `canonStatus`를 추가했다.
- 원문 chunk에서 추출된 신규 entity alias와 mention row는 `canon/canon`으로 저장된다.
- canonical package import는 entity alias provenance/canon 필드를 보존하고, 오래된 package는 `unknown/unknown`으로 안전하게 읽는다.

현재 실제 프로젝트 검증:

```text
schema column patch: MemoryFact.provenanceKind, MemoryFact.canonStatus 적용
legacy confirmed unknown fact: 1 → 0
backfilled confirmed fact: 1
Memory phase status: 9/9 ready
canonical package sync: true
DB rows / package rows: 746 / 746
```

아직 남은 범위:

- Entity alias/mention 자체의 provenance/canon 저장 경로는 1차 연결됐다.
- Episode evidence 자체의 provenance/canon 분리는 1차 연결됐다.
- user note/imported memory의 별도 생성 UI와 검토 flow는 아직 구현 전이다.
- provenance/canon 라벨의 최종 renderer 표시 디자인은 UI 단계에서 더 다듬어야 한다.

기존 `sourceType` 예시:

- chapter
- scene
- note

새 provenance/canon 상태 후보:

- canon: 실제 원문
- draft: 초안
- discarded: 폐기 설정
- inferred: 추론
- user_note: 작가 메모
- imported: 외부 import

완료 기준:

- 기존 `sourceType` 의미를 바꾸지 않음
- `provenanceKind` 또는 `canonStatus` schema 설계안 확정
- provenance/canon 상태 없는 memory 승격 금지
- provenance/canon 상태별 UI 라벨 가능
- discarded/draft는 confirmed fact로 자동 승격 금지

#### Phase 3-1a. schema 설계

작업:

- `sourceType` 재사용 금지 원칙을 schema에 반영한다.
- 기존 canonical package export/import와 호환되는 migration path를 설계한다.

완료 기준:

- schema 변경안: 완료 (`MemoryFact.provenanceKind`, `MemoryFact.canonStatus`)
- migration test 계획: 완료 (column patch + canonical package test)
- package sync verifier 영향 분석: 완료 (package sync true 유지)

#### Phase 3-1b. writer/import path validation

작업:

- 원문에서 추출된 memory와 import된 memory의 provenance를 다르게 기록한다.
- user note, imported memory는 confirmed canon으로 자동 승격하지 않는다.

완료 기준:

- extraction path validation: temporal fact path 완료
- import path validation: package import 보존/legacy default 처리 완료
- 잘못된 provenance 저장 단위 테스트: draft/unknown confirm 차단 완료
- 남은 작업: user note/imported 생성 flow의 별도 검토 상태 연결

#### Phase 3-1c. UI label contract

작업:

- renderer가 provenance/canon 상태를 표시할 수 있게 shared type과 preload contract를 정리한다.

완료 기준:

- shared type 정의: 완료
- IPC/preload contract 정의: temporal review/conflict query 반환값에 포함
- renderer label 테스트: safety label 계열은 존재하나 provenance/canon 시각 라벨은 추가 UI 단계에서 보강 필요

### 2026-06-11. Phase 3-1 entity provenance/canon 1차 완료

확인된 사실:

- `MemoryEntity`에 `provenanceKind`, `canonStatus`를 nullable이 아닌 기본값 `unknown` 컬럼으로 추가했다.
- packaged bootstrap SQL과 column patch에 entity provenance/canon 컬럼을 추가했다.
- 원문 `MemoryChunk`에서 추출된 신규 entity 후보는 `provenanceKind=canon`, `canonStatus=canon`으로 저장한다.
- entity review queue는 `provenanceKind`, `canonStatus`를 shared contract로 반환한다.
- canonical package import는 entity provenance/canon 값을 보존하고, 오래된 package는 `unknown/unknown`으로 읽는다.

검증:

```text
pnpm vitest tests/main/services/memory/entity/memoryEntityExtractionRunner.test.ts tests/main/services/memory/entity/memoryEntityReviewService.test.ts tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
pnpm exec eslint src/main/database/schema/memoryIdentity.ts src/main/database/main/packagedSchema/memorySchema.sql.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/main/services/features/memory/entity/memoryEntityExtractionRunner.ts src/main/services/features/memory/entity/memoryEntityReviewService.ts src/main/services/features/memory/persistence/internal/applyPayload.ts src/shared/types/search/review.ts tests/main/services/memory/entity/memoryEntityExtractionRunner.test.ts tests/main/services/memory/entity/memoryEntityReviewService.test.ts
pnpm run typecheck
```

제한:

- 이 단계는 entity 후보 단위 provenance/canon이다. `MemoryEntityAlias`, `MemoryEntityMention` 각각의 provenance/canon 분리는 아직 없다.
- `MemoryEpisode` provenance/canon은 다음 Phase 3-1 보강 대상이다.
- 최종 renderer 시각 라벨은 아직 UI 단계에서 보강해야 한다.

### 2026-06-11. Phase 3-1 episode provenance/canon 1차 완료

확인된 사실:

- `MemoryEpisode`에 `provenanceKind`, `canonStatus`를 nullable이 아닌 기본값 `unknown` 컬럼으로 추가했다.
- packaged bootstrap SQL과 column patch에 episode provenance/canon 컬럼을 추가했다.
- 원문 evidence에서 생성되는 신규 episode 후보는 `provenanceKind=canon`, `canonStatus=canon`으로 저장한다.
- episode review queue는 `provenanceKind`, `canonStatus`를 shared contract로 반환한다.
- canonical package import는 episode provenance/canon 값을 보존하고, 오래된 package는 `unknown/unknown`으로 읽는다.

검증:

```text
pnpm vitest tests/main/services/memory/episode/memoryEpisodeCandidate.test.ts tests/main/services/memory/episode/memoryEpisodeReviewService.test.ts tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
pnpm exec eslint src/main/database/schema/memoryEpisode.ts src/main/database/main/packagedSchema/memorySchema.sql.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/main/services/features/memory/episode/memoryEpisodeCandidate.ts src/main/services/features/memory/episode/memoryEpisodeReviewService.ts src/main/services/features/memory/persistence/internal/applyPayload.ts src/shared/types/search/review.ts tests/main/services/memory/episode/memoryEpisodeCandidate.test.ts tests/main/services/memory/episode/memoryEpisodeReviewService.test.ts
pnpm run typecheck
```

제한:

- 이 단계는 episode 후보 단위 provenance/canon이다. `MemoryEpisodeEvidence` 각각의 provenance/canon 분리는 아직 없다.
- 최종 renderer 시각 라벨은 아직 UI 단계에서 보강해야 한다.

### 2026-06-11. Phase 3-1 episode evidence provenance/canon 1차 완료

확인된 사실:

- `MemoryEpisodeEvidence`에 `provenanceKind`, `canonStatus`를 nullable이 아닌 기본값 `unknown` 컬럼으로 추가했다.
- packaged bootstrap SQL과 column patch에 episode evidence provenance/canon 컬럼을 추가했다.
- 원문 evidence span에서 생성되는 신규 episode evidence row는 `provenanceKind=canon`, `canonStatus=canon`으로 저장한다.
- canonical package import는 episode evidence provenance/canon 값을 보존하고, 오래된 package는 `unknown/unknown`으로 읽는다.

검증:

```text
pnpm vitest tests/main/services/memory/episode/memoryEpisodeCandidate.test.ts tests/main/services/memory/episode/memoryEpisodeReviewService.test.ts tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
pnpm exec eslint src/main/database/schema/memoryEpisode.ts src/main/database/main/packagedSchema/memorySchema.sql.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/main/services/features/memory/episode/memoryEpisodeCandidate.ts src/main/services/features/memory/persistence/internal/applyPayload.ts tests/main/services/memory/episode/memoryEpisodeCandidate.test.ts
pnpm run typecheck
```

제한:

- `MemoryEntityAlias`, `MemoryEntityMention` 각각의 provenance/canon 분리는 아직 없다.
- episode evidence provenance/canon을 renderer에 직접 노출하는 UI는 아직 없다. 현재는 저장/패키지 보존 계약까지 완료했다.

### 2026-06-11. Phase 3-1 entity alias/mention provenance/canon 1차 완료

확인된 사실:

- `MemoryEntityAlias`, `MemoryEntityMention`에 `provenanceKind`, `canonStatus`를 nullable이 아닌 기본값 `unknown` 컬럼으로 추가했다.
- packaged bootstrap SQL과 column patch에 alias/mention provenance/canon 컬럼을 추가했다.
- 원문 `MemoryChunk`에서 추출된 신규 alias row는 `provenanceKind=canon`, `canonStatus=canon`으로 저장한다.
- 원문 `MemoryChunk`에서 추출된 신규 mention evidence row도 `provenanceKind=canon`, `canonStatus=canon`으로 저장한다.
- canonical package import는 entity alias provenance/canon 값을 보존하고, 오래된 package는 `unknown/unknown`으로 읽는다.

검증:

```text
pnpm vitest tests/main/services/memory/entity/memoryEntityExtractionRunner.test.ts tests/main/services/memory/entity/memoryEntityReviewService.test.ts tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
pnpm exec eslint src/main/database/schema/memoryIdentity.ts src/main/database/main/packagedSchema/memorySchema.sql.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/main/services/features/memory/entity/memoryEntityExtractionRunner.ts src/main/services/features/memory/persistence/internal/applyPayload.ts tests/main/services/memory/entity/memoryEntityExtractionRunner.test.ts
pnpm run typecheck
```

제한:

- `MemoryEntityMention`은 현재 canonical package payload에 포함되는 export 대상이 아니라 추출 evidence row로 쓰인다. 따라서 이번 단계의 package import 보존은 `MemoryEntityAlias`에 한정된다.
- alias/mention provenance/canon을 renderer review UI에 직접 표시하는 단계는 아직 남아 있다.

### Phase 3-2. evidence 없는 memory 저장 차단

작업:

- 확정 memory는 반드시 evidence를 가져야 한다.
- evidence가 없으면 suggested 상태로만 저장한다.

현재 완료 범위:

- temporal fact confirm은 transaction 안에서 provenance/canon 상태와 evidence 존재를 함께 검증한다.
- fact의 `sourceContentHash`, 연결된 `MemoryEpisodeEvidence.sourceContentHash`, quote가 비어 있으면 confirmed 승격을 차단한다.
- conflict resolve에서 winner fact를 confirmed로 올릴 때도 같은 evidence/canon guard를 적용한다.
- evidence 없는 canon fact는 suggested 상태에 남는다.
- entity confirm은 `MemoryEntityMention` evidence가 없으면 confirmed 승격을 차단한다.
- alias confirm은 해당 alias에 직접 연결된 mention evidence가 없으면 alias/entity 동시 confirm을 차단한다.
- entity mention의 `contentHash`, `sourceContentHash`, quote가 비어 있으면 evidence로 인정하지 않는다.
- episode confirm API는 `MemoryEpisodeEvidence`가 없으면 confirmed 승격을 차단한다.
- episode의 `sourceContentHash`, evidence의 `contentHash`, `sourceContentHash`, quote가 비어 있으면 evidence로 인정하지 않는다.
- episode confirm은 main service, narrative query facade, IPC handler, preload API contract까지 연결했다.

아직 남은 범위:

- episode confirm UI 버튼/검토 화면 연결은 별도 UI 단계로 남아 있다.
- rejected memory의 반복 제안 억제는 Phase 3-2b 후속 작업으로 남아 있다.

완료 기준:

- confirmed fact 저장 시 evidence 존재 검증: temporal fact path 완료
- confirmed entity 저장 시 evidence 존재 검증: entity/alias path 완료
- confirmed episode 저장 시 evidence 존재 검증: episode path 완료
- evidence link가 stale이면 confirmed 상태 유지 금지
- repair 실패 시 review backlog로 이동

#### Phase 3-2a. transaction 승격 guard

작업:

- confirmed 승격은 DB transaction 안에서만 수행한다.
- evidence row, contentHash, sourceContentHash를 함께 확인한다.

완료 기준:

- confirmed 승격 service 단위 테스트: temporal fact/entity/alias/episode path 완료
- stale evidence 승격 실패 테스트: sourceContentHash/quote empty guard 완료, chunk stale 검증은 Phase 3-2b와 연결 필요

#### Phase 3-2b. review backlog 연결

작업:

- repair 실패나 evidence 부족 memory는 review backlog로 보낸다.

현재 완료 범위:

- review backlog report가 stale confirmed evidence를 `staleEvidence` 항목으로 노출한다.
- confirmed entity mention의 chunk가 없거나 quote가 chunk에 없으면 stale evidence로 표시한다.
- confirmed episode evidence의 chunk가 없거나 quote가 chunk에 없으면 stale evidence로 표시한다.
- `memory:review-backlog` JSON에는 stale evidence가 자동 포함된다.
- `memory:review-template`에는 자동 confirm/reject 대상과 분리된 수동 검토 섹션으로 stale evidence를 포함한다.
- stale entity mention/episode evidence는 `reviewStatus`, `reviewerNote`, `reviewedAt`을 저장할 수 있다.
- 작가가 stale evidence를 "나중에 보기"로 보류하면 active backlog에서 빠지고, 같은 근거가 계속 경고로 튀어나오지 않는다.
- 작가가 stale evidence를 "버림" 또는 "해결됨"으로 판단하면 reviewer note와 reviewedAt을 저장하고 active backlog에서 제외한다.
- renderer는 `memory:stale-evidence-review-action` IPC/preload API로 defer/reject/resolve action을 호출할 수 있다.
- 분석 패널은 stale evidence review panel을 렌더링하고, `getReviewBacklog`로 오래된 근거를 조회한 뒤 defer/reject/resolve action을 호출한다.
- 분석 패널은 `memory:repair-evidence-links` IPC/preload API로 현재 프로젝트 evidence link repair를 실행하고, 완료 후 stale evidence backlog를 다시 조회한다.
- stale evidence panel DOM 테스트는 작가가 오래된 근거를 열어 자동 복구/나중에 보기/버림/해결됨 action을 볼 수 있고, 자동 복구 중 row decision이 잠기는 흐름을 검증한다.
- 분석 패널의 기존 fact/entity/entity alias/episode/conflict review panel도 실제 `AnalysisSection` 렌더링 경로에 복구됐다.
- rejected entity와 같은 canonical name/type 후보는 다시 entity/alias/mention으로 제안하지 않는다.
- rejected episode와 같은 source/hash/type/title/summary 후보는 다시 insert하지 않는다.
- rejected temporal fact와 같은 subject/predicate/object/time/source 후보는 다시 insert하지 않는다.
- episode/fact extraction runner는 duplicate suppressed 후보를 처리 성공으로 보되 새 제안 카운트에는 포함하지 않는다.

아직 남은 범위:

- stale evidence를 UI에서 직접 defer/reject/resolve 처리하는 1차 화면은 있다.
- stale evidence의 자동 repair 버튼은 있다. 현재 동작은 row 단건 repair가 아니라 프로젝트 단위 evidence link repair를 실행한 뒤 queue를 재조회하는 방식이다.
- stale evidence panel 단위 DOM writer flow 검증은 있다. 전체 `AnalysisSection`에서 실제 store/API를 타고 큐를 열고 처리하는 e2e 작가 flow 검증은 아직 없다.

완료 기준:

- backlog row 생성: 현재 구조에서는 별도 테이블 대신 review backlog report 항목으로 완료
- stale evidence 보류: 별도 테이블 대신 `MemoryEntityMention`/`MemoryEpisodeEvidence` 행의 review 상태로 완료
- stale evidence 버림/해결: `MemoryEntityMention`/`MemoryEpisodeEvidence` 행의 review 상태로 완료
- stale evidence 상태 전이 IPC: `memory:stale-evidence-review-action` 채널과 preload API로 완료
- stale evidence 상태 전이 UI: 분석 패널 `StaleEvidenceReviewPanel` 1차 완료
- stale evidence 자동 repair UI: 분석 패널에서 프로젝트 단위 `memory:repair-evidence-links` 실행 후 backlog reload까지 완료
- stale evidence panel DOM writer flow: 오래된 근거 label/action 노출과 repair 중 decision lock 검증 완료
- 같은 rejected memory 반복 제안 억제: entity/episode/temporal fact path 완료

### Phase 3-3. conflict ledger와 기존 invalidation 정렬

작업:

- 기존 사실과 새 사실이 충돌하면 덮어쓰지 않는다.
- 먼저 기존 `MemoryFactInvalidation`으로 표현 가능한지 확인한다.
- 표현이 부족한 경우에만 별도 `MemoryConflictLedger`를 설계한다.

예시:

```text
3화: A는 왼손잡이
18화: A는 오른손으로 검을 잡음
→ 충돌 확정 아님. "검토 필요" ledger 생성
```

완료 기준:

- `MemoryFactInvalidation`은 fact pair, reason, 생성 시점, 양쪽 fact 연결을 표현할 수 있으므로 1차 conflict ledger로 사용한다.
- 양쪽 evidence quote는 `MemoryFactEvidence` -> `MemoryEpisodeEvidence` join으로 보존/조회한다.
- 충돌 큐 API는 양쪽 fact summary에 `evidenceQuotes`를 포함한다.
- UI는 분석 패널의 충돌 큐에서 "검토 필요" 대상과 양쪽 quote를 표시하고, 이전/신규 사실 채택 액션을 제공한다.
- stale evidence의 "나중에 보기" 상태는 Phase 3-2b에서 evidence 행 단위로 저장한다.
- conflict 자체에 대한 "나중에 보기", "검토 중", "해결됨" 같은 영구 review status는 아직 없다. 이 상태가 필요해지면 `MemoryFactInvalidation` 확장 또는 별도 `MemoryConflictLedger`가 필요하다.

#### Phase 3-3a. 기존 invalidation 적합성 검토

작업:

- `MemoryFactInvalidation`이 다음을 표현할 수 있는지 확인한다.
  - 충돌 대상 fact
  - 새 주장
  - 양쪽 evidence quote
  - 작가 검토 상태

완료 기준:

- 기존 테이블 확장 가능 여부 문서화: 1차 충돌 쌍 저장/조회에는 기존 `MemoryFactInvalidation`으로 충분하다.
- 부족 필드 목록:
  - review status: pending/deferred/resolved 같은 작가 검토 상태
  - reviewer note: 작가가 왜 보류/선택했는지 남기는 메모
  - resolvedAt/resolvedBy: 해결 시점과 해결 주체
  - per-conflict UI state: 숨김, 나중에 보기, 우선순위

#### Phase 3-3b. conflict 저장/조회 API

작업:

- conflict 후보를 저장하고 UI에서 조회할 수 있는 service API를 만든다.

완료 기준:

- conflict 생성 테스트: 기존 temporal fact review 경로에서 invalidation row 생성 검증 완료
- conflict 조회 테스트: `fetchConflictFactPairs`가 양쪽 evidence quote를 반환하는 테스트 추가
- confirm/reject 상태 전이 테스트: 기존 `resolveMemoryTemporalFactConflict` 경로 사용
- defer 상태 전이 테스트: 아직 없음. review status 영속화 설계 후 추가

### Phase 3-4. review workflow 강화

작업:

- suggested/rejected/confirmed 흐름을 작가가 검토할 수 있게 한다.

현재 완료 범위:

- 분석 패널에 suggested fact/entity/entity alias/episode review panel을 연결했다.
- 각 panel은 접힌 상태로 표시되고, 열 때 해당 review queue를 조회한다.
- fact/entity/entity alias/episode는 accept action을 기존 IPC로 호출한다.
- fact/entity/entity alias/episode reject는 작가가 입력한 reason을 기존 IPC payload에 포함한다.
- entity/entity alias reject reason 저장을 위해 schema/type/validation/service를 확장했다.
- entity alias는 confirm/reject 외에 merge/split action을 기존 IPC로 호출한다.
- mutation 후 해당 queue를 다시 조회한다.

아직 남은 범위:

- reject reason 입력은 native prompt 기반 최소 구현이다. 전용 UI form/modal은 아직 없다.
- review queue UI의 실제 DOM/e2e 작가 flow 검증은 아직 정적 소스 계약 테스트 수준이다.

완료 기준:

- suggested memory 목록: fact/entity/entity alias/episode UI 연결 완료
- accept/reject 이유 저장: fact/entity/entity alias/episode reject reason 저장 완료
- 같은 rejected memory 반복 제안 억제: Phase 3-2b에서 entity/episode/temporal fact path 완료

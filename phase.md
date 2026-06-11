# RAG + Memory Engine Phase Plan

## 문서 목적

이 문서는 RAG + Memory Engine을 "웹소설 작가가 실제 작업 중 믿고 쓰는 설정 담당 편집자"로 키우기 위한 향후 phase 계획이다.

기준은 기술 기능 목록이 아니라 작가의 실제 흐름이다.

```text
작가가 설정을 까먹음
→ 원문 근거를 찾음
→ 현재 회차 기준으로 말해도 되는지 확인함
→ 초안/폐기 설정을 걸러냄
→ 충돌 가능성을 표시함
→ 근거 문장과 함께 답함
```

## 현재 기준선

현재 상태는 "원문 책갈피를 찾아주는 조수"에서 "작가 질문형 모의고사를 풀기 시작한 조수" 단계로 넘어갔다.

아래 `Memory phase status: 9/9 ready`는 기존 구현 상태 리포트의 engine readiness 지표다. 이 문서의 Phase 1~7 전체가 완료됐다는 뜻이 아니다.

검증된 사실:

```text
Memory phase status: 9/9 ready
MemoryEvalCase: 365
MemoryEvalEvidence: 365
RAG averageContextRecallAtK: 1
RAG totalP0FailureCount: 0
canonical package sync: true
DB rows / package rows: 746 / 746
```

이 수치는 현재 eval 365개 기준이다. 장편 전체, 실제 LLM 장문 답변, 모든 작가 질문에 대해 같은 성능이 보장된다는 뜻은 아니다.

Writer-product phase 진행 로그:

```text
Phase 시작 전 MemoryEvalCase: 51
Phase 1-1 완료 후 MemoryEvalCase: 91
Phase 1-2 완료 후 MemoryEvalCase: 301
Phase 1-3 완료 후 MemoryEvalCase: 365
Phase 1-4 완료 후 MemoryEvalCase: 365
Phase 2-1 완료 후 MemoryEvalCase: 365
Phase 2-2 계약 완료 후 MemoryEvalCase: 365
Phase 2-3 완료 후 MemoryEvalCase: 365
Phase 3-1 fact path 완료 후 MemoryEvalCase: 365
Phase 3-2a fact path 완료 후 MemoryEvalCase: 365
Phase 3-2a entity path 완료 후 MemoryEvalCase: 365
Phase 3-2a episode path 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence backlog path 완료 후 MemoryEvalCase: 365
Phase 3-2b rejected duplicate suppression 완료 후 MemoryEvalCase: 365
Phase 3-3 conflict quote queue 연결 후 MemoryEvalCase: 365
Phase 3-4 suggested memory review UI/reject reason 저장 후 MemoryEvalCase: 365
Phase 4-1 longform benchmark seed/materialize 완료 후 MemoryEvalCase: 365
Phase 4-2 latency budget/report 계약 완료 후 MemoryEvalCase: 365
Phase 4-2 memory usage/regression threshold 계약 완료 후 MemoryEvalCase: 365
Phase 4-2 threshold assert mode 완료 후 MemoryEvalCase: 365
Phase 4-3 search optimization policy 적용 후 MemoryEvalCase: 365
Phase 4-3 candidate cap comparison report 1차 완료 후 MemoryEvalCase: 365
Phase 4-3 cache TTL memory comparison 1차 완료 후 MemoryEvalCase: 365
Phase 4-3 stale embedding skip 적용 후 MemoryEvalCase: 365
Phase 4-3 manual-10000 latency report 완료 후 MemoryEvalCase: 365
Phase 4-3 eval recall guard 완료 후 MemoryEvalCase: 365
Phase 4-4 low-end benchmark mode 계약 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 low-end eval recall guard 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 low-end/standard/high-end/quality eval recall 비교 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 analysis panel search mode toggle 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 actual RAG path latency 계측 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 RAG search stage breakdown 계측 1차 완료 후 MemoryEvalCase: 365
```

구분:

- engine readiness: 현재 코드/DB에 이미 구축된 Memory Engine 구성요소가 동작 가능한지 보는 상태 리포트다.
- writer-product phase: 웹소설 작가 flow 기준으로 부족한 부분을 단계적으로 강화하는 이 문서의 작업 계획이다.
- `fact path 완료`는 temporal fact 경로만 완료됐다는 뜻이다. Entity/Episode 전체가 같은 수준으로 완료됐다는 뜻은 아니다.

## 실행 원칙

이 phase plan은 기존 프로젝트 구조를 우선한다.

기존에 있는 기반:

- Memory feature: `src/main/services/features/memory`
- RAG feature: `src/main/services/features/rag`
- Memory schema: `src/main/database/schema/memory.ts`
- Memory eval schema: `src/main/database/schema/memoryEval.ts`
- Temporal memory schema: `src/main/database/schema/memoryTemporal.ts`
- Renderer research UI: `src/renderer/src/features/research`
- IPC contract: `src/shared/ipc/channels.ts`, `src/main/handler/**`, `src/preload/api/**`

작업 분류:

- 기존 구현 확장: 이미 있는 schema/service/runner를 넓힌다.
- 신규 schema: 기존 테이블 의미를 깨지 않을 때만 추가한다.
- UI 노출: main/preload/shared/renderer contract를 같이 갱신한다.
- 테스트만 추가: 기능은 있지만 writer flow 검증이 부족한 경우다.

중요한 설계 제한:

- 기존 `sourceType`은 `chapter`, `scene`, `note` 같은 출처 위치 의미로 유지한다.
- `canon`, `draft`, `discarded`, `inferred` 같은 정사성/출처 신뢰도는 `sourceType`에 넣지 않는다.
- 정사성은 별도 `provenanceKind` 또는 `canonStatus` 개념으로 설계한다.
- LLM judge 결과는 canonical memory가 아니라 eval artifact로 저장한다.
- confirmed 승격은 transaction 안에서 evidence 존재, content hash, sourceContentHash를 검증한다.

## Phase 1. 작가 실전 시험지 확장

비유: 지금은 조수가 51문제짜리 모의고사를 만점 받은 상태다. 다음은 웹소설 작가가 실제로 틀리는 문제를 500문제, 1000문제로 늘리는 단계다.

목표:

- 현재 51개 eval case를 작가 flow 기반 대형 평가셋으로 확장한다.
- 검색이 잘 되는지뿐 아니라 "작가가 실제로 물어볼 법한 질문"인지 검증한다.

### Phase 1-1. 작가 pain point taxonomy 고정

작업:

- 웹소설 작가가 자주 겪는 문제를 고정 카테고리로 정의한다.
- 카테고리는 코드와 eval case naming에 그대로 반영한다.

카테고리:

- 인물/별칭/호칭 혼동
- 회차별 지식 상태
- 미래 정보 누수
- 초안/폐기 설정 오염
- 관계 방향 뒤집힘
- 미회수/회수 떡밥 혼동
- 생존/부상/위치/소속/능력/소유물 변화
- 감정선/동기 변화
- 세계관 규칙 충돌

완료 기준:

- taxonomy 문서화
- 각 카테고리별 최소 10개 seed case 생성 가능
- eval case name에 category가 안정적으로 들어감

### Phase 1-2. 실제 작가 질문형 eval case 생성

작업:

- "근거 찾아라" 같은 테스트 문장을 작가 질문형으로 바꾼다.
- 같은 원문 chunk에서 여러 종류의 질문을 생성한다.

예시:

```text
나중에 A가 이 사실을 알고 있다고 써도 돼?
이 장면에서 B가 C를 싫어하는 게 확정이야, 추정이야?
이 떡밥 아직 안 풀린 거 맞아?
이 설정은 폐기 초안에서 나온 거 아니야?
```

완료 기준:

- eval case 300개 이상
- P0 case 비율 최소 40%
- 모든 case가 gold evidence를 가진다.

### Phase 1-3. 회차 순서 기반 temporal eval 추가

작업:

- 질문 시점을 특정 회차로 고정한다.
- 해당 회차 이후 정보를 사용하면 실패로 처리한다.

예시:

```text
5화 기준으로, 주인공이 흑막의 정체를 알고 있다고 말해도 되는가?
12화 시점에서 여주가 약의 정체를 의심했다는 근거가 있는가?
```

완료 기준:

- queryChapterOrder 기반 eval 가능
- future fact 사용 시 P0 failure 발생
- 회차 순서가 없는 프로젝트는 "근거 부족"으로 처리

### Phase 1-4. 평가 데이터 품질 repair

작업:

- expected answer, gold quote, expected chunk id가 서로 어긋나는 case를 자동 탐지한다.
- quote가 HTML 태그/줄바꿈 때문에 정확히 안 맞아도 token overlap으로 검증한다.

완료 기준:

- stale/wrong eval evidence 자동 repair
- expected answer가 gold evidence로 뒷받침되지 않으면 실패 처리
- eval set 자체의 품질 리포트 생성

## Phase 2. 답변 검수자 강화

비유: Phase 1은 조수에게 시험지를 많이 푸는 단계다. Phase 2는 조수가 답을 말할 때 옆에서 편집자가 빨간펜으로 "근거 없음", "미래 정보", "관계 방향 반대"를 잡는 단계다.

목표:

- RAG가 근거를 찾는 것에서 끝나지 않고, 답변이 근거 안에서만 만들어졌는지 평가한다.

### Phase 2-1. deterministic guard 확장

작업:

- 현재 guard를 더 세분화한다.
- LLM 없이 잡을 수 있는 P0를 먼저 잡는다.

검출 항목:

- unsupported confirmed answer
- answer contains unsupported claim
- expected answer not supported by gold evidence
- deleted/draft fact confirmed
- future fact used in past answer
- relation direction reversed
- entity alias mismatch
- unresolved thread falsely marked resolved

완료 기준:

- 각 failure type별 단위 테스트
- false positive case도 별도 테스트
- eval result에 failure type별 count 저장

### Phase 2-2. LLM answer judge 추가

작업:

- 실제 LLM 답변을 judge가 다시 평가한다.
- judge는 반드시 evidence quote와 answer를 함께 본다.
- judge 결과는 canonical memory가 아니라 eval artifact로만 저장한다.

평가축:

- groundedness: 근거 안에서만 답했는가
- contradiction: 기존 memory와 모순되는가
- temporal leakage: 미래 정보를 섞었는가
- omission: 핵심 근거를 빠뜨렸는가
- writer usefulness: 작가가 바로 쓸 수 있는 답인가

완료 기준:

- judge prompt 버전 관리
- judge 결과 JSON schema 고정
- judge 자체가 근거 없이 판단하면 invalid 처리
- judge result 저장 위치가 eval run/result 계열로 제한됨
- judge 결과가 confirmed memory를 직접 생성하지 않음

### Phase 2-3. 답변 차단 정책

작업:

- 위험한 답변은 그대로 보여주지 않는다.
- 확정/추정/근거부족 라벨을 강제한다.
- 기존 RAG grounding은 evidence 상태 판단이고, Phase 2-3은 renderer에 전달되는 답변 표시/차단 정책이다.

정책:

```text
P0 failure 있음 → 확정 답변 차단
근거 0개 → "근거 부족" 표시
미래 정보 감지 → "현재 회차 기준 사용 불가" 표시
초안/폐기 출처 → "정사 아님" 표시
```

완료 기준:

- renderer에 전달되는 answer contract에 safety label 포함
- UI에서 확정 답변과 경고 답변이 구분됨
- 기존 `buildRagGrounding` 결과와 safety label mapping 테스트

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

- Entity/Episode 자체의 provenance/canon 상태 분리는 별도 단계로 남아 있다.
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
- rejected entity와 같은 canonical name/type 후보는 다시 entity/alias/mention으로 제안하지 않는다.
- rejected episode와 같은 source/hash/type/title/summary 후보는 다시 insert하지 않는다.
- rejected temporal fact와 같은 subject/predicate/object/time/source 후보는 다시 insert하지 않는다.
- episode/fact extraction runner는 duplicate suppressed 후보를 처리 성공으로 보되 새 제안 카운트에는 포함하지 않는다.

아직 남은 범위:

- repair job이 unresolved evidence를 발견했을 때 별도 상태 테이블에 영구 기록하는 기능은 없다.
- stale evidence를 UI에서 직접 repair/reject/defer 처리하는 화면은 남아 있다.

완료 기준:

- backlog row 생성: 현재 구조에서는 별도 테이블 대신 review backlog report 항목으로 완료
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
- 작가가 "나중에 보기", "검토 중", "해결됨" 같은 상태를 별도로 저장하는 영구 review status는 아직 없다. 이 상태가 필요해지면 `MemoryFactInvalidation` 확장 또는 별도 `MemoryConflictLedger`가 필요하다.

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

## Phase 4. 장편 성능과 저사양 최적화

비유: 지금은 단편 원고에서 조수가 잘 찾는지 확인했다. Phase 4는 300화짜리 장편 원고 더미를 저사양 노트북 위에 올려도 조수가 버티는지 보는 단계다.

목표:

- "작은 프로젝트에서는 됨"에서 "장편 작업에서도 쓸 수 있음"으로 올린다.

### Phase 4-1. 대형 프로젝트 benchmark 생성

작업:

- 1천/1만 chunk 규모 테스트 데이터를 만든다.
- 실제 웹소설 구조처럼 회차, 장면, 인물 반복, 설정 변화가 들어가야 한다.

현재 완료 범위:

- `memory:benchmark-seed` 스크립트를 추가했다.
- `ci-1000`, `manual-300ch`, `manual-500ch`, `manual-10000` profile을 고정했다.
- `ci-1000`은 100화, 1천 chunk, 100만 자, low-end profile이다.
- `manual-10000`은 500화, 1만 chunk, 300만 자 profile이다.
- seed 값을 넣으면 같은 benchmark manifest가 재현된다.
- manifest에는 alias 반복, 회차 재정렬, 중간 회차 리라이트, stale embedding, summary refresh, review backlog, renderer list 부하 scenario가 포함된다.
- 실제 확인한 `ci-1000` manifest는 100 chapters, 1000 chunks, 1,000,000 chars, package row estimate 1112였다.
- `materializeMemoryLongformBenchmark`를 추가해 manifest를 실제 `Project`, `Chapter`, `MemoryChunk` row로 적재할 수 있다.
- `memory:benchmark-seed --materialize --project-id <id>` 옵션을 추가했다.
- materializer는 같은 project id를 다시 적용하면 중복 삽입하지 않고 기존 row 수를 반환한다.

아직 남은 범위:

- 1만 chunk profile은 정의됐고, Phase 4-3에서 `manual-10000` latency report 1차 실행까지 완료했다.
- 다만 "장시간" 기준의 반복 실행, p95/p99, cold/warm 비교, 실제 앱 시작 직후 검색 측정은 아직 남아 있다.
- latency/memory usage의 기본 측정과 regression threshold 계약은 Phase 4-2에서 1차 완료했지만, CI artifact 저장과 앱 cold start 연결은 남아 있다.

완료 기준:

- 1천 chunk benchmark: `ci-1000` manifest + DB materialize 테스트 완료
- 1만 chunk benchmark: `manual-10000` profile 정의 + Phase 4-3 latency 1차 실행 완료
- 100화/300화/500화 시뮬레이션: profile 정의 완료
- 100만~300만 자 원고 시뮬레이션: profile 정의 완료
- benchmark seed 재현 가능: 동일 seed manifest equality 테스트 완료
- 남은 계측: 장시간 반복, p95/p99, cold/warm, 실제 앱 시작 직후 검색

#### Phase 4-1a. 기준 장비 정의

작업:

- 저사양 기준을 수치로 정의한다.

기준 장비 후보:

```text
저사양: 4GB RAM, 내장 GPU 없음, 배터리 모드
일반: 8GB RAM, 내장 GPU, 배터리/전원 혼합
상위: 16GB RAM 이상, 전원 연결
```

완료 기준:

- mode별 benchmark profile 정의: low-end/standard/high-end 완료
- CI에서 돌릴 수 있는 경량 profile과 수동 benchmark profile 분리: `ci-1000`과 `manual-*` 분리 완료

#### Phase 4-1b. 실제 장편 작업 데이터셋

작업:

- chunk 수만 늘리지 않고 웹소설 병목을 재현한다.

포함할 병목:

- 인물 이름/별칭 반복
- 회차 재정렬
- 중간 회차 리라이트
- embedding stale 상태
- summary refresh 증가
- review backlog 증가
- renderer list 렌더링 부하

완료 기준:

- 300화/500화 seed: `manual-300ch`, `manual-500ch` profile 정의 완료
- edit-after-index scenario: manifest에 chapterOrders/staleChunkIds 포함
- import/export scenario: manifest에 package row estimate/expected tables 포함

### Phase 4-2. latency budget 설정

작업:

- 작가가 기다릴 수 있는 시간을 기준으로 budget을 정한다.

목표 budget:

```text
일반 근거 검색: 300ms ~ 1s
복합 memory query: 1s ~ 3s
첫 query after app start: 3s 이하 목표
반복 query: 1s 이하 목표
edit-after-index repair: background
대형 repair job: background
package export/import: progress 표시 필수
```

완료 기준:

- query latency 측정: `memory:benchmark-latency`의 `firstChunkSearch`/`repeatedChunkSearch`로 1차 완료
- cold start latency 측정: 실제 앱 cold start와 연결 필요
- first query latency 측정: `firstQueryAfterStartMs <= 3000` budget 계약 및 report 완료
- repeated query latency 측정: `repeatedQueryMs <= 1000` budget 계약 및 report 완료
- edit-after-index latency 측정
- memory usage 측정: RSS/heap/sqlite page cache snapshot 1차 완료
- regression threshold 설정: latency/RSS/heap threshold report 1차 완료

현재 완료:

- `MEMORY_BENCHMARK_LATENCY_BUDGETS`에 작가 체감 기준 latency budget을 코드 계약으로 고정했다.
- `runMemoryBenchmarkLatencyReport`가 materialized benchmark project의 chunk 검색을 측정한다.
- report는 첫 검색, 반복 검색, RSS/heap/sqlite page cache, edit-after-index background 정책, package progress 필수 정책을 함께 반환한다.
- report는 `regressionThresholds`로 first/repeated query, RSS, heap 기준선을 함께 반환한다.
- `memory:benchmark-latency` 스크립트로 `--project-id`, `--profile`, `--materialize`, `--query`, `--out` 기반 측정 리포트를 생성할 수 있다.
- `memory:benchmark-latency --assert-thresholds`는 assessment의 fail 항목을 발견하면 non-zero exit로 실패한다.

남은 작업:

- 실제 앱 cold start 직후 첫 query 측정
- 1만 chunk materialized profile 장시간 측정
- edit-after-index repair job의 background latency 측정
- CI artifact 저장

### Phase 4-3. 검색 최적화

작업:

- FTS, short-token, quote-token, vector search의 비용을 측정한다.
- RRF merge 전에 과한 후보를 줄인다.
- RRF 후보 상한, context budget, top-k, rerank cache TTL을 명시한다.

현재 완료:

- `SearchOptimizationPolicy`를 추가해 low-end/standard/high-end/quality mode를 코드 계약으로 고정했다.
- mode별 result limit, candidate cap, RRF top-k, context budget, rerank cache TTL, vector search mode를 명시했다.
- `searchChunks`는 FTS/short-token/vector 후보 수를 policy candidate cap으로 제한한다.
- RAG context search는 FTS/exact phrase/quote-token/short-token/vector 후보 수를 policy candidate cap으로 제한한다.
- `assembleRagContext`는 policy context budget cap을 사용한다.
- benchmark latency report는 현재 적용된 optimization policy를 함께 반환한다.
- benchmark latency report는 candidate cap 20/40/current baseline의 latency, result count, baseline overlap ratio를 함께 반환한다.
- benchmark latency report는 cache TTL 60초/180초/300초별 예상 entry 수와 예상 memory 사용량을 함께 반환한다.
- vector search는 `MemoryEmbedding.contentHash`와 현재 `MemoryChunk.indexTextHash/contentHash`가 다른 stale embedding을 건너뛴다.
- `manual-10000` profile 기준 500화/10000 chunk/300만 자 materialize와 latency report를 생성했다.
- `memory:run-eval-suite --assert-optimized-recall`로 최적화 후 eval recall/P0 guard를 실행할 수 있다.
- 현재 365개 eval 기준 optimized RAG recall은 0.9972602739726028, P0 failure는 0이다.

완료된 범위:

- candidate cap별 latency/baseline overlap 비교: `ci-1000` 기준 1차 완료
- cache TTL별 memory 사용량 비교: estimated memory comparison 1차 완료
- stale embedding skip 정책 실제 적용 완료
- 1만 chunk 기준 manual latency report 완료
- eval 기반 recall guard: headless Layer 3 evidence retrieval 기준 365 eval 1차 완료

아직 검증 안 된 범위:

- candidate cap별 정답 recall/latency 비교: manual 1만 chunk 기준은 남음
- cache TTL별 memory 사용량 비교: 실제 cache 저장소 hit/miss, entry count, heap delta 계측은 남음
- stale embedding skip count와 skip latency impact report는 남음
- 1만 chunk 데이터셋 자체의 별도 정답 recall 평가는 남음
- 실제 LLM 장문 답변 품질, judge 비용, UI 근거 표시 품질은 남음

검토 기술:

- sqlite FTS5 최적화
- sqlite-vec 사용 범위 제한
- query token cache
- chunk window cache
- top-k rerank cache
- background embedding build
- candidate cap
- context budget cap
- stale embedding skip

완료 기준:

- 1만 chunk 기준 latency report: `manual-10000` CLI report 완료
- top-k recall 유지
- top-k recall 유지: 365 eval 기준 averageContextRecallAtK 0.9972602739726028, P0 0으로 guard 통과
- memory usage report
- candidate cap별 recall/latency 비교: policy 계약, 실제 검색 경로 cap, benchmark comparison report 1차 완료
- cache TTL별 memory 사용량 비교: TTL 계약 및 estimated memory comparison report 1차 완료, 실제 cache 저장소 계측은 남음

### Phase 4-4. 저사양 모드

작업:

- 저사양 기기에서는 비싼 작업을 background로 보낸다.
- 속도를 우선하고, 품질 저하는 명확히 표시한다.

정책:

```text
속도 우선: FTS + lexical + cached rerank
품질 우선: vector + judge + expanded context
저사양 모드: background indexing, lazy summary, bounded top-k
```

현재 완료:

- `memory:benchmark-latency`에서 `--optimization-mode low-end|standard|high-end|quality`를 받을 수 있게 했다.
- latency report는 실제 적용된 `optimizationPolicy`를 반환한다.
- latency report는 `optimizationModeComparison`으로 low-end/standard/high-end/quality의 후보 상한, context budget, rerank cache TTL, vector search mode, lexical 후보 검색 latency, quality baseline overlap을 함께 반환한다.
- latency report는 실제 RAG 검색 경로인 `searchMemoryChunksForRag`와 Layer 3 evidence 조립 경로인 `buildLayer3Evidence`의 p50/p95/max를 함께 반환한다.
- latency report는 `searchMemoryChunksForRag` 내부 stage인 FTS, exact phrase, quote-token, short-token, vector, RRF, hydrate, parent window의 p50/p95/max와 후보 수를 함께 반환한다.
- `memory:run-eval-suite`에서 `--optimization-mode low-end|standard|high-end|quality`를 받을 수 있게 했다.
- eval suite output은 실제 적용된 `optimizationPolicy`를 함께 저장한다.
- 앱 설정에는 `llm.searchOptimizationMode`가 저장된다.
- analysis panel composer 메뉴에서 Search Mode를 low-end/standard/high-end/quality로 바꿀 수 있다.
- 설정 변경은 main settings IPC를 통해 저장되고, search policy가 읽는 `LUIE_SEARCH_OPTIMIZATION_MODE` runtime env에도 반영된다.
- low-end 메뉴에는 "빠른 검색 · 근거 폭 좁음" 설명을 표시한다.
- `ci-1000` profile 기준 low-end mode 리포트와 threshold assertion을 생성했다.
- 365 eval 기준 low-end/standard/high-end/quality recall guard를 실행했다.
- low-end candidate cap 40에서는 averageContextRecallAtK 0.9698630136986301로 0.98 기준을 통과하지 못했다.
- low-end는 vector search를 lexical hit 때 건너뛰는 대신 candidate cap을 50으로 보정했고, 보정 후 365 eval 기준 guard를 통과했다.
- 확인된 `ci-1000` low-end 수치:

```text
firstChunkSearch: 0.295ms
repeatedChunkSearch: 1.102ms
RSS: 104.828 MiB
heapUsed: 13.95 MiB
optimization mode: low-end
candidateCap: 50
contextBudgetChars: 6144
rerankCacheTtlMs: 300000
vectorSearchMode: skip-when-lexical-hits
threshold: pass
```

RAG path 계측 추가 후 확인된 `ci-1000` low-end 수치:

```text
firstChunkSearch: 0.192ms
repeatedChunkSearch: 0.968ms
searchMemoryChunksForRag: p50 2.391ms, p95 4.268ms, max 4.268ms, resultCount 20
buildLayer3Evidence: p50 1.787ms, p95 2.458ms, max 2.458ms, evidenceCount 10
threshold: pass
```

확인된 `ci-1000` low-end RAG stage breakdown:

```text
fts          | p50 0.001ms | p95 0.009ms | max 0.009ms | candidates 0  | skipped 5
exactPhrase  | p50 0.000ms | p95 0.005ms | max 0.005ms | candidates 0  | skipped 5
quoteToken   | p50 0.000ms | p95 0.001ms | max 0.001ms | candidates 0  | skipped 5
shortToken   | p50 1.424ms | p95 1.497ms | max 1.497ms | candidates 50 | skipped 0
vector       | p50 0.000ms | p95 0.001ms | max 0.001ms | candidates 0  | skipped 5
rrf          | p50 0.012ms | p95 0.086ms | max 0.086ms | candidates 20 | skipped 0
hydrate      | p50 0.174ms | p95 0.236ms | max 0.236ms | candidates 20 | skipped 0
parentWindow | p50 0.571ms | p95 0.846ms | max 0.846ms | candidates 47 | skipped 0
```

확인된 `365 eval` mode별 수치:

```text
low-end  | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 6144  | vector skip-when-lexical-hits
standard | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 8192  | vector enabled
high-end | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 12288 | vector enabled
quality  | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 16384 | vector enabled
```

구분:

- 이 수치는 `ci-1000` materialized benchmark에서 lexical 후보 검색을 측정한 것이다.
- RAG path 계측은 `LIKE` 단독이 아니라 실제 `searchMemoryChunksForRag`와 `buildLayer3Evidence` 호출 기준이다.
- RAG stage breakdown은 benchmark용 diagnostics이며, 기존 검색 결과 계약은 유지한다.
- 현재 low-end query `"검은 기사"`는 short-token path가 주요 비용이고 FTS/exact phrase/quote-token/vector는 skip됐다.
- `optimizationModeComparison`의 `baselineOverlapRatio`는 quality mode 후보 목록과의 overlap이다.
- 365 eval low-end guard는 headless Layer 3 evidence retrieval 기준이다.
- topK 5 eval에서는 네 mode 모두 candidate cap이 50으로 맞춰지므로, 주된 차이는 context budget과 vector search mode다.
- 실제 LLM 장문 답변 품질, judge 비용, UI 표시 품질은 아직 별도 검증이 필요하다.

남은 작업:

- 별도 Settings 화면에도 동일 toggle을 노출할지 결정한다.
- UI에서 "속도 우선이라 일부 근거가 줄어들 수 있음" 같은 품질 저하 설명을 표시한다.
- background indexing/lazy summary의 실제 job 제어는 Phase 4-5와 연결한다.
- 실제 `searchMemoryChunksForRag`/`buildLayer3Evidence` 전체 경로 p50/p95/max는 1차 완료했다.
- FTS/exact phrase/quote-token/short-token/vector/RRF stage별 비용 p50/p95/max는 1차 완료했다.
- 다음은 p99, cold/warm, vector enabled 환경에서의 stage별 비용을 분리한다.
- cache TTL memory comparison은 현재 추정치이므로 실제 cache hit/miss와 entry count 계측을 추가한다.

완료 기준:

- 저사양 모드 토글: analysis panel composer 메뉴 1차 완료
- mode별 latency 비교: CLI benchmark 계약 + actual RAG path/stage p50/p95 1차 완료
- mode별 recall 비교: 365 eval 기준 low-end/standard/high-end/quality 비교 1차 완료
- mode별 UI 설명: low-end trade-off copy 1차 완료

#### Phase 4-4a. 저사양 검색 정책/벤치마크 계약

비유: 작가 노트북이 느릴 때 조수가 큰 서랍을 전부 뒤지는 대신, 먼저 작은 색인 카드함에서 빠르게 찾는 단계다.

완료 범위:

- CLI에서 `--optimization-mode`로 low-end/standard/high-end/quality를 선택한다.
- 리포트에 mode별 후보 상한, context budget, cache TTL, vector search mode를 남긴다.
- `ci-1000` 기준 threshold assertion을 통과한다.
- eval suite에 `--optimization-mode`를 연결해 low-end evidence recall guard를 실행한다.
- low-end candidate cap 40 실패를 확인한 뒤 50으로 보정해 0.98 recall threshold를 통과한다.
- standard/quality도 같은 365 eval set에서 recall threshold를 통과한다.

완료된 범위:

- 실제 RAG 검색/evidence path 전체 비용 계측은 1차 완료했다.
- FTS/exact phrase/quote-token/short-token/vector/RRF/hydrate/parent window stage별 비용 분리 측정은 1차 완료했다.
- low-end/standard/high-end/quality eval 비교는 headless Layer 3 evidence retrieval 기준 1차 완료했다.

아직 검증 안 된 범위:

- mode별 eval 비교를 p50/p95/p99 latency와 함께 저장하는 작업은 남아 있다.
- vector enabled 환경의 실제 vector stage 비용은 아직 대표값으로 검증하지 않았다.
- 현재 `"검은 기사"` 단일 query는 저사양 성능 대표값으로 부족하므로 query category별 cold/warm/p95/p99가 필요하다.

#### Phase 4-4b. 저사양 앱 토글/UI 설명

비유: 작가가 "오늘은 배터리 모드니까 빠르게 찾아줘"라고 스위치를 켜고, 조수가 "대신 근거 폭은 좁아질 수 있음"이라고 표시하는 단계다.

완료 기준:

- 앱 설정 또는 분석 패널에서 mode를 바꿀 수 있다: analysis panel composer 메뉴 1차 완료
- renderer는 현재 mode와 품질/속도 trade-off를 표시한다: low-end 설명 1차 완료
- main/preload/shared/renderer contract가 같은 mode enum을 사용한다: 완료
- 남은 범위: 별도 Settings 화면 노출 여부 결정, mode 변경 후 이미 실행 중인 RAG run에 대한 적용 시점 안내

#### Phase 4-4c. mode별 writer-flow 검증

비유: 단순히 이름 검색이 빠른지가 아니라, 작가가 "12화 기준으로 이 설정 써도 돼?"라고 물었을 때 저사양 모드도 근거를 놓치지 않는지 보는 단계다.

완료 기준:

- 365 eval 기준 low-end/standard/high-end/quality recall 비교: 1차 완료
- 미래 정보 누수, 초안/폐기 오염, 충돌 후보 질문을 mode별로 비교한다.
- 단일 평균이 아니라 p50/p95/max latency를 함께 저장한다: RAG path 1차 완료
- p99와 cold/warm 분리 측정은 남아 있다.

### Phase 4-5. background job 제어

작업:

- indexing, embedding, summary refresh, repair job을 background로 보내되 작가가 통제할 수 있게 한다.

필수 기능:

- pause
- resume
- cancel
- progress 저장
- app restart 후 재개
- 실패 job 재시도 제한

완료 기준:

- job 상태 machine 테스트
- cancel 후 partial write 없음
- restart 후 progress 복구

## Phase 5. 작가용 UI 통합

비유: 지금은 조수가 내부적으로 책갈피를 찾아온다. Phase 5는 그 책갈피, 경고 딱지, 충돌 표시를 작가 책상 위에 보기 좋게 붙이는 단계다.

목표:

- 작가가 AI 답변을 믿어도 되는지 바로 판단할 수 있게 한다.

### Phase 5-1. evidence-first answer UI

작업:

- 답변보다 근거를 먼저 확인할 수 있게 한다.

UI 요소:

- 근거 quote
- 회차/장면 링크
- 확정/추정/근거부족 라벨
- 사용된 memory 목록

완료 기준:

- 답변에서 원문 위치로 이동 가능
- 근거 없는 답변은 확정 라벨 금지

### Phase 5-2. conflict warning UI

작업:

- 설정 충돌 가능성을 작가에게 보여준다.

UI 요소:

- 충돌 후보 양쪽 quote
- 어느 회차에서 나온 설정인지
- confirm/reject/defer 버튼

완료 기준:

- conflict ledger와 연결
- 작가 결정이 memory 상태에 반영

### Phase 5-3. timeline-aware query UI

작업:

- "몇 화 기준으로 답할지"를 UI에서 명확히 한다.

완료 기준:

- 현재 편집 중인 회차 기준 자동 설정
- 사용자가 기준 회차 변경 가능
- 미래 정보가 섞이면 경고

### Phase 5-4. writer workflow scenario test

작업:

- 실제 작가 작업 흐름을 DOM/e2e/service 테스트로 만든다.
- 단일 질문 flow가 아니라 반복 집필 flow를 다룬다.

기본 시나리오:

```text
작가가 12화를 쓰는 중
→ "여주가 약의 정체를 지금 알아도 돼?" 질문
→ 시스템이 12화 이전 근거만 검색
→ 18화 정보는 미래 정보로 경고
→ 근거 부족이면 확정 답변 차단
```

필수 writer workflow 6종:

1. 설정 질문
   - 작가가 현재 회차 기준으로 설정을 물어본다.
   - 근거 quote와 safety label이 표시되어야 한다.

2. 집필 중 충돌 자동 감지
   - 작가가 새 문단을 쓰는 순간 기존 설정과 충돌할 수 있는지 확인한다.
   - 확정 충돌이 아니면 "검토 필요"로 표시한다.

3. 과거 회차 수정
   - 작가가 12화를 고친다.
   - 18화 이후 memory/evidence가 stale 되는지 확인한다.
   - stale evidence는 repair 또는 review backlog로 이동한다.

4. 초안 폐기
   - 작가가 초안 설정을 폐기한다.
   - 폐기 source가 정사 답변에 섞이면 경고한다.

5. 인물명/별칭 변경
   - 인물 이름이나 별칭이 바뀐다.
   - 과거 evidence와 alias link가 깨지지 않아야 한다.

6. 회차 순서 변경
   - chapter order가 바뀐다.
   - temporal fact와 future leakage 판단이 재계산되어야 한다.

완료 기준:

- DOM/e2e 테스트 존재
- service 단위 테스트 존재
- 실제 UI label 검증
- evidence quote 표시 검증
- stale repair/backlog 전이 검증
- chapter order 변경 후 temporal 판단 검증

## Phase 6. Package durability와 이식성

비유: 작가가 노트북을 바꾸거나 원고 파일을 옮겨도 설정 담당 편집자의 노트가 같이 따라가야 한다.

목표:

- `.luie` 파일 안의 memory canonical package가 항상 DB와 맞게 유지된다.

### Phase 6-1. canonical sync 강화

작업:

- DB와 package memory payload 차이를 자동 감지한다.
- import/export 후 row count뿐 아니라 source id도 검증한다.

완료 기준:

- package sync verifier 통과
- missing/extra row 자동 보고
- scoped id/source id mismatch 검출

### Phase 6-2. migration compatibility

작업:

- 오래된 `.luie` 파일도 새 memory schema로 안전하게 연다.

완료 기준:

- schema version별 migration test
- missing field 기본값 처리
- unknown field 보존 또는 명확한 discard 정책

### Phase 6-3. crash-safe export

작업:

- export 중 앱이 꺼져도 package가 깨지지 않게 한다.

완료 기준:

- atomic write
- temp entry cleanup
- corrupted package recovery test

## Phase 7. 실제 작가 베타 기준 검증

비유: 내부 시험을 통과한 조수를 실제 작가 작업실에 앉혀 보는 단계다.

목표:

- 기능이 아니라 작가 생산성 기준으로 검증한다.

### Phase 7-1. writer task benchmark

작업:

- 작가가 실제로 하는 작업을 benchmark로 만든다.

벤치마크:

- 설정 확인
- 인물 관계 확인
- 떡밥 회수 여부 확인
- 회차 기준 지식 상태 확인
- 초안/정사 충돌 확인

완료 기준:

- task별 성공률
- 평균 응답 시간
- 근거 만족도
- false confidence rate

### Phase 7-2. feedback loop

작업:

- 작가가 "이 답변 틀림", "이 근거 좋음"을 표시하면 eval set에 반영한다.

완료 기준:

- feedback 저장
- eval case 자동 후보 생성
- rejected answer 재발 방지

## 최종 완료 기준

RAG + Memory Engine이 다음 조건을 만족하면 "웹소설 작가용 설정 담당 편집자"라고 부를 수 있다.

```text
1. 원문 근거를 빠르게 찾는다.
2. 현재 회차 기준으로 답한다.
3. 미래 정보를 섞지 않는다.
4. 초안/폐기 설정을 정사로 말하지 않는다.
5. 근거 없는 확정 답변을 차단한다.
6. 충돌 가능성을 quote와 함께 보여준다.
7. 장편 프로젝트에서도 저사양 모드로 버틴다.
8. .luie 파일을 옮겨도 memory가 깨지지 않는다.
```

현재는 1번과 8번의 기초가 가장 강하고, 2~6번은 기반이 있으며, 7번은 앞으로 검증해야 한다.

## Sub Agent 객관 리뷰 반영 기록

리뷰 결론:

- 조건부 승인

리뷰에서 지적된 핵심 문제:

1. 기존 `sourceType`은 출처 위치 의미인데, `canon/draft/discarded`를 넣으면 의미가 충돌한다.
2. Phase 3-3의 conflict ledger가 기존 `MemoryFactInvalidation`과 어떤 관계인지 불명확하다.
3. 테스트 설계가 질문-답변 flow 중심이라 실제 작가의 반복 작업을 충분히 반영하지 못한다.
4. Phase 4의 저사양/장편 기준이 추상적이다.
5. 이미 구현된 기능과 신규 작업이 섞여 있어 구현 우선순위가 흐릴 수 있다.

반영한 수정:

- `sourceType` 재정의 금지 원칙 추가
- `provenanceKind` 또는 `canonStatus` 별도 설계로 변경
- `MemoryFactInvalidation` 적합성 검토 후 부족할 때만 `MemoryConflictLedger` 설계하도록 변경
- writer workflow test를 6종으로 확장
  - 설정 질문
  - 집필 중 충돌 자동 감지
  - 과거 회차 수정
  - 초안 폐기
  - 인물명/별칭 변경
  - 회차 순서 변경
- 저사양 기준 장비, 100만~300만 자 데이터셋, first/repeated/edit-after-index latency 측정 추가
- background job의 pause/resume/cancel/progress/restart recovery 추가
- 기존 구현 확장 / 신규 schema / UI 노출 / 테스트만 추가를 구분하는 실행 원칙 추가

남은 검토 사항:

- `provenanceKind`와 `canonStatus`는 schema에 분리 반영했다.
- `MemoryFactInvalidation`은 1차 fact conflict ledger로 사용할 수 있음을 확인했다. 다만 defer/review status까지 필요하면 확장 설계가 필요하다.
- LLM answer judge는 아직 기술 선택과 비용/속도 정책을 확정하지 않았다.

### 2026-06-11. Phase 4-4 sub-agent 객관 리뷰 반영

리뷰 결론:

- Risky

확인된 사실:

- Phase 4-4의 방향과 코드 위치는 프로젝트 구조와 대체로 일관적이다.
- 현재 구현은 "저사양 모드 전체 완료"가 아니라 "저사양 검색 정책/벤치마크 계약 1차"다.
- 현재 latency runner 테스트는 장편 데이터 부하에는 일부 현실성이 있지만, 실제 작가 의사결정 flow 검증은 아직 부족하다.
- benchmark runner는 현재 lexical `LIKE` 후보 검색 중심이라 실제 FTS/vector/RRF/RAG context assembly 비용을 대표하지 못한다.
- `cacheTtlMemoryComparison`은 실제 cache 측정이 아니라 추정치다.

반영한 수정:

- Phase 4-1의 1만 chunk 상태를 "profile 정의 + Phase 4-3 latency 1차 실행 완료, 장시간/p95/p99/cold-warm은 남음"으로 정리했다.
- Phase 4-4를 다음 하위 단계로 쪼갰다.
  - Phase 4-4a. 저사양 검색 정책/벤치마크 계약
  - Phase 4-4b. 저사양 앱 토글/UI 설명
  - Phase 4-4c. mode별 writer-flow 검증
- 실제 검색/RAG 경로 계측, p50/p95/p99, cold/warm, cache hit/miss, mode별 eval recall guard를 남은 작업에 추가했다.

### 2026-06-11. Phase 4-4 재리뷰 반영

리뷰 결론:

- 조건부 통과

확인된 사실:

- phase 방향은 현재 프로젝트 구조와 대체로 일관적이다.
- `sourceType`을 출처 위치 의미로 유지하고 `provenanceKind`/`canonStatus`를 분리하는 제한은 적절하다.
- 작가 flow taxonomy는 회차 기준, 미래 정보 누수, 초안/폐기 설정, 관계 방향, 떡밥, 감정선, 세계관 충돌을 포함한다.
- Phase 4-4a/4-4b/4-4c 분리는 이전보다 명확하다.
- 실제 RAG 경로와 Layer 3 evidence 경로 계측을 추가해 lexical-only benchmark 한계를 일부 줄였다.

리뷰에서 지적된 핵심 문제:

1. Phase 4-3/4-4의 `완료`, `남은 작업`, `1차 완료` 표현이 섞여 있었다.
2. `optimizationModeComparison`은 low-end/standard/quality만 비교하고 high-end를 빠뜨렸다.
3. 365 eval guard가 실제 LLM 장문 답변 품질까지 검증한 것으로 읽힐 수 있었다.
4. vector stage는 현재 low-end benchmark query에서 skip되므로 vector enabled 비용 대표값이 아니다.
5. `parentWindow` stage 후보 수는 candidate cap과 의미가 달라 같은 cap assertion을 적용하면 테스트 의미가 모호했다.

반영한 수정:

- Phase 4-3/4-4 상태 표기를 `완료된 범위`, `아직 검증 안 된 범위`, `다음 실행 단위`에 가깝게 정리했다.
- `optimizationModeComparison`에 high-end를 포함했다.
- 365 eval 비교를 low-end/standard/high-end/quality 4개 mode로 갱신했다.
- eval 결과가 headless Layer 3 evidence retrieval 기준이며 실제 LLM 장문 답변 품질을 보장하지 않는다고 반복 명시했다.
- `parentWindow` stage는 candidate cap assertion 대상에서 제외했다.

남은 검토 사항:

- p99와 cold/warm 분리 측정
- query category별 latency/recall 비교
- vector enabled 환경의 실제 vector stage 비용
- 실제 cache hit/miss, entry count, heap delta, eviction 계측
- mode 변경이 다음 검색부터 적용되는지, 현재 실행 중인 run에도 적용되는지 UI 문구 결정

## 진행 기록

### 2026-06-11. Phase 1-1 완료

확인된 사실:

- 작가 pain point taxonomy를 9개 카테고리로 고정했다.
- taxonomy를 공유 상수와 문서, 테스트에 연결했다.
- deprecated category인 `timeline-leak`, `continuity-conflict`를 repair 명령으로 제거할 수 있게 했다.
- 실제 프로젝트 기준 eval case/evidence가 51개에서 91개로 늘었다.
- RAG 평가 결과 `caseCount: 91`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 198/198 rows로 일치했다.

### 2026-06-11. Phase 1-2 완료

확인된 사실:

- materialize CLI의 `--limit` 상한을 100에서 1000으로 확장했다.
- 작가 질문형 eval case를 300개까지 생성했다.
- taxonomy repair 결과 deprecated category 제거 대상은 0개였다.
- 실제 프로젝트 기준 eval case/evidence가 91개에서 301개로 늘었다.
- RAG 평가 결과 `caseCount: 301`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 618/618 rows로 일치했다.

제한:

- 이 결과는 gold evidence가 있는 평가셋에서 검색 근거를 회수하는 성능이다.
- 실제 LLM 장문 답변의 환각 차단, 미래 정보 누수 차단, 초안/폐기 설정 차단까지 완료됐다는 뜻은 아니다.

### 2026-06-11. Phase 1-3 완료

확인된 사실:

- 회차가 연결된 chunk에서 `temporal-chapter:{chapterOrder}:{chunkId}` eval case를 생성할 수 있게 했다.
- 생성된 temporal case는 `temporalScopeStartChapterId`와 `temporalScopeEndChapterId`를 해당 회차로 고정한다.
- 질문 문구는 "N화 기준으로, 이후 회차 정보 없이 확정해도 되는가" 형태다.
- 실제 프로젝트 기준 temporal chapter eval case 64개를 추가했다.
- 실제 프로젝트 기준 eval case/evidence가 301개에서 365개로 늘었다.
- RAG 평가 결과 `caseCount: 365`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 746/746 rows로 일치했다.

제한:

- 현재 Phase 1-3은 회차 scope가 있는 질문 케이스를 생성하는 단계다.
- `queryChapterOrder`를 eval case schema에 직접 저장하는 단계는 아직 아니다.
- 미래 fact를 사용했을 때 P0로 잡는 scorer 기반은 이미 있지만, 실제 answerer가 모든 temporal 질문에서 chapter order를 항상 넘기는지는 다음 단계에서 더 검증해야 한다.

### 2026-06-11. Phase 1-4 완료

확인된 사실:

- eval 품질 audit을 추가했다.
- audit은 `MemoryEvalCase`와 `MemoryEvalEvidence`, `MemoryChunk`를 함께 보고 다음을 검사한다.
  - gold quote가 expected chunk 안에서 token overlap으로 뒷받침되는가
  - expectedAnswer가 gold evidence로 뒷받침되는가
- quote에 HTML 태그나 줄바꿈이 섞여도 token overlap으로 검사한다.
- `--quality-audit` 명령으로 품질 리포트를 볼 수 있다.
- `--repair-quality` 명령으로 unsupported expectedAnswer를 gold evidence 기반 답변으로 수리할 수 있다.
- 실제 프로젝트 품질 audit 결과는 다음과 같았다.

```text
evalCasesScanned: 365
evalEvidenceScanned: 365
evidenceQuoteMissingInExpectedChunk: 0
expectedAnswerUnsupported: 0
repairedExpectedAnswers: 0
```

- 기존 evidence link repair를 실행해 stale evidence link 3건을 수리했다.

```text
episodeEvidenceRepaired: 2
evalEvidenceRepaired: 1
unresolved: 0
```

- RAG 평가 결과 `caseCount: 365`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 746/746 rows로 일치했다.

제한:

- 품질 audit은 deterministic token overlap 기반이다.
- 의미적으로 맞지만 표현이 크게 다른 expectedAnswer 검증은 Phase 2의 LLM judge에서 더 다뤄야 한다.

### 2026-06-11. Phase 2-1 완료

확인된 사실:

- deterministic guard failure type을 8종으로 확장했다.

```text
unsupported_confirmed_answer
answer_contains_unsupported_claim
expected_answer_not_supported_by_gold_evidence
deleted_or_draft_fact_confirmed
future_fact_used_in_past_answer
relation_direction_reversed
entity_alias_mismatch
unresolved_thread_falsely_marked_resolved
```

- `entity_alias_mismatch`를 추가했다.
  - 같은 별칭이 다른 canonical entity로 관측되면 P0로 잡는다.
  - 같은 canonical entity로 관측되면 오탐하지 않는다.
- `unresolved_thread_falsely_marked_resolved`를 추가했다.
  - 미회수 떡밥을 resolved로 관측하면 P0로 잡는다.
  - unresolved로 유지하면 오탐하지 않는다.
- eval suite 결과에 `p0FailureTypeCounts`를 추가했다.
- runner는 answerer가 반환한 observed entity/thread 정보를 scorer로 넘길 수 있다.
- false positive 회귀 테스트를 추가했다.
- 실제 프로젝트 RAG 평가 결과는 다음과 같았다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- 이 단계는 LLM 없이 판단 가능한 deterministic guard다.
- 실제 LLM 장문 답변의 의미적 누락, 애매한 모순, 작가 유용성 평가는 Phase 2-2의 LLM answer judge가 필요하다.
- renderer에서 위험 답변을 차단하는 정책은 Phase 2-3 범위다.

### 2026-06-11. Phase 2-2 judge 계약 완료

확인된 사실:

- answer judge prompt version을 고정했다.

```text
memory-eval-answer-judge-v1
```

- judge 결과 JSON schema를 코드로 고정했다.
- judge 결과는 다음 축을 가진다.

```text
groundedness: grounded | unsupported
contradiction: none | present
temporalLeakage: none | present
omission: none | present
writerUsefulness: useful | not_useful
verdict: pass | fail | invalid
evidenceQuotesUsed: string[]
rationale: string
```

- malformed JSON은 `invalid_json`으로 처리한다.
- schema가 맞지 않으면 `invalid_schema`로 처리한다.
- prompt version이 다르면 `unsupported_prompt_version`으로 처리한다.
- judge가 사용한 evidence quote가 없으면 `missing_evidence_quote`로 invalid 처리한다.
- `MemoryEvalResult.answerJudgeJson`에 judge artifact를 저장할 수 있게 했다.
- runner는 answerer 결과를 받은 뒤 optional answer judge를 호출하고, parse 결과를 eval result 계열에 저장한다.
- invalid judge artifact도 eval result에 남기고 confirmed memory를 만들지 않는다.
- 실제 프로젝트 기존 eval runner는 answer judge 없이도 정상 동작했다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- 이 단계는 LLM answer judge의 계약, schema, 저장 경계를 완성한 것이다.
- 실제 provider 호출, 비용/속도 정책, judge prompt 본문 튜닝은 아직 별도 보강이 필요하다.
- judge 결과를 renderer 답변 차단 정책에 연결하는 작업은 Phase 2-3 범위다.

### 2026-06-11. Phase 2-3 완료

확인된 사실:

- RAG 답변 contract에 `safety`를 추가했다.
- safety는 다음 필드를 가진다.

```text
label
message
blocksConfirmedAnswer
reasons
```

- safety label은 다음 값을 가진다.

```text
confirmed
inferred
insufficient_evidence
conflicting
blocked_p0
temporal_blocked
non_canonical_source
```

- `buildRagAnswerSafety` 정책을 추가했다.
- 기존 `buildRagGrounding` 결과와 safety label mapping을 테스트로 고정했다.
- 정책 mapping은 다음과 같다.

```text
P0 failure 있음 → blocked_p0
future_fact_used_in_past_answer → temporal_blocked
deleted_or_draft_fact_confirmed → non_canonical_source
근거 0개 → insufficient_evidence
conflicting grounding → conflicting
근거 있음, 문장별 검증 전 → inferred
```

- RAG QA 결과 생성 시 `safety`가 자동으로 붙는다.
- renderer message contract에 `safety`를 추가했다.
- RAG stream 완료 시 `payload.result.safety`를 message에 복사한다.
- MessageList에서 safety label과 safety message를 표시한다.
- renderer helper에 `safetyLabel`, `safetyTone`을 추가했다.
- 실제 프로젝트 기존 eval runner는 정상 동작했다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- runtime RAG 답변에는 현재 deterministic safety policy가 붙는다.
- 실제 LLM judge 결과를 runtime RAG safety에 직접 반영하는 연결은 아직 별도 보강이 필요하다.
- Phase 3의 정사/초안/폐기 출처 분리가 완료되면 `non_canonical_source` 판단 근거를 더 넓힐 수 있다.

### 2026-06-11. Phase 3-3 conflict quote queue 연결

확인된 사실:

- `MemoryFactInvalidation`은 기존 fact와 새 fact의 충돌 쌍, reason, 생성 시점을 표현할 수 있다.
- 양쪽 근거 문장은 `MemoryFactEvidence`와 `MemoryEpisodeEvidence`를 join해서 조회할 수 있다.
- `MemoryConflictFactSummary`에 `evidenceQuotes`를 추가했다.
- `fetchConflictFactPairs`는 invalidated/invalidating 양쪽 fact의 evidence quote를 반환한다.
- 분석 패널에 `ConflictQueuePanel`을 연결했다.
- 충돌 큐를 열면 현재 프로젝트/챕터/memory scope 기준으로 `getConflictQueue`를 호출한다.
- 사용자는 충돌 항목에서 이전 사실 또는 신규 사실을 채택할 수 있고, UI는 기존 `resolveFactConflict` IPC를 호출한다.

검증:

```text
pnpm vitest tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/services/memory/query/narrativeMemoryQueryService.test.ts tests/renderer/analysisConflictResolution.test.ts
pnpm run typecheck
pnpm exec eslint <Phase 3-3 touched files>
```

제한:

- `defer`, `reviewing`, `hidden`, `resolvedAt`, `reviewerNote` 같은 작가 검토 상태 영속화는 아직 없다.
- 이 상태가 필요하면 `MemoryFactInvalidation` 확장 또는 별도 `MemoryConflictLedger`가 필요하다.
- 현재 UI 검증은 정적 소스 검사 중심이다. 실제 작가 플로우 DOM/e2e 검증은 Phase 5 범위에서 보강해야 한다.

### 2026-06-11. Phase 3-4 suggested memory review UI/reject reason 저장

확인된 사실:

- 분석 패널에 `FactReviewPanel`, `EpisodeReviewPanel`, `EntityReviewPanel`, `EntityAliasReviewPanel`을 연결했다.
- 각 review panel은 사용자가 펼칠 때 suggested queue를 조회한다.
- fact/entity/entity alias/episode confirm은 기존 IPC를 호출한다.
- fact/entity/entity alias/episode reject는 `window.prompt`로 받은 reason을 IPC payload에 포함한다.
- `MemoryEntity`와 `MemoryEntityAlias`에 `rejectedAt`, `rejectionReason`을 추가했다.
- 기존 DB를 위해 `MemoryEntity`/`MemoryEntityAlias` column patch를 추가했다.
- entity/entity alias reject service는 빈 reason을 거부하고 reason을 저장한다.
- entity alias panel은 merge/split action도 기존 IPC에 연결한다.
- episode panel은 confirm 버튼을 추가해 accept/reject flow를 맞췄다.

검증:

```text
pnpm vitest tests/renderer/analysisMemoryReviewWorkflow.test.ts
pnpm vitest tests/main/services/memory/entity/memoryEntityReviewService.test.ts tests/main/services/memory/review/memoryReviewDecisionApply.test.ts tests/renderer/analysisMemoryReviewWorkflow.test.ts
pnpm vitest tests/renderer/analysisMemoryReviewWorkflow.test.ts tests/renderer/analysisConflictResolution.test.ts
pnpm run typecheck
pnpm exec eslint <Phase 3-4 touched files>
```

제한:

- reject reason 입력은 native prompt 기반 최소 구현이다.
- 실제 DOM/e2e에서 작가가 큐를 열고 승인/거절하는 end-to-end 검증은 아직 없다.

### 2026-06-11. Phase 4-1 longform benchmark seed/materialize

확인된 사실:

- `MEMORY_LONGFORM_BENCHMARK_PROFILES`에 `ci-1000`, `manual-300ch`, `manual-500ch`, `manual-10000`을 추가했다.
- `ci-1000`은 low-end 기준 100화/1000 chunk/100만 자 profile이다.
- `manual-10000`은 500화/10000 chunk/300만 자 profile이다.
- benchmark manifest는 alias 반복, 회차 재정렬, 중간 리라이트, stale embedding, summary refresh, review backlog, renderer list 부하 scenario를 포함한다.
- 같은 seed로 생성하면 같은 manifest가 나온다.
- `memory:benchmark-seed` 스크립트를 추가했다.
- `--materialize --project-id` 옵션으로 manifest를 실제 DB의 `Project`, `Chapter`, `MemoryChunk` row로 적재할 수 있다.
- materializer는 같은 project id 재실행 시 중복 삽입하지 않는다.
- 실제 `ci-1000` manifest 출력은 100 chapters, 1000 chunks, 1,000,000 chars, packageRowEstimate 1112였다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryLongformBenchmarkSeed.test.ts tests/main/services/memory/benchmark/memoryLongformBenchmarkMaterialize.test.ts tests/scripts/memoryBenchmarkSeedRunner.test.ts
pnpm exec tsx scripts/generate-memory-benchmark-seed.ts --profile ci-1000 --seed 42 --out tests/.tmp/memory-benchmark-ci-1000.json
pnpm run typecheck
pnpm exec eslint <Phase 4-1 touched files>
```

제한:

- 1만 chunk profile은 정의됐지만 실제 장시간 benchmark run은 아직 하지 않았다.
- materialized row 기반 latency/memory usage 측정은 Phase 4-2 범위다.

### 2026-06-11. Phase 4-2 latency budget/report + memory snapshot

확인된 사실:

- `MEMORY_BENCHMARK_LATENCY_BUDGETS`에 작가 체감 기준 latency와 memory budget을 고정했다.
- first query after start 목표는 3000ms, repeated query 목표는 1000ms다.
- 일반 근거 검색 목표는 1000ms, 복합 memory query 목표는 3000ms다.
- RSS budget은 512MiB, heap used budget은 256MiB로 1차 설정했다.
- `runMemoryBenchmarkLatencyReport`는 materialized benchmark project에서 chunk 검색 latency를 측정한다.
- report는 `firstChunkSearch`, `repeatedChunkSearch`, `memoryUsage`, `sqlitePageCache`, `editAfterIndexPlan`, `packageProgressPlan`을 반환한다.
- report는 `regressionThresholds`에 first/repeated query latency, RSS, heap 기준선을 함께 반환한다.
- `summarizeMemoryBenchmarkLatencyFailures`는 fail 상태인 latency/memory 항목만 CI 실패 메시지로 요약한다.
- `memory:benchmark-latency` 스크립트를 추가했다.
- `--materialize --project-id --query --out`으로 benchmark project 생성과 latency/memory report 출력을 한 번에 수행할 수 있다.
- `--assert-thresholds`를 붙이면 threshold fail이 있을 때 리포트 생성 후 non-zero exit로 실패한다.
- 실제 `ci-1000` materialized run에서 `"검은 기사"` query report가 생성됐다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryLongformBenchmarkSeed.test.ts tests/main/services/memory/benchmark/memoryLongformBenchmarkMaterialize.test.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkSeedRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-ci-1000.json --assert-thresholds
pnpm run typecheck
pnpm exec eslint <Phase 4-2 touched files>
```

제한:

- cold start 측정은 실제 Electron app start 직후 query hook과 아직 연결되지 않았다.
- edit-after-index repair job의 실제 background 소요 시간은 아직 측정하지 않았다.
- 1만 chunk profile 장시간 run은 아직 수동 benchmark로 남아 있다.
- threshold assert mode는 생겼지만 CI workflow에 artifact 업로드와 gate로 아직 연결하지 않았다.

### 2026-06-11. Phase 4-3 search optimization policy

확인된 사실:

- `SearchOptimizationPolicy`를 추가했다.
- 기본 mode는 `standard`다.
- Phase 4-3 당시 low-end mode는 result limit 40, candidate cap 40, context budget 6144 chars, rerank cache TTL 300초, vector mode `skip-when-lexical-hits`로 시작했다.
- Phase 4-4 eval guard에서 candidate cap 40은 averageContextRecallAtK 0.9698630136986301로 0.98 기준을 통과하지 못해 candidate cap 50으로 보정했다.
- standard mode에서 requested limit 20은 candidate cap 60, context budget 8192 chars, rerank cache TTL 180초로 해석된다.
- `searchChunks`의 FTS/short-token/vector 후보 LIMIT가 policy candidate cap을 사용한다.
- RAG `searchMemoryChunksForRag`의 FTS/exact phrase/quote-token/short-token/vector 후보 LIMIT가 policy candidate cap을 사용한다.
- `assembleRagContext`는 requested context budget을 policy context cap 안으로 제한한다.
- latency benchmark report는 현재 적용된 `optimizationPolicy`를 함께 출력한다.
- latency benchmark report는 `candidateCapComparison`으로 cap 20/40/current baseline의 latency, result count, baseline overlap ratio를 출력한다.
- latency benchmark report는 `cacheTtlMemoryComparison`으로 TTL 60초/180초/300초별 예상 entry 수와 예상 memory 사용량을 출력한다.
- vector search는 `MemoryEmbedding`을 현재 `MemoryChunk`와 join하고, embedding hash가 현재 `indexTextHash/contentHash`와 같을 때만 후보로 사용한다.
- `manual-10000` materialize 중 1만 chunk 단일 insert가 stack overflow를 일으켜 chunk insert를 500개 batch로 나눴다.
- benchmark `sourceId`는 `MemoryChunk_source_chunkIndex_key` 전역 unique와 충돌하지 않도록 project-qualified id로 저장한다.
- `manual-10000` CLI report는 500 chapters, 10000 chunks, 3,000,000 chars 기준으로 생성됐다.
- `manual-10000` report에서 firstChunkSearch 0.472ms, repeatedChunkSearch 0.463ms, RSS 225.5MiB, heapUsed 49.814MiB였다.
- `memoryEvalOptimizationGuard`를 추가해 averageContextRecallAtK와 totalP0FailureCount를 threshold로 검사한다.
- `memory:run-eval-suite --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0` 옵션을 추가했다.
- 실제 365개 eval run에서 averageContextRecallAtK 0.9972602739726028, totalP0FailureCount 0으로 guard가 통과했다.

검증:

```text
pnpm vitest tests/main/services/search/searchOptimizationPolicy.test.ts tests/main/services/search/vectorSearchStaleEmbedding.test.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-ci-1000.json --assert-thresholds
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile manual-10000 --seed 42 --materialize --project-id benchmark-latency-cli-manual-10000-v2 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-manual-10000.json --assert-thresholds
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-3-optimized-rag --top-k 5 --out tests/.tmp/memory-eval-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run typecheck
pnpm exec eslint <Phase 4-3 touched files>
```

제한:

- candidate cap 비교는 `ci-1000` 기준 baseline overlap 1차 리포트다. 실제 정답 recall 평가는 아직 아니다.
- cache TTL memory 비교는 estimated entry size 기반 1차 추정이다. 실제 top-k rerank cache 저장소와 heap delta 계측은 아직 없다.
- stale embedding skip은 vector search 경로에 적용됐다. 다만 skip된 stale row 수를 report하는 계측은 아직 없다.
- 1만 chunk manual benchmark는 latency/memory report까지 완료됐다. 1만 chunk 데이터셋 자체의 별도 정답 recall 평가는 아직 없다.
- eval recall guard는 headless Layer 3 evidence retrieval 기준이다. 실제 LLM 장문 답변 품질 전체를 보장하는 검증은 아니다.

### 2026-06-11. Phase 4-4 low-end mode, UI toggle, actual RAG path 계측

확인된 사실:

- `memory:benchmark-latency`와 `memory:run-eval-suite`가 `--optimization-mode low-end|standard|high-end|quality`를 받는다.
- benchmark/eval output은 실제 적용된 `optimizationPolicy`를 저장한다.
- 앱 설정에 `llm.searchOptimizationMode`를 추가했고, main/preload/shared/renderer 계약을 같은 enum으로 연결했다.
- analysis panel composer에서 Search Mode를 바꿀 수 있고, low-end 설명은 "빠른 검색 · 근거 폭 좁음"으로 표시한다.
- low-end candidate cap 40은 365 eval에서 recall 0.9698630136986301로 실패했고, candidate cap 50은 low-end/standard/high-end/quality 모두 recall 0.9972602739726028, P0 0으로 통과했다.
- `ci-1000` low-end benchmark에서 `searchMemoryChunksForRag`는 p50 2.391ms, p95 4.268ms, max 4.268ms였다.
- 같은 run에서 `buildLayer3Evidence`는 p50 1.787ms, p95 2.458ms, max 2.458ms였다.
- stage breakdown 기준 주요 비용은 `shortToken` p50 1.424ms, `parentWindow` p50 0.571ms, `hydrate` p50 0.174ms였다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts tests/main/services/search/searchOptimizationPolicy.test.ts tests/main/manager/settingsManager.localLlm.test.ts tests/main/handler/ipcSettingsHandlers.security.test.ts tests/dom/analysisViewMode.test.tsx tests/scripts/memoryRunEvalSuiteRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000-low-end --query "검은 기사" --optimization-mode low-end --out tests/.tmp/memory-benchmark-latency-ci-1000-low-end.json --assert-thresholds
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-low-end-rag --top-k 5 --optimization-mode low-end --out tests/.tmp/memory-eval-low-end-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-standard-rag --top-k 5 --optimization-mode standard --out tests/.tmp/memory-eval-standard-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-high-end-rag --top-k 5 --optimization-mode high-end --out tests/.tmp/memory-eval-high-end-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-quality-rag --top-k 5 --optimization-mode quality --out tests/.tmp/memory-eval-quality-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run typecheck
pnpm exec eslint <Phase 4-4 touched files>
```

제한:

- p99와 cold/warm 분리 측정은 아직 없다.
- vector enabled 환경에서 stage별 비용은 아직 별도 검증하지 않았다.
- cache TTL 비교는 여전히 실제 cache hit/miss가 아니라 추정 기반이다.
- 실제 LLM 장문 답변 품질과 judge 비용은 이 수치로 보장되지 않는다.

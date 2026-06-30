# 개요와 기준선

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

## 2026-06-28 Sub Agent 검증 판정

아래 표는 phase 문서와 현재 코드/테스트를 나눠 검증한 결과다. `완료`는 작가 제품 기준의 완료를 뜻하고, `부분 완료`는 기반은 있으나 실제 작가 flow 검증이 남았다는 뜻이다.

| Phase | 현재 판정 | 근거 | 남은 핵심 |
| --- | --- | --- | --- |
| Phase 1. 작가 실전 시험지 확장 | 부분 완료 | 365개 eval case/evidence, pain point taxonomy, `queryChapterOrder` 저장 경로가 있다. | 템플릿 생성 case가 많아 실제 작가 질문 샘플링/검수가 필요하다. |
| Phase 2. answer judge/실패 분류 | 부분 완료 | P0 failure type, answer judge artifact, RAG safety label UI가 있다. | LLM judge는 일반 RAG runtime 차단 경로에 완전히 붙지 않았다. |
| Phase 3. Memory 저장 정책 | 부분 완료 / risky | fact path의 evidence/provenance guard와 conflict queue는 강하다. | entity/episode confirm은 canon/provenance guard가 약하고 review UI는 1차 수준이다. |
| Phase 4. Performance/jobs | 부분 완료 / risky | benchmark profile, search mode, memory build job control/progress가 있다. | 실제 앱 cold start, 장시간 p95/p99, 저사양 장편 artifact가 부족하다. |
| Phase 5. Writer UI | 부분 완료 | evidence-first UI, conflict panel, timeline composer가 있다. | 실제 UI 클릭/타이핑 E2E로 future block, conflict decision, 원문 jump를 닫아야 한다. |
| Phase 6. Package durability | 거의 완료 | `.luie` canonical sync, corrupt recovery, forced shutdown E2E가 있다. | SIGKILL 중 temp cleanup은 명시적 검증 제외다. |
| Phase 7. 실제 작가 베타 | 미완료 | benchmark/feedback/threshold infrastructure는 있다. | 실제 작가 beta data와 제품 threshold finalization이 없다. |

현재 제품 판정: **웹소설 작가용 설정 담당 편집자로는 아직 beta 수준**이다. Phase 6은 강하지만, Phase 1~5의 실제 writer-flow 검증과 Phase 7의 실제 베타 데이터가 남아 있다.

Writer-product phase 진행 로그:

```text
Phase 시작 전 MemoryEvalCase: 51
Phase 1-1 완료 후 MemoryEvalCase: 91
Phase 1-2 완료 후 MemoryEvalCase: 301
Phase 1-3 완료 후 MemoryEvalCase: 365
Phase 1-3 queryChapterOrder 저장/runner 연결 완료 후 MemoryEvalCase: 365
Phase 1-4 완료 후 MemoryEvalCase: 365
Phase 2-1 완료 후 MemoryEvalCase: 365
Phase 2-2 계약 완료 후 MemoryEvalCase: 365
Phase 2-3 완료 후 MemoryEvalCase: 365
Phase 2-3 judge safety mapping 1차 완료 후 MemoryEvalCase: 365
Phase 3-1 fact path 완료 후 MemoryEvalCase: 365
Phase 3-1 entity path provenance/canon 1차 완료 후 MemoryEvalCase: 365
Phase 3-1 episode path provenance/canon 1차 완료 후 MemoryEvalCase: 365
Phase 3-1 episode evidence provenance/canon 1차 완료 후 MemoryEvalCase: 365
Phase 3-1 entity alias/mention provenance/canon 1차 완료 후 MemoryEvalCase: 365
Phase 3-2a fact path 완료 후 MemoryEvalCase: 365
Phase 3-2a entity path 완료 후 MemoryEvalCase: 365
Phase 3-2a episode path 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence backlog path 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence defer state 1차 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence reject/resolved state 1차 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence review IPC 1차 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence review UI 1차 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence repair UI 1차 완료 후 MemoryEvalCase: 365
Phase 3-2b stale evidence DOM writer flow 1차 완료 후 MemoryEvalCase: 365
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
Phase 4-4 p99/cold-warm latency 계측 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 vector enabled synthetic probe 계측 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 rerank cache probe 계측 1차 완료 후 MemoryEvalCase: 365
Phase 4-4 전체 typecheck 회복 후 MemoryEvalCase: 365
Phase 4-4 writer-flow query category latency 계측 1차 완료 후 MemoryEvalCase: 365
Phase 4-5 memory build job control 계약 1차 완료 후 MemoryEvalCase: 365
Phase 4-5 memory build job control IPC/API 연결 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-3 paused/failed memory job dedupe 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-3 memory job claim helper 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-4 summary/embedding cooperative cancellation 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-5 settings memory progress/control UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-5 active progress polling 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-6b pause button pausable-state DOM guard 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-6c cancel button cancelable-state DOM guard 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-6d restart recovery Settings label DOM 검증 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-6d recovery marker locale key 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 jobType progress API/UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 retry/cancel attention UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 retry nextRetryAt UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 active polling backoff 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 active count polling backoff 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 progress delta polling backoff 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 progress snapshot cache 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 targetType progress API/UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 targetId progress API/UI 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 chapter target label 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 scene/note target label 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 synopsis/plot/world target label 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 target top-N SQL limit 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 chunk target label 1차 완료 후 MemoryEvalCase: 365
Phase 4-5-7 subagent review 보강 1차 완료 후 MemoryEvalCase: 365
Phase 5-1 evidence quote first MessageList DOM 1차 완료 후 MemoryEvalCase: 365
Phase 5-1 evidence location label DOM 1차 완료 후 MemoryEvalCase: 365
Phase 5-1 used memory chunk id DOM 1차 완료 후 MemoryEvalCase: 365
Phase 5-1 no-evidence confirmed label guard DOM 1차 완료 후 MemoryEvalCase: 365
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

# RAG + Memory Engine Phase Plan

## 현재 상태 점검

사실:

- 이 문서의 writer-product phase 기준 최신 명시 완료 지점은 **Phase 5-4 writer workflow scenario coverage 1차 완료**다.
- Phase 6-1 canonical sync verifier의 scoped id/source id mismatch 보고와 DB-level import/rebuild source id 검증은 1차 완료되어 있다.
- Phase 6-1 실제 `.luie` 파일 write/read를 포함한 memory canonical package 왕복 검증은 targeted integration test로 확인되어 있다.
- Phase 6-2 canonical memory payload schema version compatibility의 legacy/missing-version 허용, future-version 거부, unknown row field discard 정책은 1차 완료되어 있다.
- Phase 6-2 schema version fixture matrix와 legacy missing-version의 v1 정규화는 1차 완료되어 있다.
- Phase 6-2 unknown canonical row field discard를 `.luie` import warning과 renderer info toast로 사용자에게 알리는 경로는 1차 완료되어 있다.
- Phase 6-3 failed full write의 기존 package 보존과 temp/backup artifact cleanup 검증은 1차 완료되어 있다.
- Phase 6-3 atomic replace 실패 후 backup restore branch 검증은 기존 rollback 테스트로 확인되어 있다.
- Phase 6-3 corrupted package를 DB state에서 `.recovered-*` sqlite-v2 package로 복구하는 경로는 targeted test로 확인되어 있다.
- Phase 7-1 writer task benchmark의 5개 작가 작업 taxonomy와 metric summary 계약은 1차 완료되어 있다.
- Phase 7-1 live memory eval runner는 writer task benchmark summary와 case별 answerer 응답 시간 측정을 반환한다.
- Phase 7-1 writer task benchmark summary를 run별 DB row로 저장하는 경로는 1차 완료되어 있다.
- Phase 7-1 writer task benchmark threshold calibration gate는 1차 완료되어 있으며, beta sample 부족 시 threshold 확정을 거부한다.
- Phase 7-1 persisted writer benchmark threshold assessment CLI는 1차 완료되어 있다.
- Phase 7-2 writer feedback 저장 DB 모델과 main-domain 저장 서비스는 1차 완료되어 있다.
- Phase 7-2 writer feedback 저장 IPC/preload API 경로는 1차 완료되어 있다.
- Phase 7-2 analysis memory eval panel의 feedback 버튼 연결은 1차 완료되어 있다.
- Phase 7-2 `evidence_helpful` feedback을 기존 eval case의 gold evidence 후보로 반영하는 경로는 1차 완료되어 있다.
- Phase 7-2 `answer_wrong` feedback에서 eval case/evidence 후보를 자동 생성하는 경로는 1차 완료되어 있다.
- Phase 7-2 저장된 `answer_wrong` feedback과 동일 질문/동일 답변 반복을 감지하는 재발 방지 guard는 1차 완료되어 있다.
- Phase 7-2 rejected answer guard를 실제 RAG stream 완료 결과 safety block 경로에 연결했다.
- Phase 3-3에서 conflict quote queue와 기존 conflict resolve IPC/UI 연결은 이미 1차 완료되어 있다.
- Phase 5-2의 완료 기준인 conflict ledger 연결과 confirm/reject/defer 계열 memory 상태 반영 기반은 있다. `defer`와 `resolved`는 `MemoryFactInvalidation.reviewStatus`로 영속화된다.

판단:

- 현재는 **Phase 6-2 schema version fixture matrix 1차 완료 상태**다.
- 다만 실제 앱 강제 종료 중 export가 끊기는 crash-safe export E2E는 추가 보강 대상으로 남아 있다.
- 실제 작가 베타 데이터 기반 threshold 값은 아직 확정하지 않았다. 근거가 부족하다.

## 문서 구조

- [개요와 기준선](docs/phase/00-overview.md)
- [Phase 1. 작가 실전 시험지 확장](docs/phase/phase-1-eval-cases.md)
- [Phase 2. 답변 검수자 강화](docs/phase/phase-2-answer-judge.md)
- [Phase 3. Memory 저장 정책 강화](docs/phase/phase-3-memory-policy.md)
- [Phase 4. 장편 성능과 저사양 최적화](docs/phase/phase-4-performance-jobs.md)
- [Phase 5. 작가용 UI 통합](docs/phase/phase-5-writer-ui.md)
- [Phase 5 writer workflow coverage](docs/phase/phase-5-writer-workflow-coverage.md)
- [Phase 6. Package durability와 이식성](docs/phase/phase-6-package-durability.md)
- [Phase 7. 실제 작가 베타 기준 검증](docs/phase/phase-7-beta-validation.md)
- [최종 완료 기준](docs/phase/completion-criteria.md)
- [Sub Agent 객관 리뷰 반영 기록](docs/phase/review-notes.md)
- [진행 기록](docs/phase/progress-log.md)

## 관리 원칙

- 루트 `phase.md`는 현재 상태와 목차만 유지한다.
- phase별 세부 계획은 `docs/phase/phase-*.md`에 기록한다.
- 구현 완료 기록은 `docs/phase/progress-log.md`에 시간순으로 추가한다.
- 완료/1차 완료/미완료는 과장하지 않고, 확인된 검증 명령과 제한사항을 함께 적는다.

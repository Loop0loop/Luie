# RAG + Memory Engine Phase Plan

## 현재 상태 점검

사실:

- 이 문서의 writer-product phase 기준 최신 명시 완료 지점은 **Phase 5-4 writer workflow scenario coverage 1차 완료**다.
- Phase 3-3에서 conflict quote queue와 기존 conflict resolve IPC/UI 연결은 이미 1차 완료되어 있다.
- Phase 5-2의 완료 기준인 conflict ledger 연결과 confirm/reject 계열 memory 상태 반영 기반은 있다. `defer`는 현재 클라이언트 큐에서 숨기는 1차 UI로 연결됐고, defer/reviewing/resolved 같은 writer-facing conflict review 상태 영속화는 아직 남아 있다.

판단:

- 현재는 **Phase 5 전체 1차 완료 상태**다.
- 다만 실제 Electron E2E에서 원고 수정부터 RAG 질문까지 이어지는 긴 통합 시나리오는 추가 보강 대상으로 남아 있다.

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

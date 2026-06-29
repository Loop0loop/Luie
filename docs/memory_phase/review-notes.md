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

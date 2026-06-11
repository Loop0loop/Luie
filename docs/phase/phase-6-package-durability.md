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

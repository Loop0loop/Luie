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

완료된 범위:

- canonical package sync verifier가 table별 `missingInPackage`/`extraInPackage`를 보고한다.
- import-scoped DB id(`projectId:Table:sourceId`)와 package source id는 같은 row id로 비교한다.
- 같은 canonical row id가 있어도 FK/source id 필드가 다르면 `sourceIdMismatches`로 보고한다.
- canonical package payload를 실제 DB에 import한 뒤 다시 payload로 rebuild해 source id mismatch가 0인지 검증한다.

아직 남은 범위:

- source id mismatch 자동 복구는 하지 않는다.
- 실제 `.luie` 파일 write/read까지 포함한 package 왕복 검증은 추가 보강 대상이다.

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

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
- canonical package payload를 실제 `.luie` sqlite-v2 file에 write/read한 뒤 DB import/rebuild 비교까지 이어지는 왕복 검증을 추가했다.
- corrupted `.luie` package open을 실제 Electron renderer UI 클릭으로 실행하고 recovery banner가 표시되는지 E2E로 검증했다.

아직 남은 범위:

- source id mismatch 자동 복구는 하지 않는다.

### Phase 6-2. migration compatibility

작업:

- 오래된 `.luie` 파일도 새 memory schema로 안전하게 연다.

완료 기준:

- schema version별 migration test
- missing field 기본값 처리
- unknown field 보존 또는 명확한 discard 정책

완료된 범위:

- `schemaVersion`이 없는 legacy canonical memory payload는 v1로 읽을 수 있다.
- future `schemaVersion`은 조용히 받아들이지 않고 unsupported schema로 거부한다.
- canonical memory schema compatibility fixture matrix가 missing-version, explicit v1, future version, zero version, string version을 검증한다.
- `schemaVersion`이 없는 legacy canonical memory payload는 parse 시 v1로 정규화된다.
- canonical memory row의 unknown field는 import/apply 단계에서 DB column으로 보존하지 않고 discard하는 정책을 코드 상수로 고정했다.
- canonical memory row의 unknown field가 discard될 때 `.luie` import 결과에 table/fields/policy warning을 포함하고, renderer가 성공 import 후 info toast로 사용자에게 알린다.

### Phase 6-3. crash-safe export

작업:

- export 중 앱이 꺼져도 package가 깨지지 않게 한다.

완료 기준:

- atomic write
- temp entry cleanup
- corrupted package recovery test

완료된 범위:

- 실패한 SQLite-backed `.luie` full write가 기존 package entry를 유지하는지 검증한다.
- 실패한 full write 후 `.tmp-*`/`.bak-*` package artifact가 남지 않는지 검증한다.
- atomic replace가 target을 backup으로 옮긴 뒤 새 target rename에 실패하면 기존 파일을 복구하는지 검증한다.
- corrupted `.luie` package open 시 기존 DB project state에서 `.recovered-*` sqlite-v2 package를 생성하고 attachment path를 복구 경로로 옮기는지 검증한다.
- corrupted `.luie` package open 결과가 renderer의 recovery notice state로 연결되는지 DOM 운영 시나리오 테스트로 검증한다.
- corrupted `.luie` package open을 실제 Electron renderer UI 클릭으로 실행하고 recovery banner가 표시되는지 E2E로 검증했다.

아직 남은 범위:

- crash-safe export 자체의 실제 앱 강제 종료 시나리오는 아직 별도 E2E로 검증하지 않았다.

# DB-10E world·snapshot 증분 확대 조건 판정 보고서

## 문서 정보

| 항목             | 값                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| 테스트 기준      | `implementation-todo.md` DB-10E, `database.md` DB-10                                                            |
| 테스트 대상      | DB-10D 측정 결과, `ProjectService.persistPackageAfterMutation`, `SnapshotService`, `WorldReplicaService`        |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 결정표, 상태 전이, 경곗값 분석                                                          |
| 테스트 레벨      | Document Review / Unit Regression / Real DB·Filesystem Integration                                              |
| 실행일           | 2026-09-13 KST                                                                                                  |
| 기준 HEAD        | `0faf4fad`                                                                                                      |
| 환경             | Darwin 25.6.0 arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, mock service 및 worker별 임시 DB·`.luie` 파일 |

## 조건 계약

DB-10E는 독립적인 필수 구현이 아니라 다음 gate가 모두 참일 때만 world·snapshot entry 증분 저장을 추가하는 조건부 항목이다.

| 조건 | 판정 기준                                                                                      | 현재 결과 |
| ---- | ---------------------------------------------------------------------------------------------- | --------- |
| G1   | DB-10D가 실제 사용자 크기 package의 latency·write bytes·event-loop 지연을 측정했다.            | 거짓      |
| G2   | 측정값이 합의된 성능 한계 또는 저장 지연 budget을 초과해 full export를 잔존 병목으로 판정했다. | 거짓      |
| G3   | world·snapshot의 여러 entry 변경·삭제를 원자적으로 갱신하는 계약과 crash 검증 범위가 정해졌다. | 거짓      |

DB-10D 보고서는 crash/restart 일치성을 검증했으며 실제 사용자 크기 latency, write bytes, event-loop 지연은 측정하지 않았다고 명시한다. 저장소에도 DB-10E용 허용 한계가 없다. 따라서 gate 결과는 `G1=false ∨ G2=false ∨ G3=false → 확대 보류`다.

## 현재 유지하는 경계

- content-only chapter는 검증된 단일 entry transaction을 계속 사용한다.
- chapter 생성·삭제·순서 변경, snapshot create/delete/prune/restore, world 구조 변경은 기존 full export/recovery 경로를 유지한다.
- snapshot은 개별 `.snap`뿐 아니라 `snapshots/index.json`의 추가·삭제를 함께 맞춰야 한다. 단일 entry writer만 재사용하면 두 entry 사이 crash window가 생긴다.
- world graph·scrap은 여러 canonical table에서 package payload를 조합한다. 호출자가 가진 부분 payload만 직접 쓰면 full exporter의 정규화 결과와 달라질 수 있다.
- full export가 느릴 가능성만으로 검증되지 않은 다중 entry writer와 삭제 protocol을 추가하지 않는다.

## 상태 모델

| 상태 | 설명                                                                        |
| ---- | --------------------------------------------------------------------------- |
| D0   | DB-10D crash/restart 검증 완료                                              |
| M0   | 성능 측정·허용 한계 없음                                                    |
| H0   | 기존 full export + startup stale revision recovery 유지                     |
| I1   | 측정이 한계를 초과할 때만 다중 entry 원자 갱신 설계·구현에 진입할 미래 상태 |

이번 전이는 `D0 → M0 → H0`이며 `I1`에는 진입하지 않았다.

## 진입·종료 기준

진입 기준:

- DB-10D 보고서와 현재 TODO의 조건 문구를 직접 확인한다.
- snapshot create/restore/prune 및 world replica 저장이 package persistence로 연결되는지 관찰할 수 있다.
- 5,000자부터 5,000,000자까지 snapshot body fixture와 실제 SQLite `.luie`가 준비되어 있다.

종료 기준:

- 조건표의 G1~G3를 근거와 함께 판정한다.
- 확대 보류가 기존 package 저장 호출이나 오류 전달을 깨뜨리지 않았음을 확인한다.
- chapter 단일 entry transaction과 crash/restart recovery가 실제 임시 파일에서 계속 통과한다.
- 보류를 구현 완료로 오인하지 않도록 TODO와 보고서에 조건 판정 결과를 명시한다.

## 테스트 케이스

### TC-DB-10E-A: 확대 gate 판정

| 항목      | 내용                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| 목적      | 측정 근거 없이 조건부 최적화를 구현하는 것을 방지                                                     |
| 사전 상태 | DB-10D 보고서 완료, DB-10E 성능 threshold 미정                                                        |
| 입력      | DB-10D의 실행 기록·잔여 범위와 TODO의 조건 문구                                                       |
| 절차      | latency·bytes·event-loop 측정 존재 여부 → threshold 초과 여부 → 다중 entry 원자성 계약 존재 여부 확인 |
| 기대 결과 | G1~G3 중 하나라도 거짓이면 기존 경로 유지                                                             |
| 실제 결과 | G1=false, G2=false, G3=false                                                                          |
| 결과      | PASS — 조건부 확대 미실행                                                                             |

### TC-DB-10E-B: snapshot package persistence 호출·오류 상태

| 항목      | 내용                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 목적      | 확대를 보류해도 snapshot 저장·복원·prune이 package persistence를 요청하고 실패를 숨기지 않는지 확인    |
| 사전 상태 | 현재 Drizzle API를 모사한 mock DB와 package persistence spy                                            |
| 입력      | create, restore, prune, package 실패, 5K·100K·1M·2M·5M 문자 snapshot                                   |
| 기대 결과 | 각 변경에서 persistence 호출; create persistence 실패 시 emergency file과 error; 모든 body 경곗값 전달 |
| 실제 결과 | 기대 결과와 일치                                                                                       |
| 결과      | PASS                                                                                                   |

### TC-DB-10E-C: world replica full export·오류 상태

| 항목      | 내용                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| 목적      | synopsis·scrap 변경이 현재 authoritative full export를 호출하고 실패 결과를 보존하는지 확인 |
| 사전 상태 | mock world document/scrap rows와 package export spy                                         |
| 입력      | synopsis set, scrap aggregate replace, package export 실패                                  |
| 기대 결과 | DB transaction 뒤 이유별 export 호출; 실패는 `packageExportError`로 반환                    |
| 실제 결과 | 기대 결과와 일치                                                                            |
| 결과      | PASS                                                                                        |

### TC-DB-10E-D: 검증된 chapter entry와 crash recovery 회귀

| 항목      | 내용                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| 목적      | 보류 결정이 이미 구현한 DB-10B~10D의 안전한 축소 범위를 훼손하지 않았는지 확인    |
| 사전 상태 | worker별 실제 main/cache DB, OS 임시 SQLite `.luie`, 별도 `SIGKILL` child process |
| 입력      | content-only chapter 변경, entry transaction, write 전/완료 직후 강제 종료        |
| 기대 결과 | 단일 entry+meta 원자 갱신, `quick_check=ok`, stale revision startup recovery      |
| 실제 결과 | 기대 결과와 일치                                                                  |
| 결과      | PASS                                                                              |

## 실행 기록

### snapshot·world 정책 회귀

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/snapshotService.packageBehavior.unit.test.ts \
  tests/main/services/worldReplicaService.test.ts \
  tests/main/services/projectService.immediateDurability.test.ts
```

상태: 실제 DB·파일을 쓰지 않는 mock service 테스트다. snapshot body는 5,000/100,000/1,000,000/2,000,000/5,000,000자 경계를 사용했다. world synopsis·scrap 저장 성공/실패와 chapter incremental 선택 분기를 함께 실행했다.

결과: **3 files passed, 31 tests passed**.

첫 실행은 `snapshotService.packageBehavior.unit.test.ts`가 현재 Drizzle API 대신 제거된 Prisma형 `client.snapshot.create` mock을 제공해 9건 중 7건이 실행 전에 실패했다. 테스트 mock을 실제 `insert().values().returning()`, `select().from()`, 동기 `transaction()` 호출 형태로 갱신하고 같은 범위를 재실행해 통과했다.

### 실제 DB·filesystem·process 회귀

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/luieContainer.test.ts \
  tests/main/services/projectSaveRecovery.integration.test.ts
```

상태: worker별 사용자 데이터와 분리된 실제 main/cache SQLite DB 및 OS 임시 `.luie` 파일을 사용했다. chapter entry/meta transaction, container integrity, write 전·완료 직후 child `SIGKILL`, 재시작 stale revision 복구를 실행했다.

결과: **3 files passed, 16 tests passed**.

## 판정과 재개 조건

- DB-10E의 조건 판정을 완료했으며 현재 gate가 충족되지 않아 제품 코드는 확대하지 않는다. TODO에는 이 결과를 `[X]`로 기록하되 “증분 구현”이 아니라 “조건 판정 완료·확대 보류”로 표시한다.
- DB-10E를 다시 열 조건은 동일 corpus와 환경에서 full export의 p95/p99 latency, main event-loop delay, package write bytes를 수집하고 허용 한계 초과가 확인되는 경우다.
- 재개 시 최소 안전 범위는 여러 upsert/delete entry와 `meta.json`을 한 SQLite transaction으로 묶는 API, snapshot index와 `.snap`의 동시 갱신, 강제 종료 복구 테스트다.

# DB-07 원격 table pagination·종료 검증 테스트 보고서

## 문서 정보

| 항목             | 값                                                                              |
| ---------------- | ------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-07                                                             |
| 테스트 대상      | sync repository `fetchTableRaw`, `fetchBundle`                                  |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 경계값 분석, 상태 전이, 오류 추정                       |
| 테스트 레벨      | Repository HTTP Unit, Bundle Mapping Integration                                |
| 실행일           | 2026-09-13 KST                                                                  |
| 기준 HEAD        | `0faf4fad`                                                                      |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, mocked Supabase HTTP |

## 변경 계약

- 모든 필수·optional remote table 조회는 중앙 `fetchTableRaw`의 1,000-row Range pagination을 사용한다.
- 각 요청은 `order=id.asc`, `Range-Unit=items`, `Range=start-end`, `Prefer=count=exact`를 보낸다.
- 다음 Range의 start는 실제 누적 row 수다. 서버가 요청 크기보다 작은 page cap을 적용해도 누락 없이 이어서 요청한다.
- `Content-Range`의 start/end/page length/total을 검증한다. 선언 total 전에 빈 page, total 변경, range 불일치, malformed/missing nonempty Content-Range는 전체 fetch 실패로 처리한다.
- optional table은 기존처럼 실제 missing-table 오류만 빈 table로 취급한다. pagination 불완전 오류는 optional이어도 숨기지 않는다.
- 안전 상한 10,000 pages를 넘으면 무한 반복 대신 명시적 오류를 반환한다.

## 상태 모델

| 상태 | 설명                                                        |
| ---- | ----------------------------------------------------------- |
| P0   | chapters 2,001행, tombstones 1,001행, 나머지 table 0행      |
| P1   | chapters Range 0-999, 1000-1999, 2000-2999 순차 응답        |
| P2   | tombstones Range 0-999, 1000-1999 순차 응답                 |
| P3   | bundle에 chapters 2,001행과 tombstones 1,001행 전체 mapping |
| E0   | 첫 page가 Content-Range 0-0/2를 선언                        |
| E1   | 다음 page가 빈 배열과 Content-Range */2를 반환              |
| E2   | `SYNC_PAGINATION_INCOMPLETE`로 fetch 전체 실패              |

검증 전이는 `P0 → P1/P2 → P3`, `E0 → E1 → E2`다.

## 테스트 케이스

### TC-DB-07-A: 2,001/1,001행 전체 수집

| 항목      | 내용                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 목적      | Supabase max_rows=1,000 경계 위의 chapter와 tombstone이 조용히 누락되지 않는지 확인       |
| 사전 상태 | fetch mock에 stable id 순서의 chapter 2,001행, tombstone 1,001행                          |
| 입력      | `syncRepository.fetchBundle(accessToken, userId)`                                         |
| 절차      | Range별 slice/Content-Range 응답 → 최종 bundle length/마지막 id/request header 확인       |
| 기대 결과 | chapter 2,001, 마지막 chapter-2000; tombstone 1,001, 마지막 tombstone-1000; 3/2 page 요청 |
| 실제 결과 | 기대 결과와 일치                                                                          |
| 결과      | PASS                                                                                      |

### TC-DB-07-B: 선언 total 이전 조기 종료 차단

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| 목적      | 서버가 partial response를 complete bundle로 오인하는 회귀 방지 |
| 사전 상태 | chapters total=2 선언, 첫 page 1행                             |
| 입력      | 두 번째 page 빈 배열, Content-Range */2                        |
| 절차      | `fetchBundle` rejection message 확인                           |
| 기대 결과 | `SYNC_PAGINATION_INCOMPLETE:chapters`                          |
| 실제 결과 | 기대 결과와 일치                                               |
| 결과      | PASS                                                           |

### TC-DB-07-C: 기존 repository mapping·optional table 회귀

| 항목      | 내용                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| 목적      | snapshot 제외, world payload 정규화, canonical memory filtering, optional missing 유지 |
| 사전 상태 | 기존 syncRepository/syncMapper fixture                                                 |
| 입력      | empty/nonempty/missing-table HTTP 응답                                                 |
| 기대 결과 | 기존 bundle·upsert 계약 통과                                                           |
| 실제 결과 | 기대 결과와 일치                                                                       |
| 결과      | PASS                                                                                   |

## 실행 기록

### HTTP repository·mapper 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/syncRepository.test.ts \
  tests/main/services/syncMapper.test.ts
```

상태: 두 테스트는 DB를 사용하지 않으며 global fetch를 Supabase/PostgREST 응답으로 교체했다. 2,001/1,001 synthetic row만 메모리에 생성했고 사용자 계정·네트워크는 사용하지 않았다. optional missing-table retry의 기존 exponential timer도 실제로 실행되었다.

결과: **2 files passed, 15 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/sync/repository/http.ts \
  tests/main/services/syncRepository.test.ts
```

결과: **PASS, lint error 0개**.

```sh
git diff --check
```

결과: **PASS**.

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 DB-07 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- 중앙 fetch 함수가 모든 remote table에 stable Range pagination과 종료 검증을 적용하고 2,001/1,001 경계를 통과해 DB-07을 PASS로 판정한다.
- Range pagination은 한 HTTP transaction의 snapshot isolation을 제공하지 않는다. 동기화 도중 원격 row가 바뀌는 경쟁은 baseline/delta와 별도 revision 검증 범위다.
- nonempty 응답에 표준 `Content-Range`를 주지 않는 비PostgREST endpoint는 안전하게 실패한다. 현재 대상은 Supabase PostgREST다.

# DB-11C sync 경계 정확성 보정 보고서

## 판정

**PASS — 로컬 코드·실제 SQLite·renderer 계약 범위.** `f1c731c8` 재점검에서 확인한 세 P1 반례를 `e0e2954e`, `e1494023`, `7a8b4a9b`에서 보정했다.

## 보정 내용

- renderer는 replica 응답의 `deletedAt`을 `missing`과 구분한다. tombstone이면 `.luie`와 `localStorage` fallback을 읽거나 DB에 재저장하지 않는다.
- local apply는 incoming world document를 snapshot과 비교해 apply 전에 `local-changed`로 중단한다.
- local bundle은 원격 payload에 전송하지 않는 `Project.revision`을 snapshot token으로 보관한다. 프로젝트 삭제 전 revision이 바뀌면 chapter·world·character·memo·snapshot·memory canonical 등 project-scoped 변경 종류와 무관하게 삭제를 중단한다.
- 재수집 뒤 merge는 프로젝트 tombstone보다 최신인 active row가 있으면 오래된 tombstone을 제거해 로컬 편집을 보존한다.

## 영구 회귀

| 범위 | 결과 |
| --- | --- |
| 실제 DB R1 | 22 files / 80 tests PASS |
| 확장 비DB R2 | 17 files / 119 tests PASS |
| renderer tombstone | stale package fallback·replica 재저장 차단 PASS |
| 실제 SQLite world 경쟁 | snapshot A 뒤 local B가 remote C로 덮이지 않음 PASS |
| 실제 SQLite project 삭제 경쟁 | snapshot 뒤 revision 변경 감지, project·chapter 보존 PASS |

합계는 **39 files / 199 tests PASS**다. `check:source-loc`는 이번 변경으로 늘지 않았고 기존 16건만 남는다. ESLint와 `git diff --check`는 통과했다. 전체 typecheck는 기존 `Sidebar.tsx:157` TS6133 한 건으로 실패한다.

## 범위 제한

실제 원격 서버·RLS·다중 기기 네트워크 경쟁은 실행하지 않았다. 이 보정은 local snapshot 수집부터 같은 transaction의 apply 직전까지와 재merge의 timestamp 정책을 검증한다.

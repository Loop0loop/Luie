# Project-wide revision 설계

**상태:** 승인됨, 구현 전  
**상위 SSOT:** `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

## 1. 목표

`Project.revision`이 복구 가능한 `.luie` payload 전체의 freshness를 대표하게 한다. package에 들어가는 canonical 데이터가 바뀌면 같은 SQLite transaction 안에서 해당 project revision이 반드시 증가한다.

```text
canonical DB mutation
  -> SQLite trigger
  -> Project.revision + 1
  -> existing export queue
  -> atomic .luie replace
  -> ProjectAttachment.exportedRevision 갱신
```

export 실패 시 `exportedRevision`은 전진하지 않는다. 따라서 `revision > exportedRevision`은 기존 계약대로 재시작 복구와 다음 checkpoint의 유일한 dirty 판정이다.

## 2. 범위

revision 대상은 현재 exporter가 읽어 `.luie`에 기록하는 복구 데이터다.

- project metadata
- chapter와 chapter body
- character, term, faction, event, world entity, entity relation
- world replica document와 scrap memo
- snapshot
- memory canonical package가 내보내는 entity, alias, episode, evidence, fact, invalidation, eval 데이터

다음 로컬·파생 데이터는 제외한다.

- `ProjectAttachment`, `ProjectLocalState`, `ProjectSettings`
- search dirty queue와 FTS index
- memory chunk, embedding, build job, summary, extraction job
- evaluation run/result와 benchmark 결과

exporter의 canonical 입력 목록이 바뀌면 이 문서와 revision trigger 목록을 같은 변경에서 갱신한다.

## 3. 선택한 구조

SQLite `AFTER INSERT/UPDATE/DELETE` trigger가 canonical table의 `projectId`로 `Project.revision`을 증가시킨다. 이미 사용 중인 `EntityRelation` consistency trigger처럼 schema bootstrap에서 `CREATE TRIGGER IF NOT EXISTS`로 보장한다. 새 테이블, 의존성, event log는 추가하지 않는다.

서비스별 `bumpProjectRevision` 호출은 제거한다. trigger와 함께 남기면 character/event/faction/term mutation이 이중 증가하기 때문이다. 서비스는 기존 transaction, ACK, export 예약 책임만 유지한다.

`Project` 자체는 payload-visible metadata column 변경에만 반응하는 trigger를 사용한다. revision/export bookkeeping update가 다시 revision을 올리는 재귀는 허용하지 않는다. child table의 project 이동이 가능한 경우에는 기존 project와 새 project 모두 dirty로 만든다.

한 사용자 동작이 여러 canonical row를 바꾸면 revision이 여러 번 증가할 수 있다. revision은 mutation 개수가 아니라 단조 증가 dirty token이므로 정확히 한 번 증가할 필요는 없다.

## 4. 원자성과 실패 정책

- canonical mutation rollback 시 trigger의 revision 증가도 rollback한다.
- 존재하지 않는 project를 대상으로 한 trigger update는 새 상태를 만들지 않는다.
- soft delete와 restore는 `UPDATE`이므로 revision 대상이다.
- project cascade delete 중 child trigger는 삭제될 project를 되살리지 않는다.
- trigger 설치 실패는 schema bootstrap 실패로 처리한다. revision 없이 저장을 계속하지 않는다.
- trigger 집합이 처음 설치되거나 일부 누락된 기존 DB는 설치와 모든 기존 project의 revision 1회 증가를 하나의 transaction으로 수행한다. 재실행은 증가시키지 않으며, 이전 버전에서 추적하지 못한 canonical 변경을 stale checkpoint recovery 대상으로 만든다.
- export scheduling과 retry 정책은 기존 `ProjectExportQueue`를 그대로 사용한다.

## 5. 검증 계약

최소 회귀 테스트는 다음을 증명한다.

1. 각 canonical table의 insert/update/delete가 올바른 project revision을 증가시킨다.
2. rollback된 mutation은 revision을 증가시키지 않는다.
3. project 이동 mutation은 old/new project를 모두 dirty로 만든다.
4. 파생·로컬 table mutation은 revision을 증가시키지 않는다.
5. 기존 entity service mutation은 이중 증가하지 않는다.
6. `revision > exportedRevision` startup recovery가 새 canonical source 변경도 `.luie`에 반영한다.

구현은 RED trigger contract test, 최소 trigger/bootstrap 변경, 기존 서비스 bump 제거, focused recovery 회귀 순서로 진행한다.

## 6. 제외 항목

이 작업은 export queue 자동 backoff, Notion UI timer, 저장 latency P95 인증을 변경하지 않는다. revision 정확성만 닫는다.

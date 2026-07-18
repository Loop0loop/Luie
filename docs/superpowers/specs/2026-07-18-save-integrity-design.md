# Luie 로컬 우선 저장 정합성 설계

**작성일:** 2026-07-18  
**브랜치:** `feature/00-save-integrity`  
**상태:** 설계 승인, 구현 계획 작성 전

## 1. 목적

Luie의 사용자 입력을 즉시 화면에 반영하고, SQLite 커밋을 사용자 관점의 `저장됨` 경계로 정의한다. `.luie` 파일 생성, 그래프 갱신, 검색 인덱싱과 동기화는 저장 응답을 막지 않는 후속 작업으로 분리한다.

이 설계가 보장해야 하는 핵심은 다음과 같다.

- 저장이 진행 중이어도 다음 변경을 버리지 않는다.
- `저장됨`으로 표시된 변경은 앱이 비정상 종료되어도 SQLite에서 복구된다.
- `Cmd+S`와 `Ctrl+S`는 모든 대기 중 변경과 `.luie` 체크포인트를 강제로 완료한다.
- `.luie` 체크포인트 실패를 SQLite 저장 실패처럼 취급하지 않되 사용자에게 숨기지 않는다.
- 캐릭터 저장 개선을 공통 world entity 경계에서 해결해 용어, 사건, 세력에도 같은 정책을 적용한다.

## 2. 현재 문제

현재 캐릭터 입력은 다음 경로를 지난다.

```text
BufferedInput 500ms debounce
  -> renderer CRUD store
  -> character:update IPC
  -> SQLite UPDATE
  -> 전체 .luie package export
  -> world graph + replica 전체 재조회
  -> renderer store 갱신
```

이 경로에는 다음 정합성 문제가 있다.

1. `runWithProjectLock`은 같은 프로젝트 저장이 진행 중이면 새 변경을 대기시키지 않고 `null`로 버린다.
2. `BufferedInput`은 blur에서 즉시 저장하면서 기존 debounce 타이머를 취소하지 않아 동일 저장이 중복 실행될 수 있다.
3. renderer는 IPC 성공 뒤에만 외부 상태를 갱신하므로 입력 UI가 저장 지연을 그대로 노출한다.
4. 캐릭터 수정은 SQLite 커밋 후 전체 `.luie` export까지 기다려야 IPC 응답이 끝난다.
5. 저장마다 world graph와 replica 문서를 전체 재조회하고, 이 시간 동안 프로젝트 락이 유지된다.
6. 종료 flush와 dirty 추적이 원고 autosave 중심이라 world entity 변경을 포괄하지 않는다.
7. 애플리케이션 전역 `Cmd+S` / `Ctrl+S` 저장 경계가 없다.

## 3. 결정한 저장 경계

### 3.1 원본과 파생 데이터

- 실행 중 원본 데이터: main process의 SQLite
- 이식 및 복구용 체크포인트: 연결된 `.luie` 파일
- renderer Zustand 상태: 즉시 UI 반응을 위한 로컬 projection
- world graph, 검색 인덱스, 키워드 appearance: SQLite 원본에서 재생성 가능한 projection
- 향후 cloud sync: SQLite 커밋 이후 실행되는 별도 전달 계층

`.luie`는 여전히 사용자가 소유하는 휴대 가능한 프로젝트 파일이지만, 매 키 입력의 동기 커밋 대상은 아니다.

### 3.2 저장 완료 의미

| 상태 | 의미 |
| --- | --- |
| `clean` | renderer와 SQLite가 일치한다. |
| `dirty` | renderer에만 반영된 변경이 있다. |
| `saving` | SQLite mutation이 진행 중이다. |
| `saved` | SQLite transaction이 커밋됐다. |
| `error` | 커밋하지 못했으며 변경 payload를 유지하고 있다. |

`.luie` 체크포인트 상태는 위 상태와 분리한다. SQLite 저장은 성공했지만 파일 export가 실패한 경우 `로컬 저장됨 · 프로젝트 파일 백업 실패`로 표현한다.

## 4. 저장 아키텍처

```text
사용자 입력
  -> renderer local state 즉시 반영
  -> entity별 mutation queue에 patch 기록
  -> 250ms idle 또는 flush 이벤트
  -> 기존 IPC update 호출
  -> main SQLite transaction
       1. entity patch 적용
       2. project revision 증가
       3. updatedAt 갱신
  -> commit ACK
  -> renderer 상태 saved
  -> background 후속 작업
       - .luie checkpoint
       - graph projection 갱신
       - keyword/search derived job
       - 향후 cloud sync
```

새 범용 저장 프레임워크를 만들지 않는다. 기존 `createWorldEntityCRUDStore`, IPC handler, entity service와 `ProjectExportQueue`를 수정해 한 경로로 수렴시킨다.

## 5. Mutation Queue 정책

### 5.1 단위

큐 키는 `entityType + entityId`다. 프로젝트 단위의 단일 `Set` lock을 사용하지 않는다. 서로 다른 캐릭터 수정은 독립적으로 진행할 수 있다.

### 5.2 병합

한 mutation이 진행 중일 때 다음 변경이 오면 최신 pending patch에 병합한다.

```text
in-flight: { name: "김철수" }
next:      { description: "주인공" }
pending:   { description: "주인공" }
```

아직 전송하지 않은 동일 필드는 last-write-wins로 합친다.

```text
pending #1: { name: "김" }
pending #2: { name: "김철수" }
result:     { name: "김철수" }
```

`attributes`는 renderer가 오래된 전체 JSON을 덮어쓰지 않도록 key patch로 전달하고 main transaction 안에서 현재 값과 병합한다. 배열 값은 해당 attribute key 전체를 교체하는 하나의 값으로 취급한다.

### 5.3 순서와 삭제

- 동일 entity mutation은 생성 순서대로 한 번에 하나만 커밋한다.
- 새 변경은 절대 조용히 폐기하지 않는다.
- 삭제 요청은 해당 entity의 pending update를 먼저 drain한 뒤 실행한다.
- 이미 삭제된 entity update는 main service에서 명시적으로 실패한다.

## 6. 입력 정책

- 기본 debounce: 250ms
- IME composition 중에는 저장하지 않는다.
- composition 종료: 최신 값으로 debounce를 다시 예약한다.
- blur, Enter, 프로젝트 전환, component unmount: 예약 타이머를 취소하고 즉시 flush한다.
- blur와 예약 타이머가 같은 값을 중복 저장하지 않게 하나의 `flush()` 경로만 사용한다.
- UI 값은 IPC 응답을 기다리지 않고 즉시 갱신한다.

## 7. `.luie` 체크포인트 정책

### 7.1 Revision

`Project`에는 현재 SQLite 원본의 단조 증가 `revision`을, `ProjectAttachment`에는 마지막으로 export된 `exportedRevision`을 저장한다.

entity mutation transaction은 데이터 변경과 `Project.revision + 1`을 같은 transaction에서 수행한다. exporter는 시작 시 revision을 캡처하고, 파일 교체가 성공한 뒤에만 해당 값을 `exportedRevision`으로 기록한다.

export 도중 새 mutation이 발생하면 `revision > exportedRevision`이 유지되므로 다음 export가 예약된다.

### 7.2 실행 시점

- 자동 저장: 마지막 SQLite 커밋 후 1.5초 idle
- `Cmd+S` / `Ctrl+S`: 즉시
- 프로젝트 전환: 즉시
- 정상 종료: 즉시, 완료 또는 명시적 사용자 결정까지 대기
- 앱 시작 및 프로젝트 열기: `revision > exportedRevision`이면 복구 export 예약

### 7.3 파일 쓰기

`.luie`는 대상 경로에 직접 덮어쓰지 않는다. 같은 디렉터리의 임시 파일에 완성한 뒤 atomic replace한다. export 실패 시 기존 `.luie`는 유지하고 `exportedRevision`도 변경하지 않는다.

## 8. `Cmd+S` / `Ctrl+S`

전역 단축키는 브라우저 기본 저장 동작을 막고 다음 순서를 실행한다.

```text
renderer input flush
  -> world entity mutation queue drain
  -> 원고 autosave flush
  -> SQLite ACK 확인
  -> .luie checkpoint runNow
  -> 결과 표시
```

성공 시 기존 toast를 짧게 사용하고, 자동 저장 성공은 조용히 처리한다. 실패는 사라지는 성공 toast로 덮지 않고 복구 가능한 오류 상태로 유지한다.

## 9. 종료 및 복구

정상 종료 시 renderer는 원고뿐 아니라 world entity queue의 dirty/in-flight 상태도 main process에 전달한다. main process는 다음 순서로 종료한다.

1. renderer buffer flush 요청
2. SQLite mutation queue drain
3. 원고 mirror flush
4. `.luie` export queue flush
5. 실패 또는 timeout이면 저장 후 종료, 종료 취소, 저장 생략을 명확히 선택

비정상 종료 후 SQLite WAL 복구가 끝나면 revision 차이를 확인해 `.luie`를 다시 생성한다. SQLite는 기존 `WAL`, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000` 설정을 유지한다.

## 10. Projection 정책

저장 성공 후 전체 world graph를 동기 재조회하지 않는다.

- renderer의 entity list와 current entity는 ACK payload로 갱신한다.
- graph에 직접 보이는 이름, 색상 등의 필드는 해당 node delta만 적용한다.
- 관계 재계산이나 검색 인덱싱처럼 무거운 작업은 main background job으로 예약한다.
- 전체 graph reload는 프로젝트 진입, 외부 sync 적용, 복구처럼 snapshot 재동기화가 필요한 경우에만 실행한다.

## 11. 오류와 재시도

- SQLite validation 오류: 재시도하지 않고 해당 필드 오류를 표시한다.
- SQLite busy/일시 오류: 최신 pending patch를 유지하고 제한된 backoff로 재시도한다.
- `.luie` export 오류: SQLite 저장 성공을 유지하고 export queue에 재시도 상태를 남긴다.
- 앱 종료 timeout: 현재처럼 사용자에게 종료 취소를 기본 선택으로 제공한다.
- 오류 로그에는 projectId, entityType, entityId, mutation 단계, elapsedMs를 기록하고 사용자 입력 전문은 기록하지 않는다.

## 12. 데이터 불변식

1. `saved` ACK를 받은 mutation은 같은 transaction의 project revision 증가와 함께 SQLite에 존재한다.
2. in-flight mutation이 있어도 이후 mutation을 폐기하지 않는다.
3. `exportedRevision`은 실제 파일 교체가 성공한 revision을 초과하지 않는다.
4. `revision > exportedRevision`인 프로젝트는 export가 필요한 상태다.
5. projection 실패는 canonical SQLite mutation을 rollback하지 않는다.
6. sync는 backup이 아니며 `.luie` 체크포인트와 snapshot 정책을 대체하지 않는다.

## 13. 1차 구현 범위

포함:

- `BufferedInput`의 단일 flush 경로와 250ms debounce
- 공통 world entity mutation queue
- 캐릭터, 용어, 사건, 세력 patch 저장
- 저장 중 변경 드롭 제거
- SQLite commit과 `.luie` export 분리
- project/export revision 추적
- 전체 graph reload 제거 및 최소 projection 갱신
- `Cmd+S` / `Ctrl+S`
- world entity dirty 상태를 포함한 종료 flush
- 성공, 실패, crash recovery 테스트

제외:

- CRDT
- 다중 사용자 실시간 공동 편집
- cloud sync 프로토콜 재설계
- 원고 autosave manager 전면 교체
- 범용 event sourcing
- 저장 상태 UI 전면 디자인 개편

## 14. 검증 기준

- 100회의 연속 캐릭터 field mutation에서 마지막 값이 SQLite와 renderer에 동일하다.
- 한 mutation을 지연시킨 상태에서 두 번째 mutation을 보내도 두 번째 값이 유실되지 않는다.
- blur 직전 입력은 한 번만 저장된다.
- SQLite ACK는 `.luie` 전체 export 완료를 기다리지 않는다.
- `Cmd+S` 완료 후 mutation queue가 비어 있고 `revision === exportedRevision`이다.
- export 중 앱 종료 요청이 오면 flush하거나 사용자가 종료 취소를 선택할 수 있다.
- export 실패 뒤 재시작하면 revision 차이를 감지해 체크포인트를 복구한다.
- 캐릭터 저장 후 graph 전체 조회 IPC가 호출되지 않는다.
- 기존 원고 autosave 및 snapshot resilience 테스트가 유지된다.

## 15. 구현 순서

1. 현재 손실 동작을 재현하는 공통 store 및 `BufferedInput` 테스트
2. world entity mutation queue와 optimistic renderer state
3. main transaction revision 및 patch merge
4. `.luie` 비동기 체크포인트와 revision 복구
5. graph delta와 파생 작업 분리
6. 전역 강제 저장 및 종료 flush
7. 통합 정합성·복구 검증


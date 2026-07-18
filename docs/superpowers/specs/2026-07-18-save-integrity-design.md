# Luie 로컬 우선 저장 정합성 설계

**작성일:** 2026-07-18  
**브랜치:** `feature/00-save-integrity`  
**상태:** 부분 구현 — 정상 저장 경로 검증 통과, 데이터 무손실 차단 항목 보완 필요 (§16)

## 1. 목적

Luie의 사용자 입력을 즉시 화면에 반영하고, SQLite 커밋을 사용자 관점의 `저장됨` 경계로 정의한다. `.luie` 파일 생성, 그래프 갱신, 검색 인덱싱과 동기화는 저장 응답을 막지 않는 후속 작업으로 분리한다.

이 설계가 보장해야 하는 핵심은 다음과 같다.

- 저장이 진행 중이어도 다음 변경을 버리지 않는다.
- `저장됨`으로 표시된 변경은 앱이 비정상 종료되어도 SQLite에서 복구된다.
- `Cmd+S`와 `Ctrl+S`는 모든 대기 중 변경과 `.luie` 체크포인트를 강제로 완료한다.
- `.luie` 체크포인트 실패를 SQLite 저장 실패처럼 취급하지 않되 사용자에게 숨기지 않는다.
- 캐릭터 저장 개선을 공통 world entity 경계에서 해결해 용어, 사건, 세력에도 같은 정책을 적용한다.

위 항목은 최종 목표 계약이다. 2026-07-19 재검증에서 강제 input flush와 실패 payload 보존이 아직 이 계약을 충족하지 못하는 것으로 확인됐다.

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
| `error` | 커밋하지 못했으며 변경 payload를 유지해야 한다. 현재 구현은 이 계약을 충족하지 못한다. |

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

현재 구현은 성공 경로의 직렬화와 병합만 충족한다. CRUD IPC 실패가 `null`로 변환되면 실패 payload가 queue에서 제거되며, 삭제 전 pending update drain도 아직 연결되지 않았다.

## 6. 입력 정책

- 기본 debounce: 250ms
- IME composition 중에는 저장하지 않는다.
- composition 종료: 최신 값으로 debounce를 다시 예약한다.
- blur, Enter, 프로젝트 전환, component unmount: 예약 타이머를 취소하고 즉시 flush한다.
- blur와 예약 타이머가 같은 값을 중복 저장하지 않게 하나의 `flush()` 경로만 사용한다.
- UI 값은 IPC 응답을 기다리지 않고 즉시 갱신한다.

## 7. `.luie` 체크포인트 정책

### 7.1 Revision

`Project`에는 체크포인트 대상 mutation의 단조 증가 `revision`을, `ProjectAttachment`에는 마지막으로 export된 `exportedRevision`을 저장한다.

1차 구현은 character, event, faction, term의 create/update/delete transaction에서 데이터 변경과 `Project.revision + 1`을 함께 수행한다. exporter는 시작 시 revision을 캡처하고, 파일 교체가 성공한 뒤에만 해당 값을 `exportedRevision`으로 기록한다.

따라서 현재 revision은 `.luie` 전체 payload의 freshness를 아직 대표하지 않는다. project-wide recovery를 보장하려면 chapter, relation, project metadata 등 package에 포함되는 canonical mutation도 같은 revision 계약에 포함해야 한다.

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

전역 단축키의 목표 순서는 다음과 같다.

```text
renderer input flush
  -> world entity mutation queue drain
  -> 원고 autosave flush
  -> SQLite ACK 확인
  -> .luie checkpoint runNow
  -> 결과 표시
```

현재 구현은 renderer save-buffer registry를 먼저 flush한 뒤 world entity mutation queue와 main checkpoint를 순서대로 실행한다. shortcut handler는 부모의 오래된 원고 값을 직접 저장하지 않고 이 공통 경계만 호출한다.

성공 시 기존 toast를 짧게 사용하고, 자동 저장 성공은 조용히 처리한다. 실패는 사라지는 성공 toast로 덮지 않고 복구 가능한 오류 상태로 유지한다.

## 9. 종료 및 복구

정상 종료 시 renderer는 원고뿐 아니라 world entity queue의 dirty/in-flight 상태도 main process에 전달한다. main process는 다음 순서로 종료한다.

1. renderer buffer flush 요청
2. SQLite mutation queue drain
3. 원고 mirror flush
4. `.luie` export queue flush
5. 실패 또는 timeout이면 저장 후 종료, 종료 취소, 저장 생략을 명확히 선택

비정상 종료 후 SQLite WAL 복구가 끝나면 revision 차이를 확인해 `.luie`를 다시 생성한다. SQLite는 기존 `WAL`, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000` 설정을 유지한다.

현재 quit handshake는 renderer buffer 또는 world mutation flush가 실패하면 완료 신호를 보내지 않아 기존 main timeout/사용자 결정 경계로 이동한다. 다만 export flush의 `failed > 0`은 아직 종료 차단 조건으로 사용하지 않는다.

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

현재 구현은 위 재시도 정책을 완성하지 않았다. SQLite/IPC 실패 payload 보존과 backoff가 없고, scheduled export가 `false` 또는 throw로 끝나면 dirty retry 상태가 사라질 수 있다.

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

## 14. 목표 검증 기준

아래 항목은 최종 acceptance criteria다. §16의 PASS는 현재 실제 테스트가 증명하는 범위로 제한해 해석한다.

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

## 16. 구현 및 검증 결과

2026-07-19 기준 `feature/00-save-integrity`에는 다음 정상 경로가 구현돼 있다.

- `BufferedInput` 250ms debounce와 blur, Enter, unmount 단일 flush
- 동일 world entity의 성공 mutation 직렬화와 latest-patch 병합
- character, event, faction, term create/update/delete의 transaction revision 증가
- captured revision export와 stale attached project의 startup recovery 예약
- manual-save IPC와 renderer/main quit handshake 기본 경로
- manual save와 quit의 renderer buffer → world mutation 선행 flush
- shared buffer의 실제 persistence ACK, IME 명시적 flush 차단, unmount 실패 payload 재시도
- Plot/Synopsis buffer의 timer 비의존 직접 persistence barrier
- 실패한 world mutation payload 보존, latest merge, 다음 flush/enqueue 재시도

재검증에서 다음 차단 항목을 확인했다.

- **P0:** export flush의 `failed > 0`이 quit 차단 상태로 전달되지 않는다.
- **P1:** scheduled export의 `false`/throw 이후 dirty retry 상태가 유지되지 않는다.
- **P1:** 삭제 전에 같은 entity의 pending update를 drain하지 않는다.
- **P1:** revision이 world entity 4종에만 적용돼 `.luie` 전체 freshness를 대표하지 않는다.

Fresh verification (2026-07-19):

```bash
SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/projectSaveShortcut.test.tsx tests/renderer/services/saveCoordinator.test.ts tests/renderer/stores/worldEntityMutationQueue.test.ts tests/renderer/stores/worldEntitySaveBurst.test.ts tests/main/handler/manualSaveHandler.test.ts tests/main/services/projectCheckpointRecovery.test.ts tests/main/services/projectExportEngine.test.ts tests/main/services/projectExportQueue.test.ts
# 9 files, 19 tests PASS

ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/services/projectSaveRecovery.integration.test.ts
# 3 files, 8 tests PASS

SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/editorAutosaveManualFlush.test.tsx tests/renderer/stores/worldEntityMutationQueue.test.ts
# 6 files, 26 tests PASS; stderr warning 없음
# world flush 오류 전파 테스트는 오류를 삼키는 임시 production 변이에서 FAIL한 뒤 원본 복원 후 PASS

SKIP_DB_TEST_SETUP=1 ./node_modules/.bin/vitest run --no-file-parallelism --reporter=verbose tests/renderer/services/saveCoordinator.test.ts tests/dom/projectSaveShortcut.test.tsx tests/dom/projectQuitFlush.test.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/editorAutosaveManualFlush.test.tsx tests/renderer/stores/worldEntityMutationQueue.test.ts tests/dom/worldBufferedPersistence.test.tsx
# Task 11 review follow-up 포함 7 files, 39 tests PASS; stderr warning/unhandled rejection 없음

./node_modules/.bin/eslint src/shared/ui/BufferedInput.tsx src/renderer/src/features/research/components/world/PlotBoard.tsx src/renderer/src/features/research/components/world/SynopsisEditor.tsx tests/dom/bufferedInputSavePolicy.test.tsx tests/dom/worldBufferedPersistence.test.tsx
# PASS

git diff --check
# PASS

./node_modules/.bin/tsc6 --noEmit
# Task 11 오류 없음; 사용자 소유 dirty BinderSidebarPanelBody.tsx:102의 기존 ResearchPanelTab 오류 1건으로 exit 2
```

이 결과는 정상 경로와 직접 seed한 stale-checkpoint recovery를 검증한다. 실제 export 실패 후 프로세스 재시작, debounce 중 shortcut/quit, IPC `success:false`/timeout, export `false`/throw는 아직 검증하지 않는다. 100회 burst 테스트는 mock 기반이며 SQLite 또는 latency P95를 측정하지 않는다. 기존 writing-loop에는 percentile 계산 인프라가 있지만 이번 저장 파이프라인의 P95 artifact와 95% 신뢰 근거는 없다.

Task 10으로 active input 선행 flush와 renderer world mutation 실패 시 quit completion 차단은 해결됐다. 저장소 전체 `qa:core`는 이번 변경과 무관한 기존 baseline 문제로 아직 green이 아니다. 저장 정합성 완료 표시는 남은 P0 차단 항목과 해당 실패 주입 테스트가 해결된 뒤에만 복구한다.

## 17. Renderer save-buffer 강제 flush 설계

### 17.1 결정

manual save와 quit이 DOM focus나 개별 component 위치를 추측하지 않도록 renderer 전용 save-buffer registry를 사용한다. registry는 Node/Electron API가 없는 UI-safe module `src/shared/ui/saveBufferRegistry.ts`에 두어 shared input과 renderer hook이 같은 singleton을 사용한다. 새 상태 관리 dependency, 전역 DOM event, Zustand draft store는 추가하지 않는다.

registry는 다음 두 기능만 제공한다.

```ts
type SaveBufferFlush = () => void | Promise<void>;

registerSaveBufferFlush(flush: SaveBufferFlush): () => void;
flushSaveBuffers(): Promise<void>;
```

- mounted buffer는 flush callback을 등록하고 unmount에서 해제한다.
- `flushSaveBuffers()`는 호출 시점의 callback snapshot을 전부 실행하고 비동기 결과를 기다린다.
- 하나가 실패해도 나머지 callback 실행은 끝까지 기다린 뒤 전체 flush를 실패로 반환한다.
- registry는 저장 상태나 retry 정책을 소유하지 않는다. 각 buffer와 mutation queue가 기존 dirty 상태를 유지한다.

### 17.2 등록 대상

- [x] `BufferedInput`: 예약 timer를 취소하고 최신 dirty 값을 `onSave`에 전달한다.
- [x] `BufferedTextArea`: focus가 남아 있어도 최신 dirty 값을 `onSave`에 전달한다.
- [x] `useEditorAutosave`: dirty인 최신 title/content draft가 실제 `onSave`를 완료할 때까지 기다린다. 저장 중 새 draft가 들어오면 latest pending draft까지 drain한 뒤 resolve하고, clean editor instance는 아무 작업도 하지 않는다.

editor autosave callback은 active draft를 직접 소유하므로 shortcut handler가 부모의 오래된 `activeChapterTitle`과 `content`를 다시 저장하지 않는다. manual save는 registry flush 결과만 사용해 최신 editor draft를 확정한다.

### 17.3 저장 순서

manual save:

```text
flushSaveBuffers()
  -> flushWorldEntityMutations()
  -> api.app.manualSave(projectId)
  -> main autosave flush
  -> .luie checkpoint
```

quit:

```text
APP_BEFORE_QUIT
  -> flushSaveBuffers()
  -> flushWorldEntityMutations()
  -> completeFlush()
```

buffer 또는 world queue flush가 실패하면 뒤 단계로 진행하지 않는다. quit은 완료 handshake를 보내지 않아 main의 기존 timeout/사용자 결정 경계로 이동한다. export queue의 `failed > 0` 처리와 실패 mutation retry는 별도 P0 Task로 유지한다.

### 17.4 동시성과 중복 방지

- registry flush와 debounce timer가 경쟁해도 각 buffer의 기존 single-flush guard를 통과한다.
- 같은 값의 in-flight 저장은 동일 Promise를 공유하고, 더 최신 값은 그 저장 뒤에 직렬화한다.
- buffer는 비동기 저장 성공 뒤에만 clean으로 전환하며 실패한 최신 값은 다음 flush에서 재시도한다.
- IME 조합 중 일반 debounce/event 저장은 억제하고 global flush는 reject해 manual save/quit 다음 단계를 차단한다.
- debounce, blur, Enter, composition-end의 background rejection은 consume하지만 dirty 상태를 유지한다.
- unmount 저장이 실패하면 detached registry callback이 payload를 보유하고 다음 global flush에서 재시도한다.
- 같은 entity의 여러 input callback은 기존 entity별 mutation queue가 직렬화한다.
- [x] editor autosave는 동시에 `onSave`를 실행하지 않고 최신 pending draft 하나만 유지한다.
- flush가 성공한 값은 뒤늦은 timer가 다시 저장하지 않는다.
- shared input의 explicit flush 정책은 이전 in-flight 저장 뒤 latest drain에도 유지돼, 그 사이 IME composition이 시작되면 전체 barrier가 reject된다.
- Plot/Synopsis의 button mutation도 component-level registry callback이 동일 in-flight Promise를 공유한다. 실패 시 latest snapshot은 dirty로 남고 다음 global flush가 재시도한다.
- Synopsis hydration은 project id와 attachment path가 바뀔 때만 실행한다. 같은 project의 description ACK rerender는 hydration/ref를 덮어쓰지 않는다.

### 17.5 검증 기준

- debounce timer를 진행하지 않은 `BufferedInput` 변경이 manual flush 직후 저장 callback에 한 번 전달된다.
- focus된 `BufferedTextArea` 변경도 blur 없이 manual flush된다.
- editor title/content 변경 직후 manual flush가 부모의 이전 값이 아닌 최신 draft를 저장한다.
- buffer callback이 끝난 뒤 world mutation drain과 main checkpoint가 순서대로 실행된다.
- buffer flush 실패 시 main checkpoint와 quit 완료 handshake가 호출되지 않는다.
- unmount한 buffer callback은 이후 global flush에서 호출되지 않는다.
- 실패 payload를 가진 unmount buffer만 retry callback을 유지하며 성공 직후 registry에서 제거된다.

### 17.7 Shared input callsite 감사와 후속 blocker

2026-07-19 전체 callsite를 읽기 전용 감사했다.

- 직접 ACK: `TermManager`, `WikiDetailView`의 world entity callback은 queue Promise를 반환한다.
- 다음 단계 drain: dirty wiki/Infobox/Canvas entity title callback은 Promise를 반환하지 않지만 호출 중 `worldEntityMutationQueue`에 동기 enqueue되며 Task 10의 world flush가 drain한다.
- Task 11 해결: `PlotBoard`는 state-only callback과 250ms effect를 제거하고 최신 snapshot을 `savePlot`에 직렬화한다. `SynopsisEditor`는 최신 draft snapshot을 직렬화하고 package save와 project description update를 await한다.
- [x] Task 12 해결: `CanvasMarkdownEditor` timer, Canvas entity title/description/markdown, Canvas memo title/content를 registry와 실제 persistence ACK에 연결했다. memo persistence 실패는 barrier에 전파하고 dirty snapshot을 다음 flush에서 재시도한다.
- 후속 blocker: dirty `NotionDocumentView` body는 아직 500ms timer에 의존한다. 사용자 dirty 파일이므로 Task 12에서 수정하지 않았다.

Task 12는 Canvas 경로만 해결했다. `CanvasMarkdownEditor`는 최신 markdown snapshot과 in-flight Promise를 소유하고 registry callback에서 timer를 취소한 뒤 실제 `onSave` ACK까지 drain한다. timer와 barrier가 경쟁하면 같은 snapshot은 같은 Promise를 공유하고, 실패한 snapshot은 clean으로 승격하지 않아 다음 barrier에서 재시도한다.

Canvas entity description은 plain textarea를 기존 `BufferedTextArea`로 교체한다. entity title/description/markdown callback은 `entityState.update` Promise를 반환해 Task 10의 buffer 단계가 ACK를 기다린다. Canvas memo title/content callback은 `updateNote` 직후 `flushSave()`를 반환한다. memo persistence 실패는 `saveError`와 dirty 상태를 유지하면서 explicit flush에 reject되고, 예약 저장 rejection은 consume돼 unhandled rejection을 만들지 않는다. dirty `NotionDocumentView` timer는 사용자 작업 범위이므로 후속 blocker로 유지한다.

검증 결과는 focused 2 files/20 tests와 Task 8~12 저장 회귀 9 files/59 tests PASS이며 stderr warning/unhandled rejection 0이다. 변경 파일 ESLint와 `git diff --check`는 PASS다. 전체 `tsc6 --noEmit`은 Task 12 신규 오류 없이 사용자 소유 dirty `BinderSidebarPanelBody.tsx:102`의 기존 오류 1건만 유지한다.

Task 12 review follow-up은 memo scheduled/explicit persistence를 하나의 직렬 drain으로 통합한다. in-flight snapshot이 settle하기 전에는 다음 `saveScrapMemos`를 시작하지 않고, 성공 뒤 dirty latest snapshot 하나만 이어서 저장한다. in-flight 실패는 dirty와 store error를 유지한 채 해당 explicit barrier에 reject하며, 다음 scheduled/explicit drain이 최신 snapshot을 재시도한다. cleanup과 UI project scope 전환의 fire-and-forget Promise는 callsite에서 rejection을 consume하고 context를 logging하되, store가 이전 scope와 `saveError`를 유지해 데이터 손실을 숨기지 않는다.

follow-up 검증은 focused 2 files/17 tests와 Task 8~12 회귀 10 files/66 tests PASS이며 stderr warning/unhandled rejection 0이다. deferred P1이 pending인 동안 P2 timer를 경과시켜도 persistence 호출은 1회이고, P1 뒤 P2가 시작돼 P2 ACK 후 barrier가 완료된다. 실패 시 latest dirty retry와 scope 보존도 검증했다. 변경 파일 ESLint와 `git diff --check`는 PASS이며 전체 타입체크는 follow-up 신규 오류 없이 사용자 dirty baseline 1건만 유지한다.

### 17.6 범위 제외

- 실패한 world mutation의 자동 backoff
- scheduled export `false`/throw retry
- project-wide revision 확대
- renderer root 밖에서 quit listener를 소유하도록 lifecycle 구조 변경
- 저장 상태 toast/UI 개편

## 18. World entity mutation 실패 보존 정책

### 18.1 내구성 경계

queue execute의 throw와 CRUD `null` ACK는 둘 다 실패다. 해당 batch의 caller Promise는 원본 오류로 reject하여 input buffer가 clean으로 승격하지 않게 한다. 단, 실패 patch 자체는 queue의 retained pending으로 남긴다.

### 18.2 latest merge와 retry

- 실패 batch A 뒤에 대기 중인 newer batch B가 있으면 `merge(A, B)`로 재병합한다.
- scalar와 동일 attribute key는 B가 이기고, A에만 있는 attribute key는 유지한다.
- 실패를 관찰한 global flush는 같은 오류를 즉시 전파하고 같은 호출 안에서 재시도하지 않는다.
- 실패가 settle된 뒤의 다음 enqueue 또는 다음 explicit global flush가 retained latest patch를 한 번 재시도한다.
- 자동 backoff와 delete-before-update drain은 P1로 유지한다.

### 18.3 상태와 정리

retained patch에 waiter가 없어도 pending count와 global active queue에 포함한다. waiter 없는 global retry가 성공하면 CRUD ACK를 store와 graph에 적용한 뒤 entity queue map과 global registry를 둘 다 정리한다. retry 성공 후 pending count는 0이다.

Task 13 검증에서 focused 2 files/9 tests와 Task 8~13 저장 회귀 12 files/72 tests가 stderr warning/unhandled rejection 없이 PASS했다. 테스트는 원본 오류 전파, 한 flush 내 재시도 0회, retained pending/active count, explicit flush/next enqueue 재시도, failed/newer scalar·attribute merge, CRUD `null` ACK의 store/graph retry 반영, 100-burst latest 회귀를 증명한다.

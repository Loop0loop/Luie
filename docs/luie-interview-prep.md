# Luie 프로젝트 면접 준비

기준 자료: [임세훈 포트폴리오 PDF](./임세훈.pdf)

## 1. 프로젝트 한 줄 소개

Luie는 웹소설 작가의 집필, 세계관 관리, 복구, 내보내기를 하나의 흐름으로 통합한 Electron 기반 데스크톱 워드프로세서입니다.

## 2. 1분 프로젝트 설명

> Luie는 웹소설 작가의 집필·세계관 관리·복구·내보내기를 하나의 PC 앱으로 통합한 워드프로세서입니다.
> Tiptap 기반 에디터, React Flow 기반 Graph View, Zustand 기반 레이아웃 상태 관리, Electron IPC 구조를 사용했습니다.
> 초기에는 JSON ZIP 구조를 사용했지만 데이터가 커질수록 전체 조회와 부분 수정 비용이 커졌습니다.
> 그래서 Runtime DB와 `.luie` 프로젝트 저장 포맷을 SQLite 기반으로 전환했고, 300챕터 기준 조회·수정 성능과 저장 안정성을 벤치마크로 검증했습니다.

## 3. 전체 아키텍처

```text
React Renderer
  ├─ Tiptap Editor
  ├─ Zustand Store
  └─ Layout / Canvas UI
          │
          ▼
Preload
  └─ ContextBridge 기반 제한된 API
          │ IPC
          ▼
Electron Main
  ├─ IPC Handler
  ├─ Project / Manuscript Service
  ├─ AutoSave / Snapshot
  ├─ Export / Recovery
  └─ Sync / LLM
          │
          ├─ Runtime SQLite
          ├─ Backup DB
          └─ .luie SQLite Container
```

### 설명

Renderer에는 Node.js나 파일 시스템 권한을 직접 주지 않았습니다. Renderer는 Preload가 ContextBridge로 노출한 API만 호출하고, 실제 파일 접근과 SQLite 처리는 Main Process가 담당합니다.

이렇게 UI 영역과 네이티브 권한 영역을 분리해 보안성과 유지보수성을 확보했습니다.

관련 코드:

- [`src/main/index.ts`](../src/main/index.ts)
- [`src/preload/index.ts`](../src/preload/index.ts)
- [`src/main/database/main/databaseService.ts`](../src/main/database/main/databaseService.ts)

## 4. SQLite를 선택한 이유

초기 저장 구조는 JSON ZIP이었습니다.

### JSON ZIP의 문제

- 부분 조회가 어렵습니다.
- 작은 데이터 수정에도 전체 구조를 읽고 다시 저장해야 합니다.
- 데이터가 커질수록 직렬화와 압축 비용이 증가합니다.
- 여러 저장 작업의 원자성을 직접 구현해야 합니다.

### SQLite로 해결한 점

- 필요한 행만 조회할 수 있습니다.
- 인덱스를 활용할 수 있습니다.
- Transaction으로 여러 변경을 하나의 작업으로 묶을 수 있습니다.
- Foreign Key로 데이터 관계를 보호할 수 있습니다.
- 단일 파일 기반이라 데스크톱 앱에 배포하기 쉽습니다.

## 5. 실제 SQLite 구조

현재 프로젝트에는 Runtime DB와 `.luie` 패키지 저장소가 구분되어 있습니다.

### Runtime DB

```text
Project
 ├─ Chapter
 │   ├─ ChapterBody
 │   ├─ ChapterRevision
 │   └─ Scene
 ├─ Character / Event / Faction / Term
 ├─ WorldEntity
 │   └─ EntityRelation
 └─ Snapshot
```

주요 스키마:

- [`foundation.ts`](../src/main/database/schema/foundation.ts)
- [`manuscript.ts`](../src/main/database/schema/manuscript.ts)
- [`world.ts`](../src/main/database/schema/world.ts)
- [`snapshot.ts`](../src/main/database/schema/snapshot.ts)

### `.luie` SQLite Container

`.luie`는 일반적인 ZIP 디렉터리가 아니라 SQLite 단일 파일입니다.

```text
SQLite file
 ├─ LuieContainerInfo
 └─ LuieContainerEntry
     ├─ meta.json
     ├─ manuscript/{chapterId}.md
     ├─ world/characters.json
     ├─ world/graph.json
     └─ snapshots/index.json
```

즉, Runtime DB는 정규화된 도메인 테이블을 사용하고, `.luie`는 `path/content` 형태의 프로젝트 내보내기 컨테이너로 사용됩니다.

관련 코드:

- [`luieSqliteContainer.ts`](../src/main/services/io/luieSqliteContainer.ts)
- [`projectExportEngine.ts`](../src/main/services/core/project/projectExportEngine.ts)
- [`projectImportOpen.ts`](../src/main/services/core/project/projectImportOpen.ts)

## 6. SQLite 설정

Runtime DB에는 다음 설정을 사용합니다.

```text
journal_mode = WAL
synchronous = FULL
foreign_keys = ON
busy_timeout = 5000
wal_autocheckpoint = 1000
```

### WAL을 사용한 이유

Runtime DB는 에디터의 읽기 요청과 자동 저장이 동시에 발생할 수 있습니다. WAL은 읽기와 쓰기를 분리해 읽기 작업이 쓰기 작업에 덜 방해받도록 합니다.

### `.luie` 저장에서 DELETE journal을 사용하는 이유

Runtime DB와 `.luie` export는 목적이 다릅니다.

- Runtime DB: 지속적인 읽기·쓰기와 동시성을 위해 WAL 사용
- `.luie` export: 완성된 독립 파일 생성이 목적이므로 DELETE journal, `synchronous=FULL`, 임시 파일, atomic replace 사용

## 7. `.luie` 저장 시퀀스

```text
사용자 입력
   │
   ▼
Renderer Editor
   │ IPC
   ▼
Main Process
   │
   ├─ Runtime SQLite 저장
   ├─ Snapshot / Mirror 생성
   └─ Export Queue 등록
          │
          ▼
임시 .luie SQLite 생성
   │
   ├─ LuieContainerInfo 기록
   ├─ LuieContainerEntry 기록
   └─ 하나의 Transaction으로 반영
          │
          ▼
DB close + atomic replace
          │
          ▼
최종 project.luie
```

### 저장 중 앱이 종료되면?

임시 파일에 먼저 저장하고 Transaction을 완료한 뒤 원본 파일을 교체합니다. 저장 또는 교체 과정이 실패하면 원본을 유지하고 backup 파일을 활용할 수 있습니다.

Runtime DB 쪽에서는 WAL, 자동 저장 mirror, snapshot, recovery backup을 함께 사용해 데이터 손실 가능성을 줄입니다.

## 8. 인덱스와 Foreign Key

대부분의 조회가 프로젝트 단위로 발생하므로 `projectId`를 복합 인덱스의 앞쪽에 배치했습니다.

예시:

```text
Chapter(projectId, order)
Snapshot(projectId, chapterId, createdAt)
Character(projectId, name)
EntityRelation(projectId, sourceId)
EntityRelation(projectId, targetId)
```

Foreign Key는 고아 데이터를 방지하기 위해 사용합니다.

- 프로젝트 삭제 → 관련 챕터·캐릭터 삭제: `CASCADE`
- 챕터가 삭제되어도 선택적 메모리 연결은 유지: `SET NULL`

## 9. 성능 검증 수치

PDF에 기록된 300챕터 기준 벤치마크입니다.

| 작업 | JSON ZIP | SQLite | 개선 |
|---|---:|---:|---:|
| 전체 데이터 조회 | 55ms | 17ms | 약 3배 |
| 엔트리 목록 조회 | 76ms | 2.4ms | 약 30배 |
| 단일 데이터 수정 | 17ms | 4.7ms | 약 3배 |

저장 안정성 검증:

- 일반/fullprod writing loop 각각 3/3회 성공
- 파생 작업 실패 0건
- 300챕터 / 900 저장 샘플 drain 테스트
- 저장 지연 p95 약 13ms
- 약 69초 후 검색·메모리·요약·임베딩 큐가 모두 비워짐
- 최종 상태: `pending=0`, `running=0`, `failed=0`

면접에서는 “SQLite가 무조건 빠르다”가 아니라 다음처럼 말합니다.

> 인덱스가 직접 적용되는 엔트리 목록 조회에서 가장 큰 개선이 나타났고, 전체 조회와 단일 수정도 약 3배 수준으로 개선됐습니다. 300챕터 규모에서 반복 측정하고 writing loop와 drain 테스트로 저장 안정성도 확인했습니다.

## 10. 테스트 진행 방식

성능과 안정성을 한 번의 테스트로 판단하지 않고, 다음 세 단계로 나눠 확인했습니다.

### 10.1 SQLite 단위 벤치마크

관련 스크립트:

- [`scripts/benchmark-derived-db.mjs`](../scripts/benchmark-derived-db.mjs)
- [`scripts/benchmark-writing-loop.mjs`](../scripts/benchmark-writing-loop.mjs)

테스트용 SQLite 파일을 만들고 실제 코드에서 사용하는 것과 유사한 테이블·인덱스·PRAGMA를 적용했습니다.

```text
Project / Chapter / ChapterBody
SearchDirtyQueue / MemoryBuildJob
```

측정 항목은 다음과 같습니다.

- 프로젝트의 챕터 목록 조회
- 챕터 1개와 본문 조회
- 대량 파생 작업 enqueue
- 반복 저장 latency
- pending queue drain 시간

측정은 `process.hrtime.bigint()` 기반으로 수행하고, 저장 latency는 평균만 보지 않고 p50, p95, p99, 최대값을 계산합니다. `--assert` 옵션을 사용하면 정의된 threshold를 넘을 때 테스트가 실패합니다.

### 10.2 실제 Electron full-production E2E

관련 테스트:

- [`tests/e2e/writingLoop.fullprod.spec.ts`](../tests/e2e/writingLoop.fullprod.spec.ts)
- [`tests/e2e/writingLoop.stress.spec.ts`](../tests/e2e/writingLoop.stress.spec.ts)

Playwright로 실제 Electron 앱을 실행하고 Renderer의 `window.api`를 통해 다음 전체 경로를 통과시킵니다.

```text
Renderer
  → Preload API
  → IPC
  → Main Handler / Service
  → SQLite
  → 파생 작업 Queue
  → 검색·메모리 상태 확인
```

Full-production 테스트의 기본 조건은 다음과 같습니다.

- 300개 챕터 생성
- 챕터당 약 5,000자 데이터 사용
- 600회 burst update 수행
- 각 저장 요청의 latency 수집
- 검색·메모리·요약·임베딩 작업 상태를 polling
- 최대 대기 시간 안에 `pending=0`, `running=0`, `failed=0`인지 확인

반복 실행 스크립트는 같은 시나리오를 3회 실행하고 각 실행의 p95·p99·최대 latency와 실패 여부를 모읍니다.

### 10.3 복구·내구성 테스트

성능만 확인하면 저장 결과가 실제로 안전한지는 알 수 없으므로 다음도 별도로 검증합니다.

- `.luie` 컨테이너 손상
- 임시 파일과 backup 파일 처리
- atomic replace 실패 후 rollback
- SQLite DB 손실 및 복구
- snapshot 생성·복원
- 저장 실패 시 pending payload 보존
- 파생 작업 queue에 실패 항목이 남는지 여부

즉, “빠르게 저장된다”와 “실패해도 복구할 수 있다”를 서로 다른 기준으로 테스트했습니다.

## 11. 왜 이런 결과가 나왔는가

### 전체 조회가 약 3배 개선된 이유

JSON ZIP은 전체 데이터를 읽고 압축을 해제한 뒤 JSON을 파싱해야 하는 경우가 많습니다. SQLite는 필요한 테이블과 컬럼만 조회하고, 프로젝트 조건과 인덱스를 활용할 수 있습니다.

따라서 데이터가 커질수록 전체 직렬화·압축 비용을 매번 부담하는 JSON 방식보다 SQLite의 부분 접근 비용이 상대적으로 작아집니다.

### 엔트리 목록 조회가 약 30배 개선된 이유

엔트리 목록 조회는 SQLite의 인덱스 효과를 가장 직접적으로 받는 작업입니다.

```sql
SELECT id, title, "order"
FROM Chapter
WHERE projectId = ?
ORDER BY "order"
LIMIT 50;
```

`Chapter_projectId_order_idx`가 있으면 SQLite는 전체 챕터나 전체 파일을 순회하지 않고 조건에 맞는 인덱스 범위만 읽을 수 있습니다. 반면 JSON ZIP은 목록만 필요해도 ZIP 내부 파일과 JSON 구조를 읽고 파싱해야 하므로 차이가 크게 납니다.

### 단일 수정이 약 3배 개선된 이유

단일 챕터 수정은 SQLite에서 필요한 행만 `UPDATE`하고 관련 작업을 Transaction으로 enqueue합니다.

JSON ZIP 방식에서는 수정 후 전체 JSON을 다시 직렬화하고 ZIP을 다시 만들 가능성이 높습니다. SQLite에서는 변경 범위가 작고, prepared statement와 Transaction을 사용하므로 전체 데이터 크기보다 실제 변경량의 영향을 더 많이 받습니다.

### p95가 중요한 이유

평균 latency만 보면 가끔 발생하는 긴 지연을 숨길 수 있습니다. p95는 전체 요청 중 느린 상위 5%의 경계를 보여주므로 자동 저장 UX를 판단하는 데 적합합니다.

긴 tail latency는 다음 상황에서 발생할 수 있습니다.

- `synchronous=FULL`에 따른 디스크 flush
- WAL checkpoint
- OS 파일 시스템 지연
- Electron/Main Process 스케줄링
- 대량 저장 중 garbage collection

그래서 평균값뿐 아니라 p95, p99, 최대값, 1초 이상 지연 횟수를 함께 확인했습니다.

### queue drain 시간이 긴 이유

저장 요청 자체와 파생 작업 처리는 분리되어 있습니다.

```text
챕터 저장 완료
   ├─ 검색 인덱스 작업 enqueue
   ├─ 메모리 chunk 작업 enqueue
   ├─ 요약 작업 enqueue
   └─ 임베딩 작업 enqueue

이후 worker가 queue를 batch 단위로 처리
```

따라서 저장 latency가 낮아도 파생 작업이 많으면 queue drain에는 시간이 걸릴 수 있습니다. 약 69초라는 값은 한 번의 저장 시간이 아니라 300챕터와 burst 저장으로 쌓인 비동기 작업이 모두 처리되는 데 걸린 시간입니다.

## 12. 수치에 대한 주의점

PDF의 `55ms → 17ms`, `76ms → 2.4ms`, `17ms → 4.7ms`는 포트폴리오에 기록된 JSON ZIP과 SQLite 비교 결과입니다.

현재 저장소에서 확인되는 벤치마크 harness는 SQLite 구조와 실제 Electron writing loop를 반복 검증하는 코드입니다. 따라서 면접에서는 다음처럼 표현하는 것이 정확합니다.

> 포트폴리오에는 동일한 데이터셋을 기준으로 JSON ZIP과 SQLite를 비교한 결과를 기록했습니다. 현재 저장소에는 SQLite 단위 벤치마크와 실제 Electron full-production writing loop 검증 코드가 있으며, 조회 패턴·인덱스·Transaction·파일 저장 경계를 각각 측정하도록 구성되어 있습니다.

이렇게 말하면 과거 포트폴리오 수치와 현재 재현 가능한 테스트 범위를 혼동하지 않게 됩니다.

## 13. 예상 질문과 답변

### Q. 왜 SQLite를 선택했나요?

> Luie는 사용자별 로컬 데스크톱 앱이므로 별도의 DB 서버 없이 단일 파일로 배포할 수 있는 SQLite가 적합했습니다. JSON ZIP과 달리 인덱스, 부분 조회, Transaction, Foreign Key를 사용할 수 있어 데이터가 커졌을 때 유리했습니다.

### Q. SQLite의 한계는 무엇인가요?

> SQLite는 단일 파일 기반이고 동시 writer가 많은 환경에는 적합하지 않습니다. 하지만 Luie는 사용자별 로컬 앱이므로 문제가 되지 않았습니다. 다중 사용자 협업과 서버 중심의 동시 쓰기가 필요해진다면 PostgreSQL 같은 서버 DB를 고려할 수 있습니다.

### Q. WAL을 사용한 이유는 무엇인가요?

> 에디터의 읽기 요청과 자동 저장이 동시에 발생할 수 있기 때문입니다. WAL은 읽기와 쓰기를 분리해 Runtime DB의 동시성을 개선합니다.

### Q. `synchronous=FULL`은 왜 사용했나요?

> 저장 성공을 반환하기 전에 디스크 반영 안정성을 높이기 위해 사용했습니다. 약간의 쓰기 비용이 발생하지만, 장편 원고처럼 데이터 손실 비용이 큰 앱에서는 안정성을 우선했습니다.

### Q. Transaction은 어디에 사용했나요?

> `.luie` export 시 컨테이너 메타데이터와 모든 엔트리를 하나의 Transaction으로 기록합니다. 중간에 실패하면 전체 변경이 반영되지 않도록 해 불완전한 패키지가 만들어지는 것을 막았습니다.

### Q. 저장 중 장애가 발생하면 어떻게 복구하나요?

> 임시 파일에 저장한 뒤 atomic replace를 수행하고, 원본 파일은 backup으로 보호합니다. Runtime DB에는 WAL, snapshot, mirror, recovery backup을 추가로 사용합니다.

### Q. Runtime DB와 `.luie` 파일의 차이는 무엇인가요?

> Runtime DB는 앱이 실행되는 동안 사용하는 정규화된 SQLite 데이터베이스입니다. 반면 `.luie`는 프로젝트를 이동·백업·복구하기 위한 SQLite 기반 export 컨테이너입니다. Runtime DB의 데이터를 `meta.json`, chapter Markdown, world JSON 같은 엔트리로 변환해 저장합니다.

### Q. 인덱스는 어떻게 결정했나요?

> 실제 조회 패턴을 기준으로 결정했습니다. 프로젝트별 챕터, 프로젝트·챕터별 스냅샷, 프로젝트별 캐릭터와 같은 조회가 많기 때문에 `projectId`와 정렬·필터 조건을 함께 복합 인덱스로 구성했습니다.

### Q. 성능 개선이 실제 개선인지 어떻게 검증했나요?

> 300챕터 규모의 동일한 데이터를 기준으로 JSON ZIP과 SQLite의 전체 조회, 목록 조회, 단일 수정을 비교했습니다. 단일 측정값만 보지 않고 writing loop와 drain 테스트를 추가해 저장 실패와 파생 작업 큐의 잔류 여부까지 확인했습니다.

## 14. 면접에서 피해야 할 표현

- “모든 데이터가 `.luie` SQLite 테이블에 정규화되어 있습니다.”
  - 실제로는 Runtime DB와 `.luie` Container가 분리되어 있습니다.
- “SQLite는 무조건 빠릅니다.”
  - 조회 패턴과 인덱스, 데이터 규모에 따라 달라진다고 말해야 합니다.
- “WAL이 항상 안전합니다.”
  - WAL은 동시성 설정이며, 내구성은 Transaction·`synchronous`·백업 전략과 함께 설명해야 합니다.
- “Prisma를 사용했습니다.”
  - 현재 실제 구현은 Drizzle ORM + better-sqlite3입니다.

## 15. 최종 암기 문장

> Luie의 핵심 기술적 문제는 JSON ZIP 기반 저장 구조의 전체 조회·전체 수정 비용과 저장 안정성이었습니다. 이를 해결하기 위해 Runtime DB는 Drizzle과 SQLite로 정규화하고 WAL, 인덱스, Foreign Key, Transaction을 적용했습니다. 프로젝트 export는 별도의 SQLite `.luie` Container로 만들고 임시 파일과 atomic replace를 사용했습니다. 300챕터 벤치마크와 writing loop, drain 테스트를 통해 성능과 안정성을 수치로 검증했습니다.

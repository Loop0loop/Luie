# Luie 테스트 진행 방식

## 1. 테스트 목표

Luie 테스트의 목표는 단순히 “저장이 된다”를 확인하는 것이 아니었습니다.

다음 네 가지를 함께 검증했습니다.

1. SQLite 조회·수정 성능
2. 실제 Electron 저장 흐름의 성능
3. 자동 저장 이후 파생 작업의 안정성
4. 저장 실패·파일 손상 이후의 복구 가능성

## 2. 테스트를 세 단계로 나눈 이유

```text
SQLite 단위 벤치마크
        ↓
실제 Electron E2E
        ↓
복구·내구성 테스트
```

한 단계만 사용하면 원인을 분리하기 어렵습니다.

- SQLite 단위 테스트만 하면 IPC와 Electron 지연을 알 수 없습니다.
- E2E만 하면 SQLite 자체가 느린지 앱 계층이 느린지 알기 어렵습니다.
- 성능 테스트만 하면 장애 시 데이터가 안전한지 알 수 없습니다.

그래서 작은 단위부터 실제 앱, 장애 상황 순서로 범위를 넓혔습니다.

## 3. 1단계 — SQLite 단위 벤치마크

관련 스크립트:

- [`scripts/benchmark-derived-db.mjs`](../scripts/benchmark-derived-db.mjs)
- [`scripts/benchmark-writing-loop.mjs`](../scripts/benchmark-writing-loop.mjs)

### 테스트 데이터

테스트용 SQLite 파일을 새로 만들고 다음과 같은 데이터를 넣습니다.

```text
Project
Chapter
ChapterBody
SearchDirtyQueue
MemoryBuildJob
```

실제 앱과 유사하게 다음 설정도 적용합니다.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### 측정 항목

#### 조회 측정

```sql
SELECT id, title, "order"
FROM Chapter
WHERE projectId = ?
ORDER BY "order"
LIMIT 50;
```

프로젝트에 속한 챕터 목록을 조회하고 실행 시간을 측정합니다.

#### 단일 챕터 조회

```sql
SELECT c.id, c.title, b.content
FROM Chapter c
LEFT JOIN ChapterBody b ON b.chapterId = c.id
WHERE c.projectId = ?
ORDER BY c."order"
LIMIT 1;
```

챕터 메타데이터와 본문을 함께 읽는 실제 사용 패턴을 측정합니다.

#### 반복 저장 측정

한 번의 저장에서 다음 작업을 하나의 Transaction으로 묶습니다.

```text
Chapter wordCount 업데이트
ChapterBody 본문 업데이트
SearchDirtyQueue 작업 등록
MemoryBuildJob 작업 등록
COMMIT
```

### 측정 통계

저장 시간은 평균 하나만 보지 않습니다.

- p50: 일반적인 중간값
- p95: 느린 상위 5%의 경계
- p99: 느린 상위 1%의 경계
- max: 가장 느렸던 요청

평균값만 사용하면 가끔 발생하는 긴 저장 지연이 숨겨질 수 있기 때문에 p95와 p99를 함께 확인했습니다.

## 4. 2단계 — 실제 Electron Full Production E2E

관련 테스트:

- [`tests/e2e/writingLoop.fullprod.spec.ts`](../tests/e2e/writingLoop.fullprod.spec.ts)
- [`tests/e2e/writingLoop.stress.spec.ts`](../tests/e2e/writingLoop.stress.spec.ts)

### 실제로 통과하는 경로

```text
Playwright
  → Electron Window
  → Renderer window.api
  → Preload ContextBridge
  → IPC
  → Main Handler
  → Project Service
  → SQLite
```

Mock DB에 직접 접근하지 않고 실제 앱의 API를 호출하므로 IPC, Main Service, DB 경계를 함께 검증합니다.

### Full Production 기본 시나리오

1. Electron 앱을 실행합니다.
2. 프로젝트를 생성합니다.
3. 300개 챕터를 생성합니다.
4. 각 챕터에 약 5,000자 본문을 저장합니다.
5. 600회의 burst update를 수행합니다.
6. 각 저장 요청 시간을 기록합니다.
7. 검색·메모리·요약·임베딩 상태를 polling합니다.
8. `pending=0`, `running=0`, `failed=0`인지 확인합니다.

### 성공 기준

- 저장 API가 실패하지 않아야 합니다.
- p95/p99가 정의된 threshold보다 작아야 합니다.
- 파생 작업의 `failedCount`가 0이어야 합니다.
- 최종 pending/running 작업이 0이어야 합니다.

## 5. 3단계 — 반복 테스트

반복 실행 스크립트는 동일한 writing loop를 3회 실행합니다.

각 실행에서 다음을 기록합니다.

- p95
- p99
- 최대 latency
- 1초 이상 걸린 저장 횟수
- 테스트 exit code
- 전체 성공 여부

반복 테스트를 하는 이유는 단일 실행 결과가 우연히 좋거나 나쁜 경우를 줄이기 위해서입니다.

## 6. 4단계 — Queue Drain 검증

저장 요청이 성공했다고 파생 작업까지 끝난 것은 아닙니다.

```text
챕터 저장
  ├─ 검색 인덱스 작업 등록
  ├─ 메모리 chunk 작업 등록
  ├─ 요약 작업 등록
  └─ 임베딩 작업 등록
```

Worker는 이 작업을 batch 단위로 처리합니다. 테스트는 저장이 끝난 뒤에도 상태를 계속 조회합니다.

```text
while pending 또는 running 작업이 존재한다면
  상태 조회
  잠시 대기
```

최종적으로 다음 상태를 확인합니다.

```text
pending = 0
running = 0
failed = 0
```

PDF의 약 69초는 한 번의 저장 시간이 아닙니다. 300챕터와 burst update로 쌓인 검색·메모리·요약·임베딩 작업을 worker가 모두 처리하는 데 걸린 시간입니다.

## 7. 5단계 — 복구와 내구성 테스트

성능 테스트와 별도로 다음 장애를 재현합니다.

### `.luie` 파일 장애

- 파일이 존재하지 않는 경우
- `meta.json`이 없는 경우
- 잘못된 SQLite container인 경우
- 지원하지 않는 버전인 경우
- entry path가 안전하지 않은 경우

### 저장 장애

- 임시 파일 생성 실패
- Transaction 실패
- atomic replace 실패
- backup 복구 실패

### 데이터베이스 장애

- SQLite integrity check 실패
- WAL recovery
- DB 파일 손실
- snapshot 복원

### 검증 기준

- 실패를 성공으로 잘못 보고하지 않아야 합니다.
- 원본 파일을 가능한 한 보존해야 합니다.
- backup 또는 recovery package를 생성할 수 있어야 합니다.
- 실패한 저장 데이터는 재시도할 수 있도록 보존해야 합니다.

## 8. 결과가 그렇게 나온 이유

### 목록 조회가 크게 빨라진 이유

SQLite는 `projectId`와 `order` 복합 인덱스를 사용해 필요한 챕터 범위만 읽습니다.

JSON ZIP은 목록만 필요해도 전체 파일을 읽고 파싱해야 하는 구조가 되기 쉽습니다. 그래서 목록 조회에서 가장 큰 차이가 나타납니다.

### 단일 수정이 빨라진 이유

SQLite에서는 변경된 `Chapter`와 `ChapterBody` 행만 수정합니다. JSON ZIP처럼 전체 프로젝트를 다시 직렬화하고 압축하지 않습니다.

### p95/p99가 올라가는 이유

- `synchronous=FULL` 디스크 flush
- WAL checkpoint
- 파일 시스템 지연
- Electron Main Process 스케줄링
- 대량 작업 중 메모리 정리

그래서 평균보다 tail latency인 p95/p99가 실제 사용자 체감에 더 중요합니다.

### Queue drain이 오래 걸리는 이유

저장 Transaction은 빠르게 끝나도 검색·메모리·요약·임베딩은 별도 Worker가 처리합니다. 저장 안정성을 위해 작업을 버리지 않고 모두 처리하므로 데이터 규모가 커질수록 drain 시간은 늘어날 수 있습니다.

## 9. 면접 답변 예시

> 테스트는 SQLite 단위 벤치마크, 실제 Electron E2E, 복구 테스트로 나눠 진행했습니다. 먼저 테스트용 SQLite에 실제와 유사한 테이블·인덱스·PRAGMA를 적용하고 목록 조회, 단일 조회, 반복 저장, queue enqueue 시간을 측정했습니다. 다음으로 Playwright로 실제 Electron 앱을 실행해 Renderer API부터 Preload, IPC, Main Service, SQLite까지 전체 경로를 통과시켰습니다. 300개 챕터와 600회 burst update 후 저장 latency의 p95·p99와 파생 queue의 최종 상태를 확인했습니다. 마지막으로 `.luie` 손상, atomic replace 실패, DB 복구와 snapshot 복원을 테스트했습니다. 결과가 개선된 이유는 JSON ZIP처럼 전체 파일을 다시 읽고 쓰지 않고 SQLite의 인덱스·부분 수정·Transaction을 사용했기 때문입니다.

## 10. 수치 설명 시 주의점

PDF의 `55ms → 17ms`, `76ms → 2.4ms`, `17ms → 4.7ms`는 포트폴리오에 기록된 JSON ZIP과 SQLite 비교 결과입니다.

현재 저장소에는 SQLite 단위 벤치마크와 실제 Electron writing loop 검증 harness가 있습니다. 따라서 다음처럼 말하는 것이 정확합니다.

> 포트폴리오에서는 동일 데이터셋의 JSON ZIP과 SQLite 비교 결과를 제시했고, 현재 저장소에서는 SQLite 조회·저장 benchmark와 실제 Electron full-production writing loop를 재현·검증할 수 있도록 구성했습니다.


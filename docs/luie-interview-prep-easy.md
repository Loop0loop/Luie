# Luie 면접 준비 — 쉬운 설명 버전

기준 자료: [임세훈 포트폴리오 PDF](./임세훈.pdf)

## 1. Luie가 무엇인가요?

Luie는 웹소설 작가를 위한 데스크톱 글쓰기 프로그램입니다.

일반적인 글쓰기 프로그램과 달리 다음 기능을 한곳에서 제공합니다.

- 원고 작성
- 챕터 관리
- 등장인물·사건·설정 관리
- 인물과 사건의 관계를 그래프로 확인
- 자동 저장과 스냅샷
- `.luie` 파일로 프로젝트 저장·복구

쉽게 말하면 **글쓰기 화면과 작가의 자료 정리 공간을 합친 프로그램**입니다.

## 2. 왜 Electron을 사용했나요?

Luie는 PC에서 실행되는 프로그램이기 때문입니다.

Electron을 사용하면 React로 화면을 만들면서도 PC의 파일 시스템, SQLite, 파일 저장·복구 기능을 사용할 수 있습니다.

다만 화면에서 파일을 직접 만지게 하면 보안 문제가 생길 수 있습니다. 그래서 다음처럼 나눴습니다.

```text
화면(Renderer)
   │ 필요한 기능 요청
   ▼
Preload(ContextBridge)
   │ 안전한 IPC 통신
   ▼
Main Process
   │ 파일·DB 처리
   ▼
SQLite / .luie 파일
```

면접 답변:

> Renderer는 UI만 담당하고, 파일 시스템과 SQLite 접근은 Main Process가 담당하도록 분리했습니다. Renderer와 Main 사이에는 Preload의 제한된 API와 IPC만 사용했습니다.

## 3. SQLite를 왜 사용했나요?

처음에는 JSON 파일들을 ZIP으로 묶어 저장했습니다.

예를 들어 챕터 하나만 수정해도 전체 JSON을 다시 읽고, 다시 저장하고, 다시 압축해야 할 수 있었습니다.

챕터가 10개일 때는 괜찮지만 300개가 되면 비효율적입니다.

### JSON ZIP

```text
챕터 하나 수정
   ↓
전체 JSON 읽기
   ↓
전체 JSON 파싱
   ↓
전체 ZIP 다시 만들기
```

### SQLite

```text
챕터 하나 수정
   ↓
해당 행만 UPDATE
   ↓
Transaction 완료
```

SQLite를 사용하면 필요한 데이터만 조회하거나 수정할 수 있고, 인덱스와 Transaction도 사용할 수 있습니다.

## 4. 데이터는 어떻게 생겼나요?

```text
Project
 ├─ Chapter
 │   ├─ ChapterBody
 │   ├─ ChapterRevision
 │   └─ Scene
 ├─ Character
 ├─ Event
 ├─ Term
 ├─ WorldEntity
 │   └─ EntityRelation
 └─ Snapshot
```

예를 들어 한 프로젝트 안에 여러 챕터가 있고, 챕터 안에 본문과 장면이 있습니다. 캐릭터와 사건은 `WorldEntity`, 관계는 `EntityRelation`으로 표현할 수 있습니다.

## 5. `.luie` 파일은 무엇인가요?

`.luie`는 Luie 프로젝트 하나를 담는 단일 파일입니다.

현재는 SQLite 파일 안에 프로젝트 데이터를 저장합니다.

```text
project.luie
 ├─ meta.json
 ├─ manuscript/chapter-id.md
 ├─ world/characters.json
 ├─ world/graph.json
 └─ snapshots/index.json
```

Runtime DB는 앱이 실행 중 사용할 데이터베이스이고, `.luie`는 이동·백업·복구를 위한 프로젝트 파일입니다.

## 6. 저장은 어떻게 안전하게 하나요?

바로 원본 파일을 덮어쓰지 않습니다.

```text
임시 .luie 파일 생성
   ↓
SQLite Transaction으로 저장
   ↓
저장 완료 확인
   ↓
원본 파일을 새 파일로 교체
```

저장 중 문제가 생기면 원본 파일을 유지할 수 있습니다. 여기에 자동 저장 mirror, snapshot, backup도 함께 사용합니다.

## 7. WAL은 무엇인가요?

WAL은 SQLite가 변경 내용을 별도 로그에 기록하는 방식입니다.

글을 읽는 중에 자동 저장이 발생해도 읽기와 쓰기가 서로 덜 방해하도록 해줍니다.

면접 답변:

> Runtime DB는 에디터의 읽기와 자동 저장이 동시에 발생하므로 WAL을 사용했습니다. 반면 `.luie` export는 완성된 파일을 만드는 작업이라 임시 파일과 atomic replace를 사용했습니다.

## 8. 다이어그램 설명법

### 시스템 구조

```text
React UI
  → Preload API
  → IPC
  → Main Service
  → SQLite
```

### 저장 구조

```text
사용자 입력
  → Editor
  → Main Process
  → Runtime SQLite 저장
  → Snapshot / 파생 작업
  → .luie export
```

면접에서 중요한 것은 박스를 많이 그리는 것이 아니라 **각 영역의 책임을 설명하는 것**입니다.

## 9. 성능 결과

PDF의 300챕터 기준 결과입니다.

| 작업 | 변경 전 | 변경 후 |
|---|---:|---:|
| 전체 데이터 조회 | 55ms | 17ms |
| 엔트리 목록 조회 | 76ms | 2.4ms |
| 단일 데이터 수정 | 17ms | 4.7ms |

쉽게 설명하면:

- 전체 파일을 매번 읽지 않아서 빨라졌습니다.
- 인덱스를 사용해 필요한 목록만 찾을 수 있어서 목록 조회가 크게 빨라졌습니다.
- 한 행만 수정하고 전체 파일을 다시 만들지 않아서 단일 수정이 빨라졌습니다.

## 10. 테스트는 어떻게 했나요?

세 단계로 테스트했습니다.

### 1단계: SQLite만 따로 테스트

가짜 프로젝트와 챕터를 만들고 다음을 측정했습니다.

- 챕터 목록 조회
- 챕터 하나 열기
- 대량 작업 등록
- 반복 저장 시간
- 작업 queue가 모두 처리되는 시간

### 2단계: 실제 Electron 앱 테스트

Playwright로 실제 앱을 실행하고 화면에서 API를 호출했습니다.

```text
Renderer
  → Preload
  → IPC
  → Main
  → SQLite
```

300개 챕터를 만들고 600번 수정한 뒤 다음을 확인했습니다.

- 저장 요청이 성공하는가?
- 저장 시간이 지나치게 길지 않은가?
- 검색·메모리 작업이 실패하지 않는가?
- 모든 queue가 최종적으로 비워지는가?

### 3단계: 장애 상황 테스트

- `.luie` 파일 손상
- 저장 중 교체 실패
- backup 복구
- snapshot 복원
- DB 손실 복구

## 11. 최종 답변 예시

> Luie는 웹소설 작가를 위한 Electron 기반 데스크톱 워드프로세서입니다. 초기에는 JSON ZIP으로 프로젝트를 저장했지만, 챕터가 많아질수록 전체 파일을 다시 읽고 저장하는 비용이 커졌습니다. 그래서 SQLite를 사용해 필요한 행만 조회·수정하고 Transaction과 인덱스를 적용했습니다. Runtime DB는 WAL로 동시성을 확보하고, `.luie` export는 임시 파일과 atomic replace로 저장 안정성을 높였습니다. 300챕터와 반복 writing loop, 실제 Electron E2E, 복구 테스트를 통해 성능과 안정성을 확인했습니다.


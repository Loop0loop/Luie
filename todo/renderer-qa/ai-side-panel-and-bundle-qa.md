# Renderer AI Side Panel QA 및 번들 경고 TODO

## QA 판정

자동 검증은 통과했지만 실제 기능 기준으로는 출시 전 수정이 필요하다.

- Typecheck: PASS
- i18n parity: PASS
- Renderer ESLint: PASS
- UI 무결성 테스트: PASS
- 관련 DOM 테스트: PASS
- Production build: PASS
- 최종 판정: FAIL

## 출시 전 수정 항목

### HIGH — 기존 ContextPanel 유실

`EditorRoot`가 전달하는 기존 `contextPanel`을 `MainLayout`이 `_contextPanel`으로 버리고 AI 패널만 렌더링한다.

영향:

- World, Character, Snapshot, Trash, Canvas 등 기존 오른쪽 패널 접근이 끊길 수 있다.

수정 방향:

- 기존 `contextPanel`을 유지한다.
- AI 화면은 `analysis` 탭 내부 또는 별도 탭으로 연결한다.
- 기존 ContextPanel 동작을 검증하는 DOM 테스트를 추가한다.

### HIGH — AI 응답이 실제 분석이 아닌 시뮬레이션

`WebNovelAICoPilot`은 입력 후 600ms 뒤 고정된 성공 응답을 보여준다.

영향:

- 현재 챕터와 무관한 분석 결과를 실제 결과처럼 표시한다.
- 실패·취소·로딩·근거 부족 상태가 없다.
- RAG Memory Engine과 기존 Analysis IPC를 우회한다.

수정 방향:

- 실제 Analysis/RAG API 연결
- `projectId`, `chapterId`, 선택 범위 전달
- loading/error/cancelled/insufficient-evidence 상태 추가
- Prototype이면 고정 응답임을 UI에 명시

### MEDIUM — 회차와 AI 컨텍스트 하드코딩

회차 제목, 캐릭터, 시놉시스, 복선, 분량이 여러 컴포넌트에 고정되어 있다.

수정 방향:

- 현재 프로젝트·챕터 store에서 데이터를 읽는다.
- AI 패널은 데이터가 없을 때 empty state를 표시한다.
- 현재 챕터 변경 시 패널 컨텍스트가 갱신되는지 테스트한다.

### MEDIUM — 신규 AI 문구의 i18n 누락

새 locale 키는 존재하지만 AI 컴포넌트 내부에 한국어와 영어 하드코딩 문구가 남아 있다.

수정 방향:

- 제목, 설명, 버튼, placeholder, aria-label을 모두 locale key로 이동
- ko/en/ja 전환 테스트 추가

### MEDIUM — 접근성 보완 필요

- 첨부 버튼과 컨텍스트 해제 버튼에 명시적 `aria-label`이 없다.
- 입력창에 label이 없다.
- 접기/펼치기 aria-label이 영어 하드코딩이다.

수정 방향:

- 모든 icon-only button에 locale 기반 `aria-label` 추가
- 입력창에 시각적으로 숨긴 label 연결
- 키보드만으로 열기·입력·전송·접기·해제가 가능한지 확인

### MEDIUM — 신규 AI 컴포넌트 테스트 공백

다음 테스트가 없다.

- AI 패널 열기·닫기
- 기존 ContextPanel 탭 유지
- 실제 챕터 변경 반영
- 빈 입력과 연속 전송
- 응답 대기 중 언마운트
- AI 실패·취소
- 캐릭터별 선택 이동
- locale 전환
- 키보드 접근성

## 번들 경고

### 진행 상태

- `vendor-editor` 경고: 해결
- 초기 Renderer Editor barrel 유입: 개선
- `handler` chunk: 별도 측정 대기

초기 빌드에서 다음 크기가 확인되었다.

```text
out/main/chunks/handler-DZLAuvtT.js       589.47 kB
out/renderer/assets/chunks/vendor-editor-C85WVukC.js 599.70 kB

Some chunks are larger than 500 kB after minification.
```

### 이것이 의미하는 것

실패가 아니다. 현재 `electron.vite.config.ts`의 다음 기준을 넘었다는 뜻이다.

```ts
chunkSizeWarningLimit: 500
```

Vite가 minify된 JavaScript chunk 하나가 500KB를 넘으면 경고한다. 앱이 실행되지 않는 오류는 아니지만, 해당 chunk를 로드·파싱·컴파일하는 비용이 커질 수 있다.

### `handler` chunk

Main Process의 IPC handler와 관련 의존성이 하나의 큰 chunk로 묶인 상태다.

가능한 영향:

- Main Process 초기 로드 비용 증가
- 초기 메모리 사용 증가
- handler 일부만 필요해도 큰 chunk를 함께 읽을 가능성

우선 확인할 것:

- `registerAllIPCHandlers`에서 모든 handler가 startup에 즉시 import되는가
- 이미 사용 중인 lazy import 경계를 더 적용할 수 있는가
- 실제 startup 시간과 메모리 증가가 측정되는가

### `vendor-editor` chunk

`electron.vite.config.ts`의 `rendererManualChunks`가 Tiptap과 ProseMirror를 모두 `vendor-editor`로 묶는다.

현재 크기가 약 600KB라는 뜻이며, Editor 진입에 필요한 라이브러리를 하나의 vendor chunk로 분리한 결과다.

가능한 영향:

- 앱 최초 Editor 진입 시 로드 비용 증가
- Editor를 사용하지 않는 화면에서도 해당 chunk가 초기 로드되는지 확인 필요

우선 확인할 것:

- Editor 관련 import가 실제로 lazy route/chunk 뒤에 있는가
- Tiptap extension을 모두 초기 진입에서 불러오는가
- ProseMirror와 Tiptap을 하나의 vendor chunk로 묶는 것이 최적인가

## 권장 처리 순서

1. `contextPanel` 유실 수정
2. AI 패널의 하드코딩 제거
3. 실제 Analysis/RAG API 연결 또는 Prototype 명시
4. 신규 AI 패널 테스트 추가
5. 번들 analyzer로 `handler`와 `vendor-editor` 구성 확인
6. startup/editor 진입 성능 측정
7. 측정 결과가 나쁠 때만 manual chunk 재분할

## 하지 말 것

### 적용한 최소 수정

- Renderer manual chunk를 `vendor-tiptap`과 `vendor-prosemirror`로 분리했다.
- 초기 진입 경로의 store import를 Editor domain barrel 대신 직접 store import로 바꿨다.
- 결과적으로 `vendor-editor` 599.70KB가 사라지고 다음처럼 분리되었다.

```text
vendor-tiptap:       137.32 kB
vendor-prosemirror:  347.50 kB
```

- `index.html`의 `vendor-editor` modulepreload는 제거되었다. 다만 ProseMirror chunk는 현재 preload되는 상태이며, 완전한 초기 Editor 제거는 별도 lazy-import 작업으로 남긴다.
- `check-build-warning-regression`: 0 warnings
- typecheck 및 변경 범위 lint: PASS

### 보류한 handler chunk

`handler` chunk는 약 589.47KB지만 `appReady`에서 동적 import되는 Main Process chunk다. 따라서 초기 Main entry에 직접 포함되지는 않는다.

handler를 도메인별로 쪼개면 IPC 등록 순서와 서비스 의존성 복잡도가 커질 수 있으므로, 먼저 startup 시간·메모리 측정 후 필요할 때만 분리한다.

경고만 없애기 위해 다음처럼 임계값만 올리지 않는다.

```ts
chunkSizeWarningLimit: 1000
```

이렇게 하면 문제가 해결된 것이 아니라 경고만 숨겨진다. 먼저 실제 로드 비용을 측정한 뒤 분할 여부를 결정한다.

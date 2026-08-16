# 종료 재진입이 저장 가드를 우회한 문제

## 증상

첫 `before-quit`의 비동기 저장 절차가 진행 중일 때 두 번째 종료 요청이 오면
두 번째 이벤트가 취소되지 않아 Electron 기본 종료가 계속될 수 있었다.

## 근본 원인

`isQuitting` 검사 뒤에 `event.preventDefault()`를 호출해 재진입 경로는 이벤트를
취소하지 않고 즉시 반환했다.

## 수정

모든 `before-quit` 이벤트를 먼저 취소하고 첫 요청만 기존 저장 절차를 시작한다.
동시 두 번째 종료 요청도 취소되는 회귀 테스트를 추가했다.

## 예방

비동기 종료 가드는 재진입 여부와 관계없이 이벤트의 기본 종료 동작부터 막아야
하며, 최종 종료는 저장 완료 뒤 `app.exit()` 같은 명시적 경계에서만 수행한다.

## 변경 파일

- `src/main/lifecycle/shutdown/shutdown.ts`
- `tests/main/lifecycle/shutdownWiring.test.ts`
- `.gemini/antigravity/brain/bugs/2026-08-14-shutdown-reentrant-quit-guard.md`

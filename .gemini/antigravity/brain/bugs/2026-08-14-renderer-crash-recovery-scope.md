# 보조 renderer 충돌이 main window 복구를 실행한 문제

## 증상

startup wizard나 다른 보조 webContents가 충돌해도 main window 데이터 긴급 저장과
재시작 다이얼로그가 실행됐다. 재시작 선택 시 main window를 닫았다가 다시 만들어
비 macOS의 `window-all-closed` 종료 흐름과도 경쟁할 수 있었다.

## 근본 원인

전역 `web-contents-created`에서 등록한 crash handler가 충돌한 webContents가 현재
main window인지 확인하지 않았고, 살아 있는 BrowserWindow를 재사용하지 않았다.

## 수정

main window webContents ID가 일치할 때만 긴급 저장과 사용자 복구를 수행한다. 재시작은
창을 닫지 않고 기존 BrowserWindow의 `reload()`를 사용한다.

## 예방

전역 webContents 이벤트에서 사용자에게 영향을 주는 복구는 대상 창의 소유권을 먼저
확인하고, 살아 있는 BrowserWindow는 닫고 재생성하지 않는다.

## 변경 파일

- `src/main/lifecycle/app-ready/appReady.ts`
- `src/main/lifecycle/app-ready/rendererCrashRecovery.ts`
- `tests/main/lifecycle/rendererCrashRecovery.test.ts`
- `.gemini/antigravity/brain/bugs/2026-08-14-renderer-crash-recovery-scope.md`

# 종료 중 background 작업이 DB 정리와 경쟁한 문제

## 증상

auto-sync timer/in-flight sync와 deferred startup maintenance가 종료 저장/export 및
DB checkpoint/disconnect 중에도 실행될 수 있었다. 종료 취소 시 안전하게 중단했다가
복구하는 lifecycle 계약도 없었다.

## 근본 원인

중앙 shutdown은 renderer/autosave/export와 worker 종료만 관리했고 sync 및 startup
maintenance가 소유한 timer와 Promise를 관찰하지 않았다. maintenance 내부 snapshot
정리 Promise도 `void`로 분리되어 완료 시점을 알 수 없었다.

## 수정

shutdown 시작 시 sync scheduling을 pause하고 in-flight run을 drain하며 deferred
maintenance timer를 멈추고 실행 중 작업을 기다린다. 종료 취소 시 두 scheduling을
복구한다. pause 상태에서 뒤늦은 renderer-ready가 maintenance를 새로 예약하는 것도
막는다. maintenance의 snapshot 정리도 await 대상에 포함한다.

## 예방

DB를 사용하는 background producer는 중앙 shutdown에 pause/drain/resume 계약을
제공해야 하며 DB checkpoint/disconnect 전에 모두 quiesce됐음을 테스트한다.

## 변경 파일

- `src/main/services/features/sync/syncService.ts`
- `src/main/lifecycle/app-ready/appReady.ts`
- `src/main/lifecycle/app-ready/deferredStartupMaintenance.ts`
- `src/main/lifecycle/app-ready/index.ts`
- `src/main/lifecycle/shutdown/shutdown.ts`
- `src/main/lifecycle/shutdown/runtimeLifecycle.ts`
- `tests/main/services/syncServiceShutdown.test.ts`
- `tests/main/lifecycle/deferredStartupMaintenance.test.ts`
- `tests/main/lifecycle/shutdownLifecycleSafety.test.ts`
- `tests/main/lifecycle/shutdownWiring.test.ts`
- `docs/architecture/current-main.md`
- `.gemini/antigravity/brain/bugs/2026-08-14-shutdown-background-quiesce.md`

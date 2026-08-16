# Startup maintenance가 snapshot sibling 작업을 drain하지 않은 문제

## 증상

snapshot prune과 orphan cleanup 중 하나가 먼저 실패하면 다른 작업이 실행 중이어도
deferred startup maintenance Promise가 완료될 수 있었다. shutdown은 이 Promise만
기다리므로 DB checkpoint/disconnect와 남은 cleanup이 경쟁할 수 있었다.

## 근본 원인

독립적인 두 snapshot 작업을 `Promise.all()`로 묶어 fail-fast 동작을 사용했다.

## 수정

`Promise.allSettled()`로 두 작업이 모두 settle될 때까지 기다린 뒤 첫 실패를 기존
경고 처리 경로로 전달한다.

## 예방

종료 시 drain 대상이 되는 병렬 작업은 sibling 실패 여부와 관계없이 모든 작업의
완료를 기다리는 상태 전이 테스트를 유지한다.

## 변경 파일

- `src/main/lifecycle/app-ready/deferredStartupMaintenance.ts`
- `tests/main/lifecycle/deferredStartupMaintenance.test.ts`
- `.gemini/antigravity/brain/bugs/2026-08-14-startup-maintenance-fail-fast-drain.md`

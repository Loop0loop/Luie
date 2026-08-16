# Utility process가 종료 확정 전에 중단된 문제

## 증상

`before-quit` 직후 utility process가 중단되어 사용자가 저장 실패 dialog에서 종료를
취소해도 RAG/LLM utility runtime이 이미 정지 중이었다. 종료 시에도 graceful
shutdown 완료를 기다리지 않았다.

## 근본 원인

utility lifecycle 종료가 중앙 `shutdown.ts`가 아니라 `main/index.ts`의 별도
`before-quit` listener에 등록되어 있었다. `stop()`도 완료를 관찰할 수 없는
`void` 계약이었다.

## 수정

별도 listener를 제거하고 sidecar 정리 뒤 중앙 finalize에서 utility shutdown을
호출한다. `stop()`은 진행 중인 동일 Promise를 반환하며 shutdown ACK 또는 timeout
정리가 끝날 때까지 종료 절차가 기다린다.

## 예방

취소 가능한 종료 이벤트에서는 외부 runtime을 중단하지 않는다. 모든 비가역 정리는
사용자 결정과 저장/export 성공 뒤 중앙 finalize 단계에서만 수행한다.

## 변경 파일

- `src/main/index.ts`
- `src/main/lifecycle/shutdown/shutdown.ts`
- `src/main/services/features/utility/utilityProcessBridge/internal/core.ts`
- `tests/main/lifecycle/shutdownWiring.test.ts`
- `docs/architecture/current-main.md`
- `.gemini/antigravity/brain/bugs/2026-08-14-utility-shutdown-centralization.md`

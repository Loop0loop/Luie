# Preload 경계

`index.ts`의 `contextBridge`가 `api/index.ts`의 `createRendererApi`를 `window.api`에 노출한다. shared `RendererApi`와 `api/types.ts`의 invoke 타입을 맞춘다.

- 새 메서드는 해당 `api/*Api.ts`와 shared 채널·타입·스키마, main handler까지 연결한다. raw `ipcRenderer`나 임의 채널 실행 권한을 renderer에 노출하지 않는다.
- `safeInvoke`의 timeout·오류 응답 계약을 유지한다. timeout은 main 작업 취소를 의미하지 않는다. 자동 재시도는 안전한 읽기 채널에 한정하며 쓰기를 무심코 `RETRYABLE_CHANNELS`에 추가하지 않는다.
- `sanitizeForIpc`의 직렬화와 입력 검증은 다르다. payload 검증은 main/shared 스키마에서 수행한다.
- 자동저장은 project/chapter별 queue와 sequence, 직렬 flush를 사용한다. 실패한 오래된 저장이 최신 내용을 덮어쓰지 않도록 재대기 조건과 promise 처리를 보존한다.
- 앱 종료 flush는 저장·로그 flush가 성공한 뒤 `APP_FLUSH_COMPLETE`를 보낸다. 실패를 삼켜 완료 응답을 보내지 않는다.
- 이벤트 구독은 해제 경로를 함께 제공한다. 로그 실패가 로그 채널을 재귀 호출하지 않도록 기존 guard를 유지한다.

변경 시 `check:ipc-contract-map`, `check:ipc-handler-schemas`, `check:preload-contract-regression` 중 관련 검사와 preload 회귀 테스트를 실행한다. 번들 변경은 `electron.vite.config.ts`의 CJS 출력을 확인한다.

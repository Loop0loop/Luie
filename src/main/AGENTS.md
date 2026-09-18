# Main 프로세스

시작·종료, IPC, 저장·복구, DB 및 OS 연동을 소유한다.

## 코드 위치

- `index.ts`와 `lifecycle/`: 부팅, deep link, bootstrap, deferred maintenance, 종료.
- `handler/index.ts`: IPC 등록 허브. `handler/core/ipcRegistrar.ts`와 shared 스키마를 통해 검증·응답을 일관되게 처리한다.
- `domains/`: manuscript/project/world/recovery/analysis/settings/sync/export의 진입점.
- `app/`, `infra/`: 창·시작 상태와 DB·파일·LLM·utility process 기반 기능.
- `services/`, `manager/`, `database/`: 기존 구현. 일부 진입점은 재노출이므로 실제 구현까지 따라가며, 새 호출자는 제공된 domain/infra 경계를 우선 사용한다.

## 변경 시 보존할 계약

- 첫 창 표시, bootstrap 완료, 첫 renderer 준비, 유지보수 시작은 서로 다른 시점이다. 무거운 작업을 첫 화면 경로에 추가할 때 해당 readiness 계약과 fallback을 확인한다.
- `handler/writing/ipcAutoSaveHandlers.ts`에서 AUTO_SAVE 접수와 MANUAL_SAVE의 flush·패키지 export 완료를 구분한다. 원고·revision·파생 작업의 트랜잭션과 패키지 저장 실패를 누락하지 않는다.
- 종료는 `lifecycle/shutdown/shutdown.ts`의 renderer flush, main 저장·복구, export, runtime 중지, DB 종료 흐름을 확인한다. 실패 시 재시도·종료 취소를 보존한다.
- utility process 코드는 main의 bridge·sidecar manager·BrowserWindow/app/ipcMain에 역의존하지 않는다. 관련 검사는 `check:utility-process-boundary`다.
- 외부 파일 경로·IPC 입력은 신뢰 경계에서 검증한다. 기존 `ServiceError`와 structured logger를 사용하되 원고·인증정보를 로그에 넣지 않는다.

DB 변경은 `database/main/`, `database/cache/`, 저장소의 `drizzle/main/`·`drizzle/cache/`와 패키징 경로를 함께 확인한다. 개발용 fallback이나 native ABI 우회로 통과한 결과를 실제 SQLite·배포 환경 검증으로 취급하지 않는다.

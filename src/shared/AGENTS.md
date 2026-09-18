# Shared 계약

`README.md`의 taxonomy를 기준으로 배치한다.

- `contracts/`, `api/`, `ipc/`, `schemas/`: 프로세스 경계의 진입점·타입·채널·응답·검증.
- `types/`, `constants/`, `utils/`, `world/`: 공유 DTO·상수·순수 계산/codec. renderer가 소비하는 모듈에 Node/Electron 의존이나 process별 초기화 부작용을 넣지 않는다.
- `ui/`, `hooks/`: renderer-safe 공유 UI. 여러 feature에 걸친 renderer 상태 로직은 `src/renderer/src/shared/`에 둔다.

공개 계약 변경은 main/preload/renderer 소비자와 persist·파일 호환성까지 추적한다. 기존 재노출 경로를 제거할 때는 호출자를 확인한다. 새 IPC 채널은 handler 등록·스키마와 preload 노출까지 맞춘다.

`schemas/narrative-benchmark/`, `validation/narrative-benchmark/` 변경은 여러 corpus에 영향을 준다. `corpus/AGENTS.md`의 truth·검수·revision 제약을 확인하고 새로운 검증에는 거부해야 할 입력 테스트를 포함한다.

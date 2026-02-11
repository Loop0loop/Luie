# Main Process Lifecycle Modules

## 목적
- `src/main/index.ts`는 모듈을 조립하는 오케스트레이터 역할만 유지합니다.
- 수명주기 로직은 전용 모듈로 분리해 테스트/유지보수를 쉽게 합니다.

## 모듈 구성
- `src/main/lifecycle/singleInstance.ts`
  - 싱글 인스턴스 락과 2차 실행 시 포커싱 처리
- `src/main/lifecycle/appReady.ts`
  - `app.whenReady()` 이후 초기화
  - CSP 적용, IPC 등록, 윈도우 생성, crash 복구, 초기 정리 작업
- `src/main/lifecycle/shutdown.ts`
  - 종료 플로우, 렌더러 플러시, 스냅샷 프루닝, DB 종료
  - SIGINT/SIGTERM 및 전역 예외 로깅

# Renderer 변경 검증

변경한 영역의 항목만 적용한다.

- 상태: 좁은 Zustand 구독, derived state 중복 방지, 비동기 결과 대상 확인.
- 편집기: IME 조합·selection·undo, 챕터 전환 전 flush, 실패 시 사용자 입력 보존.
- IPC: shared 응답·실패 처리 일치, renderer에 Node/Electron 접근 없음.
- 스타일: semantic token, light/dark/sepia, 높은 대비·reduced-motion, feature CSS 범위.
- 접근성: semantic 요소·label·accessible name, 키보드·focus, 색상 외 상태 표시.
- 레이아웃: 사용자 resize commit과 프로그램 복원 구분, 긴 한국어·좁은 패널에서 조작 가능.
- 검증: 관련 DOM/Vitest·typecheck·해당 `check:*`; 실화면 확인 여부를 구분해 보고.

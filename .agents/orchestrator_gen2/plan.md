# Project: Luie UI Enhancement
# Scope: UI 고도화 (Glassmorphism, Liquid input, Floating Icon with State Persistence, Resizable)

## Architecture
- Electron 40 + React 19 + TypeScript 5
- Feature-first UI 도메인 (주로 `src/renderer/src/features/` 내에 존재할 것으로 예상되는 fixView, floatingView)
- Global State (Zustand 등) 및 React Portal을 활용하여 탭 이동 시에도 floatingView의 돔 트리 및 상태 영속 유지.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Target Identification | 대상 컴포넌트(fixView, floatingView, 입력창, 전역 상태 등)의 파일 경로와 구조 분석 | None | IN_PROGRESS (7f0fc26c) |
| 2 | Glassmorphism & Liquid Input | `backdrop-blur-lg`/`backdrop-blur-xl`, bg-panel/40, border 스타일링 및 가로 리퀴드 입력창 개선 | M1 | PLANNED |
| 3 | State Persistence & FAB Bubble | floatingView 최소화 시 FAB(둥둥이) 노출 및 전역 탭 이동 시 Portal/Store 유지 | M2 | PLANNED |
| 4 | Resizable Component | mouse resize drag 또는 css resize를 활용한 크기 조절 및 제한(320x400 ~ 600x800) | M3 | PLANNED |
| 5 | Integrity & Verification | 타입체크 및 테스트 통과, 오라클 가이드 기반 최종 검증 | M4 | PLANNED |

## Code Layout
- `src/renderer/src/features/**`: 수정 대상 UI 컴포넌트 및 feature
- `src/renderer/src/store/**` 또는 각 feature 내부의 store: 상태 관리 파일
- `.agents/orchestrator_gen2/`: 메타데이터 및 상태 관리

## Interface Contracts
- Floating View 최소화 상태 (Zustand store 등 전역 상태 contract)
- Portal Container 및 Portal Component interface (전역 영속화를 위한 DOM 노드 마운트 contract)
- Resizable component의 resize handler 및 size state contract

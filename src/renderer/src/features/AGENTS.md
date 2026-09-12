# Renderer feature 안내

작업과 관련된 도메인부터 탐색한다.

| 영역 | 위치·연결 |
| --- | --- |
| 편집기·저장 | `editor/`의 TipTap 확장·autosave hooks, `manuscript/`의 챕터 흐름 |
| 캔버스 화면·그래프 | `canvas/components/graph/`, `canvas/components/viewport/`, `canvas/stores/` |
| 세계관 데이터·분석 | `research/stores/worldBuilding/`, `research/stores/analysis/`, `research/components/analysisSection/` |
| 창 내부 배치·모드 | `workspace/components/layout/`, `workspace/hooks/`, `workspace/stores/` |
| 프로젝트 로드 | `project/hooks/`와 project store |
| 기타 도메인 | `ai/`, `auth/`, `settings/`, `snapshot/`, `export/`, `startup/`, `trash/` |

캔버스 그래프는 research의 world-building 데이터와 workspace 상태를 함께 소비한다. 화면만 수정할 때도 관련 store·변환·persistence를 확인한다. 일부 `research/stores/worldBuildingStore*` 파일은 하위 구현을 재노출한다.

기존 feature 경계와 공개 진입점을 재사용한다. cross-feature 의존을 새 전역 store로 우회하거나, 단순한 변경에 별도 서비스·provider를 도입하지 않는다. 그래프·editor의 비동기 작업은 프로젝트/챕터 전환·unmount 후 결과와 이벤트 구독을 정리한다.

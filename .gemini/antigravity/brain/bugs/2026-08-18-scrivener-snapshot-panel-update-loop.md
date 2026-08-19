# Scrivener Snapshot 분할 패널의 최대 업데이트 깊이 오류

## 증상

Scrivener에서 Snapshot diff를 열면 `react-resizable-panels`의 `Group`에서 최대 업데이트 깊이 오류가 발생했다.

## 근본 원인

`PanelGroup.onLayoutChanged`가 현재 panel 크기를 다시 emit할 때마다 `updatePanelSize`가 같은 값으로 새 `panels` 배열을 만들었다. 이 store 갱신이 PanelGroup 재계산을 유발해 layout emit과 상태 갱신이 반복됐다.

## 수정

`updatePanelSize`에서 대상 panel이 없거나 크기 차이가 0.1 미만이면 기존 상태를 그대로 반환한다.

## 예방

react-resizable-panels의 layout callback으로 store를 갱신할 때는 동일 값 갱신을 반드시 차단한다. 동일 크기 재emit 회귀 테스트를 유지한다.

## 변경 파일

- `src/renderer/src/features/workspace/stores/uiStore.state.ts`
- `tests/renderer/stores/uiStore.persist.test.ts`

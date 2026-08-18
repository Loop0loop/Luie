# EntityDetailView의 비동기 선택 전환 시 Hook 순서 오류

## 증상

Scrivener에서 세력을 선택하면 `React has detected a change in the order of Hooks called by EntityDetailView` 오류가 발생했다.

## 근본 원인

선택 항목이 없는 첫 render는 `EntityDetailView`가 `useState`보다 먼저 반환했다. 비동기 로드 뒤 동일한 컴포넌트가 선택 항목과 함께 다시 render되면서 추가 Hook을 실행했다.

## 수정

조건부 반환 전에 infobox 상태 Hook을 선언해 모든 render의 Hook 순서를 동일하게 유지했다.

## 예방

컴포넌트의 모든 Hook은 조건부 반환보다 먼저 호출한다. null에서 로드 완료 상태로 전환되는 DOM 회귀 테스트를 유지한다.

## 변경 파일

- `src/renderer/src/features/research/components/wiki/EntityDetailView.tsx`
- `tests/dom/entityDetailViewWrappers.test.tsx`

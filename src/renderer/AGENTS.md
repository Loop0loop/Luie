# Renderer

Electron의 React 클라이언트다. 도메인 코드는 `src/features/`, 여러 feature의 상태성 공통 로직은 `src/shared/`, 재사용 UI는 저장소의 `src/shared/ui/`에 둔다. 별칭은 `@renderer/*`, `@shared/*`다.

## 코드·상태 경계

- 데스크톱 기능은 `window.api`를 사용한다. Node/Electron·main 내부 모듈을 직접 import하지 않는다.
- 기존 Zustand store의 selector·action·persist schema를 사용한다. 프로젝트·챕터 전환 중 오래된 비동기 결과가 새 대상 상태를 덮지 않도록 대상 ID와 생명주기를 확인한다.
- editor의 IME 조합, selection, undo, 저장 flush를 보존한다. 입력·drag·layout 같은 잦은 이벤트에서 저장·전역 구독·무거운 계산을 추가할 때 영향을 확인한다.
- memoization이나 worker 도입은 계산 비용·참조 안정성 등 구체적 필요로 결정한다. 파일 길이나 boolean prop 개수만으로 구성요소를 분리하지 않는다.
- 사용자 문구는 `src/i18n/`의 기존 번역 패턴을 따른다.

## 시각·상호작용 변경

해당 변경에 필요한 `DESIGN.md` 절과 `src/styles/global.tokens.css`, `global.behaviors.css`, `global.animations.css`를 확인한다.

- 기존 semantic token과 Tailwind v4 CSS-first 구성을 사용한다. component에 고정 색상·임의 z-index·동적 문자열 Tailwind class를 추가하지 않는다.
- ProseMirror·ReactFlow 내부 DOM, 전역 token·keyframe·문서 본문은 scoped CSS가 필요할 수 있다. 좌표·사용자 색상 같은 런타임 데이터는 inline style을 사용할 수 있다.
- feature 스타일에 `!important`를 추가하지 않는다. 전역 접근성·애니메이션 차단 규칙은 일반 feature 스타일과 구분한다.
- 키보드 조작, visible focus, label, icon-only 버튼의 accessible name·title을 유지한다. 상태를 색상만으로 표현하지 않는다.
- light/dark/sepia, 높은 대비, 애니메이션 끄기·OS reduced-motion 설정을 존중한다.
- 패널 크기는 기존 persistence key와 commit 이벤트를 사용한다. 프로그램에 의한 레이아웃 복원이 사용자 크기 설정을 덮어쓰면 안 된다.

UI 동작 변경은 관련 DOM 테스트와 실제 가능한 화면·상호작용 검증을 수행한다. 화면을 실행하지 못했으면 그 한계를 명시한다. 스타일 변경에는 `check:design-tokens`, store/persist 변경에는 관련 `check:*`를 선택한다.

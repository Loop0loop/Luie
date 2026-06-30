# Frontend / CSS AGENTS.md

이 문서는 Luie의 React, Tailwind, CSS, UX 구현에서 에이전트가 반드시 지켜야 하는 규칙이다. 새 UI를 만들거나 기존 UI를 수정하기 전에 이 문서를 `DESIGN.md`와 함께 읽는다.

## 기본 원칙

- 좋은 FE 코드는 예쁜 코드가 아니라 예측 가능한 코드다.
- React는 상태와 데이터 흐름을 단순하게 유지한다.
- Tailwind는 컴포넌트 내부 스타일의 기본 수단이다.
- CSS는 전역, 토큰, 외부 라이브러리 내부 DOM, 복잡한 selector에만 쓴다.
- 접근성은 나중에 붙이지 않는다. 처음부터 구조와 상태에 포함한다.
- `DESIGN.md`의 토큰 규칙을 우선한다. 색상, radius, font, z-index를 직접 만들지 않는다.

## React 규칙

- Hook은 컴포넌트 또는 custom Hook의 최상위에서만 호출한다.
- Hook을 조건문, 반복문, 이벤트 핸들러, `try/catch`, `useMemo`, `useEffect` 내부에서 호출하지 않는다.
- 일반 함수에서 Hook을 호출하지 않는다. Hook이 필요하면 컴포넌트나 `use*` custom Hook으로 분리한다.
- `useEffect`는 외부 시스템 동기화 전용이다. props/state로 계산 가능한 값이면 렌더 중 계산한다.
- 사용자 액션은 이벤트 핸들러에 둔다. 클릭, 입력, 제출 처리를 Effect로 우회하지 않는다.
- Effect는 읽는 모든 reactive 값을 dependency에 선언한다. linter를 끄지 않는다.
- Effect가 연결, 구독, 타이머, fetch 같은 작업을 시작하면 cleanup을 반드시 둔다.
- state는 최소 표현만 저장한다. 중복값, 파생값, 서로 모순될 수 있는 값은 state에 넣지 않는다.
- state는 필요한 가장 가까운 공통 부모까지만 올린다. 임시 UI 상태를 전역으로 올리지 않는다.
- 객체와 배열 state는 직접 mutation하지 않는다. 새 객체/배열로 교체한다.
- 렌더링은 순수해야 한다. 렌더 중 기존 객체, 외부 변수, 전역 상태를 변경하지 않는다.
- `useMemo`와 `useCallback`은 기본값이 아니다. 비싼 계산, memoized child, identity가 실제로 필요할 때만 쓴다.
- memoization으로 버그를 숨기지 않는다. 먼저 state 구조, Effect, 컴포넌트 순수성을 고친다.
- 컴포넌트는 데이터 모델을 props로 받아 JSX를 반환하는 책임에 집중한다.
- store 접근, 데이터 변환, editor runtime, visual chrome이 한 파일에 섞이면 분리한다.
- wrapper 컴포넌트는 가능하면 `children`을 받는다. 불필요한 prop drilling과 memoization을 만들지 않는다.

## Tailwind 규칙

- 기본 스타일링은 Tailwind utility로 한다.
- JSX에서 레이아웃, spacing, typography, 색상 토큰, hover/focus/disabled 상태를 표현한다.
- 같은 요소에 충돌 utility를 동시에 넣지 않는다. 예: `grid flex`, `p-2 p-4`.
- 같은 Tailwind 묶음이 반복되면 먼저 컴포넌트로 추출한다. CSS class로 빼는 것은 다음 선택지다.
- 동적 class 조립은 금지한다. `bg-${color}-500`처럼 만들지 않는다.
- 동적 variant는 완성된 class 문자열 map으로 처리한다.
- arbitrary value는 예외다. 반복되면 `global.tokens.css` 또는 feature token 후보로 본다.
- `text-[15px]`, `rounded-[7px]`, `top-[37px]` 같은 값이 반복되면 중단하고 토큰/기존 scale을 찾는다.
- Tailwind class가 너무 길어져 의미가 흐리면 작은 컴포넌트로 나눈다. CSS로 숨기지 않는다.

## CSS 규칙

- custom CSS는 마지막 선택지다.
- CSS를 쓰는 허용 범위는 전역 reset, `@font-face`, design token, keyframes, pseudo-element, markdown/content styling, browser 보정, third-party 내부 DOM override다.
- ReactFlow, ProseMirror처럼 라이브러리가 만드는 내부 DOM은 CSS 사용이 가능하다. 단 selector는 feature root class 아래로 격리한다.
- CSS는 feature root class로 scope를 좁힌다. 예: `.canvas-document-editor .ProseMirror`.
- ID selector, 깊은 descendant selector, specificity 싸움은 금지한다.
- `!important`는 금지한다.
- `!important` 예외는 통제 불가능한 외부 CSS/레거시 위젯을 막을 때뿐이다. 사용 시 이슈 번호와 제거 조건을 주석으로 남긴다.
- 내 CSS 구조가 잘못돼서 안 먹는 경우 `!important`로 해결하지 않는다.
- Tailwind class 순서나 중복 문제를 `!important`로 해결하지 않는다.
- inline `style`은 런타임 데이터 값에만 쓴다. 예: 노드 kind별 색상, edge stroke, 사용자 좌표.
- 정적인 레이아웃, 간격, 폰트, radius, shadow는 inline style로 쓰지 않는다.
- hardcoded color는 금지한다. 동적 색상 fallback이 필요한 경우에도 먼저 `DESIGN.md`와 token 존재 여부를 확인한다.
- CSS 파일을 추가하면 import 지점과 책임을 명확히 한다. 범용 global로 흘리지 않는다.

## Tailwind vs CSS 선택 기준

| 상황 | 선택 |
| --- | --- |
| 컴포넌트 레이아웃, spacing, typography | Tailwind |
| hover, active, disabled, selected 상태 | Tailwind |
| 디자인 토큰 기반 색상/배경/테두리 | Tailwind |
| 반복되는 UI 조각 | React 컴포넌트 |
| Markdown/ProseMirror 내부 DOM | scoped CSS |
| ReactFlow handle, edge overlay 내부 DOM | scoped CSS |
| keyframes, font-face, CSS variables | CSS |
| API/DB에서 온 색상/좌표 | inline style 또는 CSS variable |
| class 이름을 런타임 문자열로 합성해야 하는 경우 | 명시적 class map |

## UX / 접근성 규칙

- `focus-visible`을 지우지 않는다. 파란 outline이 싫으면 토큰 기반 focus style로 대체한다.
- 포커스가 헤더, 패널, 팝오버에 가려지면 실패다.
- 기본 HTML이 가능하면 ARIA를 쓰지 않는다.
- `div role="button"`을 만들면 버튼의 키보드 동작까지 직접 책임져야 한다. 기본은 `<button>`이다.
- 정보 구조는 CSS 모양이 아니라 HTML 구조로 드러낸다. 제목, 목록, 버튼, 링크, 폼 라벨을 의미대로 쓴다.
- 모든 기능은 키보드만으로 실행 가능해야 한다.
- 키보드 트랩을 만들지 않는다.
- 텍스트 대비는 WCAG AA 기준을 맞춘다. 일반 텍스트 4.5:1, 큰 텍스트 3:1을 기준으로 본다.
- 색만으로 상태를 전달하지 않는다. 오류, 선택, 성공은 텍스트나 아이콘/패턴도 함께 제공한다.
- loading, empty, error, disabled, saving/saved 상태를 설계한다.
- 로딩, 빈 화면, 오류, 저장됨 상태는 필요하면 `role="status"` 또는 `aria-live`를 검토한다.
- 입력 오류는 해당 필드와 텍스트 메시지로 연결한다. 빨간 테두리만으로 끝내지 않는다.
- 아이콘 버튼은 `aria-label`과 `title`을 가진다.
- disabled UI는 진짜 `disabled` 또는 의미 있는 `aria-disabled`를 가진다.

## 성능 규칙

- Core Web Vitals를 예산으로 본다. LCP 2.5초 이하, INP 200ms 이하, CLS 0.1 이하를 목표로 한다.
- 레이아웃 점프를 만들지 않는다. 이미지, 패널, 로딩 영역은 크기를 먼저 예약한다.
- 큰 리스트는 virtualization을 검토한다.
- `useMemo`/`useCallback`으로 감으로 최적화하지 않는다. 먼저 렌더 범위와 state 구조를 줄인다.
- 애니메이션은 `data-animations="off"`와 reduced-motion 정책을 고려한다.

## 테스트 / Storybook 규칙

- 테스트는 구현이 아니라 사용자가 보는 DOM을 검증한다.
- Testing Library는 `getByRole({ name })`을 먼저 쓴다.
- className, 내부 state, 컴포넌트 인스턴스를 우선 조회하지 않는다.
- `data-testid`는 최후 수단이다.
- 재사용 UI 컴포넌트는 기본, hover/focus, loading, empty, error, disabled 상태를 Storybook 또는 테스트로 남긴다.
- Storybook `play`는 실제 사용자 상호작용을 문서화하고 검증할 때만 쓴다.
- 접근성 검사는 렌더된 DOM 기준으로 본다.

## Luie 프로젝트 전용 규칙

- `DESIGN.md`가 시각 디자인의 상위 규칙이다.
- `global.tokens.css`의 토큰을 먼저 사용한다.
- `bg-app`, `bg-sidebar`, `bg-panel`, `bg-surface`, `bg-element`, `text-fg`, `text-muted`, `text-subtle`, `border-border`, `rounded-control`, `rounded-panel` 같은 semantic utility를 우선한다.
- renderer feature 코드는 `src/renderer/src/features/**` 안에서 feature-first 구조를 유지한다.
- renderer에서 Node/Electron API에 직접 접근하지 않는다. preload API 경계를 지킨다.
- canvas feature에서 CSS를 추가할 때는 `src/renderer/src/styles/components/canvas.css`처럼 feature scope를 둔다.
- canvas node/edge처럼 ReactFlow 내부 DOM을 스타일링할 때도 `!important` 없이 처리한다. 안 되면 컴포넌트 구조나 ReactFlow prop을 먼저 찾는다.
- ProseMirror/ReactFlow selector는 feature root class 밑에 둔다.
- 컴포넌트 파일이 300 LOC를 넘기면 책임이 섞였는지 점검한다.
- UI, store hook, model 변환, editor runtime, CSS를 한 파일에 몰아넣지 않는다.

## 금지 목록

- `!important`
- hardcoded color
- 임의 z-index
- 동적 Tailwind class 문자열 조립
- `outline-none`만 있고 대체 focus style이 없는 UI
- div button
- placeholder를 label처럼 쓰는 form
- 상태 계산용 `useEffect`
- 조건부 Hook 호출
- 직접 state mutation
- 의미 없는 memoization
- 동작하지 않는 버튼 또는 가짜 affordance
- 외부 라이브러리 내부 DOM override를 컴포넌트 밖 전역 selector로 작성

## 허용 예외

- 런타임 색상, 좌표, SVG stroke 같은 데이터 기반 값은 inline style을 허용한다.
- ReactFlow/ProseMirror 내부 DOM은 scoped CSS를 허용한다.
- 외부 라이브러리가 통제 불가능한 inline style 또는 고특이도 CSS를 강제할 때만 `!important`를 검토한다. 이 경우 주석에 이유, 제거 조건, 이슈 번호를 남긴다.

## 참고 자료

- React Rules of Hooks: https://react.dev/reference/rules/rules-of-hooks
- React You Might Not Need an Effect: https://react.dev/learn/you-might-not-need-an-effect
- React Choosing the State Structure: https://react.dev/learn/choosing-the-state-structure
- React Keeping Components Pure: https://react.dev/learn/keeping-components-pure
- Tailwind Styling with Utility Classes: https://tailwindcss.com/docs/styling-with-utility-classes
- Tailwind Theme: https://tailwindcss.com/docs/theme
- Tailwind Adding Custom Styles: https://tailwindcss.com/docs/adding-custom-styles
- Tailwind Dynamic Class Names: https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names
- MDN Specificity: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity
- MDN `!important`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/important
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/
- web.dev Web Vitals: https://web.dev/articles/vitals
- Testing Library Guiding Principles: https://testing-library.com/docs/guiding-principles
- Storybook Writing Stories: https://storybook.js.org/docs/writing-stories

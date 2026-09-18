---
name: vercel-composition-patterns
description: "React 컴포넌트의 실제 variant·상태 소유권·재사용 API 문제를 해결할 때 구성 패턴을 참고한다."
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React 구성 패턴

기존 props·호출자·상태 소유권을 먼저 확인한다. boolean 하나나 파일 길이만으로 compound component·provider·generic interface를 도입하지 않는다. 현재 필요를 해결하는 기존 구성과 단순 props를 우선한다.

실제 문제가 있는 항목만 `rules/`에서 읽는다:

- variant 조합 충돌: `architecture-avoid-boolean-props.md`, `patterns-explicit-variants.md`
- 여러 부분의 공유 상태: `architecture-compound-components.md`, `state-lift-state.md`
- 구현과 API 분리 필요: `state-decouple-implementation.md`
- children/render prop 선택: `patterns-children-over-render-props.md`
- ref API 변경: `react19-no-forwardref.md`; React 버전·소비자 호환성을 확인한다.

React 19에서도 기존 useContext/forwardRef를 이 스킬 적용만으로 일괄 교체하지 않는다. 전체 모음 `AGENTS.md`는 필요한 규칙을 찾기 위한 참고 자료이며 기본 전체 읽기 대상이 아니다.

루트·renderer 지침에 따라 관련 호출자와 동작을 검증한다.

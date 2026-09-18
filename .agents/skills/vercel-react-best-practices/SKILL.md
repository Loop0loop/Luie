---
name: vercel-react-best-practices
description: "React의 측정된 렌더링·구독·비동기 대기·번들 병목을 조사하거나 개선할 때 참고한다."
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React 성능 참고

Luie는 Electron 클라이언트 React 앱이다. Next.js/RSC/SSR/server action 예시는 해당 기술을 실제로 사용하는 별도 대상에만 적용한다.

현재 hot path·데이터 크기·관찰 결과에 맞는 `rules/` 문서만 선택한다:

- 독립 비동기 작업: `async-parallel.md`, `async-defer-await.md`
- 불필요한 구독·렌더: `rerender-defer-reads.md`, `rerender-derived-state-no-effect.md`, `rerender-dependencies.md`
- 입력 응답성: `rerender-use-deferred-value.md`, `rerender-use-ref-transient-values.md`
- 무거운 모듈: `bundle-conditional.md`, `bundle-analyzable-paths.md`
- 이벤트·영속 상태: `client-event-listeners.md`, `client-localstorage-schema.md`

코드 예시의 next/dynamic·SWR·better-all을 자동 도입하지 않는다. 기존 React·Zustand·Promise·worker와 프로젝트 경계를 사용한다. domain 공개 진입점을 우회하거나 await·persist 순서를 바꿀 때는 계약을 확인한다.

전체 모음 `AGENTS.md`와 모든 규칙을 일괄 적용하지 않는다. memoization·캐시·구조 변경은 현재 비용과 검증 근거가 있을 때 선택한다. 성능 개선 수치는 동일 조건의 전후 측정으로 보고하고, correctness 테스트 통과와 구분한다.

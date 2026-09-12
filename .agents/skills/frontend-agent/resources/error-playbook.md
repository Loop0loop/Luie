# Renderer 검사 실패 대응

- 타입·IPC 불일치: shared 타입과 실제 응답을 확인한다. unsafe cast나 ignore로 숨기지 않는다.
- 빌드/import 오류: `electron.vite.config.ts`, package 의존성과 별칭을 확인한다. Next.js의 use client·SSR 설정을 해결책으로 적용하지 않는다.
- 상태·타이밍 오류: store 구독, project/chapter ID, 비동기 완료 순서, cleanup·flush를 추적한다.
- 스타일 오류: 부모 overflow/크기, 실제 생성된 Tailwind class, token·HTML theme attribute, CSS import 순서를 확인한다.
- 테스트 환경 오류: jsdom 적용 범위·mock preload·native ABI를 구분한다. DB가 필요한 테스트에 setup 생략을 적용하지 않는다.
- 외부 도구 불가: 가능한 코드·DOM 검사를 진행하고 실화면·실측의 미확인 범위를 보고한다.

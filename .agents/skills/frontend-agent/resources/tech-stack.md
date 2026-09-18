# Renderer 도구·위치

버전은 저장소 `package.json`을 확인한다.

Electron + React 클라이언트, TypeScript, Zustand, TipTap/ProseMirror, ReactFlow, Tailwind v4, Radix/Lucide를 사용한다.

- 앱 진입점: `src/renderer/src/app/main.tsx`
- feature: `src/renderer/src/features/`
- feature 간 상태성 공통 코드: `src/renderer/src/shared/`
- 재사용 UI: `src/shared/ui/`
- 번역: `src/renderer/src/i18n/`
- 스타일: `src/renderer/src/styles/global.css`와 tokens/behaviors/animations CSS
- 검증: `tests/dom/`, `tests/renderer/`, `tests/e2e/`

별칭은 `@renderer/*`, `@shared/*`다. 별도 Next.js 서버·Jotai·TanStack Query·새 toast/icon 패키지를 기본으로 추가하지 않는다.

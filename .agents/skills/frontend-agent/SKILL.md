---
name: frontend-agent
description: "Luie React renderer의 화면·상호작용·Zustand 상태 흐름을 구현하거나 수정할 때 사용한다."
---

# Luie renderer 구현

저장소 `AGENTS.md`, `src/renderer/AGENTS.md`, 대상 feature 지침을 적용한다. Electron의 클라이언트 React 앱이므로 Next.js/RSC·서버 route 구성을 도입하지 않는다.

기존 feature의 component → hook/store → preload 흐름을 확인한다. Zustand selector/action과 `@shared/ui`를 재사용한다. 비동기 결과의 project/chapter 대상, IME 조합, undo·selection, 저장 실패 시 입력 보존을 확인한다.

시각 변경은 `DESIGN.md` 관련 절과 기존 token을 따른다. Tailwind v4 CSS-first, Lucide, 프로젝트 Toast/Dialog·i18n을 사용하며 외부 스킬 예시의 라이브러리를 자동 설치하지 않는다. 키보드·focus·label 및 관련 상태 피드백을 검증한다.

필요할 때만 참고한다:

- 여러 UI·상태 경계 변경: [execution-protocol](resources/execution-protocol.md)
- UI·persist 검증: [checklist](resources/checklist.md)
- 빌드·타입·상태·스타일 오류: [error-playbook](resources/error-playbook.md)
- 실제 구조·도구 위치: [tech-stack](resources/tech-stack.md)

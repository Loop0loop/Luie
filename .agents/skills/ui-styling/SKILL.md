---
name: ui-styling
description: "Luie의 기존 semantic token·Tailwind CSS·공유 UI를 사용해 스타일·테마·접근 가능한 control을 구현할 때 사용한다."
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# Luie 스타일 구현

`DESIGN.md` 관련 절, `src/renderer/AGENTS.md`, 실제 token·공유 UI를 기준으로 한다. Tailwind v4 CSS-first와 기존 Radix/Lucide·Toast/Dialog를 재사용한다.

새 Tailwind 설정 파일·next-themes·폼/아이콘 패키지나 shadcn 초기화를 기본으로 수행하지 않는다. 기존 컴포넌트를 수정할 필요가 있으면 소비자 영향을 확인해 수정하며 read-only라는 이유로 wrapper를 강제하지 않는다.

확인된 필요에 맞는 참고 문서만 읽는다:

- control 구성: [shadcn-components](references/shadcn-components.md)
- focus·keyboard·ARIA: [shadcn-accessibility](references/shadcn-accessibility.md)
- CSS utility·반응형: [tailwind-utilities](references/tailwind-utilities.md), [tailwind-responsive](references/tailwind-responsive.md)
- theme 확장: [tailwind-customization](references/tailwind-customization.md); Luie token/attribute 계약을 우선한다.
- 포스터·정적 시각물 요청: [canvas-design-system](references/canvas-design-system.md). 앱의 ReactFlow canvas와 구분한다.

참고 예시의 별칭·설치 명령·고정 색상은 Luie에 그대로 복사하지 않는다. 테마·키보드 focus·긴 한국어·좁은 패널을 관련 범위에서 검증하고 스타일 변경에는 `check:design-tokens`를 사용한다.

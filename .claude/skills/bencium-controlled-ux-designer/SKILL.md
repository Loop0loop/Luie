---
name: bencium-controlled-ux-designer
description: "사용자가 UI 시각 방향·대안을 비교하거나 디자인을 구체화하길 요청했을 때 사용한다."
metadata:
  version: 1.0.0
---

# 디자인 방향 구체화

요청과 기존 화면·제품 맥락에서 목적을 확인한다. Luie에서는 `DESIGN.md`의 집필 중심 위계, token·폰트·테마·motion을 기준으로 한다. 통상적인 control 크기·색상 재사용마다 승인을 요구하지 않는다.

실질적으로 다른 제품 방향이 열려 있을 때만 필요한 대안과 tradeoff를 제시한다. 방향이 주어졌거나 기존 디자인으로 결정 가능하면 요청된 구현·검증까지 진행한다. 리뷰만 요청받으면 변경 없이 근거를 보고한다.

- 위계·가독성·상태 피드백이 집필 흐름을 돕는지 확인한다.
- keyboard·focus·label·색상 외 상태 표시와 reduced-motion을 보존한다.
- 기존 `@shared/ui`, Lucide, Toast/Dialog, Tailwind v4 token을 재사용한다.
- 예시를 이유로 Phosphor·Sonner·Framer Motion이나 새 palette·font를 도입하지 않는다.
- 시각 효과·플랫폼 스타일을 취향만으로 금지하거나 기본으로 강제하지 않는다.

필요한 주제에만 [ACCESSIBILITY](ACCESSIBILITY.md), [MOTION-SPEC](MOTION-SPEC.md), [RESPONSIVE-DESIGN](RESPONSIVE-DESIGN.md), [DESIGN-SYSTEM-TEMPLATE](DESIGN-SYSTEM-TEMPLATE.md)를 참고한다. 이 자료의 일반 예시·모바일 수치·승인 절차보다 사용자 요청과 Luie의 현재 디자인 계약을 우선한다.

관련 창·패널 크기와 테마에서 확인하고 직접 실행·측정하지 못한 부분을 명시한다.

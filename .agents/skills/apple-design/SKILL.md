---
name: apple-design
description: "Luie 데스크톱 UI·화면 자료의 사용성·접근성·플랫폼 관례를 HIG 근거로 검토하거나 개선할 때 사용한다."
---

# 데스크톱 디자인 검토

Luie는 Electron 집필 앱이다. `DESIGN.md`와 관련 화면·코드를 기준으로 검토하며, Apple 지침의 원칙을 대상 플랫폼에 맞게 적용한다. 모바일 크기·내비게이션·Apple API를 공통 의무로 바꾸지 않는다.

[HIG 검색 안내](references/hig-lookup.md)로 필요한 주제를 찾고 그 문서만 읽는다. 모든 검토에 색·타이포·레이아웃 문서 전체를 요구하지 않는다.

- 키보드·focus·보조 기술 문제: accessibility 및 해당 control.
- 테마·대비: color/dark-mode.
- 패널·창·내비게이션: layout 및 해당 desktop component.
- AI 결과·사용자 통제: generative-ai/machine-learning.
- 아이콘·반투명 효과: app-icons 또는 materials/liquid-glass가 실제 대상일 때.

각 발견에 화면/코드 위치, 사용자 영향, 관련 근거와 수정 방향을 제시한다. 측정한 대비·직접 조작한 결과와 시각적 추정을 구분한다. 기계적인 등급·긍정 섹션·고정 문서 수는 요구하지 않는다.

검토 요청은 보고로 완료한다. 개선 요청은 기존 디자인·명시된 방향으로 구현·관련 검증까지 진행한다. 토큰 재사용 같은 통상 선택마다 승인을 묻지 않으며, 의미 있는 미해결 제품 선택만 확인한다. 원문 인용·최신 규격 판단은 해당 공식 문서를 확인한다.

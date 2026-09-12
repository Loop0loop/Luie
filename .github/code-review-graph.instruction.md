---
applyTo: "**/*.{ts,tsx,js,mjs,cjs}"
description: "코드 그래프로 관계와 변경 영향을 찾고 현재 소스로 확인한다."
---

# Code review graph

탐색·검증 기준은 저장소 `AGENTS.md`를 따른다. 그래프가 제공되면 질문에 맞는 도구를 선택한다.

- 심볼·호출자·소비자: `semantic_search_nodes`, `query_graph`.
- diff 문맥·영향: `detect_changes`, `get_review_context`, `get_impact_radius`.
- 여러 실행 경로의 영향: `get_affected_flows`.

모든 도구를 순서대로 실행할 필요는 없다. 미지원·누락·오래된 결과는 소스·git diff·범위를 좁힌 검색으로 보완한다. 그래프의 자동 갱신·테스트 커버리지를 완전하다고 단정하지 않는다.

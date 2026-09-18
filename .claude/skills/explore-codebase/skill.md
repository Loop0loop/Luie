---
name: explore-codebase
description: "Luie 구조·호출 관계를 코드 그래프와 현재 소스로 설명할 때 사용한다."
---

# 구조 탐색

넓은 구조 질문은 `get_architecture_overview`, 특정 기능은 `semantic_search_nodes`·`query_graph`로 시작한다. 관련 community·flow는 질문을 해결하는 데 필요할 때만 확인한다.

그래프의 경로·관계를 현재 코드로 확인하고 누락은 범위를 좁힌 검색으로 보완한다. 구조 설명을 요청받았으면 변경 없이 근거와 미확인 범위를 보고한다. 매 탐색의 전체 통계·도구 호출 한도는 요구하지 않는다.

---
name: debug-issue
description: "코드 그래프를 활용해 Luie 오류의 호출 경로와 원인을 추적할 때 사용한다."
---

# 그래프 기반 오류 조사

저장소 `AGENTS.md`와 [debug-agent](../../../.agents/skills/debug-agent/SKILL.md)의 진단·수정 범위를 따른다.

질문에 맞게 `semantic_search_nodes`로 후보를 찾거나 `query_graph`로 호출자·피호출자를 확인한다. 실행 경로가 불분명하면 flow 도구를 추가한다. 이미 찾은 코드의 반복 탐색은 생략한다.

그래프가 없거나 누락·오래된 결과가 있으면 소스·git diff·관련 테스트로 확인한다. 도구 호출 수·출력 토큰 상한 때문에 필요한 조사를 생략하지 않는다.

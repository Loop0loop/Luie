---
name: review-changes
description: "요청한 diff를 코드 그래프의 영향 분석과 실제 소스로 검토할 때 사용한다."
---

# 변경 리뷰

사용자 지정 diff·브랜치·파일 범위에서 `detect_changes`와 현재 `git diff`를 대조한다. 영향 경로나 테스트 연결이 불명확하면 `get_affected_flows`, `query_graph`, `get_impact_radius` 중 필요한 도구를 선택한다.

실제 호출 조건·검증 경계·테스트를 확인하고, 위치·발현 조건·영향·수정 방향을 보고한다. 그래프의 test 연결을 실제 실행·coverage로 설명하지 않는다.

검토 요청만으로 변경하거나 PR에 쓰지 않는다. 도구 누락·오류는 소스 검색으로 보완하며 호출/토큰 상한을 완료 기준으로 사용하지 않는다.

---
trigger: always_on
---

# 변경 검증

[AGENTS.md](../../AGENTS.md)의 검증 선택을 적용한다. TypeScript 변경은 `pnpm run typecheck`와 관련 테스트·정책 검사를 사용한다.

이번 변경이 만든 오류는 요청 범위 안에서 수정하고 실패했던 검사를 다시 실행한다. 기존 오류나 환경 문제를 구분하며, 검토 요청만 받은 경우 발견 사항을 보고한다. 무관한 Medium 이슈까지 고치는 것을 완료 조건으로 삼지 않는다. 별도 Oracle agent나 고정 보고 양식은 요구하지 않는다.

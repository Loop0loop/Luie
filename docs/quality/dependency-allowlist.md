# Dependency Allowlist (V3)

V3에서는 신규 외부 의존성 도입 시 아래 표에 근거를 남깁니다.

## Rules

1. 신규 패키지 추가 전, 목적/대안/보안 검토를 기록합니다.
2. `owner`는 실제 담당자 계정 또는 팀명을 입력합니다.
3. `status`는 `approved` 또는 `deprecated` 중 하나를 사용합니다.
4. 제거 예정인 패키지는 `removeBy` 날짜를 기록합니다.

## Entries

| package | purpose | owner | status | removeBy | notes |
| --- | --- | --- | --- | --- | --- |
| `depcheck` | 의존성 무결성 보조 검사(로컬/CI) | platform | approved | - | `check:deps` 보조 검증 |

---
trigger: always_on
---

# Oracle Rule

모든 코드 수정 작업이 끝난 뒤, Assistant는 반드시 Oracle QA 단계를 수행한다.

## 1. Required Checks

코드 수정 후 반드시 다음을 실행하거나, 실행 불가 시 이유를 명시한다.

- bun typecheck
- 변경 파일 재검토
- 관련 hooks / state / props 흐름 점검
- 렌더링 조건 / loading / error / empty state 점검
- 기존 UX 또는 API contract 파괴 여부 점검

## 2. Severity Policy

발견된 문제는 다음 등급으로 분류한다.

### Critical
- 빌드/타입체크 실패
- 런타임 크래시 가능성
- 데이터 손실
- 인증/보안/권한 문제
- 주요 플로우 차단

→ 반드시 수정한다.

### High
- 주요 기능 오작동
- 상태 불일치
- 잘못된 API 호출
- hooks 규칙 위반
- 명확한 UX regression

→ 반드시 수정한다.

### Medium
- 잠재적 상태 버그
- 비효율적 렌더링
- 불안정한 조건 분기
- 유지보수성을 크게 해치는 코드
- 중복 로직으로 인한 오류 가능성

→ 원칙적으로 수정한다.

### Low
- 네이밍
- 사소한 스타일
- 미세한 리팩토링
- 취향 차이 수준의 개선

→ 보고만 하고 임의 수정하지 않는다.

## 3. Final Response Format

작업 완료 후 반드시 아래 형식으로 보고한다.

### Oracle QA Result

- Typecheck: PASS / FAIL / NOT RUN
- Critical: 0개 / N개 수정
- High: 0개 / N개 수정
- Medium: 0개 / N개 수정
- Low: N개 발견, 수정 안 함
- 남은 리스크:
  - 없음
  - 또는 구체적으로 명시

Critical / High / Medium이 남아있으면 작업 완료로 간주하지 않는다.
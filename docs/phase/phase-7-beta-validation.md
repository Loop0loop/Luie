## Phase 7. 실제 작가 베타 기준 검증

비유: 내부 시험을 통과한 조수를 실제 작가 작업실에 앉혀 보는 단계다.

목표:

- 기능이 아니라 작가 생산성 기준으로 검증한다.

### Phase 7-1. writer task benchmark

작업:

- 작가가 실제로 하는 작업을 benchmark로 만든다.

벤치마크:

- 설정 확인
- 인물 관계 확인
- 떡밥 회수 여부 확인
- 회차 기준 지식 상태 확인
- 초안/정사 충돌 확인

완료 기준:

- task별 성공률
- 평균 응답 시간
- 근거 만족도
- false confidence rate

완료된 범위:

- writer task benchmark의 5개 작업 taxonomy를 코드로 고정했다.
- 기존 memory eval score 결과를 task별 성공률, 평균 응답 시간, 근거 만족도, false confidence rate로 요약하는 계약을 추가했다.

아직 남은 범위:

- 실제 live writer benchmark run을 저장/실행하는 runner는 아직 없다.
- 실제 작가 베타 데이터 기반 threshold는 아직 확정하지 않았다.

### Phase 7-2. feedback loop

작업:

- 작가가 "이 답변 틀림", "이 근거 좋음"을 표시하면 eval set에 반영한다.

완료 기준:

- feedback 저장
- eval case 자동 후보 생성
- rejected answer 재발 방지

## Phase 5. 작가용 UI 통합

비유: 지금은 조수가 내부적으로 책갈피를 찾아온다. Phase 5는 그 책갈피, 경고 딱지, 충돌 표시를 작가 책상 위에 보기 좋게 붙이는 단계다.

목표:

- 작가가 AI 답변을 믿어도 되는지 바로 판단할 수 있게 한다.

### Phase 5-1. evidence-first answer UI

작업:

- 답변보다 근거를 먼저 확인할 수 있게 한다.

UI 요소:

- 근거 quote
- 회차/장면 링크
- 확정/추정/근거부족 라벨
- 사용된 memory 목록

완료 기준:

- 답변에서 원문 위치로 이동 가능: evidence quote button이 기존 jump callback을 유지하고 답변보다 먼저 표시됨, chapterId/offset 위치 label DOM 1차 완료
- 근거 없는 답변은 확정 라벨 금지

### Phase 5-2. conflict warning UI

작업:

- 설정 충돌 가능성을 작가에게 보여준다.

UI 요소:

- 충돌 후보 양쪽 quote
- 어느 회차에서 나온 설정인지
- confirm/reject/defer 버튼

완료 기준:

- conflict ledger와 연결: Phase 3-3의 `MemoryFactInvalidation` 기반 conflict queue/resolve 경로 1차 완료
- 작가 결정이 memory 상태에 반영: 이전/신규 사실 채택은 기존 `resolveFactConflict` 경로로 1차 완료
- 나중에 보기: `MemoryFactInvalidation.reviewStatus`에 `deferred`로 영속화하고 active queue에서 제외

남은 범위:

- defer된 conflict를 다시 보는 필터/상태 표시
- 실제 작가 flow DOM/e2e에서 conflict warning 결정 흐름 검증

### Phase 5-3. timeline-aware query UI

작업:

- "몇 화 기준으로 답할지"를 UI에서 명확히 한다.

완료 기준:

- 현재 편집 중인 회차 기준 자동 설정: composer에 현재 챕터 order/title 기준 label 1차 표시 완료
- 사용자가 기준 회차 변경 가능: 기존 memory scope 토글로 현재 회차만/이전 회차 포함 전환 가능
- 미래 정보가 섞이면 경고: 기존 RAG safety `temporal_blocked` label 경로 유지

남은 범위:

- 기준 회차 자체를 현재 편집 회차가 아닌 다른 회차로 직접 선택하는 UI
- timeline scope 변경이 실제 RAG 응답에서 future leakage를 차단하는 end-to-end 검증

### Phase 5-4. writer workflow scenario test

작업:

- 실제 작가 작업 흐름을 DOM/e2e/service 테스트로 만든다.
- 단일 질문 flow가 아니라 반복 집필 flow를 다룬다.

기본 시나리오:

```text
작가가 12화를 쓰는 중
→ "여주가 약의 정체를 지금 알아도 돼?" 질문
→ 시스템이 12화 이전 근거만 검색
→ 18화 정보는 미래 정보로 경고
→ 근거 부족이면 확정 답변 차단
```

필수 writer workflow 6종:

1. 설정 질문
   - 작가가 현재 회차 기준으로 설정을 물어본다.
   - 근거 quote와 safety label이 표시되어야 한다.

2. 집필 중 충돌 자동 감지
   - 작가가 새 문단을 쓰는 순간 기존 설정과 충돌할 수 있는지 확인한다.
   - 확정 충돌이 아니면 "검토 필요"로 표시한다.

3. 과거 회차 수정
   - 작가가 12화를 고친다.
   - 18화 이후 memory/evidence가 stale 되는지 확인한다.
   - stale evidence는 repair 또는 review backlog로 이동한다.

4. 초안 폐기
   - 작가가 초안 설정을 폐기한다.
   - 폐기 source가 정사 답변에 섞이면 경고한다.

5. 인물명/별칭 변경
   - 인물 이름이나 별칭이 바뀐다.
   - 과거 evidence와 alias link가 깨지지 않아야 한다.

6. 회차 순서 변경
   - chapter order가 바뀐다.
   - temporal fact와 future leakage 판단이 재계산되어야 한다.

완료 기준:

- DOM/e2e 테스트 존재: DOM writer flow 테스트와 coverage anchor 1차 완료
- service 단위 테스트 존재: RAG safety, stale repair/backlog, temporal, alias, eval runner/scoring 테스트로 1차 완료
- 실제 UI label 검증: evidence-first, conflict decision, timeline basis label DOM 테스트 완료
- evidence quote 표시 검증: assistant 답변 evidence quote 선표시 DOM 테스트 완료
- stale repair/backlog 전이 검증: evidence link repair와 backlog report service 테스트 완료
- chapter order 변경 후 temporal 판단 검증: queryChapterOrder 기반 eval runner/scoring 테스트 완료

Coverage 문서:

- [Phase 5 Writer Workflow Coverage](phase-5-writer-workflow-coverage.md)

남은 범위:

- 실제 Electron E2E에서 원고 수정 -> stale 감지 -> rebuild -> RAG 질문까지 이어지는 긴 통합 시나리오

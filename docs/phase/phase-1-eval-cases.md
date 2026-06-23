## Phase 1. 작가 실전 시험지 확장

비유: 지금은 조수가 51문제짜리 모의고사를 만점 받은 상태다. 다음은 웹소설 작가가 실제로 틀리는 문제를 500문제, 1000문제로 늘리는 단계다.

목표:

- 현재 51개 eval case를 작가 flow 기반 대형 평가셋으로 확장한다.
- 검색이 잘 되는지뿐 아니라 "작가가 실제로 물어볼 법한 질문"인지 검증한다.

### Phase 1-1. 작가 pain point taxonomy 고정

작업:

- 웹소설 작가가 자주 겪는 문제를 고정 카테고리로 정의한다.
- 카테고리는 코드와 eval case naming에 그대로 반영한다.

카테고리:

- 인물/별칭/호칭 혼동
- 회차별 지식 상태
- 미래 정보 누수
- 초안/폐기 설정 오염
- 관계 방향 뒤집힘
- 미회수/회수 떡밥 혼동
- 생존/부상/위치/소속/능력/소유물 변화
- 감정선/동기 변화
- 세계관 규칙 충돌

완료 기준:

- taxonomy 문서화
- 각 카테고리별 최소 10개 seed case 생성 가능
- eval case name에 category가 안정적으로 들어감

### Phase 1-2. 실제 작가 질문형 eval case 생성

작업:

- "근거 찾아라" 같은 테스트 문장을 작가 질문형으로 바꾼다.
- 같은 원문 chunk에서 여러 종류의 질문을 생성한다.

예시:

```text
나중에 A가 이 사실을 알고 있다고 써도 돼?
이 장면에서 B가 C를 싫어하는 게 확정이야, 추정이야?
이 떡밥 아직 안 풀린 거 맞아?
이 설정은 폐기 초안에서 나온 거 아니야?
```

완료 기준:

- eval case 300개 이상
- P0 case 비율 최소 40%
- 모든 case가 gold evidence를 가진다.

### Phase 1-3. 회차 순서 기반 temporal eval 추가

작업:

- 질문 시점을 특정 회차로 고정한다.
- 해당 회차 이후 정보를 사용하면 실패로 처리한다.

예시:

```text
5화 기준으로, 주인공이 흑막의 정체를 알고 있다고 말해도 되는가?
12화 시점에서 여주가 약의 정체를 의심했다는 근거가 있는가?
```

완료 기준:

- queryChapterOrder 기반 eval 가능
- future fact 사용 시 P0 failure 발생
- 회차 순서가 없는 프로젝트는 "근거 부족"으로 처리

### Phase 1-4. 평가 데이터 품질 repair

작업:

- expected answer, gold quote, expected chunk id가 서로 어긋나는 case를 자동 탐지한다.
- quote가 HTML 태그/줄바꿈 때문에 정확히 안 맞아도 token overlap으로 검증한다.

완료 기준:

- stale/wrong eval evidence 자동 repair
- expected answer가 gold evidence로 뒷받침되지 않으면 실패 처리
- eval set 자체의 품질 리포트 생성

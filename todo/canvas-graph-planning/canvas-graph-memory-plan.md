# Canvas · Graph · RAG Memory Engine 발전 기획

## 1. 결론

Canvas와 Graph를 발전시키는 방향은 맞다. 단, Graph를 RAG Memory Engine과 별개의 기능으로 만들면 안 된다.

```text
원본 데이터
  ├─ Manuscript: 챕터·장면·본문
  ├─ World: 캐릭터·사건·용어·관계
  └─ Canvas: 작가가 직접 만든 배치·메모·구조

파생 데이터
  ├─ Memory: chunk·summary·embedding·mention·provenance
  └─ Graph projection: 노드·엣지·시간축·근거

제품 표면
  ├─ RAG 질문·검색
  ├─ Graph 탐색
  └─ Canvas 사고 공간
```

Memory Engine은 Graph의 근거 계층이고, Graph는 Memory와 World 데이터를 작가가 이해하고 수정하는 시각적 표면이다.

## 2. 핵심 설계 원칙

### 2.1 Graph와 Canvas의 책임을 분리한다

- Graph: 의미 데이터와 실제 관계를 표현한다.
- Canvas: 작가가 원하는 위치와 구조로 배치하는 사고 공간이다.
- Graph의 노드·관계는 DB와 파생 projection이 기준이다.
- Canvas의 위치·크기·그룹·메모는 사용자 편집 데이터다.
- Graph의 위치 변경과 Canvas의 자유 배치를 같은 데이터로 취급하지 않는다.

### 2.2 모든 자동화 결과에는 근거가 있어야 한다

AI 또는 Memory가 관계를 제안할 때는 다음 정보를 함께 보존한다.

```text
제안 내용
원본 엔티티
근거 챕터
근거 문장 또는 chunk
생성 시각
신뢰도
사용자 승인 여부
```

자동 제안은 `suggested` 상태로 시작하고, 사용자가 승인해야 canonical Graph 관계가 된다.

### 2.3 Graph Store는 원본 저장소가 아니다

Renderer의 `graphStore`는 depth, focus, hover, filter 같은 화면 상태만 관리한다.

실제 데이터의 기준은 다음 순서를 따른다.

```text
DB canonical data
→ Memory / Graph projection
→ IPC query
→ Renderer graph state
```

브라우저 localStorage에 Graph 전체를 저장하지 않는다. 저장해야 하는 것은 사용자 레이아웃과 저장된 뷰뿐이다.

## 3. 현재 구현에서 활용할 기반

현재 이미 다음 기반이 있다.

- React Flow 기반 Graph Surface
- Graph node Inspector
- depth, focus, hover, mode, chapter filter
- `relatedChapters`, `sourceTexts`, `relationships` 데이터 모델
- Canvas block, edge, file 구조
- Graph layout persistence
- World Graph IPC 조회
- `worldGraphDocument`의 canvas와 graph 정규화
- Graph plugin manifest와 template 검증
- Memory chunk, summary, embedding, narrative query 서비스

따라서 새 Graph 엔진을 만드는 것보다 기존 World·Memory·Canvas 흐름을 하나의 계약으로 연결하는 것이 우선이다.

## 4. 목표 사용자 경험

### 4.1 Graph에서 원고로 이동

```text
캐릭터 노드 선택
→ 관련 챕터 목록
→ 근거 문장 선택
→ Editor가 해당 위치로 이동
```

### 4.2 원고에서 Graph로 이동

```text
본문에서 캐릭터·사건 선택
→ Graph View 열기
→ 해당 노드 focus
→ 이웃 관계와 관련 장면 표시
```

### 4.3 Graph에서 관계의 근거 확인

노드와 엣지를 선택하면 다음을 표시한다.

- 관계 유형
- 연결된 두 엔티티
- 관계가 발견된 챕터
- 근거 문장
- 직접 입력된 관계인지, Memory가 추출한 관계인지
- 사용자 승인 상태

### 4.4 Canvas에서 작가가 구조화

작가는 Graph 노드를 Canvas에 배치하고 다음을 추가할 수 있다.

- 장면 카드
- 자유 메모
- 이미지
- 그룹 영역
- 시간축 구간
- 작가가 직접 만든 연결

Canvas에서 만든 메모와 연결은 World canonical relation과 구분한다. 필요하면 사용자가 나중에 “세계관 관계로 승격”할 수 있다.

## 5. 데이터 계층 설계

### 5.1 Canonical 계층

사용자가 명시적으로 작성하거나 승인한 데이터다.

- chapter
- scene
- character
- event
- term
- world entity
- entity relation
- approved plot relation
- approved memory fact

### 5.2 Derived 계층

원본에서 다시 생성할 수 있는 데이터다.

- text chunk
- chapter summary
- embedding
- entity mention
- inferred relation
- graph neighborhood projection
- unresolved thread candidate

Derived 데이터는 손상되어도 재생성할 수 있어야 하며, canonical 데이터와 같은 수준으로 취급하지 않는다.

### 5.3 Presentation 계층

사용자 화면 상태와 배치다.

- node position
- node size
- canvas block position
- viewport zoom
- saved graph view
- filter and depth
- collapsed group

## 6. Graph 모델 확장 방향

기존 GraphNode와 GraphRelationship에 다음 개념을 점진적으로 추가한다.

```ts
type GraphEvidence = {
  sourceType: "chapter" | "scene" | "memory-chunk" | "user";
  sourceId: string;
  quote?: string;
  startOffset?: number;
  endOffset?: number;
};

type GraphRelationStatus = "canonical" | "suggested" | "rejected";

type GraphRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  status: GraphRelationStatus;
  confidence?: number;
  evidence: GraphEvidence[];
};
```

처음부터 모든 타입을 도입하지 않는다. 1단계에서는 `evidence`와 `status`가 가장 중요하다.

## 7. RAG Memory와 Graph의 연결

### 7.1 Memory가 Graph에 제공할 것

- 엔티티 mention
- 챕터별 등장 정보
- 근거 chunk
- 챕터 요약
- 사건 후보
- 관계 후보
- 시간 표현 후보
- unresolved thread 후보

### 7.2 Graph가 RAG에 제공할 것

- 현재 선택된 노드
- 이웃 노드
- 관계 유형
- 관련 챕터 집합
- Canvas에서 선택한 장면 묶음
- 사용자가 고정한 컨텍스트

RAG 질문은 단순 벡터 검색만 하지 않고 Graph scope를 함께 사용할 수 있다.

```text
“카엘의 배신 복선을 정리해줘”
→ 카엘 노드
→ 관련 관계와 사건
→ 관련 챕터·chunk
→ 근거 기반 답변
```

## 8. 단계별 개발 계획

### Phase 0 — 계약과 경계 정리

- Graph와 Canvas 데이터의 소유권 분리
- canonical / derived / presentation 구분
- Graph evidence 타입 정의
- Graph 전체를 graphStore에 저장하지 않는 정책 확정
- 현재 AI Side Panel의 하드코딩 데이터 제거 계획 수립

완료 기준: 같은 노드를 Graph와 Canvas에서 사용해도 관계와 위치가 충돌하지 않는다.

### Phase 1 — Graph 읽기 경험 완성

- Graph node → chapter 이동
- Graph edge → 근거 문장 표시
- chapter/entity → Graph focus
- Inspector에서 related chapters와 source texts 표시
- loading, empty, stale projection 상태 표시

완료 기준: 작가가 Graph에서 본 관계를 실제 원고까지 한 번에 확인할 수 있다.

### Phase 2 — Canvas 사고 공간 완성

- Graph node를 Canvas에 배치
- Canvas 전용 memo와 scene card
- 그룹과 색상 태그
- layout autosave
- saved view
- 선택된 Canvas 영역을 RAG context로 전달

완료 기준: Canvas를 단순한 그래프 화면이 아니라 집필용 작업판으로 사용할 수 있다.

### Phase 3 — 시간축과 플롯 흐름

- 챕터 순서 기반 timeline
- 사건의 이야기 내부 시간
- 장면 간 인과 연결
- 인물 등장·퇴장 흐름
- 관계 변화 추적
- timeline과 network view 전환

완료 기준: 관계뿐 아니라 이야기의 흐름과 변화까지 볼 수 있다.

### Phase 4 — Memory 기반 분석

- 미회수 복선 후보
- 원고에 등장하지 않는 설정
- 근거 없는 관계
- 설정 충돌 후보
- 인물별 관계 변화
- 특정 사건의 원인·결과 후보

완료 기준: Graph가 작가에게 새로운 문제를 발견해주되, 모든 결과에 근거가 표시된다.

### Phase 5 — 승인형 AI 편집

- 관계 추가 제안
- 사건·인물 자동 연결 제안
- Canvas에서 장면 구조 제안
- Graph scope 기반 RAG 질의
- 승인·거부·나중에 검토 상태
- 변경 전후 diff와 undo

완료 기준: AI가 데이터를 독단적으로 변경하지 않고, 작가의 승인 아래 구조화를 보조한다.

## 9. 우선순위 판단

RAG Memory Engine을 완성할 때까지 Graph를 멈출 필요는 없다. 다음 두 트랙으로 병렬 진행한다.

### Graph 제품 트랙

- 현재 World Graph 렌더링 개선
- 노드 Inspector
- 원고 양방향 이동
- layout persistence
- Canvas 배치와 saved view

### Memory 기반 트랙

- chunk·summary·embedding 안정성
- provenance 보존
- mention 추출
- graph projection
- 검색 결과의 근거 품질

단, 다음 기능은 provenance가 준비되기 전까지 만들지 않는다.

- 자동 관계 확정
- 설정 충돌 자동 수정
- AI의 Graph 직접 변경
- 근거 없는 플롯 분석

## 10. 하지 않을 것

- 처음부터 범용 knowledge graph 플랫폼 만들기
- 복잡한 그래프 DB 도입
- 실시간 협업 기능
- 모든 노드에 AI 요약을 자동 생성하기
- 물리 기반 layout을 핵심 기능으로 삼기
- 사용자 승인 없는 관계 자동 저장
- Graph와 Canvas를 같은 저장 모델로 합치기

## 11. 첫 번째 실제 작업 단위

가장 작은 의미 있는 첫 작업은 다음이다.

```text
Graph node 선택
→ 관련 챕터·근거 chunk 조회
→ Inspector 표시
→ “원고에서 보기” 클릭
→ Editor 위치 이동
```

이 작업은 Graph, Memory, Manuscript를 모두 연결하지만 새로운 대규모 인프라를 요구하지 않는다. 이 흐름이 안정화되면 이후 복선·타임라인·AI 제안 기능의 기반으로 재사용할 수 있다.

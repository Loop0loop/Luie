# Product Feature Roadmap — SSOT

> 상태: **아이디어 브레인스토밍**
> 기준일: 2026-09-01
> 상위 계획: [Narrative Memory · RAG 실행 계획](./narrative-memory-rag-plan.md)

## 목표

장편 집필자를 위한 **맥락 인식(Context-Aware) 집필 도구**로서 Luie가 제공할 핵심 기능을 정의한다. 모든 기능은 두 축으로 평가한다:

1. **작가의 고통을 줄여주는가** — 집필 중 발생하는 맥락 붕괴, 설정 충돌, 구조 파악 실패를 방지
2. **Luie만의 차별점인가** — 범용 에디터(Scrivener, Notion, Obsidian)가 제공하지 못하는 가치

## 현재 상태

| 기능                          | 상태       | 의존성                         |
| ----------------------------- | ---------- | ------------------------------ |
| World Building Graph          | 완료       | -                              |
| Canvas (Flow Map + Graph)     | 완료       | World Building Graph           |
| Wiki / Character Detail View  | 완료       | Character Store                |
| 4가지 레이아웃 모드            | 완료       | MainLayout                     |
| Canvas Binder / Inspector     | 완료       | CanvasViewStore                |
| Memory Engine (RAG)           | 실행 중    | [Narrative Memory Plan](./narrative-memory-rag-plan.md) |
| 맥락 충돌 감지                 | 미구현     | Memory Engine                  |
| 관계 강도 시각화               | 미구현     | World Building Graph           |
| POV 시점 추적                  | 미구현     | Chapter Store + Graph          |
| 타임라인 갭 분석               | 미구현     | Memory Engine + Graph          |
| 글쓰기 세션 요약               | 미구현     | Editor Change Events           |
| Canvas 미니맵 + 진행도         | 미구현     | Canvas                         |
| 집필 생산성 목표 (게임화)       | 미구현     | Editor Stats                   |
| 플롯 시뮬레이터               | 미구현     | Memory Engine + LLM            |

## 실행 순서

### P0 — Memory Engine 의존 기능 (Memory Engine 완료 후 즉시)

#### P0-1. 맥락 충돌 감지 (Context Conflict Detector)

**대상:**
- `src/renderer/src/features/editor/`
- `src/renderer/src/features/research/stores/worldBuildingStore.ts`

**작업:**
1. world building store의 모든 캐릭터/설정 속성을 `Map<entityId, Map<key, value>>`로 정규화
2. 현재 에디터 텍스트에서 `{캐릭터명} + {속성}` 패턴 추출 (Regex 기반, LLM 불필요)
3. 추출값이 store 값과 불일치 시 **non-blocking inline toast**로 알림
4. 사용자가 "무시" / "설정값으로 교체" / "텍스트값으로 설정 갱신" 중 선택 가능
5. 충돌 이력 저장으로 반복 알림 방지

**합격 기준:**
- "3장 드루이드 눈 파란색 / 12장 갈색" 케이스 감지
- 알림은 작성 흐름을 방해하지 않음 (no modal, no focus steal)
- false positive 비율 10% 미만 (exact key-value 비교 기반)

---

#### P0-2. 관계 강도 맵 (Relation Strength Visualization)

**대상:**
- `src/renderer/src/features/canvas/utils/graphSurfaceData.ts`
- `src/renderer/src/features/canvas/components/graph/graphSurfaceParts/useGraphDataFiltering.ts`
- `src/renderer/src/features/canvas/components/viewport/edges/RelationEdge.tsx`

**작업:**
1. graphData relation에 `mentionCount: number` 메타데이터 추가
2. `buildGraphSurfaceData`가 mentionCount를 edge data에 포함
3. `useGraphDataFiltering`에서 mentionCount → `strength = clamp(mentionCount / maxMentions, 0.2, 2.5)` 자동 계산
4. `RelationEdge`가 strength에 비례해 strokeWidth + opacity 조정
5. mentionCount ≤ 1 edge는 dashed 스타일로 "희미한 관계" 표현

**합격 기준:**
- 8개 챕터 언급 관계 edge와 1회 언급 edge의 시각적 차이가 명확
- mentionCount 0 edge도 렌더링 유지 (관계 자체는 존재)
- layout 계산의 기존 edge weight와 충돌 없음

---

### P1 — Memory Engine 없이 구현 가능

#### P1-1. Canvas 미니맵 + 진행도

**대상:**
- `src/renderer/src/features/canvas/components/viewport/`
- `src/renderer/src/features/manuscript/stores/chapterStore.ts`

**작업:**
1. ReactFlow `useReactFlow()`의 `getViewport()` + `fitView()`로 현재 뷰포트 영역 추적
2. Canvas 우측 하단에 160×100px 미니맵 오버레이 (전체 노드 bounding box 위에 현재 뷰포트 사각형 표시)
3. 현재 활성 챕터에 연결된 노드가 있으면 미니맵 위에 마커로 강조
4. 하단 CanvasStatusBar에 "챕터 N/M" 진행도 추가

**합격 기준:**
- 미니맵 drag → Canvas 반응 100ms 이내
- 활성 챕터 마커가 노드 없을 때도 "챕터 N에 연결된 노드 없음" 표시

---

#### P1-2. 글쓰기 세션 요약

**대상:**
- 신규: `src/renderer/src/features/editor/services/sessionSummary.ts`
- `src/renderer/src/features/editor/stores/editorStore.ts`

**작업:**
1. 에디터 change 이벤트를 세션 단위 aggregate: 추가 문자 수, 변경 챕터, world graph 추가 노드/에지
2. 세션 종료(앱 종료 또는 일정 시간 idle) 시 요약 토스트 표시
3. 주간/월간 집필 통계를 CanvasStatusBar 또는 별도 dashboard 패널로 제공
4. 통계는 `localStorage`에 저장, 프로젝트별 분리

**합격 기준:**
- 앱 재시작 후에도 이전 세션 통계 유지
- world graph 변경량 + 텍스트 변경량을 하나의 요약에 동시 표시

---

#### P1-3. 집필 생산성 목표

**대상:**
- 신규: `src/renderer/src/features/editor/stores/writingGoalStore.ts`

**작업:**
1. 사용자가 "오늘 목표: 500자", "이번 주 목표: 캐릭터 2명" 등 설정
2. writingGoalStore가 editor change + world building store 변경을 구독해 진척도 계산
3. 50% / 100% 달성 시 non-intrusive toast로 알림
4. 실패(목표 미달)는 알리지 않음 — 부정적 피드백 의도적 배제

**합격 기준:**
- 목표 설정/해제가 2클릭 이내
- 앱 재시작 시 당일/당주 목표 유지
- toast는 편집 영역을 가리지 않음

---

---

### P2 — 장기 비전 (Memory Engine + LLM 완성 후)

#### P2-1. POV 시점 캐릭터 추적

**대상:**
- `src/renderer/src/features/manuscript/stores/chapterStore.ts`
- `src/renderer/src/features/research/components/wiki/`

**작업:**
1. 각 챕터에 `povCharacterId?: string` 메타데이터 필드 추가
2. 에디터 toolbar에 "시점 캐릭터" 선택기 추가
3. 챕터 목록(Sidebar)에 시점 캐릭터 컬러 마커 표시
4. 작품 전체 POV 분포를 파이 차트로 제공 (Wiki → 통계 탭)

**합격 기준:**
- "드루이드 시점 40%, 마법사 시점 35%, 치우침" 경고 표시
- 시점 캐릭터 변경 시 에디터 입력 포커스 유지

---

#### P2-2. 타임라인 갭 분석

**대상:**
- `src/renderer/src/features/research/stores/worldBuildingStore.ts`
- 신규: `timelineAnalyzer.ts`

**작업:**
1. world building 이벤트 타임라인을 시간 순서로 정렬
2. 각 이벤트가 실제 챕터에 등장하는지 검증 (graph node → chapter 연결)
3. 두 이벤트 사이에 반드시 일어났어야 할 일(설정에서 derive)이 누락되었는지 분석
4. 누락된 장면을 Canvas에서 dashed node로 시각화 제안

**합격 기준:**
- "드루이드가 검을 얻는 사건이 5장~7장 사이 필요" 감지
- false positive 제안은 "무시" 가능하며 반복되지 않음

---

#### P2-3. 플롯 시뮬레이터

**대상:**
- Memory Engine + world graph + LLM inference pipeline

**작업:**
1. 사용자가 Canvas에서 "what-if" 이벤트 노드 추가
2. LLM이 world graph의 관계/동기/상태 기반으로 연결 캐릭터 반응 시뮬레이션
3. 시뮬레이션 결과가 기존 챕터와 모순되는 부분 하이라이트
4. 결과는 Canvas에 별도 레이어로 오버레이 (기존 graph 오염 방지)

**합격 기준:**
- 시뮬레이션 결과가 기존 챕터 내용을 절대 변경하지 않음
- 시뮬레이션 레이어 토글 가능, 앱 재시작 시 기본 숨김

---

## 공통 검증 게이트

| 게이트   | 필수 조건                                                                     |
| -------- | ----------------------------------------------------------------------------- |
| 성능     | editor typing latency에 영향 없음 (모든 분석은 idle/debounce/worker에서 실행)  |
| 비침투   | 분석 결과는 non-blocking toast/인라인 배지로 제공, modal 사용 금지              |
| 오프라인 | 모든 기능이 LLM/서버 없이도 기본 동작 (LLM 필요 기능은 degrade gracefully)      |
| SSOT     | 구현 완료 후 이 문서에 상태 + 증거 업데이트                                     |
| 정본보존 | 어떤 기능도 원고 텍스트나 world graph 데이터를 자동 변경하지 않음               |

## 의도적으로 하지 않는 것

- 실시간 Grammarly 스타일 맞춤법 검사
- AI가 원고 내용을 생성/대체하는 기능
- 협업/실시간 동시 편집
- 클라우드 전용 기능 (local-first 원칙 유지)
- "오늘의 글쓰기 운세" 등 비생산적 게임화

## 다음 작업

이 문서는 아이디어 브레인스토밍 상태다. Memory Engine(P0) 완료 후 **P0-1 맥락 충돌 감지**를 첫 구현 대상으로 검토한다. P1 항목은 Memory Engine 의존성이 없으므로 병렬 구현 가능하다.
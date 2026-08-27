## 파생 작업 안정화

- [x] 삭제된 챕터를 가리키는 `rebuild_embedding` 작업을 종료 처리한다. chunk가 없는 작업은 `skipped`로 전환해 `embeddingQueued: 1`, `embeddingProcessed: 0` 반복을 막는다.
- [x] `sqlite-vec`을 main/utility 번들에서 외부화해 플랫폼별 확장 바이너리가 정상 로드되도록 한다. 개발 번들에서 확장 모듈이 외부 import로 유지되는 것을 확인했다.

## ox-alpha 분석 의견 (읽기 전용 조사 기반)

### 버그 우선 3종 (사용자 체감 손상)
1. 원고 DnD 미동작 — 드래그 source의 data.type과 드롭 핸들러 기대 type 불일치 의심 (`DraggableItem` vs `EditorDropZones`). 재현 경로 필요.
2. research ↔ 에디터 툴바 겹침 — 툴바 z-40(`GoogleDocsEditorColumn:68`)이라 뷰 전환 시 겹침. canvas 모드처럼 뷰 타입별 조건부 렌더(hide) 필요.
3. research 링크 클릭 무반응 — `useSmartLinkClickHandler`가 밑줄 mark + 이름 퍼지 매칭 실패 시 조용히 false 반환. store 미로딩/이름 불일치 케이스 로깅 추가 후 원인 특정.

### 스크리브너
- 직각(스퀘어) 스타일 동의 — docs와 시각 구분 + 도구 메타포에 맞음.
- 인스펙터 애니메이션 끊김 — 코드에 애니메이션은 있으나 패널 mount/unmount 순간 레이아웃 점프 의심. docs sidebar 패턴과 동일 튜닝.
- 등장인물→원고 복귀 시 툴바 깜빡/우측 붙음 — sharedEditor remount(key) + editor=null 구간 때문. 인스턴스 캐시 또는 툴바 유지 렌더링.
- React hooks order 경고(EntityDetailView) — 정작 본체는 hooks-safe(모든 훅이 early return 이전). Wiki/Event/Faction DetailView 부모의 조건부 렌더링이 발원지 의심.

### UX 방향
- 스크리브너: 개념(binder-본문-inspector, DnD 편성)은 차용, 세부 UI/UX는 Luie 디자인 시스템으로 재해석. 기존 툴의 불편을 고치는 게 이 레이아웃의 존재 이유.
- 1화면 1컴포넌트 아니오 — MainLayout은 이미 panels[]+DnD로 복수 패널 지원. 스크리브너 확장 시 "inspector 안에 서브탭"이 "inspector를 panels로 통합"보다 현실적.

### 실행 순서 제안
1. 버그 3종 → 2. 소형 스타일 일괄(스냅샷/휴지통/스크랩 rounded·색상, diff 요약, scrivener 직각) → 3. 구조 작업(좌측 menuBar, windowBar 제거, sidebar 상승) → 4. 인스펙터 애니메이션·hooks 경고·툴바 깜빡임

### 작업 공통 주의
- workspace 수정 시 반드시 **GoogleDocsLayout에만 영향**이 가는지 확인할 것. 레이아웃은 4개(default/docs/scrivener/editor)이고 관리 주체는 workspace다.
- 완료: A4 페이지 세로 overflow 수정(GoogleDocsEditorColumn shrink-0), docs 스냅샷 diff 패널 덮어쓰기 전환 + 좌측 중앙 돌아가기 토글.
- 완료: docs 레이아웃 우측 패널 min/max 조율 — research(420/780)/AI(480/900)/버전기록-snapshot(380/860) docs 전용 config 신설(layoutSizing.ts). **`collapsible` 제거** → 드래그로 min 아래로 내려가 collapse(0px) 되는 것 방지, X 닫기로만 닫힘. 최초엔 `onResize`→`closeRightPanel` sync를 시도했으나 드래그 도중 패널 unmount가 `setPointerCapture`/`toFixed(undefined)` 크래시를 유발해서 제거. 다른 3개 레이아웃 editor.panel/scrivener/canvas에는 영향 없음.


  1. 현대 로맨스 S에서 사용할 최소 gold 계약 보강
  2. chapter/scene/event/evidence 정합성 검증
  3. relationship/knowledge 전용 invalid 테스트
  4. review 충돌 및 stage-target 검증
  5. 4.2 디렉터리 구조 생성
  6. 원고가 아닌 현대 로맨스 blueprint 작성
  7. blueprint 사람 검수
  8. 통과한 구조에서 chapter/scene plan 작성
  9. 그다음에만 20화 이하 원고 생성
  10. evidence alignment와 query/gold 작성
  11. manuscript/query 사람 검수
  12. Retrieval → Oracle → End-to-end 평가
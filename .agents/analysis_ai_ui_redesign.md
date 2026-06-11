# 분석 UI → AI 리퀴드 리디자인 설계

## 목표
원고 분석 패널을 프롬프트 중심 AI 챗으로 전환. ChatGPT/Gemini 스타일 liquid.

## 결정 사항 (확정)
1. 디버그 정보(Req/Res/Backend/Model/Sidecar) → **상태 dot + 팝오버**. 상시 박스 제거.
2. 서사 요약 → **사이드 드로어/토글**. 상단 고정 제거.
3. liquid → **비주얼 + 인터랙션 모두**.

## 두 가지 뷰
- **고정(fixView)**: 우측 패널 도킹. 헤더 슬림, 본문 = 챗 스트림, 하단 = 입력 캡슐.
- **플로팅(floatingView)**: 드래그/리사이즈 카드. spring 전환. 미니 모드 → FAB.

## 레이아웃 구성

### 빈 상태 (대화 0개)
```
┌──────────────────────────────┐
│  RESEARCH              ⤢  ✕  │
│                              │
│        [봇 글래스 아이콘]       │
│     "원고에 대해 물어보세요"      │
│      context: 챕터 N           │
│                              │
│   ┌────────────────────────┐ │
│   │  ⊹ 무엇이든 물어보세요 ↑ │ │  ← 중앙 큰 입력창
│   └────────────────────────┘ │
│   [요약] [인물관계] [설정충돌]   │  ← 추천 프롬프트 칩
└──────────────────────────────┘
```

### 대화 상태
- 입력창 → 하단 고정으로 liquid 이동(layout transition).
- 메시지 스트림: assistant fade-in + 미세 blur, 스트리밍 커서 유지.
- 입력 캡슐 좌측: `⊹`(서사 요약 드로어 토글), `+`(첨부/스코프) — 라벨/툴팁 명확화.
- 입력 캡슐 우측: 상태 dot(런타임) + 전송 ↑ / 중단 ◼.

## 컴포넌트 변경 매핑

| 기존 | 변경 |
|---|---|
| `RuntimeStatusPanel` (상시 박스) | `RuntimeStatusDot` + `RuntimeStatusPopover` 신규. 입력 캡슐 우측 dot, 클릭 시 팝오버 |
| `NarrativeSummaryStatusPanel` (상단 고정) | 그대로 재사용하되 `SummaryDrawer`로 래핑. 입력창 `⊹` 토글로 슬라이드 인 |
| `MessageList` 빈 분기 | `EmptyState` 신규 분리: 중앙 입력 + 추천 칩 |
| raw 에러 텍스트 | `normalizeChatError(code)` → i18n 메시지 + 재시도 버튼 |
| `FloatingWrapper` 드래그/리사이즈 | 유지. 전환에 spring(framer-motion 또는 CSS) 추가 |
| 입력 캡슐 인라인(AnalysisSection) | `PromptComposer` 컴포넌트로 추출 (빈/대화 상태 공용) |

## 신규 파일 (예정)
- `analysisSection/EmptyState.tsx`
- `analysisSection/PromptComposer.tsx`
- `analysisSection/RuntimeStatusDot.tsx` (+ Popover)
- `analysisSection/SummaryDrawer.tsx` (NarrativeSummaryStatusPanel 래퍼)
- `analysisSection/chatErrors.ts` (에러 정규화)

## liquid 디테일
- 글래스: `backdrop-blur-xl` + 반투명 surface (기존 톤 유지).
- 입력창 포커스: width/height ease 확장.
- 메시지 진입: `fadeIn` + translateY(4px).
- float↔fix: spring scale/opacity.
- 추천 칩: hover 시 미세 lift.

## 범위 밖 (이번 작업 제외)
- RAG 백엔드 로직 변경 없음 (UI/UX 전용).
- 메모리 리뷰 패널들(Entity/Fact/Episode 등)은 드로어 통합 후속 검토.

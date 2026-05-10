# RAG 기반 캐릭터 스탯 자동 생성

## 개요

캐릭터 위키에 작성된 텍스트를 컨텍스트로 활용하여, GPT-4o-mini가 레이더 차트의 각 축 값을 자동으로 0–10 범위로 평가합니다.
작가가 내용을 많이 작성할수록 더 정확한 평가가 이루어집니다.

---

## RAG 패턴 설명

```
[Retrieval]                    [Augmented Generation]
캐릭터 위키 섹션들  ──────────►  GPT-4o-mini  ──────────►  axes: [{label, value}]
(개요, 성격, 배경…)              (스코어링 프롬프트)
```

### Retrieval (검색/수집)

전통적인 RAG는 벡터 DB로 관련 청크를 검색하지만,  
캐릭터 위키는 문서 크기가 작고 문맥이 하나의 캐릭터에 국한되므로 **전체 섹션을 직접 프롬프트에 주입**합니다.

수집되는 섹션:

| 필드        | 최대 길이 | 설명           |
|------------|---------|--------------|
| tagline    | 무제한    | 한 줄 소개       |
| roles      | 무제한    | 역할 태그        |
| keywords   | 무제한    | 키워드 태그       |
| overview   | 400자   | 개요 섹션 내용     |
| personality| 500자   | 성격/동기 섹션 내용  |
| background | 500자   | 배경/역사 섹션 내용  |
| appearance | 300자   | 외모/인상 섹션 내용  |
| relations  | 300자   | 관계 섹션 내용     |
| notes      | 200자   | 메모 섹션 내용     |

> 길이 제한은 OpenAI 토큰 비용 관리를 위한 것이며, 추후 조정 가능합니다.

### Generation (생성)

- 모델: `gpt-4o-mini`
- Temperature: `0.3` (낮은 값 → 일관된 숫자 평가)
- `response_format: { type: "json_object" }` 사용 → 파싱 신뢰성 확보
- 응답 형식: `{ "axes": [{ "label": "항목명", "value": 0~10 }] }`

---

## 코드 위치

| 레이어       | 파일                                                                                          | 역할                            |
|------------|---------------------------------------------------------------------------------------------|---------------------------------|
| Main       | `src/main/services/features/characterAI/characterAIService.ts`                              | `generateCharacterStats()` 핵심 로직 |
| IPC 핸들러   | `src/main/handler/world/ipcCharacterAIHandlers.ts`                                          | Zod 스키마 검증 + 라우팅            |
| IPC 채널    | `src/shared/ipc/channels.ts` → `CHARACTER_GENERATE_STATS`                                   | 채널 이름 상수                     |
| API 타입    | `src/shared/api/index.ts` → `character.generateStats`                                       | 렌더러 API 타입 정의                |
| Preload    | `src/preload/api/projectApi.ts`                                                             | `safeInvoke` 브릿지               |
| Timeout    | `src/preload/index.ts` → `LONG_TIMEOUT_CHANNELS`                                            | 60초 타임아웃 (AI 응답 대기)          |
| 훅          | `src/renderer/src/features/research/components/wiki/hooks/useCharacterAI.ts`               | `generateStats()` 상태 관리         |
| UI         | `src/renderer/src/features/research/components/wiki/CharacterVisualPanel.tsx`              | "AI 분석" 버튼 + 에러 표시           |

---

## 데이터 흐름

```
CharacterVisualPanel
  └─ buildStatsInput()          // 모든 위키 섹션 + 현재 axes 수집
       └─ generateStats(input, setRadarAxes)
            └─ api.character.generateStats(input)   [Renderer → IPC]
                 └─ safeInvoke("character:generate-stats", input)   [Preload]
                      └─ registerIpcHandlers → generateCharacterStats(input)   [Main]
                           ├─ buildStatsContext()    // 위키 섹션 텍스트 조립 (Retrieval)
                           ├─ fetch OpenAI GPT-4o-mini   (Augmented Generation)
                           └─ 응답 파싱 → axes 값 병합 (원본 label 순서 유지)
```

---

## 축 값 병합 규칙

```typescript
// 원본 axes의 label 순서와 구조를 유지하면서 value만 갱신
return axes.map((axis) => {
  const scored = parsed.axes.find((s) => s.label === axis.label);
  if (!scored) return axis;                                   // AI가 해당 축을 평가하지 않으면 유지
  return { ...axis, value: clamp(0, 10, Math.round(scored.value)) };
});
```

- 사용자가 임의로 추가/변경한 축 이름도 그대로 보존됩니다
- AI가 평가하지 못한 축은 기존 값 유지
- 소수점 반올림 및 0–10 범위 강제 적용

---

## 오류 처리

| 에러 코드                     | 원인                  | 사용자 메시지                              |
|-----------------------------|--------------------|----------------------------------------|
| `STATS_GENERATION_RATE_LIMIT`  | OpenAI 429         | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."     |
| `STATS_GENERATION_UNAUTHORIZED` | API 키 오류          | "API 키가 유효하지 않습니다."                 |
| `STATS_GENERATION_SERVER_ERROR` | OpenAI 5xx         | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."   |
| `STATS_GENERATION_EMPTY_RESPONSE` | 빈 응답             | "스탯 분석에 실패했습니다"                    |
| `STATS_GENERATION_INVALID_FORMAT` | JSON 파싱 실패       | "스탯 분석에 실패했습니다"                    |
| `OPENAI_API_KEY not configured` | env 미설정          | (IPC 레벨에서 처리됨)                       |

에러 메시지 변환 로직: `useCharacterAI.ts` → `toUserMessage()`

---

## 향후 확장 포인트

1. **선택적 검색 (Selective Retrieval)**: 각 축의 의미와 관련도가 높은 섹션만 선택적으로 포함
2. **챕터 내용 활용**: 작성된 원고의 해당 캐릭터 등장 장면을 컨텍스트에 추가 → 더 정확한 평가
3. **임베딩 기반 유사도 검색**: 위키 내용이 매우 길어질 경우 벡터 임베딩으로 관련 청크만 선택
4. **평가 이유 설명**: `reason` 필드를 추가해 각 축 값의 근거를 UI에 표시
5. **히스토리**: 스탯 변경 이력을 저장해 캐릭터 성장 추적

# Gemini API 할당량 에러 해결 가이드

## 🚨 발생한 에러
```
error: 429 - QUOTA_EXCEEDED
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
```

## ✅ 수정 사항

### 1. 에러 처리 개선
**파일**: `src/main/services/features/manuscriptAnalysisService.ts`
- 429 에러 감지 → `QUOTA_EXCEEDED` 코드로 처리
- 사용자 친화적 에러 메시지: "Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요."

**파일**: `src/renderer/src/stores/analysisStore.ts`
- `QUOTA_EXCEEDED` 에러 타입별 메시지 처리

### 2. 모델 변경
**변경 전**: `gemini-2.0-flash` (할당량 부족)
**변경 후**: `gemini-2.0-flash-exp` (실험 버전, 더 높은 할당량)

### 3. API 타입 추가
**파일**: `src/renderer/src/services/api/index.ts`
- `analysis` API 타입 추가 (TypeScript 에러 해결)

### 4. 환경 변수 예시 추가
**파일**: `.env.example`
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

---

## 🔧 해결 방법

### Option 1: 무료 할당량 대기
- **대기 시간**: 5초~1분 (에러 메시지 참고)
- 자동으로 할당량 복구됨

### Option 2: 모델 변경
`.env` 파일 수정:
```bash
GEMINI_MODEL=gemini-2.0-flash-exp  # 실험 버전 (권장)
# 또는
GEMINI_MODEL=gemini-1.5-flash      # 안정 버전
```

### Option 3: Gemini API 유료 플랜 업그레이드
- [Google AI Studio](https://aistudio.google.com/) 방문
- **Paid Plan** 활성화
- 할당량 대폭 증가

---

## 📊 Gemini 모델 비교

| 모델 | 무료 할당량 | 응답 속도 | 추천 |
|------|------------|----------|------|
| `gemini-2.0-flash-exp` | 높음 | 매우 빠름 | ⭐⭐⭐ |
| `gemini-1.5-flash` | 중간 | 빠름 | ⭐⭐ |
| `gemini-1.5-pro` | 낮음 | 보통 | ⭐ (품질 우선) |

---

## 🎯 현재 적용된 변경사항

1. ✅ 기본 모델: `gemini-2.0-flash-exp`
2. ✅ 429 에러 감지 및 사용자 안내
3. ✅ API 타입 완전 추가
4. ✅ TypeScript/ESLint 에러 0개

**다시 시도하려면**: 앱 재시작 후 "분석 시작" 버튼 클릭

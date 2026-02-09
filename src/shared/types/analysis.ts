/**
 * 원고 분석 관련 타입 정의
 * Manuscript Analysis Types
 */

/**
 * 분석 요청 타입
 */
export interface AnalysisRequest {
  chapterId: string;
  projectId: string;
}

/**
 * 분석 아이템 타입
 * - reaction: 독자 반응 예상
 * - suggestion: 모순점 및 개선 제안
 * - intro: 분석 시작 인사
 * - outro: 분석 종료 멘트
 */
export interface AnalysisItem {
  id: string;
  type: "reaction" | "suggestion" | "intro" | "outro";
  content: string;
  contextId?: string; // 원고 텍스트와 연결하기 위한 ID
  quote?: string; // 인용 텍스트
}

/**
 * 분석 컨텍스트 (Gemini에 전달)
 */
export interface AnalysisContext {
  characters: Array<{
    name: string;
    description: string;
  }>;
  terms: Array<{
    term: string;
    definition: string;
    category: string;
  }>;
  manuscript: {
    title: string;
    content: string;
    nounPhrases: string[]; // 추출된 명사구
  };
}

/**
 * 스트리밍 응답 타입
 */
export interface AnalysisStreamChunk {
  item: AnalysisItem;
  done: boolean; // 스트리밍 완료 여부
}

/**
 * 분석 결과 타입 (최종)
 */
export interface AnalysisResult {
  items: AnalysisItem[];
  metadata: {
    chapterId: string;
    projectId: string;
    analyzedAt: Date;
    totalItems: number;
  };
}

/**
 * 분석 에러 타입
 */
export interface AnalysisError {
  code: "API_KEY_MISSING" | "NETWORK_ERROR" | "QUOTA_EXCEEDED" | "INVALID_REQUEST" | "UNKNOWN";
  message: string;
  details?: string;
}

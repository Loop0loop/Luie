export type StructuredAttributes = Record<string, unknown>;

// NOTE: 갤러리 카드는 렌더마다 attributes 문자열을 JSON.parse해왔다(항목 수 × 렌더 횟수).
// 문자열 → 파싱 결과는 불변 관계라 소규모 FIFO 캐시로 메인스레드 파싱을 상수 비용으로
// 만든다. 반환 객체를 호출부가 변형하지 않는다는 계약 하에 동일 참조를 재사용한다.
const PARSE_CACHE_LIMIT = 500;
const parseCache = new Map<string, StructuredAttributes>();

function parseUncached(value: string): StructuredAttributes {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as StructuredAttributes;
    }
    return {};
  } catch {
    return {};
  }
}

export function parseStructuredAttributes(value: unknown): StructuredAttributes {
  if (typeof value === "string") {
    const cached = parseCache.get(value);
    if (cached) {
      return cached;
    }
    const parsed = parseUncached(value);
    if (parseCache.size >= PARSE_CACHE_LIMIT) {
      const oldest = parseCache.keys().next().value;
      if (oldest !== undefined) {
        parseCache.delete(oldest);
      }
    }
    parseCache.set(value, parsed);
    return parsed;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as StructuredAttributes;
  }

  return {};
}

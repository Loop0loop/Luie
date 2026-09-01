/**
 * 상세 뷰(캐릭터/사건/세력)의 표시 선호 영속화.
 *
 * 다루는 선호: wiki ↔ document 표시 모드, 프로필 요약(Infobox) 패널 열림 상태.
 *
 * WHY 별도 모듈인가: 같은 로직이 `WikiDetailView`와 `EntityDetailView`에 중복돼 있었고,
 * 두 곳 모두 **렌더 경로에서** `localStorage`를 try/catch 없이 호출했다
 * (`EntityDetailView`는 `useState` 초기화 함수 안, `WikiDetailView`는 렌더 본문).
 * localStorage는 프라이빗 브라우징·용량 초과·비활성 환경에서 throw하므로, 그 예외가
 * 에러 바운더리까지 올라가 상세 뷰 전체가 사라진다.
 */

export type WikiViewMode = "wiki" | "document";

const DEFAULT_VIEW_MODE: WikiViewMode = "wiki";

/**
 * 키 버전. 저장 형태를 바꿔야 할 때 이 값을 올리고 legacy 폴백을 갱신한다.
 *
 * WHY 버전을 붙이면서 legacy도 읽는가: 버전만 도입하면 기존 사용자의 선택이 전부
 * 초기화된다. 폴백을 두면 사용자 입장에서 비용이 0이다.
 */
const KEY_VERSION = "v1";

const buildKey = (prefix: string, id: string | undefined, version: string | null): string => {
  const versioned = version ? `${prefix}:${version}` : prefix;
  return id ? `${versioned}:${id}` : versioned;
};

/**
 * NOTE: id가 없는 경우는 '선택된 엔티티 없음' 상태이고 그 화면은 표시 모드를 쓰지 않는다.
 * 그래서 이 슬롯은 legacy 폴백 대상에서 제외한다 — 과거 두 뷰가 서로 다른 키 모양
 * (`prefix:` vs `prefix`)을 썼는데, 쓰이지 않는 값을 위해 양쪽을 다 뒤질 이유가 없다.
 */
const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const toViewMode = (raw: string | null): WikiViewMode | null => {
  if (raw === "document") return "document";
  if (raw === "wiki") return "wiki";
  return null;
};

export const readWikiViewMode = (prefix: string, id?: string): WikiViewMode => {
  const current = toViewMode(readRaw(buildKey(prefix, id, KEY_VERSION)));
  if (current) return current;

  if (!id) return DEFAULT_VIEW_MODE;
  return toViewMode(readRaw(buildKey(prefix, id, null))) ?? DEFAULT_VIEW_MODE;
};

export const writeWikiViewMode = (
  prefix: string,
  id: string | undefined,
  mode: WikiViewMode,
): void => {
  try {
    localStorage.setItem(buildKey(prefix, id, KEY_VERSION), mode);
  } catch {
    // 저장에 실패해도 화면 전환 자체는 이미 state로 반영됐다. 세션 내에서는 정상 동작한다.
  }
};

/**
 * 프로필 요약(Infobox) 패널 열림 상태.
 *
 * 기본값은 열림이다. 사용자가 닫은 적이 없으면 요약이 보이는 편이 자연스럽다.
 *
 * NOTE: viewMode와 달리 legacy 폴백이 없다. 이 선호는 이전에 어디에도 저장되지 않았고
 * (`useState(true)`로만 존재했다) 이관할 값 자체가 없다.
 */
export const readInfoboxOpen = (prefix: string, id?: string): boolean =>
  readRaw(buildKey(prefix, id, KEY_VERSION)) !== "closed";

export const writeInfoboxOpen = (
  prefix: string,
  id: string | undefined,
  isOpen: boolean,
): void => {
  try {
    localStorage.setItem(buildKey(prefix, id, KEY_VERSION), isOpen ? "open" : "closed");
  } catch {
    // 저장 실패는 세션 내 동작에 영향이 없다.
  }
};

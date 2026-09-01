// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: wiki/entity 상세 뷰의 viewMode 영속화.
 *
 * 테스트 베이시스: 6차 감사 N21(`client-localstorage-schema` 직접 적용).
 *   D1 `EntityDetailView.tsx:121`이 `useState` 초기화 함수 안에서, `WikiDetailView.tsx:118`이
 *      렌더 본문에서 `localStorage.getItem`을 try/catch 없이 호출한다. localStorage는
 *      프라이빗 브라우징·용량 초과·비활성 환경에서 throw하므로 **렌더 중 예외**가 된다.
 *      규칙 원문이 "Always wrap in try-catch"를 명시한다.
 *   D2 키에 버전 프리픽스가 없어 스키마를 바꿀 수 없다.
 *   D3 같은 로직이 두 파일에 중복돼 있어 한쪽만 고치면 다른 쪽이 남는다.
 *
 * WHY 렌더 중 throw가 중요한가: 이 예외는 이벤트 핸들러가 아니라 렌더 경로에서 나므로
 * 에러 바운더리까지 올라가 상세 뷰 전체가 사라진다. 사용자 입장에서는 캐릭터/세력
 * 문서가 열리지 않는 것으로 보인다.
 *
 * ISTQB 기법
 *   결정표: (versioned 키 존재) × (legacy 키 존재) → 읽기 결과
 *   동등분할: 저장값 `wiki` / `document` / 알 수 없는 값 / 없음
 *   경계값: id 없음, 빈 문자열 id
 *   예외 경로: getItem throw / setItem throw
 *
 * PROVES: localStorage가 throw해도 읽기·쓰기·렌더가 살아남을 것, 기존 사용자의 저장값이
 *         버전 도입 후에도 유지될 것, 두 뷰가 같은 경로를 쓸 것.
 * DOES_NOT_PROVE: 실제 브라우저의 프라이빗 모드 동작(계약을 흉내서 검증).
 */

import {
  readInfoboxOpen,
  readWikiViewMode,
  writeInfoboxOpen,
  writeWikiViewMode,
  type WikiViewMode,
} from "../../src/renderer/src/features/research/components/wiki/wikiViewPreferences.js";

const PREFIX = "faction-view-mode";
const ID = "faction-1";

/** 버전 도입 이전에 저장돼 있던 키 모양. */
const legacyKey = (id: string) => `${PREFIX}:${id}`;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("viewMode 읽기 — 결정표 (versioned × legacy)", () => {
  it("R1: 둘 다 없으면 기본값 wiki", () => {
    expect(readWikiViewMode(PREFIX, ID)).toBe("wiki");
  });

  it("R2: versioned만 있으면 그 값을 쓴다", () => {
    writeWikiViewMode(PREFIX, ID, "document");
    expect(readWikiViewMode(PREFIX, ID)).toBe("document");
  });

  it("R3: legacy만 있으면 legacy 값을 쓴다 (기존 사용자 보존)", () => {
    // 버전 프리픽스를 도입하면서 사용자의 기존 선택이 사라지면 안 된다.
    localStorage.setItem(legacyKey(ID), "document");
    expect(readWikiViewMode(PREFIX, ID)).toBe("document");
  });

  it("R4: 둘 다 있으면 versioned가 우선한다", () => {
    localStorage.setItem(legacyKey(ID), "wiki");
    writeWikiViewMode(PREFIX, ID, "document");
    expect(readWikiViewMode(PREFIX, ID)).toBe("document");
  });
});

describe("viewMode 읽기 — 동등분할 (저장값 부류)", () => {
  it.each<[string, WikiViewMode]>([
    ["document", "document"],
    ["wiki", "wiki"],
  ])("저장값 %s → %s", (stored, expected) => {
    writeWikiViewMode(PREFIX, ID, stored as WikiViewMode);
    expect(readWikiViewMode(PREFIX, ID)).toBe(expected);
  });

  it.each(["", "  ", "DOCUMENT", "editor", "null", "{}"])(
    "알 수 없는 저장값 %s 은 wiki로 떨어진다",
    (stored) => {
      localStorage.setItem(legacyKey(ID), stored);
      expect(readWikiViewMode(PREFIX, ID)).toBe("wiki");
    },
  );
});

describe("viewMode 읽기 — 경계값 (id 부재)", () => {
  it("id가 없어도 예외 없이 기본값을 준다", () => {
    expect(readWikiViewMode(PREFIX, undefined)).toBe("wiki");
  });

  it("id가 없을 때 저장·복원이 성립한다", () => {
    writeWikiViewMode(PREFIX, undefined, "document");
    expect(readWikiViewMode(PREFIX, undefined)).toBe("document");
  });

  it("빈 문자열 id는 id 없음과 같은 슬롯을 쓴다", () => {
    // 기존 구현도 `${entityId ?? ""}`로 두 경우를 같은 키에 모았고, 빈 id는
    // '선택된 엔티티 없음'이라 표시 모드를 쓰지 않는 상태다. 동작을 명시적으로 고정한다.
    writeWikiViewMode(PREFIX, undefined, "document");
    expect(readWikiViewMode(PREFIX, "")).toBe("document");
  });

  it("다른 엔티티끼리 값이 섞이지 않는다", () => {
    writeWikiViewMode(PREFIX, "a", "document");
    expect(readWikiViewMode(PREFIX, "b")).toBe("wiki");
  });

  it("다른 prefix끼리 값이 섞이지 않는다", () => {
    writeWikiViewMode("faction-view-mode", ID, "document");
    expect(readWikiViewMode("event-view-mode", ID)).toBe("wiki");
  });
});

describe("viewMode — localStorage가 throw하는 환경", () => {
  /**
   * WARNING: `vi.spyOn(window.localStorage, "getItem")`은 이 jsdom 설정에서 **동작하지 않는다**
   * (조용히 무시돼 실제 getItem이 호출된다). 그러면 `not.toThrow()` 단정이 결함과 무관하게
   * 통과해 무효 테스트가 된다. `Storage.prototype`에 걸어야 한다.
   */
  const makeGetItemThrow = () =>
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: localStorage is disabled");
    });

  /** 스파이가 실제로 발동하는지 확인한다. 이 가드가 없으면 위 함정으로 되돌아간다. */
  const assertThrowingStorage = () => {
    expect(() => localStorage.getItem("probe")).toThrow();
  };

  it("E1: getItem이 throw해도 예외를 전파하지 않고 기본값을 준다", () => {
    makeGetItemThrow();
    assertThrowingStorage();

    // 이 호출이 throw하면 렌더 경로에서 예외가 올라가 상세 뷰가 사라진다.
    expect(() => readWikiViewMode(PREFIX, ID)).not.toThrow();
    expect(readWikiViewMode(PREFIX, ID)).toBe("wiki");
  });

  it("E2: setItem이 throw해도 예외를 전파하지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => localStorage.setItem("probe", "1")).toThrow();

    expect(() => writeWikiViewMode(PREFIX, ID, "document")).not.toThrow();
  });

  it("E3: 읽기 중 throw가 legacy 폴백 경로에서도 잡힌다", () => {
    // versioned 조회는 성공하고(값 없음) legacy 조회에서 throw하는 경우.
    let call = 0;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      call += 1;
      if (call === 1) return null;
      throw new Error("SecurityError");
    });

    expect(() => readWikiViewMode(PREFIX, ID)).not.toThrow();
    // 폴백 경로까지 실제로 들어갔는지 확인한다(호출이 2회 이상이어야 한다).
    expect(call).toBeGreaterThanOrEqual(2);
  });
});

describe("프로필 요약(Infobox) 열림 상태 영속화", () => {
  const INFOBOX_PREFIX = "faction-view-mode-infobox";

  it("I1: 저장된 적이 없으면 열림이 기본값이다", () => {
    // 사용자가 닫은 적이 없으면 요약이 보이는 편이 자연스럽다.
    expect(readInfoboxOpen(INFOBOX_PREFIX, ID)).toBe(true);
  });

  it("I2: 닫은 상태가 유지된다 (B5의 핵심)", () => {
    writeInfoboxOpen(INFOBOX_PREFIX, ID, false);
    expect(readInfoboxOpen(INFOBOX_PREFIX, ID)).toBe(false);
  });

  it("I3: 다시 열면 열림으로 되돌아간다", () => {
    writeInfoboxOpen(INFOBOX_PREFIX, ID, false);
    writeInfoboxOpen(INFOBOX_PREFIX, ID, true);
    expect(readInfoboxOpen(INFOBOX_PREFIX, ID)).toBe(true);
  });

  it("I4: 엔티티끼리 값이 섞이지 않는다", () => {
    writeInfoboxOpen(INFOBOX_PREFIX, "a", false);
    expect(readInfoboxOpen(INFOBOX_PREFIX, "b")).toBe(true);
  });

  it("I5: viewMode 슬롯과 겹치지 않는다", () => {
    // 같은 키를 쓰면 표시 모드를 바꿀 때 요약 상태가 함께 망가진다.
    writeWikiViewMode(PREFIX, ID, "document");
    expect(readInfoboxOpen(INFOBOX_PREFIX, ID)).toBe(true);

    writeInfoboxOpen(INFOBOX_PREFIX, ID, false);
    expect(readWikiViewMode(PREFIX, ID)).toBe("document");
  });

  it("I6: localStorage가 throw해도 예외를 전파하지 않는다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => localStorage.getItem("probe")).toThrow();

    expect(() => readInfoboxOpen(INFOBOX_PREFIX, ID)).not.toThrow();
    expect(readInfoboxOpen(INFOBOX_PREFIX, ID)).toBe(true);
  });

  it("I7: 쓰기 실패도 예외를 전파하지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => localStorage.setItem("probe", "1")).toThrow();

    expect(() => writeInfoboxOpen(INFOBOX_PREFIX, ID, false)).not.toThrow();
  });
});

describe("배선 — 두 상세 뷰가 공용 경로를 쓴다", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  /**
   * WHY 컴포넌트까지 마운트하는가: helper만 테스트하면 컴포넌트가 여전히
   * `localStorage`를 직접 호출하는 회귀를 잡지 못한다.
   */
  it("W1: localStorage가 throw해도 EntityDetailView가 마운트된다", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: localStorage is disabled");
    });
    // 스파이 유효성 가드. 이게 없으면 컴포넌트를 고치지 않아도 통과한다.
    expect(() => localStorage.getItem("probe")).toThrow();

    const [{ EntityDetailView }, { DialogProvider }, { ToastProvider }] = await Promise.all([
      import("../../src/renderer/src/features/research/components/wiki/EntityDetailView.js"),
      import("../../src/shared/ui/DialogProvider.js"),
      import("../../src/shared/ui/Toast.js"),
    ]);

    expect(() => {
      act(() => {
        root.render(
          <ToastProvider>
            <DialogProvider>
              <EntityDetailView
                entity={null}
                entityId={ID}
                icon={null}
                loadEntity={async () => {}}
                updateEntity={() => {}}
                prefix="faction"
                sections={[]}
                storagePrefix={PREFIX}
                noSelectionFallback="none"
                templateFallback="basic"
              />
            </DialogProvider>
          </ToastProvider>,
        );
      });
    }).not.toThrow();
  });
});

// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 위저드 프리뷰 리셋(resetPreviewResearchSelection)은 네 리서치 스토어의
// 마지막 선택(currentItem)과 alias 키(currentCharacter 등)를 모두 null로 만든다.
// 패널을 닫았다 다시 열 때 이전 엔티티가 그대로 서빙되는 것을 막는 장치다.

import { beforeEach, describe, expect, it, vi } from "vitest";

// 스토어 모듈들은 import 시점에는 api를 호출하지 않는다(액션에서만 사용).
vi.mock("@shared/api", () => ({ api: {} }));

class MockWorker {
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onmessage = null;
  onerror = null;
}

const {
  useCharacterStore,
  useEventStore,
  useFactionStore,
  useTermStore,
} = await import(
  "../../src/renderer/src/features/research/stores/index.js"
);
const { resetPreviewResearchSelection } = await import(
  "../../src/renderer/src/features/startup/components/preview/LayoutLivePreview.js"
);
const {
  PREVIEW_CHARACTERS,
  PREVIEW_EVENTS,
  PREVIEW_FACTIONS,
  PREVIEW_TERMS,
} = await import(
  "../../src/renderer/src/features/startup/constants/previewData.js"
);

describe("preview research selection reset", () => {
  beforeEach(() => {
    globalThis.Worker = MockWorker as unknown as typeof Worker;
  });

  it("리셋하면 currentItem과 alias 키가 모두 초기화된다", () => {
    const character = PREVIEW_CHARACTERS[0];
    const event = PREVIEW_EVENTS[0];
    const faction = PREVIEW_FACTIONS[0];
    const term = PREVIEW_TERMS[0];
    expect(character && event && faction && term).toBeTruthy();

    // 패널에서 엔티티를 고르면 currentItem과 alias가 함께 세팅된다.
    useCharacterStore.setState({
      currentItem: character,
      currentCharacter: character,
    });
    useEventStore.setState({ currentItem: event, currentEvent: event });
    useFactionStore.setState({ currentItem: faction, currentFaction: faction });
    useTermStore.setState({ currentItem: term, currentTerm: term });

    resetPreviewResearchSelection();

    expect(useCharacterStore.getState().currentItem).toBeNull();
    expect(useCharacterStore.getState().currentCharacter).toBeNull();
    expect(useEventStore.getState().currentItem).toBeNull();
    expect(useEventStore.getState().currentEvent).toBeNull();
    expect(useFactionStore.getState().currentItem).toBeNull();
    expect(useFactionStore.getState().currentFaction).toBeNull();
    expect(useTermStore.getState().currentItem).toBeNull();
    expect(useTermStore.getState().currentTerm).toBeNull();
  });

  it("초기화 후에도 목록(items)은 유지된다 — 선택만 지워진다", () => {
    const character = PREVIEW_CHARACTERS[0];
    useCharacterStore.setState({
      items: character ? [character] : [],
      currentItem: character,
      currentCharacter: character,
    });

    resetPreviewResearchSelection();

    expect(useCharacterStore.getState().items).toHaveLength(1);
    expect(useCharacterStore.getState().currentItem).toBeNull();
  });
});

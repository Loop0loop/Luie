// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor as TiptapEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { DecorationSet } from "@tiptap/pm/view";
import { SmartLink } from "../../src/renderer/src/features/editor/components/extensions/SmartLink.js";

/**
 * 리서치 스토어 목업. 실제 zustand 인스턴스라 subscribe/getState/setState가 동작한다.
 * smartLinkService가 생성자에서 네 스토어를 구독하므로 실제 구독 경로가 살아 있어야
 * "자료가 나중에 도착했을 때 rescan"까지 검증된다.
 */
const holders = vi.hoisted(() => ({
  stores: {} as Record<
    "character" | "event" | "faction" | "term",
    { setState: (partial: unknown) => void }
  >,
}));

vi.mock(
  "@renderer/features/research/stores/characterStore",
  async () => {
    const { create } = await import("zustand");
    const useCharacterStore = create(() => ({
      items: [{ id: "char-1", name: "Hero" }],
    }));
    holders.stores.character = useCharacterStore;
    return { useCharacterStore };
  },
);

vi.mock("@renderer/features/research/stores/eventStore", async () => {
  const { create } = await import("zustand");
  const useEventStore = create(() => ({ items: [] }));
  holders.stores.event = useEventStore;
  return { useEventStore };
});

vi.mock("@renderer/features/research/stores/factionStore", async () => {
  const { create } = await import("zustand");
  const useFactionStore = create(() => ({ items: [] }));
  holders.stores.faction = useFactionStore;
  return { useFactionStore };
});

vi.mock("@renderer/features/research/stores/termStore", async () => {
  const { create } = await import("zustand");
  const useTermStore = create(() => ({
    items: [{ id: "term-1", term: "Kingdom" }],
  }));
  holders.stores.term = useTermStore;
  return { useTermStore };
});

// NOTE: smartLinkService가 openItem 경로에서 쓰는 모듈들. 테스트에선 호출하지 않지만
// 모듈 부작용(무거운 import 사슬)을 막기 위해 잘라낸다.
vi.mock("@renderer/features/editor/stores/editorStore", () => ({
  useEditorStore: { getState: () => ({ uiMode: "default" }) },
}));

vi.mock("@renderer/features/workspace/stores/uiStore", () => ({
  useUIStore: { getState: () => ({}) },
}));

vi.mock("@renderer/features/workspace/services/docsPanelService", () => ({
  openDocsRightTab: vi.fn(),
}));

vi.mock(
  "@renderer/features/workspace/services/layoutRegionActions",
  () => ({
    openEditorBinderTab: vi.fn(),
  }),
);

/**
 * NOTE: 확장이 에디터 인스턴스마다 `new PluginKey("smartLink")`를 만들고, prosemirror의
 * 전역 레지스트리가 이름 충돌마다 접미사를 붙이므로("smartLink$", "smartLink$1", …) 키
 * 문자열로 정확히 찾을 수 없다. 접두사로 찾는다.
 */
function findSmartLinkPlugin(state: { plugins: import("@tiptap/pm/state").Plugin[] }) {
  return state.plugins.find((candidate) =>
    String((candidate.spec as { key?: { key?: string } }).key?.key ?? "").startsWith(
      "smartLink",
    ),
  );
}

function getSmartLinkDecorations(editor: TiptapEditor) {
  const plugin = findSmartLinkPlugin(editor.state);
  if (!plugin) return [];
  const decos = plugin.getState(editor.state) as DecorationSet;
  return decos.find().map((deco) => deco.type.attrs ?? {});
}

function createEditor(content: string) {
  return new TiptapEditor({
    extensions: [StarterKit, SmartLink],
    content,
  });
}

describe("SmartLink 초기 문서 스캔", () => {
  let editor: TiptapEditor | null = null;

  beforeEach(() => {
    holders.stores.character?.setState({
      items: [{ id: "char-1", name: "Hero" }],
    });
    holders.stores.event?.setState({ items: [] });
    holders.stores.faction?.setState({ items: [] });
    holders.stores.term?.setState({
      items: [{ id: "term-1", term: "Kingdom" }],
    });
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("에디터 생성 시점에 이미 로드된 자료로 하이라이트를 만든다", () => {
    editor = createEditor("<p>Hero가 Kingdom으로 출발한다</p>");

    const attrs = getSmartLinkDecorations(editor);
    const ids = attrs.map((attr) => attr["data-id"]).sort();

    expect(ids).toEqual(["char-1", "term-1"]);
    expect(attrs.every((attr) => attr.class === "smart-link-highlight")).toBe(
      true,
    );
  });

  it("에디터를 여러 개 만들어도 각 인스턴스의 초기 스캔이 동작한다", () => {
    editor = createEditor("<p>Hero가 Kingdom으로 출발한다</p>");
    expect(
      getSmartLinkDecorations(editor).map((attr) => attr["data-id"]).sort(),
    ).toEqual(["char-1", "term-1"]);

    const second = createEditor("<p>Kingdom에 Hero가 없어도 Kingdom은 남는다</p>");
    const secondIds = getSmartLinkDecorations(second)
      .map((attr) => attr["data-id"])
      .sort();
    second.destroy();

    expect(secondIds).toEqual(["char-1", "term-1", "term-1"]);
  });

  it("생성 후 자료가 도착하면 rescan해서 하이라이트를 만든다", () => {
    editor = createEditor("<p>Villain이 등장한다</p>");

    // 아직 스토어에 Villain이 없으므로 하이라이트가 없어야 한다.
    expect(getSmartLinkDecorations(editor)).toHaveLength(0);

    holders.stores.character.setState({
      items: [{ id: "char-2", name: "Villain" }],
    });

    const attrs = getSmartLinkDecorations(editor);
    expect(attrs.map((attr) => attr["data-id"])).toEqual(["char-2"]);
  });

  it("자료가 비어 있으면 하이라이트 없이 빈 데코레이션을 유지한다", () => {
    holders.stores.character.setState({ items: [] });
    holders.stores.term.setState({ items: [] });

    editor = createEditor("<p>아무 이름도 없음</p>");

    expect(getSmartLinkDecorations(editor)).toHaveLength(0);
  });
});

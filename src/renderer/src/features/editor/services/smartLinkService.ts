import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useCharacterStore } from '@renderer/features/research/stores/characterStore';
import { useEventStore } from '@renderer/features/research/stores/eventStore';
import { useFactionStore } from '@renderer/features/research/stores/factionStore';
import { useEditorStore } from "../stores/editorStore";
import { useTermStore } from '@renderer/features/research/stores/termStore';
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
import type { ResearchTab } from '@renderer/features/workspace/stores/uiStore';
import type { Character, Event, Faction, Term } from '@shared/types';
import { openDocsRightTab } from '@renderer/features/workspace/services/docsPanelService';
import { openEditorBinderTab } from '@renderer/features/workspace/services/layoutRegionActions';

type SmartLinkEntityType = "character" | "event" | "faction" | "term";

/**
 * 스마트링크 대상 종류별 설정.
 *
 * WHY 표로 두는가: 종류를 늘릴 때 `ensureCache`·`openItem`·툴팁 세 곳을 각각 고치면
 * 빠뜨리기 쉽다. 실제로 event·faction은 CSS(`editor.css:343,347`)와 색상 주입
 * (`Editor.tsx:287-288`)까지 준비돼 있었는데 이 서비스만 수집하지 않아 동작하지 않았다.
 */
const RESEARCH_TAB_BY_TYPE: Readonly<Record<SmartLinkEntityType, ResearchTab>> = {
  character: "character",
  event: "event",
  faction: "faction",
  term: "world",
};

type SmartLinkEntity = {
  id: string;
  text: string;
  type: SmartLinkEntityType;
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class SmartLinkService {
  private pattern: RegExp | null = null;
  private entities: SmartLinkEntity[] = [];
  /**
   * 매치된 텍스트 → 엔티티 조회용.
   *
   * WHY 배열과 별도로 두는가: `findSmartLinks`는 `doc.descendants` × `while(exec)` 이중
   * 루프이고, 매치마다 `entities.find()`를 돌면 비용이 (매치 수 × 엔티티 수)로 늘어난다.
   * 에디터 데코레이션 경로라 본문이 바뀔 때마다 재실행된다.
   */
  private entityByText: Map<string, SmartLinkEntity> = new Map();

  constructor() {
    useCharacterStore.subscribe(() => this.invalidate());
    useEventStore.subscribe(() => this.invalidate());
    useFactionStore.subscribe(() => this.invalidate());
    useTermStore.subscribe(() => this.invalidate());
  }

  private invalidate() {
    this.pattern = null;
    this.entities = [];
    // NOTE: `ensureCache`가 재빌드할 때 어차피 재할당하므로 동작상 필수는 아니다.
    // 세 캐시 필드가 한 묶음이라는 불변을 코드로 남겨, 나중에 `ensureCache`의
    // early-return 조건이 느슨해져도 Map이 stale해지지 않게 한다.
    this.entityByText = new Map();
  }

  private ensureCache() {
    if (this.pattern && this.entities.length > 0) return;

    const characters = useCharacterStore.getState().items as Character[];
    const events = useEventStore.getState().items as Event[];
    const factions = useFactionStore.getState().items as Faction[];
    const terms = useTermStore.getState().items as Term[];

    this.entities = [
      ...characters.map((item) => ({
        id: item.id,
        text: item.name,
        type: "character" as const,
      })),
      ...events.map((item) => ({
        id: item.id,
        text: item.name,
        type: "event" as const,
      })),
      ...factions.map((item) => ({
        id: item.id,
        text: item.name,
        type: "faction" as const,
      })),
      ...terms.map((item) => ({
        id: item.id,
        text: item.term,
        type: "term" as const,
      })),
    ].sort((a, b) => b.text.length - a.text.length);

    const uniqueNames = Array.from(new Set(this.entities.map((entity) => entity.text))).filter(
      (value) => value.trim().length > 0,
    );

    // WARNING: 먼저 넣은 항목이 이긴다. `entities`가 text 길이 내림차순으로 정렬돼 있고
    // 캐릭터가 용어보다 앞이므로, 이름이 겹칠 때 기존 `.find()`와 같은 우선순위가 된다.
    this.entityByText = new Map();
    for (const entity of this.entities) {
      if (!this.entityByText.has(entity.text)) {
        this.entityByText.set(entity.text, entity);
      }
    }

    this.pattern =
      uniqueNames.length > 0
        ? new RegExp(`(${uniqueNames.map(escapeRegExp).join("|")})`, "g")
        : null;
  }

  public findSmartLinks(doc: ProseMirrorNode): DecorationSet {
    this.ensureCache();
    if (!this.pattern) return DecorationSet.empty;

    const decorations: Decoration[] = [];
    const pattern = this.pattern;

    doc.descendants((node, pos) => {
      if (!node.isText) return;

      const text = node.text || "";
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const start = pos + match.index;
        const end = start + match[0].length;
        const matchedText = match[0];
        const entity = this.entityByText.get(matchedText);

        if (!entity) continue;
        decorations.push(
          Decoration.inline(start, end, {
            class: "smart-link-highlight",
            "data-type": entity.type,
            "data-id": entity.id,
          }),
        );
      }
    });

    return DecorationSet.create(doc, decorations);
  }

  public openItem(id: string, type: SmartLinkEntityType) {
    const uiStore = useUIStore.getState();
    const uiMode = useEditorStore.getState().uiMode;
    const researchTab = RESEARCH_TAB_BY_TYPE[type];

    if (uiMode === "scrivener") {
      if (type === "character") {
        uiStore.setMainView({ type: "character", id });
      } else if (type === "term") {
        uiStore.setWorldTab("terms");
        uiStore.setMainView({ type: "world", id });
      } else {
        // NOTE: scrivener 메인 뷰는 사건·세력 전용 화면이 없어 world 쪽으로 보낸다.
        uiStore.setMainView({ type: "world", id });
      }
    } else if (uiMode === "docs" || uiMode === "editor") {
      const openRightTab =
        uiMode === "editor" ? openEditorBinderTab : openDocsRightTab;
      openRightTab(researchTab);
      if (type === "term") {
        uiStore.setWorldTab("terms");
      }
    } else {
      uiStore.addPanel({ type: "research", tab: researchTab });
      if (type === "term") {
        uiStore.setWorldTab("terms");
      }
    }

    if (type === "character") {
      const characterStore = useCharacterStore.getState();
      characterStore.setCurrentCharacter(
        characterStore.items.find((item) => item.id === id) ?? null,
      );
      return;
    }

    if (type === "event") {
      const eventStore = useEventStore.getState();
      eventStore.setCurrentEvent(
        eventStore.items.find((item) => item.id === id) ?? null,
      );
      return;
    }

    if (type === "faction") {
      const factionStore = useFactionStore.getState();
      factionStore.setCurrentFaction(
        factionStore.items.find((item) => item.id === id) ?? null,
      );
      return;
    }

    const termStore = useTermStore.getState();
    termStore.setCurrentTerm(termStore.items.find((item) => item.id === id) ?? null);
  }
}

export const smartLinkService = new SmartLinkService();

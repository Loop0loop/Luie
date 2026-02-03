import { useCharacterStore } from "../../../renderer/src/stores/characterStore";
import { useTermStore } from "../../../renderer/src/stores/termStore";
import { useUIStore } from "../../../renderer/src/stores/uiStore";
import type { Character, Term } from "../../../shared/types";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

// Helper to escape regex
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class SmartLinkService {
  private pattern: RegExp | null = null;
  private entities: Array<{ id: string; text: string; type: "character" | "term" }> = [];

  constructor() {
    // Subscribe to store changes to invalidate cache
    useCharacterStore.subscribe(() => this.invalidate());
    useTermStore.subscribe(() => this.invalidate());
  }

  private invalidate() {
    this.pattern = null;
    this.entities = [];
  }

  private ensureCache() {
    if (this.pattern && this.entities.length > 0) return;

    const characters = useCharacterStore.getState().items as Character[];
    const terms = useTermStore.getState().items as Term[];

    this.entities = [
      ...characters.map((c) => ({ id: c.id, text: c.name, type: "character" as const })),
      ...terms.map((t) => ({ id: t.id, text: t.term, type: "term" as const })),
    ].sort((a, b) => b.text.length - a.text.length);

    const uniqueNames = Array.from(new Set(this.entities.map((e) => e.text))).filter(
      (t) => t.trim().length > 0
    );

    if (uniqueNames.length > 0) {
      this.pattern = new RegExp(`(${uniqueNames.map(escapeRegExp).join("|")})`, "g");
    } else {
      this.pattern = null;
    }
  }

  public getEntities() {
    this.ensureCache();
    return this.entities;
  }

  public findSmartLinks(doc: ProseMirrorNode): DecorationSet {
    this.ensureCache();
    if (!this.pattern) return DecorationSet.empty;

    const decorations: Decoration[] = [];
    const pattern = this.pattern; // Capture current pattern

    doc.descendants((node, pos) => {
      if (!node.isText) return;

      const text = node.text || "";
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const start = pos + match.index;
        const end = start + match[0].length;
        const matchedText = match[0];

        // Find entity (priority to longest match due to sort, but here exact text match)
        const entity = this.entities.find((e) => e.text === matchedText);

        if (entity) {
          decorations.push(
            Decoration.inline(start, end, {
              class: "smart-link-highlight", // Permanent highlighting class
              "data-type": entity.type,
              "data-id": entity.id,
            })
          );
        }
      }
    });

    return DecorationSet.create(doc, decorations);
  }

  public openItem(id: string, type: "character" | "term") {
    const uiStore = useUIStore.getState();

    // 1. Set Right Panel Content
    uiStore.setRightPanelContent({
      type: "research",
      tab: type === "character" ? "character" : "world", // mapping 'term' to 'world' tab usually? or 'scrap'?
      // Assuming 'term' goes to 'world' tab as per UIStore types (ResearchTab = character | world | scrap)
      // Actually, looking at CharacterManager, it seems to handle characters.
      // Terms usually go to World or Glossary. Let's assume 'world' for now based on context.
    });

    // 2. Open Split View if closed
    if (!uiStore.isSplitView) {
      uiStore.setSplitView(true);
    }

    // 3. Select the item in the respective store
    if (type === "character") {
      useCharacterStore.getState().setCurrentCharacter(useCharacterStore.getState().items.find(c => c.id === id) || null);
    } else {
       useTermStore.getState().setCurrentTerm(useTermStore.getState().items.find(t => t.id === id) || null);
    }
  }
}

export const smartLinkService = new SmartLinkService();

import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useCharacterStore } from "../stores/characterStore";
import { useEditorStore } from "../stores/editorStore";
import { useTermStore } from "../stores/termStore";
import { useUIStore } from "../stores/uiStore";
import type { Character, Term } from "../../../shared/types";
import { openDocsRightTab } from "./docsPanelService";

type SmartLinkEntityType = "character" | "term";

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

  constructor() {
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
      ...characters.map((item) => ({
        id: item.id,
        text: item.name,
        type: "character" as const,
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
        const entity = this.entities.find((item) => item.text === matchedText);

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

    if (uiMode === "docs" || uiMode === "editor") {
      if (type === "character") {
        openDocsRightTab("character");
      } else {
        openDocsRightTab("world");
        uiStore.setWorldTab("terms");
      }
    } else {
      uiStore.setRightPanelContent({
        type: "research",
        tab: type === "character" ? "character" : "world",
      });
      if (type === "term") {
        uiStore.setWorldTab("terms");
      }
      if (!uiStore.isSplitView) {
        uiStore.setSplitView(true);
      }
    }

    if (type === "character") {
      const characterStore = useCharacterStore.getState();
      characterStore.setCurrentCharacter(
        characterStore.items.find((item) => item.id === id) ?? null,
      );
      return;
    }

    const termStore = useTermStore.getState();
    termStore.setCurrentTerm(termStore.items.find((item) => item.id === id) ?? null);
  }
}

export const smartLinkService = new SmartLinkService();

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { useCharacterStore } from "../../../stores/characterStore";
import { useTermStore } from "../../../stores/termStore";
import type { Character, Term } from "../../../../../shared/types";

// Helper to escape regex
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SmartLink = Extension.create({
  name: "smartLink",

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey<DecorationSet>("smartLink");
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr: Transaction, oldState: DecorationSet) {
            // Optimization: Only re-scan if document changed or we forced a re-scan.
            if (tr.docChanged || tr.getMeta("smartLinkUpdate")) {
              return findSmartLinks(tr.doc);
            }
            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state: EditorState) {
            return pluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view: (editorView: EditorView) => {
          // Subscribe to stores to trigger updates
          const unsubChar = useCharacterStore.subscribe(() => {
            const tr = editorView.state.tr.setMeta("smartLinkUpdate", true);
            editorView.dispatch(tr);
          });
          const unsubTerm = useTermStore.subscribe(() => {
            const tr = editorView.state.tr.setMeta("smartLinkUpdate", true);
            editorView.dispatch(tr);
          });

          return {
            destroy() {
              unsubChar();
              unsubTerm();
            },
          };
        }
      }),
    ];
  },
});

function findSmartLinks(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  
  // Get latest data
  const characters = useCharacterStore.getState().items as Character[];
  const terms = useTermStore.getState().items as Term[];

  // 1. Build a Map of names/terms to their data for fast lookup
  //    Sort by length (descending) to match longest phrases first
  const entities = [
    ...characters.map((c) => ({ id: c.id, text: c.name, type: "character" })),
    ...terms.map((t) => ({ id: t.id, text: t.term, type: "term" })),
  ].sort((a, b) => b.text.length - a.text.length);

  if (entities.length === 0) return DecorationSet.empty;

  // 2. Create a massive regex OR pattern
  const uniqueNames = Array.from(new Set(entities.map((e) => e.text))).filter(
    (t) => t.trim().length > 0,
  );
  if (uniqueNames.length === 0) return DecorationSet.empty;

  const pattern = new RegExp(`(${uniqueNames.map(escapeRegExp).join("|")})`, "g");

  // 3. Scan text nodes
  doc.descendants((node, pos) => {
    if (!node.isText) return;

    // Reset regex state
    pattern.lastIndex = 0;
    
    const text = node.text || ""; // TS check
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;
      const matchedText = match[0];
      
      const entity = entities.find((e) => e.text === matchedText);

      if (entity) {
        decorations.push(
          Decoration.inline(start, end, {
            class:
              "smart-link cursor-pointer hover:underline decoration-primary/50 decoration-2 underline-offset-2",
            "data-type": entity.type,
            "data-id": entity.id,
            "data-name": entity.text,
          }),
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import * as Diff from "diff";
import { htmlToPlainText } from "../../../utils/htmlText";

export interface DiffOptions {
  comparisonContent?: string;
  mode?: "current" | "snapshot"; 
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diff: {
      setDiff: (options: DiffOptions) => ReturnType;
    };
  }
}

// Build linear text with mapping to document positions
function getDocTextMap(doc: Node) {
  let text = "";
  const mapping: { nodePos: number; nodeSize: number; textPos: number }[] = [];
  
  doc.descendants((node, pos) => {
    if (node.isText) {
      mapping.push({
        nodePos: pos,
        nodeSize: node.nodeSize,
        textPos: text.length
      });
      text += node.text || "";
    } else if (node.isBlock) {
       if (text.length > 0) {
         text += "\n"; 
       }
    }
  });
  return { text, mapping };
}

const diffPluginKey = new PluginKey<DiffOptions>("diffHighlight");

export const DiffHighlight = Extension.create<DiffOptions>({
  name: "diffHighlight",

  addOptions() {
    return {
      comparisonContent: undefined,
      mode: "current",
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: diffPluginKey,
        state: {
          init: () => ({ comparisonContent: this.options.comparisonContent, mode: this.options.mode }),
          apply: (tr, prev) => {
            const meta = tr.getMeta("diffHighlight");
            if (meta) return meta;
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = diffPluginKey.getState(state);
            if (!pluginState || !pluginState.comparisonContent) return DecorationSet.empty;

            const { comparisonContent, mode } = pluginState;
            const doc = state.doc;
            const { text: currentText, mapping } = getDocTextMap(doc);
            const comparisonText = htmlToPlainText(comparisonContent);

            const totalLength = currentText.length + comparisonText.length;
            if (totalLength > 50000) {
              return DecorationSet.empty;
            }

            const diffs = Diff.diffWordsWithSpace(comparisonText, currentText);

            const decorations: Decoration[] = [];
            let currentTextPos = 0; 

            diffs.forEach((part) => {
               if (part.removed) {
                   return;
               }
               
               const partLen = part.value.length;
               
               if (part.added) {
                  const className = mode === "current" 
                    ? "bg-green-500/20 text-green-800 dark:text-green-300 rounded-sm decoration-clone" 
                    : "bg-red-500/20 text-red-800 dark:text-red-300 rounded-sm decoration-clone";
                  
                  const startTextPos = currentTextPos;
                  const endTextPos = currentTextPos + partLen;
                  
                  for (const map of mapping) {
                     const mapEnd = map.textPos + map.nodeSize;
                     
                     const start = Math.max(startTextPos, map.textPos);
                     const end = Math.min(endTextPos, mapEnd);
                     
                     if (start < end) {
                        const offsetStart = start - map.textPos;
                        const offsetEnd = end - map.textPos;
                        
                        decorations.push(
                          Decoration.inline(map.nodePos + offsetStart, map.nodePos + offsetEnd, {
                            class: className,
                            nodeName: "span"
                          })
                        );
                     }
                  }
               }
               
               currentTextPos += partLen;
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  },
  
  addCommands() {
    return {
      setDiff: (options) => ({ tr, dispatch }) => { 
        if (dispatch) {
            tr.setMeta("diffHighlight", options);
        }
        return true; 
      },
    };
  },
});

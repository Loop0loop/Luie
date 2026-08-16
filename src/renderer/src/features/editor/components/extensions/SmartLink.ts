import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transaction, EditorState } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { smartLinkService } from "@renderer/features/editor/services/smartLinkService";

export const SmartLink = Extension.create({
  name: "smartLink",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("smartLink"),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr: Transaction, oldState: DecorationSet) {
            // NOTE: 문서가 바뀌거나 강제 요청된 경우에만 다시 scan한다.
            if (tr.docChanged || tr.getMeta("smartLinkUpdate")) {
               return smartLinkService.findSmartLinks(tr.doc);
            }
            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state: EditorState) {
            return this.getState(state);
          },
        },
        view: (editorView) => {
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
                 }
             };
        }
      }),
    ];
  },
});

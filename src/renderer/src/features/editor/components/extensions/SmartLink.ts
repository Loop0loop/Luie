import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transaction, EditorState } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
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
             /**
              * 자료가 바뀌면 데코레이션을 다시 계산하게 만든다.
              *
              * WARNING: 스마트링크가 다루는 종류를 늘리면 여기에도 구독을 추가해야 한다.
              * 빠뜨리면 그 종류는 앱을 다시 띄울 때까지 하이라이트되지 않는다.
              */
             const requestRescan = () => {
                 const tr = editorView.state.tr.setMeta("smartLinkUpdate", true);
                 editorView.dispatch(tr);
             };

             const unsubscribers = [
                 useCharacterStore.subscribe(requestRescan),
                 useEventStore.subscribe(requestRescan),
                 useFactionStore.subscribe(requestRescan),
                 useTermStore.subscribe(requestRescan),
             ];

             return {
                 destroy() {
                     unsubscribers.forEach((unsubscribe) => unsubscribe());
                 }
             };
        }
      }),
    ];
  },
});

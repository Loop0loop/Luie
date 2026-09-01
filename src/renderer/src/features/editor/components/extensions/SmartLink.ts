import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transaction, EditorState, EditorStateConfig } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
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
          // NOTE: 에디터가 "이미 존재하는 본문"으로 생성되는 순간(앱 시작, 원고 전환,
          // 스냅샷 복원 리마운트)에는 docChanged 트랜잭션이 일어나지 않는다. init에서
          // 스캔하지 않으면 리서치 자료가 로드돼 있어도 첫 타이핑 전까지 하이라이트가
          // 빈 채로 남는다. 자료가 에디터 생성보다 늦게 도착하는 경우는 아래 view의
          // store 구독 rescan이 맡는다.
          // WARNING: TipTap v3는 플러그인을 EditorState.reconfigure로 나중에 붙이고,
          // 이때 첫 인자엔 doc이 없는 config가 온다. 문서는 두 번째 인자(instance)로만
          // 접근할 수 있다.
          init(_config: EditorStateConfig, state: EditorState): DecorationSet {
            return smartLinkService.findSmartLinks(state.doc);
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

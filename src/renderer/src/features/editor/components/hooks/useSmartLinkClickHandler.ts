import { useCallback } from "react";
import type { EditorView } from "@tiptap/pm/view";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { smartLinkService } from "@renderer/features/editor/services/smartLinkService";

/**
 * 밑줄 친 텍스트를 클릭하면 이름이 겹치는 자료로 이동한다.
 *
 * NOTE: `.smart-link-highlight` 클릭(`SmartLinkTooltip`)과는 별개 경로다. 그쪽은 정확히
 * 일치한 이름에 붙은 데코레이션을 쓰고, 이쪽은 밑줄 구간의 텍스트로 느슨하게 찾는다.
 */
export function useSmartLinkClickHandler() {
    const handleClick = useCallback((view: EditorView, pos: number) => {
        const { state } = view;
        const $pos = state.doc.resolve(pos);
        const marks = $pos.marks();
        const hasUnderline = marks.some(m => m.type.name === 'underline');

        if (hasUnderline) {
            const node = $pos.nodeAfter || $pos.nodeBefore;
            if (node && node.isText) {
                const text = node.text || "";
                const looseMatch = (candidate: string) =>
                    candidate === text || candidate.includes(text) || text.includes(candidate);

                const char = useCharacterStore.getState().characters.find((c) => looseMatch(c.name));
                if (char) {
                    smartLinkService.openItem(char.id, "character");
                    return true;
                }

                const event = useEventStore.getState().items.find((e) => looseMatch(e.name));
                if (event) {
                    smartLinkService.openItem(event.id, "event");
                    return true;
                }

                const faction = useFactionStore.getState().items.find((f) => looseMatch(f.name));
                if (faction) {
                    smartLinkService.openItem(faction.id, "faction");
                    return true;
                }

                const term = useTermStore.getState().terms.find((t) => looseMatch(t.term));
                if (term) {
                    smartLinkService.openItem(term.id, "term");
                    return true;
                }
            }
        }
        return false;
    }, []);

    return handleClick;
}

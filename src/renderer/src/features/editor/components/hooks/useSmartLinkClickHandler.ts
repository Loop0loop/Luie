import { useCallback } from "react";
import type { EditorView } from "@tiptap/pm/view";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { smartLinkService } from "@renderer/features/editor/services/smartLinkService";

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

                const charStore = useCharacterStore.getState();
                const termStore = useTermStore.getState();

                const char = charStore.characters.find((c) => c.name === text || c.name.includes(text) || text.includes(c.name));
                if (char) {
                    smartLinkService.openItem(char.id, "character");
                    return true;
                }

                const term = termStore.terms.find((t) => t.term === text || t.term.includes(text) || text.includes(t.term));
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

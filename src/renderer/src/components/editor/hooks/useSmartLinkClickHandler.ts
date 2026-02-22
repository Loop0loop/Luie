import { useCallback } from "react";
import { EditorView } from "@tiptap/pm/view";
import { useCharacterStore } from "../../../stores/characterStore";
import { useTermStore } from "../../../stores/termStore";
import { smartLinkService } from "../../../services/smartLinkService";

export function useSmartLinkClickHandler() {
    const handleClick = useCallback((view: EditorView, pos: number) => {
        const { state } = view;
        // Check if the clickable range has 'underline' mark
        const $pos = state.doc.resolve(pos);
        const marks = $pos.marks();
        const hasUnderline = marks.some(m => m.type.name === 'underline');

        if (hasUnderline) {
            // Get the text of the node at this position
            const node = $pos.nodeAfter || $pos.nodeBefore;
            if (node && node.isText) {
                const text = node.text || "";

                const charStore = useCharacterStore.getState();
                const termStore = useTermStore.getState();

                // Search Character
                const char = charStore.characters.find((c: any) => c.name === text || c.name.includes(text) || text.includes(c.name));
                if (char) {
                    smartLinkService.openItem(char.id, "character");
                    return true; // handled
                }

                // Search Term
                const term = termStore.terms.find((t: any) => t.term === text || t.term.includes(text) || text.includes(t.term));
                if (term) {
                    smartLinkService.openItem(term.id, "term");
                    return true; // handled
                }
            }
        }
        return false;
    }, []);

    return handleClick;
}

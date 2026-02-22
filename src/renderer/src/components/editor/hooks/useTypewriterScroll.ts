import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

export function useTypewriterScroll(editor: TiptapEditor | null, focusMode: boolean) {
    useEffect(() => {
        if (!focusMode || !editor) return;

        const handleSelectionUpdate = () => {
            const { selection } = editor.state;
            const { empty } = selection;

            // Only scroll on carets to avoid jumping during selection
            if (!empty) return;

            const dom = editor.view.dom;
            if (document.activeElement !== dom) return;

            const coords = editor.view.coordsAtPos(selection.from);
            const viewportHeight = window.innerHeight;

            // Target: 40% from top
            const targetTop = viewportHeight * 0.4;

            // Current cursor top relative to viewport
            const currentTop = coords.top;

            // Diff
            const diff = currentTop - targetTop;

            if (Math.abs(diff) > 20) { // Threshold
                window.scrollBy({ top: diff, behavior: "smooth" });
            }
        };

        editor.on("selectionUpdate", handleSelectionUpdate);
        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
        };
    }, [editor, focusMode]);
}

import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

export function useTypewriterScroll(
  editor: TiptapEditor | null,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !editor) return;

    let frameId = 0;

    const scheduleScroll = () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        const { selection } = editor.state;
        if (!selection.empty) return;

        const dom = editor.view.dom as HTMLElement;
        const activeElement = document.activeElement;
        if (activeElement !== dom && !dom.contains(activeElement)) {
          return;
        }

        const scrollContainer = dom.closest<HTMLElement>(
          '[data-editor-scroll-container="true"]',
        );
        if (!scrollContainer) return;

        const coords = editor.view.coordsAtPos(selection.from);
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetTop = containerRect.top + containerRect.height * 0.42;
        const delta = coords.top - targetTop;

        if (Math.abs(delta) <= 18) return;

        const maxScrollTop =
          scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (maxScrollTop <= 0) return;

        const nextScrollTop = Math.min(
          maxScrollTop,
          Math.max(0, scrollContainer.scrollTop + delta),
        );

        if (Math.abs(nextScrollTop - scrollContainer.scrollTop) <= 1) {
          return;
        }

        scrollContainer.scrollTo({
          top: nextScrollTop,
          behavior: "smooth",
        });
      });
    };

    editor.on("selectionUpdate", scheduleScroll);
    editor.on("update", scheduleScroll);

    return () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
      editor.off("selectionUpdate", scheduleScroll);
      editor.off("update", scheduleScroll);
    };
  }, [editor, enabled]);
}

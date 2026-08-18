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
        const deadband = Math.max(48, (coords.bottom - coords.top) * 2);
        const safeTop = targetTop - deadband;
        const safeBottom = targetTop + deadband;
        const delta =
          coords.top < safeTop
            ? coords.top - safeTop
            : coords.bottom > safeBottom
              ? coords.bottom - safeBottom
              : 0;
        if (delta === 0) return;

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

        scrollContainer.scrollTo({ top: nextScrollTop, behavior: "auto" });
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

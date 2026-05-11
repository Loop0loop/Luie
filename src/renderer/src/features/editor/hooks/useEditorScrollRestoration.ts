import { useEffect, useRef } from "react";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

export function useEditorScrollRestoration(chapterId?: string) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);
  const upsertProjectLayout = useProjectLayoutStore((state) => state.upsertProjectLayout);

  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (!chapterId || !currentProject?.id) return;

    let scrollTimeout: NodeJS.Timeout | null = null;
    let cleanupListener: (() => void) | null = null;

    // Use a short delay to ensure DOM is fully rendered before trying to query and scroll
    const initTimer = setTimeout(() => {
      // Find the scroll container in the DOM
      const container = document.querySelector('[data-editor-scroll-container="true"]');
      if (!container) return;

      const layout = getProjectLayout(currentProject.id);
      const savedScroll = layout.editor.scrollYByChapter[chapterId] ?? 0;

      // Restore scroll position
      isRestoringRef.current = true;
      container.scrollTop = savedScroll;

      // Wait a tick before allowing scroll saves to prevent saving the initial render shifts
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);

      const handleScroll = () => {
        if (isRestoringRef.current) return;

        upsertProjectLayout(currentProject.id, {
          editor: {
            activeChapterId: getProjectLayout(currentProject.id).editor.activeChapterId,
            scrollYByChapter: {
              [chapterId]: container.scrollTop,
            },
          },
        });
      };

      const debouncedScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 300);
      };

      container.addEventListener("scroll", debouncedScroll, { passive: true });
      cleanupListener = () => {
        container.removeEventListener("scroll", debouncedScroll);
      };
    }, 150);

    return () => {
      clearTimeout(initTimer);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (cleanupListener) cleanupListener();
    };
  }, [chapterId, currentProject?.id, getProjectLayout, upsertProjectLayout]);
}

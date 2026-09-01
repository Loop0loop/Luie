import type { Editor as TiptapEditor } from "@tiptap/react";
import Editor from "@renderer/features/editor/components/Editor";
import {
  PREVIEW_CHAPTER_CONTENTS,
  SAMPLE_CONTENT,
  SAMPLE_TITLE,
} from "../../constants/previewData";
import type { LayoutChoice } from "../../types/wizard";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";

interface WizardEditorProps {
  uiMode: LayoutChoice | "theme";
  onReady: (editor: TiptapEditor | null) => void;
}

export function WizardEditor({ uiMode, onReady }: WizardEditorProps) {
  // EditorRoot가 모드별로 넘기는 것과 동일한 프롭 조합으로 실제 사용 장면을 재현한다.
  // chapterId/onSave는 일부러 넘기지 않아 미리 보기에서 절대 저장이 발화하지 않는다.
  const currentChapter = useChapterStore((state) => state.currentChapter);
  const isThemePreview = uiMode === "theme";
  const isChromeHidden = !isThemePreview && uiMode !== "default";

  const chapterId = currentChapter?.id ?? "wizard-preview-chapter-1";
  const title = currentChapter?.title ?? SAMPLE_TITLE;
  const content =
    PREVIEW_CHAPTER_CONTENTS[chapterId] ?? SAMPLE_CONTENT;

  return (
    <Editor
      key={chapterId}
      initialTitle={title}
      initialContent={content}
      hideToolbar={isChromeHidden}
      hideFooter={!isThemePreview && uiMode !== "default"}
      hideTitle={isChromeHidden}
      scrollable={isThemePreview || uiMode === "default" || uiMode === "scrivener"}
      autoHeight={!isThemePreview && uiMode === "docs"}
      onEditorReady={onReady}
    />
  );
}

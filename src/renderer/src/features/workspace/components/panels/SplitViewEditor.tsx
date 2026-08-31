import { useTranslation } from "react-i18next";

import { Editor } from "@renderer/domains/editor";
import { useChapterContent } from "@renderer/features/manuscript/hooks/useChapterContent";

type SplitViewEditorProps = {
  chapterId?: string;
  chapterTitle?: string;
  /** chapterId가 아직 없을 때 Editor 인스턴스를 구분하기 위한 fallback key. */
  panelId: string;
  contentRevision: number;
  onSave: (title: string, content: string, chapterId?: string) => Promise<void>;
};

/**
 * default 레이아웃 분할 패널의 에디터.
 *
 * WARNING: 본문은 반드시 `useChapterContent`에서 받아야 한다. 목록(`chapterStore.items`)의
 * `content`를 직접 읽으면 목록에서 본문을 제거하는 단계에서 빈 문자열로 마운트되고, 그
 * 상태에서 autosave(`onSave`)가 원본을 덮어쓴다.
 *
 * NOTE: 별도 컴포넌트인 이유는 두 가지다. 패널 목록을 `.map()`으로 그리는 부모에서는 훅을
 * 호출할 수 없고, 본문 구독을 여기로 좁혀야 본문 변경이 패널 전체를 리렌더시키지 않는다.
 */
export function SplitViewEditor({
  chapterId,
  chapterTitle,
  panelId,
  contentRevision,
  onSave,
}: SplitViewEditorProps) {
  const { t } = useTranslation();
  const { content, isLoaded } = useChapterContent(chapterId);

  if (chapterId && !isLoaded) {
    return <div className="p-4 text-sm text-muted">{t("loading")}</div>;
  }

  return (
    <Editor
      key={`dnd-editor-${chapterId ?? panelId}-${contentRevision}`}
      initialTitle={chapterTitle ?? ""}
      initialContent={content}
      chapterId={chapterId}
      readOnly={false}
      hideToolbar={true}
      hideFooter={true}
      onSave={
        chapterId
          ? (nextTitle, nextContent) =>
              onSave(nextTitle, nextContent, chapterId)
          : undefined
      }
    />
  );
}

import { Editor } from "@renderer/domains/editor";
import { useChapterContentStatus } from "@renderer/domains/manuscript";
import { peekChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";

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
 * WARNING: 본문은 반드시 본문 캐시(chapterContentStore)에서 받아야 한다. 목록
 * (`chapterStore.items`)의 `content`를 직접 읽는 구현은 복원 시 낡은 본문을 에디터에
 * 남긴다. 로딩 창의 저장 억제는 Editor의 `contentReady` 게이트가 담당한다.
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
  const { isLoaded } = useChapterContentStatus(chapterId);
  // NOTE: 본문 문자열은 구독하지 않고 로드 완료 시점에 1회 peek한다. 자동 저장이 캐시에
  // 쓰는 갱신으로 패널이 리렌더할 이유가 없다. 전환 창(로딩 중)의 저장/스왑 억제는
  // Editor의 contentReady 계약이 담당한다.
  const content = isLoaded ? peekChapterContent(chapterId) ?? "" : "";

  return (
    <Editor
      // NOTE: key에서 chapterId를 뺀다. 챕터 전환은 setContent 스왑으로 처리하고
      // 리마운트는 스냅샷 복원 리비전에만 쓴다.
      key={`dnd-editor-${panelId}-${contentRevision}`}
      initialTitle={chapterTitle ?? ""}
      initialContent={content}
      contentReady={chapterId ? isLoaded : true}
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

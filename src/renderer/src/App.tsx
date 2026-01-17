import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
import Editor from "./components/editor/Editor";
import ContextPanel from "./components/context/ContextPanel";

export default function App() {
  const [activeChapterId, setActiveChapterId] = useState("2");
  const [content, setContent] = useState(`그는 천천히 눈을 떴다.
  
낯선 천장이다. 아니, 정확히 말하면 천장이라기보다는 거대한 돔 형태의 구조물이었다. 희미하게 빛나는 푸른 보석들이 박혀 있는 것을 보아하니 평범한 건물은 아닌 듯했다.

"일어나셨습니까, 3황자 전하."

차가운 목소리가 귓가를 파고들었다. 고개를 돌리자 은발의 남자가 무표정한 얼굴로 서 있었다. 나는 반사적으로 내 목을 만졌다. 분명 트럭에 치였을 텐데. 통증이 없다.

'잠깐... 3황자?'

내가 썼던 소설 <제국의 몰락>에 나오는 그 망나니 황자 카이드? 설마 내가 내 소설 속에 들어온 건가?

입안이 바짝 말랐다. 눈앞의 저 은발 남자는 황실 근위대장 '루시안'이 틀림없다. 원작에서 3황자의 목을 베어버리는 바로 그 인물.

"전하, 폐하께서 찾으십니다."

루시안의 손이 검 자루에 머물러 있었다. 긴장감이 등줄기를 타고 흘렀다. 당황하지 말자. 나는 이 소설의 작가다. 이 세계의 모든 것을 알고 있다.`);

  const mockChapters = [
    { id: "1", title: "프롤로그: 시작된 비극", order: 1 },
    { id: "2", title: "1화. 눈을 떠보니 악역이었다", order: 2 },
    { id: "3", title: "2화. 살아남기 위한 거래", order: 3 },
    { id: "4", title: "3화. 그림자 기사단의 비밀", order: 4 },
  ];

  const handleSelectChapter = (id: string) => {
    setActiveChapterId(id);
    // In a real app, we would load new content here
  };

  const activeChapterTitle = mockChapters.find(c => c.id === activeChapterId)?.title || "";

  return (
    <MainLayout
      sidebar={
        <Sidebar 
          chapters={mockChapters} 
          activeChapterId={activeChapterId}
          onSelectChapter={handleSelectChapter}
          onAddChapter={() => console.log("Add Chapter")}
        />
      }
      contextPanel={
        <ContextPanel />
      }
    >
      <Editor 
        initialTitle={activeChapterTitle}
        initialContent={content}
        onSave={(t, c) => {
          console.log(`Auto-saving: ${t}`);
          setContent(c);
        }}
      />
    </MainLayout>
  );
}

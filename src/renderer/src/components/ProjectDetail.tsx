import { useState, useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import TextEditor from "./TextEditor";

interface ProjectDetailProps {
  projectId: string;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { currentProject, setCurrentProject } = useProjectStore();
  const { chapters, setChapters, currentChapter, setCurrentChapter } =
    useChapterStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const projectResponse = await window.api.project.get(projectId);
      if (projectResponse.success && projectResponse.data) {
        setCurrentProject(projectResponse.data as any);
      }

      const chaptersResponse = await window.api.chapter.getAll(projectId);
      if (chaptersResponse.success && chaptersResponse.data) {
        setChapters(chaptersResponse.data as any);
      }
    } catch (error) {
      console.error("Failed to load project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChapter = async () => {
    try {
      const response = await window.api.chapter.create({
        projectId,
        title: "새 챕터",
      });
      if (response.success && response.data) {
        const newChapter = response.data as any;
        setChapters([...chapters, newChapter]);
        setCurrentChapter(newChapter);
      }
    } catch (error) {
      console.error("Failed to create chapter:", error);
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      setCurrentChapter(chapter);
    }
  };

  const handleUpdateChapter = (content: string) => {
    if (currentChapter) {
      setCurrentChapter({ ...currentChapter, content });
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("정말 이 챕터를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await window.api.chapter.delete(chapterId);
      if (response.success) {
        setChapters(chapters.filter((ch) => ch.id !== chapterId));
        if (currentChapter?.id === chapterId) {
          setCurrentChapter(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete chapter:", error);
    }
  };

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">프로젝트를 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Chapter List */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {currentProject.title}
          </h2>
          <div className="text-sm text-gray-600">
            {chapters.length}개 챕터 • {totalWords.toLocaleString()}자
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={handleCreateChapter}
            className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + 새 챕터
          </button>

          {chapters.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>아직 챕터가 없습니다</p>
              <p className="text-sm mt-1">새 챕터를 만들어보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => handleSelectChapter(chapter.id)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    currentChapter?.id === chapter.id
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "bg-gray-100 hover:bg-gray-200 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 flex-1 pr-2">
                      {chapter.order}. {chapter.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                  {chapter.synopsis && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {chapter.synopsis}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {chapter.wordCount || 0}자
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Editor */}
      <main className="flex-1 flex flex-col">
        {currentChapter ? (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <input
                type="text"
                value={currentChapter.title}
                onChange={(e) => {
                  setCurrentChapter({
                    ...currentChapter,
                    title: e.target.value,
                  });
                }}
                className="text-2xl font-bold text-gray-900 w-full border-none focus:outline-none"
                placeholder="챕터 제목"
              />
            </div>
            <TextEditor
              chapterId={currentChapter.id}
              projectId={projectId}
              initialContent={currentChapter.content}
              onSave={handleUpdateChapter}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                챕터를 선택하세요
              </h3>
              <p className="text-gray-600">왼쪽 목록에서 챕터를 선택하거나</p>
              <p className="text-gray-600">새 챕터를 만들어보세요</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

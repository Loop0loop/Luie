import { Save, History, Type, Bold, Italic, List, AlignLeft, AlignCenter, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NoteMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col bg-app">
      {/* Document Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 shrink-0 bg-element/10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[11px] text-muted mb-1">
            <span>Ideas</span>
            <span className="text-border">/</span>
            <span>마왕 과거 떡밥</span>
          </div>
          <input 
            type="text" 
            defaultValue="마왕 과거 떡밥" 
            className="bg-transparent border-none text-lg font-bold text-fg focus:outline-none focus:ring-0 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted mr-2">Last edited just now</span>
          <button className="p-2 border border-border/60 rounded-md text-muted hover:bg-element hover:text-fg transition-colors">
            <History className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1.5 bg-accent text-accent-fg px-3 py-1.5 rounded-md text-xs font-medium hover:bg-accent/90 transition-colors">
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button className="p-1.5 text-muted hover:text-fg">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border/40 bg-element/20 shrink-0">
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><Type className="h-4 w-4" /></button>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><Bold className="h-4 w-4" /></button>
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><Italic className="h-4 w-4" /></button>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><List className="h-4 w-4" /></button>
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><AlignLeft className="h-4 w-4" /></button>
        <button className="p-1.5 rounded text-muted hover:bg-element hover:text-fg"><AlignCenter className="h-4 w-4" /></button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="w-full max-w-3xl">
          <div 
            className="w-full min-h-[500px] text-sm text-fg leading-relaxed focus:outline-none"
            contentEditable
            suppressContentEditableWarning
          >
            {/* Mock Content */}
            <h1 className="text-2xl font-bold mb-4">마왕의 탄생 비화</h1>
            <p className="mb-4 text-muted">
              마왕은 원래 초대 국왕의 막역한 친우이자 대마법사였다. 
              하지만 붉은 밤 사건 당시 어둠의 심연에 노출되면서...
            </p>
            <ul className="list-disc pl-5 mb-4 text-muted space-y-1">
              <li>왕국의 역사서에는 반역자로 기록되어 있음</li>
              <li>그러나 남부 기록 보관소의 이면지에는 그가 사람들을 지키기 위해 희생한 것으로 추정되는 단서가 있음</li>
            </ul>
            <p className="text-muted">
              주인공 파티가 중반부에 이 사실을 알게 되었을 때 충격적인 전개를 유도할 수 있도록 복선을 배치해야 함.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
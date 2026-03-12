import { Search, FolderPlus, Upload, Image as ImageIcon, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

const MOCK_FILES = [
  { id: 1, type: "template", title: "Character Template", desc: "기본 인물 설정", icon: FileText },
  { id: 2, type: "template", title: "Faction Template", desc: "세력/집단 설정", icon: FileText },
  { id: 3, type: "image", title: "중세 의상 레퍼런스", desc: "1920x1080 • 1.2MB", icon: ImageIcon },
  { id: 4, type: "image", title: "고딕 건축 양식", desc: "1080x1080 • 800KB", icon: ImageIcon },
  { id: 5, type: "image", title: "양손검 형태 모음", desc: "2048x1080 • 2.1MB", icon: ImageIcon },
];

export function LibraryMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col bg-app">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <h2 className="text-sm font-semibold text-fg">Library & Assets</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-64 rounded-md border border-border/60 bg-element pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-md border border-border/60 bg-element px-3 py-1.5 text-xs text-muted hover:bg-element-hover hover:text-fg transition-colors">
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>
          <button className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent/90 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
        </div>
      </div>

      {/* Main Content: Grid View */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {MOCK_FILES.map((file) => {
            const Icon = file.icon;
            const isTemplate = file.type === "template";
            
            return (
              <div 
                key={file.id} 
                className="group flex flex-col rounded-lg border border-border/40 bg-element/20 hover:bg-element/50 hover:border-accent/50 transition-all cursor-pointer overflow-hidden"
              >
                {/* Thumbnail Area */}
                <div className="aspect-video w-full bg-sidebar flex items-center justify-center border-b border-border/40">
                  {isTemplate ? (
                    <FileText className="h-10 w-10 text-muted opacity-50 group-hover:text-accent transition-colors" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted opacity-50 group-hover:text-accent transition-colors" />
                  )}
                </div>
                
                {/* Meta Area */}
                <div className="p-3">
                  <h3 className="text-xs font-medium text-fg truncate mb-1">{file.title}</h3>
                  <p className="text-[10px] text-muted truncate">{file.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
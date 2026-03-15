import { CalendarRange, Boxes, NotebookPen, PackageOpen, DownloadCloud, Blocks } from "lucide-react";
import type { PluginCategoryTab, PluginSection } from "@renderer/features/research/stores/graphIdeStore";

type PlaceholderPluginPanelProps = {
  activeTab: PluginCategoryTab;
  activeSection: PluginSection;
};

const TAB_CONFIG = {
  timeline: {
    title: "Timeline Core Module",
    description: "이벤트의 시계열 정렬과 연표 기반의 시점 관리를 지원하는 코어 모듈입니다.",
    icon: CalendarRange,
    moduleName: "Timeline Foundation",
    moduleDesc: "기본 내장된 타임라인 엔진으로, 프로젝트 내 모든 이벤트와 시점을 시간순으로 정렬하고 시각화합니다.",
    themeColor: "text-sky-400",
    themeBg: "bg-sky-400/10",
  },
  note: {
    title: "Note Core Module",
    description: "그래프에 연결된 노트와 설정 자료를 관리하는 코어 모듈입니다.",
    icon: NotebookPen,
    moduleName: "Note Foundation",
    moduleDesc: "마크다운 기반의 노트 에디터 환경을 제공하며, 엔티티 백링크와 캔버스 스냅샷을 통합 관리합니다.",
    themeColor: "text-emerald-400",
    themeBg: "bg-emerald-400/10",
  },
  entity: {
    title: "Entity Core Module",
    description: "세계관 내 모든 개체와 개념을 체계적으로 분류하고 관리하는 코어 모듈입니다.",
    icon: Boxes,
    moduleName: "Entity Foundation",
    moduleDesc: "캐릭터, 장소, 아이템, 개념 등 프로젝트 세계관의 근간이 되는 엔티티 사전 구조를 설계하고 유지합니다.",
    themeColor: "text-rose-400",
    themeBg: "bg-rose-400/10",
  },
} as const;

export function PlaceholderPluginPanel({ activeTab, activeSection }: PlaceholderPluginPanelProps) {
  if (activeTab === "graph") return null;
  const config = TAB_CONFIG[activeTab];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5">
        {activeSection === "installed" ? (
          <section className="rounded-[16px] border border-white/10 bg-black/20 backdrop-blur-md p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground drop-shadow-sm">
                  <PackageOpen className={`h-5 w-5 ${config.themeColor}`} />
                  Installed Modules
                </div>
                <p className="text-xs text-muted-foreground">
                  현재 프로젝트에 활성화된 기본 내장 코어 모듈입니다.
                </p>
              </div>
              <div className={`rounded-full ${config.themeBg} border border-white/5 px-3 py-1 text-[11px] font-medium ${config.themeColor} shadow-inner`}>
                1 Active
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:border-white/10">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent shadow-inner ${config.themeColor}`}>
                    <Blocks className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15px] font-semibold leading-none tracking-tight drop-shadow-sm">{config.moduleName}</h4>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80 font-mono shadow-inner border border-white/5">v1.0.0</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground/80 line-clamp-1">{config.moduleDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest pr-2">Core</span>
                </div>
              </div>
              
              <div className="rounded-xl border border-white/5 border-dashed bg-black/10 px-4 py-4 text-center text-[12px] text-muted-foreground/70">
                관련 추가 설정이나 템플릿이 제공되지 않는 코어 모듈입니다.
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[16px] border border-white/10 bg-black/20 backdrop-blur-md p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground drop-shadow-sm">
                  <DownloadCloud className={`h-5 w-5 ${config.themeColor}`} />
                  Extension Catalog
                </div>
                <p className="text-xs text-muted-foreground">
                  이 모듈을 위한 공식 및 커뮤니티 확장 플러그인 목록입니다.
                </p>
              </div>
              <div className={`rounded-full ${config.themeBg} border border-white/5 px-3 py-1 text-[11px] font-medium ${config.themeColor} shadow-inner`}>
                0 Available
              </div>
            </div>
            
            <div className="mt-6">
              <div className="rounded-xl border border-white/5 border-dashed bg-black/10 px-6 py-12 text-center text-sm text-muted-foreground/70 transition-colors hover:bg-black/20">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-inner ${config.themeColor}`}>
                  <Icon className="h-6 w-6 opacity-50" />
                </div>
                <p className="font-semibold text-foreground/90 text-[15px] tracking-tight">아직 등록된 확장 플러그인이 없습니다</p>
                <p className="mt-1.5 text-[13px] opacity-70">다음 업데이트를 통해 다양한 플러그인이 카탈로그에 추가될 예정입니다.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

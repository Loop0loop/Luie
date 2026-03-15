import { Star, Network, Calendar, Database, Library } from "lucide-react";
import type { GraphPluginCatalogItem, InstalledGraphPlugin } from "@shared/types";
import { cn } from "@renderer/lib/utils";

type RecommendedSectionProps = {
  catalog: GraphPluginCatalogItem[];
  installed: InstalledGraphPlugin[];
  installingPluginId: string | null;
  onInstall: (pluginId: string) => void;
};

// Hardcoded recommendations following the mockup
const RECOMMENDED_PLUGINS = [
  {
    id: "graph-engine",
    name: "Graph Engine",
    rating: "4.9",
    description: "고성능 데이터 시각화 및 노드 네트워크 매핑 엔진.",
    icon: Network,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/20",
  },
  {
    id: "timeline-pro",
    name: "Timeline Pro",
    rating: "4.8",
    description: "전문가용 시계열 추적 및 프레임 정밀 분석 툴.",
    icon: Calendar,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/20",
  },
  {
    id: "entity-linker",
    name: "Entity Linker",
    rating: "4.7",
    description: "지능형 메타데이터 카테고리화 및 링크 시스템.",
    icon: Database,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/20",
  },
  {
    id: "asset-library",
    name: "Asset Library",
    rating: "5.0",
    description: "클라우드 동기화가 지원되는 공유 자산 저장소.",
    icon: Library,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/20",
  },
];

export function GraphPluginRecommendedSection({
  catalog: _catalog,
  installed,
  installingPluginId,
  onInstall,
}: RecommendedSectionProps) {
  const installedIds = new Set(installed.map((p) => p.pluginId));
  
  // Real active count based on catalog/installed matching, or just hardcode for visual
  const activeCount = RECOMMENDED_PLUGINS.filter(p => installedIds.has(p.id)).length;

  return (
    <section className="rounded-[24px] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
            <Star className="h-4 w-4 fill-current" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            추천 확장 프로그램 (Recommended)
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          {activeCount} Active
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {RECOMMENDED_PLUGINS.map((plugin) => {
          const isInstalled = installedIds.has(plugin.id);
          const isInstalling = installingPluginId === plugin.id;
          
          return (
            <article
              key={plugin.id}
              className="group flex flex-col justify-between rounded-[20px] border border-white/5 bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 shadow-inner", plugin.iconBg)}>
                    <plugin.icon className={cn("h-7 w-7", plugin.iconColor)} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {plugin.rating}
                  </div>
                </div>
                
                <h3 className="text-[17px] font-bold text-white mb-2">{plugin.name}</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground/80 line-clamp-3 mb-6">
                  {plugin.description}
                </p>
              </div>

              <button
                type="button"
                disabled={isInstalled || isInstalling}
                onClick={() => onInstall(plugin.id)}
                className={cn(
                  "w-full rounded-xl py-2.5 text-[13px] font-bold transition-all shadow-inner border",
                  isInstalled
                    ? "bg-white/[0.03] border-white/5 text-muted-foreground/50 hover:bg-white/[0.05]"
                    : "bg-sky-500 hover:bg-sky-400 border-sky-400/50 text-white"
                )}
              >
                {isInstalled ? "설치됨" : isInstalling ? "설치 중..." : "설치"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

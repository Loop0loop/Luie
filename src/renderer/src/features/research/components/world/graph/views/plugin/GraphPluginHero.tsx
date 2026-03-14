import { PlugZap, RefreshCcw } from "lucide-react";

type GraphPluginHeroProps = {
  availableCount: number;
  installedCount: number;
  templateCount: number;
  onRefresh: () => void;
};

const METRICS = [
  { key: "installed", label: "Installed", accent: "text-amber-200" },
  { key: "available", label: "Catalog", accent: "text-sky-200" },
  { key: "templates", label: "Templates", accent: "text-emerald-200" },
] as const;

export function GraphPluginHero({
  availableCount,
  installedCount,
  templateCount,
  onRefresh,
}: GraphPluginHeroProps) {
  const values = {
    installed: installedCount,
    available: availableCount,
    templates: templateCount,
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800/60 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.96))] text-slate-50 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.95)]">
      <div className="grid gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)] lg:px-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
            <PlugZap className="h-3.5 w-3.5" />
            Graph Plugin Library
          </div>
          <div className="space-y-2">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-white">
              GitHub 기반 그래프 번들을 설치하고 현재 프로젝트에 바로 적용합니다.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              V1은 실행 코드를 허용하지 않고, 커스텀 월드 엔티티 그래프 템플릿만 다룹니다.
              설치는 앱 전역으로 유지되고 적용은 현재 프로젝트의 그래프 레이어를 교체합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/14"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh Catalog
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {metric.label}
              </div>
              <div className={`mt-3 text-3xl font-semibold ${metric.accent}`}>
                {values[metric.key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

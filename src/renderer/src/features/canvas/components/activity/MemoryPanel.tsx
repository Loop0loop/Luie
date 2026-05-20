/**
 * MemoryPanel — Status / Recent / Conflicts / Unlinked UI shell.
 *
 * 데이터 연결은 memory 엔진 구현 단계에서 진행합니다.
 */
import { useTranslation } from "react-i18next";
import { Sparkles, AlertTriangle, AlertCircle, FileText } from "lucide-react";
import {
  MOCK_MEMORY_INSIGHTS,
  MOCK_MEMORY_CONFLICTS,
  MOCK_MEMORY_UNLINKED,
} from "../../constants/panel";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
} from "./shared";

export default function MemoryPanel() {
  const { t } = useTranslation();

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.memory")} />
      <PanelBody>
        {/* 분석 상태 대시보드 */}
        <PanelSection title={t("canvas.memory.status")} defaultOpen>
          <div className="px-3 pb-3 pt-1">
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>{t("canvas.memory.engineName")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">{t("canvas.memory.liveTracking")}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-fg">
                <div className="rounded border border-border/40 bg-background/50 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">{t("canvas.memory.analyzedManuscript")}</div>
                  <div className="text-sm font-semibold">
                    {t("canvas.memory.charCount", { count: 4250 })}{" "}
                    <span className="text-[10px] text-accent/80 font-normal">
                      ({t("canvas.memory.chapterCount", { count: 3 })})
                    </span>
                  </div>
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">{t("canvas.memory.identifiedRelations")}</div>
                  <div className="text-sm font-semibold text-accent">
                    {t("canvas.memory.nodeCount", { count: 18 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PanelSection>

        {/* 최근 분석 요약 */}
        <PanelSection title={t("canvas.memory.recent")} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            {MOCK_MEMORY_INSIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border bg-card/30 p-2.5 text-xs hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 font-medium text-fg mb-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground animate-none" />
                  <span>{item.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* 설정 충돌 경고 */}
        <PanelSection title={t("canvas.memory.conflicts")} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            {MOCK_MEMORY_CONFLICTS.map((item) => {
              const Icon = item.kind === "rose" ? AlertTriangle : AlertCircle;
              const cardClass = item.kind === "rose"
                ? "rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs"
                : "rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs";
              const titleClass = item.kind === "rose"
                ? "flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400 mb-1"
                : "flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400 mb-1";

              const parts = item.content.split(
                new RegExp(`(${item.highlight1}|${item.highlight2})`, "g")
              );

              return (
                <div key={item.title} className={cardClass}>
                  <div className={titleClass}>
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {parts.map((part, idx) => {
                      if (part === item.highlight1 || part === item.highlight2) {
                        return (
                          <span key={idx} className="font-semibold text-foreground">
                            {part}
                          </span>
                        );
                      }
                      return part;
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </PanelSection>

        {/* 미연결 단어 추천 */}
        <PanelSection title={t("canvas.memory.unlinked")} defaultOpen={false}>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            {MOCK_MEMORY_UNLINKED.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-border bg-card/20 p-2 text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-fg truncate">{item.label}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {item.description}
                  </span>
                </div>
                <button className="rounded bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
                  {t("canvas.memory.add")}
                </button>
              </div>
            ))}
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

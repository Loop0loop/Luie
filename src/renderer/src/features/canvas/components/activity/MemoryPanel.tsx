/**
 * MemoryPanel — Status / Recent / Conflicts / Unlinked UI shell.
 *
 * 데이터 연결은 memory 엔진 구현 단계에서 진행합니다.
 */
import { useTranslation } from "react-i18next";
import { Sparkles, AlertTriangle, Link, Activity, AlertCircle, FileText } from "lucide-react";
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
                  <span>AI 서사 분석 엔진</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">실시간 추적 중</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-fg">
                <div className="rounded border border-border/40 bg-background/50 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">분석 완료 원고</div>
                  <div className="text-sm font-semibold">4,250자 <span className="text-[10px] text-accent/80 font-normal">(3챕터)</span></div>
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">식별된 관계선</div>
                  <div className="text-sm font-semibold text-accent">18개 노드</div>
                </div>
              </div>
            </div>
          </div>
        </PanelSection>

        {/* 최근 분석 요약 */}
        <PanelSection title={t("canvas.memory.recent")} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            <div className="rounded-lg border border-border bg-card/30 p-2.5 text-xs hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-1.5 font-medium text-fg mb-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground animate-none" />
                <span>3챕터: 틈새의 비밀</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                리안이 지하실에서 발견한 오래된 문양을 통해 잃어버린 가문의 문장과의 연관성을 독백으로 추적함. 마커스의 등장으로 대화가 중단됨.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/30 p-2.5 text-xs hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-1.5 font-medium text-fg mb-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground animate-none" />
                <span>2챕터: 어둠 속의 의뢰인</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                바에서 붉은 코트를 입은 낯선 이와 비밀 대화를 나눈 마커스의 행적이 드러남. 두 인물 간 동맹과 떡밥 요소 동시 성립.
              </p>
            </div>
          </div>
        </PanelSection>

        {/* 설정 충돌 경고 */}
        <PanelSection title={t("canvas.memory.conflicts")} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>인물 나이 묘사 모순</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                1챕터에서 <span className="font-semibold text-foreground">17세</span>로 서술되었으나, 3챕터의 마커스와의 대화 중 <span className="font-semibold text-foreground">19세</span>로 언급되었습니다.
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400 mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>소지품 위치 모순</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                2챕터에서 <span className="font-semibold text-foreground">잃어버린 은장도</span>가 3챕터 격투 씬에서 다시 외투 속에 소지된 것으로 묘사되었습니다.
              </p>
            </div>
          </div>
        </PanelSection>

        {/* 미연결 단어 추천 */}
        <PanelSection title={t("canvas.memory.unlinked")} defaultOpen={false}>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/20 p-2 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-fg truncate">@에밀리아</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">3챕터 내 6회 등장 (등록되지 않은 인물)</span>
              </div>
              <button className="rounded bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
                추가
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card/20 p-2 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-fg truncate">#아르카디아 성채</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">2챕터 내 3회 등장 (등록되지 않은 용어)</span>
              </div>
              <button className="rounded bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
                추가
              </button>
            </div>
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

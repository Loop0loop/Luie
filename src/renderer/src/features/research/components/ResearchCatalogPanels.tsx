import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  GitBranch,
  StickyNote,
  Tag,
  type LucideIcon,
} from "lucide-react";
import MemoSection from "@renderer/features/research/components/MemoSection";
import { PlotBoard } from "@renderer/features/research/components/world/PlotBoard";
import { SynopsisEditor } from "@renderer/features/research/components/world/SynopsisEditor";
import { TermManager } from "@renderer/features/research/components/world/TermManager";
import { cn } from "@shared/types/utils";

type SubTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

function SubTabs({ tabs, activeTab, onChange }: {
  tabs: SubTab[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <nav className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-0 px-3 no-scrollbar" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs transition-colors",
              active ? "bg-element text-fg font-semibold" : "text-muted hover:bg-surface-hover hover:text-fg",
            )}
          >
            <Icon className="icon-xs" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function ResearchScrapPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"terms" | "memo">("terms");
  const tabs: SubTab[] = [
    { id: "terms", label: t("research.catalog.terms", "용어"), icon: Tag },
    { id: "memo", label: t("research.catalog.memo", "메모"), icon: StickyNote },
  ];

  return (
    <div className="research-surface flex h-full min-h-0 flex-col overflow-hidden">
      <SubTabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as "terms" | "memo")} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "terms" ? <TermManager /> : <MemoSection />}
      </div>
    </div>
  );
}

export function ResearchPlotboardPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"synopsis" | "plot">("synopsis");
  const tabs: SubTab[] = [
    { id: "synopsis", label: t("research.catalog.synopsis", "시놉시스"), icon: FileText },
    { id: "plot", label: t("research.catalog.plot", "플롯보드"), icon: GitBranch },
  ];

  return (
    <div className="research-surface flex h-full min-h-0 flex-col overflow-hidden">
      <SubTabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as "synopsis" | "plot")} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "synopsis" ? <SynopsisEditor /> : <PlotBoard />}
      </div>
    </div>
  );
}

export function UntitledResearchPanel() {
  // 스토리 라인은 후속 콘텐츠가 정해질 때까지 빈 작업 surface만 유지한다.
  return <div className="research-surface h-full min-h-0" />;
}

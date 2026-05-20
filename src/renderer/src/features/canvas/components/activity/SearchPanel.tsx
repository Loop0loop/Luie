/**
 * SearchPanel — 검색 입력 + 범위 토글.
 *
 * 전문 검색 연결은 search 기능 구현 단계에서 진행합니다.
 */
import { useTranslation } from "react-i18next";
import SearchInput from "@shared/ui/SearchInput";
import { History, Sparkles } from "lucide-react";
import {
  MOCK_RECENT_SEARCH,
  MOCK_SEARCH_TIPS,
} from "../../constants/panel";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelEmpty,
  ToggleChip,
} from "./shared";

const SCOPE_KEYS = [
  { key: "chapters", i18nKey: "sidebar.section.manuscript" },
  { key: "characters", i18nKey: "research.title.characters" },
  { key: "terms", i18nKey: "research.title.world" },
  { key: "events", i18nKey: "research.title.events" },
] as const;

export default function SearchPanel() {
  const { t } = useTranslation();

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.search")} />
      <PanelBody>
        <div className="px-3 py-2">
          <SearchInput
            value=""
            onChange={() => undefined}
            placeholder={t("canvas.search.placeholder")}
            variant="context"
          />
        </div>

        {/* 검색 대상 범위 */}
        <PanelSection title={t("canvas.search.scope")}>
          <div className="grid grid-cols-2 gap-1.5 px-1 py-0.5">
            {SCOPE_KEYS.map(({ key, i18nKey }) => (
              <ToggleChip
                key={key}
                label={t(i18nKey)}
                checked
                onChange={() => undefined}
              />
            ))}
          </div>
        </PanelSection>

        {/* 최근 검색 기록 */}
        <PanelSection title={t("canvas.search.recentSearch")} defaultOpen>
          <div className="flex flex-col gap-1 px-3 pb-2 pt-0.5">
            {MOCK_RECENT_SEARCH.map((item) => (
              <div
                key={item.query}
                className="flex items-center justify-between text-xs text-muted-foreground py-1 hover:text-foreground cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="h-3 w-3 opacity-60" />
                  <span>{item.query}</span>
                </div>
                <span className="text-[10px] opacity-50">
                  {item.timestampKey === "canvas.search.recent.hoursAgo"
                    ? t(item.timestampKey, { count: item.timestampValue })
                    : t(item.timestampKey)}
                </span>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* 검색 팁 제안 */}
        <PanelSection title={t("canvas.search.tipsTitle")} defaultOpen>
          <div className="px-3 pb-3 pt-0.5">
            <div className="rounded-lg border border-accent/15 bg-accent/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-accent mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("canvas.search.smartTipsHeading")}</span>
              </div>
              <ul className="space-y-1.5 text-[10px] text-muted-foreground leading-relaxed">
                {MOCK_SEARCH_TIPS.map((tip) => (
                  <li key={tip.keywordKey}>
                    <strong className="text-foreground">{t(tip.keywordKey)}</strong>
                    {t(tip.descriptionKey)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PanelSection>

        <PanelSection title={t("canvas.search.results")} defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

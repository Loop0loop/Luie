/**
 * SearchPanel — 검색 입력 + 범위 토글.
 *
 * 전문 검색 연결은 search 기능 구현 단계에서 진행합니다.
 */
import { useTranslation } from "react-i18next";
import SearchInput from "@shared/ui/SearchInput";
import { History, Sparkles } from "lucide-react";
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
        <PanelSection title="최근 검색어" defaultOpen>
          <div className="flex flex-col gap-1 px-3 pb-2 pt-0.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground py-1 hover:text-foreground cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <History className="h-3 w-3 opacity-60" />
                <span>리안의 눈물</span>
              </div>
              <span className="text-[10px] opacity-50">방금 전</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground py-1 hover:text-foreground cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <History className="h-3 w-3 opacity-60" />
                <span>붉은 코트</span>
              </div>
              <span className="text-[10px] opacity-50">3시간 전</span>
            </div>
          </div>
        </PanelSection>

        {/* 검색 팁 제안 */}
        <PanelSection title="검색 팁" defaultOpen>
          <div className="px-3 pb-3 pt-0.5">
            <div className="rounded-lg border border-accent/15 bg-accent/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-accent mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>문맥 스마트 검색 활용하기</span>
              </div>
              <ul className="space-y-1.5 text-[10px] text-muted-foreground leading-relaxed">
                <li>
                  <strong className="text-foreground">@인물명</strong>을 붙여 인물의 등장 씬이나 대화록만 골라내어 찾을 수 있습니다.
                </li>
                <li>
                  <strong className="text-foreground">#용어명</strong>으로 세계관 설정 카드와 정의된 문서를 바로 열어봅니다.
                </li>
                <li>
                  쌍따옴표(<strong className="text-foreground">"말투"</strong>)를 이용해 특정 대사의 정확한 표현 방식을 고정 검색합니다.
                </li>
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

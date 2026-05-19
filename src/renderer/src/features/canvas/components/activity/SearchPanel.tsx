/**
 * SearchPanel — 검색 입력 + 범위 토글.
 *
 * 전문 검색 연결은 search 기능 구현 단계에서 진행합니다.
 */
import { useTranslation } from "react-i18next";
import SearchInput from "@shared/ui/SearchInput";
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
        <div className="px-control-x pb-3 pt-2">
          <SearchInput
            value=""
            onChange={() => undefined}
            placeholder={t("canvas.search.placeholder")}
            variant="context"
          />
        </div>

        <PanelSection title={t("canvas.search.scope")}>
          {SCOPE_KEYS.map(({ key, i18nKey }) => (
            <ToggleChip
              key={key}
              label={t(i18nKey)}
              checked
              onChange={() => undefined}
            />
          ))}
        </PanelSection>

        <PanelSection title={t("canvas.search.results")} defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

/**
 * SearchPanel — search input + scope toggle checkboxes.
 *
 * P4: UI shell only. Full-text search wiring deferred to the search feature
 * implementation milestone.
 */
import { useTranslation } from "react-i18next";
import SearchInput from "@shared/ui/SearchInput";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelEmpty,
} from "./shared";

export default function SearchPanel() {
  const { t } = useTranslation();
  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.search")} />
      <PanelBody>
        {/* Search input */}
        <div className="px-4 pb-2">
          <SearchInput
            value=""
            onChange={() => undefined}
            placeholder={t("canvas.activity.search")}
            variant="context"
          />
        </div>

        {/* Scope toggles */}
        <PanelSection title="SCOPE">
          {(
            [
              { key: "chapters", label: t("sidebar.section.manuscript") },
              { key: "characters", label: t("research.title.characters") },
              { key: "terms", label: t("research.title.world") },
              { key: "events", label: t("research.title.events") },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2.5 px-4 py-1.5 pl-9 text-[13px] text-muted cursor-pointer hover:text-fg hover:bg-surface-hover transition-all"
            >
              <input
                type="checkbox"
                defaultChecked
                className="accent-accent"
                onChange={() => undefined}
              />
              <span className="truncate">{label}</span>
            </label>
          ))}
        </PanelSection>

        {/* Results placeholder */}
        <PanelSection title="RESULTS" defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

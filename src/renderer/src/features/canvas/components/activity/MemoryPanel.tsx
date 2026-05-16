/**
 * MemoryPanel — Status / Recent / Conflicts / Unlinked UI shell.
 *
 * P4: layout + section structure only. Data wiring deferred to the memory
 * engine feature (separate implementation milestone).
 */
import { useTranslation } from "react-i18next";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelEmpty,
} from "./shared";

export default function MemoryPanel() {
  const { t } = useTranslation();
  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.memory")} />
      <PanelBody>
        <PanelSection title="STATUS">
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title="RECENT" defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title="CONFLICTS" defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title="UNLINKED" defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

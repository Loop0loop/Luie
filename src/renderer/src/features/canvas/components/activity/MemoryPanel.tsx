/**
 * MemoryPanel — Status / Recent / Conflicts / Unlinked UI shell.
 *
 * 데이터 연결은 memory 엔진 구현 단계에서 진행합니다.
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
        <PanelSection title={t("canvas.memory.status")}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title={t("canvas.memory.recent")} defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title={t("canvas.memory.conflicts")} defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
        <PanelSection title={t("canvas.memory.unlinked")} defaultOpen={false}>
          <PanelEmpty message={t("canvas.status.empty")} />
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

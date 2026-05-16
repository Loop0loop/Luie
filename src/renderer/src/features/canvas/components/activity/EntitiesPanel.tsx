/**
 * EntitiesPanel — lists Characters, Terms (Concepts/Items), Events, Factions
 * from existing stores. Clicking an entity will wire to BinderBar in P6.
 */
import { useTranslation } from "react-i18next";
import { User, BookOpen, Calendar, Shield } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelItem,
  PanelEmpty,
} from "./shared";

export default function EntitiesPanel() {
  const { t } = useTranslation();

  const currentProjectId = useProjectStore(
    (state) => state.currentItem?.id ?? null,
  );

  const characters = useCharacterStore(
    useShallow((state) =>
      state.items.filter((c) => c.projectId === currentProjectId),
    ),
  );
  const terms = useTermStore(
    useShallow((state) =>
      state.items.filter((term) => term.projectId === currentProjectId),
    ),
  );
  const events = useEventStore(
    useShallow((state) =>
      state.items.filter((ev) => ev.projectId === currentProjectId),
    ),
  );
  const factions = useFactionStore(
    useShallow((state) =>
      state.items.filter((f) => f.projectId === currentProjectId),
    ),
  );

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.entities")} />
      <PanelBody>
        {/* Characters */}
        <PanelSection title={t("research.title.characters")}>
          {characters.length === 0 ? (
            <PanelEmpty message={t("canvas.status.empty")} />
          ) : (
            characters.map((c) => (
              <PanelItem
                key={c.id}
                label={c.name}
                icon={<User className="icon-sm text-muted" />}
                // P6: onClick → canvasViewStore.selectNode + open BinderBar
              />
            ))
          )}
        </PanelSection>

        {/* Terms (Concepts / Items) */}
        <PanelSection title={t("research.title.world")} defaultOpen={false}>
          {terms.length === 0 ? (
            <PanelEmpty message={t("canvas.status.empty")} />
          ) : (
            terms.map((term) => (
              <PanelItem
                key={term.id}
                label={term.term}
                icon={<BookOpen className="icon-sm text-muted" />}
              />
            ))
          )}
        </PanelSection>

        {/* Events */}
        <PanelSection title={t("research.title.events")} defaultOpen={false}>
          {events.length === 0 ? (
            <PanelEmpty message={t("canvas.status.empty")} />
          ) : (
            events.map((ev) => (
              <PanelItem
                key={ev.id}
                label={ev.name}
                icon={<Calendar className="icon-sm text-muted" />}
              />
            ))
          )}
        </PanelSection>

        {/* Factions */}
        <PanelSection title={t("research.title.factions")} defaultOpen={false}>
          {factions.length === 0 ? (
            <PanelEmpty message={t("canvas.status.empty")} />
          ) : (
            factions.map((f) => (
              <PanelItem
                key={f.id}
                label={f.name}
                icon={<Shield className="icon-sm text-muted" />}
              />
            ))
          )}
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}

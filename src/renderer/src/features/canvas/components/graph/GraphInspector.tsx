import { X, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGraphStore } from "../../stores/graph/graphStore";
import { CANVAS_GRAPH_I18N } from "../../constants/i18n";

export default function GraphInspector() {
  const { t } = useTranslation();
  const { focusId, setFocusId } = useGraphStore();

  if (!focusId) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 flex w-72 flex-col rounded-control border border-border bg-panel text-popover-fg shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold tracking-tight">{t(CANVAS_GRAPH_I18N.inspector)}</h3>
        <button
          type="button"
          onClick={() => setFocusId(null)}
          className="rounded-control p-1 text-muted transition-colors hover:bg-muted hover:text-fg"
        >
          <X className="icon-xs" />
        </button>
      </div>

      <div className="flex flex-col gap-panel-gap p-panel-pad text-sm">
        <div>
          <div className="mb-1 text-xs text-muted">{t(CANVAS_GRAPH_I18N.selectedEntity)}</div>
          <div className="font-medium">{t(CANVAS_GRAPH_I18N.entityPlaceholder)}</div>
        </div>

        <div>
          <div className="mb-1 text-xs text-muted">{t(CANVAS_GRAPH_I18N.relations)}</div>
          <ul className="flex flex-col gap-1.5 text-xs">
            <li className="flex items-center justify-between rounded-control bg-muted px-control-x py-control-y">
              <span>{t(CANVAS_GRAPH_I18N.relationConflict)}</span>
              <span className="text-muted">{t(CANVAS_GRAPH_I18N.relationConflict)}</span>
            </li>
            <li className="flex items-center justify-between rounded-control bg-muted px-control-x py-control-y">
              <span>{t(CANVAS_GRAPH_I18N.relationAlly)}</span>
              <span className="text-muted">{t(CANVAS_GRAPH_I18N.relationAlly)}</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-control bg-accent px-panel-pad py-control-y text-xs font-medium text-on-accent transition-colors hover:bg-accent/90"
        >
          <ExternalLink className="icon-xs" />
          {t(CANVAS_GRAPH_I18N.openInBinder)}
        </button>
      </div>
    </div>
  );
}

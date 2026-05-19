
import { X, ExternalLink } from "lucide-react";
import { useGraphStore } from "../../stores/graph/graphStore";

export default function GraphInspector() {
  const { focusId, setFocusId } = useGraphStore();

  if (!focusId) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 flex w-72 flex-col rounded-lg border border-border bg-popover text-popover-fg shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold tracking-tight">Inspector</h3>
        <button
          type="button"
          onClick={() => setFocusId(null)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-fg"
        >
          <X className="icon-xs" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Selected Entity</div>
          <div className="font-medium">Character / Entity Name</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Relations</div>
          <ul className="flex flex-col gap-1.5 text-xs">
            <li className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5">
              <span>Relation A</span>
              <span className="text-muted-foreground">Conflict</span>
            </li>
            <li className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5">
              <span>Relation B</span>
              <span className="text-muted-foreground">Ally</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-xs font-medium text-primary-fg transition-colors hover:bg-primary/90"
        >
          <ExternalLink className="icon-xs" />
          Open in Binder
        </button>
      </div>
    </div>
  );
}

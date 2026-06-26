/**
 * EntityVisualPanel — read-only visualization composer.
 *
 * Layout (vertical scroll):
 *   A. RelationGraph     — reactflow node graph (entity + connected items)
 *   B. IdentityCard      — declarative one-line summary
 *   C. RelatedEntities   — grouped grid of connected items
 *
 * Data is provided by `useEntityVisualData` through narrative memory query.
 */

import { RelationGraph } from "./RelationGraph";
import { IdentityCard } from "./IdentityCard";
import { RelatedEntities } from "./RelatedEntities";
import { useEntityVisualData } from "./useEntityVisualData";
import type { EntityKind } from "./types";
import { useState } from "react";

type EntityVisualPanelProps = {
  kind: EntityKind;
  id: string;
  name: string;
  chapterId?: string;
};

export function EntityVisualPanel({
  kind,
  id,
  name,
  chapterId,
}: EntityVisualPanelProps) {
  const [memoryScope, setMemoryScope] = useState<"current-only" | "with-prior">(
    "current-only",
  );
  const includePriorMemory = memoryScope === "with-prior";
  const scopeControlId = `entity-visual-memory-scope-${id}`;

  const bundle = useEntityVisualData(
    kind,
    id,
    name,
    chapterId,
    includePriorMemory,
  );

  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-panel border border-border bg-surface px-2 py-1">
          <label htmlFor={scopeControlId} className="text-[11px] text-muted">
            Memory
          </label>
          <select
            id={scopeControlId}
            value={memoryScope}
            onChange={(e) =>
              setMemoryScope(e.target.value as "current-only" | "with-prior")
            }
            className="h-6 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="current-only">현재 챕터만</option>
            <option value="with-prior">현재+과거</option>
          </select>
        </div>
      </div>
      <RelationGraph
        centerName={name}
        centerKind={kind}
        related={bundle.related}
      />
      <IdentityCard
        kind={kind}
        name={name}
        identityLine={bundle.identityLine}
        profile={bundle.profile}
      />
      <RelatedEntities related={bundle.related} />
    </div>
  );
}

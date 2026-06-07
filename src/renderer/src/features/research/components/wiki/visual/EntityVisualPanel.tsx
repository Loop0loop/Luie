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

type EntityVisualPanelProps = {
  kind: EntityKind;
  id: string;
  name: string;
  chapterId?: string;
};

export function EntityVisualPanel({ kind, id, name, chapterId }: EntityVisualPanelProps) {
  const bundle = useEntityVisualData(kind, id, name, chapterId);

  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      <RelationGraph centerName={name} centerKind={kind} related={bundle.related} />
      <IdentityCard kind={kind} name={name} identityLine={bundle.identityLine} />
      <RelatedEntities related={bundle.related} />
    </div>
  );
}

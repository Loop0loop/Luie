/**
 * ConnectedMemosSection — 연결된 메모/이벤트 섹션
 */

import type { TFunction } from "i18next";
import { HelpCircle } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";

interface ConnectedMemosSectionProps {
  items: WorldGraphNode[];
  t: TFunction;
}

export function ConnectedMemosSection({
  items,
  t,
}: ConnectedMemosSectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <HelpCircle className="h-4 w-4 text-muted" />
        <h4 className="text-xs font-semibold text-fg/80">
          {t("canvas.graph.relations")}
        </h4>
      </div>
      {items.length === 0 ? (
        <p className="pl-5 text-xs italic text-muted">
          {t("canvas.status.empty")}
        </p>
      ) : (
        <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-fg/70">
          {items.map((item) => (
            <li key={item.id} className="marker:text-accent/60">
              <span className="font-semibold text-fg/80">
                [{t(`canvas.node.kind.${item.entityType.toLowerCase()}` as never)}]
              </span>{" "}
              {item.name}
              {item.description && (
                <span className="block pl-2 text-[11px] text-muted">
                  {item.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

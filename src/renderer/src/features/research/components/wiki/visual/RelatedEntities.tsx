/**
 * Related entities section — 3-column read-only grid grouped by kind.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link2 } from "lucide-react";
import { ENTITY_KIND_ICON, ENTITY_KIND_LABEL_KEY, ENTITY_KIND_TINT } from "./constants";
import type { EntityKind, RelatedItem } from "./types";

const COLUMN_ORDER: EntityKind[] = ["character", "faction", "event"];

type RelatedColumnProps = {
  title: string;
  emptyLabel: string;
  items: RelatedItem[];
};

function RelatedColumn({ title, emptyLabel, items }: RelatedColumnProps) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-semibold text-muted/50 uppercase tracking-widest">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted/30">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const Icon = ENTITY_KIND_ICON[item.kind];
            const tint = ENTITY_KIND_TINT[item.kind];
            return (
              <li
                key={`${item.kind}-${item.name}`}
                className="rounded-lg border border-border/50 bg-surface-hover/50 px-3 py-2 flex items-center gap-2.5 hover:border-border transition-colors"
              >
                <div
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${tint}18` }}
                >
                  <Icon size={13} style={{ color: tint }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-fg truncate">{item.name}</div>
                  <div className="text-[11px] text-muted/60 truncate">{item.role}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type RelatedEntitiesProps = {
  related: RelatedItem[];
};

export function RelatedEntities({ related }: RelatedEntitiesProps) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map: Record<EntityKind, RelatedItem[]> = {
      character: [],
      event: [],
      faction: [],
    };
    for (const item of related) map[item.kind].push(item);
    return map;
  }, [related]);

  const emptyLabel = t("entityVisual.related.empty");

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
        <Link2 size={12} className="text-muted" />
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
          {t("entityVisual.related.title")}
        </span>
      </header>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {COLUMN_ORDER.map((kind) => (
          <RelatedColumn
            key={kind}
            title={t(ENTITY_KIND_LABEL_KEY[kind])}
            emptyLabel={emptyLabel}
            items={grouped[kind]}
          />
        ))}
      </div>
    </section>
  );
}

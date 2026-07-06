/**
 * ConnectedCharactersSection — 연결된 등장인물 섹션
 */

import type { TFunction } from "i18next";
import { User } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";

interface ConnectedCharactersSectionProps {
  characters: WorldGraphNode[];
  t: TFunction;
}

export function ConnectedCharactersSection({
  characters,
  t,
}: ConnectedCharactersSectionProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <User className="h-4 w-4 text-muted" />
        <h4 className="text-xs font-semibold text-fg/80">
          {t("canvas.graph.character")}
        </h4>
      </div>
      {characters.length === 0 ? (
        <p className="pl-5 text-xs italic text-muted">
          {t("canvas.status.empty")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 pl-5">
          {characters.map((char) => (
            <span
              key={char.id}
              className="rounded border border-border/40 bg-surface px-2 py-0.5 text-xs text-fg/80"
            >
              {char.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

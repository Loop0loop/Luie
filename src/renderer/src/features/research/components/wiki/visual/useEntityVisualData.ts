import { useEffect, useMemo, useState } from "react";
import { api } from "@shared/api";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { EntityKind, EntityVisualBundle } from "./types";

const EMPTY_BUNDLE: EntityVisualBundle = {
  identityLine: "근거 있는 관계 메모리 없음",
  related: [],
};

function buildQuestion(kind: EntityKind, name: string): string {
  return `${kind}:${name}의 현재 관계를 근거와 함께 알려줘`;
}

function toEntityKind(value: string | null): EntityKind {
  if (value === "event") return "event";
  if (value === "faction" || value === "organization") return "faction";
  return "character";
}

export function useEntityVisualData(
  kind: EntityKind,
  id: string,
  name: string,
  chapterId?: string,
): EntityVisualBundle {
  const projectId = useWorldBuildingStore((state) => state.activeProjectId);
  const [bundle, setBundle] = useState<EntityVisualBundle>(EMPTY_BUNDLE);

  useEffect(() => {
    let cancelled = false;
    if (!projectId || !id) {
      return () => {
        cancelled = true;
      };
    }

    void api.memory
      .queryNarrative({
        projectId,
        question: buildQuestion(kind, name),
        chapterId,
        entityName: name,
        entityType: kind,
      })
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        if (!response.success || !data || data.facts.length === 0) {
          setBundle(EMPTY_BUNDLE);
          return;
        }

        const related = data.facts.slice(0, 8).map((fact) => ({
          kind: toEntityKind(fact.relatedEntityType),
          name: fact.relatedEntityName ?? fact.relatedEntityId ?? fact.objectValue ?? fact.subjectEntityId,
          role: [
            fact.predicate,
            fact.status,
            fact.evidenceCount > 0 ? "근거 있음" : "검토 필요",
          ].join(" · "),
        }));

        setBundle({
          identityLine: `${data.intent} · ${data.status}`,
          related,
        });
      })
      .catch(() => {
        if (!cancelled) setBundle(EMPTY_BUNDLE);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, id, kind, name, projectId]);

  return useMemo(() => (projectId && id ? bundle : EMPTY_BUNDLE), [bundle, id, projectId]);
}

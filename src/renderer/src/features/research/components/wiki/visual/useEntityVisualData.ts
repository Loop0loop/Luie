import { useEffect, useMemo, useState } from "react";
import { api } from "@shared/api";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { EntityKind, EntityVisualBundle } from "./types";

const EMPTY_BUNDLE: EntityVisualBundle = {
  identityLine: "근거 있는 관계 메모리 없음",
  related: [],
};

function buildQuestion(
  kind: EntityKind,
  name: string,
  includePriorMemory: boolean,
): string {
  if (includePriorMemory) {
    return `${kind}:${name}의 현재 및 과거 관계를 근거와 함께 알려줘`;
  }
  return `${kind}:${name}의 현재 관계를 근거와 함께 알려줘`;
}

function toEntityKind(value: string | null): EntityKind {
  if (value === "event") return "event";
  if (value === "faction" || value === "organization") return "faction";
  return "character";
}

function formatProfileIdentityLine(profile: {
  status: string;
  aliasCount: number;
  mentionCount: number;
  firstMentionChapterOrder: number | null;
  lastMentionChapterOrder: number | null;
}): string {
  const aliases =
    profile.aliasCount > 0 ? `${profile.aliasCount}개 별칭` : "별칭 없음";
  const mentions =
    profile.mentionCount > 0
      ? `출현 ${profile.mentionCount}회`
      : "출현 기록 없음";
  const range =
    profile.firstMentionChapterOrder !== null && profile.lastMentionChapterOrder !== null
      ? `${profile.firstMentionChapterOrder}~${profile.lastMentionChapterOrder}화`
      : null;

  return `${profile.status} · ${aliases} · ${mentions}${range ? ` · ${range}` : ""}`;
}

function pickRelatedName(fact: { relatedEntityName: string | null; objectValue: string | null }): string | null {
  if (fact.relatedEntityName) return fact.relatedEntityName;
  return fact.objectValue ?? null;
}

export function useEntityVisualData(
  kind: EntityKind,
  id: string,
  name: string,
  chapterId?: string,
  includePriorMemory = false,
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
        question: buildQuestion(kind, name, includePriorMemory),
        chapterId,
        entityName: name,
        entityType: kind,
        includePriorMemory,
      })
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        if (!response.success || !data) {
          setBundle(EMPTY_BUNDLE);
          return;
        }

        const profile = data.profiles?.[0];

        const relatedEntries = data.facts
          .map((fact) => {
            const relatedName = pickRelatedName(fact);
            if (!relatedName) return null;
            return {
              kind: toEntityKind(fact.relatedEntityType),
              name: relatedName,
              role: [
                fact.predicate,
                fact.status,
                fact.evidenceCount > 0 ? "근거 있음" : "검토 필요",
              ].join(" · "),
            };
          })
          .filter((item): item is { kind: EntityKind; name: string; role: string } => Boolean(item))
          .slice(0, 8);
        const relatedByName = new Map<string, { kind: EntityKind; name: string; role: string }>();
        for (const item of relatedEntries) {
          const key = `${item.kind}:${item.name}`;
          if (!relatedByName.has(key)) {
            relatedByName.set(key, item);
          }
        }

        setBundle({
          identityLine: profile
            ? formatProfileIdentityLine(profile)
            : data.facts.length > 0
              ? `${data.intent} · ${data.status}`
              : EMPTY_BUNDLE.identityLine,
          related: [...relatedByName.values()],
        });
      })
      .catch(() => {
        if (!cancelled) setBundle(EMPTY_BUNDLE);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, id, includePriorMemory, kind, name, projectId]);

  return useMemo(
    () => (projectId && id ? bundle : EMPTY_BUNDLE),
    [bundle, id, projectId],
  );
}

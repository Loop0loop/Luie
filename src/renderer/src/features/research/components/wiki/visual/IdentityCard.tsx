/**
 * Identity card — declarative one-line summary of the entity.
 *
 * Shape: "<name>은(는) <identityLine>이다."
 * Particles come from i18n (so en/ja just render without Korean particles).
 */

import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { ENTITY_KIND_ICON, ENTITY_KIND_LABEL_KEY, ENTITY_KIND_TINT } from "./constants";
import type { EntityKind, EntityVisualProfileSummary } from "./types";

type IdentityCardProps = {
  kind: EntityKind;
  name: string;
  identityLine: string;
  profile?: EntityVisualProfileSummary;
};

function formatMentionRange(profile: EntityVisualProfileSummary): string {
  if (
    profile.firstMentionChapterOrder === null ||
    profile.lastMentionChapterOrder === null
  ) {
    return "출현 범위 없음";
  }
  return `${profile.firstMentionChapterOrder}~${profile.lastMentionChapterOrder}화`;
}

export function IdentityCard({ kind, name, identityLine, profile }: IdentityCardProps) {
  const { t } = useTranslation();
  const Icon = ENTITY_KIND_ICON[kind];
  const tint = ENTITY_KIND_TINT[kind];
  const kindLabel = t(ENTITY_KIND_LABEL_KEY[kind]);

  return (
    <section className="rounded-panel border border-border bg-surface overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
        <Sparkles size={12} className="text-muted" />
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
          {t("entityVisual.identity.title")}
        </span>
      </header>
      <div className="px-6 py-7 flex items-start gap-4">
        <div
          className="shrink-0 w-12 h-12 rounded-panel flex items-center justify-center"
          style={{ backgroundColor: `${tint}18` }}
        >
          <Icon size={22} style={{ color: tint }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-muted/60 mb-1.5">
            {kindLabel} · {t("entityVisual.identity.summarySuffix")}
          </p>
          <h3 className="text-[18px] font-semibold text-fg leading-snug">
            <span style={{ color: tint }}>{name}</span>
            <span className="text-muted/70">{t("entityVisual.identity.isVerb")}</span>
            {identityLine}
            <span className="text-muted/70">{t("entityVisual.identity.endingParticle")}</span>
          </h3>
          {profile ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-control border border-border/70 bg-panel px-2 py-1 text-[11px] text-muted">
                  {profile.status}
                </span>
                <span className="rounded-control border border-border/70 bg-panel px-2 py-1 text-[11px] text-muted">
                  출현 {profile.mentionCount}회
                </span>
                <span className="rounded-control border border-border/70 bg-panel px-2 py-1 text-[11px] text-muted">
                  {formatMentionRange(profile)}
                </span>
              </div>
              {profile.aliases.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="rounded-control bg-surface-hover px-2 py-1 text-[11px] text-fg"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

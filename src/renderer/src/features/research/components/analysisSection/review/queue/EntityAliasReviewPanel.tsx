import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalysisEntityAliasReviewItem } from "../../shared/types";

type EntityAliasReviewPanelProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  items: AnalysisEntityAliasReviewItem[];
  mutatingAliasId: string | null;
  onToggle: () => void;
  onConfirm: (item: AnalysisEntityAliasReviewItem) => void;
  onReject: (item: AnalysisEntityAliasReviewItem) => void;
  onMerge: (item: AnalysisEntityAliasReviewItem, targetEntityId: string) => void;
  onSplit: (item: AnalysisEntityAliasReviewItem, canonicalName: string) => void;
};

const formatAlias = (item: AnalysisEntityAliasReviewItem): string =>
  `${item.canonicalName} = ${item.alias}`;

export function EntityAliasReviewPanel({
  visible,
  loading,
  error,
  items,
  mutatingAliasId,
  onToggle,
  onConfirm,
  onReject,
  onMerge,
  onSplit,
}: EntityAliasReviewPanelProps) {
  const { t } = useTranslation();
  const [targetEntityIds, setTargetEntityIds] = useState<Record<string, string>>({});
  const [canonicalNames, setCanonicalNames] = useState<Record<string, string>>({});

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left text-fg"
      >
        <span className="font-medium">{t("analysis.review.queue.alias.title")}</span>
        {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {visible && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-muted">{t("analysis.review.queue.alias.loading")}</div>
          ) : error ? (
            <div className="text-danger">⚠️ {error}</div>
          ) : items.length === 0 ? (
            <div className="text-muted">{t("analysis.review.queue.alias.empty")}</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded border border-border bg-panel/60 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                     <div className="font-medium text-fg/90">{formatAlias(item)}</div>
                    <div className="mt-1 text-muted">
                      {item.entityType} · entity {item.entityStatus}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(item)}
                      disabled={mutatingAliasId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-success disabled:opacity-50"
                      title={t("analysis.review.queue.alias.confirm")}
                      aria-label={`${formatAlias(item)} ${t("analysis.review.queue.alias.confirm")}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      disabled={mutatingAliasId === item.id}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:text-danger disabled:opacity-50"
                      title={t("analysis.review.queue.alias.reject")}
                      aria-label={`${formatAlias(item)} ${t("analysis.review.queue.alias.reject")}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span>{item.status}</span>
                  <span>{item.normalizedAlias}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={targetEntityIds[item.id] ?? ""}
                    onChange={(event) =>
                      setTargetEntityIds((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="targetEntityId"
                    className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-fg placeholder:text-muted"
                    aria-label={`${formatAlias(item)} targetEntityId`}
                  />
                  <button
                    type="button"
                    onClick={() => onMerge(item, (targetEntityIds[item.id] ?? "").trim())}
                    disabled={mutatingAliasId === item.id || !(targetEntityIds[item.id] ?? "").trim()}
                    className="shrink-0 rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-fg disabled:opacity-50"
                  >
                    {t("analysis.review.queue.alias.merge")}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={canonicalNames[item.id] ?? item.alias}
                    onChange={(event) =>
                      setCanonicalNames((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="canonicalName"
                    className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-fg placeholder:text-muted"
                    aria-label={`${formatAlias(item)} canonicalName`}
                  />
                  <button
                    type="button"
                    onClick={() => onSplit(item, (canonicalNames[item.id] ?? item.alias).trim())}
                    disabled={mutatingAliasId === item.id || !(canonicalNames[item.id] ?? item.alias).trim()}
                    className="shrink-0 rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-fg disabled:opacity-50"
                  >
                    {t("analysis.review.queue.alias.split")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

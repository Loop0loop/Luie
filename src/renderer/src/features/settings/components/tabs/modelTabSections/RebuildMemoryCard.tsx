import { Button } from "@renderer/components/ui/button";

import type { ModelTabProps } from "./types";

interface RebuildMemoryCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  onRebuildMemory: ModelTabProps["onRebuildMemory"];
}

export function RebuildMemoryCard({
  t,
  isBusy,
  onRebuildMemory,
}: RebuildMemoryCardProps) {
  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-2">
      <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.rebuildMemory.title")}</p>
      <p className="text-xs text-muted">{t("settings.localLlm.rebuildMemory.description")}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void onRebuildMemory()}
        disabled={isBusy}
        className="w-full"
      >
        {t("settings.localLlm.rebuildMemory.start")}
      </Button>
    </div>
  );
}

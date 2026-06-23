import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

import type { ModelTabProps } from "./types";

interface ApiKeysCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  openaiApiKey: string;
  geminiApiKey: string;
  onSaveLlmKeys: ModelTabProps["onSaveLlmKeys"];
}

export function ApiKeysCard({
  t,
  isBusy,
  openaiApiKey,
  geminiApiKey,
  onSaveLlmKeys,
}: ApiKeysCardProps) {
  const [inputOpenaiApiKey, setInputOpenaiApiKey] = useState(openaiApiKey);
  const [inputGeminiApiKey, setInputGeminiApiKey] = useState(geminiApiKey);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-fg-secondary">
          {t("settings.localLlm.apiKeys.title")}
        </p>
        <p className="text-xs text-muted">
          {t("settings.localLlm.apiKeys.desc")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-fg-secondary" htmlFor="openai-api-key">
            {t("settings.localLlm.apiKeys.openaiKey")}
          </label>
          <div className="relative flex items-center">
            <input
              id="openai-api-key"
              type={showOpenaiKey ? "text" : "password"}
              value={inputOpenaiApiKey}
              onChange={(e) => setInputOpenaiApiKey(e.target.value)}
              placeholder={t("settings.localLlm.apiKeys.placeholder")}
              className="w-full rounded-control border border-border bg-panel pl-control-x pr-10 py-control-y text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              className="absolute right-2 text-muted hover:text-fg-secondary focus:outline-none"
            >
              {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-fg-secondary" htmlFor="gemini-api-key">
            {t("settings.localLlm.apiKeys.geminiKey")}
          </label>
          <div className="relative flex items-center">
            <input
              id="gemini-api-key"
              type={showGeminiKey ? "text" : "password"}
              value={inputGeminiApiKey}
              onChange={(e) => setInputGeminiApiKey(e.target.value)}
              placeholder={t("settings.localLlm.apiKeys.placeholder")}
              className="w-full rounded-control border border-border bg-panel pl-control-x pr-10 py-control-y text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-2 text-muted hover:text-fg-secondary focus:outline-none"
            >
              {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            savingKeys ||
            isBusy ||
            (inputOpenaiApiKey === openaiApiKey &&
              inputGeminiApiKey === geminiApiKey)
          }
          onClick={async () => {
            setSavingKeys(true);
            await onSaveLlmKeys(inputOpenaiApiKey, inputGeminiApiKey);
            setSavingKeys(false);
          }}
          className="w-full mt-2"
        >
          {savingKeys ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="ml-1.5">{t("settings.localLlm.apiKeys.saving")}</span>
            </>
          ) : (
            t("settings.localLlm.apiKeys.save")
          )}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

import type { ModelTabProps, OllamaConfig } from "./types";

interface OllamaEndpointCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  ollamaConfig: OllamaConfig;
  onSaveOllamaConfig: ModelTabProps["onSaveOllamaConfig"];
}

export function OllamaEndpointCard({
  t,
  isBusy,
  ollamaConfig,
  onSaveOllamaConfig,
}: OllamaEndpointCardProps) {
  const [baseUrl, setBaseUrl] = useState(ollamaConfig.baseUrl);
  const [chatModel, setChatModel] = useState(ollamaConfig.chatModel);
  const [apiKey, setApiKey] = useState(ollamaConfig.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDirty =
    baseUrl !== ollamaConfig.baseUrl ||
    chatModel !== ollamaConfig.chatModel ||
    apiKey !== ollamaConfig.apiKey;

  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-fg-secondary">
          {t("settings.localLlm.ollama.title")}
        </p>
        <p className="text-xs text-muted">{t("settings.localLlm.ollama.desc")}</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-fg-secondary" htmlFor="ollama-base-url">
            {t("settings.localLlm.ollama.baseUrl")}
          </label>
          <input
            id="ollama-base-url"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full rounded-control border border-border-strong bg-panel px-control-x py-control-y text-xs text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-fg-secondary" htmlFor="ollama-chat-model">
            {t("settings.localLlm.ollama.chatModel")}
          </label>
          <input
            id="ollama-chat-model"
            type="text"
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value)}
            placeholder={t("settings.localLlm.ollama.chatModelPlaceholder")}
            className="w-full rounded-control border border-border-strong bg-panel px-control-x py-control-y text-xs text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-fg-secondary" htmlFor="ollama-api-key">
            {t("settings.localLlm.ollama.apiKey")}
          </label>
          <div className="relative flex items-center">
            <input
              id="ollama-api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("settings.localLlm.ollama.apiKeyPlaceholder")}
              className="w-full rounded-control border border-border-strong bg-panel pl-control-x pr-10 py-control-y text-xs text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 text-muted hover:text-fg-secondary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-control"
              aria-label={t("settings.localLlm.ollama.apiKey")}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving || isBusy || !isDirty || !baseUrl.trim()}
          onClick={async () => {
            setSaving(true);
            await onSaveOllamaConfig({ baseUrl, chatModel, apiKey });
            setSaving(false);
          }}
          className="w-full mt-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="ml-1.5">{t("settings.localLlm.ollama.saving")}</span>
            </>
          ) : (
            t("settings.localLlm.ollama.save")
          )}
        </Button>
      </div>
    </div>
  );
}

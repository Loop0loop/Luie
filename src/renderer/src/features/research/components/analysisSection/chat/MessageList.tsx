import { AlertCircle, Bot, BookOpen, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Message } from "../shared/types";
import { answerModeLabel, safetyLabel, safetyTone } from "../runtime/runtimeHelpers";
import type { RagQaSafetyLabel } from "@shared/types";

type MessageListProps = {
  messages: Message[];
  onJumpEvidence: (item: {
    chunkId: string;
    chapterId: string | null;
    quote: string;
  }) => Promise<void>;
};

function evidenceLocationLabel(evidence: { chapterId: string | null; offset: number }): string {
  const offsetLabel = `offset ${evidence.offset}`;
  return evidence.chapterId ? `${evidence.chapterId} · ${offsetLabel}` : offsetLabel;
}

function messageSafetyLabel(message: Message): RagQaSafetyLabel | "unknown" | null {
  if (!message.safety) return null;
  if (
    message.role === "assistant" &&
    message.safety.label === "confirmed" &&
    (!message.evidence || message.evidence.length === 0)
  ) {
    return "insufficient_evidence";
  }
  return message.safety.label;
}

export function MessageList({ messages, onJumpEvidence }: MessageListProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {messages.map((msg) => {
        const effectiveSafetyLabel = messageSafetyLabel(msg);

        return (
          <div
            key={msg.id}
            className={`flex gap-3 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-element border border-border flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
            <div
              className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}
            >
              {msg.role === "assistant" && msg.evidence && msg.evidence.length > 0 && (
                <div className="mb-2 space-y-1.5 pl-1">
                  {msg.evidence.map((ev, index) => (
                    <button
                      key={ev.chunkId}
                      onClick={() => void onJumpEvidence(ev)}
                      className="block w-full rounded border border-border bg-element/30 px-2.5 py-1.5 text-left text-[11px] text-muted/80 transition-all duration-150 hover:border-accent/30 hover:bg-element-hover hover:text-accent"
                      title={ev.quote}
                    >
                      <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] text-muted/60">
                        <BookOpen className="w-3 h-3 shrink-0" />
                        {t("analysis.chat.evidenceCount", { index: index + 1 })}
                        <span aria-hidden="true">·</span>
                        {evidenceLocationLabel(ev)}
                        <span aria-hidden="true">·</span>
                        {ev.chunkId}
                      </span>
                      <span className="block line-clamp-2">{ev.quote}</span>
                    </button>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && msg.answerMode && (
                <div className="mb-1 pl-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {answerModeLabel(msg.answerMode)}
                </div>
              )}
              <div
                className={`text-[13px] leading-[1.6] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-element border border-border text-fg/90 px-4 py-2.5 rounded-panel rounded-tr-none shadow-sm"
                    : "text-fg/90 py-1 px-1"
                }`}
              >
                {msg.error ? (
                  <span className="flex items-center gap-1.5 text-danger-fg font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {msg.error}
                  </span>
                ) : (
                  <>
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-accent ml-1 animate-[pulse_1.2s_infinite] align-middle" />
                    )}
                  </>
                )}
              </div>

              {msg.safety && effectiveSafetyLabel && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] border rounded px-2.5 py-0.5 ${safetyTone(effectiveSafetyLabel)}`}
                    title={msg.safety.message}
                  >
                    {safetyLabel(effectiveSafetyLabel)}
                  </span>
                  <span className="text-[10px] text-muted">
                    {msg.safety.message}
                  </span>
                </div>
              )}

              {msg.role !== "assistant" && msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                  {msg.evidence.map((ev, index) => (
                    <button
                      key={ev.chunkId}
                      onClick={() => void onJumpEvidence(ev)}
                      className="inline-flex items-center gap-1.5 text-[10px] text-muted/60 hover:text-accent bg-element/30 hover:bg-element-hover border border-border rounded px-2.5 py-0.5 transition-all duration-150"
                      title={ev.quote}
                    >
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span>{t("analysis.chat.evidenceCount", { index: index + 1 })}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-element/40 border border-border flex items-center justify-center shrink-0 shadow-sm">
                <User className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

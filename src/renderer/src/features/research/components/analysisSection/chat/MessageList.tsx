import { AlertCircle, Bot, BookOpen, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Message } from "../shared/types";
import { safetyLabel, safetyTone } from "../runtime/runtimeHelpers";
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
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-neutral-400" />
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
                      className="block w-full rounded border border-white/5 bg-neutral-800/10 px-2.5 py-1.5 text-left text-[11px] text-muted/80 transition-all duration-150 hover:border-accent/30 hover:bg-neutral-800/30 hover:text-accent"
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
              <div
                className={`text-[13px] leading-[1.6] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-neutral-850 border border-white/5 text-fg/90 px-4 py-2.5 rounded-lg rounded-tr-none shadow-sm"
                    : "text-fg/90 py-1 px-1"
                }`}
              >
                {msg.error ? (
                  <span className="flex items-center gap-1.5 text-red-500/90 font-medium">
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
                      className="inline-flex items-center gap-1.5 text-[10px] text-muted/60 hover:text-accent bg-neutral-800/10 hover:bg-neutral-800/30 border border-white/5 rounded px-2.5 py-0.5 transition-all duration-150"
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
              <div className="w-7 h-7 rounded-full bg-neutral-800/40 border border-neutral-700/30 flex items-center justify-center shrink-0 shadow-sm">
                <User className="w-3.5 h-3.5 text-neutral-500" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

function hasMemoryUiIntent(question: string | undefined): boolean {
  return /근거|원고|정사|회차|[0-9]+화|인물|관계|설정|떡밥|확정|충돌|폐기|초안|알고|알아|기준/u.test(
    question ?? "",
  );
}

export function MessageList({ messages, onJumpEvidence }: MessageListProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {messages.map((msg, index) => {
        const effectiveSafetyLabel = messageSafetyLabel(msg);
        const evidence = msg.evidence ?? [];
        const previousQuestion =
          messages[index - 1]?.role === "user" ? messages[index - 1]?.content : undefined;
        const showMemoryUi = hasMemoryUiIntent(previousQuestion);
        const showEvidence =
          showMemoryUi && msg.role === "assistant" && msg.answerMode !== "ADVISORY" && evidence.length > 0;
        const showSafety = Boolean(showMemoryUi && effectiveSafetyLabel && msg.answerMode !== "ADVISORY");
        const showBlockingSafety = Boolean(showSafety && msg.safety?.blocksConfirmedAnswer);

        return (
          <div
            key={msg.id}
            className={`flex gap-3 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-element/60 border border-border flex items-center justify-center shrink-0 shadow-control">
                <Bot aria-hidden="true" className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
            <div
              className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}
            >
              <div
                className={`text-[13px] leading-[1.6] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-element/60 border border-border text-fg/90 px-4 py-2.5 rounded-panel rounded-tr-none shadow-control"
                    : "text-fg/90 py-1 px-1"
                }`}
              >
                {msg.error ? (
                  <span className="flex items-center gap-1.5 text-danger-fg font-medium">
                    <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
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

              {showSafety && msg.safety && effectiveSafetyLabel && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] border rounded px-2.5 py-0.5 ${safetyTone(effectiveSafetyLabel)}`}
                    title={msg.safety.message}
                  >
                    {safetyLabel(effectiveSafetyLabel)}
                  </span>
                  {showBlockingSafety && (
                    <span className="text-[10px] text-muted">
                      {msg.safety.message}
                    </span>
                  )}
                </div>
              )}

              {showEvidence && (
                <details className="mt-2 pl-1 text-[11px] text-muted">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 hover:text-accent">
                    <BookOpen aria-hidden="true" className="w-3 h-3 shrink-0" />
                    근거 보기 {evidence.length}
                  </summary>
                  <div className="mt-1.5 space-y-1.5">
                    {evidence.map((ev, index) => (
                      <button
                        key={ev.chunkId}
                        onClick={() => void onJumpEvidence(ev)}
                        className="block w-full rounded-control border border-border bg-element/20 px-2.5 py-1.5 text-left text-[11px] text-muted/80 transition-colors duration-150 hover:border-accent/30 hover:bg-element-hover hover:text-accent"
                        title={ev.quote}
                      >
                        <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] text-muted/60">
                          <BookOpen aria-hidden="true" className="w-3 h-3 shrink-0" />
                          {t("analysis.chat.evidenceCount", { index: index + 1 })}
                        </span>
                        <span className="block line-clamp-2">{ev.quote}</span>
                      </button>
                    ))}
                  </div>
                </details>
              )}

              {msg.role !== "assistant" && msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                  {msg.evidence.map((ev, index) => (
                    <button
                      key={ev.chunkId}
                      onClick={() => void onJumpEvidence(ev)}
                      className="inline-flex items-center gap-1.5 text-[10px] text-muted/60 hover:text-accent bg-element/20 hover:bg-element-hover border border-border rounded-full px-2.5 py-0.5 transition-colors duration-150"
                      title={ev.quote}
                    >
                      <BookOpen aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>{t("analysis.chat.evidenceCount", { index: index + 1 })}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-element/30 border border-border flex items-center justify-center shrink-0 shadow-control">
                <User aria-hidden="true" className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

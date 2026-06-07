import { AlertCircle, Bot, BookOpen, User } from "lucide-react";
import type { Message, GroundingStatus } from "./types";
import { groundingLabel, groundingTone } from "./runtimeHelpers";

type MessageListProps = {
  messages: Message[];
  onJumpEvidence: (item: {
    chunkId: string;
    chapterId: string | null;
    quote: string;
  }) => Promise<void>;
};

export function MessageList({ messages, onJumpEvidence }: MessageListProps) {
  return (
    <>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.role === "assistant" && (
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-accent" />
            </div>
          )}
          <div
            className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}
          >
            <div
              className={`text-sm rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-accent/10 text-fg ml-auto border border-accent/20" : "bg-surface text-fg border border-border"}`}
            >
              {msg.error ? (
                <span className="flex items-center gap-1.5 text-red-500 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {msg.error}
                </span>
              ) : (
                <>
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-fg opacity-70 ml-1 animate-pulse align-middle" />
                  )}
                </>
              )}
            </div>

            {msg.grounding && (
              <div className="mt-2 flex max-w-full items-start gap-2 pl-1 text-xs">
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-medium ${groundingTone(msg.grounding.status as GroundingStatus)}`}
                  title={msg.grounding.note}
                >
                  {groundingLabel(msg.grounding.status as GroundingStatus)}
                </span>
                <span className="min-w-0 text-muted">{msg.grounding.note}</span>
              </div>
            )}

            {msg.evidence && msg.evidence.length > 0 && (
              <div className="mt-2 space-y-1.5 pl-1">
                {msg.evidence.map((ev) => (
                  <button
                    key={ev.chunkId}
                    onClick={() => void onJumpEvidence(ev)}
                    className="flex items-start gap-1.5 text-xs text-muted hover:text-fg w-full text-left group transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                    <span className="truncate">{ev.quote}</span>
                  </button>
                ))}
              </div>
            )}

            {msg.narrativeMemory && msg.narrativeMemory.trace.length > 0 && (
              <details className="mt-2 pl-1 text-[11px] text-muted">
                <summary>
                  Narrative Memory · {msg.narrativeMemory.intent} ·{" "}
                  {msg.narrativeMemory.status}
                </summary>
                <div className="mt-1 space-y-1">
                  <div>
                    fact {msg.narrativeMemory.factCount}, evidence span{" "}
                    {msg.narrativeMemory.evidenceCount}
                  </div>
                  {msg.narrativeMemory.trace.slice(0, 3).map((step, index) => (
                    <div key={`${step.source}-${step.decision}-${index}`}>
                      {step.source}: {step.reason}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {msg.role === "user" && (
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}


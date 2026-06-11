import { AlertCircle, Bot, BookOpen, User } from "lucide-react";
import type { Message } from "./types";
import { safetyLabel, safetyTone } from "./runtimeHelpers";

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
    <div className="space-y-6">
      {messages.map((msg) => (
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
            <div
              className={`text-[13px] leading-[1.6] whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-neutral-850 border border-white/5 text-fg/90 px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm"
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

            {msg.safety && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] border rounded px-2.5 py-0.5 ${safetyTone(msg.safety.label)}`}
                  title={msg.safety.message}
                >
                  {safetyLabel(msg.safety.label)}
                </span>
                <span className="text-[10px] text-muted">
                  {msg.safety.message}
                </span>
              </div>
            )}

            {msg.evidence && msg.evidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                {msg.evidence.map((ev, index) => (
                  <button
                    key={ev.chunkId}
                    onClick={() => void onJumpEvidence(ev)}
                    className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-accent bg-neutral-800/10 hover:bg-neutral-800/30 border border-white/5 rounded px-2.5 py-0.5 transition-all duration-150"
                    title={ev.quote}
                  >
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span>출처 #{index + 1}</span>
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
      ))}
    </div>
  );
}

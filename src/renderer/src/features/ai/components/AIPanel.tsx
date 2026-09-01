import { useState, useRef, useEffect, type CSSProperties } from "react";
import {
  ArrowUp,
  User,
  Copy,
  Check,
  ChevronDown,
  SquarePen,
  X,
  Plus,
  Sparkles,
  Mic,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIPanelProps {
  onMenuToggle?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function AIPanel({ onMenuToggle, onClose }: AIPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const promptText = input.trim();

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: promptText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // AI 응답 시뮬레이션
    setTimeout(() => {
      let aiResponse = `"${promptText}"에 대한 분석 결과입니다.\n\n`;
      if (promptText.includes("대사") || promptText.includes("말투")) {
        aiResponse +=
          "• [대사 톤 일관성]: 인물 간 대사 톤과 캐릭터성이 명확하게 대비되며 긴장감이 잘 유지되고 있습니다.\n• [호흡 제안]: 클라이맥스 직전의 대사 간격을 한 호흡 줄여 긴박감을 더할 수 있습니다.";
      } else if (promptText.includes("분량") || promptText.includes("템포")) {
        aiResponse +=
          "• [전개 템포]: 사건 전개와 감정선 전환 타이밍이 웹소설 회차 기준에 적절하게 배분되어 있습니다.";
      } else {
        aiResponse +=
          "• 원고 맥락을 바탕으로 검토가 완료되었습니다. 추가로 수정이 필요한 부분이 있다면 말씀해주세요.";
      }

      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: aiResponse },
      ]);
      setIsLoading(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 1500);
  };

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ai-panel font-sans text-fg select-none">
      {/* 1. Header Bar: New Chat Dropdown and New Chat Button */}
      <div
        className="flex h-11 shrink-0 items-center justify-between bg-ai-panel px-3.5"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      >
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex cursor-pointer items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <span>New chat</span>
          <ChevronDown className="size-3.5 text-muted" />
        </button>

        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            title="새 대화"
            aria-label="새 대화"
          >
            <SquarePen className="size-3.5" />
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-muted transition-colors hover:bg-surface-hover hover:text-fg"
              title="AI View 닫기"
              aria-label="AI View 닫기"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 2. Main Feed Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 opacity-70">
            <p className="text-xs font-medium text-fg">프롬프트 뷰</p>
            <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-muted">
              원고 분석이나 작문 어시스턴트 프롬프트를 입력하세요.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs leading-relaxed ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] text-muted">
                {msg.role === "user" ? (
                  <>
                    <span>프롬프트</span>
                    <User className="size-3" />
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 text-fg" />
                    <span>AI 어시스턴트</span>
                  </>
                )}
              </div>
              <div
                className={`max-w-[92%] rounded-panel px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-active text-fg"
                    : "bg-element text-fg shadow-xs"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex cursor-pointer items-center gap-1 text-[10px] text-muted transition-colors hover:text-fg"
                  >
                    {isCopied === msg.id ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{isCopied === msg.id ? "복사됨" : "복사"}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-2 text-xs text-muted">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <span>분석 중...</span>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* 3. Bottom Prompt Input Pill & Toolbar (Reference Image Matched) */}
      <div className="shrink-0 bg-ai-panel p-3">
        {/* Main Pill Capsule Input */}
        <div className="relative flex h-11 items-center gap-2 rounded-full border border-border bg-element px-2.5 shadow-inner transition-all focus-within:border-border-active focus-within:bg-element-hover">
          <button
            type="button"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-active text-fg transition-colors hover:bg-surface-hover"
            title="추가"
            aria-label="추가"
          >
            <Plus className="size-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI a task, @ for context"
            className="w-full bg-transparent px-1 text-xs leading-none text-fg placeholder:text-muted focus:outline-hidden"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="flex size-6 cursor-pointer items-center justify-center text-muted transition-colors hover:text-fg"
              title="음성 입력"
              aria-label="음성 입력"
            >
              <Mic className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-element text-fg shadow-xs transition-all hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-element disabled:hover:text-fg active:scale-95"
              aria-label="전송"
            >
              <ArrowUp className="size-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Bottom Sub-toolbar Row */}
        <div className="flex select-none items-center justify-between px-2 pt-2.5 text-[11px] font-medium text-muted">
          {/* Left Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 transition-colors hover:text-fg"
            >
              <Layers className="size-3.5" />
              <ChevronDown className="size-3 text-muted" />
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 transition-colors hover:text-fg"
            >
              <ShieldCheck className="size-3.5" />
              <ChevronDown className="size-3 text-muted" />
            </button>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 transition-colors hover:text-fg"
            >
              <Sparkles className="size-3 text-fg" />
              <span>GPT-5.6 Terra</span>
              <ChevronDown className="size-3 text-muted" />
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 transition-colors hover:text-fg"
            >
              <span>High</span>
              <ChevronDown className="size-3 text-muted" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

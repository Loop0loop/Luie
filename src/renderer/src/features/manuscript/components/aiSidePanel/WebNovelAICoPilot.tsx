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

interface WebNovelAICoPilotProps {
  onMenuToggle?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function WebNovelAICoPilot({
  onMenuToggle,
  onClose,
}: WebNovelAICoPilotProps) {
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
    <div className="flex h-full flex-col bg-[#141416]/95 text-zinc-200 font-sans select-none overflow-hidden">
      {/* 1. Header Bar: New Chat Dropdown, New Chat Button, Close (X) */}
      <div
        className="flex h-11 shrink-0 items-center justify-between border-b border-white/5 bg-[#18181b]/80 px-3.5 backdrop-blur-xl"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      >
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <span>New chat</span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </button>

        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex size-7 items-center justify-center rounded-[6px] text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            title="새 대화"
            aria-label="새 대화"
          >
            <SquarePen className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[6px] text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            title="닫기"
            aria-label="닫기"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Feed Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 opacity-70">
            <p className="text-xs font-medium text-zinc-300">프롬프트 뷰</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
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
              <div className="flex items-center gap-1 mb-1 text-[10px] text-zinc-400 px-1">
                {msg.role === "user" ? (
                  <>
                    <span>프롬프트</span>
                    <User className="size-3" />
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 text-zinc-300" />
                    <span>AI 어시스턴트</span>
                  </>
                )}
              </div>
              <div
                className={`max-w-[92%] rounded-panel px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-white/12 text-white border border-white/10"
                    : "bg-[#222225] text-zinc-200 border border-white/5 shadow-xs"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <span>분석 중...</span>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* 3. Bottom Prompt Input Pill & Toolbar (Reference Image Matched) */}
      <div className="shrink-0 p-3 bg-[#18181b]/95 border-t border-white/5 backdrop-blur-xl">
        {/* Main Pill Capsule Input */}
        <div className="relative flex h-11 items-center gap-2 rounded-full bg-[#2a2a2e] border border-white/8 px-2.5 shadow-inner focus-within:border-white/15 focus-within:bg-[#303035] transition-all">
          <button
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
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
            className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none leading-none px-1"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="flex size-6 items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="음성 입력"
              aria-label="음성 입력"
            >
              <Mic className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex size-7 items-center justify-center rounded-full bg-zinc-600/80 text-zinc-200 hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-zinc-600/80 disabled:hover:text-zinc-200 transition-all active:scale-95 cursor-pointer shadow-xs"
              aria-label="전송"
            >
              <ArrowUp className="size-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Bottom Sub-toolbar Row */}
        <div className="flex items-center justify-between px-2 pt-2.5 text-[11px] text-zinc-400 font-medium select-none">
          {/* Left Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Layers className="size-3.5" />
              <ChevronDown className="size-3 text-zinc-500" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <ShieldCheck className="size-3.5" />
              <ChevronDown className="size-3 text-zinc-500" />
            </button>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Sparkles className="size-3 text-zinc-300" />
              <span>GPT-5.6 Terra</span>
              <ChevronDown className="size-3 text-zinc-500" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <span>High</span>
              <ChevronDown className="size-3 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

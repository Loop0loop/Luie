import { useState } from "react";
import {
  Bot,
  MessageSquareText,
  Hourglass,
  Zap,
  Send,
  User,
  BookOpen,
  Plus,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface WebNovelAICoPilotProps {
  onAnalyzeDialogueTone?: () => void;
  onCheckEpisodeLength?: () => void;
  onEvaluateCliffhanger?: () => void;
}

export function WebNovelAICoPilot({
  onAnalyzeDialogueTone,
  onCheckEpisodeLength,
  onEvaluateCliffhanger,
}: WebNovelAICoPilotProps) {
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: "bot" | "user"; text: string; time?: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isContextActive, setIsContextActive] = useState(true);

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    const userMsg = promptText.trim();
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: "user", text: userMsg },
    ]);
    setInput("");

    // AI Response Simulation
    setTimeout(() => {
      let botResponse = `"${userMsg}"에 대한 웹소설 원고 분석이 완료되었습니다.`;
      if (promptText.includes("대사 톤")) {
        botResponse =
          "🗣️ [대사 톤 검증 완료]: 주인공 카엘과 라이벌 세드릭 간의 대치가 긴장감 있게 유지되며, 말투 일관성이 100% 일치합니다.";
      } else if (promptText.includes("분량")) {
        botResponse =
          "📏 [연재 분량 체크]: 현재 4,800자 / 5,000자로 연재목표 96%를 달성했습니다. 전개 템포가 매우 매끄럽습니다.";
      } else if (promptText.includes("클리프행어")) {
        botResponse =
          "⚡ [엔딩 몰입도 분석]: 12화 엔딩 부분의 칼을 뽑아드는 대목이 8.5/10점으로 다음 화 연독률(결제율)을 강하게 유도합니다.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          text: botResponse,
        },
      ]);
    }, 600);
  };

  const suggestedPrompts = [
    {
      label: "회차 주인공-라이벌 대사 톤 검증해줘",
      icon: MessageSquareText,
      action: onAnalyzeDialogueTone,
    },
    {
      label: "현재 회차 연재 분량 (4,800 / 5,000자) 및 템포 체크",
      icon: Hourglass,
      action: onCheckEpisodeLength,
    },
    {
      label: "엔딩 클리프행어 몰입도 및 연독률 분석해줘",
      icon: Zap,
      action: onEvaluateCliffhanger,
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-app">
      {/* 1등 레퍼런스 스타일: [ 🤖 AI Co-Pilot에게 물어보기 ] Pill Header Button */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={() => {}}
          className="mx-auto flex w-full max-w-[90%] items-center justify-center gap-2 rounded-full border border-border/80 bg-element py-2 px-4 text-xs font-semibold text-fg shadow-xs transition-all hover:border-accent hover:text-accent hover:shadow-md cursor-pointer"
        >
          <Bot className="icon-xs text-accent shrink-0" />
          <span>AI Co-Pilot에게 물어보기</span>
        </button>
      </div>

      {/* Main Container: Initial Welcome Screen vs Active Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          /* Chrome Gemini Welcome Screen Reference */
          <div className="flex flex-col justify-center min-h-[320px] py-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg tracking-tight">
                작가님, 안녕하세요
              </h2>
              <p className="text-sm font-medium text-muted mt-0.5">
                오늘 원고에 무엇을 도와드릴까요?
              </p>
            </div>

            {/* Wide Full-Width Rounded Pill Prompt Buttons */}
            <div className="space-y-2.5 pt-1">
              {suggestedPrompts.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      item.action?.();
                      handleSendPrompt(item.label);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-panel border border-border/70 bg-surface/90 px-3.5 py-3 text-left text-xs font-medium text-fg shadow-xs transition-all hover:border-accent/80 hover:bg-surface-hover hover:text-accent hover:shadow-md group cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <IconComponent className="icon-xs text-subtle group-hover:text-accent shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Notice Footer Card */}
            <div className="rounded-panel border border-border/50 bg-element/40 p-3 text-[11px] text-subtle leading-relaxed">
              웹소설 AI 조력자는 작가님의 원고 시놉시스, 캐릭터 설정, 복선 맥락을 바탕으로 실시간 연재 분석을 제공합니다.
            </div>
          </div>
        ) : (
          /* Messages Stream */
          <div className="space-y-3.5 py-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                    msg.sender === "bot"
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-border/60 bg-element text-muted"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <Bot className="icon-xs" />
                  ) : (
                    <User className="icon-xs" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-panel p-3 text-xs leading-relaxed ${
                    msg.sender === "bot"
                      ? "border border-border/60 bg-surface shadow-xs text-fg"
                      : "bg-accent text-accent-fg font-medium"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Sharing Bar (크롬 Gemini 하단 공유 연동 배너) */}
      {isContextActive && (
        <div className="shrink-0 px-3 py-1 bg-sidebar/60 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-muted">
            <BookOpen className="icon-xs text-accent shrink-0" />
            <span className="truncate">"회차 12: 배신의 속삭임" 원고 연동 중</span>
          </div>
          <button
            type="button"
            onClick={() => setIsContextActive(false)}
            className="flex size-5 items-center justify-center rounded-full text-subtle hover:bg-surface-hover hover:text-fg transition-colors"
            title="연동 해제"
          >
            <X className="icon-xs" />
          </button>
        </div>
      )}

      {/* Bottom Prompt Input Composer */}
      <div className="shrink-0 border-t border-border/80 bg-sidebar/50 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="relative flex items-center gap-2 rounded-panel border border-border/80 bg-element px-3 py-2 transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
        >
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-control text-subtle hover:bg-surface-hover hover:text-fg transition-colors"
            title="원고 자료 첨부"
          >
            <Plus className="icon-xs" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="/를 입력하여 기능 사용..."
            className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-subtle"
          />
          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 rounded-control bg-surface px-1.5 py-0.5 text-[10px] text-subtle border border-border/50">
              <span>Flash</span>
              <SlidersHorizontal className="icon-xs" />
            </span>
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex size-6 items-center justify-center rounded-control bg-accent text-accent-fg transition-opacity hover:bg-accent-bg-hover disabled:opacity-40"
              aria-label="Send prompt"
            >
              <Send className="icon-xs" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

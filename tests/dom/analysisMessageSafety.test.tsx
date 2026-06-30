// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "../../src/renderer/src/features/research/components/analysisSection/chat/MessageList.js";
import { writerFlowSyntheticNovel } from "../fixtures/writerFlowSyntheticNovel.js";

const { translate } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    "analysis.runtime.labels.temporal_blocked": "회차 기준 불가",
    "analysis.chat.evidenceCount": "근거 {{index}}",
  };
  return {
    translate: (key: string, values?: Record<string, unknown>): string => {
      let output = translations[key] ?? key;
      for (const [name, value] of Object.entries(values ?? {})) {
        output = output.replace(`{{${name}}}`, String(value));
      }
      return output;
    },
  };
});

vi.mock("@renderer/i18n", () => ({
  i18n: {
    t: translate,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: translate,
  }),
}));

describe("MessageList safety label", () => {
  let container: HTMLDivElement;
  let root: Root;
  const chapter12 = writerFlowSyntheticNovel.chapters[1];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders blocked answer safety labels distinctly from grounding text", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "assistant-1",
              role: "assistant",
              content: "이 답변은 현재 회차 기준으로 확정할 수 없습니다.",
              safety: {
                label: "temporal_blocked",
                message:
                  "현재 회차 기준으로 사용할 수 없는 미래 정보가 감지되었습니다.",
                blocksConfirmedAnswer: true,
                reasons: ["future_fact_used_in_past_answer"],
              },
            },
          ]}
          onJumpEvidence={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("회차 기준 불가");
    expect(container.textContent).toContain(
      "현재 회차 기준으로 사용할 수 없는 미래 정보가 감지되었습니다.",
    );
  });

  it("shows evidence quotes before the assistant answer", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "assistant-1",
              role: "assistant",
              content: "12화 기준으로 서린은 아직 봉인 약의 정체를 모릅니다.",
              answerMode: "EVIDENCE",
              evidence: [
                {
                  chunkId: "chunk-1",
                  chapterId: chapter12.id,
                  offset: 42,
                  quote: chapter12.canon,
                },
              ],
            },
          ]}
          onJumpEvidence={vi.fn()}
        />,
      );
    });

    const text = container.textContent ?? "";
    expect(text).toContain("chunk-1");
    expect(text).toContain("근거 답변");
    expect(text).toContain("chapter-12 · offset 42");
    expect(text).toContain(chapter12.canon);
    expect(text.indexOf(chapter12.canon)).toBeLessThan(
      text.indexOf("12화 기준으로 서린은 아직 봉인 약의 정체를 모릅니다."),
    );
  });

  it("renders advisory answers separately from canon answers", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "assistant-1",
              role: "assistant",
              content: "일반 조언으로는 갈등 선택지를 둘로 나누는 방법이 있습니다.",
              answerMode: "ADVISORY",
            },
          ]}
          onJumpEvidence={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("일반 조언");
  });

  it("does not show a confirmed label when the answer has no evidence", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "assistant-1",
              role: "assistant",
              content: "여주는 약의 정체를 알고 있습니다.",
              safety: {
                label: "confirmed",
                message: "근거가 확인되었습니다.",
                blocksConfirmedAnswer: false,
                reasons: ["confirmed"],
              },
            },
          ]}
          onJumpEvidence={vi.fn()}
        />,
      );
    });

    const text = container.textContent ?? "";
    expect(text).toContain("근거 부족");
    expect(text).not.toContain("확정");
  });
});

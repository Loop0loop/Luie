// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "../../src/renderer/src/features/research/components/analysisSection/chat/MessageList.js";
import { writerFlowSyntheticNovel } from "../fixtures/writerFlowSyntheticNovel.js";

const { translate } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    "analysis.runtime.labels.temporal_blocked": "회차 기준 불가",
    "analysis.runtime.labels.insufficient_evidence": "근거 부족",
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
              id: "user-1",
              role: "user",
              content: "3화 기준으로 이 답변 확정해도 돼?",
            },
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

  it("keeps evidence collapsed without internal chunk details", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "user-1",
              role: "user",
              content: "12화 기준으로 서린이 봉인 약 정체를 알아?",
            },
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
    expect(text).toContain("근거 보기 1");
    expect(text).not.toContain("chunk-1");
    expect(text).not.toContain("offset 42");
    expect(text).toContain(chapter12.canon);
  });

  it("renders advisory answers without manuscript grounding chrome", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "user-1",
              role: "user",
              content: "ㅎㅇ",
            },
            {
              id: "assistant-1",
              role: "assistant",
              content: "안녕하세요.",
              answerMode: "ADVISORY",
              evidence: [
                {
                  chunkId: "chunk-1",
                  chapterId: chapter12.id,
                  offset: 42,
                  quote: chapter12.canon,
                },
              ],
              safety: {
                label: "inferred",
                message: "근거는 있지만 문장별 검증 전이므로 추정 답변입니다.",
                blocksConfirmedAnswer: false,
                reasons: ["inferred"],
              },
            },
          ]}
          onJumpEvidence={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("안녕하세요.");
    expect(container.textContent).not.toContain("일반 답변");
    expect(container.textContent).not.toContain("근거 보기");
    expect(container.textContent).not.toContain("추정");
  });

  it("does not show a confirmed label when the answer has no evidence", () => {
    act(() => {
      root.render(
        <MessageList
          messages={[
            {
              id: "user-1",
              role: "user",
              content: "이 설정 정사야?",
            },
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

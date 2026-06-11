// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "../../src/renderer/src/features/research/components/analysisSection/MessageList.js";

describe("MessageList safety label", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
});

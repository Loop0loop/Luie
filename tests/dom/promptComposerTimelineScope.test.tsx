// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptComposer } from "../../src/renderer/src/features/research/components/analysisSection/chat/PromptComposer.js";

const translations: Record<string, string> = {
  "analysis.composer.options": "옵션",
  "analysis.composer.placeholder": "무엇이든 부탁하세요",
  "analysis.composer.narrativeSummary": "서사 요약",
  "analysis.composer.currentChapterOnly": "현재 챕터만",
  "analysis.composer.currentAndPrior": "현재 + 과거",
  "analysis.composer.timelineBasis": "{{chapter}} 기준",
  "analysis.composer.timelineCurrentOnly": "현재 회차 근거만",
  "analysis.composer.timelineWithPrior": "이전 회차 포함",
  "analysis.composer.searchModes.lowEnd": "빠른 검색 · 근거 폭 좁음",
  "analysis.composer.searchModes.standard": "균형",
  "analysis.composer.searchModes.highEnd": "넓은 후보",
  "analysis.composer.searchModes.quality": "품질 우선",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      let value = translations[key] ?? key;
      for (const [optionKey, optionValue] of Object.entries(options ?? {})) {
        value = value.replace(`{{${optionKey}}}`, optionValue);
      }
      return value;
    },
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountComposer = (
  memoryScope: "current-only" | "with-prior",
): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <PromptComposer
        input=""
        setInput={vi.fn()}
        isStreaming={false}
        disabled={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onKeyDown={vi.fn()}
        runtimeInfo={null}
        sidecarStatus={null}
        runtimePreference="auto"
        onApplyRuntimePreference={vi.fn()}
        searchOptimizationMode="standard"
        onApplySearchOptimizationMode={vi.fn()}
        memoryScope={memoryScope}
        onChangeMemoryScope={vi.fn()}
        summaryActive={false}
        onToggleSummary={vi.fn()}
        timelineChapter={{ order: 12, title: "약의 정체" }}
      />,
    );
  });
  return { container, root };
};

const unmountComposer = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

describe("PromptComposer timeline scope", () => {
  const mounted: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mounted.splice(0).forEach(unmountComposer);
    document.body.innerHTML = "";
  });

  it("shows the current chapter as the answer timeline basis", () => {
    const view = mountComposer("current-only");
    mounted.push(view);

    expect(view.container.textContent).toContain("12화 · 약의 정체 기준");
    expect(view.container.textContent).toContain("현재 회차 근거만");
  });

  it("shows when prior chapters are included in the timeline basis", () => {
    const view = mountComposer("with-prior");
    mounted.push(view);

    expect(view.container.textContent).toContain("12화 · 약의 정체 기준");
    expect(view.container.textContent).toContain("이전 회차 포함");
  });
});

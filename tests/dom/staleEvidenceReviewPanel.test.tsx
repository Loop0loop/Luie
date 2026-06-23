// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaleEvidenceReviewPanel } from "../../src/renderer/src/features/research/components/analysisSection/review/queue/StaleEvidenceReviewPanel.js";
import type { AnalysisStaleEvidenceReviewItem } from "../../src/renderer/src/features/research/components/analysisSection/shared/types.js";

const translations: Record<string, string> = {
  "analysis.review.queue.staleEvidence.title": "오래된 근거",
  "analysis.review.queue.staleEvidence.loading": "조회 중...",
  "analysis.review.queue.staleEvidence.empty": "검토할 오래된 근거가 없습니다.",
  "analysis.review.queue.staleEvidence.defer": "나중에 보기",
  "analysis.review.queue.staleEvidence.reject": "버림",
  "analysis.review.queue.staleEvidence.resolve": "해결됨",
  "analysis.review.queue.staleEvidence.repair": "자동 복구",
  "analysis.review.queue.staleEvidence.reason.quote_missing_from_chunk":
    "근거 문장이 원문에서 사라짐",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const staleEvidence: AnalysisStaleEvidenceReviewItem = {
  kind: "episode_evidence",
  id: "evidence-1",
  reviewStatus: "pending",
  ownerId: "episode-1",
  ownerTitle: "12화 결투",
  chunkId: "chunk-old",
  chapterId: "chapter-12",
  chapterOrder: 12,
  quote: "주인공은 이 장면에서 아직 비밀을 모른다.",
  reason: "quote_missing_from_chunk",
};

const mountPanel = (repairing = false): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <StaleEvidenceReviewPanel
        visible
        loading={false}
        error={null}
        items={[staleEvidence]}
        mutatingStaleEvidenceId={null}
        repairing={repairing}
        onToggle={vi.fn()}
        onAction={vi.fn()}
        onRepair={vi.fn()}
      />,
    );
  });
  return { container, root };
};

const unmountPanel = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

const buttonByTitle = (container: HTMLElement, title: string): HTMLButtonElement => {
  const button = container.querySelector<HTMLButtonElement>(
    `button[title="${title}"]`,
  );
  if (!button) {
    throw new Error(`Button not found: ${title}`);
  }
  return button;
};

describe("StaleEvidenceReviewPanel writer flow", () => {
  const mounted: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mounted.splice(0).forEach(unmountPanel);
    document.body.innerHTML = "";
  });

  it("shows stale evidence actions using writer-facing labels", () => {
    const view = mountPanel();
    mounted.push(view);

    expect(view.container.textContent).toContain("오래된 근거");
    expect(view.container.textContent).toContain("12화 결투 · 12화");
    expect(view.container.textContent).toContain(
      "주인공은 이 장면에서 아직 비밀을 모른다.",
    );
    expect(buttonByTitle(view.container, "자동 복구")).toBeTruthy();
    expect(buttonByTitle(view.container, "나중에 보기")).toBeTruthy();
    expect(buttonByTitle(view.container, "버림")).toBeTruthy();
    expect(buttonByTitle(view.container, "해결됨")).toBeTruthy();
  });

  it("blocks row decisions while project-wide auto repair is running", () => {
    const view = mountPanel(true);
    mounted.push(view);

    expect(buttonByTitle(view.container, "자동 복구").disabled).toBe(true);
    expect(buttonByTitle(view.container, "나중에 보기").disabled).toBe(true);
    expect(buttonByTitle(view.container, "버림").disabled).toBe(true);
    expect(buttonByTitle(view.container, "해결됨").disabled).toBe(true);
  });
});

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictQueuePanel } from "../../src/renderer/src/features/research/components/analysisSection/review/queue/ConflictQueuePanel.js";
import type { AnalysisConflictItem } from "../../src/renderer/src/features/research/components/analysisSection/shared/types.js";
import { writerFlowSyntheticNovel } from "../fixtures/writerFlowSyntheticNovel.js";

const translations: Record<string, string> = {
  "analysis.review.queue.conflict.title": "충돌 큐",
  "analysis.review.queue.conflict.loading": "조회 중...",
  "analysis.review.queue.conflict.empty": "현재 기준에서 충돌 후보가 없습니다.",
  "analysis.review.queue.conflict.evidenceQuote": "{{title}} 근거",
  "analysis.review.queue.conflict.invalidated": "이전 설정: {{fact}}",
  "analysis.review.queue.conflict.priorEvidence": "이전 사실",
  "analysis.review.queue.conflict.invalidating": "새 설정: {{fact}}",
  "analysis.review.queue.conflict.newEvidence": "신규 사실",
  "analysis.review.queue.conflict.filter.active": "검토 중",
  "analysis.review.queue.conflict.filter.deferred": "보류 항목",
  "analysis.review.queue.conflict.status.pending": "대기",
  "analysis.review.queue.conflict.status.reviewing": "검토 중",
  "analysis.review.queue.conflict.status.deferred": "보류됨",
  "analysis.review.queue.conflict.acceptPrior": "이전 사실 채택",
  "analysis.review.queue.conflict.acceptNew": "신규 사실 채택",
  "analysis.review.queue.conflict.defer": "나중에 보기",
};

const chapter12 = writerFlowSyntheticNovel.chapters[1];
const chapter18 = writerFlowSyntheticNovel.chapters[2];

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

const conflictItem: AnalysisConflictItem = {
  conflictId: "conflict-1",
  reason: "state_conflict",
  reviewStatus: "pending",
  reviewerNote: null,
  reviewedAt: null,
  invalidatedFact: {
    id: "fact-old",
    subjectEntityId: "entity-hero",
    subjectEntityName: "서린",
    predicate: "knows_sealed_medicine",
    objectEntityId: null,
    objectEntityName: null,
    objectValue: "모른다",
    valueType: "text",
    validFromChapterOrder: 3,
    validToChapterOrder: null,
    observedAtChapterOrder: 3,
    confidence: 0.91,
    status: "confirmed",
    provenanceKind: "canon",
    canonStatus: "canon",
    evidenceCount: 1,
    evidenceQuotes: [chapter12.canon],
  },
  invalidatingFact: {
    id: "fact-new",
    subjectEntityId: "entity-hero",
    subjectEntityName: "서린",
    predicate: "knows_sealed_medicine",
    objectEntityId: null,
    objectEntityName: null,
    objectValue: "안다",
    valueType: "text",
    validFromChapterOrder: chapter18.order,
    validToChapterOrder: null,
    observedAtChapterOrder: chapter18.order,
    confidence: 0.88,
    status: "suggested",
    provenanceKind: "canon",
    canonStatus: "canon",
    evidenceCount: 1,
    evidenceQuotes: [chapter18.canon],
  },
};

const mountPanel = ({
  onResolve = vi.fn(),
  onDefer = vi.fn(),
  reviewFilter = "active",
  onChangeReviewFilter = vi.fn(),
  items = [conflictItem],
}: {
  onResolve?: (item: AnalysisConflictItem, winnerFactId: string) => void;
  onDefer?: (item: AnalysisConflictItem) => void;
  reviewFilter?: "active" | "deferred";
  onChangeReviewFilter?: (filter: "active" | "deferred") => void;
  items?: AnalysisConflictItem[];
} = {}): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ConflictQueuePanel
        visible
        loading={false}
        error={null}
        items={items}
        reviewFilter={reviewFilter}
        onChangeReviewFilter={onChangeReviewFilter}
        onToggle={vi.fn()}
        renderFact={(fact) => `${fact.subjectEntityName} ${fact.predicate} ${fact.objectValue}`}
        resolvingConflictId={null}
        onResolve={onResolve}
        onDefer={onDefer}
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

const clickButton = async (
  container: HTMLElement,
  label: string,
): Promise<void> => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label,
  );
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("ConflictQueuePanel writer flow", () => {
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

  it("shows both conflict quotes and writer decision actions", () => {
    const view = mountPanel();
    mounted.push(view);

    expect(view.container.textContent).toContain("충돌 큐");
    expect(view.container.textContent).toContain(
      "이전 설정: 서린 knows_sealed_medicine 모른다",
    );
    expect(view.container.textContent).toContain(
      "새 설정: 서린 knows_sealed_medicine 안다",
    );
    expect(view.container.textContent).toContain(chapter12.canon);
    expect(view.container.textContent).toContain(chapter18.canon);
    expect(view.container.textContent).toContain("이전 사실 채택");
    expect(view.container.textContent).toContain("신규 사실 채택");
    expect(view.container.textContent).toContain("나중에 보기");
    expect(view.container.textContent).toContain("대기");
  });

  it("defers a conflict without resolving either memory fact", async () => {
    const onResolve = vi.fn();
    const onDefer = vi.fn();
    const view = mountPanel({ onResolve, onDefer });
    mounted.push(view);

    await clickButton(view.container, "나중에 보기");

    expect(onDefer).toHaveBeenCalledWith(conflictItem);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("lets the writer reopen deferred conflicts with a status filter", async () => {
    const onChangeReviewFilter = vi.fn();
    const deferredConflict = {
      ...conflictItem,
      reviewStatus: "deferred" as const,
      reviewerNote: "나중에 확인",
      reviewedAt: "2026-06-11T00:00:00.000Z",
    };
    const view = mountPanel({
      reviewFilter: "deferred",
      onChangeReviewFilter,
      items: [deferredConflict],
    });
    mounted.push(view);

    expect(view.container.textContent).toContain("보류됨");
    expect(view.container.textContent).toContain("나중에 보기");

    await clickButton(view.container, "검토 중");

    expect(onChangeReviewFilter).toHaveBeenCalledWith("active");
  });
});

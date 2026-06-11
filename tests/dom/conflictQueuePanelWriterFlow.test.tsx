// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictQueuePanel } from "../../src/renderer/src/features/research/components/analysisSection/review/queue/ConflictQueuePanel.js";
import type { AnalysisConflictItem } from "../../src/renderer/src/features/research/components/analysisSection/shared/types.js";

const translations: Record<string, string> = {
  "analysis.review.queue.conflict.title": "충돌 큐",
  "analysis.review.queue.conflict.loading": "조회 중...",
  "analysis.review.queue.conflict.empty": "현재 기준에서 충돌 후보가 없습니다.",
  "analysis.review.queue.conflict.evidenceQuote": "{{title}} 근거",
  "analysis.review.queue.conflict.invalidated": "이전 설정: {{fact}}",
  "analysis.review.queue.conflict.priorEvidence": "이전 사실",
  "analysis.review.queue.conflict.invalidating": "새 설정: {{fact}}",
  "analysis.review.queue.conflict.newEvidence": "신규 사실",
  "analysis.review.queue.conflict.acceptPrior": "이전 사실 채택",
  "analysis.review.queue.conflict.acceptNew": "신규 사실 채택",
  "analysis.review.queue.conflict.defer": "나중에 보기",
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

const conflictItem: AnalysisConflictItem = {
  conflictId: "conflict-1",
  reason: "state_conflict",
  reviewStatus: "pending",
  reviewerNote: null,
  reviewedAt: null,
  invalidatedFact: {
    id: "fact-old",
    subjectEntityId: "entity-hero",
    subjectEntityName: "주인공",
    predicate: "knows_secret",
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
    evidenceQuotes: ["3화에서 주인공은 비밀을 아직 알지 못했다."],
  },
  invalidatingFact: {
    id: "fact-new",
    subjectEntityId: "entity-hero",
    subjectEntityName: "주인공",
    predicate: "knows_secret",
    objectEntityId: null,
    objectEntityName: null,
    objectValue: "안다",
    valueType: "text",
    validFromChapterOrder: 8,
    validToChapterOrder: null,
    observedAtChapterOrder: 8,
    confidence: 0.88,
    status: "suggested",
    provenanceKind: "canon",
    canonStatus: "canon",
    evidenceCount: 1,
    evidenceQuotes: ["8화에서 주인공은 비밀의 이름을 직접 말했다."],
  },
};

const mountPanel = ({
  onResolve = vi.fn(),
  onDefer = vi.fn(),
}: {
  onResolve?: (item: AnalysisConflictItem, winnerFactId: string) => void;
  onDefer?: (item: AnalysisConflictItem) => void;
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
        items={[conflictItem]}
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
    expect(view.container.textContent).toContain("이전 설정: 주인공 knows_secret 모른다");
    expect(view.container.textContent).toContain("새 설정: 주인공 knows_secret 안다");
    expect(view.container.textContent).toContain("3화에서 주인공은 비밀을 아직 알지 못했다.");
    expect(view.container.textContent).toContain("8화에서 주인공은 비밀의 이름을 직접 말했다.");
    expect(view.container.textContent).toContain("이전 사실 채택");
    expect(view.container.textContent).toContain("신규 사실 채택");
    expect(view.container.textContent).toContain("나중에 보기");
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
});

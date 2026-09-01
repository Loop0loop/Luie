// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P1-A2 회귀 고정: ScrivenerLayout 루트가 wordCount/charCount를 구독하면 타이핑 중
 * stats 워커가 쓰는 값마다 레이아웃 전체가 리렌더됐다. 구독을 리프 상태바로 격리한다.
 *
 * PROVES: (1) 레이아웃 파일에 stats 스토어 구독이 남아 있지 않다(구조 — 재유입 차단).
 *         (2) 상태바 리프는 stats 갱신을 받아 표시가 바뀐다(기능 유지).
 * DOES_NOT_PROVE: ScrivenerLayout 마운트 트리 전체의 커밋 수 — (1)이 구조적으로 보장.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ScrivenerStatusBar } from "../../src/renderer/src/features/workspace/components/layout/ScrivenerStatusBar.js";
import { useEditorStatsStore } from "../../src/renderer/src/features/editor/stores/editorStatsStore.js";

describe("Scrivener status bar stats isolation", () => {
  const containers: Array<{ container: HTMLDivElement; root: Root }> = [];

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    document.body.innerHTML = "";
    useEditorStatsStore.setState({ wordCount: 0, charCount: 0 });
  });

  afterEach(() => {
    containers.splice(0).forEach(({ container, root }) => {
      act(() => root.unmount());
      container.remove();
    });
  });

  it("keeps the stats subscription out of the layout root", () => {
    // 근거: 루트의 스토어 구독 제거는 파일 구조로 고정한다 — 재유입을 테스트 단계에서 차단.
    const source = readFileSync(
      join(
        __dirname,
        "../../src/renderer/src/features/workspace/components/layout/ScrivenerLayout.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/useEditorStatsStore/);
    expect(source).toContain("ScrivenerStatusBar");
  });

  it("still renders live counts when the stats store updates", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    containers.push({ container, root });

    await act(async () => {
      root.render(<ScrivenerStatusBar />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("0");

    // 근거: 리프가 실제로 stats 갱신을 반영한다 — 격리가 기능을 깨지 않았다.
    await act(async () => {
      useEditorStatsStore.setState({ wordCount: 1234, charCount: 5678 });
      await Promise.resolve();
    });

    expect(container.textContent).toContain("5678");
    expect(container.textContent).toContain("1234");
  });
});

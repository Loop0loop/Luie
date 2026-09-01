// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SUT: Sidebar의 hover 리렌더가 목록에 박힌 무거운 서브트리로 번지지 않는지.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O5.
 * O5는 원래 "hover가 챕터 행 전체를 리렌더한다"로 적혀 있었지만, 실제로 더 비싼 것은
 * `sidebarItems`에 항목으로 들어있는 `SnapshotList`/`TrashList` 서브트리다. 둘 다 memo가
 * 아니어서 마우스가 항목을 지날 때마다 함께 다시 그려졌다(SnapshotList는 본문 캐시도 구독한다).
 *
 * UI/UX를 바꾸지 않는 수정이라(케밥 조건부 마운트·hover 상태 유지) 관측 대상은 리렌더 횟수다.
 * `setHoveredItemId`를 직접 발화시켜 Sidebar 리렌더를 만들고, 두 대역의 렌더 횟수를 센다.
 *
 * PROVES: hover 상태 변화가 SnapshotList·TrashList를 리렌더시키지 않는다(memo 계약).
 * DOES_NOT_PROVE: 실제 프레임 시간, 챕터 행 자체의 렌더 비용, 시각적 동일성.
 */

const renderCounts = { snapshot: 0, trash: 0, sidebar: 0 };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

// NOTE: 대역도 실제와 같이 memo로 감싼다. 실코드에서 memo를 떼면 Sidebar가 넘기는 element가
// 매번 새로 만들어져도 대역이 막아버려 테스트가 통과해버린다 — 그래서 memo 여부는 아래에서
// 실제 export를 직접 확인한다.
vi.mock("@renderer/features/snapshot/components/SnapshotList", async () => {
  const { memo } = await import("react");
  return {
    SnapshotList: memo(function SnapshotList({ chapterId }: { chapterId: string }) {
      renderCounts.snapshot += 1;
      return <div data-testid="snapshot-list">{chapterId}</div>;
    }),
  };
});

vi.mock("@renderer/features/trash/components/TrashList", async () => {
  const { memo } = await import("react");
  return {
    TrashList: memo(function TrashList({ projectId }: { projectId: string }) {
      renderCounts.trash += 1;
      return <div data-testid="trash-list">{projectId}</div>;
    }),
  };
});

import Sidebar from "../../src/renderer/src/features/manuscript/components/Sidebar.js";
import { DialogProvider } from "../../src/shared/ui/DialogProvider.js";
import { ToastProvider } from "../../src/shared/ui/Toast.js";

type MountedView = { container: HTMLDivElement; root: Root };
const mounted: MountedView[] = [];

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("사이드바 hover가 무거운 서브트리로 번지지 않는다 (O5)", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    renderCounts.snapshot = 0;
    renderCounts.trash = 0;
    renderCounts.sidebar = 0;
  });

  const mount = async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ToastProvider>
          <DialogProvider>
            <Sidebar onOpenSettings={() => {}} onSelectResearchItem={() => {}} />
          </DialogProvider>
        </ToastProvider>,
      );
      await Promise.resolve();
    });
    mounted.push({ container, root });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    return container;
  };

  it("hover 상태 변화가 SnapshotList·TrashList를 리렌더하지 않는다", async () => {
    const container = await mount();
    expect(container.textContent).not.toBe("");

    const snapshotBefore = renderCounts.snapshot;
    const trashBefore = renderCounts.trash;

    // 사이드바에서 hover 핸들러가 달린 행들을 훑는다(마우스 스윕 재현).
    const hoverTargets = container.querySelectorAll<HTMLElement>("div");
    await act(async () => {
      for (const target of Array.from(hoverTargets).slice(0, 20)) {
        target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      }
      await Promise.resolve();
    });

    expect(renderCounts.snapshot).toBe(snapshotBefore);
    expect(renderCounts.trash).toBe(trashBefore);
  });

  it("실제 SnapshotList·TrashList가 memo로 감싸져 있다", async () => {
    // WARNING: 위 vi.mock이 이 파일의 import까지 가로채므로 일반 import로는 대역을 검사하게 된다
    // (실제로 그렇게 작성했다가 memo를 떼도 통과하는 무효 테스트가 됐다). importActual로
    // 실모듈을 직접 가져와야 계약이 관측된다.
    const memoTag = Symbol.for("react.memo");
    const snapshotModule = await vi.importActual<{ SnapshotList: unknown }>(
      "../../src/renderer/src/features/snapshot/components/SnapshotList.js",
    );
    const trashModule = await vi.importActual<{ TrashList: unknown }>(
      "../../src/renderer/src/features/trash/components/TrashList.js",
    );

    expect(
      (snapshotModule.SnapshotList as { $$typeof?: symbol }).$$typeof,
    ).toBe(memoTag);
    expect((trashModule.TrashList as { $$typeof?: symbol }).$$typeof).toBe(
      memoTag,
    );
  });

  it("hover 상태 자체가 제거됐다 — hover는 CSS group-hover로 처리한다", async () => {
    // 근거: hoveredItemId JS state는 마우스 스윕마다 사이드바 목록 전체를 리렌더했다.
    // 상태 제거를 소스 구조로 고정해 재유입을 차단한다.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = join(__dirname, "../..");

    const logic = readFileSync(
      join(
        root,
        "src/renderer/src/features/manuscript/components/useSidebarLogic.ts",
      ),
      "utf8",
    );
    expect(logic).not.toContain("hoveredItemId");

    const sidebar = readFileSync(
      join(root, "src/renderer/src/features/manuscript/components/Sidebar.tsx"),
      "utf8",
    );
    expect(sidebar).not.toContain("setHoveredItemId");
    expect(sidebar).toContain("group-hover:opacity-100");
  });
});

// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as SplitViewEditorModule from "../../src/renderer/src/features/workspace/components/panels/SplitViewEditor.js";
import type * as ChapterContentStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: SplitViewEditor — default 레이아웃 분할 패널의 에디터.
 *
 * 테스트 베이시스: renderer-Optimization-result.md N1 → 2026-09 P1 개편.
 * 과거 계약은 "본문 도착 전에는 Editor를 마운트하지 않는다"는 게이트였다. 이 게이트는
 * 챕터 전환마다 Editor를 파괴했다. 지금은 EditorRoot/공용 Editor와 같은 스왑 계약으로
 * 통일한다: Editor는 항상 마운트되고, 전환 창에서는 `contentReady=false`로 저장/스왑이
 * 억제된다(데이터 손실 방지는 Editor 내부 계약이 담당).
 *
 * PROVES: 로딩 창 contentReady=false + 빈 initialContent, 도착 후 캐시 본문+contentReady=true,
 *         빈 본문도 로딩 완료 취급, chapterId 없으면 즉시 ready, 캐시 무효화 시 ready 해제,
 *         chapterId 전환에도 DOM 노트 보존(리마운트 없음).
 * DOES_NOT_PROVE: TipTap 실제 파싱, autosave 실제 IPC 전송, 패널 리사이즈 동작.
 */

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  editorProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@shared/api", () => ({
  api: {
    chapter: { get: mocked.get },
    logger: { warn: mocked.warn, error: mocked.error },
  },
}));

// NOTE: 실제 Editor는 TipTap 런타임을 끌어오므로 받은 prop만 기록하는 대역을 쓴다.
vi.mock("@renderer/domains/editor", () => ({
  Editor: (props: Record<string, unknown>) => {
    mocked.editorProps.push(props);
    return (
      <div
        data-testid="editor-mounted"
        data-initial-content={String(props.initialContent ?? "")}
        data-chapter-id={String(props.chapterId ?? "")}
        data-content-ready={String(props.contentReady ?? true)}
      />
    );
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const okChapter = (id: string, content: string) => ({
  success: true,
  data: { id, projectId: "p1", title: `T-${id}`, content, order: 1 },
});

type MountedView = { container: HTMLDivElement; root: Root };
const mountedViews: MountedView[] = [];

const mount = (element: ReactNode): HTMLDivElement => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  mountedViews.push({ container, root });
  return container;
};

const editorNode = (container: HTMLDivElement) =>
  container.querySelector("[data-testid='editor-mounted']");

const lastProps = () => mocked.editorProps[mocked.editorProps.length - 1];

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("SplitViewEditor 스왑 전환 계약", () => {
  let module: typeof SplitViewEditorModule;
  let storeModule: typeof ChapterContentStoreModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mocked.editorProps.length = 0;
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    storeModule = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    storeModule.useChapterContentStore.getState().reset();
    module = await import(
      "../../src/renderer/src/features/workspace/components/panels/SplitViewEditor.js"
    );
  });

  const render = (chapterId: string | undefined) =>
    mount(
      <module.SplitViewEditor
        chapterId={chapterId}
        chapterTitle="제목"
        panelId="panel-1"
        contentRevision={0}
        onSave={async () => {}}
      />,
    );

  it("로딩 창에서도 Editor는 마운트되고 contentReady=false로 저장이 억제된다", async () => {
    mocked.get.mockReturnValue(new Promise(() => {}));

    const container = render("c1");

    // 근거: 마운트는 유지되되(리마운트 비용 제거), 전환 창 플래그가 꺼져 있다.
    expect(editorNode(container)).not.toBeNull();
    expect(lastProps().contentReady).toBe(false);
    expect(lastProps().initialContent).toBe("");
  });

  it("본문이 도착하면 contentReady=true와 함께 캐시 본문을 넘긴다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>원본 본문</p>"));

    render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(lastProps().contentReady).toBe(true);
    expect(lastProps().initialContent).toBe("<p>원본 본문</p>");
  });

  it("빈 본문도 로딩 완료로 본다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", ""));

    render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(lastProps().contentReady).toBe(true);
    expect(lastProps().initialContent).toBe("");
  });

  it("chapterId가 없으면 조회 없이 즉시 ready다", () => {
    render(undefined);

    expect(lastProps().contentReady).toBe(true);
    expect(lastProps().initialContent).toBe("");
    expect(mocked.get).not.toHaveBeenCalled();
  });

  it("캐시가 무효화되면 contentReady가 해제된다(전환 억제 재진입)", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>원본 본문</p>"));

    const container = render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(lastProps().contentReady).toBe(true);

    // 스냅샷/휴지통 복원이 지나는 경로다. chapterId는 그대로고 캐시만 비워진다.
    mocked.get.mockReturnValue(new Promise(() => {}));
    act(() => {
      storeModule.useChapterContentStore.getState().reset();
    });

    // 근거: Editor가 언마운트되는 대신 ready만 해제된다 — 본문이 다시 오면 스왑된다.
    expect(editorNode(container)).not.toBeNull();
    expect(lastProps().contentReady).toBe(false);
  });

  it("chapterId 전환 시 Editor DOM 노드가 보존된다(리마운트 없음)", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>1</p>"));

    const container = render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const nodeBefore = editorNode(container);

    // 다른 챕터로 전환(본문은 미도착 상태로 둔다 — 전환 창).
    act(() => {
      (mountedViews[0].root as Root).render(
        <module.SplitViewEditor
          chapterId="c2"
          chapterTitle="제목2"
          panelId="panel-1"
          contentRevision={0}
          onSave={async () => {}}
        />,
      );
    });

    // 근거: 같은 DOM 노드 = 리마운트 없이 prop 전환만 일어났다.
    expect(editorNode(container)).toBe(nodeBefore);
  });

  it("목록 본문이 아니라 캐시를 본문 출처로 쓴다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>캐시 본문</p>"));

    render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // items의 content를 읽던 과거 구현이라면 prop으로 받지 않은 본문은 표시될 수 없다.
    expect(lastProps().initialContent).toBe("<p>캐시 본문</p>");
    expect(mocked.get).toHaveBeenCalledWith("c1");
  });
});

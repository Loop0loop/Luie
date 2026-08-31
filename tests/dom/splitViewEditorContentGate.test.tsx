// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as SplitViewEditorModule from "../../src/renderer/src/features/workspace/components/panels/SplitViewEditor.js";
import type * as ChapterContentStoreModule from "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js";

/**
 * SUT: SplitViewEditor — default 레이아웃 분할 패널의 에디터.
 *
 * 테스트 베이시스: renderer-Optimization-result.md N1.
 * 이 컴포넌트는 원래 `chapterStore.items`의 `content`를 직접 읽고 로딩 게이트가 없었다.
 * 그 상태로 목록에서 본문을 제거하면(O1-b2) 빈 본문으로 Editor가 마운트되고 autosave가
 * 원본을 덮어쓴다. 여기서 고정하는 계약은 "본문이 도착하기 전에는 Editor를 마운트하지
 * 않는다"와 "마운트할 때 캐시의 본문을 그대로 넘긴다"다.
 *
 * PROVES: 로딩 중 Editor 미마운트, 도착 후 캐시 본문 전달, chapterId 없을 때 즉시 마운트,
 *         캐시 무효화(reset) 시 게이트 재진입.
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

// NOTE: 실제 Editor는 TipTap 런타임을 끌어오므로 마운트 사실과 받은 prop만 기록하는 대역을
// 쓴다. 이 테스트의 관심사는 "언제 마운트되고 어떤 본문을 받는가"다.
vi.mock("@renderer/domains/editor", () => ({
  Editor: (props: Record<string, unknown>) => {
    mocked.editorProps.push(props);
    return (
      <div
        data-testid="editor-mounted"
        data-initial-content={String(props.initialContent ?? "")}
        data-chapter-id={String(props.chapterId ?? "")}
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

const isEditorMounted = (container: HTMLDivElement) =>
  container.querySelector("[data-testid='editor-mounted']") !== null;

const mountedContent = (container: HTMLDivElement) =>
  container
    .querySelector("[data-testid='editor-mounted']")
    ?.getAttribute("data-initial-content") ?? null;

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("SplitViewEditor 본문 로딩 게이트", () => {
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

  it("본문이 캐시에 없으면 Editor를 마운트하지 않는다", async () => {
    // 응답을 보류시켜 로딩 상태를 유지한다.
    mocked.get.mockReturnValue(new Promise(() => {}));

    const container = render("c1");

    expect(isEditorMounted(container)).toBe(false);
    expect(container.textContent).toBe("loading");
  });

  it("본문이 도착하면 캐시 본문으로 Editor를 마운트한다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>원본 본문</p>"));

    const container = render("c1");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(isEditorMounted(container)).toBe(true);
    expect(mountedContent(container)).toBe("<p>원본 본문</p>");
  });

  it("빈 본문도 로딩 완료로 보고 마운트한다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", ""));

    const container = render("c1");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(isEditorMounted(container)).toBe(true);
    expect(mountedContent(container)).toBe("");
  });

  it("chapterId가 없으면 조회 없이 즉시 마운트한다", () => {
    const container = render(undefined);

    expect(isEditorMounted(container)).toBe(true);
    expect(mountedContent(container)).toBe("");
    expect(mocked.get).not.toHaveBeenCalled();
  });

  it("캐시가 무효화되면 게이트가 다시 닫힌다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>원본 본문</p>"));

    const container = render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(isEditorMounted(container)).toBe(true);

    // 스냅샷/휴지통 복원이 지나는 경로다. chapterId는 그대로고 캐시만 비워진다.
    mocked.get.mockReturnValue(new Promise(() => {}));
    act(() => {
      storeModule.useChapterContentStore.getState().reset();
    });

    expect(isEditorMounted(container)).toBe(false);
  });

  it("목록 본문이 아니라 캐시를 본문 출처로 쓴다", async () => {
    mocked.get.mockResolvedValue(okChapter("c1", "<p>캐시 본문</p>"));

    const container = render("c1");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // items의 content를 읽던 과거 구현이라면 prop으로 받지 않은 본문은 표시될 수 없다.
    expect(mountedContent(container)).toBe("<p>캐시 본문</p>");
    expect(mocked.get).toHaveBeenCalledWith("c1");
  });
});

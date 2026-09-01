// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorAutosave } from "../../src/renderer/src/features/editor/hooks/useEditorAutosave.js";

/**
 * HIGH-7 데이터 손실 회귀 고정: 챕터 전환 창에서 자동 저장이 발화하면 "옛 본문을 새
 * 챕터에 쓰는" 사고가 난다. 전환 커밋에서 (1) 미저장 draft가 직전 챕터로 명시 저장되고
 * (2) 전환 창(suppressed) 동안 저장 활동이 멈추는지 고정한다.
 *
 * PROVES: 전환 시 직전 챕터 타겟 flush, suppressed 동안 저장 무시, 복구 후 새 챕터
 *         대상 자동 저장 재개.
 * DOES_NOT_PROVE: handleSave의 실제 IPC 라우팅(3번째 인자 소비) — handleSaveDecisionTable
 *         테스트와 본문 캐시 테스트가 담당한다.
 */

const mocked = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  setDirty: vi.fn(),
  showToast: vi.fn(),
  t: (key: string) => key,
  setSaveStatus: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  api: { logger: mocked.logger, lifecycle: { setDirty: mocked.setDirty } },
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({ showToast: mocked.showToast }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mocked.t }),
}));

vi.mock(
  "@renderer/features/editor/stores/editorStatsStore",
  () => ({
    useEditorStatsStore: {
      getState: () => ({ setSaveStatus: mocked.setSaveStatus }),
    },
  }),
);

type AutosaveProps = Parameters<typeof useEditorAutosave>[0];

const mountAutosave = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let current: AutosaveProps | null = null;

  function Harness() {
    useEditorAutosave(current as AutosaveProps);
    return null;
  }

  const render = async (props: AutosaveProps) => {
    current = props;
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const rerender = async (props: AutosaveProps) => {
    current = props;
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { render, rerender, advance, cleanup };
};

describe("useEditorAutosave chapter targeting across a chapter switch", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("flushes the unsaved draft to the PREVIOUS chapter when the chapter changes mid-debounce", async () => {
    const onSave = vi.fn(async () => {});
    const view = mountAutosave();

    await view.render({
      onSave,
      title: "T1",
      content: "<p>A</p>",
      chapterId: "ch-a",
    });
    // 타이핑: debounce(300ms) armed.
    await view.rerender({
      onSave,
      title: "T1-edit",
      content: "<p>A</p>",
      chapterId: "ch-a",
    });

    // debounce가 끝나기 전에 사용자가 ch-b 클릭(전환 커밋 + 새 본문 미도착).
    await view.rerender({
      onSave,
      title: "T1-edit",
      content: "<p>A</p>",
      chapterId: "ch-b",
      suppressed: true,
    });

    // 근거 1: 전환 커밋에서 직전 챕터(ch-a)로 명시 저장됐다.
    expect(onSave).toHaveBeenCalledWith("T1-edit", "<p>A</p>", "ch-a");

    await view.advance(1000);

    // 근거 2: 전환 창 이후 어떤 저장도 ch-b(또는 무지정)로 옛 본문을 쓰지 않는다.
    const misdirected = onSave.mock.calls.filter(
      (call) => call[2] !== "ch-a",
    );
    expect(misdirected).toEqual([]);

    view.cleanup();
  });

  it("suppresses all saves during the switch window and resumes targeting the new chapter after recovery", async () => {
    const onSave = vi.fn(async () => {});
    const view = mountAutosave();

    await view.render({
      onSave,
      title: "T1",
      content: "<p>A</p>",
      chapterId: "ch-a",
    });
    await view.rerender({
      onSave,
      title: "T1-edit",
      content: "<p>A</p>",
      chapterId: "ch-a",
    });
    await view.rerender({
      onSave,
      title: "T1-edit",
      content: "<p>A</p>",
      chapterId: "ch-b",
      suppressed: true,
    });
    const callsAtSwitch = onSave.mock.calls.length;

    // 전환 창 동안 draft가 다시 변해도 저장이 발화하지 않는다.
    await view.rerender({
      onSave,
      title: "T1-edit2",
      content: "<p>A</p>",
      chapterId: "ch-b",
      suppressed: true,
    });
    await view.advance(1000);
    expect(onSave.mock.calls.length).toBe(callsAtSwitch);

    // 새 본문 도착: suppressed 해제 → 새 챕터 대상으로 자동 저장 재개.
    await view.rerender({
      onSave,
      title: "T2",
      content: "<p>B</p>",
      chapterId: "ch-b",
      suppressed: false,
    });
    await view.advance(1000);

    // 근거: 복구 후 저장은 ch-b로 라우팅된다(옛 내용이 아닌 새 본문).
    const resumed = onSave.mock.calls.find(
      (call) => call[2] === "ch-b",
    );
    expect(resumed).toEqual(["T2", "<p>B</p>", "ch-b"]);

    view.cleanup();
  });
});

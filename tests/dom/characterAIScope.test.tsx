// @vitest-environment jsdom

import { act, useEffect } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@shared/api";
import {
  useCharacterAI,
  type UseCharacterAI,
} from "../../src/renderer/src/features/research/components/wiki/hooks/useCharacterAI";

vi.mock("@shared/api", () => ({
  api: {
    character: {
      generateImage: vi.fn(),
      generateQuote: vi.fn(),
      generateStats: vi.fn(),
    },
  },
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

function Probe({
  scopeKey,
  onReady,
}: {
  scopeKey: string;
  onReady: (controls: UseCharacterAI) => void;
}) {
  const controls = useCharacterAI(scopeKey);

  useEffect(() => {
    onReady(controls);
  }, [controls, onReady]);

  return null;
}

describe("useCharacterAI scope guard", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
  });

  it("ignores AI results that resolve after the character scope changes", async () => {
    let controls: UseCharacterAI | null = null;
    const setControls = (next: UseCharacterAI) => {
      controls = next;
    };
    const view = mountView(<Probe scopeKey="character-a" onReady={setControls} />);
    mountedViews.push(view);
    await flushAsync();

    const imageResult = createDeferred<{ success: true; data: string }>();
    vi.mocked(api.character.generateImage).mockReturnValueOnce(
      imageResult.promise,
    );
    const onSuccess = vi.fn();
    let generateTask: Promise<void> | undefined;
    await act(async () => {
      generateTask = controls?.generateImage({ name: "A" }, onSuccess);
      await Promise.resolve();
    });

    act(() => {
      view.root.render(<Probe scopeKey="character-b" onReady={setControls} />);
    });
    await flushAsync();

    imageResult.resolve({ success: true, data: "asset://character-a.png" });
    await act(async () => {
      await generateTask;
      await Promise.resolve();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

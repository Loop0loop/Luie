// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: preview import는 렌더 시점까지 지연되고, pending/rejected에서도 dock은 조작 가능하다.
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const deferred = vi.hoisted(() => ({
  wizardLoads: 0,
  layoutLoads: 0,
  resolveWizard: undefined as (() => void) | undefined,
  rejectLayout: undefined as ((reason: Error) => void) | undefined,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@shared/ui/GlobalDragContext", () => ({
  GlobalDragContext: ({ children }: { children: ReactNode }) => children,
}));
vi.mock(
  "../../src/renderer/src/features/startup/components/preview/WizardEditor",
  async () => {
    deferred.wizardLoads++;
    await new Promise<void>((resolve) => {
      deferred.resolveWizard = resolve;
    });
    return {
      WizardEditor: () => <div role="article">loaded theme preview</div>,
    };
  },
);
vi.mock(
  "../../src/renderer/src/features/startup/components/preview/LayoutLivePreview",
  async () => {
    deferred.layoutLoads++;
    await new Promise<void>((_resolve, reject) => {
      deferred.rejectLayout = reject;
    });
    return { LayoutLivePreview: () => null };
  },
);

import { ThemeStep } from "../../src/renderer/src/features/startup/components/steps/ThemeStep";
import { LayoutStep } from "../../src/renderer/src/features/startup/components/steps/LayoutStep";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

describe("P1 deferred previews", () => {
  it("P1-DOM-01: module import does not load previews; theme controls survive pending and resolution", async () => {
    expect(deferred.wizardLoads).toBe(0);
    expect(deferred.layoutLoads).toBe(0);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onThemeChange = vi.fn();
    try {
      await act(async () => {
        root.render(
          <ThemeStep
            theme="light"
            themeTemp="neutral"
            onThemeChange={onThemeChange}
            onThemeTempChange={vi.fn()}
            onPrevious={onPrevious}
            onNext={onNext}
          />,
        );
      });
      expect(deferred.wizardLoads).toBe(1);
      expect(deferred.layoutLoads).toBe(0);
      expect(container.querySelector("article")).toBeNull();
      const button = (label: string) => {
        const match = Array.from(container.querySelectorAll("button")).find(
          (item) => item.textContent === `startupWizard.onboarding.${label}`,
        );
        if (!match) throw new Error(`Missing button: ${label}`);
        return match;
      };
      act(() => {
        button("themeDark").click();
        button("previous").click();
        button("next").click();
      });
      expect(onThemeChange).toHaveBeenCalledWith("dark");
      expect(onPrevious).toHaveBeenCalledOnce();
      expect(onNext).toHaveBeenCalledOnce();
      await act(async () => {
        deferred.resolveWizard?.();
      });
      expect(container.textContent).toContain("loaded theme preview");
      expect(deferred.wizardLoads).toBe(1);
    } finally {
      act(() => root.unmount());
    }
  });

  it("P1-DOM-02: rejected layout import retains fallback and previous/finish controls", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    // 예상된 chunk 실패만 이 테스트에서 수집한다. 제품 오류 로깅은 유지한다.
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const container = document.createElement("div");
    const root = createRoot(container);
    const onPrevious = vi.fn();
    const onFinish = vi.fn();
    try {
      await act(async () => {
        root.render(
          <LayoutStep
            uiMode="default"
            onUiModeChange={vi.fn()}
            onPrevious={onPrevious}
            onFinish={onFinish}
          />,
        );
      });
      expect(deferred.layoutLoads).toBe(1);
      await act(async () => {
        deferred.rejectLayout?.(new Error("P1_TEST_CHUNK_FAILURE"));
      });
      expect(errors).toHaveBeenCalled();
      expect(container.textContent).toContain(
        "startupWizard.onboarding.layoutTitle",
      );
      for (const label of ["previous", "finish"]) {
        const button = Array.from(container.querySelectorAll("button")).find(
          (item) => item.textContent === `startupWizard.onboarding.${label}`,
        );
        expect(button).toBeDefined();
        act(() => button?.click());
      }
      expect(onPrevious).toHaveBeenCalledOnce();
      expect(onFinish).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });
});

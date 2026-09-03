import type { ReactNode } from "react";

interface WizardFloatingDockProps {
  title: string;
  children: ReactNode;
  onPrevious?: () => void;
  previousLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
}

export function WizardDockDivider() {
  return <span aria-hidden className="mx-0.5 h-8 w-px self-center bg-border/80" />;
}

/**
 * Apple HIG Liquid Glass 원칙을 구현한 위저드 하단 플로팅 독 컴포넌트.
 * 테마 설정, 레이아웃 설정 등 전체 화면 프리뷰 위에서 인터랙션 제어부를 단일 규격으로 제공한다.
 */
export function WizardFloatingDock({
  title,
  children,
  onPrevious,
  previousLabel,
  onNext,
  nextLabel,
}: WizardFloatingDockProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3.5 rounded-editor-shell border border-border/70 bg-panel/55 px-5 py-3 shadow-panel backdrop-blur-2xl">
        <span className="shrink-0 pr-1 text-sm font-semibold text-fg">
          {title}
        </span>
        {children}
        {(onPrevious || onNext) && (
          <>
            <WizardDockDivider />
            <div className="flex items-center gap-2 self-center">
              {onPrevious && previousLabel && (
                <button
                  type="button"
                  onClick={onPrevious}
                  className="rounded-control border border-border/70 bg-surface/70 px-4 py-1.5 text-sm font-medium text-fg shadow-xs transition-all hover:bg-surface hover:border-border active:scale-[0.98]"
                >
                  {previousLabel}
                </button>
              )}
              {onNext && nextLabel && (
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-control bg-accent px-5 py-1.5 text-sm font-medium text-on-accent shadow-control transition-all hover:bg-accent-bg-hover active:scale-[0.98]"
                >
                  {nextLabel}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

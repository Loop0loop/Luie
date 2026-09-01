import type { LayoutChoice } from "../../types/wizard";

/** 레이아웃 옵션 썸네일. 실제 레이아웃은 창 전체를 차지하므로 선택 바 안의
 * 썸네일은 순수 도형으로 같은 창 구조를 축소 그린다. */
const barClass = "rounded-[2px] bg-element";
const pane = "rounded-[3px] border border-border";

interface LayoutThumbProps {
  id: LayoutChoice;
  className: string;
}

export function LayoutThumb({ id, className }: LayoutThumbProps) {
  const editorPane = (
    <div className={`${pane} flex min-w-0 flex-1 flex-col gap-1 bg-editor-bg p-1.5`}>
      <span className={`block h-2 w-full ${barClass}`} />
      <span className={`block h-1.5 w-3/4 ${barClass}`} />
      <span className={`block h-1.5 w-5/6 ${barClass}`} />
    </div>
  );

  if (id === "default") {
    return (
      <div aria-hidden className={`flex w-full gap-1 rounded-control border border-border bg-app p-1.5 ${className}`}>
        <div className={`${pane} w-1/4 bg-sidebar p-1.5`}>
          <span className={`block h-1.5 w-3/4 ${barClass}`} />
          <span className={`mt-1 block h-1.5 w-1/2 ${barClass}`} />
        </div>
        {editorPane}
        <div className={`${pane} w-1/5 bg-panel`} />
      </div>
    );
  }
  if (id === "docs") {
    return (
      <div aria-hidden className={`flex w-full flex-col gap-1 rounded-control border border-border bg-app p-1.5 ${className}`}>
        <div className={`${pane} h-2.5 w-full bg-sidebar`} />
        <div className="flex min-h-0 flex-1 gap-1">
          <div className={`${pane} w-1/6 bg-sidebar`} />
          <div className="flex min-w-0 flex-1 justify-center">
            <div className={`${pane} h-full w-3/5 bg-panel p-1.5`}>
              <span className={`block h-1.5 w-full ${barClass}`} />
              <span className={`mt-1 block h-1.5 w-5/6 ${barClass}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (id === "editor") {
    return (
      <div aria-hidden className={`flex w-full gap-1 rounded-control border border-border bg-app p-1.5 ${className}`}>
        <div className={`${pane} w-6 bg-sidebar`} />
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="flex h-full w-4/5 flex-col">{editorPane}</div>
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden className={`flex w-full gap-1 rounded-control border border-border bg-app p-1.5 ${className}`}>
      <div className={`${pane} w-1/5 bg-sidebar p-1.5`}>
        <span className={`block h-1.5 w-3/4 ${barClass}`} />
      </div>
      {editorPane}
      <div className={`${pane} w-1/5 bg-index-card`} />
    </div>
  );
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const GOOGLE_DOCS_LAYOUT =
  "src/renderer/src/features/workspace/components/layout/GoogleDocsLayout.tsx";
const GOOGLE_DOCS_RIGHT_PANEL =
  "src/renderer/src/features/workspace/components/layout/GoogleDocsRightPanel.tsx";
const GOOGLE_DOCS_LAYOUT_STATE =
  "src/renderer/src/features/workspace/components/layout/useGoogleDocsLayoutState.ts";

describe("GoogleDocs layout panel wiring", () => {
  it("drives the sidebar in px, not in ratio", () => {
    const source = readSource(GOOGLE_DOCS_LAYOUT);

    // min/max가 px 상수이므로 폭도 px로 저장/서빙한다. ratio로 두면 모니터 폭에 따라 같은
    // 값이 밴드를 벗어나 cap으로 클램프되고, 그 클램프 결과가 사용자 폭으로 저장돼 고착된다.
    expect(source).toContain("{shouldRenderSidebar && (");
    expect(source).toContain("defaultSize={docsSidebarOpenSize}");
    expect(source).toContain('groupResizeBehavior="preserve-pixel-size"');
    expect(source).toContain("toPxSize(docsSidebarWidthConfig.minPx)");
    expect(source).toContain("toPxSize(docsSidebarWidthConfig.maxPx)");
    expect(source).not.toContain("safeDocsSidebarRatio");
  });

  it("gates sidebar width persistence on a real handle gesture", () => {
    const source = readSource(GOOGLE_DOCS_LAYOUT);
    const stateSource = readSource(GOOGLE_DOCS_LAYOUT_STATE);

    // `useSidebarResizeCommit`은 핸들에서 시작된 pointer/키보드 조작만 저장한다.
    // resizeHandleProps를 빼먹으면 저장이 조용히 멈춘다.
    expect(stateSource).toContain('useSidebarResizeCommit("docsBinder"');
    expect(source).toContain("{...sidebarResize.resizeHandleProps}");
    expect(source).toContain("onResize={sidebarResize.onResize}");
    // 사이드바는 더 이상 ratio 저장 경로를 쓰지 않는다.
    expect(stateSource).not.toContain("buildDocsSidebarLayoutPersistEntries");
  });

  it("derives the right panel id from its surface so research tabs share one", () => {
    const source = readSource(GOOGLE_DOCS_RIGHT_PANEL);

    expect(source).toContain("getDocsRightPanelId(renderedTab)");
    // 탭 이름을 그대로 id에 넣으면 탭마다 layout 캐시가 갈린다.
    expect(source).not.toContain("`right-context-panel-${renderedTab}`");
  });

  it("does not gate persistence on the global layout-restoring attribute", () => {
    // `data-layout-restoring`은 `useFixedPixelPanelGroupLayout`이 컨테이너 폭 변화마다
    // 켜므로, 다른 패널을 드래그하는 동안에도 켜져 있다. 저장 억제에 쓰면 사이드바 폭이
    // 드래그 내내 저장되지 않는다.
    const source = readSource(
      "src/renderer/src/features/workspace/hooks/useLayoutPersist.ts",
    );

    expect(source).toContain("if (isLayoutPersistenceSuppressed()) {");
    expect(source).not.toContain("isLayoutRestoring");
  });
});

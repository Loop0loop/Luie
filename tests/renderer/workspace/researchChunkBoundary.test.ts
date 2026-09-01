// TEST_LEVEL: STRUCTURE (import-graph policy)
// PROVES: research 패널 lazy 청크가 domains/world barrel을 경유하지 않는다는 것.
//         barrel 경유 시 WorldSection의 정적 import(MindMapBoard=reactflow,
//         CanvasPane=canvas 피처)와 AnalysisSection(chat/RAG 런타임)까지 첫 오픈
//         청크에 흡수됐다. 아울러 barrel 자체의 삭제와 사이드바/문서 레일의 청크
//         prefetch 존재을 검증한다.
// DOES_NOT_PROVE: 실제 번들 크기 감소 폭과 런타임 지연 시간 — 그 근거는 빌드 산출물
//         분석(rollup-plugin-visualizer 등)이 필요하다.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");
const read = (relativePath: string) =>
  readFileSync(join(ROOT, relativePath), "utf8");

const PANEL_HOSTS = [
  "src/renderer/src/features/workspace/components/panels/WorkspacePanels.tsx",
  "src/renderer/src/features/workspace/components/layout/GoogleDocsRightPanel.tsx",
  "src/renderer/src/features/manuscript/components/BinderSidebarPanelBody.tsx",
  "src/renderer/src/features/workspace/components/layout/ScrivenerLayout.tsx",
  "src/renderer/src/app/App.tsx",
] as const;

describe("research panel chunk boundary", () => {
  it("no workspace host routes the research panel through the domains/world barrel", () => {
    // 근거: barrel 재수출(WorldSection 등)은 reactflow/canvas/analysis를 청크에 끌어들인다.
    for (const file of PANEL_HOSTS) {
      expect(read(file), `${file} must not import @renderer/domains/world`).not.toContain(
        '@renderer/domains/world"',
      );
    }
  });

  it("the domains/world barrel is deleted so future code cannot regress through it", () => {
    // 근거: 파일이 없으면 임포트 자체가 컴파일 실패로 조기에 드러난다.
    expect(
      existsSync(join(ROOT, "src/renderer/src/domains/world/index.ts")),
    ).toBe(false);
    expect(
      existsSync(join(ROOT, "src/renderer/src/domains/world/WorldSection.tsx")),
    ).toBe(false);
  });

  it("sidebar and docs rail prefetch the research panel chunk on user intent", () => {
    // 근거: 첫 오픈 청크 fetch가 클릭 직렬 대기열에 서지 않게 hover/pointerdown에서
    // 미리 깐다. 호출부는 공용 prefetch 서비스를 쓰고, 서비스가 패널 파일을 직접 로드한다.
    const prefetchService = read(
      "src/renderer/src/features/workspace/services/chunkPrefetch.ts",
    );
    expect(prefetchService).toContain(
      '@renderer/features/research/components/ResearchPanel"',
    );

    const sidebar = read(
      "src/renderer/src/features/manuscript/components/Sidebar.tsx",
    );
    expect(sidebar).toContain("prefetchResearchPanel");

    const rail = read(
      "src/renderer/src/features/workspace/components/layout/GoogleDocsPanelRail.tsx",
    );
    expect(rail).toContain("prefetchResearchPanel");
  });

  it("the editor root chunk does not statically bind the analysis runtime", () => {
    // 근거: AnalysisSection은 chat/RAG 런타임 그래프를 끌어온다. FloatingAnalysisPanel이
    // 정적 import면 분석을 한 번도 안 열어도 에디터 루트 청크가 비용을 부담한다.
    const floating = read(
      "src/renderer/src/features/workspace/components/layout/FloatingAnalysisPanel.tsx",
    );
    expect(floating).toMatch(/lazy\(\s*\(\) =>\s*import\("@renderer\/features\/research\/components\/AnalysisSection"\)/);
    expect(floating).not.toContain('import AnalysisSection from');
  });
});

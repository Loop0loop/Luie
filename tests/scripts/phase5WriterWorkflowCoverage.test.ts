import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const coverageDocPath = "docs/phase/phase-5-writer-workflow-coverage.md";

const workflowCoverage = [
  {
    title: "설정 질문",
    files: [
      {
        path: "tests/dom/analysisMessageSafety.test.tsx",
        mustContain: "shows evidence quotes before the assistant answer",
      },
      {
        path: "tests/dom/promptComposerTimelineScope.test.tsx",
        mustContain: "shows the current chapter as the answer timeline basis",
      },
    ],
  },
  {
    title: "집필 중 충돌 자동 감지",
    files: [
      {
        path: "tests/dom/conflictQueuePanelWriterFlow.test.tsx",
        mustContain: "shows both conflict quotes and writer decision actions",
      },
      {
        path: "tests/main/services/ragGrounding.test.ts",
        mustContain: "marks answers with conflicting narrative memory as conflicting",
      },
    ],
  },
  {
    title: "과거 회차 수정",
    files: [
      {
        path: "tests/main/services/memory/memoryEvidenceChunkLinkRepair.test.ts",
        mustContain: "relinks stale episode evidence and entity mentions to current chunks",
      },
      {
        path: "tests/main/services/memory/review/memoryReviewBacklogReport.test.ts",
        mustContain: "includes stale confirmed evidence as review backlog items after repair cannot resolve it",
      },
    ],
  },
  {
    title: "초안 폐기",
    files: [
      {
        path: "tests/main/services/ragGrounding.test.ts",
        mustContain: "maps draft or deleted fact failures to a non-canonical safety block",
      },
      {
        path: "tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts",
        mustContain: "blocks draft or discarded facts from becoming confirmed canonical memory",
      },
    ],
  },
  {
    title: "인물명/별칭 변경",
    files: [
      {
        path: "tests/main/services/memory/entity/memoryEntityReviewService.test.ts",
        mustContain: "confirms a suggested alias and canonical entity",
      },
      {
        path: "tests/main/services/memory/entity/memoryEntityReviewService.test.ts",
        mustContain: "splits an alias and alias-linked mentions into a new canonical entity",
      },
    ],
  },
  {
    title: "회차 순서 변경",
    files: [
      {
        path: "tests/main/services/memory/eval/memoryEvalRunner.test.ts",
        mustContain: "uses stored query chapter order to catch future facts when answerer omits it",
      },
      {
        path: "tests/main/services/memory/eval/memoryEvalScoring.test.ts",
        mustContain: "flags future facts used for past-time answers",
      },
    ],
  },
] as const;

describe("Phase 5 writer workflow coverage", () => {
  it("documents and anchors all required writer workflow scenarios", () => {
    const docAbsolutePath = resolve(process.cwd(), coverageDocPath);

    expect(existsSync(docAbsolutePath)).toBe(true);

    const coverageDoc = readFileSync(docAbsolutePath, "utf8");
    for (const workflow of workflowCoverage) {
      expect(coverageDoc).toContain(workflow.title);
      for (const file of workflow.files) {
        expect(coverageDoc).toContain(file.path);
        const source = readFileSync(resolve(process.cwd(), file.path), "utf8");
        expect(source).toContain(file.mustContain);
      }
    }
  });
});

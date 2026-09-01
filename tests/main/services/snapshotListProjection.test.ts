// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: 스냅샷 "목록" 조회(getSnapshotsByChapter)가 본문(content) 컬럼 없는 요약 행만
//         반환해 IPC 페이로드에서 원고 전문 직렬화가 제거됐다는 것과, 개별 조회(
//         getSnapshotById)만 전문을 반환한다는 것
// DOES_NOT_PROVE: renderer 로딩 UI 동작, Electron IPC orchestration, restore 트랜잭션 무결성

import { describe, it, expect, vi, beforeAll } from "vitest";
import { SnapshotService } from "../../../src/main/services/features/snapshot/snapshotService.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { generateText } from "../../helpers/generateText";

const snapshotService = new SnapshotService();
const chapterService = new ChapterService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
    () => {},
  );
  vi.spyOn(localProjectService, "attemptImmediatePackageExport").mockResolvedValue(
    { exported: false },
  );
  vi.spyOn(localProjectService, "persistPackageAfterMutation").mockResolvedValue(
    undefined,
  );
});

describe("SnapshotService list projection", () => {
  it("returns summary rows without content from getSnapshotsByChapter, and full content only from getSnapshotById", async () => {
    const project = await localProjectService.createProject({
      title: "Snapshot Projection Project",
      description: "unit",
      projectPath: "/tmp/snap-projection.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Projection Chapter",
    });

    const heavyContent = generateText(50_000);
    const created = await snapshotService.createSnapshot({
      projectId: project.id as string,
      chapterId: chapter.id as string,
      content: heavyContent,
      description: "projection snapshot",
      type: "AUTO",
    });

    const list = await snapshotService.getSnapshotsByChapter(
      chapter.id as string,
    );
    const listed = list.find((row) => row.id === created.id);

    // 근거 1: 목록 행에 본문이 실리지 않는다 → 스냅샷 N개 챕터의 목록 IPC가
    // "스냅샷 수 × 원고 크기" 직렬화 비용을 내지 않는다.
    expect(listed).toBeDefined();
    expect(listed?.content).toBeUndefined();
    // 근거 2: 목록 UI가 실제로 소비하는 메타데이터 컬럼은 유지된다.
    expect(listed?.projectId).toBe(project.id);
    expect(listed?.chapterId).toBe(chapter.id);
    expect(listed?.description).toBe("projection snapshot");
    expect(listed?.type).toBe("AUTO");
    expect(listed?.createdAt).toBeDefined();

    // 근거 3: 전문이 필요한 소비자(뷰어 비교, 복원 시딩)는 개별 조회로 전문을 받는다.
    const full = await snapshotService.getSnapshot(created.id as string);
    expect(full).not.toBeNull();
    expect(full?.content).toBe(heavyContent);
    expect(full?.id).toBe(created.id);
  });
});

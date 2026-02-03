import { describe, it, expect, vi, beforeAll } from "vitest";
import { SnapshotService } from "../../../src/main/services/features/snapshotService.js";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import { ProjectService } from "../../../src/main/services/core/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtractService.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { generateText } from "../../helpers/generateText";

const snapshotService = new SnapshotService();
const chapterService = new ChapterService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
});

describe("SnapshotService", () => {
  it("creates and restores snapshot", async () => {
    const project = await localProjectService.createProject({
      title: "Snapshot Project",
      description: "unit",
      projectPath: "/tmp/snap.luie",
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id as string,
      title: "Chapter 1",
    });

    const originalContent = generateText(50000);
    await chapterService.updateChapter({ id: chapter.id as string, content: originalContent });

    const snapshot = await snapshotService.createSnapshot({
      projectId: project.id as string,
      chapterId: chapter.id as string,
      content: originalContent,
      description: "unit snapshot",
    });

    await chapterService.updateChapter({
      id: chapter.id as string,
      content: "changed",
    });

    await snapshotService.restoreSnapshot(snapshot.id as string);

    const restored = await chapterService.getChapter(chapter.id as string);
    expect(restored.content).toBe(originalContent);
  });
});

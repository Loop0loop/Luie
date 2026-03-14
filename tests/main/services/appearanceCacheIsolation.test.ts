import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChapterService } from "../../../src/main/services/core/chapterService.js";
import {
  ProjectService,
  projectService,
} from "../../../src/main/services/core/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { cacheDb } from "../../../src/main/database/cacheDb.js";
import { CharacterService } from "../../../src/main/services/world/characterService.js";
import { TermService } from "../../../src/main/services/world/termService.js";
import { worldMentionService } from "../../../src/main/services/world/worldMentionService.js";

const chapterService = new ChapterService();
const characterService = new CharacterService();
const termService = new TermService();
const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
    exported: false,
  });
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
});

describe("appearance cache isolation", () => {
  it("rebuilds chapter appearance cache without duplicate rows and mention lookup reads cache", async () => {
    const project = await localProjectService.createProject({
      title: "Appearance Cache Project",
      description: "cache",
      projectPath: "/tmp/appearance-cache-project.luie",
    });
    const projectId = String(project.id);

    const character = await characterService.createCharacter({
      projectId,
      name: "하린",
    });
    await termService.createTerm({
      projectId,
      term: "아르콜로지",
    });
    const chapter = await chapterService.createChapter({
      projectId,
      title: "Chapter 1",
    });

    const content = "하린 이 아르콜로지 로 들어왔다.";
    await chapterService.updateChapter({ id: String(chapter.id), content });
    await chapterService.updateChapter({ id: String(chapter.id), content });

    const characterAppearances = await characterService.getAppearancesByChapter(
      String(chapter.id),
    );
    const termAppearances = await termService.getAppearancesByChapter(
      String(chapter.id),
    );
    const mentions = await worldMentionService.getMentions({
      projectId,
      entityId: String(character.id),
      entityType: "Character",
    });

    expect(characterAppearances).toHaveLength(1);
    expect(characterAppearances[0]).toMatchObject({
      characterId: String(character.id),
      chapterId: String(chapter.id),
    });
    expect(termAppearances).toHaveLength(1);
    expect(mentions).toEqual([
      expect.objectContaining({
        chapterId: String(chapter.id),
        source: "appearance",
      }),
    ]);
  });

  it("rebuilds existing chapter cache when a character is added after manuscript content already exists", async () => {
    const project = await localProjectService.createProject({
      title: "Late Character Project",
      description: "cache",
      projectPath: "/tmp/late-character-project.luie",
    });
    const projectId = String(project.id);
    const chapter = await chapterService.createChapter({
      projectId,
      title: "Chapter 1",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "하린 이 등장인물 정의 보다 먼저 나타났다.",
    });

    expect(
      await cacheDb.getClient().characterAppearance.count({
        where: { projectId },
      }),
    ).toBe(0);

    const character = await characterService.createCharacter({
      projectId,
      name: "하린",
    });

    const appearances = await characterService.getAppearancesByChapter(
      String(chapter.id),
    );

    expect(appearances).toHaveLength(1);
    expect(appearances[0]).toMatchObject({
      characterId: String(character.id),
      chapterId: String(chapter.id),
    });
  });

  it("clears cache rows when a project is deleted", async () => {
    const project = await localProjectService.createProject({
      title: "Delete Cache Project",
      description: "cache",
      projectPath: "/tmp/delete-cache-project.luie",
    });
    const projectId = String(project.id);
    await characterService.createCharacter({
      projectId,
      name: "하린",
    });
    const chapter = await chapterService.createChapter({
      projectId,
      title: "Chapter 1",
    });

    await chapterService.updateChapter({
      id: String(chapter.id),
      content: "하린 은 삭제 전까지 캐시에 남아 있다.",
    });

    expect(
      await cacheDb.getClient().characterAppearance.count({
        where: { projectId },
      }),
    ).toBeGreaterThan(0);

    await localProjectService.deleteProject(projectId);

    expect(
      await cacheDb.getClient().characterAppearance.count({
        where: { projectId },
      }),
    ).toBe(0);
    expect(
      await cacheDb.getClient().termAppearance.count({
        where: { projectId },
      }),
    ).toBe(0);
  });
});

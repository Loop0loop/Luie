/**
 * IPC Handlers - Main process IPC 핸들러 등록
 */

import { ipcMain } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import {
  IPC_CHANNELS,
  createSuccessResponse,
  createErrorResponse,
} from "../../shared/ipc/index.js";
import {
  projectService,
  chapterService,
  characterService,
  termService,
  snapshotService,
  searchService,
} from "../services/index.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ChapterCreateInput,
  ChapterUpdateInput,
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterAppearanceInput,
  TermCreateInput,
  TermUpdateInput,
  TermAppearanceInput,
  SnapshotCreateInput,
  SearchQuery,
} from "../../shared/types/index.js";

const logger = createLogger("IPCHandler");

export function registerIPCHandlers(): void {
  // Project Handlers
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_CREATE,
    async (_, input: ProjectCreateInput) => {
      try {
        const project = await projectService.createProject(input);
        return createSuccessResponse(project);
      } catch (error) {
        logger.error("PROJECT_CREATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to create project",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET, async (_, id: string) => {
    try {
      const project = await projectService.getProject(id);
      return createSuccessResponse(project);
    } catch (error) {
      logger.error("PROJECT_GET failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get project",
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ALL, async () => {
    try {
      const projects = await projectService.getAllProjects();
      return createSuccessResponse(projects);
    } catch (error) {
      logger.error("PROJECT_GET_ALL failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get all projects",
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE,
    async (_, input: ProjectUpdateInput) => {
      try {
        const project = await projectService.updateProject(input);
        return createSuccessResponse(project);
      } catch (error) {
        logger.error("PROJECT_UPDATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to update project",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_, id: string) => {
    try {
      const result = await projectService.deleteProject(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("PROJECT_DELETE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to delete project",
      );
    }
  });

  // Chapter Handlers
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_CREATE,
    async (_, input: ChapterCreateInput) => {
      try {
        const chapter = await chapterService.createChapter(input);
        return createSuccessResponse(chapter);
      } catch (error) {
        logger.error("CHAPTER_CREATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to create chapter",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CHAPTER_GET, async (_, id: string) => {
    try {
      const chapter = await chapterService.getChapter(id);
      return createSuccessResponse(chapter);
    } catch (error) {
      logger.error("CHAPTER_GET failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get chapter",
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAPTER_GET_ALL, async (_, projectId: string) => {
    try {
      const chapters = await chapterService.getAllChapters(projectId);
      return createSuccessResponse(chapters);
    } catch (error) {
      logger.error("CHAPTER_GET_ALL failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get all chapters",
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_UPDATE,
    async (_, input: ChapterUpdateInput) => {
      try {
        const chapter = await chapterService.updateChapter(input);
        return createSuccessResponse(chapter);
      } catch (error) {
        logger.error("CHAPTER_UPDATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to update chapter",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CHAPTER_DELETE, async (_, id: string) => {
    try {
      const result = await chapterService.deleteChapter(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("CHAPTER_DELETE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to delete chapter",
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_REORDER,
    async (_, projectId: string, chapterIds: string[]) => {
      try {
        const result = await chapterService.reorderChapters(
          projectId,
          chapterIds,
        );
        return createSuccessResponse(result);
      } catch (error) {
        logger.error("CHAPTER_REORDER failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to reorder chapters",
        );
      }
    },
  );

  // Character Handlers
  ipcMain.handle(
    IPC_CHANNELS.CHARACTER_CREATE,
    async (_, input: CharacterCreateInput) => {
      try {
        const character = await characterService.createCharacter(input);
        return createSuccessResponse(character);
      } catch (error) {
        logger.error("CHARACTER_CREATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to create character",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CHARACTER_GET, async (_, id: string) => {
    try {
      const character = await characterService.getCharacter(id);
      return createSuccessResponse(character);
    } catch (error) {
      logger.error("CHARACTER_GET failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get character",
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.CHARACTER_GET_ALL,
    async (_, projectId: string) => {
      try {
        const characters = await characterService.getAllCharacters(projectId);
        return createSuccessResponse(characters);
      } catch (error) {
        logger.error("CHARACTER_GET_ALL failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to get all characters",
        );
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CHARACTER_UPDATE,
    async (_, input: CharacterUpdateInput) => {
      try {
        const character = await characterService.updateCharacter(input);
        return createSuccessResponse(character);
      } catch (error) {
        logger.error("CHARACTER_UPDATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to update character",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CHARACTER_DELETE, async (_, id: string) => {
    try {
      const result = await characterService.deleteCharacter(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("CHARACTER_DELETE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to delete character",
      );
    }
  });

  // Character Appearance Handlers
  ipcMain.handle(
    "character:record-appearance",
    async (_, input: CharacterAppearanceInput) => {
      try {
        const appearance = await characterService.recordAppearance(input);
        return createSuccessResponse(appearance);
      } catch (error) {
        logger.error("CHARACTER_RECORD_APPEARANCE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to record character appearance",
        );
      }
    },
  );

  ipcMain.handle("character:get-appearances", async (_, chapterId: string) => {
    try {
      const appearances =
        await characterService.getAppearancesByChapter(chapterId);
      return createSuccessResponse(appearances);
    } catch (error) {
      logger.error("CHARACTER_GET_APPEARANCES failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get character appearances",
      );
    }
  });

  // Term Handlers
  ipcMain.handle(
    IPC_CHANNELS.TERM_CREATE,
    async (_, input: TermCreateInput) => {
      try {
        const term = await termService.createTerm(input);
        return createSuccessResponse(term);
      } catch (error) {
        logger.error("TERM_CREATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to create term",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.TERM_GET, async (_, id: string) => {
    try {
      const term = await termService.getTerm(id);
      return createSuccessResponse(term);
    } catch (error) {
      logger.error("TERM_GET failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get term",
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.TERM_GET_ALL, async (_, projectId: string) => {
    try {
      const terms = await termService.getAllTerms(projectId);
      return createSuccessResponse(terms);
    } catch (error) {
      logger.error("TERM_GET_ALL failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get all terms",
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.TERM_UPDATE,
    async (_, input: TermUpdateInput) => {
      try {
        const term = await termService.updateTerm(input);
        return createSuccessResponse(term);
      } catch (error) {
        logger.error("TERM_UPDATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to update term",
        );
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.TERM_DELETE, async (_, id: string) => {
    try {
      const result = await termService.deleteTerm(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("TERM_DELETE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to delete term",
      );
    }
  });

  // Term Appearance Handlers
  ipcMain.handle(
    "term:record-appearance",
    async (_, input: TermAppearanceInput) => {
      try {
        const appearance = await termService.recordAppearance(input);
        return createSuccessResponse(appearance);
      } catch (error) {
        logger.error("TERM_RECORD_APPEARANCE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to record term appearance",
        );
      }
    },
  );

  ipcMain.handle("term:get-appearances", async (_, chapterId: string) => {
    try {
      const appearances = await termService.getAppearancesByChapter(chapterId);
      return createSuccessResponse(appearances);
    } catch (error) {
      logger.error("TERM_GET_APPEARANCES failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get term appearances",
      );
    }
  });

  // Snapshot Handlers
  ipcMain.handle(
    IPC_CHANNELS.SNAPSHOT_CREATE,
    async (_, input: SnapshotCreateInput) => {
      try {
        const snapshot = await snapshotService.createSnapshot(input);
        return createSuccessResponse(snapshot);
      } catch (error) {
        logger.error("SNAPSHOT_CREATE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to create snapshot",
        );
      }
    },
  );

  ipcMain.handle("snapshot:get-by-project", async (_, projectId: string) => {
    try {
      const snapshots = await snapshotService.getSnapshotsByProject(projectId);
      return createSuccessResponse(snapshots);
    } catch (error) {
      logger.error("SNAPSHOT_GET_BY_PROJECT failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get snapshots by project",
      );
    }
  });

  ipcMain.handle("snapshot:get-by-chapter", async (_, chapterId: string) => {
    try {
      const snapshots = await snapshotService.getSnapshotsByChapter(chapterId);
      return createSuccessResponse(snapshots);
    } catch (error) {
      logger.error("SNAPSHOT_GET_BY_CHAPTER failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get snapshots by chapter",
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_DELETE, async (_, id: string) => {
    try {
      const result = await snapshotService.deleteSnapshot(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("SNAPSHOT_DELETE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to delete snapshot",
      );
    }
  });

  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_RESTORE, async (_, id: string) => {
    try {
      const result = await snapshotService.restoreSnapshot(id);
      return createSuccessResponse(result);
    } catch (error) {
      logger.error("SNAPSHOT_RESTORE failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to restore snapshot",
      );
    }
  });

  // Search Handlers
  ipcMain.handle(IPC_CHANNELS.SEARCH, async (_, input: SearchQuery) => {
    try {
      const results = await searchService.search(input);
      return createSuccessResponse(results);
    } catch (error) {
      logger.error("SEARCH failed", error);
      return createErrorResponse((error as Error).message, "Failed to search");
    }
  });

  ipcMain.handle("search:quick-access", async (_, projectId: string) => {
    try {
      const results = await searchService.getQuickAccess(projectId);
      return createSuccessResponse(results);
    } catch (error) {
      logger.error("SEARCH_QUICK_ACCESS failed", error);
      return createErrorResponse(
        (error as Error).message,
        "Failed to get quick access",
      );
    }
  });

  // Auto Save Handlers
  ipcMain.handle(
    IPC_CHANNELS.AUTO_SAVE,
    async (_, chapterId: string, content: string, projectId: string) => {
      const { autoSaveManager } = await import("../manager/autoSaveManager.js");
      try {
        autoSaveManager.triggerSave(chapterId, content, projectId);
        return createSuccessResponse({ success: true });
      } catch (error) {
        logger.error("AUTO_SAVE failed", error);
        return createErrorResponse(
          (error as Error).message,
          "Failed to trigger auto save",
        );
      }
    },
  );

  // Window Control Handlers
  ipcMain.handle("window:maximize", () => {
    const { windowManager } = require("../manager/index.js");
    const win = windowManager.getMainWindow();
    if (win) {
      if (process.platform === 'darwin') {
          win.setFullScreen(true);
      } else {
          win.maximize();
      }
    }
    return createSuccessResponse(true);
  });

  logger.info("IPC handlers registered successfully");
}

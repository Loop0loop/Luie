import { createLogger } from "../../shared/logger/index.js";
import { autoSaveManager } from "../manager/autoSaveManager.js";
import {
	chapterService,
	characterService,
	projectService,
	searchService,
	snapshotService,
	termService,
} from "../services/index.js";
import { registerProjectHandlers } from "./project/index.js";
import { registerSearchHandlers } from "./search/index.js";
import { registerSystemHandlers } from "./system/index.js";
import { registerWorldHandlers } from "./world/index.js";
import { registerWritingHandlers } from "./writing/index.js";

const logger = createLogger("IPCHandler");

export function registerAllIPCHandlers(): void {
	registerProjectHandlers({
		logger,
		projectService,
		chapterService,
	});

	registerWorldHandlers({
		logger,
		characterService,
		termService,
	});

	registerWritingHandlers({
		logger,
		autoSaveManager,
		snapshotService,
	});

	registerSearchHandlers({
		logger,
		searchService,
	});

	registerSystemHandlers({ logger });

	logger.info("IPC handlers registered successfully");
}

// Backward compat
export const registerIPCHandlers = registerAllIPCHandlers;


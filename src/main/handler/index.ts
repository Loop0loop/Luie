import { createLogger } from "../../shared/logger/index.js";
import { autoSaveManager } from "../manager/autoSaveManager.js";
import {
	chapterService,
	characterService,
	eventService,
	factionService,
	projectService,
	searchService,
	snapshotService,
	termService,
	manuscriptAnalysisService,
	worldEntityService,
	entityRelationService,
} from "../services/index.js";
import { registerProjectHandlers } from "./project/index.js";
import { registerSearchHandlers } from "./search/index.js";
import { registerSystemHandlers } from "./system/index.js";
import { registerWorldHandlers } from "./world/index.js";
import { registerWritingHandlers } from "./writing/index.js";
import { registerAnalysisHandlers } from "./analysis/index.js";

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
		eventService,
		factionService,
		worldEntityService,
		entityRelationService,
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

	registerAnalysisHandlers({
		logger,
		manuscriptAnalysisService,
	});

	logger.info("IPC handlers registered successfully");
}

// Backward compat
export const registerIPCHandlers = registerAllIPCHandlers;


import { promises as fsPromises } from "fs";
import path from "path";
import { app } from "electron";
import { SNAPSHOT_MIRROR_DIR } from "../../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../../shared/types/index.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

export const writeEmergencySnapshotFile = async (
  input: SnapshotCreateInput,
  logger: LoggerLike,
  error?: unknown,
): Promise<void> => {
  try {
    const emergencyDir = path.join(
      app.getPath("userData"),
      SNAPSHOT_MIRROR_DIR,
      "_emergency",
    );
    await fsPromises.mkdir(emergencyDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(
      emergencyDir,
      `emergency-${input.projectId}-${input.chapterId ?? "project"}-${timestamp}.json`,
    );

    const payload = JSON.stringify(
      {
        projectId: input.projectId,
        chapterId: input.chapterId ?? null,
        content: input.content,
        description: input.description ?? null,
        type: input.type ?? "AUTO",
        createdAt: new Date().toISOString(),
        error: error instanceof Error ? { message: error.message, name: error.name } : undefined,
      },
      null,
      2,
    );

    const tempPath = `${filePath}.tmp`;
    await fsPromises.writeFile(tempPath, payload, "utf8");
    const handle = await fsPromises.open(tempPath, "r+");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fsPromises.rename(tempPath, filePath);

    try {
      const dirHandle = await fsPromises.open(emergencyDir, "r");
      try {
        await dirHandle.sync();
      } finally {
        await dirHandle.close();
      }
    } catch (syncError) {
      logger.warn("Failed to fsync emergency snapshot directory", syncError);
    }

    logger.warn("Emergency snapshot file written", { filePath });
  } catch (writeError) {
    logger.error("Failed to write emergency snapshot file", writeError);
  }
};


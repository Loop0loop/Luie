import { app } from "electron";
import * as fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import { project } from "../../../infra/database/index.js";
import {
  ErrorCode,
  SNAPSHOT_BACKUP_DIR,
} from "../../../../shared/constants/index.js";
import type { ChapterUpdateInput } from "../../../../shared/types/index.js";
import { sanitizeName } from "../../../../shared/utils/sanitize.js";
import { ServiceError } from "../../../utils/serviceError.js";
import { isTestEnv } from "../../../utils/environment.js";
import { autoExtractService } from "../../features/autoExtract/autoExtractService.js";
import { trackKeywordAppearances } from "../chapterKeywords.js";
import {
  chapterLogger,
  fireAndForget,
  SKIP_NONCRITICAL_DERIVED_ON_STRESS,
} from "./chapterRuntime.js";

const resolveProjectTitle = async (
  projectId: string | undefined,
): Promise<string> => {
  if (!projectId) return "Unknown";
  const rows = await db.getClient()
    .select({ title: project.title })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  return rows.length > 0 && typeof rows[0].title === "string"
    ? rows[0].title
    : "Unknown";
};

const writeSuspiciousContentDump = async (input: {
  projectId: string | undefined;
  chapterId: string;
  filePrefix: string;
  content: string;
}): Promise<string | undefined> => {
  if (isTestEnv()) return undefined;
  const projectTitle = await resolveProjectTitle(input.projectId);
  const safeTitle = sanitizeName(projectTitle, "Unknown");
  const dumpDir = path.join(
    app.getPath("userData"),
    SNAPSHOT_BACKUP_DIR,
    safeTitle || "Unknown",
    "_suspicious",
  );
  await fs.mkdir(dumpDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpPath = path.join(
    dumpDir,
    `${input.filePrefix}-${input.chapterId}-${timestamp}.txt`,
  );
  await fs.writeFile(dumpPath, input.content, "utf8");
  return dumpPath;
};

export const applyChapterContentUpdate = async (
  input: ChapterUpdateInput,
  current: { projectId?: unknown; content?: unknown } | null,
  updateData: Record<string, unknown>,
): Promise<void> => {
  if (input.content === undefined) return;

  const oldContent =
    typeof current?.content === "string" ? current.content : "";
  const oldLen = oldContent.length;
  const newLen = input.content.length;
  const projectId =
    typeof current?.projectId === "string" ? current.projectId : undefined;

  if (oldLen > 0 && newLen === 0) {
    const dumpPath = await writeSuspiciousContentDump({
      projectId,
      chapterId: input.id,
      filePrefix: "dump-empty",
      content: oldContent,
    });
    chapterLogger.warn("Empty content save blocked.", {
      chapterId: input.id,
      oldLen,
      dumpPath,
    });
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Empty content save blocked",
      { chapterId: input.id, oldLen },
    );
  }

  if (!isTestEnv() && oldLen > 1000 && newLen < oldLen * 0.1) {
    const dumpPath = await writeSuspiciousContentDump({
      projectId,
      chapterId: input.id,
      filePrefix: "dump",
      content: input.content,
    });
    chapterLogger.warn("Suspicious large deletion detected. Save blocked.", {
      chapterId: input.id,
      oldLen,
      newLen,
      dumpPath,
    });
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Suspicious large deletion detected; save blocked",
      { chapterId: input.id, oldLen, newLen },
    );
  }

  updateData.content = input.content;
  updateData.wordCount = input.content.length;
  if (!projectId || SKIP_NONCRITICAL_DERIVED_ON_STRESS) return;

  fireAndForget(
    trackKeywordAppearances(input.id, input.content, projectId),
    "chapter:update:track-keyword-appearances",
  );
  autoExtractService.scheduleAnalysis(input.id, projectId, input.content);
};

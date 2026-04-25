import { count } from "drizzle-orm";
import { createLogger } from "../../shared/logger/index.js";
import type { MainDrizzleClient } from "./databaseTypes.js";
import { chapter, project, projectSettings } from "./schema.js";

const logger = createLogger("DatabaseSeed");

function generateId(): string {
  return crypto.randomUUID();
}

export async function seedIfEmpty(drizzleClient: MainDrizzleClient): Promise<boolean> {
  const [{ value: existing }] = await drizzleClient
    .select({ value: count() })
    .from(project);

  if (existing > 0) {
    logger.info("Seed skipped (projects exist)", { count: existing });
    return false;
  }

  const now = new Date().toISOString();
  const projectId = generateId();
  const settingsId = generateId();
  const chapterId = generateId();

  await drizzleClient.insert(project).values({
    id: projectId,
    title: "새 프로젝트",
    description: "",
    createdAt: now,
    updatedAt: now,
  });

  await drizzleClient.insert(projectSettings).values({
    id: settingsId,
    projectId,
    autoSave: true,
    autoSaveInterval: 30,
  });

  await drizzleClient.insert(chapter).values({
    id: chapterId,
    projectId,
    title: "1장",
    content: "",
    order: 1,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Seed completed (default project created)");
  return true;
}

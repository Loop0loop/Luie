import { app } from "electron";
import path from "node:path";
import { DB_NAME } from "../shared/constants/index.js";
import { isTestEnv } from "./utils/environment.js";

const resolveDevDbPath = () =>
  path.join(process.cwd(), "prisma", "dev.db");

const resolveTestDbPath = () =>
  path.join(process.cwd(), "prisma", ".tmp", "test.db");

const resolveProdDbPath = () =>
  path.join(app.getPath("userData"), DB_NAME);

export function initDatabaseEnv() {
  if (process.env.DATABASE_URL) return;

  const dbPath = isTestEnv()
    ? resolveTestDbPath()
    : app.isPackaged
      ? resolveProdDbPath()
      : resolveDevDbPath();
  process.env.DATABASE_URL = `file:${dbPath}`;
}

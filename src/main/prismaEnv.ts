import { app } from "electron";
import path from "node:path";

const resolveDevDbPath = () =>
  path.join(process.cwd(), "prisma", "dev.db");

const resolveProdDbPath = () =>
  path.join(app.getPath("userData"), "luie.db");

export function initDatabaseEnv() {
  if (process.env.DATABASE_URL) return;

  const dbPath = app.isPackaged ? resolveProdDbPath() : resolveDevDbPath();
  process.env.DATABASE_URL = `file:${dbPath}`;
}

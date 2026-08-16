// TODO: DB 환경 초기화 호출부를 정리한 뒤 파일명을 dbEnv.ts로 변경한다.
import { app } from "electron";
import path from "node:path";
import { DB_NAME } from "../shared/constants/index.js";
import { isTestEnv } from "./utils/env/index.js";

const resolveDevDbPath = () =>
  path.join(process.cwd(), "drizzle", "app-dev.db");

const resolveTestDbPath = () =>
  path.join(process.cwd(), "drizzle", ".tmp", "test.db");

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

import { constants as fsConstants } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveSqliteDatasourceFromEnv(rawValue: string): {
  dbPath: string;
  datasourceUrl: string;
} {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    throw new Error("DATABASE_URL is empty");
  }

  const normalizedValue = trimmedValue.startsWith("file:")
    ? trimmedValue
    : `file:${trimmedValue}`;
  const encodedPath = normalizedValue.slice("file:".length);
  const queryIndex = encodedPath.indexOf("?");
  const pathname =
    queryIndex === -1 ? encodedPath : encodedPath.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : encodedPath.slice(queryIndex);
  const decodedPath = decodeURIComponent(pathname);
  const dbPath = path.isAbsolute(decodedPath)
    ? decodedPath
    : path.resolve(process.cwd(), decodedPath);

  return {
    dbPath,
    datasourceUrl: `file:${dbPath}${search}`,
  };
}

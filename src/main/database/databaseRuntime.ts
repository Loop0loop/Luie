import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);

export const PrismaClientCtor = PrismaClient;

export type PackagedSchemaMode = "bootstrap" | "prisma";

type CommandError = Error & {
  status?: number | null;
  stdout?: string;
  stderr?: string;
};

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

export function resolvePackagedSchemaMode(): PackagedSchemaMode {
  return process.env.LUIE_PACKAGED_SCHEMA_MODE === "prisma"
    ? "prisma"
    : "bootstrap";
}

export function getPrismaBinPath(baseDir: string): string {
  return path.join(baseDir, "node_modules", "prisma", "build", "index.js");
}

function resolveJavaScriptRuntimeCommand(): string {
  if (!process.versions.electron) {
    return process.execPath;
  }

  const explicitNodePath = [
    process.env.NODE,
    process.env.npm_node_execpath,
    process.env.PNPM_NODE_EXEC_PATH,
  ].find((candidate): candidate is string => (
    typeof candidate === "string" && candidate.length > 0
  ));

  return explicitNodePath ?? "node";
}

export function loadPrismaBetterSqlite3(): new (input: {
  url: string;
}) => unknown {
  const moduleExports = require("@prisma/adapter-better-sqlite3") as Record<
    string,
    unknown
  >;
  const adapter =
    moduleExports.PrismaBetterSQLite3 ??
    moduleExports.PrismaBetterSqlite3 ??
    moduleExports.default;
  if (typeof adapter !== "function") {
    throw new Error("Prisma better-sqlite3 adapter is unavailable");
  }
  return adapter as new (input: { url: string }) => unknown;
}

export function runPrismaCommand(
  prismaPath: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const isJavaScriptEntry = prismaPath.endsWith(".js");
  const command = isJavaScriptEntry
    ? resolveJavaScriptRuntimeCommand()
    : prismaPath;
  const commandArgs = isJavaScriptEntry ? [prismaPath, ...args] : args;

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      const commandError = error as CommandError;
      commandError.stdout = stdout;
      commandError.stderr = stderr;
      reject(commandError);
    });
    child.on("close", (status) => {
      if (status === 0) {
        resolve();
        return;
      }

      const error = new Error(
        `Prisma command failed with exit code ${status ?? "unknown"}`,
      ) as CommandError;
      error.status = status;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

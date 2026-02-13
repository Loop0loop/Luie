import * as fsp from "fs/promises";
import * as path from "path";
import yauzl from "yauzl";
import { LUIE_PACKAGE_EXTENSION } from "../../shared/constants/index.js";

export type LuiePackageLogger = {
  error: (message: string, data?: unknown) => void;
};

const MAX_LUIE_ENTRY_SIZE_BYTES = 5 * 1024 * 1024;

export const normalizeZipPath = (inputPath: string) =>
  path.posix
    .normalize(inputPath.replace(/\\/g, "/"))
    .replace(/^\.(\/|\\)/, "")
    .replace(/^\//, "");

export const isSafeZipPath = (inputPath: string) => {
  const normalized = normalizeZipPath(inputPath);
  if (!normalized) return false;
  if (normalized.startsWith("../") || normalized.startsWith("..\\")) return false;
  if (normalized.includes("../") || normalized.includes("..\\")) return false;
  return !path.isAbsolute(normalized);
};

export const ensureLuieExtension = (targetPath: string) =>
  targetPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
    ? targetPath
    : `${targetPath}${LUIE_PACKAGE_EXTENSION}`;

export const readZipEntryContent = async (
  zipPath: string,
  entryPath: string,
  logger?: LuiePackageLogger,
): Promise<string | null> => {
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  let found = false;
  let result: string | null = null;

  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr: Error | null, zipfile?: yauzl.ZipFile) => {
      if (openErr || !zipfile) {
        reject(openErr ?? new Error("FAILED_TO_OPEN_ZIP"));
        return;
      }

      zipfile.on("entry", (entry: yauzl.Entry) => {
        const entryName = normalizeZipPath(entry.fileName);
        if (!entryName || !isSafeZipPath(entryName)) {
          logger?.error("Unsafe zip entry skipped", { entry: entry.fileName, zipPath });
          zipfile.readEntry();
          return;
        }

        if (entryName !== normalized) {
          zipfile.readEntry();
          return;
        }

        if (entry.fileName.endsWith("/")) {
          found = true;
          result = null;
          zipfile.close();
          resolve();
          return;
        }

        zipfile.openReadStream(entry, (streamErr: Error | null, stream?: NodeJS.ReadableStream) => {
          if (streamErr || !stream) {
            reject(streamErr ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
            return;
          }

          found = true;
          const chunks: Buffer[] = [];
          const readable = stream as NodeJS.ReadableStream & {
            destroy: (error?: Error) => void;
          };
          let totalSize = 0;
          readable.on("data", (chunk: Buffer) => {
            totalSize += chunk.length;
            if (totalSize > MAX_LUIE_ENTRY_SIZE_BYTES) {
              readable.destroy(
                new Error(
                  `LUIE_ENTRY_TOO_LARGE:${entryName}:${MAX_LUIE_ENTRY_SIZE_BYTES}`,
                ),
              );
              return;
            }
            chunks.push(chunk);
          });
          readable.on("end", () => {
            result = Buffer.concat(chunks).toString("utf-8");
            zipfile.close();
            resolve();
          });
          readable.on("error", reject);
        });
      });

      zipfile.on("end", () => {
        if (!found) resolve();
      });
      zipfile.on("error", reject);
      zipfile.readEntry();
    });
  });

  return result;
};

export const readLuieEntry = async (
  packagePath: string,
  entryPath: string,
  logger?: LuiePackageLogger,
): Promise<string | null> => {
  const targetPath = ensureLuieExtension(packagePath);
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  try {
    const stat = await fsp.stat(targetPath);
    if (stat.isDirectory()) {
      const resolved = path.normalize(`${targetPath}${path.sep}${normalized}`);
      const base = path.normalize(targetPath);
      if (!resolved.startsWith(`${base}${path.sep}`) && resolved !== base) {
        throw new Error("INVALID_RELATIVE_PATH");
      }
      try {
        const fileStat = await fsp.stat(resolved);
        if (fileStat.size > MAX_LUIE_ENTRY_SIZE_BYTES) {
          throw new Error(
            `LUIE_ENTRY_TOO_LARGE:${normalized}:${MAX_LUIE_ENTRY_SIZE_BYTES}`,
          );
        }
        return await fsp.readFile(resolved, "utf-8");
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err?.code === "ENOENT") return null;
        throw error;
      }
    }

    if (stat.isFile()) {
      return await readZipEntryContent(targetPath, normalized, logger);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") return null;
    throw error;
  }

  return null;
};

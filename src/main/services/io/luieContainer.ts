import * as fsp from "node:fs/promises";
import { ErrorCode } from "../../../shared/constants/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import {
  ensureLuieExtension,
  readLuieEntry,
} from "../../utils/luiePackage.js";
import {
  writeLuiePackage,
} from "./luiePackageWriter.js";
import type {
  LuiePackageExportData,
  LoggerLike,
} from "./luiePackageTypes.js";

const SQLITE_HEADER = "SQLite format 3\u0000";

export type LuieContainerKind = "package-v1" | "sqlite-v2" | "unknown";
export type LuieContainerLayout = "file" | "directory" | "missing";

export type LuieContainerProbe = {
  normalizedPath: string;
  exists: boolean;
  kind: LuieContainerKind;
  layout: LuieContainerLayout;
};

const readFileHeader = async (
  targetPath: string,
  byteLength: number,
): Promise<Buffer> => {
  const handle = await fsp.open(targetPath, "r");
  try {
    const buffer = Buffer.alloc(byteLength);
    const { bytesRead } = await handle.read(buffer, 0, byteLength, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const isZipHeader = (buffer: Buffer): boolean =>
  buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;

const isSqliteHeader = (buffer: Buffer): boolean =>
  buffer.toString("utf8", 0, Math.min(buffer.length, SQLITE_HEADER.length)) ===
  SQLITE_HEADER;

export const probeLuieContainer = async (
  targetPath: string,
): Promise<LuieContainerProbe> => {
  const normalizedPath = ensureLuieExtension(targetPath);

  try {
    const stat = await fsp.stat(normalizedPath);
    if (stat.isDirectory()) {
      return {
        normalizedPath,
        exists: true,
        kind: "package-v1",
        layout: "directory",
      };
    }

    if (!stat.isFile()) {
      return {
        normalizedPath,
        exists: true,
        kind: "unknown",
        layout: "file",
      };
    }

    const header = await readFileHeader(normalizedPath, SQLITE_HEADER.length);
    if (isSqliteHeader(header)) {
      return {
        normalizedPath,
        exists: true,
        kind: "sqlite-v2",
        layout: "file",
      };
    }
    if (isZipHeader(header)) {
      return {
        normalizedPath,
        exists: true,
        kind: "package-v1",
        layout: "file",
      };
    }

    return {
      normalizedPath,
      exists: true,
      kind: "unknown",
      layout: "file",
    };
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError?.code === "ENOENT") {
      return {
        normalizedPath,
        exists: false,
        kind: "unknown",
        layout: "missing",
      };
    }
    throw error;
  }
};

export const readLuieContainerEntry = async (
  targetPath: string,
  entryPath: string,
  logger?: Pick<LoggerLike, "error">,
): Promise<string | null> => {
  const probe = await probeLuieContainer(targetPath);

  if (!probe.exists) {
    return null;
  }

  if (probe.kind === "package-v1") {
    return await readLuieEntry(probe.normalizedPath, entryPath, logger);
  }

  if (probe.kind === "sqlite-v2") {
    throw new ServiceError(
      ErrorCode.FS_READ_FAILED,
      "SQLite-backed .luie reading is not implemented yet",
      {
        packagePath: probe.normalizedPath,
        entryPath,
        containerKind: probe.kind,
      },
    );
  }

  throw new ServiceError(
    ErrorCode.FS_READ_FAILED,
    "Unsupported .luie container format",
    {
      packagePath: probe.normalizedPath,
      entryPath,
      containerKind: probe.kind,
    },
  );
};

export const writeLuieContainer = async (input: {
  targetPath: string;
  payload: LuiePackageExportData;
  logger: LoggerLike;
  kind?: Exclude<LuieContainerKind, "unknown">;
}): Promise<{
  normalizedPath: string;
  kind: Exclude<LuieContainerKind, "unknown">;
}> => {
  const normalizedPath = ensureLuieExtension(input.targetPath);
  const kind = input.kind ?? "package-v1";

  if (kind === "package-v1") {
    await writeLuiePackage(normalizedPath, input.payload, input.logger);
    return {
      normalizedPath,
      kind,
    };
  }

  throw new ServiceError(
    ErrorCode.FS_WRITE_FAILED,
    "SQLite-backed .luie writing is not implemented yet",
    {
      targetPath: normalizedPath,
      containerKind: kind,
    },
  );
};

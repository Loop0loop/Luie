import * as fsp from "node:fs/promises";
import { ErrorCode } from "../../../shared/constants/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import {
  ensureLuieExtension,
} from "../../utils/luiePackage.js";
import {
  readLuieSqliteEntry,
  writeLuieSqliteContainer,
} from "./luieSqliteContainer.js";
import type {
  LuiePackageExportData,
  LoggerLike,
} from "./luiePackageTypes.js";

const SQLITE_HEADER = "SQLite format 3\u0000";
const LEGACY_LUIE_UNSUPPORTED_MESSAGE =
  "현재 앱은 구형 package .luie를 지원하지 않습니다";

export type LuieContainerKind = "legacy-package" | "sqlite-v2" | "unknown";
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
        kind: "legacy-package",
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
        kind: "legacy-package",
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
  _logger?: Pick<LoggerLike, "error">,
): Promise<string | null> => {
  const probe = await probeLuieContainer(targetPath);

  if (!probe.exists) {
    return null;
  }

  if (probe.kind === "sqlite-v2") {
    return await readLuieSqliteEntry(probe.normalizedPath, entryPath);
  }

  if (probe.kind === "legacy-package") {
    throw new ServiceError(
      ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
      LEGACY_LUIE_UNSUPPORTED_MESSAGE,
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
}): Promise<{
  normalizedPath: string;
  kind: "sqlite-v2";
}> => {
  const normalizedPath = ensureLuieExtension(input.targetPath);
  const probe = await probeLuieContainer(normalizedPath);
  if (probe.exists && probe.kind === "legacy-package") {
    throw new ServiceError(
      ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
      LEGACY_LUIE_UNSUPPORTED_MESSAGE,
      {
        targetPath: probe.normalizedPath,
        containerKind: probe.kind,
      },
    );
  }
  if (probe.exists && probe.kind === "unknown") {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Unsupported .luie container format",
      {
        targetPath: probe.normalizedPath,
        containerKind: probe.kind,
      },
    );
  }

  await writeLuieSqliteContainer({
    targetPath: normalizedPath,
    payload: input.payload,
    logger: input.logger,
  });
  return {
    normalizedPath,
    kind: "sqlite-v2",
  };
};
